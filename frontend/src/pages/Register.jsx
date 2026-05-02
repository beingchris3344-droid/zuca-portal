// frontend/src/pages/Register.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import bg from "../assets/background4.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";
import WelcomeModal from "../components/WelcomeModal";

function Register() {
  const navigate = useNavigate();

  // Registration form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [focusedField, setFocusedField] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordMatch, setPasswordMatch] = useState(null);
  
  // Verification modal states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationTimer, setVerificationTimer] = useState(300);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  // Welcome modal states
  const [showWelcome, setShowWelcome] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [registrationData, setRegistrationData] = useState(null);

  // Password strength checker
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);

  // Password match checker
  useEffect(() => {
    if (confirmPassword.length === 0) {
      setPasswordMatch(null);
      return;
    }
    
    if (password === confirmPassword) {
      setPasswordMatch(true);
    } else {
      setPasswordMatch(false);
    }
  }, [password, confirmPassword]);

  // Timer for verification code
  useEffect(() => {
    if (!showVerification) return;
    
    const interval = setInterval(() => {
      setVerificationTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showVerification]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleVerificationCodeChange = (element, index) => {
    if (isNaN(element.value)) return;
    const newCode = [...verificationCode];
    newCode[index] = element.value;
    setVerificationCode(newCode);
    if (element.value !== "" && index < 5) {
      document.getElementById(`verify-code-${index + 1}`)?.focus();
    }
  };

  const handleVerificationKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (verificationCode[index] === "" && index > 0) {
        document.getElementById(`verify-code-${index - 1}`)?.focus();
      }
    }
  };

  const handleVerifyEmail = async () => {
    const fullCode = verificationCode.join("");
    if (fullCode.length !== 6) {
      setVerificationError("Please enter the complete 6-digit code");
      return;
    }
    
    setVerificationLoading(true);
    setVerificationError("");
    
    try {
      const res = await fetch(`${BASE_URL}/api/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: fullCode }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Update token with verified status
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        setVerificationSuccess(true);
        setShowVerification(false);
        setShowWelcome(true);
        setNewUserName(registrationData?.fullName?.split(" ")[0] || "Member");
      } else {
        setVerificationError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setVerificationError("Network error. Please try again.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationLoading(true);
    setVerificationError("");
    
    try {
      const res = await fetch(`${BASE_URL}/api/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setVerificationTimer(300);
        setVerificationCode(["", "", "", "", "", ""]);
        // Focus first input
        setTimeout(() => document.getElementById('verify-code-0')?.focus(), 100);
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = "position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:12px;z-index:1001";
        successMsg.innerText = "New code sent to your email!";
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        setVerificationError(data.error || "Failed to resend code");
      }
    } catch (err) {
      setVerificationError("Network error");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // Format Kenyan phone number
    let formattedPhone = phone;
    if (phone.startsWith("07")) {
      formattedPhone = "+254" + phone.slice(1);
    } else if (phone.startsWith("7") && phone.length === 9) {
      formattedPhone = "+254" + phone;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, phone: formattedPhone }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Show verification modal instead of welcome modal
        setVerificationEmail(email);
        setVerificationCode(["", "", "", "", "", ""]);
        setVerificationError("");
        setVerificationTimer(300);
        setShowVerification(true);
        setRegistrationData(data.user);
      } else {
        alert(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Registration Error:", err);
      alert("Network error. Make sure the backend is reachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeAccept = () => {
    setShowWelcome(false);
    navigate("/dashboard");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const getStrengthColor = () => {
    switch(passwordStrength) {
      case 0: return "#94a3b8";
      case 1: return "#ef4444";
      case 2: return "#f59e0b";
      case 3: return "#10b981";
      case 4: return "#00c6ff";
      default: return "#94a3b8";
    }
  };

  const getStrengthText = () => {
    switch(passwordStrength) {
      case 0: return "";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "";
    }
  };

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{
          minHeight: "100vh",
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(-45deg, rgba(49,15,221,0.6), rgba(0,0,0,0.7), rgba(49,15,221,0.6))",
            backgroundSize: "400% 400%",
            animation: "gradientMove 12s ease infinite",
          }}
        />

        {/* Floating particles effect */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0.1 
            }}
            animate={{ 
              y: [null, -30, 30, -20, 0],
              x: [null, 20, -20, 10, 0],
              opacity: [0.1, 0.2, 0.1, 0.2, 0.1]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            style={{
              position: "absolute",
              width: i * 10 + 20,
              height: i * 10 + 20,
              borderRadius: "50%",
              background: "rgba(0,198,255,0.1)",
              filter: "blur(8px)",
              zIndex: 0
            }}
          />
        ))}

        {/* Main Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          style={{
            position: "relative",
            zIndex: 2,
            backdropFilter: "blur(12px)",
            background: "rgba(27, 13, 13, 0.3)",
            padding: "45px",
            borderRadius: "24px",
            width: "90%",
            maxWidth: "420px",
            color: "white",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.05)",
            overflow: "hidden"
          }}
        >
          {/* Card inner glow */}
          <div style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "radial-gradient(circle at 50% 50%, rgba(0,198,255,0.1), transparent 70%)",
            zIndex: -1
          }} />

          <motion.div 
            variants={itemVariants}
            style={{ textAlign: "center", marginBottom: "20px" }}
          >
            <motion.img 
              src={logo} 
              alt="ZUCA Logo" 
              style={{ width: "90px", height: "auto", marginBottom: "10px" }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </motion.div>

          <motion.h2 
            variants={itemVariants}
            style={{ 
              marginBottom: "30px", 
              textAlign: "center",
              fontSize: "28px",
              fontWeight: "600",
              background: "linear-gradient(135deg, #fff, #00c6ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.5px"
            }}
          >
            Create Account
          </motion.h2>

          <form onSubmit={handleRegister}>
            {/* Full Name Field */}
            <motion.div variants={itemVariants}>
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <motion.input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    borderBottom: focusedField === "name" ? "2px solid #00c6ff" : "2px solid transparent",
                    transition: "all 0.3s"
                  }}
                  whileFocus={{ scale: 1.02 }}
                  required
                />
                {focusedField === "name" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                      color: "#00c6ff"
                    }}
                  >
                    ✨
                  </motion.span>
                )}
              </div>
            </motion.div>

            {/* Email Field */}
            <motion.div variants={itemVariants}>
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <motion.input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    borderBottom: focusedField === "email" ? "2px solid #00c6ff" : "2px solid transparent",
                    transition: "all 0.3s"
                  }}
                  whileFocus={{ scale: 1.02 }}
                  required
                />
                {focusedField === "email" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                      color: "#00c6ff"
                    }}
                  >
                    📧
                  </motion.span>
                )}
              </div>
            </motion.div>

            {/* Phone Field */}
            <motion.div variants={itemVariants}>
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <motion.input
                  type="tel"
                  placeholder="Phone Number (e.g., 0712345678)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    borderBottom: focusedField === "phone" ? "2px solid #00c6ff" : "2px solid transparent",
                    transition: "all 0.3s"
                  }}
                  whileFocus={{ scale: 1.02 }}
                  required
                />
                {focusedField === "phone" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                      color: "#00c6ff"
                    }}
                  >
                    📱
                  </motion.span>
                )}
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div variants={itemVariants}>
              <div style={{ position: "relative", marginBottom: "5px" }}>
                <motion.input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingRight: "40px",
                    borderBottom: focusedField === "password" ? "2px solid #00c6ff" : "2px solid transparent",
                    transition: "all 0.3s"
                  }}
                  whileFocus={{ scale: 1.02 }}
                  required
                />
                <motion.span
                  onClick={() => setShowPassword(!showPassword)}
                  style={eyeStyle}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </motion.span>
              </div>

              {/* Password Strength Indicator */}
              <AnimatePresence>
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginBottom: "15px" }}
                  >
                    <div style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
                      {[1,2,3,4].map((level) => (
                        <motion.div
                          key={level}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: level <= passwordStrength ? 1 : 0.3 }}
                          style={{
                            flex: 1,
                            height: "4px",
                            background: level <= passwordStrength ? getStrengthColor() : "rgba(255,255,255,0.2)",
                            borderRadius: "2px",
                            transformOrigin: "left"
                          }}
                        />
                      ))}
                    </div>
                    <motion.div style={{ 
                      fontSize: "12px", 
                      color: getStrengthColor(),
                      textAlign: "right"
                    }}>
                      {getStrengthText()}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div variants={itemVariants}>
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <motion.input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingRight: "40px",
                    borderBottom: focusedField === "confirm" ? "2px solid #00c6ff" : "2px solid transparent",
                    transition: "all 0.3s"
                  }}
                  whileFocus={{ scale: 1.02 }}
                  required
                />
                <motion.span
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={eyeStyle}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showConfirm ? "👁️‍🗨️" : "👁️"}
                </motion.span>
                
                {/* Password Match Indicator */}
                <AnimatePresence>
                  {passwordMatch !== null && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      style={{
                        position: "absolute",
                        right: "12px",
                        bottom: "-18px",
                        fontSize: "12px",
                        color: passwordMatch ? "#10b981" : "#ef4444"
                      }}
                    >
                      {passwordMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Register Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading}
                style={buttonStyle}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0,198,255,0.4)" }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ display: "inline-block" }}
                  >
                    ⏳
                  </motion.div>
                ) : (
                  "Register"
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Login Link */}
          <motion.p 
            variants={itemVariants}
            style={{ marginTop: "25px", textAlign: "center", fontSize: "14px" }}
          >
            Already have an account?{" "}
            <motion.span
              whileHover={{ scale: 1.1 }}
              style={{ display: "inline-block" }}
            >
              <Link 
                to="/login" 
                style={{ 
                  color: "#00c6ff", 
                  textDecoration: "none",
                  fontWeight: "600",
                  borderBottom: "1px solid transparent",
                  transition: "border-color 0.3s"
                }}
                onMouseEnter={(e) => e.target.style.borderBottomColor = "#00c6ff"}
                onMouseLeave={(e) => e.target.style.borderBottomColor = "transparent"}
              >
                Login
              </Link>
            </motion.span>
          </motion.p>

          {/* Decorative elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              fontSize: "10px",
              color: "rgba(255,255,255,0.2)"
            }}
          >
            ✦ ZUCA ✦
          </motion.div>
        </motion.div>

        <style>
          {`
            @keyframes gradientMove {
              0% {background-position: 0% 50%;}
              50% {background-position: 100% 50%;}
              100% {background-position: 0% 50%;}
            }
            
            input::placeholder {
              color: rgba(255,255,255,0.5);
              font-size: 13px;
            }
            
            input:focus::placeholder {
              opacity: 0.7;
              transform: translateX(5px);
              transition: all 0.3s;
            }
          `}
        </style>
      </motion.div>

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.95)",
              backdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10000,
              padding: "20px"
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25 }}
              style={{
                background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                borderRadius: "28px",
                padding: "35px",
                maxWidth: "450px",
                width: "100%",
                textAlign: "center",
                border: "1px solid rgba(0,198,255,0.3)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                style={{ marginBottom: "20px" }}
              >
                <img src={logo} alt="ZUCA" style={{ width: "70px", marginBottom: "10px" }} />
                <h2 style={{ color: "white", marginTop: "10px", fontSize: "24px" }}>Verify Your Email</h2>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
                  We sent a 6-digit code to:<br />
                  <strong style={{ color: "#00c6ff", fontSize: "16px" }}>{verificationEmail}</strong>
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px", flexWrap: "wrap" }}
              >
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`verify-code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleVerificationCodeChange(e.target, index)}
                    onKeyDown={(e) => handleVerificationKeyDown(e, index)}
                    style={{
                      width: "55px",
                      height: "65px",
                      textAlign: "center",
                      fontSize: "28px",
                      fontWeight: "bold",
                      borderRadius: "16px",
                      border: `2px solid ${digit ? "#00c6ff" : "rgba(0,198,255,0.3)"}`,
                      background: "rgba(255,255,255,0.1)",
                      color: "white",
                      outline: "none",
                      transition: "all 0.2s"
                    }}
                    autoFocus={index === 0}
                  />
                ))}
              </motion.div>
              
              <AnimatePresence>
                {verificationError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ color: "#ff6b6b", marginBottom: "15px", fontSize: "14px", background: "rgba(255,107,107,0.1)", padding: "10px", borderRadius: "12px" }}
                  >
                    ⚠️ {verificationError}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button
                onClick={handleVerifyEmail}
                disabled={verificationLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: verificationLoading ? "linear-gradient(135deg, #888, #666)" : "linear-gradient(135deg, #00c6ff, #007bff)",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "16px",
                  cursor: verificationLoading ? "not-allowed" : "pointer",
                  marginBottom: "15px"
                }}
              >
                {verificationLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span style={{
                      display: "inline-block",
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderRadius: "50%",
                      borderTopColor: "white",
                      animation: "spin 1s linear infinite"
                    }}></span>
                    Verifying...
                  </span>
                ) : (
                  "Verify Email"
                )}
              </motion.button>
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                {verificationTimer > 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
                    ⏱️ Resend code in <span style={{ color: "#ffd700", fontWeight: "bold" }}>{formatTime(verificationTimer)}</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    disabled={verificationLoading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00c6ff",
                      cursor: verificationLoading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      textDecoration: "underline"
                    }}
                  >
                    Resend Code
                  </button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleWelcomeAccept}
        userName={newUserName}
      />
    </>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 12px",
  marginBottom: "5px",
  borderRadius: "12px",
  border: "none",
  outline: "none",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
  backdropFilter: "blur(5px)",
};

const eyeStyle = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  fontSize: "22px",
  opacity: 0.8,
  transition: "opacity 0.3s",
  zIndex: 2
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "16px",
  background: "linear-gradient(135deg, #00c6ff, #007bff)",
  color: "white",
  marginTop: "10px",
  transition: "all 0.3s",
  boxShadow: "0 4px 15px -3px rgba(0,198,255,0.3)"
};

export default Register;