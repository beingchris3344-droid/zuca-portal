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
  
  // Welcome modal states
  const [showWelcome, setShowWelcome] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [registrationData, setRegistrationData] = useState(null);

  // Force full name to uppercase - convert on every change
  const handleFullNameChange = (e) => {
    const inputValue = e.target.value;
    const uppercaseValue = inputValue.toUpperCase();
    setFullName(uppercaseValue);
  };

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
    
    // Auto-focus next input
    if (element.value !== "" && index < 5) {
      document.getElementById(`verify-code-${index + 1}`)?.focus();
    }
    
    // Auto-verify when all 6 digits are filled (typing)
    const fullCode = newCode.join("");
    if (fullCode.length === 6 && newCode.every(d => d !== "")) {
      setTimeout(() => {
        handleVerifyEmailAuto(fullCode);
      }, 100);
    }
  };

  const handleVerificationKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (verificationCode[index] === "" && index > 0) {
        document.getElementById(`verify-code-${index - 1}`)?.focus();
      }
    }
  };

  const handlePasteCode = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setVerificationCode(digits);
      
      setTimeout(() => {
        handleVerifyEmailAuto(pastedData);
      }, 100);
    } else {
      setVerificationError("Please paste a valid 6-digit code");
      setTimeout(() => setVerificationError(""), 2000);
    }
  };

  const handleVerifyEmailAuto = async (fullCode) => {
    setVerificationLoading(true);
    setVerificationError("");
    
    try {
      const res = await fetch(`${BASE_URL}/api/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: fullCode }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        setShowVerification(false);
        setShowWelcome(true);
        setNewUserName(data.user?.fullName?.split(" ")[0] || "Member");
      } else {
        setVerificationError(data.error || "Invalid verification code");
        setVerificationCode(["", "", "", "", "", ""]);
        document.getElementById('verify-code-0')?.focus();
      }
    } catch (err) {
      setVerificationError("Network error. Please try again.");
      setVerificationCode(["", "", "", "", "", ""]);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const fullCode = verificationCode.join("");
    if (fullCode.length !== 6) {
      setVerificationError("Please enter the complete 6-digit code");
      return;
    }
    await handleVerifyEmailAuto(fullCode);
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
        document.getElementById('verify-code-0')?.focus();
        showToast("New verification code sent!", "success");
      } else {
        setVerificationError(data.error || "Failed to resend code");
      }
    } catch (err) {
      setVerificationError("Network error");
    } finally {
      setVerificationLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === "success" ? "#10b981" : "#ef4444"};
      color: white;
      padding: 12px 24px;
      border-radius: 40px;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "fadeOutDown 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    // Ensure full name is uppercase before sending
    const upperCaseFullName = fullName.toUpperCase();

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
        body: JSON.stringify({ fullName: upperCaseFullName, email, password, phone: formattedPhone }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setVerificationEmail(email);
        setVerificationCode(["", "", "", "", "", ""]);
        setVerificationError("");
        setVerificationTimer(300);
        setShowVerification(true);
        setRegistrationData({ fullName: upperCaseFullName, email });
        
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setConfirmPassword("");
      } else {
        showToast(data.error || "Registration failed", "error");
      }
    } catch (err) {
      console.error("Registration Error:", err);
      showToast("Network error. Please check your connection.", "error");
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
        staggerChildren: 0.08,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 120, damping: 15 }
    }
  };

  const getStrengthColor = () => {
    switch(passwordStrength) {
      case 0: return "#94a3b8";
      case 1: return "#ef4444";
      case 2: return "#f59e0b";
      case 3: return "#10b981";
      case 4: return "#06b6d4";
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
      <div style={styles.pageWrapper}>
        <div style={styles.container}>
          <div style={styles.backgroundOverlay} />
          
          {/* Floating particles */}
          <div style={styles.particlesContainer}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.particle,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${6 + Math.random() * 12}px`,
                  height: `${6 + Math.random() * 12}px`,
                  animationDelay: `${i * 1.5}s`,
                  animationDuration: `${12 + Math.random() * 10}s`
                }}
              />
            ))}
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={styles.card}
          >
            <div style={styles.cardInner} />

            <motion.div variants={itemVariants} style={styles.logoContainer}>
              <img src={logo} alt="ZUCA Logo" style={styles.logo} />
              <div style={styles.logoUnderline} />
            </motion.div>

            <motion.h2 variants={itemVariants} style={styles.title}>
              Create Account
            </motion.h2>

            <form onSubmit={handleRegister} style={styles.form}>
              {/* Full Name Field - FORCED TO UPPERCASE */}
              <motion.div variants={itemVariants} style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={{ color: focusedField === "name" ? "#3b82f6" : "#ffffff" }}>
                    Full Name (Uppercase)
                  </span>
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    placeholder="FULL NAME"
                    value={fullName}
                    onChange={handleFullNameChange}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.input,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: "500",
                      borderColor: focusedField === "name" ? "#3b82f6" : "#ffffff"
                    }}
                    required
                  />
                  {fullName.length > 0 && (
                    <div style={styles.capsIndicator}>
                      <span style={styles.capsIcon}>🔠</span>
                    </div>
                  )}
                </div>
                <div style={styles.hintText}>
                  <span>⚠️ All letters will be automatically capitalized</span>
                </div>
              </motion.div>

              {/* Email Field */}
              <motion.div variants={itemVariants} style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={{ color: focusedField === "email" ? "#3b82f6" : "#ffffff" }}>
                    Email Address
                  </span>
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type="email"
                    placeholder="use your offical email for verficaton"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.input,
                      borderColor: focusedField === "email" ? "#3b82f6" : "#ffffff"
                    }}
                    required
                  />
                </div>
              </motion.div>

              {/* Phone Field */}
              <motion.div variants={itemVariants} style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={{ color: focusedField === "phone" ? "#3b82f6" : "#ffffff" }}>
                    Phone Number
                  </span>
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type="tel"
                    placeholder="07xx3456xx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.input,
                      borderColor: focusedField === "phone" ? "#3b82f6" : "#ffffff"
                    }}
                    required
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants} style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={{ color: focusedField === "password" ? "#3b82f6" : "#ffffff" }}>
                    Password
                  </span>
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Use a Password you will remember"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.input,
                      paddingRight: "45px",
                      borderColor: focusedField === "password" ? "#3b82f6" : "#ffffff"
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                <AnimatePresence>
                  {password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={styles.strengthContainer}
                    >
                      <div style={styles.strengthBars}>
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            style={{
                              ...styles.strengthBar,
                              backgroundColor: level <= passwordStrength ? getStrengthColor() : "#334155",
                              width: `${25}%`
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ ...styles.strengthText, color: getStrengthColor() }}>
                        {getStrengthText()}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Confirm Password Field */}
              <motion.div variants={itemVariants} style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={{ color: focusedField === "confirm" ? "#3b82f6" : "#ffffff" }}>
                    Confirm Password
                  </span>
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.input,
                      paddingRight: "45px",
                      borderColor: focusedField === "confirm" ? "#3b82f6" : "#ffffff"
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeButton}
                  >
                    {showConfirm ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                <AnimatePresence>
                  {passwordMatch !== null && password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      style={{
                        ...styles.matchIndicator,
                        color: passwordMatch ? "#10b981" : "#ef4444"
                      }}
                    >
                      {passwordMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Register Button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  style={styles.registerButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div style={styles.buttonLoading}>
                      <span style={styles.buttonSpinner}>⟳</span>
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Login Link */}
            <motion.div variants={itemVariants} style={styles.loginSection}>
              <p style={styles.loginText}>
                Already have an account?{" "}
                <Link to="/login" style={styles.loginLink}>
                  Sign in
                </Link>
              </p>
            </motion.div>

            <div style={styles.faithText}>
              "I can do all things through Christ who strengthens me" ✝
            </div>
          </motion.div>
        </div>
      </div>

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25 }}
              style={styles.modal}
            >
              <div style={styles.modalHeader}>
                <img src={logo} alt="ZUCA" style={styles.modalLogo} />
                <h2 style={styles.modalTitle}>Verify Your Email</h2>
                <p style={styles.modalSubtitle}>
                  We sent a 6-digit code to:
                  <br />
                  <strong style={styles.modalEmail}>{verificationEmail}</strong>
                </p>
              </div>
              
              <div style={styles.codeContainer}>
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
                    onPaste={(e) => handlePasteCode(e)}
                    style={{
                      ...styles.codeInput,
                      borderColor: digit ? "#3b82f6" : "#334155"
                    }}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              
              <AnimatePresence>
                {verificationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={styles.modalError}
                  >
                    ⚠️ {verificationError}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={handleVerifyEmail}
                disabled={verificationLoading}
                style={{
                  ...styles.modalButton,
                  opacity: verificationLoading ? 0.7 : 1
                }}
              >
                {verificationLoading ? (
                  <div style={styles.buttonLoading}>
                    <span style={styles.buttonSpinner}>⟳</span>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Email"
                )}
              </button>
              
              <div style={styles.resendSection}>
                {verificationTimer > 0 ? (
                  <p style={styles.timerText}>
                    Resend code in <span style={styles.timer}>{formatTime(verificationTimer)}</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    disabled={verificationLoading}
                    style={styles.resendButton}
                  >
                    Resend Code
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowVerification(false)}
                style={styles.modalCancel}
              >
                Cancel
              </button>
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

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeOutDown {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
        input::placeholder {
          color: #ffffff69;
        }
      `}</style>
    </>
  );
}

const styles = {
  pageWrapper: {
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  container: {
    position: "relative",
    minHeight: "100vh",
    backgroundImage: `url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  },
  backgroundOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0), rgba(30, 27, 75, 0))",
  },
  particlesContainer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none"
  },
  particle: {
    position: "absolute",
    background: "rgba(59,130,246,0.15)",
    borderRadius: "50%",
    pointerEvents: "none",
    animation: "float 10s ease-in-out infinite"
  },
 card: {
  position: "relative",
  zIndex: 10,
  width: "100%",
  maxWidth: "440px",
  background: "rgba(15,23,42,0.7)",
  backdropFilter: "blur(20px)",
  borderRadius: "32px",
  padding: "0px 28px",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
},
  cardInner: {
    position: "absolute",
    inset: 0,
    borderRadius: "32px",
    background: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.08), transparent 70%)",
    pointerEvents: "none"
  },
  logoContainer: {
    textAlign: "center",
    marginBottom: "24px"
  },
  logo: {
    width: "75px",
    height: "auto",
    marginBottom: "12px",
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))"
  },
  logoUnderline: {
    width: "50px",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
    margin: "0 auto"
  },
  title: {
    textAlign: "center",
    fontSize: "28px",
    fontWeight: 700,
    background: "linear-gradient(135deg, #f1f5f9, #94a3b8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "32px",
    letterSpacing: "-0.5px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    marginLeft: "4px"
  },
  inputWrapper: {
    position: "relative"
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "rgba(30,41,59,0.6)",
    border: "1px solid",
    borderRadius: "16px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box"
  },
  capsIndicator: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    opacity: 0.5,
    pointerEvents: "none"
  },
  capsIcon: {
    fontSize: "16px"
  },
  hintText: {
    fontSize: "10px",
    color: "#fbbf24",
    marginTop: "4px",
    marginLeft: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  eyeButton: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    opacity: 0.6,
    padding: 0,
    color: "#94a3b8"
  },
  strengthContainer: {
    marginTop: "8px"
  },
  strengthBars: {
    display: "flex",
    gap: "6px",
    marginBottom: "4px"
  },
  strengthBar: {
    height: "4px",
    borderRadius: "2px",
    transition: "background-color 0.2s ease"
  },
  strengthText: {
    fontSize: "11px",
    fontWeight: 500
  },
  matchIndicator: {
    fontSize: "11px",
    marginTop: "4px",
    marginLeft: "4px"
  },
  registerButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "40px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "white",
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "8px"
  },
  buttonLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  buttonSpinner: {
    display: "inline-block",
    animation: "spin 1s linear infinite"
  },
  loginSection: {
    textAlign: "center",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.08)"
  },
  loginText: {
    fontSize: "14px",
    color: "#94a3b8"
  },
  loginLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: 600,
    transition: "color 0.2s"
  },
  faithText: {
    textAlign: "center",
    fontSize: "11px",
    color: "#475569",
    marginTop: "24px",
    fontStyle: "italic"
  },
  modalOverlay: {
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
  },
  modal: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderRadius: "28px",
    padding: "36px 32px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
    border: "1px solid rgba(59,130,246,0.3)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
  },
  modalHeader: {
    marginBottom: "28px"
  },
  modalLogo: {
    width: "60px",
    height: "auto",
    marginBottom: "16px"
  },
  modalTitle: {
    color: "white",
    fontSize: "24px",
    fontWeight: 600,
    marginBottom: "8px"
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.5
  },
  modalEmail: {
    color: "#3b82f6",
    fontSize: "15px"
  },
  codeContainer: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginBottom: "24px",
    flexWrap: "nowrap"
  },
  codeInput: {
    width: "48px",
    height: "56px",
    textAlign: "center",
    fontSize: "28px",
    fontWeight: "bold",
    borderRadius: "16px",
    border: "2px solid",
    background: "rgba(30,41,59,0.8)",
    color: "white",
    outline: "none",
    transition: "all 0.2s"
  },
  modalError: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "20px",
    color: "#ef4444",
    fontSize: "13px"
  },
  modalButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "40px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "white",
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
    marginBottom: "16px"
  },
  resendSection: {
    marginBottom: "16px"
  },
  timerText: {
    color: "#94a3b8",
    fontSize: "13px"
  },
  timer: {
    color: "#fbbf24",
    fontWeight: "bold"
  },
  resendButton: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "underline"
  },
  modalCancel: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "13px",
    transition: "color 0.2s"
  }
};

// Add hover styles for links
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a:hover {
    color: #60a5fa !important;
  }
  input:focus {
    background-color: rgba(30,41,59,0.8) !important;
  }
  button {
    font-family: inherit;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default Register;