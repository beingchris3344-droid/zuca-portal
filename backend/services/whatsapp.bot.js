// services/whatsapp.bot.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.groupId = process.env.ZUCA_GROUP_ID || '120363428001788260@g.us';
    this.qrCode = null;
  }

  async connect() {
    console.log('🔌 Connecting to WhatsApp...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['ZUCA Bot', 'Chrome', '120.0.0.0'],
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: true,
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          console.log('📱 SCAN THIS QR CODE WITH YOUR PHONE:');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`🔴 Connection closed. Reconnecting: ${shouldReconnect}`);
          
          if (shouldReconnect) {
            setTimeout(() => this.connect(), 5000);
          } else {
            console.log('❌ Logged out. Please restart and scan again.');
          }
        }

        if (connection === 'open') {
          this.isConnected = true;
          console.log('✅ WhatsApp Bot Connected!');
          console.log(`📱 Bot is ready to send messages to group: ${this.groupId}`);
          
          // Send welcome message after a short delay
          setTimeout(async () => {
            await this.sendToGroup('🤖 ZUCA Bot is online and ready!');
          }, 2000);
        }
      });

      // Listen for incoming messages
      this.sock.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessage(m);
      });

    } catch (error) {
      console.error('❌ Connection error:', error.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  // 📤 SEND TO GROUP
  async sendToGroup(message) {
    if (!this.sock || !this.isConnected) {
      console.log('⚠️ Bot not connected, trying to reconnect...');
      await this.connect();
      return null;
    }

    try {
      const result = await this.sock.sendMessage(this.groupId, { 
        text: message 
      });
      console.log(`✅ Group message sent: ${message.substring(0, 50)}...`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send group message:', error.message);
      return null;
    }
  }

  // 📤 SEND TO INDIVIDUAL USER
  async sendToUser(phoneNumber, message) {
    if (!this.sock || !this.isConnected) {
      console.log('⚠️ Bot not connected');
      return null;
    }

    try {
      let jid = phoneNumber;
      if (!jid.includes('@s.whatsapp.net')) {
        jid = `${phoneNumber}@s.whatsapp.net`;
      }

      const result = await this.sock.sendMessage(jid, { 
        text: message 
      });
      console.log(`✅ Message sent to ${phoneNumber}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);
      return null;
    }
  }

  // 📤 SEND CONTRIBUTION LIST
  async sendContributionList(campaignId) {
    try {
      const campaign = await prisma.contributionType.findUnique({
        where: { id: campaignId },
        include: {
          pledges: {
            include: {
              user: {
                select: {
                  fullName: true,
                  membership_number: true
                }
              }
            }
          }
        }
      });

      if (!campaign) {
        console.log(`❌ Campaign ${campaignId} not found`);
        return null;
      }

      let message = `📊 *${campaign.title} CONTRIBUTION LIST*\n\n`;
      
      const sorted = [...campaign.pledges].sort((a, b) => b.amountPaid - a.amountPaid);
      
      let count = 1;
      let hasPaid = false;
      
      for (const p of sorted) {
        const status = p.amountPaid > 0 ? '✅' : '⏳';
        if (p.amountPaid > 0) hasPaid = true;
        message += `${count}. ${p.user.fullName} - KES ${p.amountPaid.toLocaleString()} ${status}\n`;
        count++;
      }

      const totalRaised = campaign.pledges.reduce((sum, p) => sum + p.amountPaid, 0);
      const target = campaign.amountRequired;
      const percentage = target > 0 ? ((totalRaised / target) * 100).toFixed(1) : 0;

      message += `\n💰 *Total Raised:* KES ${totalRaised.toLocaleString()}`;
      message += `\n🎯 *Target:* KES ${target.toLocaleString()} (${percentage}%)`;
      message += `\n👥 *Contributors:* ${campaign.pledges.filter(p => p.amountPaid > 0).length} members`;
      message += `\n\n_Tumsifu Yesu Kristu! 🙏_`;

      await this.sendToGroup(message);
      console.log(`✅ Contribution list sent for ${campaign.title}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending contribution list:', error.message);
      return null;
    }
  }

  // 📥 HANDLE INCOMING MESSAGES
  async handleIncomingMessage(m) {
    try {
      const msg = m.messages[0];
      if (!msg || !msg.message) return;

      const from = msg.key.remoteJid;
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption ||
                   '';

      // Only process text messages
      if (!text) return;

      console.log(`📩 Message from ${from}: ${text.substring(0, 50)}`);

      // Handle commands (only from group)
      const isGroup = from.endsWith('@g.us');
      
      if (isGroup) {
        const lowerText = text.toLowerCase();
        
        if (lowerText === '!ping') {
          await this.sendToGroup('🏓 Pong! Bot is alive!');
        }
        
        if (lowerText === '!help') {
          const help = `🤖 *ZUCA Bot Commands*\n\n` +
            `• !ping - Check if bot is alive\n` +
            `• !help - Show this menu\n` +
            `• !campaigns - List active campaigns\n` +
            `• !contributions - Show today's contributions\n` +
            `• !link - Get app download link\n\n` +
            `Tumsifu Yesu Kristu! 🙏`;
          await this.sendToGroup(help);
        }

        if (lowerText === '!campaigns') {
          const campaigns = await prisma.contributionType.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
          });
          
          if (campaigns.length === 0) {
            await this.sendToGroup('📭 No active campaigns.');
          } else {
            let msg = '💰 *Active Campaigns*\n\n';
            campaigns.forEach((c, i) => {
              msg += `${i+1}. ${c.title}\n   Target: KES ${c.amountRequired.toLocaleString()}\n\n`;
            });
            await this.sendToGroup(msg);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error handling message:', error.message);
    }
  }

  // 📊 GET BOT STATUS
  getStatus() {
    return {
      connected: this.isConnected,
      groupId: this.groupId,
      ready: this.sock !== null,
      qrCode: this.qrCode ? 'Available (scan with WhatsApp)' : 'Not available'
    };
  }
}

module.exports = new WhatsAppBot();