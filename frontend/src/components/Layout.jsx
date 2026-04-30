// frontend/src/components/Layout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/zuca-logo.png";
import Notifications from "./Notifications";
import BASE_URL from "../api";
import AnimatedBackground from "./AnimatedBackground";
import FloatingInstallButton from "./FloatingInstallButton";
import { 
  FiHome, FiCalendar, FiBook, FiImage, FiUsers, FiBell, 
  FiDollarSign, FiMusic, FiMessageSquare, FiUserCheck, 
  FiAward, FiYoutube, FiMapPin, 
} from "react-icons/fi";
import { FaYoutube, FaChurch, FaMoneyBillWave, FaMusic, FaComments, FaUserTie } from "react-icons/fa";
import { GiGamepad } from "react-icons/gi";


function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarShadow, setSidebarShadow] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const scrollContainerRef = useRef(null);
  const userMenuRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (mobile) {
        setMenuOpen(false);
      } else {
        setMenuOpen(true);
      }
    };
    
    window.addEventListener("resize", handleResize);
    handleResize();
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  if (!user) return null;

  const profileImageUrl =
    user.profileImage
      ? user.profileImage.startsWith("http")
        ? user.profileImage
        : `${BASE_URL}/${user.profileImage}`
      : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/schedules", label: "Schedules", icon: "📅" },
    { path: "/user-manual", label: "User Manual", icon: "📚" },
    { path: "/liturgical-calendar", label: "Liturgical Calendar", icon: "🗓️" },
      { path: "/youtube", label: "ZUCA Y-Tube Hub", icon: <FaYoutube size={18} color="#ff0000" /> },

    { path: "/gallery", label: "Gallery", icon: "🖼️" },
    { path: "/join-jumuia", label: "Join Jumuia", icon: "👥" },
    { path: "/announcements", label: "Announcements", icon: "📢" },
    { path: "/mass-programs", label: "Mass Programs", icon: "⛪" },
    { path: "/contributions", label: "Contributions", icon: "💰" },
    { path: "/hymns", label: "Hymn Book", icon: "🎵" },
    { path: "/jumuia-contributions", label: "My Jumuia", icon: "🏠" },    
    { path: "/chat", label: "Chat", icon: "💬" },
    { path: "/executive", label: "Executive Team", icon: "👔" },
    { path: "/games", label: "Games Arcade", icon: "🎮" },
  ];

  return (
    <div style={containerStyle}>
      <AnimatedBackground />
  
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={backdropStyle}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        className="sidebar"
        initial={false}
        animate={{ 
          x: menuOpen ? 0 : (isMobile ? "-100%" : 0),
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={sidebarStyle}
      >
        <div style={logoSection}>
          <img src={logo} alt="ZUCA Logo" style={logoStyle} />
          <div style={logoText}>
            <h3 style={logoTitle}>ZETECH UNIVERSITY</h3>
            <p style={logoSubtitle}>Catholic Action</p>
          </div>
        </div>

        <div style={userBadgeStyle}>
          {profileImageUrl ? (
            <img src={profileImageUrl} alt={user.fullName} style={userBadgeAvatar} />
          ) : (
            <div style={userBadgeFallback}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={userBadgeInfo}>
            <span style={userBadgeName}>{user.fullName.split(" ")[0]}</span>
            <span style={userBadgeRole}>{user.role || "Member"}</span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          style={navContainer(sidebarShadow)}
        >
          <nav style={navStyle}>
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobile) setMenuOpen(false);
                }}
              >
                {({ isActive }) => (
                  <motion.div
                    style={navCardStyle(isActive)}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span style={navCardIcon}>{item.icon}</span>
                    <span style={navCardLabel(isActive)}>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        style={activeIndicatorStyle}
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
          <div style={sidebarFooterDivider} />
          <motion.button
            onClick={handleLogout}
            style={sidebarLogoutButton}
            whileHover={{ backgroundColor: "#dc2626", color: "#fff" }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={logoutIconStyle}>🚪</span>
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      <main style={mainContentStyle(isMobile, menuOpen)}>
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
            <span style={pageTitleStyle}>Dashboard</span>
          </div>

          <div style={headerRightStyle}>
            <div style={enhancedNotificationWrapperStyle}>
              <Notifications userId={user.id} />
            </div>

            <div ref={userMenuRef} style={userMenuContainerStyle}>
              <motion.div
                style={userMenuTriggerStyle}
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ backgroundColor: "#f1f5f9" }}
                whileTap={{ scale: 0.95 }}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={user.fullName} style={headerAvatarStyle} />
                ) : (
                  <div style={headerAvatarFallbackStyle}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={userNameStyle}>{user.fullName.split(" ")[0]}</span>
                <span style={dropdownArrowStyle}>▼</span>
              </motion.div>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={userDropdownStyle}
                  >
                    <div style={userDropdownHeader}>
                      <strong>{user.fullName}</strong>
                      <span style={userDropdownEmail}>{user.email}</span>
                    </div>
                    <div style={userDropdownDivider} />
                    <motion.button
                      onClick={handleLogout}
                      style={userDropdownLogout}
                      whileHover={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
                    >
                      <span style={dropdownLogoutIcon}>🚪</span>
                      Sign Out
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

        {/* REMOVED the motion.div wrapper that was affecting pages */}
        <Outlet />
      </main>

      <FloatingInstallButton />

      <style>
        {`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body, #root {
            height: 100%;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
          }

          main {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
          
          main::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          main::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          
          main::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          
          main::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          @media (max-width: 900px) {
            .mobile-hamburger {
              display: flex !important;
            }
          }

          .sidebar {
            z-index: 50 !important;
          }

          .mobile-backdrop {
            z-index: 40 !important;
          }

          header {
            z-index: 10 !important;
          }

          .notifications-dropdown,
          [class*="Notifications"] [style*="position: fixed"],
          [class*="Notifications"] [style*="position: absolute"] {
            z-index: 9999999 !important;
          }
        `}
      </style>
    </div>
  );
}

const containerStyle = {
  height: "100vh",
  width: "100vw",
  background: "#f8fafc",
  position: "relative",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
  background: "#b3b3b3d5",
  boxShadow: "2px 0 12px rgba(0, 0, 0, 0.05)",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
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

const logoText = {
  flex: 1,
};

const logoTitle = {
  color: "#1e293b",
  fontSize: "13px",
  fontWeight: "700",
  margin: 0,
  lineHeight: "1.3",
  letterSpacing: "0.5px",
};

const logoSubtitle = {
  color: "#64748b",
  fontSize: "11px",
  margin: "4px 0 0",
  fontWeight: "500",
};

const userBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  background: "#f8fafc",
  borderRadius: "12px",
  marginBottom: "24px",
  border: "1px solid #e2e8f0",
};

const userBadgeAvatar = {
  width: "44px",
  height: "44px",
  borderRadius: "44px",
  objectFit: "cover",
  border: "2px solid #3b83f600",
};

const userBadgeFallback = {
  width: "44px",
  height: "44px",
  borderRadius: "44px",
  background: "linear-gradient(135deg, #f63b3b, #5025ebc5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "600",
  color: "#fff",
};

const userBadgeInfo = {
  flex: 1,
};

const userBadgeName = {
  display: "block",
  color: "#1e293b",
  fontSize: "15px",
  fontWeight: "600",
  marginBottom: "2px",
};

const userBadgeRole = {
  display: "block",
  color: "#64748b",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const navContainer = (shadow) => ({
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

// NEW: Card styles for navigation (replaces old navItemStyle)
const navCardStyle = (isActive) => ({
  padding: "12px 16px",
  borderRadius: "12px",
  textDecoration: "none",
  color: isActive ? "#00ff55" : "#475569",
  fontWeight: isActive ? "600" : "500",
  fontSize: "14px",
  fontFamily: "'Inter', sans-serif",
  backgroundColor: isActive ? "#9c9c9c" : "#ffffff",
  border: isActive ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  position: "relative",
  transition: "all 0.2s",
  cursor: "pointer",
  boxShadow: isActive ? "0 2px 4px rgba(59, 130, 246, 0.1)" : "none",
});

const navCardIcon = {
  fontSize: "20px",
  width: "28px",
};

const navCardLabel = (isActive) => ({
  color: isActive ? "#ffffff" : "#475569",
  fontWeight: isActive ? "600" : "500",
});

const activeIndicatorStyle = {
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  width: "3px",
  height: "20px",
  background: "#ff0000",
  borderRadius: "0 3px 3px 0",
};

const sidebarFooterStyle = {
  marginTop: "20px",
};

const sidebarFooterDivider = {
  height: "1px",
  background: "#e2e8f0",
  margin: "16px 0",
};

const sidebarLogoutButton = {
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
    marginBottom: "49px",

  gap: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const logoutIconStyle = {
  fontSize: "16px",
};

// CHANGED: Removed padding so pages control their own spacing
const mainContentStyle = (isMobile, menuOpen) => ({
  marginLeft: isMobile ? 0 : "280px",
  padding: 0,  // REMOVED: was "20px" on desktop
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
  borderRadius: "5px",
  padding: "0px 20px",
  marginBottom: "0px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
  border: "1px solid #e2e8f0",
  position: "sticky",
  top: 0,
  zIndex: 30,
  flexShrink: 0,
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
  "@media (max-width: 900px)": {
    display: "flex",
  },
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
  "@media (max-width: 900px)": {
    fontSize: "16px",
  },
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  position: "relative",
  zIndex: 31,
  "@media (max-width: 900px)": {
    gap: "12px",
  },
};

const enhancedNotificationWrapperStyle = {
  position: "relative",
  zIndex: 999999,
  isolation: "isolate",
  background: "#f1f5f9",
  borderRadius: "12px",
  padding: "0px",
  border: "1px solid #e2e8f0",
  transition: "all 0.2s ease",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const userMenuContainerStyle = {
  position: "relative",
  zIndex: 100,
};

const userMenuTriggerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "6px 12px",
  borderRadius: "40px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  position: "relative",
  zIndex: 101,
  "@media (max-width: 900px)": {
    padding: "4px 8px",
  },
};

const headerAvatarStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "36px",
  objectFit: "cover",
  border: "2px solid #3b83f600",
  "@media (max-width: 900px)": {
    width: "32px",
    height: "32px",
  },
};

const headerAvatarFallbackStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "36px",
  background: "linear-gradient(135deg, #f3052d, #2563eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: "600",
  color: "#fff",
  "@media (max-width: 900px)": {
    width: "32px",
    height: "32px",
    fontSize: "14px",
  },
};

const userNameStyle = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  "@media (max-width: 900px)": {
    display: "none",
  },
};

const dropdownArrowStyle = {
  color: "#94a3b8",
  fontSize: "10px",
  "@media (max-width: 900px)": {
    display: "none",
  },
};

const userDropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "240px",
  background: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
  zIndex: 102,
  overflow: "hidden",
  "@media (max-width: 900px)": {
    width: "200px",
  },
};

const userDropdownHeader = {
  padding: "12px 16px",
  borderBottom: "1px solid #e2e8f0",
};

const userDropdownEmail = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  marginTop: "4px",
};

const userDropdownDivider = {
  height: "1px",
  background: "#e2e8f0",
};

const userDropdownLogout = {
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  color: "#ef4444",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const dropdownLogoutIcon = {
  fontSize: "16px",
};

// REMOVED: contentStyle - no longer needed since we removed the wrapper

export default Layout;