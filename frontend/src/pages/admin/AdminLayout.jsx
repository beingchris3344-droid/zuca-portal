// frontend/src/layouts/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import {
  FiMessageSquare, FiBell, FiUsers, FiCalendar,
  FiLogOut, FiMenu, FiX,
} from "react-icons/fi";
import {
  FaYoutube, FaUser, FaComments, FaUserTie, FaImages,
  FaHandHoldingHeart, FaPrayingHands, FaFileAlt, FaShieldAlt,
  FaBookReader, FaUniversity, FaCogs, FaWhatsapp, FaMusic,
  FaPray, FaMailBulk,
  FaClock,
} from "react-icons/fa";
import logoImg from "../../assets/zuca-logo.png";
import BASE_URL from "../../api";
import badgeManager from "../../utils/badgeManager";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const [onlineMembers, setOnlineMembers] = useState(0);
  const [sidebarShadow, setSidebarShadow] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const notificationRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const [messengerUnreadCount, setMessengerUnreadCount] = useState(0);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMobile &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest(".mobile-hamburger")
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile]);

  useEffect(() => {
    const handler = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchMessengerUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/messenger/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessengerUnreadCount(data.totalUnread || 0);
      }
    } catch (err) {
      console.error("Failed to fetch messenger unread count:", err);
    }
  }, []);

  useEffect(() => {
    const socket = io(BASE_URL);

    socket.on("connect", () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.id) socket.emit("join", user.id);
    });

    socket.on("new_notification", (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      if (badgeManager) badgeManager.increment();
    });

    socket.on("online_members", (data) => setOnlineMembers(data.count));
    socket.on("dm:new_message", () => fetchMessengerUnreadCount());

    return () => socket.disconnect();
  }, [fetchMessengerUnreadCount]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.id) return;

        const response = await fetch(`${BASE_URL}/api/notifications/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        const allNotifications = Array.isArray(data) ? data : [];
        const unreadOnly = allNotifications.filter((notif) => !notif.read);

        const formattedNotifs = unreadOnly.slice(0, 20).map((notif) => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          icon: getIconForType(notif.type),
          read: notif.read || false,
          createdAt: notif.createdAt,
        }));

        setNotifications(formattedNotifs);
        if (badgeManager) badgeManager.updateBadgeCount(unreadOnly.length);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    fetchNotifications();
    fetchMessengerUnreadCount();
  }, [fetchMessengerUnreadCount]);

  const getIconForType = (type) => {
    const icons = {
      announcement: "📢",
      pledge_approved: "✅",
      payment_added: "💰",
      new_pledge: "💳",
      program: "⛪",
      message: "💬",
      media_comment: "💬",
      contribution: "💰",
      pledge_message: "💬",
      executive_appointment: "👔",
      executive_removed: "📋",
    };
    return icons[type] || "🔔";
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const openAI = () => {
    window.dispatchEvent(
      new CustomEvent("openAdminAI", { detail: { fullPage: true } })
    );
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.id) return;

      const response = await fetch(
        `${BASE_URL}/api/notifications/${user.id}/read-all`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setNotifications([]);
        badgeManager.updateBadgeCount(0);
      }
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        badgeManager.decrement();
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // ==================== SECTIONED NAVIGATION ====================
  const navSections = [
    {
      label: "Mains",
      items: [
        { label: "Home View", path: "", icon: <FaShieldAlt />, end: true },
        { label: "Feedback Management", path: "feedback", icon: <FaComments /> },
        { label: "WhatsApp Bot", path: "whatsapp", icon: <FaWhatsapp color="green" /> },
         { label: "Announcements", path: "announcements", icon: <FiBell /> },
      ],
    },

    {
      label: "Tools",
      items: [
        { label: "Birthdays", path: "/admin/birthday", icon: <FaUserTie /> },
        { label: "Countdown Settings", path: "/admin/countdown-settings", icon: <FaClock /> },
        { label: "System Monitor", path: "/admin/health-centre", icon: <FaShieldAlt /> },
        { label: "Manual", path: "security", icon: <FaBookReader/>}
      ],
    },
    {
      label: "People",
      items: [
        { label: "Members", path: "users", icon: <FiUsers /> },
        { label: "All Jumuias", path: "jumuia-management", icon: <FaPrayingHands /> },
        { label: "Executive Team", path: "executive", icon: <FaUserTie /> },
        { label: "Role Management", path: "roles", icon: <FaUserTie /> },
        { label: "Attendance", path: "attendance", icon: <FiUsers /> },
      ],
    },
    {
      label: "Z-Resources",
      items: [
        { label: "Mass Programs", path: "songs", icon: <FaFileAlt /> },
        { label: "Hymn Book", path: "hymns", icon: <FaMusic /> },
        { label: "Prayer Settings", path: "prayers", icon: <FaPray /> },
        { label: "Semester Schedule", path: "schedules", icon: <FiCalendar /> },
        { label: "Minutes Section", path: "minutes", icon: <FaFileAlt /> },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Contributions", path: "contributions", icon: <FaHandHoldingHeart /> },
        { label: "Bank Payments", path: "bank-payments", icon: <FaUniversity /> },
      ],
    },
    {
      label: "Media & Comms",
      items: [
       
        { label: "Gallery", path: "media", icon: <FaImages /> },
        { label: "YouTube Analytics", path: "analytics", icon: <FaYoutube /> },
        { label: "Messenger", path: "messenger", icon: <FaComments />, badge: messengerUnreadCount },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Email Dashboard", path: "email", icon: <FaMailBulk /> },
        { label: "Email Settings", path: "email-settings", icon: <FaCogs /> },
        { label: "Admin Manual", path: "security", icon: <FaBookReader /> },
      ],
    },
  ];

  return (
    <div style={containerStyle}>
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

      <motion.aside
        ref={sidebarRef}
        className="sidebar"
        initial={false}
        animate={{ x: menuOpen ? 0 : isMobile ? "-100%" : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={sidebarStyle(sidebarCollapsed)}
      >
        <div style={logoSection}>
          <img src={logoImg} alt="ZUCA Logo" style={logoStyle} />
          <div style={logoText}>
            <h3 style={logoTitle}>ZETECH UNIVERSITY</h3>
            <p style={logoSubtitle}>Catholic Action</p>
          </div>
        </div>

        <div ref={scrollContainerRef} style={navContainerStyle(sidebarShadow)}>
          <nav style={navStyle}>
            {navSections.map((section) => (
              <div key={section.label} style={navSectionStyle}>
                <div style={navSectionLabelStyle}>{section.label}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => isMobile && setMenuOpen(false)}
                    style={({ isActive }) => navRowStyle(isActive)}
                  >
                    <span style={navRowIconStyle}>{item.icon}</span>
                    <span style={navRowLabelStyle}>{item.label}</span>
                    {item.badge > 0 && (
                      <span style={navBadgeStyle}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div style={sidebarFooterStyle}>
          <div style={sidebarDividerStyle} />
          <motion.button
            onClick={handleLogout}
            style={logoutButtonStyle}
            whileHover={{
              backgroundColor: "#f5f5f5",
              color: "#0f0f0f",
              borderColor: "#d4d4d4",
            }}
            whileTap={{ scale: 0.98 }}
          >
            <FiLogOut style={logoutIconStyle} />
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      <main style={mainContentStyle(isMobile, sidebarCollapsed)}>
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mobile-hamburger"
              aria-label="Toggle menu"
            >
              {menuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
            </motion.button>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="desktop-collapse-btn"
              aria-label="Collapse sidebar"
            >
              {sidebarCollapsed ? <FiMenu size={16} /> : <FiX size={16} />}
            </button>

            <span style={pageTitleStyle}>ADMIN-{user?.fullName?.split(" ")[0] || "Admin"}</span>
          </div>

          <div style={headerRightStyle}>
            <button
              className="back-to-member-btn"
              onClick={async (e) => {
                const btn = e.currentTarget;
                const originalHTML = btn.innerHTML;

                btn.innerHTML = `
                  <span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;"></span>
                  Switching...
                `;
                btn.style.opacity = "0.7";
                btn.style.pointerEvents = "none";

                try {
                  const token = localStorage.getItem("token");
                  const res = await fetch(`${BASE_URL}/api/switch-role`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ targetRole: "member" }),
                  });

                  if (!res.ok) throw new Error("Failed");

                  const data = await res.json();
                  localStorage.setItem("token", data.token);
                  const storedUser = JSON.parse(
                    localStorage.getItem("user") || "{}"
                  );
                  storedUser.role = "member";
                  localStorage.setItem("user", JSON.stringify(storedUser));

                  window.location.href = "/dashboard";
                } catch (err) {
                  btn.innerHTML = originalHTML;
                  btn.style.opacity = "1";
                  btn.style.pointerEvents = "auto";
                  alert("Failed to switch back");
                }
              }}
            >
              <FaUser size={12} />  MEMBER
              <span></span>
            </button>

            <button className="ai-assistant-btn" onClick={openAI} aria-label="AI Assistant">
              <FiMessageSquare size={16} /> AI
              <span></span>
            </button>

            <div className="online-indicator">
              <span className="online-dot"></span> 
              <span className="online-label"></span> {onlineMembers} - Online
            </div>

            <div className="notification-container" ref={notificationRef}>
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <FiBell size={16} />
                {notifications.length > 0 && (
                  <span className="notification-badge">
                    {notifications.length > 99 ? "99+" : notifications.length}
                  </span>
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
                          <div
                            key={notif.id}
                            className="notification-item"
                            onClick={() => markAsRead(notif.id)}
                          >
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

        <div style={contentWrapperStyle}>
          <Outlet />
        </div>
      </main>

      <style>{`
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
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fafafa;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ---------- Mobile / Desktop helpers ---------- */
        .mobile-hamburger { display: none !important; }
        @media (max-width: 768px) {
          .mobile-hamburger { display: flex !important; }
          .desktop-collapse-btn { display: none !important; }
        }

        .desktop-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          color: #525252;
          transition: all 0.15s ease;
        }
        .desktop-collapse-btn:hover {
          background: #f5f5f5;
          color: #0f0f0f;
        }

        /* ---------- Sidebar nav hover & active ---------- */
        .sidebar nav a { transition: background 0.15s ease, color 0.15s ease; }
        .sidebar nav a:hover { background: #f5f5f5; }
        .sidebar nav a[aria-current="page"]::before {
          content: "";
          position: absolute;
          left: -12px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: #0f0f0f;
        }

        /* ---------- Sidebar scrollbar ---------- */
        .sidebar div::-webkit-scrollbar { width: 6px; }
        .sidebar div::-webkit-scrollbar-track { background: transparent; }
        .sidebar div::-webkit-scrollbar-thumb {
          background: #e5e5e5;
          border-radius: 10px;
        }
        .sidebar div::-webkit-scrollbar-thumb:hover { background: #d4d4d4; }

        /* ---------- Header buttons ---------- */
        .ai-assistant-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #0f0f0f;
          border: none;
          border-radius: 8px;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.15s ease;
        }
        .ai-assistant-btn:hover { background: #262626; }

        .back-to-member-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #ffffff;
          color: #0f0f0f;
          border: 1px solid #d4d4d4;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .back-to-member-btn:hover { background: #f5f5f5; }
        .back-to-member-btn:active { transform: scale(0.97); opacity: 0.9; }

        .online-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: #fafafa;
          border-radius: 999px;
          border: 1px solid #e5e5e5;
          font-size: 12px;
          color: #525252;
          font-weight: 500;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          background: #00ff00;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(163, 163, 163, 0.5);
          animation: pulse 2s infinite;
        }

        .notification-container { position: relative; }

        .notification-btn {
          width: 34px;
          height: 34px;
          background: transparent;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #525252;
          transition: all 0.15s ease;
        }
        .notification-btn:hover { background: #f5f5f5; color: #0f0f0f; }

        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #0f0f0f;
          color: white;
          font-size: 9px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
        }

        .notification-dropdown {
          position: absolute;
          top: 44px;
          right: 0;
          width: 360px;
          max-width: calc(100vw - 20px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.12), 0 8px 10px -6px rgba(15, 15, 15, 0.06);
          border: 1px solid #e5e5e5;
          z-index: 9999;
          overflow: hidden;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #ffffff;
          border-bottom: 1px solid #f5f5f5;
        }
        .notification-header h3 { font-size: 13px; margin: 0; color: #0f0f0f; font-weight: 600; }
        .notification-header button {
          background: none;
          border: none;
          color: #525252;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .notification-header button:hover { color: #0f0f0f; }

        .notification-list { max-height: 400px; overflow-y: auto; }
        .notification-empty { padding: 32px; text-align: center; color: #a3a3a3; font-size: 13px; }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid #f5f5f5;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .notification-item:hover { background: #fafafa; }
        .notification-item:last-child { border-bottom: none; }

        .notification-icon {
          width: 32px;
          height: 32px;
          background: #f5f5f5;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }
        .notification-content { flex: 1; min-width: 0; }
        .notification-title { font-size: 13px; font-weight: 600; color: #0f0f0f; }
        .notification-message {
          font-size: 12px;
          color: #737373;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .notification-time { font-size: 10px; color: #a3a3a3; margin-top: 4px; }

        .admin-profile { display: flex; align-items: center; }
        .admin-avatar {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #fafafa;
          object-fit: cover;
          border: 1px solid #e5e5e5;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(163, 163, 163, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(163, 163, 163, 0); }
        }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }

        @media (max-width: 768px) {
          .notification-dropdown { width: 320px; right: -10px; }
          .online-indicator .online-label { display: none; }
          .ai-assistant-btn span { display: none; }
          .back-to-member-btn span { display: none; }
          .ai-assistant-btn { padding: 6px 8px; }
          .back-to-member-btn { padding: 6px 8px; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   STYLES — NEUTRAL ONLY (no purple / no blue / no sharp colours)
   ============================================================ */

const containerStyle = {
  height: "100vh",
  width: "100vw",
  background: "#fafafa",
  position: "relative",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 15, 15, 0.35)",
  backdropFilter: "blur(2px)",
  zIndex: 40,
};

/* ---------- SIDEBAR SHELL ---------- */
const sidebarStyle = (collapsed) => ({
  position: "fixed",
  left: 0,
  top: 0,
  height: "100vh",
  width: collapsed ? "0px" : "256px",
  background: "#ffffff",
  borderRight: collapsed ? "none" : "1px solid #e5e5e5",
  padding: collapsed ? "0" : "16px 12px",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
  overflowY: "hidden",
  transition: "width 0.25s ease, padding 0.25s ease",
  whiteSpace: "nowrap",
});

/* ---------- BRAND ---------- */
const logoSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 8px 16px",
  marginBottom: "8px",
  borderBottom: "1px solid #f5f5f5",
};

const logoStyle = { width: "40px", height: "auto", borderRadius: "8px" };
const logoText = { flex: 1, minWidth: 0 };

const logoTitle = {
  color: "#0f0f0f",
  fontSize: "12px",
  fontWeight: "700",
  margin: 0,
  lineHeight: "1.3",
  letterSpacing: "0.4px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const logoSubtitle = {
  color: "#a3a3a3",
  fontSize: "11px",
  margin: "2px 0 0",
  fontWeight: "500",
};

/* ---------- NAV ---------- */
const navContainerStyle = (shadow) => ({
  flex: 1,
  overflowY: "auto",
  paddingRight: "2px",
  transition: "box-shadow 0.3s",
  boxShadow: shadow ? "inset 0 8px 10px -8px rgba(0,0,0,0.04)" : "none",
});

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  paddingBottom: "8px",
};

const navSectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  marginBottom: "14px",
};

const navSectionLabelStyle = {
  fontSize: "10px",
  fontWeight: "700",
  color: "#a3a3a3",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "6px 12px",
  userSelect: "none",
};

const navRowStyle = (isActive) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "9px 12px",
  borderRadius: "8px",
  fontSize: "13.5px",
  fontWeight: isActive ? "600" : "500",
  color: isActive ? "#0f0f0f" : "#525252",
  background: isActive ? "#f5f5f5" : "transparent",
  textDecoration: "none",
  position: "relative",
  cursor: "pointer",
});

const navRowIconStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  fontSize: "17px",
  color: "inherit",
  flexShrink: 0,
};

const navRowLabelStyle = {
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const navBadgeStyle = {
  marginLeft: "auto",
  backgroundColor: "#0f0f0f",
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: "700",
  padding: "2px 6px",
  borderRadius: "10px",
  minWidth: "18px",
  textAlign: "center",
  lineHeight: 1.3,
};

/* ---------- FOOTER ---------- */
const sidebarFooterStyle = { marginTop: "auto", paddingTop: "8px" };
const sidebarDividerStyle = { height: "1px", background: "#f5f5f5", margin: "8px 0 12px" };

const logoutButtonStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #e5e5e5",
  background: "#ffffff",
  color: "#525252",
  fontSize: "13px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const logoutIconStyle = { fontSize: "16px" };

/* ---------- MAIN ---------- */
const mainContentStyle = (isMobile, collapsed) => ({
  marginLeft: isMobile ? 0 : collapsed ? "0px" : "256px",
  padding: 0,
  position: "relative",
  zIndex: 1,
  height: "100vh",
  overflow: "hidden",
  transition: "margin-left 0.25s ease",
  width: isMobile ? "100%" : `calc(100% - ${collapsed ? "0px" : "256px"})`,
  background: "#fafafa",
  display: "flex",
  flexDirection: "column",
});

const contentWrapperStyle = {
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "0px",
  position: "relative",
};

/* ---------- HEADER ---------- */
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#ffffff",
  padding: "10px 20px",
  borderBottom: "1px solid #e5e5e5",
  position: "sticky",
  top: 0,
  zIndex: 30,
  flexShrink: 0,
  gap: "12px",
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const hamburgerStyle = {
  display: "none",
  background: "transparent",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  width: "36px",
  height: "36px",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
  color: "#525252",
};

const pageTitleStyle = {
  color: "#0f0f0f",
  fontSize: "15px",
  fontWeight: "600",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  position: "relative",
  zIndex: 31,
  flexShrink: 0,
};