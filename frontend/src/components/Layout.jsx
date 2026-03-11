// frontend/src/components/Layout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/zuca-logo.png";
import bg from "../assets/background1.webp";
import Notifications from "./Notifications";
import BASE_URL from "../api";

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

  // Handle resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile when resizing from desktop to mobile
      if (mobile) {
        setMenuOpen(false);
      } else {
        // Auto-open on desktop
        setMenuOpen(true);
      }
    };
    
    window.addEventListener("resize", handleResize);
    // Set initial state
    handleResize();
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle click outside to close sidebar on mobile
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

  // Handle click outside user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add scroll shadow effect
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
    { path: "/join-jumuia", label: "Join Jumuia", icon: "👥" },
    { path: "/announcements", label: "Announcements", icon: "📢" },
    { path: "/mass-programs", label: "Mass Programs", icon: "⛪" },
    { path: "/contributions", label: "Contributions", icon: "💰" },
    { path: "/jumuia-contributions", label: "Jumuia Contributions", icon: "🤝" },
    { path: "/chat", label: "Chat", icon: "💬" },
  ];

  return (
    <div style={containerStyle(bg)}>
      {/* Gradient Overlay - Lower z-index */}
      <div style={overlayStyle} />

      {/* Backdrop for mobile only - Medium z-index */}
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

      {/* Sidebar - Medium z-index */}
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
        {/* Logo Section */}
        <div style={logoSection}>
          <motion.img 
            src={logo} 
            alt="ZUCA Logo" 
            style={logoStyle}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
          <div style={logoText}>
            <h3 style={logoTitle}>ZETECH UNIVERSITY</h3>
            <p style={logoSubtitle}>Catholic Action</p>
          </div>
        </div>

        {/* User Info Badge */}
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

        {/* Navigation Links */}
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
                    style={navItemStyle(isActive)}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span style={navIconStyle}>{item.icon}</span>
                    <span>{item.label}</span>
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

        {/* Sidebar Footer */}
        <div style={sidebarFooterStyle}>
          <div style={sidebarFooterDivider} />
          <motion.button
            onClick={handleLogout}
            style={sidebarLogoutButton}
            whileHover={{ backgroundColor: "rgba(239,68,68,0.2)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={logoutIconStyle}>🚪</span>
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main style={mainContentStyle(isMobile, menuOpen)}>
        {/* Top Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={headerStyle}
        >
          <div style={headerLeftStyle}>
            {/* Hamburger Menu Button - visible on mobile only */}
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              style={hamburgerStyle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="mobile-hamburger"
            >
              <span style={hamburgerIconStyle}>{menuOpen ? "✕" : "☰"}</span>
            </motion.button>

            {/* Page Title - can be dynamic based on route */}
            <span style={pageTitleStyle}>Dashboard</span>
          </div>

          <div style={headerRightStyle}>
            {/* Notifications - Highest z-index component */}
            <div style={notificationWrapperStyle}>
              <Notifications userId={user.id} />
            </div>

            {/* User Menu */}
            <div ref={userMenuRef} style={userMenuContainerStyle}>
              <motion.div
                style={userMenuTriggerStyle}
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
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
                      whileHover={{ backgroundColor: "#fee2e2", color: "#ef4444" }}
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

        {/* Page Content - This is where your pages render */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={contentStyle}
          className="page-content"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Global styles - CRITICAL FOR SCROLLING */}
      <style>
        {`
          @keyframes gradientMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          /* FIXED: Proper scrolling for entire app */
          html, body, #root {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            overflow: visible; /* or just remove it entirely */ /* Prevent double scrollbars */
          }

          body {
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* Main content area - THIS IS THE KEY SCROLLING CONTAINER */
          main {
            height: 100vh !important;
            overflow-y: auto !important;
            overflow-x: visible !important;
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
          }

          /* Page content container */
          .page-content {
            height: calc(100% - 80px) !important; /* Adjust based on header height */
            overflow-y: auto !important;
            overflow-x: auto !important;
            padding-bottom: 20px;
          }

          /* Ensure all pages can scroll */
          .page-content > * {
            height: auto;
            min-height: 100%;
          }

          /* Force all admin pages to scroll properly */
          .contributions-page,
          .users-page,
          .admin-page,
          .chat-monitor-page,
          .jumuia-management-page,
          .dashboard-page,
          .announcements-page,
          .mass-programs-page,
          .chat-page,
          .jumuia-contributions-page,
          .join-jumuia-page {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }

          /* Custom Scrollbar Styling */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.4);
          }

          /* Sidebar scrollbar */
          .sidebar-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
          }
          .sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          /* Mobile Responsive */
          @media (max-width: 900px) {
            .mobile-hamburger {
              display: flex !important;
            }
            
            main {
              height: 100vh !important;
            }
          }

          /* Z-index hierarchy */
          .sidebar {
            z-index: 50 !important;
          }

          .mobile-backdrop {
            z-index: 40 !important;
          }

          .user-dropdown {
            z-index: 100 !important;
          }

          header {
            z-index: 30 !important;
          }

          /* Notifications - highest */
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

// ==================== Styles ====================

const containerStyle = (bg) => ({
  minHeight: "100vh",
  height: "100vh",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  position: "relative",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  overflow: "hidden", // Prevent double scrollbars
});

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(-45deg, rgba(49,15,221,0.7), rgba(0,0,0,0.8), rgba(49,15,221,0.7))",
  backgroundSize: "400% 400%",
  animation: "gradientMove 15s ease infinite",
  zIndex: 0,
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(13, 13, 13, 0.28)",
  backdropFilter: "blur(4px)",
  zIndex: 40,
};

const sidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  height: "100vh",
  width: "280px",
  background: "rgba(22, 82, 210, 0.29)",
  backdropFilter: "blur(10px)",
  borderRight: "1px solid rgba(255,255,255,0.1)",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
  boxShadow: "4px 0 20px rgba(0,0,0,0.2)",
  overflowY: "hidden", // Sidebar itself doesn't scroll, its content does
};

const logoSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "16px 12px",
  marginBottom: "20px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const logoStyle = {
  width: "48px",
  height: "auto",
  borderRadius: "12px",
};

const logoText = {
  flex: 1,
};

const logoTitle = {
  color: "#fff",
  fontSize: "14px",
  fontWeight: "700",
  margin: 0,
  lineHeight: "1.4",
};

const logoSubtitle = {
  color: "rgba(255,255,255,0.6)",
  fontSize: "15px",
  margin: "4px 0 0",
  fontWeight: "600"
};

const userBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  background: "rgba(255,255,255,0.03)",
  borderRadius: "12px",
  marginBottom: "24px",
  border: "1px solid rgba(255,255,255,0.05)",
};

const userBadgeAvatar = {
  width: "40px",
  height: "40px",
  borderRadius: "40px",
  objectFit: "cover",
  border: "2px solid #00c6ff",
};

const userBadgeFallback = {
  width: "40px",
  height: "40px",
  borderRadius: "40px",
  background: "linear-gradient(135deg, #00c6ff, #007bff)",
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
  color: "#fff",
  fontSize: "14px",
  fontWeight: "500",
  marginBottom: "2px",
};

const userBadgeRole = {
  display: "block",
  color: "rgba(255,255,255,0.5)",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const navContainer = (shadow) => ({
  flex: 1,
  overflowY: "auto", // This makes the nav scrollable
  paddingRight: "8px",
  transition: "box-shadow 0.3s",
  boxShadow: shadow ? "inset 0 8px 10px -8px rgba(0,0,0,0.3)" : "none",
});

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const navItemStyle = (isActive) => ({
  padding: "12px 16px",
  borderRadius: "12px",
  textDecoration: "none",
  color: isActive ? "#fff" : "#fff",
  fontWeight: "800",
  fontSize: "14px",
  backgroundColor: isActive ? "rgba(0, 200, 255, 0.63)" : "transparent",
  border: isActive ? "1px solid rgba(0,198,255,0.3)" : "1px solid transparent",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  position: "relative",
  transition: "all 0.2s",
  cursor: "pointer",
});

const navIconStyle = {
  fontSize: "18px",
  width: "24px",
};

const activeIndicatorStyle = {
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  width: "3px",
  height: "20px",
  background: "linear-gradient(180deg, #00c6ff, #007bff)",
  borderRadius: "0 3px 3px 0",
};

const sidebarFooterStyle = {
  marginTop: "20px",
};

const sidebarFooterDivider = {
  height: "3px",
  background: "rgba(255, 255, 255, 0.9)",
  margin: "19px 0",
};

const sidebarLogoutButton = {
  width: "70%",
  padding: "8px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgb(229, 26, 26)",
  color: "rgba(255, 255, 255, 0.96)",
  fontSize: "14px",
  fontWeight: "800",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const logoutIconStyle = {
  fontSize: "16px",
};

// FIXED: Main content style - THIS IS THE KEY
const mainContentStyle = (isMobile, menuOpen) => ({
  marginLeft: isMobile ? 0 : "280px",
  padding: "24px",
  position: "relative",
  zIndex: 1,
  height: "100vh", // Fixed height instead of min-height
  overflowY: "auto", // THIS ENABLES SCROLLING
  overflowX: "hidden",
  transition: "margin-left 0.3s ease",
});

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(69, 63, 63, 0.36)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: "12px 20px",
  marginBottom: "24px",
  border: "1px solid rgba(27, 25, 25, 0.83)",
  position: "relative",
  zIndex: 30,
  flexShrink: 0, // Prevent header from shrinking
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const hamburgerStyle = {
  display: "none",
  background: "rgba(145, 137, 137, 0.35)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "10px",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
};

const hamburgerIconStyle = {
  color: "#ffffff",
  fontSize: "30px",
};

const pageTitleStyle = {
  color: "#ffffff",
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

const notificationWrapperStyle = {
  position: "relative",
  zIndex: 999999,
  isolation: "isolate",
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
  background: "rgba(255, 255, 255, 0.22)",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  position: "relative",
  zIndex: 101,
};

const headerAvatarStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "36px",
  objectFit: "cover",
  border: "2px solid #00c6ff",
};

const headerAvatarFallbackStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "36px",
  background: "linear-gradient(135deg, #00c6ff, #007bff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: "600",
  color: "#fff",
};

const userNameStyle = {
  color: "#00b2f8",
  fontSize: "14px",
  fontWeight: "800",
};

const dropdownArrowStyle = {
  color: "rgba(255, 255, 255, 0.16)",
  fontSize: "10px",
};

const userDropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "240px",
  background: "#1a658d",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
  zIndex: 102,
  overflow: "hidden",
};

const userDropdownHeader = {
  padding: "12px 16px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.72)",
};

const userDropdownEmail = {
  display: "block",
  color: "rgba(255, 255, 255, 0.93)",
  fontSize: "12px",
  marginTop: "4px",
};

const userDropdownDivider = {
  height: "1px",
  background: "rgba(255,255,255,0.1)",
};

const userDropdownLogout = {
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  color: "#ed1717",
  fontSize: "14px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const dropdownLogoutIcon = {
  fontSize: "16px",
};

// FIXED: Content style - where your pages actually render
const contentStyle = {
  height: "calc(100% - 80px)", // Subtract header height
  overflowY: "auto",
  overflowX: "auto",
  position: "relative",
  zIndex: 1,
  paddingRight: "4px", // Space for scrollbar
};

export default Layout;