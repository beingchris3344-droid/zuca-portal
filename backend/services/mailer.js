// services/mailer.js
const nodemailer = require('nodemailer');

// Create transporter with your credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server ready to send messages');
  }
});

// Helper: Get warm, spiritual greeting
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Goodmorning and have a blessed day ahead";
  if (hour < 17) return "Goodafternoon and have a fruitful day ahead";
  if (hour < 21) return "Goodevening and have a peaceful night";
  return "Goodnight";
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
    'welcome': '🎉'
  };
  return emojis[type] || '🔔';
}

// Helper: Get color based on notification type
function getNotificationColor(type) {
  const colors = {
    'announcement': '#7c3aed',
    'program': '#3b82f6',
    'contribution': '#10b981',
    'pledge_approved': '#10b981',
    'payment_added': '#10b981',
    'event_reminder': '#f59e0b',
    'youtube_live': '#ef4444',
    'executive_appointment': '#8b5cf6',
    'user_login': '#6b7280',
    'password_reset': '#ef4444',
    'welcome': '#4f46e5'
  };
  return colors[type] || '#7c3aed';
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

// ==================== WELCOME EMAIL FOR NEW USERS ====================
async function sendWelcomeEmail(user, membershipNumber) {
  try {
    const greeting = getTimeBasedGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Dear Member';
    const currentTime = getCurrentTime();
    const blessing = getRandomBlessing();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zucaportal.onrender.com'
      : 'http://zetechcatholic.vercel.app';
    
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
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- Main Welcome Card -->
          <div class="welcome-card" style="background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);">
            
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <img src="${ZUCA_LOGO_URL}" 
                   alt="ZUCA Logo" 
                   style="width: 90px; height: 90px; border-radius: 50%; margin-bottom: 15px; border: 4px solid rgba(255,255,255,0.9); box-shadow: 0 10px 25px rgba(0,0,0,0.2); object-fit: cover;">
              <h1 style="color: white; margin: 0; font-size: 36px; letter-spacing: 2px;">ZUCA</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 14px; font-style: italic;">Zetech University Catholic Action</p>
            </div>
            
            <!-- Greeting Section -->
            <div style="padding: 30px 30px 20px; background: linear-gradient(to bottom, #fff9f0, white);">
              <div style="font-size: 18px; color: #6b7280; margin-bottom: 5px; font-style: italic;">✨ ${greeting},</div>
              <h2 style="color: #1f2937; margin: 0 0 8px; font-size: 28px; font-weight: 600;">${firstName}! 🎉🙏</h2>
              <div style="font-size: 13px; color: #9ca3af; margin-top: 8px; border-left: 3px solid #4f46e5; padding-left: 12px;">
                🕊️ ${currentTime}
              </div>
            </div>
            
            <!-- Welcome Message -->
            <div style="padding: 0 30px;">
              <div style="background: #fef9e7; padding: 20px; border-radius: 20px; margin: 10px 0; text-align: center;">
                <p style="font-size: 18px; margin: 0; color: #92400e;">🙏</p>
                <p style="color: #78350f; margin: 10px 0 0; line-height: 1.6;">
                  <strong>You are now officially part of the ZUCA family!</strong><br>
                  Welcome to the Zetech University Catholic Action community.
                </p>
              </div>
            </div>
            
            <!-- Membership Number Section -->
            <div style="padding: 10px 30px;">
              <div style="background: #f1f5f9; border-radius: 24px; padding: 25px; margin: 10px 0;">
                
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="background: #e0e7ff; display: inline-block; padding: 6px 16px; border-radius: 30px; font-size: 12px; font-weight: 600; color: #4f46e5;">
                    ⭐ YOUR MEMBERSHIP NUMBER ⭐
                  </div>
                </div>
                
                <!-- Membership Number Display -->
                <div class="membership-number" style="background: linear-gradient(135deg, #e0e7ff, #fef3c7); padding: 25px; border-radius: 20px; text-align: center; margin-bottom: 20px;">
                  <div style="font-size: 36px; font-weight: 800; font-family: monospace; letter-spacing: 2px; color: #1e293b; word-break: break-all;">
                    ${membershipNumber}
                  </div>
                  <div style="font-size: 12px; color: #4f46e5; margin-top: 10px;">
                    ✓ Your ZUCA Membership Number
                  </div>
                </div>
                
                <!-- Important Instructions -->
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 18px; border-radius: 16px; margin-top: 15px;">
                  <div style="font-size: 13px; font-weight: 700; color: #d97706; margin-bottom: 12px;">⚠️ IMPORTANT - PLEASE READ</div>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350f; line-height: 1.7;">
                    <li>Your membership number <strong style="color: #4f46e5;">${membershipNumber}</strong> is required to <strong>reset your password</strong></li>
                    <li>Must be linked with your <strong>phone number</strong> for account recovery</li>
                    <li><strong>Save this email or memorize this number</strong> - you cannot change it later</li>
                    <li>Always use this exact format when asked for your membership number: <strong style="color: #4f46e5; font-size: 14px;">${membershipNumber}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <!-- Quick Actions -->
            <div style="padding: 0 30px 20px;">
              <a href="${frontendUrl}/dashboard" style="display: block; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; text-align: center; padding: 16px; border-radius: 50px; text-decoration: none; font-weight: 600; margin: 10px 0;">
                🚀 Go to Your Dashboard
              </a>
              
              <div style="display: flex; gap: 12px; margin-top: 15px;">
                <a href="${frontendUrl}/join-jumuia" style="flex: 1; background: #f3f4f6; color: #374151; text-align: center; padding: 12px; border-radius: 50px; text-decoration: none; font-size: 13px; font-weight: 500;">
                  🏠 Join a Jumuia
                </a>
                <a href="${frontendUrl}/chat" style="flex: 1; background: #f3f4f6; color: #374151; text-align: center; padding: 12px; border-radius: 50px; text-decoration: none; font-size: 13px; font-weight: 500;">
                  💬 Community Chat
                </a>
              </div>
            </div>
            
            <!-- What You Can Do -->
            <div style="background: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #1f2937; font-weight: 600; margin: 0 0 15px; text-align: center;">✨ What You Can Do on ZUCA ✨</p>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <div style="font-size: 13px; color: #4b5563;">📢 View Announcements</div>
                <div style="font-size: 13px; color: #4b5563;">⛪ Check Mass Programs</div>
                <div style="font-size: 13px; color: #4b5563;">💰 Make Contributions</div>
                <div style="font-size: 13px; color: #4b5563;">🎮 Play Games</div>
                <div style="font-size: 13px; color: #4b5563;">📸 Explore Gallery</div>
                <div style="font-size: 13px; color: #4b5563;">🎵 Access Hymn Book</div>
                <div style="font-size: 13px; color: #4b5563;">📅 View Calendar</div>
                <div style="font-size: 13px; color: #4b5563;">💬 Join Discussions</div>
              </div>
            </div>
            
            <!-- Footer with Blessing -->
            <div style="padding: 30px 25px; text-align: center; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: #e5e7eb;">
              <div style="font-size: 32px; margin-bottom: 15px;">✝️</div>
              <p style="margin: 0 0 12px; font-size: 16px; font-style: italic; font-weight: 500;">${blessing}</p>
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">
                Zetech University Catholic Action (ZUCA)
              </p>
              <p style="margin: 10px 0 0; font-size: 11px; opacity: 0.6;">
                © ${new Date().getFullYear()} ZUCA • Tumsifu Yesu Kristu
              </p>
              <p style="margin: 15px 0 0; font-size: 11px;">
                <a href="${frontendUrl}/login" style="color: #9ca3af; text-decoration: none;">🔐 Login to ZUCA</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Plain text version
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

This number (${membershipNumber}) is required to:
• Reset your password
• Recover your account
• Verify your identity

Please save this email or memorize this number - you cannot change it later.

━━━━━━━━━━━━━━━━━━━━━
🚀 QUICK ACTIONS
━━━━━━━━━━━━━━━━━━━━━

👉 Go to Dashboard: ${frontendUrl}/dashboard
👉 Join a Jumuia: ${frontendUrl}/join-jumuia  
👉 Community Chat: ${frontendUrl}/chat

━━━━━━━━━━━━━━━━━━━━━
✨ What You Can Do on ZUCA ✨
━━━━━━━━━━━━━━━━━━━━━

📢 View Announcements    ⛪ Check Mass Programs
💰 Make Contributions    🎮 Play Games
📸 Explore Gallery       🎵 Access Hymn Book
📅 View Calendar         💬 Join Discussions

━━━━━━━━━━━━━━━━━━━━━

${blessing}

Tumsifu Yesu Kristu! 🙏

---
ZUCA | Zetech University Catholic Action
${currentTime}
    `;
    
    await transporter.sendMail({
      from: `"ZUCA 🙏" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🎉 Welcome to ZUCA, ${firstName}!`,
      html: htmlContent,
      text: textContent
    });
    
    console.log(`✅ Welcome email sent to ${user.email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Welcome email failed for ${user?.email}:`, error.message);
    return false;
  }
}

// ==================== REGULAR NOTIFICATION EMAIL ====================
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
      : 'http://zetechcatholic.vercel.app';
    
    // Build warm action button
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
    
    actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; margin-top: 25px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${buttonEmoji} ${buttonText}</a>`;
    
    // Personal message based on notification type
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emoji} ${title} - ZUCA</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          
          <!-- Header with ZUCA Logo -->
          <div style="background: linear-gradient(135deg, ${color} 0%, #4c1d95 100%); padding: 40px 20px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('https://www.transparenttextures.com/patterns/cubes.png'); opacity: 0.1;"></div>
            <div style="position: relative; z-index: 1;">
              <img src="${ZUCA_LOGO_URL}" 
                   alt="ZUCA Logo" 
                   style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; border: 3px solid rgba(255,255,255,0.9); box-shadow: 0 5px 15px rgba(0,0,0,0.2); object-fit: cover;">
              <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">ZUCA</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0; font-size: 13px; font-style: italic;">Zetech University Catholic Action</p>
            </div>
          </div>
          
          <!-- Greeting Section -->
          <div style="padding: 35px 30px 20px; background: linear-gradient(to bottom, #fff9f0, white);">
            <div style="font-size: 18px; color: #6b7280; margin-bottom: 5px; font-style: italic;">✨ ${greeting},</div>
            <h2 style="color: #1f2937; margin: 0 0 8px; font-size: 28px; font-weight: 600;">${firstName}! 🙏</h2>
            <div style="font-size: 13px; color: #9ca3af; margin-top: 8px; border-left: 3px solid ${color}; padding-left: 12px;">
              🕊️ ${currentTime}<br>
              🏠 ${jumuiaName}
            </div>
          </div>
          
          <!-- Heartfelt Message -->
          <div style="padding: 0 30px;">
            <div style="background: #fef9e7; padding: 12px 18px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid ${color};">
              <p style="color: #92400e; margin: 0; font-size: 13px; font-style: italic;">
                💛 ${personalMessage}
              </p>
            </div>
          </div>
          
          <!-- Notification Content -->
          <div style="padding: 0 30px 25px;">
            <div style="display: inline-block; background: ${color}15; color: ${color}; padding: 6px 14px; border-radius: 30px; font-size: 12px; font-weight: 600; margin-bottom: 20px; letter-spacing: 0.5px;">
              ${emoji} ${notificationType.replace(/_/g, ' ').toUpperCase()}
            </div>
            
            <h3 style="color: #1f2937; font-size: 22px; margin: 0 0 15px; font-weight: 600;">${title}</h3>
            
            <div style="background: #f9fafb; padding: 25px; border-radius: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="color: #374151; line-height: 1.8; margin: 0; font-size: 15px;">${message}</p>
            </div>
            
            <div style="text-align: center;">
              ${actionButton}
            </div>
            
            ${data.amount ? `
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); padding: 20px; border-radius: 16px; margin-top: 25px; text-align: center; border: 1px solid #fde68a;">
                <div style="font-size: 32px; font-weight: bold; color: #d97706;">KES ${data.amount.toLocaleString()}</div>
                <div style="font-size: 13px; color: #92400e; margin-top: 5px;">💝 Your generous pledge amount</div>
                <div style="font-size: 12px; color: #b45309; margin-top: 8px;">May God bless your generosity!</div>
              </div>
            ` : ''}
            
            ${data.position ? `
              <div style="background: linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%); padding: 20px; border-radius: 16px; margin-top: 25px; text-align: center; border: 1px solid #c4b5fd;">
                <div style="font-size: 20px; font-weight: bold; color: #6d28d9;">👑 ${data.position}</div>
                <div style="font-size: 13px; color: #4c1d95; margin-top: 5px;">Your new role in ZUCA</div>
                <div style="font-size: 12px; color: #5b21b6; margin-top: 8px;">We pray for God's wisdom in your service!</div>
              </div>
            ` : ''}
          </div>
          
          <!-- Quick Links -->
          <div style="background: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 12px; font-weight: 600;">✨ Quick Links to Explore:</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <a href="${frontendUrl}/dashboard" style="color: ${color}; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #e5e7eb;">🏠 Dashboard</a>
              <a href="${frontendUrl}/announcements" style="color: ${color}; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #e5e7eb;">📢 Announcements</a>
              <a href="${frontendUrl}/mass-programs" style="color: ${color}; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #e5e7eb;">⛪ Mass Programs</a>
              <a href="${frontendUrl}/contributions" style="color: ${color}; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #e5e7eb;">💰 Contributions</a>
              <a href="${frontendUrl}/chat" style="color: ${color}; text-decoration: none; font-size: 12px; padding: 5px 12px; background: white; border-radius: 20px; border: 1px solid #e5e7eb;">💬 Community Chat</a>
            </div>
          </div>
          
          <!-- Footer with Blessing -->
          <div style="padding: 30px 25px; text-align: center; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: #e5e7eb;">
            <div style="font-size: 28px; margin-bottom: 15px;">✝️</div>
            <p style="margin: 0 0 12px; font-size: 15px; font-style: italic; font-weight: 500;">${blessing}</p>
            <p style="margin: 0; font-size: 12px; opacity: 0.8;">
              Zetech University Catholic Action (ZUCA)
            </p>
            <p style="margin: 10px 0 0; font-size: 11px; opacity: 0.6;">
              © ${new Date().getFullYear()} ZUCA • Tumsifu Yesu Kristu
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Plain text version
    const textContent = `
✨ ${greeting} ${firstName}! ✨

${emoji} ${title}

${message}

💛 ${personalMessage}

---
📅 ${currentTime}
🏠 ${jumuiaName}
📋 Type: ${notificationType}

👉 ${buttonEmoji} ${buttonText}: ${actionUrl}

${blessing}

Tumsifu Yesu Kristu! 🙏
---
ZUCA | Zetech University Catholic Action
    `;
    
    await transporter.sendMail({
      from: `"ZUCA 🙏" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `${emoji} ${title}`,
      html: htmlContent,
      text: textContent
    });
    
    console.log(`✅ Email sent to ${user.email} - ${notificationType}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Email failed for ${user?.email}:`, error.message);
    return false;
  }
}

// ==================== BULK EMAIL SENDING ====================
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

// ==================== PASSWORD RESET EMAIL ====================
async function sendPasswordResetEmail(email, resetCode) {
  try {
    const greeting = getTimeBasedGreeting();
    const currentTime = getCurrentTime();
    
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zucaportal.onrender.com'
      : 'http://zetechcatholic.vercel.app';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>🔐 Password Reset - ZUCA</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 500px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #fffb00 100%); padding: 40px 30px; text-align: center;">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 15px; border: 3px solid white;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ZUCA</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Password Reset Request</p>
          </div>
          
          <div style="padding: 35px 30px;">
            <p style="font-size: 18px; color: #374151;">${greeting},</p>
            <p style="color: #6b7280; line-height: 1.6;">We received a request to reset your password for your ZUCA account. Don't worry - we're here to help!</p>
            
            <div style="background: #f3f4f6; padding: 25px; text-align: center; border-radius: 16px; margin: 30px 0; border: 2px dashed #c4b5fd;">
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">🔐 Your verification code is:</div>
              <div style="font-size: 42px; letter-spacing: 10px; font-weight: bold; color: #ffd900; font-family: monospace;">${resetCode}</div>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 12px;">⏰ Valid for 15 minutes</div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                🙏 God bless you<br>
                ${currentTime}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await transporter.sendMail({
      from: `"ZUCA 🙏" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Assistance - ZUCA',
      html: htmlContent,
      text: `${greeting}!\n\nWe received a request to reset your password.\n\nYour verification code is: ${resetCode}\nValid for 15 minutes.\n\nIf you didn't request this, please ignore this email.\n\nTumsifu Yesu Kristu! 🙏`
    });
    
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
    
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    throw error;
  }
}

module.exports = { 
  sendPasswordResetEmail,
  sendPersonalizedEmail,
  sendWelcomeEmail,
  sendBulkEmails,
  getTimeBasedGreeting,
  getCurrentTime,
  getNotificationEmoji
};