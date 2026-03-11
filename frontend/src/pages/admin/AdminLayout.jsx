// frontend/src/layouts/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import logoImg from "../../assets/zuca-logo.png";
import BASE_URL from "../../api";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState(0);
  const notificationRef = useRef(null);

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Admin connected');
    });

    socket.on('admin_notification', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 10));
    });

    // Listen for online members count (not admins)
    socket.on('online_members', (data) => {
      setOnlineMembers(data.count);
    });

    return () => socket.disconnect();
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "", icon: "📊" },
    { label: "Users", path: "users", icon: "👥" },
    { label: "Manage Jumuia", path: "jumuia-management", icon: "⛪" },
    { label: "Activity", path: "activity", icon: "📈" },
    { label: "Analytics", path: "analytics", icon: "📊" },
    { label: "Songs Program", path: "songs", icon: "🎵" },
    { label: "Announcements", path: "announcements", icon: "📢" },
    { label: "Contributions", path: "contributions", icon: "💰" },
    { label: "Chat Monitor", path: "chat", icon: "💬" },
    { label: "Security", path: "security", icon: "🔒" },
  ];

  return (
    <div className="admin-layout">
      {/* Top Bar */}
      <motion.header 
        className="top-bar"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="top-bar-left">
          {isMobile && (
            <motion.button 
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              whileTap={{ scale: 0.9 }}
            >
              ☰
            </motion.button>
          )}
          <img src={logoImg} alt="ZUCA" className="logo-small" />
          <span className="university-name">ZETECH UNIVERSITY</span>
        </div>

        <div className="top-bar-right">
          {/* Online Members Count - Always Visible */}
          <div className="online-indicator">
            <span className="online-dot"></span>
            <span className="online-count">{onlineMembers} online</span>
          </div>

          {/* Notifications */}
          <div className="notification-container" ref={notificationRef}>
            <motion.button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              whileTap={{ scale: 0.9 }}
            >
              🔔
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </motion.button>

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
                      <button onClick={() => setNotifications([])}>Clear</button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No new notifications</div>
                    ) : (
                      notifications.map((notif, index) => (
                        <div key={index} className="notification-item">
                          <div className="notification-icon">{notif.icon || '📌'}</div>
                          <div className="notification-content">
                            <div className="notification-title">{notif.title}</div>
                            <div className="notification-message">{notif.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin Profile */}
          <motion.div 
            className="admin-profile"
            whileTap={{ scale: 0.95 }}
          >
            <div className="admin-avatar">AD</div>
          </motion.div>
        </div>
      </motion.header>

      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`}
        initial={false}
        animate={{ 
          x: isMobile ? (menuOpen ? 0 : "-100%") : 0,
        }}
        transition={{ type: "spring", damping: 25 }}
      >
        <div className="sidebar-header">
          <img src={logoImg} alt="ZUCA" className="sidebar-logo" />
          <h2 className="sidebar-title">ZETECH UNIVERSITY</h2>
          <p className="sidebar-subtitle">Catholic Action</p>
          {isMobile && (
            <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              end={item.path === ""}
              onClick={() => isMobile && setMenuOpen(false)}
            >
              {({ isActive }) => (
                <motion.div
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        <button 
          className="logout-btn"
          onClick={handleLogout}
        >
          🚪 Sign Out
        </button>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div 
            className="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .admin-layout {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Top Bar */
        .top-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 70px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 100;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 200px;
        }

        .menu-btn {
          width: 44px;
          height: 44px;
          border: none;
          background: #f3f4f6;
          border-radius: 10px;
          font-size: 22px;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .logo-small {
          height: 36px;
          width: auto;
          flex-shrink: 0;
        }

        .university-name {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 200px;
          justify-content: flex-end;
        }

        /* Online Indicator - Always Visible */
        .online-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: #f3f4f6;
          border-radius: 30px;
          white-space: nowrap;
        }

        .online-dot {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .online-count {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        /* Notifications */
        .notification-container {
          position: relative;
        }

        .notification-btn {
          width: 44px;
          height: 44px;
          border: none;
          background: #f3f4f6;
          border-radius: 10px;
          font-size: 20px;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          flex-shrink: 0;
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 600;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .notification-dropdown {
          position: absolute;
          top: 52px;
          right: 0;
          width: 340px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          z-index: 1000;
          overflow: hidden;
        }

        .notification-header {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .notification-header button {
          border: none;
          background: none;
          color: #6b7280;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
        }

        .notification-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-empty {
          padding: 40px 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.2s;
        }

        .notification-item:hover {
          background: #f9fafb;
        }

        .notification-icon {
          width: 36px;
          height: 36px;
          background: #f3f4f6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .notification-message {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }

        /* Admin Profile */
        .admin-profile {
          cursor: pointer;
          flex-shrink: 0;
        }

        .admin-avatar {
          width: 44px;
          height: 44px;
          background: #111827;
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          top: 70px;
          left: 0;
          width: 280px;
          height: calc(100vh - 70px);
          background: white;
          border-right: 1px solid #e5e7eb;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          z-index: 90;
          overflow-y: auto;
        }

        .sidebar-mobile {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 1000;
          box-shadow: 4px 0 20px rgba(0,0,0,0.1);
        }

        .sidebar-header {
          position: relative;
          text-align: center;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .sidebar-logo {
          width: 70px;
          height: auto;
          margin-bottom: 12px;
        }

        .sidebar-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .sidebar-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .sidebar-close {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 36px;
          height: 36px;
          border: none;
          background: #f3f4f6;
          border-radius: 10px;
          font-size: 16px;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          padding: 12px 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #4b5563;
          transition: all 0.2s;
          cursor: pointer;
        }

        .nav-item.active {
          background: #f3f4f6;
          color: #111827;
          font-weight: 500;
        }

        .nav-icon {
          font-size: 20px;
          width: 24px;
        }

        .nav-label {
          font-size: 14px;
          font-weight: 500;
        }

        /* Logout Button */
        .logout-btn {
          margin-top: 20px;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: #fee2e2;
          color: #dc2626;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #fecaca;
        }

        /* Mobile Overlay */
        .mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 95;
        }

        /* Main Content */
        .main-content {
          margin-left: 280px;
          padding: 90px 24px 24px;
          min-height: 100vh;
          transition: margin-left 0.3s;
        }

        /* Animation */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Responsive Design - Mobile */
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            padding: 90px 16px 24px;
          }

          .top-bar-left {
            min-width: auto;
          }

          .top-bar-right {
            min-width: auto;
            gap: 12px;
          }

          .university-name {
            font-size: 15px;
          }

          .online-indicator {
            display: flex; /* Always visible */
            padding: 4px 10px;
          }

          .online-count {
            font-size: 13px;
          }

          .notification-dropdown {
            width: 320px;
            right: -10px;
          }
        }

        @media (max-width: 480px) {
          .top-bar {
            padding: 0 16px;
          }

          .university-name {
            font-size: 14px;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .online-indicator {
            padding: 4px 8px;
          }

          .online-count {
            font-size: 12px;
          }

          .online-dot {
            width: 8px;
            height: 8px;
          }

          .notification-btn, .admin-avatar, .menu-btn {
            width: 40px;
            height: 40px;
          }

          .notification-dropdown {
            width: calc(100vw - 32px);
            right: -8px;
          }

          .sidebar {
            width: 260px;
          }
        }

        @media (max-width: 360px) {
          .university-name {
            display: none; /* Hide text on very small phones, show only logo */
          }
          
          .online-count {
            display: none; /* Hide text, show only dot */
          }
          
          .online-indicator {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}