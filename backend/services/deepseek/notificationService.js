const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const webpush = require('web-push');

// Configure web-push
webpush.setVapidDetails(
  'mailto:zucaportal2025@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    console.log(`🔔 Creating notification: ${title} for user ${userId}`);
    
    // 1. Create notification in database (in-app notification)
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        read: false,
        data: data || {}
      }
    });

    // 2. Send real-time via Socket.IO
    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
      }
    } catch (err) {
      // Socket not available, continue
    }

    // 3. Send PUSH NOTIFICATION (web-push)
    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (subscription) {
        const pushSubscription = JSON.parse(subscription.subscription);
        
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon.ico',
            data: { type, ...data },
            timestamp: Date.now()
          }),
          { urgency: 'high' }
        );
        console.log(`📱 Push notification sent to user ${userId}`);
      } else {
        console.log(`⚠️ No push subscription for user ${userId}`);
      }
    } catch (err) {
      console.error(`❌ Push notification failed for user ${userId}:`, err.message);
    }

    // 4. Skip email (not required)
    // Email is optional, so we skip it

    return notification;
  } catch (err) {
    console.error('❌ createAndSendNotification error:', err.message);
    return null;
  }
}

module.exports = { createAndSendNotification };