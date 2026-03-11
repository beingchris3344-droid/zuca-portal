// ================== ENV & CORE MODULES ==================
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");

// ================== EXPRESS & MIDDLEWARE ==================
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== DATABASE & AUTH ==================
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";

// ================== EMAIL ==================
const { sendPasswordResetEmail } = require("./services/mailer");

// ================== NOTIFICATIONS ==================
// Simple in-memory notification store (keep for backward compatibility)
const notifications = new Map(); // userId -> array of notifications

const createNotification = ({ userId, type, title, message }) => {
  const notif = {
    id: Date.now().toString(),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date(),
  };
  
  if (userId) {
    if (!notifications.has(userId)) {
      notifications.set(userId, []);
    }
    notifications.get(userId).push(notif);
  }
  
  return notif;
};

const readNotifications = (userId) => {
  return notifications.get(userId) || [];
};

const markAsRead = (userId) => {
  const userNotifs = notifications.get(userId) || [];
  userNotifs.forEach(n => n.read = true);
  return userNotifs;
};

// ================== SOCKET.IO ==================
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ================== MIDDLEWARE ==================
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(req.method, req.path, req.body);
  next();
});

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use("/uploads", express.static(uploadDir));

// ====================
// Multer config for profile uploads
// ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only images (jpg, png, webp) allowed"));
  },
});

// ================== FIXED CORS FOR RENDER ==================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://zucaportal.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== AUTH MIDDLEWARE ==================
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
}

// ====================
// Update lastActive
// ====================
async function updateLastActive(req, res, next) {
  if (req.user?.userId) {
    try {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { lastActive: new Date() },
      });
    } catch (err) {
      console.error("Failed to update lastActive:", err.message);
    }
  }
  next();
}

// ================== AUTH ROUTES ==================

// 1. REQUEST RESET CODE
app.post("/api/auth/request", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(404).json({ error: "No account found with this email." });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { 
        resetCode, 
        resetCodeExpiry: expiry 
      },
    });

    await sendPasswordResetEmail(user.email, resetCode);
    res.json({ message: "Reset code sent! Check your inbox." });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Failed to send email. Check backend logs." });
  }
});

// 2. VERIFY CODE & UPDATE PASSWORD
app.post("/api/auth/verify", async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || user.resetCode !== code) {
      return res.status(400).json({ error: "Invalid reset code." });
    }

    if (new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ error: "Code has expired. Request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword, 
        resetCode: null, 
        resetCodeExpiry: null 
      },
    });

    res.json({ message: "Password updated successfully! You can now log in." });

  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ====================
// Root
// ====================
app.get("/", (req, res) => res.json({ message: "ZUCA Backend Running 🚀" }));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ====================
// Register
// ====================
// In your backend register route
// ====================
// Register - FIXED for text membership_number
// ====================
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const existing = await prisma.user.findUnique({ 
      where: { email: normalizedEmail } 
    });
    if (existing) return res.status(400).json({ error: "Email exists" });

    const hashed = await bcrypt.hash(password, 10);
    
    // Generate membership number - FIXED FOR TEXT FIELD
    let membershipNumber = "Z#001";
    
    try {
      // Find the last user with a valid membership number
      const lastUser = await prisma.user.findFirst({
        orderBy: { createdAt: "desc" },
        where: { 
          membership_number: { 
            not: null,
            not: "nan",
            not: ""
          } 
        },
      });

      console.log("Last user membership:", lastUser?.membership_number);

      if (lastUser?.membership_number) {
        // Extract number from string like "Z#001"
        const membershipStr = String(lastUser.membership_number);
        
        // Try to extract digits using regex
        const match = membershipStr.match(/\d+/);
        
        if (match) {
          const lastNum = parseInt(match[0], 10);
          console.log("Last number extracted:", lastNum);
          
          if (!isNaN(lastNum)) {
            const nextNum = (lastNum + 1).toString().padStart(3, "0");
            membershipNumber = `Z#${nextNum}`;
            console.log("Next membership number:", membershipNumber);
          }
        } else {
          // If no digits found, just increment a counter based on total users
          const userCount = await prisma.user.count();
          const nextNum = (userCount + 1).toString().padStart(3, "0");
          membershipNumber = `Z#${nextNum}`;
        }
      } else {
        // First user - use Z#001
        console.log("First user, using Z#001");
      }
    } catch (err) {
      console.error("Error generating membership number:", err);
      // Fallback: use timestamp
      const timestamp = Date.now().toString().slice(-6);
      membershipNumber = `Z#${timestamp}`;
    }

    console.log("Final membership number:", membershipNumber);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        password: hashed,
        membership_number: membershipNumber,
        role: "member",
      },
    });

    console.log("User created with membership:", user.membership_number);

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      token, 
      user: userWithoutPassword 
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Login
// ====================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Get Current User
// ====================
app.get("/api/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { jumuia: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Apply authenticate + lastActive for protected routes
// ====================
app.use(authenticate, updateLastActive);

// ====================
// DASHBOARD STATS ENDPOINTS
// ====================

// Get unread announcements count
app.get("/api/announcements/unread", authenticate, async (req, res) => {
  try {
    const count = await prisma.announcement.count({
      where: { published: true }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread messages count
app.get("/api/chat/unread", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    const count = await prisma.message.count({
      where: { 
        roomId: defaultRoom?.id,
      }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get upcoming events count
app.get("/api/events/upcoming", authenticate, async (req, res) => {
  try {
    const count = await prisma.massProgram.count({
      where: {
        date: {
          gte: new Date()
        }
      }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Announcements Routes - FIXED with date formatting
// ====================
app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    
    // Format dates
    const formattedAnnouncements = announcements.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString()
    }));
    
    res.json(formattedAnnouncements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/announcements", requireAdmin, async (req, res) => {
  try {
    const { title, content, category, published } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title & Content required" });

    const announcement = await prisma.announcement.create({
      data: { 
        title, 
        content, 
        category: category || "General", 
        published: published ?? true 
      },
    });

    console.log("✅ Announcement created:", announcement.id);

    const users = await prisma.user.findMany({ 
      select: { id: true } 
    });
    
    if (users.length > 0) {
      const now = new Date();
      const notifications = users.map(user => ({
        id: `ann-${announcement.id}-${user.id}-${Date.now()}`,
        userId: user.id,
        type: "announcement",
        title: "📢 New Announcement",
        message: title,
        read: false,
        createdAt: now,
      }));

      const result = await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });

      console.log(`✅ Created ${result.count} notifications`);
      
      // Emit socket events with formatted dates
      if (io) {
        notifications.forEach(notif => {
          const formattedNotif = {
            ...notif,
            createdAt: now.toISOString()
          };
          io.to(notif.userId).emit("new_notification", formattedNotif);
        });
      }
    }

    // Format response date
    const formattedAnnouncement = {
      ...announcement,
      createdAt: announcement.createdAt.toISOString()
    };

    res.json(formattedAnnouncement);
  } catch (err) {
    console.error("❌ Error creating announcement:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, published } = req.body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: { title, content, category, published },
    });
    
    const formattedAnnouncement = {
      ...announcement,
      createdAt: announcement.createdAt.toISOString()
    };
    
    res.json(formattedAnnouncement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Mass Programs (songs) - FIXED with date formatting
// ====================
app.get("/api/songs", async (req, res) => {
  try {
    const programs = await prisma.massProgram.findMany({
      include: { songs: { include: { song: true } } },
      orderBy: { date: "desc" },
    });

    const formatted = programs.map((p) => {
      const songMap = {};
      p.songs.forEach((s) => {
        songMap[s.type] = s.song.title;
      });
      return {
        id: p.id,
        date: p.date.toISOString().split("T")[0],
        venue: p.venue,
        entrance: songMap.entrance || "",
        mass: songMap.mass || "",
        bible: songMap.bible || "",
        offertory: songMap.offertory || "",
        procession: songMap.procession || "",
        mtakatifu: songMap.mtakatifu || "",
        signOfPeace: songMap.signOfPeace || "",
        communion: songMap.communion || "",
        thanksgiving: songMap.thanksgiving || "",
        exit: songMap.exit || "",
        createdAt: p.createdAt.toISOString()
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/songs", requireAdmin, async (req, res) => {
  try {
    const { date, venue, ...songsData } = req.body;
    if (!date || !venue) return res.status(400).json({ error: "Date & Venue required" });

    const songsToCreate = [];
    for (const [type, title] of Object.entries(songsData)) {
      if (!title || title.trim() === "") continue;
      let existingSong = await prisma.song.findFirst({ where: { title: title.trim() } });
      if (!existingSong) existingSong = await prisma.song.create({ data: { title: title.trim() } });
      songsToCreate.push({ song: { connect: { id: existingSong.id } }, type });
    }

    const newProgram = await prisma.massProgram.create({
      data: { date: new Date(date), venue, songs: { create: songsToCreate } },
      include: { songs: { include: { song: true } } },
    });

    console.log("✅ Mass Program created:", newProgram.id);

    const users = await prisma.user.findMany({ 
      select: { id: true } 
    });
    
    if (users.length > 0) {
      const now = new Date();
      const notifications = users.map(user => ({
        id: `program-${newProgram.id}-${user.id}-${Date.now()}`,
        userId: user.id,
        type: "program",
        title: "⛪ New Mass Program",
        message: `Mass at ${venue} on ${new Date(date).toLocaleDateString()}`,
        read: false,
        createdAt: now,
      }));

      const result = await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });

      console.log(`✅ Created ${result.count} notifications`);
      
      // Emit socket events with formatted dates
      if (io) {
        notifications.forEach(notif => {
          const formattedNotif = {
            ...notif,
            createdAt: now.toISOString()
          };
          io.to(notif.userId).emit("new_notification", formattedNotif);
        });
      }
    }

    const response = { 
      id: newProgram.id, 
      date: newProgram.date.toISOString().split("T")[0], 
      venue: newProgram.venue,
      createdAt: newProgram.createdAt.toISOString()
    };
    newProgram.songs.forEach((s) => (response[s.type] = s.song.title));

    res.json({ program: response });
  } catch (err) {
    console.error("❌ Error creating mass program:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/songs/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, venue, ...songsData } = req.body;

    await prisma.massProgramSong.deleteMany({ where: { massProgramId: id } });

    const songsToCreate = [];
    for (const [type, title] of Object.entries(songsData)) {
      if (!title || title.trim() === "") continue;
      let existingSong = await prisma.song.findFirst({ where: { title: title.trim() } });
      if (!existingSong) existingSong = await prisma.song.create({ data: { title: title.trim() } });
      songsToCreate.push({ song: { connect: { id: existingSong.id } }, type });
    }

    const updatedProgram = await prisma.massProgram.update({
      where: { id },
      data: { date: new Date(date), venue, songs: { create: songsToCreate } },
      include: { songs: { include: { song: true } } },
    });

    const response = { 
      id: updatedProgram.id, 
      date: updatedProgram.date.toISOString().split("T")[0], 
      venue: updatedProgram.venue,
      createdAt: updatedProgram.createdAt.toISOString()
    };
    updatedProgram.songs.forEach((s) => (response[s.type] = s.song.title));

    res.json({ program: response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/songs/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.massProgramSong.deleteMany({ where: { massProgramId: req.params.id } });
    await prisma.massProgram.delete({ where: { id: req.params.id } });
    res.json({ message: "Program deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// JUMUIA ROUTES
// ====================

app.get("/api/jumuia", async (req, res) => {
  try {
    const jumuia = await prisma.jumuia.findMany({
      orderBy: { name: "asc" },
    });
    res.json(jumuia);
  } catch (err) {
    console.error("Fetch Jumuia error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/join-jumuia", authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.body;
    console.log("Joining JumuiaId:", jumuiaId, "User:", req.user);

    if (!jumuiaId)
      return res.status(400).json({ error: "jumuiaId is required" });

    const jumuia = await prisma.jumuia.findUnique({ where: { id: jumuiaId } });
    if (!jumuia) return res.status(404).json({ error: "Jumuia not found" });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { jumuiaId },
      include: { jumuia: true },
    });

    res.json({ message: `Joined ${updatedUser.jumuia.name}`, user: updatedUser });
  } catch (err) {
    console.error("Join Jumuia error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/jumuia/:userId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { jumuiaId } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId: jumuiaId || null },
      include: { jumuia: true },
    });

    const message = jumuiaId
      ? `User assigned to ${updated.jumuia?.name}`
      : "User removed from a Jumuia";

    res.json({ message, user: updated });
  } catch (err) {
    console.error("Admin PATCH Jumuia error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/jumuia/:userId/remove", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId: null },
      include: { jumuia: true },
    });

    res.json({ message: "User removed from Jumuia", user: updatedUser });
  } catch (err) {
    console.error("Remove User from Jumuia Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contributions/jumuia", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { jumuia: true },
    });

    if (!user.jumuiaId) return res.status(400).json({ error: "User has not been assigned to any Jumuia" });

    const contributions = await prisma.contributionType.findMany({
      where: { jumuiaId: user.jumuiaId },
      include: {
        pledges: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(contributions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/contributions/jumuia", authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, amountRequired, deadline, jumuiaId } = req.body;
    if (!title || !amountRequired || !jumuiaId)
      return res.status(400).json({ error: "Title, amountRequired & jumuiaId are required" });

    const newType = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
        jumuiaId,
      },
    });

    const users = await prisma.user.findMany({ where: { jumuiaId }, select: { id: true } });
    if (users.length > 0) {
      await prisma.pledge.createMany({
        data: users.map(u => ({
          userId: u.id,
          contributionTypeId: newType.id,
          pendingAmount: 0,
          amountPaid: 0,
          status: "PENDING",
        })),
      });
    }

    res.json(newType);
  } catch (err) {
    console.error("Create Jumuia Contribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/jumuia/:id/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { jumuiaId: req.params.id },
      select: { id: true, fullName: true, email: true, role: true },
    });
    res.json(users);
  } catch (err) {
    console.error("Fetch Jumuia Users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// EXISTING CHAT ROUTES (Keep as is)
// ====================
async function ensureDefaultChatRoom() {
  const room = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  if (!room) await prisma.chatRoom.create({ data: { name: "default" } });
}
ensureDefaultChatRoom();

// ====================
// FIXED: GET /api/chat - Include user details and parse attachments
// ====================
app.get("/api/chat", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    const messages = await prisma.message.findMany({
      where: { roomId: defaultRoom.id },
      include: { 
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            role: true,
            profileImage: true 
          } 
        } 
      },
      orderBy: { createdAt: "asc" },
    });
    
    // Format dates and parse attachments
    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : []
    }));
    
    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// FIXED: POST /api/chat - Handle attachments and empty content
// ====================
app.post("/api/chat", authenticate, async (req, res) => {
  try {
    const { content, replyToId, attachments } = req.body;
    
    // Allow empty content if there are attachments
    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    // Create message with attachments
    const message = await prisma.message.create({ 
      data: { 
        content: content || "", // Allow empty string
        userId: req.user.userId, 
        roomId: defaultRoom.id,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null
      } 
    });
    
    // Fetch the created message with user details
    const messageWithUser = await prisma.message.findUnique({
      where: { id: message.id },
      include: { 
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            role: true,
            profileImage: true 
          } 
        } 
      }
    });
    
    const formattedMessage = {
      ...messageWithUser,
      createdAt: messageWithUser.createdAt.toISOString(),
      attachments: messageWithUser.attachments ? JSON.parse(messageWithUser.attachments) : []
    };
    
    io.emit("new_message", formattedMessage);
    
    res.json(formattedMessage);
  } catch (err) {
    console.error("Error creating message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// FIXED: DELETE /api/chat/:id - Admin only
// ====================
app.delete("/api/chat/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.message.delete({ where: { id: req.params.id } });
    io.emit("message_deleted", { id: req.params.id });
    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// ENHANCED CHAT ROUTES - New features
// ====================

// Configure multer for chat file uploads
const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const chatDir = path.join(__dirname, "uploads/chat");
      if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
      cb(null, chatDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `chat_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|pdf|doc|docx|txt/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype.split("/")[1]);
    if (ext || mime) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

// Serve chat uploads
app.use("/uploads/chat", express.static(path.join(__dirname, "uploads/chat")));

// Upload file for chat
app.post("/api/chat/upload", authenticate, chatUpload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      url: `${baseUrl}/uploads/chat/${file.filename}`,
      type: file.mimetype,
      size: file.size,
      filename: file.filename
    }));

    res.json(uploadedFiles);
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

// Get chat messages with all related data
app.get("/api/chat/enhanced", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    const messages = await prisma.message.findMany({
      where: { 
        roomId: defaultRoom.id,
        isDeleted: false 
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            profileImage: true
          }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        replies: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    // Format dates and attachments
    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt?.toISOString(),
      deletedAt: m.deletedAt?.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      reactions: m.reactions.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString()
      })),
      mentions: m.mentions.map(ment => ({
        ...ment,
        createdAt: ment.createdAt.toISOString(),
        readAt: ment.readAt?.toISOString()
      })),
      readReceipts: m.readReceipts.map(rr => ({
        ...rr,
        readAt: rr.readAt.toISOString()
      }))
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching enhanced messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// Send message with attachments and reply
app.post("/api/chat/enhanced", authenticate, async (req, res) => {
  try {
    const { content, replyToId, attachments } = req.body;
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        userId: req.user.userId,
        roomId: defaultRoom.id,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            profileImage: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    // Update reply count if replying
    if (replyToId) {
      await prisma.message.update({
        where: { id: replyToId },
        data: { replyCount: { increment: 1 } }
      });
    }

    // Update chat room last message time
    await prisma.chatRoom.update({
      where: { id: defaultRoom.id },
      data: { lastMessageAt: new Date() }
    });

    // Create mentions for @username
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentions = [];
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      const mentionedUser = await prisma.user.findFirst({
        where: { fullName: { contains: username, mode: 'insensitive' } }
      });
      if (mentionedUser && mentionedUser.id !== req.user.userId) {
        mentions.push({
          userId: mentionedUser.id,
          messageId: message.id
        });
      }
    }

    if (mentions.length > 0) {
      await prisma.mention.createMany({
        data: mentions
      });

      // Create notifications for mentions
      const now = new Date();
      const notifications = mentions.map(m => ({
        id: `mention-${message.id}-${m.userId}-${Date.now()}`,
        userId: m.userId,
        type: "mention",
        title: "👤 You were mentioned",
        message: `${req.user.fullName} mentioned you: ${content.substring(0, 50)}...`,
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({
        data: notifications
      });

      // Emit socket notifications
      if (io) {
        notifications.forEach(notif => {
          io.to(notif.userId).emit("new_notification", {
            ...notif,
            createdAt: now.toISOString()
          });
        });
      }
    }

    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
    };

    // Emit new message via socket
    io.emit("new_message", formattedMessage);

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error creating enhanced message:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add reaction to message
app.post("/api/chat/:messageId/reactions", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

    // Check if reaction already exists
    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId: req.user.userId,
          reaction
        }
      }
    });

    if (existing) {
      // Remove reaction if it exists (toggle)
      await prisma.messageReaction.delete({
        where: { id: existing.id }
      });
      res.json({ message: "Reaction removed", action: "removed" });
    } else {
      // Add new reaction
      const newReaction = await prisma.messageReaction.create({
        data: {
          messageId,
          userId: req.user.userId,
          reaction
        },
        include: {
          user: {
            select: { id: true, fullName: true }
          }
        }
      });

      const formattedReaction = {
        ...newReaction,
        createdAt: newReaction.createdAt.toISOString()
      };

      // Emit socket event
      io.emit("new_reaction", formattedReaction);

      res.status(201).json(formattedReaction);
    }
  } catch (err) {
    console.error("Error adding reaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// Edit message
app.put("/api/chat/:messageId", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user owns message or is admin
    if (message.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, fullName: true, role: true }
        }
      }
    });

    const formattedMessage = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };

    io.emit("message_edited", formattedMessage);

    res.json(formattedMessage);
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark message as read
app.post("/api/chat/:messageId/read", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const existing = await prisma.readReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: req.user.userId
        }
      }
    });

    if (!existing) {
      const readReceipt = await prisma.readReceipt.create({
        data: {
          messageId,
          userId: req.user.userId,
          readAt: new Date()
        },
        include: {
          user: {
            select: { id: true, fullName: true }
          }
        }
      });

      const formattedReceipt = {
        ...readReceipt,
        readAt: readReceipt.readAt.toISOString()
      };

      io.emit("message_read", formattedReceipt);

      res.json(formattedReceipt);
    } else {
      res.json({ message: "Already marked as read" });
    }
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Pin message (Admin only)
app.post("/api/chat/:messageId/pin", authenticate, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { room: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existingPin = await prisma.pin.findUnique({
      where: {
        roomId_messageId: {
          roomId: message.roomId,
          messageId
        }
      }
    });

    if (existingPin) {
      // Unpin
      await prisma.pin.delete({
        where: { id: existingPin.id }
      });
      io.emit("message_unpinned", { messageId, roomId: message.roomId });
      res.json({ message: "Message unpinned" });
    } else {
      // Pin
      const pin = await prisma.pin.create({
        data: {
          messageId,
          roomId: message.roomId,
          userId: req.user.userId
        },
        include: {
          user: {
            select: { id: true, fullName: true }
          },
          message: {
            include: {
              user: {
                select: { id: true, fullName: true }
              }
            }
          }
        }
      });

      const formattedPin = {
        ...pin,
        createdAt: pin.createdAt.toISOString()
      };

      io.emit("message_pinned", formattedPin);

      // Create notification for message owner
      if (message.userId !== req.user.userId) {
        const now = new Date();
        const notification = await prisma.notification.create({
          data: {
            id: `pin-${messageId}-${Date.now()}`,
            userId: message.userId,
            type: "pin",
            title: "📌 Your message was pinned",
            message: `Your message was pinned by ${req.user.fullName}`,
            read: false,
            createdAt: now,
          }
        });

        io.to(message.userId).emit("new_notification", {
          ...notification,
          createdAt: now.toISOString()
        });
      }

      res.status(201).json(formattedPin);
    }
  } catch (err) {
    console.error("Error pinning message:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get pinned messages
app.get("/api/chat/pinned", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    const pins = await prisma.pin.findMany({
      where: { roomId: defaultRoom.id },
      include: {
        message: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true }
            }
          }
        },
        user: {
          select: { id: true, fullName: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedPins = pins.map(pin => ({
      ...pin,
      createdAt: pin.createdAt.toISOString(),
      message: {
        ...pin.message,
        createdAt: pin.message.createdAt.toISOString(),
        attachments: pin.message.attachments ? JSON.parse(pin.message.attachments) : []
      }
    }));

    res.json(formattedPins);
  } catch (err) {
    console.error("Error fetching pinned messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// Block user
app.post("/api/chat/block/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.userId) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const existing = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedId: {
          userId: req.user.userId,
          blockedId: userId
        }
      }
    });

    if (existing) {
      // Unblock
      await prisma.blockedUser.delete({
        where: { id: existing.id }
      });
      res.json({ message: "User unblocked" });
    } else {
      // Block
      const block = await prisma.blockedUser.create({
        data: {
          userId: req.user.userId,
          blockedId: userId
        }
      });
      res.json({ message: "User blocked", block });
    }
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get blocked users
app.get("/api/chat/blocked", authenticate, async (req, res) => {
  try {
    const blocked = await prisma.blockedUser.findMany({
      where: { userId: req.user.userId },
      include: {
        blocked: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    res.json(blocked.map(b => b.blocked));
  } catch (err) {
    console.error("Error fetching blocked users:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get online users
app.get("/api/chat/online", authenticate, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await prisma.user.findMany({
      where: {
        lastActive: { gte: fiveMinutesAgo }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImage: true,
        lastActive: true
      }
    });

    const formatted = onlineUsers.map(u => ({
      ...u,
      lastActive: u.lastActive?.toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching online users:", err);
    res.status(500).json({ error: err.message });
  }
});

// Search messages
app.get("/api/chat/search", authenticate, async (req, res) => {
  try {
    const { q, userId, from, to } = req.query;
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });

    const where = {
      roomId: defaultRoom.id,
      isDeleted: false,
      ...(q && {
        content: {
          contains: q,
          mode: 'insensitive'
        }
      }),
      ...(userId && { userId }),
      ...(from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) })
        }
      }
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : []
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error searching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Admin Stats
// ====================
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalAnnouncements = await prisma.announcement.count();
    const totalPrograms = await prisma.massProgram.count();
    const totalMessages = await prisma.message.count();
    res.json({ totalUsers, totalAnnouncements, totalPrograms, totalMessages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// User Management
// ====================
app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true,jumuia: true,  membership_number: true, email: true, role: true, profileImage: true, createdAt: true, lastActive: true },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const usersWithStatus = users.map((u) => ({
      ...u,
      online: u.lastActive && now - new Date(u.lastActive) < 10 * 60 * 1000,
      createdAt: u.createdAt.toISOString(),
      lastActive: u.lastActive?.toISOString()
    }));

    res.json(usersWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(400).json({ error: "You cannot delete yourself" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    await prisma.message.deleteMany({ where: { userId: id } });
    await prisma.pledge.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ["member", "moderator", "treasurer", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    if (req.user.userId === id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, fullName: true, email: true, role: true },
    });

    res.json({ message: "Role updated successfully", user: updatedUser });
  } catch (err) {
    console.error("ROLE UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Upload User Profile Image
// ====================
const { supabase } = require("./supabaseClient");

app.post("/api/users/:id/upload-profile", authenticate, upload.single("profile"), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    if (existingUser.profileImage) {
      const oldFileName = existingUser.profileImage.split("/").pop();
      await supabase.storage.from("profiles").remove([oldFileName]);
    }

    const fileExt = path.extname(req.file.originalname);
    const fileName = `profile_${id}_${Date.now()}${fileExt}`;

    const { error } = await supabase.storage
      .from("profiles")
      .upload(fileName, fs.createReadStream(req.file.path), {
        contentType: req.file.mimetype,
        upsert: true,
      });

    fs.unlinkSync(req.file.path);

    if (error) return res.status(500).json({ error: error.message });

    const publicURL = `https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/${fileName}`;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { profileImage: publicURL },
      select: { id: true, fullName: true, email: true, role: true, profileImage: true },
    });

    res.json({ message: "Profile image uploaded successfully", user: updatedUser });
  } catch (err) {
    console.error("Upload profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id/delete-profile", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.profileImage) {
      return res.status(400).json({ error: "No profile image to delete" });
    }

    let pathToDelete = user.profileImage;

    if (user.profileImage.startsWith("http")) {
      try {
        const url = new URL(user.profileImage);
        pathToDelete = decodeURIComponent(
          url.pathname.replace(/^\/storage\/v1\/object\/public\/profiles\//, "")
        );
      } catch (err) {
        console.error("Failed to parse profile image URL:", err);
        return res.status(500).json({ error: "Failed to delete profile image" });
      }
    }

    const { error: storageError } = await supabase.storage
      .from("profiles")
      .remove([pathToDelete]);

    if (storageError) {
      console.error("Failed to delete image from Supabase storage:", storageError);
      return res.status(500).json({ error: "Failed to delete profile image from storage" });
    }

    await prisma.user.update({ where: { id }, data: { profileImage: null } });

    res.json({ message: "Profile image deleted successfully" });
  } catch (err) {
    console.error("Delete profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// CONTRIBUTION SYSTEM ROUTES - FIXED with proper status flow
// ====================

// Create a new contribution type (Admin only)
app.post("/api/contribution-types", authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, amountRequired, deadline } = req.body;
    if (!title || !amountRequired)
      return res.status(400).json({ error: "Title & amountRequired required" });

    const newType = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    // Create a pledge for every user
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      await prisma.pledge.createMany({
        data: users.map((u) => ({
          userId: u.id,
          contributionTypeId: newType.id,
          pendingAmount: 0,
          amountPaid: 0,
          status: "PENDING",
        })),
      });
    }

    // After creating pledges, create notifications for all users
if (users.length > 0) {
  const now = new Date();
  const notifications = users.map(user => ({
    id: `contribution-${newType.id}-${user.id}-${Date.now()}`,
    userId: user.id,
    type: "contribution",
    title: "💰 New Contribution Campaign",
    message: `A new contribution "${title}" has been launched. Target: ${amountRequired} per member`,
    read: false,
    createdAt: now,
  }));

  await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${notifications.length} contribution notifications`);

  // Emit socket events for real-time notifications
  if (io) {
    notifications.forEach(notif => {
      io.to(notif.userId).emit("new_notification", {
        ...notif,
        createdAt: now.toISOString()
      });
    });
  }
}


    res.json(newType);
  } catch (err) {
    console.error("CREATE ContributionType ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});



// Get all contribution types with pledges (Admin only)
app.get("/api/contribution-types", authenticate, requireAdmin, async (req, res) => {
  try {
    const types = await prisma.contributionType.findMany({
      include: {
        pledges: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a contribution type (Admin only)
app.put("/api/contribution-types/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    const updated = await prisma.contributionType.update({
      where: { id },
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a contribution type (Admin only)
app.delete("/api/contribution-types/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.pledge.deleteMany({ where: { contributionTypeId: id } });
    await prisma.contributionType.delete({ where: { id } });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// BULK DELETE CONTRIBUTION TYPES (Admin only)
// ====================
app.post("/api/contribution-types/bulk-delete", authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    console.log(`Bulk deleting ${ids.length} campaigns:`, ids);

    // First delete all pledges associated with these campaigns
    await prisma.pledge.deleteMany({
      where: {
        contributionTypeId: {
          in: ids
        }
      }
    });

    // Then delete the campaigns
    const result = await prisma.contributionType.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    console.log(`Successfully deleted ${result.count} campaigns`);

    res.json({ 
      message: `Successfully deleted ${result.count} campaigns`,
      count: result.count 
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// BULK DUPLICATE CONTRIBUTION TYPES (Admin only)
// ====================
app.post("/api/contribution-types/bulk-duplicate", authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    // Fetch the campaigns to duplicate with their pledges
    const campaignsToDuplicate = await prisma.contributionType.findMany({
      where: {
        id: {
          in: ids
        }
      },
      include: {
        pledges: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    const duplicatedCampaigns = [];

    // Duplicate each campaign
    for (const campaign of campaignsToDuplicate) {
      // Create new campaign
      const newCampaign = await prisma.contributionType.create({
        data: {
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          amountRequired: campaign.amountRequired,
          deadline: campaign.deadline,
        }
      });

      // Duplicate pledges for the new campaign
      if (campaign.pledges && campaign.pledges.length > 0) {
        await prisma.pledge.createMany({
          data: campaign.pledges.map(pledge => ({
            userId: pledge.userId,
            contributionTypeId: newCampaign.id,
            amountPaid: 0, // Reset amounts for duplicated pledges
            pendingAmount: 0, // Reset amounts
            message: pledge.message,
            status: "PENDING", // Reset status
          }))
        });
      }

      // Fetch the complete new campaign with pledges
      const completeNewCampaign = await prisma.contributionType.findUnique({
        where: { id: newCampaign.id },
        include: {
          pledges: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true }
              }
            }
          }
        }
      });

      duplicatedCampaigns.push(completeNewCampaign);
    }

    res.json({ 
      message: `Successfully duplicated ${duplicatedCampaigns.length} campaigns`,
      campaigns: duplicatedCampaigns 
    });
  } catch (err) {
    console.error("Bulk duplicate error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get current user's pledges
app.get("/api/my-pledges", authenticate, async (req, res) => {
  try {
    const pledges = await prisma.pledge.findMany({
      where: { userId: req.user.userId },
      include: { contributionType: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = pledges.map(p => ({
      id: p.id,
      title: p.contributionType.title,
      description: p.contributionType.description,
      amountRequired: p.contributionType.amountRequired,
      pendingAmount: p.pendingAmount,
      amountPaid: p.amountPaid,
      message: p.message,
      status: p.status,
      contributionTypeId: p.contributionType.id,
      deadline: p.contributionType.deadline?.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// User makes a pledge
app.post("/api/pledges/:contributionTypeId", authenticate, async (req, res) => {
  try {
    const { contributionTypeId } = req.params;
    const { amount, message } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });

    const type = await prisma.contributionType.findUnique({
      where: { id: contributionTypeId },
    });
    if (!type) return res.status(404).json({ error: "Contribution type not found" });

    let pledge = await prisma.pledge.findFirst({
      where: { userId: req.user.userId, contributionTypeId },
    });

    if (!pledge) {
      pledge = await prisma.pledge.create({
        data: {
          userId: req.user.userId,
          contributionTypeId,
          amountPaid: 0,
          pendingAmount: 0,
          status: "PENDING",
          message: message || null,
        },
      });
    }

    const totalCommitted = pledge.amountPaid + pledge.pendingAmount;
    if (totalCommitted + parseFloat(amount) > type.amountRequired) {
      return res.status(400).json({ error: "Cannot exceed required amount" });
    }

    const updated = await prisma.pledge.update({
      where: { id: pledge.id },
      data: {
        pendingAmount: pledge.pendingAmount + parseFloat(amount),
        message: message || pledge.message,
        status: "PENDING",
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true }
    });

    if (admins.length > 0) {
      const now = new Date();
      const notifications = admins.map(admin => ({
        id: `pledge-pending-${pledge.id}-${admin.id}-${Date.now()}`,
        userId: admin.id,
        type: "contribution",
        title: "💰 New Pledge Awaiting Approval",
        message: `User pledged ${amount} for "${type.title}"`,
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });

      if (io) {
        notifications.forEach(notif => {
          io.to(notif.userId).emit("new_notification", {
            ...notif,
            createdAt: now.toISOString()
          });
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("CREATE PLEDGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin approves a pledge
app.put("/api/pledges/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pledge = await prisma.pledge.findUnique({ 
      where: { id }, 
      include: { 
        contributionType: true,
        user: true 
      } 
    });
    
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const newPaid = pledge.amountPaid + pledge.pendingAmount;
    const amountRequired = pledge.contributionType.amountRequired;
    
    let newStatus;
    let notificationTitle;
    let notificationMessage;
    
    if (newPaid >= amountRequired) {
      newStatus = "COMPLETED";
      notificationTitle = "💰 Pledge Completed!";
      notificationMessage = `Your pledge of ${amountRequired} for "${pledge.contributionType.title}" has been fully paid. Thank you!`;
    } else {
      newStatus = "APPROVED";
      notificationTitle = "💰 Pledge Approved";
      notificationMessage = `Your pledge of ${pledge.pendingAmount} for "${pledge.contributionType.title}" has been approved. You still owe ${amountRequired - newPaid}.`;
    }

    const updated = await prisma.pledge.update({
      where: { id },
      data: {
        amountPaid: newPaid,
        pendingAmount: 0,
        status: newStatus,
        approvedById: req.user.userId,
        approvedAt: new Date(),
      },
      include: {
        user: true,
        contributionType: true
      }
    });

    const now = new Date();
    const notifId = `pledge-${pledge.id}-${Date.now()}`;
    
    const notification = await prisma.notification.create({
      data: {
        id: notifId,
        userId: pledge.userId,
        type: "contribution",
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        createdAt: now,
      },
    });

    if (io) {
      io.to(pledge.userId).emit("new_notification", {
        ...notification,
        createdAt: now.toISOString()
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Approve pledge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin manually adds amount to a pledge
app.put("/api/pledges/:id/manual-add", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const pledge = await prisma.pledge.findUnique({ 
      where: { id }, 
      include: { 
        contributionType: true,
        user: true 
      } 
    });
    
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const totalPaid = pledge.amountPaid + parseFloat(amount);
    const amountRequired = pledge.contributionType.amountRequired;
    
    if (totalPaid > amountRequired) {
      return res.status(400).json({ error: "Cannot exceed required amount" });
    }

    let newStatus = pledge.status;
    let notificationTitle = "💰 Pledge Updated";
    let notificationMessage = `${amount} has been added to your pledge for "${pledge.contributionType.title}".`;
    
    if (totalPaid >= amountRequired) {
      newStatus = "COMPLETED";
      notificationTitle = "💰 Pledge Completed!";
      notificationMessage = `Your pledge of ${amountRequired} for "${pledge.contributionType.title}" has been fully paid. Thank you!`;
    } else if (pledge.status === "PENDING" && totalPaid > 0) {
      newStatus = "APPROVED";
    }

    const updated = await prisma.pledge.update({
      where: { id },
      data: {
        amountPaid: totalPaid,
        status: newStatus,
        createdByAdmin: true,
      },
    });

    const now = new Date();
    const notifId = `pledge-manual-${pledge.id}-${Date.now()}`;
    
    const notification = await prisma.notification.create({
      data: {
        id: notifId,
        userId: pledge.userId,
        type: "contribution",
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        createdAt: now,
      },
    });

    if (io) {
      io.to(pledge.userId).emit("new_notification", {
        ...notification,
        createdAt: now.toISOString()
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Manual add error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reset a user's pledge (Admin only)
app.put("/api/pledges/:id/reset", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.pledge.update({
      where: { id },
      data: {
        amountPaid: 0,
        pendingAmount: 0,
        message: null,
        status: "PENDING",
        approvedById: null,
        approvedAt: null,
        createdByAdmin: false,
      },
    });

    res.json({ message: "User pledge reset", pledge: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit pledge message (Admin only)
app.put("/api/pledges/:id/edit-message", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const updated = await prisma.pledge.update({
      where: { id },
      data: { message },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ====================
// PUSH NOTIFICATIONS - ADD THIS SECTION
// ====================
const webpush = require('web-push');

// Generate VAPID keys (run once and save)
// Run: node -e "console.log(require('web-push').generateVAPIDKeys())"
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'YOUR_GENERATED_PUBLIC_KEY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_GENERATED_PRIVATE_KEY'
};

webpush.setVapidDetails(
  'mailto:zucaportal2025@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store push subscriptions
app.post('/api/notifications/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.userId;

    // Save subscription to database
    await prisma.pushSubscription.upsert({
      where: { userId },
      update: { subscription: JSON.stringify(subscription) },
      create: {
        userId,
        subscription: JSON.stringify(subscription)
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unsubscribe
app.delete('/api/notifications/unsubscribe', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get VAPID public key
app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Helper function to send push notification
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId }
    });

    if (!subscription) return;

    const pushSubscription = JSON.parse(subscription.subscription);
    
    await webpush.sendNotification(pushSubscription, JSON.stringify({
      title,
      body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon.ico',
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Error sending push notification:', err);
    // Remove invalid subscription
    if (err.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({ where: { userId } });
    }
  }
}

// Modify existing notification functions to also send push
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  // Create DB notification (existing code)
  const notif = await prisma.notification.create({
    data: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
    }
  });

  // Send socket notification (existing)
  io.to(userId).emit('new_notification', {
    ...notif,
    createdAt: notif.createdAt.toISOString()
  });

  // Send push notification (NEW)
  await sendPushNotification(userId, title, message, { type, ...data });

  return notif;
}

// ====================
// NOTIFICATIONS ROUTES - FIXED WITH PROPER DATE FORMATTING
// ====================

// Create notification (for internal use)
app.post("/api/notify", authenticate, async (req, res) => {
  try {
    const { userId = null, type, title, message } = req.body;
    if (!type || !title || !message) {
      return res.status(400).json({ error: "Type, title, message are required" });
    }

    let dbNotif = null;
    if (userId) {
      const notifId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date();
      dbNotif = await prisma.notification.create({
        data: {
          id: notifId,
          userId,
          type,
          title,
          message,
          read: false,
          createdAt: now,
        },
      });
      
      dbNotif = {
        ...dbNotif,
        createdAt: dbNotif.createdAt.toISOString()
      };
    }

    if (io) {
      if (userId) {
        io.to(userId).emit("new_notification", dbNotif);
      } else {
        io.emit("new_notification", dbNotif);
      }
    }

    res.status(201).json(dbNotif);
  } catch (err) {
    console.error("Notify error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get notifications for a user
app.get("/api/notifications/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formattedNotifications = notifications.map(notif => ({
      ...notif,
      createdAt: notif.createdAt.toISOString()
    }));

    res.json(formattedNotifications);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark a single notification as read
app.put("/api/notifications/:notificationId/read", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.user;

    const updated = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: userId,
      },
      data: {
        read: true,
      },
    });

    const formattedNotification = {
      ...updated,
      createdAt: updated.createdAt.toISOString()
    };

    res.json({ message: "Notification marked as read", notification: formattedNotification });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
app.put("/api/notifications/:userId/read-all", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ 
      message: "All notifications marked as read", 
      count: result.count 
    });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark notifications by type as read
app.put('/api/notifications/mark-by-type/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.body;
    
    const result = await prisma.notification.updateMany({
      where: { 
        userId, 
        type, 
        read: false 
      },
      data: { 
        read: true 
      }
    });
    
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error marking by type:", error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all notifications (delete them)
app.delete('/api/notifications/:userId/clear-all', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await prisma.notification.deleteMany({
      where: { userId }
    });
    
    res.json({ 
      success: true, 
      message: 'All notifications cleared successfully',
      count: result.count
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ====================
// SOCKET.IO
// ====================
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ====================
// Start server
// ====================
const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));