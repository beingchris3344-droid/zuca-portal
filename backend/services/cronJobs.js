// backend/services/cronJobs.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendPersonalizedEmail } = require("./mailer");

// Send event reminders (events happening tomorrow)
async function sendEventReminders() {
  console.log("🕐 Running event reminders check...");
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(tomorrow);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const events = await prisma.scheduleEvent.findMany({
    where: {
      eventDate: { gte: tomorrow, lt: nextDay }
    },
    include: { schedule: true }
  });
  
  if (events.length === 0) {
    console.log("📭 No events tomorrow");
    return;
  }
  
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, homeJumuia: true }
  });
  
  for (const event of events) {
    for (const user of allUsers) {
      await sendPersonalizedEmail(
        user,
        "event_reminder",
        "⏰ Event Tomorrow",
        `${event.title} tomorrow at ${event.eventTime || "4:30 PM"} at ${event.location || "Main Chapel"}`
      );
    }
    console.log(`✅ Reminders sent for event: ${event.title}`);
  }
}

// Send campaign deadline reminders
async function sendCampaignReminders() {
  console.log("💰 Running campaign deadline check...");
  
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const campaigns = await prisma.contributionType.findMany({
    where: {
      deadline: {
        lte: threeDaysFromNow,
        gte: today
      }
    },
    include: {
      pledges: {
        where: { pendingAmount: { gt: 0 } },
        include: { user: true }
      }
    }
  });
  
  for (const campaign of campaigns) {
    const daysLeft = Math.ceil((campaign.deadline - new Date()) / (1000 * 60 * 60 * 24));
    
    for (const pledge of campaign.pledges) {
      await sendPersonalizedEmail(
        pledge.user,
        "campaign_reminder",
        "⏰ Campaign Deadline Approaching",
        `The "${campaign.title}" campaign ends in ${daysLeft} days. Your pending amount is KES ${pledge.pendingAmount.toLocaleString()}.`
      );
    }
    console.log(`✅ Reminders sent for campaign: ${campaign.title} (${daysLeft} days left)`);
  }
}

// Check if no announcements for 2 weeks
async function checkNoAnnouncements() {
  console.log("📢 Checking for recent announcements...");
  
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentAnnouncement = await prisma.announcement.findFirst({
    where: { createdAt: { gte: twoWeeksAgo } }
  });
  
  if (!recentAnnouncement) {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, fullName: true }
    });
    
    for (const admin of admins) {
      await sendPersonalizedEmail(
        admin,
        "suggestion",
        "📢 Announcement Suggestion",
        "No announcements have been posted in 2 weeks. Would you like me to draft one? Reply with 'Draft announcement about [topic]'"
      );
    }
    console.log(`✅ Alert sent to ${admins.length} admins`);
  } else {
    console.log(`📰 Recent announcement found: "${recentAnnouncement.title}"`);
  }
}

module.exports = {
  sendEventReminders,
  sendCampaignReminders,
  checkNoAnnouncements
};