// services/mailer.js
const SibApiV3Sdk = require('sib-api-v3-sdk');

// ==================== BREVO FOR ALL EMAILS ====================
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

// Helper: Send via Brevo
async function sendViaBrevo(to, subject, htmlContent, textContent, fromName = "ZUCA 🙏") {
  try {
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = { email: process.env.EMAIL_USER || "zucaportal2025@gmail.com", name: fromName };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent || "";
    
    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent to ${to} via Brevo, MessageId: ${response.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Brevo email failed to ${to}:`, error.message);
    return false;
  }
}

// Helper: Get warm, spiritual greeting
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning and have a blessed day ahead";
  if (hour < 17) return "Good afternoon and have a fruitful day ahead";
  if (hour < 21) return "Good evening and have a peaceful night";
  return "Good night, may God watch over you";
}

// Helper: Format current time beautifully
function getCurrentTime() {
  return new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper: Get emoji based on notification type
function getNotificationEmoji(type) {
  const emojis = {
    'announcement': '📢',
    'program': '⛪',
    'contribution': '💰',
    'pledge_approved': '✅',
    'pledge_message': '💬',
    'new_pledge': '🎯',
    'payment_added': '💵',
    'payment_success': '✅',
    'payment_received': '💰',
    'payment_failed': '❌',
    'game_invite': '🎮',
    'event_reminder': '⏰',
    'schedule': '📅',
    'role_change': '👑',
    'executive_appointment': '🎉',
    'executive_removed': '📋',
    'youtube_new_video': '📹',
    'youtube_live': '🔴',
    'media_comment': '💬',
    'new_media': '📸',
    'user_login': '👤',
    'pin': '📌',
    'mention': '@',
    'test': '🔔',
    'password_reset': '🔐',
    'welcome': '🎉',
    'verification': '✅'
  };
  return emojis[type] || '🔔';
}

// Helper: Get color based on notification type
function getNotificationColor(type) {
  const colors = {
    'announcement': '#d97706',
    'program': '#f59e0b',
    'contribution': '#fbbf24',
    'pledge_approved': '#10b981',
    'payment_added': '#10b981',
    'payment_success': '#10b981',
    'payment_received': '#10b981',
    'event_reminder': '#f59e0b',
    'youtube_live': '#ef4444',
    'executive_appointment': '#fbbf24',
    'user_login': '#6b7280',
    'password_reset': '#ef4444',
    'welcome': '#fbbf24',
    'verification': '#10b981'
  };
  return colors[type] || '#f59e0b';
}

// ZUCA Logo URL
const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";

// Get a random blessing for email footer
function getRandomBlessing() {
  const blessings = [
    "May God's love shine upon you today and always. 🙏",
    "Wishing you God's abundant blessings. ✝️",
    "Keep faith, stay blessed, and walk with God. 🌟",
    "May the Lord guide your steps today. 🙌",
    "You are in our prayers. God bless you! 💒",
    "Tumsifu Yesu Kristu - Praise Jesus Christ! 🙏"
  ];
  return blessings[Math.floor(Math.random() * blessings.length)];
}

// ==================== WELCOME EMAIL ====================
async function sendWelcomeEmail(user, membershipNumber) {
  try {
    const greeting = getTimeBasedGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Dear Member';
    const currentTime = getCurrentTime();
    const blessing = getRandomBlessing();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎉 Welcome to ZUCA Family!</title>
        <style>
          @keyframes gentlePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .welcome-card {
            animation: fadeInUp 0.6s ease-out;
          }
          .membership-number {
            animation: gentlePulse 2s ease-in-out infinite;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #fef3c7; min-height: 100vh; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div class="welcome-card" style="background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);">
            <div style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
              <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 90px; height: 90px; border-radius: 50%; margin-bottom: 15px; border: 4px solid white; box-shadow: 0 10px 25px rgba(0,0,0,0.2); object-fit: cover;">
              <h1 style="color: white; margin: 0; font-size: 36px; letter-spacing: 2px;">ZUCA</h1>
              <p style="color: white; margin: 10px 0 0; font-size: 14px; font-style: italic;">Zetech University Catholic Action</p>
            </div>
            <div style="padding: 30px 30px 20px; background: #fffbeb;">
              <div style="font-size: 18px; color: #b45309; margin-bottom: 5px;">✨ ${greeting},</div>
              <h2 style="color: #78350f; margin: 0 0 8px; font-size: 28px; font-weight: 600;">${firstName}! 🎉🙏</h2>
              <div style="font-size: 13px; color: #92400e; margin-top: 8px; border-left: 3px solid #fbbf24; padding-left: 12px;">
                🕊️ ${currentTime}
              </div>
            </div>
            <div style="padding: 0 30px;">
              <div style="background: #fef3c7; padding: 20px; border-radius: 20px; margin: 10px 0; text-align: center;">
                <p style="font-size: 18px; margin: 0; color: #92400e;">🙏</p>
                <p style="color: #78350f; margin: 10px 0 0; line-height: 1.6;">
                  <strong>You are now officially part of the ZUCA family!</strong><br>
                  Welcome to the Zetech University Catholic Action community.
                </p>
              </div>
            </div>
            <div style="padding: 10px 30px;">
              <div style="background: #fffbeb; border-radius: 24px; padding: 25px; margin: 10px 0; border: 1px solid #fde68a;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="background: #fbbf24; display: inline-block; padding: 6px 16px; border-radius: 30px; font-size: 12px; font-weight: 600; color: #78350f;">
                    ⭐ YOUR MEMBERSHIP NUMBER ⭐
                  </div>
                </div>
                <div class="membership-number" style="background: linear-gradient(135deg, #fef3c7, #fffbeb); padding: 25px; border-radius: 20px; text-align: center; margin-bottom: 20px; border: 2px solid #fbbf24;">
                  <div style="font-size: 36px; font-weight: 800; font-family: monospace; letter-spacing: 2px; color: #78350f; word-break: break-all;">
                    ${membershipNumber}
                  </div>
                  <div style="font-size: 12px; color: #d97706; margin-top: 10px;">
                    ✓ Your ZUCA Membership Number
                  </div>
                </div>
                <div style="background: #fef3c7; border-left: 4px solid #fbbf24; padding: 18px; border-radius: 16px; margin-top: 15px;">
                  <div style="font-size: 13px; font-weight: 700; color: #b45309; margin-bottom: 12px;">⚠️ IMPORTANT - PLEASE READ</div>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350f; line-height: 1.7;">
                    <li>Your membership number <strong style="color: #d97706;">${membershipNumber}</strong> is required for verification</li>
                    <li>Must be linked with your <strong>phone number</strong> for account recovery</li>
                    <li><strong>Save this email or memorize this number</strong> - you cannot change it later</li>
                    <li>Always use this exact format when asked: <strong style="color: #d97706; font-size: 14px;">${membershipNumber}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            <div style="padding: 0 30px 20px;">
              <a href="${frontendUrl}/dashboard" style="display: block; background: linear-gradient(135deg, #fbbf24, #d97706); color: white; text-align: center; padding: 16px; border-radius: 50px; text-decoration: none; font-weight: 600; margin: 10px 0;">
                🚀 Go to Your Dashboard
              </a>
              <div style="display: flex; gap: 12px; margin-top: 15px;">
                <a href="${frontendUrl}/join-jumuia" style="flex: 1; background: #fef3c7; color: #78350f; text-align: center; padding: 12px; border-radius: 50px; text-decoration: none; font-size: 13px; font-weight: 500; border: 1px solid #fde68a;">
                  🏠 Join a Jumuia
                </a>
                <a href="${frontendUrl}/chat" style="flex: 1; background: #fef3c7; color: #78350f; text-align: center; padding: 12px; border-radius: 50px; text-decoration: none; font-size: 13px; font-weight: 500; border: 1px solid #fde68a;">
                  💬 Community Chat
                </a>
              </div>
            </div>
            <div style="background: #fffbeb; padding: 25px 30px; border-top: 1px solid #fde68a;">
              <p style="color: #78350f; font-weight: 600; margin: 0 0 15px; text-align: center;">✨ What You Can Do on ZUCA ✨</p>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <div style="font-size: 13px; color: #92400e;">📢 View Announcements</div>
                <div style="font-size: 13px; color: #92400e;">⛪ Check Mass Programs</div>
                <div style="font-size: 13px; color: #92400e;">💰 Make Contributions</div>
                <div style="font-size: 13px; color: #92400e;">🎮 Play Games</div>
                <div style="font-size: 13px; color: #92400e;">📸 Explore Gallery</div>
                <div style="font-size: 13px; color: #92400e;">🎵 Access Hymn Book</div>
                <div style="font-size: 13px; color: #92400e;">📅 View Calendar</div>
                <div style="font-size: 13px; color: #92400e;">💬 Join Discussions</div>
              </div>
            </div>
            <div style="padding: 30px 25px; text-align: center; background: #78350f; color: #fef3c7;">
              <div style="font-size: 32px; margin-bottom: 15px;">✝️</div>
              <p style="margin: 0 0 12px; font-size: 16px; font-style: italic; font-weight: 500;">${blessing}</p>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Zetech University Catholic Action (ZUCA)</p>
              <p style="margin: 10px 0 0; font-size: 11px; opacity: 0.7;">© ${new Date().getFullYear()} ZUCA • Tumsifu Yesu Kristu</p>
              <p style="margin: 15px 0 0; font-size: 11px;"><a href="${frontendUrl}/login" style="color: #fbbf24; text-decoration: none;">🔐 Login to ZUCA</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
✨ ${greeting} ${firstName}! ✨

🎉 WELCOME TO ZUCA! 🎉

You are now officially part of the Zetech University Catholic Action community.

━━━━━━━━━━━━━━━━━━━━━
⭐ YOUR MEMBERSHIP NUMBER ⭐
━━━━━━━━━━━━━━━━━━━━━

${membershipNumber}

━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT - PLEASE SAVE THIS NUMBER ⚠️
━━━━━━━━━━━━━━━━━━━━━

This number (${membershipNumber}) is required for verification.

Please save this email or memorize this number.

━━━━━━━━━━━━━━━━━━━━━
🚀 QUICK ACTIONS
━━━━━━━━━━━━━━━━━━━━━

👉 Go to Dashboard: ${frontendUrl}/dashboard
👉 Join a Jumuia: ${frontendUrl}/join-jumuia  
👉 Community Chat: ${frontendUrl}/chat

${blessing}

Tumsifu Yesu Kristu! 🙏

---
ZUCA | Zetech University Catholic Action
${currentTime}
    `;
    
    await sendViaBrevo(user.email, `🎉 Welcome to ZUCA, ${firstName}!`, htmlContent, textContent);
    console.log(`✅ Welcome email sent to ${user.email} via Brevo`);
    return true;
  } catch (error) {
    console.error(`❌ Welcome email failed:`, error.message);
    return false;
  }
}

// ==================== VERIFICATION EMAIL ====================
async function sendVerificationEmail(user, verificationCode) {
  try {
    const greeting = getTimeBasedGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Dear Member';
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>✅ Verify Your Email - ZUCA</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #fef3c7; min-height: 100vh; padding: 20px;">
        <div style="max-width: 500px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #fde68a;">
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); padding: 30px; text-align: center;">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 15px; border: 3px solid white;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
            <p style="color: white; margin: 10px 0 0;">Welcome to ZUCA Family!</p>
          </div>
          <div style="padding: 30px; background: #fffbeb;">
            <p style="font-size: 18px; color: #78350f;">${greeting}, ${firstName}!</p>
            <p style="color: #92400e; line-height: 1.6;">Thank you for registering with ZUCA! Please verify your email address to complete your registration.</p>
            <div style="background: #fef3c7; padding: 25px; text-align: center; border-radius: 16px; margin: 30px 0; border: 2px dashed #fbbf24;">
              <div style="font-size: 14px; color: #b45309; margin-bottom: 12px;">🔐 Your verification code is:</div>
              <div style="font-size: 42px; letter-spacing: 10px; font-weight: bold; color: #d97706; font-family: monospace;">${verificationCode}</div>
              <div style="font-size: 12px; color: #92400e; margin-top: 12px;">⏰ Valid for 15 minutes</div>
            </div>
            <p style="color: #92400e; font-size: 14px;">Enter this code in the app to verify your email address and start using ZUCA.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a; text-align: center;">
              <p style="color: #b45309; font-size: 12px; margin: 0;">🙏 God bless you<br>Tumsifu Yesu Kristu!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `${greeting} ${firstName}!\n\nThank you for registering with ZUCA!\n\nYour verification code is: ${verificationCode}\nValid for 15 minutes.\n\nEnter this code in the app to verify your email.\n\nTumsifu Yesu Kristu! 🙏`;
    
    await sendViaBrevo(user.email, '✅ Verify Your ZUCA Email Address', htmlContent, textContent);
    console.log(`✅ Verification email sent to ${user.email} via Brevo`);
    return true;
  } catch (error) {
    console.error(`❌ Verification email failed:`, error.message);
    return false;
  }
}

// ==================== PASSWORD RESET EMAIL ====================
async function sendPasswordResetEmail(email, resetCode) {
  try {
    const greeting = getTimeBasedGreeting();
    const currentTime = getCurrentTime();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>🔐 Password Reset - ZUCA</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #fef3c7; margin: 0; padding: 20px;">
        <div style="max-width: 500px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #fde68a;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #fbbf24 100%); padding: 30px; text-align: center;">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 10px; border: 2px solid white;">
            <h1 style="color: white; margin: 0;">ZUCA</h1>
            <p style="color: white; margin: 10px 0 0;">Password Reset Request</p>
          </div>
          <div style="padding: 30px; background: #fffbeb;">
            <p style="font-size: 18px; color: #78350f;">${greeting},</p>
            <p style="color: #92400e;">We received a request to reset your password. Don't worry - we're here to help!</p>
            <div style="background: #fef3c7; padding: 25px; text-align: center; border-radius: 16px; margin: 30px 0; border: 2px dashed #fbbf24;">
              <div style="font-size: 14px; color: #b45309;">🔐 Your verification code is:</div>
              <div style="font-size: 42px; letter-spacing: 10px; font-weight: bold; color: #d97706; font-family: monospace;">${resetCode}</div>
              <div style="font-size: 12px; color: #92400e; margin-top: 12px;">⏰ Valid for 15 minutes</div>
            </div>
            <p style="color: #92400e; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a; text-align: center;">
              <p style="color: #b45309; font-size: 12px;">🙏 God bless you<br>${currentTime}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `${greeting}!\n\nYour verification code is: ${resetCode}\nValid for 15 minutes.\n\nTumsifu Yesu Kristu! 🙏`;
    
    await sendViaBrevo(email, '🔐 Password Reset - ZUCA', htmlContent, textContent);
    console.log(`✅ Password reset email sent to ${email} via Brevo`);
    return true;
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    return false;
  }
}

// ==================== NOTIFICATION EMAIL (RECEIPTS, ETC.) - NOW USES BREVO ====================
async function sendPersonalizedEmail(user, notificationType, title, message, data = {}) {
  try {
    const greeting = getTimeBasedGreeting();
    const currentTime = getCurrentTime();
    const emoji = getNotificationEmoji(notificationType);
    const color = getNotificationColor(notificationType);
    const blessing = getRandomBlessing();
    
    const firstName = user.fullName?.split(' ')[0] || 'Dear Member';
    const jumuiaName = user.homeJumuia?.name || 'ZUCA Family';
    
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

      if (notificationType === 'payment_receipt') {
  // Generate M-PESA style receipt HTML
  const receiptHTML = generateMpesaReceiptHTML({
    amount: data.amount,
    campaignTitle: data.campaignTitle || data.campaign,
    receiptNumber: data.receiptNumber,
    jumuiaName: data.jumuiaName,
    payerName: data.payerName,      
    payerPhone: data.payerPhone,  
    sentTo: data.sentTo || "ZUCA - Zetech Catholic Action"
  });
      
      // Send the receipt email
      await sendViaBrevo(
        user.email, 
        `${emoji} ${title}`, 
        receiptHTML, 
        `Your payment of KES ${data.amount?.toLocaleString()} was successful. Receipt: ${data.receiptNumber}`
      );
      console.log(`✅ Payment receipt email sent to ${user.email} via Brevo`);
      return true;
    }
    
    let actionButton = '';
    let actionUrl = `${frontendUrl}/dashboard`;
    let buttonText = '';
    let buttonEmoji = '';
    
    switch(notificationType) {
      case 'announcement':
        actionUrl = `${frontendUrl}/announcements`;
        buttonText = 'Read the full announcement';
        buttonEmoji = '📖';
        break;
      case 'program':
        actionUrl = `${frontendUrl}/mass-programs`;
        buttonText = 'View upcoming Mass schedules';
        buttonEmoji = '⛪';
        break;
      case 'contribution':
      case 'new_pledge':
        actionUrl = `${frontendUrl}/contributions`;
        buttonText = 'Make your contribution';
        buttonEmoji = '💰';
        break;
      case 'pledge_approved':
      case 'payment_added':
      case 'payment_success':
      case 'payment_received':
        actionUrl = `${frontendUrl}/contributions`;
        buttonText = 'View your pledge status';
        buttonEmoji = '📊';
        break;
      case 'game_invite':
        actionUrl = `${frontendUrl}/games`;
        buttonText = 'Join the game';
        buttonEmoji = '🎮';
        break;
      default:
        buttonText = 'Visit ZUCA';
        buttonEmoji = '📱';
    }
    
    actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; margin-top: 25px; font-weight: bold;">${buttonEmoji} ${buttonText}</a>`;
    
    let personalMessage = '';
    if (notificationType === 'pledge_approved') {
      personalMessage = `Thank you for your generosity! Your pledge brings us closer to our goal. May God bless your giving heart. 🙏`;
    } else if (notificationType === 'game_invite') {
      personalMessage = `Take a break and have some fun with your fellow ZUCA members! Games are a great way to build community. 🎮`;
    } else if (notificationType === 'executive_appointment') {
      personalMessage = `We thank God for your willingness to serve. Your leadership is a blessing to ZUCA. 👑`;
    } else if (notificationType === 'announcement') {
      personalMessage = `Stay connected with what's happening in our amazing ZETECH CATHOLIC ACTION!`;
    } else {
      personalMessage = `Thank you for being part of our ZUCA family. Your participation makes our community stronger!`;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${emoji} ${title} - ZUCA</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #fef3c7;">
        <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #fde68a;">
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); padding: 30px 20px; text-align: center;">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 15px; border: 3px solid white;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ZUCA</h1>
            <p style="color: white; margin: 8px 0 0; font-size: 13px;">Zetech University Catholic Action</p>
          </div>
          <div style="padding: 30px; background: #fffbeb;">
            <div style="font-size: 18px; color: #b45309;">✨ ${greeting},</div>
            <h2 style="color: #78350f; margin: 0 0 8px; font-size: 28px;">${firstName}! 🙏</h2>
            <div style="font-size: 13px; color: #92400e; margin-top: 8px; border-left: 3px solid #fbbf24; padding-left: 12px;">
              🕊️ ${currentTime}<br>🏠 ${jumuiaName}
            </div>
          </div>
          <div style="padding: 0 30px;">
            <div style="background: #fef3c7; padding: 12px 18px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #fbbf24;">
              <p style="color: #92400e; margin: 0; font-style: italic;">💛 ${personalMessage}</p>
            </div>
          </div>
          <div style="padding: 0 30px 25px;">
            <div style="display: inline-block; background: #fef3c7; color: #d97706; padding: 6px 14px; border-radius: 30px; font-size: 12px; font-weight: 600; margin-bottom: 20px;">
              ${emoji} ${notificationType.replace(/_/g, ' ').toUpperCase()}
            </div>
            <h3 style="color: #78350f; font-size: 22px; margin: 0 0 15px;">${title}</h3>
            <div style="background: #fef3c7; padding: 25px; border-radius: 16px; margin: 20px 0; border: 1px solid #fde68a;">
              <p style="color: #78350f; line-height: 1.8; margin: 0;">${message}</p>
            </div>
            <div style="text-align: center;">${actionButton}</div>
            ${data.amount ? `
              <div style="background: #fef3c7; padding: 20px; border-radius: 16px; margin-top: 25px; text-align: center; border: 1px solid #fde68a;">
                <div style="font-size: 32px; font-weight: bold; color: #d97706;">KES ${data.amount.toLocaleString()}</div>
                <div style="font-size: 13px; color: #92400e;">💝 Payment Amount</div>
                ${data.receiptNumber ? `<div style="font-size: 12px; color: #92400e; margin-top: 8px;">Receipt: ${data.receiptNumber}</div>` : ''}
              </div>
            ` : ''}
            ${data.position ? `
              <div style="background: #fef3c7; padding: 20px; border-radius: 16px; margin-top: 25px; text-align: center; border: 1px solid #fde68a;">
                <div style="font-size: 20px; font-weight: bold; color: #d97706;">👑 ${data.position}</div>
                <div style="font-size: 13px; color: #92400e;">Your new role in ZUCA</div>
              </div>
            ` : ''}
          </div>
          <div style="background: #fffbeb; padding: 25px 30px; border-top: 1px solid #fde68a;">
            <p style="color: #78350f; font-weight: 600; margin: 0 0 12px;">✨ Quick Links:</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <a href="${frontendUrl}/dashboard" style="color: #d97706; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #fde68a;">🏠 Dashboard</a>
              <a href="${frontendUrl}/announcements" style="color: #d97706; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #fde68a;">📢 Announcements</a>
              <a href="${frontendUrl}/mass-programs" style="color: #d97706; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #fde68a;">⛪ Mass Programs</a>
              <a href="${frontendUrl}/contributions" style="color: #d97706; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #fde68a;">💰 Contributions</a>
              <a href="${frontendUrl}/chat" style="color: #d97706; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #fde68a;">💬 Chat</a>
            </div>
          </div>
          <div style="padding: 30px 25px; text-align: center; background: #78350f; color: #fef3c7;">
            <div style="font-size: 28px; margin-bottom: 15px;">✝️</div>
            <p style="margin: 0 0 12px; font-size: 15px; font-style: italic;">${blessing}</p>
            <p style="margin: 0; font-size: 12px;">ZUCA | Zetech University Catholic Action</p>
            <p style="margin: 10px 0 0; font-size: 11px;">© ${new Date().getFullYear()} ZUCA • Tumsifu Yesu Kristu</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
✨ ${greeting} ${firstName}! ✨

${emoji} ${title}

${message}

💛 ${personalMessage}

${data.amount ? `💰 Amount: KES ${data.amount.toLocaleString()}` : ''}
${data.receiptNumber ? `📱 Receipt: ${data.receiptNumber}` : ''}

---
📅 ${currentTime}
🏠 ${jumuiaName}

👉 ${buttonEmoji} ${buttonText}: ${actionUrl}

${blessing}

Tumsifu Yesu Kristu! 🙏
---
ZUCA | Zetech University Catholic Action
    `;
    
    // NOW USING BREVO FOR ALL NOTIFICATION EMAILS
        // NOW USING BREVO FOR ALL NOTIFICATION EMAILS
    await sendViaBrevo(user.email, `${emoji} ${title}`, htmlContent, textContent);
    console.log(`✅ Notification email sent to ${user.email} via Brevo (${notificationType})`);
    
    // ===== DEBUG: Check user phone number =====
    console.log(`📱 DEBUG - User: ${user.email}, Phone: ${user.phone || 'NO PHONE'}, Type: ${notificationType}`);
    
    // ===== AUTO-SEND SMS FOR IMPORTANT NOTIFICATIONS =====
    const smsTypes = ['attendance_checkin', 'attendance_missed', 'attendance_reminder', 'payment_receipt', 'verification', 'pledge_approved'];
    
    if (user?.phone && smsTypes.includes(notificationType)) {
      console.log(`📱 Attempting to send SMS to ${user.phone} for type: ${notificationType}`);
      let smsMessage = '';
      
      switch(notificationType) {
        case 'attendance_checkin':
          smsMessage = `ZUCA: Checked in for meeting. Thank you! 🙏`;
          break;
        case 'payment_receipt':
          smsMessage = `ZUCA: KES ${data.amount?.toLocaleString()} payment received. Receipt: ${data.receiptNumber}. Thank you! 🙏`;
          break;
        default:
          smsMessage = `ZUCA: ${title}`;
      }
      
      sendSms(user.phone, smsMessage).catch(err => console.error(`SMS failed:`, err.message));
    } else {
      console.log(`📱 SMS skipped - Phone: ${user?.phone || 'missing'}, Type in list: ${smsTypes.includes(notificationType)}`);
    }
    
    // ===== AUTO-SEND SMS FOR IMPORTANT NOTIFICATIONS =====
    const smsTypes = ['attendance_checkin', 'attendance_missed', 'attendance_reminder', 'payment_receipt', 'verification', 'pledge_approved'];
    if (user?.phone && smsTypes.includes(notificationType)) {
      let smsMessage = '';
      switch(notificationType) {
        case 'attendance_checkin':
          smsMessage = `ZUCA: Checked in for meeting. Thank you! 🙏`;
          break;
        case 'payment_receipt':
          smsMessage = `ZUCA: KES ${data.amount?.toLocaleString()} payment received. Receipt: ${data.receiptNumber}. Thank you! 🙏`;
          break;
        default:
          smsMessage = `ZUCA: ${title}`;
      }
      sendSms(user.phone, smsMessage).catch(err => console.error(`SMS failed:`, err.message));
    }
    
  
    return true;
  } catch (error) {
    console.error(`❌ Email failed to ${user.email}:`, error.message);
    return false;
  }
}

// Generate M-PESA style receipt HTML (for payment receipt emails)
function generateMpesaReceiptHTML(paymentData) {
  const logoUrl = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";
  const amount = paymentData.amount || 0;
  const campaignTitle = paymentData.campaignTitle || 'Contribution';
  const receiptNumber = paymentData.receiptNumber || 'N/A';
  const jumuiaName = paymentData.jumuiaName || null;
  const senderName = paymentData.payerName || 'N/A';
  const senderPhone = paymentData.payerPhone || 'N/A';
  const sentTo = paymentData.sentTo || "ZUCA - Zetech Catholic Action";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZUCA Payment Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f5f7fa;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .receipt {
          max-width: 500px;
          width: 100%;
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
          padding: 24px;
          text-align: center;
        }
        .logos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .zuca-logo-img {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid white;
        }
        .mpesa-text {
          font-size: 22px;
          font-weight: bold;
          color: white;
          letter-spacing: 1px;
        }
        .mpesa-by {
          font-size: 10px;
          color: rgba(255,255,255,0.8);
          margin-top: 2px;
        }
        .lipa {
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          margin-top: 4px;
        }
        .success-icon { 
          text-align: center; 
          padding: 24px 0 16px;
          background: linear-gradient(135deg, #f8fafc, #ffffff);
        }
        .check-circle {
          width: 70px;
          height: 70px;
          background: #4CAF50;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 36px;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        .content { 
          padding: 20px 24px;
          background: #ffffff;
        }
        .status { 
          text-align: center; 
          margin-bottom: 20px;
        }
        .status-badge {
          background: #4CAF50;
          color: white;
          padding: 6px 16px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: bold;
          display: inline-block;
        }
        .details-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .details-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          border-left: 3px solid #4CAF50;
          padding-left: 12px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label { 
          font-size: 13px; 
          color: #64748b;
          font-weight: 500;
        }
        .detail-value {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }
        .amount-value { 
          font-size: 22px; 
          font-weight: bold; 
          color: #4CAF50;
        }
        .receipt-number {
          background: #e8f5e9;
          padding: 10px 12px;
          text-align: center;
          border-radius: 10px;
          font-family: monospace;
          font-size: 12px;
          letter-spacing: 0.5px;
          margin: 16px 0;
          font-weight: 600;
          color: #2E7D32;
        }
        .footer {
          text-align: center;
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .footer-text { 
          font-size: 10px; 
          color: #94a3b8; 
          line-height: 1.5;
        }
        .timestamp { 
          font-size: 10px; 
          color: #94a3b8; 
          text-align: center; 
          margin-top: 12px;
        }
        hr { 
          margin: 16px 0; 
          border: none; 
          border-top: 1px dashed #cbd5e1; 
        }
        .blessing {
          text-align: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logos">
            <img src="${logoUrl}" alt="ZUCA" class="zuca-logo-img">
            <div>
              <div class="mpesa-text">M-PESA</div>
              <div class="mpesa-by">by Safaricom</div>
            </div>
          </div>
          <div class="lipa">Lipa Na M-PESA</div>
        </div>
        
        <div class="success-icon">
          <div class="check-circle">✓</div>
        </div>
        
        <div class="content">
          <div class="status">
            <span class="status-badge">✅ PAYMENT SENT SUCCESSFULLY</span>
          </div>
          
          <div class="details-card">
            <div class="details-title">Payment Details</div>
            
            <div class="detail-row">
              <span class="detail-label">Sent to:</span>
              <span class="detail-value">${sentTo}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Sender Name:</span>
              <span class="detail-value">${senderName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Sender Phone:</span>
              <span class="detail-value">${senderPhone}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Campaign:</span>
              <span class="detail-value">${campaignTitle}</span>
            </div>
            
            ${jumuiaName ? `
            <div class="detail-row">
              <span class="detail-label">Jumuia:</span>
              <span class="detail-value">🏠 ${jumuiaName}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value amount-value">KES ${amount.toLocaleString()}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">M-PESA (Lipa Na M-PESA)</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Transaction Type:</span>
              <span class="detail-value">Pay Bill</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${new Date().toLocaleTimeString()}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #4CAF50;">✅ COMPLETED</span>
            </div>
          </div>
          
          <div class="receipt-number">
            📱 M-PESA Receipt: ${receiptNumber}
          </div>
          
          <div class="blessing">
            🙏 Thank you for your generous contribution!<br>
            Tumsifu Yesu Kristu!
          </div>
          
          <hr>
          
          <div class="timestamp">
            Receipt generated: ${new Date().toLocaleString()}
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text">
            Official ZUCA payment receipt • Valid without signature<br>
            Zetech University Catholic Action
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
// ==================== BULK EMAIL SENDING (USES BREVO) ====================
async function sendBulkEmails(users, notificationType, title, message, data = {}) {
  if (!users || users.length === 0) {
    console.log('📧 No users to send emails to');
    return { sent: 0, failed: 0 };
  }
  
  console.log(`📧 Sending ${notificationType} emails to ${users.length} users in batches via Brevo...`);
  
  let sent = 0;
  let failed = 0;
  
  // Brevo has rate limits, send in batches
  const batchSize = 50;
  const batches = Math.ceil(users.length / batchSize);
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`📧 Sending batch ${batchNumber}/${batches} (${batch.length} users)...`);
    
    const promises = batch.map(user => 
      sendPersonalizedEmail(user, notificationType, title, message, data)
        .then(success => success ? sent++ : failed++)
        .catch(() => failed++)
    );
    
    await Promise.all(promises);
    
    // Wait between batches to avoid rate limits
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`✅ Email batch complete! Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

// ==================== SMS FUNCTIONS ====================

/**
 * Send SMS via Brevo API
 * @param {string} phoneNumber - Recipient with country code (e.g., "254712345678")
 * @param {string} message - SMS content
 * @returns {Promise<boolean>}
 */
async function sendSms(phoneNumber, message) {
  try {
    // Format phone number: remove '+', spaces, and leading zero
    let cleanNumber = phoneNumber.toString().replace(/\+/g, '').replace(/\s/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: "ZUCA",
        recipient: cleanNumber,
        content: message.slice(0, 160),
        type: "transactional",
        unicodeEnabled: true
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SMS sent to ${phoneNumber}, MessageId: ${data.messageId}`);
      return true;
    } else {
      console.error(`❌ SMS failed:`, data.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    return false;
  }
}


module.exports = { 
  sendPasswordResetEmail,
  sendPersonalizedEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendBulkEmails,
  sendSms,
  getTimeBasedGreeting,
  getCurrentTime,
  getNotificationEmoji
};