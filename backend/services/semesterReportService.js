// backend/services/semesterReportService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendSemesterReportEmail: sendSemesterReportEmailViaMailer } = require('./mailer');

/**
 * Generate semester report for a user
 * @param {string} userId - User ID
 * @param {object} semester - Semester schedule object
 * @param {Array} attendanceData - User's attendance data for the semester
 * @returns {object} - Report data
 */
async function generateUserSemesterReport(userId, semester, attendanceData) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        homeJumuia: { select: { name: true } },
        executiveAssignments: {
          where: { isActive: true },
          include: { 
            position: { 
              select: { 
                id: true,
                title: true,
                category: true,
                level: true
              } 
            } 
          }
        }
      }
    });

    if (!user) return null;

    // Calculate stats
    const totalMeetings = attendanceData.length;
    const attendedMeetings = attendanceData.filter(e => e.attended).length;
    const missedMeetings = totalMeetings - attendedMeetings;
    const attendanceRate = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;

    const execPosition = user.executiveAssignments && user.executiveAssignments.length > 0
      ? user.executiveAssignments[0].position?.title
      : null;

    // Get meeting details
    const meetings = attendanceData.map(entry => ({
      title: entry.sheet?.title || 'Unknown Meeting',
      date: entry.sheet?.eventDate || entry.signTime,
      status: entry.attended ? 'Attended' : 'Missed',
      signMethod: entry.signMethod || 'N/A'
    }));

    return {
      user: {
        fullName: user.fullName,
        email: user.email,
        membershipNumber: user.membership_number,
        jumuia: user.homeJumuia?.name || 'N/A',
        executivePosition: execPosition
      },
      semester: {
        title: semester.title,
        startDate: semester.startDate,
        endDate: semester.endDate,
        period: `${new Date(semester.startDate).toLocaleDateString()} - ${new Date(semester.endDate).toLocaleDateString()}`
      },
      stats: {
        totalMeetings,
        attendedMeetings,
        missedMeetings,
        attendanceRate: Math.round(attendanceRate),
        performance: attendanceRate >= 80 ? 'Excellent' :
                   attendanceRate >= 60 ? 'Good' :
                   attendanceRate >= 40 ? 'Fair' : 'Needs Improvement'
      },
      meetings,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return null;
  }
}

/**
 * Generate PDF report for a user
 * @param {object} reportData - Report data from generateUserSemesterReport
 * @param {string} outputPath - Path to save the PDF (optional)
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generatePDFReport(reportData, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#003366')
         .text('ZUCA ATTENDANCE REPORT', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#666666')
         .text(`Semester: ${reportData.semester.title}`, { align: 'center' });

      doc.fontSize(10)
         .fillColor('#888888')
         .text(`Period: ${reportData.semester.period}`, { align: 'center' });

      doc.moveDown(1.5);

      // User Info
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text('Member Information', { underline: true });

      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#475569');

      const userInfo = [
        ['Name:', reportData.user.fullName],
        ['Membership #:', reportData.user.membershipNumber || 'N/A'],
        ['Jumuia:', reportData.user.jumuia],
        ['Executive Position:', reportData.user.executivePosition || 'N/A']
      ];

      userInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`, { continued: false });
      });

      doc.moveDown(1.5);

      // Stats Summary
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text('Attendance Summary', { underline: true });

      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#475569');

      // Stats in a box
      const statsStartY = doc.y;
      const stats = [
        ['Total Meetings', reportData.stats.totalMeetings],
        ['Attended', reportData.stats.attendedMeetings],
        ['Missed', reportData.stats.missedMeetings],
        ['Attendance Rate', `${reportData.stats.attendanceRate}%`],
        ['Performance', reportData.stats.performance]
      ];

      // Draw stats box
      const boxWidth = 400;
      const boxHeight = stats.length * 25 + 20;
      doc.rect(50, statsStartY, boxWidth, boxHeight)
         .stroke('#e2e8f0');

      stats.forEach(([label, value], index) => {
        const y = statsStartY + 10 + (index * 25);
        doc.font('Helvetica-Bold')
           .fillColor('#64748b')
           .text(label, 60, y);
        doc.font('Helvetica')
           .fillColor('#1e293b')
           .text(String(value), 200, y);
      });

      doc.moveDown(6);

      // Color code performance
      const rate = reportData.stats.attendanceRate;
      let color = '#10b981';
      let emoji = '🌟';
      if (rate < 40) { color = '#ef4444'; emoji = '📉'; }
      else if (rate < 60) { color = '#f59e0b'; emoji = '📊'; }
      else if (rate < 80) { color = '#3b82f6'; emoji = '📈'; }

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(color)
         .text(`${emoji} ${reportData.stats.performance} Performance (${reportData.stats.attendanceRate}%)`, { align: 'center' });

      doc.moveDown(1.5);

      // Meetings List
      if (reportData.meetings.length > 0) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#1e293b')
           .text('Meeting Details', { underline: true });

        doc.moveDown(0.5);

        // Table headers
        const tableTop = doc.y;
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#ffffff');

        doc.rect(50, tableTop, 400, 20).fill('#003366');
        doc.text('Meeting', 55, tableTop + 5);
        doc.text('Date', 250, tableTop + 5);
        doc.text('Status', 350, tableTop + 5);

        let y = tableTop + 25;
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#1e293b');

        const displayMeetings = reportData.meetings.slice(0, 20);
        displayMeetings.forEach((meeting, index) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
          doc.rect(50, y - 2, 400, 16).fill(bgColor);
          doc.text(meeting.title.substring(0, 30), 55, y);
          doc.text(new Date(meeting.date).toLocaleDateString(), 250, y);

          const statusColor = meeting.status === 'Attended' ? '#10b981' : '#ef4444';
          doc.fillColor(statusColor)
             .text(meeting.status, 350, y);
          doc.fillColor('#1e293b');

          y += 18;
        });

        if (reportData.meetings.length > 20) {
          doc.fontSize(8)
             .fillColor('#94a3b8')
             .text(`... and ${reportData.meetings.length - 20} more meetings`, 55, y + 5);
        }
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#94a3b8')
         .text(`Report generated on ${new Date().toLocaleString()}`, 50, doc.y, { align: 'center', continued: false });
      doc.text('© ZUCA Portal - All Rights Reserved', 50, doc.y + 10, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send semester report email to a user
 * @param {string} userId - User ID
 * @param {object} semester - Semester schedule object
 */
async function sendSemesterReportEmail(userId, semester) {
  try {
    // Get user's attendance data for the semester
    const attendanceData = await prisma.attendanceEntry.findMany({
      where: {
        userId: userId,
        signTime: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        }
      },
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
      orderBy: { signTime: 'desc' }
    });

    // Get eligible meetings (for missed meetings)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true }
    });

    const isExecutive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true }
    });

    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
          { jumuiaId: user?.jumuiaId },
          ...(isExecutive ? [{ isExecutiveOnly: true }] : [])
        ]
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventTime: true,
        location: true
      }
    });

    const attendedSheetIds = new Set(attendanceData.map(e => e.sheetId));
    const allMeetings = eligibleSheets.map(sheet => ({
      ...sheet,
      attended: attendedSheetIds.has(sheet.id)
    }));

    // Generate report data
    const reportData = await generateUserSemesterReport(userId, semester, allMeetings);

    if (!reportData) {
      console.log(`❌ Could not generate report for user ${userId}`);
      return false;
    }

    // Generate PDF
    const pdfBuffer = await generatePDFReport(reportData);

    // Get user object for email
    const userObj = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });

    if (!userObj) {
      console.log(`❌ User ${userId} not found for email`);
      return false;
    }

    // Send email with PDF attachment
    await sendSemesterReportEmailViaMailer(userObj, reportData, pdfBuffer, semester);

    console.log(`✅ Semester report sent to ${userObj.email}`);
    return true;

  } catch (error) {
    console.error(`❌ Error sending semester report to ${userId}:`, error);
    return false;
  }
}

/**
 * Send semester reports to all eligible users
 * @param {object} semester - Semester schedule object
 */
async function sendSemesterReportsToAll(semester) {
  try {
    console.log(`📧 Sending semester reports to all users for: ${semester.title}`);

    // Get all users with email using raw SQL to avoid Prisma issues
    const users = await prisma.$queryRaw`
      SELECT id, email, "fullName" 
      FROM "User" 
      WHERE email IS NOT NULL 
      AND email != ''
    `;

    console.log(`📊 Found ${users.length} users with email addresses`);

    if (users.length === 0) {
      console.log('⚠️ No users with email addresses found');
      return { successCount: 0, failCount: 0, total: 0 };
    }

    let successCount = 0;
    let failCount = 0;

    // Process in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      console.log(`📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}...`);
      
      const results = await Promise.allSettled(
        batch.map(user => sendSemesterReportEmail(user.id, semester))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          failCount++;
        }
      });

      console.log(`📊 Progress: ${Math.min(i + BATCH_SIZE, users.length)}/${users.length} processed`);
    }

    console.log(`✅ Semester reports sent: ${successCount} success, ${failCount} failed`);
    return { successCount, failCount, total: users.length };
  } catch (error) {
    console.error('❌ Error sending semester reports:', error);
    return { successCount: 0, failCount: 0, total: 0 };
  }
}

module.exports = {
  generateUserSemesterReport,
  generatePDFReport,
  sendSemesterReportEmail,
  sendSemesterReportsToAll
};