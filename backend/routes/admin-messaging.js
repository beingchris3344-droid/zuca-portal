// backend/routes/admin-messaging.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./messenger/helpers'); // ← CORRECT PATH

// Admin middleware
async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET - All conversations for admin
router.get('/conversations', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        participant1: {
          select: { id: true, fullName: true, email: true, profileImage: true, role: true }
        },
        participant2: {
          select: { id: true, fullName: true, email: true, profileImage: true, role: true }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    
    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: err.message });
  }
});


// GET - All conversations for admin (see ALL conversations)
router.get('/all-conversations', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        participant1: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,
            lastActive: true,
            executiveAssignments: {
              where: { isActive: true },
              include: { position: { select: { title: true, category: true } } }
            },
            homeJumuia: { select: { name: true } }
          } 
        },
        participant2: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,
            lastActive: true,
            executiveAssignments: {
              where: { isActive: true },
              include: { position: { select: { title: true, category: true } } }
            },
            homeJumuia: { select: { name: true } }
          } 
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Format each conversation with participant info
    const formattedConversations = conversations.map(conv => {
      // Format participant1 with executive info
      const participant1 = {
        ...conv.participant1,
        executivePosition: conv.participant1?.executiveAssignments?.[0]?.position?.title || null,
        executiveCategory: conv.participant1?.executiveAssignments?.[0]?.position?.category || null
      };
      
      // Format participant2 with executive info
      const participant2 = {
        ...conv.participant2,
        executivePosition: conv.participant2?.executiveAssignments?.[0]?.position?.title || null,
        executiveCategory: conv.participant2?.executiveAssignments?.[0]?.position?.category || null
      };

      // For admin, we want to show both participants
      return {
        id: conv.id,
        participant1,
        participant2,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        lastMessageBy: conv.lastMessageBy,
        unreadCount1: conv.unreadCount1,
        unreadCount2: conv.unreadCount2,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations
    });

  } catch (err) {
    console.error("Get all conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;