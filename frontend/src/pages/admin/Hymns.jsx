// frontend/src/pages/admin/Hymns.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  FiEdit2, 
  FiTrash2, 
  FiPlus,
  FiSearch,
  FiX,
  FiSave,
  FiHeart,
  FiCopy,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiCheckCircle
} from "react-icons/fi";
import { 
  BsMusicNoteBeamed,
  BsFileText,
  BsCheckCircle
} from "react-icons/bs";
import { GiPrayerBeads } from "react-icons/gi";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../api";

export default function AdminHymns() {
  const navigate = useNavigate();
  const [hymns, setHymns] = useState([]);
  const [filteredHymns, setFilteredHymns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    reference: "",
    lyrics: ""
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [stats, setStats] = useState({
    total: 0,
    withRef: 0,
    withoutRef: 0
  });

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin" || user?.specialRole === "secretary" || user?.specialRole === "choir_moderator";

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      showToast("⛔ Admin access only");
    }
  }, [isAdmin, navigate]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch hymns
  const fetchHymns = async () => {
    try {
      setLoading(true);
const res = await axios.get(`${BASE_URL}/api/admin/songs`, {        headers: { Authorization: `Bearer ${token}` }
      });
      setHymns(res.data);
      setFilteredHymns(res.data);
      
      // Calculate stats
      const withRef = res.data.filter(h => h.reference).length;
      setStats({
        total: res.data.length,
        withRef,
        withoutRef: res.data.length - withRef
      });
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load hymns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHymns();
  }, []);

  // Search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredHymns(hymns);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = hymns.filter(h => 
        h.title.toLowerCase().includes(term) ||
        (h.reference && h.reference.toLowerCase().includes(term)) ||
        (h.firstLine && h.firstLine.toLowerCase().includes(term))
      );
      setFilteredHymns(filtered);
    }
  }, [searchTerm, hymns]);

  // Add hymn
  const handleAdd = async () => {
    try {
      if (!formData.title.trim()) {
        showToast("❌ Title is required");
        return;
      }

      const res = await axios.post(`${BASE_URL}/api/admin/songs`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setHymns([res.data, ...hymns]);
      setShowAddModal(false);
      resetForm();
      showToast("✅ Hymn added successfully");
      setSuccessMessage("Hymn added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to add hymn");
    }
  };

  // Edit hymn
  const handleEdit = async () => {
    try {
      if (!formData.title.trim()) {
        showToast("❌ Title is required");
        return;
      }

      const res = await axios.put(`${BASE_URL}/api/admin/songs/${selectedHymn.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setHymns(hymns.map(h => h.id === selectedHymn.id ? res.data : h));
      setShowEditModal(false);
      resetForm();
      showToast("✅ Hymn updated successfully");
      setSuccessMessage("Hymn updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to update hymn");
    }
  };

  // Delete hymn
  const handleDelete = async () => {
    try {
      await axios.delete(`${BASE_URL}/api/admin/songs/${selectedHymn.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setHymns(hymns.filter(h => h.id !== selectedHymn.id));
      setShowDeleteModal(false);
      setSelectedHymn(null);
      showToast("✅ Hymn deleted");
      setSuccessMessage("Hymn deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to delete hymn");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", reference: "", lyrics: "" });
    setSelectedHymn(null);
    setPreviewMode(false);
  };

  const openEditModal = (hymn) => {
    setSelectedHymn(hymn);
    setFormData({
      title: hymn.title || "",
      reference: hymn.reference || "",
      lyrics: hymn.lyrics || ""
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (hymn) => {
    setSelectedHymn(hymn);
    setShowDeleteModal(true);
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Format lyrics for preview
  const formatLyrics = (lyrics) => {
    if (!lyrics) return [];
    return lyrics.split('\n\n').filter(v => v.trim() !== '');
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
        <p style={loadingSubtext}>Admin panel</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={container}
    >
      {/* Success Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={successBanner}
          >
            <FiCheckCircle size={20} />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={headerSection}>
        <div style={headerTop}>
          <div style={titleWrapper}>
            <div style={titleIcon}>📚</div>
            <div>
              <h1 style={title}>Admin: Hymn Management</h1>
              <p style={titleSub}>{stats.total} total hymns • {stats.withRef} with references</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            style={addButton}
          >
            <FiPlus size={20} />
            <span>Add Hymn</span>
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div style={statsGrid}>
          <div style={statCard}>
            <span style={statValue}>{stats.total}</span>
            <span style={statLabel}>Total Hymns</span>
          </div>
          <div style={statCard}>
            <span style={statValue}>{stats.withRef}</span>
            <span style={statLabel}>With References</span>
          </div>
          <div style={statCard}>
            <span style={statValue}>{stats.withoutRef}</span>
            <span style={statLabel}>Need References</span>
          </div>
        </div>

        {/* Search */}
        <div style={searchContainer}>
          <FiSearch style={searchIcon} />
          <input
            type="text"
            placeholder="Search hymns by title, reference or lyrics..."
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
          <span style={resultsBold}>{filteredHymns.length}</span> hymns found
        </div>
      </div>

      {/* Hymns List */}
      <div style={hymnsList}>
        <AnimatePresence>
          {filteredHymns.map((hymn) => (
            <motion.div
              key={hymn.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={hymnCard}
            >
              <div style={hymnCardContent}>
                <div style={hymnIcon}>
                  <GiPrayerBeads />
                </div>
                <div style={hymnInfo}>
                  <div style={hymnTitleRow}>
                    <h3 style={hymnTitle}>{hymn.title}</h3>
                    {hymn.reference && (
                      <span style={hymnRef}>{hymn.reference}</span>
                    )}
                  </div>
                  {hymn.firstLine && (
                    <p style={hymnPreview}>{hymn.firstLine}</p>
                  )}
                </div>
              </div>
              
              <div style={hymnActions}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openEditModal(hymn)}
                  style={actionButton}
                  title="Edit hymn"
                >
                  <FiEdit2 size={16} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openDeleteModal(hymn)}
                  style={{ ...actionButton, color: '#ef4444' }}
                  title="Delete hymn"
                >
                  <FiTrash2 size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalOverlay}
            onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={modalHeader}>
                <h2 style={modalTitle}>
                  {showAddModal ? "Add New Hymn" : "Edit Hymn"}
                </h2>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  style={modalClose}
                >
                  <FiX />
                </button>
              </div>

              {/* Preview Toggle */}
              <div style={previewToggle}>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{
                    ...previewButton,
                    background: previewMode ? '#4f46e5' : '#f1f5f9',
                    color: previewMode ? 'white' : '#475569'
                  }}
                >
                  {previewMode ? <FiEyeOff /> : <FiEye />}
                  {previewMode ? "Hide Preview" : "Show Preview"}
                </button>
              </div>

              <div style={modalBody}>
                {/* Form */}
                <div style={formSection}>
                  <div style={formGroup}>
                    <label style={formLabel}>Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter hymn title"
                      style={formInput}
                    />
                  </div>

                  <div style={formGroup}>
                    <label style={formLabel}>Reference (AGJ/NAGJ number)</label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="e.g., AGJ 451/134"
                      style={formInput}
                    />
                  </div>

                  <div style={formGroup}>
                    <label style={formLabel}>Lyrics</label>
                    <textarea
                      value={formData.lyrics}
                      onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                      placeholder="Enter hymn lyrics..."
                      rows={10}
                      style={formTextarea}
                    />
                    <div style={formHint}>
                      Separate verses with a blank line for better formatting
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                {previewMode && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={previewSection}
                  >
                    <h3 style={previewTitle}>Preview</h3>
                    <div style={previewContent}>
                      <h4 style={previewHymnTitle}>{formData.title || "Untitled Hymn"}</h4>
                      {formData.reference && (
                        <p style={previewRef}>{formData.reference}</p>
                      )}
                      <div style={previewLyrics}>
                        {formatLyrics(formData.lyrics).map((verse, i) => (
                          <div key={i} style={previewVerse}>
                            {verse.split('\n').map((line, j) => (
                              <p key={j} style={previewLine}>{line || <br/>}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div style={modalFooter}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  style={cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? handleAdd : handleEdit}
                  style={saveButton}
                >
                  <FiSave size={16} />
                  {showAddModal ? "Add Hymn" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedHymn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalOverlay}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ ...modalContent, maxWidth: '400px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={deleteIcon}>⚠️</div>
              <h3 style={deleteTitle}>Delete Hymn?</h3>
              <p style={deleteText}>
                Are you sure you want to delete "{selectedHymn.title}"? 
                This action cannot be undone.
              </p>
              
              <div style={deleteActions}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={deleteButton}
                >
                  Delete
                </button>
              </div>
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

// ====== STYLES ======

const container = {
  padding: "16px",
  maxWidth: "1200px",
  margin: "0 auto",
  fontFamily: "'Inter', -apple-system, sans-serif",
  background: "#f8fafc",
  minHeight: "100vh",
  borderRadius: "25px",
  position: "relative",
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

// Success Banner
const successBanner = {
  position: "fixed",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#10b981",
  color: "white",
  padding: "12px 24px",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
  zIndex: 1000,
};

// Header
const headerSection = {
  marginBottom: "20px",
};

const headerTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  flexWrap: "wrap",
  gap: "12px",
};

const titleWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const titleIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  color: "#ffffff",
};

const title = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
};

const titleSub = {
  fontSize: "13px",
  color: "#64748b",
  margin: "4px 0 0 0",
};

const addButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 16px",
  background: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
};

// Stats
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "16px",
};

const statCard = {
  background: "#ffffff",
  padding: "16px 8px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
};

const statValue = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#4f46e5",
};

const statLabel = {
  fontSize: "11px",
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

// Results
const resultsCount = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "12px",
};

const resultsBold = {
  fontWeight: "700",
  color: "#0f172a",
};

// Hymns List
const hymnsList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const hymnCard = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const hymnCardContent = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flex: 1,
};

const hymnIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  color: "#4f46e5",
};

const hymnInfo = {
  flex: 1,
};

const hymnTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "4px",
};

const hymnTitle = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#0f172a",
  margin: 0,
};

const hymnRef = {
  fontSize: "11px",
  color: "#64748b",
  background: "#f1f5f9",
  padding: "2px 8px",
  borderRadius: "12px",
};

const hymnPreview = {
  fontSize: "12px",
  color: "#64748b",
  margin: 0,
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const hymnActions = {
  display: "flex",
  gap: "4px",
};

const actionButton = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  background: "#f1f5f9",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#475569",
};

// Modal
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
  maxWidth: "900px",
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const modalTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
};

const modalClose = {
  background: "none",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  color: "#64748b",
  padding: "4px",
};

// Preview Toggle
const previewToggle = {
  marginBottom: "20px",
};

const previewButton = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 12px",
  border: "none",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
};

// Modal Body
const modalBody = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const formSection = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const formLabel = {
  fontSize: "13px",
  fontWeight: "500",
  color: "#0f172a",
};

const formInput = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  outline: "none",
};

const formTextarea = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
  resize: "vertical",
};

const formHint = {
  fontSize: "11px",
  color: "#64748b",
};

// Preview Section
const previewSection = {
  background: "#f8fafc",
  borderRadius: "12px",
  padding: "16px",
  border: "1px solid #e2e8f0",
  maxHeight: "500px",
  overflowY: "auto",
};

const previewTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 12px 0",
};

const previewContent = {
  background: "#ffffff",
  borderRadius: "8px",
  padding: "20px",
  border: "1px solid #e2e8f0",
};

const previewHymnTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#4f46e5",
  textAlign: "center",
  margin: "0 0 8px 0",
};

const previewRef = {
  fontSize: "12px",
  color: "#64748b",
  textAlign: "center",
  margin: "0 0 20px 0",
};

const previewLyrics = {
  lineHeight: 1.6,
};

const previewVerse = {
  marginBottom: "16px",
};

const previewLine = {
  margin: "4px 0",
  fontSize: "13px",
  color: "#1e293b",
  textAlign: "center",
};

// Modal Footer
const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "20px",
  paddingTop: "20px",
  borderTop: "1px solid #e2e8f0",
};

const cancelButton = {
  padding: "10px 16px",
  background: "#f1f5f9",
  border: "none",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "500",
  color: "#475569",
  cursor: "pointer",
};

const saveButton = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 16px",
  background: "#4f46e5",
  border: "none",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "500",
  color: "white",
  cursor: "pointer",
};

// Delete Modal
const deleteIcon = {
  fontSize: "48px",
  textAlign: "center",
  marginBottom: "16px",
};

const deleteTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  textAlign: "center",
  marginBottom: "8px",
};

const deleteText = {
  fontSize: "14px",
  color: "#64748b",
  textAlign: "center",
  marginBottom: "20px",
};

const deleteActions = {
  display: "flex",
  gap: "12px",
};

const deleteButton = {
  flex: 1,
  padding: "12px",
  background: "#ef4444",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "500",
  color: "white",
  cursor: "pointer",
};

// Toast
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