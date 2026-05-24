const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM, getOrCreateConversation, markConversationRead } = require('./helpers');

// GET - All conversations for current user
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId, isDeleted1: false },
          { participant2Id: userId, isDeleted2: false }
        ]
      },
      include: {
        participant1: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,  // ← ADD THIS
            lastActive: true,
            executiveAssignments: {  // ← ADD THIS
              where: { isActive: true },
              include: { position: { select: { title: true, category: true } } }
            },
            homeJumuia: { select: { name: true } }  // ← ADD THIS
          } 
        },
        participant2: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,  // ← ADD THIS
            lastActive: true,
            executiveAssignments: {  // ← ADD THIS
              where: { isActive: true },
              include: { position: { select: { title: true, category: true } } }
            },
            homeJumuia: { select: { name: true } }  // ← ADD THIS
          } 
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Format conversations with unread counts and executive info
    const formatted = conversations.map(conv => {
      const isParticipant1 = conv.participant1Id === userId;
      let otherParticipant = isParticipant1 ? conv.participant2 : conv.participant1;
      
      // Format executive info for the participant
      const formattedParticipant = {
        ...otherParticipant,
        executivePosition: otherParticipant.executiveAssignments?.[0]?.position?.title || null,
        executiveCategory: otherParticipant.executiveAssignments?.[0]?.position?.category || null
      };
      
      const unreadCount = isParticipant1 ? conv.unreadCount1 : conv.unreadCount2;

      return {
        id: conv.id,
        participant: formattedParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        lastMessageBy: conv.lastMessageBy,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    res.json({
      success: true,
      conversations: formatted
    });

  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Single conversation
router.get('/:conversationId', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      },
      include: {
        participant1: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,  // ← ADD THIS
            executiveAssignments: {  // ← ADD THIS
              where: { isActive: true },
              include: { position: { select: { title: true } } }
            }
          } 
        },
        participant2: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,  // ← ADD THIS
            executiveAssignments: {  // ← ADD THIS
              where: { isActive: true },
              include: { position: { select: { title: true } } }
            }
          } 
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Format executive info
    const formattedConversation = {
      ...conversation,
      participant1: {
        ...conversation.participant1,
        executivePosition: conversation.participant1?.executiveAssignments?.[0]?.position?.title || null
      },
      participant2: {
        ...conversation.participant2,
        executivePosition: conversation.participant2?.executiveAssignments?.[0]?.position?.title || null
      }
    };

    res.json({ success: true, conversation: formattedConversation });

  } catch (err) {
    console.error("Get conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Start new conversation
router.post('/:userId', authenticateDM, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    if (userId === currentUserId) {
      return res.status(400).json({ error: "Cannot start conversation with yourself" });
    }

    const conversation = await getOrCreateConversation(currentUserId, userId);

    // Get the other participant's details with executive info
    const otherParticipant = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        fullName: true, 
        profileImage: true, 
        role: true, 
        specialRole: true,  // ← ADD THIS
        executiveAssignments: {  // ← ADD THIS
          where: { isActive: true },
          include: { position: { select: { title: true } } }
        }
      }
    });

    // Format executive info
    const formattedParticipant = {
      ...otherParticipant,
      executivePosition: otherParticipant?.executiveAssignments?.[0]?.position?.title || null
    };

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        participant: formattedParticipant,
        createdAt: conversation.createdAt
      }
    });

  } catch (err) {
    console.error("Start conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Archive conversation
router.put('/:conversationId/archive', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant1 = conversation.participant1Id === userId;
    const updateData = isParticipant1 ? { isArchived1: true } : { isArchived2: true };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData
    });

    res.json({ success: true, message: "Conversation archived" });

  } catch (err) {
    console.error("Archive conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Unarchive conversation
router.put('/:conversationId/unarchive', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant1 = conversation.participant1Id === userId;
    const updateData = isParticipant1 ? { isArchived1: false } : { isArchived2: false };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData
    });

    res.json({ success: true, message: "Conversation unarchived" });

  } catch (err) {
    console.error("Unarchive conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Delete conversation (soft delete)
router.delete('/:conversationId', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant1 = conversation.participant1Id === userId;
    const updateData = isParticipant1 ? { isDeleted1: true } : { isDeleted2: true };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData
    });

    res.json({ success: true, message: "Conversation deleted" });

  } catch (err) {
    console.error("Delete conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Clear all messages in conversation (keep conversation)
router.post('/:conversationId/clear', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Soft delete all messages in conversation for this user
    await prisma.directMessage.updateMany({
      where: {
        conversationId,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        content: "[Message cleared]"
      }
    });

    // Reset conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: null,
        lastMessageAt: null,
        lastMessageBy: null,
        updatedAt: new Date()
      }
    });

    res.json({ success: true, message: "Chat cleared successfully" });

  } catch (err) {
    console.error("Clear conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mark conversation as read
router.put('/:conversationId/read', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    await markConversationRead(conversationId, userId);

    res.json({ success: true, message: "Conversation marked as read" });

  } catch (err) {
    console.error("Mark conversation read error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;