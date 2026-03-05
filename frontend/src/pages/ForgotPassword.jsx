import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg from "../assets/background3.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Password
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // STEP 1: Send the 6-digit code to email
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        alert("Reset code sent! Please check your inbox.");
        setStep(2);
      } else {
        alert(data.error || "Email not found.");
      }
    } catch (err) {
      console.error("Request Error:", err);
      alert("Network error. Ensure backend is reachable.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND CODE logic (Uses the same logic as Step 1)
  const handleResendCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        alert("A new reset code has been sent to " + email);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to resend code.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Submit code and new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        alert("Password reset successfully! Redirecting to login...");
        navigate("/login");
      } else {
        alert(data.error || "Invalid code or expired.");
      }
    } catch (err) {
      console.error("Reset Error:", err);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={overlayStyle} />

      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <img src={logo} alt="ZUCA Logo" style={{ width: "60px", height: "auto" }} />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "25px" }}>
          {step === 1 ? "FORGOT PASSWORD" : "RESET PASSWORD"}
        </h2>

        <form onSubmit={step === 1 ? handleSendCode : handleResetPassword}>
          {step === 1 ? (
            <>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <button type="submit" style={buttonStyle} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: "13px", textAlign: "center", marginBottom: "15px", color: "#ccc" }}>
                Enter the code sent to <b>{email}</b>
              </p>
              <label style={labelStyle}>Reset Code</label>
              <input
                type="text"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                style={inputStyle}
              />
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={inputStyle}
              />
              <button type="submit" style={buttonStyle} disabled={loading}>
                {loading ? "Resetting..." : "Update Password"}
              </button>

              {/* RESEND CODE BUTTON */}
              <div style={{ textAlign: "center", marginTop: "15px" }}>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={resendButtonStyle}
                >
                  {loading ? "Resending..." : "Didn't get the code? Resend"}
                </button>
              </div>
            </>
          )}
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <span style={{ color: "white", fontSize: "14px", opacity: 0.8 }}>Back to Login</span>
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

// STYLES
const containerStyle = {
  minHeight: "100vh",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

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

const labelStyle = { display: "block", marginBottom: "5px", fontSize: "14px", color: "white" };

const inputStyle = {
  width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "none",
  outline: "none", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "14px",
};

const buttonStyle = {
  width: "100%", padding: "12px", borderRadius: "8px", border: "none",
  backgroundColor: "#0fdd20ad", color: "white", fontWeight: "bold", cursor: "pointer",
};

const resendButtonStyle = {
  background: "none",
  border: "none",
  color: "#ccc",
  fontSize: "12px",
  cursor: "pointer",
  textDecoration: "underline",
};

export default ForgotPassword;