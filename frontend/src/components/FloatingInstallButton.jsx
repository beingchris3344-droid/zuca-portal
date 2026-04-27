// frontend/src/components/FloatingInstallButton.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaDownload, FaTimes, FaBell } from "react-icons/fa";

const FloatingInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [user, setUser] = useState(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState(null);
  const [recurringTimer, setRecurringTimer] = useState(null);

  // Get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user:", e);
      }
    }
  }, []);

  // Check if app is installed (PWA mode)
  const isAppInstalled = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           window.matchMedia('(display-mode: minimal-ui)').matches;
  };

  // Auto-close popup after 10 seconds
  const startAutoCloseTimer = () => {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    const timer = setTimeout(() => {
      setShowPopup(false);
    }, 10000); // 10 seconds
    setAutoCloseTimer(timer);
  };

  // Show popup with auto-close
  const showWithAutoClose = () => {
    if (!isAppInstalled() && !showPopup) {
      setShowPopup(true);
      startAutoCloseTimer();
    }
  };

  useEffect(() => {
    // IF APP IS INSTALLED - NEVER SHOW ANYTHING
    if (isAppInstalled()) {
      console.log("App is installed - popup disabled");
      return;
    }

    // Listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // SHOW POPUP ON FIRST ENTRY (after 1 second for smooth animation)
    const initialTimer = setTimeout(() => {
      console.log("Showing initial popup (first entry)");
      showWithAutoClose();
    }, 10000);

    // Set recurring timer every 1 minute
    const timer = setInterval(() => {
      console.log("Showing recurring popup (1 minute later)");
      showWithAutoClose();
    }, 1080000); // 1 minute

    setRecurringTimer(timer);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(initialTimer);
      if (timer) clearInterval(timer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, []); // Remove dependencies since we don't have permanent dismiss

  const handleInstall = async () => {
    console.log("Install button clicked");
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install outcome:", outcome);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPopup(false);
        // Clear all timers since app is installed
        if (recurringTimer) clearInterval(recurringTimer);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
      }
    } else {
      alert(
        '📱 To install ZUCA Portal on your device:\n\n' +
        '🔵 Android (Chrome):\n' +
        '• Tap the menu button (⋮) at top right\n' +
        '• Select "Add to Home screen"\n' +
        '• Tap "Add" or "Install"\n\n' +
        '🍎 iPhone/iPad (Safari):\n' +
        '• Tap the Share button (📤) at bottom\n' +
        '• Scroll down and tap "Add to Home Screen"\n' +
        '• Tap "Add" in top right\n\n' +
        '💻 Desktop (Chrome/Edge):\n' +
        '• Click the install icon (➕) in address bar\n' +
        '• Click "Install"'
      );
    }
  };

  const handleDismiss = () => {
    console.log("Dismiss button clicked");
    setShowPopup(false);
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
  };

  // ========== RETURN NOTHING IF APP IS INSTALLED ==========
  if (isAppInstalled()) {
    return null;
  }

  // Personalize message based on login status
  const userName = user?.fullName?.split(" ")[0];
  const greeting = userName ? `Hey ${userName}!` : "Hey there!";
  const personalMessage = userName 
    ? `Welcome back ${userName}! kindly Install our app for a better experience fast log in and better acess and performance -REGARDS: -ZUCA-APP-.`
    : "Welcome to ZUCA! Install our app for faster access and push notifications.";

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          style={styles.container}
        >
          <div style={styles.popupCard}>
            {/* Bell Icon */}
            <div style={styles.iconWrapper}>
              <FaBell size={24} color="#ffd700" />
            </div>

            {/* Content */}
            <div style={styles.content}>
              <h3 style={styles.title}>Install ZUCA App! 🚀</h3>
              <p style={styles.description}>
                <strong>{greeting}</strong><br />
                {personalMessage}
              </p>
              <p style={styles.benefits}>
                ✓ Faster access • ✓ Push notifications • ✓ Better experience
              </p>
            </div>

            {/* Actions - NO "Don't show again" button */}
            <div style={styles.actions}>
              <motion.button
                onClick={handleInstall}
                style={styles.installButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaDownload size={16} />
                Install Now
              </motion.button>
              
              <motion.button
                onClick={handleDismiss}
                style={styles.laterButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Later
              </motion.button>
            </div>

            {/* Close button */}
            <button onClick={handleDismiss} style={styles.closeButton}>
              <FaTimes size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const styles = {
  container: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 9999,
    maxWidth: "380px",
    width: "calc(100% - 40px)",
    "@media (min-width: 768px)": {
      width: "380px",
    },
  },
  popupCard: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 215, 0, 0.3)",
    position: "relative",
    backdropFilter: "blur(10px)",
  },
  iconWrapper: {
    position: "absolute",
    top: "-15px",
    left: "20px",
    background: "#1e293b",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ffd700",
  },
  content: {
    marginTop: "10px",
    marginBottom: "20px",
  },
  title: {
    color: "white",
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  description: {
    color: "#cbd5e1",
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0 0 8px 0",
  },
  benefits: {
    color: "#ffd700",
    fontSize: "11px",
    margin: "8px 0 0 0",
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginBottom: "0", // Changed from 12px to 0 since no never button
  },
  installButton: {
    flex: 2,
    background: "linear-gradient(135deg, #ffd700, #ffaa00)",
    color: "#1a1a2e",
    border: "none",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  laterButton: {
    flex: 1,
    background: "rgba(255, 255, 255, 0.1)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  closeButton: {
    position: "absolute",
    top: "12px",
    right: "12px",
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#94a3b8",
    transition: "all 0.2s",
    ":hover": {
      background: "rgba(255, 255, 255, 0.2)",
      color: "white",
    },
  },
};

export default FloatingInstallButton;