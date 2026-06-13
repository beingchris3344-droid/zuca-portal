const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin, requireLeaderOrAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require('crypto');

const { sendPersonalizedEmail } = require("../services/mailer");
// Use global notification function from server.js
const createAndSendNotification = global.createAndSendNotification || (async () => {
  console.log("⚠️ createAndSendNotification not available globally");
  return null;
});

router.get("/scan/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const qrToken = await prisma.qRCodeToken.findFirst({
      where: { 
        token: token, 
        expiresAt: { gt: new Date() }
      },
      include: { 
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true,
            isActive: true
          }
        }
      }
    });
    
    if (!qrToken) {
      return res.status(404).json({ error: "Invalid or expired QR code" });
    }
    
    if (!qrToken.sheet.isActive) {
      return res.status(400).json({ error: "Meeting has been closed" });
    }
    
    res.json({ 
      success: true, 
      sheetId: qrToken.sheetId,
      sheet: qrToken.sheet,
      token: qrToken.token
    });
    
  } catch (err) {
    console.error("Verify scan error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Generate QR code for a sheet (admin only)
router.get("/sheet/:sheetId/qr", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    if (!sheet.isActive) {
      return res.status(400).json({ error: "Sheet is closed. Reopen it to generate QR code." });
    }
    
    let qrToken = await prisma.qRCodeToken.findFirst({
      where: { 
        sheetId: sheetId,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!qrToken) {
      const qrTokenValue = crypto.randomBytes(32).toString('hex');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      qrToken = await prisma.qRCodeToken.create({
        data: {
          token: qrTokenValue,
          sheetId: sheetId,
          expiresAt: expiryDate,
          createdBy: req.user.userId
        }
      });
    }
    
    const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const scanUrl = `${baseUrl}/scan/${qrToken.token}`;
    
    const QRCode = require('qrcode');
    const qrCodeUrl = await QRCode.toDataURL(scanUrl);
    
    res.json({ 
      success: true, 
      qrCodeUrl,
      token: qrToken.token,
      scanUrl: scanUrl,
      expiresAt: qrToken.expiresAt,
      sheet: {
        id: sheet.id,
        title: sheet.title,
        eventDate: sheet.eventDate,
        location: sheet.location
      }
    });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ error: err.message });
  }
});



// QR Code check-in endpoint - OPTIMIZED FOR SPEED
router.post("/qr-checkin", authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
     const { token, deviceId, deviceName, userId: specifiedUserId } = req.body;
    const userId = specifiedUserId || req.user.userId;
    
    console.log(`🔍 QR Scan - User: ${userId.substring(0,8)}...`);
    
    // ========== STEP 1: BULK FETCH - ONE DATABASE CALL ==========
    const [user, qrToken] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, fullName: true, phone: true, 
          role: true, specialRole: true, membership_number: true, 
          jumuiaId: true, email: true 
        }
      }),
      prisma.qRCodeToken.findFirst({
        where: { token: token, expiresAt: { gt: new Date() } },
        include: { sheet: { select: { id: true, title: true, isActive: true, location: true } } }
      })
    ]);
    
    // Quick validation
    if (!user) {
      return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }
    
    if (!qrToken) {
      return res.status(400).json({ error: "Invalid or expired QR code", code: "INVALID_QR" });
    }
    
    if (!qrToken.sheet.isActive) {
      return res.status(400).json({ error: "Meeting has been closed", code: "MEETING_CLOSED" });
    }
    
    // ========== STEP 2: CHECK IF ALREADY CHECKED IN (ONE FAST QUERY) ==========
    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: { sheetId: qrToken.sheetId, userId: userId },
      select: { id: true, signTime: true }
    });
    
    if (existingEntry) {
      return res.status(400).json({ 
        error: "Already checked in",
        message: `Checked in at ${new Date(existingEntry.signTime).toLocaleTimeString()}`,
        code: "ALREADY_CHECKED_IN"
      });
    }
    
    // ========== STEP 3: CREATE CHECK-IN ENTRY (SIMPLE INSERT) ==========
    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId: qrToken.sheetId,
        userId: userId,
        deviceId: deviceId,
        deviceName: deviceName,
        fullName: user.fullName,
        phoneNumber: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaId: user.jumuiaId,
        signMethod: "QR_CODE",
        signTime: new Date(),
        notes: "Checked in via QR Code"
      },
      select: { id: true, signTime: true } // Only return what's needed
    });
    
    // ========== STEP 4: UPDATE QR TOKEN USAGE (FIRE AND FORGET) ==========
    // Don't await this - let it run in background
    prisma.qRCodeToken.update({
      where: { id: qrToken.id },
      data: { usedCount: { increment: 1 }, usedBy: userId }
    }).catch(err => console.error("Token update failed:", err.message));
    
    // ========== STEP 5: SEND IMMEDIATE RESPONSE ==========
    const duration = Date.now() - startTime;
    console.log(`✅ Check-in complete in ${duration}ms for ${user.fullName}`);
    
    res.json({ 
      success: true, 
      entry: {
        id: entry.id,
        signTime: entry.signTime,
        message: `Welcome ${user.fullName.split(' ')[0]}! You've been checked in.`
      }
    });
    
    // ========== STEP 6: BACKGROUND PROCESSING (FIRE AND FORGET) ==========
    // Send notifications and emails in background - user doesn't wait
    (async () => {
      try {
        // Send in-app notification (fast)
        await createAndSendNotification({
          userId: userId,
          type: "attendance_checkin",
          title: "✅ Check-in Successful!",
          message: `You have been checked in for "${qrToken.sheet.title}"`,
          data: { sheetId: qrToken.sheetId, entryId: entry.id }
        });
        
        // Send email - don't await, just fire
        if (user.email) {
          sendPersonalizedEmail(
            { email: user.email, fullName: user.fullName },
            "attendance_checkin",
            `Check-in Confirmation: ${qrToken.sheet.title}`,
            `Dear ${user.fullName},\n\nYou have been successfully checked in for "${qrToken.sheet.title}".\n\nThank you for your attendance!\n\nZetech University Catholic Action (ZUCA)`,
            { sheetTitle: qrToken.sheet.title, signTime: entry.signTime }
          ).catch(err => console.error("Email failed:", err.message));
        }
        
        // Real-time update for live activity feed (socket)
        const io = req.app.get("io");
        if (io) {
          io.to(`sheet-${qrToken.sheetId}`).emit("attendance_checkin", {
            sheetId: qrToken.sheetId,
            userId: userId,
            userName: user.fullName,
            timestamp: entry.signTime
          });
        }
      } catch (bgErr) {
        console.error("Background notification failed:", bgErr.message);
      }
    })();
    
 } catch (err) {
  if (err.code === 'P2002' && err.meta?.target?.includes('deviceId')) {
    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: { deviceId: req.body.deviceId },
      include: { user: true }
    });
    const userName = existingEntry?.user?.fullName || 'someone';
    return res.status(400).json({ 
      error: `This device has already been used to check in ${userName}`,
      code: "DEVICE_ALREADY_USED"
    });
  }
  if (err.code === 'P2002' && err.meta?.target?.includes('sheetId') && err.meta?.target?.includes('userId')) {
    return res.status(400).json({ 
      error: "Already checked in",
      code: "ALREADY_CHECKED_IN"
    });
  }
  console.error("QR check-in error:", err);
  res.status(500).json({ error: "Check-in failed. Please try again.", code: "SERVER_ERROR" });
}
});
// Get QR code status for a sheet
router.get("/sheet/:sheetId/qr-status", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const qrToken = await prisma.qRCodeToken.findFirst({
      where: { sheetId: sheetId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      hasQR: !!qrToken,
      token: qrToken?.token || null,
      expiresAt: qrToken?.expiresAt || null,
      createdAt: qrToken?.createdAt || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

// Get message tone based on user role
function getMessageTone(userRole, specialRole) {
  if (specialRole === 'chairperson') {
    return {
      missedTitle: "Executive Attendance Notice",
      missedMessage: "Your attendance is required at leadership meetings. Please review the meeting minutes and contact the administration regarding your absence.",
      style: "urgent",
      actionRequired: true
    };
  }
  
  if (specialRole === 'secretary') {
    return {
      missedTitle: "Secretary Attendance Notice",
      missedMessage: "You were not recorded as present at today's meeting. As secretary, your attendance is important for meeting documentation. Please contact the chairperson for any updates.",
      style: "important",
      actionRequired: true
    };
  }
  
  if (specialRole === 'treasurer') {
    return {
      missedTitle: "Finance Officer Attendance Notice",
      missedMessage: "Your attendance was not recorded at today's meeting. Financial matters were discussed. Please contact the chairperson for information.",
      style: "important",
      actionRequired: true
    };
  }
  
  if (specialRole === 'jumuia_leader') {
    return {
      missedTitle: "Jumuia Leader Attendance Notice",
      missedMessage: "You were absent from today's meeting. Please check with the administration for any important announcements.",
      style: "urgent",
      actionRequired: true
    };
  }
  
  if (specialRole === 'choir_moderator') {
    return {
      missedTitle: "Choir Leader Attendance Notice",
      missedMessage: "Your attendance was not recorded at today's meeting. Please review the meeting notes for any updates on upcoming services.",
      style: "direct",
      actionRequired: false
    };
  }
  
  if (specialRole === 'media_moderator') {
    return {
      missedTitle: "Media Team Attendance Notice",
      missedMessage: "You missed today's meeting. Please check the group communications for updates on upcoming events.",
      style: "informative",
      actionRequired: false
    };
  }
  
  // Regular member
  return {
    missedTitle: "Meeting Attendance Notice",
    missedMessage: "Your attendance was not recorded for the recent meeting. Please make note of future meeting schedules.",
    style: "gentle",
    actionRequired: false
  };

}

// Send check-in confirmation to member - FIRE AND FORGET
const sendCheckinConfirmation = async (userId, sheetTitle, entry) => {
  // Don't await anything here - just fire and forget
  (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) return;
      
      // In-app notification - fire and forget
      createAndSendNotification({
        userId: userId,
        type: "attendance_checkin",
        title: "✅ Check-in Successful!",
        message: `You have been checked in for "${sheetTitle}" at ${new Date(entry.signTime).toLocaleTimeString()}`,
        data: { sheetId: entry.sheetId, entryId: entry.id }
      }).catch(err => console.error("Check-in notif failed:", err.message));
      
      // Send email confirmation - fire and forget (no await)
      if (user.email) {
        sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          "attendance_checkin",
          `Check-in Confirmation: ${sheetTitle}`,
          `Dear ${user.fullName},

This is to confirm that you have been successfully checked in for "${sheetTitle}".

Check-in Details:
- Meeting: ${sheetTitle}
- Time: ${new Date(entry.signTime).toLocaleString()}
- Method: ${entry.signMethod}

Thank you for your attendance.

Zetech University Catholic Action (ZUCA)`,
          { sheetTitle, signTime: entry.signTime, signMethod: entry.signMethod }
        ).catch(err => console.error("Check-in email failed:", err.message));
      }
    } catch (err) {
      console.error("Failed to send check-in confirmation:", err.message);
    }
  })(); // Immediately invoked - runs in background
};

// Send notification for attendance sheet opened/created
const sendSheetOpenedNotification = async (sheet) => {
  try {
    let targetUsers = [];
    
    if (sheet.jumuiaId) {
      targetUsers = await prisma.user.findMany({
        where: { jumuiaId: sheet.jumuiaId }
      });
    } else {
      targetUsers = await prisma.user.findMany();
    }
    
    const meetingDate = new Date(sheet.eventDate).toLocaleDateString();
    const meetingTime = sheet.eventTime || "TBD";
    
    for (const user of targetUsers) {
      await createAndSendNotification({
        userId: user.id,
        type: "attendance_sheet_opened",
        title: `📋 Attendance Open: ${sheet.title}`,
        message: `A new attendance sheet has been opened for "${sheet.title}" on ${meetingDate} at ${meetingTime} at ${sheet.location || "ZUCA"}. Please check in when you arrive.`,
        data: { sheetId: sheet.id, title: sheet.title, eventDate: sheet.eventDate }
      });
    }
    
    console.log(`✅ Sent ${targetUsers.length} notifications for sheet opening: ${sheet.title}`);
  } catch (err) {
    console.error("Failed to send sheet opened notifications:", err.message);
  }
};
// Send notification for attendance sheet closed - BATCHED & FIRE-AND-FORGET
const sendSheetClosedNotification = async (sheetId) => {
  (async () => {
    try {
      const sheet = await prisma.attendanceSheet.findUnique({
        where: { id: sheetId },
        include: {
          entries: {
            include: { user: true }
          },
          creator: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });
      
      if (!sheet) return;
      
      let allMembers = [];
      if (sheet.jumuiaId) {
        allMembers = await prisma.user.findMany({
          where: { jumuiaId: sheet.jumuiaId }
        });
      } else {
        allMembers = await prisma.user.findMany();
      }
      
      const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));
      const presentMembers = allMembers.filter(m => presentUserIds.has(m.id));
      const absentMembers = allMembers.filter(m => !presentUserIds.has(m.id));
      
      const meetingSummary = `Meeting: ${sheet.title}\nDate: ${new Date(sheet.eventDate).toLocaleString()}\nTotal Expected: ${allMembers.length}\nPresent: ${presentMembers.length}\nAbsent: ${absentMembers.length}\nAttendance Rate: ${((presentMembers.length / allMembers.length) * 100).toFixed(1)}%`;
      
      // 1. Notify present members (thank you) - BATCHED
      const BATCH_SIZE = 20;
      for (let i = 0; i < presentMembers.length; i += BATCH_SIZE) {
        const batch = presentMembers.slice(i, i + BATCH_SIZE);
        Promise.allSettled(
          batch.map(member => 
            createAndSendNotification({
              userId: member.id,
              type: "attendance_thankyou",
              title: "🙏 Thank You for Attending!",
              message: `Thank you for attending "${sheet.title}". Your presence is appreciated! Tumsifu Yesu Kristu! 🙏`,
              data: { sheetId: sheet.id, title: sheet.title }
            }).catch(err => console.error(`Notif failed for ${member.id}:`, err.message))
          )
        );
      }
      
      // 2. Notify absent members with role-based messages - BATCHED + FIRE-AND-FORGET
      for (let i = 0; i < absentMembers.length; i += BATCH_SIZE) {
        const batch = absentMembers.slice(i, i + BATCH_SIZE);
        Promise.allSettled(
          batch.map(async (member) => {
            const tone = getMessageTone(member.role, member.specialRole);
            
            // Notification - fire and forget
            createAndSendNotification({
              userId: member.id,
              type: "attendance_missed",
              title: tone.missedTitle,
              message: tone.missedMessage,
              data: { 
                sheetId: sheet.id, 
                title: sheet.title,
                style: tone.style,
                actionRequired: tone.actionRequired
              }
            }).catch(err => console.error(`Missed notif failed for ${member.id}:`, err.message));
            
            // Send email - fire and forget (no await)
            if (member.email) {
              sendPersonalizedEmail(
                { email: member.email, fullName: member.fullName },
                "attendance_missed",
                `Notice of Absence: ${sheet.title}`,
                `Dear ${member.fullName},

This is to notify you that your attendance was not recorded for the following meeting:

Meeting: ${sheet.title}
Date: ${new Date(sheet.eventDate).toLocaleString()}
Location: ${sheet.location || "ZUCA"}

${tone.actionRequired ? 'Please contact the meeting organizer to discuss any outstanding matters.' : 'We encourage you to attend future meetings to stay informed about ZUCA activities.'}

For any questions, please contact ZUCA administration.

Zetech University Catholic Action (ZUCA)`,
                { sheetTitle: sheet.title, meetingDate: sheet.eventDate }
              ).catch(err => console.error(`Email failed for ${member.email}:`, err.message));
            }
          })
        );
      }
      
      // 3. Notify admin/creator with summary report
      if (sheet.creator) {
        createAndSendNotification({
          userId: sheet.creator.id,
          type: "attendance_summary",
          title: "📊 Attendance Summary Report",
          message: `${sheet.title}\nPresent: ${presentMembers.length}/${allMembers.length}\nAbsent: ${absentMembers.length}\nRate: ${((presentMembers.length / allMembers.length) * 100).toFixed(1)}%\n\nTap to view full report.`,
          data: { sheetId: sheet.id, summary: { present: presentMembers.length, absent: absentMembers.length, total: allMembers.length } }
        }).catch(err => console.error("Summary notif failed:", err.message));
        
        // Send email report - fire and forget
        if (sheet.creator.email) {
          const absentList = absentMembers.map(m => `• ${m.fullName}${m.specialRole ? ` (${m.specialRole})` : ''}`).join('\n');
          const presentList = presentMembers.map(m => `• ${m.fullName}${m.specialRole ? ` (${m.specialRole})` : ''}`).join('\n');
          
          sendPersonalizedEmail(
            { email: sheet.creator.email, fullName: sheet.creator.fullName },
            "attendance_admin_report",
            `Attendance Report: ${sheet.title}`,
            `Dear ${sheet.creator.fullName},

Here is the official attendance report for "${sheet.title}":

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEETING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${meetingSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESENT (${presentMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${presentList || "None"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSENT (${absentMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${absentList || "None"}

This report is automatically generated by ZUCA attendance system.

Zetech University Catholic Action (ZUCA)`,
            { sheetTitle: sheet.title, presentCount: presentMembers.length, absentCount: absentMembers.length, presentList, absentList }
          ).catch(err => console.error("Admin email failed:", err.message));
        }
      }
      
      console.log(`✅ Sent notifications for sheet ${sheet.id} (background)`);
    } catch (err) {
      console.error("Failed to send sheet closed notifications:", err.message);
    }
  })();
};

// Send reminder to specific user
const sendReminderToUser = async (userId, sheetId, customMessage = null) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!user || !sheet) return;
    
    const tone = getMessageTone(user.role, user.specialRole);
    const message = customMessage || tone.missedMessage;
    
    await createAndSendNotification({
      userId: user.id,
      type: "attendance_reminder",
      title: `📢 Reminder: ${sheet.title}`,
      message: message,
      data: { sheetId: sheet.id, title: sheet.title }
    });
    
    if (user.email) {
      await sendPersonalizedEmail(
  { email: user.email, fullName: user.fullName },
  "attendance_reminder",
  `Meeting Reminder: ${sheet.title}`,
  `Dear ${user.fullName},

${message}

Meeting Details:
- Title: ${sheet.title}
- Date: ${new Date(sheet.eventDate).toLocaleString()}
- Location: ${sheet.location || "ZUCA"}

Your attendance is appreciated.

Zetech University Catholic Action (ZUCA)`,
  { sheetTitle: sheet.title }
);
    }
    
    return true;
  } catch (err) {
    console.error("Failed to send reminder:", err.message);
    return false;
  }
};

// ==================== CONTROLLER FUNCTIONS ====================

// Create new attendance sheet (OPTIMIZED - Fast response)
const createAttendanceSheet = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      eventDate, 
      eventTime, 
      location,
      allowSelfCheckin,
      enableWifiCheckin,
      wifiSSID,
      jumuiaId
    } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ error: "Title and event date are required" });
    }

  // Handle executive-team as a special value
let targetJumuiaId = jumuiaId;
if (jumuiaId === 'executive-team') {
  targetJumuiaId = null;  
}

  const sheet = await prisma.attendanceSheet.create({
  data: {
    title,
    description,
    eventDate: new Date(eventDate),
    eventTime,
    location,
    allowSelfCheckin: allowSelfCheckin || false,
    enableWifiCheckin: enableWifiCheckin || false,
    wifiSSID: enableWifiCheckin ? wifiSSID : null,
    jumuiaId: targetJumuiaId,
    createdBy: req.user.userId,
    isActive: true
  }
});

    // ✅ SEND RESPONSE IMMEDIATELY - User doesn't wait
    res.status(201).json({ success: true, sheet });
    
    // ✅ SEND NOTIFICATIONS IN BACKGROUND (don't await)
    (async () => {
      try {
        let targetUsers = [];
        
if (sheet.jumuiaId === null) {
  // Executive meeting - notify all active executives
  const executives = await prisma.executive.findMany({
    where: { isActive: true },
    select: { userId: true }
  });
  targetUsers = executives.map(exec => ({ id: exec.userId }));
} else if (sheet.jumuiaId) {
  targetUsers = await prisma.user.findMany({
    where: { jumuiaId: sheet.jumuiaId },
    select: { id: true }
  });
} else {
  targetUsers = await prisma.user.findMany({
    select: { id: true }
  });
}
        
        const meetingDate = new Date(sheet.eventDate).toLocaleDateString();
        const meetingTime = sheet.eventTime || "TBD";
        
        // Send in batches
        const batchSize = 50;
        for (let i = 0; i < targetUsers.length; i += batchSize) {
          const batch = targetUsers.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map(user => 
              createAndSendNotification({
                userId: user.id,
                type: "attendance_sheet_opened",
                title: `📋 Attendance Open: ${sheet.title}`,
                message: `A new attendance sheet has been opened for "${sheet.title}" on ${meetingDate} at ${meetingTime} at ${sheet.location || "ZUCA"}. Please check in when you arrive.`,
                data: { sheetId: sheet.id, title: sheet.title, eventDate: sheet.eventDate }
              })
            )
          );
        }
        
        console.log(`✅ Sent ${targetUsers.length} notifications for sheet opening: ${sheet.title}`);
      } catch (err) {
        console.error("Failed to send sheet notifications:", err.message);
      }
    })();
    
  } catch (err) {
    console.error("Create attendance sheet error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Get active sheets (for members)
const getActiveSheets = async (req, res) => {
  try {
    const sheets = await prisma.attendanceSheet.findMany({
      where: {
        isActive: true,
        eventDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      include: {
        _count: {
          select: { entries: true }
        }
      },
      orderBy: { eventDate: "asc" }
    });

    // Filter to ensure we only return sheets that are truly active
    // Also filter out sheets where eventDate is in the past (more than 1 day ago)
    const now = new Date();
    const activeSheetsOnly = sheets.filter(sheet => {
      // Check if sheet is active AND not too old
      const eventDate = new Date(sheet.eventDate);
      const daysSinceEvent = (now - eventDate) / (1000 * 60 * 60 * 24);
      return sheet.isActive === true && daysSinceEvent <= 7; // Only show sheets from last 7 days
    });

    console.log(`📋 Found ${activeSheetsOnly.length} active sheets out of ${sheets.length} total`);
    
    res.json({ success: true, sheets: activeSheetsOnly });
  } catch (err) {
    console.error("Get active sheets error:", err);
    res.status(500).json({ error: err.message });
  }
};

/// Get single sheet with entries (including absent members)
const getSheetById = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        entries: {
          orderBy: { signTime: "asc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                role: true,
                specialRole: true,
                membership_number: true,
                homeJumuia: { select: { name: true } }
              }
            }
          }
        },
        creator: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }

    // ============ GET EXECUTIVE POSITIONS FOR PRESENT MEMBERS ============
    const presentUserIdsArray = sheet.entries.map(e => e.userId).filter(id => id);
    
    const presentExecutives = await prisma.executive.findMany({
      where: { 
        userId: { in: presentUserIdsArray },
        isActive: true 
      },
      include: {
        position: {
          select: { title: true, category: true, level: true }
        }
      }
    });
    
    const presentExecutiveMap = new Map();
    presentExecutives.forEach(exec => {
      presentExecutiveMap.set(exec.userId, {
        executivePosition: exec.position?.title || null,
        executiveCategory: exec.position?.category || null
      });
    });
    
    const entriesWithExecutive = sheet.entries.map(entry => ({
      ...entry,
      executivePosition: presentExecutiveMap.get(entry.userId)?.executivePosition || null,
      executiveCategory: presentExecutiveMap.get(entry.userId)?.executiveCategory || null
    }));
    
    // ============ GET ALL TARGET MEMBERS BASED ON SHEET TYPE ============
    let allTargetMembers = [];
    
    if (sheet.jumuiaId === null) {
      const executives = await prisma.executive.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              membership_number: true,
              homeJumuia: { select: { name: true } }
            }
          },
          position: {
            select: {
              title: true,
              category: true,
              level: true
            }
          }
        }
      });
      
      allTargetMembers = executives.map(exec => ({
        ...exec.user,
        executivePosition: exec.position?.title || null,
        executiveCategory: exec.position?.category || null
      }));
      
      console.log(`📊 Executive team sheet: Found ${allTargetMembers.length} executives`);
    } 
    else if (sheet.jumuiaId) {
      const users = await prisma.user.findMany({
        where: { jumuiaId: sheet.jumuiaId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          membership_number: true,
          homeJumuia: { select: { name: true } }
        }
      });
      
      const executives = await prisma.executive.findMany({
        where: { isActive: true },
        include: {
          position: {
            select: {
              title: true,
              category: true,
              level: true
            }
          }
        }
      });
      
      const executiveMap = new Map();
      executives.forEach(exec => {
        executiveMap.set(exec.userId, {
          executivePosition: exec.position?.title || null,
          executiveCategory: exec.position?.category || null
        });
      });
      
      allTargetMembers = users.map(user => ({
        ...user,
        executivePosition: executiveMap.get(user.id)?.executivePosition || null,
        executiveCategory: executiveMap.get(user.id)?.executiveCategory || null
      }));
    } 
    else {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          membership_number: true,
          homeJumuia: { select: { name: true } }
        }
      });
      
      const executives = await prisma.executive.findMany({
        where: { isActive: true },
        include: {
          position: {
            select: {
              title: true,
              category: true,
              level: true
            }
          }
        }
      });
      
      const executiveMap = new Map();
      executives.forEach(exec => {
        executiveMap.set(exec.userId, {
          executivePosition: exec.position?.title || null,
          executiveCategory: exec.position?.category || null
        });
      });
      
      allTargetMembers = users.map(user => ({
        ...user,
        executivePosition: executiveMap.get(user.id)?.executivePosition || null,
        executiveCategory: executiveMap.get(user.id)?.executiveCategory || null
      }));
    }
    
    // Create a Set from the array of present user IDs
    const presentUserIdsSet = new Set(presentUserIdsArray);
    
    // Calculate absent members (target members who haven't checked in)
    const absentMembers = allTargetMembers.filter(member => !presentUserIdsSet.has(member.id));

    // Add totalMembers count to response
    const totalMembers = allTargetMembers.length;

    res.json({ 
      success: true, 
      sheet: {
        ...sheet,
        entries: entriesWithExecutive,
        totalMembers,
        absentMembers
      }
    });
  } catch (err) {
    console.error("Get sheet error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Self check-in (user adds themselves)
const selfCheckin = async (req, res) => {
  try {
    const { sheetId, deviceId, deviceName } = req.body;
    const userId = req.user.userId;

    if (!sheetId) {
      return res.status(400).json({ error: "Sheet ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId, isActive: true }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found or closed" });
    }

    if (!sheet.allowSelfCheckin) {
      return res.status(403).json({ error: "Self check-in is not enabled for this meeting" });
    }

    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: {
        sheetId: sheetId,
        userId: userId
      }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        error: "ALREADY_CHECKED_IN",
        message: "You have already checked in for this meeting",
        checkInTime: existingEntry.signTime,
        method: existingEntry.signMethod
      });
    }

    if (deviceId) {
      const deviceEntry = await prisma.attendanceEntry.findFirst({
        where: {
          sheetId: sheetId,
          deviceId: deviceId
        }
      });

      if (deviceEntry) {
        return res.status(400).json({
          error: "DEVICE_ALREADY_USED",
          message: "This device has already been used to check someone in"
        });
      }
    }

    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId,
        userId,
        deviceId,
        deviceName: deviceName || null,
        fullName: user.fullName,
        phoneNumber: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaId: user.jumuiaId,
        signMethod: "SELF",
        signTime: new Date()
      }
    });

    // Send check-in confirmation
    await sendCheckinConfirmation(userId, sheet.title, entry);

    res.json({ success: true, entry });
  } catch (err) {
    console.error("Self check-in error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Wi-Fi auto check-in
const wifiCheckin = async (req, res) => {
  try {
    const { sheetId, deviceId, deviceName, ssid, bssid } = req.body;
    const userId = req.user.userId;

    if (!sheetId || !ssid) {
      return res.status(400).json({ error: "Sheet ID and SSID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId, isActive: true }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found or closed" });
    }

    if (!sheet.enableWifiCheckin) {
      return res.status(403).json({ error: "Wi-Fi check-in is not enabled for this meeting" });
    }

    if (sheet.wifiSSID !== ssid) {
      return res.status(403).json({ error: "Invalid Wi-Fi network for this meeting" });
    }

    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: {
        sheetId: sheetId,
        userId: userId
      }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        error: "ALREADY_CHECKED_IN",
        message: "You have already checked in for this meeting"
      });
    }

    if (deviceId) {
      const deviceEntry = await prisma.attendanceEntry.findFirst({
        where: {
          sheetId: sheetId,
          deviceId: deviceId
        }
      });

      if (deviceEntry) {
        return res.status(400).json({
          error: "DEVICE_ALREADY_USED",
          message: "This device has already been used to check someone in"
        });
      }
    }

    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId,
        userId,
        deviceId,
        deviceName: deviceName || null,
        fullName: user.fullName,
        phoneNumber: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaId: user.jumuiaId,
        signMethod: "WIFI_AUTO",
        signTime: new Date(),
        connectedSSID: ssid,
        connectedBSSID: bssid
      }
    });

    await sendCheckinConfirmation(userId, sheet.title, entry);

    res.json({ success: true, entry });
  } catch (err) {
    console.error("Wi-Fi check-in error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Admin add entry (can add anyone)
const adminAddEntry = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { 
      fullName, 
      phoneNumber, 
      role, 
      specialRole,
      membershipNumber, 
      jumuiaId,
      jumuiaName,
      notes 
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required" });
    }

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }

    let user = null;
    if (phoneNumber) {
      user = await prisma.user.findFirst({
        where: { phone: phoneNumber }
      });
    }

    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId,
        userId: user?.id || null,
        fullName,
        phoneNumber,
        role: role || (user?.role || "Guest"),
        specialRole: specialRole || user?.specialRole || null,
        membershipNumber: membershipNumber || user?.membership_number || null,
        jumuiaId: jumuiaId || user?.jumuiaId || null,
        jumuiaName: jumuiaName || null,
        signMethod: "MANUAL",
        verifiedBy: req.user.userId,
        notes
      }
    });

    // Send notification to the person being added (if they have an account)
    if (user?.id) {
      await sendCheckinConfirmation(user.id, sheet.title, entry);
    }

    res.status(201).json({ success: true, entry });
  } catch (err) {
    console.error("Admin add entry error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update entry (admin/leader)
const updateEntry = async (req, res) => {
  try {
    const { sheetId, entryId } = req.params;
    const { fullName, phoneNumber, role, notes } = req.body;

    const entry = await prisma.attendanceEntry.findFirst({
      where: { id: entryId, sheetId }
    });

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const updated = await prisma.attendanceEntry.update({
      where: { id: entryId },
      data: {
        fullName: fullName || entry.fullName,
        phoneNumber: phoneNumber || entry.phoneNumber,
        role: role || entry.role,
        notes: notes !== undefined ? notes : entry.notes
      }
    });

    res.json({ success: true, entry: updated });
  } catch (err) {
    console.error("Update entry error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete entry (admin only)
const deleteEntry = async (req, res) => {
  try {
    const { sheetId, entryId } = req.params;

    const entry = await prisma.attendanceEntry.findFirst({
      where: { id: entryId, sheetId }
    });

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await prisma.attendanceEntry.delete({ where: { id: entryId } });

    res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    console.error("Delete entry error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Close sheet (stop accepting check-ins)
const closeSheet = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: { isActive: false, closedAt: new Date() }
    });

    // Send notifications to all members
    await sendSheetClosedNotification(sheetId);

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("attendance_sheet_closed", { sheetId });
    }

    res.json({ success: true, sheet: updated });
  } catch (err) {
    console.error("Close sheet error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update sheet settings
const updateSheetSettings = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { allowSelfCheckin, enableWifiCheckin, wifiSSID } = req.body;

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: {
        allowSelfCheckin,
        enableWifiCheckin,
        wifiSSID: enableWifiCheckin ? wifiSSID : null
      }
    });

    res.json({ success: true, sheet: updated });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get user's attendance history
const getUserAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const history = await prisma.attendanceEntry.findMany({
      where: { userId },
      include: {
        sheet: {
          select: {
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        }
      },
      orderBy: { signTime: "desc" },
      take: 50
    });

    const total = history.length;
    const present = history.length;
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    res.json({ 
      success: true, 
      history,
      stats: {
        total,
        present,
        attendanceRate: attendanceRate.toFixed(1)
      }
    });
  } catch (err) {
    console.error("Get user history error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete entire attendance sheet (admin only)
router.delete("/sheet/:sheetId", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    // First delete all entries
    await prisma.attendanceEntry.deleteMany({
      where: { sheetId: sheetId }
    });
    
    // Then delete the sheet
    await prisma.attendanceSheet.delete({
      where: { id: sheetId }
    });
    
    res.json({ success: true, message: "Sheet deleted successfully" });
  } catch (err) {
    console.error("Delete sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reopen a closed sheet (admin only)
router.post("/sheet/:sheetId/reopen", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: { 
        isActive: true,
        closedAt: null,
        eventDate: new Date() // Update to current date when reopening
      }
    });

    res.json({ success: true, sheet: updated });
  } catch (err) {
    console.error("Reopen sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get admin stats (all sheets)// Get admin stats (all sheets) - Allow admin and secretary
const getAdminStats = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = user.role === 'admin';
    const isSecretary = user.role === 'secretary' || user.specialRole === 'secretary';
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const sheets = await prisma.attendanceSheet.findMany({
      include: {
        _count: { select: { entries: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const totalSheets = await prisma.attendanceSheet.count();
    const totalEntries = await prisma.attendanceEntry.count();
    const activeSheets = await prisma.attendanceSheet.count({ where: { isActive: true } });

    res.json({
      success: true,
      stats: {
        totalSheets,
        totalEntries,
        activeSheets
      },
      sheets
    });
  } catch (err) {
    console.error("Get admin stats error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Send reminder to specific user (leader/admin only)
const sendReminder = async (req, res) => {
  try {
    const { sheetId, userId } = req.params;
    const { customMessage } = req.body;
    
    const success = await sendReminderToUser(userId, sheetId, customMessage);
    
    if (success) {
      res.json({ success: true, message: "Reminder sent successfully" });
    } else {
      res.status(404).json({ error: "Failed to send reminder" });
    }
  } catch (err) {
    console.error("Send reminder error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Send bulk reminders to all absent members - FIRE AND FORGET
const sendBulkReminders = async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: { entries: true }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    let allMembers = [];
    if (sheet.jumuiaId) {
      allMembers = await prisma.user.findMany({
        where: { jumuiaId: sheet.jumuiaId }
      });
    } else {
      allMembers = await prisma.user.findMany();
    }
    
    const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));
    const absentMembers = allMembers.filter(m => !presentUserIds.has(m.id));
    
    // Send response immediately
    res.json({ success: true, message: `Sending reminders to ${absentMembers.length} members in background` });
    
    // Process reminders in background (fire and forget)
    (async () => {
      let sentCount = 0;
      const BATCH_SIZE = 10;
      
      for (let i = 0; i < absentMembers.length; i += BATCH_SIZE) {
        const batch = absentMembers.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(member => sendReminderToUser(member.id, sheetId))
        );
        sentCount += batch.length;
        console.log(`📧 Sent ${sentCount}/${absentMembers.length} reminders`);
      }
      
      console.log(`✅ Bulk reminders completed: ${sentCount} sent`);
    })();
    
  } catch (err) {
    console.error("Bulk reminder error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};


// ==================== AUTOMATIC NOTIFICATION SYSTEM ====================

// Send automatic reminders to users who haven't checked in (called by cron job)
const sendAutomaticAbsentReminders = async () => {
  try {
    console.log("🕐 Running automatic attendance reminder check...");
    
    // Get all active attendance sheets that started within the last 5 hours
    const fiveHoursAgo = new Date();
    fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
    
    const activeSheets = await prisma.attendanceSheet.findMany({
      where: {
        isActive: true,
        eventDate: {
          gte: fiveHoursAgo
        }
      },
      include: {
        entries: true,
        creator: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });
    
    console.log(`📋 Found ${activeSheets.length} active sheets from last 5 hours`);
    
    for (const sheet of activeSheets) {
      // Get all target members for this sheet
      let targetMembers = [];
      if (sheet.jumuiaId) {
        targetMembers = await prisma.user.findMany({
          where: { jumuiaId: sheet.jumuiaId }
        });
      } else {
        targetMembers = await prisma.user.findMany();
      }
      
      const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));
      const absentMembers = targetMembers.filter(m => !presentUserIds.has(m.id));
      
      if (absentMembers.length === 0) continue;
      
      console.log(`📧 Sending reminders for "${sheet.title}" to ${absentMembers.length} absent members`);
      
      for (const member of absentMembers) {
        const tone = getMessageTone(member.role, member.specialRole);
        const hoursSinceEvent = Math.floor((new Date() - new Date(sheet.eventDate)) / (1000 * 60 * 60));
        
        // Different message based on how long ago the event was
        let reminderMessage = "";
        if (hoursSinceEvent < 1) {
          reminderMessage = `The meeting "${sheet.title}" is happening NOW at ${sheet.location || "ZUCA"}. Please check in!`;
        } else if (hoursSinceEvent < 5) {
          reminderMessage = `You missed "${sheet.title}" which happened ${hoursSinceEvent} hour(s) ago. Please contact the organizer for important updates.`;
        } else {
          reminderMessage = tone.missedMessage;
        }
        
        await createAndSendNotification({
          userId: member.id,
          type: "attendance_automatic_reminder",
          title: `📢 ${hoursSinceEvent < 1 ? "Meeting in Progress" : "You Missed the Meeting"}`,
          message: reminderMessage,
          data: { sheetId: sheet.id, title: sheet.title, hoursSinceEvent }
        });
        
        // Send email for important roles
        if (member.specialRole || member.role === "admin") {
        await sendPersonalizedEmail(
  { email: member.email, fullName: member.fullName },
  "attendance_automatic_reminder",
  `Notice of Missed Meeting: ${sheet.title}`,
  `Dear ${member.fullName},

${reminderMessage}

Meeting Information:
- Title: ${sheet.title}
- Date: ${new Date(sheet.eventDate).toLocaleString()}
- Location: ${sheet.location || "ZUCA"}

${tone.actionRequired ? "Please contact the meeting organizer for important updates." : "Please make note of future meeting schedules."}

Zetech University Catholic Action (ZUCA)`,
  { sheetTitle: sheet.title, eventDate: sheet.eventDate }
);
        }
      }
    }
    
    console.log("✅ Automatic attendance reminders completed");
  } catch (err) {
    console.error("Automatic reminder error:", err.message);
  }
};

// Endpoint to manually trigger automatic reminders (for testing)
router.post("/trigger-automatic-reminders", authenticate, requireAdmin, async (req, res) => {
  try {
    await sendAutomaticAbsentReminders();
    res.json({ success: true, message: "Automatic reminders triggered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sheets (both active and closed) for admin and secretary
router.get("/all-sheets", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = user.role === 'admin';
    const isSecretary = user.role === 'secretary' || user.specialRole === 'secretary';
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const sheets = await prisma.attendanceSheet.findMany({
      include: {
        _count: {
          select: { entries: true }
        }
      },
      orderBy: { eventDate: "desc" }
    });

    res.json({ success: true, sheets });
  } catch (err) {
    console.error("Get all sheets error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ROUTES ====================

// User routes
router.get("/active", authenticate, getActiveSheets);
router.post("/self-checkin", authenticate, selfCheckin);
router.post("/wifi-checkin", authenticate, wifiCheckin);
router.get("/my-history", authenticate, getUserAttendanceHistory);

// Leader/Admin routes
router.post("/sheet", authenticate, requireLeaderOrAdmin, createAttendanceSheet);
router.get("/sheet/:sheetId", authenticate, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const userId = req.user.userId;
    
    // Get user info to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = currentUser.role === 'admin';
    const isSecretary = currentUser.role === 'secretary' || currentUser.specialRole === 'secretary';
    
    // Allow admin or secretary to view any sheet
    if (isAdmin || isSecretary) {
      // Call the existing getSheetById function
      return getSheetById(req, res);
    }
    
    // For regular members, check if they are part of the sheet's target audience
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      select: { jumuiaId: true }
    });
    
    if (sheet?.jumuiaId) {
      const userJumuia = await prisma.user.findUnique({
        where: { id: userId },
        select: { jumuiaId: true }
      });
      
      if (userJumuia?.jumuiaId !== sheet.jumuiaId) {
        return res.status(403).json({ error: "Access denied" });
      }
      return getSheetById(req, res);
    }
    
    return res.status(403).json({ error: "Access denied" });
    
  } catch (err) {
    console.error("Get sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});
router.post("/sheet/:sheetId/entry", authenticate, async (req, res, next) => {
  // Check if user is admin, secretary, or leader
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { role: true, specialRole: true }
  });
  
  const isAdmin = user.role === "admin";
  const isSecretary = user.role === "secretary" || user.specialRole === "secretary";
  const isLeader = user.specialRole === "jumuia_leader";
  
  if (isAdmin || isSecretary || isLeader) {
    return next();
  }
  
  return res.status(403).json({ error: "Not authorized" });
}, adminAddEntry);
router.put("/sheet/:sheetId/entry/:entryId", authenticate, requireLeaderOrAdmin, updateEntry);
router.delete("/sheet/:sheetId/entry/:entryId", authenticate, requireLeaderOrAdmin, deleteEntry);
router.put("/sheet/:sheetId/settings", authenticate, requireLeaderOrAdmin, updateSheetSettings);
router.post("/sheet/:sheetId/close", authenticate, requireLeaderOrAdmin, closeSheet);

// Reminder routes
router.post("/sheet/:sheetId/remind/:userId", authenticate, requireLeaderOrAdmin, sendReminder);
router.post("/sheet/:sheetId/remind-all", authenticate, requireLeaderOrAdmin, sendBulkReminders);

// Admin only routes
router.get("/admin/stats", authenticate, getAdminStats);

// ==================== ATTENDANCE LINK ROUTES ====================

// Generate shareable link for a sheet
router.post("/sheet/:sheetId/generate-link", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { expiresInDays = 7, maxUses = null } = req.body;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    if (!sheet.isActive) {
      return res.status(400).json({ error: "Sheet is closed. Reopen it first." });
    }
    
const token = crypto.randomBytes(4).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiresInDays);
    
    const attendanceLink = await prisma.attendanceLink.create({
      data: {
        token: token,
        sheetId: sheetId,
        expiresAt: expiryDate,
        maxUses: maxUses ? parseInt(maxUses) : null,
        createdBy: req.user.userId
      }
    });
    
   const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
const shareableLink = `${baseUrl}/attendance/link/${token}`;
    
    res.json({
      success: true,
      link: shareableLink,
      token: token,
      expiresAt: expiryDate
    });
    
  } catch (err) {
    console.error("Generate link error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get link info (when user clicks the link)
router.get("/link/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const attendanceLink = await prisma.attendanceLink.findUnique({
      where: { token: token },
      include: { sheet: true }
    });
    
    if (!attendanceLink) {
      return res.status(404).json({ error: "Invalid link" });
    }
    
    if (attendanceLink.expiresAt < new Date()) {
      return res.status(400).json({ error: "Link has expired" });
    }
    
    if (!attendanceLink.sheet.isActive) {
      return res.status(400).json({ error: "Meeting has been closed" });
    }
    
    res.json({
      success: true,
      sheetId: attendanceLink.sheetId,
      sheet: {
        id: attendanceLink.sheet.id,
        title: attendanceLink.sheet.title,
        eventDate: attendanceLink.sheet.eventDate,
        eventTime: attendanceLink.sheet.eventTime,
        location: attendanceLink.sheet.location
      }
    });
    
  } catch (err) {
    console.error("Get link error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all links for a sheet
router.get("/sheet/:sheetId/links", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const links = await prisma.attendanceLink.findMany({
      where: { sheetId: sheetId },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    res.json({ success: true, links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a link
router.delete("/link/:linkId", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { linkId } = req.params;
    
    await prisma.attendanceLink.delete({
      where: { id: linkId }
    });
    
    res.json({ success: true, message: "Link deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== GET ALL ENTRIES (ADMIN ONLY) ====================
// Add this after getAdminStats and before module.exports

// Get all entries across all sheets (for admin All Entries tab)
router.get("/all-entries", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { limit = 200, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const entries = await prisma.attendanceEntry.findMany({
      skip: skip,
      take: parseInt(limit),
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            specialRole: true,
            membership_number: true,
            homeJumuia: {
              select: { name: true }
            }
          }
        },
        verifier: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: { signTime: "desc" }
    });
    
    const total = await prisma.attendanceEntry.count();
    
    res.json({
      success: true,
      entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Get all entries error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Add this to your attendance routes file (before module.exports)

// Get ALL meetings/sheets for a member (their attendance history + all meetings)
router.get("/member/all-meetings", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get ALL attendance sheets (both active and closed)
    const allSheets = await prisma.attendanceSheet.findMany({
      orderBy: { eventDate: "desc" },
      include: {
        entries: {
          where: { userId: userId },
          select: {
            id: true,
            signTime: true,
            signMethod: true,
            userId: true
          }
        },
        _count: {
          select: { entries: true }
        }
      }
    });
    
    // Get user's attendance history
    const userEntries = await prisma.attendanceEntry.findMany({
      where: { userId: userId },
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        }
      },
      orderBy: { signTime: "desc" }
    });
    
    // Calculate stats
    const totalMeetings = allSheets.length;
    const attendedMeetings = userEntries.length;
    const attendanceRate = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;
    
    // Get upcoming meetings
    const upcomingMeetings = allSheets.filter(sheet => 
      new Date(sheet.eventDate) > new Date() && sheet.isActive
    ).length;
    
    // Get missed meetings (sheets where user didn't check in)
    const attendedSheetIds = new Set(userEntries.map(e => e.sheetId));
    const missedMeetings = allSheets.filter(sheet => !attendedSheetIds.has(sheet.id));
    
    res.json({
      success: true,
      allMeetings: allSheets.map(sheet => ({
        id: sheet.id,
        title: sheet.title,
        eventDate: sheet.eventDate,
        eventTime: sheet.eventTime,
        location: sheet.location,
        isActive: sheet.isActive,
        totalAttendees: sheet._count.entries,
        userAttended: sheet.entries.length > 0,
        userSignTime: sheet.entries[0]?.signTime || null,
        userSignMethod: sheet.entries[0]?.signMethod || null
      })),
      userHistory: userEntries,
      stats: {
        totalMeetings,
        attendedMeetings,
        missedMeetings: missedMeetings.length,
        attendanceRate: attendanceRate.toFixed(1),
        upcomingMeetings
      }
    });
    
  } catch (err) {
    console.error("Get member meetings error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;