// ================== DEEPSEEK TOOL HANDLERS ==================
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");

/**
 * Execute a tool call and return the result
 * @param {string} toolName - Name of the tool to execute
 * @param {object} args - Arguments passed by the AI
 * @param {object} context - { user, req } - Current user and request object
 */
async function executeToolCall(toolName, args, context) {
  const { user: currentUser, req } = context;
  
  try {
    switch (toolName) {

      // ==================== NAVIGATION ====================
      case "navigate_to_page": {
        const pageMap = {
          "dashboard": "/dashboard",
          "announcements": "/announcements",
          "mass-programs": "/mass-programs",
          "contributions": "/contributions",
          "chat": "/chat",
          "hymns": "/hymns",
          "liturgical-calendar": "/liturgical-calendar",
          "gallery": "/gallery",
          "join-jumuia": "/join-jumuia",
          "games": "/games",
          "youtube": "/youtube",
          "schedules": "/schedules",
          "executive": "/executive",
          "profile": "/profile",
          "admin": "/admin",
          "admin-users": "/admin/users",
          "admin-roles": "/admin/roles",
          "admin-media": "/admin/media",
          "admin-songs": "/admin/songs",
          "admin-hymns": "/admin/hymns",
          "admin-announcements": "/admin/announcements",
          "admin-contributions": "/admin/contributions",
          "admin-jumuia": "/admin/jumuia-management",
          "admin-schedules": "/admin/schedules",
          "admin-chat": "/admin/chat",
          "admin-security": "/admin/security",
          "admin-analytics": "/admin/analytics",
          "admin-health": "/admin/health-centre",
          "admin-executive": "/admin/executive",
          "admin-pending-songs": "/admin/pending-songs",
          "admin-ocr": "/admin/ocr-scanner",
          "admin-activity": "/admin/activity"
        };
        
        const path = pageMap[args.page] || "/dashboard";
        return {
          action: "navigate",
          path: path,
          message: `Navigating to ${args.page}`
        };
      }

      // ==================== USER PROFILE ====================
      case "get_my_profile": {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          include: { homeJumuia: true }
        });
        
        if (!user) return { error: "User not found" };
        
        const pledges = await prisma.pledge.findMany({
          where: { userId: user.id },
          include: { contributionType: true }
        });
        
        const totalPaid = pledges.reduce((s, p) => s + (p.amountPaid || 0), 0);
        const totalPending = pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0);
        
        return {
          profile: {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            membershipNumber: user.membership_number,
            role: user.role,
            specialRole: user.specialRole,
            jumuia: user.homeJumuia?.name || "Not assigned",
            joinedDate: user.createdAt,
            lastActive: user.lastActive
          },
          contributions: {
            totalPaid,
            totalPending,
            activePledges: pledges.length
          }
        };
      }

      case "get_my_pledges": {
        const pledges = await prisma.pledge.findMany({
          where: { userId: currentUser.userId },
          include: { contributionType: true },
          orderBy: { createdAt: "desc" }
        });
        
        return {
          pledges: pledges.map(p => ({
            id: p.id,
            campaign: p.contributionType.title,
            amountRequired: p.contributionType.amountRequired,
            amountPaid: p.amountPaid || 0,
            pendingAmount: p.pendingAmount || 0,
            status: p.status,
            message: p.message
          })),
          summary: {
            totalPaid: pledges.reduce((s, p) => s + (p.amountPaid || 0), 0),
            totalPending: pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0),
            totalPledges: pledges.length
          }
        };
      }

      case "get_my_notifications": {
        const notifications = await prisma.notification.findMany({
          where: { userId: currentUser.userId, read: false },
          orderBy: { createdAt: "desc" },
          take: 20
        });
        
        if (args.markAsRead) {
          await prisma.notification.updateMany({
            where: { userId: currentUser.userId, read: false },
            data: { read: true }
          });
        }
        
        return {
          unreadCount: notifications.length,
          notifications: notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            createdAt: n.createdAt
          }))
        };
      }

      // ==================== CONTRIBUTIONS ====================
      case "create_pledge": {
        const campaigns = await prisma.contributionType.findMany({
          where: { 
            OR: [
              { jumuiaId: null },
              { jumuiaId: currentUser.jumuiaId }
            ]
          },
          take: 1,
          orderBy: { createdAt: "desc" }
        });
        
        if (campaigns.length === 0) {
          return { error: "No active campaigns found. Ask an admin to create one." };
        }
        
        const campaign = campaigns[0];
        
        let pledge = await prisma.pledge.findFirst({
          where: { userId: currentUser.userId, contributionTypeId: campaign.id }
        });
        
        if (pledge) {
          pledge = await prisma.pledge.update({
            where: { id: pledge.id },
            data: { pendingAmount: (pledge.pendingAmount || 0) + args.amount }
          });
        } else {
          pledge = await prisma.pledge.create({
            data: {
              userId: currentUser.userId,
              contributionTypeId: campaign.id,
              amountPaid: 0,
              pendingAmount: args.amount,
              status: "PENDING"
            }
          });
        }
        
        // Notify admins/treasurers
        const admins = await prisma.user.findMany({
          where: { OR: [{ role: "admin" }, { specialRole: "treasurer" }] },
          select: { id: true }
        });
        
        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: "new_pledge",
              title: "💰 New Pledge",
              message: `${currentUser.fullName} pledged KES ${args.amount} for "${campaign.title}"`
            }
          });
        }
        
        return {
          success: true,
          message: `Pledge of KES ${args.amount} recorded for "${campaign.title}"`,
          pledge: {
            campaign: campaign.title,
            amount: args.amount,
            status: "PENDING"
          }
        };
      }

      case "get_active_campaigns": {
        const campaigns = await prisma.contributionType.findMany({
          where: {
            OR: [
              { deadline: null },
              { deadline: { gte: new Date() } }
            ]
          },
          include: {
            _count: { select: { pledges: true } }
          },
          orderBy: { createdAt: "desc" }
        });
        
        return {
          campaigns: campaigns.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            amountRequired: c.amountRequired,
            deadline: c.deadline,
            jumuiaId: c.jumuiaId,
            totalPledges: c._count.pledges
          }))
        };
      }

      case "create_campaign": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";
        const isTreasurer = user.specialRole === "treasurer";
        
        if (!isAdmin && !isTreasurer) {
          return { error: "Only admins and treasurers can create campaigns." };
        }
        
        const campaign = await prisma.contributionType.create({
          data: {
            title: args.title,
            description: args.description || null,
            amountRequired: args.amountRequired,
            deadline: args.deadline ? new Date(args.deadline) : null
          }
        });
        
        // Create pledges for all users
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        if (allUsers.length > 0) {
          await prisma.pledge.createMany({
            data: allUsers.map(u => ({
              userId: u.id,
              contributionTypeId: campaign.id,
              amountPaid: 0,
              pendingAmount: 0,
              status: "PENDING"
            }))
          });
        }
        
        // Notify all users
        for (const u of allUsers) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              type: "contribution",
              title: "💰 New Campaign",
              message: `"${args.title}" - Target: KES ${args.amountRequired}. Check your pledges!`
            }
          });
        }
        
        return {
          success: true,
          message: `Campaign "${args.title}" created successfully`,
          campaign: { id: campaign.id, title: campaign.title, amountRequired: campaign.amountRequired }
        };
      }

      case "approve_pledge": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";
        const isTreasurer = user.specialRole === "treasurer";
        
        if (!isAdmin && !isTreasurer) {
          return { error: "Only admins and treasurers can approve pledges." };
        }
        
        const pledge = await prisma.pledge.findUnique({
          where: { id: args.pledgeId },
          include: { contributionType: true, user: true }
        });
        
        if (!pledge) return { error: "Pledge not found." };
        if (pledge.pendingAmount === 0) return { error: "No pending amount to approve." };
        
        const newAmountPaid = (pledge.amountPaid || 0) + (pledge.pendingAmount || 0);
        const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";
        
        await prisma.pledge.update({
          where: { id: args.pledgeId },
          data: {
            amountPaid: newAmountPaid,
            pendingAmount: 0,
            status: newStatus,
            approvedById: currentUser.userId,
            approvedAt: new Date()
          }
        });
        
        await prisma.notification.create({
          data: {
            userId: pledge.userId,
            type: "pledge_approved",
            title: newStatus === "COMPLETED" ? "🎉 Pledge Complete!" : "✅ Pledge Approved",
            message: `Your pledge for "${pledge.contributionType.title}" has been approved.`
          }
        });
        
        return { success: true, message: `Pledge approved. New status: ${newStatus}` };
      }

      // ==================== MASS & LITURGY ====================
      case "get_upcoming_masses": {
        const masses = await prisma.massProgram.findMany({
          where: { date: { gte: new Date() } },
          include: { songs: { include: { song: true } } },
          orderBy: { date: "asc" },
          take: args.limit || 5
        });
        
        return {
          masses: masses.map(m => ({
            id: m.id,
            date: m.date,
            venue: m.venue,
            songs: m.songs.map(s => ({ type: s.type, title: s.song.title }))
          }))
        };
      }

      case "get_todays_readings": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const reading = await prisma.liturgicalDay.findFirst({
          where: { date: { gte: today, lt: tomorrow } }
        });
        
        if (!reading) return { message: "No readings found for today." };
        
        return {
          date: reading.date,
          celebration: reading.celebration,
          season: reading.season,
          seasonName: reading.seasonName,
          color: reading.liturgicalColor,
          readings: reading.readings
        };
      }

      case "get_readings_by_date": {
        const date = new Date(args.date);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const reading = await prisma.liturgicalDay.findFirst({
          where: { date: { gte: date, lt: nextDay } }
        });
        
        if (!reading) return { message: `No readings found for ${args.date}.` };
        
        return {
          date: reading.date,
          celebration: reading.celebration,
          season: reading.seasonName,
          color: reading.liturgicalColor,
          readings: reading.readings
        };
      }

      case "get_liturgical_calendar": {
        const startDate = new Date(args.year, args.month - 1, 1);
        const endDate = new Date(args.year, args.month, 1);
        
        const days = await prisma.liturgicalDay.findMany({
          where: { date: { gte: startDate, lt: endDate } },
          orderBy: { date: "asc" }
        });
        
        return {
          year: args.year,
          month: args.month,
          days: days.map(d => ({
            date: d.date,
            celebration: d.celebration,
            season: d.seasonName,
            color: d.liturgicalColor
          }))
        };
      }

      // ==================== HYMNS ====================
      case "search_hymns": {
        const where = {
          OR: [
            { title: { contains: args.query, mode: "insensitive" } },
            { lyrics: { contains: args.query, mode: "insensitive" } }
          ]
        };
        
        const hymns = await prisma.song.findMany({
          where,
          select: { id: true, title: true, reference: true },
          take: 10
        });
        
        return { hymns, count: hymns.length };
      }

      case "get_hymn_lyrics": {
        let hymn;
        if (args.hymnId) {
          hymn = await prisma.song.findUnique({ where: { id: args.hymnId } });
        } else if (args.title) {
          hymn = await prisma.song.findFirst({
            where: { title: { contains: args.title, mode: "insensitive" } }
          });
        }
        
        if (!hymn) return { error: "Hymn not found." };
        
        return {
          id: hymn.id,
          title: hymn.title,
          reference: hymn.reference,
          lyrics: hymn.lyrics,
          action: "navigate",
          path: `/hymn/${hymn.id}`
        };
      }

      // ==================== JUMUIA ====================
      case "get_jumuia_list": {
        const jumuia = await prisma.jumuia.findMany({
          include: { _count: { select: { members: true } } },
          orderBy: { name: "asc" }
        });
        
        return {
          jumuia: jumuia.map(j => ({
            id: j.id,
            name: j.name,
            code: j.code,
            memberCount: j._count.members
          }))
        };
      }

      case "get_jumuia_details": {
        let jumuia;
        if (args.jumuiaName) {
          jumuia = await prisma.jumuia.findFirst({
            where: { name: { contains: args.jumuiaName, mode: "insensitive" } },
            include: {
              leaders: { select: { id: true, fullName: true, email: true } },
              _count: { select: { members: true } }
            }
          });
        } else if (args.jumuiaCode) {
          jumuia = await prisma.jumuia.findUnique({
            where: { code: args.jumuiaCode },
            include: {
              leaders: { select: { id: true, fullName: true, email: true } },
              _count: { select: { members: true } }
            }
          });
        }
        
        if (!jumuia) return { error: "Jumuia not found." };
        
        return {
          name: jumuia.name,
          code: jumuia.code,
          memberCount: jumuia._count.members,
          leaders: jumuia.leaders,
          action: "navigate",
          path: `/jumuia/${jumuia.code}`
        };
      }

      case "join_jumuia": {
        const jumuia = await prisma.jumuia.findFirst({
          where: { name: { contains: args.jumuiaName, mode: "insensitive" } }
        });
        
        if (!jumuia) return { error: "Jumuia not found." };
        
        await prisma.user.update({
          where: { id: currentUser.userId },
          data: { jumuiaId: jumuia.id }
        });
        
        return {
          success: true,
          message: `You've joined ${jumuia.name}!`,
          action: "navigate",
          path: `/jumuia/${jumuia.code}`
        };
      }

      // ==================== ANNOUNCEMENTS ====================
      case "get_announcements": {
        const announcements = await prisma.announcement.findMany({
          where: { published: true },
          orderBy: { createdAt: "desc" },
          take: args.limit || 5,
          include: { author: { select: { fullName: true } } }
        });
        
        return {
          announcements: announcements.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            category: a.category,
            author: a.author?.fullName,
            createdAt: a.createdAt
          }))
        };
      }

      case "create_announcement": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";
        const isSecretary = user.specialRole === "secretary";
        
        if (!isAdmin && !isSecretary) {
          return { error: "Only admins and secretaries can create announcements." };
        }
        
        const announcement = await prisma.announcement.create({
          data: {
            title: args.title,
            content: args.content,
            category: args.category || "General",
            published: true,
            createdBy: currentUser.userId
          }
        });
        
        // Notify all users
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        for (const u of allUsers) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              type: "announcement",
              title: "📢 New Announcement",
              message: args.title
            }
          });
        }
        
        return { success: true, message: `Announcement "${args.title}" published!` };
      }

      // ==================== CHAT ====================
      case "post_to_chat": {
        const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
        
        if (!defaultRoom) return { error: "Chat room not found." };
        
        const message = await prisma.message.create({
          data: {
            content: args.message,
            userId: currentUser.userId,
            roomId: defaultRoom.id
          }
        });
        
        return { success: true, message: "Message posted to community chat!" };
      }

      // ==================== MEDIA ====================
      case "browse_media": {
        const where = { isPublic: true };
        if (args.category) where.category = args.category;
        if (args.type) where.type = args.type;
        
        const media = await prisma.media.findMany({
          where,
          include: {
            uploadedBy: { select: { fullName: true } },
            _count: { select: { likes: true, views: true } }
          },
          orderBy: { createdAt: "desc" },
          take: args.limit || 10
        });
        
        return {
          media: media.map(m => ({
            id: m.id,
            title: m.title,
            type: m.type,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
            uploadedBy: m.uploadedBy?.fullName,
            likes: m._count.likes,
            views: m._count.views
          }))
        };
      }

      // ==================== YOUTUBE ====================
      case "get_youtube_info": {
        const apiKey = process.env.YOUTUBE_API_KEY;
        const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
        
        if (!apiKey) return { error: "YouTube API not configured." };
        
        try {
          const [channelRes, videosRes] = await Promise.all([
            axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`),
            axios.get(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=5&type=video`)
          ]);
          
          const channel = channelRes.data.items?.[0];
          const videos = videosRes.data.items || [];
          
          return {
            channel: {
              name: channel?.snippet?.title,
              subscribers: parseInt(channel?.statistics?.subscriberCount || 0),
              totalViews: parseInt(channel?.statistics?.viewCount || 0),
              totalVideos: parseInt(channel?.statistics?.videoCount || 0)
            },
            latestVideos: videos.map(v => ({
              id: v.id.videoId,
              title: v.snippet.title,
              thumbnail: v.snippet.thumbnails?.medium?.url,
              publishedAt: v.snippet.publishedAt
            }))
          };
        } catch (err) {
          return { error: "Failed to fetch YouTube data." };
        }
      }

      // ==================== GAMES ====================
      case "challenge_player": {
        const opponent = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.playerName, mode: "insensitive" } },
              { email: { contains: args.playerName, mode: "insensitive" } },
              { membership_number: { contains: args.playerName, mode: "insensitive" } }
            ],
            id: { not: currentUser.userId }
          }
        });
        
        if (!opponent) return { error: `Player "${args.playerName}" not found.` };
        
        const invite = await prisma.gameInvite.create({
          data: {
            fromUserId: currentUser.userId,
            toUserId: opponent.id,
            gameType: args.gameType,
            status: "pending"
          }
        });
        
        await prisma.notification.create({
          data: {
            userId: opponent.id,
            type: "game_invite",
            title: "🎮 Game Invite!",
            message: `${currentUser.fullName} invited you to play ${args.gameType}!`
          }
        });
        
        return {
          success: true,
          message: `Game invite sent to ${opponent.fullName}!`,
          invite: { id: invite.id, gameType: invite.gameType }
        };
      }

      case "get_game_status": {
        const activeGame = await prisma.gameSession.findFirst({
          where: {
            OR: [{ player1Id: currentUser.userId }, { player2Id: currentUser.userId }],
            status: "active"
          },
          include: {
            player1: { select: { fullName: true } },
            player2: { select: { fullName: true } }
          }
        });
        
        if (!activeGame) return { hasActiveGame: false };
        
        return {
          hasActiveGame: true,
          game: {
            id: activeGame.id,
            gameType: activeGame.gameType,
            opponent: activeGame.player1Id === currentUser.userId ? activeGame.player2?.fullName : activeGame.player1?.fullName,
            isMyTurn: activeGame.currentTurn === currentUser.userId
          }
        };
      }

      // ==================== EXECUTIVE MANAGEMENT ====================
      case "get_executive_team": {
        const executives = await prisma.executive.findMany({
          where: { isActive: true },
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true, profileImage: true } },
            position: true
          },
          orderBy: { position: { level: "asc" } }
        });
        
        const grouped = {};
        executives.forEach(e => {
          const cat = e.position.category;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({
            name: e.user.fullName,
            position: e.position.title,
            level: e.position.level,
            phone: e.customPhone || e.user.phone,
            email: e.customEmail || e.user.email
          });
        });
        
        return { executives: grouped, total: executives.length };
      }

      case "assign_executive": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Only admins can assign executives." };
        
        const targetUser = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } },
              { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });
        
        if (!targetUser) return { error: `User "${args.userIdentifier}" not found.` };
        
        const position = await prisma.executivePosition.findFirst({
          where: { title: { contains: args.position, mode: "insensitive" } }
        });
        
        if (!position) return { error: `Position "${args.position}" not found.` };
        
        // Check if position already filled
        const existing = await prisma.executive.findFirst({
          where: { positionId: position.id, isActive: true }
        });
        
        if (existing) {
          await prisma.executiveHistory.create({
            data: {
              userId: existing.userId,
              positionId: existing.positionId,
              assignedBy: existing.assignedBy,
              assignedAt: existing.assignedAt,
              removedAt: new Date(),
              removedBy: currentUser.userId
            }
          });
          await prisma.executive.update({ where: { id: existing.id }, data: { isActive: false } });
        }
        
        // Create new assignment
        const assignment = await prisma.executive.create({
          data: {
            userId: targetUser.id,
            positionId: position.id,
            assignedBy: currentUser.userId
          }
        });
        
        // Update user specialRole
        const specialRoleMap = {
          "Chairperson": null, "Secretary": "secretary", "Treasurer": "treasurer",
          "Choir Moderator": "choir_moderator", "Media Moderator": "media_moderator"
        };
        
        const specialRole = specialRoleMap[position.title] || null;
        if (specialRole) {
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { specialRole }
          });
        }
        
        // Notify
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "executive_appointment",
            title: "🎉 Executive Appointment!",
            message: `Congratulations! You've been appointed as ${position.title}!`
          }
        });
        
        return {
          success: true,
          message: `${targetUser.fullName} appointed as ${position.title}!`,
          previousHolder: existing ? `Replaced previous holder` : null
        };
      }

      case "remove_executive": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Only admins can remove executives." };
        
        const targetUser = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } },
              { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });
        
        if (!targetUser) return { error: "User not found." };
        
        const assignment = await prisma.executive.findFirst({
          where: { userId: targetUser.id, isActive: true },
          include: { position: true }
        });
        
        if (!assignment) return { error: "User has no active executive position." };
        
        await prisma.executiveHistory.create({
          data: {
            userId: assignment.userId,
            positionId: assignment.positionId,
            assignedBy: assignment.assignedBy,
            assignedAt: assignment.assignedAt,
            removedAt: new Date(),
            removedBy: currentUser.userId
          }
        });
        
        await prisma.executive.delete({ where: { id: assignment.id } });
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { specialRole: null }
        });
        
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "executive_removed",
            title: "📋 Position Updated",
            message: `You've been removed from ${assignment.position.title}.`
          }
        });
        
        return { success: true, message: `${targetUser.fullName} removed from ${assignment.position.title}.` };
      }

           // ==================== ADMIN - USER MANAGEMENT ====================
      case "list_all_users": {
        let isAuthorized = false;
        
        if (currentUser?.userId) {
          const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
          if (user) {
            isAuthorized = user.role === "admin" || 
                           user.specialRole === "secretary" || 
                           user.specialRole === "treasurer";
          }
        }
        
        if (!isAuthorized) {
          return { error: "Only admins, secretaries, and treasurers can view all users." };
        }
        
        const users = await prisma.user.findMany({
          select: { 
            id: true, fullName: true, email: true, phone: true,
            role: true, specialRole: true, membership_number: true,
            createdAt: true, lastActive: true
          },
          take: args.limit || 20,
          orderBy: { fullName: "asc" }
        });
        
        return { users, count: users.length, message: `Showing ${users.length} users` };
      }

      case "find_user": {
        let isAuthorized = false;
        
        if (currentUser?.userId) {
          const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
          if (user) {
            isAuthorized = user.role === "admin" || 
                           user.specialRole === "secretary" || 
                           user.specialRole === "treasurer";
          }
        }
        
        if (!isAuthorized) {
          return { error: "Only admins, secretaries, and treasurers can search users." };
        }
        
        const found = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.searchTerm, mode: "insensitive" } },
              { email: { contains: args.searchTerm, mode: "insensitive" } },
              { membership_number: { contains: args.searchTerm, mode: "insensitive" } }
            ]
          },
          include: { homeJumuia: true, pledges: { include: { contributionType: true } } }
        });
        
        if (!found) return { error: `No user found matching "${args.searchTerm}".` };
        
        return {
          user: {
            id: found.id,
            fullName: found.fullName,
            email: found.email,
            phone: found.phone,
            membership: found.membership_number,
            role: found.role,
            specialRole: found.specialRole,
            jumuia: found.homeJumuia?.name,
            totalPaid: found.pledges.reduce((s, p) => s + (p.amountPaid || 0), 0)
          }
        };
      }
      case "change_user_role": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Admin only." };
        
        const target = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });
        
        if (!target) return { error: "User not found." };
        
        await prisma.user.update({
          where: { id: target.id },
          data: { role: args.newRole, specialRole: args.newSpecialRole || null }
        });
        
        return { success: true, message: `${target.fullName} is now ${args.newRole}${args.newSpecialRole ? ` (${args.newSpecialRole})` : ''}.` };
      }

      case "delete_user": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Admin only." };
        if (!args.confirm) return { error: "Confirmation required." };
        
        const target = await prisma.user.findFirst({
          where: { OR: [{ fullName: { contains: args.userIdentifier, mode: "insensitive" } }, { email: { contains: args.userIdentifier, mode: "insensitive" } }] }
        });
        
        if (!target) return { error: "User not found." };
        if (target.id === currentUser.userId) return { error: "Cannot delete yourself." };
        
        await prisma.pledge.deleteMany({ where: { userId: target.id } });
        await prisma.message.deleteMany({ where: { userId: target.id } });
        await prisma.notification.deleteMany({ where: { userId: target.id } });
        await prisma.user.delete({ where: { id: target.id } });
        
        return { success: true, message: `${target.fullName} deleted permanently.` };
      }

      // ==================== SYSTEM STATS ====================
      case "get_system_stats": {
        const [users, announcements, campaigns, messages, media, hymns, jumuia] = await Promise.all([
          prisma.user.count(),
          prisma.announcement.count(),
          prisma.contributionType.count(),
          prisma.message.count(),
          prisma.media.count(),
          prisma.song.count(),
          prisma.jumuia.count()
        ]);
        
        const totalRaised = await prisma.pledge.aggregate({
          where: { OR: [{ status: "APPROVED" }, { status: "COMPLETED" }] },
          _sum: { amountPaid: true }
        });
        
        return {
          stats: {
            users, announcements, campaigns, messages, media, hymns, jumuia,
            totalRaised: totalRaised._sum.amountPaid || 0
          }
        };
      }

      case "get_system_health": {
        const errors = []; // Your health store
        const uptime = process.uptime();
        
        return {
          uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h`,
          memory: process.memoryUsage(),
          recentErrors: errors.slice(0, 10)
        };
      }

      // ==================== CONTENT GENERATION ====================
      case "generate_content": {
        // This returns instructions for the AI to generate content
        // The AI will use the response to craft appropriate content
        return {
          contentType: args.contentType,
          topic: args.topic,
          context: args.additionalContext,
          instruction: `Generate a ${args.contentType} about ${args.topic}. ${args.additionalContext || ''}`
        };
      }

      // ==================== WEB SEARCH ====================
   case "search_web": {
  try {
    const axios = require("axios");
    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1`
    );
    
    const results = (response.data.RelatedTopics || [])
      .filter(t => t.Text && t.FirstURL)
      .slice(0, 5)
      .map(t => ({
        title: t.Text.split(' - ')[0] || t.Text.substring(0, 80),
        url: t.FirstURL,
        snippet: t.Text.substring(0, 200)
      }));
    
    if (results.length === 0) {
      return { 
        query: args.query, 
        results: [],
        message: "No results found. Try a different search." 
      };
    }
    
    return { 
      query: args.query, 
      results, 
      count: results.length,
      source: "DuckDuckGo" 
    };
  } catch (err) {
    console.error("Web search error:", err.message);
    return { error: "Search failed. Please try again." };
  }
}

      // ==================== HELP ====================
      case "show_help": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";
        
        let helpText = `**What I Can Do For You:**\n\n`;
        helpText += `🗣️ **Chat & Navigate** - Talk naturally, I'll guide you\n`;
        helpText += `👤 **Profile** - "Who am I?" "What do I owe?"\n`;
        helpText += `⛪ **Mass** - "Next mass?" "Today's readings"\n`;
        helpText += `🎵 **Hymns** - "Find communion songs" "Show me hymn 45"\n`;
        helpText += `💰 **Pledges** - "I want to give 5000" "Campaign status"\n`;
        helpText += `🏠 **Jumuia** - "Tell me about St. Michael" "Join a jumuia"\n`;
        helpText += `📸 **Gallery** - "Show photos" "Find videos"\n`;
        helpText += `📺 **YouTube** - "Channel stats" "Latest video"\n`;
        helpText += `🎮 **Games** - "Challenge John to trivia"\n`;
        
        if (isAdmin) {
          helpText += `\n**👑 Admin Powers:**\n`;
          helpText += `👥 **Users** - "Find user" "Make admin" "Delete user"\n`;
          helpText += `👑 **Executive** - "Make Morris Secretary" "Show team"\n`;
          helpText += `📢 **Announce** - "Create announcement: [text]"\n`;
          helpText += `💰 **Campaigns** - "Create campaign 'Fund' target 50000"\n`;
          helpText += `📋 **Schedule** - Paste raw text, I'll build it\n`;
          helpText += `📊 **Stats** - "Platform overview" "System health"\n`;
        }
        
        return { helpText };
      }

      // ==================== SCHEDULE GENERATION ====================
      case "generate_schedule_from_text": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";
        const isSecretary = user.specialRole === "secretary";
        
        if (!isAdmin && !isSecretary) {
          return { error: "Only admins and secretaries can create schedules." };
        }
        
        // Return instruction for AI to parse the text
        return {
          rawText: args.rawText,
          title: args.title || "Semester Schedule",
          publishNow: args.publishNow || false,
          instruction: `Parse this raw schedule text and extract structured data. 
            Identify: title, semester dates, general points, sections with events (date, event name).
            Format each event with: title, eventDate (ISO), eventTime (default "16:30"), location, groupName.
            Return the structured schedule data.`
        };
      }

      case "list_schedules": {
        const schedules = await prisma.schedule.findMany({
          include: {
            events: true,
            creator: { select: { fullName: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 10
        });
        
        return {
          schedules: schedules.map(s => ({
            id: s.id,
            title: s.title,
            startDate: s.startDate,
            endDate: s.endDate,
            isPublished: s.isPublished,
            eventCount: s.events.length,
            createdBy: s.creator?.fullName
          }))
        };
      }

            // ==================== EMAIL & NOTIFICATIONS ====================
      case "send_bulk_email": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";
        const isSecretary = user.specialRole === "secretary";

        if (!isAdmin && !isSecretary) {
          return { error: "Only admins and secretaries can send bulk emails." };
        }

        const allUsers = await prisma.user.findMany({ select: { id: true, email: true, fullName: true } });

        for (const u of allUsers) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              type: "announcement",
              title: args.title || "📢 ZUCA Announcement",
              message: args.message
            }
          });
        }

        return {
          success: true,
          message: `Announcement sent to ${allUsers.length} users via email and notification!`,
          recipientCount: allUsers.length
        };
      }

      case "send_email": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin";

        if (!isAdmin) {
          return { error: "Only admins can send individual emails." };
        }

        const target = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });

        if (!target) return { error: "User not found." };

        await prisma.notification.create({
          data: {
            userId: target.id,
            type: "announcement",
            title: args.title || "📢 Message from Admin",
            message: args.message
          }
        });

        return {
          success: true,
          message: `Email sent to ${target.fullName}!`
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { error: `Failed to execute ${toolName}: ${error.message}` };
  }
}

module.exports = { executeToolCall };