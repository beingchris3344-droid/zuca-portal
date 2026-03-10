import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import bg from "../assets/background3.webp";
import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  // Track mouse for subtle parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Email validation
  useEffect(() => {
    if (email && !email.includes("@")) {
      setEmailError("Hmm, that doesn't look like an email");
    } else {
      setEmailError("");
    }
  }, [email]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    // Simulate a moment of anticipation
    await new Promise(resolve => setTimeout(resolve, 800));

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

        // Small celebration before redirect
        setTimeout(() => {
          if (data.user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 500);
      } else {
        setLoginError(data.error || "Those credentials don't match our records");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setLoginError("Connection issue. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  // Animation variants with soul
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  const glowVariants = {
    initial: { opacity: 0.3, scale: 1 },
    hover: { 
      opacity: 0.6, 
      scale: 1.02,
      transition: { duration: 0.3 }
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={containerStyle(bg)}
    >
      {/* Animated gradient overlay with depth */}
      <motion.div 
        style={{
          ...overlayStyle,
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />

      {/* Atmospheric particles */}
      <div style={particleFieldStyle}>
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0 
            }}
            animate={{ 
              x: [null, Math.random() * 100 - 50],
              y: [null, Math.random() * 100 - 50],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            style={{
              ...particleStyle,
              left: `${i * 8}%`,
              top: `${i * 7}%`,
              width: `${4 + i % 5}px`,
              height: `${4 + i % 5}px`,
              background: i % 3 === 0 ? "rgba(0,198,255,0.3)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* Main Card with Depth */}
      <motion.div
        variants={childVariants}
        style={{
          ...cardStyle,
          transform: `perspective(1000px) rotateX(${mousePosition.y * 0.02}deg) rotateY(${mousePosition.x * 0.02}deg)`,
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Inner glow effect */}
        <div style={cardInnerGlowStyle} />

        {/* Logo with personality */}
        <motion.div 
          style={logoContainerStyle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <img src={logo} alt="ZUCA Logo" style={logoStyle} />
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "60px" }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={logoUnderlineStyle}
          />
        </motion.div>

        {/* Welcome message with heart */}
        <motion.div variants={childVariants}>
          <h2 style={welcomeStyle}>
            <span style={welcomeTextStyle}>Welcome back to</span>
            <br />
            <span style={gradientTextStyle}>ZUCA Portal</span>
          </h2>
          <motion.p 
            style={greetingStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            We've missed you ✨
          </motion.p>
        </motion.div>

        <form onSubmit={handleLogin}>
          {/* Email Field with Character */}
          <motion.div variants={childVariants}>
            <label style={labelStyle}>
              <motion.span
                animate={{ 
                  x: focusedField === "email" ? 5 : 0,
                  color: focusedField === "email" ? "#00c6ff" : "rgba(255,255,255,0.8)"
                }}
              >
                Email address
              </motion.span>
            </label>
            <div style={inputWrapperStyle}>
              <motion.input
                type="email"
                placeholder="your.name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
                style={inputStyle}
                whileFocus={{ 
                  scale: 1.02,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderColor: "#00c6ff",
                }}
                animate={{
                  borderColor: emailError ? "#ef4444" : focusedField === "email" ? "#00c6ff" : "transparent",
                }}
              />
              <AnimatePresence>
                {focusedField === "email" && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={fieldGlowStyle}
                  >
                    <span style={fieldGlowInnerStyle} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {emailError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={errorStyle}
                >
                  {emailError}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Password Field with Character */}
          <motion.div variants={childVariants}>
            <label style={labelStyle}>
              <motion.span
                animate={{ 
                  x: focusedField === "password" ? 5 : 0,
                  color: focusedField === "password" ? "#00c6ff" : "rgba(255,255,255,0.8)"
                }}
              >
                Password
              </motion.span>
            </label>
            <div style={inputWrapperStyle}>
              <motion.input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                required
                style={{
                  ...inputStyle,
                  paddingRight: "45px",
                }}
                whileFocus={{ 
                  scale: 1.02,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderColor: "#00c6ff",
                }}
              />
              <motion.span
                onClick={() => setShowPassword(!showPassword)}
                style={eyeStyle}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </motion.span>
              <AnimatePresence>
                {focusedField === "password" && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={fieldGlowStyle}
                  >
                    <span style={fieldGlowInnerStyle} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Forgot Password Link */}
          <motion.div 
            variants={childVariants}
            style={forgotContainerStyle}
          >
            <Link to="/forgot-password" style={forgotLinkStyle}>
              <motion.span
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Forgot your password? 
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                whileHover={{ opacity: 1, x: 3 }}
              >
                →
              </motion.span>
            </Link>
          </motion.div>

          {/* Login Error Message */}
          <AnimatePresence>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={loginErrorStyle}
              >
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Button */}
          <motion.div variants={childVariants}>
            <motion.button
              type="submit"
              style={buttonStyle}
              disabled={loading}
              variants={glowVariants}
              initial="initial"
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <motion.div style={loadingContainerStyle}>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={loadingSpinnerStyle}
                  >
                    ⟳
                  </motion.span>
                  <span style={loadingTextStyle}>Welcoming you...</span>
                </motion.div>
              ) : (
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Sign in to continue →
                </motion.span>
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Register Link */}
        <motion.div 
          variants={childVariants}
          style={registerContainerStyle}
        >
          <span style={registerTextStyle}>New to our community?</span>
          <Link to="/register">
            <motion.button
              style={secondaryButton}
              whileHover={{ 
                scale: 1.05,
                backgroundColor: "rgba(49, 53, 235, 0.9)",
                boxShadow: "0 10px 25px -5px rgba(49, 53, 235, 0.4)"
              }}
              whileTap={{ scale: 0.95 }}
            >
              Create your account
            </motion.button>
          </Link>
        </motion.div>

        {/* Faith-inspired subtle text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={faithTextStyle}
        >
          "Where two or three gather in my name..." ✝
        </motion.div>
      </motion.div>

      <style>
        {`
          @keyframes gradientFlow {
            0% {background-position: 0% 50%;}
            50% {background-position: 100% 50%;}
            100% {background-position: 0% 50%;}
          }
          
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
          
          input::placeholder {
            color: rgba(255,255,255,0.3);
            font-size: 13px;
            font-style: italic;
            transition: all 0.3s;
          }
          
          input:focus::placeholder {
            opacity: 0.5;
            transform: translateX(8px);
          }
        `}
      </style>
    </motion.div>
  );
}

// ==================== Styles with Soul ====================

const containerStyle = (bg) => ({
  minHeight: "100vh",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  overflow: "hidden",
});

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(-45deg, rgba(49,15,221,0.7), rgba(0,0,0,0.8), rgba(49,15,221,0.7))",
  backgroundSize: "400% 400%",
  animation: "gradientFlow 15s ease infinite",
};

const particleFieldStyle = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
  zIndex: 1,
};

const particleStyle = {
  position: "absolute",
  borderRadius: "50%",
  filter: "blur(2px)",
  pointerEvents: "none",
};

const cardStyle = {
  position: "relative",
  zIndex: 10,
  background: "rgba(20, 10, 20, 0.3)",
  backdropFilter: "blur(16px)",
  padding: "50px",
  borderRadius: "32px",
  width: "90%",
  maxWidth: "420px",
  color: "white",
  boxShadow: "0 30px 60px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.05)",
  transition: "all 0.3s ease",
  overflow: "hidden",
};

const cardInnerGlowStyle = {
  position: "absolute",
  top: "-50%",
  left: "-50%",
  width: "200%",
  height: "200%",
  background: "radial-gradient(circle at 50% 50%, rgba(0,198,255,0.1), transparent 70%)",
  zIndex: -1,
};

const logoContainerStyle = {
  textAlign: "center",
  marginBottom: "25px",
  position: "relative",
};

const logoStyle = {
  width: "85px",
  height: "auto",
  filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.3))",
};

const logoUnderlineStyle = {
  height: "2px",
  background: "linear-gradient(90deg, transparent, #00c6ff, transparent)",
  margin: "10px auto 0",
  borderRadius: "2px",
};

const welcomeStyle = {
  textAlign: "center",
  marginBottom: "30px",
};

const welcomeTextStyle = {
  fontSize: "14px",
  fontWeight: "400",
  color: "rgba(255,255,255,0.6)",
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const gradientTextStyle = {
  fontSize: "32px",
  fontWeight: "700",
  background: "linear-gradient(135deg, #fff, #00c6ff, #fff)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "gradientFlow 5s ease infinite",
  letterSpacing: "0.5px",
};

const greetingStyle = {
  textAlign: "center",
  fontSize: "14px",
  color: "rgba(255,255,255,0.5)",
  marginTop: "-15px",
  marginBottom: "25px",
  fontStyle: "italic",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: "500",
  transition: "all 0.3s",
};

const inputWrapperStyle = {
  position: "relative",
  marginBottom: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "15px 14px",
  borderRadius: "16px",
  border: "1px solid transparent",
  outline: "none",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
  backdropFilter: "blur(5px)",
  transition: "all 0.3s ease",
};

const fieldGlowStyle = {
  position: "absolute",
  inset: "-2px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #00c6ff, transparent)",
  opacity: 0.3,
  zIndex: -1,
};

const fieldGlowInnerStyle = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.1)",
};

const eyeStyle = {
  position: "absolute",
  right: "14px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  fontSize: "22px",
  opacity: 0.7,
  transition: "all 0.3s",
  zIndex: 2,
};

const forgotContainerStyle = {
  textAlign: "right",
  marginBottom: "20px",
};

const forgotLinkStyle = {
  color: "rgba(255,255,255,0.7)",
  textDecoration: "none",
  fontSize: "13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  transition: "color 0.3s",
  borderBottom: "1px solid transparent",
};

const errorStyle = {
  color: "#ef4444",
  fontSize: "12px",
  marginTop: "-8px",
  marginBottom: "15px",
  paddingLeft: "5px",
};

const loginErrorStyle = {
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "20px",
  color: "#ef4444",
  fontSize: "13px",
  textAlign: "center",
  backdropFilter: "blur(5px)",
};

const buttonStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #0fdd20, #0a9f1a)",
  color: "white",
  fontWeight: "600",
  fontSize: "16px",
  cursor: "pointer",
  transition: "all 0.3s",
  boxShadow: "0 10px 25px -5px rgba(15,221,32,0.4)",
  position: "relative",
  overflow: "hidden",
};

const loadingContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
};

const loadingSpinnerStyle = {
  display: "inline-block",
  fontSize: "20px",
};

const loadingTextStyle = {
  fontSize: "15px",
};

const registerContainerStyle = {
  textAlign: "center",
  marginTop: "25px",
};

const registerTextStyle = {
  display: "block",
  fontSize: "14px",
  color: "rgba(255,255,255,0.6)",
  marginBottom: "10px",
};

const secondaryButton = {
  padding: "12px 30px",
  borderRadius: "40px",
  border: "none",
  background: "rgba(49, 53, 235, 0.6)",
  color: "white",
  fontSize: "15px",
  fontWeight: "500",
  cursor: "pointer",
  backdropFilter: "blur(5px)",
  border: "1px solid rgba(255,255,255,0.1)",
  transition: "all 0.3s",
};

const faithTextStyle = {
  position: "absolute",
  bottom: "15px",
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: "10px",
  color: "rgba(255,255,255,0.2)",
  whiteSpace: "nowrap",
  letterSpacing: "0.5px",
};

export default Login;