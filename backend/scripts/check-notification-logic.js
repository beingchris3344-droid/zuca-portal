// backend/scripts/check-notification-logic.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Copy your exact getNotificationMessage function
function getNotificationMessage(event, timing) {
  const eventTime = event.eventTime || "16:30";
  const location = event.location || "Location to be announced";
  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-US', { 
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const messages = {
    "1 day before": `🔔 IMPORTANT: "${event.title}" is on ${eventDateFormatted} at ${eventTime} in ${location}. Please be punctual and prepared!`,
  };
  
  return messages[timing] || `📢 "${event.title}" is scheduled for ${eventDateFormatted} at ${eventTime} in ${location}.`;
}

async function checkNotificationLogic() {
  console.log("\n🔍 CHECKING NOTIFICATION LOGIC\n" + "=".repeat(50));
  
  // Get the event
  const event = await prisma.scheduleEvent.findFirst({
    where: { 
      title: { contains: "Christ The King", mode: 'insensitive' }
    }
  });
  
  if (!event) {
    console.log("❌ Event not found!");
    return;
  }
  
  console.log(`📌 Event: ${event.title}`);
  console.log(`📅 Event Date (raw): ${event.eventDate}`);
  console.log(`⏰ Event Time: ${event.eventTime || "16:30"}`);
  
  // Check what date the notification would show
  console.log("\n--- What getNotificationMessage would produce ---");
  const message = getNotificationMessage(event, "1 day before");
  console.log(message);
  
  // Extract the date from the message
  const dateMatch = message.match(/on (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([^,]+), (\d{4})/);
  if (dateMatch) {
    console.log(`\n📧 Email would show date: ${dateMatch[2]}, ${dateMatch[3]}`);
  }
  
  // Check what the actual event date is in Kenyan time
  const kenyanEventDate = new Date(event.eventDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  console.log(`\n🎯 Actual event date in Kenyan time: ${kenyanEventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  
  // Calculate when the 1-day-before notification should have been sent
  const oneDayBeforeKenyan = new Date(kenyanEventDate);
  oneDayBeforeKenyan.setDate(kenyanEventDate.getDate() - 1);
  console.log(`📅 1-day-before notification should have been sent on: ${oneDayBeforeKenyan.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  
  // Check if there's a notification record
  const notification = await prisma.scheduledNotification.findFirst({
    where: { 
      eventId: event.id,
      title: { contains: "1 day before" }
    }
  });
  
  if (notification) {
    console.log(`\n📬 Found notification record:`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   notifyAt (raw): ${notification.notifyAt}`);
    console.log(`   notifyAt (Kenyan): ${notification.notifyAt.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  }
  
  await prisma.$disconnect();
}

checkNotificationLogic().catch(console.error);