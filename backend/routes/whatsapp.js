// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');

let client = null;
let isReady = false;
let currentQR = null;

// Check if running on Render
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Initialize WhatsApp
async function initWhatsApp() {
  if (client) return;

  console.log('📱 Initializing WhatsApp...');

  // Use Chrome from Render if in production
  let puppeteerOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  };

  // In production, specify Chrome path
  if (isProduction) {
    puppeteerOptions.executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
    console.log('🔧 Running in production mode with Chrome at:', puppeteerOptions.executablePath);
  }

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerOptions
  });

  client.on('qr', (qr) => {
    currentQR = qr;
    console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 Or visit: /api/whatsapp/qr to see QR code in browser');
  });

  client.on('ready', async () => {
    isReady = true;
    console.log('✅ WhatsApp client ready!');

    try {
      console.log('📋 Fetching groups...');
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);

      console.log(`\n👥 Found ${groups.length} groups:`);
      groups.slice(0, 10).forEach((group, index) => {
        console.log(`  ${index + 1}. Name: ${group.name}`);
        console.log(`     ID: ${group.id._serialized}`);
        console.log(`     Members: ${group.participants.length}\n`);
      });

      if (groups.length > 10) {
        console.log(`  ... and ${groups.length - 10} more groups`);
      }

      if (groups.length > 0) {
        console.log(`💡 Add to .env: WHATSAPP_GROUP_ID=${groups[0].id._serialized}\n`);
      }
    } catch (err) {
      console.error('❌ Error fetching groups:', err.message);
    }
  });

  client.on('disconnected', () => {
    isReady = false;
    console.log('⚠️ WhatsApp disconnected. Reconnecting...');
    setTimeout(initWhatsApp, 10000);
  });

  try {
    await client.initialize();
  } catch (err) {
    console.error('❌ Failed to initialize WhatsApp:', err.message);
    console.log('💡 In production, make sure Chrome is installed');
  }
}

// ===== ROUTES =====

// Get QR code to scan
router.get('/qr', (req, res) => {
  if (!currentQR) {
    return res.json({ 
      success: false, 
      message: 'QR not generated yet. Wait for WhatsApp to initialize.' 
    });
  }
  
  res.send(`
    <html>
      <head>
        <title>WhatsApp QR Code</title>
        <style>
          body { 
            background: #075e54; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            font-family: Arial, sans-serif;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          img { 
            width: 300px; 
            height: 300px; 
            border: 4px solid #25D366;
            border-radius: 12px;
          }
          h2 { color: #075e54; margin-bottom: 10px; }
          .instructions { color: #666; font-size: 14px; margin-top: 20px; }
          .step { color: #075e54; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📱 Scan with WhatsApp</h2>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentQR)}" />
          <div class="instructions">
            <span class="step">1.</span> Open WhatsApp on your phone<br>
            <span class="step">2.</span> Tap Menu → Linked Devices<br>
            <span class="step">3.</span> Tap "Link a Device"<br>
            <span class="step">4.</span> Scan this QR code<br><br>
            ⏳ Wait for "✅ WhatsApp client ready!" in logs
          </div>
        </div>
      </body>
    </html>
  `);
});

// Check connection status
router.get('/status', (req, res) => {
  res.json({
    connected: isReady,
    message: isReady ? '✅ WhatsApp connected!' : '⏳ WhatsApp connecting...'
  });
});

// Get all groups - WITH RETRY
router.get('/groups', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ 
      success: false, 
      message: 'WhatsApp not ready yet. Wait for QR scan.' 
    });
  }

  try {
    console.log('📋 Fetching groups...');
    const chats = await client.getChats();
    const groups = chats
      .filter(chat => chat.isGroup)
      .map(group => ({
        name: group.name,
        id: group.id._serialized,
        members: group.participants.length,
        isCommunity: group.isCommunity || false
      }));

    res.json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (err) {
    console.error('❌ Error fetching groups:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      suggestion: 'Try again or get group ID from WhatsApp Web'
    });
  }
});

// Send test message - PUBLIC
router.get('/test-public', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ 
      success: false, 
      message: 'WhatsApp not ready yet. Check /api/whatsapp/status' 
    });
  }

  const groupId = process.env.WHATSAPP_GROUP_ID;
  if (!groupId) {
    return res.status(400).json({ 
      success: false, 
      message: 'No group ID in .env. Add WHATSAPP_GROUP_ID=your_group_id@g.us' 
    });
  }

  try {
    const message = `🧪 TEST MESSAGE\n\nThis is a test from ZUCA System!\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}\n\n✅ WhatsApp integration is working!`;
    
    console.log(`📤 Sending test to group: ${groupId}`);
    console.log(`📝 Message: ${message}`);
    
    await client.sendMessage(groupId, message);
    
    res.json({ 
      success: true, 
      message: '✅ Test message sent to WhatsApp group!' 
    });
  } catch (err) {
    console.error('❌ Send error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      suggestion: 'Check if group ID is correct and you are a member'
    });
  }
});

// Initialize on startup
setTimeout(() => {
  initWhatsApp();
}, 5000);

module.exports = router;