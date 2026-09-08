// frontend/src/pages/Announcements.jsx
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import logo from "../assets/zuca-logo.png";
import {
  FiBell,
  FiCalendar,
  FiClock,
  FiSearch,
  FiX,
  FiTag,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiCheckSquare,
  FiSquare,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiInbox,
  FiZap,
  FiTrendingUp,
} from "react-icons/fi";

export default function UserAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    recent: 0,
    categories: 0,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  const token = localStorage.getItem("token");

  const fetchAnnouncements = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = res.data;
      const globalAnnouncements = data.filter((a) => !a.jumuiaId);
      setAnnouncements(globalAnnouncements);

      const uniqueCategories = [
        ...new Set(data.map((a) => a.category || "General").filter(Boolean)),
      ];
      setCategories(["all", ...uniqueCategories]);

      const now = new Date();
      const newCount = data.filter((a) => {
        const date = new Date(a.createdAt);
        const diffHours = (now - date) / (1000 * 60 * 60);
        return diffHours <= 48;
      }).length;

      setStats({
        total: data.length,
        new: newCount,
        recent: data.filter((a) => {
          const date = new Date(a.createdAt);
          const diffDays = (now - date) / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }).length,
        categories: uniqueCategories.length,
      });

      setError(null);
    } catch (err) {
      console.error("Announcements Error:", err);
      setError("Unable to load announcements");
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    let filtered = [...announcements];

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((a) => (a.category || "General") === selectedCategory);
    }

    if (timeFilter !== "all") {
      const now = new Date();
      const hours48 = 48 * 60 * 60 * 1000;
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const age = now - date;
        if (timeFilter === "new") return age <= hours48;
        if (timeFilter === "old") return age > hours48;
        return true;
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    setFilteredAnnouncements(filtered);
  }, [announcements, searchTerm, selectedCategory, timeFilter, sortOrder]);

  const handleRefresh = () => fetchAnnouncements(true);
  const handleClearSearch = () => setSearchTerm("");
  const handleTimeFilterChange = (filter) => setTimeFilter(filter);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAnnouncements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAnnouncements.map((a) => a.id));
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const getAnnouncementAge = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    if (diffHours <= 24) return "new";
    if (diffHours <= 48) return "recent";
    return "old";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", damping: 15 },
    },
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={loadingContainer}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={loadingSpinner}
        >
          <img src={logo} alt="Loading..." style={{ width: "60px", height: "80px" }} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={loadingTextContainer}
        >
          <p style={loadingTitle}>Loading announcements</p>
          <p style={loadingSubtitle}>Please wait while we fetch the latest updates</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} style={container}>
      {/* Header */}
      <motion.div variants={itemVariants} style={headerSection}>
        <div style={headerTop}>
          <div style={titleWrapper}>
            <div style={titleIcon}>
              <FiBell size={28} color="#ffffff" />
            </div>
            <div>
              <h1 style={title}>Announcements</h1>
              <p style={titleSub}>Stay informed with the latest updates from ZUCA</p>
            </div>
          </div>

          <div style={statsContainer}>
            <div style={statCard}>
              <span style={statValue}>{stats.total}</span>
              <span style={statLabel}>Total</span>
            </div>
            <div
              style={{
                ...statCard,
                backgroundColor: timeFilter === "new" ? "#f0f4f8" : "#ffffff",
              }}
              onClick={() => handleTimeFilterChange(timeFilter === "new" ? "all" : "new")}
            >
              <span style={statValue}>{stats.new}</span>
              <span style={statLabel}>New</span>
            </div>
            <div style={statCard}>
              <span style={statValue}>{stats.categories}</span>
              <span style={statLabel}>Categories</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={controlsBar}>
          <div style={searchWrapper}>
            <FiSearch size={18} style={searchIcon} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInput}
            />
            {searchTerm && (
              <button onClick={handleClearSearch} style={searchClear}>
                <FiX size={16} />
              </button>
            )}
          </div>

          <div style={filterWrapper}>
            <div style={filterGroup}>
              <FiTag size={16} style={filterIcon} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={filterSelect}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")} style={sortButton}>
              {sortOrder === "desc" ? <FiArrowDown size={16} /> : <FiArrowUp size={16} />}
              <span style={sortText}>{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
            </button>

            <div style={viewToggle}>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  ...viewToggleButton,
                  backgroundColor: viewMode === "grid" ? "#1a1a2e" : "transparent",
                  color: viewMode === "grid" ? "#ffffff" : "#64748b",
                }}
              >
                <FiGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  ...viewToggleButton,
                  backgroundColor: viewMode === "list" ? "#1a1a2e" : "transparent",
                  color: viewMode === "list" ? "#ffffff" : "#64748b",
                }}
              >
                <FiList size={18} />
              </button>
            </div>

            <button
              onClick={() => setSelectMode(!selectMode)}
              style={{
                ...selectModeButton,
                backgroundColor: selectMode ? "#1a1a2e" : "#ffffff",
                color: selectMode ? "#ffffff" : "#1e293b",
              }}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>

            <button onClick={handleRefresh} style={refreshButton} disabled={refreshing}>
              <FiRefreshCw size={18} style={refreshing ? { animation: "spin 1s linear infinite" } : {}} />
            </button>
          </div>
        </div>

        {/* Results */}
        {!loading && (
          <div style={resultsInfo}>
            <div style={resultsLeft}>
              <span style={resultsBold}>{filteredAnnouncements.length}</span>
              <span style={resultsText}>
                {filteredAnnouncements.length === 1 ? "announcement" : "announcements"} found
              </span>
              {timeFilter !== "all" && (
                <span style={resultsBadge}>
                  {timeFilter === "new" ? "New (48h)" : "Older"}
                  <span
                    style={resultsBadgeClose}
                    onClick={() => setTimeFilter("all")}
                  >
                    <FiX size={14} />
                  </span>
                </span>
              )}
              {selectedCategory !== "all" && (
                <span style={resultsBadge}>
                  {selectedCategory}
                  <span
                    style={resultsBadgeClose}
                    onClick={() => setSelectedCategory("all")}
                  >
                    <FiX size={14} />
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Select Toolbar */}
      <AnimatePresence>
        {selectMode && filteredAnnouncements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={selectToolbar}
          >
            <div style={selectToolbarLeft}>
              <button onClick={handleSelectAll} style={selectToolbarButton}>
                {selectedIds.length === filteredAnnouncements.length ? "Deselect All" : "Select All"}
              </button>
              <span style={selectCount}>{selectedIds.length} selected</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants} style={errorContainer}>
          <div style={errorCard}>
            <FiAlertCircle size={48} style={errorIcon} />
            <h3 style={errorTitle}>Unable to load announcements</h3>
            <p style={errorText}>{error}</p>
            <button onClick={handleRefresh} style={errorButton}>
              <FiRefreshCw size={16} style={{ marginRight: "8px" }} />
              Try Again
            </button>
          </div>
        </motion.div>
      )}

      {/* Empty */}
      {!error && filteredAnnouncements.length === 0 && (
        <motion.div variants={itemVariants} style={emptyContainer}>
          <div style={emptyCard}>
            <FiInbox size={64} style={emptyIcon} />
            <h3 style={emptyTitle}>No announcements found</h3>
            <p style={emptyText}>
              {searchTerm
                ? `No results matching "${searchTerm}"`
                : timeFilter !== "all"
                ? `No ${timeFilter === "new" ? "new" : "older"} announcements`
                : "There are no announcements at the moment"}
            </p>
            {(searchTerm || timeFilter !== "all" || selectedCategory !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTimeFilter("all");
                  setSelectedCategory("all");
                }}
                style={emptyButton}
              >
                Clear All Filters
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Announcements */}
      {!error && filteredAnnouncements.length > 0 && (
        <div style={viewMode === "grid" ? grid : listView}>
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((a) => {
              const age = getAnnouncementAge(a.createdAt);
              const isExpanded = expandedId === a.id;
              const isSelected = selectedIds.includes(a.id);

              return (
                <motion.div
                  key={a.id}
                  layout
                  variants={itemVariants}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    borderColor: isSelected ? "#1a1a2e" : "#e2e8f0",
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 20 }}
                  style={{
                    ...(viewMode === "grid" ? card : listCard),
                    backgroundColor: isSelected ? "#f8fafc" : "#ffffff",
                    borderWidth: isSelected ? "2px" : "1px",
                    cursor: selectMode ? "default" : "pointer",
                  }}
                  onClick={() => {
                    if (selectMode) {
                      handleSelectOne(a.id);
                    } else {
                      setExpandedId(isExpanded ? null : a.id);
                    }
                  }}
                  whileHover={
                    !selectMode
                      ? {
                          y: -2,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }
                      : {}
                  }
                >
                  {selectMode && (
                    <div
                      style={selectCheckbox}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOne(a.id);
                      }}
                    >
                      <div
                        style={{
                          ...checkboxInner,
                          backgroundColor: isSelected ? "#1a1a2e" : "#ffffff",
                          borderColor: isSelected ? "#1a1a2e" : "#cbd5e1",
                        }}
                      >
                        {isSelected && <FiCheckSquare size={14} color="#ffffff" />}
                      </div>
                    </div>
                  )}

                  <div style={viewMode === "grid" ? cardHeader : listCardHeader}>
                    <div style={viewMode === "grid" ? cardHeaderLeft : listCardHeaderLeft}>
                      <div
                        style={{
                          ...cardIcon,
                          backgroundColor: age === "new" ? "#e8edf3" : "#f1f5f9",
                          color: "#1a1a2e",
                        }}
                      >
                        {age === "new" ? <FiZap size={20} /> : <FiBell size={20} />}
                      </div>
                      <div style={cardTitleSection}>
                        <div style={cardTitleRow}>
                          <h3 style={cardTitle}>{a.title}</h3>
                          {age === "new" && (
                            <span style={newBadge}>
                              <FiTrendingUp size={12} /> NEW
                            </span>
                          )}
                        </div>
                        <div style={cardMeta}>
                          {a.category && (
                            <span style={cardCategory}>
                              <FiTag size={12} /> {a.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={viewMode === "grid" ? cardContent : listCardContent}>
                    <p
                      style={{
                        ...cardDescription,
                        ...(viewMode === "grid" && !isExpanded && a.content.length > 150
                          ? cardDescriptionClamped
                          : {}),
                      }}
                    >
                      {a.content}
                    </p>
                    {!isExpanded && a.content.length > 150 && viewMode === "grid" && (
                      <button
                        style={readMoreButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(a.id);
                        }}
                      >
                        Read more →
                      </button>
                    )}
                  </div>

                  <div style={viewMode === "grid" ? cardFooter : listCardFooter}>
                    <div style={dateInfo}>
                      <FiClock size={16} style={dateIcon} />
                      <span style={dateText}>{formatDate(a.createdAt)}</span>
                    </div>
                    {!selectMode && (
                      <div style={expandIcon}>
                        {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {!error && filteredAnnouncements.length > 0 && (
        <div style={quickStatsFooter}>
          <div style={quickStatsLeft}>
            <span style={quickStatsBold}>{filteredAnnouncements.length}</span>
            <span style={quickStatsText}>announcements displayed</span>
          </div>
          <div style={quickStatsRight}>
            <div
              style={quickStatsItem}
              onClick={() => handleTimeFilterChange("new")}
            >
              <span style={{ ...quickStatsDot, backgroundColor: "#1a1a2e" }} />
              <span style={{ fontWeight: timeFilter === "new" ? "600" : "400" }}>New</span>
            </div>
            <div
              style={quickStatsItem}
              onClick={() => handleTimeFilterChange("all")}
            >
              <span style={{ ...quickStatsDot, backgroundColor: "#94a3b8" }} />
              <span style={{ fontWeight: timeFilter === "all" ? "600" : "400" }}>All</span>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          select, input, button {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>
    </motion.div>
  );
}

// ====== STYLES ======

const container = {
  padding: "1.4rem",
  maxWidth: "1400px",
  margin: "9px auto",
  marginRight: "0px",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  minHeight: "80vh",
  position: "relative",
};

const loadingContainer = {
  minHeight: "600px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2rem",
};

const loadingSpinner = {
  width: "80px",
  height: "80px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  animation: "spin 1s linear infinite",
  background: "#f8fafc",
  borderRadius: "50%",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

const loadingTextContainer = { textAlign: "center" };
const loadingTitle = {
  fontSize: "1.5rem",
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: "0.5rem",
};
const loadingSubtitle = {
  fontSize: "1rem",
  color: "#64748b",
};

const headerSection = { marginTop: "1rem" };
const headerTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "1.5rem",
  marginBottom: "1rem",
};

const titleWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

const titleIcon = {
  width: "50px",
  height: "50px",
  borderRadius: "14px",
  background: "#1a1a2e",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
};

const title = {
  fontSize: "30px",
  fontWeight: "800",
  color: "#1a1a2e",
  margin: 0,
  letterSpacing: "-0.02em",
};

const titleSub = {
  fontSize: "0.95rem",
  color: "#64748b",
  marginTop: "0.25rem",
  fontWeight: "400",
};

const statsContainer = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const statCard = {
  background: "#ffffff",
  padding: "0.5rem 1.25rem",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: "70px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const statValue = {
  fontSize: "1.75rem",
  fontWeight: "700",
  color: "#1a1a2e",
  lineHeight: 1,
  marginBottom: "0.25rem",
};

const statLabel = {
  fontSize: "0.7rem",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const controlsBar = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "0.5rem",
};

const searchWrapper = {
  position: "relative",
  flex: "2",
  minWidth: "280px",
};

const searchIcon = {
  position: "absolute",
  left: "1rem",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
};

const searchInput = {
  width: "100%",
  padding: "0.65rem 1rem 0.65rem 3rem",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#1a1a2e",
  fontSize: "0.9rem",
  fontWeight: "400",
  outline: "none",
  transition: "all 0.2s",
};

const searchClear = {
  position: "absolute",
  right: "0.75rem",
  top: "50%",
  transform: "translateY(-50%)",
  background: "#f1f5f9",
  border: "none",
  borderRadius: "6px",
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  cursor: "pointer",
};

const filterWrapper = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  flexWrap: "wrap",
};

const filterGroup = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.4rem 0.75rem",
  background: "#ffffff",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const filterIcon = { color: "#94a3b8" };
const filterSelect = {
  padding: "0.2rem 1.25rem 0.2rem 0.2rem",
  borderRadius: "6px",
  border: "none",
  background: "transparent",
  color: "#1a1a2e",
  fontSize: "0.85rem",
  fontWeight: "500",
  outline: "none",
  cursor: "pointer",
};

const sortButton = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.4rem 0.75rem",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  color: "#1e293b",
  fontSize: "0.85rem",
  fontWeight: "500",
  cursor: "pointer",
  transition: "all 0.2s",
};

const sortText = { fontWeight: "500" };

const viewToggle = {
  display: "flex",
  gap: "0.2rem",
  background: "#f8fafc",
  padding: "0.2rem",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const viewToggleButton = {
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  border: "none",
  fontSize: "0.9rem",
  cursor: "pointer",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const selectModeButton = {
  padding: "0.4rem 0.9rem",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  fontSize: "0.85rem",
  fontWeight: "500",
  cursor: "pointer",
  transition: "all 0.2s",
  background: "#ffffff",
};

const refreshButton = {
  padding: "0.4rem 0.6rem",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  color: "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const resultsInfo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.5rem 0",
  borderBottom: "1px solid #e2e8f0",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginBottom: "0px",
};

const resultsLeft = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  flexWrap: "wrap",
};

const resultsBold = {
  fontSize: "1.1rem",
  fontWeight: "700",
  color: "#1a1a2e",
};

const resultsText = {
  fontSize: "0.9rem",
  color: "#64748b",
  fontWeight: "400",
};

const resultsBadge = {
  display: "flex",
  alignItems: "center",
  gap: "0.3rem",
  padding: "0.2rem 0.6rem",
  borderRadius: "16px",
  fontSize: "0.75rem",
  fontWeight: "500",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const resultsBadgeClose = {
  marginLeft: "0.2rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const selectToolbar = {
  background: "#ffffff",
  border: "1px solid #1a1a2e",
  borderRadius: "12px",
  padding: "0.5rem 1rem",
  marginBottom: "0.5rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const selectToolbarLeft = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const selectToolbarButton = {
  padding: "0.2rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#1e293b",
  fontSize: "0.8rem",
  fontWeight: "500",
  cursor: "pointer",
};

const selectCount = {
  fontSize: "0.85rem",
  color: "#64748b",
  fontWeight: "400",
};

const selectCheckbox = {
  position: "absolute",
  top: "0.75rem",
  left: "0.75rem",
  zIndex: 10,
  cursor: "pointer",
};

const checkboxInner = {
  width: "20px",
  height: "20px",
  borderRadius: "4px",
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};

const errorContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "400px",
};

const errorCard = {
  textAlign: "center",
  padding: "2.5rem",
  background: "#ffffff",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  maxWidth: "500px",
};

const errorIcon = { color: "#ef4444", marginBottom: "1rem" };
const errorTitle = {
  fontSize: "1.3rem",
  fontWeight: "700",
  color: "#1a1a2e",
  marginBottom: "0.5rem",
};
const errorText = { color: "#64748b", marginBottom: "1.5rem", fontSize: "0.95rem" };
const errorButton = {
  padding: "0.5rem 1.5rem",
  borderRadius: "10px",
  border: "none",
  background: "#1a1a2e",
  color: "#ffffff",
  fontSize: "0.9rem",
  fontWeight: "500",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
};

const emptyContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "400px",
};

const emptyCard = {
  textAlign: "center",
  padding: "3rem",
  background: "#ffffff",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  maxWidth: "500px",
};

const emptyIcon = { color: "#94a3b8", marginBottom: "1.5rem" };
const emptyTitle = {
  fontSize: "1.5rem",
  fontWeight: "700",
  color: "#1a1a2e",
  marginBottom: "0.5rem",
};
const emptyText = {
  color: "#64748b",
  fontSize: "0.95rem",
  marginBottom: "1.5rem",
};
const emptyButton = {
  padding: "0.5rem 1.5rem",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#1e293b",
  fontSize: "0.9rem",
  fontWeight: "500",
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
  gap: "1.25rem",
  marginTop: "1.25rem",
};

const listView = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  marginTop: "1.25rem",
};

const card = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "0.75rem",
  border: "1px solid #e2e8f0",
  marginBottom: "0px",
  marginRight: "25px",
  marginLeft: "0px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  transition: "all 0.2s ease",
  position: "relative",
};

const listCard = {
  background: "#ffffff",
  borderRadius: "14px",
  padding: "1rem",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  transition: "all 0.2s",
  position: "relative",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const listCardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardHeaderLeft = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "flex-start",
  flex: 1,
};

const listCardHeaderLeft = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "center",
  flex: 1,
};

const cardIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #e2e8f0",
  flexShrink: 0,
};

const cardTitleSection = { flex: 1 };
const cardTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  flexWrap: "wrap",
  marginBottom: "0.2rem",
};

const cardTitle = {
  fontSize: "1.05rem",
  fontWeight: "600",
  color: "#1a1a2e",
  margin: 0,
};

const newBadge = {
  display: "flex",
  alignItems: "center",
  gap: "0.2rem",
  padding: "0.1rem 0.5rem",
  background: "#e8edf3",
  borderRadius: "16px",
  fontSize: "0.6rem",
  fontWeight: "600",
  color: "#1a1a2e",
  border: "1px solid #dce2ea",
};

const cardMeta = { display: "flex", gap: "0.5rem" };
const cardCategory = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.1rem 0.5rem",
  background: "#f8fafc",
  borderRadius: "16px",
  fontSize: "0.65rem",
  fontWeight: "500",
  color: "#64748b",
  border: "1px solid #e2e8f0",
};

const cardContent = { flex: 1 };
const listCardContent = { flex: 1, paddingLeft: "3rem" };

const cardDescription = {
  fontSize: "0.9rem",
  color: "#475569",
  lineHeight: "1.6",
  margin: 0,
  whiteSpace: "pre-line",
};

const cardDescriptionClamped = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const readMoreButton = {
  background: "none",
  border: "none",
  color: "#1a1a2e",
  fontSize: "0.8rem",
  fontWeight: "500",
  cursor: "pointer",
  padding: "0.25rem 0",
  marginTop: "0.25rem",
};

const cardFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "0.25rem",
  paddingTop: "0.5rem",
  borderTop: "1px solid #f1f5f9",
};

const listCardFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingLeft: "3rem",
};

const dateInfo = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  color: "#64748b",
  fontSize: "0.8rem",
};

const dateIcon = { color: "#94a3b8" };
const dateText = { color: "#475569" };
const expandIcon = { color: "#94a3b8" };

const quickStatsFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "1.5rem",
  padding: "0.5rem 1rem",
  background: "#f8fafc",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const quickStatsLeft = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
};
const quickStatsBold = {
  fontSize: "1rem",
  fontWeight: "600",
  color: "#1a1a2e",
};
const quickStatsText = {
  fontSize: "0.85rem",
  color: "#64748b",
  fontWeight: "400",
};

const quickStatsRight = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const quickStatsItem = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  fontSize: "0.8rem",
  cursor: "pointer",
  padding: "0.1rem 0.4rem",
  borderRadius: "4px",
  transition: "all 0.2s",
};

const quickStatsDot = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  display: "inline-block",
};