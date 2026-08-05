// routes/whatsapp.admin.js
const express = require('express');
const router = express.Router();
const bot = require('../services/whatsapp.bot');
const { authenticate, requireAdmin } = require('../middleware/auth');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =============================================
// 📊 GET BOT STATUS
// =============================================
router.get('/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = bot.getStatus();
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔗 GENERATE QR CODE (Link WhatsApp)
// =============================================
router.post('/link', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('🔗 Admin requested QR code...');
    
    // Force a fresh connection with new QR
    const qrCode = await bot.generateNewQR();
    
    if (qrCode) {
      const qrImage = await QRCode.toDataURL(qrCode);
      res.json({
        success: true,
        message: 'QR code generated. Scan with WhatsApp to link.',
        qrCode: qrImage,
        qrCodeText: qrCode,
        instructions: '1. Open WhatsApp on your phone\n2. Tap Settings → Linked Devices\n3. Tap "Link a Device"\n4. Scan this QR code',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to generate QR code. Please try again.',
        qrCode: null
      });
    }
  } catch (error) {
    console.error('❌ QR generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔌 DISCONNECT BOT (Unlink WhatsApp)
// =============================================
router.post('/unlink', authenticate, requireAdmin, async (req, res) => {
  try {
    const { force } = req.body;
    
    if (!force) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Set force: true to unlink.'
      });
    }
    
    const result = await bot.disconnect();
    
    if (result) {
      res.json({
        success: true,
        message: 'WhatsApp bot disconnected successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect bot'
      });
    }
  } catch (error) {
    console.error('❌ Unlink error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📝 SET DEFAULT GROUP ID
// =============================================
router.post('/group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    if (!groupId.endsWith('@g.us')) {
      return res.status(400).json({ 
        error: 'Invalid group ID format. Should end with @g.us' 
      });
    }

    const updated = await bot.setGroupId(groupId);
    
    res.json({
      success: true,
      message: `Default Group ID updated to: ${groupId}`,
      groupId: updated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Set group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📋 GET ALL GROUPS
// =============================================
router.get('/groups', authenticate, requireAdmin, async (req, res) => {
  try {
    const groups = await bot.getGroups();
    const stats = await bot.getGroupStats();
    
    res.json({
      success: true,
      groups: groups,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ➕ ADD GROUP TO ACTIVE LIST
// =============================================
router.post('/groups/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    const result = await bot.addActiveGroup(groupId);
    
    if (result) {
      res.json({
        success: true,
        message: `Group activated successfully: ${groupId}`,
        activeGroups: bot.activeGroups,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to activate group. Bot may not be a member.',
        activeGroups: bot.activeGroups
      });
    }
  } catch (error) {
    console.error('❌ Activate group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📋 GET GROUP MEMBERS
// =============================================
router.get('/groups/:groupId/members', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groupId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Group ID is required' 
      });
    }
    
    console.log(`📋 Fetching members for group: ${groupId}`);
    
    const members = await bot.getGroupMembers(groupId);
    
    res.json({
      success: true,
      members: members,
      count: members.length,
      groupId: groupId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get members error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// =============================================
// 📋 GET MESSAGE HISTORY
// =============================================
router.get('/messages', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, search } = req.query;
    
    const where = {};
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.message = { contains: search, mode: 'insensitive' };
    }
    
    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.whatsAppMessage.count({ where })
    ]);
    
    res.json({
      success: true,
      messages,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ✏️ EDIT MESSAGE (Within 15 minutes)
// =============================================
router.put('/messages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (new Date(existing.sentAt) < fifteenMinutesAgo) {
      return res.status(400).json({ 
        error: 'Cannot edit message older than 15 minutes' 
      });
    }
    
    // Edit the message in WhatsApp
    if (existing.messageId && existing.groupId) {
      try {
        await bot.editMessage(existing.groupId, existing.messageId, message);
      } catch (editError) {
        console.error('❌ WhatsApp edit error:', editError);
        // Continue anyway to update the database
      }
    }
    
    // Update the database
    const updated = await prisma.whatsAppMessage.update({
      where: { id },
      data: {
        message: message,
        originalMessage: existing.message,
        status: 'edited',
        editedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ Edit message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🗑️ DELETE MESSAGE
// =============================================
router.delete('/messages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (permanent === 'true') {
      await prisma.whatsAppMessage.delete({ where: { id } });
      res.json({ success: true, message: 'Message permanently deleted' });
    } else {
      await prisma.whatsAppMessage.update({
        where: { id },
        data: { status: 'deleted' }
      });
      res.json({ success: true, message: 'Message soft deleted' });
    }
  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📊 MESSAGE STATS
// =============================================
router.get('/messages/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    // Total messages
    const total = await prisma.whatsAppMessage.count();
    
    // Messages by type
    const byType = await prisma.whatsAppMessage.groupBy({
      by: ['type'],
      _count: true
    });
    
    // Last 7 days - simple approach
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysRaw = await prisma.whatsAppMessage.findMany({
      where: {
        sentAt: { gte: sevenDaysAgo }
      },
      select: {
        sentAt: true
      },
      orderBy: {
        sentAt: 'desc'
      }
    });
    
    // Group by date manually
    const dayMap = {};
    last7DaysRaw.forEach(msg => {
      const date = msg.sentAt.toISOString().split('T')[0];
      dayMap[date] = (dayMap[date] || 0) + 1;
    });
    
    const last7Days = Object.keys(dayMap).map(date => ({
      date: date,
      count: dayMap[date]
    })).sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({
      success: true,
      stats: {
        total,
        byType: byType.map(item => ({
          type: item.type,
          count: item._count
        })),
        last7Days
      }
    });
  } catch (error) {
    console.error('❌ Message stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============================================
// ➖ REMOVE GROUP FROM ACTIVE LIST
// =============================================
router.post('/groups/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    bot.removeActiveGroup(groupId);
    
    res.json({
      success: true,
      message: `Group deactivated: ${groupId}`,
      activeGroups: bot.activeGroups,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Deactivate group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📊 GET GROUP STATS
// =============================================
router.get('/groups/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await bot.getGroupStats();
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TO GROUP (by ID or Name)
// =============================================
router.post('/send', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId, groupName, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let result;
    if (groupId) {
      result = await bot.sendToSpecificGroup(groupId, message);
    } else if (groupName) {
      result = await bot.sendToGroupByName(groupName, message);
    } else {
      return res.status(400).json({ 
        error: 'Either groupId or groupName is required' 
      });
    }
    
    if (result) {
      res.json({
        success: true,
        message: 'Message sent successfully',
        groupId: groupId || groupName,
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send message. Check group ID/name.'
      });
    }
  } catch (error) {
    console.error('❌ Send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 BROADCAST TO ALL ACTIVE GROUPS
// =============================================
router.post('/broadcast-all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message, excludeGroups } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const results = await bot.broadcastToAllGroups(message, excludeGroups || []);
    
    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TO JUMUIA GROUP
// =============================================
router.post('/send-jumuia', authenticate, requireAdmin, async (req, res) => {
  try {
    const { jumuiaName, message } = req.body;
    
    if (!jumuiaName || !message) {
      return res.status(400).json({ 
        error: 'jumuiaName and message are required' 
      });
    }
    
    const result = await bot.sendToJumuia(jumuiaName, message);
    
    if (result) {
      res.json({
        success: true,
        message: `Message sent to ${jumuiaName} Jumuia`,
        jumuiaName: jumuiaName,
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to send to ${jumuiaName} Jumuia`
      });
    }
  } catch (error) {
    console.error('❌ Send Jumuia error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TEST TO GROUP (Legacy)
// =============================================
router.post('/test-group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await bot.sendToGroup(message);
    
    if (result) {
      res.json({
        success: true,
        message: 'Test message sent to default group',
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test message. Bot may not be connected.'
      });
    }
  } catch (error) {
    console.error('❌ Test group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TEST TO USER
// =============================================
router.post('/test-user', authenticate, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await bot.sendToUser(phoneNumber, message);
    
    if (result) {
      res.json({
        success: true,
        message: `Test message sent to ${phoneNumber}`,
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test message. Bot may not be connected.'
      });
    }
  } catch (error) {
    console.error('❌ Test user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🧹 RESET BOT
// =============================================
router.post('/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    const { force } = req.body;
    
    if (!force) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Set force: true to reset.'
      });
    }
    
    const result = await bot.resetBot();
    
    if (result) {
      res.json({
        success: true,
        message: 'WhatsApp bot reset successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to reset bot'
      });
    }
  } catch (error) {
    console.error('❌ Reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔄 REFRESH GROUPS
// =============================================
router.post('/groups/refresh', authenticate, requireAdmin, async (req, res) => {
  try {
    const groups = await bot.refreshGroups();
    res.json({
      success: true,
      message: 'Groups refreshed successfully',
      groups: groups,
      total: groups.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Refresh groups error:', error);
    res.status(500).json({ error: error.message });
  }
});




console.log('✅ WhatsApp Admin routes loaded');

module.exports = router;