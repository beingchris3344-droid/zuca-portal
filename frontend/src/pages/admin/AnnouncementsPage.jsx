// frontend/src/pages/admin/AnnouncementsPage.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiPlus, FiX, FiEdit2, FiTrash2, FiBell, 
  FiClock, FiCalendar, FiCheck, FiAlertCircle,
  FiRefreshCw, FiSearch, FiFilter
} from "react-icons/fi";
import { MdOutlineAnnouncement } from "react-icons/md";
import { BsMegaphone } from "react-icons/bs";
import axios from "axios";
import io from "socket.io-client";
import BASE_URL from "../../api";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    categories: {}
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Connected to announcements feed');
    });

    socket.on('new_announcement', (announcement) => {
      setAnnouncements(prev => [announcement, ...prev]);
      showNotification("New announcement posted!", "success");
      calculateStats([announcement, ...announcements]);
    });

    socket.on('announcement_updated', (updated) => {
      setAnnouncements(prev => 
        prev.map(a => a.id === updated.id ? updated : a)
      );
      showNotification("Announcement updated", "success");
    });

    socket.on('announcement_deleted', (id) => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showNotification("Announcement deleted", "info");
    });

    return () => socket.disconnect();
  }, [announcements]);

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Calculate stats
  const calculateStats = (data) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const thisWeek = data.filter(a => new Date(a.createdAt) >= oneWeekAgo).length;
    
    const categories = data.reduce((acc, a) => {
      const cat = a.category || 'General';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    setStats({
      total: data.length,
      thisWeek,
      categories
    });
  };

  // Fetch announcements
  const fetchAnnouncements = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(res.data);
      calculateStats(res.data);
    } catch (err) {
      console.error("Fetch Announcements Error:", err);
      setError("Failed to load announcements.");
      showNotification("Failed to load announcements", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      showNotification("Title and content are required", "error");
      return;
    }

    try {
      const res = await axios.post(
        `${BASE_URL}/api/announcements`,
        { 
          title: title.trim(), 
          content: content.trim(),
          category: category 
        },
        { headers }
      );
      
      setTitle("");
      setContent("");
      setCategory("General");
      setShowForm(false);
      showNotification("Announcement published successfully!", "success");
      
    } catch (err) {
      console.error("Add Announcement Error:", err);
      showNotification("Failed to publish announcement", "error");
    }
  };

  const handleUpdate = async (id) => {
    if (!editTitle.trim() || !editContent.trim()) {
      showNotification("Title and content are required", "error");
      return;
    }

    try {
      await axios.put(
        `${BASE_URL}/api/announcements/${id}`,
        { 
          title: editTitle.trim(), 
          content: editContent.trim(),
          category: editCategory 
        },
        { headers }
      );
      
      setEditingId(null);
      setEditTitle("");
      setEditContent("");
      setEditCategory("");
      showNotification("Announcement updated successfully!", "success");
      
    } catch (err) {
      console.error("Update Announcement Error:", err);
      showNotification("Failed to update announcement", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await axios.delete(`${BASE_URL}/api/announcements/${id}`, { headers });
      showNotification("Announcement deleted", "info");
    } catch (err) {
      console.error("Delete Announcement Error:", err);
      showNotification("Failed to delete announcement", "error");
    }
  };

  const startEdit = (announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditCategory(announcement.category || 'General');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(announcements.map(a => a.category || 'General'))];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="announcements-page">
      {/* Background Overlay */}
      <div className="gradient-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div 
            className={`notification ${notification.type}`}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
          >
            {notification.type === 'success' && <FiCheck />}
            {notification.type === 'error' && <FiAlertCircle />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="content-wrapper">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="title-icon">
              <BsMegaphone />
            </div>
            <div>
              <h1 className="page-title">Announcements</h1>
              <p className="page-subtitle">Manage and publish announcements</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={() => fetchAnnouncements(true)}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            </button>
            <button 
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? <FiX /> : <FiPlus />}
              <span>{showForm ? 'Cancel' : 'New Announcement'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <MdOutlineAnnouncement />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Announcements</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon week">
              <FiCalendar />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.thisWeek}</span>
              <span className="stat-label">This Week</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon categories">
              <FiFilter />
            </div>
            <div className="stat-content">
              <span className="stat-value">{Object.keys(stats.categories).length}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon latest">
              <FiClock />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {announcements[0] ? formatDate(announcements[0].createdAt) : 'N/A'}
              </span>
              <span className="stat-label">Latest</span>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="search-filter-bar">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select 
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div 
              className="form-card"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="form-title">Create New Announcement</h3>
              
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  placeholder="e.g., Sunday Service Update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="General">General</option>
                  <option value="Mass">Mass</option>
                  <option value="Event">Event</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Reminder">Reminder</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  placeholder="Write your announcement here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleAdd}
                >
                  Publish Announcement
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="content-area">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading announcements...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <FiAlertCircle className="error-icon" />
              <p>{error}</p>
              <button 
                className="btn-secondary"
                onClick={() => fetchAnnouncements()}
              >
                Try Again
              </button>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <BsMegaphone />
              </div>
              <h3>No announcements found</h3>
              <p>
                {searchTerm || filterCategory !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first announcement to get started'}
              </p>
              {!searchTerm && filterCategory === 'all' && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  <FiPlus /> Create Announcement
                </button>
              )}
            </div>
          ) : (
            <div className="announcements-grid">
              {filteredAnnouncements.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  className={`announcement-card ${announcement.category?.toLowerCase() || 'general'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {editingId === announcement.id ? (
                    // Edit Mode
                    <div className="edit-mode">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="edit-input"
                        placeholder="Title"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="edit-select"
                      >
                        <option value="General">General</option>
                        <option value="Mass">Mass</option>
                        <option value="Event">Event</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Reminder">Reminder</option>
                      </select>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="edit-textarea"
                        placeholder="Content"
                      />
                      <div className="edit-actions">
                        <button 
                          className="btn-secondary btn-small"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn-primary btn-small"
                          onClick={() => handleUpdate(announcement.id)}
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="card-header">
                        <div className="card-meta">
                          <span className="card-category">
                            {announcement.category || 'General'}
                          </span>
                          <span className="card-date">
                            <FiClock /> {formatDate(announcement.createdAt)}
                          </span>
                        </div>
                        <div className="card-actions">
                          <button 
                            className="action-btn edit"
                            onClick={() => startEdit(announcement)}
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(announcement.id)}
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="card-title">{announcement.title}</h3>
                      <p className="card-content">{announcement.content}</p>
                      
                      {announcement.updatedAt !== announcement.createdAt && (
                        <span className="edited-badge">
                          Edited {formatDate(announcement.updatedAt)}
                        </span>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .announcements-page {
          min-height: 100vh;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
        }

        /* Gradient Background */
        .gradient-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: -2;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
          animation: float 20s infinite;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: #ff6b6b;
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: #4ecdc4;
          bottom: -150px;
          left: -150px;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 200px;
          height: 200px;
          background: #ffe66d;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-30px, 30px) rotate(240deg); }
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* Notification */
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .notification.success {
          background: #10b981;
        }
        .notification.error {
          background: #ef4444;
        }
        .notification.info {
          background: #3b82f6;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .page-title {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 700;
          color: white;
          margin: 0 0 4px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .page-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.9);
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .refresh-btn {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 12px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.2);
          font-size: 20px;
        }
        .refresh-btn:hover {
          background: rgba(255,255,255,0.25);
        }
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }

        .btn-primary {
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 10px -1px rgba(0,0,0,0.15);
        }

        .btn-secondary {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.25);
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 13px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .stat-icon.total {
          background: rgba(59, 130, 246, 0.3);
          color: #93c5fd;
        }
        .stat-icon.week {
          background: rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }
        .stat-icon.categories {
          background: rgba(245, 158, 11, 0.3);
          color: #fcd34d;
        }
        .stat-icon.latest {
          background: rgba(139, 92, 246, 0.3);
          color: #c4b5fd;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: white;
          line-height: 1.2;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: rgba(255,255,255,0.8);
        }

        /* Search and Filter */
        .search-filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.6);
          font-size: 18px;
        }

        .search-input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          color: white;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .search-input:focus {
          border-color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.2);
        }
        .search-input::placeholder {
          color: rgba(255,255,255,0.5);
        }

        .filter-select {
          padding: 12px 20px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          color: white;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          min-width: 150px;
        }
        .filter-select option {
          background: #1a1a2e;
          color: white;
        }

        /* Form Card */
        .form-card {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .form-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin: 0 0 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.15);
        }
        .form-input::placeholder,
        .form-textarea::placeholder {
          color: rgba(255,255,255,0.5);
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        /* Content Area */
        .content-area {
          min-height: 400px;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          color: white;
        }

        .spinner {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Error State */
        .error-state {
          text-align: center;
          padding: 60px 20px;
          background: rgba(239, 68, 68, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          color: white;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #ef4444;
        }

        .error-state p {
          margin-bottom: 20px;
          font-size: 16px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          color: white;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px;
        }

        .empty-state p {
          color: rgba(255,255,255,0.7);
          margin-bottom: 20px;
        }

        /* Announcements Grid */
        .announcements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .announcement-card {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .announcement-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.4);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
        }

        /* Category-based styling */
        .announcement-card.general {
          border-left: 4px solid #3b82f6;
        }
        .announcement-card.mass {
          border-left: 4px solid #8b5cf6;
        }
        .announcement-card.event {
          border-left: 4px solid #10b981;
        }
        .announcement-card.urgent {
          border-left: 4px solid #ef4444;
        }
        .announcement-card.reminder {
          border-left: 4px solid #f59e0b;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .card-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .card-category {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 20px;
          background: rgba(255,255,255,0.2);
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-date {
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255,255,255,0.1);
          padding: 4px 8px;
          border-radius: 20px;
        }

        .card-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .announcement-card:hover .card-actions {
          opacity: 1;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn.edit:hover {
          background: rgba(59, 130, 246, 0.5);
        }
        .action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.5);
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin: 0 0 8px;
          line-height: 1.4;
        }

        .card-content {
          font-size: 14px;
          color: rgba(255,255,255,0.9);
          line-height: 1.6;
          margin: 0 0 12px;
          white-space: pre-wrap;
        }

        .edited-badge {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          font-style: italic;
          display: block;
        }

        /* Edit Mode */
        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .edit-input,
        .edit-select,
        .edit-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .edit-input:focus,
        .edit-select:focus,
        .edit-textarea:focus {
          outline: none;
          border-color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.15);
        }

        .edit-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .announcements-grid {
            grid-template-columns: 1fr;
          }

          .search-filter-bar {
            flex-direction: column;
          }

          .filter-select {
            width: 100%;
          }

          .card-actions {
            opacity: 1;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .card-header {
            flex-direction: column;
            gap: 8px;
          }

          .card-meta {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}