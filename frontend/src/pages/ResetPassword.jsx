import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bg from "../assets/background4.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function ResetPassword() {
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Added toggle for UX
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validation check
    if (formData.newPassword !== formData.confirmPassword) {
      return alert("Passwords do not match!");
    }

    setLoading(true);

    try {
      // 2. Fetching to /api/auth/verify (matches your backend logic)
      const res = await fetch(`${BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Password updated successfully! Redirecting to login...");
        navigate("/login");
      } else {
        alert(data.error || "Invalid code or expired.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Is your backend running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle(bg)}>
      <div style={overlayStyle} />
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <img src={logo} alt="ZUCA Logo" style={{ width: "80px" }} />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Finalize Reset
        </h2>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#ccc', marginBottom: '20px' }}>
          Enter the code sent to your email to set a new password.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            placeholder="Confirm your email"
            value={formData.email}
            onChange={handleChange}
            style={inputStyle}
            required
          />
          <input
            name="code"
            type="text"
            placeholder="6-Digit Reset Code"
            value={formData.code}
            onChange={handleChange}
            style={inputStyle}
            maxLength="6"
            required
          />
          
          <div style={{ position: "relative" }}>
            <input
              name="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              style={{ ...inputStyle, paddingRight: "40px" }}
              required
            />
            <span 
              onClick={() => setShowPassword(!showPassword)}
              style={eyeStyle}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm New Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={inputStyle}
            required
          />

          <button style={buttonStyle} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <p style={{ marginTop: "15px", textAlign: "center", fontSize: "14px" }}>
          <Link to="/forgot-password" style={{ color: "#4da6ff", textDecoration: "none" }}>
            ← Didn't get a code?
          </Link>
        </p>
      </div>
    </div>
  );
}

// ... styles remain the same as your previous code ...
const eyeStyle = {
  position: "absolute",
  right: "12px",
  top: "40%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  fontSize: "20px",
  opacity: 0.8,
};

// Ensure your inputStyle has boxSizing: "border-box"
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "none",
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "white",
  fontSize: "14px",
  boxSizing: "border-box", 
};

// (Keep your other styles as they were)
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
  background: "linear-gradient(-45deg, rgba(49,15,221,0.6), rgba(0,0,0,0.7), rgba(49,15,221,0.6))",
  backgroundSize: "400% 400%",
  zIndex: 0,
};
const cardStyle = {
  position: "relative",
  zIndex: 1,
  backdropFilter: "blur(6px)",
  background: "rgba(27, 13, 13, 0.35)",
  padding: "30px",
  borderRadius: "16px",
  width: "90%",
  maxWidth: "400px",
  color: "white",
  boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
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
  marginTop: "10px",
};

export default ResetPassword;