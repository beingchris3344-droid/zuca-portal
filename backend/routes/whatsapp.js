// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let isReady = false;
let currentQR = null;

// Initialize WhatsApp
async function initWhatsApp() {
  if (client) return;

  console.log('📱 Initializing WhatsApp...');

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // ✅ INCREASE TIMEOUT
      protocolTimeout: 60000 // 60 seconds instead of default 30
    }
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

    // Show groups - with retry
    try {
      console.log('📋 Fetching groups...');
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);

      console.log(`\n👥 Found ${groups.length} groups:`);
      groups.forEach((group, index) => {
        console.log(`  ${index + 1}. Name: ${group.name}`);
        console.log(`     ID: ${group.id._serialized}`);
        console.log(`     Members: ${group.participants.length}\n`);
      });

      if (groups.length > 0) {
        console.log(`💡 Add to .env: WHATSAPP_GROUP_ID=${groups[0].id._serialized}\n`);
      }
    } catch (err) {
      console.error('❌ Error fetching groups:', err.message);
      console.log('💡 You can still send messages. Get group ID from WhatsApp Web.');
    }
  });

  client.on('disconnected', () => {
    isReady = false;
    console.log('⚠️ WhatsApp disconnected. Reconnecting...');
    setTimeout(initWhatsApp, 5000);
  });

  await client.initialize();
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

// Send test message
router.post('/test', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ 
      success: false, 
      message: 'WhatsApp not ready yet.' 
    });
  }

  const groupId = req.body.groupId || process.env.WHATSAPP_GROUP_ID;
  if (!groupId) {
    return res.status(400).json({ 
      success: false, 
      message: 'No group ID provided. Set WHATSAPP_GROUP_ID in .env or pass groupId in body.' 
    });
  }

  try {
    await client.sendMessage(
      `${groupId}@g.us`,
      `🧪 TEST MESSAGE\n\nThis is a test from ZUCA System!\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`
    );
    res.json({ success: true, message: 'Test message sent!' });
  } catch (err) {
    console.error('❌ Send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send to group (simplified)
router.post('/send', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ 
      success: false, 
      message: 'WhatsApp not ready yet.' 
    });
  }

  const { groupId, message } = req.body;
  const targetGroup = groupId || process.env.WHATSAPP_GROUP_ID;

  if (!targetGroup) {
    return res.status(400).json({ 
      success: false, 
      message: 'No group ID provided.' 
    });
  }

  if (!message) {
    return res.status(400).json({ 
      success: false, 
      message: 'No message provided.' 
    });
  }

  try {
    await client.sendMessage(`${targetGroup}@g.us`, message);
    res.json({ success: true, message: 'Message sent!' });
  } catch (err) {
    console.error('❌ Send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Replace the test-public route with this
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
}, 3000);

module.exports = router;