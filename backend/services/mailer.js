// services/mailer.js
const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// ==================== GMAIL FOR NOTIFICATIONS ====================
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==================== BREVO FOR REGISTRATION & RESET ====================
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

// Helper: Send via Brevo
async function sendViaBrevo(to, subject, htmlContent, textContent) {
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.sender = { email: process.env.EMAIL_USER, name: "ZUCA 🙏" };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent || "";
  
  await brevoApi.sendTransacEmail(sendSmtpEmail);
}

// Helper: Send via Gmail
async function sendViaGmail(to, subject, htmlContent, textContent) {
  await gmailTransporter.sendMail({
    from: `"ZUCA 🙏" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: htmlContent,
    text: textContent
  });
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

// ==================== WELCOME EMAIL (USES BREVO) ====================
async function sendWelcomeEmail(user, membershipNumber) {
  try {
    const greeting = getTimeBasedGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Dear Member';
    const currentTime = getCurrentTime();
    const blessing = getRandomBlessing();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zucaportal.onrender.com'
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

// ==================== VERIFICATION EMAIL (USES BREVO) ====================
async function sendVerificationEmail(user, verificationCode) {
  try {
    const greeting = getTimeBasedGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Dear Member';
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zucaportal.onrender.com'
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

// ==================== PASSWORD RESET EMAIL (USES BREVO) ====================
async function sendPasswordResetEmail(email, resetCode) {
  try {
    const greeting = getTimeBasedGreeting();
    const currentTime = getCurrentTime();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zucaportal.onrender.com'
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

// ==================== REGULAR NOTIFICATION EMAIL (USES GMAIL) ====================
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
      ? 'https://zucaportal.onrender.com'
      : 'https://zetechcatholic.vercel.app';
    
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
        actionUrl = `${frontendUrl}/my-pledges`;
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
                <div style="font-size: 13px; color: #92400e;">💝 Your generous pledge amount</div>
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

---
📅 ${currentTime}
🏠 ${jumuiaName}

👉 ${buttonEmoji} ${buttonText}: ${actionUrl}

${blessing}

Tumsifu Yesu Kristu! 🙏
---
ZUCA | Zetech University Catholic Action
    `;
    
    await sendViaGmail(user.email, `${emoji} ${title}`, htmlContent, textContent);
    console.log(`✅ Notification email sent to ${user.email} via Gmail`);
    return true;
  } catch (error) {
    console.error(`❌ Email failed:`, error.message);
    return false;
  }
}

// ==================== BULK EMAIL SENDING (USES GMAIL) ====================
async function sendBulkEmails(users, notificationType, title, message, data = {}) {
  if (!users || users.length === 0) {
    console.log('📧 No users to send emails to');
    return { sent: 0, failed: 0 };
  }
  
  console.log(`📧 Sending ${notificationType} emails to ${users.length} users in batches...`);
  
  let sent = 0;
  let failed = 0;
  
  const batchSize = 20;
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
    
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`✅ Email batch complete! Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

module.exports = { 
  sendPasswordResetEmail,
  sendPersonalizedEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendBulkEmails,
  getTimeBasedGreeting,
  getCurrentTime,
  getNotificationEmoji
};