import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import bg from "../assets/2.jpg";

import axios from "axios";
import logo from '../assets/zuca-logo.png';
import BASE_URL from "../api";
import ProfileImageCropper from '../components/ProfileImageCropper';
import ProfileSettings from '../components/ProfileSettings';
import { 
  FiMessageSquare, FiLogOut, FiCamera, FiTrash2, FiArrowRight, 
  FiBell, FiCalendar, FiUsers, FiMusic, FiImage, FiDollarSign, 
  FiGrid, FiSettings, FiSend, FiMail, FiPhone, FiUser, FiHome,
  FiChevronRight, FiChevronLeft, FiPhoneCall, FiMessageCircle, FiActivity,
} from "react-icons/fi";
import { FaWhatsapp, FaPrayingHands, FaYoutube, FaChurch, FaMoneyBillWave, FaMusic, FaComments, FaUserTie, FaImages, FaPhotoVideo ,FaUsers, FaCalendar, FaRegCalendar, FaThLarge, FaDonate,FaHandHoldingHeart, FaDove,FaGamepad,FaCalendarPlus, FaUser, FaCalendarAlt } from "react-icons/fa";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  
  // REAL DATA STATES
  const [announcements, setAnnouncements] = useState([]);
  const [massPrograms, setMassPrograms] = useState([]);
  const [activePledges, setActivePledges] = useState([]);
  const [jumuiaInfo, setJumuiaInfo] = useState(null);
  const [featuredGallery, setFeaturedGallery] = useState([]);
  const [recentHymns, setRecentHymns] = useState([]);
  const [gameInvites, setGameInvites] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [executiveTeam, setExecutiveTeam] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [todaysReading, setTodaysReading] = useState(null);
  
  // STATS
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalHymns, setTotalHymns] = useState(0);
  const [totalMedia, setTotalMedia] = useState(0);
  const [galleryItems, setGalleryItems] = useState(0);
  
  // FINANCIAL STATS
  const [totalPledged, setTotalPledged] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  
  // UI STATES
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);


  //attendance states

  const [activeSheets, setActiveSheets] = useState([]);
const [checkingIn, setCheckingIn] = useState(null);

const [showCountdown, setShowCountdown] = useState(true);
const [timeRemaining, setTimeRemaining] = useState({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
});
const [isCountdownComplete, setIsCountdownComplete] = useState(false);
  

// ==================== SIMPLE GLOBAL CACHE FOR DASHBOARD ====================
const dashboardCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const cachedFetch = async (url, config) => {
  const cacheKey = `${url}_${JSON.stringify(config)}`;
  const cached = dashboardCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit: ${url}`);
    return { data: cached.data, status: 200, statusText: 'OK' };
  }
  
  console.log(`🌐 Fetching: ${url}`);
  const response = await originalGet(url, config);
  dashboardCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
  return response;
};

// Save original axios.get
const originalGet = axios.get;

// Override axios.get to use cache
axios.get = function(url, config) {
  // Only cache GET requests to our API
  if (typeof url === 'string' && url.includes('/api/') && !url.includes('/upload')) {
    return cachedFetch(url, config);
  }
  return originalGet.call(this, url, config);
};

 
const getEventBadge = (type) => {
  const badges = {
    'mass': '⛪ Mass',
    'meeting': '🤝 Meeting', 
    'social': '🎉 Social',
    'workshop': '🛠️ Workshop',
    'training': '🏋️ Training',
    'prayer': '🙏 Prayer',
    'concert': '🎵 Concert',
    'conference': '💼 Conference',
    'retreat': '🧘 Retreat',
    'default': '🙏 Mass'
  };
  return badges[type?.toLowerCase()] || badges.default;
};


          // Add these helper functions
const getDay = (dateString) => {
  return new Date(dateString).getDate();
};

const getMonth = (dateString) => {
  return new Date(dateString).toLocaleString('default', { month: 'short' }).toUpperCase();
};

const isToday = (dateString) => {
  const today = new Date();
  const eventDate = new Date(dateString);
  return today.toDateString() === eventDate.toDateString();
};

  // ==================== REAL DATA FETCHING ====================

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements((res.data || []).slice(0, 2));
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  // Fetch active attendance sheets
const fetchActiveSheets = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${BASE_URL}/api/attendance/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setActiveSheets(response.data.sheets || []);
  } catch (error) {
    console.error('Error fetching active sheets:', error);
  }
};

// Self check-in function
const handleSelfCheckin = async (sheetId) => {
  setCheckingIn(sheetId);
  try {
    const token = localStorage.getItem('token');
    await axios.post(`${BASE_URL}/api/attendance/self-checkin`, {
      sheetId,
      deviceId: `web-${Date.now()}`,
      deviceName: navigator.userAgent
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    alert('✅ Checked in successfully!');
    fetchActiveSheets(); // Refresh the list
  } catch (error) {
    const errorMsg = error.response?.data;
    if (errorMsg?.error === 'ALREADY_CHECKED_IN') {
      alert('You have already checked in for this meeting');
    } else {
      alert(errorMsg?.message || 'Check-in failed');
    }
  } finally {
    setCheckingIn(null);
  }
};

  // Fetch mass programs
  const fetchMassPrograms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/mass-programs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const now = new Date();
      const upcoming = (res.data || [])
        .filter(p => new Date(p.date) >= now)
        .slice(0, 2);
      setMassPrograms(upcoming);
    } catch (error) {
      console.error("Error fetching mass programs:", error);
    }
  };

  // Fetch my pledges
  const fetchMyPledges = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/my-pledges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const active = (res.data || [])
        .filter(p => p.status !== "COMPLETED")
        .slice(0, 2);
      setActivePledges(active);
      
      // Calculate financial stats
      const pledged = (res.data || []).reduce((sum, p) => sum + (p.amountPaid || 0) + (p.pendingAmount || 0), 0);
      const paid = (res.data || []).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const pending = (res.data || []).reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
      setTotalPledged(pledged);
      setTotalPaid(paid);
      setTotalPending(pending);
    } catch (error) {
      console.error("Error fetching pledges:", error);
    }
  };

  // Fetch active campaigns count
  const fetchActiveCampaigns = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/contribution-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const active = (res.data || []).filter(c => {
        if (!c.deadline) return true;
        return new Date(c.deadline) > new Date();
      });
      setActiveCampaigns(active.length);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  // Fetch jumuia info
  const fetchJumuiaInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const meRes = await axios.get(`${BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (meRes.data.homeJumuia) {
        const jumuiaRes = await axios.get(`${BASE_URL}/api/jumuia/${meRes.data.homeJumuia.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJumuiaInfo({
          id: jumuiaRes.data.id,
          name: jumuiaRes.data.name,
          leaderName: jumuiaRes.data.leaders?.[0]?.fullName || "TBA",
          memberCount: jumuiaRes.data._count?.members || 0,
          nextMeeting: jumuiaRes.data.nextMeeting || null
        });
      }
    } catch (error) {
      console.error("Error fetching jumuia:", error);
    }
  };

 // Fetch 3 random non-featured media for dashboard
const fetchFeaturedGallery = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${BASE_URL}/api/media/public?limit=8`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Gallery API response:", res.data);
    
    const allMedia = res.data.media || [];
    
    console.log("All media items:", allMedia.length);
    
    const imagesOnly = allMedia.filter(item => 
      item.type === 'image' || 
      item.mediaType === 'image' ||
      (item.mimeType && item.mimeType.startsWith('image/'))
    );
    
    console.log("Images only:", imagesOnly.length);
    
    const galleryToShow = imagesOnly.slice(0, 3);
    
    setFeaturedGallery(galleryToShow);
    setGalleryItems(galleryToShow.length);
    
    console.log("Set featured gallery:", galleryToShow.length, "items");
    
  } catch (error) {
    console.error("Error fetching gallery:", error);
    setFeaturedGallery([]);
    setGalleryItems(0);
  }
};
  // Fetch recent hymns
  const fetchRecentHymns = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/songs?limit=3`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentHymns(res.data?.songs || []);
      setTotalHymns(res.data?.total || 0);
    } catch (error) {
      console.error("Error fetching hymns:", error);
    }
  };

  // Fetch game invites
  const fetchGameInvites = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/games/invites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGameInvites(res.data || []);
    } catch (error) {
      console.error("Error fetching game invites:", error);
    }
  };

  // Fetch online members
  const fetchOnlineMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/chat/online`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnlineMembers(res.data || []);
    } catch (error) {
      console.error("Error fetching online members:", error);
    }
  };

  // Fetch recent chat messages
  const fetchRecentChats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/chat/enhanced`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const recent = (res.data || []).slice(0, 3);
      setRecentChats(recent);
      setTotalMessages((res.data || []).length);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = user?.id;
      if (userId) {
        const res = await axios.get(`${BASE_URL}/api/notifications/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const unread = (res.data || []).filter(n => !n.read);
        setUnreadNotificationsCount(unread.length);
        setRecentNotifications((res.data || []).slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Fetch executive team
  const fetchExecutiveTeam = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/executive/team`);
      if (res.data.success && res.data.executives) {
        setExecutiveTeam(res.data.executives.slice(0, 2));
      }
    } catch (error) {
      console.error("Error fetching executive team:", error);
    }
  };

  // Fetch upcoming schedules
  const fetchUpcomingSchedules = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${BASE_URL}/api/upcoming-events?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setUpcomingSchedules(res.data);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
  }
};




  // Fetch today's liturgical reading
  const fetchTodaysReading = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/calendar/today`);
      setTodaysReading(res.data);
    } catch (error) {
      console.error("Error fetching reading:", error);
    }
  };

  // Fetch system stats
  const fetchSystemStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const [usersRes, mediaRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/admin/media/stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { totalMedia: 0 } }))
      ]);
      setTotalUsers((usersRes.data || []).length);
      setTotalMedia(mediaRes.data?.totalMedia || 0);
    } catch (error) {
      console.error("Error fetching system stats:", error);
    }
  };


   const fetchPublicStats = async () => {
    try {
      const [campaignsRes, usersRes, mediaRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/public/campaigns/count`),
        axios.get(`${BASE_URL}/api/public/users/count`),
        axios.get(`${BASE_URL}/api/public/media/count`)
      ]);
      
      setActiveCampaigns(campaignsRes.data.count);
      setTotalUsers(usersRes.data.count);
      setTotalMedia(mediaRes.data.count);
    } catch (error) {
      console.error("Error fetching public stats:", error);
      // Set fallback values so dashboard still shows something
      setActiveCampaigns(0);
      setTotalUsers(0);
      setTotalMedia(0);
    }
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    if (!date) return "Unknown";
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  };

  // Format date for mass programs
  const formatMassDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get member since months
  const getMemberSinceMonths = () => {
    if (!user?.createdAt) return "New";
    const created = new Date(user.createdAt);
    const now = new Date();
    const months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    if (months < 1) return "New";
    if (months === 1) return "1 month";
    return `${months} months`;
  };

  // Get total paid from pledges
  const getTotalPaidFromPledges = () => {
    return totalPaid;
  };

  // WhatsApp link
  const getWhatsAppLink = () => {
    const phone = user?.phone?.replace(/[^0-9]/g, '');
    if (!phone) return "#";
    return `https://wa.me/${phone}`;
  };

  // Main fetch
  useEffect(() => {
    const fetchAllData = async () => {
      const token = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user"));
      
      if (!token || !storedUser) {
        setLoading(false);
        return;
      }

      setUser(storedUser);
      setProfileImage(storedUser.profileImage);

      try {
        const userRes = await axios.get(`${BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);
        setProfileImage(userRes.data.profileImage);
        localStorage.setItem("user", JSON.stringify(userRes.data));





               // Check if user is admin or treasurer
        const isAdmin = storedUser.role === "admin";
        const isTreasurer = storedUser.specialRole === "treasurer";
        
        // Use admin endpoints for admin/treasurer, public endpoints for regular users
        if (isAdmin || isTreasurer) {
          await Promise.all([
            fetchAnnouncements(),
            fetchMassPrograms(),
            fetchMyPledges(),
            fetchActiveCampaigns(),
            fetchJumuiaInfo(),
            fetchFeaturedGallery(),
            fetchRecentHymns(),
            fetchGameInvites(),
            fetchOnlineMembers(),
            fetchRecentChats(),
            fetchExecutiveTeam(),
            fetchUpcomingSchedules(),
            fetchTodaysReading(),
            fetchSystemStats()
          ]);
        } else {
          await Promise.all([
            fetchAnnouncements(),
            fetchMassPrograms(),
            fetchMyPledges(),
            fetchPublicStats(),  // ← Uses public endpoint instead
            fetchJumuiaInfo(),
            fetchFeaturedGallery(),
            fetchRecentHymns(),
            fetchGameInvites(),
            fetchOnlineMembers(),
            fetchRecentChats(),
            fetchExecutiveTeam(),
            fetchUpcomingSchedules(),
            fetchTodaysReading(),
            fetchActiveSheets()
            // No fetchSystemStats() for regular users
          ]);
        }
        
        await fetchNotifications();
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 16) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
  const targetDate = new Date('2026-07-12T12:00:00');

  const calculateTimeRemaining = () => {
    const now = new Date();
    const difference = targetDate - now;

    if (difference <= 0) {
      setIsCountdownComplete(true);
      setShowCountdown(false);
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds
    };
  };

  setTimeRemaining(calculateTimeRemaining());

  const timer = setInterval(() => {
    const newTime = calculateTimeRemaining();
    setTimeRemaining(newTime);
    
    if (newTime.days === 0 && newTime.hours === 0 && 
        newTime.minutes === 0 && newTime.seconds === 0) {
      setIsCountdownComplete(true);
      setTimeout(() => {
        setShowCountdown(false);
      }, 500);
    }
  }, 1000);

  return () => clearInterval(timer);
}, []);

  // Socket listeners
  useEffect(() => {
    if (!window.io || !user) return;
    
    const socket = window.io(BASE_URL, {
      auth: { token: localStorage.getItem("token") }
    });
    
    socket.on("connect", () => {
      socket.emit("join", user.id);
    });
    
    socket.on("new_notification", () => {
      fetchNotifications();
      fetchAnnouncements();
    });
    
    socket.on("new_message", () => {
      fetchRecentChats();
    });
    
    socket.on("online_members", (data) => {
      fetchOnlineMembers();
    });
    
    socket.on("game_invite_received", () => {
      fetchGameInvites();
    });
    
    return () => socket.disconnect();
  }, [user]);

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



  if (!user) {
    return (
      <div className="error-container">
        
      </div>
    );
  }

  return (
    <>
    

      <div className="dashboard">
        <div className="dashboard-content">
          {/* HEADER */}
          <div className="header">
            <div className="header-left">
              <h1 className="greeting">
                {greeting}, <span className="user-name">{user.fullName?.split(" ")[0]}</span>
                <span className="wave">👋</span>
              </h1>
              <p className="date">{formatDate(currentTime)}</p>
            </div>
            <div className="header-right">
              <button className="ai-btn" onClick={() => window.dispatchEvent(new CustomEvent('openZUCAI'))}>
                <FiMessageSquare size={18} /> Ask zuca
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                <FiLogOut size={16} /> Exit
              </button>
            </div>
          </div>


          {showCountdown && !isCountdownComplete && (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    transition={{ duration: 0.5 }}
    className="countdown-container"
  >
    <div className="countdown-content">
      <div className="countdown-header">
        <span className="countdown-icon">🚀</span>
        <span className="countdown-title">ZUCA WEBSITE LAUNCHING HAPPENS IN </span>
                <span className="countdown-icon">🚀</span>

      </div>
      
      <div className="countdown-grid">
        <div className="countdown-item">
          <div className="countdown-number">{String(timeRemaining.days).padStart(2, '0')}</div>
          <div className="countdown-label">Days</div>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-item">
          <div className="countdown-number">{String(timeRemaining.hours).padStart(2, '0')}</div>
          <div className="countdown-label">Hours</div>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-item">
          <div className="countdown-number">{String(timeRemaining.minutes).padStart(2, '0')}</div>
          <div className="countdown-label">Minutes</div>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-item">
          <div className="countdown-number">{String(timeRemaining.seconds).padStart(2, '0')}</div>
          <div className="countdown-label">Seconds</div>
        </div>
      </div>

      <div className="countdown-event-info">
        <span><FaCalendar color="fffff0" /> JOIN US ON 12TH JULY AS WE CELEBRATE OUR "BIRTHDAY"</span>
        <span><FaUsers color="fffff0" /> LETS COME ALL!</span>
      </div>
    </div>
  </motion.div>
)}

         {/* USER PROFILE CARD */}
<div className="profile-card">
  <div className="profile-row">
    <div className="avatar-section">
      <div className="avatar-wrapper" onClick={() => setShowProfileSettings(true)}>
        {profileImage ? (
          <img src={profileImage} alt={user.fullName} />
        ) : (
          <div className="avatar-placeholder">{user.fullName?.charAt(0).toUpperCase()}</div>
        )}
        <div className="avatar-overlay"><FiCamera size={20} /></div>
      </div>
    </div>
    <div className="profile-info">
      <div className="info-header">
        <h2>{user.fullName}</h2>
      </div>
      {/* LINE ADDED BELOW NAME */}
      <div className="name-divider">
        <div className="divider-line"></div>
      </div>
      <div className="membership-row">
        <span className="member-badge">{user.membership_number || "Z#TEMP"}</span>
      </div>
      <p className="email-row">
  <span className="icon-style">✉</span> 
  <span className="text-style">{user.email}</span>
</p> 

<p className="phone-row">
  <span className="icon-style">☏</span> 
  <span className="text-style">{user.phone || "Not set"}</span>
</p>


      <div className="badges">
        <span className="role-badge"><FaUserTie /> {user.role?.toUpperCase() || "MEMBER"}</span>
        {user.homeJumuia && <span className="jumuia-badge"><FaUsers size={10} /> {user.homeJumuia.name}</span>}
      </div>
    </div>
  </div>
  <div className="profile-stats">
    <div className="stat-item">
      <div className="stat-icon"><FaCalendarAlt /></div>
      <div className="stat-info">
        <span className="stat-value">{getMemberSinceMonths()}</span>
        <span className="stat-label">Joined</span>
      </div>
    </div>
    <div className="stat-divider"></div>
    <div className="stat-item">
      <div className="stat-icon"><FaHandHoldingHeart size={30}/></div>
      <div className="stat-info">
        <span className="stat-value">KES {getTotalPaidFromPledges().toLocaleString()}</span>
        <span className="stat-label">Total Paid</span>
      </div>
    </div>
    <div className="stat-divider"></div>
    <div className="stat-item">
      <div className="stat-icon">
        <FaWhatsapp color="#25D366" size={24} />
      </div>
      <div className="stat-info">
        <a href={getWhatsAppLink()} className="whatsapp-link" target="_blank" rel="noopener noreferrer">
          Message You🫵
        </a>
        <span className="stat-label">WhatsApp</span>
      </div>
    </div>
  </div>
</div>


{/* ACTIVE MEETINGS CARD */}
{activeSheets.length > 0 && (
  <div className="active-meetings-card">
    <div className="section-header">
      <div className="header-with-icon">
        <div className="header-icon-meeting">🔴</div>
        <div>
          <h3>ACTIVE MEETINGS</h3>
          <p className="header-subtitle">Check in to today's gatherings</p>
        </div>
      </div>
      <div className="meeting-count-badge">{activeSheets.length} Active</div>
    </div>

    <div className="active-meetings-list">
      {activeSheets.slice(0, 2).map(sheet => (
        <div key={sheet.id} className="meeting-card-active">
          <div className="meeting-status-row">
            <span className="live-indicator">● LIVE</span>
            <span className="meeting-time-sm">
              <span className="time-icon">🕐</span> {sheet.eventTime || '4:30 PM'}
            </span>
          </div>
          
          <h4 className="meeting-title-sm">{sheet.title}</h4>
          
          <div className="meeting-details-sm">
            <span><span className="detail-icon">📅</span> {new Date(sheet.eventDate).toLocaleDateString()}</span>
            <span><span className="detail-icon">📍</span> {sheet.location || 'ZUCA'}</span>
          </div>
          
          <div className="meeting-stats-sm">
            <span className="stat-icon-sm">👥</span>
            <span>{sheet._count?.entries || 0} people checked in</span>
          </div>
          
          {sheet.enableWifiCheckin && sheet.wifiSSID && (
            <div className="meeting-wifi-sm">
              <span className="wifi-icon">📶</span>
              <span>Wi-Fi: {sheet.wifiSSID}</span>
            </div>
          )}
          
   <button 
  className="checkin-btn-sm"
  onClick={() => navigate('/member/attendance')}
>
  🎯 Check In →
</button>
        </div>
      ))}
    </div>
    
    {activeSheets.length > 2 && (
     <button className="view-all-meetings" onClick={() => navigate('/member/attendance')}>
  View All {activeSheets.length} Meetings →
</button>
    )}
  </div>
)}


       {/* TODAY'S LITURGICAL READING - PREMIUM DESIGN */}
{todaysReading && (
  <div className="section-card reading-premium-card">
    <div className="reading-premium-header">
      <div className="reading-header-icon">
        <span className="reading-icon">📖</span>
      </div>
      <div className="reading-header-content">
        <h3 className="reading-premium-title">Today's Liturgical Reading</h3>
        <p className="reading-premium-subtitle">Daily Word of God</p>
      </div>
      <div className="reading-date-badge">
        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </div>

    <div className="reading-premium-body">
      <div className="reading-celebration">
        <span className="celebration-icon"></span>
        <span className="celebration-text">{todaysReading.celebration || "Daily Reading"}</span>
      </div>

      <div className="readings-container">
        {todaysReading.readings?.firstReading && (
          <div className="reading-verse-card">
            <div className="verse-header">
              <span className="verse-icon">✍︎</span>
              <span className="verse-title">First Reading</span>
            </div>
            <div className="verse-citation">{todaysReading.readings.firstReading.citation}</div>
            <p className="verse-preview">
              {todaysReading.readings.firstReading.text?.substring(0, 80)}...
            </p>
          </div>
        )}

        {todaysReading.readings?.psalm && (
          <div className="reading-verse-card psalm-card">
            <div className="verse-header">
              <span className="verse-icon">🎵</span>
              <span className="verse-title">Responsorial Psalm</span>
            </div>
            <div className="verse-citation">{todaysReading.readings.psalm.citation}</div>
          </div>
        )}

        {todaysReading.readings?.secondReading && (
          <div className="reading-verse-card">
            <div className="verse-header">
              <span className="verse-icon">📜</span>
              <span className="verse-title">Second Reading</span>
            </div>
            <div className="verse-citation">{todaysReading.readings.secondReading.citation}</div>
          </div>
        )}

        {todaysReading.readings?.gospel && (
          <div className="reading-verse-card gospel-card">
            <div className="verse-header">
              <span className="verse-icon">𓆩♱𓆪</span>
              <span className="verse-title">Holy Gospel</span>
            </div>
            <div className="verse-citation">{todaysReading.readings.gospel.citation}</div>
            <p className="verse-preview">
              {todaysReading.readings.gospel.text?.substring(0, 100)}...
            </p>
          </div>
        )}
      </div>

      <div className="reading-premium-footer">
        <button className="reading-full-btn" onClick={() => navigate(`/liturgical-calendar`)}>
          <span>Read Full Readings</span>
          <FiArrowRight className="btn-arrow-icon" />
        </button>
        <div className="reading-footer-note">
          <span>📅 Liturgical Year {new Date().getFullYear()}</span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
)}


            {/* MY JUMUIA - DASHBOARD CARD */}
{jumuiaInfo && (
  <div className="section-card jumuia-dashboard-card">
    <div className="section-header">
      <div className="header-icon-small">
        <span><FaPrayingHands size={28} color="#1a1818" /></span>
      </div>
      <h3>My Jumuia</h3>
      <div className="jumuia-status-badge-small">
        <span className="status-dot"></span>
        Active
      </div>
    </div>

    <div className="jumuia-dashboard-content">
      <div className="jumuia-name-dashboard">
        {jumuiaInfo.name}
      </div>
      
      <div className="jumuia-quick-info">
        <div className="quick-info-item">
          <span className="info-emoji"><FaUserTie/></span>
          <div className="info-text">
            <span className="info-label">Leader</span>
            <span className="info-value">{jumuiaInfo.leaderName?.split(' ')[0] || "TBA"}</span>
          </div>
        </div>
        
        <div className="quick-info-item">
          <span className="info-emoji"><FaUsers/></span>
          <div className="info-text">
            <span className="info-label">Members</span>
            <span className="info-value">{jumuiaInfo.memberCount || 0}</span>
          </div>
        </div>
        
        {jumuiaInfo.nextMeeting && (
          <div className="quick-info-item meeting-highlight">
            <span className="info-emoji"><FaCalendar /></span>
            <div className="info-text">
              <span className="info-label">Next Meeting</span>
              <span className="info-value meeting-date">
                {new Date(jumuiaInfo.nextMeeting).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <button 
 
  className="jumuia-chat-btn-dashboard"
  onClick={() => navigate("/jumuia-contributions")}
>
  💰 View Jumuia Contributions →
</button>
    </div>
  </div>
)}

          {/* UPCOMING SCHEDULED EVENTS - PREMIUM DESIGN */}
<div className="section-card schedules-section">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-calendar"><FaCalendarPlus size={28} color="#141313" /></div>
      <div>
        <h3>UPCOMING ZUCA SCHEDULED EVENTS</h3>
        <p className="header-subtitle">ZUCA indoor and out door activities</p>
      </div>
    </div>
    {upcomingSchedules.length > 0 && (
      <div className="total-badge schedule-badge">
        {upcomingSchedules.length} {upcomingSchedules.length === 1 ? 'Event' : 'Events'}
      </div>
    )}
  </div>

  <div className="events-timeline">
    {upcomingSchedules.length === 0 ? (
      <div className="empty-state-calendar">
        <div className="calendar-icon"><FaCalendar /></div>
        <p>No upcoming events</p>
        <span>Check back soon for new schedules</span>
      </div>
    ) : (
      upcomingSchedules.slice(0, 2).map((event, index) => (
        <div key={event.id} className="event-card-premium">
          {/* Timeline connector */}
          {index !== upcomingSchedules.length - 1 && (
            <div className="timeline-connector-dash"></div>
          )}
          
          {/* Date section */}
          <div className="event-date-premium">
            <div className="date-card">
              <div className="date-day-number">
                {new Date(event.eventDate).getDate()}
              </div>
              <div className="date-month-year">
                {new Date(event.eventDate).toLocaleString('default', { month: 'short' }).toUpperCase()}
                <span className="date-year">
                  {new Date(event.eventDate).getFullYear()}
                </span>
              </div>
            </div>
            {isToday(event.eventDate) && (
              <div className="today-flare">TODAY</div>
            )}
          </div>

          {/* Event content */}
          <div className="event-content-premium">
            <div className="event-header-premium">
              <h4 className="event-title-premium">{event.title}</h4>
              <div className="event-type-badge">
                {getEventBadge(event.type)}
              </div>
            </div>

            <div className="event-details-premium">
              <div className="detail-chip">
                <span className="chip-icon">🕐</span>
                <span>{event.eventTime || "Time TBA"}</span>
              </div>
              <div className="detail-chip">
                <span className="chip-icon">📍</span>
                <span>{event.location || "Venue TBD"}</span>
              </div>
              {event.duration && (
                <div className="detail-chip">
                  <span className="chip-icon">⏱️</span>
                  <span>{event.duration}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="event-description-premium">
                {event.description.length > 100 
                  ? `${event.description.substring(0, 100)}...` 
                  : event.description}
              </p>
            )}

            <div className="event-footer-premium">
              <div className="event-organizer">
                <span className="organizer-icon"><FaUser /></span>
                <span>{event.organizer || "ZUCA Community"}</span>
              </div>
              <button 
                className="event-details-btn"
                onClick={() => navigate(`/schedule/${event.id}`)}
              >
                View Details
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Status indicator */}
          <div className={`event-status-indicator ${isToday(event.eventDate) ? 'status-today' : 'status-upcoming'}`}>
            {isToday(event.eventDate) ? '🔥 Live' : '📌 Scheduled'}
          </div>
        </div>
      ))
    )}
  </div>

  <button className="view-all-schedules" onClick={() => navigate("/schedules")}>
    <span>Browse All Events</span>
    <FiArrowRight className="button-arrow-icon" />
  </button>
</div>


{/* FINANCIAL STATS ROW - PREMIUM DESIGN */}
<div className="financial-stats-grid">
  <div className="financial-stat-card" onClick={() => navigate("/contributions")}>
    <div className="financial-stat-icon pledged-icon">
      <span>⛁ </span>
    </div>
    <div className="financial-stat-content">
      <span className="financial-stat-value">KES {totalPledged.toLocaleString()}</span>
      <span className="financial-stat-label">Total Pledged</span>
    </div>
    <div className="financial-stat-trend positive">
      <span>↑</span>
    </div>
  </div>

  <div className="financial-stat-card" onClick={() => navigate("/contributions")}>
    <div className="financial-stat-icon paid-icon">
      <span>☑</span>
    </div>
    <div className="financial-stat-content">
      <span className="financial-stat-value">KES {totalPaid.toLocaleString()}</span>
      <span className="financial-stat-label">Total Paid</span>
    </div>
    <div className="financial-stat-trend success">
      <span>✓</span>
    </div>
  </div>

  <div className="financial-stat-card" onClick={() => navigate("/contributions")}>
    <div className="financial-stat-icon pending-icon">
      <span>◔</span>
    </div>
    <div className="financial-stat-content">
      <span className="financial-stat-value">KES {totalPending.toLocaleString()}</span>
      <span className="financial-stat-label">Total Pending</span>
    </div>
    <div className="financial-stat-trend warning">
      <span>⏰</span>
    </div>
  </div>

  <div className="financial-stat-card" onClick={() => navigate("/contributions")}>
    <div className="financial-stat-icon campaigns-icon">
      <span>⚡︎</span>
    </div>
    <div className="financial-stat-content">
      <span className="financial-stat-value">{activeCampaigns}</span>
      <span className="financial-stat-label">Active Campaigns</span>
    </div>
    <div className="financial-stat-trend info">
      <span>📈</span>
    </div>
  </div>
</div>

          {/* TWO COLUMN LAYOUT */}
          <div className="two-columns">
            {/* LEFT COLUMN */}
            <div className="left-column">
             {/* RECENT ANNOUNCEMENTS */}
<div className="section-card announcements-premium">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-announcement">📢</div>
      <div>
        <h3>RECENT ANNOUNCEMENTS</h3>
        <p className="header-subtitle">Latest updates from ZUCA</p>
      </div>
    </div>
    {announcements.length > 0 && (
      <div className="total-badge">
        {announcements.length} New
      </div>
    )}
  </div>

  <div className="announcements-premium-list">
    {announcements.length === 0 ? (
      <div className="empty-state-announcement">
        <div className="empty-announcement-icon">📭</div>
        <p>No announcements yet</p>
        <span>Check back later for updates</span>
      </div>
    ) : (
      announcements.map((ann, index) => (
        <motion.div
          key={ann.id}
          className="announcement-premium-item"
          onClick={() => navigate("/announcements")}
          whileHover={{ x: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="announcement-premium-number">{index + 1}</div>
          <div className="announcement-premium-content">
            <div className="announcement-premium-header">
              <div className="announcement-premium-title">{ann.title}</div>
              <div className="announcement-premium-time">
                {formatRelativeTime(ann.createdAt)}
              </div>
            </div>
            <div className="announcement-premium-message">
              {ann.content?.substring(0, 80)}...
            </div>
          </div>
          <div className="announcement-premium-arrow">
            <FiChevronRight size={18} />
          </div>
        </motion.div>
      ))
    )}
  </div>

  <button className="view-all-premium" onClick={() => navigate("/announcements")}>
    <span>View All Announcements</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>

              {/* MY ACTIVE PLEDGES - COMPACT */}
<div className="section-card pledges-compact">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-small-pledge"><FaHandHoldingHeart size={39} color="#141313" /></div>
      <h3>MY ACTIVE PLEDGES</h3>
    </div>
    {activePledges.length > 0 && (
      <div className="pledge-count-badge">{activePledges.length}</div>
    )}
  </div>

  <div className="pledges-compact-list">
    {activePledges.length === 0 ? (
      <div className="empty-state-compact-pledge">
        <span>◔</span>
        <p>No active pledges</p>
      </div>
    ) : (
      activePledges.map(pledge => {
        const progress = pledge.amountRequired > 0 ? (pledge.amountPaid / pledge.amountRequired) * 100 : 0;
        return (
          <div key={pledge.id} className="pledge-compact-item" onClick={() => navigate("/contributions")}>
            <div className="pledge-compact-header">
              <div className="pledge-compact-title">{pledge.title}</div>
              <div className="pledge-compact-percent">{progress.toFixed(0)}%</div>
            </div>
            <div className="progress-bar-compact">
              <div className="progress-fill-compact" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="pledge-compact-footer">
              <span>KES {pledge.amountPaid.toLocaleString()} / {pledge.amountRequired.toLocaleString()}</span>
              {pledge.pendingAmount > 0 && (
                <span className="pledge-pending-compact">Pending: KES {pledge.pendingAmount.toLocaleString()}</span>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>

  <button className="view-all-compact-pledge" onClick={() => navigate("/contributions")}>
    Make a Pledge →
  </button>
</div>
            {/* RECENT HYMNS */}
<div className="section-card hymns-section">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-music">🎼</div>
      <div>
        <h3>RECENT HYMNS</h3>
        <p className="header-subtitle">Recently added Lyrics</p>
      </div>
    </div>
    {recentHymns.length > 0 && (
      <div className="total-badge">{recentHymns.length} hymns</div>
    )}
  </div>

  <div className="hymns-list">
    {recentHymns.length === 0 ? (
      <div className="empty-state-music">
        <div className="music-note">🎶</div>
        <p>No hymns available</p>
        <span>Check back soon for new songs</span>
      </div>
    ) : (
      recentHymns.map((hymn, index) => (
        <motion.div
          key={hymn.id}
          className="hymn-item"
          onClick={() => navigate(`/hymn/${hymn.id}`)}
          whileHover={{ x: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="hymn-number">{index + 1}</div>
          <div className="hymn-content">
            <div className="hymn-title-wrapper">
              <span className="hymn-title">{hymn.title}</span>
              {hymn.category && (
                <span className="hymn-category">{hymn.category}</span>
              )}
            </div>
            {hymn.verses && (
              <div className="hymn-preview">
                {hymn.verses.split('\n')[0]?.substring(0, 60)}...
              </div>
            )}
            <div className="hymn-meta">
              {hymn.createdAt && (
                <span className="hymn-date">
                  <FaRegCalendar /> {formatRelativeTime(hymn.createdAt)}
                </span>
              )}
              {hymn.numVerses && (
                <span className="hymn-verses">
                  <FaBook /> {hymn.numVerses} verses
                </span>
              )}
            </div>
          </div>
          <div className="hymn-arrow">
            <FiChevronRight size={20} />
          </div>
        </motion.div>
      ))
    )}
  </div>

  <button className="view-all-music" onClick={() => navigate("/hymns")}>
    <span>Browse Full Hymn Book</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="right-column">
             {/* UPCOMING MASS PROGRAMS */}
<div className="section-card mass-premium">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-mass">📑</div>
      <div>
        <h3>UPCOMING MASS PROGRAMS</h3>
        <p className="header-subtitle">Mass songs programe</p>
      </div>
    </div>
    {massPrograms.length > 0 && (
      <div className="total-badge">
        {massPrograms.length} Upcoming
      </div>
    )}
  </div>

  <div className="mass-premium-list">
    {massPrograms.length === 0 ? (
      <div className="empty-state-mass">
        <div className="empty-mass-icon">˗ˏˋ ✞ ˎˊ˗</div>
        <p>No upcoming mass programs  </p>
        <span>We'll notify you;</span>
      </div>
    ) : (
      massPrograms.map((prog, index) => (
        <div 
          key={prog.id} 
          className="mass-premium-item"
          onClick={() => navigate("/mass-programs")}
        >
          <div className="mass-premium-date">
            <div className="mass-date-day">
              {new Date(prog.date).getDate()}
            </div>
            <div className="mass-date-month">
              {new Date(prog.date).toLocaleString('default', { month: 'short' }).toUpperCase()}
            </div>
          </div>
          
          <div className="mass-premium-content">
            <div className="mass-premium-venue">{prog.venue}</div>
            <div className="mass-premium-details">
              <span className="mass-time">🕐 {prog.time || "10:00 AM"}</span>
              {prog.presider && (
                <span className="mass-presider"> {prog.presider}</span>
              )}
            </div>
          </div>
          
          <div className="mass-premium-arrow">
            <FiChevronRight size={18} />
          </div>
        </div>
      ))
    )}
  </div>

  <button className="view-all-premium" onClick={() => navigate("/mass-programs")}>
    <span>View Full program</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>

           
   {/* FEATURED GALLERY */}
<div className="section-card gallery-premium">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-gallery"><FaPhotoVideo color="#000000" /></div>
      <div>
        <h3>FEATURED GALLERY</h3>
        <p className="header-subtitle">Moments from zuca</p>
      </div>
    </div>
    {featuredGallery.length > 0 && (
      <div className="total-badge">
        {featuredGallery.length} photos
      </div>
    )}
  </div>

  <div className="gallery-premium-grid">
    {featuredGallery.length === 0 ? (
      <div className="empty-state-gallery">
        <div className="empty-gallery-icon"><FaPhotoVideo /></div>
        <p>No gallery items</p>
        <span>Check back soon for photos</span>
      </div>
    ) : (
      featuredGallery.map((item, idx) => (
        <motion.div
          key={item.id}
          className="gallery-premium-item"
          onClick={() => navigate(`/gallery/${item.id}`)}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="gallery-premium-image">
            {item.url || item.thumbnailUrl ? (
              <img 
                src={item.thumbnailUrl || item.url} 
                alt={item.title || "Gallery image"}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Crect x='2' y='2' width='20' height='20' rx='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='2.5'%3E%3C/circle%3E%3Cpath d='M21 15l-5-4-3 3-4-4-5 5'%3E%3C/path%3E%3C/svg%3E";
                }}
              />
            ) : (
              <div className="gallery-premium-placeholder"><FaPhotoVideo /></div>
            )}
            <div className="gallery-premium-overlay">
              <span className="overlay-icon">🔍</span>
              <span className="overlay-text">View</span>
            </div>
          </div>
          <div className="gallery-premium-info">
            <div className="gallery-premium-title">
              {item.title?.substring(0, 25) || "ZUCA Memory"}
            </div>
            {item.createdAt && (
              <div className="gallery-premium-date">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </motion.div>
      ))
    )}
  </div>

  <button className="view-all-premium" onClick={() => navigate("/gallery")}>
    <span>View Full Gallery</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>
            </div>
          </div>

          {/* GAMES & COMMUNITY - PREMIUM DESIGN */}
<div className="section-card games-premium full-width">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-games"><FaGamepad size={28} color="#141313" /></div>
      <div>
        <h3>GAMES</h3>
        <p className="header-subtitle">Connect, play, and grow together</p>
      </div>
    </div>
    {gameInvites.length > 0 && (
      <div className="games-badge">{gameInvites.length} Invites</div>
    )}
  </div>

  <div className="games-community-premium">
    {/* Games Section */}
    <div className="games-section-premium">
      <div className="games-header-premium">
        <span className="games-title-premium">ᯤ Active Game Invites</span>
        <span className="games-count">{gameInvites.length}</span>
      </div>
      
      {gameInvites.length === 0 ? (
        <div className="empty-games-state">
          <span className="empty-games-icon">🎯</span>
          <p>No active game invites</p>
          <span className="empty-games-sub">Start a game or challenge a friend!</span>
        </div>
      ) : (
        <div className="game-invites-list">
          {gameInvites.slice(0, 2).map((invite, index) => (
            <motion.div
              key={invite.id}
              className="game-invite-premium"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="game-invite-avatar">
                {invite.fromUser?.profileImage ? (
                  <img src={invite.fromUser.profileImage} alt="Player" />
                ) : (
                  <span>🎮</span>
                )}
              </div>
              <div className="game-invite-content">
                <div className="game-invite-sender">
                  <strong>{invite.fromUser?.fullName?.split(' ')[0] || 'Someone'}</strong>
                  <span className="game-invite-action">challenged you!</span>
                </div>
                <div className="game-invite-meta">
                  <span className="game-type">{invite.gameType || '🎯 Quick Game'}</span>
                  <span className="game-time">{formatRelativeTime(invite.createdAt)}</span>
                </div>
              </div>
              <button 
                className="game-invite-accept"
                onClick={() => navigate(`/games/accept/${invite.id}`)}
              >
                Accept →
              </button>
            </motion.div>
          ))}
        </div>
      )}
      
      <button 
        className="games-action-btn"
        onClick={() => navigate("/games")}
      >
        <span><FaGamepad /> Play Games</span>
        <FiArrowRight className="button-icon" />
      </button>
    </div>

    {/* Online Members Section */}
    <div className="online-section-premium">
      <div className="online-header-premium">
        <span className="online-title-premium"><FaUsers></FaUsers> Online Members</span>
        <span className="online-count">{onlineMembers.length}</span>
      </div>
      
      {onlineMembers.length === 0 ? (
        <div className="empty-online-state">
          <span className="empty-online-icon">🌙</span>
          <p>No one is online right now</p>
          <span className="empty-online-sub">Check back later</span>
        </div>
      ) : (
        <>
          <div className="online-members-grid">
            {onlineMembers.slice(0, 6).map((member, index) => (
              <motion.div
                key={member.id}
                className="online-member-premium"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <div className="online-member-avatar">
                  {member.profileImage ? (
                    <img src={member.profileImage} alt={member.fullName} />
                  ) : (
                    <span>{member.fullName?.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="online-status-dot"></div>
                </div>
                <div className="online-member-name">
                  {member.fullName?.split(' ')[0] || 'Member'}
                </div>
              </motion.div>
            ))}
          </div>
          {onlineMembers.length > 6 && (
            <div className="online-more-indicator">
              +{onlineMembers.length - 6} more online
            </div>
          )}
        </>
      )}
      
      <button 
        className="online-action-btn"
        onClick={() => navigate("/chat")}
      >
        <span>💬 Join Chat</span>
        <FiArrowRight className="button-icon" />
      </button>
    </div>
  </div>
</div>

          {/* QUICK STATS - PREMIUM DESIGN */}
<div className="section-card stats-premium full-width">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-stats"><FiActivity /></div>
      <div>
        <h3>ZUCA STATUS</h3>
        <p className="header-subtitle">ZUCA at a glance</p>
      </div>
    </div>
    <div className="stats-live-badge">● LIVE</div>
  </div>

  <div className="quick-stats-premium-grid">
    <motion.div 
      className="quick-stat-premium"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="stat-premium-icon users-icon"><FaUsers /></div>
      <div className="stat-premium-content">
        <div className="stat-premium-value">{totalUsers || 0}</div>
        <div className="stat-premium-label">Total Users</div>
      </div>
      <div className="stat-premium-trend">↑</div>
    </motion.div>

    <motion.div 
      className="quick-stat-premium"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="stat-premium-icon messages-icon"><FaComments /></div>
      <div className="stat-premium-content">
        <div className="stat-premium-value">{totalMessages || 0}</div>
        <div className="stat-premium-label">Messages</div>
      </div>
      <div className="stat-premium-trend">↑</div>
    </motion.div>

    <motion.div 
      className="quick-stat-premium"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="stat-premium-icon hymns-icon"><FaMusic /></div>
      <div className="stat-premium-content">
        <div className="stat-premium-value">{totalHymns || 0}</div>
        <div className="stat-premium-label">Hymns</div>
      </div>
      <div className="stat-premium-trend">↑</div>
    </motion.div>

    <motion.div 
      className="quick-stat-premium"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="stat-premium-icon media-icon"><FaPhotoVideo /></div>
      <div className="stat-premium-content">
        <div className="stat-premium-value">{totalMedia || 0}</div>
        <div className="stat-premium-label">Media</div>
      </div>
      <div className="stat-premium-trend">↑</div>
    </motion.div>

    <motion.div 
      className="quick-stat-premium"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="stat-premium-icon gallery-icon"><FaThLarge /></div>
      <div className="stat-premium-content">
        <div className="stat-premium-value">{galleryItems || 0}</div>
        <div className="stat-premium-label">Gallery Items</div>
      </div>
      <div className="stat-premium-trend">↑</div>
    </motion.div>
  </div>
</div>
          

          {/* EXECUTIVE TEAM QUICK ACCESS */}
<div className="section-card executive-premium full-width">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-executive"><FaUserTie color="#e41811"/></div>
      <div>
        <h3>EXECUTIVE TEAM</h3>
        <p className="header-subtitle">ZUCA Leadership & Administration</p>
      </div>
    </div>
    {executiveTeam.length > 0 && (
      <div className="total-badge">
        {executiveTeam.length} Members
      </div>
    )}
  </div>

  <div className="executive-premium-grid">
    {executiveTeam.length === 0 ? (
      <div className="empty-state-executive">
        <div className="empty-executive-icon"><FaUserTie /></div>
        <p>No executive team assigned</p>
        <span>Leadership team coming soon</span>
      </div>
    ) : (
      executiveTeam.map((exec, index) => (
        <motion.div
          key={exec.id}
          className="executive-premium-card"
          onClick={() => navigate("/executive")}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="executive-premium-avatar">
            {exec.profileImage ? (
              <img src={exec.profileImage} alt={exec.name} />
            ) : (
              <div className="executive-avatar-placeholder">
                {exec.position?.title === "Chairperson" && "👑"}
                {exec.position?.title === "Secretary" && "📝"}
                {exec.position?.title === "Treasurer" && "💰"}
                {exec.position?.title === "Choir Moderator" && "🎵"}
                {exec.position?.title === "Media Moderator" && "📸"}
                {!exec.position?.title && "👤"}
              </div>
            )}
          </div>
          <div className="executive-premium-info">
            <div className="executive-premium-name">
              {exec.name?.split(' ')[0] || "Leader"}
            </div>
            <div className="executive-premium-role">
              {exec.position?.title || "Executive Member"}
            </div>
          </div>
          <div className="executive-premium-contact">
            {exec.phone && (
              <a 
                href={`tel:${exec.phone}`} 
                className="executive-call-btn"
                onClick={(e) => e.stopPropagation()}
              >
                📞
              </a>
            )}
            {exec.whatsappLink && (
              <a 
                href={exec.whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="executive-wa-btn"
                onClick={(e) => e.stopPropagation()}
              >
                💬
              </a>
            )}
          </div>
        </motion.div>
      ))
    )}
  </div>

  <button className="view-all-premium" onClick={() => navigate("/executive")}>
    <span>View Full Executive Team</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>

          {/* RECENT CHAT ACTIVITY - PREMIUM */}
<div className="section-card chat-premium full-width">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-chat">💬</div>
      <div>
        <h3>RECENT CHAT ACTIVITY</h3>
        <p className="header-subtitle">Latest community conversations</p>
      </div>
    </div>
    {recentChats.length > 0 && (
      <div className="chat-badge">{recentChats.length} New</div>
    )}
  </div>

  <div className="chat-activities-premium">
    {recentChats.length === 0 ? (
      <div className="empty-chat-state">
        <span className="empty-chat-icon">💭</span>
        <p>No recent chat activity</p>
        <span className="empty-chat-sub">Start a conversation!</span>
      </div>
    ) : (
      recentChats.map((chat, index) => (
        <motion.div 
          key={chat.id} 
          className="chat-item-premium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ x: 4 }}
        >
          <div className="chat-avatar-premium">
            {chat.user?.profileImage ? (
              <img src={chat.user.profileImage} alt={chat.user.fullName} />
            ) : (
              <span>{chat.user?.fullName?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="chat-content-premium">
            <div className="chat-header-premium">
              <span className="chat-user-name">{chat.user?.fullName?.split(' ')[0] || 'User'}</span>
              <span className="chat-time-premium">{formatRelativeTime(chat.createdAt)}</span>
            </div>
            <div className="chat-message-premium">
              "{chat.content?.substring(0, 60)}{chat.content?.length > 60 ? '...' : ''}"
            </div>
          </div>
          <div className="chat-reply-indicator">
            <FiChevronRight size={16} />
          </div>
        </motion.div>
      ))
    )}
  </div>

  <button className="chat-action-btn" onClick={() => navigate("/chat")}>
    <span>💬 Go to Chat</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>

         {/* RECENT NOTIFICATIONS - PREMIUM */}
<div className="section-card notifications-premium full-width">
  <div className="section-header">
    <div className="header-with-icon">
      <div className="header-icon-notification">🔔</div>
      <div>
        <h3>NOTIFICATIONS</h3>
        <p className="header-subtitle">Stay updated with ZUCA</p>
      </div>
    </div>
    <div className="notif-badge">
      {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} Unread` : 'All Read'}
    </div>
  </div>

  <div className="notifications-premium-list">
    {recentNotifications.length === 0 ? (
      <div className="empty-notif-state">
        <span className="empty-notif-icon">🔕</span>
        <p>No notifications</p>
        <span className="empty-notif-sub">You're all caught up!</span>
      </div>
    ) : (
      recentNotifications.map((notif, index) => (
        <motion.div 
          key={notif.id} 
          className={`notif-item-premium ${!notif.read ? 'notif-unread' : ''}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.08 }}
          whileHover={{ x: 4 }}
          onClick={() => navigate("/notifications")}
        >
          <div className="notif-icon-premium">
            {notif.type === "announcement" && "📢"}
            {notif.type === "game_invite" && "🎮"}
            {notif.type === "program" && "⛪"}
            {notif.type === "checkin" && "✅"}
            {notif.type === "message" && "💬"}
            {!notif.type && "🔔"}
          </div>
          <div className="notif-content-premium">
            <div className="notif-header-premium">
              <span className="notif-title-premium">{notif.title || 'Update'}</span>
              {!notif.read && <span className="notif-unread-dot">●</span>}
            </div>
            <div className="notif-message-premium">{notif.message}</div>
            <div className="notif-time-premium">{formatRelativeTime(notif.createdAt)}</div>
          </div>
          <div className="notif-arrow-premium">
            <FiChevronRight size={16} />
          </div>
        </motion.div>
      ))
    )}
  </div>

  <button className="notif-action-btn" onClick={() => navigate("/announcements")}>
    <span>🔔 View All Notifications</span>
    <FiArrowRight className="button-icon" />
  </button>
</div>
      {/* FOOTER - PREMIUM */}
      <div className="footer-premium">
        <div className="footer-content">
          <div className="footer-brand">
            <img 
              src={logo} 
              alt="ZUCA Logo" 
              className="footer-logo-img"
              onClick={() => navigate("/dashboard")}
              style={{ cursor: "pointer" }}
            />
            <div className="footer-brand-text">
              <h4>ZUCA Portal</h4>
              <p>Zetech University Catholic Action</p>
            </div>
          </div>
          
          <div className="footer-links">
            <a href="#" onClick={() => navigate("/about")}>About</a>
            <a href="#" onClick={() => navigate("/contact")}>Contact</a>
            <a href="#" onClick={() => navigate("/privacy")}>Privacy</a>
            <a href="#" onClick={() => navigate("/terms")}>Terms</a>
          </div>
          
          <div className="footer-social">
           
          </div>
        </div>
        
    <div className="footer-bottom">
  <p>© {new Date().getFullYear()} ZUCA Portal | v 1.0 | {new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })}</p>
  <p className="creator">Created by <strong>@CHRISWEBSYS</strong></p>
</div>
      </div>

      {/* MODALS */}
      {showCropper && (
        <ProfileImageCropper
          imageFile={selectedImageFile}
          onCropComplete={(croppedFile) => {
            setShowCropper(false);
          }}
          onClose={() => {
            setShowCropper(false);
            setSelectedImageFile(null);
          }}
        />
      )}

      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        user={user}
        onUserUpdate={(updatedUser) => {
          setUser(updatedUser);
          setProfileImage(updatedUser.profileImage);
        }}
      />

      

      <style>{`
        /* GLOBAL STYLES - MOBILE FIRST */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
          
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        }

        .dashboard {
          min-height: 100vh;
          padding: 16px;
        }

        .dashboard-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* HEADER */
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .greeting {
          color: white;
          font-size: 20px;
          font-weight: 600;
        }

        .user-name {
          background: linear-gradient(135deg, #60a5fa, #c084fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .wave {
          display: inline-block;
          margin-left: 4px;
        }

        .date {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
        }

        .header-right {
          display: flex;
          gap: 8px;
        }

        .ai-btn, .logout-btn {
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          transition: all 0.3s ease;
        }

        .ai-btn {
          background: rgba(220, 38, 38, 0.9);
          color: white;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #dc2626;
          backdrop-filter: blur(10px);
        }

        /* PROFILE CARD */
        .profile-card {
          background: #ffffff;
          
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .profile-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .avatar-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #0ce428;
          cursor: pointer;
        }

        /* Name divider line */
.name-divider {
  margin: 6px 0 8px 0;
}

.divider-line {
  height: 2px;
  background: linear-gradient(90deg, #000000, #33ff00, #000000);
  border-radius: 2px;
  width: 90%;
  transition: width 0.3s ease;
}

.profile-card:hover .divider-line {
  width: 100px;
}

        .avatar-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ff0000, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          color: white;
        }

        .avatar-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.6);
          padding: 4px;
          display: flex;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .avatar-wrapper:hover .avatar-overlay {
          opacity: 1;
        }

        .profile-info {
          flex: 1;
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .info-header h2 {
          font-size: 20px;
          color: #1e293b;
        }

        .member-badge {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
        }

        .email, .phone {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 6px;
        }

        .role-badge, .jumuia-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }

        .role-badge {
          background: #eff6ff;
          color: #3b82f6;
        }

        .jumuia-badge {
          background: #ecfdf5;
          color: #10b981;
        }

        .profile-stats {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 12px 0;
          border-top: 1px solid #000000 ;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-icon {
          font-size: 24px;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-label {
          font-size: 10px;
          color: #64748b;
        }

        .stat-divider {
          width: 1px;
          height: 30px;
          background: #000000;
        }

        .whatsapp-link {
          font-size: 14px;
          font-weight: 700;
          color: #25D366;
          text-decoration: none;
        }

        /* STATS ROW */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .stats-row {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stat-card .stat-icon {
          font-size: 28px;
        }

        .stat-card .stat-value {
          font-size: 18px;
        }

        /* TWO COLUMN LAYOUT */
        .two-columns {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .two-columns {
            grid-template-columns: repeat(2, 1fr);
          }
        }

      /* ============================================
   MAIN CARD
   ============================================ */


.section-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.full-width {
  width: 100%;
}

/* ============================================
   SECTION HEADER
   ============================================ */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.75rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f5f5f5;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, #1a1a1a, #333);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.event-counter {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ============================================
   EVENTS LIST
   ============================================ */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-bottom: 1.75rem;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

/* Custom scrollbar */
.events-list::-webkit-scrollbar {
  width: 4px;
}

.events-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.events-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
}

/* ============================================
   EMPTY STATE
   ============================================ */
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  background: linear-gradient(135deg, #faf9ff, #f5f3ff);
  border-radius: 20px;
  border: 1px dashed #e0e0e0;
}

.empty-emoji {
  font-size: 3rem;
  margin-bottom: 0.75rem;
  display: inline-block;
}

.empty-state p {
  font-size: 1rem;
  font-weight: 600;
  color: #666;
  margin: 0 0 0.25rem 0;
}

.empty-state span {
  font-size: 0.8rem;
  color: #999;
}

/* ============================================
   EVENT ITEM - MODERN DESIGN
   ============================================ */
.event-item {
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.25s ease;
  border: 1px solid #f0f0f0;
  position: relative;
  overflow: hidden;
}

.event-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transform: scaleY(0);
  transition: transform 0.25s ease;
}

.event-item:hover {
  transform: translateX(4px);
  border-color: #e8e8ff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.event-item:hover::before {
  transform: scaleY(1);
}

/* Date Box */
.event-date-box {
  min-width: 60px;
  text-align: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 0.5rem;
  border-radius: 14px;
  color: white;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.2);
}

.event-day {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
}

.event-month {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Event Info */
.event-info {
  flex: 1;
}

.event-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 0.35rem;
  letter-spacing: -0.2px;
}

.event-time-info {
  font-size: 0.75rem;
  color: #888;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.time-icon {
  font-size: 0.7rem;
}

.time-separator {
  color: #ddd;
}

/* Event Badge */
.event-badge {
  background: #f0fdf4;
  color: #16a34a;
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid #dcfce7;
}

.event-badge:contains("Today") {
  background: #fef3c7;
  color: #d97706;
  border-color: #fde68a;
}

/* ============================================
   VIEW ALL BUTTON
   ============================================ */
.view-all {
  width: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 0.85rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.view-all::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.view-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.view-all:hover::before {
  left: 100%;
}

.view-all:active {
  transform: translateY(0px);
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */
@media (max-width: 640px) {
  .section-card {
    padding: 1.25rem;
  }
  
  .section-header h3 {
    font-size: 1rem;
  }
  
  .event-item {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  
  .event-date-box {
    min-width: 50px;
  }
  
  .event-day {
    font-size: 1.2rem;
  }
  
  .event-title {
    font-size: 0.85rem;
  }
  
  .event-time-info {
    font-size: 0.7rem;
  }
  
  .event-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.6rem;
  }
  
  .view-all {
    padding: 0.7rem;
    font-size: 0.8rem;
  }
}

/* ============================================
   FIX FOR "TODAY" BADGE (using CSS attr)
   ============================================ */
.event-badge[data-status="today"] {
  background: #fef3c7;
  color: #d97706;
  border-color: #fde68a;
}
        /* ANNOUNCEMENTS */
        .announcements-list, .pledges-list, .hymns-list, .programs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .announcement-item, .pledge-item, .program-item {
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .announcement-item:hover, .pledge-item:hover, .program-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }

        .announcement-item {
          display: flex;
          gap: 12px;
        }

        .announcement-icon {
          font-size: 20px;
        }

        .announcement-title {
          font-weight: 600;
          font-size: 13px;
          color: #1e293b;
        }

        .announcement-message {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }

        .announcement-time {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* PLEDGES */
        .pledge-title {
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .progress-bar {
          background: #e2e8f0;
          border-radius: 20px;
          height: 6px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-fill {
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          height: 100%;
          border-radius: 20px;
        }

        .pledge-stats {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .pledge-pending {
          font-size: 10px;
          color: #f59e0b;
        }

        /* HYMNS */
        .hymn-item {
          padding: 8px 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hymn-bullet {
          color: #3b82f6;
        }

        .hymn-title {
          font-size: 13px;
          color: #334155;
        }

        /* PROGRAMS */
        .program-date, .program-venue, .program-time {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 2px;
        }

       /* GALLERY GRID */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.gallery-item {
  aspect-ratio: 1;
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.gallery-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery-item:hover img {
  transform: scale(1.05);
}

.gallery-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #94a3b8;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.gallery-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: white;
  font-size: 11px;
  padding: 8px 6px 4px;
  text-align: center;
  font-weight: 500;
  letter-spacing: 0.3px;
  backdrop-filter: blur(4px);
}
        /* JUMUIA */
        .jumuia-content {
          text-align: center;
          padding: 12px;
          background: linear-gradient(135deg, #0bc549c2, #47ee05bd);
          border-radius: 16px;
          color: white;
        }

        .jumuia-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .jumuia-detail {
          font-size: 12px;
          margin-bottom: 4px;
          opacity: 0.9;
        }

        .jumuia-chat-btn {
          margin-top: 12px;
          background: rgba(255,255,255,0.2);
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        }

        /* GAMES & COMMUNITY */
        .games-community {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 600px) {
          .games-community {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .games-section, .online-section {
          background: #f8fafc;
          border-radius: 16px;
          padding: 12px;
        }

        .games-title, .online-title {
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .game-invite, .online-name {
          font-size: 12px;
          color: #64748b;
        }

        .online-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 8px 0;
        }

        .games-btn, .online-btn {
          margin-top: 10px;
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 11px;
          cursor: pointer;
        }

        /* QUICK STATS */
        .quick-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 768px) {
          .quick-stats-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .quick-stat {
          text-align: center;
          padding: 8px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .quick-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
        }

        .quick-stat-label {
          font-size: 10px;
          color: #64748b;
        }

        /* READING */
        .reading-card {
          background: linear-gradient(135deg, #fef3c7, #fffbeb);
        }

        .reading-title {
          font-weight: 600;
          margin-bottom: 8px;
        }

        .reading-item {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .reading-btn {
          margin-top: 12px;
          padding: 8px 16px;
          background: #d97706;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
        }

        /* EXECUTIVE */
        .executive-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        @media (min-width: 600px) {
          .executive-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .executive-item {
          text-align: center;
          padding: 10px;
          background: #f8fafc;
          border-radius: 12px;
          cursor: pointer;
        }

        .executive-icon {
          font-size: 28px;
          margin-bottom: 4px;
        }

        .executive-name {
          font-size: 10px;
          color: #334155;
          font-weight: 500;
        }

        /* CHAT ACTIVITIES */
        .chat-item {
          padding: 10px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 8px;
          font-size: 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px;
        }

        .chat-time {
          font-size: 9px;
          color: #94a3b8;
          margin-left: auto;
        }

        /* NOTIFICATIONS */
        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .notification-item.unread {
          background: #eff6ff;
        }

        .notification-icon {
          font-size: 20px;
        }

        .notification-title {
          font-weight: 600;
          font-size: 12px;
        }

        .notification-message {
          font-size: 11px;
          color: #64748b;
        }

        .notification-time {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* EVENTS */
        .event-item {
          padding: 8px 0;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }

        .event-item:last-child {
          border-bottom: none;
        }

        /* BUTTONS */
        .view-all {
          margin-top: 2px;
          width: 100%;
          padding: 10px;
          background: #f1f5f9;
          border: none;
          border-radius: 12px;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-all:hover {
          background: #e2e8f0;
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 24px;
          color: #94a3b8;
          font-size: 13px;
        }

        /* FOOTER */
        .footer {
          text-align: center;
          padding: 20px;
          margin-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .footer p {
          font-size: 10px;
          color: #94a3b8;
        }

        .creator {
          margin-top: 4px;
          font-size: 9px;
          color: #cbd5e1;
        }

        /* ANIMATIONS */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ============================================
   ENHANCED HYMNS SECTION
   ============================================ */

.hymns-section {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-left: 4px solid #123241;
  border-radius: 30px;
  margin-top: 20px;
}

.header-with-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-music {
  font-size: 2rem;
 
  padding: 0.6rem;
  border-radius: 16px;
 
  color: white;
}

.header-subtitle {
  font-size: 0.7rem;
  color: #123241;
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.total-badge {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #0f172a;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid #cbd5e1;
}

/* Empty State Music */
.empty-state-music {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  border-radius: 20px;
  border: 2px dashed #123241;
}

.music-note {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  animation: float 3s ease-in-out infinite;
}

.empty-state-music p {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.empty-state-music span {
  font-size: 0.75rem;
  color: #123241;
}

/* Hymns List */
.hymns-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.hymns-list::-webkit-scrollbar {
  width: 4px;
}

.hymns-list::-webkit-scrollbar-track {
  background: #cbd5e1;
  border-radius: 10px;
}

.hymns-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 10px;
}

/* Hymn Item */
.hymn-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #cbd5e1;
  position: relative;
  overflow: hidden;
}

.hymn-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.hymn-item:hover {
  transform: translateX(4px);
  border-color: #123241;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  background: #f8fafc;
}

.hymn-item:hover::before {
  transform: scaleY(1);
}

/* Hymn Number */
.hymn-number {
  min-width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #0f172a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  border: 1px solid #cbd5e1;
}

.hymn-item:hover .hymn-number {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
  border-color: transparent;
}

/* Hymn Content */
.hymn-content {
  flex: 1;
}

.hymn-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}

.hymn-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.hymn-category {
  font-size: 0.65rem;
  background: #e2e8f0;
  color: #123241;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  font-weight: 600;
}

.hymn-preview {
  font-size: 0.7rem;
  color: #475569;
  margin-bottom: 0.35rem;
  font-style: italic;
}

.hymn-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hymn-date, .hymn-verses {
  font-size: 0.65rem;
  color: #123241;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

/* Hymn Arrow */
.hymn-arrow {
  color: #123241;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.hymn-item:hover .hymn-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* View All Music Button */
.view-all-music {
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  color: white;
  border: none;
  padding: 0.85rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.view-all-music::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transition: left 0.5s ease;
}

.view-all-music:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
}

.view-all-music:hover::before {
  left: 100%;
}

.view-all-music:active {
  transform: translateY(0px);
}

.button-icon {
  transition: transform 0.3s ease;
}

.view-all-music:hover .button-icon {
  transform: translateX(4px);
}

/* Animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .hymn-item {
    padding: 0.75rem;
  }
  
  .hymn-number {
    min-width: 30px;
    height: 30px;
    font-size: 0.75rem;
  }
  
  .hymn-title {
    font-size: 0.85rem;
  }
  
  .hymn-preview {
    font-size: 0.65rem;
  }
  
  .hymn-meta {
    font-size: 0.6rem;
  }
  
  .header-icon-music {
    font-size: 1.5rem;
    padding: 0.4rem;
  }
}

/* Small polish for membership row */
.membership-row {
  margin-bottom: 0.5rem;
}

.member-badge {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #1e293b;
  display: inline-block;
}

/* Make email/phone cleaner */
.email, .phone {
  font-size: 0.8rem;
  font-weight: 500;
  color: #ec0000;
  margin: 0.2rem 0;
}

/* Styles just the icons */
.icon-style {
  color: #000000;
  font-size: 24px;
  margin-right: 8px;
}

/* Styles just the email and phone text */
.text-style {
  color: #ff0000;
    font-size: 14px;

  font-weight: 500;
}


.email1, .phone1 {
  font-size: 1.3rem;
  font-weight: 500;
  color: #000000;
  margin: 0.2rem 0;
}

/* Fix for the 📩 icon - remove extra dash */
.email {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Keep original everything else */
/* ============================================
   PREMIUM SCHEDULES SECTION
   ============================================ */

.schedules-section {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-left: 4px solid #123241;
  position: relative;
  border-radius: 30px;
  margin-top: 20px;
  padding: 0.1rem 1rem;
  overflow: hidden;
}

.schedules-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 80%;
  height: 200%;
  background: radial-gradient(circle, rgba(18, 50, 65, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.header-icon-calendar {
  font-size: 1rem;
  
  padding: 0.3rem;
  border-radius: 16px;
 
  color: white;
}

.schedule-badge {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

/* Empty State Calendar */
.empty-state-calendar {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  border-radius: 24px;
  border: 2px dashed #123241;
}

.calendar-icon {
  font-size: 3.5rem;
  margin-bottom: 0.75rem;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.empty-state-calendar p {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.empty-state-calendar span {
  font-size: 0.8rem;
  color: #123241;
}

/* Events Timeline */
.events-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  max-height: 600px;
  overflow-y: auto;
  padding: 0.5rem;
  position: relative;
}

.events-timeline::-webkit-scrollbar {
  width: 6px;
}

.events-timeline::-webkit-scrollbar-track {
  background: #cbd5e1;
  border-radius: 10px;
}

.events-timeline::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 10px;
}

/* Premium Event Card */
.event-card-premium {
  background: white;
  border-radius: 20px;
  padding: 1.2rem;
  display: flex;
  gap: 1.25rem;
  position: relative;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.event-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 30px -12px rgba(15, 23, 42, 0.15);
  border-color: #123241;
}

/* Timeline Connector */
.timeline-connector-dash {
  position: absolute;
  left: 55px;
  top: 100%;
  width: 2px;
  height: 1.5rem;
  background: linear-gradient(to bottom, #123241, transparent);
  z-index: 0;
}

/* Date Section */
.event-date-premium {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 80px;
}

.date-card {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 18px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  color: white;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.25);
  transition: all 0.3s ease;
  width: 100%;
}

.event-card-premium:hover .date-card {
  transform: scale(1.05);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.35);
}

.date-day-number {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.date-month-year {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.date-year {
  font-size: 0.6rem;
  opacity: 0.8;
}

.today-flare {
  background: #ef4444;
  color: white;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  letter-spacing: 0.5px;
  animation: pulse 2s infinite;
}

/* Event Content */
.event-content-premium {
  flex: 1;
}

.event-header-premium {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.event-title-premium {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.3px;
}

.event-type-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
}

/* Event Details Chips */
.event-details-premium {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.detail-chip {
  background: #f8fafc;
  padding: 0.25rem 0.6rem;
  border-radius: 30px;
  font-size: 0.7rem;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid #e2e8f0;
}

.chip-icon {
  font-size: 0.65rem;
}

.event-description-premium {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

/* Event Footer */
.event-footer-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f1f5f9;
}

.event-organizer {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: #94a3b8;
}

.organizer-icon {
  font-size: 0.7rem;
}

.event-details-btn {
  background: transparent;
  border: none;
  color: #123241;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  transition: all 0.2s ease;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
}

.event-details-btn:hover {
  background: #e2e8f0;
  gap: 0.4rem;
}

/* Status Indicator - GREEN & RED MAINTAINED */
.event-status-indicator {
  font-size: 0.65rem;
  font-weight: 700;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  padding: 0.5rem 0.25rem;
  border-radius: 30px;
  text-align: center;
  letter-spacing: 1px;
}

.status-today {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.status-upcoming {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

/* View All Button */
.view-all-schedules {
  width: 100%;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 16px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.view-all-schedules::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.view-all-schedules:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4);
}

.view-all-schedules:hover::before {
  width: 300px;
  height: 300px;
}

.view-all-schedules:active {
  transform: translateY(0px);
}

.button-arrow-icon {
  transition: transform 0.3s ease;
}

.view-all-schedules:hover .button-arrow-icon {
  transform: translateX(6px);
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* Helper function for event badges */
.event-type-badge {
  background: #e2e8f0;
  color: #0f172a;
}

/* Different colors for different event types - MAINTAINED */
.event-card-premium[data-type="mass"] .event-type-badge {
  background: #fef3c7;
  color: #d97706;
}

.event-card-premium[data-type="meeting"] .event-type-badge {
  background: #dcfce7;
  color: #16a34a;
}

.event-card-premium[data-type="social"] .event-type-badge {
  background: #fce7f3;
  color: #db2777;
}

/* Responsive - ORIGINAL SIZE MAINTAINED */
@media (max-width: 768px) {
  .event-card-premium {
    flex-direction: column;
    gap: 1rem;
  }
  
  .event-date-premium {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    min-width: auto;
  }
  
  .date-card {
    width: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
  }
  
  .date-day-number {
    font-size: 1.5rem;
    margin-bottom: 0;
  }
  
  .date-month-year {
    flex-direction: row;
    gap: 0.25rem;
    align-items: baseline;
  }
  
  .timeline-connector-dash {
    display: none;
  }
  
  .event-status-indicator {
    writing-mode: horizontal-tb;
    padding: 0.25rem 0.5rem;
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
  
  .event-header-premium {
    padding-right: 70px;
  }
}

/* Desktop enhancements - ORIGINAL SIZE MAINTAINED */
@media (min-width: 1024px) {
  .event-title-premium {
    font-size: 1.1rem;
  }
  
  .detail-chip {
    font-size: 0.75rem;
  }
  
  .event-description-premium {
    font-size: 0.8rem;
  }
}

/* ============================================
   PREMIUM EXECUTIVE TEAM SECTION (DASHBOARD SIZE)
   ============================================ */

.executive-premium {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  margin-bottom: 0;
  border-radius: 35px;
  border-left: 4px solid #123241;
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-icon-executive {
  font-size: 1.8rem;
 
  padding: 0.5rem;
  border-radius: 16px;

  color: white;
  display: inline-block;
  margin-bottom: 1rem;
}

/* Empty State */
.empty-state-executive {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  border-radius: 20px;
  border: 2px dashed #123241;
}

.empty-executive-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.empty-state-executive p {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.empty-state-executive span {
  font-size: 0.7rem;
  color: #123241;
}

/* Executive Grid */
.executive-premium-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .executive-premium-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 640px) {
  .executive-premium-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

/* Executive Card */
.executive-premium-card {
  background: white;
  border-radius: 20px;
  padding: 0.75rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #cbd5e1;
  position: relative;
  overflow: hidden;
}

.executive-premium-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0f172a, #123241);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.executive-premium-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px -10px rgba(15, 23, 42, 0.25);
  border-color: #123241;
}

.executive-premium-card:hover::before {
  transform: scaleX(1);
}

/* Avatar */
.executive-premium-avatar {
  width: 55px;
  height: 55px;
  margin: 0 auto 0.6rem;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #123241;
  transition: all 0.3s ease;
}

.executive-premium-card:hover .executive-premium-avatar {
  transform: scale(1.05);
  border-color: #0f172a;
}

.executive-premium-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.executive-avatar-placeholder {
  font-size: 1.6rem;
  color: #0f172a;
}

/* Info */
.executive-premium-info {
  margin-bottom: 0.5rem;
}

.executive-premium-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.executive-premium-role {
  font-size: 0.55rem;
  color: #123241;
  font-weight: 600;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Contact Buttons */
.executive-premium-contact {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.executive-call-btn,
.executive-wa-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.executive-call-btn {
  background: #dbeafe;
  color: #3557a0;
}

.executive-wa-btn {
  background: #dcfce7;
  color: #25D366;
}

.executive-call-btn:hover,
.executive-wa-btn:hover {
  transform: scale(1.1);
}

/* View All Button */
.view-all-premium {
  width: 100%;
  background: linear-gradient(135deg, #0f172a00 0%, #1e293b);
  color: white;
  border: none;
  padding: 0.6rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  margin-top: auto;
}

.view-all-premium::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.view-all-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
}

.view-all-premium:hover::before {
  left: 100%;
}

.button-icon {
  transition: transform 0.3s ease;
  width: 14px;
  height: 14px;
}

.view-all-premium:hover .button-icon {
  transform: translateX(4px);
}

/* Animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* ============================================
   JUMUIA DASHBOARD CARD - COMPACT
   ============================================ */

.jumuia-dashboard-card {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-left: 3px solid #000000;
  padding: 1.25rem;
  gap: 20px;
  border-radius: 30px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0;
  border-bottom: none;
}

.header-icon-small {
  font-size: 1.3rem;
  padding: 0.3rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.header-icon-small span {
  font-size: 0.9rem;
}

.section-header h3 {
  font-size: 1rem;
  margin: 0;
  flex: 1;
}

.jumuia-status-badge-small {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: #dcfce7;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  font-size: 0.6rem;
  font-weight: 600;
  color: #16a34a;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
  display: inline-block;
}

/* Content */
.jumuia-dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.jumuia-name-dashboard {
  font-size: 1rem;
  font-weight: 700;
  color: #1e1b4b;
  margin-bottom: 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3e8ff;
}

/* Quick Info Grid */
.jumuia-quick-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.quick-info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #faf5ff;
  padding: 0.5rem;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.quick-info-item:hover {
  background: #f3e8ff;
  transform: translateX(2px);
}

.info-emoji {
  font-size: 1.1rem;
}

.info-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.info-label {
  font-size: 0.6rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e1b4b;
}

.meeting-highlight {
  background: linear-gradient(135deg, #fef3c7, #fffbeb);
  border-left: 2px solid #f59e0b;
}

.meeting-date {
  color: #d97706;
  font-size: 0.75rem;
}

/* Button */
.jumuia-chat-btn-dashboard {
  width: 100%;
  background: linear-gradient(135deg, #061635, #061e2e);
  color: white;
  border: none;
  padding: 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.25rem;
}

.jumuia-chat-btn-dashboard:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}

/* Responsive */
@media (max-width: 640px) {
  .jumuia-quick-info {
    grid-template-columns: 1fr;
  }
  
  .jumuia-dashboard-card {
    padding: 1rem;
  }
  
  .jumuia-name-dashboard {
    font-size: 0.9rem;
  }
  
  .info-value {
    font-size: 0.75rem;
  }
}
/* ============================================
   PREMIUM LITURGICAL READING CARD (DASHBOARD)
   ============================================ */

.reading-premium-card {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-left: 5px solid #123241;
  padding: 0;
  border-radius: 30px;
  overflow: hidden;
  margin-bottom: 30px;
  /* Dashboard card sizing */
  height: 100%;  /* Fills grid/flex parent evenly */
  display: flex;
  flex-direction: column;
}

.reading-premium-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  padding: 0.75rem 1rem;  /* Reduced from 0rem 0.1rem */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  flex-wrap: nowrap;  /* No wrapping on dashboard */
}

.reading-header-icon {
  border-radius: 50%;
  width: 40px;  /* Smaller for dashboard */
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reading-icon {
  font-size: 1.4rem;  /* Smaller */
}

.reading-header-content {
  flex: 1;
  min-width: 0;  /* Allows text truncation */
}

.reading-premium-title {
  font-size: 0.95rem;  /* Smaller for dashboard */
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reading-premium-subtitle {
  font-size: 0.65rem;  /* Smaller */
  color: rgba(255, 255, 255, 0.8);
  margin: 0.1rem 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reading-date-badge {
  background: rgba(255, 255, 255, 0.25);
  padding: 0.2rem 0.6rem;
  border-radius: 30px;
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}

.reading-premium-body {
  padding: 1rem;  /* Reduced */
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reading-celebration {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  padding: 0.35rem 0.8rem;
  border-radius: 40px;
  margin-bottom: 0.75rem;  /* Reduced */
  border: 1px solid #ffffff;
  width: fit-content;
}

.celebration-icon {
  font-size: 0.85rem;
}

.celebration-text {
  font-size: 0.7rem;  /* Smaller */
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
}

.readings-container {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;  /* Reduced */
  margin-bottom: 0.75rem;  /* Reduced */
}

.reading-verse-card {
  background: white;
  border-radius: 12px;  /* Slightly smaller */
  padding: 0.6rem;  /* Reduced */
  transition: all 0.3s ease;
  border: 1px solid #000000;
  position: relative;
  overflow: hidden;
}

.reading-verse-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.reading-verse-card:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
}

.verse-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}

.verse-icon {
  font-size: 1.2rem;
}

.verse-title {
  font-size: 0.6rem;  /* Smaller */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #000000;
}

.verse-citation {
  font-size: 0.7rem;  /* Smaller */
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.15rem;
}

.verse-preview {
  font-size: 0.6rem;  /* Smaller */
  color: #64748b;
  font-style: italic;
  line-height: 1.3;
  margin-top: 0.15rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;  /* Limit to 2 lines */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gospel-card {
  background: linear-gradient(135deg, #ffffff 0%, #ffffff);
  border: 1px solid #000000;
}

.psalm-card {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
}

.psalm-card .verse-title {
  color: #059669;
}

.reading-premium-footer {
  margin-top: auto;  /* Pushes footer to bottom */
}

.reading-full-btn {
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  color: white;
  border: none;
  padding: 0.6rem;  /* Reduced */
  border-radius: 12px;  /* Smaller */
  font-weight: 600;
  font-size: 0.75rem;  /* Smaller */
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.reading-full-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.btn-arrow-icon {
  transition: transform 0.3s ease;
  width: 14px;
  height: 14px;
}

.reading-footer-note {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.55rem;  /* Smaller */
  color: #212930;
  text-align: center;
  flex-wrap: wrap;
}

/* Dashboard Grid Layout (add to parent container) */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

/* Make all cards in dashboard equal height */
.dashboard-grid > * {
  height: 100%;
}

/* Responsive for smaller dashboard widgets */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;  /* Stack on tablet */
  }
}

@media (max-width: 640px) {
  .reading-premium-header {
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }
  
  .reading-header-icon {
    width: 32px;
    height: 32px;
  }
  
  .reading-icon {
    font-size: 1.1rem;
  }
  
  .reading-premium-title {
    font-size: 0.85rem;
  }
  
  .reading-premium-subtitle {
    font-size: 0.55rem;
  }
  
  .reading-premium-body {
    padding: 0.75rem;
  }
  
  .reading-celebration {
    padding: 0.25rem 0.6rem;
    margin-bottom: 0.5rem;
  }
  
  .celebration-text {
    font-size: 0.6rem;
  }
  
  .readings-container {
    gap: 0.5rem;
  }
  
  .reading-verse-card {
    padding: 0.5rem;
  }
  
  .verse-preview {
    font-size: 0.55rem;
    -webkit-line-clamp: 2;
  }
  
  .reading-full-btn {
    padding: 0.5rem;
    font-size: 0.7rem;
  }
}
/* ============================================
   PREMIUM FINANCIAL STATS GRID (DASHBOARD STYLE)
   ============================================ */

.financial-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (max-width: 1024px) {
  .financial-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .financial-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .financial-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

/* Financial Stat Card */
.financial-stat-card {
  background: white;
  border-radius: 20px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.financial-stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.financial-stat-card:hover::before {
  transform: scaleX(1);
}

.financial-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -12px rgba(15, 23, 42, 0.2);
  border-color: #123241;
}

/* Individual card hover effects (keeping unique colors but matching slate theme) */
.financial-stat-card:first-child::before {
  background: linear-gradient(90deg, #0f172a, #1e293b);
}
.financial-stat-card:nth-child(2)::before {
  background: linear-gradient(90deg, #123241, #1a4a5f);
}
.financial-stat-card:nth-child(3)::before {
  background: linear-gradient(90deg, #0f172a, #1e293b);
}
.financial-stat-card:nth-child(4)::before {
  background: linear-gradient(90deg, #123241, #1a4a5f);
}

/* Icons */
.financial-stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.7rem;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.financial-stat-card:hover .financial-stat-icon {
  transform: scale(1.05);
}

.pledged-icon {
  color: #0f172a;
}

.paid-icon {
  color: #123241;
}

.pending-icon {
  color: #0f172a;
}

.campaigns-icon {
  color: #123241;
}

/* Content */
.financial-stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.financial-stat-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.financial-stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #123241;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Trend Indicators */
.financial-stat-trend {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.8;
  transition: opacity 0.3s ease;
  flex-shrink: 0;
}

.financial-stat-card:hover .financial-stat-trend {
  opacity: 1;
}

.positive {
  background: #e2e8f0;
  color: #0f172a;
}

.success {
  background: #e2e8f0;
  color: #123241;
}

.warning {
  background: #e2e8f0;
  color: #0f172a;
}

.info {
  background: #e2e8f0;
  color: #123241;
}
/* ============================================
   PREMIUM ANNOUNCEMENTS SECTION
   ============================================ */

.announcements-premium {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-radius: 40px;
  margin-top: 30px;
  border-left: 4px solid #123241;
}

.header-icon-announcement {
  font-size: 2rem;
  background: linear-gradient(135deg, #0f172a00 0%, #1e293b00);
  padding: 0.6rem;
  border-radius: 16px;
  color: white;
}

/* Empty State */
.empty-state-announcement {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  border-radius: 20px;
  border: 2px dashed #123241;
}

.empty-announcement-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.empty-state-announcement p {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.empty-state-announcement span {
  font-size: 0.75rem;
  color: #123241;
}

/* Announcements List */
.announcements-premium-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.announcements-premium-list::-webkit-scrollbar {
  width: 4px;
}

.announcements-premium-list::-webkit-scrollbar-track {
  background: #cbd5e1;
  border-radius: 10px;
}

.announcements-premium-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 10px;
}

/* Announcement Item */
.announcement-premium-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #cbd5e1;
  position: relative;
  overflow: hidden;
}

.announcement-premium-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.announcement-premium-item:hover {
  transform: translateX(4px);
  border-color: #123241;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  background: #f8fafc;
}

.announcement-premium-item:hover::before {
  transform: scaleY(1);
}

/* Announcement Number */
.announcement-premium-number {
  min-width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #0f172a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  border: 1px solid #cbd5e1;
}

.announcement-premium-item:hover .announcement-premium-number {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
  border-color: transparent;
}

/* Announcement Content */
.announcement-premium-content {
  flex: 1;
}

.announcement-premium-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.announcement-premium-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.announcement-premium-time {
  font-size: 0.65rem;
  color: #123241;
  background: #e2e8f0;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  font-weight: 500;
}

.announcement-premium-message {
  font-size: 0.75rem;
  color: #475569;
  line-height: 1.4;
}

/* Announcement Arrow */
.announcement-premium-arrow {
  color: #123241;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
}

.announcement-premium-item:hover .announcement-premium-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* View All Button */
.view-all-premium {
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.view-all-premium::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.view-all-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
}

.view-all-premium:hover::before {
  left: 100%;
}

.view-all-premium:active {
  transform: translateY(0px);
}

.button-icon {
  transition: transform 0.3s ease;
}

.view-all-premium:hover .button-icon {
  transform: translateX(4px);
}

/* Responsive */
@media (max-width: 640px) {
  .announcement-premium-item {
    padding: 0.75rem;
  }
  
  .announcement-premium-number {
    min-width: 30px;
    height: 30px;
    font-size: 0.75rem;
  }
  
  .announcement-premium-title {
    font-size: 0.85rem;
  }
  
  .announcement-premium-message {
    font-size: 0.7rem;
  }
  
  .header-icon-announcement {
    font-size: 1.5rem;
    padding: 0.4rem;
  }
}

/* Animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}
/* ============================================
   COMPACT PLEDGES SECTION
   ============================================ */

.pledges-compact {
  padding: 1rem !important;
  border-left: 4px solid #123241;
  margin-top: 50px;
  border-radius: 40px;
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
}

.header-icon-small-pledge {
  font-size: 1.2rem;
  background: linear-gradient(135deg, #0f172a00, #1e293b00);
  padding: 0.3rem;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: white;
}

.header-icon-small-pledge span {
  font-size: 0.9rem;
}

.section-header .header-with-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-header .header-with-icon h3 {
  font-size: 0.9rem;
  margin: 0;
  color: #0f172a;
}

.pledge-count-badge {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
}

.pledges-compact-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
  max-height: 280px;
  overflow-y: auto;
}

.pledges-compact-list::-webkit-scrollbar {
  width: 3px;
}

.pledges-compact-list::-webkit-scrollbar-track {
  background: #cbd5e1;
  border-radius: 10px;
}

.pledges-compact-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 10px;
}

.empty-state-compact-pledge {
  text-align: center;
  padding: 1rem;
  background: #e2e8f0;
  border-radius: 12px;
}

.empty-state-compact-pledge span {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.25rem;
}

.empty-state-compact-pledge p {
  font-size: 0.7rem;
  color: #123241;
  margin: 0;
}

.pledge-compact-item {
  background: white;
  border-radius: 12px;
  padding: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #cbd5e1;
}

.pledge-compact-item:hover {
  background: #f8fafc;
  transform: translateX(2px);
  border-color: #123241;
}

.pledge-compact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.pledge-compact-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f172a;
}

.pledge-compact-percent {
  font-size: 0.7rem;
  font-weight: 700;
  color: #123241;
}

.progress-bar-compact {
  background: #e2e8f0;
  border-radius: 20px;
  height: 4px;
  overflow: hidden;
  margin-bottom: 0.4rem;
}

.progress-fill-compact {
  background: linear-gradient(90deg, #0f172a, #1e293b);
  height: 100%;
  border-radius: 20px;
  transition: width 0.3s ease;
}

.pledge-compact-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.6rem;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.pledge-compact-footer span:first-child {
  color: #475569;
  font-weight: 500;
}

.pledge-pending-compact {
  color: #123241;
  font-weight: 600;
}

.view-all-compact-pledge {
  width: 100%;
  background: transparent;
  border: 1px solid #cbd5e1;
  padding: 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-all-compact-pledge:hover {
  background: #e2e8f0;
  border-color: #123241;
  color: #0f172a;
}
/* ============================================
   PREMIUM GALLERY SECTION
   ============================================ */

.gallery-premium {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-radius: 35px;
  border-left: 4px solid #123241;
}

.header-icon-gallery {
  font-size: 2rem;
  background: linear-gradient(135deg, #0f172a00 0%, #1e293b00);
  padding: 0.6rem;
  border-radius: 16px;
  color: white;
}

/* Gallery Grid */
.gallery-premium-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 640px) {
  .gallery-premium-grid {
    gap: 0.75rem;
  }
}

/* Gallery Item */
.gallery-premium-item {
  cursor: pointer;
  border-radius: 16px;
  overflow: hidden;
  background: white;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #cbd5e1;
}

.gallery-premium-item:hover {
  box-shadow: 0 12px 24px -12px rgba(15, 23, 42, 0.25);
  border-color: #123241;
}

/* Gallery Image */
.gallery-premium-image {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

.gallery-premium-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery-premium-item:hover .gallery-premium-image img {
  transform: scale(1.08);
}

/* Overlay */
.gallery-premium-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.gallery-premium-item:hover .gallery-premium-overlay {
  opacity: 1;
}

.overlay-icon {
  font-size: 1.2rem;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.3rem;
  border-radius: 50%;
}

.overlay-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

/* Placeholder */
.gallery-premium-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: #64748b;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

/* Gallery Info */
.gallery-premium-info {
  padding: 0.6rem;
  text-align: center;
}

.gallery-premium-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery-premium-date {
  font-size: 0.6rem;
  color: #123241;
  margin-top: 0.2rem;
}

/* Empty State */
.empty-state-gallery {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  border-radius: 20px;
  border: 2px dashed #123241;
}

.empty-gallery-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.empty-state-gallery p {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.empty-state-gallery span {
  font-size: 0.75rem;
  color: #123241;
}

/* Animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}
/* ============================================
   PREMIUM MASS PROGRAMS SECTION
   ============================================ */

.mass-premium {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee  100%);
  border-radius: 35px;
  border-left: 4px solid #123241;
  margin-bottom: 30px;
}

.header-icon-mass {
  font-size: 2rem;
 
  padding: 0.6rem;
  border-radius: 16px;
 
  color: white;
}

/* Empty State */
.empty-state-mass {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  border-radius: 20px;
  border: 2px dashed #123241;
}

.empty-mass-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.empty-state-mass p {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.empty-state-mass span {
  font-size: 0.75rem;
  color: #123241;
}

/* Mass List */
.mass-premium-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.mass-premium-list::-webkit-scrollbar {
  width: 4px;
}

.mass-premium-list::-webkit-scrollbar-track {
  background: #cbd5e1;
  border-radius: 10px;
}

.mass-premium-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 10px;
}

/* Mass Item */
.mass-premium-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #cbd5e1;
  position: relative;
  overflow: hidden;
}

.mass-premium-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.mass-premium-item:hover {
  transform: translateX(4px);
  border-color: #123241;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  background: #f8fafc;
}

.mass-premium-item:hover::before {
  transform: scaleY(1);
}

/* Date Box */
.mass-premium-date {
  min-width: 60px;
  text-align: center;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  padding: 0.5rem;
  border-radius: 14px;
  color: white;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
}

.mass-date-day {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1;
}

.mass-date-month {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Mass Content */
.mass-premium-content {
  flex: 1;
}

.mass-premium-venue {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.mass-premium-details {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mass-time, .mass-presider {
  font-size: 0.7rem;
  color: #123241;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* Arrow */
.mass-premium-arrow {
  color: #123241;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
}

.mass-premium-item:hover .mass-premium-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* View All Button */
.view-all-premium {
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  position: relative;
  overflow: hidden;
}

.view-all-premium::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.view-all-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
}

.view-all-premium:hover::before {
  left: 100%;
}

/* Responsive */
@media (max-width: 640px) {
  .mass-premium-item {
    padding: 0.6rem;
  }
  
  .mass-premium-date {
    min-width: 50px;
  }
  
  .mass-date-day {
    font-size: 1.2rem;
  }
  
  .mass-premium-venue {
    font-size: 0.8rem;
  }
  
  .mass-time, .mass-presider {
    font-size: 0.65rem;
  }
  
  .header-icon-mass {
    font-size: 1.5rem;
    padding: 0.4rem;
  }
}

/* Animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* ============================================
   ACTIVE MEETINGS CARD
   ============================================ */

.active-meetings-card {
  background: linear-gradient(135deg, #ffffff 0%, #eeeeee 100%);
  border-radius: 30px;
  padding: 1.2rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #dc2626;
}

.header-icon-meeting {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  padding: 0.5rem;
  border-radius: 16px;
  color: white;
  display: inline-block;
}

.meeting-count-badge {
  background: #dc2626;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 700;
}

.active-meetings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.meeting-card-active {
  background: white;
  border-radius: 20px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.meeting-card-active:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: #dc2626;
}

.meeting-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.live-indicator {
  background: #dc2626;
  color: white;
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-weight: 600;
}

.meeting-time-sm {
  font-size: 0.7rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meeting-title-sm {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.meeting-details-sm {
  display: flex;
  gap: 1rem;
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.detail-icon {
  margin-right: 0.2rem;
}

.meeting-stats-sm {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.meeting-wifi-sm {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: #3b82f6;
  margin-bottom: 0.75rem;
}

.checkin-btn-sm {
  width: 100%;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  padding: 0.6rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.checkin-btn-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.checkin-btn-sm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.view-all-meetings {
  width: 100%;
  background: transparent;
  border: 1px solid #dc2626;
  color: #dc2626;
  padding: 0.6rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.view-all-meetings:hover {
  background: #dc2626;
  color: white;
}

@media (max-width: 640px) {
  .active-meetings-card {
    padding: 1rem;
  }
  
  .meeting-title-sm {
    font-size: 0.9rem;
  }
  
  .checkin-btn-sm {
    font-size: 0.7rem;
    padding: 0.5rem;
  }
}
/* ============================================
   GAMES & COMMUNITY - CLEAN LIGHT THEME
   ============================================ */

.games-premium {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 30px;
  border-left: 4px solid #444342;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.games-premium:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

/* Header */
.header-icon-games {
  font-size: 2rem;
  
  padding: 0.6rem;
  border-radius: 16px;
  color: #f59e0b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.games-badge {
  background: #fef3c7;
  color: #000000;
  padding: 0.3rem 0.8rem;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Two Column Layout */
.games-community-premium {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .games-community-premium {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

/* Games Section */
.games-section-premium {
  background: #f8fafc;
  border-radius: 20px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.games-section-premium:hover {
  background: #f1f5f9;
  border-color: #000000;
}

.games-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.games-title-premium {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.games-count {
  background: #ffffff;
  padding: 0.2rem 0.7rem;
  border-radius: 20px;
  font-size: 0.7rem;
  color: #000000;
  font-weight: 600;
}

/* Empty State Games */
.empty-games-state {
  text-align: center;
  padding: 1.5rem 1rem;
  background: #ffffff;
  border-radius: 16px;
  border: 1px dashed #e2e8f0;
}

.empty-games-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-games-state p {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.empty-games-sub {
  font-size: 0.65rem;
  color: #94a3b8;
  display: block;
  margin-top: 0.25rem;
}

/* Game Invites List */
.game-invites-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.game-invites-list::-webkit-scrollbar {
  width: 3px;
}

.game-invites-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.game-invites-list::-webkit-scrollbar-thumb {
  background: #f59e0b;
  border-radius: 10px;
}

/* Individual Game Invite */
.game-invite-premium {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #ffffff;
  border-radius: 14px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e2e8f0;
}

.game-invite-premium:hover {
  background: #fef3c7;
  border-color: #f59e0b;
  transform: translateX(4px);
}

.game-invite-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  overflow: hidden;
  color: #f59e0b;
}

.game-invite-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.game-invite-content {
  flex: 1;
  min-width: 0;
}

.game-invite-sender {
  font-size: 0.8rem;
  color: #64748b;
}

.game-invite-sender strong {
  color: #1e293b;
  font-weight: 700;
}

.game-invite-action {
  color: #94a3b8;
  margin-left: 0.2rem;
}

.game-invite-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.6rem;
  color: #94a3b8;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.game-type {
  background: #fef3c7;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  color: #f59e0b;
  font-weight: 600;
}

.game-time {
  color: #94a3b8;
}

.game-invite-accept {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.game-invite-accept:hover {
  background: #d97706;
  transform: scale(1.05);
}

/* Games Action Button */
.games-action-btn {
  width: 100%;
  background: #fff90;
  color: #1e293b;
  border: none;
  padding: 0.7rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.games-action-btn:hover {
  background: #d97706;
  transform: translateY(-2px);
}

.games-action-btn:active {
  transform: translateY(0);
}

/* ============================================
   ONLINE MEMBERS SECTION
   ============================================ */

.online-section-premium {
  background: #f8fafc;
  border-radius: 20px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.online-section-premium:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
}

.online-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.online-title-premium {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.online-count {
  background: #dbeafe;
  padding: 0.2rem 0.7rem;
  border-radius: 20px;
  font-size: 0.7rem;
  color: #3b82f6;
  font-weight: 600;
}

/* Empty State Online */
.empty-online-state {
  text-align: center;
  padding: 1.5rem 1rem;
  background: #ffffff;
  border-radius: 16px;
  border: 1px dashed #e2e8f0;
}

.empty-online-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-online-state p {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.empty-online-sub {
  font-size: 0.65rem;
  color: #94a3b8;
  display: block;
  margin-top: 0.25rem;
}

/* Online Members Grid */
.online-members-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

@media (max-width: 480px) {
  .online-members-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
}

/* Individual Online Member */
.online-member-premium {
  text-align: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.online-member-premium:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
  transform: translateY(-3px);
}

.online-member-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  margin: 0 auto 0.3rem;
  position: relative;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
}

.online-member-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.online-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #22c55e;
  border-radius: 50%;
  border: 2px solid #ffffff;
}

.online-member-name {
  font-size: 0.6rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.online-more-indicator {
  text-align: center;
  font-size: 0.65rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
  padding: 0.3rem;
  background: #f1f5f9;
  border-radius: 10px;
}

/* Online Action Button */
.online-action-btn {
  width: 100%;
  background: #000000;
  color: white;
  border: none;
  padding: 0.7rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.online-action-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.online-action-btn:active {
  transform: translateY(0);
}

/* Button Icon Animation */
.button-icon {
  transition: transform 0.3s ease;
}

.games-action-btn:hover .button-icon,
.online-action-btn:hover .button-icon {
  transform: translateX(4px);
}

/* Section Header overrides */
.games-premium .section-header {
  border-bottom-color: #f1f5f9;
}

.games-premium .section-header h3 {
  color: #1e293b;
  background: none;
  -webkit-text-fill-color: #1e293b;
}

.games-premium .header-subtitle {
  color: #94a3b8;
}

/* Responsive fine-tuning */
@media (max-width: 640px) {
  .games-premium {
    padding: 1rem;
  }
  
  .games-section-premium,
  .online-section-premium {
    padding: 1rem;
  }
  
  .game-invite-premium {
    padding: 0.6rem;
    flex-wrap: wrap;
  }
  
  .game-invite-accept {
    width: 100%;
    text-align: center;
    padding: 0.4rem;
    font-size: 0.7rem;
  }
  
  .online-members-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .online-member-avatar {
    width: 38px;
    height: 38px;
    font-size: 0.8rem;
  }
  
  .online-status-dot {
    width: 10px;
    height: 10px;
  }
  
  .header-icon-games {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
}

/* Scrollbar styling for Firefox */
.game-invites-list {
  scrollbar-width: thin;
  scrollbar-color: #f59e0b #f1f5f9;
}

/* ============================================
   QUICK STATS - CLEAN NEUTRAL THEME
   ============================================ */

.stats-premium {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 30px;
  border-left: 4px solid #64748b;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stats-premium:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.header-icon-stats {
  font-size: 2rem;
  background: #f1f5f9;
  padding: 0.6rem;
  border-radius: 16px;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.stats-live-badge {
  background: #dcfce7;
  color: #22c55e;
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Quick Stats Grid */
.quick-stats-premium-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;
}

@media (max-width: 1024px) {
  .quick-stats-premium-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .quick-stats-premium-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .quick-stats-premium-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

/* Individual Stat Card */
.quick-stat-premium {
  background: #f8fafc;
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  cursor: default;
}

.quick-stat-premium:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-2px);
}

.stat-premium-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.users-icon {
  background: #e2e8f0;
  color: #475569;
}

.messages-icon {
  background: #e2e8f0;
  color: #475569;
}

.hymns-icon {
  background: #e2e8f0;
  color: #475569;
}

.media-icon {
  background: #e2e8f0;
  color: #475569;
}

.gallery-icon {
  background: #e2e8f0;
  color: #475569;
}

.stat-premium-content {
  flex: 1;
  min-width: 0;
}

.stat-premium-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.3px;
}

.stat-premium-label {
  font-size: 0.6rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.stat-premium-trend {
  font-size: 0.7rem;
  color: #22c55e;
  font-weight: 700;
  background: #dcfce7;
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
}
  /* ============================================
   RECENT CHAT ACTIVITY - CLEAN NEUTRAL THEME
   ============================================ */

.chat-premium {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 30px;
  border-left: 4px solid #64748b;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.chat-premium:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.header-icon-chat {
  font-size: 2rem;
  background: #f1f5f9;
  padding: 0.6rem;
  border-radius: 16px;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.chat-badge {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Chat Activities */
.chat-activities-premium {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.chat-activities-premium::-webkit-scrollbar {
  width: 4px;
}

.chat-activities-premium::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.chat-activities-premium::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 10px;
}

/* Empty State */
.empty-chat-state {
  text-align: center;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px dashed #e2e8f0;
}

.empty-chat-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-chat-state p {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.empty-chat-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Chat Item */
.chat-item-premium {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chat-item-premium:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  background: #f8fafc;
}

.chat-avatar-premium {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #475569;
  flex-shrink: 0;
  overflow: hidden;
}

.chat-avatar-premium img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.chat-content-premium {
  flex: 1;
  min-width: 0;
}

.chat-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.chat-user-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
}

.chat-time-premium {
  font-size: 0.6rem;
  color: #94a3b8;
}

.chat-message-premium {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-reply-indicator {
  color: #94a3b8;
  opacity: 0;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.chat-item-premium:hover .chat-reply-indicator {
  opacity: 1;
}

/* Chat Action Button */
.chat-action-btn {
  width: 100%;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.chat-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(30, 41, 59, 0.3);
}

.chat-action-btn:active {
  transform: translateY(0);
}

.chat-action-btn .button-icon {
  transition: transform 0.3s ease;
}

.chat-action-btn:hover .button-icon {
  transform: translateX(4px);
}

/* Responsive */
@media (max-width: 640px) {
  .chat-premium {
    padding: 1rem;
  }
  
  .chat-item-premium {
    padding: 0.6rem;
  }
  
  .chat-avatar-premium {
    width: 34px;
    height: 34px;
    font-size: 0.8rem;
  }
  
  .chat-user-name {
    font-size: 0.75rem;
  }
  
  .chat-message-premium {
    font-size: 0.7rem;
  }
  
  .header-icon-chat {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
}

/* ============================================
   RECENT NOTIFICATIONS - CLEAN NEUTRAL THEME
   ============================================ */

.notifications-premium {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 30px;
  border-left: 4px solid #64748b;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.notifications-premium:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.header-icon-notification {
  font-size: 2rem;
  background: #f1f5f9;
  padding: 0.6rem;
  border-radius: 16px;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.notif-badge {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Notifications List */
.notifications-premium-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.notifications-premium-list::-webkit-scrollbar {
  width: 4px;
}

.notifications-premium-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.notifications-premium-list::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 10px;
}

/* Empty State */
.empty-notif-state {
  text-align: center;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px dashed #e2e8f0;
}

.empty-notif-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-notif-state p {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.empty-notif-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Notification Item */
.notif-item-premium {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.notif-item-premium:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  background: #f8fafc;
}

.notif-unread {
  background: #f8fafc;
  border-left: 3px solid #3b82f6;
}

.notif-unread:hover {
  background: #f1f5f9;
}

.notif-icon-premium {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-content-premium {
  flex: 1;
  min-width: 0;
}

.notif-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.notif-title-premium {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
}

.notif-unread-dot {
  color: #3b82f6;
  font-size: 0.6rem;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.notif-message-premium {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-time-premium {
  font-size: 0.6rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.notif-arrow-premium {
  color: #94a3b8;
  opacity: 0;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.notif-item-premium:hover .notif-arrow-premium {
  opacity: 1;
}

/* Notification Action Button */
.notif-action-btn {
  width: 100%;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.notif-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(30, 41, 59, 0.3);
}

.notif-action-btn:active {
  transform: translateY(0);
}

.notif-action-btn .button-icon {
  transition: transform 0.3s ease;
}

.notif-action-btn:hover .button-icon {
  transform: translateX(4px);
}

/* Responsive */
@media (max-width: 640px) {
  .notifications-premium {
    padding: 1rem;
  }
  
  .notif-item-premium {
    padding: 0.6rem;
  }
  
  .notif-icon-premium {
    width: 34px;
    height: 34px;
    font-size: 1.2rem;
  }
  
  .notif-title-premium {
    font-size: 0.75rem;
  }
  
  .notif-message-premium {
    font-size: 0.7rem;
  }
  
  .header-icon-notification {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
}

/* ============================================
   FOOTER - PREMIUM DESIGN
   ============================================ */

.footer-premium {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 24px;
  padding: 0rem 0.5rem 0.5rem;
  margin-top: 2rem;
    margin-bottom: 5rem;

  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 1.5rem;
}

/* Brand Section */
.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer-logo-img {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  padding: 6px;
  object-fit: contain;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-logo-img:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.footer-brand-text h4 {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: -0.3px;
}

.footer-brand-text p {
  font-size: 0.7rem;
  color: #94a3b8;
  margin: 0;
}

/* Links Section */
.footer-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.footer-links a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
}

.footer-links a::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #60a5fa, #c084fc);
  transition: width 0.3s ease;
}

.footer-links a:hover {
  color: white;
}

.footer-links a:hover::after {
  width: 100%;
}

/* Social Section */
.footer-social {
  display: flex;
  gap: 0.75rem;
}

.social-link {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.social-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.15);
}

/* Footer Bottom */
.footer-bottom {
  text-align: center;
}

.footer-bottom p {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
  letter-spacing: 0.3px;
}

.footer-bottom .creator {
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.footer-bottom .creator strong {
  color: #94a3b8;
  font-weight: 600;
  background: linear-gradient(90deg, #60a5fa, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Responsive */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .footer-brand {
    flex-direction: column;
    text-align: center;
  }
  
  .footer-links {
    justify-content: center;
    gap: 1rem;
  }
  
  .footer-social {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .footer-premium {
    padding: 1.5rem 1rem 1rem;
    border-radius: 16px;
  }
  
  .footer-logo-img {
    width: 40px;
    height: 40px;
    padding: 4px;
  }
  
  .footer-links {
    gap: 0.75rem;
  }
  
  .footer-links a {
    font-size: 0.7rem;
  }
  
  .social-link {
    width: 34px;
    height: 34px;
    font-size: 0.9rem;
  }
  
  .footer-bottom p {
    font-size: 0.65rem;
  }
}

.countdown-container {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: slideDown 0.6s ease-out;
}

@keyframes slideDown {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.countdown-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(96, 165, 250, 0.08) 0%, transparent 70%);
  animation: rotate-bg 20s linear infinite;
}

@keyframes rotate-bg {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.countdown-container::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #60a5fa, #c084fc, #60a5fa);
  background-size: 300% 300%;
  border-radius: 24px;
  z-index: -1;
  animation: borderGlow 3s ease-in-out infinite;
  opacity: 0.3;
}

@keyframes borderGlow {
  0% {
    background-position: 0% 50%;
    opacity: 0.3;
  }
  50% {
    background-position: 100% 50%;
    opacity: 0.6;
  }
  100% {
    background-position: 0% 50%;
    opacity: 0.3;
  }
}

.countdown-content {
  position: relative;
  z-index: 1;
}

.countdown-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.countdown-icon {
  font-size: 1.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.countdown-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
}

.countdown-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.countdown-item {
  text-align: center;
  min-width: 60px;
  animation: fadeInScale 0.6s ease-out forwards;
  opacity: 0;
}

.countdown-item:nth-child(1) { animation-delay: 0.1s; }
.countdown-item:nth-child(2) { animation-delay: 0.2s; }
.countdown-item:nth-child(3) { animation-delay: 0.3s; }
.countdown-item:nth-child(4) { animation-delay: 0.4s; }
.countdown-item:nth-child(5) { animation-delay: 0.5s; }
.countdown-item:nth-child(6) { animation-delay: 0.6s; }
.countdown-item:nth-child(7) { animation-delay: 0.7s; }

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.countdown-number {
  font-size: 3rem;
  font-weight: 800;
  color: white;
  line-height: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem;
  border-radius: 12px;
  min-width: 60px;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #60a5fa, #c084fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  transition: transform 0.3s ease;
  animation: numberPulse 1s ease-in-out;
}

@keyframes numberPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.countdown-number:hover {
  transform: scale(1.1);
}

.countdown-label {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 0.25rem;
  transition: color 0.3s ease;
}

.countdown-item:hover .countdown-label {
  color: #60a5fa;
}

.countdown-separator {
  font-size: 2rem;
  font-weight: 700;
  color: #475569;
  padding-bottom: 1.5rem;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

.countdown-event-info {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  animation: fadeInUp 0.8s ease-out 0.5s both;
}

.countdown-event-info span {
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
}

.countdown-event-info span:hover {
  color: #60a5fa;
  transform: translateY(-2px);
}

.countdown-event-info span::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #60a5fa, #c084fc);
  transition: width 0.3s ease;
}

.countdown-event-info span:hover::after {
  width: 100%;
}

@media (max-width: 640px) {
  .countdown-container {
    padding: 1.5rem 1rem;
  }

  .countdown-number {
    font-size: 2rem;
    min-width: 40px;
  }

  .countdown-item {
    min-width: 40px;
  }

  .countdown-grid {
    gap: 0.25rem;
  }

  .countdown-separator {
    font-size: 1.5rem;
    padding-bottom: 1.2rem;
  }

  .countdown-title {
    font-size: 1rem;
  }

  .countdown-event-info {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .countdown-event-info span {
    font-size: 0.75rem;
  }

  .countdown-item {
    animation-duration: 0.4s;
  }

  .countdown-number {
    animation: numberPulseMobile 1s ease-in-out;
  }

  @keyframes numberPulseMobile {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
}

@keyframes waveAnimation {
  0% { transform: rotate( 0.0deg) }
  10% { transform: rotate(14.0deg) }  /* Wave right */
  20% { transform: rotate(-8.0deg) }  /* Wave left */
  30% { transform: rotate(14.0deg) }  /* Wave right */
  40% { transform: rotate(-4.0deg) }  /* Wave left */
  50% { transform: rotate(10.0deg) }  /* Wave right */
  60% { transform: rotate( 0.0deg) }  /* Return to center */
  100% { transform: rotate( 0.0deg) } /* Pause before waving again */
}

.wave {
  animation-name: waveAnimation;
  animation-duration: 1.5s;           /* Total time for one full loop */
  animation-iteration-count: infinite;/* Loop forever */
  transform-origin: 70% 70%;         /* Pivots from the bottom wrist area */
  display: inline-block;             /* Required for transformation to work */
}


    `}</style>
    </div>
  </div>
  </>
  );
}
export default Dashboard;