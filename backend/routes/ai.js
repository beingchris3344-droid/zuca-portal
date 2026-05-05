// ================== DEEPSEEK AI ROUTES ==================
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

const { chatWithGroq } = require("../services/deepseek/deepseekClient");
const { executeToolCall } = require("../services/deepseek/toolHandlers");

const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";

// Conversation store (in-memory — resets on server restart)
const conversations = new Map();

// Clean old conversations every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, conv] of conversations) {
    if (conv.lastActive < oneHourAgo) {
      conversations.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Auth middleware for AI routes
 */
function authenticateAI(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    req.user = null;
    next();
  }
}

/**
 * Build user context object for the AI
 */
async function buildUserContext(userId) {
  if (!userId) {
    return {
      user: null,
      stats: {},
      currentTime: new Date().toISOString()
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: true }
    });

    if (!user) {
      return { user: null, stats: {}, currentTime: new Date().toISOString() };
    }

    const [unreadCount, activePledges] = await Promise.all([
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.pledge.count({ where: { userId, status: { not: "COMPLETED" } } })
    ]);

    return {
      user: {
        fullName: user.fullName,
        role: user.role,
        specialRole: user.specialRole,
        homeJumuia: user.homeJumuia,
        membership_number: user.membership_number,
        email: user.email,
        phone: user.phone
      },
      stats: {
        unreadNotifications: unreadCount,
        activePledges
      },
      currentTime: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error building user context:", error);
    return { user: null, stats: {}, currentTime: new Date().toISOString() };
  }
}

/**
 * POST /api/deepseek/chat
 *
 * Main AI chat endpoint.
 */
router.post("/deepseek/chat", authenticateAI, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user?.userId || null;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`🤖 AI: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}" | User: ${userId || 'guest'}`);

    // Get or create conversation history
    const convId = conversationId || userId || "guest";
    if (!conversations.has(convId)) {
      conversations.set(convId, {
        messages: [],
        lastActive: Date.now()
      });
    }

    const conversation = conversations.get(convId);
    conversation.lastActive = Date.now();

    // Build user context
    const userContext = await buildUserContext(userId);

    // Add user message to history
    conversation.messages.push({
      role: "user",
      content: message
    });

    // Keep only last 20 messages for context
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }

    // Send to Groq AI
    const aiResponse = await chatWithGroq(conversation.messages, userContext);

    // Execute action if AI requested one
    let actionResult = null;
    if (aiResponse.action && aiResponse.action.name) {
      console.log(`🔧 Executing: ${aiResponse.action.name}`, aiResponse.action.arguments || {});

      try {
        actionResult = await executeToolCall(
          aiResponse.action.name,
          aiResponse.action.arguments || {},
          {
            user: req.user ? { userId: req.user.userId, fullName: userContext.user?.fullName } : null,
            req
          }
        );
        console.log(`✅ Result: ${JSON.stringify(actionResult).substring(0, 150)}`);
      } catch (err) {
        console.error(`❌ Action failed: ${aiResponse.action.name}`, err.message);
        actionResult = { error: err.message };
      }
    }

    // Add AI response to history
    if (aiResponse.content) {
      conversation.messages.push({
        role: "assistant",
        content: aiResponse.content
      });
    }

    // Build navigation action if applicable
    let navigationAction = null;
    if (actionResult && actionResult.action === "navigate" && actionResult.path) {
      navigationAction = {
        action: "navigate",
        path: actionResult.path,
        message: actionResult.message || aiResponse.content
      };
    }

    // Return response
    res.json({
      success: true,
      reply: aiResponse.content || "I've processed your request.",
      action: navigationAction,
      conversationId: convId
    });

  } catch (error) {
    console.error("❌ AI Chat Error:", error.message);
    res.status(500).json({
      success: false,
      error: "AI service temporarily unavailable.",
      reply: "Tumsifu Yesu Kristu! 🙏 I'm having trouble processing your request right now. Please try again in a moment."
    });
  }
});

/**
 * POST /api/deepseek/clear-conversation
 * Clear conversation history
 */
router.post("/deepseek/clear-conversation", authenticateAI, async (req, res) => {
  const userId = req.user?.userId || "guest";
  conversations.delete(userId);
  res.json({ success: true, message: "Conversation cleared." });
});

/**
 * GET /api/deepseek/health
 * Check if AI is working
 */
router.get("/deepseek/health", async (req, res) => {
  try {
    const testMessages = [
      { role: "user", content: "Say 'ZUCA AI is online! Tumsifu Yesu Kristu!'" }
    ];
    const response = await chatWithGroq(testMessages, { user: null, stats: {}, currentTime: new Date().toISOString() });

    res.json({
      success: true,
      status: "online",
      reply: response.content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      status: "offline",
      error: error.message
    });
  }
});

module.exports = router;