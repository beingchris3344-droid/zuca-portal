// frontend/src/components/Layout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/zuca-logo.png";
import Notifications from "./Notifications";
import axios from "axios";
import BASE_URL from "../api";
import AnimatedBackground from "./AnimatedBackground";
import FloatingInstallButton from "./FloatingInstallButton";
import {
  FiHome, FiCalendar, FiBook, FiImage, FiUsers, FiBell,
  FiDollarSign, FiMusic, FiMessageSquare, FiUserCheck,
  FiAward, FiYoutube, FiMapPin, FiLogOut, FiChevronDown,
} from "react-icons/fi";
import {
  FaYoutube, FaChurch, FaMoneyBillWave, FaMusic, FaComments,
  FaUserTie, FaImages, FaPhotoVideo, FaUsers, FaCalendar,
  FaRegCalendar, FaThLarge, FaDonate, FaHandHoldingHeart,
  FaDove, FaPrayingHands, FaGamepad, FaCalendarPlus,
  FaFileAlt, FaFileExcel, FaFileArchive, FaFileImport,
  FaBirthdayCake, FaUser, FaRegFilePdf, FaSun,
} from "react-icons/fa";
import { api } from "../api";
import { io } from "socket.io-client";
import { GiGamepad, GiPrayerBeads } from "react-icons/gi";
import { toggleDark } from "../utils/darkReader";


// Messenger Icon with Badge Component
const MessengerIcon = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get("/api/messenger/unread/count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(res.data.unreadCount);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();

    const socket = io(BASE_URL, {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") },
    });

    socket.on("dm:new_message", () => setUnreadCount((prev) => prev + 1));
    socket.on("dm:message_read", () => fetchUnreadCount());

    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.9z" />
        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
        <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
      </svg>
      {unreadCount > 0 && (
        <span className="messenger-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
      )}
    </div>
  );
};


function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarShadow, setSidebarShadow] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const scrollContainerRef = useRef(null);
  const userMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const [jumuiaName, setJumuiaName] = useState("");
  const [isJumuiaLoading, setIsJumuiaLoading] = useState(true);
  const [isExecutive, setIsExecutive] = useState(false);
  const [loadingExecutive, setLoadingExecutive] = useState(true);

  // Fetch user details including jumuia name
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = response.data;
        if (userData.homeJumuia?.name) setJumuiaName(userData.homeJumuia.name);
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user details", error);
      } finally {
        setIsJumuiaLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  // Check if user has executive position
  useEffect(() => {
    const checkExecutiveStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadingExecutive(false);
        return;
      }

      try {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const response = await axios.get(
          `${BASE_URL}/api/executive/check-user/${userData.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsExecutive(response.data.hasPosition || false);
      } catch (error) {
        console.error("Error checking executive status:", error);
        setIsExecutive(false);
      } finally {
        setLoadingExecutive(false);
      }
    };

    checkExecutiveStatus();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (mobile) setMenuOpen(false);
      else setMenuOpen(true);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
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

  const profileImageUrl = user.profileImage
    ? user.profileImage.startsWith("http")
      ? user.profileImage
      : `${BASE_URL}/${user.profileImage}`
    : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // ==================== SECTIONED NAVIGATION ====================
  const navSections = [
    {
      label: "Main",
      items: [
        { path: "/dashboard", label: "Home", icon: <FaThLarge /> },
        { path: "/announcements", label: "Announcements", icon: <FiBell /> },
        { path: "/schedules", label: "Semester Schedule", icon: <FaCalendarPlus /> },
        { path: "/mass-programs", label: "Mass Programs", icon: <FaFileAlt /> },
        { path: "/liturgical-calendar", label: "Liturgical Calendar", icon: <FaRegCalendar /> },
         { path: "/member/attendance", label: "Attendance/Records", icon: <FaUsers color="#ee0e46" /> },
      ],
    },
    {
      label: "ZUCA Family",
      items: [
        { path: "/join-jumuia", label: "Join a Jumuia", icon: <FaPrayingHands /> },
        {
          path: "/jumuia-contributions",
          label: `JUMUIA - ${jumuiaName ? jumuiaName : "My Jumuia"}`,
          icon: <FaDove  /> ,
        },
       
        { path: "/executive", label: "Executive Team", icon: <FaUserTie /> },
        ...(isExecutive || user?.role === "admin" || user?.specialRole === "admin"
          ? [
              {
                path: "/executive/minutes",
                label: "Meeting Minutes",
                icon: <FaRegFilePdf />,
              },
            ]
          : []),
      ],
    },
    {
      label: "Z-Resources",
      items: [
        { path: "/hymns", label: "Lyrics Book", icon: <FiMusic /> },
        { path: "/prayer", label: "Prayer Book", icon: <GiPrayerBeads /> },
        { path: "/youtube", label: "ZUCA / TUBE", icon: <FaYoutube /> },
      ],
    },
    {
      label: "Media & Social",
      items: [
        { path: "/gallery", label: "Gallery", icon: <FaImages /> },
        { path: "/messenger", label: "Messages", icon: <FiMessageSquare /> },
        { path: "/chat", label: "Chat", icon: <FaComments /> },
        { path: "/games", label: "Games Arcade", icon: <FaGamepad /> },
      ],
    },
    {
      label: "Finance",
      items: [
        { path: "/contributions", label: "Contributions", icon: <FaHandHoldingHeart /> },
      ],
    },
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
        animate={{ x: menuOpen ? 0 : isMobile ? "-100%" : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={sidebarStyle}
      >
        {/* ---------- BRAND ---------- */}
        <div style={logoSection}>
          <img src={logo} alt="ZUCA Logo" style={logoStyle} />
          <div style={logoText}>
            <h3 style={logoTitle}>ZETECH UNIVERSITY</h3>
            <p style={logoSubtitle}>Catholic Action</p>
          </div>
        </div>

        {/* ---------- USER BADGE ---------- */}
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

        {/* ---------- ROLE SWITCHER ---------- */}
        {(user?.specialRole || user?.role === "admin") && (
          <>
            {user?.role === "admin" && user?.specialRole ? (
              <div style={{ marginBottom: "16px", position: "relative" }}>
                <select
                  onChange={async (e) => {
                    const targetRole = e.target.value;
                    if (!targetRole) return;

                    const selectEl = e.target;
                    const wrapperEl = selectEl.parentElement;

                    const loadingDiv = document.createElement("div");
                    loadingDiv.innerHTML = `
                      <span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;"></span>
                      Switching...
                    `;
                    loadingDiv.style.cssText = `
                      position: absolute;
                      inset: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      background: #05e448e3;
                      color: white;
                      font-size: 13px;
                      font-weight: 600;
                      borderRadius: 8px;
                      zIndex: 10;
                    `;
                    wrapperEl.appendChild(loadingDiv);
                    selectEl.style.visibility = "hidden";

                    try {
                      const token = localStorage.getItem("token");
                      const res = await axios.post(
                        `${BASE_URL}/api/switch-role`,
                        { targetRole },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );

                      localStorage.setItem("token", res.data.token);
                      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                      storedUser.role = res.data.role;
                      storedUser.jumuiaCode = res.data.jumuiaCode || storedUser.homeJumuia?.code;
                      localStorage.setItem("user", JSON.stringify(storedUser));

                      if (targetRole === "member") window.location.href = "/dashboard";
                      else if (targetRole === "jumuia_leader") {
                        const code = res.data.jumuiaCode || user?.homeJumuia?.code;
                        window.location.href = code ? `/jumuia/${code.toLowerCase()}` : "/leader";
                      } else if (targetRole === "admin") window.location.href = "/admin";
                      else if (targetRole === "secretary") window.location.href = "/secretary";
                      else if (targetRole === "treasurer") window.location.href = "/treasurer";
                      else if (targetRole === "choir_moderator") window.location.href = "/choir";
                      else if (targetRole === "media_moderator") window.location.href = "/media-moderator";
                    } catch (err) {
                      loadingDiv.remove();
                      selectEl.style.visibility = "visible";
                      selectEl.value = "";
                      alert("Failed to switch role");
                    }
                  }}
                  style={roleSwitchSelectStyle}
                >
                  <option value="">Switch Role...</option>
                  {window.location.pathname.startsWith("/admin") ||
                  window.location.pathname.startsWith("/jumuia") ||
                  window.location.pathname.startsWith("/secretary") ||
                  window.location.pathname.startsWith("/treasurer") ||
                  window.location.pathname.startsWith("/choir") ||
                  window.location.pathname.startsWith("/leader") ||
                  window.location.pathname.startsWith("/media-moderator") ? (
                    <option value="member">Back to Member Mode</option>
                  ) : (
                    <>
                      <option value="admin">Admin Mode</option>
                      <option value={user.specialRole}>
                        {user.specialRole?.replace(/_/g, " ").toUpperCase()} Mode
                      </option>
                    </>
                  )}
                </select>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  const originalHTML = btn.innerHTML;

                  btn.innerHTML = `
                    <span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;"></span>
                    Switching...
                  `;
                  btn.style.opacity = "0.7";
                  btn.style.pointerEvents = "none";

                  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                  const isOnRolePage =
                    window.location.pathname.includes("/admin") ||
                    window.location.pathname.includes("/secretary") ||
                    window.location.pathname.includes("/treasurer") ||
                    window.location.pathname.includes("/choir") ||
                    window.location.pathname.includes("/leader") ||
                    window.location.pathname.includes("/media-moderator");
                  const targetRole = isOnRolePage ? "member" : user.specialRole || user.role;

                  try {
                    const token = localStorage.getItem("token");
                    const res = await axios.post(
                      `${BASE_URL}/api/switch-role`,
                      { targetRole },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    localStorage.setItem("token", res.data.token);
                    storedUser.role = res.data.role;
                    storedUser.jumuiaCode = res.data.jumuiaCode || storedUser.homeJumuia?.code;
                    localStorage.setItem("user", JSON.stringify(storedUser));

                    if (targetRole === "member") window.location.href = "/dashboard";
                    else if (targetRole === "jumuia_leader") {
                      const code = res.data.jumuiaCode || user?.homeJumuia?.code;
                      window.location.href = code ? `/jumuia/${code.toLowerCase()}` : "/leader";
                    } else {
                      const rolePaths = {
                        secretary: "/secretary",
                        treasurer: "/treasurer",
                        choir_moderator: "/choir",
                        admin: "/admin",
                        media_moderator: "/media-moderator",
                      };
                      window.location.href = rolePaths[targetRole] || "/dashboard";
                    }
                  } catch (err) {
                    btn.innerHTML = originalHTML;
                    btn.style.opacity = "1";
                    btn.style.pointerEvents = "auto";
                    alert(err.response?.data?.error || "Failed to switch role. Please try again.");
                  }
                }}
                style={roleSwitchButtonStyle}
              >
                {window.location.pathname.includes("/admin") ||
                window.location.pathname.includes("/secretary") ||
                window.location.pathname.includes("/treasurer") ||
                window.location.pathname.includes("/choir") ||
                window.location.pathname.includes("/leader") ||
                window.location.pathname.includes("/media-moderator")
                  ? "Back to Member Mode"
                  : `Switch to ${(user.specialRole || "ADMIN")?.replace(/_/g, " ").toUpperCase()} Mode`}
              </motion.button>
            )}
          </>
        )}

        {/* ---------- SECTIONED NAVIGATION ---------- */}
        <div ref={scrollContainerRef} style={navContainer(sidebarShadow)}>
          <nav style={navStyle}>
            {navSections.map((section) => (
              <div key={section.label} style={navSectionStyle}>
                <div style={navSectionLabelStyle}>{section.label}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setMenuOpen(false)}
                    style={({ isActive }) => navRowStyle(isActive)}
                  >
                    <span style={navRowIconStyle}>{item.icon}</span>
                    <span style={navRowLabelStyle}>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* ---------- FOOTER / SIGN OUT ---------- */}
        <div style={sidebarFooterStyle}>
          <div style={sidebarFooterDivider} />
          <motion.button
            onClick={handleLogout}
            style={sidebarLogoutButton}
            whileHover={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}
            whileTap={{ scale: 0.98 }}
          >
            <FiLogOut style={logoutIconStyle} />
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mobile-hamburger"
            >
              <span style={hamburgerIconStyle}>{menuOpen ? "✕" : "☰"}</span>
            </motion.button>
            <span style={pageTitleStyle}>Home</span>
          </div>

          <div style={headerRightStyle}>
            <button
              onClick={toggleDark}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "6px",
              }}
              aria-label="Toggle dark mode"
            >
              <FaSun style={{ fontSize: "20px", color: "#f39c12" }} />
            </button>

            <div style={enhancedNotificationWrapperStyle}>
              <Notifications userId={user.id} />
            </div>

            <div ref={userMenuRef} style={userMenuContainerStyle}>
              <motion.div
                style={userMenuTriggerStyle}
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ backgroundColor: "#f1f5f9" }}
                whileTap={{ scale: 0.98 }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={user.fullName.split(" ")[0]}
                    style={headerAvatarStyle}
                  />
                ) : (
                  <div style={headerAvatarFallbackStyle}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={userNameStyle}>{user.fullName.split(" ")[1]}</span>
                <FiChevronDown style={dropdownArrowStyle} />
              </motion.div>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={userDropdownStyle}
                  >
                    <div style={userDropdownHeader}>
                      <strong>{user.fullName}</strong>
                      <span style={userDropdownEmail}>{user.email}</span>
                    </div>
                    <div style={userDropdownDivider} />

                    <motion.button
                      onClick={() => {
                        setShowUserMenu(false);
                        window.location.href = "/profile";
                      }}
                      style={userDropdownItem}
                      whileHover={{ backgroundColor: "#f8fafc" }}
                    >
                      <FaBirthdayCake style={dropdownItemIcon} />
                      Birthday Settings
                    </motion.button>

                    <motion.button
                      onClick={handleLogout}
                      style={{ ...userDropdownItem, color: "#dc2626" }}
                      whileHover={{ backgroundColor: "#fef2f2" }}
                    >
                      <FiLogOut style={dropdownItemIcon} />
                      Sign Out
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

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
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          main {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
          }

          main::-webkit-scrollbar { width: 6px; height: 6px; }
          main::-webkit-scrollbar-track { background: transparent; }
          main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          main::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

          /* Sidebar scrollbar — subtle */
          .sidebar div::-webkit-scrollbar { width: 6px; }
          .sidebar div::-webkit-scrollbar-track { background: transparent; }
          .sidebar div::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
          .sidebar div::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

          @media (max-width: 900px) {
            .mobile-hamburger { display: flex !important; }
          }

          .sidebar { z-index: 50 !important; }
          .mobile-backdrop { z-index: 40 !important; }
          header { z-index: 10 !important; }

          .notifications-dropdown,
          [class*="Notifications"] [style*="position: fixed"],
          [class*="Notifications"] [style*="position: absolute"] {
            z-index: 9999999 !important;
          }

          .messenger-badge {
            position: absolute;
            top: -8px;
            right: -12px;
            background: #25D366;
            color: white;
            font-size: 10px;
            font-weight: 600;
            min-width: 18px;
            height: 18px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }

          select option {
            background: #ffffff;
            color: #0f172a;
            padding: 10px;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Nav link hover & active states */
          .sidebar nav a {
            transition: background 0.15s ease, color 0.15s ease;
          }

          .sidebar nav a:hover {
            background: #f1f5f9;
          }

          .sidebar nav a[aria-current="page"]::before {
            content: "";
            position: absolute;
            left: -12px;
            top: 8px;
            bottom: 8px;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: #4e46e504;
          }

          @media (max-width: 600px) {
            .header-right-wrapper { gap: 2px !important; }
            .notification-wrapper { padding: 2px !important; }
            .user-menu-trigger { padding: 2px 6px !important; }
            .user-name-display { display: none !important; }
          }
        `}
      </style>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

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
  background: "rgba(15, 23, 42, 0.4)",
  backdropFilter: "blur(2px)",
  zIndex: 40,
};

/* ---------- SIDEBAR SHELL ---------- */
const sidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  height: "100vh",
  width: "256px",
  background: "#ffffff",
  borderRight: "1px solid #e2e8f0",
  padding: "16px 12px",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
  overflowY: "hidden",
};

/* ---------- BRAND ---------- */
const logoSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 8px 16px",
  marginBottom: "8px",
  borderBottom: "1px solid #f1f5f9",
};

const logoStyle = {
  width: "40px",
  height: "auto",
  borderRadius: "8px",
};

const logoText = { flex: 1, minWidth: 0 };

const logoTitle = {
  color: "#0f172a",
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
  color: "#94a3b8",
  fontSize: "11px",
  margin: "2px 0 0",
  fontWeight: "500",
};

/* ---------- USER BADGE ---------- */
const userBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px",
  borderRadius: "8px",
  marginTop: "16px",
  marginBottom: "16px",
};

const userBadgeAvatar = {
  width: "36px",
  height: "36px",
  borderRadius: "36px",
  objectFit: "cover",
  flexShrink: 0,
};

const userBadgeFallback = {
  width: "36px",
  height: "36px",
  borderRadius: "36px",
  background: "linear-gradient(135deg, #4af705, #46e553)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
  fontWeight: "600",
  color: "#fff",
  flexShrink: 0,
};

const userBadgeInfo = { flex: 1, minWidth: 0 };

const userBadgeName = {
  display: "block",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "1px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const userBadgeRole = {
  display: "block",
  color: "#94a3b8",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  fontWeight: "600",
};

/* ---------- ROLE SWITCHER ---------- */
const roleSwitchSelectStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  color: "#0f172a",
  cursor: "pointer",
  outline: "none",
  marginBottom: "16px",
  transition: "all 0.15s ease",
};

const roleSwitchButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "9px 12px",
  background: "#46e569e1",
  color: "#080808",
  border: "none",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  width: "100%",
  marginBottom: "16px",
  transition: "background 0.15s ease",
};

/* ---------- NAV CONTAINER ---------- */
const navContainer = (shadow) => ({
  flex: 1,
  overflowY: "auto",
  paddingRight: "2px",
  transition: "box-shadow 0.3s",
  boxShadow: shadow ? "inset 0 8px 10px -8px rgba(0,0,0,0.05)" : "none",
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
  color: "#94a3b8",
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
  color: isActive ? "#0f0f0fee" : "#475569",
  background: isActive ? "#eef2ff" : "transparent",
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

/* ---------- SIDEBAR FOOTER ---------- */
const sidebarFooterStyle = {
  marginTop: "auto",
  paddingTop: "8px",
};

const sidebarFooterDivider = {
  height: "1px",
  background: "#f1f5f9",
  margin: "8px 0 12px",
};

const sidebarLogoutButton = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const logoutIconStyle = {
  fontSize: "16px",
};

/* ---------- MAIN CONTENT ---------- */
const mainContentStyle = (isMobile, menuOpen) => ({
  marginLeft: isMobile ? 0 : "256px",
  padding: 0,
  position: "relative",
  zIndex: 1,
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  transition: "margin-left 0.3s ease",
  width: isMobile ? "100%" : `calc(100% - 256px)`,
  background: "#f8fafc",
});

/* ---------- HEADER ---------- */
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#ffffff",
  padding: "10px 20px",
  marginBottom: "0px",
  borderBottom: "1px solid #e2e8f0",
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
  background: "transparent",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  width: "36px",
  height: "36px",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
};

const hamburgerIconStyle = {
  color: "#475569",
  fontSize: "18px",
  fontWeight: "700",
  lineHeight: 1,
};

const pageTitleStyle = {
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "600",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
};

const enhancedNotificationWrapperStyle = {
  position: "relative",
  zIndex: 999999,
  isolation: "isolate",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const userMenuContainerStyle = {
  position: "relative",
  zIndex: 100,
  flexShrink: 0,
};

const userMenuTriggerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 8px 4px 4px",
  borderRadius: "999px",
  background: "transparent",
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "background 0.15s ease",
};

const headerAvatarStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "32px",
  objectFit: "cover",
  flexShrink: 0,
};

const headerAvatarFallbackStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "32px",
  background: "linear-gradient(135deg, #63f16a, #1ccf25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: "600",
  color: "#fff",
  flexShrink: 0,
};

const userNameStyle = {
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "600",
};

const dropdownArrowStyle = {
  color: "#94a3b8",
  fontSize: "14px",
};

/* ---------- USER DROPDOWN ---------- */
const userDropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "240px",
  background: "#ffffff",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
  zIndex: 102,
  overflow: "hidden",
};

const userDropdownHeader = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "13px",
  color: "#0f172a",
};

const userDropdownEmail = {
  display: "block",
  color: "#94a3b8",
  fontSize: "11.5px",
  marginTop: "2px",
  fontWeight: "400",
};

const userDropdownDivider = {
  height: "1px",
  background: "#f1f5f9",
};

const userDropdownItem = {
  width: "100%",
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.15s ease",
};

const dropdownItemIcon = {
  fontSize: "15px",
  color: "inherit",
};

export default Layout;