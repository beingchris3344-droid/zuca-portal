// backend/scripts/fix-notifications-auto.js
// Auto-run version without confirmation

require("dotenv").config({ path: "../.env" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const KENYA_TIMEZONE = 'Africa/Nairobi';

function getKenyanTime() {
  const now = new Date();
  const kenyanTimeStr = now.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE });
  return new Date(kenyanTimeStr);
}

function getNotificationMessage(event, timing) {
  const eventTime = event.eventTime || "16:30";
  const location = event.location || "Location to be announced";
  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-US', { 
    timeZone: KENYA_TIMEZONE,
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

async function regenerateEventNotifications(eventId, scheduleId) {
  const event = await prisma.scheduleEvent.findUnique({
    where: { id: eventId }
  });
  
  if (!event) return false;
  
  await prisma.scheduledNotification.deleteMany({
    where: { eventId: event.id }
  });
  
  const eventDate = new Date(event.eventDate);
  const [hours, minutes] = (event.eventTime || "16:30").split(":").map(Number);
  
 const eventDateTime = new Date(
    eventDate.getUTCFullYear(),
    eventDate.getUTCMonth(),
    eventDate.getUTCDate(),
    hours,
    minutes,
    0
  );
  
  const now = new Date();
  const notificationTimings = [
    { daysBefore: 7, label: "1 week before", priority: "normal" },
    { daysBefore: 3, label: "3 days before", priority: "normal" },
    { daysBefore: 1, label: "1 day before", priority: "high" },
    { hoursBefore: 12, label: "12 hours before", priority: "high" },
    { hoursBefore: 6, label: "6 hours before", priority: "high" },
    { hoursBefore: 1, label: "1 hour before", priority: "urgent" },
    { minutesBefore: 30, label: "30 minutes before", priority: "urgent" }
  ];
  
  for (const timing of notificationTimings) {
    let notifyAt = new Date(eventDateTime.getTime());
    
    if (timing.daysBefore !== undefined) {
      notifyAt = new Date(notifyAt.getTime() - (timing.daysBefore * 24 * 60 * 60 * 1000));
    } else if (timing.hoursBefore !== undefined) {
      notifyAt = new Date(notifyAt.getTime() - (timing.hoursBefore * 60 * 60 * 1000));
    } else if (timing.minutesBefore !== undefined) {
      notifyAt = new Date(notifyAt.getTime() - (timing.minutesBefore * 60 * 1000));
    }
    
    if (notifyAt > now) {
      await prisma.scheduledNotification.create({
        data: {
          eventId: event.id,
          scheduleId: scheduleId,
          title: `⏰ ${timing.label}: ${event.title}`,
          message: getNotificationMessage(event, timing.label),
          notifyAt: notifyAt,
          priority: timing.priority,
          isSent: false
        }
      });
      console.log(`   ✅ Created ${timing.label}`);
    }
  }
  return true;
}

async function main() {
  console.log("\n🔧 AUTO-FIXING NOTIFICATIONS (no confirmation)\n");
  
  const now = getKenyanTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const events = await prisma.scheduleEvent.findMany({
    where: {
      eventDate: { gte: today },
      schedule: { isPublished: true }
    },
    include: { schedule: true },
    orderBy: { eventDate: 'asc' }
  });
  
  console.log(`📅 Found ${events.length} upcoming events\n`);
  
  let fixed = 0;
  
  for (const event of events) {
    console.log(`📌 Fixing: ${event.title}`);
    await regenerateEventNotifications(event.id, event.scheduleId);
    fixed++;
    console.log(`   ✅ Done\n`);
  }
  
  console.log(`✅ Fixed ${fixed} events`);
  
  await prisma.$disconnect();
}

main().catch(console.error);