require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer"); // for file uploads

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";
const { createNotification, getNotifications, markAsRead } = require("./notifications");

// ====================
// Middleware
// ====================
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

// ====================
// Auth Middleware
// ====================
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

// ====================
// Root
// ====================
app.get("/", (req, res) => res.json({ message: "ZUCA Backend Running 🚀" }));

// ====================
// Register
// ====================
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: "Email exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, email: normalizedEmail, password: hashed },
    });

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
// Apply authenticate + lastActive
// ====================
app.use(authenticate, updateLastActive);

// ====================
// Announcements Routes
// ====================
app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
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
      data: { title, content, category: category || "General", published: published ?? true },
    });
    res.json(announcement);
  } catch (err) {
    console.error(err);
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
    res.json(announcement);
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
// Mass Programs (songs)
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
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin create/update/delete songs
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

    const response = { id: newProgram.id, date: newProgram.date.toISOString().split("T")[0], venue: newProgram.venue };
    newProgram.songs.forEach((s) => (response[s.type] = s.song.title));

    res.json({ program: response });
  } catch (err) {
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

    const response = { id: updatedProgram.id, date: updatedProgram.date.toISOString().split("T")[0], venue: updatedProgram.venue };
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
// Chat
// ====================
async function ensureDefaultChatRoom() {
  const room = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  if (!room) await prisma.chatRoom.create({ data: { name: "default" } });
}
ensureDefaultChatRoom();

app.get("/api/chat", async (req, res) => {
  const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  const messages = await prisma.message.findMany({
    where: { roomId: defaultRoom.id },
    include: { user: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});

app.post("/api/chat", async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === "") return res.status(400).json({ error: "Message cannot be empty" });

  const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  const message = await prisma.message.create({ data: { content, userId: req.user.userId, roomId: defaultRoom.id } });
  res.json(message);
});

app.delete("/api/chat/:id", requireAdmin, async (req, res) => {
  await prisma.message.delete({ where: { id: req.params.id } });
  res.json({ message: "Message deleted" });
});

// ====================
// Admin Stats
// ====================
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  const totalUsers = await prisma.user.count();
  const totalAnnouncements = await prisma.announcement.count();
  const totalPrograms = await prisma.massProgram.count();
  const totalMessages = await prisma.message.count();
  res.json({ totalUsers, totalAnnouncements, totalPrograms, totalMessages });
});

// ====================
// User Management
// ====================
app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true, profileImage: true, createdAt: true, lastActive: true },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const usersWithStatus = users.map((u) => ({
      ...u,
      online: u.lastActive && now - new Date(u.lastActive) < 10 * 60 * 1000,
    }));

    res.json(usersWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ====================
// DELETE USER (Admin)
// ====================
app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(400).json({ error: "You cannot delete yourself" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete related data first (to avoid foreign key errors)

    await prisma.message.deleteMany({
      where: { userId: id },
    });

    await prisma.pledge.deleteMany({
      where: { userId: id },
    });

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// UPDATE USER ROLE (Admin)
// ====================
app.put("/api/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ["member", "moderator", "treasurer", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent admin from removing their own admin role
    if (req.user.userId === id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    res.json({ message: "Role updated successfully", user: updatedUser });
  } catch (err) {
    console.error("ROLE UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ====================
// Upload User Profile Image to Supabase
// ====================
app.post("/api/users/:id/upload-profile", upload.single("profile"), async (req, res) => {
  try {
    const { id } = req.params;

    // Only the user themselves or an admin can upload
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    // Delete old image from Supabase if it exists
    if (existingUser.profileImage) {
      const oldFileName = existingUser.profileImage.split('/').pop(); // extract filename
      await supabase.storage.from('profiles').remove([oldFileName]);
    }

    // Create unique filename
    const fileExt = path.extname(req.file.originalname);
    const fileName = `profile_${id}_${Date.now()}${fileExt}`;

    // Upload to Supabase
    const { error } = await supabase.storage
      .from('profiles')
      .upload(fileName, fs.createReadStream(req.file.path), {
        contentType: req.file.mimetype,
        upsert: true,
      });

    // Delete temp local file
    fs.unlinkSync(req.file.path);

    if (error) return res.status(500).json({ error: error.message });

    // Construct public URL
    const publicURL = `https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/${fileName}`;

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { profileImage: publicURL },
      select: { id: true, fullName: true, email: true, role: true, profileImage: true },
    });

    res.json({ message: "Profile image uploaded successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// Delete User Profile Image from Supabase
// ====================
app.delete("/api/users/:id/delete-profile", async (req, res) => {
  try {
    const { id } = req.params;

    // Only the user themselves or an admin can delete
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.profileImage) {
      const fileName = user.profileImage.split('/').pop(); // extract filename
      await supabase.storage.from('profiles').remove([fileName]);

      // Remove reference from database
      await prisma.user.update({
        where: { id },
        data: { profileImage: null },
      });
    }

    res.json({ message: "Profile image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// CONTRIBUTION SYSTEM ROUTES (FULL & STABLE)
// ====================

// ====================
// CREATE Contribution Type (Admin)
// ====================
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

    // Auto-create pledges for all users
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

    res.json(newType);
  } catch (err) {
    console.error("CREATE ContributionType ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// GET All Contribution Types (Admin)
// ====================
app.get("/api/contribution-types", authenticate, requireAdmin, async (req, res) => {
  try {
    const types = await prisma.contributionType.findMany({
      include: {
        pledges: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// UPDATE Contribution Type (Admin)
// ====================
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

// ====================
// DELETE Contribution Type (Admin)
// ====================
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
// USER SIDE: GET MY CONTRIBUTIONS
// ====================
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
  status: p.amountPaid >= p.contributionType.amountRequired ? "COMPLETED" : p.status,
  contributionTypeId: p.contributionType.id, // <-- ADDED
  deadline: p.contributionType.deadline,
  createdAt: p.createdAt,
}));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// USER SIDE: CREATE PLEDGE
// ====================
app.post("/api/pledges/:contributionTypeId", authenticate, async (req, res) => {
  try {
    const { contributionTypeId } = req.params;
    const { amount, message } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });

    // 1️⃣ Check if contribution type exists
    const type = await prisma.contributionType.findUnique({
      where: { id: contributionTypeId },
    });
    if (!type) return res.status(404).json({ error: "Contribution type not found" });

    // 2️⃣ Find existing pledge or create new one
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

    // 3️⃣ Ensure new pledge does not exceed required amount
    const totalCommitted = pledge.amountPaid + pledge.pendingAmount;
    if (totalCommitted + parseFloat(amount) > type.amountRequired) {
      return res.status(400).json({ error: "Cannot exceed required amount" });
    }

    // 4️⃣ Update pledge
    const updated = await prisma.pledge.update({
      where: { id: pledge.id },
      data: {
        pendingAmount: pledge.pendingAmount + parseFloat(amount),
        message: message || pledge.message,
        status: "PENDING",
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("CREATE PLEDGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================
// ADMIN SIDE: APPROVE PLEDGE
// ====================
app.put("/api/pledges/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pledge = await prisma.pledge.findUnique({ where: { id }, include: { contributionType: true } });
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const newPaid = pledge.amountPaid + pledge.pendingAmount;
    const newStatus = newPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";

    const updated = await prisma.pledge.update({
      where: { id },
      data: {
        amountPaid: newPaid,
        pendingAmount: 0,
        status: newStatus,
        approvedById: req.user.userId,
        approvedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// ADMIN SIDE: MANUAL ADD AMOUNT
// ====================
app.put("/api/pledges/:id/manual-add", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const pledge = await prisma.pledge.findUnique({ where: { id }, include: { contributionType: true } });
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const totalPaid = pledge.amountPaid + parseFloat(amount);
    if (totalPaid > pledge.contributionType.amountRequired)
      return res.status(400).json({ error: "Cannot exceed required amount" });

    const newStatus = totalPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : pledge.status;

    const updated = await prisma.pledge.update({
      where: { id },
      data: {
        amountPaid: totalPaid,
        status: newStatus,
        createdByAdmin: true,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================
// ADMIN SIDE: RESET USER PLEDGE
// ====================
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

// ====================
// ADMIN SIDE: EDIT USER PLEDGE MESSAGE
// ====================
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

// -------------------------
// Create a new notification
// -------------------------
app.post("/api/notify", (req, res) => {
  const { userId, type, title, message } = req.body;
  if (!userId || !type || !title || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const notif = createNotification({ userId, type, title, message });
  res.status(201).json(notif);
});

// ====================
// Notifications Route
// ====================
app.get("/api/notifications/:userId", (req, res) => {
  const { userId } = req.params;

  // TEMP: pull from your in-memory JSON notifications (or existing announcements, pledges)
  const announcements = require("./notifications/announcements.json"); // update path
  const pledges = require("./notifications/pledges.json");
  const messages = require("./notifications/messages.json");

  const annNotifs = announcements.map(a => ({
    id: `ann-${a.id}`,
    title: "New Announcement",
    message: a.title,
    read: false,
    createdAt: a.createdAt
  }));

  // backend/notifications.js
const fs = require("fs");
const path = require("path");

const notificationsFile = path.join(__dirname, "notifications/notifications.json");

function getNotifications(req, res) {
  const { userId } = req.params;

  let notifications = JSON.parse(fs.readFileSync(notificationsFile, "utf8"));

  // Replace placeholder with actual userId
  notifications = notifications.map(n => ({
    ...n,
    userId: userId === "__CURRENT_USER_ID__" ? userId : n.userId
  }));

  // Only send notifications for this user
  const userNotifications = notifications.filter(n => n.userId === userId);

  res.json(userNotifications);
}

module.exports = { getNotifications };

  const pledgeNotifs = pledges
    .filter(p => p.userId === userId)
    .map(p => ({
      id: `pledge-${p.id}`,
      title: "Contribution Update",
      message: `Your pledge for ${p.contributionType} is ${p.status}`,
      read: false,
      createdAt: p.updatedAt
    }));

  const msgNotifs = messages
    .filter(m => m.userId === userId)
    .map(m => ({
      id: `msg-${m.id}`,
      title: "New Message",
      message: m.content,
      read: false,
      createdAt: m.createdAt
    }));

  const allNotifs = [...annNotifs, ...pledgeNotifs, ...msgNotifs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json(allNotifs);
});



// ====================
// Start Server
// ====================
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));