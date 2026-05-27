const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin, requireLeaderOrAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require('crypto');

const { sendPersonalizedEmail } = require("../services/mailer");

// ==================== NOTIFICATION FUNCTION (DEFINED DIRECTLY) ====================
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date(),
        data: data
      }
    });
    console.log(`✅ Notification created: ${title} for user ${userId}`);
    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
}

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
    
    // Check if sheet is active or reopened
    if (!sheet.isActive) {
      return res.status(400).json({ error: "Sheet is closed. Reopen it to generate QR code." });
    }
    
    // Find or create QR token
    let qrToken = await prisma.qRCodeToken.findFirst({
      where: { 
        sheetId: sheetId,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!qrToken) {
  const qrTokenValue = crypto.randomBytes(32).toString('hex');
  // Set expiry to 30 days from now
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
  console.log("✅ Created new QR token, expires:", expiryDate);
}
    
    // Create QR data payload
    const qrData = JSON.stringify({
      type: 'attendance_checkin',
      token: qrToken.token,
      sheetId: sheetId,
      meeting: sheet.title,
      venue: sheet.location || 'ZUCA',
      date: sheet.eventDate
    });
    
    // Generate QR code as base64
    const QRCode = require('qrcode');
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    
    res.json({ 
      success: true, 
      qrCodeUrl,
      qrData,
      token: qrToken.token,
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

// QR Code check-in endpoint
router.post("/qr-checkin", authenticate, async (req, res) => {
  try {
    const { token, deviceId, deviceName } = req.body;
    const userId = req.user.userId;
    
    console.log("🔍 Scanning QR - Token received:", token);
    
    // Find the token
    const qrToken = await prisma.qRCodeToken.findFirst({
      where: { token: token },
      include: { sheet: true }
    });
    
    if (!qrToken) {
      return res.status(400).json({ error: "Invalid QR code" });
    }
    
    // Check if expired
    if (qrToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "QR code has expired" });
    }
    
    // Check if sheet is active
    if (!qrToken.sheet.isActive) {
      return res.status(400).json({ error: "This meeting has been closed" });
    }
    
    // Check if user already checked in
    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: { 
        sheetId: qrToken.sheetId, 
        userId: userId 
      }
    });
    
    if (existingEntry) {
      return res.status(400).json({ 
        error: "Already checked in",
        message: `You already checked in for this meeting`
      });
    }
    
    // ✅ FIX: Get user data FIRST
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check device (prevent multiple check-ins from same device)
    if (deviceId) {
      const deviceEntry = await prisma.attendanceEntry.findFirst({
        where: {
          sheetId: qrToken.sheetId,
          deviceId: deviceId
        }
      });

      if (deviceEntry) {
        return res.status(400).json({
          error: "DEVICE_ALREADY_USED",
          message: "This device has already been used to check someone into this meeting"
        });
      }
    }
    
    // Create check-in entry
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
      }
    });
    
    console.log("✅ QR Check-in successful for:", user.fullName);
    
    res.json({ success: true, entry });
  } catch (err) {
    console.error("QR check-in error:", err);
    res.status(500).json({ error: err.message });
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
  // Executive positions (highest priority)
  if (specialRole === 'chairperson') {
    return {
      missedTitle: "👑 EXECUTIVE ALERT: Meeting Missed",
      missedMessage: "Your presence is required at leadership meetings. Please prioritize ZUCA executive duties. Contact the chairperson immediately.",
      style: "urgent",
      actionRequired: true
    };
  }
  
  if (specialRole === 'secretary') {
    return {
      missedTitle: "📋 SECRETARY ALERT: Meeting Attendance Required",
      missedMessage: "You missed today's meeting. As secretary, your attendance is crucial for record-keeping. Please review the minutes.",
      style: "important",
      actionRequired: true
    };
  }
  
  if (specialRole === 'treasurer') {
    return {
      missedTitle: "FINANCIAL OFFICER: Meeting Missed",
      missedMessage: "You were absent from today's meeting. Financial decisions were discussed. Please contact the chairperson for an update.",
      style: "important",
      actionRequired: true
    };
  }
  
  if (specialRole === 'jumuia_leader') {
    return {
      missedTitle: "⚠️ JUMUIA LEADER: Action Required",
      missedMessage: "You missed today's   meeting. Important decisions were made . Please check with the admin.",
      style: "urgent",
      actionRequired: true
    };
  }
  
  if (specialRole === 'choir_moderator') {
    return {
      missedTitle: "🎵 CHOIR LEADER:You missed todays meeting",
      missedMessage: "You missed today's meeting. please make effort to attend zucas meeting..",
      style: "direct",
      actionRequired: false
    };
  }
  
  if (specialRole === 'media_moderator') {
    return {
      missedTitle: "You missed todays zuca meeting!",
      missedMessage: "You missed today's meeting. Please check the group chat for updates on upcoming events and please meke affort to be attendig meetings.",
      style: "informative",
      actionRequired: false
    };
  }
  
  // Regular member
  return {
    missedTitle: "You Missed Today's Meeting",
    missedMessage: "We missed you at today's gathering. We hope to see you at the next meeting! please make effort in attending zuca meetings as much as possible Thankyou!",
    style: "gentle",
    actionRequired: false
  };
}

// Send check-in confirmation to member
const sendCheckinConfirmation = async (userId, sheetTitle, entry) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return;
    
    // In-app notification
    await createAndSendNotification({
      userId: userId,
      type: "attendance_checkin",
      title: "✅ Check-in Successful!",
      message: `You have been checked in for "${sheetTitle}" at ${new Date(entry.signTime).toLocaleTimeString()}`,
      data: { sheetId: entry.sheetId, entryId: entry.id }
    });
    
    // Send email confirmation
    if (user.email) {
      await sendPersonalizedEmail(
        { email: user.email, fullName: user.fullName },
        "attendance_checkin",
        `✅ Check-in Confirmation: ${sheetTitle}`,
        `Dear ${user.fullName},\n\nYou have been successfully checked in for "${sheetTitle}".\n\nTime: ${new Date(entry.signTime).toLocaleString()}\nMethod: ${entry.signMethod}\n\nThank you for attending!\n\nTumsifu Yesu Kristu! 🙏`,
        { sheetTitle, signTime: entry.signTime, signMethod: entry.signMethod }
      );
    }
  } catch (err) {
    console.error("Failed to send check-in confirmation:", err.message);
  }
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

// Send notification for attendance sheet closed
const sendSheetClosedNotification = async (sheetId) => {
  try {
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        entries: {
          include: {
            user: true
          }
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
    
    // 1. Notify present members (thank you)
    for (const member of presentMembers) {
      await createAndSendNotification({
        userId: member.id,
        type: "attendance_thankyou",
        title: "🙏 Thank You for Attending!",
        message: `Thank you for attending "${sheet.title}". Your presence is appreciated! Tumsifu Yesu Kristu! 🙏`,
        data: { sheetId: sheet.id, title: sheet.title }
      });
    }
    
    // 2. Notify absent members with role-based messages
    for (const member of absentMembers) {
      const tone = getMessageTone(member.role, member.specialRole);
      
      await createAndSendNotification({
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
      });
      
      // Send email to absent members
      if (member.email) {
        const emailSubject = tone.actionRequired ? `⚠️ URGENT: ${tone.missedTitle}` : tone.missedTitle;
        
        await sendPersonalizedEmail(
          { email: member.email, fullName: member.fullName },
          "attendance_missed",
          emailSubject,
          `Dear ${member.fullName},\n\n${tone.missedMessage}\n\nMeeting: ${sheet.title}\nDate: ${new Date(sheet.eventDate).toLocaleString()}\n\n${tone.actionRequired ? 'Please make arrangements to attend future meetings.' : 'We hope to see you next time!'}\n\nTumsifu Yesu Kristu! 🙏`,
          { sheetTitle: sheet.title, meetingDate: sheet.eventDate }
        );
      }
    }
    
    // 3. Notify admin/creator with summary report
    if (sheet.creator) {
      await createAndSendNotification({
        userId: sheet.creator.id,
        type: "attendance_summary",
        title: "📊 Attendance Summary Report",
        message: `${sheet.title}\nPresent: ${presentMembers.length}/${allMembers.length}\nAbsent: ${absentMembers.length}\nRate: ${((presentMembers.length / allMembers.length) * 100).toFixed(1)}%\n\nTap to view full report.`,
        data: { sheetId: sheet.id, summary: { present: presentMembers.length, absent: absentMembers.length, total: allMembers.length } }
      });
      
      // Send email report to admin
      if (sheet.creator.email) {
        const absentList = absentMembers.map(m => `• ${m.fullName}${m.specialRole ? ` (${m.specialRole})` : ''}`).join('\n');
        const presentList = presentMembers.map(m => `• ${m.fullName}${m.specialRole ? ` (${m.specialRole})` : ''}`).join('\n');
        
        await sendPersonalizedEmail(
          { email: sheet.creator.email, fullName: sheet.creator.fullName },
          "attendance_admin_report",
          `📊 Attendance Report: ${sheet.title}`,
          `Dear ${sheet.creator.fullName},\n\nHere is the attendance summary for "${sheet.title}":\n\n${meetingSummary}\n\n✅ PRESENT (${presentMembers.length}):\n${presentList || "None"}\n\n❌ ABSENT (${absentMembers.length}):\n${absentList || "None"}\n\nThank you for your leadership!\n\nTumsifu Yesu Kristu! 🙏`,
          { sheetTitle: sheet.title, presentCount: presentMembers.length, absentCount: absentMembers.length, presentList, absentList }
        );
      }
    }
    
    console.log(`✅ Sent notifications for sheet ${sheet.id}: ${presentMembers.length} thank you, ${absentMembers.length} missed alerts`);
  } catch (err) {
    console.error("Failed to send sheet closed notifications:", err.message);
  }
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
        `📢 Meeting Reminder: ${sheet.title}`,
        `Dear ${user.fullName},\n\n${message}\n\nMeeting: ${sheet.title}\nDate: ${new Date(sheet.eventDate).toLocaleString()}\nLocation: ${sheet.location || "ZUCA"}\n\nWe look forward to seeing you!\n\nTumsifu Yesu Kristu! 🙏`,
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
      targetJumuiaId = 'executive-team';
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
        
        if (sheet.jumuiaId === 'executive-team') {
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

// Get single sheet with entries (including absent members)
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

    // ============ GET ALL TARGET MEMBERS BASED ON SHEET TYPE ============
    let allTargetMembers = [];
    
    // Check if this sheet is for executive team only
    if (sheet.jumuiaId === 'executive-team') {
      // Get all active executives from the executive table
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
              specialRole: true,
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
      
      // Extract just the user objects
      allTargetMembers = executives.map(exec => ({
        ...exec.user,
        executivePosition: exec.position?.title || null,
        executiveCategory: exec.position?.category || null
      }));
      
      console.log(`📊 Executive team sheet: Found ${allTargetMembers.length} executives`);
    } 
    // Check if sheet is for a specific Jumuia
    else if (sheet.jumuiaId) {
      allTargetMembers = await prisma.user.findMany({
        where: { jumuiaId: sheet.jumuiaId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          specialRole: true,
          membership_number: true,
          homeJumuia: { select: { name: true } }
        }
      });
    } 
    // All ZUCA members
    else {
      allTargetMembers = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          specialRole: true,
          membership_number: true,
          homeJumuia: { select: { name: true } }
        }
      });
    }

    // Get IDs of members who have checked in
    const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));

    // Calculate absent members (target members who haven't checked in)
    const absentMembers = allTargetMembers.filter(member => !presentUserIds.has(member.id));

    // Add totalMembers count to response
    const totalMembers = allTargetMembers.length;

    res.json({ 
      success: true, 
      sheet: {
        ...sheet,
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
router.delete("/sheet/:sheetId", authenticate, requireAdmin, async (req, res) => {
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
router.post("/sheet/:sheetId/reopen", authenticate, requireAdmin, async (req, res) => {
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

// Get admin stats (all sheets)
const getAdminStats = async (req, res) => {
  try {
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

// Send bulk reminders to all absent members
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
    
    let sentCount = 0;
    for (const member of absentMembers) {
      const success = await sendReminderToUser(member.id, sheetId);
      if (success) sentCount++;
    }
    
    res.json({ success: true, message: `Reminders sent to ${sentCount} members` });
  } catch (err) {
    console.error("Bulk reminder error:", err);
    res.status(500).json({ error: err.message });
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
            `⚠️ ${tone.missedTitle}`,
            `Dear ${member.fullName},\n\n${reminderMessage}\n\nMeeting: ${sheet.title}\nDate: ${new Date(sheet.eventDate).toLocaleString()}\nLocation: ${sheet.location || "ZUCA"}\n\n${tone.actionRequired ? "Please take immediate action." : "We hope to see you next time!"}\n\nTumsifu Yesu Kristu! 🙏`,
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

// Get all sheets (both active and closed) for admin
router.get("/all-sheets", authenticate, requireAdmin, async (req, res) => {
  try {
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
router.get("/sheet/:sheetId", authenticate, requireLeaderOrAdmin, getSheetById);
router.post("/sheet/:sheetId/entry", authenticate, requireLeaderOrAdmin, adminAddEntry);
router.put("/sheet/:sheetId/entry/:entryId", authenticate, requireLeaderOrAdmin, updateEntry);
router.delete("/sheet/:sheetId/entry/:entryId", authenticate, requireAdmin, deleteEntry);
router.put("/sheet/:sheetId/settings", authenticate, requireLeaderOrAdmin, updateSheetSettings);
router.post("/sheet/:sheetId/close", authenticate, requireLeaderOrAdmin, closeSheet);

// Reminder routes
router.post("/sheet/:sheetId/remind/:userId", authenticate, requireLeaderOrAdmin, sendReminder);
router.post("/sheet/:sheetId/remind-all", authenticate, requireLeaderOrAdmin, sendBulkReminders);

// Admin only routes
router.get("/admin/stats", authenticate, requireAdmin, getAdminStats);

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
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
router.get("/all-entries", authenticate, requireAdmin, async (req, res) => {
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

module.exports = router;