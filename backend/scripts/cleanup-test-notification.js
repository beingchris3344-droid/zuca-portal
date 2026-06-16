const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNotification() {
  // Get the Christ The King event
  const event = await prisma.scheduleEvent.findFirst({
    where: { title: { contains: 'Christ The King' } }
  });
  
  if (!event) {
    console.log('❌ Event not found');
    return;
  }
  
  console.log('Testing notification for:', event.title);
  console.log('Event date/time:', event.eventDate, event.eventTime);
  console.log('');
  
  // Get all notifications for this event
  const notifications = await prisma.scheduledNotification.findMany({
    where: { eventId: event.id },
    orderBy: { notifyAt: 'asc' }
  });
  
  console.log(`Found ${notifications.length} notifications:\n`);
  
  const now = new Date();
  
  for (const n of notifications) {
    const timeDiff = Math.round((n.notifyAt - now) / 60000);
    const isPast = n.notifyAt <= now;
    
    console.log(`${isPast ? '🔴' : '🟢'} ${n.title}`);
    console.log(`   Scheduled: ${n.notifyAt.toLocaleString()}`);
    console.log(`   Status: ${n.isSent ? 'SENT' : 'PENDING'}`);
    console.log(`   Time: ${isPast ? `${Math.abs(timeDiff)} minutes ago` : `in ${timeDiff} minutes`}`);
    console.log('');
  }
  
  await prisma.$disconnect();
}

testNotification();a// backend/scripts/cleanup-test-notification.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function cleanup() {
  console.log('\n🧹 Cleaning up test notification data...');
  
  try {
    const testInfo = JSON.parse(fs.readFileSync('./test-notification-info.json', 'utf8'));
    
    await prisma.scheduledNotification.deleteMany({ where: { eventId: testInfo.eventId } });
    await prisma.scheduleEvent.delete({ where: { id: testInfo.eventId } });
    await prisma.schedule.delete({ where: { id: testInfo.scheduleId } });
    
    fs.unlinkSync('./test-notification-info.json');
    console.log('✅ Test data cleaned up successfully!');
  } catch (err) {
    console.log('No test data found or already cleaned up');
  }
  
  await prisma.$disconnect();
}

cleanup();