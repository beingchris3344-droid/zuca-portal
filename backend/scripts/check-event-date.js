// backend/scripts/check-event-date.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkEventDate() {
  console.log("\n🔍 CHECKING EVENT DATE STORAGE\n" + "=".repeat(50));
  
  // Get the Christ The King event
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
  console.log(`📅 Stored eventDate: ${event.eventDate}`);
  console.log(`📅 Stored eventTime: ${event.eventTime || "16:30"}`);
  console.log("\n--- Different Representations ---");
  console.log(`1. Direct from DB: ${event.eventDate}`);
  console.log(`2. .toString(): ${event.eventDate.toString()}`);
  console.log(`3. .toISOString(): ${event.eventDate.toISOString()}`);
  console.log(`4. .toUTCString(): ${event.eventDate.toUTCString()}`);
  console.log(`5. .toLocaleString('en-US'): ${event.eventDate.toLocaleString('en-US')}`);
  console.log(`6. Kenyan Time (Africa/Nairobi): ${event.eventDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  console.log(`7. UTC Time: ${event.eventDate.toLocaleString('en-US', { timeZone: 'UTC' })}`);
  
  // Extract components using different methods
  console.log("\n--- Component Extraction ---");
  console.log(`getDate(): ${event.eventDate.getDate()}`);
  console.log(`getUTCDate(): ${event.eventDate.getUTCDate()}`);
  console.log(`getHours(): ${event.eventDate.getHours()}`);
  console.log(`getUTCHours(): ${event.eventDate.getUTCHours()}`);
  
  // Calculate what 1 day before should be
  console.log("\n--- 1 Day Before Calculation ---");
  const oneDayBefore = new Date(event.eventDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  console.log(`1 day before (using setDate): ${oneDayBefore.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  
  const oneDayBeforeUTC = new Date(event.eventDate.getTime() - (24 * 60 * 60 * 1000));
  console.log(`1 day before (using UTC ms): ${oneDayBeforeUTC.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  
  // Check what the email SHOULD have shown
  console.log("\n--- What Email Should Have Shown ---");
  const kenyanDate = new Date(event.eventDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const oneDayBeforeKenyan = new Date(kenyanDate);
  oneDayBeforeKenyan.setDate(kenyanDate.getDate() - 1);
  console.log(`Event date (Kenyan): ${kenyanDate.toLocaleDateString('en-US')}`);
  console.log(`1 day before (Kenyan): ${oneDayBeforeKenyan.toLocaleDateString('en-US')}`);
  
  await prisma.$disconnect();
}

checkEventDate().catch(console.error);