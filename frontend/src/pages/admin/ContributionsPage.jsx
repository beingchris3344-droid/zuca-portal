// frontend/src/pages/admin/AnnouncementsPage.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiPlus, FiX, FiEdit2, FiTrash2, FiBell, 
  FiClock, FiCalendar, FiCheck, FiAlertCircle,
  FiRefreshCw, FiSearch, FiFilter, FiTag
} from "react-icons/fi";
import { MdOutlineAnnouncement } from "react-icons/md";
import { BsMegaphone } from "react-icons/bs";
import axios from "axios";
import io from "socket.io-client";
import backgroundImg from "../../assets/background.png";
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
  }, []);

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
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
      await axios.post(
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

  // Calculate stats
  const stats = {
    total: announcements.length,
    categories: new Set(announcements.map(a => a.category || 'General')).size
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(announcements.map(a => a.category || 'General'))];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
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
    } catch {
      return 'Unknown';
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'Mass': return { bg: '#8b5cf6', light: '#ede9fe' };
      case 'Event': return { bg: '#10b981', light: '#d1fae5' };
      case 'Urgent': return { bg: '#ef4444', light: '#fee2e2' };
      case 'Reminder': return { bg: '#f59e0b', light: '#fef3c7' };
      default: return { bg: '#3b82f6', light: '#dbeafe' };
    }
  };

  return (
    <div 
      className="announcements-page"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      {/* Dark Overlay */}
      <div className="overlay"></div>

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
            <div className="stat-icon categories">
              <FiTag />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.categories}</span>
              <span className="stat-label">Categories</span>
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
            <div className="announcements-list">
              {filteredAnnouncements.map((announcement, index) => {
                const categoryColor = getCategoryColor(announcement.category);
                return (
                  <motion.div
                    key={announcement.id}
                    className="announcement-card"
                    style={{ borderLeftColor: categoryColor.bg }}
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
                            <span 
                              className="card-category"
                              style={{ 
                                background: categoryColor.light,
                                color: categoryColor.bg
                              }}
                            >
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .announcements-page {
          min-height: 100vh;
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          padding: 20px;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%);
          z-index: 0;
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
          background: white;
          color: #1e293b;
        }
        .notification.success {
          border-left: 4px solid #10b981;
        }
        .notification.error {
          border-left: 4px solid #ef4444;
        }
        .notification.info {
          border-left: 4px solid #3b82f6;
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
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .page-title {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 700;
          color: white;
          margin: 0 0 4px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
        .refresh-btn:hover:not(:disabled) {
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
          color: #1e293b;
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
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
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
          background: #f8fafc;
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 13px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
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
        .stat-icon.categories {
          background: rgba(245, 158, 11, 0.3);
          color: #fcd34d;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: white;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .stat-label {
          display: block;
          font-size: 13px;
          color: rgba(255,255,255,0.9);
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
          color: rgba(255,255,255,0.7);
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
          color: rgba(255,255,255,0.6);
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
          background: #1e293b;
          color: white;
        }

        /* Form Card */
        .form-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
          border: 1px solid #e2e8f0;
        }

        .form-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #94a3b8;
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
          background: white;
          border-radius: 20px;
          color: #1e293b;
          border: 1px solid #fee2e2;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #ef4444;
        }

        .error-state p {
          margin-bottom: 20px;
          font-size: 16px;
          color: #64748b;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          color: #1e293b;
          border: 2px dashed #e2e8f0;
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
          color: #1e293b;
        }

        .empty-state p {
          color: #64748b;
          margin-bottom: 20px;
        }

        /* Announcements List */
        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s;
          position: relative;
          border-left-width: 4px;
          border-left-style: solid;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .announcement-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
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
          padding: 4px 10px;
          border-radius: 20px;
          background: #f1f5f9;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-date {
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #f8fafc;
          padding: 4px 10px;
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
          background: #f1f5f9;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn.edit:hover {
          background: #dbeafe;
          color: #2563eb;
        }
        .action-btn.delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px;
          line-height: 1.4;
        }

        .card-content {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 12px;
          white-space: pre-wrap;
        }

        .edited-badge {
          font-size: 11px;
          color: #94a3b8;
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
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .edit-input:focus,
        .edit-select:focus,
        .edit-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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