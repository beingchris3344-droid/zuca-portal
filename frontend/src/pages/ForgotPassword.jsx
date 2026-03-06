import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bg from "../assets/background4.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Reset code sent to your email!");
        // Use a leading slash to ensure it goes to the root /reset-password
        navigate("/reset-password"); 
      } else {
        alert(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle(bg)}>
      <div style={overlayStyle} />
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <img src={logo} alt="ZUCA Logo" style={{ width: "80px" }} />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Forgot Password?
        </h2>
        <p style={{ textAlign: "center", fontSize: "14px", marginBottom: "20px" }}>
          Enter your email and we'll send you a 6-digit reset code.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <button style={buttonStyle} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <p style={{ marginTop: "20px", textAlign: "center", fontSize: "14px" }}>
          {/* Added leading slash to ensure correct routing back to login */}
          <Link to="/login" style={{ color: "#4da6ff", textDecoration: "none" }}>
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword; // CRITICAL: Ensure this export exists!

// ==================== Styles ====================

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
  boxSizing: "border-box",
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