// backend/scripts/test-530am.js
// Run with: node scripts/test-530am.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test530am() {
  console.log('\n' + '='.repeat(80));
  console.log('🔔 5:30 AM NOTIFICATION TEST');
  console.log('='.repeat(80));
  
  const now = new Date();
  const nowKenyan = now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
  console.log(`\n🕐 Current Kenyan Time: ${nowKenyan}`);
  
  // Create target time: TODAY at 5:30 AM
  const targetTime = new Date();
  targetTime.setHours(5, 30, 0, 0);
  
  // If 5:30 AM already passed today, set for tomorrow
  if (targetTime < now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  const targetKenyan = targetTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
  const minutesFromNow = Math.round((targetTime - now) / (1000 * 60));
  const hoursFromNow = Math.floor(minutesFromNow / 60);
  const remainingMinutes = minutesFromNow % 60;
  
  console.log(`\n📅 Target notification time: ${targetKenyan}`);
  console.log(`⏳ Time remaining: ${hoursFromNow} hours and ${remainingMinutes} minutes`);
  
  // Create a test event for TODAY at 5:30 PM (so 12-hour before is 5:30 AM)
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Noon to avoid DST
  
  const [year, month, day] = [today.getFullYear(), today.getMonth(), today.getDate()];
  const eventDate = new Date(year, month, day, 12, 0, 0);
  
  console.log(`\n📌 Creating test event:`);
  console.log(`   Event at: ${eventDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  console.log(`   Event time: 5:30 PM (17:30)`);
  
  // Create test schedule
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' }
  });
  
  const testSchedule = await prisma.schedule.create({
    data: {
      title: `⏰ 5:30AM TEST - ${new Date().toLocaleTimeString()}`,
      content: "Testing 5:30 AM notification",
      isPublished: true,
      createdBy: adminUser.id,
      sections: [],
      generalPoints: [],
      additionalNotes: "",
      semesterPeriod: { start: null, end: null }
    }
  });
  
  // Create event at 5:30 PM today
  const eventDateTime = new Date(year, month, day, 17, 30, 0);
  
  const testEvent = await prisma.scheduleEvent.create({
    data: {
      scheduleId: testSchedule.id,
      title: "🚨 5:30 AM NOTIFICATION TEST",
      description: "This event triggers a notification at 5:30 AM",
      eventDate: eventDate,
      eventTime: "17:30",
      location: "Test Location",
      groupName: "Test Group",
      reminderDays: []
    }
  });
  
  console.log(`\n✅ Test event created: ${testEvent.id}`);
  console.log(`   Event time: 5:30 PM (17:30)`);
  
  // Create the 12-hour before notification (should be at 5:30 AM)
  const twelveHourNotif = new Date(eventDateTime);
  twelveHourNotif.setHours(twelveHourNotif.getHours() - 12);
  
  console.log(`\n📊 12-hour notification will send at: ${twelveHourNotif.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  
  // Create the notification
  await prisma.scheduledNotification.create({
    data: {
      eventId: testEvent.id,
      scheduleId: testSchedule.id,
      title: "⏰ 5:30 AM TEST NOTIFICATION",
      message: "🔔 THIS IS A TEST! If you're seeing this at 5:30 AM, notifications are working correctly!",
      notifyAt: twelveHourNotif,
      priority: "urgent",
      isSent: false
    }
  });
  
  console.log(`\n✅ 5:30 AM notification created!`);
  
  // Check if it should send now
  const shouldSendNow = twelveHourNotif <= new Date();
  if (shouldSendNow) {
    console.log(`\n🔴 NOTIFICATION IS DUE NOW!`);
    console.log(`   Run your cron job or wait for the next check`);
  } else {
    const waitMinutes = Math.round((twelveHourNotif - new Date()) / (1000 * 60));
    console.log(`\n⏳ Notification will send in ${waitMinutes} minutes (at 5:30 AM)`);
  }
  
  // Save test info for cleanup
  const fs = require('fs');
  const testInfo = {
    scheduleId: testSchedule.id,
    eventId: testEvent.id,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync('./test-530am-info.json', JSON.stringify(testInfo, null, 2));
  console.log(`\n💾 Test info saved to: test-530am-info.json`);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 WHAT TO DO:`);
  console.log(`${'='.repeat(80)}`);
  console.log(`
  1. Keep backend server running
  2. Wait until 5:30 AM
  3. The cron job will detect and send the notification
  4. Check your email/push notification
  
  To manually trigger NOW:
  curl -X POST http://localhost:5000/api/cron/check \\
    -H "x-cron-secret: YOUR_CRON_SECRET"
  
  To cleanup later:
  rm test-530am-info.json
  `);
  
  await prisma.$disconnect();
}

test530am().catch(console.error);