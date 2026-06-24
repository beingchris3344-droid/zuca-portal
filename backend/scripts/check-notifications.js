// ============================================
// CHECK SCHEDULED NOTIFICATIONS
// Run: node check-notifications.js
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  console.log('========================================');
  console.log('    SCHEDULED NOTIFICATIONS REPORT');
  console.log('========================================');
  console.log('');

  try {
    // 1. Total
    const total = await prisma.scheduledNotification.count();
    console.log(`📊 TOTAL: ${total}`);

    // 2. Pending
    const pending = await prisma.scheduledNotification.count({
      where: { isSent: false }
    });
    console.log(`⏳ PENDING: ${pending}`);

    // 3. Sent
    const sent = await prisma.scheduledNotification.count({
      where: { isSent: true }
    });
    console.log(`✅ SENT: ${sent}`);

    // 4. Get all notifications
    const all = await prisma.scheduledNotification.findMany({
      orderBy: { notifyAt: 'asc' },
      take: 50
    });

    console.log('');
    console.log('📋 ALL NOTIFICATIONS (First 50):');
    console.log('----------------------------------------');
    all.forEach((n, i) => {
      console.log(`${i+1}. ${n.title}`);
      console.log(`   Scheduled: ${n.notifyAt}`);
      console.log(`   Sent: ${n.isSent ? '✅ Yes' : '⏳ No'}`);
      console.log(`   Priority: ${n.priority}`);
      console.log(`   Event ID: ${n.eventId}`);
      console.log('');
    });

    // 5. Pending only
    const pendingList = await prisma.scheduledNotification.findMany({
      where: { 
        isSent: false,
        notifyAt: { gt: new Date() }
      },
      orderBy: { notifyAt: 'asc' },
      take: 20
    });

    console.log('📋 PENDING NOTIFICATIONS (Future):');
    console.log('----------------------------------------');
    if (pendingList.length === 0) {
      console.log('  No pending notifications');
    } else {
      pendingList.forEach((n, i) => {
        console.log(`${i+1}. ${n.title}`);
        console.log(`   Scheduled: ${n.notifyAt}`);
        console.log(`   Priority: ${n.priority}`);
        console.log('');
      });
    }

    // 6. Expired
    const expired = await prisma.scheduledNotification.findMany({
      where: { 
        isSent: false,
        notifyAt: { lt: new Date() }
      },
      orderBy: { notifyAt: 'desc' }
    });

    console.log('⚠️ EXPIRED (Should have been sent):');
    console.log('----------------------------------------');
    if (expired.length === 0) {
      console.log('  None expired');
    } else {
      expired.forEach((n, i) => {
        console.log(`${i+1}. ${n.title}`);
        console.log(`   Was scheduled: ${n.notifyAt}`);
        console.log(`   Days overdue: ${Math.floor((new Date() - new Date(n.notifyAt)) / (1000 * 60 * 60 * 24))} days`);
        console.log('');
      });
    }

    console.log('========================================');
    console.log('✅ CHECK COMPLETE');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();