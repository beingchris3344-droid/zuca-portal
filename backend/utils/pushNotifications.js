// utils/pushNotifications.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const webpush = require('web-push');
const { sendPersonalizedEmail } = require("../services/mailer");

// VAPID keys from environment
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:zucaportal2025@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✅ WebPush configured');
} else {
  console.log('⚠️ VAPID keys missing - push notifications disabled');
}

async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      console.log(`⚠️ No push subscription for user ${userId}`);
      return false;
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false }
    });

    const pushSubscription = JSON.parse(subscription.subscription);
    
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title,
        body,
        icon: '/android-chrome-192x192.png',
        badge: '/favicon.ico',
        badgeCount: unreadCount + 1,
        data,
        timestamp: Date.now()
      }),
      { urgency: 'high' }
    );
    
    console.log(`📱 Push sent to user ${userId}`);
    return true;
  } catch (err) {
    console.error(`❌ Push error for user ${userId}:`, err.message);
    if (err.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({ where: { userId } });
    }
    return false;
  }
}

async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  console.log(`📢 Creating notification for user ${userId}: ${title}`);
  
  // Save to database
  const notif = await prisma.notification.create({
    data: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      data: data
    }
  });

  // Socket.io real-time event
  if (global.io) {
    global.io.to(userId).emit('new_notification', {
      ...notif,
      createdAt: notif.createdAt.toISOString()
    });
    console.log(`🔔 Socket event sent to user ${userId}`);
  }

  // Send push notification (don't await - do in background)
  sendPushNotification(userId, title, message, { type, ...data }).catch(err => {
    console.error('Push notification background error:', err.message);
  });

  // Send email in background
  (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { homeJumuia: true }
      });
      if (user && user.email) {
        await sendPersonalizedEmail(user, type, title, message, data);
        console.log(`📧 Email sent to ${user.email}`);
      }
    } catch (err) {
      // Silently ignore email errors
    }
  })();

  return notif;
}

module.exports = { createAndSendNotification, sendPushNotification };