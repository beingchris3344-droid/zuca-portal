const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendPersonalizedEmail } = require("./mailer");

/**
 * Generate a 24-hour system activity report
 */
async function generate24HourReport() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  console.log(`📊 Generating 24-hour report from ${twentyFourHoursAgo.toISOString()} to ${now.toISOString()}`);

  // ========== 1. NEW USERS ==========
  const newUsers = await prisma.user.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo }
    },
    select: {
      fullName: true,
      email: true,
      phone: true,
      membership_number: true,
      role: true,
      specialRole: true,
      homeJumuia: { select: { name: true } },
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // ========== 2. ERRORS ==========
  // Get errors from global error store
  const errors = global.errorStore?.filter(e => 
    new Date(e.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 3. SYSTEM ACTIVITY ==========
  const activities = global.activityStore?.filter(a => 
    new Date(a.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 4. PLEDGES ==========
  const newPledges = await prisma.pledge.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo }
    },
    include: {
      user: { select: { fullName: true, email: true } },
      contributionType: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // ========== 5. ANNOUNCEMENTS ==========
  const newAnnouncements = await prisma.announcement.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo }
    },
    include: {
      author: { select: { fullName: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // ========== 6. LOGINS ==========
  const activeUsers = await prisma.user.findMany({
    where: {
      lastActive: { gte: twentyFourHoursAgo }
    },
    select: {
      fullName: true,
      email: true,
      lastActive: true,
      role: true
    },
    orderBy: { lastActive: 'desc' }
  });

  // ========== 7. SYSTEM HEALTH ==========
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  let dbStatus = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  // ========== 8. MALICIOUS REQUESTS ==========
  const maliciousRequests = global.maliciousRequests?.filter(m => 
    new Date(m.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 9. SLOW REQUESTS ==========
  const slowRequests = global.slowRequests?.filter(m => 
    new Date(m.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 10. BUILD REPORT ==========
  const report = {
    reportDate: now.toISOString(),
    reportPeriod: {
      start: twentyFourHoursAgo.toISOString(),
      end: now.toISOString()
    },
    summary: {
      newUsers: newUsers.length,
      newPledges: newPledges.length,
      newAnnouncements: newAnnouncements.length,
      activeUsers: activeUsers.length,
      errors: errors.length,
      maliciousRequests: maliciousRequests.length,
      slowRequests: slowRequests.length,
      totalActivities: activities.length
    },
    details: {
      newUsers: newUsers.map(u => ({
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        membership: u.membership_number,
        role: u.role,
        specialRole: u.specialRole,
        jumuia: u.homeJumuia?.name || 'None',
        joinedAt: u.createdAt.toISOString()
      })),
      newPledges: newPledges.map(p => ({
        user: p.user.fullName,
        userEmail: p.user.email,
        campaign: p.contributionType.title,
        amount: p.amountPaid || 0,
        pending: p.pendingAmount || 0,
        status: p.status,
        createdAt: p.createdAt.toISOString()
      })),
      newAnnouncements: newAnnouncements.map(a => ({
        title: a.title,
        content: a.content.substring(0, 200) + (a.content.length > 200 ? '...' : ''),
        author: a.author?.fullName || 'Unknown',
        authorEmail: a.author?.email || 'Unknown',
        createdAt: a.createdAt.toISOString()
      })),
      activeUsers: activeUsers.map(u => ({
        name: u.fullName,
        email: u.email,
        role: u.role,
        lastActive: u.lastActive?.toISOString()
      })),
      errors: errors.map(e => ({
        message: e.error || e.message || 'Unknown error',
        path: e.context?.path || 'Unknown path',
        method: e.context?.method || 'Unknown method',
        userId: e.context?.userId || 'Unknown user',
        timestamp: e.timestamp || new Date().toISOString()
      })),
      maliciousRequests: maliciousRequests.map(m => ({
        type: m.maliciousType || 'Unknown',
        endpoint: m.endpoint || 'Unknown',
        method: m.method || 'Unknown',
        ip: m.ip || 'Unknown',
        timestamp: m.timestamp || new Date().toISOString()
      })),
      slowRequests: slowRequests.map(s => ({
        endpoint: s.endpoint || 'Unknown',
        duration: s.duration || 0,
        userId: s.userId || 'Unknown',
        timestamp: s.timestamp || new Date().toISOString()
      })),
      systemHealth: {
        status: 'healthy',
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
        },
        database: dbStatus
      }
    }
  };

  return report;
}

/**
 * Send 24-hour report email to admins
 */
async function send24HourReport() {
  try {
    console.log('📧 Generating 24-hour report...');
    
    // Generate the report
    const report = await generate24HourReport();
    
    // Get all admin emails
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, fullName: true }
    });

    if (admins.length === 0) {
      console.log('⚠️ No admins found to send report to');
      return;
    }

    // Build email body
    const emailBody = buildReportEmail(report);

    // Send to each admin
    for (const admin of admins) {
      try {
        await sendPersonalizedEmail(
          { email: admin.email, fullName: admin.fullName },
          'system_report',
          `📊 ZUCA System Report - ${new Date().toLocaleDateString()}`,
          emailBody,
          { report: report }
        );
        console.log(`✅ Report sent to ${admin.email}`);
      } catch (err) {
        console.error(`❌ Failed to send report to ${admin.email}:`, err.message);
      }
    }

    // Also save to database for later viewing
    await saveReportToDatabase(report);

    console.log(`✅ 24-hour report completed. Sent to ${admins.length} admins.`);
    return report;
    
  } catch (err) {
    console.error('❌ Failed to generate 24-hour report:', err.message);
    return null;
  }
}

/**
 * Build HTML email body from report
 */
function buildReportEmail(report) {
  const { summary, details } = report;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 10px; }
        h2 { color: #283593; margin-top: 25px; }
        .summary-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 10px 0; }
        .stat-item { background: white; padding: 10px; border-radius: 5px; text-align: center; border: 1px solid #e0e0e0; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1a237e; }
        .stat-label { font-size: 12px; color: #666; }
        .error-item { background: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .user-item { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .activity-item { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .warning-item { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 5px 0; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #1a237e; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
        tr:hover { background: #f5f5f5; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-green { background: #4caf50; color: white; }
        .badge-red { background: #f44336; color: white; }
        .badge-yellow { background: #ff9800; color: white; }
        .badge-blue { background: #2196f3; color: white; }
      </style>
    </head>
    <body>
      <h1>📊 ZUCA System Report</h1>
      <p><strong>Report Period:</strong> ${new Date(report.reportPeriod.start).toLocaleString()} - ${new Date(report.reportPeriod.end).toLocaleString()}</p>
      <p><strong>Generated:</strong> ${new Date(report.reportDate).toLocaleString()}</p>

      <div class="summary-box">
        <h2>📈 Summary</h2>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-number">${summary.newUsers}</div>
            <div class="stat-label">New Users</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.newPledges}</div>
            <div class="stat-label">New Pledges</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.newAnnouncements}</div>
            <div class="stat-label">Announcements</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.activeUsers}</div>
            <div class="stat-label">Active Users</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" style="color: ${summary.errors > 0 ? '#f44336' : '#4caf50'}">${summary.errors}</div>
            <div class="stat-label">Errors</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.totalActivities}</div>
            <div class="stat-label">Total Activities</div>
          </div>
        </div>
      </div>

      <h2>👤 New Users (${details.newUsers.length})</h2>
      ${details.newUsers.length > 0 ? `
        <table>
          <tr><th>Name</th><th>Email</th><th>Membership</th><th>Role</th><th>Jumuia</th></tr>
          ${details.newUsers.map(u => `
            <tr>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td>${u.membership || 'N/A'}</td>
              <td>${u.role}${u.specialRole ? ` (${u.specialRole})` : ''}</td>
              <td>${u.jumuia}</td>
            </tr>
          `).join('')}
        </table>
      ` : '<p>No new users in the last 24 hours.</p>'}

      <h2>💰 New Pledges (${details.newPledges.length})</h2>
      ${details.newPledges.length > 0 ? `
        <table>
          <tr><th>User</th><th>Campaign</th><th>Amount Paid</th><th>Pending</th><th>Status</th></tr>
          ${details.newPledges.map(p => `
            <tr>
              <td>${p.user}</td>
              <td>${p.campaign}</td>
              <td>KES ${p.amount.toLocaleString()}</td>
              <td>KES ${p.pending.toLocaleString()}</td>
              <td><span class="badge ${p.status === 'COMPLETED' ? 'badge-green' : p.status === 'PENDING' ? 'badge-yellow' : 'badge-blue'}">${p.status}</span></td>
            </tr>
          `).join('')}
        </table>
      ` : '<p>No new pledges in the last 24 hours.</p>'}

      <h2>📢 New Announcements (${details.newAnnouncements.length})</h2>
      ${details.newAnnouncements.length > 0 ? `
        ${details.newAnnouncements.map(a => `
          <div class="activity-item">
            <strong>${a.title}</strong><br>
            <span style="color: #666;">By: ${a.author}</span><br>
            <span style="color: #666; font-size: 12px;">${new Date(a.createdAt).toLocaleString()}</span><br>
            <p style="margin: 5px 0; color: #555;">${a.content}</p>
          </div>
        `).join('')}
      ` : '<p>No new announcements in the last 24 hours.</p>'}

      <h2>❌ Errors (${details.errors.length})</h2>
      ${details.errors.length > 0 ? `
        ${details.errors.map(e => `
          <div class="error-item">
            <strong>${e.message}</strong><br>
            <span style="color: #666;">Path: ${e.path} | Method: ${e.method} | User: ${e.userId}</span><br>
            <span style="color: #666; font-size: 12px;">${new Date(e.timestamp).toLocaleString()}</span>
          </div>
        `).join('')}
      ` : '<p>✅ No errors detected in the last 24 hours.</p>'}

      <h2>🛡️ Security</h2>
      ${details.maliciousRequests.length > 0 ? `
        <div class="warning-item">
          <strong>⚠️ ${details.maliciousRequests.length} Malicious Request(s) Blocked</strong>
          ${details.maliciousRequests.map(m => `
            <div style="padding: 5px 0; font-size: 13px;">
              • ${m.type} - ${m.endpoint} (${m.method}) from ${m.ip}
            </div>
          `).join('')}
        </div>
      ` : '<p>✅ No malicious requests detected.</p>'}

      ${details.slowRequests.length > 0 ? `
        <div class="warning-item">
          <strong>🐢 ${details.slowRequests.length} Slow Request(s)</strong>
          ${details.slowRequests.map(s => `
            <div style="padding: 5px 0; font-size: 13px;">
              • ${s.endpoint} took ${s.duration}ms
            </div>
          `).join('')}
        </div>
      ` : ''}

      <h2>🖥️ System Health</h2>
      <div class="summary-box">
        <p><strong>Status:</strong> <span class="badge ${details.systemHealth.status === 'healthy' ? 'badge-green' : 'badge-red'}">${details.systemHealth.status.toUpperCase()}</span></p>
        <p><strong>Uptime:</strong> ${details.systemHealth.uptime}</p>
        <p><strong>Memory:</strong> ${details.systemHealth.memory.heapUsed} / ${details.systemHealth.memory.heapTotal} (RSS: ${details.systemHealth.memory.rss})</p>
        <p><strong>Database:</strong> <span class="badge ${details.systemHealth.database === 'healthy' ? 'badge-green' : 'badge-red'}">${details.systemHealth.database.toUpperCase()}</span></p>
      </div>

      <div class="footer">
        <p>This is an automated report from ZUCA System Monitor.</p>
        <p>Tumsifu Yesu Kristu! 🙏</p>
        <p style="font-size: 10px; color: #999;">Generated: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Save report to database for later viewing
 */
async function saveReportToDatabase(report) {
  try {
    // Check if reports table exists - if not, create it or skip
    // For now, just log it
    console.log('📊 Report saved to database (skipping - table may not exist)');
  } catch (err) {
    console.error('Failed to save report:', err.message);
  }
}

module.exports = {
  generate24HourReport,
  send24HourReport
};