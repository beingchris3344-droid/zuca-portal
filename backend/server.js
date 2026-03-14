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

// ================== RESET ATTEMPTS ==================
const resetAttempts = new Map();

// ================== EMAIL ==================
const { sendPasswordResetEmail } = require("./services/mailer");

// ================== NOTIFICATIONS ==================
const notifications = new Map();

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

// ================== MULTER CONFIG ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

// ================== CORS ==================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://zucaportal.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy does not allow access from this origin.';
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

const hasRole = (req, allowedRoles) => {
  return allowedRoles.includes(req.user.role);
};


// ====================
// PUBLIC SONGS ROUTES (no auth needed)
// ====================

// GET /api/songs - List all songs
app.get("/api/songs", async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true
      },
      orderBy: { title: "asc" }
    });
    
    // Add first line preview to each song
    const songsWithPreview = songs.map(song => {
      let firstLine = '';
      if (song.lyrics) {
        // Clean HTML tags from preview
        const cleanLyrics = song.lyrics.replace(/<[^>]*>/g, '');
        // Get first non-empty line
        const lines = cleanLyrics.split('\n').filter(line => line.trim() !== '');
        firstLine = lines[0] || '';
        // Truncate if too long
        if (firstLine.length > 50) {
          firstLine = firstLine.substring(0, 50) + '...';
        }
      }
      
      return {
        id: song.id,
        title: song.title,
        reference: song.reference,
        firstLine: firstLine,
        createdAt: song.createdAt
      };
    });
    
    res.json(songsWithPreview);
  } catch (err) {
    console.error("Error fetching songs:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id - Get single song with full lyrics
app.get("/api/songs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const song = await prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        lyrics: true,
        reference: true,
        createdAt: true
      }
    });
    
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    
    // Clean HTML tags from lyrics for display
    if (song.lyrics) {
      song.lyrics = song.lyrics.replace(/<[^>]*>/g, '');
    }
    
    res.json(song);
  } catch (err) {
    console.error("Error fetching song:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/search?q=... - Search songs by title or lyrics
app.get("/api/songs/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json([]);
    }
    
    const searchTerm = q.trim();
    
    const songs = await prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { lyrics: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true
      },
      orderBy: { title: "asc" },
      take: 50
    });
    
    // Add preview and highlight match
    const results = songs.map(song => {
      // Clean lyrics for preview
      const cleanLyrics = song.lyrics ? song.lyrics.replace(/<[^>]*>/g, '') : '';
      
      let preview = '';
      let matchType = 'title';
      
      if (song.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchType = 'title';
        preview = song.title;
      } else if (cleanLyrics.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchType = 'lyrics';
        // Find the line where the term appears
        const lines = cleanLyrics.split('\n');
        const matchingLine = lines.find(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        );
        preview = matchingLine || '';
        if (preview.length > 60) {
          const index = preview.toLowerCase().indexOf(searchTerm.toLowerCase());
          const start = Math.max(0, index - 20);
          const end = Math.min(preview.length, index + searchTerm.length + 20);
          preview = (start > 0 ? '...' : '') + 
                    preview.substring(start, end) + 
                    (end < preview.length ? '...' : '');
        }
      }
      
      return {
        id: song.id,
        title: song.title,
        reference: song.reference,
        matchType,
        preview
      };
    });
    
    res.json(results);
  } catch (err) {
    console.error("Error searching songs:", err);
    res.status(500).json({ error: err.message });
  }
});


// ====================
// ADMIN SONGS ROUTES (with full lyrics)
// ====================

// GET /api/admin/songs - Get all songs with full lyrics for admin
app.get("/api/admin/songs", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const songs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,  // ← Include full lyrics
        createdAt: true,
        updatedAt: true
      },
      orderBy: { title: "asc" }
    });

    // Add first line preview for convenience
    const songsWithPreview = songs.map(song => {
      let firstLine = '';
      if (song.lyrics) {
        const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
        firstLine = lines[0] || '';
        if (firstLine.length > 60) {
          firstLine = firstLine.substring(0, 60) + '...';
        }
      }
      
      return {
        ...song,
        firstLine
      };
    });

    res.json(songsWithPreview);
  } catch (err) {
    console.error("Error fetching admin songs:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/songs/:id - Get single song with full lyrics
app.get("/api/admin/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const song = await prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    res.json(song);
  } catch (err) {
    console.error("Error fetching song:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/songs - Create new song
app.post("/api/admin/songs", authenticate, async (req, res) => {
  try {
    const { title, reference, lyrics } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if song already exists
    const existing = await prisma.song.findFirst({
      where: { 
        title: {
          equals: title,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: "A song with this title already exists" });
    }

    const song = await prisma.song.create({
      data: {
        title,
        reference: reference || null,
        lyrics: lyrics || null
      }
    });

    // Add first line for response
    let firstLine = '';
    if (song.lyrics) {
      const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
      firstLine = lines[0] || '';
    }

    res.status(201).json({
      ...song,
      firstLine
    });
  } catch (err) {
    console.error("Error creating song:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/songs/:id - Update song
app.put("/api/admin/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, reference, lyrics } = req.body;

    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const song = await prisma.song.update({
      where: { id },
      data: {
        title,
        reference: reference || null,
        lyrics: lyrics || null
      }
    });

    // Add first line for response
    let firstLine = '';
    if (song.lyrics) {
      const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
      firstLine = lines[0] || '';
    }

    res.json({
      ...song,
      firstLine
    });
  } catch (err) {
    console.error("Error updating song:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/songs/:id - Delete song
app.delete("/api/admin/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.song.delete({
      where: { id }
    });

    res.json({ message: "Song deleted successfully" });
  } catch (err) {
    console.error("Error deleting song:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== UPDATE LAST ACTIVE ==================
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

// ================== ROOT ==================
app.get("/", (req, res) => res.json({ message: "ZUCA Backend Running 🚀" }));

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ================== REGISTER ==================
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        error: "Full name, email, password, and phone are required",
      });
    }

    let formattedPhone = phone;
    if (phone.startsWith("07")) {
      formattedPhone = "+254" + phone.slice(1);
    }

    const normalizedEmail = email.toLowerCase();

    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });
    if (existingPhone) {
      return res.status(400).json({ error: "Phone already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    let membershipNumber = "Z#001";

    try {
      const lastUser = await prisma.user.findFirst({
        orderBy: { createdAt: "desc" },
        where: {
          membership_number: {
            not: null,
            not: "nan",
            not: ""
          }
        }
      });

      if (lastUser?.membership_number) {
        const membershipStr = String(lastUser.membership_number);
        const match = membershipStr.match(/\d+/);

        if (match) {
          const lastNum = parseInt(match[0], 10);
          if (!isNaN(lastNum)) {
            const nextNum = (lastNum + 1).toString().padStart(3, "0");
            membershipNumber = `Z#${nextNum}`;
          }
        } else {
          const userCount = await prisma.user.count();
          const nextNum = (userCount + 1).toString().padStart(3, "0");
          membershipNumber = `Z#${nextNum}`;
        }
      }
    } catch (err) {
      console.error("Membership generation error:", err);
      const timestamp = Date.now().toString().slice(-6);
      membershipNumber = `Z#${timestamp}`;
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        password: hashed,
        phone: formattedPhone,
        membership_number: membershipNumber,
        role: "member"
      }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() }
    });

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

// ================== LOGIN ==================
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

// ================== ROLE LOGIN ==================
app.post("/api/role-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const rolePatterns = [
      { prefix: "stmichael", role: "jumuia_leader", jumuiaCode: "stmichael", jumuiaName: "ST. MICHAEL" },
      { prefix: "stbenedict", role: "jumuia_leader", jumuiaCode: "stbenedict", jumuiaName: "ST. BENEDICT" },
      { prefix: "stperegrine", role: "jumuia_leader", jumuiaCode: "stperegrine", jumuiaName: "ST. PEREGRINE" },
      { prefix: "christtheking", role: "jumuia_leader", jumuiaCode: "christtheking", jumuiaName: "CHRIST THE KING" },
      { prefix: "stgregory", role: "jumuia_leader", jumuiaCode: "stgregory", jumuiaName: "ST. GREGORY" },
      { prefix: "stpacificus", role: "jumuia_leader", jumuiaCode: "stpacificus", jumuiaName: "ST. PACIFICUS" },
      { prefix: "treasurer", role: "treasurer" },
      { prefix: "secretary", role: "secretary" },
      { prefix: "choir", role: "choir_moderator" }
    ];

    let matchedRole = null;
    let membershipNumber = null;

    for (const pattern of rolePatterns) {
      if (password.startsWith(pattern.prefix)) {
        membershipNumber = password.replace(pattern.prefix, "");
        matchedRole = pattern;
        break;
      }
    }

    if (!matchedRole) {
      return res.status(400).json({ error: "Invalid role login format" });
    }

    const user = await prisma.user.findFirst({
      where: { 
        email: normalizedEmail,
        membership_number: membershipNumber
      },
      include: { 
        homeJumuia: true,
        leadingJumuia: true 
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.specialRole !== matchedRole.role) {
      return res.status(403).json({ error: `You are not assigned as ${matchedRole.role}` });
    }

    if (matchedRole.role === "jumuia_leader") {
      const jumuia = await prisma.jumuia.findFirst({
        where: { 
          code: matchedRole.jumuiaCode,
          leaders: { some: { id: user.id } }
        }
      });

      if (!jumuia) {
        return res.status(403).json({ error: `You are not the leader of ${matchedRole.jumuiaName}` });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastRoleLogin: new Date(),
        lastActive: new Date()
      }
    });

    let permissions = [];
    let accessLevel = "role";

    switch(matchedRole.role) {
      case "jumuia_leader":
        permissions = ["view_jumuia", "manage_announcements", "manage_chat"];
        accessLevel = "jumuia_leader";
        break;
      case "treasurer":
        permissions = ["view_contributions", "manage_contributions"];
        accessLevel = "treasurer";
        break;
      case "secretary":
        permissions = ["manage_announcements"];
        accessLevel = "secretary";
        break;
      case "choir_moderator":
        permissions = ["view_mass_programs", "manage_announcements"];
        accessLevel = "choir_moderator";
        break;
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: matchedRole.role,
        email: user.email,
        accessLevel,
        permissions,
        jumuiaCode: matchedRole.jumuiaCode || null,
        jumuiaName: matchedRole.jumuiaName || null
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: matchedRole.role,
        jumuia: matchedRole.jumuiaName || null,
        permissions,
        accessLevel
      }
    });

  } catch (err) {
    console.error("Role login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== GET CURRENT USER ==================
app.get("/api/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== RESET PASSWORD ==================
app.post("/api/auth/request-reset", async (req, res) => {
  try {
    const { phone, membershipNumber } = req.body;
    
    const attemptKey = `${phone}_${membershipNumber}`;
    const now = Date.now();
    
    let userAttempts = resetAttempts.get(attemptKey) || { attempts: 0, lastAttempt: now };
    
    if (userAttempts.attempts >= 5) {
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      if (userAttempts.lastAttempt > thirtyMinutesAgo) {
        const waitTime = Math.ceil((userAttempts.lastAttempt + 30 * 60 * 1000 - now) / 60000);
        return res.status(429).json({ 
          error: `Too many reset attempts. Please try again in ${waitTime} minutes.` 
        });
      } else {
        userAttempts = { attempts: 0, lastAttempt: now };
      }
    }
    
    const user = await prisma.user.findFirst({
      where: { phone, membership_number: membershipNumber }
    });
    
    if (!user) {
      return res.status(404).json({ error: "No account found" });
    }
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(now + 15 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry }
    });
    
    userAttempts.attempts += 1;
    userAttempts.lastAttempt = now;
    resetAttempts.set(attemptKey, userAttempts);
    
    res.json({ 
      message: "Reset code generated",
      code: resetCode,
      expiresIn: 15,
      attemptsRemaining: 5 - userAttempts.attempts
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/resend-code", async (req, res) => {
  try {
    const { phone, membershipNumber } = req.body;
    
    const attemptKey = `${phone}_${membershipNumber}`;
    const now = Date.now();
    
    let userAttempts = resetAttempts.get(attemptKey) || { attempts: 0, lastAttempt: now };
    
    if (userAttempts.attempts >= 5) {
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      if (userAttempts.lastAttempt > thirtyMinutesAgo) {
        const waitTime = Math.ceil((userAttempts.lastAttempt + 30 * 60 * 1000 - now) / 60000);
        return res.status(429).json({ 
          error: `Too many attempts. Try again in ${waitTime} minutes.` 
        });
      }
    }
    
    const user = await prisma.user.findFirst({
      where: { phone, membership_number: membershipNumber }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(now + 15 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry }
    });
    
    userAttempts.attempts += 1;
    userAttempts.lastAttempt = now;
    resetAttempts.set(attemptKey, userAttempts);
    
    res.json({ 
      message: "New code generated",
      code: resetCode,
      expiresIn: 15,
      attemptsRemaining: 5 - userAttempts.attempts
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/verify-reset", async (req, res) => {
  try {
    const { phone, membershipNumber, code, newPassword } = req.body;
    
    const attemptKey = `${phone}_${membershipNumber}`;
    const now = Date.now();
    
    let userAttempts = resetAttempts.get(attemptKey) || { attempts: 0, lastAttempt: now };
    
    if (userAttempts.attempts >= 5) {
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      if (userAttempts.lastAttempt > thirtyMinutesAgo) {
        const waitTime = Math.ceil((userAttempts.lastAttempt + 30 * 60 * 1000 - now) / 60000);
        return res.status(429).json({ 
          error: `Too many failed attempts. Try again in ${waitTime} minutes.` 
        });
      }
    }
    
    const user = await prisma.user.findFirst({
      where: { phone, membership_number: membershipNumber }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (user.resetCode !== code) {
      userAttempts.attempts += 1;
      userAttempts.lastAttempt = now;
      resetAttempts.set(attemptKey, userAttempts);
      
      const remaining = 5 - userAttempts.attempts;
      if (remaining <= 0) {
        return res.status(400).json({ error: "No attempts remaining. Try again in 30 minutes." });
      } else {
        return res.status(400).json({ error: `Invalid code. ${remaining} attempts remaining.` });
      }
    }
    
    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ error: "Code expired" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword, 
        resetCode: null,
        resetCodeExpiry: null
      }
    });
    
    resetAttempts.delete(attemptKey);
    
    res.json({ message: "Password updated successfully", success: true });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== PROTECTED ROUTES MIDDLEWARE ==================
app.use(authenticate, updateLastActive);

// ================== DASHBOARD STATS ==================
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

// ================== ANNOUNCEMENTS ==================
app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    
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

app.post("/api/announcements", authenticate, async (req, res) => {
  try {
    const { title, content, category, published } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title & Content required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized to create announcements" });
    }

    const announcement = await prisma.announcement.create({
      data: { 
        title, 
        content, 
        category: category || "General", 
        published: published ?? true,
        createdBy: req.user.userId
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

app.put("/api/announcements/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, published } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized to update announcements" });
    }

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

app.delete("/api/announcements/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized to delete announcements" });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================== MASS PROGRAMS ==================
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

app.post("/api/songs", authenticate, async (req, res) => {
  try {
    const { date, venue, ...songsData } = req.body;
    if (!date || !venue) return res.status(400).json({ error: "Date & Venue required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to create mass programs" });
    }

    const songsToCreate = [];
    for (const [type, title] of Object.entries(songsData)) {
      if (!title || title.trim() === "") continue;
      let existingSong = await prisma.song.findFirst({ where: { title: title.trim() } });
      if (!existingSong) existingSong = await prisma.song.create({ data: { title: title.trim() } });
      songsToCreate.push({ song: { connect: { id: existingSong.id } }, type });
    }

    const newProgram = await prisma.massProgram.create({
      data: { 
        date: new Date(date), 
        venue, 
        songs: { create: songsToCreate },
        createdBy: req.user.userId
      },
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

app.put("/api/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, venue, ...songsData } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to update mass programs" });
    }

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

app.delete("/api/songs/:id", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to delete mass programs" });
    }

    await prisma.massProgramSong.deleteMany({ where: { massProgramId: req.params.id } });
    await prisma.massProgram.delete({ where: { id: req.params.id } });
    res.json({ message: "Program deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA ROUTES ==================
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
      include: { homeJumuia: true },
    });

    res.json({ message: `Joined ${updatedUser.homeJumuia.name}`, user: updatedUser });
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
      include: { homeJumuia: true },
    });

    const message = jumuiaId
      ? `User assigned to ${updated.homeJumuia?.name}`
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
      include: { homeJumuia: true },
    });

    res.json({ message: "User removed from Jumuia", user: updatedUser });
  } catch (err) {
    console.error("Remove User from Jumuia Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Updated: Allow Jumuia Leaders and members to view their jumuia's contributions with personal pledge data
app.get("/api/contributions/jumuia", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true },
    });

    // Determine which jumuia to show
    let jumuiaId = user.homeJumuia?.id;
    
    // If user is a jumuia leader, show their leading jumuia
    if (user.specialRole === "jumuia_leader" && user.leadingJumuia) {
      jumuiaId = user.leadingJumuia.id;
    }

    if (!jumuiaId) return res.status(400).json({ error: "User has not been assigned to any Jumuia" });

    const contributions = await prisma.contributionType.findMany({
      where: { jumuiaId },
      include: {
        pledges: { 
          include: { 
            user: { 
              select: { id: true, fullName: true, membership_number: true } 
            } 
          } 
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the data to include the current user's pledge info
    const enhancedContributions = contributions.map(contribution => {
      // Find the current user's pledge in this contribution
      const userPledge = contribution.pledges.find(p => p.user.id === req.user.userId);
      
      return {
        id: contribution.id,
        title: contribution.title,
        description: contribution.description,
        amountRequired: contribution.amountRequired,
        deadline: contribution.deadline,
        createdAt: contribution.createdAt,
        // Add user-specific pledge data - THIS IS WHAT YOU NEED
        amountPaid: userPledge?.amountPaid || 0,
        pendingAmount: userPledge?.pendingAmount || 0,
        status: userPledge?.status || "NO_PLEDGE",
        message: userPledge?.message || null,
        pledgeId: userPledge?.id || null,
        // Keep the full pledges list for reference
        pledges: contribution.pledges
      };
    });

    res.json(enhancedContributions);
  } catch (err) {
    console.error("Error in /api/contributions/jumuia:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/contributions/jumuia", authenticate, async (req, res) => {
  try {
    const { title, description, amountRequired, deadline, jumuiaId } = req.body;
    if (!title || !amountRequired || !jumuiaId)
      return res.status(400).json({ error: "Title, amountRequired & jumuiaId are required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to create contributions" });
    }

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
      select: { id: true, fullName: true, email: true, role: true, specialRole: true },
    });
    res.json(users);
  } catch (err) {
    console.error("Fetch Jumuia Users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA ACCESS MIDDLEWARE ==================
async function checkJumuiaAccess(req, res, next) {
  try {
    const { jumuiaId } = req.params;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        leadingJumuia: true,
        homeJumuia: true 
      }
    });

    const isAdmin = user.role === "admin";
    const isLeaderOfThisJumuia = user.leadingJumuia?.id === jumuiaId;
    const isMemberOfThisJumuia = user.homeJumuia?.id === jumuiaId;

    if (isAdmin || isLeaderOfThisJumuia || isMemberOfThisJumuia) {
      req.jumuiaAccess = {
        isAdmin,
        isLeader: isLeaderOfThisJumuia,
        isMember: isMemberOfThisJumuia
      };
      return next();
    }

    return res.status(403).json({ error: "Access denied to this jumuia" });
  } catch (err) {
    console.error("Access check error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ================== JUMUIA DETAILS ==================
app.get("/api/jumuia/:identifier", authenticate, async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user.userId;

    const jumuia = await prisma.jumuia.findFirst({
      where: {
        OR: [
          { id: identifier },
          { code: identifier }
        ]
      },
      include: {
        leaders: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            specialRole: true
          }
        },
        members: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            membership_number: true,
            role: true,
            specialRole: true,
            lastActive: true
          },
          orderBy: { fullName: "asc" }
        },
        _count: {
          select: {
            members: true,
            contributions: true,
            announcements: true,
            chatRooms: true
          }
        }
      }
    });

    if (!jumuia) {
      return res.status(404).json({ error: "Jumuia not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        leadingJumuia: true,
        homeJumuia: true 
      }
    });

    const isAdmin = user.role === "admin";
    const isLeaderOfThisJumuia = user.leadingJumuia?.id === jumuia.id;
    const isMemberOfThisJumuia = user.homeJumuia?.id === jumuia.id;

    if (!isAdmin && !isLeaderOfThisJumuia && !isMemberOfThisJumuia) {
      return res.status(403).json({ error: "Access denied to this jumuia" });
    }

    res.json(jumuia);
  } catch (err) {
    console.error("Error fetching jumuia details:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA CONTRIBUTIONS ==================
app.get("/api/jumuia/:jumuiaId/contributions", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;

    const contributions = await prisma.contributionType.findMany({
      where: { jumuiaId },
      include: {
        pledges: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                membership_number: true,
                email: true,
                profileImage: true
              }
            },
            pledgeMessages: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: { pledges: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const enhancedContributions = contributions.map(c => {
      const totalRaised = c.pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const totalPending = c.pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
      const completedPledges = c.pledges.filter(p => p.status === "COMPLETED").length;
      const pendingPledges = c.pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length;
      const approvedPledges = c.pledges.filter(p => p.status === "APPROVED").length;
      
      return {
        ...c,
        deadline: c.deadline?.toISOString(),
        createdAt: c.createdAt.toISOString(),
        stats: {
          totalRaised,
          totalPending,
          totalCommitted: totalRaised + totalPending,
          progress: c.amountRequired > 0 ? (totalRaised / c.amountRequired) * 100 : 0,
          completedPledges,
          pendingPledges,
          approvedPledges,
          totalPledges: c._count.pledges
        }
      };
    });

    res.json(enhancedContributions);
  } catch (err) {
    console.error("Error fetching jumuia contributions:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/contributions", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    if (!title || !amountRequired) {
      return res.status(400).json({ error: "Title and amountRequired are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = req.jumuiaAccess.isLeader;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to create contributions" });
    }

    const contribution = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
        jumuiaId
      }
    });

    const members = await prisma.user.findMany({
      where: { jumuiaId },
      select: { id: true }
    });

    if (members.length > 0) {
      await prisma.pledge.createMany({
        data: members.map(m => ({
          userId: m.id,
          contributionTypeId: contribution.id,
          pendingAmount: 0,
          amountPaid: 0,
          status: "PENDING"
        }))
      });
    }

    if (members.length > 0) {
      const now = new Date();
      const notifications = members.map(m => ({
        id: `jcontrib-${contribution.id}-${m.id}-${Date.now()}`,
        userId: m.id,
        jumuiaId,
        type: "contribution",
        title: "💰 New Jumuia Contribution",
        message: `New contribution "${title}" for your jumuia. Target: ${amountRequired}`,
        data: { contributionId: contribution.id },
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({ data: notifications });

      notifications.forEach(notif => {
        io.to(notif.userId).emit("new_notification", {
          ...notif,
          createdAt: now.toISOString()
        });
      });
    }

    res.status(201).json(contribution);
  } catch (err) {
    console.error("Error creating jumuia contribution:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/contributions/:contributionId", authenticate, async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    const contribution = await prisma.contributionType.findUnique({
      where: { id: contributionId }
    });

    if (!contribution) {
      return res.status(404).json({ error: "Contribution not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === contribution.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to edit contributions" });
    }

    const updated = await prisma.contributionType.update({
      where: { id: contributionId },
      data: {
        title,
        description,
        amountRequired: amountRequired ? parseFloat(amountRequired) : contribution.amountRequired,
        deadline: deadline ? new Date(deadline) : contribution.deadline
      }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating contribution:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jumuia/contributions/:contributionId", authenticate, async (req, res) => {
  try {
    const { contributionId } = req.params;

    const contribution = await prisma.contributionType.findUnique({
      where: { id: contributionId }
    });

    if (!contribution) {
      return res.status(404).json({ error: "Contribution not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === contribution.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to delete contributions" });
    }

    await prisma.pledge.deleteMany({
      where: { contributionTypeId: contributionId }
    });

    await prisma.contributionType.delete({
      where: { id: contributionId }
    });

    res.json({ message: "Contribution deleted successfully" });
  } catch (err) {
    console.error("Error deleting contribution:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA PLEDGE ACTIONS ==================
app.put("/api/jumuia/pledges/:pledgeId/approve", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    
    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: true,
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to approve pledges" });
    }

    if (pledge.pendingAmount === 0) {
      return res.status(400).json({ error: "No pending amount to approve" });
    }

    const newAmountPaid = pledge.amountPaid + pledge.pendingAmount;
    const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: newAmountPaid,
        pendingAmount: 0,
        status: newStatus,
        approvedById: req.user.userId,
        approvedAt: new Date()
      },
      include: {
        user: true,
        contributionType: true
      }
    });

    const notification = await prisma.notification.create({
      data: {
        userId: pledge.userId,
        jumuiaId: pledge.contributionType.jumuiaId,
        type: "pledge_approved",
        title: newStatus === "COMPLETED" ? "🎉 Pledge Completed!" : "✅ Pledge Approved",
        message: newStatus === "COMPLETED" 
          ? `Your pledge for "${pledge.contributionType.title}" has been fully paid! Thank you.`
          : `Your pledge of ${pledge.pendingAmount} for "${pledge.contributionType.title}" has been approved.`,
        data: { pledgeId: updated.id },
        read: false,
        createdAt: new Date()
      }
    });

    io.to(pledge.userId).emit("new_notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString()
    });

    res.json(updated);
  } catch (err) {
    console.error("Error approving pledge:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/pledges/:pledgeId/manual-add", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: true,
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to add payments" });
    }

    let newPendingAmount = pledge.pendingAmount;
    let newAmountPaid = pledge.amountPaid;
    let approvedById = null;
    let approvedAt = null;
    
    if (pledge.pendingAmount > 0) {
      if (amount <= pledge.pendingAmount) {
        newPendingAmount = pledge.pendingAmount - amount;
      } else {
        newPendingAmount = 0;
        newAmountPaid = pledge.amountPaid + (amount - pledge.pendingAmount);
        approvedById = req.user.userId;
        approvedAt = new Date();
      }
    } else {
      newAmountPaid = pledge.amountPaid + amount;
    }

    if (newAmountPaid > pledge.contributionType.amountRequired) {
      return res.status(400).json({ error: "Total paid cannot exceed required amount" });
    }

    const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : pledge.status;

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: newAmountPaid,
        pendingAmount: newPendingAmount,
        status: newStatus,
        approvedById,
        approvedAt,
        createdByAdmin: true
      }
    });

    let title = "💰 Payment Added";
    let message = `KES ${amount} has been added to your pledge for "${pledge.contributionType.title}".`;
    
    if (newStatus === "COMPLETED") {
      title = "🎉 Pledge Completed!";
      message = `Your pledge for "${pledge.contributionType.title}" has been fully paid! Thank you.`;
    } else if (pledge.pendingAmount > 0 && newPendingAmount === 0) {
      message = `KES ${amount} cleared your pending pledge for "${pledge.contributionType.title}".`;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: pledge.userId,
        jumuiaId: pledge.contributionType.jumuiaId,
        type: "payment_added",
        title,
        message,
        data: { pledgeId: updated.id },
        read: false,
        createdAt: new Date()
      }
    });

    io.to(pledge.userId).emit("new_notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString()
    });

    res.json(updated);
  } catch (err) {
    console.error("Error adding manual payment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/pledges/:pledgeId/edit-message", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { message } = req.body;

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { contributionType: true }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to edit messages" });
    }

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: { message }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/pledges/:pledgeId/reset", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { contributionType: true }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to reset pledges" });
    }

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: 0,
        pendingAmount: 0,
        message: null,
        status: "PENDING",
        approvedById: null,
        approvedAt: null
      }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error resetting pledge:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA BULK ACTIONS ==================
app.post("/api/jumuia/contributions/bulk-delete", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const firstCampaign = await prisma.contributionType.findUnique({
      where: { id: ids[0] }
    });

    if (!firstCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === firstCampaign.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to delete campaigns" });
    }

    if (isLeader && !isAdmin) {
      const campaigns = await prisma.contributionType.findMany({
        where: {
          id: { in: ids }
        }
      });

      const allSameJumuia = campaigns.every(c => c.jumuiaId === firstCampaign.jumuiaId);
      if (!allSameJumuia) {
        return res.status(403).json({ error: "Cannot delete campaigns from different jumuias" });
      }
    }

    await prisma.pledge.deleteMany({
      where: {
        contributionTypeId: { in: ids }
      }
    });

    const result = await prisma.contributionType.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    res.json({ 
      message: `Successfully deleted ${result.count} campaigns`,
      count: result.count 
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/contributions/bulk-duplicate", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const firstCampaign = await prisma.contributionType.findUnique({
      where: { id: ids[0] }
    });

    if (!firstCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === firstCampaign.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to duplicate campaigns" });
    }

    if (isLeader && !isAdmin) {
      const campaigns = await prisma.contributionType.findMany({
        where: {
          id: { in: ids }
        }
      });

      const allSameJumuia = campaigns.every(c => c.jumuiaId === firstCampaign.jumuiaId);
      if (!allSameJumuia) {
        return res.status(403).json({ error: "Cannot duplicate campaigns from different jumuias" });
      }
    }

    const campaignsToDuplicate = await prisma.contributionType.findMany({
      where: {
        id: { in: ids }
      }
    });

    const duplicatedCampaigns = [];

    for (const campaign of campaignsToDuplicate) {
      const newCampaign = await prisma.contributionType.create({
        data: {
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          amountRequired: campaign.amountRequired,
          deadline: campaign.deadline,
          jumuiaId: campaign.jumuiaId
        }
      });

      const members = await prisma.user.findMany({
        where: { jumuiaId: campaign.jumuiaId },
        select: { id: true }
      });

      if (members.length > 0) {
        await prisma.pledge.createMany({
          data: members.map(m => ({
            userId: m.id,
            contributionTypeId: newCampaign.id,
            pendingAmount: 0,
            amountPaid: 0,
            status: "PENDING"
          }))
        });
      }

      const completeCampaign = await prisma.contributionType.findUnique({
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

      duplicatedCampaigns.push(completeCampaign);
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

app.post("/api/jumuia/pledges/bulk-approve", authenticate, async (req, res) => {
  try {
    const { pledgeIds } = req.body;

    if (!pledgeIds || !Array.isArray(pledgeIds) || pledgeIds.length === 0) {
      return res.status(400).json({ error: "No pledge IDs provided" });
    }

    const firstPledge = await prisma.pledge.findUnique({
      where: { id: pledgeIds[0] },
      include: { contributionType: true }
    });

    if (!firstPledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === firstPledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to approve pledges" });
    }

    const results = [];

    for (const pledgeId of pledgeIds) {
      const pledge = await prisma.pledge.findUnique({
        where: { id: pledgeId },
        include: { contributionType: true }
      });

      if (!pledge || pledge.pendingAmount === 0) continue;

      const newAmountPaid = pledge.amountPaid + pledge.pendingAmount;
      const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";

      const updated = await prisma.pledge.update({
        where: { id: pledgeId },
        data: {
          amountPaid: newAmountPaid,
          pendingAmount: 0,
          status: newStatus,
          approvedById: req.user.userId,
          approvedAt: new Date()
        }
      });

      results.push(updated);

      await prisma.notification.create({
        data: {
          userId: pledge.userId,
          jumuiaId: pledge.contributionType.jumuiaId,
          type: "pledge_approved",
          title: newStatus === "COMPLETED" ? "🎉 Pledge Completed!" : "✅ Pledge Approved",
          message: newStatus === "COMPLETED" 
            ? `Your pledge for "${pledge.contributionType.title}" has been fully paid!`
            : `Your pledge of ${pledge.pendingAmount} for "${pledge.contributionType.title}" has been approved.`,
          data: { pledgeId: updated.id },
          read: false,
          createdAt: new Date()
        }
      });
    }

    res.json({ 
      message: `Successfully approved ${results.length} pledges`,
      count: results.length,
      pledges: results
    });
  } catch (err) {
    console.error("Bulk approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA MEMBERS ==================
app.get("/api/jumuia/:jumuiaId/members", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const where = { jumuiaId };
    
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { membership_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImage: true,
        membership_number: true,
        role: true,
        specialRole: true,
        lastActive: true,
        createdAt: true
      },
      orderBy: { fullName: "asc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.user.count({ where });

    res.json({
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/members", authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isLeader = user.leadingJumuia?.id === jumuiaId;

    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Not authorized to add members" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId },
      select: {
        id: true,
        fullName: true,
        email: true,
        jumuiaId: true
      }
    });

    res.json({ message: "Member added successfully", user: updatedUser });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jumuia/:jumuiaId/members/:userId", authenticate, async (req, res) => {
  try {
    const { jumuiaId, userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isLeader = user.leadingJumuia?.id === jumuiaId;

    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Not authorized to remove members" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId: null },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    res.json({ message: "Member removed successfully", user: updatedUser });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/leaders", authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can assign leaders" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        specialRole: "jumuia_leader",
        assignedJumuiaId: jumuiaId
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        specialRole: true,
        leadingJumuia: true
      }
    });

    const jumuia = await prisma.jumuia.findUnique({
      where: { id: jumuiaId }
    });

    await prisma.notification.create({
      data: {
        userId,
        jumuiaId,
        type: "role_change",
        title: "👑 You are now a Jumuia Leader",
        message: `You have been appointed as leader of ${jumuia.name}`,
        read: false,
        createdAt: new Date()
      }
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error assigning leader:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jumuia/:jumuiaId/leaders/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can remove leaders" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        specialRole: null,
        assignedJumuiaId: null
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        specialRole: true
      }
    });

    res.json({ message: "Leader removed successfully", user: updatedUser });
  } catch (err) {
    console.error("Error removing leader:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA CHAT ==================
const jumuiaChatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const chatDir = path.join(__dirname, "uploads/jumuia-chat");
      if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
      cb(null, chatDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `jchat_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|pdf|doc|docx|txt/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype.split("/")[1]);
    if (ext || mime) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

app.use("/uploads/jumuia-chat", express.static(path.join(__dirname, "uploads/jumuia-chat")));

app.post("/api/jumuia/chat/upload", authenticate, jumuiaChatUpload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      url: `${baseUrl}/uploads/jumuia-chat/${file.filename}`,
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

async function ensureJumuiaChatRoom(jumuiaId) {
  let room = await prisma.jumuiaChatRoom.findFirst({
    where: { jumuiaId, name: "general" }
  });

  if (!room) {
    room = await prisma.jumuiaChatRoom.create({
      data: {
        name: "general",
        jumuiaId,
        description: "General discussion"
      }
    });
  }

  return room;
}

app.get("/api/jumuia/:jumuiaId/chat/rooms", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;

    const rooms = await prisma.jumuiaChatRoom.findMany({
      where: { jumuiaId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            user: {
              select: { id: true, fullName: true, profileImage: true }
            }
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { lastMessageAt: "desc" }
    });

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching chat rooms:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/chat/rooms", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isLeader = req.jumuiaAccess.isLeader;

    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Only admins and leaders can create rooms" });
    }

    const existingRoom = await prisma.jumuiaChatRoom.findFirst({
      where: { jumuiaId, name }
    });

    if (existingRoom) {
      return res.status(400).json({ error: "Room with this name already exists" });
    }

    const room = await prisma.jumuiaChatRoom.create({
      data: {
        name,
        description,
        jumuiaId,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(room);
  } catch (err) {
    console.error("Error creating chat room:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/jumuia/chat/rooms/:roomId/messages", authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { cursor = null, limit = 50 } = req.query;

    const room = await prisma.jumuiaChatRoom.findUnique({
      where: { id: roomId },
      include: { jumuia: true }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isMember = user.homeJumuia?.id === room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === room.jumuiaId;

    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await prisma.jumuiaChatMessage.findMany({
      where: { 
        roomId,
        isDeleted: false 
      },
      take: parseInt(limit),
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            role: true
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
          where: { userId: req.user.userId },
          select: { id: true, readAt: true }
        },
        readReceipts: {
          where: { userId: req.user.userId },
          select: { id: true }
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

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      isMentioned: m.mentions.length > 0,
      isRead: m.readReceipts.length > 0
    }));

    const mentionIds = messages.flatMap(m => 
      m.mentions.filter(ment => !ment.readAt).map(ment => ment.id)
    );

    if (mentionIds.length > 0) {
      await prisma.jumuiaMention.updateMany({
        where: { id: { in: mentionIds } },
        data: { readAt: new Date() }
      });
    }

    res.json({
      messages: formattedMessages,
      nextCursor: messages.length === parseInt(limit) ? messages[messages.length - 1].id : null
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/chat/rooms/:roomId/messages", authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, replyToId, attachments } = req.body;

    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const room = await prisma.jumuiaChatRoom.findUnique({
      where: { id: roomId },
      include: { jumuia: true }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isMember = user.homeJumuia?.id === room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === room.jumuiaId;

    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }

    const message = await prisma.jumuiaChatMessage.create({
      data: {
        content: content || "",
        userId: req.user.userId,
        roomId,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            role: true
          }
        }
      }
    });

    await prisma.jumuiaChatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() }
    });

    if (replyToId) {
      await prisma.jumuiaChatMessage.update({
        where: { id: replyToId },
        data: { replyCount: { increment: 1 } }
      });
    }

    const mentionRegex = /@(\w+)/g;
    let match;
    const mentions = [];

    if (content) {
      while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1];
        const mentionedUser = await prisma.user.findFirst({
          where: { 
            fullName: { contains: username, mode: 'insensitive' },
            homeJumuia: { id: room.jumuiaId }
          }
        });

        if (mentionedUser && mentionedUser.id !== req.user.userId) {
          mentions.push({
            userId: mentionedUser.id,
            messageId: message.id
          });
        }
      }
    }

    if (mentions.length > 0) {
      await prisma.jumuiaMention.createMany({ data: mentions });

      const now = new Date();
      const notifications = mentions.map(m => ({
        id: `jmention-${message.id}-${m.userId}-${Date.now()}`,
        userId: m.userId,
        jumuiaId: room.jumuiaId,
        type: "chat_mention",
        title: "👤 You were mentioned",
        message: `${user.fullName} mentioned you in ${room.name}`,
        data: { messageId: message.id, roomId, jumuiaId: room.jumuiaId },
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({ data: notifications });

      notifications.forEach(notif => {
        io.to(notif.userId).emit("new_notification", {
          ...notif,
          createdAt: now.toISOString()
        });
      });
    }

    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      reactions: [],
      mentions: []
    };

    io.to(`jumuia-${room.jumuiaId}`).emit("new_jumuia_message", formattedMessage);

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/chat/messages/:messageId/reactions", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

    const message = await prisma.jumuiaChatMessage.findUnique({
      where: { id: messageId },
      include: { room: { include: { jumuia: true } } }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });

    const isAdmin = user.role === "admin";
    const isMember = user.homeJumuia?.id === message.room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === message.room.jumuiaId;

    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await prisma.jumuiaChatReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId: req.user.userId,
          reaction
        }
      }
    });

    let result;
    if (existing) {
      await prisma.jumuiaChatReaction.delete({
        where: { id: existing.id }
      });
      result = { action: "removed", reaction };
    } else {
      const newReaction = await prisma.jumuiaChatReaction.create({
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
      result = {
        action: "added",
        reaction: {
          ...newReaction,
          createdAt: newReaction.createdAt.toISOString()
        }
      };
    }

    const reactions = await prisma.jumuiaChatReaction.groupBy({
      by: ['reaction'],
      where: { messageId },
      _count: true
    });

    const reactionCount = reactions.reduce((acc, r) => {
      acc[r.reaction] = r._count;
      return acc;
    }, {});

    await prisma.jumuiaChatMessage.update({
      where: { id: messageId },
      data: { reactionCount }
    });

    io.to(`jumuia-${message.room.jumuiaId}`).emit("jumuia_reaction_updated", {
      messageId,
      reactionCount,
      userId: req.user.userId,
      reaction,
      action: result.action
    });

    res.json(result);
  } catch (err) {
    console.error("Error handling reaction:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/chat/messages/:messageId/read", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.jumuiaChatMessage.findUnique({
      where: { id: messageId },
      include: { room: { include: { jumuia: true } } }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existing = await prisma.jumuiaReadReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: req.user.userId
        }
      }
    });

    if (!existing) {
      await prisma.jumuiaReadReceipt.create({
        data: {
          messageId,
          userId: req.user.userId,
          readAt: new Date()
        }
      });

      io.to(`jumuia-${message.room.jumuiaId}`).emit("jumuia_message_read", {
        messageId,
        userId: req.user.userId
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA ANNOUNCEMENTS ==================
app.get("/api/jumuia/:jumuiaId/announcements", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;

    const announcements = await prisma.announcement.findMany({
      where: { 
        jumuiaId,
        published: true 
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = announcements.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching jumuia announcements:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/announcements", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isLeader = req.jumuiaAccess.isLeader;

    if (!isAdmin && !isSecretary && !isLeader) {
      return res.status(403).json({ error: "Not authorized to create announcements" });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category: category || "General",
        published: true,
        jumuiaId,
        createdBy: req.user.userId
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    const members = await prisma.user.findMany({
      where: { jumuiaId },
      select: { id: true }
    });

    if (members.length > 0) {
      const now = new Date();
      const notifications = members.map(m => ({
        id: `jann-${announcement.id}-${m.id}-${Date.now()}`,
        userId: m.id,
        jumuiaId,
        type: "announcement",
        title: "📢 New Jumuia Announcement",
        message: title,
        data: { announcementId: announcement.id },
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({ data: notifications });

      notifications.forEach(notif => {
        io.to(notif.userId).emit("new_notification", {
          ...notif,
          createdAt: now.toISOString()
        });
      });
    }

    const formatted = {
      ...announcement,
      createdAt: announcement.createdAt.toISOString()
    };

    res.status(201).json(formatted);
  } catch (err) {
    console.error("Error creating jumuia announcement:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA NOTIFICATIONS ==================
app.get("/api/jumuia/:jumuiaId/notifications", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const userId = req.user.userId;

    const notifications = await prisma.notification.findMany({
      where: { 
        userId,
        jumuiaId 
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formatted = notifications.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching jumuia notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== EXISTING CHAT ROUTES ==================
async function ensureDefaultChatRoom() {
  const room = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  if (!room) await prisma.chatRoom.create({ data: { name: "default" } });
}
ensureDefaultChatRoom();

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

app.post("/api/chat", authenticate, async (req, res) => {
  try {
    const { content, replyToId, attachments } = req.body;
    
    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    const message = await prisma.message.create({ 
      data: { 
        content: content || "",
        userId: req.user.userId, 
        roomId: defaultRoom.id,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null
      } 
    });
    
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

// ================== ENHANCED CHAT ==================
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|pdf|doc|docx|txt/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype.split("/")[1]);
    if (ext || mime) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

app.use("/uploads/chat", express.static(path.join(__dirname, "uploads/chat")));

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

app.post("/api/chat/enhanced", authenticate, async (req, res) => {
  try {
    const { content, replyToId, attachments } = req.body;
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
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

    if (replyToId) {
      await prisma.message.update({
        where: { id: replyToId },
        data: { replyCount: { increment: 1 } }
      });
    }

    await prisma.chatRoom.update({
      where: { id: defaultRoom.id },
      data: { lastMessageAt: new Date() }
    });

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

    io.emit("new_message", formattedMessage);

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error creating enhanced message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat/:messageId/reactions", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

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
      await prisma.messageReaction.delete({
        where: { id: existing.id }
      });
      res.json({ message: "Reaction removed", action: "removed" });
    } else {
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

      io.emit("new_reaction", formattedReaction);

      res.status(201).json(formattedReaction);
    }
  } catch (err) {
    console.error("Error adding reaction:", err);
    res.status(500).json({ error: err.message });
  }
});

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
      await prisma.pin.delete({
        where: { id: existingPin.id }
      });
      io.emit("message_unpinned", { messageId, roomId: message.roomId });
      res.json({ message: "Message unpinned" });
    } else {
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
      await prisma.blockedUser.delete({
        where: { id: existing.id }
      });
      res.json({ message: "User unblocked" });
    } else {
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

// ================== ADMIN STATS ==================
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

// ================== USER MANAGEMENT ==================
app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        fullName: true,
        homeJumuia: true,
        leadingJumuia: true,
        membership_number: true, 
        email: true, 
        phone: true,
        role: true,
        specialRole: true,
        assignedJumuiaId: true,
        lastRoleLogin: true,
        profileImage: true, 
        createdAt: true, 
        lastActive: true 
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const usersWithStatus = users.map((u) => ({
      ...u,
      online: u.lastActive && now - new Date(u.lastActive) < 10 * 60 * 1000,
      createdAt: u.createdAt?.toISOString(),
      lastActive: u.lastActive?.toISOString(),
      lastRoleLogin: u.lastRoleLogin?.toISOString()
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
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
    const { role, specialRole, assignedJumuiaId } = req.body;

    const allowedRoles = ["member", "admin"];
    const allowedSpecialRoles = ["jumuia_leader", "treasurer", "secretary", "choir_moderator", null];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (specialRole && !allowedSpecialRoles.includes(specialRole)) {
      return res.status(400).json({ error: "Invalid special role" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    if (req.user.userId === id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role" });
    }

    if (specialRole === "jumuia_leader" && assignedJumuiaId) {
      const jumuia = await prisma.jumuia.findUnique({
        where: { id: assignedJumuiaId }
      });
      if (!jumuia) {
        return res.status(400).json({ error: "Jumuia not found" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        role: role || existingUser.role,
        specialRole: specialRole !== undefined ? specialRole : existingUser.specialRole,
        assignedJumuiaId: specialRole === "jumuia_leader" ? assignedJumuiaId : null
      },
      select: { 
        id: true, 
        fullName: true, 
        email: true, 
        role: true,
        specialRole: true,
        assignedJumuiaId: true,
        homeJumuia: true,
        leadingJumuia: true
      },
    });

    res.json({ message: "Role updated successfully", user: updatedUser });
  } catch (err) {
    console.error("ROLE UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== PROFILE IMAGE ==================
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

// ================== CONTRIBUTION SYSTEM ==================
// ================== CONTRIBUTION SYSTEM ==================

// ================== GET USER'S PERSONAL PLEDGES (GLOBAL CONTRIBUTIONS) ==================
app.get("/api/my-pledges", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all pledges for the current user (only global contributions, not jumuia-specific)
    const pledges = await prisma.pledge.findMany({
      where: { 
        userId,
        contributionType: {
          jumuiaId: null // Only global contributions
        }
      },
      include: { 
        contributionType: {
          include: { 
            jumuia: true 
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the response to match what your frontend expects
    const formatted = pledges.map(p => ({
      id: p.id,
      title: p.contributionType.title,
      description: p.contributionType.description,
      amountRequired: p.contributionType.amountRequired,
      pendingAmount: p.pendingAmount || 0,
      amountPaid: p.amountPaid || 0,
      message: p.message,
      status: p.status,
      contributionTypeId: p.contributionType.id,
      jumuiaId: p.contributionType.jumuiaId,
      deadline: p.contributionType.deadline?.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      totalCommitted: (p.amountPaid || 0) + (p.pendingAmount || 0),
      remainingNeeded: p.contributionType.amountRequired - (p.amountPaid || 0),
      progress: p.contributionType.amountRequired > 0 
        ? ((p.amountPaid || 0) / p.contributionType.amountRequired) * 100 
        : 0
    }));

    console.log(`Found ${formatted.length} global pledges for user ${userId}`);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching my pledges:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== GET SINGLE PLEDGE DETAILS ==================
app.get("/api/my-pledges/:pledgeId", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const userId = req.user.userId;

    const pledge = await prisma.pledge.findFirst({
      where: { 
        id: pledgeId,
        userId // Ensure the pledge belongs to the current user
      },
      include: {
        contributionType: {
          include: { 
            jumuia: true 
          }
        },
        pledgeMessages: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                role: true,
                profileImage: true
              }
            }
          }
        }
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const formatted = {
      id: pledge.id,
      title: pledge.contributionType.title,
      description: pledge.contributionType.description,
      amountRequired: pledge.contributionType.amountRequired,
      pendingAmount: pledge.pendingAmount || 0,
      amountPaid: pledge.amountPaid || 0,
      message: pledge.message,
      status: pledge.status,
      contributionTypeId: pledge.contributionType.id,
      deadline: pledge.contributionType.deadline?.toISOString(),
      createdAt: pledge.createdAt.toISOString(),
      updatedAt: pledge.updatedAt?.toISOString(),
      totalCommitted: (pledge.amountPaid || 0) + (pledge.pendingAmount || 0),
      remainingNeeded: pledge.contributionType.amountRequired - (pledge.amountPaid || 0),
      progress: pledge.contributionType.amountRequired > 0 
        ? ((pledge.amountPaid || 0) / pledge.contributionType.amountRequired) * 100 
        : 0,
      messages: pledge.pledgeMessages.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString()
      }))
    };

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching pledge details:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== GET USER CONTRIBUTION STATS ==================
app.get("/api/my-contribution-stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pledges = await prisma.pledge.findMany({
      where: { 
        userId,
        contributionType: {
          jumuiaId: null // Only global contributions
        }
      },
      include: {
        contributionType: true
      }
    });

    const stats = {
      totalPledged: pledges.reduce((sum, p) => sum + (p.amountPaid || 0) + (p.pendingAmount || 0), 0),
      totalPaid: pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      totalPending: pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0),
      totalRequired: pledges.reduce((sum, p) => sum + p.contributionType.amountRequired, 0),
      completedCount: pledges.filter(p => p.status === "COMPLETED").length,
      pendingCount: pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length,
      approvedCount: pledges.filter(p => p.status === "APPROVED").length,
      totalCampaigns: pledges.length,
      
      byCampaign: pledges.map(p => ({
        campaignId: p.contributionType.id,
        title: p.contributionType.title,
        amountPaid: p.amountPaid || 0,
        amountPending: p.pendingAmount || 0,
        status: p.status,
        progress: p.contributionType.amountRequired > 0 
          ? ((p.amountPaid || 0) / p.contributionType.amountRequired) * 100 
          : 0
      }))
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching contribution stats:", err);
    res.status(500).json({ error: err.message });
  }
});


  // ... your existing calculatePledgeState function ...




function calculatePledgeState(currentPledge, operation, amount = 0) {
  const { amountPaid, pendingAmount, status } = currentPledge;
  const amountRequired = currentPledge.contributionType.amountRequired;
  
  let newAmountPaid = amountPaid;
  let newPendingAmount = pendingAmount;
  let approvedById = null;
  let approvedAt = null;
  
  switch(operation) {
    case 'CREATE_PLEDGE':
      newPendingAmount = pendingAmount + amount;
      break;
      
    case 'APPROVE':
      newAmountPaid = amountPaid + pendingAmount;
      newPendingAmount = 0;
      approvedById = currentPledge.approvedById;
      approvedAt = currentPledge.approvedAt;
      break;
      
    case 'MANUAL_ADD':
      const amountToAdd = amount;
      
      if (pendingAmount > 0) {
        if (amountToAdd <= pendingAmount) {
          newPendingAmount = pendingAmount - amountToAdd;
        } else {
          newPendingAmount = 0;
          newAmountPaid = amountPaid + (amountToAdd - pendingAmount);
        }
      } else {
        newAmountPaid = amountPaid + amountToAdd;
      }
      break;
  }
  
  const totalPaid = newAmountPaid;
  const totalPending = newPendingAmount;
  const totalCommitted = totalPaid + totalPending;
  
  let newStatus = status;
  if (totalPaid >= amountRequired) {
    newStatus = 'COMPLETED';
  } else if (totalPaid > 0 && totalPending === 0) {
    newStatus = 'APPROVED';
  } else if (totalPending > 0) {
    newStatus = 'PENDING';
  }
  
  if (totalCommitted > amountRequired) {
    throw new Error(`Total committed (${totalCommitted}) cannot exceed required amount (${amountRequired})`);
  }
  
  return {
    amountPaid: newAmountPaid,
    pendingAmount: newPendingAmount,
    status: newStatus,
    totalPaid,
    totalPending,
    totalCommitted,
    remainingNeeded: amountRequired - totalPaid,
    approvedById,
    approvedAt
  };
}



app.post("/api/contribution-types", authenticate, async (req, res) => {
  try {
    const { title, description, amountRequired, deadline } = req.body;
    if (!title || !amountRequired)
      return res.status(400).json({ error: "Title & amountRequired required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to create contribution campaigns" });
    }

    const newType = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
      },
    });

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

app.get("/api/contribution-types", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to view contributions" });
    }

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

app.put("/api/contribution-types/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to update contributions" });
    }

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

app.delete("/api/contribution-types/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to delete contributions" });
    }

    await prisma.pledge.deleteMany({ where: { contributionTypeId: id } });
    await prisma.contributionType.delete({ where: { id } });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contribution-types/bulk-delete", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to delete campaigns" });
    }

    console.log(`Bulk deleting ${ids.length} campaigns:`, ids);

    await prisma.pledge.deleteMany({
      where: {
        contributionTypeId: {
          in: ids
        }
      }
    });

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

app.post("/api/contribution-types/bulk-duplicate", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to duplicate campaigns" });
    }

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

    for (const campaign of campaignsToDuplicate) {
      const newCampaign = await prisma.contributionType.create({
        data: {
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          amountRequired: campaign.amountRequired,
          deadline: campaign.deadline,
        }
      });

      if (campaign.pledges && campaign.pledges.length > 0) {
        await prisma.pledge.createMany({
          data: campaign.pledges.map(pledge => ({
            userId: pledge.userId,
            contributionTypeId: newCampaign.id,
            amountPaid: 0,
            pendingAmount: 0,
            message: pledge.message,
            status: "PENDING",
          }))
        });
      }

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

    if (type.jumuiaId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (user.jumuiaId !== type.jumuiaId) {
        return res.status(403).json({ error: "You are not a member of this jumuia" });
      }
    }

    let pledge = await prisma.pledge.findFirst({
      where: { userId: req.user.userId, contributionTypeId },
      include: { contributionType: true }
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
        include: { contributionType: true }
      });
    }

    const currentTotal = (pledge.amountPaid || 0) + (pledge.pendingAmount || 0);
    const remainingNeeded = type.amountRequired - currentTotal;
    
    if (amount > remainingNeeded) {
      return res.status(400).json({ 
        error: `Amount exceeds remaining needed. Maximum: ${remainingNeeded}` 
      });
    }

    const newState = calculatePledgeState(pledge, 'CREATE_PLEDGE', parseFloat(amount));

    const updated = await prisma.pledge.update({
      where: { id: pledge.id },
      data: {
        pendingAmount: newState.pendingAmount,
        message: message || pledge.message,
        status: newState.status,
      },
    });

    // Get admins, treasurers, and leaders
    const adminsAndTreasurers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "admin" },
          { specialRole: "treasurer" }
        ]
      },
      select: { id: true }
    });

    if (type.jumuiaId) {
      const leaders = await prisma.user.findMany({
        where: { 
          leadingJumuia: { id: type.jumuiaId }
        },
        select: { id: true }
      });
      adminsAndTreasurers.push(...leaders);
    }

    const uniqueNotifyIds = [...new Set(adminsAndTreasurers.map(u => u.id))];

    // Create notifications with user's name
    if (uniqueNotifyIds.length > 0) {
      const now = new Date();
      
      // Get the pledger's name
      const pledger = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { fullName: true }
      });
      const pledgerName = pledger?.fullName || 'A user';
      
      const notifications = uniqueNotifyIds.map(id => ({
        id: `pledge-${pledge.id}-${id}-${Date.now()}`,
        userId: id,
        jumuiaId: type.jumuiaId,
        type: "new_pledge",
        title: "💰 New Pledge",
        message: `${pledgerName} pledged ${amount} for "${type.title}"`,
        data: { 
          pledgeId: pledge.id,
          contributionId: type.id,
          amount,
          pledgerName
        },
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });

      // Emit socket events
      uniqueNotifyIds.forEach(id => {
        const notif = notifications.find(n => n.userId === id);
        if (notif && io) {
          io.to(id).emit("new_notification", {
            ...notif,
            createdAt: now.toISOString()
          });
        }
      });
    }

    // Safe response with fallbacks
    res.json({
      ...updated,
      summary: {
        totalPaid: updated?.amountPaid || 0,
        totalPending: updated?.pendingAmount || 0,
        remainingNeeded: (type?.amountRequired || 0) - (updated?.amountPaid || 0),
        status: updated?.status || "PENDING"
      }
    });

  } catch (err) {
    if (err.message.includes('exceed')) {
      return res.status(400).json({ error: err.message });
    }
    console.error("CREATE PLEDGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== PLEDGE MESSAGES ==================
app.get("/api/pledges/:pledgeId/messages", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: {
          include: { jumuia: true }
        }
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isOwner = pledge.userId === req.user.userId;
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isOwner && !isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const messages = await prisma.pledgeMessage.findMany({
      where: { pledgeId },
      include: {
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            role: true,
            specialRole: true,
            profileImage: true 
          } 
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString()
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pledges/:pledgeId/messages", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content required" });
    }

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: {
          include: { jumuia: true }
        },
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isOwner = pledge.userId === req.user.userId;
    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isOwner && !isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const message = await prisma.pledgeMessage.create({
      data: {
        pledgeId,
        userId: req.user.userId,
        content: content.trim(),
        isAdmin: isAdmin || isTreasurer || isLeader,
        read: false
      },
      include: {
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            role: true,
            specialRole: true,
            profileImage: true 
          } 
        }
      }
    });

    const notifyUserId = (isAdmin || isTreasurer || isLeader) ? pledge.userId : null;
    
    const otherNotifyIds = [];
    if (isOwner) {
      const adminsAndTreasurers = await prisma.user.findMany({
        where: {
          OR: [
            { role: "admin" },
            { specialRole: "treasurer" }
          ]
        },
        select: { id: true }
      });
      
      if (pledge.contributionType.jumuiaId) {
        const leaders = await prisma.user.findMany({
          where: { 
            leadingJumuia: { id: pledge.contributionType.jumuiaId }
          },
          select: { id: true }
        });
        otherNotifyIds.push(...leaders.map(l => l.id));
      }
      
      otherNotifyIds.push(...adminsAndTreasurers.map(a => a.id));
    }

    const uniqueNotifyIds = [...new Set(otherNotifyIds)].filter(id => id !== req.user.userId);

    if (notifyUserId || uniqueNotifyIds.length > 0) {
      const now = new Date();
      const allNotifyIds = notifyUserId ? [notifyUserId, ...uniqueNotifyIds] : uniqueNotifyIds;
      
      const notifications = allNotifyIds.map(id => ({
        id: `msg-${message.id}-${id}-${Date.now()}`,
        userId: id,
        jumuiaId: pledge.contributionType.jumuiaId,
        type: "pledge_message",
        title: isOwner ? "📬 New question about your pledge" : "📬 New reply to your message",
        message: content.substring(0, 100),
        data: { 
          pledgeId, 
          messageId: message.id,
          fromUser: user.fullName 
        },
        read: false,
        createdAt: now,
      }));

      await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });

      allNotifyIds.forEach(id => {
        const notif = notifications.find(n => n.userId === id);
        if (notif && io) {
          io.to(id).emit("new_notification", {
            ...notif,
            createdAt: now.toISOString()
          });
        }
      });
    }

    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString()
    };

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/pledges/:pledgeId/messages/read", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;

    await prisma.pledgeMessage.updateMany({
      where: {
        pledgeId,
        userId: { not: req.user.userId },
        read: false
      },
      data: { read: true }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== USER STATS ==================
app.get("/api/user/contribution-stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pledges = await prisma.pledge.findMany({
      where: { userId },
      include: { contributionType: true }
    });

    const stats = {
      totalPledged: pledges.reduce((sum, p) => sum + (p.amountPaid || 0) + (p.pendingAmount || 0), 0),
      totalPaid: pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      totalPending: pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0),
      totalRequired: pledges.reduce((sum, p) => sum + p.contributionType.amountRequired, 0),
      completedCount: pledges.filter(p => p.status === "COMPLETED").length,
      pendingCount: pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length,
      approvedCount: pledges.filter(p => p.status === "APPROVED").length,
      totalCampaigns: pledges.length,
      
      jumuiaPledges: pledges.filter(p => p.contributionType.jumuiaId).length,
      globalPledges: pledges.filter(p => !p.contributionType.jumuiaId).length,
      
      byJumuia: {}
    };

    pledges.forEach(p => {
      if (p.contributionType.jumuiaId) {
        const jumuiaId = p.contributionType.jumuiaId;
        if (!stats.byJumuia[jumuiaId]) {
          stats.byJumuia[jumuiaId] = {
            totalPaid: 0,
            totalPending: 0,
            count: 0
          };
        }
        stats.byJumuia[jumuiaId].totalPaid += p.amountPaid || 0;
        stats.byJumuia[jumuiaId].totalPending += p.pendingAmount || 0;
        stats.byJumuia[jumuiaId].count += 1;
      }
    });

    res.json(stats);
  } catch (err) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== PUSH NOTIFICATIONS ==================
const webpush = require('web-push');

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'YOUR_GENERATED_PUBLIC_KEY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_GENERATED_PRIVATE_KEY'
};

webpush.setVapidDetails(
  'mailto:zucaportal2025@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.post('/api/notifications/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.userId;

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

app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

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
    if (err.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({ where: { userId } });
    }
  }
}

async function createAndSendNotification({ userId, type, title, message, data = {} }) {
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

  io.to(userId).emit('new_notification', {
    ...notif,
    createdAt: notif.createdAt.toISOString()
  });

  await sendPushNotification(userId, title, message, { type, ...data });

  return notif;
}

// ================== NOTIFICATIONS ==================
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




// ================== SOCKET.IO ==================
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on("join-jumuia", (jumuiaId) => {
    socket.join(`jumuia-${jumuiaId}`);
    console.log(`User joined jumuia room: jumuia-${jumuiaId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ================== START SERVER ==================
const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));