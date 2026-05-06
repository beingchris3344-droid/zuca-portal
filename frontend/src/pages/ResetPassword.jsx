// frontend/src/pages/ResetPassword.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import bg from "../assets/background4.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function ResetPassword() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from location state (passed from ForgotPassword)
    const stateEmail = location.state?.email;
    const storedEmail = sessionStorage.getItem('resetEmail');
    
    if (stateEmail) {
      setEmail(stateEmail);
      sessionStorage.setItem('resetEmail', stateEmail);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email, redirect to forgot password
      navigate("/forgot-password");
    }
  }, [location, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleCodeChange = (element, index) => {
    if (isNaN(element.value)) return;
    const newCode = [...code];
    newCode[index] = element.value;
    setCode(newCode);
    if (element.value !== "" && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (code[index] === "" && index > 0) {
        document.getElementById(`code-${index - 1}`)?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setCode(pastedData.split(''));
      document.getElementById('code-5')?.focus();
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setTimer(300);
        setCode(["", "", "", "", "", ""]);
        setSuccess("New code sent to your email!");
        setTimeout(() => setSuccess(""), 3000);
        document.getElementById('code-0')?.focus();
      } else {
        setError(data.error || "Failed to resend code");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          code: fullCode,
          newPassword: newPassword.trim()
        }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.clear();
        setSuccess("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login", { 
            state: { message: "Password reset successful! Please login." } 
          });
        }, 2000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Styles (same as before, keep your existing styles)
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
      padding: "20px",
    },
    overlay: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(135deg, rgba(49, 15, 221, 0) 0%, rgba(0, 0, 0, 0.18) 100%)",
      zIndex: 0,
    },
    card: {
      position: "relative",
      zIndex: 1,
      backdropFilter: "blur(10px)",
      background: "rgba(0, 0, 0, 0.55)",
      padding: "25px 20px",
      borderRadius: "24px",
      width: "100%",
      maxWidth: "450px",
      color: "white",
      boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      border: "1px solid rgba(12, 143, 62, 0.6)",
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
      marginBottom: "15px",
      color: "rgba(255,255,255,0.8)",
    },
    emailInfo: {
      background: "rgba(255,255,255,0.1)",
      borderRadius: "12px",
      padding: "10px",
      marginBottom: "20px",
      textAlign: "center",
      fontSize: "14px",
      color: "#ffd700",
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
    codeContainer: {
      display: "flex",
      gap: "8px",
      justifyContent: "center",
      marginBottom: "15px",
      flexWrap: "wrap",
    },
    codeInput: {
      width: "45px",
      height: "55px",
      textAlign: "center",
      fontSize: "22px",
      fontWeight: "bold",
      borderRadius: "12px",
      border: "2px solid rgba(255,255,255,0.3)",
      background: "rgba(255,255,255,0.15)",
      color: "white",
      outline: "none",
    },
    timerDisplay: {
      textAlign: "center",
      fontSize: "12px",
      marginBottom: "15px",
      color: "rgba(255,255,255,0.7)",
    },
    timerHighlight: {
      color: "#ffd700",
      fontWeight: "600",
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
      marginTop: "5px",
      opacity: loading ? 0.7 : 1,
    },
    resendSection: {
      textAlign: "center",
      marginTop: "15px",
    },
    resendButton: {
      background: "none",
      border: "none",
      color: "#4da6ff",
      cursor: "pointer",
      fontSize: "13px",
      textDecoration: "underline",
      padding: "5px",
    },
    resendText: {
      fontSize: "12px",
      color: "rgba(255,255,255,0.6)",
      margin: 0,
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
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="ZUCA Logo" style={styles.logo} />
          <h1 style={styles.title}>ZUCA Portal</h1>
        </div>

        <h2 style={styles.heading}>Reset Password</h2>
        
        <div style={styles.emailInfo}>
          📧 Code sent to: {email}
        </div>

        <p style={styles.subheading}>
          Enter the 6-digit code sent to your email
        </p>

        {error && <div style={styles.error}>⚠️ {error}</div>}
        {success && <div style={styles.success}>✅ {success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.codeContainer}>
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={index === 0 ? handlePaste : undefined}
                style={styles.codeInput}
                autoFocus={index === 0}
                required
                disabled={loading}
              />
            ))}
          </div>

          {timer > 0 && (
            <p style={styles.timerDisplay}>
              ⏱️ Code expires in: <span style={styles.timerHighlight}>{formatTime(timer)}</span>
            </p>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <div style={styles.resendSection}>
            {timer === 0 ? (
              <button 
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                style={styles.resendButton}
              >
                Resend Code
              </button>
            ) : (
              <p style={styles.resendText}>
                Didn't receive code? Wait {formatTime(timer)} to resend
              </p>
            )}
          </div>
        </form>

        <div style={styles.linksContainer}>
          <Link to="/forgot-password" style={styles.link}>
            ← Back
          </Link>
          <span style={styles.divider}>|</span>
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;