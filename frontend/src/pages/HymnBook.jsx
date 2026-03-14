// frontend/src/pages/HymnBook.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  FiSearch, 
  FiHeart, 
  FiShare2, 
  FiCopy,
  FiChevronDown,
  FiChevronUp,
  FiMusic,
  FiBookOpen,
  FiClock,
  FiFilter,
  FiEye
} from "react-icons/fi";
import { 
  BsMusicNoteBeamed, 
  BsBook, 
  BsHeart,
  BsWhatsapp,
  BsTelegram,
  BsTwitter,
  BsThreeDotsVertical
} from "react-icons/bs";
import { 
  GiPrayerBeads,
  GiChurch,
  GiAngelWings,
  GiHolyGrail
} from "react-icons/gi";
import { IoTimeOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import BASE_URL from "../api";

export default function HymnBook() {  // Changed from Songs to HymnBook
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedSong, setSelectedSong] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    withLyrics: 0,
    favorites: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [expandedId, setExpandedId] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [previewSong, setPreviewSong] = useState(null);

  const token = localStorage.getItem("token");

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("songFavorites");
    if (saved) setFavorites(JSON.parse(saved));
    
    const viewed = localStorage.getItem("recentSongs");
    if (viewed) setRecentlyViewed(JSON.parse(viewed).slice(0, 5));
  }, []);

  // Save favorites
  useEffect(() => {
    localStorage.setItem("songFavorites", JSON.stringify(favorites));
    setStats(prev => ({ ...prev, favorites: favorites.length }));
  }, [favorites]);

  // Fetch songs
  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setSongs(res.data);
      setFilteredSongs(res.data);
      
      const withLyrics = res.data.filter(s => s.firstLine).length;
      setStats({
        total: res.data.length,
        withLyrics,
        favorites: favorites.length,
      });
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, [token, favorites.length]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Search and filter
  useEffect(() => {
    let filtered = [...songs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(song => 
        song.title.toLowerCase().includes(term) ||
        (song.firstLine && song.firstLine.toLowerCase().includes(term))
      );
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(song => favorites.includes(song.id));
    }

    setFilteredSongs(filtered);
  }, [searchTerm, songs, showFavoritesOnly, favorites]);

  // Track recently viewed
  const trackView = (song) => {
    const updated = [song, ...recentlyViewed.filter(s => s.id !== song.id)].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem("recentSongs", JSON.stringify(updated));
  };

  // Toggle favorite
  const toggleFavorite = (id, e) => {
    e?.stopPropagation();
    const newFavorites = favorites.includes(id)
      ? favorites.filter(x => x !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    showToast(newFavorites.includes(id) ? "❤️ Added to favorites" : "❤️ Removed from favorites");
  };

  // Copy to clipboard
  const copyToClipboard = (song) => {
    const text = `${song.title}\n${song.reference ? `(${song.reference})\n` : ''}\n${song.firstLine || ''}`;
    navigator.clipboard.writeText(text);
    showToast("📋 Song info copied!");
  };

  // Share song
  const shareSong = (song, platform) => {
    const text = `Check out this hymn: ${song.title} ${song.reference ? `(${song.reference})` : ''}`;
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      setShareModal(song);
    }
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  if (loading) {
    return (
      <div style={loadingContainer}>
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={loadingSpinner}
        >
          🎵
        </motion.div>
        <p style={loadingText}>Loading hymns...</p>
        <p style={loadingSubtext}>Preparing your songbook</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={container}
    >
      {/* Header */}
      <div style={headerSection}>
        <div style={headerTop}>
          <div style={titleWrapper}>
            <div style={titleIcon}>🎵</div>
            <div>
              <h1 style={title}>Hymn Book</h1>
              <p style={titleSub}>{stats.total} hymns • {stats.withLyrics} with lyrics</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={compactStats}>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFavoritesOnly(false)}
          >
            <span style={compactStatValue}>{stats.total}</span>
            <span style={compactStatLabel}>Total</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
          >
            <span style={compactStatValue}>{stats.withLyrics}</span>
            <span style={compactStatLabel}>Lyrics</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <span style={{ ...compactStatValue, color: showFavoritesOnly ? "#ec4899" : "#64748b" }}>
              <FiHeart style={{ fill: showFavoritesOnly ? "#ec4899" : "none" }} />
            </span>
            <span style={compactStatLabel}>Fav</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <span style={compactStatValue}>
              {viewMode === 'grid' ? '☷' : '▦'}
            </span>
            <span style={compactStatLabel}>View</span>
          </motion.div>
        </div>

        {/* Search */}
        <div style={searchContainer}>
          <FiSearch style={searchIcon} />
          <input
            type="text"
            placeholder="Search hymns by title or lyrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={searchClear}>✕</button>
          )}
        </div>

        {/* Results Count */}
        <div style={resultsCount}>
          <span style={resultsBold}>{filteredSongs.length}</span> hymns found
          {showFavoritesOnly && " • Favorites only"}
        </div>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && !searchTerm && !showFavoritesOnly && (
          <div style={recentSection}>
            <div style={recentHeader}>
              <IoTimeOutline size={14} />
              <span>Recently viewed</span>
            </div>
            <div style={recentList}>
              {recentlyViewed.map(song => (
                <Link
                  to={`/hymn/${song.id}`}  // CHANGED: /song/ to /hymn/
                  key={song.id}
                  style={recentItem}
                  onClick={() => trackView(song)}
                >
                  <span style={recentTitle}>{song.title}</span>
                  {song.reference && <span style={recentRef}>{song.reference}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Songs Grid */}
      <div style={viewMode === 'grid' ? songsGrid : songsList}>
        <AnimatePresence>
          {filteredSongs.map((song) => (
            <motion.div
              key={song.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                ...songCard,
                ...(viewMode === 'list' && songCardList),
              }}
            >
              <Link 
                to={`/hymn/${song.id}`}  // CHANGED: /song/ to /hymn/
                style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
                onClick={() => trackView(song)}
              >
                <div style={songCardHeader}>
                  <div style={songIconWrapper}>
                    <GiPrayerBeads style={songCardIcon} />
                  </div>
                  <div style={songCardInfo}>
                    <div style={songCardTitleRow}>
                      <h3 style={songCardTitle}>{song.title}</h3>
                      {favorites.includes(song.id) && (
                        <FiHeart size={12} color="#ec4899" style={{ fill: "#ec4899" }} />
                      )}
                    </div>
                    {song.reference && (
                      <div style={songCardRef}>{song.reference}</div>
                    )}
                    {song.firstLine && (
                      <div style={songCardPreview}>
                        {song.firstLine}
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              {/* Action Buttons */}
              <div style={songCardActions}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => toggleFavorite(song.id, e)}
                  style={actionIconButton}
                >
                  <FiHeart style={{ 
                    color: favorites.includes(song.id) ? "#ec4899" : "#94a3b8",
                    fill: favorites.includes(song.id) ? "#ec4899" : "none"
                  }} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyToClipboard(song)}
                  style={actionIconButton}
                >
                  <FiCopy size={14} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => shareSong(song)}
                  style={actionIconButton}
                >
                  <FiShare2 size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredSongs.length === 0 && (
        <div style={emptyState}>
          <div style={emptyIcon}>🎵</div>
          <h3 style={emptyTitle}>No hymns found</h3>
          <p style={emptyText}>Try adjusting your search or filters</p>
          <button 
            onClick={() => {
              setSearchTerm("");
              setShowFavoritesOnly(false);
            }}
            style={emptyButton}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalOverlay}
            onClick={() => setShareModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={modalTitle}>Share Hymn</h3>
              <p style={modalSongTitle}>{shareModal.title}</p>
              
              <div style={modalOptions}>
                <button onClick={() => shareSong(shareModal, 'whatsapp')} style={modalOption}>
                  <BsWhatsapp size={24} color="#25D366" />
                  <span>WhatsApp</span>
                </button>
                <button onClick={() => shareSong(shareModal, 'telegram')} style={modalOption}>
                  <BsTelegram size={24} color="#0088cc" />
                  <span>Telegram</span>
                </button>
                <button onClick={() => shareSong(shareModal, 'twitter')} style={modalOption}>
                  <BsTwitter size={24} color="#1DA1F2" />
                  <span>Twitter</span>
                </button>
              </div>

              <button onClick={() => setShareModal(null)} style={modalClose}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </motion.div>
  );
}

// ... (keep all the styles the same - they don't need to change)
// ====== STYLES (Matching your MassPrograms page) ======

const container = {
  padding: "12px",
  maxWidth: "100%",
  fontFamily: "'Inter', -apple-system, sans-serif",
  background: "#f8fafc",
  minHeight: "100vh",
  borderRadius: "25px",
};

// Loading
const loadingContainer = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  borderRadius: "40px",
};

const loadingSpinner = {
  width: "60px",
  height: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  background: "#ffffff",
  borderRadius: "50%",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginBottom: "16px",
};

const loadingText = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: "4px",
};

const loadingSubtext = {
  color: "#64748b",
  fontSize: "12px",
};

// Header
const headerSection = {
  marginBottom: "16px",
};

const headerTop = {
  marginBottom: "12px",
};

const titleWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const titleIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  color: "#ffffff",
};

const title = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
};

const titleSub = {
  fontSize: "12px",
  color: "#64748b",
  margin: 0,
};

// Compact Stats
const compactStats = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "6px",
  marginBottom: "12px",
};

const compactStat = {
  background: "#ffffff",
  padding: "10px 4px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  cursor: "pointer",
};

const compactStatValue = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
};

const compactStatLabel = {
  fontSize: "10px",
  color: "#64748b",
  textTransform: "uppercase",
};

// Search
const searchContainer = {
  position: "relative",
  marginBottom: "8px",
};

const searchIcon = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  fontSize: "14px",
};

const searchInput = {
  width: "100%",
  padding: "12px 12px 12px 40px",
  borderRadius: "30px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: "14px",
  outline: "none",
};

const searchClear = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: "16px",
  cursor: "pointer",
  padding: "4px 8px",
};

// Results Count
const resultsCount = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "12px",
};

const resultsBold = {
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 2px",
};

// Recently Viewed
const recentSection = {
  marginBottom: "16px",
};

const recentHeader = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  color: "#64748b",
  marginBottom: "8px",
  textTransform: "uppercase",
};

const recentList = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const recentItem = {
  padding: "6px 12px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  fontSize: "12px",
  color: "#0f172a",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const recentTitle = {
  fontWeight: "500",
};

const recentRef = {
  fontSize: "9px",
  color: "#64748b",
};

// Songs Grid
const songsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
};

const songsList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

// Song Card
const songCard = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const songCardList = {
  flexDirection: "row",
  alignItems: "center",
};

const songCardHeader = {
  display: "flex",
  gap: "10px",
};

const songIconWrapper = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const songCardIcon = {
  fontSize: "18px",
  color: "#4f46e5",
};

const songCardInfo = {
  flex: 1,
};

const songCardTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "2px",
};

const songCardTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: 0,
  lineHeight: 1.3,
};

const songCardRef = {
  fontSize: "10px",
  color: "#64748b",
  marginBottom: "4px",
};

const songCardPreview = {
  fontSize: "11px",
  color: "#475569",
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const songCardActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  marginTop: "4px",
};

const actionIconButton = {
  background: "#f1f5f9",
  border: "none",
  borderRadius: "8px",
  padding: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#475569",
};

// Empty State
const emptyState = {
  textAlign: "center",
  padding: "40px 20px",
};

const emptyIcon = {
  fontSize: "48px",
  marginBottom: "16px",
  opacity: 0.5,
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#0f172a",
  marginBottom: "8px",
};

const emptyText = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "20px",
};

const emptyButton = {
  padding: "10px 20px",
  background: "#4f46e5",
  color: "#ffffff",
  border: "none",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
};

// Modal Styles
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 1000,
};

const modalContent = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "24px",
  maxWidth: "320px",
  width: "100%",
};

const modalTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
  marginBottom: "8px",
  textAlign: "center",
};

const modalSongTitle = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "20px",
  textAlign: "center",
  padding: "0 10px",
};

const modalOptions = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  marginBottom: "20px",
};

const modalOption = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "11px",
  color: "#0f172a",
  flex: 1,
};

const modalClose = {
  width: "100%",
  padding: "12px",
  background: "#4f46e5",
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

// Toast Style
const toastStyle = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease;
  white-space: nowrap;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;