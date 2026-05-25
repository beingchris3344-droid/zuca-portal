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
      messages: messages.reverse(),
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

    if (!convId && recipientId) {
      const conversation = await getOrCreateConversation(senderId, recipientId);
      convId = conversation.id;
    }

    if (!convId) {
      return res.status(400).json({ error: "conversationId or recipientId required" });
    }

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

    if (files && files.length > 0) {
      const fileRecords = [];
      for (const file of files) {
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

    await updateConversationLastMessage(convId, content, senderId);

    const recipientId2 = conversation.participant1Id === senderId 
      ? conversation.participant2Id 
      : conversation.participant1Id;

    // ✅ ADD NOTIFICATION FOR RECIPIENT
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true, profileImage: true }
    });

    const notification = await prisma.notification.create({
      data: {
        userId: recipientId2,
        type: "direct_message",
        title: `💬 New message from ${sender.fullName}`,
        message: content?.substring(0, 100) || "Sent you a message",
        data: {
          conversationId: convId,
          messageId: message.id,
          senderId: senderId,
          senderName: sender.fullName
        },
        read: false,
        createdAt: new Date()
      }
    });

    const io = req.app.get('io');
    if (io) {
      // Send message notification to bell icon
      io.to(recipientId2).emit('new_notification', {
        id: notification.id,
        userId: recipientId2,
        type: "direct_message",
        title: `💬 New message from ${sender.fullName}`,
        message: content?.substring(0, 100) || "Sent you a message",
        data: {
          conversationId: convId,
          messageId: message.id,
          senderId: senderId,
          senderName: sender.fullName
        },
        read: false,
        createdAt: notification.createdAt.toISOString()
      });
      
      // Send message to chat window
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

    await prisma.directMessage.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() }
    });

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

// GET - Get online users list
router.get('/online-users', authenticateDM, async (req, res) => {
  try {
    // You need to track online users - either from socket or database
    // For now, return empty array or implement tracking
    const onlineUsersList = Array.from(onlineUsers || []);
    res.json({ users: onlineUsersList });
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