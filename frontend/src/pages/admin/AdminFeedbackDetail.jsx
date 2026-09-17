// pages/admin/AdminFeedbackDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Flag, Star, Bug,
  Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, Mail, Phone, FileText,
  Paperclip, Download, ChevronDown, ChevronUp,
  Edit, Save, X, Trash2, User, RefreshCw,
} from 'lucide-react';
import { api } from '../../api';

/* =========================================================
   SKELETON
   ========================================================= */
const SkeletonLoader = () => (
  <div className="afd-skeleton">
    <div className="afd-skel afd-skel-title-lg" />
    <div className="afd-skel-card">
      <div className="afd-skel-row">
        <div className="afd-skel afd-skel-icon" />
        <div style={{ flex: 1 }}>
          <div className="afd-skel afd-skel-line-lg" style={{ width: '60%' }} />
          <div className="afd-skel afd-skel-line-sm" style={{ width: '30%', marginTop: 10 }} />
        </div>
      </div>
      <div className="afd-skel-meta">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="afd-skel afd-skel-line-sm" style={{ width: '100%' }} />
        ))}
      </div>
      <div className="afd-skel afd-skel-block" />
      <div className="afd-skel afd-skel-block-sm" />
    </div>
  </div>
);

/* =========================================================
   MAIN
   ========================================================= */
const AdminFeedbackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ status: '', adminResponse: '' });
  const [saving, setSaving] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    fetchFeedbackDetail();
  }, [id]);

  const fetchFeedbackDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/feedback/admin/${id}`);
      setFeedback(response.data.feedback);
      setEditData({
        status: response.data.feedback.status,
        adminResponse: response.data.feedback.adminResponse || '',
      });
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback details.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OPTIMISTIC UPDATE ---------------- */
  const handleUpdate = async () => {
    const originalFeedback = { ...feedback };
    const optimistic = {
      ...feedback,
      status: editData.status,
      adminResponse: editData.adminResponse,
      updatedAt: new Date().toISOString(),
    };
    setFeedback(optimistic);
    setIsEditing(false);
    setSaving(true);

    try {
      const response = await api.patch(`/api/feedback/admin/${id}`, {
        status: editData.status,
        adminResponse: editData.adminResponse,
      });
      // Reconcile with server data if returned
      if (response.data?.feedback) {
        setFeedback(response.data.feedback);
      }
    } catch (err) {
      console.error('Error updating feedback:', err);
      setFeedback(originalFeedback);
      setIsEditing(true);
      alert('Failed to update feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await api.delete(`/api/feedback/admin/${id}`);
      navigate('/admin/feedback');
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback.');
    }
  };

  /* ---------------- HELPERS ---------------- */
  const getTypeIcon = (type) => {
    switch (type) {
      case 'FEEDBACK': return <MessageSquare size={22} />;
      case 'COMPLAINT': return <Flag size={22} />;
      case 'SUGGESTION': return <Star size={22} />;
      case 'BUG_REPORT': return <Bug size={22} />;
      default: return <MessageSquare size={22} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'FEEDBACK': return '#3b82f6';
      case 'COMPLAINT': return '#ef4444';
      case 'SUGGESTION': return '#22c55e';
      case 'BUG_REPORT': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getTypeLabel = (type) => type?.replace('_', ' ') || 'Feedback';

  const getStatusBadge = (status) => {
    const map = {
      PENDING: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={14} /> },
      IN_REVIEW: { label: 'In review', color: '#3b82f6', bg: '#eff6ff', icon: <Clock size={14} /> },
      RESOLVED: { label: 'Resolved', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={14} /> },
      CLOSED: { label: 'Closed', color: '#64748b', bg: '#f1f5f9', icon: <XCircle size={14} /> },
      REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={14} /> },
    };
    return map[status] || map.PENDING;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      LOW: { label: 'Low', color: '#22c55e', bg: '#f0fdf4' },
      MEDIUM: { label: 'Medium', color: '#f59e0b', bg: '#fffbeb' },
      HIGH: { label: 'High', color: '#f97316', bg: '#fff7ed' },
      URGENT: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2' },
    };
    return map[priority] || map.MEDIUM;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const statusOptions = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED'];

  /* ---------------- STATES ---------------- */
  if (loading) {
    return (
      <div className="afd-page">
        <div className="afd-container">
          <SkeletonLoader />
        </div>
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="afd-page">
        <div className="afd-container">
          <div className="afd-error">
            <div className="afd-error-icon">
              <AlertCircle size={26} />
            </div>
            <div className="afd-error-title">Feedback not found</div>
            <div className="afd-error-sub">
              {error || 'The feedback you are looking for does not exist.'}
            </div>
            <Link to="/admin/feedback" className="afd-btn afd-btn-primary">
              <ArrowLeft size={14} /> Back to feedback
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(feedback.status);
  const priority = getPriorityBadge(feedback.priority);
  const typeColor = getTypeColor(feedback.type);

  /* ---------------- RENDER ---------------- */
  return (
    <div className="afd-page">
      <div className="afd-container">
        {/* HEADER */}
        <header className="afd-header">
          <div className="afd-header-left">
            <button
              className="afd-back-btn"
              onClick={() => navigate('/admin/feedback')}
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="afd-eyebrow">
                <MessageSquare size={12} />
                Feedback detail
              </div>
              <h1 className="afd-title">Feedback details</h1>
              <p className="afd-subtitle">
                Review, respond to, and manage this submission
              </p>
            </div>
          </div>
          <div className="afd-header-actions">
            <Link to="/admin/feedback" className="afd-btn">
              <ArrowLeft size={14} /> All feedback
            </Link>
            <button
              className="afd-btn afd-btn-danger"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </header>

        {/* MAIN CARD */}
        <article className="afd-card">
          {/* TITLE */}
          <div className="afd-title-block">
            <div
              className="afd-type-icon"
              style={{ background: `${typeColor}15`, color: typeColor }}
            >
              {getTypeIcon(feedback.type)}
            </div>
            <div className="afd-title-content">
              <h2 className="afd-subject">{feedback.subject}</h2>
              <div className="afd-badges">
                <span
                  className="afd-badge"
                  style={{ color: typeColor, background: `${typeColor}10` }}
                >
                  {getTypeLabel(feedback.type)}
                </span>

                {!isEditing ? (
                  <span
                    className="afd-badge"
                    style={{ color: status.color, background: status.bg }}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                ) : (
                  <select
                    value={editData.status}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                    className="afd-status-select"
                  >
                    {statusOptions.map((s) => {
                      const st = getStatusBadge(s);
                      return (
                        <option key={s} value={s}>
                          {st.label}
                        </option>
                      );
                    })}
                  </select>
                )}

                <span
                  className="afd-badge"
                  style={{ color: priority.color, background: priority.bg }}
                >
                  {priority.label} priority
                </span>

                {feedback.isAnonymous && (
                  <span className="afd-badge afd-badge-neutral">Anonymous</span>
                )}
              </div>
            </div>
          </div>

          {/* META */}
          <div className="afd-meta-grid">
            <div className="afd-meta">
              <Calendar size={15} />
              <div>
                <div className="afd-meta-label">Submitted</div>
                <div className="afd-meta-value">{formatDate(feedback.createdAt)}</div>
              </div>
            </div>
            <div className="afd-meta">
              <Clock size={15} />
              <div>
                <div className="afd-meta-label">Time</div>
                <div className="afd-meta-value">{formatTime(feedback.createdAt)}</div>
              </div>
            </div>
            {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && (
              <div className="afd-meta">
                <Clock size={15} />
                <div>
                  <div className="afd-meta-label">Last updated</div>
                  <div className="afd-meta-value">{formatDate(feedback.updatedAt)}</div>
                </div>
              </div>
            )}
            {feedback.resolvedAt && (
              <div className="afd-meta">
                <CheckCircle size={15} color="#22c55e" />
                <div>
                  <div className="afd-meta-label">Resolved</div>
                  <div className="afd-meta-value">{formatDate(feedback.resolvedAt)}</div>
                </div>
              </div>
            )}
          </div>

          {/* USER */}
          {!feedback.isAnonymous && feedback.user && (
            <div className="afd-user">
              <div className="afd-user-avatar">
                {feedback.user.profileImage ? (
                  <img src={feedback.user.profileImage} alt={feedback.user.fullName} />
                ) : (
                  <span>{getInitials(feedback.user.fullName)}</span>
                )}
              </div>
              <div className="afd-user-info">
                <div className="afd-user-name">{feedback.user.fullName}</div>
                <div className="afd-user-contact">
                  <Mail size={12} />
                  <span>{feedback.user.email}</span>
                </div>
                {feedback.user.phone && (
                  <div className="afd-user-contact">
                    <Phone size={12} />
                    <span>{feedback.user.phone}</span>
                  </div>
                )}
              </div>
              <span className="afd-user-role">
                {feedback.user.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
          )}

          {feedback.isAnonymous && (
            <div className="afd-anon-banner">
              <User size={14} />
              <span>This feedback was submitted anonymously</span>
            </div>
          )}

          {/* DESCRIPTION */}
          <section className="afd-section">
            <h3 className="afd-section-title">Description</h3>
            <div className="afd-description">
              <p className={!showFullDescription && feedback.description?.length > 300 ? 'truncated' : ''}>
                {feedback.description}
              </p>
              {feedback.description?.length > 300 && (
                <button
                  className="afd-read-more"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? (
                    <>Show less <ChevronUp size={14} /></>
                  ) : (
                    <>Read more <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </div>
          </section>

          {/* ADMIN RESPONSE */}
          <section className="afd-section afd-response-section">
            <div className="afd-response-head">
              <div className="afd-response-info">
                <div className="afd-response-avatar">
                  <User size={14} />
                </div>
                <div>
                  <h3 className="afd-section-title">Admin response</h3>
                  <div className="afd-response-date">
                    {isEditing
                      ? 'Editing…'
                      : feedback.adminResponse
                      ? formatDate(feedback.updatedAt)
                      : 'No response yet'}
                  </div>
                </div>
              </div>
              <button
                className="afd-btn afd-btn-sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <X size={12} /> Cancel
                  </>
                ) : (
                  <>
                    <Edit size={12} /> Edit
                  </>
                )}
              </button>
            </div>

            {!isEditing ? (
              <div className="afd-response-body">
                {feedback.adminResponse || 'No admin response yet.'}
              </div>
            ) : (
              <div className="afd-response-edit">
                <textarea
                  value={editData.adminResponse}
                  onChange={(e) =>
                    setEditData({ ...editData, adminResponse: e.target.value })
                  }
                  placeholder="Write your response here..."
                  className="afd-textarea"
                  rows={5}
                />
                <div className="afd-response-actions">
                  <button
                    className="afd-btn afd-btn-primary"
                    onClick={handleUpdate}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={13} className="afd-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Save size={13} /> Save response
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ATTACHMENTS */}
          {feedback.attachments && feedback.attachments.length > 0 && (
            <section className="afd-section">
              <h3 className="afd-section-title">
                <Paperclip size={14} />
                Attachments ({feedback.attachments.length})
              </h3>
              <div className="afd-attachments">
                {feedback.attachments.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="afd-attachment"
                  >
                    <FileText size={14} />
                    <span className="afd-attachment-name">{file.filename}</span>
                    <span className="afd-attachment-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <Download size={13} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* FOOTER */}
          <div className="afd-footer">
            <Link to="/admin/feedback" className="afd-btn">
              <ArrowLeft size={14} /> Back to all feedback
            </Link>
            {!isEditing && (
              <button
                className="afd-btn afd-btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <Edit size={14} /> Edit response
              </button>
            )}
          </div>
        </article>
      </div>

      <style>{mainCSS}</style>
    </div>
  );
};

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .afd-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .afd-container { padding: 28px 24px 60px; max-width: 900px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .afd-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .afd-header-left { display: flex; align-items: center; gap: 14px; }
  .afd-back-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .afd-back-btn:hover { background: #f5f5f5; color: #171717; }
  .afd-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .afd-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -0.5px; color: #0f0f0f;
  }
  .afd-subtitle { font-size: 13.5px; color: #737373; margin: 2px 0 0 0; }
  .afd-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- BUTTONS ---------- */
  .afd-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap;
    font-family: inherit; text-decoration: none;
  }
  .afd-btn:hover:not(:disabled) { background: #f5f5f5; border-color: #d4d4d4; }
  .afd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .afd-btn-sm { padding: 6px 10px; font-size: 12px; }
  .afd-btn-primary { background: #0f0f0f; color: #ffffff; border-color: #0f0f0f; }
  .afd-btn-primary:hover:not(:disabled) { background: #262626; border-color: #262626; }
  .afd-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .afd-btn-danger:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; }

  .afd-spin { animation: afd-spin 0.9s linear infinite; }
  @keyframes afd-spin { to { transform: rotate(360deg); } }

  /* ---------- CARD ---------- */
  .afd-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 28px;
  }

  /* ---------- TITLE BLOCK ---------- */
  .afd-title-block {
    display: flex; gap: 16px; align-items: flex-start;
    padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;
    margin-bottom: 20px;
  }
  .afd-type-icon {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .afd-title-content { flex: 1; min-width: 0; }
  .afd-subject {
    font-size: 20px; font-weight: 700; color: #0f0f0f;
    margin: 0 0 10px 0; letter-spacing: -0.3px;
    word-break: break-word;
  }
  .afd-badges {
    display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  }

  .afd-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .afd-badge-neutral { background: #f5f5f5; color: #525252; }

  .afd-status-select {
    appearance: none;
    padding: 5px 26px 5px 11px;
    border: 1px solid #e5e5e5; border-radius: 999px;
    background-color: #ffffff;
    font-size: 11.5px; font-weight: 600; color: #262626;
    cursor: pointer; font-family: inherit;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: border-color 0.15s ease;
  }
  .afd-status-select:hover { border-color: #a3a3a3; }
  .afd-status-select:focus { outline: none; border-color: #0f0f0f; }

  /* ---------- META ---------- */
  .afd-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px; padding: 16px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 11px; margin-bottom: 20px;
  }
  .afd-meta {
    display: flex; align-items: flex-start; gap: 10px;
  }
  .afd-meta svg { color: #a3a3a3; flex-shrink: 0; margin-top: 2px; }
  .afd-meta-label {
    font-size: 10.5px; color: #a3a3a3;
    text-transform: uppercase; letter-spacing: 0.06em;
    font-weight: 700; margin-bottom: 2px;
  }
  .afd-meta-value {
    font-size: 13px; font-weight: 600; color: #171717;
  }

  /* ---------- USER ---------- */
  .afd-user {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 11px; margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .afd-user-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    display: flex; align-items: center; justify-content: center;
    color: #ffffff; font-weight: 700; font-size: 15px;
    overflow: hidden; flex-shrink: 0;
  }
  .afd-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .afd-user-info { flex: 1; min-width: 0; }
  .afd-user-name {
    font-size: 14px; font-weight: 700; color: #0f0f0f;
    margin-bottom: 4px;
  }
  .afd-user-contact {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; color: #737373;
    margin-right: 12px;
  }
  .afd-user-role {
    padding: 3px 10px; border-radius: 999px;
    background: #f5f5f5; color: #525252;
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .afd-anon-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; background: #f5f5f5;
    border: 1px solid #e5e5e5; border-radius: 10px;
    color: #525252; font-size: 12.5px; font-weight: 500;
    margin-bottom: 20px;
  }

  /* ---------- SECTIONS ---------- */
  .afd-section { margin-bottom: 24px; }
  .afd-section:last-of-type { margin-bottom: 0; }

  .afd-section-title {
    display: flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 700; color: #0f0f0f;
    margin: 0 0 12px 0;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .afd-section-title svg { color: #737373; }

  /* ---------- DESCRIPTION ---------- */
  .afd-description {
    padding: 16px 18px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 11px;
  }
  .afd-description p {
    font-size: 14px; line-height: 1.7; color: #262626;
    margin: 0; white-space: pre-wrap;
  }
  .afd-description p.truncated {
    max-height: 150px; overflow: hidden;
    position: relative;
  }
  .afd-description p.truncated::after {
    content: ''; position: absolute;
    bottom: 0; left: 0; right: 0; height: 40px;
    background: linear-gradient(transparent, #fafafa);
  }
  .afd-read-more {
    display: inline-flex; align-items: center; gap: 5px;
    background: transparent; border: none;
    color: #0f0f0f; font-weight: 700; font-size: 12.5px;
    cursor: pointer; padding: 8px 0 0 0;
    font-family: inherit; transition: color 0.15s ease;
  }
  .afd-read-more:hover { color: #525252; }

  /* ---------- RESPONSE ---------- */
  .afd-response-section {
    padding: 16px;
    background: #fafffb;
    border: 1px solid #bbf7d0;
    border-radius: 11px;
  }
  .afd-response-section .afd-section-title { color: #166534; }

  .afd-response-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
  }
  .afd-response-info {
    display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;
  }
  .afd-response-avatar {
    width: 36px; height: 36px; border-radius: 9px;
    background: #f0fdf4; color: #15803d;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .afd-response-date {
    font-size: 11.5px; color: #737373;
    margin-top: 2px; font-weight: 500;
  }

  .afd-response-body {
    font-size: 13.5px; line-height: 1.6; color: #262626;
    padding: 12px 14px;
    background: #ffffff;
    border: 1px solid #e5e5e5; border-radius: 9px;
    white-space: pre-wrap;
  }

  .afd-response-edit { display: flex; flex-direction: column; gap: 12px; }
  .afd-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    font-size: 13.5px; color: #171717;
    font-family: inherit; background: #ffffff;
    resize: vertical; min-height: 100px;
    line-height: 1.6;
    transition: border-color 0.15s ease;
  }
  .afd-textarea:focus { outline: none; border-color: #0f0f0f; }
  .afd-response-actions {
    display: flex; justify-content: flex-end; gap: 8px;
  }

  /* ---------- ATTACHMENTS ---------- */
  .afd-attachments {
    display: flex; flex-direction: column; gap: 6px;
  }
  .afd-attachment {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 9px;
    text-decoration: none; color: #262626;
    transition: all 0.15s ease;
  }
  .afd-attachment:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .afd-attachment svg { color: #737373; flex-shrink: 0; }
  .afd-attachment-name {
    flex: 1; font-size: 13px; font-weight: 600; color: #171717;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .afd-attachment-size {
    font-size: 11.5px; color: #a3a3a3;
    font-weight: 500; flex-shrink: 0;
  }

  /* ---------- FOOTER ---------- */
  .afd-footer {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; padding-top: 20px;
    border-top: 1px solid #f0f0f0;
    margin-top: 24px; flex-wrap: wrap;
  }

  /* ---------- ERROR ---------- */
  .afd-error {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 56px 36px;
    max-width: 460px; margin: 60px auto;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .afd-error-icon {
    width: 60px; height: 60px; border-radius: 16px;
    background: #fef2f2; color: #b91c1c;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .afd-error-title {
    font-size: 16px; font-weight: 700; color: #0f0f0f;
  }
  .afd-error-sub {
    font-size: 13px; color: #737373; margin-bottom: 14px;
    max-width: 340px; line-height: 1.5;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .afd-container { padding: 20px 16px 40px; }
    .afd-title { font-size: 22px; }
    .afd-header { flex-direction: column; align-items: stretch; gap: 14px; }
    .afd-header-actions { width: 100%; }
    .afd-header-actions .afd-btn { flex: 1; justify-content: center; }
    .afd-card { padding: 20px; }
    .afd-title-block { flex-direction: column; gap: 12px; }
    .afd-meta-grid { grid-template-columns: 1fr; }
    .afd-footer { flex-direction: column; align-items: stretch; }
    .afd-footer .afd-btn { justify-content: center; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .afd-skeleton { display: flex; flex-direction: column; gap: 22px; }
  .afd-skel {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .afd-skel::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: afd-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes afd-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .afd-skel-title-lg { width: 180px; height: 26px; }
  .afd-skel-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 28px;
  }
  .afd-skel-row {
    display: flex; align-items: flex-start; gap: 16px;
    padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;
    margin-bottom: 20px;
  }
  .afd-skel-icon { width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0; }
  .afd-skel-line-lg { height: 20px; border-radius: 4px; }
  .afd-skel-line-sm { height: 12px; border-radius: 4px; }
  .afd-skel-meta {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 12px; padding: 16px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 11px; margin-bottom: 20px;
  }
  .afd-skel-block {
    height: 100px; border-radius: 11px; margin-bottom: 20px;
  }
  .afd-skel-block-sm {
    height: 60px; border-radius: 11px;
  }
`;

const mainCSS = baseCSS;

export default AdminFeedbackDetail;