// frontend/src/components/Layout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/zuca-logo.png";
import bg from "../assets/background.webp";
import Notifications from "./Notifications"; // adjust path if needed
import BASE_URL from "../api";

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
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
    window.location.href = "/login";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      {/* Gradient Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(-45deg, rgba(49,15,221,0.5), rgba(0,0,0,0.6), rgba(49,15,221,0.5))",
          backgroundSize: "400% 400%",
          animation: "gradientMove 15s ease infinite",
          zIndex: 0,
        }}
      />

      {/* Sidebar */}
      <div className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div style={logoCard}>
          <img src={logo} alt="ZUCA Logo" width="70" />
          <h3 style={{ fontSize: "15px", color: "white" }}>
            ZETECH UNIVERSITY <br /> CATHOLIC ACTION
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <SidebarLink to="/dashboard">Dashboard</SidebarLink>
          <SidebarLink to="/announcements">Announcements</SidebarLink>
          <SidebarLink to="/mass-programs">Mass Programs</SidebarLink>
          <SidebarLink to="/contributions">Contributions</SidebarLink>
          <SidebarLink to="/chat">Chat</SidebarLink>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <div className="top-header" style={topHeaderStyle}>
          {/* Left: Hamburger + User */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={hamburgerStyle}
              className="mobile-hamburger"
            >
              ☰
            </button>

            {/* User Profile */}
            <div style={userHeader}>
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" style={headerAvatar} />
              ) : (
                <div style={headerAvatarFallback}>
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: "8px",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                  Hello, {user.fullName.split(" ")[0]} 👋
                </span>
                <span style={{ fontSize: "12px", opacity: 0.7 }}>
                  {user.fullName}
                </span>
                <span style={{ fontSize: "12px", opacity: 0.7 }}>
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Notifications + Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {/* Notifications Bell */}
            <Notifications userId={user.id} />

            {/* Logout Button */}
            <button onClick={handleLogout} style={logoutBtnHeader}>
              Logout
            </button>
          </div>
        </div>

        {/* Page content */}
        <Outlet />

        {/* Styles */}
        <style>
          {`
            @keyframes gradientMove {
              0% {background-position: 0% 50%;}
              50% {background-position: 100% 50%;}
              100% {background-position: 0% 50%;}
            }

            .sidebar {
              position: fixed;
              left: 0;
              top: 0;
              height: 100%;
              width: 260px;
              background: rgba(24, 23, 28, 0.66);
              padding: 25px;
              display: flex;
              flex-direction: column;
              gap: 80px;
              z-index: 10;
              transition: transform 0.3s ease;
            }

            .sidebar.open {
              transform: translateX(0);
            }

            .main-content {
              margin-left: 280px;
              padding: 30px;
              position: relative;
              z-index: 1;
            }

            @media (max-width: 900px) {
              .sidebar {
                transform: translateX(-100%);
              }
              .sidebar.open {
                transform: translateX(0);
              }
              .main-content {
                margin-left: 0;
                padding: 20px;
              }
              .mobile-hamburger {
                display: inline-block;
                z-index: 20;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}

// Sidebar Link Component
function SidebarLink({ to, children }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => {
        return {
          padding: "14px",
          borderRadius: "10px",
          textDecoration: "none",
          color: "white",
          fontWeight: "500",
          backgroundColor: isActive
            ? "rgba(255, 255, 255, 0.23)"
            : "rgba(255,255,255,0.08)",
        };
      }}
      onClick={() => {
        if (window.innerWidth <= 900) {
          document.querySelector(".sidebar")?.classList.remove("open");
        }
      }}
    >
      {children}
    </NavLink>
  );
}

// Styles
const logoCard = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "20px",
  marginTop: "55px",
  backgroundColor: "rgba(255,255,255,0.1)",
  borderRadius: "12px",
};

const topHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(0,0,0,0.5)",
  padding: "12px 20px",
  borderRadius: "12px",
  marginBottom: "20px",
  color: "white",
  gap: "10px",
};

const userHeader = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const headerAvatar = {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #0bf122",
};

const headerAvatarFallback = {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  background: "#4e73df",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  fontWeight: "bold",
  color: "white",
};

const logoutBtnHeader = {
  padding: "6px 12px",
  borderRadius: "20px",
  border: "none",
  background: "#f60909",
  color: "white",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const hamburgerStyle = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
};

export default Layout;