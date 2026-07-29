const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";

// ============================================
// HELPER: Get RP ID from request
// ============================================
function getRpId(req) {
  const host = req.get('host')?.split(':')[0] || '';
  
  console.log(`🔍 Getting RP ID from host: "${host}"`);
  
  // For localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'localhost';
  }
  
  // For Vercel default domains
  if (host.endsWith('.vercel.app')) {
    return 'vercel.app';
  }
  
  // For Render default domains
  if (host.endsWith('.onrender.com')) {
    return 'onrender.com';
  }
  
  // For custom domains, use the full domain
  // Or use the environment variable as fallback
  return host || process.env.DOMAIN || 'zetechcatholicaction.com';
}

// Auth middleware
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

// ============================================
// 1. CHECK BIOMETRIC STATUS
// ============================================
router.get("/status", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { 
        biometricRegistered: true,
        biometricCredentialId: true
      }
    });
    
    res.json({ 
      success: true,
      registered: user?.biometricRegistered || false,
      hasCredential: !!user?.biometricCredentialId
    });
  } catch (err) {
    console.error("Biometric status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 2. GET REGISTRATION CHALLENGE
// ============================================
router.post("/register-challenge", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const challenge = crypto.randomBytes(32).toString('base64url');
    const rpId = getRpId(req);
    
    console.log(`📝 Registration challenge for user ${userId}, RP ID: ${rpId}`);
    
    await prisma.biometricChallenge.create({
      data: {
        userId,
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true }
    });
    
    res.json({
      success: true,
      challenge,
      rpId: rpId,  // ✅ Dynamic RP ID
      rpName: "ZUCA Portal",
      userId: userId.toString(),
      userName: user?.email || user?.fullName || "Zuca User",
      userDisplayName: user?.fullName || "ZUCA Member"
    });
  } catch (err) {
    console.error("Registration challenge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 3. COMPLETE BIOMETRIC REGISTRATION
// ============================================
router.post("/register", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { credentialId, publicKey, attestationObject, clientDataJSON, transports } = req.body;
    
    console.log(`📝 Registration for user ${userId}, credential: ${credentialId?.substring(0, 30)}...`);
    
    if (!credentialId) {
      return res.status(400).json({ error: "Credential ID required" });
    }
    
    // Verify challenge was valid
    const challengeRecord = await prisma.biometricChallenge.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!challengeRecord) {
      return res.status(400).json({ error: "Challenge expired. Please try again." });
    }
    
    // Check if credential already exists
    const existingUser = await prisma.user.findFirst({
      where: { biometricCredentialId: credentialId }
    });
    
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: "This fingerprint is already registered to another user" });
    }
    
    // Store credential
    await prisma.user.update({
      where: { id: userId },
      data: {
        biometricRegistered: true,
        biometricCredentialId: credentialId,
        biometricPublicKey: publicKey || null,
        biometricTransports: transports || JSON.stringify(['internal', 'hybrid'])
      }
    });
    
    // Clean up used challenges
    await prisma.biometricChallenge.deleteMany({
      where: { userId }
    });
    
    console.log(`✅ Biometric registered for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: "Fingerprint registered successfully!" 
    });
  } catch (err) {
    console.error("Biometric registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 4. GET LOGIN CHALLENGE
// ============================================
router.post("/login-challenge", async (req, res) => {
  try {
    const { email } = req.body;
    const rpId = getRpId(req);
    
    console.log(`🔐 Login challenge request, RP ID: ${rpId}`);
    
    if (email) {
      const user = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase(),
          biometricRegistered: true
        }
      });
      
      if (user) {
        const challenge = crypto.randomBytes(32).toString('base64url');
        
        await prisma.biometricChallenge.create({
          data: {
            userId: user.id,
            challenge,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            type: 'login'
          }
        });
        
        let transports = ['internal', 'hybrid'];
        try {
          if (user.biometricTransports) {
            transports = JSON.parse(user.biometricTransports);
          }
        } catch (e) {}
        
        return res.json({
          success: true,
          challenge,
          rpId: rpId,  // ✅ Dynamic RP ID
          allowCredentials: [
            {
              id: user.biometricCredentialId,
              type: 'public-key',
              transports: transports
            }
          ],
          userVerification: 'required'
        });
      }
    }
    
    // No biometric user found
    const challenge = crypto.randomBytes(32).toString('base64url');
    res.json({
      success: true,
      challenge,
      rpId: rpId,  // ✅ Dynamic RP ID
      userVerification: 'required'
    });
  } catch (err) {
    console.error("Login challenge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 5. LOGIN WITH BIOMETRIC
// ============================================
router.post("/login", async (req, res) => {
  try {
    const { credentialId } = req.body;
    
    console.log(`🔐 Login with credential: ${credentialId?.substring(0, 30)}...`);
    
    if (!credentialId) {
      return res.status(400).json({ error: "Credential ID required" });
    }
    
    const user = await prisma.user.findFirst({
      where: { 
        biometricCredentialId: credentialId,
        biometricRegistered: true
      },
      include: {
        homeJumuia: true,
        leadingJumuia: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: "Fingerprint not recognized. Please register in your ZUCA profile settings or login with password." });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        specialRole: user.specialRole
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );
    
    // Update last active and biometric login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastActive: new Date(),
        lastBiometricLogin: new Date()
      }
    });
    
    console.log(`🔐 Biometric login for ${user.email}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membership_number: user.membership_number,
        profileImage: user.profileImage,
        jumuiaId: user.jumuiaId,
        jumuia: user.homeJumuia?.name || null,
        leadingJumuia: user.leadingJumuia?.code || null
      }
    });
  } catch (err) {
    console.error("Biometric login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 6. REMOVE BIOMETRIC
// ============================================
router.delete("/remove", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { biometricRegistered: true }
    });
    
    if (!user?.biometricRegistered) {
      return res.status(400).json({ error: "No biometric registered" });
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        biometricRegistered: false,
        biometricCredentialId: null,
        biometricPublicKey: null,
        biometricTransports: null,
        lastBiometricLogin: null
      }
    });
    
    await prisma.biometricChallenge.deleteMany({
      where: { userId }
    });
    
    console.log(`🗑️ Biometric removed for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: "Fingerprint removed successfully" 
    });
  } catch (err) {
    console.error("Remove biometric error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;