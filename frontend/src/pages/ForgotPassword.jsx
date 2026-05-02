// frontend/src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bg from "../assets/background4.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Reset code sent to your email! Redirecting...");
        setTimeout(() => {
          navigate("/reset-password", { 
            state: { email: email.trim() }
          });
        }, 2000);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Network error. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundImage: `url(${bg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "10px",
    },
    overlay: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(135deg, rgba(49,15,221,0.85) 0%, rgba(0,0,0,0.9) 100%)",
      zIndex: 0,
    },
    card: {
      position: "relative",
      zIndex: 1,
      backdropFilter: "blur(10px)",
      background: "rgba(255, 255, 255, 0.1)",
      padding: "25px 20px",
      borderRadius: "24px",
      width: "100%",
      maxWidth: "420px",
      color: "white",
      boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      border: "1px solid rgba(255,255,255,0.1)",
    },
    logoContainer: {
      textAlign: "center",
      marginBottom: "15px",
    },
    logo: {
      width: "60px",
      marginBottom: "5px",
    },
    title: {
      fontSize: "18px",
      margin: 0,
      color: "white",
      fontWeight: "600",
    },
    heading: {
      textAlign: "center",
      marginBottom: "10px",
      color: "white",
      fontSize: "22px",
      fontWeight: "700",
    },
    subheading: {
      textAlign: "center",
      fontSize: "13px",
      marginBottom: "20px",
      color: "rgba(255,255,255,0.8)",
    },
    inputGroup: {
      marginBottom: "15px",
    },
    label: {
      display: "block",
      marginBottom: "5px",
      fontSize: "13px",
      fontWeight: "500",
      color: "rgba(255,255,255,0.9)",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "12px",
      border: "2px solid rgba(255,255,255,0.1)",
      outline: "none",
      background: "rgba(255,255,255,0.08)",
      color: "white",
      fontSize: "14px",
      boxSizing: "border-box",
    },
    button: {
      width: "100%",
      padding: "12px",
      borderRadius: "12px",
      border: "none",
      cursor: loading ? "not-allowed" : "pointer",
      fontWeight: "bold",
      fontSize: "15px",
      background: loading 
        ? "linear-gradient(135deg, #888 0%, #666 100%)" 
        : "linear-gradient(135deg, #54dd0f 0%, #3fa30c 100%)",
      color: "white",
      marginTop: "10px",
      opacity: loading ? 0.7 : 1,
    },
    buttonContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    spinner: {
      display: "inline-block",
      width: "16px",
      height: "16px",
      border: "2px solid rgba(255,255,255,0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite",
      marginRight: "8px",
    },
    linksContainer: {
      marginTop: "15px",
      textAlign: "center",
    },
    link: {
      color: "#4da6ff",
      textDecoration: "none",
      fontSize: "13px",
    },
    divider: {
      color: "rgba(255,255,255,0.3)",
      margin: "0 10px",
    },
    error: {
      background: "rgba(255, 68, 68, 0.15)",
      color: "#ff8a8a",
      padding: "10px 12px",
      borderRadius: "12px",
      marginBottom: "15px",
      textAlign: "center",
      fontSize: "13px",
      border: "1px solid rgba(255, 68, 68, 0.3)",
    },
    success: {
      background: "rgba(84, 221, 15, 0.15)",
      color: "#a5d6a5",
      padding: "10px 12px",
      borderRadius: "12px",
      marginBottom: "15px",
      textAlign: "center",
      fontSize: "13px",
      border: "1px solid rgba(84, 221, 15, 0.3)",
    },
  };

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    input:focus {
      border-color: #54dd0f !important;
      box-shadow: 0 0 0 3px rgba(84, 221, 15, 0.25) !important;
    }
  `;
  document.head.appendChild(styleTag);

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="ZUCA Logo" style={styles.logo} />
          <h1 style={styles.title}>ZUCA Portal</h1>
        </div>

        <h2 style={styles.heading}>Forgot Password?</h2>
        <p style={styles.subheading}>
          Enter your email address and we'll send you a reset code
        </p>

        {error && <div style={styles.error}>⚠️ {error}</div>}
        {success && <div style={styles.success}>✅ {success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? (
              <span style={styles.buttonContent}>
                <span style={styles.spinner}></span>
                Sending...
              </span>
            ) : "Send Reset Code"}
          </button>
        </form>

        <div style={styles.linksContainer}>
          <Link to="/login" style={styles.link}>
            ← Back to Login
          </Link>
          <span style={styles.divider}>|</span>
          <Link to="/register" style={styles.link}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;