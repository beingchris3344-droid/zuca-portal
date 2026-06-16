// backend/scripts/test-notification-function.js
// Run with: node scripts/test-notification-function.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== COPY THE EXACT FUNCTION FROM attendanceRoutes.js ====================
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  console.log(`🔔 Creating notification: ${title} for user ${userId}`);
  
  try {
    // 1. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date(),
        data: data || {}
      }
    });

    console.log(`   ✅ Notification saved to database: ${notification.id}`);

    // 2. Send real-time via Socket.IO
    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
        console.log(`   ✅ Socket.IO event sent`);
      } else {
        console.log(`   ⚠️ Socket.IO not available globally`);
      }
    } catch (err) {
      console.log(`   ⚠️ Socket.IO error:`, err.message);
    }

    // 3. Send PUSH NOTIFICATION
    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (subscription) {
        console.log(`   📱 Push subscription found, sending push...`);
        const webpush = require('web-push');
        
        webpush.setVapidDetails(
          'mailto:zucaportal2025@gmail.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        const unreadCount = await prisma.notification.count({
          where: { userId, read: false }
        });

        const pushSubscription = JSON.parse(subscription.subscription);
        
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon.ico',
            badgeCount: unreadCount + 1,
            data: { type, ...data },
            timestamp: Date.now()
          }),
          { urgency: 'high' }
        );
        
        console.log(`   ✅ Push notification sent to user ${userId}`);
      } else {
        console.log(`   ⚠️ No push subscription for user ${userId}`);
      }
    } catch (err) {
      console.error(`   ❌ Push notification failed:`, err.message);
      if (err.statusCode === 410) {
        console.log(`      ⚠️ Subscription expired - removing`);
        await prisma.pushSubscription.deleteMany({ where: { userId } });
      }
    }

    // 4. Send EMAIL
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { homeJumuia: true }
      });
      
      if (user?.email) {
        console.log(`   📧 Sending email to ${user.email}...`);
        const { sendPersonalizedEmail } = require("../services/mailer");
        
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          type,
          title,
          message,
          data
        );
        
        console.log(`   ✅ Email sent to ${user.email}`);
      } else {
        console.log(`   ⚠️ No email for user ${userId}`);
      }
    } catch (err) {
      console.error(`   ❌ Email failed:`, err.message);
    }

    return notification;
  } catch (err) {
    console.error('❌ createAndSendNotification error:', err.message);
    console.error(err.stack);
    return null;
  }
}
// ==================== END OF COPIED FUNCTION ====================

async function testNotification() {
  console.log('\n' + '='.repeat(80));
  console.log('🔔 TESTING NOTIFICATION FUNCTION DIRECTLY');
  console.log('='.repeat(80));
  
  // 1. Get a user with push subscription
  console.log('\n📌 Finding user with push subscription...');
  
  const subscription = await prisma.pushSubscription.findFirst({
    include: {
      user: true
    }
  });
  
  if (!subscription) {
    console.log('❌ No push subscription found!');
    console.log('   Please subscribe to push notifications first.');
    await prisma.$disconnect();
    return;
  }
  
  const user = subscription.user;
  console.log(`✅ Found user: ${user.fullName} (${user.email})`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Push subscription: YES`);
  
  // 2. Send a test notification
  console.log('\n📨 Sending test notification...');
  console.log('-'.repeat(40));
  
  const result = await createAndSendNotification({
    userId: user.id,
    type: "test_direct",
    title: "🔔 Direct Function Test",
    message: `This notification was sent directly from the test script!\n\nTest Time: ${new Date().toLocaleString()}\n\nIf you received this, the notification function is working correctly!\n\nTumsifu Yesu Kristu! 🙏`,
    data: { 
      test: true, 
      timestamp: new Date().toISOString(),
      source: "direct-test-script"
    }
  });
  
  if (result) {
    console.log('\n✅ SUCCESS! Notification sent!');
    console.log(`   Notification ID: ${result.id}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Created: ${result.createdAt}`);
  } else {
    console.log('\n❌ FAILED! Notification not sent.');
  }
  
  // 3. Show recent notifications
  console.log('\n📊 Recent notifications for user:');
  console.log('-'.repeat(40));
  
  const recent = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  if (recent.length === 0) {
    console.log('   No recent notifications found');
  } else {
    for (const n of recent) {
      console.log(`   📌 ${n.title}`);
      console.log(`      Message: ${n.message.substring(0, 80)}...`);
      console.log(`      Time: ${n.createdAt.toLocaleString()}`);
      console.log(`      Read: ${n.read ? '✅' : '❌'}`);
      console.log('');
    }
  }
  
  // 4. Check email and push status
  console.log('📱 CHECK YOUR:');
  console.log('   1. 📧 Email inbox (and spam folder)');
  console.log('   2. 📱 Phone for push notification');
  console.log('   3. 🔍 Backend logs for "📱 Push sent"');
  
  await prisma.$disconnect();
}

// Run the test
testNotification().catch(console.error);