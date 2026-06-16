// backend/scripts/fix-event-notifications.js
// Run with: node scripts/fix-event-notifications.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to get Kenyan time
function getNotificationMessage(event, timing) {
  const eventTime = event.eventTime || "16:30";
  const location = event.location || "Location to be announced";
  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const messages = {
    "1 week before": `📅 REMINDER: "${event.title}" is in 1 week on ${eventDateFormatted} at ${eventTime} in ${location}. Please prepare and mark your calendar!`,
    "3 days before": `📅 REMINDER: "${event.title}" is in 3 days on ${eventDateFormatted} at ${eventTime} in ${location}. Don't forget to attend!`,
    "1 day before": `🔔 IMPORTANT: "${event.title}" is on ${eventDateFormatted} at ${eventTime} in ${location}. Please be punctual and prepared!`,
    "12 hours before": `⏰ "${event.title}" is in 12 hours (Today at ${eventTime} in ${location}). Get ready!`,
    "6 hours before": `⏰ "${event.title}" is in 6 hours at ${eventTime} in ${location}. Make your way to the venue.`,
    "1 hour before": `🚨 URGENT: "${event.title}" starts in 1 hour at ${eventTime} in ${location}. Please head to the venue now!`,
    "30 minutes before": `🚨 "${event.title}" starts in 30 minutes at ${location}. Please take your seats!`
  };
  
  return messages[timing] || `📢 "${event.title}" is scheduled for ${eventDateFormatted} at ${eventTime} in ${location}.`;
}

async function fixEventNotifications() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX EVENT NOTIFICATIONS');
  console.log('='.repeat(80));
  
  // Find the Christ The King event
  const event = await prisma.scheduleEvent.findFirst({
    where: { 
      title: { contains: 'Christ The King', mode: 'insensitive' }
    },
    include: { schedule: true }
  });
  
  if (!event) {
    console.log('\n❌ Event "Christ The King" not found!');
    console.log('Available events:');
    const allEvents = await prisma.scheduleEvent.findMany({
      select: { id: true, title: true, eventDate: true }
    });
    allEvents.forEach(e => {
      console.log(`   - ${e.title} (${e.eventDate.toISOString().split('T')[0]})`);
    });
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n📌 Found Event:`);
  console.log(`   ID: ${event.id}`);
  console.log(`   Title: ${event.title}`);
  console.log(`   Current Date: ${event.eventDate}`);
  console.log(`   Current Date (Kenyan): ${event.eventDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  console.log(`   Event Time: ${event.eventTime || "16:30"}`);
  console.log(`   Schedule: ${event.schedule?.title || 'Unknown'}`);
  
  // Step 1: Fix the event date (ensure it's correct)
  console.log('\n📝 STEP 1: Fixing event date...');
  
  // Parse the correct date (June 17, 2026)
  // The event should be on Wednesday, June 17, 2026 at 16:30 Kenyan time
  const correctDate = new Date(2026, 5, 17, 12, 0, 0); // June 17, 2026 at noon (to avoid DST)
  
  const updatedEvent = await prisma.scheduleEvent.update({
    where: { id: event.id },
    data: {
      eventDate: correctDate,
      eventTime: "16:30"
    }
  });
  
  console.log(`   ✅ Updated event date to: ${updatedEvent.eventDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  
  // Step 2: Delete existing notifications
  console.log('\n🗑️ STEP 2: Deleting old notifications...');
  
  const deleted = await prisma.scheduledNotification.deleteMany({
    where: { eventId: event.id }
  });
  
  console.log(`   ✅ Deleted ${deleted.count} old notifications`);
  
  // Step 3: Recreate notifications with correct timing
  console.log('\n📅 STEP 3: Creating new notifications...');
  
  const eventDate = new Date(updatedEvent.eventDate);
  const [hours, minutes] = (updatedEvent.eventTime || "16:30").split(":").map(Number);
  
  // Create the event date-time in LOCAL time (Kenyan time)
  const eventDateTime = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate(),
    hours,
    minutes,
    0
  );
  
  console.log(`   Event Date-Time (Kenyan): ${eventDateTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  console.log(`   Current Time (Kenyan): ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  
  const notificationTimings = [
    { daysBefore: 7, label: "1 week before", priority: "normal" },
    { daysBefore: 3, label: "3 days before", priority: "normal" },
    { daysBefore: 1, label: "1 day before", priority: "high" },
    { hoursBefore: 12, label: "12 hours before", priority: "high" },
    { hoursBefore: 6, label: "6 hours before", priority: "high" },
    { hoursBefore: 1, label: "1 hour before", priority: "urgent" },
    { minutesBefore: 30, label: "30 minutes before", priority: "urgent" }
  ];
  
  const now = new Date();
  let createdCount = 0;
  
  for (const timing of notificationTimings) {
    let notifyAt = new Date(eventDateTime);
    
    if (timing.daysBefore !== undefined) {
      notifyAt.setDate(notifyAt.getDate() - timing.daysBefore);
    } else if (timing.hoursBefore !== undefined) {
      notifyAt.setHours(notifyAt.getHours() - timing.hoursBefore);
    } else if (timing.minutesBefore !== undefined) {
      notifyAt.setMinutes(notifyAt.getMinutes() - timing.minutesBefore);
    }
    
    const notifyAtKenyan = notifyAt.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
    const isFuture = notifyAt > now;
    
    console.log(`   ${timing.label}: ${notifyAtKenyan} ${isFuture ? '✅' : '🔴 PAST'}`);
    
    if (isFuture) {
      await prisma.scheduledNotification.create({
        data: {
          eventId: event.id,
          scheduleId: event.scheduleId,
          title: `⏰ ${timing.label}: ${event.title}`,
          message: getNotificationMessage(event, timing.label),
          notifyAt: notifyAt,
          priority: timing.priority,
          isSent: false
        }
      });
      createdCount++;
    }
  }
  
  console.log(`\n✅ Created ${createdCount} new notifications`);
  
  // Step 4: Verify the notifications
  console.log('\n🔍 STEP 4: Verifying notifications...');
  
  const newNotifications = await prisma.scheduledNotification.findMany({
    where: { eventId: event.id },
    orderBy: { notifyAt: 'asc' }
  });
  
  console.log(`   Total notifications: ${newNotifications.length}`);
  console.log('\n   Notification Schedule:');
  for (const notif of newNotifications) {
    const notifyAtKenyan = notif.notifyAt.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
    console.log(`   • ${notif.title}`);
    console.log(`     Send at: ${notifyAtKenyan}`);
  }
  
  // Step 5: Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const eventDateTimeKenyan = eventDateTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
  const nowKenyan = now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
  
  console.log(`\n   Event: ${event.title}`);
  console.log(`   Event Date/Time: ${eventDateTimeKenyan}`);
  console.log(`   Current Time: ${nowKenyan}`);
  console.log(`   Notifications Created: ${createdCount}/${notificationTimings.length}`);
  
  if (createdCount === notificationTimings.length) {
    console.log('\n✅ SUCCESS! All notifications created correctly!');
  } else {
    console.log(`\n⚠️ Only ${createdCount} of ${notificationTimings.length} notifications were created (some were already in the past)`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 SCRIPT COMPLETED');
  console.log('='.repeat(80) + '\n');
  
  await prisma.$disconnect();
}

// Run the script
fixEventNotifications().catch(console.error);
