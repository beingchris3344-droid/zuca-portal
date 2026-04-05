import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiMusic, FiAlertCircle } from "react-icons/fi";
import BASE_URL from "../../api";

export default function PendingSongs() {
  const [pendingSongs, setPendingSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPendingSongs();
  }, []);

  const fetchPendingSongs = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/pending-songs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingSongs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSong = (song) => {
  navigate(`/admin/hymns?new=true&title=${encodeURIComponent(song.title)}&pendingId=${song.id}`);
};

  if (loading) {
    return (
      <div style={container}>
        <div style={loadingText}>Loading pending songs...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={container}
    >
      <div style={header}>
        <h1 style={title}>Pending Songs</h1>
        <p style={subtitle}>Songs that need lyrics added</p>
      </div>

      {pendingSongs.length === 0 ? (
        <div style={emptyState}>
          <FiMusic size={48} color="#10b981" />
          <h3>All caught up!</h3>
          <p>No pending songs need lyrics</p>
        </div>
      ) : (
        <div style={songsList}>
          {pendingSongs.map((song) => (
            <motion.div
              key={song.id}
              style={songCard}
              whileHover={{ scale: 1.01 }}
            >
              <div style={songInfo}>
                <div style={songIcon}>
                  <FiAlertCircle />
                </div>
                <div style={songDetails}>
                  <h3 style={songTitle}>{song.title}</h3>
                  <div style={songMeta}>
                    <span>Type: {song.type || 'General'}</span>
                    <span>From: {song.program?.date?.split('T')[0] || 'Unknown'}</span>
                  </div>
                </div>
              </div>
              <button
                style={addButton}
                onClick={() => addSong(song)}
              >
                <FiPlus /> Add Lyrics
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const container = {
  padding: "24px",
  maxWidth: "800px",
  margin: "0 auto",
  fontFamily: "'Inter', sans-serif",
  minHeight: "100vh",
  background: "#f8fafc",
};

const header = {
  marginBottom: "24px",
};

const title = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 8px 0",
};

const subtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: 0,
};

const songsList = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const songCard = {
  background: "white",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e2e8f0",
};

const songInfo = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flex: 1,
};

const songIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "#fef3c7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  color: "#d97706",
};

const songDetails = {
  flex: 1,
};

const songTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const songMeta = {
  display: "flex",
  gap: "12px",
  fontSize: "12px",
  color: "#64748b",
};

const addButton = {
  background: "#4f46e5",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const emptyState = {
  textAlign: "center",
  padding: "60px 20px",
  background: "white",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
};

const loadingText = {
  textAlign: "center",
  padding: "60px",
  color: "#64748b",
};