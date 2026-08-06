// src/pages/admin/MessageHistory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, RefreshCw, Search, Filter, Edit2, Trash2, 
  Copy, Check, Loader, MessageCircle, Users, Phone,
  Calendar, Clock, AlertCircle, XCircle, CheckCircle,
  Eye, EyeOff, BarChart3, Download, ChevronLeft, ChevronRight,
  History as HistoryIcon, Inbox, ChevronDown, ChevronUp,
  Layers, Send, Globe
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
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showGroupList, setShowGroupList] = useState({});
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [bulkEditContent, setBulkEditContent] = useState('');
  const [groupedMessages, setGroupedMessages] = useState([]);

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
          nameMap[g.id] = g.name || g.id;
        });
        setGroupNames(nameMap);
        return nameMap;
      }
    } catch (error) {
      console.error('Error fetching group names:', error);
      return {};
    }
  }, []);

  // ==================== FETCH MESSAGES ====================
  const fetchMessages = useCallback(async (namesMap = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('offset', offset);
      if (search) params.append('search', search);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await api.get(`/api/admin/whatsapp/messages?${params}`, { headers });
      if (response.data.success) {
        const rawMessages = response.data.messages;
        setMessages(rawMessages);
        setTotal(response.data.total);
        
        // Use provided namesMap or current groupNames state
        const names = namesMap || groupNames;
        const grouped = groupMessagesByBroadcast(rawMessages, names);
        setGroupedMessages(grouped);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to fetch message history', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, search, filterType, groupNames]);

  // ==================== GROUP MESSAGES BY BROADCAST ====================
  const groupMessagesByBroadcast = (messages, namesMap = {}) => {
    const groups = {};
    
    messages.forEach(msg => {
      // If it's a broadcast or has similar content, group it
      const isBroadcast = msg.type === 'broadcast_group' || msg.type === 'broadcast';
      const key = msg.broadcastId || (isBroadcast ? msg.originalMessage || msg.message : msg.id);
      
      if (!groups[key]) {
        groups[key] = {
          broadcastId: key,
          message: msg.message,
          originalMessage: msg.originalMessage || msg.message,
          type: msg.type,
          status: msg.status,
          sentAt: msg.sentAt,
          groups: [],
          count: 0,
          messageId: msg.messageId,
          id: msg.id
        };
      }
      
      // ✅ Get group name from the groupNames map, or clean the ID for display
      const rawName = namesMap[msg.groupId];
      let displayName;
      if (rawName && rawName !== msg.groupId) {
        displayName = rawName;
      } else {
        displayName = cleanGroupIdForDisplay(msg.groupId);
      }
      
      groups[key].groups.push({
        groupId: msg.groupId,
        groupName: displayName,
        sentAt: msg.sentAt,
        status: msg.status,
        messageId: msg.messageId,
        id: msg.id
      });
      groups[key].count++;
    });

    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => 
      new Date(b.sentAt) - new Date(a.sentAt)
    );
  };

  // ==================== CLEAN GROUP ID FOR DISPLAY ====================
  const cleanGroupIdForDisplay = (groupId) => {
    if (!groupId) return 'Unknown Group';
    
    // Remove @g.us suffix
    let clean = groupId.replace('@g.us', '');
    
    // If it looks like a phone number with dash, format it
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 2) {
        const phone = parts[0];
        if (phone.startsWith('254') && phone.length === 12) {
          const formatted = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
          return `📱 ${formatted}`;
        }
        return `📱 ${phone}`;
      }
    }
    
    // For numeric IDs like 120363428001788260
    if (/^\d+$/.test(clean) && clean.length > 6) {
      return `📋 Group ${clean.slice(-6)}`;
    }
    
    return `📋 ${clean}`;
  };

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

  // ✅ Load group names first, then messages
  useEffect(() => {
    const loadData = async () => {
      const names = await fetchGroupNames();
      await fetchMessages(names);
      await fetchStats();
    };
    loadData();
  }, []);

  // ==================== TOGGLE EXPAND ====================
  const toggleExpand = (broadcastId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [broadcastId]: !prev[broadcastId]
    }));
  };

  // ==================== TOGGLE GROUP LIST ====================
  const toggleGroupList = (broadcastId) => {
    setShowGroupList(prev => ({
      ...prev,
      [broadcastId]: !prev[broadcastId]
    }));
  };

  // ==================== BULK EDIT ====================
  const handleBulkEdit = async () => {
    if (!bulkEditContent.trim()) {
      showToast('Message content is required', 'error');
      return;
    }

    if (selectedMessages.length === 0) {
      showToast('Please select at least one broadcast to edit', 'error');
      return;
    }

    if (!confirm(`Edit ${selectedMessages.length} broadcast(s) with the new message?`)) return;

    setLoading(true);
    try {
      const response = await api.put('/api/admin/whatsapp/messages/bulk-edit', {
        broadcastIds: selectedMessages,
        message: bulkEditContent
      }, { headers });

      if (response.data.success) {
        showToast(`✅ ${response.data.updated} broadcast(s) updated!`);
        setBulkEditMode(false);
        setSelectedMessages([]);
        setBulkEditContent('');
        const names = await fetchGroupNames();
        await fetchMessages(names);
        await fetchStats();
      }
    } catch (error) {
      console.error('Error bulk editing:', error);
      showToast('Failed to bulk edit messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== BULK DELETE ====================
  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) {
      showToast('Please select at least one broadcast to delete', 'error');
      return;
    }

    if (!confirm(`Delete ${selectedMessages.length} broadcast(s) and all their messages? This cannot be undone!`)) return;

    setLoading(true);
    try {
      const response = await api.delete('/api/admin/whatsapp/messages/bulk-delete', {
        data: { broadcastIds: selectedMessages },
        headers
      });

      if (response.data.success) {
        showToast(`✅ ${response.data.deleted} broadcast(s) deleted!`);
        setSelectedMessages([]);
        setBulkEditMode(false);
        const names = await fetchGroupNames();
        await fetchMessages(names);
        await fetchStats();
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
      showToast('Failed to bulk delete messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== TOGGLE SELECT ====================
  const toggleSelect = (broadcastId) => {
    setSelectedMessages(prev => {
      if (prev.includes(broadcastId)) {
        return prev.filter(id => id !== broadcastId);
      } else {
        return [...prev, broadcastId];
      }
    });
  };

  // ==================== SELECT ALL ====================
  const selectAll = () => {
    if (selectedMessages.length === groupedMessages.length && groupedMessages.length > 0) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(groupedMessages.map(g => g.broadcastId));
    }
  };

  // ==================== EDIT SINGLE ====================
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
        const names = await fetchGroupNames();
        await fetchMessages(names);
        await fetchStats();
      }
    } catch (error) {
      console.error('Error editing message:', error);
      showToast('Failed to edit message: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  // ==================== DELETE SINGLE ====================
  const handleDelete = async (messageId, permanent = false) => {
    if (!confirm(`Are you sure you want to ${permanent ? 'permanently delete' : 'soft delete'} this message?`)) return;

    try {
      const response = await api.delete(`/api/admin/whatsapp/messages/${messageId}`, {
        params: { permanent },
        headers
      });
      if (response.data.success) {
        showToast(`✅ Message ${permanent ? 'permanently deleted' : 'soft deleted'}!`);
        const names = await fetchGroupNames();
        await fetchMessages(names);
        await fetchStats();
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

  // ==================== TRUNCATE TEXT ====================
  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // ==================== GET TYPE BADGE ====================
  const getTypeBadge = (type) => {
    const types = {
      'group': { label: 'Group', color: '#3b82f6', bg: '#dbeafe', icon: Users },
      'user': { label: 'User', color: '#22c55e', bg: '#dcfce7', icon: Phone },
      'broadcast': { label: 'Broadcast', color: '#8b5cf6', bg: '#f5f3ff', icon: Send },
      'broadcast_group': { label: 'Group Broadcast', color: '#f59e0b', bg: '#fef3c7', icon: Layers }
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
          <button className="btn-refresh" onClick={() => { 
            const refresh = async () => {
              const names = await fetchGroupNames();
              await fetchMessages(names);
              await fetchStats();
            };
            refresh();
          }}>
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
                 item.type === 'broadcast_group' ? <Layers size={24} /> :
                 <Send size={24} />}
              </div>
              <div className="stat-info">
                <span className="stat-value">{item.count}</span>
                <span className="stat-label">{item.type.replace('_', ' ').charAt(0).toUpperCase() + item.type.slice(1)}</span>
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
        <button className="btn-apply-filter" onClick={() => {
          const applyFilter = async () => {
            const names = await fetchGroupNames();
            await fetchMessages(names);
          };
          applyFilter();
        }}>
          Apply
        </button>
        {selectedMessages.length > 0 && (
          <span className="selection-badge">
            {selectedMessages.length} selected
          </span>
        )}
      </div>

      {/* ==================== BULK ACTIONS BAR ==================== */}
      {groupedMessages.length > 0 && (
        <div className="bulk-actions-bar">
          <label className="select-all-label">
            <input
              type="checkbox"
              checked={selectedMessages.length === groupedMessages.length && groupedMessages.length > 0}
              onChange={selectAll}
            />
            Select All
          </label>
          <button 
            className="btn-bulk-edit"
            onClick={() => setBulkEditMode(!bulkEditMode)}
            disabled={selectedMessages.length === 0}
          >
            <Edit2 size={16} /> Edit Selected
          </button>
          <button 
            className="btn-bulk-delete"
            onClick={handleBulkDelete}
            disabled={selectedMessages.length === 0 || loading}
          >
            <Trash2 size={16} /> Delete Selected
          </button>
        </div>
      )}

      {/* ==================== BULK EDIT FORM ==================== */}
      {bulkEditMode && selectedMessages.length > 0 && (
        <div className="bulk-edit-form">
          <div className="bulk-edit-header">
            <h4>✏️ Bulk Edit {selectedMessages.length} Broadcast(s)</h4>
            <button className="btn-close-bulk" onClick={() => setBulkEditMode(false)}>✕</button>
          </div>
          <textarea
            placeholder="Enter new message content for all selected broadcasts..."
            value={bulkEditContent}
            onChange={(e) => setBulkEditContent(e.target.value)}
            rows="4"
            className="bulk-edit-textarea"
          />
          <div className="bulk-edit-actions">
            <button className="btn-bulk-save" onClick={handleBulkEdit} disabled={loading}>
              {loading ? <Loader size={16} className="spin" /> : <Check size={16} />}
              Update All
            </button>
            <button className="btn-bulk-cancel" onClick={() => setBulkEditMode(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ==================== MESSAGES LIST ==================== */}
      <div className="messages-list">
        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="spin" />
            <p>Loading messages...</p>
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="empty-state">
            <Inbox size={64} style={{ color: '#cbd5e1' }} />
            <p>No messages found</p>
            <p className="empty-sub">Send a message to start tracking history</p>
          </div>
        ) : (
          groupedMessages.map((group, index) => {
            const typeBadge = getTypeBadge(group.type);
            const statusBadge = getStatusBadge(group.status);
            const isExpanded = expandedMessages[group.broadcastId] || false;
            const showGroups = showGroupList[group.broadcastId] || false;
            const isSelected = selectedMessages.includes(group.broadcastId);
            const isLongMessage = group.message && group.message.length > 200;
            const displayText = isExpanded ? group.message : truncateText(group.message, 200);
            const messageNumber = (offset || 0) + index + 1;

            return (
              <div key={group.broadcastId} className={`message-item ${group.status === 'deleted' ? 'deleted' : ''} ${isSelected ? 'selected' : ''}`}>
                <div className="message-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(group.broadcastId)}
                  />
                </div>
                
                <div className="message-details">
                  {/* ===== BROADCAST HEADER ===== */}
                  <div className="broadcast-header">
                    <span className="broadcast-icon">📨</span>
                    <span className="broadcast-label">Broadcast to:</span>
                    <span className="broadcast-count">{group.count} {group.count === 1 ? 'group' : 'groups'}</span>
                    <span className={`type-badge`} style={{ background: typeBadge.bg, color: typeBadge.color }}>
                      {typeBadge.label}
                    </span>
                    <span className={`status-badge`} style={{ background: statusBadge.bg, color: statusBadge.color }}>
                      {statusBadge.label}
                    </span>
                    <span className="timestamp">
                      <Clock size={14} /> {formatDate(group.sentAt)}
                    </span>
                  </div>

                  {/* ===== GROUP LIST TOGGLE ===== */}
                  <button 
                    className="btn-toggle-groups"
                    onClick={() => toggleGroupList(group.broadcastId)}
                  >
                    {showGroups ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showGroups ? 'Hide Groups' : `Show ${group.count} Groups`}
                  </button>

                  {showGroups && (
                    <div className="group-list">
                      {group.groups.map((g, i) => (
                        <div key={g.id} className="group-item-inline">
                          <span className="group-number">{i + 1}.</span>
                          <span className="group-name">{g.groupName || g.groupId}</span>
                          <span className="group-time">{formatDate(g.sentAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== MESSAGE CONTENT ===== */}
                  <div className="message-content">
                    {isLongMessage && (
                      <button 
                        className="btn-toggle-expand"
                        onClick={() => toggleExpand(group.broadcastId)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={16} /> Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} /> Show More ({group.message.length - 200} more characters)
                          </>
                        )}
                      </button>
                    )}
                    <div className="message-text-wrapper">
                      <p className="message-text">{displayText}</p>
                    </div>
                  </div>

                  {/* ===== SINGLE ACTIONS ===== */}
                  <div className="single-actions">
                    <button 
                      className="btn-copy" 
                      onClick={() => copyToClipboard(group.message)}
                      title="Copy message"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    {group.status !== 'deleted' && (
                      <button 
                        className="btn-edit" 
                        onClick={() => {
                          setEditingMessage(group.id);
                          setEditContent(group.message);
                        }}
                        title="Edit this broadcast"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {group.status !== 'deleted' && (
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(group.id, false)}
                        title="Soft delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {group.status === 'deleted' && (
                      <button 
                        className="btn-delete-permanent" 
                        onClick={() => handleDelete(group.id, true)}
                        title="Permanently delete"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>

                  {group.originalMessage && group.originalMessage !== group.message && (
                    <div className="message-original">
                      <small>Original: {group.originalMessage.substring(0, 150)}...</small>
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
          background: #0f172a;
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
          background: #0f172a;
          color: white;
        }

        .btn-stats:hover {
          background: #1e293b;
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

        /* ===== BULK ACTIONS ===== */
        .bulk-actions-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .select-all-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
        }

        .select-all-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .selection-badge {
          background: #8b5cf6;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-bulk-edit {
          padding: 8px 16px;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13px;
        }

        .btn-bulk-edit:hover:not(:disabled) {
          background: #d97706;
        }

        .btn-bulk-delete {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13px;
        }

        .btn-bulk-delete:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-bulk-edit:disabled,
        .btn-bulk-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ===== BULK EDIT FORM ===== */
        .bulk-edit-form {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }

        .bulk-edit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .bulk-edit-header h4 {
          margin: 0;
          color: #92400e;
        }

        .btn-close-bulk {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #92400e;
        }

        .bulk-edit-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          outline: none;
          background: white;
          margin-bottom: 12px;
        }

        .bulk-edit-textarea:focus {
          border-color: #8b5cf6;
        }

        .bulk-edit-actions {
          display: flex;
          gap: 12px;
        }

        .btn-bulk-save {
          padding: 10px 24px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-bulk-save:hover:not(:disabled) {
          background: #16a34a;
        }

        .btn-bulk-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-bulk-cancel {
          padding: 10px 24px;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-bulk-cancel:hover {
          background: #e2e8f0;
        }

        /* ===== MESSAGE ITEM ===== */
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

        .message-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .message-item.selected {
          border-color: #8b5cf6;
          background: #f5f3ff;
        }

        .message-item.deleted {
          opacity: 0.6;
          background: #f8fafc;
        }

        .message-checkbox {
          padding-top: 4px;
        }

        .message-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .message-details {
          flex: 1;
          min-width: 0;
        }

        /* ===== BROADCAST HEADER ===== */
        .broadcast-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .broadcast-icon {
          font-size: 16px;
        }

        .broadcast-label {
          font-weight: 600;
          font-size: 13px;
          color: #475569;
        }

        .broadcast-count {
          font-weight: 700;
          font-size: 14px;
          color: #8b5cf6;
          background: #f5f3ff;
          padding: 2px 12px;
          border-radius: 12px;
        }

        .type-badge, .status-badge {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .timestamp {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        /* ===== GROUP LIST ===== */
        .btn-toggle-groups {
          padding: 4px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .btn-toggle-groups:hover {
          background: #f1f5f9;
          border-color: #8b5cf6;
        }

        .group-list {
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .group-item-inline {
          display: flex;
          gap: 12px;
          padding: 4px 0;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }

        .group-item-inline:last-child {
          border-bottom: none;
        }

        .group-number {
          color: #94a3b8;
          font-weight: 600;
          min-width: 30px;
        }

        .group-name {
          flex: 1;
          font-weight: 500;
          color: #0f172a;
        }

        .group-time {
          color: #94a3b8;
          font-size: 12px;
        }

        /* ===== MESSAGE CONTENT ===== */
        .message-content {
          margin-top: 4px;
        }

        .btn-toggle-expand {
          margin-bottom: 8px;
          padding: 4px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-toggle-expand:hover {
          background: #f1f5f9;
          border-color: #8b5cf6;
          color: #0f172a;
        }

        .message-text-wrapper {
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid #8b5cf6;
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

        /* ===== SINGLE ACTIONS ===== */
        .single-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .single-actions button {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .single-actions button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .btn-copy:hover { color: #3b82f6; }
        .btn-edit:hover { color: #f59e0b; }
        .btn-delete:hover { color: #ef4444; }
        .btn-delete-permanent:hover { color: #dc2626; }

        /* ===== PAGINATION ===== */
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

        /* ===== EDIT FORM ===== */
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

        @media (max-width: 768px) {
          .message-history-container { padding: 16px; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; }
          .btn-refresh, .btn-stats { flex: 1; justify-content: center; }
          .filters-bar { flex-direction: column; }
          .search-box { min-width: auto; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .stat-days { flex-wrap: wrap; }
          .message-item { flex-direction: column; gap: 8px; }
          .message-checkbox { padding-top: 0; }
          
          .bulk-actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          
          .btn-bulk-edit,
          .btn-bulk-delete {
            justify-content: center;
          }
          
          .broadcast-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .group-item-inline {
            flex-wrap: wrap;
          }
          
          .single-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}