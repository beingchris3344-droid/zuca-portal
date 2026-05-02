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

// Helper: Get time-based greeting
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

// Helper: Format current time
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
    'password_reset': '🔐'
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
    'password_reset': '#ef4444'
  };
  return colors[type] || '#7c3aed';
}

// ZUCA Logo URL (using your uploaded profile image)
// ZUCA Logo URL (working logo with church image)
const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";
// Main function: Send personalized email to ONE user
async function sendPersonalizedEmail(user, notificationType, title, message, data = {}) {
  try {
    const greeting = getTimeBasedGreeting();
    const currentTime = getCurrentTime();
    const emoji = getNotificationEmoji(notificationType);
    const color = getNotificationColor(notificationType);
    
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const jumuiaName = user.homeJumuia?.name || 'ZUCA Family';
    
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zucaportal.onrender.com'
      : 'http://zetechcatholic.vercel.app';
    
    // Build action button based on notification type
    let actionButton = '';
    let actionUrl = `${frontendUrl}/dashboard`;
    
    switch(notificationType) {
      case 'announcement':
        actionUrl = `${frontendUrl}/announcements`;
        actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">📖 Read Announcement</a>`;
        break;
      case 'program':
        actionUrl = `${frontendUrl}/mass-programs`;
        actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">⛪ View Mass Schedule</a>`;
        break;
      case 'contribution':
      case 'new_pledge':
        actionUrl = `${frontendUrl}/contributions`;
        actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">💰 Make a Contribution</a>`;
        break;
      case 'pledge_approved':
      case 'payment_added':
        actionUrl = `${frontendUrl}/my-pledges`;
        actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">📊 View My Pledges</a>`;
        break;
      case 'game_invite':
        actionUrl = `${frontendUrl}/games`;
        actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">🎮 Join Game</a>`;
        break;
      default:
        actionButton = `<a href="${actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">📱 Open ZUCA Portal</a>`;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emoji} ${title} - ZUCA</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header with ZUCA Logo -->
          <div style="background: linear-gradient(135deg, ${color} 0%, #5b21b6 100%); padding: 30px 20px; text-align: center;">
            <img src="${ZUCA_LOGO_URL}" 
                 alt="ZUCA Logo" 
                 style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; border: 3px solid white; object-fit: cover;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ZUCA Portal</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Zetech University Catholic Action</p>
          </div>
          
          <!-- Greeting -->
          <div style="padding: 30px 25px 20px; background: linear-gradient(to bottom, #f9fafb, white);">
            <div style="font-size: 16px; color: #6b7280; margin-bottom: 5px;">${greeting},</div>
            <h2 style="color: #1f2937; margin: 0 0 5px;">${firstName}! 🙏</h2>
            <div style="font-size: 14px; color: #9ca3af; margin-top: 5px;">
              ${currentTime} • ${jumuiaName}
            </div>
          </div>
          
          <!-- Notification Content -->
          <div style="padding: 0 25px 30px;">
            <div style="display: inline-block; background: ${color}10; color: ${color}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px;">
              ${notificationType.replace(/_/g, ' ').toUpperCase()}
            </div>
            
            <h3 style="color: #1f2937; font-size: 20px; margin: 0 0 15px;">${title}</h3>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border-left: 4px solid ${color}; margin: 20px 0;">
              <p style="color: #374151; line-height: 1.6; margin: 0;">${message}</p>
            </div>
            
            ${actionButton}
            
            ${data.amount ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #d97706;">KES ${data.amount.toLocaleString()}</div>
                <div style="font-size: 12px; color: #92400e;">Pledge Amount</div>
              </div>
            ` : ''}
            
            ${data.position ? `
              <div style="background: #ede9fe; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #6d28d9;">${data.position}</div>
                <div style="font-size: 12px; color: #4c1d95;">Your New Role</div>
              </div>
            ` : ''}
          </div>
          
          <!-- Quick Links -->
          <div style="background: #f9fafb; padding: 20px 25px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px;">Quick Links:</p>
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
              <a href="${frontendUrl}/dashboard" style="color: ${color}; text-decoration: none; font-size: 13px;">🏠 Dashboard</a>
              <a href="${frontendUrl}/announcements" style="color: ${color}; text-decoration: none; font-size: 13px;">📢 Announcements</a>
              <a href="${frontendUrl}/mass-programs" style="color: ${color}; text-decoration: none; font-size: 13px;">⛪ Mass Programs</a>
              <a href="${frontendUrl}/contributions" style="color: ${color}; text-decoration: none; font-size: 13px;">💰 Contributions</a>
              <a href="${frontendUrl}/chat" style="color: ${color}; text-decoration: none; font-size: 13px;">💬 Community Chat</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px 25px; text-align: center; background: #1f2937; color: #9ca3af;">
            <p style="margin: 0 0 10px; font-size: 14px;">Tumsifu Yesu Kristu! 🙏</p>
            <p style="margin: 0; font-size: 12px;">
              Zetech University Catholic Action<br>
              © ${new Date().getFullYear()} ZUCA. All rights reserved.
            </p>
            <p style="margin: 15px 0 0; font-size: 11px;">
              <a href="${frontendUrl}/settings/notifications" style="color: #9ca3af;">Notification Settings</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Plain text version
    const textContent = `
${greeting} ${firstName}!

${emoji} ${title}

${message}

---
Notification Type: ${notificationType}
Time: ${currentTime}
Jumuia: ${jumuiaName}

View on ZUCA Portal: ${actionUrl}

Tumsifu Yesu Kristu! 🙏
    `;
    
    await transporter.sendMail({
      from: `"ZUCA Portal" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `${emoji} ${title}`,
      html: htmlContent,
      text: textContent
    });
    
    console.log(`✅ Email sent to ${user.email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Email failed for ${user?.email}:`, error.message);
    return false;
  }
}

// OPTIMIZED: Send emails in BATCHES (much faster!)
async function sendBulkEmails(users, notificationType, title, message, data = {}) {
  if (!users || users.length === 0) {
    console.log('📧 No users to send emails to');
    return { sent: 0, failed: 0 };
  }
  
  console.log(`📧 Sending ${notificationType} emails to ${users.length} users in batches...`);
  
  let sent = 0;
  let failed = 0;
  
  // Process in batches of 20 (faster!)
  const batchSize = 20;
  const batches = Math.ceil(users.length / batchSize);
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`📧 Sending batch ${batchNumber}/${batches} (${batch.length} users)...`);
    
    // Send all emails in this batch IN PARALLEL
    const promises = batch.map(user => 
      sendPersonalizedEmail(user, notificationType, title, message, data)
        .then(success => success ? sent++ : failed++)
        .catch(() => failed++)
    );
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`✅ Email batch complete! Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

// Password reset email
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
        <title>Password Reset - ZUCA</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 10px; border: 2px solid white;">
            <h1 style="color: white; margin: 0;">ZUCA Portal</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Password Reset</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #374151;">${greeting},</p>
            <p style="color: #6b7280;">We received a request to reset your password for your ZUCA account.</p>
            
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 12px; margin: 25px 0;">
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Your verification code is:</div>
              <div style="font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #ef4444;">${resetCode}</div>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Valid for 15 minutes</div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            
            <hr style="margin: 25px 0; border-color: #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Tumsifu Yesu Kristu! 🙏<br>
              ${currentTime}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await transporter.sendMail({
      from: `"ZUCA Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Code - ZUCA',
      html: htmlContent,
      text: `${greeting}!\n\nYour password reset code is: ${resetCode}\nValid for 15 minutes.\n\nTumsifu Yesu Kristu! 🙏`
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
  sendBulkEmails,
  getTimeBasedGreeting,
  getCurrentTime,
  getNotificationEmoji
};