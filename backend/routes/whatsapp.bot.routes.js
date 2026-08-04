// routes/whatsapp.bot.routes.js
const express = require('express');
const router = express.Router();
const bot = require('../services/whatsapp.bot');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// ==================== MIDDLEWARE ====================

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zuca_super_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function requireAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.specialRole === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin only' });
  }
}

// ==================== ROUTES ====================

// 📊 Bot status (public)
router.get('/status', async (req, res) => {
  try {
    const status = bot.getStatus();
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📤 Send message to group (Admin only)
router.post('/send-to-group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await bot.sendToGroup(message);
    
    res.json({
      success: true,
      message: 'Message sent to group',
      result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 Send contribution list to group (Admin only)
router.post('/contribution-list/:campaignId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = await bot.sendContributionList(campaignId);
    
    res.json({
      success: true,
      message: 'Contribution list sent to group',
      result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 Broadcast to all users (Admin only) - FIXED VERSION
router.post('/broadcast', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // ✅ FIX: Use raw SQL query to get users with phone numbers
    const users = await prisma.$queryRaw`
      SELECT phone, "fullName" FROM "User" 
      WHERE phone IS NOT NULL AND phone != ''
    `;

    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'No users with phone numbers found',
        sent: 0
      });
    }

    const formattedMessage = `📢 *${title}*\n\n${message}\n\n_Tumsifu Yesu Kristu! 🙏_`;
    
    let sent = 0;
    for (const user of users) {
      try {
        await bot.sendToUser(user.phone, formattedMessage);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send to ${user.fullName}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `Sent to ${sent} users`,
      total: users.length
    });
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 Send to specific user (Admin only)
router.post('/send-to-user', authenticate, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await bot.sendToUser(phoneNumber, message);
    
    res.json({
      success: true,
      message: `Message sent to ${phoneNumber}`,
      result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ WhatsApp Bot routes loaded');

module.exports = router;