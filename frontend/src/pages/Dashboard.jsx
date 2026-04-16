// frontend/src/pages/Dashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import ProfileImageCropper from '../components/ProfileImageCropper';
import { FiMessageSquare, FiLogOut, FiCamera, FiTrash2, FiArrowRight } from "react-icons/fi";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // Optimized: Single API call with parallel requests
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    if (!token || !storedUser) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Parallel API calls for maximum speed
        const [userRes, announcementsRes, messagesRes, eventsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${BASE_URL}/api/announcements/unread`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { count: 0 } })),
          axios.get(`${BASE_URL}/api/chat/unread`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { count: 0 } })),
          axios.get(`${BASE_URL}/api/events/upcoming`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { count: 0 } }))
        ]);

        const userData = userRes.data;
        setUser(userData);
        
        const imageUrl = userData.profileImage?.startsWith("http")
          ? userData.profileImage
          : userData.profileImage ? `${BASE_URL}/${userData.profileImage}` : null;
        setProfileImage(imageUrl);
        
        localStorage.setItem("user", JSON.stringify(userData));
        
        setUnreadAnnouncements(announcementsRes.data.count || 0);
        setUnreadMessages(messagesRes.data.count || 0);
        setUpcomingEvents(eventsRes.data.count || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        setUser(storedUser);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 16) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setSelectedImageFile(file);
    setShowCropper(true);
  };

  const handleImageUpload = async (croppedFile) => {
    const formData = new FormData();
    formData.append("profile", croppedFile);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);
      const imageUrl = updatedUser.profileImage?.startsWith("http")
        ? updatedUser.profileImage
        : `${BASE_URL}/${updatedUser.profileImage}`;
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
    localStorage.removeItem("token");
    navigate("/login");
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={loadingCardStyle}>
          <div style={loadingSpinnerStyle}></div>
          <p style={loadingTextStyle}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorCardStyle}>
          <span style={errorIconStyle}>🔐</span>
          <h2 style={errorTitleStyle}>Session Expired</h2>
          <p style={errorTextStyle}>Please log in to continue</p>
          <button onClick={() => navigate("/login")} style={errorButtonStyle}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const quickActions = [
    { title: "Announcements", description: "View latest updates", path: "/announcements", icon: "📢", badge: unreadAnnouncements > 0 ? `${unreadAnnouncements} new` : null, color: "#3b82f6" },
    { title: "Mass Programs", description: upcomingEvents > 0 ? `${upcomingEvents} upcoming` : "Schedule & events", path: "/mass-programs", icon: "⛪", badge: null, color: "#8b5cf6" },
    { title: "Contributions", description: "Track your pledges", path: "/contributions", icon: "💰", badge: null, color: "#10b981" },
    { title: "Community Chat", description: "Connect with members", path: "/chat", icon: "💬", badge: unreadMessages > 0 ? `${unreadMessages} unread` : null, color: "#06b6d4" },
    { title: "Jumuia Groups", description: user.homeJumuia?.name || "Join a group", path: "/join-jumuia", icon: "👥", badge: user.homeJumuia ? "Active" : "Join", color: "#f59e0b" },
    { title: "Gallery", description: "View memories", path: "/gallery", icon: "🖼️", badge: null, color: "#ec4899" },
  ];

  return (
    <div style={dashboardContainerStyle}>
      <div style={dashboardContentStyle}>
        {/* Header - Clean with visible action buttons */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <h1 style={greetingStyle}>
              {greeting}, <span style={userNameStyle}>{user.fullName?.split(" ")[0]}</span>
              <span style={waveStyle}>👋</span>
            </h1>
            <p style={dateStyle}>{formatDate(currentTime)}</p>
          </div>
          
          {/* Action Buttons - Clearly visible, not hidden */}
          <div style={headerRightStyle}>
            <button onClick={() => { window.dispatchEvent(new CustomEvent('openZUCAI', { detail: { fullPage: true } })); }} style={aiButtonStyle}>
              <FiMessageSquare size={18} /> ZUCA {user.fullName?.split(" ")[0]} AI
            </button>
            <button onClick={handleLogout} style={logoutButtonStyle}>
              <FiLogOut size={16} /> Exit
            </button>
          </div>
        </div>

        {/* Profile Card - Compact and clean */}
        <div style={profileCardStyle}>
          <div style={profileContentStyle}>
            <div style={avatarSectionStyle}>
              <div style={avatarWrapperStyle}>
                {profileImage ? (
                  <img src={profileImage} alt={user.fullName} style={avatarStyle} />
                ) : (
                  <div style={avatarPlaceholderStyle}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={avatarActionsStyle}>
                <label style={uploadButtonStyle}>
                  <FiCamera size={14} /> Change
                  <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                </label>
                {profileImage && (
                  <button onClick={handleRemovePhoto} style={removeButtonStyle}>
                    <FiTrash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </div>

            <div style={infoSectionStyle}>
              <div style={infoHeaderStyle}>
                <h2 style={fullNameStyle}>{user.fullName}</h2>
                <span style={memberBadgeStyle}>{user.membership_number || "ZUCA-001"}</span>
              </div>
              <p style={emailStyle}>{user.email}</p>
              <div style={badgeContainerStyle}>
                <span style={roleBadgeStyle}>{user.role?.toUpperCase() || "MEMBER"}</span>
                {user.homeJumuia && <span style={jumuiaBadgeStyle}>👥 {user.homeJumuia.name}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row - Full width utilization */}
        <div style={statsRowStyle}>
          <div style={statCardStyle} onClick={() => navigate("/announcements")}>
            <div style={statIconStyle}>📢</div>
            <div style={statInfoStyle}>
              <span style={statValueStyle}>{unreadAnnouncements}</span>
              <span style={statLabelStyle}>Announcements</span>
            </div>
          </div>
          <div style={statCardStyle} onClick={() => navigate("/mass-programs")}>
            <div style={statIconStyle}>⛪</div>
            <div style={statInfoStyle}>
              <span style={statValueStyle}>{upcomingEvents}</span>
              <span style={statLabelStyle}>Upcoming Events</span>
            </div>
          </div>
          <div style={statCardStyle} onClick={() => navigate("/chat")}>
            <div style={statIconStyle}>💬</div>
            <div style={statInfoStyle}>
              <span style={statValueStyle}>{unreadMessages}</span>
              <span style={statLabelStyle}>Unread Messages</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Quick Actions</h2>
          <p style={sectionSubtitleStyle}>Navigate to different sections</p>
        </div>

        <div style={actionsGridStyle}>
          {quickActions.map((action, index) => (
            <div key={action.title} style={{ ...actionCardStyle, borderTopColor: action.color }} onClick={() => navigate(action.path)}>
              <div style={actionCardHeaderStyle}>
                <div style={{ ...actionIconStyle, background: `${action.color}10`, color: action.color }}>{action.icon}</div>
                {action.badge && <span style={actionBadgeStyle}>{action.badge}</span>}
              </div>
              <h3 style={actionTitleStyle}>{action.title}</h3>
              <p style={actionDescriptionStyle}>{action.description}</p>
              <div style={actionFooterStyle}>
                <span style={actionLinkStyle}>Open <FiArrowRight size={12} style={{ marginLeft: 4 }} /></span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <p style={footerTextStyle}>ZUCA Portal • v2.0 DATE : {new Date().toLocaleDateString()}`</p>
          <p style={footerTextStyle}>{`© ${new Date().getFullYear()} ZUCA Portal. All rights reserved.`}</p>
        </div>
      </div>

      {showCropper && (
        <ProfileImageCropper
          imageFile={selectedImageFile}
          onCropComplete={(croppedFile) => {
            setShowCropper(false);
            handleImageUpload(croppedFile);
          }}
          onClose={() => {
            setShowCropper(false);
            setSelectedImageFile(null);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ==================== Optimized Styles ====================

const loadingContainerStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
};

const loadingCardStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  textAlign: "center",
  border: "1px solid #e2e8f0",
};

const loadingSpinnerStyle = {
  width: "36px",
  height: "36px",
  border: "3px solid #e2e8f0",
  borderTopColor: "#3b82f6",
  borderRadius: "50%",
  margin: "0 auto 12px",
  animation: "spin 0.6s linear infinite",
};

const loadingTextStyle = {
  color: "#64748b",
  fontSize: "13px",
  margin: 0,
};

const errorContainerStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const errorCardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "40px",
  textAlign: "center",
  maxWidth: "380px",
  width: "100%",
  border: "1px solid #e2e8f0",
};

const errorIconStyle = { fontSize: "56px", display: "block", marginBottom: "16px" };
const errorTitleStyle = { color: "#1e293b", fontSize: "22px", fontWeight: "700", marginBottom: "10px" };
const errorTextStyle = { color: "#64748b", fontSize: "13px", marginBottom: "28px" };
const errorButtonStyle = { background: "#3b82f6", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", width: "100%" };

const dashboardContainerStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const dashboardContentStyle = {
  maxWidth: "1400px",
  margin: "0 auto",
  padding: "20px 24px",
};

const headerStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "16px 24px",
  marginBottom: "20px",
  border: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
};

const headerLeftStyle = { flex: 1 };
const greetingStyle = { fontSize: "22px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" };
const userNameStyle = { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
const waveStyle = { display: "inline-block", marginLeft: "6px" };
const dateStyle = { color: "#64748b", fontSize: "13px" };

const headerRightStyle = { display: "flex", gap: "12px", alignItems: "center" };

// Visible action buttons - clearly visible outside profile circle
const aiButtonStyle = {
  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  border: "none",
  borderRadius: "10px",
  padding: "8px 18px",
  color: "white",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const logoutButtonStyle = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "8px 18px",
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const profileCardStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "28px",
  border: "1px solid #e2e8f0",
};

const profileContentStyle = { display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" };
const avatarSectionStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" };
const avatarWrapperStyle = { position: "relative", width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", border: "2px solid #3b82f6" };
const avatarStyle = { width: "100%", height: "100%", objectFit: "cover" };
const avatarPlaceholderStyle = { width: "100%", height: "100%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "700", color: "white" };
const avatarActionsStyle = { display: "flex", gap: "6px" };
const uploadButtonStyle = { padding: "4px 10px", borderRadius: "16px", fontSize: "10px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" };
const removeButtonStyle = { padding: "4px 10px", borderRadius: "16px", fontSize: "10px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fee2e2" };
const infoSectionStyle = { flex: 1 };
const infoHeaderStyle = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" };
const fullNameStyle = { fontSize: "20px", fontWeight: "700", color: "#1e293b", margin: 0 };
const memberBadgeStyle = { background: "#f1f5f9", borderRadius: "16px", padding: "2px 8px", color: "#64748b", fontSize: "10px", fontWeight: "500" };
const emailStyle = { color: "#64748b", fontSize: "12px", marginBottom: "8px" };
const badgeContainerStyle = { display: "flex", gap: "6px", flexWrap: "wrap" };
const roleBadgeStyle = { padding: "2px 8px", borderRadius: "12px", fontSize: "9px", fontWeight: "600", background: "#eff6ff", color: "#3b82f6" };
const jumuiaBadgeStyle = { padding: "2px 8px", borderRadius: "12px", fontSize: "9px", fontWeight: "600", background: "#ecfdf5", color: "#10b981" };

const statsRowStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "32px" };
const statCardStyle = { background: "#ffffff", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid #e2e8f0", cursor: "pointer" };
const statIconStyle = { fontSize: "24px", width: "40px", height: "40px", background: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" };
const statInfoStyle = { display: "flex", flexDirection: "column" };
const statValueStyle = { fontSize: "24px", fontWeight: "800", color: "#1e293b", lineHeight: 1.2 };
const statLabelStyle = { fontSize: "10px", color: "#64748b" };

const sectionHeaderStyle = { marginBottom: "16px" };
const sectionTitleStyle = { fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" };
const sectionSubtitleStyle = { color: "#64748b", fontSize: "12px" };

const actionsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" };
const actionCardStyle = { background: "#ffffff", borderRadius: "12px", padding: "18px", cursor: "pointer", border: "1px solid #e2e8f0", borderTopWidth: "3px" };
const actionCardHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" };
const actionIconStyle = { width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" };
const actionBadgeStyle = { background: "#fef2f2", borderRadius: "16px", padding: "2px 6px", color: "#dc2626", fontSize: "9px", fontWeight: "600" };
const actionTitleStyle = { fontSize: "15px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" };
const actionDescriptionStyle = { color: "#64748b", fontSize: "11px", marginBottom: "12px", lineHeight: 1.4 };
const actionFooterStyle = { display: "flex", justifyContent: "flex-end" };
const actionLinkStyle = { color: "#3b82f6", fontSize: "11px", fontWeight: "500", display: "flex", alignItems: "center" };

const footerStyle = { textAlign: "center", padding: "16px", borderTop: "1px solid #e2e8f0", marginTop: "16px" };
const footerTextStyle = { color: "#94a3b8", fontSize: "11px" };

export default Dashboard;