import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiHeart } from "react-icons/fi";

export default function WelcomeModal({ isOpen, onClose, userName }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={styles.overlay}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          style={styles.modal}
        >
          <div style={styles.iconContainer}>
            <FiHeart size={48} color="#ef4444" />
          </div>
          
          <h2 style={styles.title}>
            Welcome to ZUCA Portal! 🙏
          </h2>
          
          <p style={styles.message}>
            Hello <strong>{userName}</strong>!<br />
            You are now part of the Zetech University Catholic Action community.
          </p>
          
          <p style={styles.subMessage}>
            Explore mass programs, join discussions,<br />
            make contributions, and grow in faith with us.<br /><br />
            Tumsifu Yesu Kristu!
          </p>
          
          <button onClick={onClose} style={styles.button}>
            <FiCheck size={18} /> I Accept & Continue
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
    padding: "20px",
  },
  modal: {
    background: "linear-gradient(135deg, #ffffff, #f8fafc)",
    borderRadius: "28px",
    padding: "48px 40px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    border: "1px solid rgba(0,198,255,0.2)",
  },
  iconContainer: {
    width: "90px",
    height: "90px",
    background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    boxShadow: "0 4px 15px rgba(239,68,68,0.2)",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "16px",
  },
  message: {
    fontSize: "16px",
    color: "#334155",
    lineHeight: "1.6",
    marginBottom: "16px",
  },
  subMessage: {
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.5",
    marginBottom: "32px",
  },
  button: {
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "white",
    border: "none",
    padding: "14px 28px",
    borderRadius: "40px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    justifyContent: "center",
    width: "100%",
    transition: "all 0.2s",
  },
};