// services/cronJobs.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper function to check if email type is enabled
async function isEmailTypeEnabled(type) {
  try {
    const { isEmailTypeEnabled: checkEmail } = require("./mailer");
    return await checkEmail(type);
  } catch (err) {
    console.log(`⚠️ Could not check email setting for ${type}, defaulting to send:`, err.message);
    return true;
  }
}

async function sendEventReminders() {
  console.log("🕐 Running semester schedule event reminders check...");
  
  // ✅ Check if event reminders are enabled
  const isEnabled = await isEmailTypeEnabled('event_reminder');
  if (!isEnabled) {
    console.log("📧 Event reminders are disabled, skipping");
    return;
  }
  
  const now = new Date();
  
  const pendingNotifications = await prisma.scheduledNotification.findMany({
    where: {
      notifyAt: { lte: now },
      isSent: false
    },
    include: {
      event: {
        include: {
          schedule: true
        }
      }
    }
  });
  
  if (pendingNotifications.length === 0) {
    console.log("📭 No pending event reminders");
    return;
  }
  
  console.log(`📢 Found ${pendingNotifications.length} pending notifications`);
  
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true }
  });
  
  for (const notification of pendingNotifications) {
    console.log(`📧 Processing: ${notification.title}`);
    
    for (const user of allUsers) {
      try {
        if (global.createAndSendNotification) {
          await global.createAndSendNotification({
            userId: user.id,
            type: "event_reminder",
            title: notification.title,
            message: notification.message,
            data: { 
              eventId: notification.eventId,
              scheduleId: notification.scheduleId,
              priority: notification.priority
            }
          });
        } else {
          console.log(`⚠️ createAndSendNotification not available, only creating DB notification`);
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "event_reminder",
              title: notification.title,
              message: notification.message,
              data: { 
                eventId: notification.eventId,
                scheduleId: notification.scheduleId,
                priority: notification.priority
              },
              read: false,
              createdAt: new Date()
            }
          });
          
          if (global.io) {
            global.io.to(user.id).emit("new_notification", {
              id: `${Date.now()}`,
              userId: user.id,
              type: "event_reminder",
              title: notification.title,
              message: notification.message,
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(`Failed to send to user ${user.id}:`, err.message);
      }
    }
    
    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: { isSent: true, sentAt: new Date() }
    });
    
    console.log(`✅ Sent "${notification.title}" to ${allUsers.length} users`);
  }
}

async function sendCampaignReminders() {
  console.log("💰 Running campaign deadline check...");
  
  // ✅ Check if campaign reminders are enabled
  const isEnabled = await isEmailTypeEnabled('campaign_reminder');
  if (!isEnabled) {
    console.log("📧 Campaign reminders are disabled, skipping");
    return;
  }
  
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
      if (global.createAndSendNotification) {
        await global.createAndSendNotification({
          userId: pledge.user.id,
          type: "campaign_reminder",
          title: `⏰ Campaign Deadline: ${daysLeft} days left`,
          message: `The "${campaign.title}" campaign ends in ${daysLeft} days. Your pending amount is KES ${pledge.pendingAmount.toLocaleString()}.`,
          data: { campaignId: campaign.id, daysLeft }
        });
      }
    }
    console.log(`✅ Reminders sent for campaign: ${campaign.title}`);
  }
}

async function checkNoAnnouncements() {
  console.log("📢 Checking for recent announcements...");
  
  // ✅ Check if announcement suggestions are enabled
  const isEnabled = await isEmailTypeEnabled('announcement_new');
  if (!isEnabled) {
    console.log("📧 Announcement suggestions are disabled, skipping");
    return;
  }
  
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
      if (global.createAndSendNotification) {
        await global.createAndSendNotification({
          userId: admin.id,
          type: "suggestion",
          title: "📢 Announcement Suggestion",
          message: "No announcements have been posted in 2 weeks. Would you like me to draft one?",
          data: { action: "draft_announcement" }
        });
      }
    }
    console.log(`✅ Alert sent to ${admins.length} admins`);
  }
}

module.exports = {
  sendEventReminders,
  sendCampaignReminders,
  checkNoAnnouncements
};