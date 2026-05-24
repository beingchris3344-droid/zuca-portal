const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM, getOrCreateConversation, updateConversationLastMessage, markConversationRead } = require('./helpers');

// GET messages in a conversation (paginated)
router.get('/:conversationId', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { cursor, limit = 50 } = req.query;
    const userId = req.user.userId;

    // Verify user is in this conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId,
        isDeleted: false
      },
      take: parseInt(limit),
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImage: true, role: true }
        },
        files: true,
        reactions: {
          include: { user: { select: { id: true, fullName: true } } }
        }
      }
    });

    // Mark unread messages as read (background)
    const unreadMessages = messages.filter(m => m.senderId !== userId);
    if (unreadMessages.length > 0) {
      const readReceipts = unreadMessages.map(m => ({
        messageId: m.id,
        userId: userId,
        readAt: new Date()
      }));
      
      prisma.directMessageReadReceipt.createMany({
        data: readReceipts,
        skipDuplicates: true
      }).catch(err => console.error("Failed to create read receipts:", err));
    }

    res.json({
      messages: messages.reverse(), // Return in ascending order
      nextCursor: messages.length === parseInt(limit) ? messages[messages.length - 1].id : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Send a new message (with optional files)
router.post('/', authenticateDM, async (req, res) => {
  try {
    const { content, conversationId, recipientId, files } = req.body;
    const senderId = req.user.userId;

    let convId = conversationId;

    // If no conversationId, create one with recipient
    if (!convId && recipientId) {
      const conversation = await getOrCreateConversation(senderId, recipientId);
      convId = conversation.id;
    }

    if (!convId) {
      return res.status(400).json({ error: "conversationId or recipientId required" });
    }

    // Verify user is in conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: convId,
        OR: [
          { participant1Id: senderId },
          { participant2Id: senderId }
        ]
      }
    });

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create message
    const message = await prisma.directMessage.create({
      data: {
        content: content || null,
        senderId: senderId,
        conversationId: convId
      },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImage: true, role: true }
        }
      }
    });

    // If files were provided, save them to database linked to this message
    if (files && files.length > 0) {
      const fileRecords = [];
      for (const file of files) {
        // file has url, name, type, size from upload
        const fileRecord = await prisma.directMessageFile.create({
          data: {
            name: file.name,
            type: file.type,
            size: file.size,
            data: file.url,
            thumbnail: file.thumbnail || null,
            userId: senderId,
            messageId: message.id
          }
        });
        fileRecords.push(fileRecord);
      }
      message.files = fileRecords;
    }

    // Update conversation last message
    await updateConversationLastMessage(convId, content, senderId);

    // Get recipient ID for notification
    const recipientId2 = conversation.participant1Id === senderId 
      ? conversation.participant2Id 
      : conversation.participant1Id;

    // Send real-time notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(recipientId2).emit('new_dm_message', {
        ...message,
        conversationId: convId,
        files: message.files || []
      });
      io.to(senderId).emit('message_sent', message);
    }

    res.status(201).json(message);

  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT mark message as read
router.put('/:messageId/read', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Don't mark own messages as read
    if (message.senderId === userId) {
      return res.json({ success: true });
    }

    await prisma.directMessageReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      },
      update: { readAt: new Date() },
      create: {
        messageId,
        userId,
        readAt: new Date()
      }
    });

    // Update message read status
    await prisma.directMessage.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() }
    });

    // Notify sender via socket
    const io = req.app.get('io');
    if (io) {
      io.to(message.senderId).emit('message_read', { messageId, userId });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE message (soft delete)
router.delete('/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender or admin can delete
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';

    if (message.senderId !== userId && !isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        content: isAdmin ? "[Message deleted by admin]" : "[Message deleted]"
      }
    });

    // Notify both users
    const io = req.app.get('io');
    if (io) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId }
      });
      if (conversation) {
        io.to(conversation.participant1Id).emit('message_deleted', { messageId });
        io.to(conversation.participant2Id).emit('message_deleted', { messageId });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT edit message
router.put('/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: "Content required" });
    }

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can edit
    if (message.senderId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date()
      },
      include: {
        sender: { select: { id: true, fullName: true } }
      }
    });

    // Notify both users
    const io = req.app.get('io');
    if (io) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId }
      });
      if (conversation) {
        io.to(conversation.participant1Id).emit('message_edited', updated);
        io.to(conversation.participant2Id).emit('message_edited', updated);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;