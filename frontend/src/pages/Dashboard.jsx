import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import ProfileImageCropper from '../components/ProfileImageCropper';
import ProfileSettings from '../components/ProfileSettings';
import { FiMessageSquare, FiLogOut, FiCamera, FiTrash2, FiArrowRight, FiBell, FiCalendar, FiUsers, FiMusic, FiImage, FiDollarSign, FiGrid, FiSettings } from "react-icons/fi";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Mark messages as read function
  const markMessagesAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${BASE_URL}/api/chat/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadMessages(0);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem("token");
      const [announcementsRes, programsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/announcements`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/mass-programs`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      
      const activities = [];
      
      const recentAnnouncements = (announcementsRes.data || []).slice(0, 3);
      recentAnnouncements.forEach(ann => {
        activities.push({
          id: `ann-${ann.id}`,
          type: "announcement",
          title: ann.title,
          message: ann.content?.substring(0, 60) + (ann.content?.length > 60 ? "..." : ""),
          time: new Date(ann.createdAt),
          icon: "📢",
          color: "#3b82f6",
          link: "/announcements"
        });
      });
      
      const recentPrograms = (programsRes.data || []).slice(0, 3);
      recentPrograms.forEach(prog => {
        activities.push({
          id: `prog-${prog.id}`,
          type: "program",
          title: `Mass at ${prog.venue}`,
          message: `Scheduled for ${new Date(prog.date).toLocaleDateString()}`,
          time: new Date(prog.date),
          icon: "⛪",
          color: "#8b5cf6",
          link: "/mass-programs"
        });
      });
      
      activities.sort((a, b) => b.time - a.time);
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user"));
      
      if (!token || !storedUser) {
        setLoading(false);
        return;
      }

      setUser(storedUser);
      
      const cachedImageUrl = storedUser.profileImage?.startsWith("http")
        ? storedUser.profileImage
        : storedUser.profileImage ? `${BASE_URL}/${storedUser.profileImage}` : null;
      setProfileImage(cachedImageUrl);

      try {
        const [userRes, announcementsRes, messagesRes, eventsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${BASE_URL}/api/announcements/unread`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { count: 0 } })),
          axios.get(`${BASE_URL}/api/chat/unread`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { count: 0 } })),
          axios.get(`${BASE_URL}/api/events/upcoming`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { count: 0 } }))
        ]);

        const userData = userRes.data;
        setUser(userData);
        
        const imageUrl = userData.profileImage?.startsWith("http")
          ? userData.profileImage
          : userData.profileImage ? `${BASE_URL}/${userData.profileImage}` : null;
        setProfileImage(imageUrl);
        
        localStorage.setItem("user", JSON.stringify(userData));
        
        setUnreadAnnouncements(announcementsRes.data.count || 0);
        setUnreadMessages(messagesRes.data.count || 0);
        setUpcomingEvents(eventsRes.data.count || 0);
        
        await fetchRecentActivities();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 16) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
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

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading && !user) {
    return (
      <div style={loadingContainerStyle}>
        <div style={loadingCardStyle}>
          <div style={loadingSpinnerStyle}></div>
          <p style={loadingTextStyle}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorCardStyle}>
          <span style={errorIconStyle}>🔐</span>
          <h2 style={errorTitleStyle}>Session Expired</h2>
          <p style={errorTextStyle}>Please log in to continue</p>
          <button onClick={() => navigate("/login")} style={errorButtonStyle}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const quickActions = [
    { title: "Announcements", description: "View latest updates", path: "/announcements", icon: "📢", badge: unreadAnnouncements > 0 ? `${unreadAnnouncements} new` : null, color: "#3b82f6" },
    { title: "Mass Programs", description: upcomingEvents > 0 ? `${upcomingEvents} upcoming` : "Schedule & events", path: "/mass-programs", icon: "⛪", badge: null, color: "#8b5cf6" },
    { title: "Contributions", description: "Track your pledges", path: "/contributions", icon: "💰", badge: null, color: "#10b981" },
    { title: "Community Chat", description: "Connect with members", path: "/chat", icon: "💬", badge: unreadMessages > 0 ? `${unreadMessages} unread` : null, color: "#06b6d4", onClick: markMessagesAsRead },
    { title: "Jumuia Groups", description: user.homeJumuia?.name || "Join a group", path: "/join-jumuia", icon: "👥", badge: user.homeJumuia ? "Active" : "Join", color: "#f59e0b" },
    { title: "Gallery", description: "View memories", path: "/gallery", icon: "🖼️", badge: null, color: "#ec4899" },
    { title: "Hymn Book", description: "Browse songs & lyrics", path: "/hymns", icon: "🎵", badge: null, color: "#14b8a6" },
    { title: "Liturgical Calendar", description: "Daily readings", path: "/liturgical-calendar", icon: "📅", badge: null, color: "#ef4444" },
    { title: "Profile Settings", description: "Manage your account", path: "#", icon: "⚙️", badge: null, color: "#6366f1", onClick: () => setShowProfileSettings(true) },
  ];

  const handleQuickAction = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (action.path !== "#") {
      navigate(action.path);
    }
  };

  return (
    <div style={dashboardContainerStyle}>
      <div style={dashboardContentStyle}>
        {/* Header */}
        <div className="gradient-header">
          <div style={headerLeftStyle}>
            <h1 style={greetingStyle}>
              {greeting}, <span style={userNameStyle}>{user.fullName?.split(" ")[0]}</span>
              <span style={waveStyle}>👋</span>
            </h1>
            <p style={dateStyle}>{formatDate(currentTime)}</p>
          </div>
          
          <div style={headerRightStyle}>
            <button onClick={() => { window.dispatchEvent(new CustomEvent('openZUCAI', { detail: { fullPage: true } })); }} style={aiButtonStyle}>
              <FiMessageSquare size={18} /> ZUCA {user.fullName?.split(" ")[0]} AI
            </button>
            <button onClick={handleLogout} style={logoutButtonStyle}>
              <FiLogOut size={16} /> Exit
            </button>
          </div>
        </div>

        {/* Profile Card - ENLARGED & CLICKABLE */}
        <div className="profile-card">
          <div style={profileContentStyle}>
            <div style={avatarSectionStyle}>
              <div 
                style={avatarWrapperStyle} 
                onClick={() => setShowProfileSettings(true)}
                title="Click to edit profile"
              >
                {profileImage ? (
                  <img src={profileImage} alt={user.fullName} style={avatarStyle} />
                ) : (
                  <div style={avatarPlaceholderStyle}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={avatarEditOverlay}>
                  <FiCamera size={20} />
                </div>
              </div>
              <div style={avatarActionsStyle}>
                <label style={uploadButtonStyle}>
                  <FiCamera size={14} /> Change
                  <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                </label>
                {profileImage && (
                  <button onClick={handleRemovePhoto} style={removeButtonStyle}>
                    <FiTrash2 size={14} /> Remove
                  </button>
                )}
                <button onClick={() => setShowProfileSettings(true)} style={settingsButtonStyle}>
                  <FiSettings size={14} /> All Settings
                </button>
              </div>
            </div>

            <div style={infoSectionStyle}>
              <div style={infoHeaderStyle}>
                <h2 style={fullNameStyle}>{user.fullName}</h2>
                <span style={memberBadgeStyle}>{user.membership_number || "ZUCA-001"}</span>
              </div>
              <p style={emailStyle}>{user.email}</p>
              <div style={badgeContainerStyle}>
                <span style={roleBadgeStyle}>{user.role?.toUpperCase() || "MEMBER"}</span>
                {user.homeJumuia && <span style={jumuiaBadgeStyle}>👥 {user.homeJumuia.name}</span>}
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="quick-stats">
              <div style={quickStatItemStyle}>
                <span style={quickStatValueStyle}>{upcomingEvents}</span>
                <span style={quickStatLabelStyle}>Events</span>
              </div>
              <div style={quickStatDividerStyle}></div>
              <div style={quickStatItemStyle}>
                <span style={quickStatValueStyle}>{unreadMessages}</span>
                <span style={quickStatLabelStyle}>Unread</span>
              </div>
              <div style={quickStatDividerStyle}></div>
              <div style={quickStatItemStyle}>
                <span style={quickStatValueStyle}>{user.joinedDate ? Math.floor((new Date() - new Date(user.joinedDate)) / (1000 * 60 * 60 * 24 * 30)) : "New"}</span>
                <span style={quickStatLabelStyle}>Months</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="activity-section">
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Recent Activity</h2>
            <p style={sectionSubtitleStyle}>Latest updates from your community</p>
          </div>
          
          <div style={activityListStyle}>
            {recentActivities.length === 0 ? (
              <div className="empty-activity">
                <span style={emptyActivityIconStyle}>📭</span>
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <motion.div 
                  key={activity.id} 
                  className="activity-item"
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(activity.link)}
                >
                  <div className="activity-icon" style={{ background: `${activity.color}10`, color: activity.color }}>{activity.icon}</div>
                  <div style={activityContentStyle}>
                    <div style={activityTitleStyle}>{activity.title}</div>
                    <div style={activityMessageStyle}>{activity.message}</div>
                    <div style={activityTimeStyle}>{formatRelativeTime(activity.time)}</div>
                  </div>
                  <FiArrowRight className="activity-arrow" />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Stats Row - Enhanced */}
        <div className="stats-row">
          <motion.div className="stat-card" onClick={() => navigate("/announcements")} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <div className="stat-icon" style={{ background: "#eff6ff" }}>📢</div>
            <div style={statInfoStyle}>
              <span style={statValueStyle}>{unreadAnnouncements}</span>
              <span style={statLabelStyle}>New Announcements</span>
            </div>
            <FiArrowRight className="stat-arrow" />
          </motion.div>
          <motion.div className="stat-card" onClick={() => navigate("/mass-programs")} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <div className="stat-icon" style={{ background: "#f3e8ff" }}>⛪</div>
            <div style={statInfoStyle}>
              <span style={statValueStyle}>{upcomingEvents}</span>
              <span style={statLabelStyle}>Upcoming Events</span>
            </div>
            <FiArrowRight className="stat-arrow" />
          </motion.div>
          <motion.div className="stat-card" onClick={() => {
            markMessagesAsRead();
            navigate("/chat");
          }} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <div className="stat-icon" style={{ background: "#e0f2fe" }}>💬</div>
            <div style={statInfoStyle}>
              <span style={statValueStyle}>{unreadMessages}</span>
              <span style={statLabelStyle}>Unread Messages</span>
            </div>
            <FiArrowRight className="stat-arrow" />
          </motion.div>
        </div>

        {/* Quick Actions Section */}
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Quick Actions</h2>
          <p style={sectionSubtitleStyle}>Navigate to different sections</p>
        </div>

        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <motion.div 
              key={action.title} 
              className="action-card"
              style={{ borderTopColor: action.color }} 
              onClick={() => handleQuickAction(action)}
              whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div style={actionCardHeaderStyle}>
                <div className="action-icon" style={{ background: `${action.color}15`, color: action.color }}>{action.icon}</div>
                {action.badge && <span className="action-badge">{action.badge}</span>}
              </div>
              <h3 style={actionTitleStyle}>{action.title}</h3>
              <p style={actionDescriptionStyle}>{action.description}</p>
              <div style={actionFooterStyle}>
                <span className="action-link">Open <FiArrowRight size={12} style={{ marginLeft: 4 }} /></span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="footer">
          <p style={footerTextStyle}>© {new Date().getFullYear()} ZUCA Portal. All rights reserved.</p>
          <p style={footerTextStyle}>ZUCA Portal • v3.0</p>
        </div>
      </div>

      <style>{`
        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
        }

        /* Gradient Header */
        .gradient-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          border-radius: 20px;
          padding: 24px 32px;
          margin-bottom: 24px;
          border: 1px solid rgba(51, 65, 85, 0.5);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.2);
          position: relative;
          overflow: hidden;
        }

        .gradient-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }

        .gradient-header:hover::before {
          left: 100%;
        }
        
        .gradient-header h1,
        .gradient-header p {
          color: white !important;
        }
        
        .gradient-header button {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          transition: all 0.3s ease !important;
        }
        
        .gradient-header button:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        /* Profile Card */
        .profile-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 24px;
          padding: 48px;
          margin-bottom: 28px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          transition: all 0.3s ease;
        }

        .profile-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        /* Quick Stats */
        .quick-stats {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }

        /* Activity Section */
        .activity-section {
          margin-bottom: 32px;
        }

        .activity-item {
          background: linear-gradient(135deg, #ffffff 0%, #fafcff 100%);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .activity-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .activity-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .activity-item:hover .activity-icon {
          transform: scale(1.05);
        }

        .activity-arrow {
          color: #cbd5e1;
          font-size: 14px;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .activity-item:hover .activity-arrow {
          color: #3b82f6;
          transform: translateX(4px);
        }

        .empty-activity {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          color: #64748b;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: linear-gradient(135deg, #ffd9008e 0%, #fef3c7 100%);
          border-radius: 20px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .stat-card:hover::before {
          left: 100%;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          font-size: 32px;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.05);
        }

        .stat-arrow {
          color: #94a3b8;
          font-size: 18px;
          transition: all 0.3s ease;
        }

        .stat-card:hover .stat-arrow {
          color: #3b82f6;
          transform: translateX(4px);
        }

        /* Actions Grid */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .action-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 20px;
          padding: 24px;
          cursor: pointer;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-top-width: 3px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .action-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
          transition: left 0.5s;
        }

        .action-card:hover::before {
          left: 100%;
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: all 0.3s ease;
        }

        .action-card:hover .action-icon {
          transform: scale(1.05) rotate(5deg);
        }

        .action-badge {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-radius: 20px;
          padding: 4px 12px;
          color: #dc2626;
          font-size: 10px;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .action-link {
          color: #3b82f6;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }

        .action-card:hover .action-link {
          gap: 8px;
        }

        /* Footer */
        .footer {
          text-align: center;
          padding: 24px;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          margin-top: 24px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 16px;
        }

        /* Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
          
          .profile-card {
            padding: 24px;
          }
          
          .gradient-header {
            padding: 16px 20px;
          }
        }
      `}</style>

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

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        user={user}
        onUserUpdate={(updatedUser) => {
          setUser(updatedUser);
          const imageUrl = updatedUser.profileImage?.startsWith("http")
            ? updatedUser.profileImage
            : updatedUser.profileImage ? `${BASE_URL}/${updatedUser.profileImage}` : null;
          setProfileImage(imageUrl);
        }}
      />
    </div>
  );
}

// Enhanced Styles (keeping original inline styles for compatibility)
const loadingContainerStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%)",
};

const loadingCardStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  borderRadius: "20px",
  padding: "40px",
  textAlign: "center",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
};

const loadingSpinnerStyle = {
  width: "40px",
  height: "40px",
  border: "3px solid #e2e8f0",
  borderTopColor: "#3b82f6",
  borderRadius: "50%",
  margin: "0 auto 16px",
  animation: "spin 0.6s linear infinite",
};

const loadingTextStyle = {
  color: "#64748b",
  fontSize: "14px",
  margin: 0,
};

const errorContainerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const errorCardStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  borderRadius: "20px",
  padding: "40px",
  textAlign: "center",
  maxWidth: "380px",
  width: "100%",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
};

const errorIconStyle = { fontSize: "56px", display: "block", marginBottom: "16px" };
const errorTitleStyle = { color: "#1e293b", fontSize: "22px", fontWeight: "700", marginBottom: "10px" };
const errorTextStyle = { color: "#64748b", fontSize: "13px", marginBottom: "28px" };
const errorButtonStyle = { background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", width: "100%" };

const dashboardContainerStyle = {
  minHeight: "auto",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const dashboardContentStyle = {
  maxWidth: "1400px",
  margin: "0 auto",
  padding: "24px",
};

const headerLeftStyle = { flex: 1 };
const greetingStyle = { fontSize: "26px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" };
const userNameStyle = { background: "linear-gradient(135deg, #60a5fa, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
const waveStyle = { display: "inline-block", marginLeft: "6px" };
const dateStyle = { color: "#94a3b8", fontSize: "13px" };

const headerRightStyle = { display: "flex", gap: "12px", alignItems: "center" };

const aiButtonStyle = {
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  border: "none",
  borderRadius: "12px",
  padding: "10px 20px",
  color: "white",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.3s ease",
};

const logoutButtonStyle = {
  background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  borderRadius: "12px",
  padding: "10px 20px",
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.3s ease",
};

const profileContentStyle = {
  display: "flex",
  gap: "32px",
  flexWrap: "wrap",
  alignItems: "center",
};

const avatarSectionStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};const avatarWrapperStyle = { 
  position: "relative", 
  width: "220px", 
  height: "220px", 
  borderRadius: "50%", 
  overflow: "hidden", 
  border: "3px solid #10b981",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.25)",
};
const avatarStyle = { width: "100%", height: "100%", objectFit: "cover" };
const avatarPlaceholderStyle = { 
  width: "100%", 
  height: "100%", 
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  fontSize: "48px", 
  fontWeight: "700", 
  color: "white" 
};
const avatarEditOverlay = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
  opacity: 0,
  transition: "opacity 0.3s ease",
};
const avatarActionsStyle = { display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" };
const uploadButtonStyle = { padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)", color: "#1e293b", border: "1px solid #e2e8f0" };
const removeButtonStyle = { padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", background: "linear-gradient(135deg, #fef2f2, #fee2e2)", color: "#dc2626", border: "1px solid #fee2e2" };
const settingsButtonStyle = { padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", color: "#3b82f6", border: "1px solid #bfdbfe" };
const infoSectionStyle = { flex: 1 };
const infoHeaderStyle = { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "6px" };
const fullNameStyle = { fontSize: "28px", fontWeight: "700", background: "linear-gradient(135deg, #1e293b, #334155)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 };
const memberBadgeStyle = { background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)", borderRadius: "20px", padding: "4px 12px", color: "#000000", fontSize: "15px", fontWeight: "700" };
const emailStyle = { color: "#64748b", fontSize: "16px", marginBottom: "10px" };
const badgeContainerStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
const roleBadgeStyle = { padding: "4px 12px", borderRadius: "14px", fontSize: "10px", fontWeight: "600", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", color: "#3b82f6" };
const jumuiaBadgeStyle = { padding: "4px 12px", borderRadius: "14px", fontSize: "10px", fontWeight: "600", background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", color: "#10b981" };

const quickStatItemStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
};

const quickStatValueStyle = {
  fontSize: "24px",
  fontWeight: "800",
  background: "linear-gradient(135deg, #1e293b, #475569)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const quickStatLabelStyle = {
  fontSize: "10px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const quickStatDividerStyle = {
  width: "1px",
  height: "30px",
  background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
};

const statInfoStyle = { display: "flex", flexDirection: "column", flex: 1 };
const statValueStyle = { fontSize: "32px", fontWeight: "800", background: "linear-gradient(135deg, #1e293b, #475569)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.2 };
const statLabelStyle = { fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: "500" };

const sectionHeaderStyle = { marginBottom: "20px" };
const sectionTitleStyle = { fontSize: "22px", fontWeight: "700", background: "linear-gradient(135deg, #1e293b, #475569)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: "6px" };
const sectionSubtitleStyle = { color: "#64748b", fontSize: "13px" };

const actionCardHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" };
const actionTitleStyle = { fontSize: "17px", fontWeight: "600", color: "#1e293b", marginBottom: "6px" };
const actionDescriptionStyle = { color: "#64748b", fontSize: "12px", marginBottom: "16px", lineHeight: 1.4 };
const actionFooterStyle = { display: "flex", justifyContent: "flex-end" };

const activityListStyle = { display: "flex", flexDirection: "column", gap: "12px" };
const activityContentStyle = { flex: 1 };
const activityTitleStyle = { fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" };
const activityMessageStyle = { fontSize: "12px", color: "#64748b", marginBottom: "6px", lineHeight: 1.4 };
const activityTimeStyle = { fontSize: "10px", color: "#94a3b8" };
const emptyActivityIconStyle = { fontSize: "48px", display: "block", marginBottom: "12px", opacity: 0.5 };

const footerTextStyle = { color: "#94a3b8", fontSize: "11px", margin: "4px 0" };

export default Dashboard;