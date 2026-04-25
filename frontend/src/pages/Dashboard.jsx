import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import ProfileImageCropper from '../components/ProfileImageCropper';
import ProfileSettings from '../components/ProfileSettings';
import { 
  FiMessageSquare, FiLogOut, FiCamera, FiTrash2, FiArrowRight, 
  FiBell, FiCalendar, FiUsers, FiMusic, FiImage, FiDollarSign, 
  FiGrid, FiSettings, FiSend, FiMail, FiPhone, FiUser, FiHome,
  FiChevronRight, FiChevronLeft, FiPhoneCall, FiMessageCircle
} from "react-icons/fi";

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

  // Fetch featured gallery
  const fetchFeaturedGallery = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/media/featured?limit=3`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeaturedGallery(res.data || []);
      setGalleryItems((res.data || []).length);
    } catch (error) {
      console.error("Error fetching gallery:", error);
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
        setExecutiveTeam(res.data.executives.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching executive team:", error);
    }
  };

  // Fetch upcoming schedules
  const fetchUpcomingSchedules = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/schedules?upcoming=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const schedules = res.data || [];
      const events = schedules.flatMap(s => s.events || []);
      const upcoming = events
        .filter(e => new Date(e.eventDate) > new Date())
        .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
        .slice(0, 3);
      setUpcomingSchedules(upcoming);
    } catch (error) {
      console.error("Error fetching schedules:", error);
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
                <FiMessageSquare size={18} /> Ask AI
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                <FiLogOut size={16} /> Exit
              </button>
            </div>
          </div>

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
                  <span className="member-badge">{user.membership_number || "Z#TEMP"}</span>
                </div>
                <p className="email">📩--{user.email}</p>
                <p className="phone">📞 {user.phone || "Not set"}</p>
                <div className="badges">
                  <span className="role-badge">👔 {user.role?.toUpperCase() || "MEMBER"}</span>
                  {user.homeJumuia && <span className="jumuia-badge">👥 {user.homeJumuia.name}</span>}
                </div>
              </div>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                  <span className="stat-value">{getMemberSinceMonths()}</span>
                  <span className="stat-label">Joined</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <span className="stat-value">KES {getTotalPaidFromPledges().toLocaleString()}</span>
                  <span className="stat-label">Total Paid</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-icon">📱</div>
                <div className="stat-info">
                  <a href={getWhatsAppLink()} className="whatsapp-link" target="_blank" rel="noopener noreferrer">
                  Message You🫵
                  </a>
                  <span className="stat-label">WhatsApp</span>
                </div>
              </div>
            </div>
          </div>

          {/* FINANCIAL STATS ROW */}
          <div className="stats-row">
            <div className="stat-card" onClick={() => navigate("/contributions")}>
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <span className="stat-value">KES {totalPledged.toLocaleString()}</span>
                <span className="stat-label">Total Pledged</span>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/contributions")}>
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <span className="stat-value">KES {totalPaid.toLocaleString()}</span>
                <span className="stat-label">Total Paid</span>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/contributions")}>
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <span className="stat-value">KES {totalPending.toLocaleString()}</span>
                <span className="stat-label">Total Pending</span>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/contributions")}>
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <span className="stat-value">{activeCampaigns}</span>
                <span className="stat-label">Active Campaigns</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN LAYOUT */}
          <div className="two-columns">
            {/* LEFT COLUMN */}
            <div className="left-column">
              {/* RECENT ANNOUNCEMENTS */}
              <div className="section-card">
                <div className="section-header">
                  <h3>📢 RECENT ANNOUNCEMENTS</h3>
                </div>
                <div className="announcements-list">
                  {announcements.length === 0 ? (
                    <div className="empty-state">No announcements yet</div>
                  ) : (
                    announcements.map(ann => (
                      <div key={ann.id} className="announcement-item" onClick={() => navigate("/announcements")}>
                        <div className="announcement-icon">📢</div>
                        <div className="announcement-content">
                          <div className="announcement-title">{ann.title}</div>
                          <div className="announcement-message">{ann.content?.substring(0, 60)}...</div>
                          <div className="announcement-time">{formatRelativeTime(ann.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button className="view-all" onClick={() => navigate("/announcements")}>View All →</button>
              </div>

              {/* MY ACTIVE PLEDGES */}
              <div className="section-card">
                <div className="section-header">
                  <h3>💳 MY ACTIVE PLEDGES</h3>
                </div>
                <div className="pledges-list">
                  {activePledges.length === 0 ? (
                    <div className="empty-state">No active pledges</div>
                  ) : (
                    activePledges.map(pledge => {
                      const progress = pledge.amountRequired > 0 ? (pledge.amountPaid / pledge.amountRequired) * 100 : 0;
                      return (
                        <div key={pledge.id} className="pledge-item" onClick={() => navigate("/contributions")}>
                          <div className="pledge-title">{pledge.title}</div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                          <div className="pledge-stats">
                            <span>{progress.toFixed(0)}%</span>
                            <span>KES {pledge.amountPaid.toLocaleString()}/{pledge.amountRequired.toLocaleString()}</span>
                          </div>
                          <div className="pledge-pending">Pending: KES {(pledge.pendingAmount || 0).toLocaleString()}</div>
                        </div>
                      );
                    })
                  )}
                </div>
                <button className="view-all" onClick={() => navigate("/contributions")}>Make a Pledge →</button>
              </div>

              {/* RECENT HYMNS */}
              <div className="section-card">
                <div className="section-header">
                  <h3>🎵 RECENT HYMNS</h3>
                </div>
                <div className="hymns-list">
                  {recentHymns.length === 0 ? (
                    <div className="empty-state">No hymns available</div>
                  ) : (
                    recentHymns.map(hymn => (
                      <div key={hymn.id} className="hymn-item" onClick={() => navigate(`/hymn/${hymn.id}`)}>
                        <span className="hymn-bullet">•</span>
                        <span className="hymn-title">{hymn.title}</span>
                      </div>
                    ))
                  )}
                </div>
                <button className="view-all" onClick={() => navigate("/hymns")}>Open Hymn Book →</button>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="right-column">
              {/* UPCOMING MASS PROGRAMS */}
              <div className="section-card">
                <div className="section-header">
                  <h3>⛪ UPCOMING MASS PROGRAMS</h3>
                </div>
                <div className="programs-list">
                  {massPrograms.length === 0 ? (
                    <div className="empty-state">No upcoming mass programs</div>
                  ) : (
                    massPrograms.map(prog => (
                      <div key={prog.id} className="program-item" onClick={() => navigate("/mass-programs")}>
                        <div className="program-date">📅 {formatMassDate(prog.date)}</div>
                        <div className="program-venue">📍 {prog.venue}</div>
                        <div className="program-time">🕐 {prog.time || "10:00 AM"}</div>
                      </div>
                    ))
                  )}
                </div>
                <button className="view-all" onClick={() => navigate("/mass-programs")}>View Full Calendar →</button>
              </div>

              {/* MY JUMUIA */}
              {jumuiaInfo && (
                <div className="section-card">
                  <div className="section-header">
                    <h3>🏠 MY JUMUIA</h3>
                  </div>
                  <div className="jumuia-content">
                    <div className="jumuia-name">👥 {jumuiaInfo.name}</div>
                    <div className="jumuia-detail">Leader: {jumuiaInfo.leaderName}</div>
                    <div className="jumuia-detail">Members: {jumuiaInfo.memberCount}</div>
                    {jumuiaInfo.nextMeeting && <div className="jumuia-detail">Next Meeting: {jumuiaInfo.nextMeeting}</div>}
                    <button className="jumuia-chat-btn" onClick={() => navigate(`/jumuia/${jumuiaInfo.id}/chat`)}>
                      💬 Join Chat →
                    </button>
                  </div>
                </div>
              )}

              {/* FEATURED GALLERY */}
              <div className="section-card">
                <div className="section-header">
                  <h3>📸 FEATURED GALLERY</h3>
                </div>
                <div className="gallery-grid">
                  {featuredGallery.length === 0 ? (
                    <div className="empty-state">No gallery items</div>
                  ) : (
                    featuredGallery.map((item, idx) => (
                      <div key={item.id} className="gallery-item" onClick={() => navigate("/gallery")}>
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} />
                        ) : (
                          <div className="gallery-placeholder">📷</div>
                        )}
                        <div className="gallery-label">
                          {idx === 0 ? "Choir Day" : idx === 1 ? "Mass 2025" : "Outing"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button className="view-all" onClick={() => navigate("/gallery")}>View Full Gallery →</button>
              </div>
            </div>
          </div>

          {/* GAMES & COMMUNITY */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>🎮 GAMES & COMMUNITY</h3>
            </div>
            <div className="games-community">
              <div className="games-section">
                <div className="games-title">🎮 Active Game Invites: {gameInvites.length}</div>
                {gameInvites.slice(0, 1).map(invite => (
                  <div key={invite.id} className="game-invite">
                    • {invite.fromUser?.fullName} challenged you!
                  </div>
                ))}
                <button className="games-btn" onClick={() => navigate("/games")}>Play Now →</button>
              </div>
              <div className="online-section">
                <div className="online-title">👥 Online Members: {onlineMembers.length}</div>
                <div className="online-list">
                  {onlineMembers.slice(0, 3).map(member => (
                    <span key={member.id} className="online-name">• {member.fullName.split(" ")[0]}</span>
                  ))}
                  {onlineMembers.length > 3 && <span className="online-more">...</span>}
                </div>
                <button className="online-btn" onClick={() => navigate("/chat")}>View All →</button>
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>📊 QUICK STATS</h3>
            </div>
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <div className="quick-stat-value">{totalUsers}</div>
                <div className="quick-stat-label">Total Users</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">{totalMessages}</div>
                <div className="quick-stat-label">Total Messages</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">{totalHymns}</div>
                <div className="quick-stat-label">Total Hymns</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">{totalMedia}</div>
                <div className="quick-stat-label">Total Media</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">{galleryItems}</div>
                <div className="quick-stat-label">Gallery Items</div>
              </div>
            </div>
          </div>

          {/* TODAY'S LITURGICAL READING */}
          {todaysReading && (
            <div className="section-card full-width reading-card">
              <div className="section-header">
                <h3>🙏 TODAY'S LITURGICAL READING</h3>
              </div>
              <div className="reading-content">
                <div className="reading-title">📖 {todaysReading.celebration || "Daily Reading"}</div>
                {todaysReading.readings?.firstReading && (
                  <div className="reading-item">First Reading: {todaysReading.readings.firstReading.citation}</div>
                )}
                {todaysReading.readings?.gospel && (
                  <div className="reading-item">Gospel: {todaysReading.readings.gospel.citation}</div>
                )}
                <button className="reading-btn" onClick={() => navigate(`/liturgical-calendar`)}>
                  Read Full Readings →
                </button>
              </div>
            </div>
          )}

          {/* EXECUTIVE TEAM QUICK ACCESS */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>👔 EXECUTIVE TEAM QUICK ACCESS</h3>
            </div>
            <div className="executive-grid">
              {executiveTeam.map(exec => (
                <div key={exec.id} className="executive-item" onClick={() => navigate("/executive")}>
                  <div className="executive-icon">
                    {exec.position?.title === "Chairperson" && "👑"}
                    {exec.position?.title === "Secretary" && "📝"}
                    {exec.position?.title === "Treasurer" && "💰"}
                    {exec.position?.title === "Choir Moderator" && "🎵"}
                    {exec.position?.title === "Media Moderator" && "📸"}
                    {!exec.position?.title && "👤"}
                  </div>
                  <div className="executive-name">{exec.position?.title || exec.name}</div>
                </div>
              ))}
              {executiveTeam.length === 0 && <div className="empty-state">No executive team assigned</div>}
            </div>
            <button className="view-all" onClick={() => navigate("/executive")}>View Full Executive Team →</button>
          </div>

          {/* UPCOMING SCHEDULED EVENTS */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>📅 UPCOMING ZUCA SCHEDULED EVENTS</h3>
            </div>
            <div className="events-list">
              {upcomingSchedules.length === 0 ? (
                <div className="empty-state">No upcoming events</div>
              ) : (
                upcomingSchedules.map(event => (
                  <div key={event.id} className="event-item">
                    • {event.title} - {formatMassDate(event.eventDate)}, {event.eventTime || "TBA"}
                  </div>
                ))
              )}
            </div>
            <button className="view-all" onClick={() => navigate("/schedules")}>View All Schedules →</button>
          </div>

          {/* RECENT CHAT ACTIVITY */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>💬 RECENT CHAT ACTIVITY</h3>
            </div>
            <div className="chat-activities">
              {recentChats.length === 0 ? (
                <div className="empty-state">No recent chat activity</div>
              ) : (
                recentChats.map(chat => (
                  <div key={chat.id} className="chat-item">
                    <strong>{chat.user?.fullName?.split(" ")[0]}:</strong> "{chat.content?.substring(0, 50)}"
                    <span className="chat-time">{formatRelativeTime(chat.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
            <button className="view-all" onClick={() => navigate("/chat")}>Go to Chat →</button>
          </div>

          {/* RECENT NOTIFICATIONS */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>🔔 RECENT NOTIFICATIONS ({unreadNotificationsCount} unread)</h3>
            </div>
            <div className="notifications-list">
              {recentNotifications.length === 0 ? (
                <div className="empty-state">No notifications</div>
              ) : (
                recentNotifications.map(notif => (
                  <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                    <div className="notification-icon">
                      {notif.type === "announcement" && "📢"}
                      {notif.type === "game_invite" && "🎮"}
                      {notif.type === "program" && "⛪"}
                      {!notif.type && "🔔"}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-time">{formatRelativeTime(notif.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="view-all" onClick={() => navigate("/notifications")}>View All Notifications →</button>
          </div>

          {/* FOOTER */}
          <div className="footer">
            <p>© {new Date().getFullYear()} ZUCA Portal | v3.0 | Tumsifu Yesu Kristu! 🙏</p>
            <p className="creator">Created by @CHRISWEBSYS</p>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showCropper && (
        <ProfileImageCropper
          imageFile={selectedImageFile}
          onCropComplete={(croppedFile) => {
            setShowCropper(false);
            // Handle upload
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
          background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
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
          background: white;
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
          border: 3px solid #ff0062;
          cursor: pointer;
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
          border-top: 1px solid #e2e8f0;
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
          background: #e2e8f0;
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

        /* SECTION CARDS */
        .section-card {
          background: white;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .full-width {
          width: 100%;
        }

        .section-header {
          margin-bottom: 12px;
          border-left: 3px solid #3b82f6;
          padding-left: 10px;
        }

        .section-header h3 {
          font-size: 15px;
          color: #1e293b;
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

        /* GALLERY */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .gallery-item {
          aspect-ratio: 1;
          background: #f1f5f9;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
        }

        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gallery-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: #94a3b8;
        }

        .gallery-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.6);
          color: white;
          font-size: 9px;
          padding: 3px;
          text-align: center;
        }

        /* JUMUIA */
        .jumuia-content {
          text-align: center;
          padding: 12px;
          background: linear-gradient(135deg, #667eea, #764ba2);
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
          margin-top: 12px;
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
      `}</style>
    </>
  );
}

export default Dashboard;