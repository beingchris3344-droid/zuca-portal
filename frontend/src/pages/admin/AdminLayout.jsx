// frontend/src/layouts/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { FiMessageSquare } from "react-icons/fi";
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

  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Admin connected');
    });

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
    });

    socket.on('pledge_updated', (updatedPledge) => {
      console.log('Pledge updated:', updatedPledge);
    });

    socket.on('pledge_created', (newPledge) => {
      console.log('New pledge created:', newPledge);
    });

    socket.on('new_message', (message) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'message',
        title: '💬 New Message',
        message: `New message about a pledge`,
        icon: '💬',
        read: false,
        createdAt: new Date().toISOString()
      }, ...prev].slice(0, 20));
    });

    socket.on('online_members', (data) => {
      setOnlineMembers(data.count);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const openAI = () => {
    window.dispatchEvent(new CustomEvent('openAdminAI', { detail: { fullPage: true } }));
  };

  const navItems = [
    { label: "ADMIN DASHBOARD", path: "", icon: "📊" },
    { label: "USER MANUAL", path: "security", icon: "🔒" },
    { label: "ALL USERS", path: "users", icon: "👥" },
    { label: "ROLE MANAGEMENT", path: "roles", icon: "👑" },
    { label: "EXECUTIVE MANAGEMENT", path: "executive", icon: "👔" },
    { label: "JUMUIA MANAGEMENT", path: "jumuia-management", icon: "⛪" },
    { label: "ZUCA GALLERY", path: "media", icon: "🎥" },
    { label: "ZUCA YOUTUBE ANALYTICS", path: "analytics", icon: "▶️" },
    { label: "MASS PROGRAM", path: "songs", icon: "🎵" },
    { label: "HYMN BOOK", path: "hymns", icon: "📖" }, 
    { label: "PENDING SONGS", path: "pending-songs", icon: "⏳" },
    { label: "GEN ANNOUNCEMENTS", path: "announcements", icon: "📢" },
    { label: "GEN CONTRIBUTIONS", path: "contributions", icon: "💰" },
    { label: "CHAT MONITOR", path: "chat", icon: "💬" },
  ];

  return (
    <div className="admin-layout">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          {isMobile && (
            <button className="menu-btn" onClick={() => setMenuOpen(true)}>
              ☰
            </button>
          )}
          <img src={logoImg} alt="ZUCA" className="logo-small" />
          <span className="university-name">ZETECH CATHOLIC ACTION</span>
        </div>

        <div className="top-bar-right">
          <button className="ai-assistant-btn" onClick={openAI}>
            <FiMessageSquare size={20} />
            <span className="ai-text"><strong> AI</strong></span>
          </button>

          <div className="online-indicator">
            <span className="online-dot"></span>
            <span className="online-count">{onlineMembers} online</span>
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
                  transition={{ duration: 0.15 }}
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
                        <div key={index} className={`notification-item ${notif.type || ''}`}>
                          <div className="notification-icon">
                            {notif.icon || (notif.type === 'message' ? '💬' : '📌')}
                          </div>
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
            <div className="admin-avatar">AD</div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`} style={{ transform: isMobile ? (menuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none' }}>
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
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <span className="active-indicator"></span>}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Sign Out
        </button>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && menuOpen && (
          <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>

      {/* Main Content - FULL WIDTH */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Copyright Footer */}
      <div className="copyright-footer">
        <p>© {new Date().getFullYear()} ZUCA Portal | Built for Unity & Faith</p>
        <p>Portal Built By | CHRISTECH WEBSYS</p>
      </div>

      <style>{`
        .admin-layout {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

       /* Top Bar - More Compact */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px; /* Reduced from 64px to 48px */
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px; /* Reduced horizontal padding */
  z-index: 1;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px; /* Reduced from 16px */
  min-width: auto; /* Changed from 200px */
}

.menu-btn {
  width: 32px; /* Reduced from 40px */
  height: 32px; /* Reduced from 40px */
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px; /* Reduced from 10px */
  font-size: 18px; /* Reduced from 20px */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-small {
  height: 28px; /* Reduced from 36px */
  width: auto;
}

.university-name {
  font-size: 14px; /* Reduced from 16px */
  font-weight: 600; /* Changed from 700 */
  color: #1e293b;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px; /* Reduced from 16px */
  min-width: auto; /* Changed from 200px */
  justify-content: flex-end;
}

/* AI Assistant Button - More Compact */
.ai-assistant-btn {
  display: flex;
  align-items: center;
  gap: 6px; /* Reduced from 8px */
  padding: 5px 12px; /* Reduced from 8px 16px */
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  border-radius: 24px; /* Slightly reduced */
  color: white;
  font-weight: 500; /* Changed from 600 */
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px; /* Added smaller font */
}

.ai-assistant-btn svg {
  width: 16px; /* Make icon smaller */
  height: 16px;
}

/* Online Indicator - More Compact */
.online-indicator {
  display: flex;
  align-items: center;
  gap: 6px; /* Reduced from 8px */
  padding: 4px 10px; /* Reduced from 6px 12px */
  background: #f8fafc;
  border-radius: 24px; /* Reduced from 30px */
  border: 1px solid #e2e8f0;
}

.online-dot {
  width: 6px; /* Reduced from 8px */
  height: 6px; /* Reduced from 8px */
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.online-count {
  font-size: 12px; /* Reduced from 13px */
  font-weight: 500;
  color: #1e293b;
}

/* Notification Button - More Compact */
.notification-btn {
  width: 32px; /* Reduced from 40px */
  height: 32px; /* Reduced from 40px */
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px; /* Reduced from 10px */
  font-size: 16px; /* Reduced from 18px */
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
}

.notification-badge {
  position: absolute;
  top: -2px; /* Adjusted from -4px */
  right: -2px; /* Adjusted from -4px */
  background: #ef4444;
  color: white;
  font-size: 9px; /* Reduced from 10px */
  font-weight: 600;
  min-width: 16px; /* Reduced from 18px */
  height: 16px; /* Reduced from 18px */
  border-radius: 8px; /* Reduced from 9px */
}

/* Admin Profile - More Compact */
.admin-avatar {
  width: 32px; /* Reduced from 40px */
  height: 32px; /* Reduced from 40px */
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-radius: 8px; /* Reduced from 10px */
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px; /* Reduced from 14px */
}
        .admin-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        /* Sidebar - Official White */
        .sidebar {
          position: fixed;
          top: 64px;
          left: 0;
          width: 280px;
          height: calc(100vh - 64px);
          background: #ffffff;
          padding: 20px;
          display: flex;
          flex-direction: column;
          z-index: 0;
          overflow-y: auto;
          border-right: 1px solid #e2e8f0;
          transition: transform 0s;
        }

        .sidebar-mobile {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 1000;
          transition: transform 0.2s ease;
        }

        .sidebar-header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
          position: relative;
        }

        .sidebar-logo {
          width: 60px;
          height: auto;
          margin-bottom: 12px;
        }

        .sidebar-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .sidebar-subtitle {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }

        .sidebar-close {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 32px;
          height: 32px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #64748b;
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
          padding: 10px 14px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #475569;
          transition: all 0.2s;
          cursor: pointer;
          position: relative;
        }

        .nav-item:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .nav-item.active {
          background: #eff6ff;
          color: #3b82f6;
        }

        .nav-icon {
          font-size: 18px;
          width: 24px;
        }

        .nav-label {
          font-size: 13px;
          font-weight: 500;
        }

        .active-indicator {
          position: absolute;
          right: 12px;
          width: 4px;
          height: 4px;
          background: #3b82f6;
          border-radius: 50%;
        }

        /* Logout Button */
        .logout-btn {
          margin-bottom: 50px;
          padding: 12px;
          border: 1px solid #fee2e2;
          border-radius: 10px;
          background: #ffffff;
          color: #dc2626;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }

        /* Mobile Overlay */
        .mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          z-index: 95;
        }

        /* Main Content - FULL WIDTH, NO MARGINS */
        .main-content {
          margin-left: 280px;
          padding: 84px 0 24px 0;
          min-height: 100vh;
          transition: margin-left 0.3s;
          position: relative;
          z-index: 0;
          width: calc(100% - 280px);
        }

        /* NO WRAPPER - direct Outlet rendering */
        .main-content > * {
          width: 100%;
          max-width: 100%;
        }

        /* Copyright Footer */
        .copyright-footer {
          position: fixed;
          bottom: 12px;
          right: 24px;
          text-align: right;
          color: #94a3b8;
          font-size: 10px;
          z-index: 50;
          pointer-events: none;
        }

        .copyright-footer p {
          margin: 2px 0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Responsive */
       /* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 80px 0 20px 0;
    width: 100%;
  }

  .top-bar {
    padding: 0 16px;
  }

  /* Make text smaller but STILL VISIBLE */
  .university-name {
    font-size: 12px;
    display: inline-block; /* CHANGE: was 'display: none' */
  }

  .online-indicator {
    padding: 4px 8px;
  }

  .online-count {
    font-size: 12px;
  }

  .notification-dropdown {
    width: 320px;
    right: -10px;
  }
}

/* On very small screens, make text even smaller but still visible */
@media (max-width: 480px) {
  .university-name {
    font-size: 10px;
  }
  
  .top-bar-left {
    gap: 8px;
  }
}
          .online-indicator {
            padding: 4px 8px;
          }

          .online-count {
            font-size: 12px;
          }

          .notification-dropdown {
            width: 320px;
            right: -10px;
          }
        }
      `}</style>
    </div>
  );
}