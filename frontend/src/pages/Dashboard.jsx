import { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../api"; // centralized API URL

function Dashboard() {
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user and profile image from localStorage or backend
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);

      // Use Layout-style logic to build profile image URL
      const imageUrl = storedUser.profileImage
        ? storedUser.profileImage.startsWith("http")
          ? storedUser.profileImage
          : `${BASE_URL}/${storedUser.profileImage}`
        : null;

      setProfileImage(imageUrl);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Upload new profile image
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);

      // Use Layout-style logic
      const imageUrl = updatedUser.profileImage
        ? updatedUser.profileImage.startsWith("http")
          ? updatedUser.profileImage
          : `${BASE_URL}/${updatedUser.profileImage}`
        : null;

      setProfileImage(imageUrl);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      console.log("Profile updated:", updatedUser.profileImage);
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

  if (loading) {
    return <div style={{ color: "white", padding: "40px" }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ color: "white", padding: "40px" }}>
        No user found. Please login.
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* ===== PROFILE SECTION ===== */}
      <div style={profileCard}>
        <div style={profileLeft}>
          <div style={avatarSection}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" style={avatarImage} />
            ) : (
              <div style={avatarFallback}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={avatarButtons}>
              <label style={uploadBtn}>
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </label>

              {profileImage && (
                <button onClick={handleRemovePhoto} style={removeBtn}>
                  Remove
                </button>
              )}
            </div>
          </div>

          <div style={profileInfo}>
            <span style={memberIdBadge}>ID: ZUCA-{user.id}</span>

            <h2 style={{ marginBottom: "5px" }}>{user.fullName}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>{user.email}</p>

            <div style={badgesContainer}>
              <span style={roleBadge}>
                {user.role?.toUpperCase() || "MEMBER"}
              </span>
            </div>

            <p style={{ fontSize: "13px", marginTop: "10px", opacity: 0.7 }}>
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
        <h1 style={{ marginBottom: "10px" }}>
          Welcome back, {user.fullName.split(" ")[0]} 👋
        </h1>
        <p>
          This is your personal member dashboard. View announcements,
          contributions, mass programs, and interact with fellow members and give
          feedback.
        </p>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div style={statsGrid}>
        <div style={statCard}>
          <h3>Announcements</h3>
          <p>View latest updates</p>
        </div>

        <div style={statCard}>
          <h3>Mass Programs</h3>
          <p>Upcoming schedules</p>
        </div>

        <div style={statCard}>
          <h3>Contributions</h3>
          <p>Track your giving</p>
        </div>

        <div style={statCard}>
          <h3>Chat</h3>
          <p>Connect with members</p>
        </div>
      </div>
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
  padding: "2px",
  borderRadius: "20px",
  backdropFilter: "blur(14px)",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.2)",
  marginBottom: "35px",
  alignItems: "center",
  justifyContent: "space-between",
};

const profileLeft = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "20px",
  width: "100%",
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
  border: "3px solid #62ff00c4",
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
  textAlign: "center",
  width: "100%",
};

const badgesContainer = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "center",
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
  background: "#0b4115",
};

const removeBtn = {
  marginTop: "8px",
  padding: "5px 12px",
  borderRadius: "20px",
  border: "2px solid #36f319",
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
  padding: "6px 15px",
  borderRadius: "20px",
  background: "#1aff00c0",
  color: "#0c1e35",
  fontWeight: "800px",
  fontSize: "15px",
};

const memberIdBadge = {
  padding: "1px 10px",
  borderRadius: "20px",
  background: "#098518",
  fontWeight: "bold",
  fontSize: "12px",
};

const welcomePanel = {
  padding: "30px",
  borderRadius: "20px",
  backdropFilter: "blur(12px)",
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.15)",
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
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  textAlign: "center",
};

export default Dashboard;