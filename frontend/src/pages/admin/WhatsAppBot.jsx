// pages/admin/WhatsAppBot.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RefreshCw, Link as LinkIcon, Unlink, Send, MessageCircle, 
  AlertCircle, Loader, Copy, Check, Radio, Globe,
  Hash, Layers, Sparkles, Wand2, History as HistoryIcon,
  Smartphone, Activity,
} from 'lucide-react';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppBot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [groups, setGroups] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupMessage, setGroupMessage] = useState('');
  const [broadcastGroupMessage, setBroadcastGroupMessage] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [showGroupMembers, setShowGroupMembers] = useState({});

  // ✅ TAB STATE — default to Messages
  const [activeTab, setActiveTab] = useState('messages');

  // ✅ AI Message Assistant States
  const [aiMessageInput, setAiMessageInput] = useState('');
  const [aiMessageOutput, setAiMessageOutput] = useState('');
  const [aiMessageLoading, setAiMessageLoading] = useState(false);
  const [aiMessageType, setAiMessageType] = useState('polish');
  const [aiMessageTone, setAiMessageTone] = useState('professional');

  // ✅ Cache refs
  const groupsCache = useRef({ data: null, timestamp: 0, ttl: 60000 });
  const statusCache = useRef({ data: null, timestamp: 0, ttl: 30000 });
  const debounceTimeout = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ==================== CACHED FETCH STATUS ====================
  const fetchStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && statusCache.current.data && 
        (now - statusCache.current.timestamp) < statusCache.current.ttl) {
      setStatus(statusCache.current.data);
      return statusCache.current.data;
    }
    try {
      const response = await api.get('/api/admin/whatsapp/status', { headers });
      const data = response.data.status || response.data;
      statusCache.current.data = data;
      statusCache.current.timestamp = now;
      setStatus(data);
      if (data.groupId) {
        setGroupId(data.groupId);
        setNewGroupId(data.groupId);
      }
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setShowQR(true);
      }
      return data;
    } catch (error) {
      console.error('Error fetching status:', error);
      showToast('Failed to fetch WhatsApp status', 'error');
      return null;
    }
  }, []);

  // ==================== CACHED FETCH GROUPS ====================
  const fetchGroups = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && groupsCache.current.data && 
        (now - groupsCache.current.timestamp) < groupsCache.current.ttl) {
      const groupList = groupsCache.current.data;
      setGroups(groupList);
      setActiveGroups(groupList.filter(g => g.isActive) || []);
      return groupList;
    }
    try {
      const response = await api.get('/api/admin/whatsapp/groups', { headers });
      if (response.data.success) {
        const groupList = response.data.groups || [];
        groupsCache.current.data = groupList;
        groupsCache.current.timestamp = now;
        setGroups(groupList);
        setActiveGroups(groupList.filter(g => g.isActive) || []);
        return groupList;
      }
    } catch (error) {
      if (error.response?.data?.error === 'rate-overlimit' && groupsCache.current.data) {
        const groupList = groupsCache.current.data;
        setGroups(groupList);
        setActiveGroups(groupList.filter(g => g.isActive) || []);
        return groupList;
      }
      console.error('Error fetching groups:', error);
      showToast('Failed to fetch groups', 'error');
      return null;
    }
  }, []);

  const debouncedFetch = useCallback((type, force = false) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      if (type === 'status') fetchStatus(force);
      else if (type === 'groups') fetchGroups(force);
      else if (type === 'all') { fetchStatus(force); fetchGroups(force); }
      debounceTimeout.current = null;
    }, 300);
  }, [fetchStatus, fetchGroups]);

  const fetchGroupMembers = async (groupId) => {
    if (groupMembers[groupId]) return;
    try {
      const response = await api.get(`/api/admin/whatsapp/groups/${groupId}/members`, { headers });
      if (response.data.success) {
        setGroupMembers(prev => ({ ...prev, [groupId]: response.data.members }));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      showToast('Failed to fetch group members', 'error');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchGroups();
    const statusInterval = setInterval(() => {
      const now = Date.now();
      if ((now - statusCache.current.timestamp) >= statusCache.current.ttl) fetchStatus();
    }, 15000);
    const groupsInterval = setInterval(() => {
      const now = Date.now();
      if ((now - groupsCache.current.timestamp) >= groupsCache.current.ttl) fetchGroups();
    }, 30000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(groupsInterval);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [fetchStatus, fetchGroups]);

  // ==================== ACTIONS ====================
  const handleLink = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/admin/whatsapp/link', {}, { headers });
      if (response.data.success) {
        showToast('WhatsApp linking initiated! Scan the QR code with your phone.');
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
          setShowQR(true);
        }
        setTimeout(() => fetchStatus(true), 2000);
      }
    } catch (error) {
      showToast('Failed to link WhatsApp: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink WhatsApp? This will disconnect the bot.')) return;
    setLoading(true);
    try {
      await api.post('/api/admin/whatsapp/unlink', { force: true }, { headers });
      showToast('WhatsApp unlinked successfully');
      setQrCode(null);
      setShowQR(false);
      fetchStatus(true);
    } catch (error) {
      showToast('Failed to unlink WhatsApp: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGroup = async () => {
    if (!newGroupId) return showToast('Please enter a group ID', 'error');
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/group', { groupId: newGroupId }, { headers });
      showToast('Default Group ID set successfully!');
      setGroupId(newGroupId);
      fetchStatus(true);
    } catch (error) {
      showToast('Failed to set group ID: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateGroup = async (groupId) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/groups/activate', { groupId }, { headers });
      showToast('Group activated successfully!');
      fetchGroups(true);
    } catch (error) {
      showToast('Failed to activate group: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateGroup = async (groupId) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/groups/deactivate', { groupId }, { headers });
      showToast('Group deactivated successfully!');
      fetchGroups(true);
    } catch (error) {
      showToast('Failed to deactivate group: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshGroups = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/groups/refresh', {}, { headers });
      showToast('Groups refreshed successfully!');
      fetchGroups(true);
    } catch (error) {
      showToast('Failed to refresh groups', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToDefaultGroup = async () => {
    if (!message.trim()) return showToast('Please enter a message', 'error');
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/test-group', { message }, { headers });
      showToast('Message sent to default group!');
      setMessage('');
    } catch (error) {
      showToast('Failed to send message: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToSpecificGroup = async () => {
    if (!selectedGroupId || !groupMessage.trim()) {
      showToast('Please select a group and enter a message', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/send', { 
        groupId: selectedGroupId, 
        message: groupMessage 
      }, { headers });
      showToast('Message sent to group!');
      setGroupMessage('');
    } catch (error) {
      showToast('Failed to send message: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcastToGroups = async () => {
    if (!broadcastGroupMessage.trim()) return showToast('Please enter a message', 'error');
    if (activeGroups.length === 0) {
      showToast('No active groups to broadcast to. Please activate a group first.', 'error');
      return;
    }
    if (!confirm(`Send broadcast to ALL active groups? (${activeGroups.length} groups)`)) return;
    setActionLoading(true);
    try {
      const response = await api.post('/api/admin/whatsapp/broadcast-all', { 
        message: broadcastGroupMessage 
      }, { headers });
      const successCount = response.data.summary?.success || 0;
      showToast(`Broadcast sent to ${successCount} groups!`);
      setBroadcastGroupMessage('');
    } catch (error) {
      showToast('Broadcast failed: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== AI MESSAGE ASSISTANT ====================
  const handleAIPolishMessage = async () => {
    if (!aiMessageInput.trim()) return showToast('Please enter a message to polish', 'error');
    setAiMessageLoading(true);
    try {
      const response = await api.post('/api/admin/ai/polish-message', {
        message: aiMessageInput,
        tone: aiMessageTone,
        type: aiMessageType
      }, { headers });
      if (response.data.success) {
        setAiMessageOutput(response.data.polished);
        showToast('Message polished successfully!');
      } else {
        showToast('Failed to polish message: ' + (response.data.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('AI polish error:', error);
      showToast('Failed to polish message: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setAiMessageLoading(false);
    }
  };

  const handleUsePolishedMessage = (targetField) => {
    if (!aiMessageOutput) return showToast('Please generate a polished message first', 'error');
    switch(targetField) {
      case 'defaultGroup': setMessage(aiMessageOutput); break;
      case 'specificGroup': setGroupMessage(aiMessageOutput); break;
      case 'groupBroadcast': setBroadcastGroupMessage(aiMessageOutput); break;
      default: break;
    }
    showToast('Message copied to field!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatMemberName = (member) => {
    if (!member) return 'Unknown Member';
    let name = member.name || member.id || 'Unknown Member';
    if (name.includes('@lid')) {
      const lidNumber = name.replace('@lid', '');
      return `👤 User ${lidNumber.slice(-6)}`;
    }
    if (name.includes('@s.whatsapp.net')) {
      const phone = name.replace('@s.whatsapp.net', '');
      if (phone.startsWith('254')) {
        const formatted = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
        return `📱 ${formatted}`;
      }
      return `📱 ${phone}`;
    }
    return name;
  };

  const toggleGroupMembers = (groupId) => {
    setShowGroupMembers(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    if (!groupMembers[groupId]) fetchGroupMembers(groupId);
  };

  const getStatusBadge = () => {
    if (!status) return { label: 'Unknown', color: '#737373', bg: '#f5f5f5' };
    const connectionStatus = status.connectionStatus || status.status || 'disconnected';
    const statusMap = {
      'connected': { label: 'Connected', color: '#15803d', bg: '#f0fdf4' },
      'disconnected': { label: 'Disconnected', color: '#b91c1c', bg: '#fef2f2' },
      'connecting': { label: 'Connecting', color: '#b45309', bg: '#fffbeb' },
      'qr_required': { label: 'QR Required', color: '#1d4ed8', bg: '#eff6ff' },
      'logged_out': { label: 'Logged Out', color: '#b91c1c', bg: '#fef2f2' },
      'error': { label: 'Error', color: '#b91c1c', bg: '#fef2f2' },
      'reconnecting': { label: 'Reconnecting', color: '#b45309', bg: '#fffbeb' }
    };
    return statusMap[connectionStatus] || statusMap.disconnected;
  };

  // ==================== TAB DEFINITIONS (Order matters) ====================
  const tabs = [
    { id: 'messages', label: 'Messages', icon: <Send size={14} />, badge: activeGroups.length },
    { id: 'ai', label: 'AI Assistant', icon: <Sparkles size={14} /> },
    { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
    { id: 'groups', label: 'Groups', icon: <Layers size={14} />, badge: groups.length },
  ];

  return (
    <div className="wb-page">
      <div className="wb-container">
        {toast && (
          <div className={`wb-toast wb-toast-${toast.type}`}>
            {toast.message}
          </div>
        )}

        {/* ==================== HEADER ==================== */}
        <header className="wb-header">
          <div className="wb-header-left">
            <div className="wb-title-icon">
              <FaWhatsapp size={22} />
            </div>
            <div>
              <div className="wb-eyebrow">
                <Radio size={12} />
                Integration
              </div>
              <h1 className="wb-title">WhatsApp Bot</h1>
              <p className="wb-subtitle">Manage WhatsApp integration for ZUCA</p>
            </div>
          </div>
          <div className="wb-header-actions">
            <button className="wb-btn" onClick={() => navigate('/admin/message-history')}>
              <HistoryIcon size={14} /> Message History
            </button>
            <button className="wb-btn" onClick={() => { fetchStatus(true); fetchGroups(true); }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        {/* ==================== TABS ==================== */}
        <nav className="wb-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`wb-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && <span className="wb-tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </nav>

        {/* ==================== MESSAGES TAB ==================== */}
        {activeTab === 'messages' && (
          <div className="wb-actions-grid">
            <section className="wb-panel">
              <div className="wb-panel-head">
                <div className="wb-panel-title">
                  <Hash size={15} />
                  <h3>Default group ID</h3>
                </div>
              </div>
              <div className="wb-input-row">
                <input
                  className="wb-input"
                  type="text"
                  placeholder="e.g. 120363428001788260@g.us"
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                />
                <button
                  className="wb-btn wb-btn-primary"
                  onClick={handleSetGroup}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader size={13} className="wb-spin" /> : 'Set'}
                </button>
              </div>
              <div className="wb-hint">
                <AlertCircle size={13} />
                <span>Format: [number]@g.us</span>
              </div>
            </section>

            <section className="wb-panel">
              <div className="wb-panel-head">
                <div className="wb-panel-title">
                  <Send size={15} />
                  <h3>Send to default group</h3>
                </div>
                {message && aiMessageOutput && (
                  <span className="wb-panel-badge">AI</span>
                )}
              </div>
              <textarea
                className="wb-textarea"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <button
                className="wb-btn wb-btn-primary wb-btn-full"
                onClick={handleSendToDefaultGroup}
                disabled={actionLoading || !message.trim()}
              >
                {actionLoading ? <Loader size={13} className="wb-spin" /> : <Send size={13} />}
                Send to default group
              </button>
            </section>

            <section className="wb-panel">
              <div className="wb-panel-head">
                <div className="wb-panel-title">
                  <Globe size={15} />
                  <h3>Send to specific group</h3>
                </div>
                {groupMessage && aiMessageOutput && (
                  <span className="wb-panel-badge">AI</span>
                )}
              </div>
              <select
                className="wb-select wb-select-full"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <option value="">Select a group...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.participants} members) {group.isActive ? '· active' : ''}
                  </option>
                ))}
              </select>
              <textarea
                className="wb-textarea"
                placeholder="Type your message..."
                value={groupMessage}
                onChange={(e) => setGroupMessage(e.target.value)}
                rows={4}
              />
              <button
                className="wb-btn wb-btn-primary wb-btn-full"
                onClick={handleSendToSpecificGroup}
                disabled={actionLoading || !selectedGroupId || !groupMessage.trim()}
              >
                {actionLoading ? <Loader size={13} className="wb-spin" /> : <Send size={13} />}
                Send to selected group
              </button>
            </section>

            <section className="wb-panel">
              <div className="wb-panel-head">
                <div className="wb-panel-title">
                  <Radio size={15} />
                  <h3>Broadcast to groups</h3>
                </div>
                <span className="wb-panel-badge">{activeGroups.length} active</span>
              </div>
              <div className="wb-warning">
                <AlertCircle size={13} />
                <span>
                  Sends to all <strong>{activeGroups.length}</strong> active groups
                </span>
              </div>
              <textarea
                className="wb-textarea"
                placeholder="Broadcast message..."
                value={broadcastGroupMessage}
                onChange={(e) => setBroadcastGroupMessage(e.target.value)}
                rows={5}
              />
              <button
                className="wb-btn wb-btn-primary wb-btn-full"
                onClick={handleBroadcastToGroups}
                disabled={actionLoading || !broadcastGroupMessage.trim() || activeGroups.length === 0}
              >
                {actionLoading ? <Loader size={13} className="wb-spin" /> : <Radio size={13} />}
                Broadcast to {activeGroups.length} groups
              </button>
            </section>
          </div>
        )}

        {/* ==================== AI TAB ==================== */}
        {activeTab === 'ai' && (
          <section className="wb-panel">
            <div className="wb-panel-head">
              <div className="wb-panel-title">
                <Sparkles size={15} />
                <h3>AI message assistant</h3>
              </div>
              <span className="wb-panel-badge">Polish · Formal · Announcement</span>
            </div>

            <div className="wb-ai-grid">
              <div className="wb-ai-input">
                <div className="wb-ai-controls">
                  <select
                    className="wb-select"
                    value={aiMessageType}
                    onChange={(e) => setAiMessageType(e.target.value)}
                  >
                    <option value="polish">Polish</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="announcement">Announcement</option>
                    <option value="prayer">Prayer</option>
                  </select>
                  <select
                    className="wb-select"
                    value={aiMessageTone}
                    onChange={(e) => setAiMessageTone(e.target.value)}
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="warm">Warm</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    className="wb-btn wb-btn-primary"
                    onClick={handleAIPolishMessage}
                    disabled={aiMessageLoading || !aiMessageInput.trim()}
                  >
                    {aiMessageLoading ? <Loader size={13} className="wb-spin" /> : <Wand2 size={13} />}
                    {aiMessageLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                <textarea
                  className="wb-textarea"
                  placeholder="Describe what you want to say... e.g. 'Tell members about the mass this Sunday at 10am'"
                  value={aiMessageInput}
                  onChange={(e) => setAiMessageInput(e.target.value)}
                  rows={6}
                />
                <div className="wb-hint">
                  <AlertCircle size={13} />
                  <span>Describe your message naturally, AI will polish it for you</span>
                </div>
              </div>

              <div className="wb-ai-output">
                {aiMessageOutput ? (
                  <>
                    <div className="wb-ai-output-head">
                      <span>Polished message</span>
                      <button
                        className="wb-btn wb-btn-sm"
                        onClick={() => copyToClipboard(aiMessageOutput)}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="wb-ai-output-body">{aiMessageOutput}</div>
                    <div className="wb-ai-output-actions">
                      <span className="wb-ai-action-label">Use in:</span>
                      <button className="wb-chip" onClick={() => handleUsePolishedMessage('defaultGroup')}>
                        Default group
                      </button>
                      <button className="wb-chip" onClick={() => handleUsePolishedMessage('specificGroup')}>
                        Specific group
                      </button>
                      <button className="wb-chip" onClick={() => handleUsePolishedMessage('groupBroadcast')}>
                        Broadcast
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="wb-ai-empty">
                    <Sparkles size={32} />
                    <div className="wb-ai-empty-title">Nothing generated yet</div>
                    <div className="wb-ai-empty-sub">
                      Describe your message and click Generate
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <>
            <section className="wb-panel">
              <div className="wb-status-bar">
                <div className="wb-status-left">
                  <span className={`wb-status-dot ${status?.connected ? 'live' : 'off'}`} />
                  <div>
                    <div className="wb-status-title">
                      {status?.connected ? 'Bot is online' : 'Bot is offline'}
                    </div>
                    <div className="wb-status-sub">
                      {status?.botNumber ? `+${status.botNumber}` : 'No bot linked'}
                    </div>
                  </div>
                </div>
                <span
                  className="wb-status-pill"
                  style={{ background: getStatusBadge().bg, color: getStatusBadge().color }}
                >
                  {getStatusBadge().label}
                </span>
              </div>

              <div className="wb-status-grid">
                <div className="wb-status-tile">
                  <div className="wb-tile-label">Bot number</div>
                  <div className="wb-tile-value">{status?.botNumber || 'N/A'}</div>
                </div>
                <div className="wb-status-tile">
                  <div className="wb-tile-label">Default group</div>
                  <div className="wb-tile-value">
                    {groupId || 'Not set'}
                    {groupId && (
                      <button className="wb-copy" onClick={() => copyToClipboard(groupId)}>
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="wb-status-tile">
                  <div className="wb-tile-label">Connection</div>
                  <div className="wb-tile-value">{status?.connectionStatus || 'Unknown'}</div>
                </div>
                <div className="wb-status-tile">
                  <div className="wb-tile-label">Reconnect attempts</div>
                  <div className="wb-tile-value">
                    {status?.reconnectAttempts || 0} / {status?.maxReconnectAttempts || 10}
                  </div>
                </div>
                <div className="wb-status-tile">
                  <div className="wb-tile-label">Total groups</div>
                  <div className="wb-tile-value">{groups.length}</div>
                </div>
                <div className="wb-status-tile">
                  <div className="wb-tile-label">Active groups</div>
                  <div className="wb-tile-value">{activeGroups.length}</div>
                </div>
                {status?.lastError && (
                  <div className="wb-status-tile wb-status-tile-error">
                    <div className="wb-tile-label">Last error</div>
                    <div className="wb-tile-value">{status.lastError}</div>
                  </div>
                )}
              </div>

              <div className="wb-status-actions">
                {(!status?.connected ||
                  status?.connectionStatus === 'disconnected' ||
                  status?.connectionStatus === 'logged_out') && (
                  <button className="wb-btn wb-btn-primary" onClick={handleLink} disabled={loading}>
                    {loading ? <Loader size={14} className="wb-spin" /> : <LinkIcon size={14} />}
                    Link WhatsApp
                  </button>
                )}
                {(status?.connected || status?.connectionStatus === 'connected') && (
                  <button className="wb-btn wb-btn-danger" onClick={handleUnlink} disabled={loading}>
                    <Unlink size={14} /> Unlink
                  </button>
                )}
              </div>
            </section>

            {showQR && qrCode && (
              <section className="wb-panel wb-qr-panel">
                <div className="wb-qr-head">
                  <h3>
                    <Smartphone size={15} /> Scan QR code
                  </h3>
                </div>
                <div className="wb-qr-body">
                  <img src={qrCode} alt="WhatsApp QR Code" className="wb-qr-image" />
                  <ol className="wb-qr-steps">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap Menu → Linked Devices</li>
                    <li>Tap "Link a Device" and scan this QR code</li>
                  </ol>
                  <button className="wb-btn" onClick={() => setShowQR(false)}>
                    Close
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* ==================== GROUPS TAB ==================== */}
        {activeTab === 'groups' && (
          <section className="wb-panel">
            <div className="wb-panel-head">
              <div className="wb-panel-title">
                <Layers size={15} />
                <h3>Group management</h3>
              </div>
              <div className="wb-panel-actions">
                <span className="wb-panel-badge">
                  {groups.length} groups · {activeGroups.length} active
                </span>
                <button
                  className="wb-btn wb-btn-sm"
                  onClick={handleRefreshGroups}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader size={12} className="wb-spin" /> : <RefreshCw size={12} />}
                  Refresh
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="wb-empty">
                <MessageCircle size={26} />
                <div className="wb-empty-title">No groups found</div>
                <div className="wb-empty-sub">Link WhatsApp first to see your groups</div>
              </div>
            ) : (
              <div className="wb-groups-grid">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className={`wb-group-card ${group.isActive ? 'active' : ''}`}
                  >
                    <div className="wb-group-head">
                      <div className="wb-group-name">
                        {group.name}
                        {group.isCommunity && <span className="wb-group-tag">Community</span>}
                      </div>
                      <span className={`wb-group-status ${group.isActive ? 'on' : 'off'}`}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="wb-group-meta">
                      <span className="wb-group-id">{group.id}</span>
                      <span>{group.participants} members</span>
                    </div>

                    {group.description && (
                      <div className="wb-group-desc">{group.description}</div>
                    )}

                    <div className="wb-group-foot">
                      <button
                        className="wb-group-toggle"
                        onClick={() => toggleGroupMembers(group.id)}
                      >
                        {showGroupMembers[group.id] ? 'Hide members' : 'Show members'}
                      </button>

                      {group.isActive ? (
                        <button
                          className="wb-btn wb-btn-sm"
                          onClick={() => handleDeactivateGroup(group.id)}
                          disabled={actionLoading}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="wb-btn wb-btn-sm wb-btn-primary"
                          onClick={() => handleActivateGroup(group.id)}
                          disabled={actionLoading}
                        >
                          Activate
                        </button>
                      )}
                    </div>

                    {showGroupMembers[group.id] && groupMembers[group.id] && (
                      <div className="wb-members-list">
                        {groupMembers[group.id].slice(0, 20).map((member, index) => {
                          const displayName = formatMemberName(member);
                          const isBot = member.id === status?.botNumber ||
                                        member.id?.includes(status?.botNumber) ||
                                        member.id === status?.lid;
                          return (
                            <div key={member.id || index} className={`wb-member-item ${isBot ? 'bot' : ''}`}>
                              <span>{displayName}</span>
                              {isBot && <span className="wb-bot-tag">Bot</span>}
                            </div>
                          );
                        })}
                        {groupMembers[group.id].length > 20 && (
                          <div className="wb-member-more">
                            ... and {groupMembers[group.id].length - 20} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <style>{mainCSS}</style>
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .wb-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .wb-container { padding: 28px 24px 60px; max-width: 1280px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .wb-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 20px;
  }
  .wb-header-left { display: flex; align-items: center; gap: 14px; }
  .wb-title-icon {
    width: 44px; height: 44px; border-radius: 11px;
    background: #f5f5f5; color: #262626;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .wb-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .wb-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #0f0f0f; }
  .wb-subtitle { font-size: 13.5px; color: #737373; margin: 2px 0 0 0; }
  .wb-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- TABS ---------- */
  .wb-tabs {
    display: flex; gap: 4px; border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px; overflow-x: auto; scrollbar-width: none;
  }
  .wb-tabs::-webkit-scrollbar { display: none; }
  .wb-tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 14px; background: transparent; border: none;
    border-bottom: 2px solid transparent; color: #737373;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease; white-space: nowrap; margin-bottom: -1px;
    font-family: inherit;
  }
  .wb-tab:hover { color: #262626; }
  .wb-tab.active { color: #0f0f0f; border-bottom-color: #0f0f0f; }
  .wb-tab-badge {
    background: #f5f5f5; color: #525252;
    padding: 1px 7px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700;
    min-width: 18px; text-align: center;
  }
  .wb-tab.active .wb-tab-badge {
    background: #0f0f0f; color: #ffffff;
  }

  /* ---------- BUTTONS ---------- */
  .wb-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .wb-btn:hover:not(:disabled) { background: #f5f5f5; border-color: #d4d4d4; }
  .wb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .wb-btn-sm { padding: 6px 10px; font-size: 12px; }
  .wb-btn-full { width: 100%; justify-content: center; }
  .wb-btn-primary {
    background: #0f0f0f; color: #ffffff; border-color: #0f0f0f;
  }
  .wb-btn-primary:hover:not(:disabled) { background: #262626; border-color: #262626; }
  .wb-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .wb-btn-danger:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; }

  .wb-spin { animation: wb-spin 0.9s linear infinite; }
  @keyframes wb-spin { to { transform: rotate(360deg); } }

  /* ---------- PANEL ---------- */
  .wb-panel {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px; margin-bottom: 16px;
  }
  .wb-panel-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .wb-panel-title { display: flex; align-items: center; gap: 8px; }
  .wb-panel-title svg { color: #737373; }
  .wb-panel-title h3 {
    font-size: 14px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.1px;
  }
  .wb-panel-actions { display: flex; align-items: center; gap: 8px; }
  .wb-panel-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 999px;
    background: #f5f5f5; color: #525252;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  /* ---------- STATUS ---------- */
  .wb-status-bar {
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .wb-status-left { display: flex; align-items: center; gap: 12px; }
  .wb-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .wb-status-dot.live {
    background: #16a34a;
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5);
    animation: wb-pulse 2s infinite;
  }
  .wb-status-dot.off { background: #a3a3a3; }
  @keyframes wb-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
  }
  .wb-status-title { font-size: 14px; font-weight: 700; color: #0f0f0f; }
  .wb-status-sub { font-size: 12px; color: #a3a3a3; margin-top: 2px; }
  .wb-status-pill {
    padding: 5px 12px; border-radius: 999px;
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  .wb-status-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 16px;
  }
  @media (max-width: 900px) { .wb-status-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) { .wb-status-grid { grid-template-columns: 1fr; } }

  .wb-status-tile {
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 10px; padding: 12px 14px;
  }
  .wb-status-tile-error { background: #fef2f2; border-color: #fecaca; }
  .wb-status-tile-error .wb-tile-value { color: #b91c1c; }
  .wb-tile-label {
    font-size: 10.5px; color: #a3a3a3;
    text-transform: uppercase; letter-spacing: 0.06em;
    font-weight: 700; margin-bottom: 4px;
  }
  .wb-tile-value {
    font-size: 13px; color: #171717; font-weight: 600;
    word-break: break-all;
    display: flex; align-items: center; gap: 8px;
  }
  .wb-copy {
    background: transparent; border: none; cursor: pointer;
    color: #a3a3a3; padding: 3px; border-radius: 6px;
    display: flex; align-items: center;
    transition: all 0.15s ease;
  }
  .wb-copy:hover { background: #f5f5f5; color: #171717; }

  .wb-status-actions {
    display: flex; gap: 8px; flex-wrap: wrap;
    padding-top: 14px; border-top: 1px solid #f0f0f0;
  }

  /* ---------- QR ---------- */
  .wb-qr-panel { text-align: center; }
  .wb-qr-head { display: flex; justify-content: center; margin-bottom: 16px; }
  .wb-qr-head h3 {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: #0f0f0f; margin: 0;
  }
  .wb-qr-body {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
  }
  .wb-qr-image {
    max-width: 260px; width: 100%;
    border: 1px solid #e5e5e5; border-radius: 12px;
    padding: 12px; background: #ffffff;
  }
  .wb-qr-steps {
    text-align: left; font-size: 12.5px; color: #525252;
    line-height: 1.8; padding-left: 20px; margin: 0;
    max-width: 320px;
  }

  /* ---------- AI ---------- */
  .wb-ai-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  }
  @media (max-width: 900px) { .wb-ai-grid { grid-template-columns: 1fr; } }

  .wb-ai-input { display: flex; flex-direction: column; gap: 10px; }
  .wb-ai-controls { display: flex; gap: 8px; flex-wrap: wrap; }
  .wb-ai-controls .wb-select { flex: 1; min-width: 130px; }

  .wb-ai-output {
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 11px; padding: 16px;
    min-height: 240px;
    display: flex; flex-direction: column;
  }
  .wb-ai-output-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 12px;
  }
  .wb-ai-output-head > span {
    font-size: 12px; font-weight: 700; color: #525252;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .wb-ai-output-body {
    flex: 1;
    padding: 12px 14px; background: #ffffff;
    border: 1px solid #e5e5e5; border-radius: 9px;
    font-size: 13px; line-height: 1.6; color: #171717;
    white-space: pre-wrap;
    max-height: 260px; overflow-y: auto;
  }
  .wb-ai-output-actions {
    display: flex; gap: 6px; align-items: center;
    flex-wrap: wrap; margin-top: 12px;
  }
  .wb-ai-action-label {
    font-size: 11px; font-weight: 700; color: #a3a3a3;
    text-transform: uppercase; letter-spacing: 0.05em;
    margin-right: 4px;
  }
  .wb-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 999px;
    background: #ffffff; border: 1px solid #e5e5e5;
    color: #525252; font-size: 11.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit;
  }
  .wb-chip:hover { background: #f5f5f5; color: #171717; border-color: #d4d4d4; }
  .wb-ai-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; color: #a3a3a3; text-align: center;
  }
  .wb-ai-empty svg { color: #d4d4d4; }
  .wb-ai-empty-title { font-size: 13.5px; font-weight: 700; color: #525252; }
  .wb-ai-empty-sub { font-size: 12px; color: #a3a3a3; max-width: 260px; line-height: 1.5; }

  /* ---------- FORMS ---------- */
  .wb-textarea,
  .wb-input,
  .wb-select {
    width: 100%; padding: 10px 12px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    font-size: 13px; color: #171717;
    font-family: inherit; background: #ffffff;
    transition: border-color 0.15s ease; outline: none;
  }
  .wb-textarea:focus, .wb-input:focus, .wb-select:focus { border-color: #0f0f0f; }
  .wb-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
  .wb-select {
    appearance: none; cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }
  .wb-select-full { margin-bottom: 12px; }

  .wb-input-row { display: flex; gap: 8px; }
  .wb-input-row .wb-input { flex: 1; }

  .wb-hint {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 8px;
    font-size: 11.5px; color: #737373;
    margin-top: 10px;
  }

  .wb-warning {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; background: #fffbeb;
    border: 1px solid #fde68a; border-radius: 8px;
    font-size: 12px; color: #92400e;
    margin-bottom: 12px;
  }
  .wb-warning strong { color: #78350f; }

  /* ---------- GROUPS ---------- */
  .wb-groups-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
  @media (max-width: 720px) { .wb-groups-grid { grid-template-columns: 1fr; } }

  .wb-group-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 14px;
    transition: all 0.15s ease;
  }
  .wb-group-card:hover { border-color: #d4d4d4; }
  .wb-group-card.active { border-color: #16a34a; background: #fafffb; }

  .wb-group-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 10px; margin-bottom: 8px;
  }
  .wb-group-name {
    font-size: 13.5px; font-weight: 700; color: #0f0f0f;
    display: flex; align-items: center; gap: 6px;
    flex-wrap: wrap; word-break: break-word; line-height: 1.3;
  }
  .wb-group-tag {
    padding: 1px 7px; border-radius: 999px;
    background: #f5f5f5; color: #525252;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .wb-group-status {
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 3px 8px; border-radius: 999px;
    flex-shrink: 0;
  }
  .wb-group-status.on { color: #15803d; background: #f0fdf4; }
  .wb-group-status.off { color: #737373; background: #f5f5f5; }

  .wb-group-meta {
    display: flex; gap: 8px; flex-wrap: wrap;
    font-size: 11.5px; color: #737373;
    margin-bottom: 8px;
  }
  .wb-group-id {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    background: #fafafa; padding: 2px 7px;
    border-radius: 5px; font-size: 10.5px;
    color: #525252; word-break: break-all;
  }

  .wb-group-desc {
    font-size: 12px; color: #a3a3a3;
    line-height: 1.5; margin-bottom: 10px;
  }

  .wb-group-foot {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px; padding-top: 10px;
    border-top: 1px solid #f5f5f5;
  }
  .wb-group-toggle {
    display: inline-flex; align-items: center; gap: 4px;
    background: transparent; border: none;
    color: #737373; font-size: 11.5px; font-weight: 600;
    cursor: pointer; padding: 4px 6px; border-radius: 6px;
    font-family: inherit; transition: all 0.15s ease;
  }
  .wb-group-toggle:hover { background: #f5f5f5; color: #171717; }

  .wb-members-list {
    margin-top: 12px; padding: 10px 12px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 9px;
    max-height: 220px; overflow-y: auto;
  }
  .wb-member-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; font-size: 12px; color: #262626;
    border-bottom: 1px solid #f0f0f0;
  }
  .wb-member-item:last-child { border-bottom: none; }
  .wb-member-item.bot {
    background: #eff6ff; padding: 5px 8px;
    border-radius: 6px; border-bottom: 1px solid #dbeafe;
  }
  .wb-bot-tag {
    background: #1d4ed8; color: #ffffff;
    padding: 1px 7px; border-radius: 999px;
    font-size: 9.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .wb-member-more {
    font-size: 11px; color: #a3a3a3;
    padding-top: 6px; font-style: italic;
  }

  /* ---------- EMPTY ---------- */
  .wb-empty {
    text-align: center; padding: 48px 24px;
    color: #a3a3a3;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .wb-empty svg { color: #d4d4d4; }
  .wb-empty-title { font-size: 14px; font-weight: 700; color: #262626; }
  .wb-empty-sub { font-size: 12.5px; color: #a3a3a3; }

  /* ---------- ACTIONS GRID ---------- */
  .wb-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) { .wb-actions-grid { grid-template-columns: 1fr; } }
  .wb-actions-grid > .wb-panel { margin-bottom: 0; }

  /* ---------- TOAST ---------- */
  .wb-toast {
    position: fixed; top: 24px; right: 24px;
    padding: 12px 18px; border-radius: 10px;
    color: #ffffff; font-size: 13px; font-weight: 600;
    z-index: 1100;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.2);
    animation: wb-toast-in 0.25s ease;
  }
  .wb-toast-success { background: #0f0f0f; }
  .wb-toast-error { background: #dc2626; }
  .wb-toast-info { background: #525252; }
  @keyframes wb-toast-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 640px) {
    .wb-container { padding: 20px 16px 40px; }
    .wb-title { font-size: 22px; }
    .wb-header-actions { width: 100%; }
    .wb-header-actions .wb-btn { flex: 1; justify-content: center; }
    .wb-status-bar { flex-direction: column; align-items: flex-start; }
    .wb-status-actions .wb-btn { flex: 1; justify-content: center; }
    .wb-input-row { flex-direction: column; }
    .wb-input-row .wb-btn { width: 100%; justify-content: center; }
  }
`;

const mainCSS = baseCSS;

