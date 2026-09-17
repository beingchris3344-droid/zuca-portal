// pages/admin/AdminFeedback.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Flag, Star, Bug,
  Clock, CheckCircle, XCircle, AlertCircle,
  Home, Search, Eye, Calendar, Users,
  RefreshCw, Trash2, ChevronDown, ChevronUp,
  Filter, X,
} from 'lucide-react';
import { api } from '../../api';

/* =========================================================
   SKELETON
   ========================================================= */
const SkeletonLoader = () => (
  <div className="af-skeleton">
    <div className="af-skel-stats">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="af-skel af-skel-stat">
          <div className="af-skel af-skel-line-md" style={{ width: 32, margin: '0 auto' }} />
          <div className="af-skel af-skel-line-sm" style={{ width: 52, margin: '6px auto 0' }} />
        </div>
      ))}
    </div>
    <div className="af-skel-toolbar">
      <div className="af-skel af-skel-search" />
      <div className="af-skel af-skel-btn" />
    </div>
    <div className="af-skel-list">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="af-skel af-skel-item">
          <div className="af-skel af-skel-icon" />
          <div style={{ flex: 1 }}>
            <div className="af-skel af-skel-line-md" style={{ width: '40%' }} />
            <div className="af-skel af-skel-line-sm" style={{ width: '80%', marginTop: 8 }} />
            <div className="af-skel af-skel-line-sm" style={{ width: '60%', marginTop: 6 }} />
          </div>
          <div className="af-skel af-skel-pill" />
        </div>
      ))}
    </div>
  </div>
);

/* =========================================================
   MAIN
   ========================================================= */
const AdminFeedback = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchAllFeedback();
  }, [statusFilter, selectedType]);

  /* ---------------- FETCH ---------------- */
  const fetchAllFeedback = async () => {
    setLoading(true);
    try {
      let url = '/api/feedback/admin';
      const params = new URLSearchParams();

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (searchTerm) params.append('search', searchTerm);

      if (params.toString()) url += '?' + params.toString();

      const response = await api.get(url);
      setFeedbacks(response.data.feedbacks || []);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ACTIONS ---------------- */
  const handleStatusUpdate = async (id, newStatus) => {
    const originalFeedbacks = [...feedbacks];
    const originalStats = stats ? { ...stats } : null;

    // Optimistic: update list
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    );

    // Optimistic: adjust stats
    if (stats) {
      const currentFb = feedbacks.find((f) => f.id === id);
      if (currentFb) {
        const from = currentFb.status;
        const to = newStatus;
        const statKeyMap = {
          PENDING: 'pending',
          IN_REVIEW: 'inReview',
          RESOLVED: 'resolved',
          CLOSED: 'closed',
          REJECTED: 'rejected',
        };
        const fromKey = statKeyMap[from];
        const toKey = statKeyMap[to];
        setStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [fromKey]: Math.max(0, (prev[fromKey] || 0) - 1),
            [toKey]: (prev[toKey] || 0) + 1,
          };
        });
      }
    }

    try {
      await api.patch(`/api/feedback/admin/${id}`, {
        status: newStatus,
        adminResponse: '',
      });
    } catch (err) {
      console.error('Error updating status:', err);
      setFeedbacks(originalFeedbacks);
      if (originalStats) setStats(originalStats);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    const originalFeedbacks = [...feedbacks];
    const originalStats = stats ? { ...stats } : null;

    // Optimistic: remove from list
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    if (stats) {
      setStats((prev) => (prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev));
    }

    try {
      await api.delete(`/api/feedback/admin/${id}`);
    } catch (err) {
      console.error('Error deleting feedback:', err);
      setFeedbacks(originalFeedbacks);
      if (originalStats) setStats(originalStats);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchAllFeedback();
  };

  /* ---------------- HELPERS ---------------- */
  const getTypeIcon = (type) => {
    switch (type) {
      case 'FEEDBACK': return <MessageSquare size={17} />;
      case 'COMPLAINT': return <Flag size={17} />;
      case 'SUGGESTION': return <Star size={17} />;
      case 'BUG_REPORT': return <Bug size={17} />;
      default: return <MessageSquare size={17} />;
    }
  };

  const getTypeLabel = (type) => (type ? type.replace('_', ' ') : 'Feedback');

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'Pending', tone: 'warn' },
      IN_REVIEW: { label: 'In review', tone: 'info' },
      RESOLVED: { label: 'Resolved', tone: 'ok' },
      CLOSED: { label: 'Closed', tone: 'neutral' },
      REJECTED: { label: 'Rejected', tone: 'danger' },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      LOW: { label: 'Low', tone: 'ok' },
      MEDIUM: { label: 'Medium', tone: 'warn' },
      HIGH: { label: 'High', tone: 'warn' },
      URGENT: { label: 'Urgent', tone: 'danger' },
    };
    return map[priority] || map.MEDIUM;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="af-page">
      <div className="af-container">
        {/* HEADER */}
        <header className="af-header">
          <div className="af-header-left">
            <button className="af-back-btn" onClick={() => navigate('/admin')} title="Back">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="af-eyebrow">
                <MessageSquare size={12} />
                Member voice
              </div>
              <h1 className="af-title">Feedback management</h1>
              <p className="af-subtitle">
                Review, respond to, and manage feedback from members
              </p>
            </div>
          </div>
          <div className="af-header-actions">
            <button className="af-btn" onClick={fetchAllFeedback} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'af-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        {loading ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="af-error">
            <div className="af-error-icon">
              <AlertCircle size={26} />
            </div>
            <div className="af-error-title">Error loading feedback</div>
            <div className="af-error-sub">{error}</div>
            <button className="af-btn af-btn-primary" onClick={fetchAllFeedback}>
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* STATS */}
            {stats && (
              <div className="af-stats">
                <button
                  className={`af-stat ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  <div className="af-stat-value">{stats.total}</div>
                  <div className="af-stat-label">Total</div>
                </button>
                <button
                  className={`af-stat ${statusFilter === 'PENDING' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('PENDING')}
                >
                  <div className="af-stat-value">{stats.pending}</div>
                  <div className="af-stat-label">Pending</div>
                </button>
                <button
                  className={`af-stat ${statusFilter === 'IN_REVIEW' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('IN_REVIEW')}
                >
                  <div className="af-stat-value">{stats.inReview}</div>
                  <div className="af-stat-label">In review</div>
                </button>
                <button
                  className={`af-stat ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('RESOLVED')}
                >
                  <div className="af-stat-value">{stats.resolved}</div>
                  <div className="af-stat-label">Resolved</div>
                </button>
                <button
                  className={`af-stat ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('CLOSED')}
                >
                  <div className="af-stat-value">{stats.closed}</div>
                  <div className="af-stat-label">Closed</div>
                </button>
                <button
                  className={`af-stat ${statusFilter === 'REJECTED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('REJECTED')}
                >
                  <div className="af-stat-value">{stats.rejected}</div>
                  <div className="af-stat-label">Rejected</div>
                </button>
              </div>
            )}

            {/* TOOLBAR */}
            <div className="af-toolbar">
              <div className="af-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search feedback by subject or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearch}
                />
                {searchTerm && (
                  <button
                    className="af-search-clear"
                    onClick={() => {
                      setSearchTerm('');
                      fetchAllFeedback();
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                className={`af-btn ${showFilters ? 'af-btn-primary' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={13} />
                {showFilters ? 'Hide filters' : 'Show filters'}
                {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* EXPANDABLE FILTERS */}
            {showFilters && (
              <div className="af-filter-panel">
                <div className="af-filter-row">
                  <span className="af-filter-label">Type</span>
                  <div className="af-filter-chips">
                    <button
                      className={`af-chip ${selectedType === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedType('all')}
                    >
                      All
                    </button>
                    <button
                      className={`af-chip ${selectedType === 'FEEDBACK' ? 'active' : ''}`}
                      onClick={() => setSelectedType('FEEDBACK')}
                    >
                      <MessageSquare size={12} /> Feedback
                    </button>
                    <button
                      className={`af-chip ${selectedType === 'COMPLAINT' ? 'active' : ''}`}
                      onClick={() => setSelectedType('COMPLAINT')}
                    >
                      <Flag size={12} /> Complaint
                    </button>
                    <button
                      className={`af-chip ${selectedType === 'SUGGESTION' ? 'active' : ''}`}
                      onClick={() => setSelectedType('SUGGESTION')}
                    >
                      <Star size={12} /> Suggestion
                    </button>
                    <button
                      className={`af-chip ${selectedType === 'BUG_REPORT' ? 'active' : ''}`}
                      onClick={() => setSelectedType('BUG_REPORT')}
                    >
                      <Bug size={12} /> Bug report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LIST */}
            {feedbacks.length === 0 ? (
              <div className="af-empty">
                <div className="af-empty-icon">
                  <MessageSquare size={26} />
                </div>
                <div className="af-empty-title">No feedback found</div>
                <div className="af-empty-sub">
                  There are no feedback submissions matching your filters
                </div>
              </div>
            ) : (
              <div className="af-list">
                {feedbacks.map((feedback) => {
                  const status = getStatusBadge(feedback.status);
                  const priority = getPriorityBadge(feedback.priority);

                  return (
                    <div key={feedback.id} className="af-item">
                      <div className="af-item-left">
                        <div className="af-item-icon">
                          {getTypeIcon(feedback.type)}
                        </div>
                        <div className="af-item-content">
                          <div className="af-item-header">
                            <h4>{feedback.subject}</h4>
                            <span className="af-type">
                              {getTypeLabel(feedback.type)}
                            </span>
                            {feedback.isAnonymous && (
                              <span className="af-anon">Anonymous</span>
                            )}
                          </div>
                          <p className="af-item-desc">
                            {feedback.description?.substring(0, 100)}
                            {feedback.description?.length > 100 ? '…' : ''}
                          </p>
                          <div className="af-item-meta">
                            <span className="af-meta">
                              <Calendar size={11} />
                              {formatDate(feedback.createdAt)}
                            </span>
                            <span className="af-meta">
                              <Users size={11} />
                              {feedback.isAnonymous
                                ? 'Anonymous'
                                : feedback.user?.fullName || 'Unknown'}
                            </span>
                            <span className={`af-badge af-badge-${priority.tone}`}>
                              {priority.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="af-item-right">
                        <div className="af-status-wrap">
                          <span className={`af-badge af-badge-${status.tone}`}>
                            {feedback.status === 'PENDING' && <Clock size={11} />}
                            {feedback.status === 'IN_REVIEW' && <Clock size={11} />}
                            {feedback.status === 'RESOLVED' && <CheckCircle size={11} />}
                            {feedback.status === 'CLOSED' && <XCircle size={11} />}
                            {feedback.status === 'REJECTED' && <AlertCircle size={11} />}
                            {status.label}
                          </span>
                          <select
                            value={feedback.status}
                            onChange={(e) => handleStatusUpdate(feedback.id, e.target.value)}
                            className="af-status-select"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_REVIEW">In review</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>

                        <div className="af-item-actions">
                          <button
                            className="af-icon-btn"
                            onClick={() => navigate(`/admin/feedback/${feedback.id}`)}
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="af-icon-btn af-icon-btn-danger"
                            onClick={() => handleDelete(feedback.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <style>{mainCSS}</style>
    </div>
  );
};

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .af-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .af-container { padding: 28px 24px 60px; max-width: 1280px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .af-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .af-header-left { display: flex; align-items: center; gap: 14px; }
  .af-back-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .af-back-btn:hover { background: #f5f5f5; color: #171717; }
  .af-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .af-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -0.5px; color: #0f0f0f;
  }
  .af-subtitle { font-size: 13.5px; color: #737373; margin: 2px 0 0 0; }
  .af-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- BUTTONS ---------- */
  .af-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .af-btn:hover:not(:disabled) { background: #f5f5f5; border-color: #d4d4d4; }
  .af-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .af-btn-primary { background: #0f0f0f; color: #ffffff; border-color: #0f0f0f; }
  .af-btn-primary:hover:not(:disabled) { background: #262626; border-color: #262626; }

  .af-spin { animation: af-spin 0.9s linear infinite; }
  @keyframes af-spin { to { transform: rotate(360deg); } }

  .af-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .af-icon-btn:hover { background: #f5f5f5; color: #171717; }
  .af-icon-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .af-icon-btn-danger:hover { background: #fef2f2; color: #991b1b; }

  /* ---------- STATS ---------- */
  .af-stats {
    display: grid; grid-template-columns: repeat(6, 1fr);
    gap: 10px; margin-bottom: 20px;
  }
  @media (max-width: 900px) { .af-stats { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 480px) { .af-stats { grid-template-columns: repeat(2, 1fr); } }

  .af-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 14px 12px;
    text-align: center; cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .af-stat:hover { border-color: #d4d4d4; background: #fafafa; }
  .af-stat.active { border-color: #0f0f0f; background: #fafafa; }
  .af-stat-value {
    font-size: 22px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -0.5px; line-height: 1.1;
  }
  .af-stat-label {
    font-size: 10.5px; color: #737373;
    text-transform: uppercase; letter-spacing: 0.05em;
    font-weight: 700; margin-top: 4px;
  }

  /* ---------- TOOLBAR ---------- */
  .af-toolbar {
    display: flex; gap: 10px; margin-bottom: 16px;
    flex-wrap: wrap; align-items: center;
  }
  .af-search {
    flex: 1; min-width: 240px;
    display: flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 9px; padding: 0 12px; height: 38px;
    color: #737373; transition: border-color 0.15s ease;
  }
  .af-search:focus-within { border-color: #a3a3a3; }
  .af-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-family: inherit; height: 100%;
  }
  .af-search input::placeholder { color: #a3a3a3; }
  .af-search-clear {
    background: transparent; border: none; cursor: pointer;
    color: #a3a3a3; padding: 3px; border-radius: 6px; display: flex;
  }
  .af-search-clear:hover { background: #f5f5f5; color: #525252; }

  /* ---------- FILTER PANEL ---------- */
  .af-filter-panel {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 16px; margin-bottom: 16px;
  }
  .af-filter-row {
    display: flex; align-items: center; gap: 12px;
    flex-wrap: wrap;
  }
  .af-filter-label {
    font-size: 11px; font-weight: 700; color: #a3a3a3;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .af-filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .af-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 999px;
    border: 1px solid #e5e5e5; background: #ffffff;
    color: #525252; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit; white-space: nowrap;
  }
  .af-chip:hover { background: #f5f5f5; border-color: #d4d4d4; color: #171717; }
  .af-chip.active {
    background: #0f0f0f; color: #ffffff; border-color: #0f0f0f;
  }

  /* ---------- LIST ---------- */
  .af-list { display: flex; flex-direction: column; gap: 10px; }

  .af-item {
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px; padding: 16px 18px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px;
    transition: border-color 0.15s ease;
  }
  .af-item:hover { border-color: #d4d4d4; }

  .af-item-left {
    display: flex; gap: 14px; align-items: flex-start;
    flex: 1; min-width: 0;
  }
  .af-item-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .af-item-content { flex: 1; min-width: 0; }
  .af-item-header {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .af-item-header h4 {
    font-size: 14.5px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.1px;
  }
  .af-type {
    font-size: 10.5px; font-weight: 700; color: #737373;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .af-anon {
    font-size: 10px; font-weight: 700; color: #525252;
    padding: 2px 8px; background: #f5f5f5; border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .af-item-desc {
    font-size: 12.5px; color: #737373; line-height: 1.5;
    margin: 6px 0 8px 0;
    overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .af-item-meta {
    display: flex; align-items: center; gap: 12px;
    flex-wrap: wrap;
  }
  .af-meta {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11.5px; color: #a3a3a3; font-weight: 500;
  }

  /* ---------- BADGES ---------- */
  .af-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .af-badge-ok { background: #f0fdf4; color: #15803d; }
  .af-badge-info { background: #eff6ff; color: #1d4ed8; }
  .af-badge-warn { background: #fffbeb; color: #b45309; }
  .af-badge-danger { background: #fef2f2; color: #b91c1c; }
  .af-badge-neutral { background: #f5f5f5; color: #525252; }

  /* ---------- ITEM RIGHT ---------- */
  .af-item-right {
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .af-status-wrap {
    display: flex; align-items: center; gap: 8px;
  }
  .af-status-select {
    appearance: none;
    padding: 6px 26px 6px 10px;
    border: 1px solid #e5e5e5; border-radius: 8px;
    background-color: #ffffff;
    font-size: 11.5px; font-weight: 600; color: #262626;
    cursor: pointer; font-family: inherit;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: border-color 0.15s ease;
  }
  .af-status-select:hover { border-color: #a3a3a3; }
  .af-status-select:focus { outline: none; border-color: #0f0f0f; }

  .af-item-actions { display: flex; gap: 4px; }

  /* ---------- EMPTY / ERROR ---------- */
  .af-empty {
    text-align: center; padding: 64px 24px;
    background: #ffffff; border: 2px dashed #e5e5e5;
    border-radius: 14px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .af-empty-icon {
    width: 60px; height: 60px; border-radius: 16px;
    background: #f5f5f5; color: #a3a3a3;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .af-empty-title { font-size: 15px; font-weight: 700; color: #0f0f0f; }
  .af-empty-sub {
    font-size: 12.5px; color: #737373;
    max-width: 360px; line-height: 1.5;
  }

  .af-error {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 56px 36px;
    max-width: 460px; margin: 60px auto;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .af-error-icon {
    width: 60px; height: 60px; border-radius: 16px;
    background: #fef2f2; color: #b91c1c;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .af-error-title { font-size: 15px; font-weight: 700; color: #0f0f0f; }
  .af-error-sub { font-size: 13px; color: #737373; margin-bottom: 12px; }

  /* ---------- SKELETON ---------- */
  .af-skeleton { display: flex; flex-direction: column; gap: 16px; }
  .af-skel {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .af-skel::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: af-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes af-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .af-skel-stats {
    display: grid; grid-template-columns: repeat(6, 1fr);
    gap: 10px; margin-bottom: 4px;
  }
  @media (max-width: 900px) { .af-skel-stats { grid-template-columns: repeat(3, 1fr); } }
  .af-skel-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 16px 12px; text-align: center;
  }
  .af-skel-toolbar {
    display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: wrap;
  }
  .af-skel-search {
    flex: 1; min-width: 240px; height: 38px; border-radius: 9px;
  }
  .af-skel-btn { width: 130px; height: 38px; border-radius: 9px; }
  .af-skel-list { display: flex; flex-direction: column; gap: 10px; }
  .af-skel-item {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 16px 18px;
    display: flex; align-items: center; gap: 14px;
  }
  .af-skel-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
  .af-skel-line-md { height: 16px; border-radius: 4px; }
  .af-skel-line-sm { height: 11px; border-radius: 4px; }
  .af-skel-pill { width: 90px; height: 24px; border-radius: 999px; }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .af-container { padding: 20px 16px 40px; }
    .af-title { font-size: 22px; }
    .af-header { flex-direction: column; align-items: stretch; gap: 16px; }
    .af-header-actions { width: 100%; }
    .af-header-actions .af-btn { flex: 1; justify-content: center; }
    .af-toolbar { flex-direction: column; align-items: stretch; }
    .af-search { width: 100%; min-width: 0; }
    .af-item { flex-direction: column; align-items: stretch; gap: 14px; }
    .af-item-right { justify-content: space-between; }
    .af-item-actions { margin-left: auto; }
  }
  @media (max-width: 480px) {
    .af-stat-value { font-size: 18px; }
  }
`;

const mainCSS = baseCSS;

export default AdminFeedback;