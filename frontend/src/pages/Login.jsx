import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg from "../assets/background3.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api"; // centralized API URL

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        alert(data.error || "Login failed. Check credentials or network.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Network error. Ensure backend is reachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle(bg)}>
      {/* Animated Overlay */}
      <div style={overlayStyle} />

      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <img src={logo} alt="ZUCA Logo" style={{ width: "60px", height: "auto" }} />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "25px" }}>
          ZUCA PORTAL LOGIN
        </h2>

        <form onSubmit={handleLogin}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ ...inputStyle, paddingRight: "40px" }}
            />
            <span onClick={() => setShowPassword(!showPassword)} style={eyeStyle}>
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

<div style={{ textAlign: "right", marginBottom: "15px" }}>
  {/* The slash / is mandatory to go to the root path defined in App.jsx */}
   
<Link to="/forgot-password">
  Forgot Password?
</Link>
</div>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <span style={{ fontSize: "14px" }}>Don’t have an account?</span>
          <br />
          <Link to="/register">
            <button style={secondaryButton}>Create Account</button>
          </Link>
        </div>
      </div>

      <style>
        {`
          @keyframes gradientMove {
            0% {background-position: 0% 50%;}
            50% {background-position: 100% 50%;}
            100% {background-position: 0% 50%;}
          }
        `}
      </style>
    </div>
  );
}

// ==================== Styles ====================

const containerStyle = (bg) => ({
  minHeight: "100vh",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(-45deg, rgba(49,15,221,0.6), rgba(0,0,0,0.7), rgba(49,15,221,0.6))",
  backgroundSize: "400% 400%",
  animation: "gradientMove 12s ease infinite",
};

const cardStyle = {
  position: "relative",
  background: "rgba(27, 13, 13, 0.35)",
  backdropFilter: "blur(6px)",
  padding: "40px",
  borderRadius: "16px",
  width: "90%",
  maxWidth: "400px",
  color: "white",
  boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontSize: "14px",
  color: "white",
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
  boxSizing: "border-box", // Prevents input from overflowing
};

const eyeStyle = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-85%)", // Adjusted to align with text
  cursor: "pointer",
  fontSize: "20px",
  opacity: 0.8,
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#0fdd20ad",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButton = {
  marginTop: "10px",
  padding: "8px 15px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "rgba(49, 53, 235, 0.69)",
  color: "white",
  cursor: "pointer",
};

export default Login;