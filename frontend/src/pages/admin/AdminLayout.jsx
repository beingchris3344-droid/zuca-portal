import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import backgroundImg from "../../assets/background.png";
import logoImg from "../../assets/zuca-logo.png";

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = [
    { label: "Dashboard", path: "" },
    { label: "Users", path: "users" },
    { label: "Activity", path: "activity" },
    { label: "Analytics", path: "analytics" },
    { label: "Songs Program", path: "songs" },
    { label: "Announcements", path: "announcements" },
    { label: "Contributions", path: "contributions" },
    { label: "Chat Monitor", path: "chat" },
    { label: "Security / Reset", path: "security" },
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div style={pageStyle}>
      {/* ===== Top bar for mobile only ===== */}
      {isMobile && (
        <div style={topBarStyle}>
          <button style={menuBtnStyle} onClick={() => setMenuOpen(true)}>☰</button>
          <img src={logoImg} alt="Logo" style={{ height: 34 }} />
          <p style={{ fontWeight: "800", color: "#ffffff", textDecoration: "underline", textDecorationColor: "#ffffff", textDecorationThickness: "2px" }}> ZUCA PORTAL</p>
        </div>
      )}

      {/* ===== Sidebar ===== */}
      <aside
        style={{
          ...sidebarStyle,
          transform: isMobile ? (menuOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
          position: isMobile ? "fixed" : "sticky",
        }}
      >
        <img src={logoImg} alt="Logo" style={logoStyle} />

        <nav
  style={{
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? 8 : 4,  // reduce gap on mobile
  }}
>
  {navItems.map((item, idx) => (
    <NavLink
      key={idx}
      to={item.path}
      end={item.path === ""}
      onClick={() => isMobile && setMenuOpen(false)}
      style={({ isActive }) => ({
        ...navItemStyle,
        background: isActive ? "#ffffff" : "transparent",
        color: isActive ? "#0f172a" : "#ffffff",
        padding: isMobile ? "8px 12px" : "12px 16px", // smaller padding on mobile
        fontSize: isMobile ? 14 : 16, // optional: smaller font on mobile
      })}
    >
      {item.label}
    </NavLink>
  ))}
</nav>

        <button onClick={handleLogout} style={logoutBtnStyle}>
          Logout
        </button>
      </aside>

      {/* ===== Overlay for mobile only ===== */}
      {isMobile && menuOpen && <div style={overlayStyle} onClick={() => setMenuOpen(false)} />}

      {/* ===== Main Content ===== */}
      <main style={mainContentStyle}>
        <Outlet />
      </main>
    </div>
  );
}

/* ===================== STYLES ===================== */

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  background: `url(${backgroundImg}) center / cover no-repeat`,
  fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
};

const topBarStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 80,
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "0 16px",
  background: "rgba(14, 16, 23, 0.69)",
  backdropFilter: "blur(14px)",
  zIndex: 1100,
};

const menuBtnStyle = {
  fontSize: 22,
  background: "none",
  border: "none",
  color: "#ffffff",
  cursor: "pointer",
};

const sidebarStyle = {
  width: 270,
  padding: "30px 20px",
  background: "rgba(10, 12, 17, 0.34)",
  backdropFilter: "blur(20px)",
  color: "#ffffff",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.3s ease",
  borderRadius: "20px",
  zIndex: 1200,
  height: "102vh",
};

const logoStyle = {
  width: 100,
  marginBottom: 20,
  alignSelf: "center",
};
<h1 style={{ textAlign: "center", color: "#ffffff", fontSize: "24px", marginTop: "20px" }}>ZETECH UNIVERSITY CATHOLIC</h1>

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const navItemStyle = {
  padding: "12px 16px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 500,
  transition: "0.25s ease",
};

const logoutBtnStyle = {
  marginTop: "auto",
  padding: "12px",
  borderRadius: 25,
  border: "none",
  background: "#ef4444",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.44)",
  zIndex: 1000,
};

const mainContentStyle = {
  flex: 1,
  padding: "80px 3px 0px",
  width: "100%",
};