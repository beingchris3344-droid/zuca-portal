// ================== ENV & CORE MODULES ==================
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const axios = require("axios");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// ================== EXPRESS & MIDDLEWARE ==================
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

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
    origin: ["http://localhost:3000", "http://localhost:5173", "https://zetechcatholic.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// ================== CORS ==================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://zetechcatholic.vercel.app"
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== MIDDLEWARE ==================
app.use((req, res, next) => {
  console.log(req.method, req.path, req.body);
  next();
});

// ================== MULTER CONFIG FOR PROFILE UPLOADS ==================
// Use memory storage for Vercel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

// ... rest of your server.js continues...


// ================== PUBLIC DEBUG ENDPOINTS (NO AUTH NEEDED) ==================
app.get("/api/debug/null-readings", async (req, res) => {
  try {
    const { year, month, limit = 100 } = req.query;
    
    let dateFilter = {};
    
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    }
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    }
    
    // For JSON fields, we need to use special operators
    const nullReadings = await prisma.liturgicalDay.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        // Check if readings is null using the correct JSON operator
        readings: {
          equals: null  // This is the correct way to check null for JSON fields
        }
      },
      select: {
        date: true,
        celebration: true,
        season: true,
        yearCycle: true,
        createdAt: true
      },
      orderBy: {
        date: 'asc'
      },
      take: parseInt(limit)
    });
    
    res.json({
      count: nullReadings.length,
      year: year || 'all',
      month: month || 'all',
      dates: nullReadings.map(d => ({
        date: d.date.toISOString().split('T')[0],
        celebration: d.celebration,
        season: d.season,
        yearCycle: d.yearCycle
      }))
    });
    
  } catch (error) {
    console.error("Error finding null readings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to find "fallback" entries
app.get("/api/debug/fallback-readings", async (req, res) => {
  try {
    const { year, month, limit = 100 } = req.query;
    
    let dateFilter = {};
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    }
    
    const fallbackEntries = await prisma.liturgicalDay.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        // Find entries where readings.source = "fallback"
        readings: {
          path: ['source'],
          equals: 'fallback'
        }
      },
      select: {
        date: true,
        celebration: true,
        season: true,
        yearCycle: true,
        createdAt: true
      },
      orderBy: { date: 'asc' },
      take: parseInt(limit)
    });
    
    res.json({
      count: fallbackEntries.length,
      dates: fallbackEntries.map(d => d.date.toISOString().split('T')[0])
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================== CALENDAR ROUTES (PUBLIC - NO AUTH NEEDED) ==================
const calendarService = require('./services/calendarService');
const infiniteCalendar = require('./services/infiniteCalendar');


// ================== BASIC CALENDAR ROUTES ==================

// Get today's liturgical info
app.get("/api/calendar/today", async (req, res) => {
  try {
    const today = new Date();
    const liturgicalDay = await calendarService.getOrCreateLiturgicalDay(today);
    res.json(liturgicalDay);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific date
app.get("/api/calendar/date/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const date = new Date(year, month - 1, day);
    
    // This now works for ANY year - past, present, or future!
    const liturgicalDay = await infiniteCalendar.getReadingsForAnyDate(date, prisma);
    
    if (!liturgicalDay) {
      return res.status(404).json({ error: "No readings found for this date" });
    }
    
    res.json(liturgicalDay);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get month view
app.get("/api/calendar/month/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const days = await calendarService.getLiturgicalMonth(parseInt(year), parseInt(month) - 1);
    res.json(days);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

/// ================== SEARCH ROUTES (COMPLETELY FIXED) ==================



// Search by Bible verse (e.g., "John 3:16", "Psalm 23")
app.get("/api/calendar/search/verse/:verse", async (req, res) => {
  try {
    const { verse } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`🔍 Searching for verse: ${verse}`);
    
    const verseLower = verse.toLowerCase().trim();
    
    // Better verse search - look inside readings JSON
    const results = await prisma.liturgicalDay.findMany({
      where: {
        readings: {
          not: null
        }
      }
    });
    
    // Filter client-side for better matching
    const filtered = results.filter(day => {
      if (!day.readings) return false;
      
      const readingsStr = JSON.stringify(day.readings).toLowerCase();
      
      // Check for exact verse patterns
      const patterns = [
        verseLower,
        verseLower.replace(':', ' '),
        verseLower.replace(/\s+/g, ''),
        verseLower.replace(':', '')
      ];
      
      return patterns.some(pattern => readingsStr.includes(pattern));
    });
    
    console.log(`✅ Found ${filtered.length} results for verse: ${verse}`);
    res.json(filtered);
    
  } catch (error) {
    console.error("❌ Verse search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// Search by keyword (in celebration name, season, etc.)
app.get("/api/calendar/search/keyword/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`🔍 Searching for keyword: ${keyword}`);
    
    const keywordLower = keyword.toLowerCase().trim();
    
    // If keyword is too short, return empty
    if (keywordLower.length < 2) {
      return res.json([]);
    }
    
    const results = await prisma.liturgicalDay.findMany({
      where: {
        OR: [
          { celebration: { contains: keywordLower, mode: 'insensitive' } },
          { seasonName: { contains: keywordLower, mode: 'insensitive' } },
          { rank: { contains: keywordLower, mode: 'insensitive' } }
        ]
      },
      orderBy: {
        date: 'asc'
      },
      take: 50 // Limit results for performance
    });
    
    console.log(`✅ Found ${results.length} results for keyword: ${keyword}`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ Keyword search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// Search by liturgical season - FIXED to handle "all"
app.get("/api/calendar/search/season/:season", async (req, res) => {
  try {
    const { season } = req.params;
    const { year } = req.query;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`🔍 Searching for season: ${season}, year: ${year || 'all'}`);
    
    let whereClause = {};
    
    // Only add season filter if not "all"
    if (season !== 'all') {
      whereClause.season = season.toLowerCase();
    }
    
    // Add year filter if provided and not "all"
    if (year && year !== 'all') {
      const startDate = new Date(Date.UTC(parseInt(year), 0, 1));
      const endDate = new Date(Date.UTC(parseInt(year), 11, 31, 23, 59, 59, 999));
      
      whereClause.date = {
        gte: startDate,
        lte: endDate
      };
    }
    
    // If no filters at all, return empty (or could return recent days)
    if (Object.keys(whereClause).length === 0) {
      return res.json([]);
    }
    
    const results = await prisma.liturgicalDay.findMany({
      where: whereClause,
      orderBy: {
        date: 'asc'
      },
      take: 100 // Limit results for performance
    });
    
    console.log(`✅ Found ${results.length} results for season: ${season}`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ Season search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// Search by date - COMPLETELY FIXED for all years
app.get("/api/calendar/search/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const infiniteCalendar = require('./services/infiniteCalendar');
    
    console.log(`🔍 Searching for date: ${date}`);
    
    let startDate, endDate;
    let results = [];
    
    // Check if it's a year-only search (e.g., "2050", "2100")
    if (/^\d{4}$/.test(date)) {
      const year = parseInt(date);
      
      // For ANY year (past or future), use infinite calendar to generate samples
      console.log(`🔮 Year ${year} - using infinite calendar for samples`);
      
      // Generate first day of each month as representative samples
      for (let month = 0; month < 12; month++) {
        const sampleDate = new Date(year, month, 1);
        const reading = await infiniteCalendar.getReadingsForAnyDate(sampleDate, prisma);
        
        if (reading) {
          results.push({
            id: `generated-${year}-${month + 1}`,
            date: sampleDate,
            celebration: reading.celebration,
            season: reading.season,
            seasonName: reading.seasonName,
            yearCycle: reading.yearCycle,
            readings: reading.readings ? {
              firstReading: reading.readings.firstReading ? { citation: reading.readings.firstReading.citation } : null,
              gospel: reading.readings.gospel ? { citation: reading.readings.gospel.citation } : null
            } : null
          });
        }
      }
      
      console.log(`✅ Generated ${results.length} sample days for ${year}`);
      return res.json(results);
    }
    
    // Check if it's a full date (YYYY-MM-DD)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      
      // For future years > 2035, use infinite calendar directly
      if (year > 2035) {
        console.log(`🔮 Date ${date} beyond database - using infinite calendar`);
        
        const targetDate = new Date(year, month - 1, day);
        const reading = await infiniteCalendar.getReadingsForAnyDate(targetDate, prisma);
        
        if (reading) {
          return res.json([{
            id: `generated-${date}`,
            date: targetDate,
            celebration: reading.celebration,
            season: reading.season,
            seasonName: reading.seasonName,
            yearCycle: reading.yearCycle,
            readings: reading.readings ? {
              firstReading: reading.readings.firstReading ? { citation: reading.readings.firstReading.citation } : null,
              gospel: reading.readings.gospel ? { citation: reading.readings.gospel.citation } : null
            } : null
          }]);
        }
        return res.json([]);
      }
      
      // For years in database, do regular search
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      
      results = await prisma.liturgicalDay.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
    } 
    else {
      return res.status(400).json({ 
        error: "Invalid date format. Use YYYY or YYYY-MM-DD" 
      });
    }
    
    console.log(`✅ Found ${results.length} results for ${date}`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ Date search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// ================== FULL READINGS ROUTES ==================

// ================== FULL READINGS ROUTES ==================

// Get full readings for a specific date with all details
app.get("/api/calendar/readings/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    const dayNum = parseInt(day);
    
    console.log(`🔍 Getting readings for ${year}-${month}-${day}`);
    
    let liturgicalDay = null;
    
    // For years 2024-2035, check database first
    if (yearNum >= 2024 && yearNum <= 2035) {
      const startDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0));
      const endDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 23, 59, 59, 999));
      
      liturgicalDay = await prisma.liturgicalDay.findFirst({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    }
    
    // For years before 2024 or after 2035, use infinite calendar
    if (!liturgicalDay) {
      console.log(`🔮 Using infinite calendar for ${year}-${month}-${day}`);
      const infiniteCalendar = require('./services/infiniteCalendar');
      const targetDate = new Date(Date.UTC(yearNum, monthNum, dayNum));
      liturgicalDay = await infiniteCalendar.getReadingsForAnyDate(targetDate, prisma);
    }
    
    if (!liturgicalDay) {
      return res.status(404).json({ error: "No readings found for this date" });
    }
    
    // FIX: Return the date as a string, not a Date object
    // This prevents timezone shifting
    const responseDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // FIX: Get the correct day of week for the ACTUAL date
    const actualDate = new Date(Date.UTC(yearNum, monthNum, dayNum));
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const actualDayOfWeek = daysOfWeek[actualDate.getUTCDay()];
    
    // FIX: Correct the celebration name to use the actual day of week
    let celebration = liturgicalDay.celebration;
    
    // Check if celebration starts with the correct day
    if (!celebration.startsWith(actualDayOfWeek)) {
      // Try to extract week number and season
      const weekMatch = celebration.match(/(\d+)(?:st|nd|rd|th) week of (.+)/i);
      if (weekMatch) {
        const weekNum = weekMatch[1];
        const season = weekMatch[2];
        const getOrdinalSuffix = (num) => {
          if (num === 1) return 'st';
          if (num === 2) return 'nd';
          if (num === 3) return 'rd';
          return 'th';
        };
        celebration = `${actualDayOfWeek} of the ${weekNum}${getOrdinalSuffix(parseInt(weekNum))} week of ${season}`;
      } else {
        // If no week pattern, just prefix with day
        celebration = `${actualDayOfWeek} - ${celebration}`;
      }
    }
    
    // Return with CORRECT date string (not Date object)
    res.json({
      ...liturgicalDay,
      date: responseDate, // Return as string, not Date object!
      celebration: celebration, // Corrected celebration with actual day
    });
    
  } catch (error) {
    console.error("Readings error:", error);
    res.status(500).json({ error: error.message });
  }
});
// ================== ADMIN/POPULATION ROUTES ==================

// POPULATE - Generate and store calendar data for a month
app.get("/api/calendar/populate/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-based
    
    console.log(`🌍 Populating calendar for ${year}/${month}`);
    
    // This will trigger fetching/generating all days for the month
    const days = await calendarService.getLiturgicalMonth(yearNum, monthNum);
    
    res.json({ 
      success: true,
      message: `Successfully populated ${days.length} days for ${year}/${month}`,
      count: days.length,
      data: days 
    });
  } catch (error) {
    console.error("Population error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POPULATE - Generate multiple months or years
app.post("/api/calendar/populate-range", async (req, res) => {
  try {
    const { startYear, startMonth, endYear, endMonth } = req.body;
    
    const results = {
      total: 0,
      months: []
    };
    
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = (year === startYear) ? startMonth : 1;
      const monthEnd = (year === endYear) ? endMonth : 12;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        console.log(`📅 Populating ${year}/${month}`);
        const days = await calendarService.getLiturgicalMonth(year, month - 1);
        results.total += days.length;
        results.months.push({ year, month, count: days.length });
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    res.json({
      success: true,
      message: `Successfully populated ${results.total} days`,
      results
    });
  } catch (error) {
    console.error("Range population error:", error);
    res.status(500).json({ error: error.message });
  }
});

// REFRESH - Update readings for a specific date
app.get("/api/calendar/refresh/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const date = new Date(year, month - 1, day);
    
    const updated = await calendarService.refreshReadings(date);
    
    if (updated) {
      res.json({ 
        success: true, 
        message: "Readings refreshed successfully",
        data: updated 
      });
    } else {
      res.status(404).json({ error: "Date not found or refresh failed" });
    }
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== DEBUG ROUTES ==================

// DEBUG - Check what's in your database
app.get("/api/calendar/debug/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    
    const startDate = new Date(yearNum, monthNum, 1);
    const endDate = new Date(yearNum, monthNum + 1, 0);
    
    const existingDays = await prisma.liturgicalDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Count days with readings
    const withReadings = existingDays.filter(d => d.readings && 
      (d.readings.firstReading || d.readings.gospel)).length;
    
    res.json({
      message: `Found ${existingDays.length} days in database for ${year}/${month}`,
      count: existingDays.length,
      withReadings: withReadings,
      withoutReadings: existingDays.length - withReadings,
      days: existingDays.map(d => ({
        date: d.date,
        celebration: d.celebration,
        season: d.season,
        color: d.liturgicalColor,
        hasReadings: !!(d.readings && (d.readings.firstReading || d.readings.gospel))
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// DEBUG - Get database statistics
app.get("/api/calendar/stats", async (req, res) => {
  try {
    const totalDays = await prisma.liturgicalDay.count();
    const withReadings = await prisma.liturgicalDay.count({
      where: {
        readings: {
          not: null
        }
      }
    });
    
    const bySeason = await prisma.liturgicalDay.groupBy({
      by: ['season'],
      _count: true
    });
    
    const byYear = await prisma.$queryRaw`
      SELECT EXTRACT(YEAR FROM date) as year, COUNT(*) 
      FROM liturgical_days 
      GROUP BY year 
      ORDER BY year ASC
    `;
    
    res.json({
      totalDays,
      withReadings,
      withoutReadings: totalDays - withReadings,
      bySeason,
      byYear
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Delete all data for a specific month
app.delete("/api/calendar/delete-month/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    
    const startDate = new Date(yearNum, monthNum, 1);
    const endDate = new Date(yearNum, monthNum + 1, 0);
    
    const deleted = await prisma.liturgicalDay.deleteMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `Deleted ${deleted.count} days for ${year}/${month}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Delete a specific date
app.delete("/api/calendar/delete-date/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    
    const deleted = await prisma.liturgicalDay.delete({
      where: { date: date }
    });
    
    res.json({ 
      success: true, 
      message: `Deleted ${date.toDateString()}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================== TEST/DEBUG ROUTES ==================

// DEBUG - Test Romcal directly
app.get("/api/calendar/test-romcal", async (req, res) => {
  try {
    const romcal = require('romcal');
    const methods = Object.keys(romcal);
    
    let sample = null;
    let error = null;
    
    try {
      if (typeof romcal.calendarForYear === 'function') {
        sample = await romcal.calendarForYear({ year: 2026 });
      } else if (typeof romcal.generate === 'function') {
        sample = await romcal.generate({ year: 2026 });
      } else if (typeof romcal.forYear === 'function') {
        sample = await romcal.forYear(2026);
      }
    } catch (e) {
      error = e.message;
    }
    
    res.json({
      availableMethods: methods,
      sample: sample ? 'Method found and executed' : 'No working method found',
      error: error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEST: See what Romcal returns for a single day
app.get("/api/calendar/test-day/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const romcal = require('romcal');
    
    console.log(`Testing Romcal for ${year}-${month}-${day}`);
    
    const calendar = await romcal.calendarFor({
      year: parseInt(year),
      country: 'general',
      locale: 'en'
    });
    
    console.log(`Romcal returned ${calendar?.length || 0} items`);
    
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const dayData = calendar.find(item => {
      return item.date === dateStr || 
             item.day === dateStr || 
             (item.dateStr === dateStr);
    });
    
    res.json({
      totalItems: calendar?.length || 0,
      requestedDate: dateStr,
      found: !!dayData,
      sampleItem: calendar?.[0] || null,
      dayData: dayData || null
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== MEDIA GALLERY - COMPLETE ====================

// Create media temp directory
//const mediaTempDir = path.join(__dirname, "uploads/media-temp");
//if (!fs.existsSync(mediaTempDir)) fs.mkdirSync(mediaTempDir, { recursive: true });

// Multer config - Use memory storage for Vercel (no disk access)
const mediaStorage = multer.memoryStorage();  // ← Just memoryStorage(), no options!

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});
// Helper: Get media type
function getMediaType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

// Helper: Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// Helper function to generate video thumbnail
async function generateVideoThumbnail(videoPath, outputDir, outputName) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, outputName);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:02'], // Take screenshot at 2 seconds
        filename: outputName,
        folder: outputDir,
        size: '320x180'
      })
      .on('end', () => {
        console.log('✅ Thumbnail generated:', outputName);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Thumbnail generation failed:', err.message);
        reject(err);
      });
  });
}

// ==================== ADMIN MEDIA MANAGEMENT ====================

// 1. Upload media (Admin, Secretary & Media Moderator)
app.post("/api/admin/media/upload", authenticate, mediaUpload.array("files", 10), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Only admins, secretaries, and media moderators can upload media" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { category, tags, isPublic, isFeatured, description } = req.body;
    const uploadedMedia = [];

    for (const file of req.files) {
      const mediaType = getMediaType(file.mimetype);
      const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      const filePath = `media/${fileName}`;
      
      // Upload directly to Supabase from memory buffer
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: `Failed to upload ${file.originalname}: ${uploadError.message}` });
      }

      const publicURL = `https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/media/${filePath}`;
      
      // Save to database
      const media = await prisma.media.create({
        data: {
          title: file.originalname.replace(/\.[^/.]+$/, ""),
          description: description || null,
          filename: fileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          type: mediaType,
          url: publicURL,
          thumbnailUrl: null,  // Skip thumbnails for now
          category: category || "uncategorized",
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          isPublic: isPublic === 'true',
          isFeatured: isFeatured === 'true',
          uploadedById: req.user.userId
        }
      });

      uploadedMedia.push(media);
    }

    // Create notifications for all users if media is public
    if (uploadedMedia.length > 0 && isPublic === 'true') {
      const users = await prisma.user.findMany({ select: { id: true, fullName: true } });
      const now = new Date();
      
      const notifications = users.map(user => ({
        id: `media-${uploadedMedia[0].id}-${user.id}-${Date.now()}`,
        userId: user.id,
        type: "new_media",
        title: "📸 New Gallery Update",
        message: `ZUCA added new ${uploadedMedia.length} item(s) to the gallery`,
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
      
      console.log(`✅ Created ${notifications.length} media notifications`);
    }

    res.status(201).json({ success: true, media: uploadedMedia });
  } catch (err) {
    console.error("Media upload error:", err);
    res.status(500).json({ error: err.message });
  }
});
    


// 2. Get all media (Admin panel)
app.get("/api/admin/media", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    // Allow admin, secretary, OR media_moderator
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { page = 1, limit = 20, category, type, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (category && category !== 'all') where.category = category;
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
          _count: { select: { likes: true, views: true, comments: true, downloads: true, shares: true } }
        }
      }),
      prisma.media.count({ where })
    ]);
    
    res.json({ media, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update media metadata
app.put("/api/admin/media/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, isPublic, isFeatured } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    // Allow admin, secretary, OR media_moderator
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const media = await prisma.media.update({
      where: { id },
      data: {
        title,
        description,
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
        isFeatured: isFeatured !== undefined ? isFeatured : undefined,
        updatedAt: new Date()
      }
    });
    
    res.json({ success: true, media });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete media
app.delete("/api/admin/media/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    // Allow admin, secretary, OR media_moderator
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ error: "Media not found" });
    
    // Delete from Supabase - main file
    const filePath = `media/${media.filename}`;
    await supabase.storage.from("media").remove([filePath]);
    
    // Delete thumbnail if it exists
    if (media.thumbnailUrl) {
      try {
        const thumbFileName = `thumb_${media.filename.replace(path.extname(media.filename), '.jpg')}`;
        const thumbPath = `media/thumbnails/${thumbFileName}`;
        await supabase.storage.from("media").remove([thumbPath]);
        console.log('✅ Thumbnail deleted for:', media.filename);
      } catch(e) {
        console.error('Error deleting thumbnail:', e);
      }
    }
    
    // Delete from database (cascade deletes all related records)
    await prisma.media.delete({ where: { id } });
    
    res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUBLIC MEDIA ROUTES ====================

// 5. Get public media (Frontpage)
app.get("/api/media/public", async (req, res) => {
  try {
    const { page = 1, limit = 12, category, type, sortBy = 'latest', featured = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      isPublic: true,
      ...(category && category !== 'all' && { category }),
      ...(type && type !== 'all' && { type }),
      ...(featured === 'true' && { isFeatured: true })
    };
    
    let orderBy = {};
    switch(sortBy) {
      case 'latest': orderBy = { createdAt: 'desc' }; break;
      case 'popular': orderBy = { likes: { _count: 'desc' } }; break;
      case 'mostViewed': orderBy = { views: { _count: 'desc' } }; break;
      default: orderBy = { createdAt: 'desc' };
    }
    
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
          _count: { select: { likes: true, views: true, comments: true, downloads: true, shares: true } }
        }
      }),
      prisma.media.count({ where })
    ]);
    
    res.json({ media, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get single media with details
app.get("/api/media/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;
    
    const media = await prisma.media.findFirst({
      where: { id, isPublic: true },
      include: {
        uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
        comments: {
          include: { user: { select: { id: true, fullName: true, profileImage: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: { select: { likes: true, views: true, comments: true, downloads: true, shares: true } }
      }
    });
    
    if (!media) return res.status(404).json({ error: "Media not found" });
    
    // Track view (if authenticated)
    if (userId) {
      try {
        await prisma.mediaView.create({
          data: { mediaId: id, userId, viewedAt: new Date() }
        });
      } catch (err) {
        // Ignore duplicate view errors
      }
    }
    
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get featured media
app.get("/api/media/featured", async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const media = await prisma.media.findMany({
      where: { isPublic: true, isFeatured: true },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
        _count: { select: { likes: true, views: true } }
      }
    });
    
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MEDIA INTERACTIONS ====================

// 8. Like/Unlike media
app.post("/api/media/:id/like", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const existing = await prisma.mediaLike.findUnique({
      where: { mediaId_userId: { mediaId: id, userId } }
    });
    
    if (existing) {
      await prisma.mediaLike.delete({ where: { id: existing.id } });
      res.json({ liked: false, action: 'unliked' });
    } else {
      await prisma.mediaLike.create({ data: { mediaId: id, userId } });
      res.json({ liked: true, action: 'liked' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Check if user liked media
app.get("/api/media/:id/liked", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const like = await prisma.mediaLike.findUnique({
      where: { mediaId_userId: { mediaId: id, userId } }
    });
    
    res.json({ liked: !!like });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Add comment
app.post("/api/media/:id/comments", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }
    
    const comment = await prisma.mediaComment.create({
      data: {
        content: content.trim(),
        mediaId: id,
        userId
      },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } }
      }
    });
    
    // Notify media owner
    const media = await prisma.media.findUnique({ where: { id }, select: { uploadedById: true } });
    if (media && media.uploadedById !== userId) {
      const notification = await prisma.notification.create({
        data: {
          id: `comment-${comment.id}-${Date.now()}`,
          userId: media.uploadedById,
          type: "media_comment",
          title: "💬 New Comment",
          message: `${comment.user.fullName} commented on your media`,
          read: false,
          createdAt: new Date()
        }
      });
      io.to(media.uploadedById).emit("new_notification", {
        ...notification,
        createdAt: notification.createdAt.toISOString()
      });
    }
    
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Get comments for media
app.get("/api/media/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [comments, total] = await Promise.all([
      prisma.mediaComment.findMany({
        where: { mediaId: id },
        include: { user: { select: { id: true, fullName: true, profileImage: true } } },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mediaComment.count({ where: { mediaId: id } })
    ]);
    
    res.json({ comments, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Delete comment (owner, media owner, or admin)
app.delete("/api/media/comments/:commentId", authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await prisma.mediaComment.findUnique({
      where: { id: commentId },
      include: { media: true }
    });
    
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin";
    const isOwner = comment.userId === req.user.userId;
    const isMediaOwner = comment.media.uploadedById === req.user.userId;
    
    if (!isAdmin && !isOwner && !isMediaOwner) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    await prisma.mediaComment.delete({ where: { id: commentId } });
    
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Track download
app.post("/api/media/:id/download", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    await prisma.mediaDownload.create({
      data: { mediaId: id, userId, downloadedAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Track share
app.post("/api/media/:id/share", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    const userId = req.user.userId;
    
    await prisma.mediaShare.create({
      data: { mediaId: id, userId, platform: platform || 'direct', sharedAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Get media stats (Admin & Media Moderator)
app.get("/api/admin/media/stats", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    // Allow admin OR media_moderator
    if (user.role !== "admin" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Admin or Media Moderator only" });
    }
    
    const [totalMedia, totalViews, totalLikes, totalComments, totalDownloads, totalShares, byType, byCategory] = await Promise.all([
      prisma.media.count(),
      prisma.mediaView.count(),
      prisma.mediaLike.count(),
      prisma.mediaComment.count(),
      prisma.mediaDownload.count(),
      prisma.mediaShare.count(),
      prisma.media.groupBy({ by: ['type'], _count: true }),
      prisma.media.groupBy({ by: ['category'], _count: true })
    ]);
    
    const topMedia = await prisma.media.findMany({
      take: 10,
      orderBy: { views: { _count: 'desc' } },
      include: {
        _count: { select: { views: true, likes: true, comments: true, downloads: true, shares: true } }
      }
    });
    
    res.json({
      totalMedia, totalViews, totalLikes, totalComments, totalDownloads, totalShares,
      byType, byCategory, topMedia
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 16. Get trending media (most interacted in last 7 days)
app.get("/api/media/trending", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const media = await prisma.media.findMany({
      where: { isPublic: true, createdAt: { gte: sevenDaysAgo } },
      take: parseInt(limit),
      orderBy: [
        { likes: { _count: 'desc' } },
        { views: { _count: 'desc' } }
      ],
      include: {
        uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
        _count: { select: { likes: true, views: true, comments: true } }
      }
    });
    
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});








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


// TEMPORARY DEBUG ENDPOINT - NO AUTH REQUIRED
app.get("/api/chat/debug/public-files", async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        messageId: true
      }
    });
    
    res.json({ 
      success: true, 
      count: files.length,
      files: files 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY PUBLIC FILE VIEWER
app.get("/api/chat/debug/public-file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');

    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.send(fileBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// ================== YOUTUBE ANALYTICS ROUTE ==================
app.get("/api/admin/analytics/youtube", authenticate, requireAdmin, async (req, res) => {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    // Get channel statistics
    const channelResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
    );
    
    const channelStats = channelResponse.data.items[0];

    // Get recent videos (last 50)
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=50&type=video`
    );

    // Get detailed video statistics
    const videoIds = videosResponse.data.items.map(v => v.id.videoId).join(',');
    const videoStatsResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics,contentDetails`
    );

    // Process video data
    const videos = videosResponse.data.items.map((video, index) => {
      const stats = videoStatsResponse.data.items.find(v => v.id === video.id.videoId) || {};
      const publishedAt = new Date(video.snippet.publishedAt);
      
      // Calculate engagement rate
      const views = parseInt(stats.statistics?.viewCount || 0);
      const likes = parseInt(stats.statistics?.likeCount || 0);
      const comments = parseInt(stats.statistics?.commentCount || 0);
      const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
      
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
        publishedAt: publishedAt.toISOString(),
        views: parseInt(stats.statistics?.viewCount || 0),
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0),
        duration: stats.contentDetails?.duration || 'PT0S',
        engagement
      };
    });

    // Calculate trends (last 28 days vs previous 28 days)
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(now.getDate() - 28);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(currentPeriodStart.getDate() - 28);

    const currentVideos = videos.filter(v => new Date(v.publishedAt) >= currentPeriodStart);
    const previousVideos = videos.filter(v => {
      const date = new Date(v.publishedAt);
      return date >= previousPeriodStart && date < currentPeriodStart;
    });

    const currentViews = currentVideos.reduce((sum, v) => sum + v.views, 0);
    const previousViews = previousVideos.reduce((sum, v) => sum + v.views, 0);

    // Generate daily stats for chart
    const dailyStats = {};
    videos.forEach(video => {
      const date = video.publishedAt.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { views: 0, videos: 0 };
      }
      dailyStats[date].views += video.views;
      dailyStats[date].videos += 1;
    });

    const chartData = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Get top videos by views
    const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);

    // Calculate average engagement
    const avgEngagement = videos.reduce((sum, v) => sum + v.engagement, 0) / videos.length || 0;

    const response = {
      channel: {
        id: channelStats.id,
        name: channelStats.snippet.title,
        thumbnail: channelStats.snippet.thumbnails.default?.url,
        subscribers: parseInt(channelStats.statistics.subscriberCount || 0),
        totalViews: parseInt(channelStats.statistics.viewCount || 0),
        totalVideos: parseInt(channelStats.statistics.videoCount || 0),
        joinedDate: channelStats.snippet.publishedAt
      },
      recentVideos: videos.slice(0, 10),
      topVideos,
      trends: {
        views: {
          current: currentViews,
          previous: previousViews,
          change: previousViews > 0 ? ((currentViews - previousViews) / previousViews) * 100 : 0
        },
        videos: {
          current: currentVideos.length,
          previous: previousVideos.length,
          change: previousVideos.length > 0 ? ((currentVideos.length - previousVideos.length) / previousVideos.length) * 100 : 0
        }
      },
      dailyStats: chartData,
      engagementRate: avgEngagement.toFixed(1)
    };

    res.json(response);
  } catch (error) {
    console.error("YouTube Analytics Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ====================
// SIMPLE PAGINATED SONGS
// ====================
app.get("/api/songs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    const skip = (page - 1) * limit;
    
    // Build where clause for search
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { lyrics: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    
    // Get total count for pagination
    const total = await prisma.song.count({ where });
    
    // Get paginated songs
    const songs = await prisma.song.findMany({
      where,
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true
      },
      orderBy: { title: "asc" },
      skip,
      take: limit
    });
    
    // Add first line preview
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
        id: song.id,
        title: song.title,
        reference: song.reference,
        firstLine,
        createdAt: song.createdAt
      };
    });
    
    res.json({
      songs: songsWithPreview,
      hasMore: page * limit < total,
      total
    });
    
  } catch (err) {
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

// GET /api/admin/songs - Get all songs with full lyrics (WITH PAGINATION)
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

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    const skip = (page - 1) * limit;
    
    // Build search condition
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    
    // Get total count for pagination
    const total = await prisma.song.count({ where });
    
    // Get paginated songs
    const songs = await prisma.song.findMany({
      where,
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { title: "asc" },
      skip,
      take: limit
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

    // Return paginated response
    res.json({
      songs: songsWithPreview,
      hasMore: page * limit < total,
      total
    });
  } catch (err) {
    console.error("Error fetching admin songs:", err);
    res.status(500).json({ error: err.message });
  }
});

// songs/:id - Get single song with full lyrics
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
      { prefix: "choir", role: "choir_moderator" },
      { prefix: "media", role: "media_moderator" }
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
      case "media_moderator":  
    permissions = ["manage_media"];
    accessLevel = "media_moderator";
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

// ================== MASS PROGRAM ROUTES ==================

// PUBLIC ROUTE - for users to view programs (no auth needed)
app.get("/api/mass-programs", async (req, res) => {
  try {
    const programs = await prisma.massProgram.findMany({
    
      orderBy: { date: "asc" },
      include: { 
        songs: { 
          include: { song: true } 
        } 
      },
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
    console.error("Error fetching mass programs:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES - for admin/choir moderator pages (require auth)

// GET all mass programs (admin view - includes all dates)
app.get("/api/admin/mass-programs", authenticate, async (req, res) => {
  try {
    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const programs = await prisma.massProgram.findMany({
      orderBy: { date: "desc" },
      include: { 
        songs: { 
          include: { song: true } 
        } 
      },
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
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt?.toISOString()
      };
    });

    res.json(formatted); // Return array directly for your SongsPage
  } catch (err) {
    console.error("Error fetching admin mass programs:", err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE mass program (admin/choir moderator only)
app.post("/api/admin/mass-programs", authenticate, async (req, res) => {
  try {
    const { date, venue, ...songsData } = req.body;
    
    if (!date || !venue) {
      return res.status(400).json({ error: "Date and venue are required" });
    }

    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to create mass programs" });
    }

    // Create mass program
    const newProgram = await prisma.massProgram.create({
      data: { 
        date: new Date(date), 
        venue, 
        createdBy: req.user.userId
      }
    });

    // Add songs
    for (const [type, title] of Object.entries(songsData)) {
      if (!title || title.trim() === "") continue;
      
      let song = await prisma.song.findFirst({ 
        where: { title: title.trim() } 
      });
      
      if (!song) {
        song = await prisma.song.create({ 
          data: { 
            title: title.trim(),
            composer: "",
            lyrics: "",
            reference: ""
          } 
        });
      }
      
      await prisma.massProgramSong.create({
        data: {
          type,
          massProgramId: newProgram.id,
          songId: song.id
        }
      });
    }

    // Fetch complete program with songs
    const completeProgram = await prisma.massProgram.findUnique({
      where: { id: newProgram.id },
      include: { songs: { include: { song: true } } }
    });

    // Format response
    const songMap = {};
    completeProgram.songs.forEach((s) => {
      songMap[s.type] = s.song.title;
    });

    const response = {
      id: completeProgram.id,
      date: completeProgram.date.toISOString().split("T")[0],
      venue: completeProgram.venue,
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
      createdAt: completeProgram.createdAt.toISOString()
    };

    // Emit socket event
    if (io) {
      io.emit("program_created", response);
    }

    // Create notifications
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      const notifications = users.map(user => ({
        userId: user.id,
        type: "program",
        title: "⛪ New Mass Program",
        message: `Mass at ${venue} on ${new Date(date).toLocaleDateString()}`,
        read: false,
        createdAt: new Date(),
      }));

      await prisma.notification.createMany({ data: notifications });
    }

    res.status(201).json(response);
  } catch (err) {
    console.error("Error creating mass program:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE mass program (admin/choir moderator only)
app.put("/api/admin/mass-programs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, venue, ...songsData } = req.body;

    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to update mass programs" });
    }

    // Update basic info
    await prisma.massProgram.update({
      where: { id },
      data: { 
        date: new Date(date), 
        venue,
        updatedAt: new Date()
      }
    });

    // Delete existing songs
    await prisma.massProgramSong.deleteMany({ 
      where: { massProgramId: id } 
    });

    // Add updated songs
    for (const [type, title] of Object.entries(songsData)) {
      if (!title || title.trim() === "") continue;
      
      let song = await prisma.song.findFirst({ 
        where: { title: title.trim() } 
      });
      
      if (!song) {
        song = await prisma.song.create({ 
          data: { 
            title: title.trim(),
            composer: "",
            lyrics: "",
            reference: ""
          } 
        });
      }
      
      await prisma.massProgramSong.create({
        data: {
          type,
          massProgramId: id,
          songId: song.id
        }
      });
    }

    // Fetch updated program
    const updatedProgram = await prisma.massProgram.findUnique({
      where: { id },
      include: { songs: { include: { song: true } } }
    });

    // Format response
    const songMap = {};
    updatedProgram.songs.forEach((s) => {
      songMap[s.type] = s.song.title;
    });

    const response = {
      id: updatedProgram.id,
      date: updatedProgram.date.toISOString().split("T")[0],
      venue: updatedProgram.venue,
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
      createdAt: updatedProgram.createdAt.toISOString(),
      updatedAt: updatedProgram.updatedAt?.toISOString()
    };

    // Emit socket event
    if (io) {
      io.emit("program_updated", response);
    }

    res.json(response);
  } catch (err) {
    console.error("Error updating mass program:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE mass program (admin/choir moderator only)
app.delete("/api/admin/mass-programs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to delete mass programs" });
    }

    // Delete songs first
    await prisma.massProgramSong.deleteMany({ 
      where: { massProgramId: id } 
    });

    // Delete program
    await prisma.massProgram.delete({ 
      where: { id } 
    });

    // Emit socket event
    if (io) {
      io.emit("program_deleted", id);
    }

    res.json({ message: "Program deleted successfully" });
  } catch (err) {
    console.error("Error deleting mass program:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET upcoming count (for dashboard)
app.get("/api/mass-programs/upcoming/count", async (req, res) => {
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
      //if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
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

// ================== ENHANCED CHAT WITH DATABASE FILE STORAGE ==================

// Multer config - Store in memory for database storage
const chatUpload = multer({
  storage: multer.memoryStorage(), // Store in memory, not disk
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit (optional, remove if you want unlimited)
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true);
  },
});

// Ensure default chat room exists
async function ensureDefaultChatRoom() {
  const room = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  if (!room) await prisma.chatRoom.create({ data: { name: "default" } });
}
ensureDefaultChatRoom();

// ================== FILE UPLOAD & MANAGEMENT ==================

// Upload files to database
app.post("/api/chat/upload", authenticate, chatUpload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // Convert buffer to base64
      const base64Data = file.buffer.toString('base64');

      // Store in database
      const dbFile = await prisma.file.create({
        data: {
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          data: base64Data,
          userId: req.user.userId
        }
      });

      // FIXED: Use dynamic URL from request - NO HARDCODING!
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      uploadedFiles.push({
        id: dbFile.id,
        name: dbFile.name,
        type: dbFile.type,
        size: dbFile.size,
        url: `${baseUrl}/api/chat/files/${dbFile.id}`
      });
    }

    res.json(uploadedFiles);
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

// Serve files from database - accepts token in header OR query param
app.get("/api/chat/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { token } = req.query;
    
    // Check for token in header or query param
    let userId = null;
    let authToken = null;
    
    // First check query param
    if (token) {
      authToken = token;
    } else {
      // Then check header
      const authHeader = req.headers.authorization;
      if (authHeader) {
        authToken = authHeader.split(" ")[1];
      }
    }
    
    // Verify token
    if (!authToken) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Optional: Check if user has access to this file
    // You can add additional checks here if needed

    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(file.data, 'base64');

    // Set proper headers for image display
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send file
    res.send(fileBuffer);
  } catch (err) {
    console.error("Error serving file:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// Download file (forces download instead of inline display)
app.get("/api/chat/files/:fileId/download", authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');

    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(fileBuffer);
  } catch (err) {
    console.error("Error downloading file:", err);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Delete file (soft delete by removing message association)
app.delete("/api/chat/files/:fileId", authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { message: true }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if user owns the file or is admin
    if (file.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // If file is attached to a message, remove the association first
    if (file.messageId) {
      await prisma.file.update({
        where: { id: fileId },
        data: { messageId: null }
      });
    }

    // Delete the file from database
    await prisma.file.delete({
      where: { id: fileId }
    });

    // Emit file deleted event
    io.emit("file_deleted", { fileId, messageId: file.messageId });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get files for a specific message
app.get("/api/chat/messages/:messageId/files", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const files = await prisma.file.findMany({
      where: { 
        messageId,
        message: { isDeleted: false }
      },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        userId: true
      }
    });

    const filesWithUrls = files.map(f => ({
      ...f,
      url: `/api/chat/files/${f.id}`,
      thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
    }));

    res.json(filesWithUrls);
  } catch (err) {
    console.error("Error fetching message files:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== BASIC CHAT ROUTES (keep for compatibility) ==================

app.get("/api/chat", authenticate, async (req, res) => {
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
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    
    const formattedMessages = messages.map(m => ({
    
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      files: m.files.map(f => ({

        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
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
    
    // Create message
    const message = await prisma.message.create({ 
      data: { 
        content: content || "",
        userId: req.user.userId, 
        roomId: defaultRoom.id,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null
      } 
    });

    // If there are file IDs in attachments, link them to this message
    if (attachments && attachments.length > 0) {
      const fileIds = attachments
        .filter(a => a.id) // Only items that have an id (our new file system)
        .map(a => a.id);
      
      if (fileIds.length > 0) {
        await prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: { messageId: message.id }
        });
      }
    }
    
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
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true
          }
        }
      }
    });
    
    const formattedMessage = {
      ...messageWithUser,
      createdAt: messageWithUser.createdAt.toISOString(),
      attachments: messageWithUser.attachments ? JSON.parse(messageWithUser.attachments) : [],
      files: messageWithUser.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    };
    
    io.emit("new_message", formattedMessage);
    
    res.json(formattedMessage);
  } catch (err) {
    console.error("Error creating message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== ENHANCED CHAT ROUTES ==================

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
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true,
            userId: true
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
            },
            files: {
              select: {
                id: true,
                name: true,
                type: true,
                size: true
              }
            }
          }
        },
        replies: {
          where: { isDeleted: false },
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }, // 👈 CHANGE THIS FROM "asc" TO "desc"
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt?.toISOString(),
      deletedAt: m.deletedAt?.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      files: m.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      })),
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
    
    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });

    if (!defaultRoom) {
      return res.status(404).json({ error: "Chat room not found" });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content || "",
        userId: req.user.userId,
        roomId: defaultRoom.id,
        replyToId: replyToId || null
      }
    });

    // Link files if any
    const fileIds = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.id) {
          fileIds.push(attachment.id);
        }
      }
      
      if (fileIds.length > 0) {
        await prisma.file.updateMany({
          where: { 
            id: { in: fileIds },
            userId: req.user.userId // Ensure user owns these files
          },
          data: { messageId: message.id }
        });
      }
    }

    // Get full message with relations
    const fullMessage = await prisma.message.findUnique({
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
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true
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

    // Handle mentions
    if (content) {
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
    }

    const formattedMessage = {
      ...fullMessage,
      createdAt: fullMessage.createdAt.toISOString(),
      files: fullMessage.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    };

    io.emit("new_message", formattedMessage);

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error creating enhanced message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== MESSAGE MANAGEMENT ==================

// Delete message (soft delete)
app.delete("/api/chat/:id", authenticate, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { files: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is authorized (message owner or admin)
    if (message.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Soft delete the message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.userId
      }
    });

    // Option 1: Keep files but remove message association
    await prisma.file.updateMany({
      where: { messageId },
      data: { messageId: null }
    });

    // Option 2: Delete files completely (uncomment if you want this)
    // await prisma.file.deleteMany({
    //   where: { messageId }
    // });

    io.emit("message_deleted", { id: messageId });

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: err.message });
  }
});

// Hard delete message (admin only)
app.delete("/api/chat/:id/hard", requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { files: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete associated files from database
    await prisma.file.deleteMany({
      where: { messageId }
    });

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId }
    });

    io.emit("message_permanently_deleted", { id: messageId });

    res.json({ message: "Message and associated files permanently deleted" });
  } catch (err) {
    console.error("Error hard deleting message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== REACTIONS ==================

app.post("/api/chat/:messageId/reactions", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

    // Check if message exists and is not deleted
    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
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
      
      io.emit("reaction_removed", { 
        messageId, 
        userId: req.user.userId, 
        reaction 
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

// ================== MESSAGE EDITING ==================

app.put("/api/chat/:messageId", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false
      }
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

// ================== READ RECEIPTS ==================

app.post("/api/chat/:messageId/read", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

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

// ================== PINNED MESSAGES ==================

app.post("/api/chat/:messageId/pin", authenticate, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false 
      },
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
              },
              files: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  size: true
                }
              }
            }
          }
        }
      });

      const formattedPin = {
        ...pin,
        createdAt: pin.createdAt.toISOString(),
        message: {
          ...pin.message,
          createdAt: pin.message.createdAt.toISOString(),
          files: pin.message.files.map(f => ({
            ...f,
            url: `/api/chat/files/${f.id}`,
            thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
          }))
        }
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
            message: `Your message was pinned by ${user.fullName}`,
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
      where: { 
        roomId: defaultRoom.id,
        message: { isDeleted: false }
      },
      include: {
        message: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true }
            },
            files: {
              select: {
                id: true,
                name: true,
                type: true,
                size: true
              }
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
        attachments: pin.message.attachments ? JSON.parse(pin.message.attachments) : [],
        files: pin.message.files.map(f => ({
          ...f,
          url: `/api/chat/files/${f.id}`,
          thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
        }))
      }
    }));

    res.json(formattedPins);
  } catch (err) {
    console.error("Error fetching pinned messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== USER BLOCKING ==================

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

// ================== ONLINE USERS ==================

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

// ================== SEARCH MESSAGES ==================

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
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      files: m.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error searching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Check files in database
app.get("/api/chat/debug/files", authenticate, async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        messageId: true,
        userId: true
      }
    });
    
    console.log(`📊 Found ${files.length} files in database`);
    res.json(files);
  } catch (err) {
    console.error("Debug error:", err);
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
    const allowedSpecialRoles = ["jumuia_leader", "treasurer", "secretary", "choir_moderator", "media_moderator", null];

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

// ================== GLOBAL PLEDGE ACTIONS ==================
// ADD THIS AFTER YOUR EXISTING PLEDGE ROUTES

app.put("/api/pledges/:pledgeId/approve", authenticate, async (req, res) => {
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

    // Check if user is authorized (admin or treasurer)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";

    if (!isAdmin && !isTreasurer) {
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

    // Create notification for the user
    const notification = await prisma.notification.create({
      data: {
        userId: pledge.userId,
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

app.put("/api/pledges/:pledgeId/manual-add", authenticate, async (req, res) => {
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

    // Check if user is authorized (admin or treasurer)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    const isAdmin = user.role === "admin";
    const isTreasurer = user.specialRole === "treasurer";

    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to add payments" });
    }

    let newPendingAmount = pledge.pendingAmount;
    let newAmountPaid = pledge.amountPaid;
    let approvedById = null;
    let approvedAt = null;
    
    if (pledge.pendingAmount > 0) {
      // First pay off pending amount
      if (amount <= pledge.pendingAmount) {
        // Partial payment of pending
        newPendingAmount = pledge.pendingAmount - amount;
      } else {
        // Pays off all pending + extra goes to paid
        newPendingAmount = 0;
        newAmountPaid = pledge.amountPaid + (amount - pledge.pendingAmount);
        approvedById = req.user.userId;
        approvedAt = new Date();
      }
    } else {
      // No pending, all goes to paid
      newAmountPaid = pledge.amountPaid + amount;
    }

    // Check if total would exceed required amount
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

    // Create notification
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