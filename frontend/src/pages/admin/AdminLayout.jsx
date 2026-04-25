// frontend/src/layouts/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { FiMessageSquare } from "react-icons/fi";
import logoImg from "../../assets/zuca-logo.png";
import BASE_URL from "../../api";
import badgeManager from '../../utils/badgeManager';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState(0);
  const [sidebarShadow, setSidebarShadow] = useState(false);
  const notificationRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // Handle resize for mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle sidebar scroll shadow
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setSidebarShadow(scrollContainerRef.current.scrollTop > 5);
      }
    };
    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle click outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !event.target.closest('.mobile-hamburger')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile]);

  // Socket connection
  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Admin connected');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      if (badgeManager) badgeManager.increment();
    });

    socket.on('online_members', (data) => {
      setOnlineMembers(data.count);
    });

    return () => socket.disconnect();
  }, []);

  // Fetch existing notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) return;
        
        const response = await fetch(`${BASE_URL}/api/notifications/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        const allNotifications = Array.isArray(data) ? data : [];
        const unreadOnly = allNotifications.filter(notif => !notif.read);
        
        const formattedNotifs = unreadOnly.slice(0, 20).map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          icon: getIconForType(notif.type),
          read: notif.read || false,
          createdAt: notif.createdAt
        }));
        
        setNotifications(formattedNotifs);
        if (badgeManager) badgeManager.updateBadgeCount(unreadOnly.length);
        
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
  }, []);

  const getIconForType = (type) => {
    const icons = {
      'announcement': '📢', 'pledge_approved': '✅', 'payment_added': '💰',
      'new_pledge': '💳', 'program': '⛪', 'message': '💬', 'media_comment': '💬',
      'contribution': '💰', 'pledge_message': '💬', 'executive_appointment': '👔',
      'executive_removed': '📋'
    };
    return icons[type] || '🔔';
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const openAI = () => {
    window.dispatchEvent(new CustomEvent('openAdminAI', { detail: { fullPage: true } }));
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) return;
      
      const response = await fetch(`${BASE_URL}/api/notifications/${user.id}/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setNotifications([]);
        badgeManager.updateBadgeCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        badgeManager.decrement();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const navItems = [
    { label: "ADMIN DASHBOARD", path: "", icon: "📊", bg: "#eff6ff", color: "#3b82f6" },
    { label: "ALL USERS", path: "users", icon: "👥", bg: "#e0f2fe", color: "#06b6d4" },
    { label: "SCHEDULE MANAGER", path: "schedules", icon: "📅", bg: "#fef3c7", color: "#f59e0b" },
    { label: "ROLE MANAGEMENT", path: "roles", icon: "👑", bg: "#fce7f3", color: "#ec4899" },
    { label: "EXECUTIVE MANAGEMENT", path: "executive", icon: "👔", bg: "#ede9fe", color: "#8b5cf6" },
    { label: "JUMUIA MANAGEMENT", path: "jumuia-management", icon: "⛪", bg: "#d1fae5", color: "#10b981" },
    { label: "ZUCA GALLERY", path: "media", icon: "🎥", bg: "#fef3c7", color: "#f59e0b" },
    { label: "ZUCA YOUTUBE ANALYTICS", path: "analytics", icon: "▶️", bg: "#fee2e2", color: "#ef4444" },
    { label: "MASS PROGRAM", path: "songs", icon: "🎵", bg: "#e0e7ff", color: "#6366f1" },
    { label: "HYMN BOOK", path: "hymns", icon: "📖", bg: "#fef3c7", color: "#f59e0b" },
    { label: "PENDING SONGS", path: "pending-songs", icon: "⏳", bg: "#fef3c7", color: "#f59e0b" },
    { label: "GEN ANNOUNCEMENTS", path: "announcements", icon: "📢", bg: "#dbeafe", color: "#3b82f6" },
    { label: "GEN CONTRIBUTIONS", path: "contributions", icon: "💰", bg: "#d1fae5", color: "#10b981" },
    { label: "CHAT MONITOR", path: "chat", icon: "💬", bg: "#e0f2fe", color: "#06b6d4" },
    { label: "USER MANUAL", path: "security", icon: "🔒", bg: "#f1f5f9", color: "#64748b" },
  ];

  return (
    <div style={containerStyle}>
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={backdropStyle}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        className="sidebar"
        initial={false}
        animate={{ x: menuOpen ? 0 : (isMobile ? "-100%" : 0) }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={sidebarStyle}
      >
        <div style={logoSection}>
          <img src={logoImg} alt="ZUCA Logo" style={logoStyle} />
          <div style={logoText}>
            <h3 style={logoTitle}>ZETECH UNIVERSITY</h3>
            <p style={logoSubtitle}>Catholic Action</p>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          style={navContainerStyle(sidebarShadow)}
        >
          <nav style={navStyle}>
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === ""}
                onClick={() => isMobile && setMenuOpen(false)}
                style={{ textDecoration: "none" }}
              >
                {({ isActive }) => (
                  <motion.div
                    style={navCardStyle(isActive, item.bg, item.color)}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span style={navIconStyle}>{item.icon}</span>
                    <span style={navLabelStyle(isActive, item.color)}>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        style={activeIndicatorStyle(item.color)}
                        transition={{ type: "spring", damping: 20 }}
                      />
                    )}
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={sidebarFooterStyle}>
          <div style={sidebarDividerStyle} />
          <motion.button
            onClick={handleLogout}
            style={logoutButtonStyle}
            whileHover={{ backgroundColor: "#dc2626", color: "#fff" }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={logoutIconStyle}>🚪</span>
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content - NO PADDING/MARGIN, JUST LIKE Layout.jsx */}
      <main style={mainContentStyle(isMobile)}>
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={headerStyle}
        >
          <div style={headerLeftStyle}>
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              style={hamburgerStyle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="mobile-hamburger"
            >
              <span style={hamburgerIconStyle}>{menuOpen ? "✕" : "☰"}</span>
            </motion.button>
            <span style={pageTitleStyle}>Admin Console</span>
          </div>

          <div style={headerRightStyle}>
            <button className="ai-assistant-btn" onClick={openAI}>
              <FiMessageSquare size={18} />
              <span>AI</span>
            </button>

            <div className="online-indicator">
              <span className="online-dot"></span>
              <span>{onlineMembers} online</span>
            </div>

            <div className="notification-container" ref={notificationRef}>
              <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
                🔔
                {notifications.length > 0 && (
                  <span className="notification-badge">{notifications.length}</span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    className="notification-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="notification-header">
                      <h3>Notifications</h3>
                      {notifications.length > 0 && (
                        <button onClick={markAllAsRead}>Mark all as read</button>
                      )}
                    </div>
                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <div className="notification-empty">No new notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="notification-item" onClick={() => markAsRead(notif.id)}>
                            <div className="notification-icon">{notif.icon}</div>
                            <div className="notification-content">
                              <div className="notification-title">{notif.title}</div>
                              <div className="notification-message">{notif.message}</div>
                              <div className="notification-time">
                                {new Date(notif.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="admin-profile">
              <img src={logoImg} alt="ZUCA" className="admin-avatar" />
            </div>
          </div>
        </motion.header>

        {/* Outlet - NO WRAPPER, just like Layout.jsx */}
        <Outlet />
      </main>

      <style>{`
        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
        }

        /* Mobile Hamburger */
        .mobile-hamburger {
          display: none !important;
        }

        @media (max-width: 768px) {
          .mobile-hamburger {
            display: flex !important;
          }
        }

        /* AI Button */
        .ai-assistant-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: linear-gradient(135deg, #f63b3b, #8b5cf6);
          border: none;
          border-radius: 24px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          font-size: 12px;
        }

        /* Online Indicator */
        .online-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: #f8fafc;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          font-size: 12px;
        }

        .online-dot {
          width: 8px;
          height: 8px;
          background: #00ff9d;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* Notification Styles */
        .notification-container {
          position: relative;
        }

        .notification-btn {
          width: 36px;
          height: 36px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 600;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-dropdown {
          position: absolute;
          top: 45px;
          right: 0;
          width: 360px;
          max-width: calc(100vw - 20px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          z-index: 9999;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .notification-header h3 { font-size: 14px; margin: 0; }
        .notification-header button { background: none; border: none; color: #3b82f6; font-size: 11px; cursor: pointer; }

        .notification-list { max-height: 400px; overflow-y: auto; }
        .notification-empty { padding: 32px; text-align: center; color: #94a3b8; }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
        }
        .notification-item:hover { background: #f8fafc; }

        .notification-icon { width: 32px; height: 32px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .notification-content { flex: 1; }
        .notification-title { font-size: 13px; font-weight: 600; }
        .notification-message { font-size: 11px; color: #64748b; }
        .notification-time { font-size: 10px; color: #94a3b8; margin-top: 4px; }

        /* Admin Profile */
        .admin-profile {
          display: flex;
         
          align-items: center;
        }

        .admin-avatar {
          width: 36px;
          height: 40px;
          border-radius: 8px;
           background: #f8fcff;
          object-fit: cover;
          border: 1px solid #e2e8f0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        @media (max-width: 768px) {
          .notification-dropdown { width: 320px; right: -10px; }
          .online-indicator span:last-child { display: none; }
          .ai-assistant-btn span { display: none; }
        }
      `}</style>
    </div>
  );
}

// ==================== STYLES (matching Layout.jsx pattern) ====================

const containerStyle = {
  height: "100vh",
  width: "100vw",
  background: "#f8fafc",
  position: "relative",
  overflow: "hidden",
  margin: 0,
  padding: 0,
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.3)",
  backdropFilter: "blur(4px)",
  zIndex: 40,
};

const sidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  height: "100vh",
  width: "280px",
  background: "#ffffff",
  boxShadow: "2px 0 12px rgba(0, 0, 0, 0.05)",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  zIndex: 0,
  overflowY: "hidden",
};

const logoSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  marginBottom: "24px",
  borderBottom: "1px solid #e2e8f0",
};

const logoStyle = {
  width: "44px",
  height: "auto",
  borderRadius: "10px",
};

const logoText = { flex: 1 };
const logoTitle = { color: "#1e293b", fontSize: "13px", fontWeight: "700", margin: 0 };
const logoSubtitle = { color: "#64748b", fontSize: "11px", margin: "4px 0 0" };

const navContainerStyle = (shadow) => ({
  flex: 1,
  overflowY: "auto",
  paddingRight: "4px",
  transition: "box-shadow 0.3s",
  boxShadow: shadow ? "inset 0 8px 10px -8px rgba(0,0,0,0.05)" : "none",
});

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const navCardStyle = (isActive, bg, color) => ({
  padding: "12px 16px",
  borderRadius: "12px",
  backgroundColor: isActive ? bg : "#ffffff",
  border: isActive ? `1px solid ${color}` : "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  position: "relative",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: isActive ? `0 2px 4px rgba(59, 130, 246, 0.1)` : "none",
});

const navIconStyle = {
  fontSize: "20px",
  width: "28px",
};

const navLabelStyle = (isActive, color) => ({
  color: isActive ? color : "#475569",
  fontWeight: isActive ? "600" : "500",
  fontSize: "13px",
});

const activeIndicatorStyle = (color) => ({
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  width: "3px",
  height: "20px",
  background: color,
  borderRadius: "0 3px 3px 0",
});

const sidebarFooterStyle = { marginTop: "20px" };
const sidebarDividerStyle = { height: "1px", background: "#e2e8f0", margin: "16px 0" };

const logoutButtonStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  cursor: "pointer",
  marginBottom: "20px",
};

const logoutIconStyle = { fontSize: "16px" };

// KEY: mainContentStyle - NO PADDING, just like Layout.jsx
const mainContentStyle = (isMobile) => ({
  marginLeft: isMobile ? 0 : "280px",
  padding: 0,  // ← NO PADDING - pages handle their own spacing
  position: "relative",
  zIndex: 1,
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  transition: "margin-left 0.3s ease",
  width: isMobile ? "100%" : `calc(100% - 280px)`,
  background: "#f8fafc",
});

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#ffffff",
  borderRadius: "0px",
  padding: "0px 20px",
  marginBottom: "0px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  borderBottom: "1px solid #e2e8f0",
  position: "sticky",
  top: 0,
  zIndex: 30,
  flexShrink: 0,
  height: "60px",
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const hamburgerStyle = {
  display: "none",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
};

const hamburgerIconStyle = {
  color: "#475569",
  fontSize: "20px",
  fontWeight: "600",
};

const pageTitleStyle = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "600",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  position: "relative",
  zIndex: 31,
};