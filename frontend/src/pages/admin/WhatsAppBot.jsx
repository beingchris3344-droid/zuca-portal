// pages/admin/WhatsAppBot.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Filter, RefreshCw, Link as LinkIcon, 
  Unlink, QrCode, Send, Users, MessageCircle, 
  Settings, AlertCircle, CheckCircle, XCircle,
  Loader, Copy, Check, Phone, Radio
} from 'lucide-react';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';

export default function WhatsAppBot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/whatsapp/bot/status', { headers });
      setStatus(response.data);
      if (response.data.groupId) {
        setGroupId(response.data.groupId);
        setNewGroupId(response.data.groupId);
      }
      if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
        setShowQR(true);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      showToast('Failed to fetch WhatsApp status', 'error');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleLink = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/whatsapp/bot/link', {}, { headers });
      if (response.data.success) {
        showToast('WhatsApp linking initiated! Scan the QR code with your phone.');
        setStatus(response.data.status);
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
          setShowQR(true);
        }
        setTimeout(fetchStatus, 2000);
      }
    } catch (error) {
      showToast('Failed to link WhatsApp: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink WhatsApp? This will disconnect the bot.')) return;
    
    setLoading(true);
    try {
      await api.post('/api/whatsapp/bot/unlink', {}, { headers });
      showToast('WhatsApp unlinked successfully');
      setQrCode(null);
      setShowQR(false);
      fetchStatus();
    } catch (error) {
      showToast('Failed to unlink WhatsApp', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGroup = async () => {
    if (!newGroupId) {
      showToast('Please enter a group ID', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/api/whatsapp/bot/set-group', { groupId: newGroupId }, { headers });
      showToast('Group ID set successfully!');
      setGroupId(newGroupId);
      fetchStatus();
    } catch (error) {
      showToast('Failed to set group ID: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToGroup = async () => {
    if (!message.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/api/whatsapp/bot/send-to-group', { message }, { headers });
      showToast('Message sent to group!');
      setMessage('');
    } catch (error) {
      showToast('Failed to send message: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToUser = async () => {
    if (!phoneNumber || !personalMessage) {
      showToast('Phone number and message are required', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/api/whatsapp/bot/send-to-user', { 
        phoneNumber, 
        message: personalMessage 
      }, { headers });
      showToast(`Message sent to ${phoneNumber}!`);
      setPhoneNumber('');
      setPersonalMessage('');
    } catch (error) {
      showToast('Failed to send message: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      showToast('Title and message are required', 'error');
      return;
    }
    
    if (!confirm(`Send broadcast to ALL users? This will send to everyone with a phone number.`)) return;
    
    setActionLoading(true);
    try {
      const response = await api.post('/api/whatsapp/bot/broadcast', {
        title: broadcastTitle,
        message: broadcastMessage
      }, { headers });
      
      if (response.data.success) {
        showToast(`Broadcast sent to ${response.data.sent} users!`);
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
    } catch (error) {
      showToast('Broadcast failed: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    if (!status) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9' };
    
    const statusMap = {
      'connected': { label: '✅ Connected', color: '#22c55e', bg: '#dcfce7' },
      'disconnected': { label: '❌ Disconnected', color: '#ef4444', bg: '#fee2e2' },
      'connecting': { label: '⏳ Connecting...', color: '#f59e0b', bg: '#fef3c7' },
      'qr_required': { label: '📱 QR Required', color: '#3b82f6', bg: '#dbeafe' },
      'logged_out': { label: '🚫 Logged Out', color: '#ef4444', bg: '#fee2e2' },
      'error': { label: '⚠️ Error', color: '#ef4444', bg: '#fee2e2' },
      'reconnecting': { label: '🔄 Reconnecting...', color: '#f59e0b', bg: '#fef3c7' }
    };
    
    const info = statusMap[status.connectionStatus] || statusMap.disconnected;
    return info;
  };

  return (
    <div className="whatsapp-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div className="header-left">
          <div className="title-icon">
            <MessageCircle size={24} />
          </div>
          <div>
            <h1>WhatsApp Bot</h1>
            <p className="subtitle">Manage WhatsApp integration for ZUCA</p>
          </div>
        </div>
        <button className="btn-refresh" onClick={fetchStatus}>
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* Status Card */}
      <div className="status-card">
        <div className="status-header">
          <div className="status-indicator">
            <span className="status-dot" style={{ 
              background: status?.connected ? '#22c55e' : '#ef4444' 
            }} />
            <span className="status-label">
              {status?.connected ? 'Bot is Online' : 'Bot is Offline'}
            </span>
          </div>
          <div className="status-badge" style={{ 
            background: getStatusBadge().bg, 
            color: getStatusBadge().color 
          }}>
            {getStatusBadge().label}
          </div>
        </div>
        
        <div className="status-details">
          <div className="detail-item">
            <span className="detail-label">Group ID:</span>
            <span className="detail-value">
              {groupId || 'Not set'}
              {groupId && (
                <button className="copy-btn" onClick={() => copyToClipboard(groupId)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Reconnect Attempts:</span>
            <span className="detail-value">{status?.reconnectAttempts || 0}</span>
          </div>
          {status?.lastError && (
            <div className="detail-item error">
              <span className="detail-label">Last Error:</span>
              <span className="detail-value">{status.lastError}</span>
            </div>
          )}
        </div>

        <div className="status-actions">
          {!status?.connected && status?.connectionStatus !== 'connected' && (
            <button className="btn-link" onClick={handleLink} disabled={loading}>
              {loading ? <Loader size={18} className="spin" /> : <LinkIcon size={18} />}
              Link WhatsApp
            </button>
          )}
          {(status?.connected || status?.connectionStatus === 'connected') && (
            <button className="btn-unlink" onClick={handleUnlink} disabled={loading}>
              <Unlink size={18} /> Unlink
            </button>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      {showQR && qrCode && (
        <div className="qr-section">
          <div className="qr-container">
            <h3>📱 Scan QR Code</h3>
            <img src={qrCode} alt="WhatsApp QR Code" className="qr-image" />
            <p className="qr-instructions">
              1. Open WhatsApp on your phone<br />
              2. Tap Menu → Linked Devices<br />
              3. Tap "Link a Device" and scan this QR code
            </p>
            <button className="btn-close-qr" onClick={() => setShowQR(false)}>
              Close QR
            </button>
          </div>
        </div>
      )}

      <div className="content-grid">
        {/* Group ID Management */}
        <div className="card">
          <div className="card-header">
            <Settings size={18} />
            <h3>Group ID Management</h3>
          </div>
          <div className="card-body">
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter Group ID (e.g., 120363428001788260@g.us)"
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
              />
              <button className="btn-set" onClick={handleSetGroup} disabled={actionLoading}>
                {actionLoading ? <Loader size={16} className="spin" /> : 'Set Group ID'}
              </button>
            </div>
            <div className="hint">
              <AlertCircle size={14} />
              <span>Group ID format: [number]@g.us (e.g., 120363428001788260@g.us)</span>
            </div>
          </div>
        </div>

        {/* Send to Group */}
        <div className="card">
          <div className="card-header">
            <Send size={18} />
            <h3>Send to Group</h3>
          </div>
          <div className="card-body">
            <textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
            />
            <button className="btn-send" onClick={handleSendToGroup} disabled={actionLoading || !message.trim()}>
              {actionLoading ? <Loader size={16} className="spin" /> : <Send size={16} />}
              Send to Group
            </button>
          </div>
        </div>

        {/* Send to User */}
        <div className="card">
          <div className="card-header">
            <Phone size={18} />
            <h3>Send to User</h3>
          </div>
          <div className="card-body">
            <input
              type="text"
              placeholder="Phone number (e.g., 254712345678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <textarea
              placeholder="Type your message..."
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows="2"
            />
            <button className="btn-send" onClick={handleSendToUser} disabled={actionLoading || !phoneNumber || !personalMessage}>
              {actionLoading ? <Loader size={16} className="spin" /> : <Send size={16} />}
              Send to User
            </button>
          </div>
        </div>

        {/* Broadcast */}
        <div className="card full-width">
          <div className="card-header">
            <Users size={18} />
            <h3>Broadcast to All Users</h3>
          </div>
          <div className="card-body">
            <div className="warning-box">
              <AlertCircle size={18} />
              <span>This will send a message to ALL users with phone numbers. Use with caution!</span>
            </div>
            <input
              type="text"
              placeholder="Broadcast Title"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
            />
            <textarea
              placeholder="Broadcast Message"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows="4"
            />
            <button className="btn-broadcast" onClick={handleBroadcast} disabled={actionLoading || !broadcastTitle || !broadcastMessage}>
              {actionLoading ? <Loader size={16} className="spin" /> : <Radio size={16} />}
              Send Broadcast
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .whatsapp-container {
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

        .title-icon {
          width: 48px;
          height: 48px;
          background: #25D366;
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

        .btn-refresh {
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

        .btn-refresh:hover {
          background: #e2e8f0;
        }

        .status-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-label {
          font-weight: 600;
          font-size: 16px;
        }

        .status-badge {
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin: 16px 0;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .detail-item.error .detail-value {
          color: #ef4444;
        }

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }

        .copy-btn:hover {
          color: #0f172a;
        }

        .status-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-link {
          padding: 10px 24px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-link:hover:not(:disabled) {
          background: #20b859;
        }

        .btn-unlink {
          padding: 10px 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-unlink:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-link:disabled, .btn-unlink:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .qr-section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }

        .qr-container h3 {
          margin: 0 0 16px;
          color: #0f172a;
        }

        .qr-image {
          max-width: 300px;
          border: 4px solid #e2e8f0;
          border-radius: 12px;
        }

        .qr-instructions {
          margin: 16px 0;
          color: #64748b;
          line-height: 1.8;
        }

        .btn-close-qr {
          padding: 8px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-close-qr:hover {
          background: #e2e8f0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .card {
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .card.full-width {
          grid-column: 1 / -1;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #fafbfc;
          border-bottom: 1px solid #e2e8f0;
        }

        .card-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .card-body {
          padding: 20px;
        }

        .input-group {
          display: flex;
          gap: 12px;
        }

        .input-group input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }

        .input-group input:focus {
          border-color: #25D366;
        }

        .card-body input,
        .card-body textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          margin-bottom: 12px;
          font-family: inherit;
        }

        .card-body input:focus,
        .card-body textarea:focus {
          border-color: #25D366;
        }

        .card-body textarea {
          resize: vertical;
        }

        .btn-set {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }

        .btn-set:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-send {
          width: 100%;
          padding: 10px;
          background: #075e54;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-send:hover:not(:disabled) {
          background: #054a44;
        }

        .btn-broadcast {
          width: 100%;
          padding: 12px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-broadcast:hover:not(:disabled) {
          background: #7c3aed;
        }

        .btn-set:disabled,
        .btn-send:disabled,
        .btn-broadcast:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
          font-size: 13px;
          color: #92400e;
          margin-top: 8px;
        }

        .warning-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fee2e2;
          border-radius: 8px;
          color: #991b1b;
          font-size: 13px;
          margin-bottom: 16px;
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
        }

        .toast.success { background: #22c55e; }
        .toast.error { background: #ef4444; }
        .toast.info { background: #3b82f6; }

        @media (max-width: 768px) {
          .whatsapp-container { padding: 16px; }
          .content-grid { grid-template-columns: 1fr; }
          .input-group { flex-direction: column; }
          .status-details { grid-template-columns: 1fr; }
          .status-header { flex-direction: column; align-items: flex-start; }
          .page-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}