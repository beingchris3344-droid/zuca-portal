import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [clickedCard, setClickedCard] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      const imageUrl = storedUser.profileImage
        ? storedUser.profileImage.startsWith("http")
          ? storedUser.profileImage
          : `${BASE_URL}/${storedUser.profileImage}`
        : null;
      setProfileImage(imageUrl);
    }
    setLoading(false);
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append("profile", file);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);

      const imageUrl = updatedUser.profileImage
        ? updatedUser.profileImage.startsWith("http")
          ? updatedUser.profileImage
          : `${BASE_URL}/${updatedUser.profileImage}`
        : null;
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
    window.location.href = "/login";
  };

  const today = new Date().toLocaleDateString();

  if (loading) return <div style={{ color: "white", padding: "40px" }}>Loading...</div>;
  if (!user) return <div style={{ color: "white", padding: "40px" }}>No user found. Please login.</div>;

  const cards = [
    { title: "Announcements", subtitle: "View latest updates", path: "/announcements" },
    { title: "Mass Programs", subtitle: "Upcoming schedules", path: "/mass-programs" },
    { title: "Contributions", subtitle: "Track your giving", path: "/contributions" },
    { title: "Chat", subtitle: "Connect with members", path: "/chat" },
    { title: "Join Jumuia", subtitle: "Become part of a group", path: "/join-jumuia" },
  ];

  const handleCardClick = (index, path) => {
    setClickedCard(index);
    setTimeout(() => {
      setClickedCard(null);
      navigate(path);
    }, 1000); // 1 second glow animation
  };

  return (
    <div style={pageStyle}>
      {/* ===== PROFILE SECTION ===== */}
      <div style={profileCard}>
        <div style={profileTop}>
          <div style={avatarSection}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" style={avatarImage} />
            ) : (
              <div style={avatarFallback}>{user.fullName.charAt(0).toUpperCase()}</div>
            )}

            <div style={avatarButtons}>
              <label style={uploadBtn}>
                Upload Photo
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>
              {profileImage && (
                <button onClick={handleRemovePhoto} style={removeBtn}>
                  Remove
                </button>
              )}
            </div>
          </div>

          <div style={profileInfo}>
            <span style={memberIdBadge}>ID: ZUCA-{user.membership_number}</span>
            <h2 style={{ marginTop: "10px" }}>{user.fullName}</h2>
            <p style={{ marginTop: "9px", opacity: 0.8 }}>{user.email}</p>

            <div style={badgesContainer}>
              <span style={roleBadge}>{user.role?.toUpperCase() || "MEMBER"}</span>
            </div>

            <p style={{ fontSize: "13px", marginTop: "29px", opacity: 0.7 }}>
              Logged in • {today}
            </p>
          </div>
        </div>

        <button onClick={handleLogout} style={logoutBtn}>
          Logout
        </button>
      </div>

      {/* ===== WELCOME PANEL ===== */}
      <div style={welcomePanel}>
        <h1 style={{ marginBottom: "10px" }}>Welcome back, {user.fullName.split(" ")[0]} 👋</h1>
        <p>This is your personal member dashboard. View announcements, contributions, mass programs, and interact with fellow members.</p>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div style={statsGrid}>
        {cards.map((c, index) => (
          <div
            key={index}
            style={{
              ...statCard,
              boxShadow:
                hoveredCard === index
                  ? "0 0 20px 5px #daf10fc4"
                  : clickedCard === index
                  ? "0 0 0 0 #00ffe7 inset, 0 0 0 0"
                  : statCard.boxShadow,
              transform: hoveredCard === index ? "translateY(-5px)" : "translateY(0)",
              animation: clickedCard === index ? "cardGlow 1s ease-in-out infinite" : "none",
            }}
            onMouseEnter={() => setHoveredCard(index)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleCardClick(index, c.path)}
          >
            <h3>{c.title}</h3>
            <p>{c.subtitle}</p>
          </div>
        ))}
      </div>

      {/* ===== ANIMATION KEYFRAMES ===== */}
      <style>
        {`
          @keyframes cardGlow {
            0% { box-shadow: 0 0 5px 2px #00ffe7; }
            50% { box-shadow: 0 0 20px 8px #00ffe7; }
            100% { box-shadow: 0 0 5px 2px #00ffe7; }
          }
        `}
      </style>
    </div>
  );
}

/* ================= STYLES ================= */
const pageStyle = {
  padding: "20px",
  color: "white",
  fontFamily: "Arial, sans-serif",
  maxWidth: "1200px",
  margin: "0 auto",
};

const profileCard = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
  padding: "10px",
  borderRadius: "20px",
  backdropFilter: "blur(14px)",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.2)",
  marginBottom: "35px",
};

const profileTop = {
  display: "flex",
  flexDirection: "row",
  gap: "30px",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
};

const avatarSection = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const avatarImage = {
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid #fafafa",
};

const avatarFallback = {
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  background: "#37ff00",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px",
  fontWeight: "bold",
  color: "#0c1e35",
};

const avatarButtons = {
  display: "flex",
  gap: "10px",
  marginTop: "10px",
  flexWrap: "wrap",
  justifyContent: "center",
};

const profileInfo = {
  textAlign: "left",
  minWidth: "200px",
  flex: 1,
};

const badgesContainer = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  marginTop: "10px",
};

const uploadBtn = {
  marginTop: "10px",
  fontSize: "12px",
  cursor: "pointer",
  color: "#ffffff",
  fontWeight: "bold",
  border: "2px solid #14f70d",
  borderRadius: "20px",
  padding: "6px 15px",
  background: "#0000007c",
};

const removeBtn = {
  marginTop: "8px",
  padding: "5px 12px",
  borderRadius: "20px",
  border: "2px solid #ffffff",
  background: "#fe0606",
  color: "white",
  fontSize: "11px",
  cursor: "pointer",
};

const logoutBtn = {
  padding: "1px 15px",
  borderRadius: "30px",
  border: "none",
  background: "#fc0707",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  height: "25px",
};

const roleBadge = {
  padding: "2px 8px",
  borderRadius: "20px",
  background: "#38ff027f",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "15px",
};

const memberIdBadge = {
  padding: "1px 10px",
  borderRadius: "20px",
  background: "#a1ad1f00",
  fontWeight: "bold",
  fontSize: "12px",
  border: "2px solid rgb(0, 255, 8)",
};

const welcomePanel = {
  padding: "30px",
  borderRadius: "20px",
  backdropFilter: "blur(12px)",
  background: "rgba(6, 6, 6, 0.28)",
  border: "1px solid rgb(255, 242, 0)",
  marginBottom: "30px",
  textAlign: "center",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
};

const statCard = {
  padding: "20px",
  borderRadius: "20px",
  backdropFilter: "blur(10px)",
  background: "rgba(0, 0, 0, 0.53)",
  border: "1px solid rgba(242, 255, 2, 0.99)",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  position: "relative",
  overflow: "hidden",
};

export default Dashboard;