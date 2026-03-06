// frontend/src/pages/ResetPassword.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bg from "../assets/background4.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Password reset successfully. Please login.");
        navigate("/login");
      } else {
        alert(data.error || "Failed to reset password.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle(bg)}>
      <div style={overlayStyle} />
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <img src={logo} alt="ZUCA Logo" style={{ width: "100px" }} />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "25px" }}>
          Reset Password
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />

          <input
            type="text"
            placeholder="Enter reset code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={inputStyle}
            required
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: "40px" }}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={eyeStyle}
            >
              {showPassword ? "🙈" : "👁"}
            </span>
          </div>

          <button style={buttonStyle} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p style={{ marginTop: "15px", textAlign: "center" }}>
          Back to{" "}
          <Link to="/login" style={{ color: "#4da6ff" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;

// Reuse styles
const pageStyle = (bg) => ({
  minHeight: "100vh",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
});

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(-45deg, rgba(49,15,221,0.6), rgba(0,0,0,0.7), rgba(49,15,221,0.6))",
  backgroundSize: "400% 400%",
  animation: "gradientMove 15s ease infinite",
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  backdropFilter: "blur(6px)",
  background: "rgba(27, 13, 13, 0.35)",
  padding: "40px",
  borderRadius: "16px",
  width: "90%",
  maxWidth: "400px",
  color: "white",
  boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "none",
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "white",
  fontSize: "14px",
};

const eyeStyle = {
  position: "absolute",
  right: "12px",
  top: "35%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  fontSize: "25px",
  opacity: 0.8,
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  background: "#54dd0fa7",
  color: "white",
};