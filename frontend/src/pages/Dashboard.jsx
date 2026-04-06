// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import ProfileImageCropper from '../components/ProfileImageCropper';
import ZucaAIAssistant from "../components/ZucaAIAssistant";
import { FiMessageSquare } from "react-icons/fi";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  
  // AI Assistant State
  const [showAI, setShowAI] = useState(false);
  const [isAIFullPage, setIsAIFullPage] = useState(false);

  // Listen for full page event from AI component
  useEffect(() => {
    const handleOpenFullPage = () => {
      setIsAIFullPage(true);
      setShowAI(true);
    };
    window.addEventListener('openAIFullPage', handleOpenFullPage);
    return () => window.removeEventListener('openAIFullPage', handleOpenFullPage);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingStage(0);
      
      // Simulate loading stages
      const stages = [
        { progress: 20, message: "Waking up your dashboard...", icon: "✨" },
        { progress: 40, message: "Gathering your profile...", icon: "👤" },
        { progress: 60, message: "Loading your activities...", icon: "📊" },
        { progress: 80, message: "Preparing your experience...", icon: "🎨" },
        { progress: 100, message: "Welcome back!", icon: "🎉" }
      ];
      
      let currentStage = 0;
      const stageInterval = setInterval(() => {
        if (currentStage < stages.length - 1) {
          currentStage++;
          setLoadingStage(currentStage);
          setLoadingProgress(stages[currentStage].progress);
        }
      }, 600);
      
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");
      
      if (storedUser && token) {
        try {
          const response = await axios.get(`${BASE_URL}/api/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const userData = response.data;
          setUser(userData);
          
          const imageUrl = userData.profileImage?.startsWith("http")
            ? userData.profileImage
            : userData.profileImage 
              ? `${BASE_URL}/${userData.profileImage}`
              : null;
          setProfileImage(imageUrl);
          
          localStorage.setItem("user", JSON.stringify(userData));

          const [announcementsRes, messagesRes, eventsRes] = await Promise.all([
            axios.get(`${BASE_URL}/api/announcements/unread`, { 
              headers: { Authorization: `Bearer ${token}` } 
            }).catch(() => ({ data: { count: 0 } })),
            axios.get(`${BASE_URL}/api/chat/unread`, { 
              headers: { Authorization: `Bearer ${token}` } 
            }).catch(() => ({ data: { count: 0 } })),
            axios.get(`${BASE_URL}/api/events/upcoming`, { 
              headers: { Authorization: `Bearer ${token}` } 
            }).catch(() => ({ data: { count: 0 } }))
          ]);

          setUnreadAnnouncements(announcementsRes.data.count || 0);
          setUnreadMessages(messagesRes.data.count || 0);
          setUpcomingEvents(eventsRes.data.count || 0);

        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(storedUser);
        }
      }
      
      // Complete loading
      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => {
          setShowContent(true);
          setTimeout(() => {
            setLoading(false);
          }, 500);
        }, 300);
      }, 500);
      
      return () => clearInterval(stageInterval);
    };

    fetchUserData();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning")     
    else if (hour < 16) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    return () => clearInterval(timer);
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setSelectedImageFile(file);
    setShowCropper(true);
  };

  const handleImageUpload = async (croppedFile) => {
    const formData = new FormData();
    formData.append("profile", croppedFile);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);
      const imageUrl = updatedUser.profileImage?.startsWith("http")
        ? updatedUser.profileImage
        : `${BASE_URL}/${updatedUser.profileImage}`;
      setProfileImage(imageUrl);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Profile upload failed:", error);
    }
  };

  const handleRemovePhoto = () => {
    if (!user) return;
    setProfileImage(null);
    const updatedUser = { ...user, profileImage: null };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const stages = [
    { progress: 20, message: "Waking up your dashboard...", icon: "✨", description: "Preparing your personal space" },
    { progress: 40, message: "Gathering your profile...", icon: "👤", description: "Loading your information" },
    { progress: 60, message: "Loading your activities...", icon: "📊", description: "Fetching latest updates" },
    { progress: 80, message: "Preparing your experience...", icon: "🎨", description: "Almost ready" },
    { progress: 100, message: "Welcome back!", icon: "🎉", description: "Your dashboard is ready" }
  ];

  const currentStage = stages[loadingStage] || stages[0];

  // Premium Loading Screen
  if (loading) {
    return (
      <div className="premium-loading-dashboard">
        <div className="loading-gradient-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
          <div className="gradient-orb orb-4"></div>
        </div>

        <div className="loading-glass-container">
          <div className="loading-content-wrapper">
            <div className="loading-logo-section">
              <div className="logo-animation">
                <div className="logo-ring ring-1"></div>
                <div className="logo-ring ring-2"></div>
                <div className="logo-ring ring-3"></div>
                <div className="logo-icon-container">
                  <span className="logo-emoji">⛪</span>
                  <div className="logo-sparkle">
                    <span>✨</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="loading-text-section">
              <div className="loading-stage-icon">
                <span className="stage-icon">{currentStage.icon}</span>
              </div>
              <h2 className="loading-main-message">
                {currentStage.message}
              </h2>
              <p className="loading-description">
                {currentStage.description}
              </p>
            </div>

            <div className="loading-progress-section">
              <div className="progress-label">
                <span className="progress-text">Setting up your dashboard</span>
                <span className="progress-percentage">{Math.min(Math.floor(loadingProgress), 100)}%</span>
              </div>
              <div className="glass-progress-bar">
                <div 
                  className="glass-progress-fill"
                  style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                >
                  <div className="progress-glow"></div>
                </div>
              </div>
            </div>

            <div className="loading-particles">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i}
                  className="particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 3}s`
                  }}
                />
              ))}
            </div>

            <div className="loading-quote">
              <div className="quote-content">
                <span>🙏</span>
                <span>Welcome to ZUCA Community</span>
                <span>✨</span>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .premium-loading-dashboard {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: linear-gradient(135deg, #0f0c2900, #13121200, #0f0f0e00);
          }

          .loading-gradient-bg {
            position: absolute;
            inset: 0;
            overflow: hidden;
          }

          .gradient-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            animation: floatOrb 20s ease-in-out infinite;
          }

          .orb-1 {
            width: 500px;
            height: 500px;
            top: -200px;
            right: -200px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0), rgba(118,75,162,0.1));
          }

          .orb-2 {
            width: 400px;
            height: 400px;
            bottom: -150px;
            left: -150px;
            background: radial-gradient(circle, rgba(118,75,162,0.3), rgba(102,126,234,0.1));
            animation-delay: -5s;
          }

          .orb-3 {
            width: 600px;
            height: 600px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(0,212,255,0.2), rgba(9,9,121,0.05));
            animation-delay: -10s;
          }

          .orb-4 {
            width: 350px;
            height: 350px;
            top: 20%;
            right: 20%;
            background: radial-gradient(circle, rgba(245,158,11,0.2), rgba(102,126,234,0.1));
            animation-delay: -15s;
          }

          @keyframes floatOrb {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
          }

          .loading-glass-container {
            position: relative;
            z-index: 10;
            background: rgba(255, 255, 255, 0);
            backdrop-filter: blur(20px);
            border-radius: 48px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: containerGlow 2s ease-in-out infinite;
          }

          @keyframes containerGlow {
            0%, 100% {
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              border-color: rgba(255, 255, 255, 0.1);
            }
            50% {
              box-shadow: 0 25px 50px -12px rgba(102, 126, 234, 0.3);
              border-color: rgba(102, 126, 234, 0);
            }
          }

          .loading-content-wrapper {
            padding: 60px 80px;
            text-align: center;
            min-width: 500px;
          }

          .loading-logo-section {
            margin-bottom: 40px;
          }

          .logo-animation {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
          }

          .logo-ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid transparent;
            animation: ringPulse 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          }

          .ring-1 {
            border-top-color: #667eea;
            border-right-color: #667eea;
          }

          .ring-2 {
            border-bottom-color: #764ba2;
            border-left-color: #764ba2;
            animation-delay: 0.3s;
            width: 90%;
            height: 90%;
            top: 5%;
            left: 5%;
          }

          .ring-3 {
            border-top-color: #00d4ff;
            border-right-color: #00d4ff;
            animation-delay: 0.6s;
            width: 70%;
            height: 70%;
            top: 15%;
            left: 15%;
          }

          @keyframes ringPulse {
            0% {
              transform: scale(0.8);
              opacity: 0;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.2);
              opacity: 0;
            }
          }

          .logo-icon-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .logo-emoji {
            font-size: 56px;
            filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.5));
            animation: emojiPulse 2s ease-in-out infinite;
          }

          .logo-sparkle {
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 24px;
            animation: sparkleRotate 3s linear infinite;
          }

          @keyframes emojiPulse {
            0%, 100% {
              transform: scale(1);
              filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.5));
            }
            50% {
              transform: scale(1.05);
              filter: drop-shadow(0 0 30px rgba(216, 219, 235, 0.8));
            }
          }

          @keyframes sparkleRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .loading-text-section {
            margin-bottom: 40px;
          }

          .loading-stage-icon {
            font-size: 48px;
            margin-bottom: 20px;
            animation: bounceIcon 1s ease-in-out infinite;
          }

          @keyframes bounceIcon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .loading-main-message {
            font-size: 28px;
            font-weight: 600;
            background: linear-gradient(135deg, #fff, #b2b9d6, #d6d206);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
            animation: gradientShift 3s ease infinite;
          }

          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          .loading-description {
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
            letter-spacing: 0.5px;
          }

          .loading-progress-section {
            margin-bottom: 40px;
          }

          .progress-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
          }

          .progress-text {
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .progress-percentage {
            font-weight: 600;
            color: #667eea;
          }

          .glass-progress-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            overflow: hidden;
            backdrop-filter: blur(10px);
          }

          .glass-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2, #00d4ff);
            border-radius: 10px;
            position: relative;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }

          .progress-glow {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            animation: shimmer 1.5s infinite;
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          .loading-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }

          .particle {
            position: absolute;
            bottom: -10px;
            width: 2px;
            height: 10px;
            background: linear-gradient(to top, #667eea, transparent);
            border-radius: 2px;
            animation: particleFloat linear infinite;
            opacity: 0;
          }

          @keyframes particleFloat {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 0.5;
            }
            90% {
              opacity: 0.5;
            }
            100% {
              transform: translateY(-100vh) rotate(360deg);
              opacity: 0;
            }
          }

          .loading-quote {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .quote-content {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 13px;
            letter-spacing: 0.5px;
          }

          @media (max-width: 768px) {
            .loading-content-wrapper {
              padding: 40px 30px;
              min-width: auto;
              width: 90%;
            }
            .logo-animation {
              width: 80px;
              height: 80px;
            }
            .logo-emoji {
              font-size: 40px;
            }
            .loading-main-message {
              font-size: 20px;
            }
            .loading-stage-icon {
              font-size: 36px;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <div className="error-glass-card">
          <span className="error-icon">🔐</span>
          <h2 className="error-title">Session Expired</h2>
          <p className="error-text">Please log in to continue</p>
          <button onClick={() => navigate("/login")} className="error-button">
            Go to Login
          </button>
        </div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .error-glass-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 32px;
            padding: 48px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            animation: fadeInUp 0.5s ease;
          }
          .error-icon {
            font-size: 64px;
            display: block;
            margin-bottom: 20px;
          }
          .error-title {
            color: #333;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .error-text {
            color: #666;
            font-size: 14px;
            margin-bottom: 32px;
          }
          .error-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 16px;
            padding: 14px 32px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .error-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  const quickActions = [
    { 
      title: "Announcements", 
      description: "View latest updates", 
      path: "/announcements",
      icon: "📢",
      badge: unreadAnnouncements > 0 ? `${unreadAnnouncements} new` : null,
      color: "#4361ee",
      gradient: "linear-gradient(135deg, #4361ee, #3b37e6)"
    },
    { 
      title: "Mass Programs", 
      description: upcomingEvents > 0 ? `${upcomingEvents} upcoming` : "Schedule & events", 
      path: "/mass-programs",
      icon: "⛪",
      badge: null,
      color: "#7209b7",
      gradient: "linear-gradient(135deg, #7209b7, #5a189a)"
    },
    { 
      title: "Contributions", 
      description: "Track your pledges", 
      path: "/contributions",
      icon: "📊",
      badge: null,
      color: "#f72585",
      gradient: "linear-gradient(135deg, #f72585, #b5179e)"
    },
    { 
      title: "Community Chat", 
      description: "Connect with members", 
      path: "/chat",
      icon: "💬",
      badge: unreadMessages > 0 ? `${unreadMessages} unread` : null,
      color: "#4cc9f0",
      gradient: "linear-gradient(135deg, #4cc9f0, #4895ef)"
    },
    { 
      title: "Jumuia Groups", 
      description: user.homeJumuia?.name || "Join a community", 
      path: "/jumuia",
      icon: "👥",
      badge: user.homeJumuia ? "Active" : "Join now",
      color: "#f8961e",
      gradient: "linear-gradient(135deg, #f8961e, #f3722c)"
    },
    { 
      title: "Prayer Requests", 
      description: "Share your intentions", 
      path: "/prayer-requests",
      icon: "🙏",
      badge: null,
      color: "#2a9d8f",
      gradient: "linear-gradient(135deg, #2a9d8f, #21867a)"
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="dashboard-container"
      >
        {/* Animated Background */}
        <div className="animated-bg">
          <div className="bg-orb orb-1"></div>
          <div className="bg-orb orb-2"></div>
          <div className="bg-orb orb-3"></div>
          <div className="bg-orb orb-4"></div>
        </div>

        <div className="dashboard-content">
          {/* Header with Gradient */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="header-glass"
          >
            <div className="header-content">
              <div className="header-left">
                <h1 className="greeting-text">
                  {greeting}, <span className="user-name">{user.fullName?.split(" ")[0]}</span>
                  <span className="wave-emoji">👋</span>
                </h1>
                <p className="date-text">
                  {formatDate(currentTime)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowAI(true); setIsAIFullPage(false); }}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    border: "none",
                    borderRadius: "40px",
                    padding: "10px 20px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FiMessageSquare size={18} /> ZUCA AI
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout} 
                  className="logout-button"
                >
                  <span className="logout-icon">🚪</span> Sign out
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Profile Card - Enhanced Glassmorphism */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="profile-glass-card"
          >
            <div className="profile-content">
              <div className="avatar-section">
                <div className="avatar-wrapper">
                  {profileImage ? (
                    <motion.img 
                      whileHover={{ scale: 1.05 }}
                      src={profileImage} 
                      alt={user.fullName} 
                      className="avatar"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="avatar-status"></div>
                </div>
                <div className="avatar-actions">
                  <label className="upload-button">
                    <span>📸</span> Change
                    <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                  </label>
                  {profileImage && (
                    <button onClick={handleRemovePhoto} className="remove-button">
                      <span>🗑️</span> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="info-section">
                <div className="info-header">
                  <h2 className="full-name">{user.fullName}</h2>
                  <span className="member-badge">
                    {user.membership_number || "ZUCA-001"}
                  </span>
                </div>
                <p className="email">{user.email}</p>
                <div className="badge-container">
                  <span className="role-badge">
                    {user.role?.toUpperCase() || "MEMBER"}
                  </span>
                  {user.homeJumuia && (
                    <span className="jumuia-badge">
                      👥 {user.homeJumuia.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Row */}
          <div className="stats-row">
            {[
              { icon: "📢", value: unreadAnnouncements, label: "Unread Announcements", delay: 0.25, path: "/announcements" },
              { icon: "⛪", value: upcomingEvents, label: "Upcoming Events", delay: 0.3, path: "/mass-programs" },
              { icon: "💬", value: unreadMessages, label: "Unread Messages", delay: 0.35, path: "/chat" }
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: stat.delay }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="stat-glass-card"
                onClick={() => navigate(stat.path)}
              >
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-info">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions Grid */}
          <div className="section-header">
            <h2 className="section-title">Quick Actions</h2>
            <p className="section-subtitle">Navigate to different sections of your dashboard</p>
          </div>

          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="action-glass-card"
                style={{ borderTopColor: action.color }}
                onMouseEnter={() => setActiveCard(index)}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => navigate(action.path)}
              >
                <div className="action-card-header">
                  <div className="action-icon" style={{ background: `${action.color}20`, color: action.color }}>
                    {action.icon}
                  </div>
                  {action.badge && (
                    <span className="action-badge">{action.badge}</span>
                  )}
                </div>
                <h3 className="action-title">{action.title}</h3>
                <p className="action-description">{action.description}</p>
                <div className="action-footer">
                  <span className="action-link">Open →</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="footer"
          >
            <p className="footer-text">ZUCA Portal • Member Dashboard • v2.0</p>
          </motion.div>
        </div>

        {/* Image Cropper Modal */}
        {showCropper && (
          <ProfileImageCropper
            imageFile={selectedImageFile}
            onCropComplete={(croppedFile) => {
              setShowCropper(false);
              handleImageUpload(croppedFile);
            }}
            onClose={() => {
              setShowCropper(false);
              setSelectedImageFile(null);
            }}
          />
        )}

        <style jsx>{`
          .dashboard-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #faf5f59e, #0d115e13, #24243e);
            position: relative;
            border-radius: 30px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            overflow-x: hidden;
          }

          .animated-bg {
            position: fixed;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
          }

          .bg-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.3;
            animation: floatBg 20s ease-in-out infinite;
          }

          .orb-1 {
            width: 500px;
            height: 500px;
            top: -200px;
            right: -200px;
            background: radial-gradient(circle, rgba(102,126,234,0.4), rgba(118,75,162,0.2));
          }

          .orb-2 {
            width: 400px;
            height: 400px;
            bottom: -150px;
            left: -150px;
            background: radial-gradient(circle, rgba(118,75,162,0.4), rgba(102,126,234,0.2));
            animation-delay: -5s;
          }

          .orb-3 {
            width: 600px;
            height: 600px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(0,212,255,0.3), rgba(9,9,121,0.15));
            animation-delay: -10s;
          }

          .orb-4 {
            width: 350px;
            height: 350px;
            top: 20%;
            right: 20%;
            background: radial-gradient(circle, rgba(245,158,11,0.3), rgba(102,126,234,0.15));
            animation-delay: -15s;
          }

          @keyframes floatBg {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
          }

          .dashboard-content {
            position: relative;
            z-index: 1;
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px 24px;
          }

          .header-glass {
            background: rgb(255, 255, 255);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 24px 32px;
            margin-bottom: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
          }

          .greeting-text {
            font-size: 32px;
            font-weight: 700;
            color: black;
            margin-bottom: 8px;
          }

          .user-name {
            font-size: 22px !important;
            background: linear-gradient(135deg, #000000, #000000);
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            font-weight: 800 !important;
            display: inline-block !important;
          }

          .wave-emoji {
            display: inline-block;
            animation: wave 1s ease-in-out infinite;
            margin-left: 8px;
          }

          @keyframes wave {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(20deg); }
            75% { transform: rotate(-10deg); }
          }

          .date-text {
            color: rgb(3, 3, 3);
            font-size: 15px;
          }

          .logout-button {
            background: rgb(240, 6, 29);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 10px 24px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
          }

          .logout-button:hover {
            background: rgba(220, 53, 69, 1);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(220, 53, 69, 0.3);
          }

          .profile-glass-card {
            background: rgb(255, 255, 255);
            backdrop-filter: blur(20px);
            border-radius: 32px !important;
            padding: 32px;
            margin-bottom: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .profile-content {
            display: flex;
            gap: 40px;
            flex-wrap: wrap;
            align-items: center;
          }

          .avatar-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }

          .avatar-wrapper {
            position: relative;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            overflow: hidden;
            border: 4px solid rgba(20, 240, 12, 0.97);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }

          .avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s;
          }

          .avatar-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #4bef26da, #e6e2ea);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 56px;
            font-weight: 700;
            color: white;
          }

          .avatar-status {
            position: absolute;
            bottom: 8px;
            right: 8px;
            width: 16px;
            height: 16px;
            background: #10b981;
            border-radius: 50%;
            border: 2px solid white;
          }

          .avatar-actions {
            display: flex;
            gap: 10px;
          }

          .upload-button, .remove-button {
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
          }

          .upload-button {
            background: linear-gradient(135deg, #111619, #090909);
            color: white;
            border: none;
          }

          .remove-button {
            background: rgba(241, 10, 33, 0.99);
            color: black;
            border: none;
          }

          .upload-button:hover, .remove-button:hover {
            transform: translateY(-2px);
          }

          .info-section {
            flex: 1;
          }

          .info-header {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 12px;
          }

          .full-name {
            font-size: 32px;
            font-weight: 700;
            color: black;
            margin: 0;
          }

          .member-badge {
            background: linear-gradient(135deg, #111619, #090909);
            border-radius: 30px;
            padding: 6px 16px;
            color: white;
            font-size: 12px;
            font-weight: 600;
          }

          .email {
            color: rgba(10, 10, 10, 0.92);
            font-size: 14px;
            margin-bottom: 16px;
          }

          .badge-container {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .role-badge, .jumuia-badge {
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }

          .role-badge {
            background: rgba(102, 126, 234, 0.2);
            color: #ea0606;
            border: 1px solid rgba(102, 126, 234, 0.3);
          }

          .jumuia-badge {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }

          .stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 48px;
          }

          .stat-glass-card {
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s;
            cursor: pointer;
          }

          .stat-glass-card:hover {
            transform: translateY(-4px);
            background: rgba(255, 251, 22, 0.72);
            border-color: rgba(255, 255, 255, 0.84);
          }

          .stat-icon {
            font-size: 40px;
            width: 64px;
            height: 64px;
            background: rgba(224, 253, 36, 0.91);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .stat-info {
            display: flex;
            flex-direction: column;
          }

          .stat-value {
            font-size: 36px;
            font-weight: 800;
            color: black;
            line-height: 1;
          }

          .stat-label {
            font-size: 13px !important;
            color: rgba(5, 5, 5, 0.7);
            margin-top: 4px;
          }

          .section-header {
            margin-bottom: 24px;
          }

          .section-title {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
          }

          .section-subtitle {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
          }

          .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
            margin-bottom: 48px;
          }

          .action-glass-card {
            background: rgb(255, 255, 255);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 28px;
            cursor: pointer;
            transition: all 0.3s;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-top-width: 4px;
          }

          .action-glass-card:hover {
            transform: translateY(-8px);
            background: rgba(224, 231, 34, 0.99);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          }

          .action-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }

          .action-icon {
            width: 56px;
            height: 56px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.3s;
          }

          .action-glass-card:hover .action-icon {
            transform: scale(1.1);
          }

          .action-badge {
            background: #ff4757;
            border-radius: 20px;
            padding: 4px 12px;
            color: white;
            font-size: 11px;
            font-weight: 600;
          }

          .action-title {
            font-size: 20px;
            font-weight: 700;
            color: black;
            margin-bottom: 8px;
          }

          .action-description {
            color: rgba(0, 0, 0, 0.7);
            font-size: 13px;
            margin-bottom: 20px;
            line-height: 1.5;
          }

          .action-footer {
            display: flex;
            justify-content: flex-end;
          }

          .action-link {
            color: #667eea;
            font-size: 14px;
            font-weight: 600;
            transition: transform 0.2s;
          }

          .action-glass-card:hover .action-link {
            transform: translateX(4px);
            display: inline-block;
          }

          .footer {
            text-align: center;
            padding: 24px;
          }

          .footer-text {
            color: rgba(255, 255, 255, 0.6);
            font-size: 13px;
          }

          @media (max-width: 768px) {
            .dashboard-content {
              padding: 20px 16px;
            }
            .greeting-text {
              font-size: 24px;
            }
            .full-name {
              font-size: 24px;
            }
            .profile-content {
              flex-direction: column;
              text-align: center;
            }
            .info-header {
              justify-content: center;
            }
            .badge-container {
              justify-content: center;
            }
            .actions-grid {
              grid-template-columns: 1fr;
            }
            .stat-value {
              font-size: 28px;
            }
          }
        `}</style>
      </motion.div>

      {/* ZUCA AI Assistant */}
      {showAI && (
        <ZucaAIAssistant 
          user={user}
          onClose={() => { setShowAI(false); setIsAIFullPage(false); }}
          isOpen={showAI}
          isFullPage={isAIFullPage}
          onBack={() => setIsAIFullPage(false)}
        />
      )}
    </>
  );
}

export default Dashboard;