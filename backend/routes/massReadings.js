const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin, requireLeaderOrAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// ==================== FIRE-AND-FORGET NOTIFICATIONS ====================

async function sendBulkNotifications(users, title, message, data = {}) {
  if (!users || users.length === 0) return;

  const BATCH_SIZE = 50;
  
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    
    // Fire and forget - no await
    setImmediate(async () => {
      try {
        // Bulk create notifications
        const notifications = batch.map(user => ({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: user.id,
          type: "mass_reading",
          title: title,
          message: message,
          read: false,
          data: data || {},
          createdAt: new Date()
        }));

        await prisma.notification.createMany({
          data: notifications,
          skipDuplicates: true
        });

        // Send real-time via Socket.IO (fire and forget)
        const io = global.io;
        if (io) {
          batch.forEach(user => {
            io.to(user.id).emit('new_notification', {
              ...notifications.find(n => n.userId === user.id),
              createdAt: new Date().toISOString()
            });
          });
        }

        // Send push notifications (fire and forget)
        try {
          const subscriptions = await prisma.pushSubscription.findMany({
            where: {
              userId: { in: batch.map(u => u.id) }
            }
          });

          const webpush = require('web-push');
          webpush.setVapidDetails(
            'mailto:zucaportal2025@gmail.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );

          const unreadCounts = await prisma.notification.groupBy({
            by: ['userId'],
            where: {
              userId: { in: batch.map(u => u.id) },
              read: false
            },
            _count: true
          });
          const unreadMap = {};
          unreadCounts.forEach(u => { unreadMap[u.userId] = u._count; });

          for (const sub of subscriptions) {
            try {
              const pushSubscription = JSON.parse(sub.subscription);
              await webpush.sendNotification(
                pushSubscription,
                JSON.stringify({
                  title,
                  body: message,
                  icon: '/android-chrome-192x192.png',
                  badge: '/favicon.ico',
                  badgeCount: (unreadMap[sub.userId] || 0) + 1,
                  data: { type: "mass_reading", ...data },
                  timestamp: Date.now()
                }),
                { urgency: 'high', TTL: 86400 }
              );
            } catch (err) {
              // Failed push, continue
            }
          }
        } catch (err) {
          // Push failed, continue
        }
      } catch (err) {
        console.error('Batch notification error:', err.message);
      }
    });
  }
}

async function sendSingleNotification(userId, title, message, data = {}) {
  // Fire and forget
  setImmediate(async () => {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: "mass_reading",
          title,
          message,
          read: false,
          data: data || {}
        }
      });

      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
      }

      try {
        const subscription = await prisma.pushSubscription.findUnique({
          where: { userId }
        });

        if (subscription) {
          const webpush = require('web-push');
          webpush.setVapidDetails(
            'mailto:zucaportal2025@gmail.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );

          const unreadCount = await prisma.notification.count({
            where: { userId, read: false }
          });

          const pushSubscription = JSON.parse(subscription.subscription);
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title,
              body: message,
              icon: '/android-chrome-192x192.png',
              badge: '/favicon.ico',
              badgeCount: unreadCount + 1,
              data: { type: "mass_reading", ...data },
              timestamp: Date.now()
            }),
            { urgency: 'high', TTL: 86400 }
          );
        }
      } catch (err) {
        // Push failed
      }
    } catch (err) {
      console.error('Notification error:', err.message);
    }
  });
}

// ==================== ROUTES ====================

router.get("/", async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const readings = await prisma.massReading.findMany({
      where: { isPublished: true },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: skip
    });

    const total = await prisma.massReading.count({
      where: { isPublished: true }
    });

    res.json({
      success: true,
      readings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching readings:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await prisma.massReading.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    if (!reading) {
      return res.status(404).json({ success: false, error: "Reading not found" });
    }

    res.json({ success: true, reading });
  } catch (err) {
    console.error("Error fetching reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, date, dateLabel, attachments } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Title and date are required" });
    }

    // Create reading (fast)
    const reading = await prisma.massReading.create({
      data: {
        title,
        description: description || null,
        date: new Date(date),
        dateLabel: dateLabel || new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        uploadedBy: req.user.userId,
        isPublished: true
      }
    });

    // Add attachments (fast)
    if (attachments && attachments.length > 0) {
      await prisma.massReadingAttachment.createMany({
        data: attachments.map((att, index) => ({
          readingId: reading.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          publicId: att.publicId,
          fileType: att.fileType,
          mimeType: att.mimeType || null,
          fileSize: att.fileSize || null,
          displayOrder: index
        }))
      });
    }

    // Get complete reading (fast)
    const completeReading = await prisma.massReading.findUnique({
      where: { id: reading.id },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    // Get uploader info (fast)
    const uploader = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { fullName: true }
    });

    // Send response IMMEDIATELY (no waiting for notifications)
    res.status(201).json({
      success: true,
      message: "Reading created successfully",
      reading: completeReading
    });

    // ============ FIRE AND FORGET - NOTIFICATIONS IN BACKGROUND ============
    setImmediate(async () => {
      try {
        // Get all users
        const allUsers = await prisma.user.findMany({
          select: { id: true }
        });

        if (allUsers.length === 0) return;

        const uploaderName = uploader?.fullName || 'Someone';
        const notifTitle = "📖 New Mass Reading Available";
        const notifMessage = `${uploaderName} uploaded: ${title}`;
        const notifData = { readingId: reading.id, title, date };

        // Send bulk notifications (batched)
        await sendBulkNotifications(allUsers, notifTitle, notifMessage, notifData);

        // Socket.IO real-time event
        const io = req.app.get("io");
        if (io) {
          io.emit("new_mass_reading", {
            readingId: reading.id,
            title: title,
            date: date,
            uploader: uploaderName
          });
        }

        console.log(`📖 Mass reading created: "${title}" - Notifications sent to ${allUsers.length} users`);
      } catch (err) {
        console.error("Background notification error:", err.message);
      }
    });

  } catch (err) {
    console.error("Error creating reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, dateLabel, isPublished, attachments } = req.body;

    const existing = await prisma.massReading.findUnique({
      where: { id },
      include: { attachments: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Reading not found" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (existing.uploadedBy !== req.user.userId && user?.role !== 'admin') {
      return res.status(403).json({ error: "You can only edit your own readings" });
    }

    const updated = await prisma.massReading.update({
      where: { id },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        date: date ? new Date(date) : existing.date,
        dateLabel: dateLabel || existing.dateLabel,
        isPublished: isPublished !== undefined ? isPublished : existing.isPublished,
        updatedAt: new Date()
      }
    });

    if (attachments) {
      await prisma.massReadingAttachment.deleteMany({
        where: { readingId: id }
      });

      if (attachments.length > 0) {
        await prisma.massReadingAttachment.createMany({
          data: attachments.map((att, index) => ({
            readingId: id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            publicId: att.publicId,
            fileType: att.fileType,
            mimeType: att.mimeType || null,
            fileSize: att.fileSize || null,
            displayOrder: index
          }))
        });
      }
    }

    const completeReading = await prisma.massReading.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Reading updated successfully",
      reading: completeReading
    });
  } catch (err) {
    console.error("Error updating reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.massReading.findUnique({
      where: { id },
      include: { attachments: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Reading not found" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (existing.uploadedBy !== req.user.userId && user?.role !== 'admin') {
      return res.status(403).json({ error: "You can only delete your own readings" });
    }

    // Delete from Cloudinary (fire and forget)
    for (const att of existing.attachments) {
      setImmediate(async () => {
        try {
          await cloudinary.uploader.destroy(att.publicId);
        } catch (err) {
          console.warn("Could not delete from Cloudinary:", att.publicId);
        }
      });
    }

    await prisma.massReading.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Reading deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/upload", authenticate, upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];
    const uploadPromises = [];

    for (const file of files) {
      uploadPromises.push(
        new Promise(async (resolve) => {
          try {
            const isImage = file.mimetype.startsWith('image/');
            const isVideo = file.mimetype.startsWith('video/');
            const isPDF = file.mimetype === 'application/pdf';
            const isWord = file.mimetype === 'application/msword' || 
                           file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const isPowerPoint = file.mimetype === 'application/vnd.ms-powerpoint' || 
                                 file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

            let options = {
              folder: 'mass-readings',
              resource_type: 'auto'
            };

            if (isVideo) options.resource_type = 'video';
            else if (isPDF || isWord || isPowerPoint) options.resource_type = 'raw';
            else if (isImage) options.resource_type = 'image';

            const result = await cloudinary.uploader.upload(file.path, options);
            
            let fileType = 'image';
            if (isVideo) fileType = 'video';
            else if (isPDF) fileType = 'pdf';
            else if (isWord) fileType = 'word';
            else if (isPowerPoint) fileType = 'powerpoint';
            else fileType = 'image';

            resolve({
              fileName: file.originalname,
              fileUrl: result.secure_url,
              publicId: result.public_id,
              fileType: fileType,
              mimeType: file.mimetype,
              fileSize: file.size
            });
          } catch (err) {
            console.error("Error uploading file:", file.originalname, err.message);
            resolve(null);
          }
        })
      );
    }

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    
    // Filter out failed uploads
    for (const result of results) {
      if (result) uploadedFiles.push(result);
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No files could be uploaded. Please check file formats." 
      });
    }

    res.json({
      success: true,
      files: uploadedFiles
    });

    // Clean up temp files (fire and forget)
    setImmediate(() => {
      for (const file of files) {
        try {
          require('fs').unlinkSync(file.path);
        } catch (err) {
          // Ignore
        }
      }
    });

  } catch (err) {
    console.error("Error in upload:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;