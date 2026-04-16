// frontend/src/pages/Announcements.jsx
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import { 
  Megaphone, Calendar, Clock, Search, X, Filter, ArrowUpDown,
  Pin, Sparkles, Flame, Inbox, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, XCircle, TrendingUp, Tag, Timer,
  Check, LayoutGrid, List, ArrowLeft, Eye, EyeOff,
  Star, Zap, Heart, Award, Bell, Mail, Shield
} from 'lucide-react';

export default function UserAnnouncements() {
  const navigate = useNavigate();
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
  const [hoveredCard, setHoveredCard] = useState(null);
  
  const token = localStorage.getItem("token");

  const goBack = () => navigate('/dashboard');

  const fetchAnnouncements = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      const allAnnouncements = res.data;
      const globalAnnouncements = allAnnouncements.filter(a => !a.jumuiaId);
      const data = globalAnnouncements;
    
      setAnnouncements(data);
      
      const uniqueCategories = [...new Set(data.map(a => a.category || "General").filter(Boolean))];
      setCategories(["all", ...uniqueCategories]);
      
      const now = new Date();
      const newCount = data.filter(a => {
        const date = new Date(a.createdAt);
        const diffHours = (now - date) / (1000 * 60 * 60);
        return diffHours <= 48;
      }).length;
      
      setStats({
        total: data.length,
        new: newCount,
        recent: data.filter(a => new Date(a.createdAt) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length,
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
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(a => (a.category || "General") === selectedCategory);
    }

    if (timeFilter !== "all") {
      const now = new Date();
      const hours48 = 48 * 60 * 60 * 1000;
      
      filtered = filtered.filter(a => {
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
      setSelectedIds(filteredAnnouncements.map(a => a.id));
    }
  };
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
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
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return `Yesterday`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAnnouncementAge = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    
    if (diffHours <= 24) return "hot";
    if (diffHours <= 48) return "new";
    if (diffHours <= 168) return "week";
    return "old";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", damping: 20, stiffness: 300 },
    },
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingAnimation}>
            <div style={styles.loadingRing}></div>
            <div style={styles.loadingRingInner}></div>
            <Megaphone size={32} style={styles.loadingIcon} />
          </div>
          <h2 style={styles.loadingTitle}>Loading Announcements</h2>
          <p style={styles.loadingSubtitle}>Fetching the latest updates...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={styles.container}
    >
      {/* Animated Background */}
      <div style={styles.bgAnimation}>
        <div style={styles.gradientOrb1}></div>
        <div style={styles.gradientOrb2}></div>
        <div style={styles.gradientOrb3}></div>
      </div>

      <div style={styles.content}>
        {/* Header */}
        <motion.div variants={itemVariants} style={styles.header}>
          <div style={styles.headerLeft}>
            <motion.button 
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={goBack} 
              style={styles.backButton}
            >
              <ArrowLeft size={20} />
            </motion.button>
            <div style={styles.titleWrapper}>
              <div style={styles.titleIcon}>
                <Megaphone size={28} />
              </div>
              <div>
                <div style={styles.titleBadge}>
                  <Sparkles size={14} />
                  <span>Stay Informed</span>
                </div>
                <h1 style={styles.title}>Announcements</h1>
                <p style={styles.subtitle}>Latest updates from your community</p>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div style={styles.statsContainer}>
            <motion.div style={styles.statCard} whileHover={{ y: -2 }}>
              <Megaphone size={20} style={styles.statIcon} />
              <span style={styles.statValue}>{stats.total}</span>
              <span style={styles.statLabel}>Total</span>
            </motion.div>
            <motion.div 
              style={{...styles.statCard, ...(timeFilter === "new" ? styles.statCardActive : {})}}
              whileHover={{ y: -2 }}
              onClick={() => handleTimeFilterChange(timeFilter === "new" ? "all" : "new")}
            >
              <Flame size={20} style={{...styles.statIcon, color: "#f59e0b"}} />
              <span style={styles.statValue}>{stats.new}</span>
              <span style={styles.statLabel}>New</span>
            </motion.div>
            <motion.div style={styles.statCard} whileHover={{ y: -2 }}>
              <Calendar size={20} style={styles.statIcon} />
              <span style={styles.statValue}>{stats.categories}</span>
              <span style={styles.statLabel}>Categories</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Controls Bar */}
        <motion.div variants={itemVariants} style={styles.controlsBar}>
          <div style={styles.searchWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleClearSearch}
                style={styles.searchClear}
              >
                <X size={14} />
              </motion.button>
            )}
          </div>

          <div style={styles.filterWrapper}>
            <div style={styles.filterGroup}>
              <Tag size={14} style={styles.filterIcon} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={styles.filterSelect}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              style={styles.sortButton}
            >
              <ArrowUpDown size={16} />
              <span>{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
            </motion.button>

            <div style={styles.viewToggle}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("grid")}
                style={{...styles.viewButton, ...(viewMode === "grid" ? styles.viewButtonActive : {})}}
              >
                <LayoutGrid size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("list")}
                style={{...styles.viewButton, ...(viewMode === "list" ? styles.viewButtonActive : {})}}
              >
                <List size={16} />
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectMode(!selectMode)}
              style={{...styles.selectButton, ...(selectMode ? styles.selectButtonActive : {})}}
            >
              {selectMode ? "Cancel" : "Select"}
            </motion.button>

            <motion.button
              whileHover={{ rotate: refreshing ? 0 : 180 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              style={styles.refreshButton}
              disabled={refreshing}
            >
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </motion.button>
          </div>
        </motion.div>

        {/* Results Info */}
        {!loading && (
          <motion.div variants={itemVariants} style={styles.resultsInfo}>
            <div style={styles.resultsLeft}>
              <span style={styles.resultsBold}>{filteredAnnouncements.length}</span>
              <span style={styles.resultsText}>announcements</span>
              {timeFilter !== "all" && (
                <span style={styles.resultsBadge}>
                  {timeFilter === "new" ? <Flame size={12} /> : <Timer size={12} />}
                  {timeFilter === "new" ? "New (48h)" : "Older"}
                  <XCircle size={12} onClick={() => setTimeFilter("all")} style={styles.resultsBadgeClose} />
                </span>
              )}
              {selectedCategory !== "all" && (
                <span style={styles.resultsBadge}>
                  <Tag size={12} /> {selectedCategory}
                  <XCircle size={12} onClick={() => setSelectedCategory("all")} style={styles.resultsBadgeClose} />
                </span>
              )}
            </div>
            <div style={styles.resultsRight}>
              <div style={styles.timelineIndicator}>
                <div style={styles.timelineDot} />
                <span style={styles.timelineText}>Latest updates</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Select Mode Toolbar */}
        <AnimatePresence>
          {selectMode && filteredAnnouncements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={styles.selectToolbar}
            >
              <div style={styles.selectToolbarLeft}>
                <motion.button whileHover={{ scale: 1.02 }} onClick={handleSelectAll} style={styles.selectToolbarButton}>
                  {selectedIds.length === filteredAnnouncements.length ? "Deselect All" : "Select All"}
                </motion.button>
                <span style={styles.selectCount}>{selectedIds.length} selected</span>
              </div>
              {selectedIds.length > 0 && (
                <motion.button whileHover={{ scale: 1.02 }} style={styles.selectToolbarAction}>
                  Archive
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <motion.div variants={itemVariants} style={styles.errorContainer}>
            <div style={styles.errorCard}>
              <AlertCircle size={48} style={styles.errorIcon} />
              <h3 style={styles.errorTitle}>Unable to load announcements</h3>
              <p style={styles.errorText}>{error}</p>
              <motion.button whileHover={{ scale: 1.02 }} onClick={handleRefresh} style={styles.errorButton}>
                Try Again
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!error && filteredAnnouncements.length === 0 && (
          <motion.div variants={itemVariants} style={styles.emptyContainer}>
            <div style={styles.emptyCard}>
              <Inbox size={64} style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No announcements found</h3>
              <p style={styles.emptyText}>
                {searchTerm ? `No results matching "${searchTerm}"` : "No announcements available"}
              </p>
              {(searchTerm || timeFilter !== "all" || selectedCategory !== "all") && (
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => {
                  setSearchTerm("");
                  setTimeFilter("all");
                  setSelectedCategory("all");
                }} style={styles.emptyButton}>
                  Clear All Filters
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* Announcements Grid/List */}
        {!error && filteredAnnouncements.length > 0 && (
          <div style={viewMode === "grid" ? styles.grid : styles.listView}>
            <AnimatePresence mode="popLayout">
              {filteredAnnouncements.map((a, index) => {
                const age = getAnnouncementAge(a.createdAt);
                const isExpanded = expandedId === a.id;
                const isSelected = selectedIds.includes(a.id);
                const isHovered = hoveredCard === a.id;
                
                return (
                  <motion.div
                    key={a.id}
                    layout
                    variants={itemVariants}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onMouseEnter={() => setHoveredCard(a.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      ...styles.card,
                      ...(viewMode === "list" ? styles.listCard : {}),
                      ...(isSelected ? styles.cardSelected : {}),
                      ...(isHovered ? styles.cardHover : {}),
                    }}
                    onClick={() => {
                      if (selectMode) handleSelectOne(a.id);
                      else setExpandedId(isExpanded ? null : a.id);
                    }}
                  >
                    {/* Card Gradient Border */}
                    <div style={{...styles.cardGradientBorder, ...(age === "hot" ? styles.cardGradientHot : age === "new" ? styles.cardGradientNew : {})}} />
                    
                    {/* Select Checkbox */}
                    {selectMode && (
                      <div style={styles.selectCheckbox} onClick={(e) => { e.stopPropagation(); handleSelectOne(a.id); }}>
                        <div style={{...styles.checkboxInner, ...(isSelected ? styles.checkboxSelected : {})}}>
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    )}

                    <div style={viewMode === "grid" ? styles.cardHeader : styles.listCardHeader}>
                      <div style={styles.cardHeaderLeft}>
                        <div style={{...styles.cardIcon, ...(age === "hot" ? styles.cardIconHot : age === "new" ? styles.cardIconNew : {})}}>
                          {age === "hot" ? <Flame size={24} /> : age === "new" ? <Sparkles size={24} /> : <Megaphone size={24} />}
                        </div>
                        <div style={styles.cardTitleSection}>
                          <div style={styles.cardTitleRow}>
                            <h3 style={styles.cardTitle}>{a.title}</h3>
                            {age === "hot" && <span style={styles.hotBadge}>🔥 HOT</span>}
                            {age === "new" && <span style={styles.newBadge}>🆕 NEW</span>}
                          </div>
                          <div style={styles.cardMeta}>
                            {a.category && <span style={styles.cardCategory}><Tag size={10} /> {a.category}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={viewMode === "grid" ? styles.cardContent : styles.listCardContent}>
                      <p style={{...styles.cardDescription, ...(viewMode === "grid" && !isExpanded && a.content.length > 150 ? styles.cardDescriptionClamped : {})}}>
                        {a.content}
                      </p>
                      {!isExpanded && a.content.length > 150 && viewMode === "grid" && (
                        <motion.button whileHover={{ x: 5 }} style={styles.readMoreButton}>
                          Read more →
                        </motion.button>
                      )}
                    </div>

                    <div style={viewMode === "grid" ? styles.cardFooter : styles.listCardFooter}>
                      <div style={styles.dateInfo}>
                        <Clock size={12} />
                        <span>{formatDate(a.createdAt)}</span>
                      </div>
                      {!selectMode && (
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} style={styles.expandIcon}>
                          <ChevronDown size={18} />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <motion.div variants={itemVariants} style={styles.footer}>
          <p>© {new Date().getFullYear()} Zetech Catholic Action Portal</p>
          <p style={styles.credit}>Built by CHRISTECH WEBSYS</p>
        </motion.div>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {filteredAnnouncements.length > 5 && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={styles.scrollTopButton}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ↑
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.6; }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </motion.div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 80px)",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    position: "relative",
    overflowX: "hidden",
  },
  
  content: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "28px 32px",
    position: "relative",
    zIndex: 2,
  },
  
  bgAnimation: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: 0,
  },
  
  gradientOrb1: {
    position: "absolute",
    top: "-20%",
    right: "-10%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent)",
    borderRadius: "50%",
    animation: "float 20s ease-in-out infinite",
  },
  
  gradientOrb2: {
    position: "absolute",
    bottom: "-20%",
    left: "-10%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent)",
    borderRadius: "50%",
    animation: "float 15s ease-in-out infinite reverse",
  },
  
  gradientOrb3: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(6,182,212,0.05), transparent)",
    borderRadius: "50%",
    animation: "pulse 10s ease-in-out infinite",
  },
  
  loadingContainer: {
    minHeight: "calc(100vh - 80px)",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  
  loadingContent: { textAlign: "center" },
  loadingAnimation: { position: "relative", width: "80px", height: "80px", margin: "0 auto 24px" },
  loadingRing: { position: "absolute", inset: 0, border: "3px solid #e2e8f0", borderRadius: "50%" },
  loadingRingInner: {
    position: "absolute",
    inset: 0,
    border: "3px solid transparent",
    borderTopColor: "#3b82f6",
    borderRightColor: "#8b5cf6",
    borderBottomColor: "#06b6d4",
    borderRadius: "50%",
    animation: "spin 1.5s linear infinite",
  },
  loadingIcon: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#3b82f6" },
  loadingTitle: { fontSize: "20px", fontWeight: "600", color: "#1e293b", marginBottom: "8px" },
  loadingSubtitle: { fontSize: "14px", color: "#64748b" },
  
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "20px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "20px" },
  backButton: { width: "44px", height: "44px", borderRadius: "12px", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" },
  titleWrapper: { display: "flex", alignItems: "center", gap: "16px" },
  titleIcon: { width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", boxShadow: "0 10px 20px -5px rgba(59,130,246,0.3)" },
  titleBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#3b82f610", borderRadius: "20px", fontSize: "11px", fontWeight: "500", color: "#3b82f6", marginBottom: "8px" },
  title: { fontSize: "32px", fontWeight: "800", color: "#1e293b", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: "14px", color: "#64748b", marginTop: "4px" },
  
  statsContainer: { display: "flex", gap: "12px", flexWrap: "wrap" },
  statCard: { background: "#ffffff", padding: "12px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "pointer", transition: "all 0.2s" },
  statCardActive: { borderColor: "#3b82f6", background: "#eff6ff" },
  statIcon: { color: "#64748b" },
  statValue: { fontSize: "28px", fontWeight: "800", color: "#1e293b", lineHeight: 1 },
  statLabel: { fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" },
  
  controlsBar: { display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px", alignItems: "center" },
  searchWrapper: { position: "relative", flex: "2", minWidth: "280px" },
  searchIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" },
  searchInput: { width: "100%", padding: "12px 40px 12px 44px", borderRadius: "14px", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "14px", outline: "none" },
  searchClear: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "#f1f5f9", border: "none", borderRadius: "20px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  
  filterWrapper: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  filterGroup: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" },
  filterIcon: { color: "#64748b" },
  filterSelect: { padding: "4px 20px 4px 4px", border: "none", background: "transparent", fontSize: "13px", fontWeight: "500", outline: "none", cursor: "pointer" },
  sortButton: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
  viewToggle: { display: "flex", gap: "4px", background: "#f1f5f9", padding: "4px", borderRadius: "12px", border: "1px solid #e2e8f0" },
  viewButton: { width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" },
  viewButtonActive: { background: "#3b82f6", color: "#ffffff" },
  selectButton: { padding: "8px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
  selectButtonActive: { background: "#3b82f6", color: "#ffffff", borderColor: "#3b82f6" },
  refreshButton: { width: "42px", height: "42px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  
  resultsInfo: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" },
  resultsLeft: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  resultsBold: { fontSize: "20px", fontWeight: "700", color: "#1e293b" },
  resultsText: { fontSize: "14px", color: "#64748b" },
  resultsBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#f1f5f9", borderRadius: "20px", fontSize: "12px", fontWeight: "500", color: "#475569" },
  resultsBadgeClose: { cursor: "pointer", opacity: 0.7 },
  resultsRight: { display: "flex", alignItems: "center", gap: "16px" },
  timelineIndicator: { display: "flex", alignItems: "center", gap: "8px" },
  timelineDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", animation: "pulse 2s infinite" },
  timelineText: { fontSize: "12px", color: "#64748b" },
  
  selectToolbar: { background: "#ffffff", border: "1px solid #3b82f6", borderRadius: "14px", padding: "12px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" },
  selectToolbarLeft: { display: "flex", alignItems: "center", gap: "16px" },
  selectToolbarButton: { padding: "6px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
  selectCount: { fontSize: "13px", color: "#64748b" },
  selectToolbarAction: { padding: "6px 16px", borderRadius: "8px", background: "#ef4444", color: "#ffffff", fontSize: "13px", fontWeight: "500", cursor: "pointer", border: "none" },
  
  errorContainer: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" },
  errorCard: { textAlign: "center", padding: "40px", background: "#ffffff", borderRadius: "24px", border: "1px solid #fee2e2", maxWidth: "450px" },
  errorIcon: { color: "#ef4444", marginBottom: "16px" },
  errorTitle: { fontSize: "20px", fontWeight: "600", color: "#b91c1c", marginBottom: "8px" },
  errorText: { color: "#64748b", marginBottom: "24px" },
  errorButton: { padding: "10px 24px", borderRadius: "12px", background: "#3b82f6", color: "#ffffff", border: "none", cursor: "pointer", fontWeight: "500" },
  
  emptyContainer: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" },
  emptyCard: { textAlign: "center", padding: "60px", background: "#ffffff", borderRadius: "32px", border: "1px solid #e2e8f0", maxWidth: "500px" },
  emptyIcon: { color: "#cbd5e1", marginBottom: "20px" },
  emptyTitle: { fontSize: "22px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" },
  emptyText: { color: "#64748b", marginBottom: "24px" },
  emptyButton: { padding: "10px 24px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", cursor: "pointer", fontWeight: "500" },
  
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "20px", marginTop: "20px" },
  listView: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" },
  
  card: { background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1px solid #e2e8f0", position: "relative", cursor: "pointer", transition: "all 0.3s ease" },
  listCard: { padding: "16px 20px" },
  cardSelected: { borderColor: "#3b82f6", background: "#eff6ff", borderWidth: "2px" },
  cardHover: { transform: "translateY(-4px)", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  cardGradientBorder: { position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)", borderRadius: "20px 20px 0 0" },
  cardGradientHot: { background: "linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)" },
  cardGradientNew: { background: "linear-gradient(90deg, #3b82f6, #06b6d4, #3b82f6)" },
  
  selectCheckbox: { position: "absolute", top: "16px", left: "16px", zIndex: 10, cursor: "pointer" },
  checkboxInner: { width: "22px", height: "22px", borderRadius: "6px", border: "2px solid #cbd5e1", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" },
  checkboxSelected: { background: "#3b82f6", borderColor: "#3b82f6", color: "#ffffff" },
  
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  listCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardHeaderLeft: { display: "flex", gap: "14px", alignItems: "flex-start", flex: 1 },
  cardIcon: { width: "48px", height: "48px", borderRadius: "16px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", flexShrink: 0 },
  cardIconHot: { background: "#fef2f2", borderColor: "#fecaca" },
  cardIconNew: { background: "#eff6ff", borderColor: "#bfdbfe" },
  cardTitleSection: { flex: 1 },
  cardTitleRow: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" },
  cardTitle: { fontSize: "18px", fontWeight: "700", color: "#1e293b", margin: 0 },
  hotBadge: { padding: "2px 8px", background: "#fee2e2", borderRadius: "20px", fontSize: "10px", fontWeight: "700", color: "#dc2626" },
  newBadge: { padding: "2px 8px", background: "#dbeafe", borderRadius: "20px", fontSize: "10px", fontWeight: "700", color: "#2563eb" },
  cardMeta: { display: "flex", gap: "8px" },
  cardCategory: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", background: "#f8fafc", borderRadius: "20px", fontSize: "10px", fontWeight: "500", color: "#64748b" },
  
  cardContent: { marginTop: "8px" },
  listCardContent: { paddingLeft: "62px" },
  cardDescription: { fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: 0 },
  cardDescriptionClamped: { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  readMoreButton: { background: "none", border: "none", color: "#3b82f6", fontSize: "13px", fontWeight: "500", cursor: "pointer", marginTop: "8px" },
  
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" },
  listCardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "62px", marginTop: "8px" },
  dateInfo: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8" },
  expandIcon: { color: "#94a3b8", cursor: "pointer" },
  
  footer: { textAlign: "center", padding: "24px", marginTop: "40px", borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: "12px" },
  credit: { marginTop: "4px", fontSize: "11px", color: "#94a3b8" },
  
  scrollTopButton: { position: "fixed", bottom: "24px", right: "24px", width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", color: "#ffffff", fontSize: "24px", cursor: "pointer", boxShadow: "0 10px 25px -5px rgba(59,130,246,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
};