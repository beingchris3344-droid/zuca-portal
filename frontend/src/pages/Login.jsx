import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// Slideshow images
import slide1 from "../assets/background2.webp";
import slide2 from "../assets/2.jpg";
import slide3 from "../assets/3.jpg";
import slide4 from "../assets/4.jpg";
import slide5 from "../assets/5.jpg";
import slide6 from "../assets/6.jpg";
import slide7 from "../assets/7.jpg";
import slide8 from "../assets/8.jpg";
import slide9 from "../assets/9.jpg";
import slide10 from "../assets/10.jpg";
import slide11 from "../assets/11.jpg";
import slide12 from "../assets/12.jpg";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";
import { FaFingerprint } from "react-icons/fa";

// ============================================
// HELPER: Convert base64url to ArrayBuffer
// ============================================
function base64urlToArrayBuffer(base64url) {
  // 1. Replace URL-safe characters with standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // 2. Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  // 3. Decode with atob() - now it works!
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [loginMode, setLoginMode] = useState("normal");
  const [detectedRole, setDetectedRole] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const navigate = useNavigate();

  // ===== BIOMETRIC/FINGERPRINT STATES =====
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricLogin, setIsBiometricLogin] = useState(false);
  const [biometricError, setBiometricError] = useState("");
  const [hasRegisteredFingerprint, setHasRegisteredFingerprint] = useState(false);
  
  // ===== FINGERPRINT PROMPT STATE =====
  const [showFingerprintPrompt, setShowFingerprintPrompt] = useState(false);

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const slideIntervalRef = useRef(null);

  const slides = [
    { id: 1, image: slide1 },
    { id: 2, image: slide2 },
    { id: 3, image: slide3 },
    { id: 4, image: slide4 },
    { id: 5, image: slide5 },
    { id: 6, image: slide6 },
    { id: 7, image: slide7 },
    { id: 8, image: slide8 },
    { id: 9, image: slide9 },
    { id: 10, image: slide10 },
    { id: 11, image: slide11 },
    { id: 12, image: slide12 },
  ];

  // Auto-play slideshow
  useEffect(() => {
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [isPlaying, slides.length]);

  // ===== CHECK BIOMETRIC SUPPORT =====
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricSupported(available);
          
          if (available) {
            const token = localStorage.getItem('token');
            if (token) {
              try {
                const res = await fetch(`${BASE_URL}/api/biometric/status`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setHasRegisteredFingerprint(data.registered);
              } catch (err) {
                console.log("Could not check biometric status");
              }
            }
          }
        }
      } catch (error) {
        console.error("Biometric support check failed:", error);
        setIsBiometricSupported(false);
      }
    };
    
    checkBiometricSupport();
  }, []);

  // Track mouse for subtle parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const redirect = localStorage.getItem('redirectAfterLogin');
    if (redirect) {
      setRedirectAfterLogin(redirect);
    }
  }, []);

  // CRITICAL: Check for saved session and AUTO-LOGIN
  useEffect(() => {
    const autoLogin = async () => {
      const token = localStorage.getItem('token');
      const userJson = localStorage.getItem('user');
      const rememberMeFlag = localStorage.getItem('rememberMe') === 'true';
      const rememberExpiry = localStorage.getItem('rememberExpiry');
      
      let isExpired = false;
      if (rememberExpiry) {
        const expiryDate = new Date(rememberExpiry);
        const now = new Date();
        isExpired = now > expiryDate;
        if (isExpired) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberExpiry');
          localStorage.removeItem('rememberedEmail');
        }
      }
      
      if (!isExpired && rememberMeFlag && token && userJson) {
        try {
          console.log('Auto-login: Found valid saved session, logging in automatically...');
          const userData = JSON.parse(userJson);
          
          const verifyRes = await fetch(`${BASE_URL}/api/verify-token`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          });
          
          if (verifyRes.ok) {
            console.log('Auto-login: Token verified, redirecting...');
            showAutoLoginToast(userData.fullName?.split(' ')[0] || 'User');
            
            setTimeout(() => {
              if (userData.role === "admin") {
                navigate("/dashboard");
              } else if (userData.role === "jumuia_leader") {
                navigate(`/jumuia/${userData.jumuiaCode}`);
              } else if (userData.role === "treasurer") {
                navigate("/treasurer");
              } else if (userData.role === "secretary") {
                navigate("/secretary");
              } else if (userData.role === "choir_moderator") {
                navigate("/choir");
              } else if (userData.role === "media_moderator") {
                navigate("/media-moderator");
              } else {
                navigate("/dashboard");
              }
            }, 500);
            return;
          } else {
            console.log('Auto-login: Token invalid, clearing session');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberExpiry');
            localStorage.removeItem('rememberedEmail');
          }
        } catch (error) {
          console.error('Auto-login failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberExpiry');
          localStorage.removeItem('rememberedEmail');
        }
      }
      
      setIsCheckingAutoLogin(false);
      
      const savedEmail = localStorage.getItem('rememberedEmail');
      if (savedEmail && !isExpired) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    };

    autoLogin();
  }, [navigate]);

  // ===== HANDLE FINGERPRINT LOGIN =====
  const handleFingerprintLogin = async () => {
    if (!isBiometricSupported) {
      setBiometricError("Fingerprint not supported on this device");
      return;
    }
    
    setIsBiometricLogin(true);
    setBiometricError("");
    
    try {
      const challengeRes = await fetch(`${BASE_URL}/api/biometric/login-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined })
      });
      
      const challengeData = await challengeRes.json();
      
      if (!challengeData.success) {
        throw new Error(challengeData.error || "Failed to get challenge");
      }
      
      // ✅ FIXED: Use helper function instead of direct atob()
      const challengeBuffer = new Uint8Array(
        base64urlToArrayBuffer(challengeData.challenge)
      );
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          timeout: 60000,
          rpId: challengeData.rpId || window.location.hostname,
          userVerification: "required",
          allowCredentials: challengeData.allowCredentials?.map(cred => ({
            id: new Uint8Array(base64urlToArrayBuffer(cred.id)),
            type: "public-key"
          }))
        }
      });
      
      if (!credential) {
        throw new Error("Fingerprint authentication cancelled");
      }
      
      const credentialId = credential.id;
      
      const loginRes = await fetch(`${BASE_URL}/api/biometric/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId })
      });
      
      const loginData = await loginRes.json();
      
      if (loginRes.ok && loginData.token) {
        handleSuccessfulLogin(loginData.user, loginData.token);
      } else {
        setBiometricError(loginData.error || "Fingerprint authentication failed");
      }
      
    } catch (error) {
      console.error("Fingerprint login error:", error);
      if (error.name === "NotAllowedError") {
        setBiometricError("Fingerprint authentication was cancelled");
      } else if (error.name === "NotFoundError") {
        setBiometricError("No registered fingerprint found. Please login with password first.");
      } else {
        setBiometricError(error.message || "Fingerprint login failed");
      }
    } finally {
      setIsBiometricLogin(false);
    }
  };

  // ===== SUCCESSFUL LOGIN HANDLER (with fingerprint prompt) =====
  const handleSuccessfulLogin = (userData, token) => {
    // Store token and user data
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', email);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      localStorage.setItem('rememberExpiry', expiryDate.toISOString());
      showToast("Auto-sign in enabled!", "success");
    } else {
      localStorage.setItem('rememberMe', 'false');
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberExpiry');
    }

    // Show welcome toast
    showWelcomeToast(userData.fullName?.split(' ')[0] || 'Member', userData.role);

    // ===== CHECK IF USER HAS FINGERPRINT REGISTERED =====
    // If not, show a prompt to register after a short delay
    setTimeout(async () => {
      try {
        const statusRes = await fetch(`${BASE_URL}/api/biometric/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const statusData = await statusRes.json();
        
        // If not registered, show the prompt
        if (!statusData.registered) {
          setShowFingerprintPrompt(true);
        }
      } catch (err) {
        console.log("Could not check biometric status");
      }
    }, 1500);

    // Navigate after delay
    setTimeout(() => {
      const roleRedirects = {
        admin: "/dashboard",
        jumuia_leader: `/jumuia/${userData.jumuiaCode}`,
        treasurer: "/treasurer",
        secretary: "/secretary",
        choir_moderator: "/choir",
        media_moderator: "/media-moderator"
      };
      const redirectPath = roleRedirects[userData.role] || "/dashboard";
      navigate(redirectPath);
    }, 500);
  };

  // Show auto-login toast notification
  const showAutoLoginToast = (userName) => {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">✨</span>
        <div>
          <strong style="font-size: 15px;">Welcome back, ${userName}!</strong>
          <div style="font-size: 12px; opacity: 0.9;">Auto-sign in successful</div>
        </div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 14px 20px;
      border-radius: 16px;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      animation: slideInRight 0.3s ease;
      cursor: pointer;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Auto-detect role login based on password
  useEffect(() => {
    if (password) {
      const roleKeywords = ['stmichael', 'stbenedict', 'stperegrine', 'christtheking', 'stgregory', 'stpacificus'];
      if (roleKeywords.some(keyword => password.startsWith(keyword))) {
        setLoginMode("role");
        setDetectedRole("jumuia_leader");
      } else if (password.startsWith("treasurer")) {
        setLoginMode("role");
        setDetectedRole("treasurer");
      } else if (password.startsWith("secretary")) {
        setLoginMode("role");
        setDetectedRole("secretary");
      } else if (password.startsWith("choir")) {
        setLoginMode("role");
        setDetectedRole("choir_moderator");
      } else if (password.startsWith("media")) {
        setLoginMode("role");
        setDetectedRole("media_moderator");
      } else {
        setLoginMode("normal");
        setDetectedRole(null);
      }
    } else {
      setLoginMode("normal");
      setDetectedRole(null);
    }
  }, [password]);

  // Email validation
  useEffect(() => {
    if (loginMode === "normal" && email && !email.includes("@")) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }, [email, loginMode]);

  const welcome = {
    normal: {
      greeting: "Welcome Back",
      title: "Sign in to",
      subtitle: "ZUCA Portal",
      color: "#3b82f6"
    },
    jumuia_leader: {
      greeting: "👑 Jumuia Leader",
      title: "Welcome, moderator",
      subtitle: "manage your jumuia",
      color: "#8b5cf6"
    },
    treasurer: {
      greeting: "💰 Treasurer",
      title: "Welcome,!",
      subtitle: "Manage Finances",
      color: "#f59e0b"
    },
    secretary: {
      greeting: "📝 Secretary",
      title: "Welcome,!",
      subtitle: "manage zuca",
      color: "#10b981"
    },
    choir_moderator: {
      greeting: "🎵 Choir Moderator",
      title: "Welcome,",
      subtitle: "ST KIZITO CHOIR,",
      color: "#ec4899"
    },
    media_moderator: {
      greeting: "📸 Media Moderator",
      title: "Welcome,",
      subtitle: "manage gallary",
      color: "#06b6d4"
    }
  };

  const currentWelcome = detectedRole && welcome[detectedRole] ? welcome[detectedRole] : welcome.normal;

  const getRoleIcon = () => {
    if (!detectedRole) return null;
    const icons = {
      jumuia_leader: "👑",
      treasurer: "💰",
      secretary: "📝",
      choir_moderator: "🎵",
      media_moderator: "📸"
    };
    return icons[detectedRole];
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const endpoint = loginMode === "normal" ? "/api/login" : "/api/role-login";
      
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (data.user.role === 'jumuia_leader' && !data.user.jumuiaCode) {
          const roleKeywords = ['stmichael', 'stbenedict', 'stperegrine', 'christtheking', 'stgregory', 'stpacificus'];
          let jumuiaCode = roleKeywords.find(keyword => password.startsWith(keyword));
          
          if (jumuiaCode) {
            data.user.jumuiaCode = jumuiaCode;
          } else if (data.user.jumuia) {
            data.user.jumuiaCode = data.user.jumuia.toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
          }
          data.user.specialRole = 'jumuia_leader';
        }
        
        handleSuccessfulLogin(data.user, data.token);
      } else {
        setLoginError(data.error || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setLoginError("Unable to connect. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, type = "success") => {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">${type === "success" ? "✅" : "ℹ️"}</span>
        <span>${message}</span>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === "success" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #3b82f6, #2563eb)"};
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideInRight 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Show welcome toast on successful login
  const showWelcomeToast = (userName, role) => {
    const roleEmoji = {
      admin: "👑",
      jumuia_leader: "👥",
      treasurer: "💰",
      secretary: "📝",
      choir_moderator: "🎵",
      media_moderator: "📸"
    };
    
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 28px;">${roleEmoji[role] || "✨"}</span>
        <div>
          <strong style="font-size: 15px;">Welcome, ${userName}!</strong>
          <div style="font-size: 12px; opacity: 0.9;">Successfully signed in</div>
        </div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      padding: 14px 20px;
      border-radius: 16px;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      animation: slideInRight 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Clear saved session
  const clearSavedSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberExpiry');
    showToast("Saved session cleared", "info");
    window.location.reload();
  };

  // ===== FINGERPRINT PROMPT MODAL =====
  const FingerprintPromptModal = () => (
    <div style={promptStyles.overlay}>
      <div style={promptStyles.modal}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🖐️</div>
        <h2 style={promptStyles.title}>Secure Your Account</h2>
        <p style={promptStyles.description}>
          Register your fingerprint for faster and more secure login next time.
          <br/><br/>
          <span style={promptStyles.highlight}>
            ⚡ One-tap login • 🔒 More secure • 📱 Works on all devices
          </span>
        </p>
        <div style={promptStyles.buttonGroup}>
          <button 
            onClick={() => {
              setShowFingerprintPrompt(false);
              navigate('/profile');
              setTimeout(() => showToast("👆 Go to 'Fingerprint Login' section to register!", "info"), 500);
            }}
            style={promptStyles.primaryBtn}
          >
            📱 Register Fingerprint Now
          </button>
          <button 
            onClick={() => {
              setShowFingerprintPrompt(false);
              showToast("You can register later in Profile Settings", "info");
            }}
            style={promptStyles.secondaryBtn}
          >
            Maybe Later
          </button>
        </div>
        <p style={promptStyles.footer}>You can always register later in Profile Settings</p>
      </div>
    </div>
  );

  if (isCheckingAutoLogin) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Checking for saved session...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      {/* Slideshow Background */}
      <div className="login-slideshow-container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`login-slide ${index === currentSlide ? 'active' : ''}`}
          >
            <img
              src={slide.image}
              alt="background"
              className="login-slide-image"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* ===== FINGERPRINT PROMPT MODAL ===== */}
      {showFingerprintPrompt && <FingerprintPromptModal />}

      <div style={styles.container}>
        <div 
          style={{
            ...styles.backgroundOverlay,
            transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`
          }} 
        />
        
        <div style={styles.particlesContainer}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.particle,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${3 + Math.random() * 6}px`,
                height: `${3 + Math.random() * 6}px`,
                animationDelay: `${i * 2}s`,
                animationDuration: `${10 + Math.random() * 15}s`
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            ...styles.card,
            transform: `perspective(1000px) rotateX(${mousePosition.y * 0.01}deg) rotateY(${mousePosition.x * 0.01}deg)`
          }}
        >
          <div style={styles.cardInner} />

          <motion.div 
            style={styles.logoContainer}
            whileHover={{ scale: 1.05 }}
          >
            <img src={logo} alt="ZUCA Logo" style={styles.logo} />
            <div style={styles.logoUnderline} />
          </motion.div>

          <div style={styles.welcomeSection}>
            <h2 style={styles.welcomeTitle}>
              <span style={styles.welcomeSubtitle}>{currentWelcome.title}</span>
              <span style={{ ...styles.welcomeMain, color: currentWelcome.color }}>
                {detectedRole ? `${getRoleIcon()} ${currentWelcome.subtitle}` : currentWelcome.subtitle}
              </span>
            </h2>
            <p style={{ ...styles.welcomeGreeting, color: currentWelcome.color }}>
              {currentWelcome.greeting}
            </p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <span style={{ color: focusedField === "email" ? currentWelcome.color : "#ffffff" }}>
                  Email Address
                </span>
              </label>
              <div style={styles.inputWrapper}>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Your Registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  style={{
                    ...styles.input,
                    borderColor: emailError ? "#ef4444" : focusedField === "email" ? currentWelcome.color : "#ffffff"
                  }}
                />
                {focusedField === "email" && (
                  <div style={{ ...styles.inputGlow, background: `linear-gradient(135deg, ${currentWelcome.color}, transparent)` }} />
                )}
              </div>
              <AnimatePresence>
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={styles.errorText}
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <span style={{ color: focusedField === "password" ? currentWelcome.color : "#ffffff" }}>
                  Password
                </span>
              </label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  style={{
                    ...styles.input,
                    paddingRight: "45px",
                    borderColor: focusedField === "password" ? currentWelcome.color : "#ffffff"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
                {focusedField === "password" && (
                  <div style={{ ...styles.inputGlow, background: `linear-gradient(135deg, ${currentWelcome.color}, transparent)` }} />
                )}
              </div>
            </div>

            <div style={styles.optionsRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{ color: rememberMe ? currentWelcome.color : "#ffffff" }}>
                  Keep me signed in for 30 days
                </span>
              </label>
              <Link to="/forgot-password" style={styles.forgotLink}>
                <p>Forgot password?</p> 
              </Link>
            </div>

            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={styles.loginError}
                >
                  {loginError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== FINGERPRINT LOGIN BUTTON ===== */}
            {isBiometricSupported && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={styles.fingerprintContainer}
              >
                <button
                  type="button"
                  onClick={handleFingerprintLogin}
                  disabled={isBiometricLogin || loading}
                  style={{
                    ...styles.fingerprintButton,
                    background: `linear-gradient(135deg, ${currentWelcome.color}, ${currentWelcome.color}dd)`,
                  }}
                >
                  {isBiometricLogin ? (
                    <div style={styles.buttonLoading}>
                      <span style={styles.buttonSpinner}>⟳</span>
                      <span>Verifying Fingerprint...</span>
                    </div>
                  ) : (
                    <div style={styles.fingerprintContent}>
                      <span style={styles.fingerprintIcon}><FaFingerprint /></span>
                      <span>Login with Fingerprint</span>
                    </div>
                  )}
                </button>
                
                {biometricError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={styles.fingerprintError}
                  >
                    {biometricError}
                  </motion.p>
                )}
                
                <div style={styles.dividerContainer}>
                  <span style={styles.dividerLine} />
                  <span style={styles.dividerText}>or continue with</span>
                  <span style={styles.dividerLine} />
                </div>
              </motion.div>
            )}

           
            <motion.button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                background: `linear-gradient(135deg, ${currentWelcome.color}, ${currentWelcome.color}dd)`,
                boxShadow: `0 10px 25px -5px ${currentWelcome.color}80`
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div style={styles.buttonLoading}>
                  <span style={styles.buttonSpinner}>⟳</span>
                  <span>{detectedRole ? "Welcoming..." : "Signing in..."}</span>
                </div>
              ) : (
                <span>{detectedRole ? `Continue as ${detectedRole.replace('_', ' ')}` : "Sign In"}</span>
              )}
            </motion.button>
          </form>

          <div style={styles.registerSection}>
            <p style={styles.registerText}>New to ZUCA?</p>
            <Link to="/register">
              <motion.button
                style={styles.registerButton}
                whileHover={{ scale: 1.02, backgroundColor: "#3b82f6" }}
                whileTap={{ scale: 0.98 }}
              >
                Create Account
              </motion.button>
            </Link>
          </div>

          <div style={styles.faithText}>
            "Where two or three gather in my name..." ✝
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #475569;
        }

        .login-slideshow-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }
        .login-slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }
        .login-slide.active {
          opacity: 1;
          z-index: 1;
        }
        .login-slide-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
       
        .login-slideshow-container {
          background-color: #0a0a1e;
        }
      `}</style>
    </div>
  );
}

// ===== STYLES =====
const styles = {
  pageWrapper: {
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative"
  },
  loadingContainer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a00 0%, #1e1b4b 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white"
  },
  loadingSpinner: {
    width: "48px",
    height: "48px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px"
  },
  loadingText: {
    fontSize: "14px",
    color: "#94a3b8"
  },
  container: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    zIndex: 2
  },
  backgroundOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0), rgba(30, 27, 75, 0.51))",
    transition: "transform 0.1s ease-out",
    zIndex: 1
  },
  particlesContainer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 1
  },
  particle: {
    position: "absolute",
    background: "rgba(59,130,246,0.2)",
    borderRadius: "50%",
    pointerEvents: "none",
    animation: "float 8s ease-in-out infinite"
  },
  card: {
    position: "relative",
    zIndex: 2,
    width: "90%",
    maxWidth: "440px",
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(8px)",
    borderRadius: "32px",
    padding: "20px 32px",
    border: "1px solid rgba(255,255,255,0.1)",
    transition: "transform 0.1s ease-out"
  },
  cardInner: {
    position: "absolute",
    inset: 0,
    borderRadius: "32px",
    background: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.1), transparent 70%)",
    pointerEvents: "none"
  },
  logoContainer: {
    textAlign: "center",
    marginBottom: "32px",
    cursor: "pointer"
  },
  logo: {
    width: "80px",
    height: "auto",
    marginBottom: "12px",
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))"
  },
  logoUnderline: {
    width: "60px",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
    margin: "0 auto"
  },
  welcomeSection: {
    textAlign: "center",
    marginBottom: "32px"
  },
  welcomeTitle: {
    margin: 0,
    fontWeight: 600
  },
  welcomeSubtitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#64748b",
    letterSpacing: "1px",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "8px"
  },
  welcomeMain: {
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    display: "block"
  },
  welcomeGreeting: {
    fontSize: "14px",
    marginTop: "8px",
    opacity: 0.9
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    marginLeft: "4px"
  },
  inputWrapper: {
    position: "relative"
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "rgba(30,41,59,0.6)",
    border: "1px solid",
    borderRadius: "16px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box"
  },
  inputGlow: {
    position: "absolute",
    inset: "-2px",
    borderRadius: "18px",
    opacity: 0.3,
    zIndex: -1
  },
  eyeButton: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    opacity: 0.6,
    padding: 0
  },
  errorText: {
    color: "#ef4444",
    fontSize: "12px",
    marginLeft: "4px"
  },
  optionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer"
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#3b82f6"
  },
  forgotLink: {
    color: "#00ff15",
    fontSize: "12px",
    textDecoration: "none",
    transition: "color 0.2s"
  },
  loginError: {
    backgroundColor: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "12px",
    padding: "12px",
    textAlign: "center",
    color: "#ef4444",
    fontSize: "13px"
  },
  loginButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "40px",
    border: "none",
    color: "white",
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "8px"
  },
  buttonLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  buttonSpinner: {
    display: "inline-block",
    animation: "spin 1s linear infinite"
  },
  registerSection: {
    textAlign: "center",
    marginTop: "28px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.08)"
  },
  registerText: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "12px"
  },
  registerButton: {
    padding: "10px 32px",
    backgroundColor: "rgba(59,130,246,0.2)",
    border: "1px solid rgba(59,130,246,0.5)",
    borderRadius: "40px",
    color: "#f1f5f9",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  faithText: {
    textAlign: "center",
    fontSize: "11px",
    color: "#475569",
    marginTop: "28px",
    fontStyle: "italic"
  },
  // ===== FINGERPRINT STYLES =====
  fingerprintContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "4px"
  },
  fingerprintButton: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "40px",
    border: "none",
    color: "white",
    fontWeight: 500,
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  fingerprintContent: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  fingerprintIcon: {
    fontSize: "22px"
  },
  fingerprintError: {
    color: "#ef4444",
    fontSize: "12px",
    textAlign: "center"
  },
  dividerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "4px 0"
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255,255,255,0.1)"
  },
  dividerText: {
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap"
  },
}

// ===== FINGERPRINT PROMPT STYLES =====
const promptStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  modal: {
    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '420px',
    width: '90%',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '8px',
  },
  description: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  highlight: {
    color: '#64748b',
    fontSize: '13px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  primaryBtn: {
    padding: '14px 24px',
    border: 'none',
    borderRadius: '40px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    width: '100%',
  },
  secondaryBtn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '40px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    background: 'transparent',
    color: '#64748b',
    width: '100%',
  },
  footer: {
    color: '#475569',
    fontSize: '12px',
    marginTop: '16px',
  },
};

// Add hover styles for links
const linkStyle = document.createElement('style');
linkStyle.textContent = `
  a:hover {
    color: #60a5fa !important;
  }
  input:focus {
    background-color: rgba(30,41,59,0.8) !important;
  }
  button {
    font-family: inherit;
  }
`;
document.head.appendChild(linkStyle);

export default Login;