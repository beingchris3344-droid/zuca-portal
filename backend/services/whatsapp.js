// services/whatsapp.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let isReady = false;

async function initWhatsApp() {
  if (client) return;

  console.log('📱 Initializing WhatsApp...');

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('📱 Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', async () => {
    isReady = true;
    console.log('✅ WhatsApp client ready!');

    // 👇 DISPLAY ALL YOUR GROUPS TO FIND THE ID
    try {
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);

      console.log(`\n👥 Found ${groups.length} groups:`);
      groups.forEach((group, index) => {
        console.log(`  ${index + 1}. Name: ${group.name}`);
        console.log(`     ID: ${group.id._serialized}`);
        console.log(`     Members: ${group.participants.length}\n`);
      });

      // Save first group as default if no env set
      if (!process.env.WHATSAPP_GROUP_ID && groups.length > 0) {
        console.log(`\n💡 To auto-send to first group: ${groups[0].name}`);
        console.log(`   Add to .env: WHATSAPP_GROUP_ID=${groups[0].id._serialized}`);
      }
    } catch (err) {
      console.error('Error fetching groups:', err.message);
    }
  });

  client.on('disconnected', () => {
    isReady = false;
    console.log('⚠️ WhatsApp disconnected');
  });

  await client.initialize();
}

async function sendWhatsAppMessage(title, message) {
  try {
    if (!process.env.WHATSAPP_GROUP_ID) {
      console.log('⚠️ No WhatsApp group ID configured. Check your .env file.');
      return;
    }

    if (!isReady) {
      console.log('⏳ WhatsApp not ready, initializing...');
      await initWhatsApp();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!isReady) {
      console.log('⚠️ WhatsApp not ready, skipping message');
      return;
    }

    const groupId = process.env.WHATSAPP_GROUP_ID;
    console.log(`📤 Sending to group ${groupId}...`);

    await client.sendMessage(
      `${groupId}@g.us`,
      `📢 ${title}\n\n${message}`
    );

    console.log('✅ WhatsApp message sent to group!');
  } catch (err) {
    console.error('❌ WhatsApp error:', err.message);
    if (err.message.includes('not-authorized')) {
      console.log('🔑 Session expired. Restart server to re-scan QR code.');
    }
  }
}

// Initialize on startup
initWhatsApp();

module.exports = { sendWhatsAppMessage };