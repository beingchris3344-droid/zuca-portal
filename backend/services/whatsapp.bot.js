// services/whatsapp.bot.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Load AI service
const { chatWithGroq } = require('./deepseek/deepseekClient');
const { executeToolCall } = require('./deepseek/toolHandlers');

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.qrCode = null;
    this.qrCodeBase64 = null;
    this.groupId = null;
    this.connectionStatus = 'disconnected';
    this.lastError = null;
    this.authFolder = './auth_info';
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.botNumber = null;
  }

  async loadConfig() {
    try {
      const config = await prisma.setting.findUnique({
        where: { key: 'whatsapp_group_id' }
      });
      
      this.groupId = config?.value || process.env.ZUCA_GROUP_ID || null;
      
      const statusConfig = await prisma.setting.findUnique({
        where: { key: 'whatsapp_status' }
      });
      if (statusConfig) {
        this.connectionStatus = statusConfig.value;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error loading config:', error.message);
      this.groupId = process.env.ZUCA_GROUP_ID || null;
      return false;
    }
  }

  async connect() {
    if (this.isConnecting) {
      console.log('⏳ Connection already in progress...');
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';
    await this.updateStatus('connecting');

    try {
      await this.loadConfig();
      
      console.log('🔌 Connecting to WhatsApp...');
      
      if (!fs.existsSync(this.authFolder)) {
        fs.mkdirSync(this.authFolder, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['ZUCA Bot', 'Chrome', '120.0.0.0'],
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          try {
            this.qrCodeBase64 = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            console.log('✅ QR Code generated for web display');
          } catch (qrError) {
            console.error('❌ QR generation error:', qrError);
          }
          
          try {
            const publicDir = path.join(__dirname, '../public');
            if (!fs.existsSync(publicDir)) {
              fs.mkdirSync(publicDir, { recursive: true });
            }
            await QRCode.toFile(path.join(publicDir, 'qr-code.png'), qr, {
              width: 300,
              margin: 2
            });
          } catch (fileError) {
            console.error('❌ QR file save error:', fileError);
          }
          
          this.connectionStatus = 'qr_required';
          await this.updateStatus('qr_required');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log(`🔴 Connection closed. Status: ${statusCode}`);
          
          if (statusCode === DisconnectReason.loggedOut) {
            this.connectionStatus = 'logged_out';
            this.isConnected = false;
            this.botNumber = null;
            await this.updateStatus('logged_out');
            console.log('❌ Logged out. Please unlink and relink the bot.');
            this.cleanupAuth();
          } else if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts), 60000);
            console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connectionStatus = 'reconnecting';
            await this.updateStatus('reconnecting');
            
            setTimeout(() => {
              this.isConnecting = false;
              this.connect();
            }, delay);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.connectionStatus = 'error';
            this.lastError = 'Max reconnection attempts reached';
            await this.updateStatus('error');
            console.log('❌ Max reconnection attempts reached. Manual intervention required.');
          }
        }

        if (connection === 'open') {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionStatus = 'connected';
          this.qrCode = null;
          this.qrCodeBase64 = null;
          
          // ✅ Store bot's phone number from WhatsApp
          this.botNumber = this.sock?.user?.id?.split(':')[0] || null;
          console.log(`✅ WhatsApp Bot Connected! Bot Number: ${this.botNumber}`);
          
          await this.updateStatus('connected');
          
          console.log(`📱 Bot is ready for group: ${this.groupId || 'Not set'}`);
          
        }
      });

      // Listen for incoming messages
      this.sock.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessage(m);
      });

    } catch (error) {
      console.error('❌ Connection error:', error.message);
      this.connectionStatus = 'error';
      this.lastError = error.message;
      this.isConnecting = false;
      await this.updateStatus('error');
      
      setTimeout(() => {
        this.isConnecting = false;
        this.connect();
      }, 5000);
    }
  }

  async disconnect() {
    try {
      if (this.sock) {
        this.sock.ws?.close();
        this.sock = null;
      }
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionStatus = 'disconnected';
      this.qrCode = null;
      this.qrCodeBase64 = null;
      this.botNumber = null;
      await this.updateStatus('disconnected');
      console.log('🔌 Disconnected from WhatsApp');
      return true;
    } catch (error) {
      console.error('❌ Disconnect error:', error.message);
      return false;
    }
  }

  cleanupAuth() {
    try {
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        console.log('🧹 Auth folder cleaned up');
      }
      this.qrCode = null;
      this.qrCodeBase64 = null;
      this.botNumber = null;
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }

  async updateStatus(status) {
    try {
      await prisma.setting.upsert({
        where: { key: 'whatsapp_status' },
        update: { 
          value: status,
          updatedAt: new Date()
        },
        create: {
          key: 'whatsapp_status',
          value: status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      // Silently fail
    }
  }

  async setGroupId(groupId) {
    try {
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      if (!groupId.includes('@g.us')) {
        groupId = groupId.replace(/[^0-9]/g, '') + '@g.us';
      }
      
      await prisma.setting.upsert({
        where: { key: 'whatsapp_group_id' },
        update: { 
          value: groupId,
          updatedAt: new Date()
        },
        create: {
          key: 'whatsapp_group_id',
          value: groupId,
          updatedAt: new Date()
        }
      });
      
      this.groupId = groupId;
      console.log(`✅ Group ID set to: ${groupId}`);
      
      if (this.isConnected) {
        await this.sendToGroup('🔄 Group ID has been updated successfully!');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to set group ID:', error.message);
      throw error;
    }
  }

  async getGroupId() {
    if (this.groupId) return this.groupId;
    
    const config = await prisma.setting.findUnique({
      where: { key: 'whatsapp_group_id' }
    });
    
    return config?.value || null;
  }

  // 📤 SEND TO GROUP
  async sendToGroup(message) {
    if (!this.sock || !this.isConnected) {
      throw new Error('Bot is not connected to WhatsApp');
    }

    if (!this.groupId) {
      throw new Error('Group ID not set. Please configure the group ID first.');
    }

    try {
      // Check if group exists
      try {
        const groupMetadata = await this.sock.groupMetadata(this.groupId);
        if (!groupMetadata) {
          throw new Error('Group not found or bot is not a member');
        }
      } catch (groupError) {
        throw new Error(`Cannot access group: ${groupError.message}`);
      }

      const result = await this.sock.sendMessage(this.groupId, { 
        text: message 
      });
      console.log(`✅ Group message sent: ${message.substring(0, 50)}...`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to send group message:', error.message);
      throw error;
    }
  }

  // 📤 SEND TO INDIVIDUAL USER
  async sendToUser(phoneNumber, message) {
    if (!this.sock || !this.isConnected) {
      throw new Error('Bot is not connected to WhatsApp');
    }

    try {
      let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      if (cleanNumber.startsWith('0')) {
        cleanNumber = '254' + cleanNumber.substring(1);
      } else if (!cleanNumber.startsWith('254') && cleanNumber.length === 10) {
        cleanNumber = '254' + cleanNumber;
      } else if (!cleanNumber.startsWith('254')) {
        cleanNumber = '254' + cleanNumber;
      }
      
      let jid = `${cleanNumber}@s.whatsapp.net`;

      const result = await this.sock.sendMessage(jid, { 
        text: message 
      });
      console.log(`✅ Message sent to ${phoneNumber}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);
      throw error;
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
        throw new Error(`Campaign ${campaignId} not found`);
      }

      let message = `📊 *${campaign.title} CONTRIBUTION LIST*\n\n`;
      
      const sorted = [...campaign.pledges].sort((a, b) => b.amountPaid - a.amountPaid);
      
      let count = 1;
      const contributors = campaign.pledges.filter(p => p.amountPaid > 0);
      
      if (contributors.length === 0) {
        message += 'No contributions yet. Be the first to give! 🙏\n\n';
      } else {
        for (const p of sorted) {
          if (p.amountPaid > 0) {
            message += `${count}. ${p.user.fullName} - KES ${p.amountPaid.toLocaleString()} ✅\n`;
            count++;
          }
        }
      }

      const totalRaised = campaign.pledges.reduce((sum, p) => sum + p.amountPaid, 0);
      const target = campaign.amountRequired;
      const percentage = target > 0 ? ((totalRaised / target) * 100).toFixed(1) : 0;

      message += `\n💰 *Total Raised:* KES ${totalRaised.toLocaleString()}`;
      message += `\n🎯 *Target:* KES ${target.toLocaleString()} (${percentage}%)`;
      message += `\n👥 *Contributors:* ${contributors.length} members`;
      message += `\n\n_Tumsifu Yesu Kristu! 🙏_`;

      await this.sendToGroup(message);
      console.log(`✅ Contribution list sent for ${campaign.title}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending contribution list:', error.message);
      throw error;
    }
  }
// =============================================
// 📥 HANDLE INCOMING MESSAGES (WITH AI MENTION)
// =============================================
async handleIncomingMessage(m) {
  try {
    const msg = m.messages[0];
    if (!msg || !msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // =============================================
    // ✅ Get BOTH bot identifiers
    // =============================================
    const botId = this.sock?.user?.id; // 254736549976:1@s.whatsapp.net
    const botNumber = botId?.split(':')[0]; // 254736549976
    
    // 🔥 Get LID from the correct source - the creds
    let lidNumber = null;
    try {
      // Read the creds from the auth folder
      const credsPath = path.join(this.authFolder, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        const lid = credsData.lid || null;
        lidNumber = lid?.split(':')[0] || null;
        console.log(`🔍 Bot LID from file: ${lidNumber}`);
      }
    } catch (e) {
      console.log(`⚠️ Could not read LID from file: ${e.message}`);
    }
    
    // Also try to get it from the socket
    if (!lidNumber) {
      try {
        const lid = this.sock?.authState?.creds?.lid || this.sock?.user?.lid || null;
        if (lid) {
          lidNumber = lid?.split(':')[0] || null;
          console.log(`🔍 Bot LID from socket: ${lidNumber}`);
        }
      } catch (e) {}
    }
    
    console.log(`🔍 Bot Phone: ${botNumber}`);
    console.log(`🔍 Bot LID: ${lidNumber}`);
    
    // Check if message is from the bot itself
    if (sender === botId || from === botId || sender?.includes(botNumber)) {
      console.log(`⏭️ Ignoring own message`);
      return;
    }

    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 msg.message.imageMessage?.caption ||
                 '';

    if (!text) return;

    console.log(`📩 Message from ${from}: ${text.substring(0, 50)}`);

    const isGroup = from.endsWith('@g.us');
    
    if (isGroup) {
      // =============================================
      // ✅ CHECK FOR BOTH PHONE NUMBER AND LID
      // =============================================
      
      console.log(`🔍 Checking text: "${text}"`);
      
      // Check for @ + phone number (254736549976)
      const hasPhoneMention = text.includes(`@${botNumber}`);
      
      // Check for @ + LID number (273010401485038)
      const hasLIDMention = lidNumber ? text.includes(`@${lidNumber}`) : false;
      
      // ALSO check for the LID without @ (in case it's mentioned differently)
      const hasLIDInText = lidNumber ? text.includes(lidNumber) : false;
      
      // Check for text mentions
      const hasTextMention = 
        text.toLowerCase().includes('zuca bot') ||
        text.toLowerCase().includes('@zuca') ||
        text.toLowerCase().includes('hey bot') ||
        text.toLowerCase().includes('hello bot');
      
      // Check mentionedJid array
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const hasMentionedJid = mentionedJids.some(jid => {
        if (!jid) return false;
        const jidNumber = jid.split(/[:@]/)[0];
        // Check against BOTH phone number and LID
        return jidNumber === botNumber || (lidNumber && jidNumber === lidNumber);
      });
      
      // Check if reply to bot
      const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === botId;
      
      // =============================================
      // 🎯 COMBINE ALL CHECKS
      // =============================================
      const isMentioned = hasPhoneMention || hasLIDMention || hasLIDInText || hasTextMention || hasMentionedJid || isReplyToBot;
      
      console.log(`🔍 hasPhoneMention: ${hasPhoneMention}`);
      console.log(`🔍 hasLIDMention: ${hasLIDMention}`);
      console.log(`🔍 hasLIDInText: ${hasLIDInText}`);
      console.log(`🔍 hasTextMention: ${hasTextMention}`);
      console.log(`🔍 hasMentionedJid: ${hasMentionedJid}`);
      console.log(`🔍 isReplyToBot: ${isReplyToBot}`);
      console.log(`🔍 isMentioned: ${isMentioned}`);
      
      if (isMentioned) {
        console.log(`🤖 Bot mentioned/replied! Processing with AI...`);
        await this.handleAIMention(from, text, msg);
        return;
      }

      // =============================================
      // ❌ NORMAL MESSAGES - IGNORE
      // =============================================
      console.log(`⏭️ Ignoring normal message (no mention/reply)`);
      return;
    }

  } catch (error) {
    console.error('❌ Error handling message:', error.message);
  }
}
// =============================================
// 🤖 HANDLE AI MENTIONS
// =============================================
async handleAIMention(from, text, msg) {
  try {
    // Send typing indicator
    await this.sock.sendPresenceUpdate('composing', from);
    
    // Get bot identifiers
    const botId = this.sock?.user?.id;
    const botNumber = botId?.split(':')[0];
    const botLID = this.sock?.authState?.creds?.lid || null;
    const lidNumber = botLID?.split(':')[0] || null;
    
    let cleanText = text
      // Remove @ followed by phone number
      .replace(new RegExp(`@${botNumber}`, 'g'), '')
      // Remove @ followed by LID number
      .replace(new RegExp(`@${lidNumber}`, 'g'), '')
      // Remove any @mention patterns
      .replace(/@[a-zA-Z0-9\-_:.]+/g, '')
      // Remove text mentions
      .replace(/@ZUCA_Bot/gi, '')
      .replace(/@ZUCA Bot/gi, '')
      .replace(/ZUCA Bot/gi, '')
      .replace(/hey bot/gi, '')
      .replace(/hello bot/gi, '')
      .replace(/@zuca/gi, '')
      .trim();
    
    console.log(`📝 Clean text: "${cleanText}"`);
    
    if (!cleanText || cleanText.length < 2) {
      await this.sendToGroup('🙏 Tumsifu Yesu Kristu! How can I help you?\n\n💡 Try: "What\'s today\'s mass?" or "Show campaigns"');
      return;
    }
    
    console.log(`🤖 Sending to AI: "${cleanText}"`);
    
    const aiResponse = await this.callAISystem(cleanText, from);
    
    if (aiResponse) {
      if (aiResponse.length > 2000) {
        const chunks = aiResponse.match(/.{1,2000}/g) || [];
        for (const chunk of chunks) {
          await this.sendToGroup(chunk);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        await this.sendToGroup(aiResponse);
      }
    } else {
      await this.sendToGroup('🙏 Sorry, I had trouble processing that. Please try again.');
    }
    
  } catch (error) {
    console.error('❌ AI mention error:', error);
    await this.sendToGroup('🙏 Sorry, I had trouble processing that. Please try again.');
  }
}
  // =============================================
  // 🧠 CALL AI SYSTEM
  // =============================================
  async callAISystem(message, from) {
    try {
      // Build context for the AI
      const userContext = {
        user: null,
        stats: {},
        currentTime: new Date().toISOString(),
        source: 'whatsapp'
      };
      
      const messages = [
        { role: 'user', content: message }
      ];
      
      // Get AI response
      const aiResponse = await chatWithGroq(messages, userContext);
      
      // Execute any actions
      let finalReply = aiResponse.content || '';
      
      if (aiResponse.action && aiResponse.action.name) {
        console.log(`🔧 Executing action: ${aiResponse.action.name}`);
        
        try {
          const actionResult = await executeToolCall(
            aiResponse.action.name,
            aiResponse.action.arguments || {},
            { user: null, req: null }
          );
          
          if (actionResult) {
            const formatted = this.formatActionResult(actionResult);
            if (formatted) {
              finalReply = formatted;
            }
          }
        } catch (actionError) {
          console.error('❌ Action execution error:', actionError);
          finalReply = finalReply || '🙏 I tried to do that but encountered an issue. Please try again.';
        }
      }
      
      // Ensure we always end with Tumsifu Yesu Kristu
      if (!finalReply.includes('Tumsifu Yesu Kristu')) {
        finalReply += '\n\n_Tumsifu Yesu Kristu! 🙏_';
      }
      
      return finalReply;
      
    } catch (error) {
      console.error('AI call error:', error);
      return null;
    }
  }

  // =============================================
  // 📝 FORMAT ACTION RESULTS FOR WHATSAPP
  // =============================================
  formatActionResult(actionResult) {
    if (!actionResult) return null;
    
    if (actionResult.error) {
      return `❌ ${actionResult.error}`;
    }
    
    // User profile
    if (actionResult.profile) {
      const p = actionResult.profile;
      let reply = `👤 *${p.fullName}*\n\n`;
      reply += `📧 ${p.email}\n`;
      reply += `📱 ${p.phone || 'N/A'}\n`;
      reply += `🆔 ${p.membershipNumber || 'N/A'}\n`;
      reply += `🏠 ${p.jumuia || 'None'}\n`;
      reply += `💰 Paid: KES ${(actionResult.contributions?.totalPaid || 0).toLocaleString()}`;
      return reply;
    }
    
    // Pledges
    if (actionResult.pledges) {
      let reply = `💰 *YOUR PLEDGES*\n\n`;
      actionResult.pledges.slice(0, 5).forEach((p, i) => {
        reply += `${i+1}. *${p.campaign}*\n`;
        reply += `   Paid: KES ${p.amountPaid.toLocaleString()}\n`;
        reply += `   Status: ${p.status}\n\n`;
      });
      if (actionResult.summary?.totalPaid) {
        reply += `📊 Total Paid: KES ${actionResult.summary.totalPaid.toLocaleString()}`;
      }
      return reply;
    }
    
    // Mass programs
    if (actionResult.massPrograms && actionResult.massPrograms.length > 0) {
      let reply = '⛪ *UPCOMING MASSES*\n\n';
      actionResult.massPrograms.slice(0, 5).forEach((m, i) => {
        const date = new Date(m.date);
        reply += `${i+1}. ${date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} — ${m.venue}\n`;
        if (m.time) reply += `   🕐 ${m.time}\n`;
      });
      return reply;
    }
    
    // Announcements
    if (actionResult.announcements && actionResult.announcements.length > 0) {
      let reply = '📢 *ANNOUNCEMENTS*\n\n';
      actionResult.announcements.slice(0, 3).forEach(a => {
        reply += `*${a.title}*\n`;
        reply += `${(a.content || '').substring(0, 150)}${(a.content || '').length > 150 ? '...' : ''}\n\n`;
      });
      return reply;
    }
    
    // Campaigns
    if (actionResult.campaigns && actionResult.campaigns.length > 0) {
      let reply = '💰 *ACTIVE CAMPAIGNS*\n\n';
      actionResult.campaigns.forEach(c => {
        reply += `*${c.title}*\n`;
        reply += `🎯 Target: KES ${c.amountRequired?.toLocaleString()}\n`;
        if (c.totalRaised) reply += `💰 Raised: KES ${c.totalRaised.toLocaleString()}\n`;
        reply += `\n`;
      });
      return reply;
    }
    
    // Today's readings
    if (actionResult.readings) {
      const r = actionResult.readings;
      let reply = `📖 *READINGS FOR TODAY*\n\n`;
      reply += `📕 ${r.celebration || 'Today\'s Mass'}\n\n`;
      if (r.firstReading) reply += `📕 ${r.firstReading}\n\n`;
      if (r.gospel) reply += `✝️ ${r.gospel}\n`;
      return reply;
    }
    
    // Help
    if (actionResult.helpText) {
      return actionResult.helpText;
    }
    
    // Simple message
    if (actionResult.message) {
      return actionResult.message;
    }
    
    // Success
    if (actionResult.success && actionResult.message) {
      return `✅ ${actionResult.message}`;
    }


    // =============================================
// 🎵 HYMNS/SONGS RESULTS
// =============================================

// Single hymn with lyrics
if (actionResult.title && actionResult.lyrics) {
  const lyrics = actionResult.lyrics.replace(/<[^>]*>/g, '').trim();
  const preview = lyrics.substring(0, 500);
  const isLong = lyrics.length > 500;
  return `🎵 *${actionResult.title}*${actionResult.reference ? ` (${actionResult.reference})` : ''}\n\n${preview}${isLong ? '\n\n📖 *Full lyrics available in the hymn book!*' : ''}`;
}

// Hymn list (multiple results)
if (actionResult.hymns && actionResult.hymns.length > 0) {
  let reply = `🎵 *Hymns Found (${actionResult.count || actionResult.hymns.length}):*\n\n`;
  actionResult.hymns.slice(0, 10).forEach((h, i) => {
    reply += `${i+1}. *${h.title}*${h.reference ? ` (${h.reference})` : ''}${h.hasLyrics ? ' 📝' : ''}\n`;
  });
  if (actionResult.hymns.length > 10) {
    reply += `\n... and ${actionResult.hymns.length - 10} more`;
  }
  reply += `\n\n💡 Say *"Get lyrics for [title]"* to see full lyrics!`;
  return reply;
}
    
    // Fallback
    return null;
  }

  // 📊 GET BOT STATUS
  getStatus() {
    return {
      connected: this.isConnected,
      groupId: this.groupId,
      connectionStatus: this.connectionStatus,
      qrCode: this.qrCodeBase64 || null,
      qrRequired: this.connectionStatus === 'qr_required',
      ready: this.sock !== null && this.isConnected,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      botNumber: this.botNumber || null
    };
  }

  // 🧹 CLEANUP
  async cleanup() {
    await this.disconnect();
    this.cleanupAuth();
    this.connectionStatus = 'disconnected';
    await this.updateStatus('disconnected');
  }
}

module.exports = new WhatsAppBot();