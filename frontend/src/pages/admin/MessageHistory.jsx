// pages/admin/MessageHistory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, RefreshCw, Search, Filter, Edit2, Trash2, 
  Copy, Check, Loader, MessageCircle, Users, Phone,
  Calendar, Clock, AlertCircle, XCircle, CheckCircle,
  Eye, EyeOff, BarChart3, Download, ChevronLeft, ChevronRight,
  History as HistoryIcon, Inbox
} from 'lucide-react';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';

export default function MessageHistory() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [groupNames, setGroupNames] = useState({});

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ==================== FETCH GROUP NAMES ====================
  const fetchGroupNames = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/whatsapp/groups', { headers });
      if (response.data.success) {
        const nameMap = {};
        response.data.groups.forEach(g => {
          nameMap[g.id] = g.name;
        });
        setGroupNames(nameMap);
      }
    } catch (error) {
      console.error('Error fetching group names:', error);
    }
  }, []);

  // ==================== FETCH MESSAGES ====================
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('offset', offset);
      if (search) params.append('search', search);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await api.get(`/api/admin/whatsapp/messages?${params}`, { headers });
      if (response.data.success) {
        setMessages(response.data.messages);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to fetch message history', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, search, filterType]);

  // ==================== FETCH STATS ====================
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/whatsapp/messages/stats', { headers });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchStats();
    fetchGroupNames();
  }, [fetchMessages, fetchStats, fetchGroupNames]);

  // ==================== EDIT MESSAGE ====================
  const handleEdit = async (messageId) => {
    if (!editContent.trim()) {
      showToast('Message content is required', 'error');
      return;
    }

    try {
      const response = await api.put(`/api/admin/whatsapp/messages/${messageId}`, 
        { message: editContent },
        { headers }
      );
      if (response.data.success) {
        showToast('✅ Message updated successfully!');
        setEditingMessage(null);
        setEditContent('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error editing message:', error);
      showToast('Failed to edit message: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  // ==================== DELETE MESSAGE ====================
  const handleDelete = async (messageId, permanent = false) => {
    if (!confirm(`Are you sure you want to ${permanent ? 'permanently delete' : 'soft delete'} this message?`)) return;

    try {
      const response = await api.delete(`/api/admin/whatsapp/messages/${messageId}`, {
        params: { permanent },
        headers
      });
      if (response.data.success) {
        showToast(`✅ Message ${permanent ? 'permanently deleted' : 'soft deleted'}!`);
        fetchMessages();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Failed to delete message', 'error');
    }
  };

  // ==================== COPY TO CLIPBOARD ====================
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('✅ Copied to clipboard!');
  };

  // ==================== FORMAT DATE ====================
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== GET TYPE BADGE ====================
  const getTypeBadge = (type) => {
    const types = {
      'group': { label: 'Group', color: '#3b82f6', bg: '#dbeafe' },
      'user': { label: 'User', color: '#22c55e', bg: '#dcfce7' },
      'broadcast': { label: 'Broadcast', color: '#8b5cf6', bg: '#f5f3ff' },
      'broadcast_group': { label: 'Group Broadcast', color: '#f59e0b', bg: '#fef3c7' }
    };
    return types[type] || types['group'];
  };

  // ==================== GET STATUS BADGE ====================
  const getStatusBadge = (status) => {
    const statuses = {
      'sent': { label: 'Sent', color: '#22c55e', bg: '#dcfce7' },
      'edited': { label: 'Edited', color: '#3b82f6', bg: '#dbeafe' },
      'deleted': { label: 'Deleted', color: '#ef4444', bg: '#fee2e2' },
      'failed': { label: 'Failed', color: '#ef4444', bg: '#fee2e2' }
    };
    return statuses[status] || statuses['sent'];
  };

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const goToPage = (page) => {
    setOffset((page - 1) * limit);
  };

  return (
    <div className="message-history-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      {/* ==================== HEADER ==================== */}
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/admin/whatsapp')}>
            <ArrowLeft size={20} />
          </button>
          <div className="title-icon">
            <HistoryIcon size={24} />
          </div>
          <div>
            <h1>Message History</h1>
            <p className="subtitle">View, edit, and manage all sent WhatsApp messages</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={() => { fetchMessages(); fetchStats(); }}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn-stats" onClick={() => setShowStats(!showStats)}>
            <BarChart3 size={18} /> {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
      </div>

      {/* ==================== STATS ==================== */}
      {showStats && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><MessageCircle size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Messages</span>
            </div>
          </div>
          {stats.byType && stats.byType.map((item) => (
            <div key={item.type} className="stat-card">
              <div className="stat-icon">
                {item.type === 'group' ? <Users size={24} /> : 
                 item.type === 'user' ? <Phone size={24} /> : 
                 <MessageCircle size={24} />}
              </div>
              <div className="stat-info">
                <span className="stat-value">{item.count}</span>
                <span className="stat-label">{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
              </div>
            </div>
          ))}
          {stats.last7Days && stats.last7Days.length > 0 && (
            <div className="stat-card full-width">
              <div className="stat-info">
                <span className="stat-label">Last 7 Days</span>
                <div className="stat-days">
                  {stats.last7Days.map((day) => (
                    <div key={day.date} className="stat-day">
                      <span className="day-label">{new Date(day.date).toLocaleDateString('en-KE', { weekday: 'short' })}</span>
                      <span className="day-count">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== FILTERS ==================== */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="group">Group</option>
          <option value="user">User</option>
          <option value="broadcast">Broadcast</option>
          <option value="broadcast_group">Group Broadcast</option>
        </select>
        <button className="btn-apply-filter" onClick={fetchMessages}>
          Apply
        </button>
      </div>

      {/* ==================== MESSAGES LIST ==================== */}
      <div className="messages-list">
        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="spin" />
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <Inbox size={64} style={{ color: '#cbd5e1' }} />
            <p>No messages found</p>
            <p className="empty-sub">Send a message to start tracking history</p>
          </div>
        ) : (
         messages.map((msg, index) => {
  const typeBadge = getTypeBadge(msg.type);
  const statusBadge = getStatusBadge(msg.status);
  const isEditing = editingMessage === msg.id;
  const messageNumber = (offset || 0) + index + 1;
  
  // Get the recipient name
  let recipientName = '';
  let recipientId = '';
  let recipientType = '';
  
  if (msg.groupId) {
    recipientName = groupNames[msg.groupId] || msg.groupId.substring(0, 20) + '...';
    recipientId = msg.groupId;
    recipientType = 'Group';
  } else if (msg.phoneNumber) {
    recipientName = msg.phoneNumber;
    recipientId = msg.phoneNumber;
    recipientType = 'User';
  }

  return (
    <div key={msg.id} className={`message-item ${msg.status === 'deleted' ? 'deleted' : ''}`}>
      <div className="message-number">{messageNumber}.</div>
      
      <div className="message-details">
        {/* ===== SENT TO SECTION ===== */}
        <div className="message-recipient">
          <div className="recipient-header">
            <span className="recipient-icon">📨</span>
            <span className="recipient-label">Sent To:</span>
            <span className="recipient-name">{recipientName}</span>
            {recipientId && (
              <span className="recipient-id" title={recipientId}>
                ({recipientId})
              </span>
            )}
            <span className="recipient-type">{recipientType}</span>
          </div>
        </div>

        <div className="message-header">
          <div className="message-meta">
            <span className={`type-badge`} style={{ background: typeBadge.bg, color: typeBadge.color }}>
              {typeBadge.label}
            </span>
            <span className={`status-badge`} style={{ background: statusBadge.bg, color: statusBadge.color }}>
              {statusBadge.label}
            </span>
            <span className="timestamp">
              <Clock size={14} /> {formatDate(msg.sentAt)}
            </span>
            {msg.editedAt && (
              <span className="edited-badge">
                <Edit2 size={12} /> Edited
              </span>
            )}
          </div>
          <div className="message-actions">
            <button 
              className="btn-copy" 
              onClick={() => copyToClipboard(msg.message)}
              title="Copy message"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            {msg.status !== 'deleted' && msg.type !== 'broadcast' && (
              <button 
                className="btn-edit" 
                onClick={() => {
                  setEditingMessage(msg.id);
                  setEditContent(msg.message);
                }}
                title="Edit message (within 15 minutes)"
              >
                <Edit2 size={16} />
              </button>
            )}
            {msg.status !== 'deleted' && (
              <button 
                className="btn-delete" 
                onClick={() => handleDelete(msg.id, false)}
                title="Soft delete"
              >
                <Trash2 size={16} />
              </button>
            )}
            {msg.status === 'deleted' && (
              <button 
                className="btn-delete-permanent" 
                onClick={() => handleDelete(msg.id, true)}
                title="Permanently delete"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="message-content">
          {isEditing ? (
            <div className="edit-form">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows="3"
                className="edit-textarea"
              />
              <div className="edit-actions">
                <button className="btn-save-edit" onClick={() => handleEdit(msg.id)}>
                  <Check size={16} /> Save
                </button>
                <button className="btn-cancel-edit" onClick={() => {
                  setEditingMessage(null);
                  setEditContent('');
                }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="message-text-wrapper">
              <p className="message-text">{msg.message}</p>
            </div>
          )}
        </div>

        {msg.originalMessage && msg.originalMessage !== msg.message && (
          <div className="message-original">
            <small>Original: {msg.originalMessage.substring(0, 150)}...</small>
          </div>
        )}
      </div>
    </div>
  );
})
        )}
      </div>

      {/* ==================== PAGINATION ==================== */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="btn-page"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="btn-page"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ==================== STYLES ==================== */}
      <style>{`
        .message-history-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
          background: white;
          padding: 20px 24px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-back {
          padding: 8px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-back:hover {
          background: #e2e8f0;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          background: #8b5cf6;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .page-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-refresh, .btn-stats {
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .btn-refresh:hover, .btn-stats:hover {
          background: #e2e8f0;
        }

        .btn-stats {
          background: #8b5cf6;
          color: white;
        }

        .btn-stats:hover {
          background: #7c3aed;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-card.full-width {
          grid-column: 1 / -1;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .stat-days {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .stat-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 8px;
        }

        .day-label {
          font-size: 11px;
          color: #64748b;
        }

        .day-count {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          background: white;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 8px 14px;
          border-radius: 8px;
          min-width: 200px;
        }

        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          flex: 1;
          font-size: 14px;
        }

        .filter-select {
          padding: 8px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          outline: none;
        }

        .btn-apply-filter {
          padding: 8px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-apply-filter:hover {
          background: #2563eb;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-item {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .message-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .message-item.deleted {
          opacity: 0.6;
          background: #f8fafc;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }

        .message-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .type-badge, .status-badge {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .recipient {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .timestamp {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        .edited-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #3b82f6;
        }

        .message-actions {
          display: flex;
          gap: 4px;
        }

        .message-actions button {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .message-actions button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .btn-copy:hover { color: #3b82f6; }
        .btn-edit:hover { color: #f59e0b; }
        .btn-delete:hover { color: #ef4444; }
        .btn-delete-permanent:hover { color: #dc2626; }

        .message-content {
          margin-top: 4px;
        }

        .message-text {
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          margin: 0;
          word-wrap: break-word;
        }

        .message-original {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 12px;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .edit-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          outline: none;
        }

        .edit-textarea:focus {
          border-color: #8b5cf6;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
        }

        .btn-save-edit {
          padding: 6px 16px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .btn-save-edit:hover {
          background: #16a34a;
        }

        .btn-cancel-edit {
          padding: 6px 16px;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-cancel-edit:hover {
          background: #e2e8f0;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          padding: 16px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .btn-page {
          padding: 6px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .btn-page:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .btn-page:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 14px;
          color: #64748b;
        }

        /* ===== RECIPIENT SECTION ===== */
.message-recipient {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 8px 14px;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid #3b82f6;
}

.recipient-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.recipient-icon {
  font-size: 16px;
}

.recipient-label {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
}

.recipient-name {
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
}

.recipient-id {
  font-family: monospace;
  font-size: 11px;
  color: #64748b;
  word-break: break-all;
}

.recipient-type {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
  background: #dbeafe;
  color: #2563eb;
}

.message-item {
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.message-number {
  font-size: 18px;
  font-weight: 700;
  color: #94a3b8;
  min-width: 40px;
  padding-top: 4px;
  font-family: monospace;
}

.message-details {
  flex: 1;
  min-width: 0;
}

.message-text-wrapper {
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid #0d0a13;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .message-item {
    flex-direction: column;
    gap: 8px;
  }
  
  .message-number {
    min-width: auto;
  }
  
  .recipient-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .recipient-id {
    word-break: break-all;
  }
}

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state p {
          margin: 8px 0 0;
        }

        .empty-sub {
          font-size: 13px;
          color: #cbd5e1;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          z-index: 1100;
          font-size: 14px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .toast.success { background: #22c55e; }
        .toast.error { background: #ef4444; }
        .toast.info { background: #3b82f6; }

        @media (max-width: 768px) {
          .message-history-container { padding: 16px; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; }
          .btn-refresh, .btn-stats { flex: 1; justify-content: center; }
          .filters-bar { flex-direction: column; }
          .search-box { min-width: auto; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .stat-days { flex-wrap: wrap; }
          .message-header { flex-direction: column; }
          .message-actions { width: 100%; justify-content: flex-end; }
          .recipient { max-width: 150px; }
        }
      `}</style>
    </div>
  );
}