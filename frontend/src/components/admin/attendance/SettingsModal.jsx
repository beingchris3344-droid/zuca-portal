import React, { useState, useEffect } from 'react';
import { X, Users, Save, QrCode, MessageSquare, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../../api';

export default function SettingsModal({ sheet, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    allowSelfCheckin: sheet.allowSelfCheckin,
    enableQRCheckin: sheet.enableQRCheckin || true,
    // ✅ WhatsApp Fields
    enableWhatsAppAutoSend: sheet.enableWhatsAppAutoSend || false,
    whatsAppGroupIds: sheet.whatsAppGroupIds || '',
    whatsAppGroupNames: sheet.whatsAppGroupNames || '',
    whatsAppCustomMessage: sheet.whatsAppCustomMessage || '',
    whatsAppSendOnCheckin: sheet.whatsAppSendOnCheckin !== undefined ? sheet.whatsAppSendOnCheckin : true,
    whatsAppSendOnClose: sheet.whatsAppSendOnClose !== undefined ? sheet.whatsAppSendOnClose : true
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [botConnected, setBotConnected] = useState(false);
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(false);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // ============ SHOW TOAST ============
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============ FETCH WHATSAPP GROUPS ============
  useEffect(() => {
    if (formData.enableWhatsAppAutoSend) {
      fetchWhatsAppGroups();
    }
  }, [formData.enableWhatsAppAutoSend]);

  // ============ LOAD SELECTED GROUPS ============
  useEffect(() => {
    if (formData.whatsAppGroupIds) {
      const ids = formData.whatsAppGroupIds.split(',').map(id => id.trim()).filter(id => id);
      const names = formData.whatsAppGroupNames ? formData.whatsAppGroupNames.split(',').map(n => n.trim()) : [];
      const selected = ids.map((id, index) => ({
        id: id,
        name: names[index] || id
      }));
      setSelectedGroups(selected);
    }
  }, [formData.whatsAppGroupIds, formData.whatsAppGroupNames]);

  // ============ FETCH WHATSAPP GROUPS ============
  const fetchWhatsAppGroups = async () => {
    setLoadingGroups(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/admin/whatsapp/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const groupList = response.data.groups || [];
        setWhatsappGroups(groupList);
        
        // Check bot status
        const statusRes = await api.get('/api/admin/whatsapp/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBotConnected(statusRes.data.status?.connected || false);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp groups:', error);
      showToast('Failed to fetch WhatsApp groups', 'error');
    } finally {
      setLoadingGroups(false);
    }
  };

  // ============ HANDLE INPUT CHANGE ============
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ============ HANDLE GROUP SELECTION ============
  const handleGroupToggle = (groupId, groupName) => {
    setSelectedGroups(prev => {
      const exists = prev.some(g => g.id === groupId);
      if (exists) {
        return prev.filter(g => g.id !== groupId);
      } else {
        return [...prev, { id: groupId, name: groupName }];
      }
    });
  };

  // ============ HANDLE SUBMIT ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        allowSelfCheckin: formData.allowSelfCheckin,
        enableWifiCheckin: formData.enableQRCheckin,
        // ✅ WhatsApp Fields
        enableWhatsAppAutoSend: formData.enableWhatsAppAutoSend || false,
        whatsAppGroupIds: selectedGroups.map(g => g.id).join(','),
        whatsAppGroupNames: selectedGroups.map(g => g.name).join(','),
        whatsAppCustomMessage: formData.whatsAppCustomMessage || null,
        whatsAppSendOnCheckin: formData.whatsAppSendOnCheckin !== false,
        whatsAppSendOnClose: formData.whatsAppSendOnClose !== false
      };

      await api.put(`/api/attendance/sheet/${sheet.id}/whatsapp-settings`, updateData, { 
        headers: getHeaders() 
      });
      
      showToast('✅ Settings saved successfully!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1000);
      
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============ HANDLE SEND NOW ============
  const handleSendNow = async () => {
    if (selectedGroups.length === 0) {
      showToast('Please select at least one WhatsApp group', 'error');
      return;
    }
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        `/api/attendance/sheet/${sheet.id}/send-whatsapp`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        showToast(`✅ Sent to ${response.data.sentTo} groups!`);
      } else {
        showToast(`❌ ${response.data.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to send: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setSending(false);
    }
  };

  // ============ HANDLE DELETE SHEET ============
  const handleDeleteSheet = async () => {
    if (!window.confirm(`Delete "${sheet.title}" permanently? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await api.delete(`/api/attendance/sheet/${sheet.id}`, { headers: getHeaders() });
      onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete sheet');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        {/* Toast Notification */}
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        )}

        <div className="modal-header">
          <h3>Sheet Settings</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* ============ CHECK-IN METHODS ============ */}
            <div className="settings-section">
              <h4>Check-in Methods</h4>
              <label className="checkbox-label">
                <input type="checkbox" name="allowSelfCheckin" checked={formData.allowSelfCheckin} onChange={handleChange} />
                <span>Allow Self Check-in</span>
              </label>
              
              <label className="checkbox-label">
                <input type="checkbox" name="enableQRCheckin" checked={formData.enableQRCheckin} onChange={handleChange} />
                <span>Enable QR Code Check-in</span>
              </label>
            </div>

            {/* ============ WHATSAPP AUTO-SEND ============ */}
            <div className="divider">
              <span>📱 WhatsApp Auto-Send</span>
            </div>

            {/* Enable WhatsApp */}
            <div className="settings-section">
              <div className="whatsapp-toggle-row">
                <div className="whatsapp-toggle-info">
                  <MessageSquare size={18} />
                  <div>
                    <div className="toggle-title">Enable WhatsApp Auto-Send</div>
                    <div className="toggle-desc">Automatically send attendance list when members check in</div>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="enableWhatsAppAutoSend"
                    checked={formData.enableWhatsAppAutoSend || false}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* WhatsApp Settings */}
            {formData.enableWhatsAppAutoSend && (
              <>
                {/* Bot Status */}
                <div className={`bot-status ${botConnected ? 'connected' : 'disconnected'}`}>
                  {botConnected ? (
                    <>
                      <CheckCircle size={16} />
                      <span>WhatsApp bot is connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      <span>WhatsApp bot is not connected. Please connect the bot first.</span>
                    </>
                  )}
                </div>

                {/* Group Selection */}
                <div className="settings-section">
                  <label className="section-label">Select WhatsApp Groups</label>
                  {loadingGroups ? (
                    <div className="loading-groups">Loading groups...</div>
                  ) : whatsappGroups.length === 0 ? (
                    <div className="no-groups">
                      <AlertCircle size={16} />
                      <span>No groups found. Link WhatsApp bot first.</span>
                    </div>
                  ) : (
                    <div className="groups-grid">
                      {whatsappGroups.map(group => (
                        <label key={group.id} className="group-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedGroups.some(g => g.id === group.id)}
                            onChange={() => handleGroupToggle(group.id, group.name)}
                          />
                          <span className="checkmark"></span>
                          <span className="group-name">{group.name}</span>
                          <span className="group-participants">{group.participants || 0} members</span>
                          {group.isActive && <span className="group-active">Active</span>}
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="helper-text">
                    {selectedGroups.length > 0 
                      ? `✅ ${selectedGroups.length} group(s) selected` 
                      : 'Select at least one group to send attendance lists'}
                  </div>
                  <button 
                    type="button" 
                    className="btn-refresh-groups"
                    onClick={fetchWhatsAppGroups}
                    disabled={loadingGroups}
                  >
                    <RefreshCw size={14} className={loadingGroups ? 'spin' : ''} />
                    Refresh Groups
                  </button>
                </div>

                {/* Custom Message */}
                <div className="settings-section">
                  <label className="section-label">Custom Message (Optional)</label>
                  <textarea
                    name="whatsAppCustomMessage"
                    value={formData.whatsAppCustomMessage || ''}
                    onChange={handleChange}
                    placeholder="Custom message with {list} placeholder for attendees list"
                    rows="3"
                    className="custom-message-input"
                  />
                  <div className="helper-text">
                    Available placeholders: {`{title}`}, {`{date}`}, {`{time}`}, {`{location}`}, {`{total}`}, {`{list}`}
                  </div>
                </div>

                {/* Send Options */}
                <div className="settings-section">
                  <label className="section-label">Send Options</label>
                  <div className="send-options">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        name="whatsAppSendOnCheckin"
                        checked={formData.whatsAppSendOnCheckin !== false}
                        onChange={handleChange}
                      />
                      Send on every check-in
                    </label>
                    <label className="option-label">
                      <input
                        type="checkbox"
                        name="whatsAppSendOnClose"
                        checked={formData.whatsAppSendOnClose !== false}
                        onChange={handleChange}
                      />
                      Send when meeting closes
                    </label>
                  </div>
                </div>

                {/* Selected Groups Summary & Send Now */}
                {selectedGroups.length > 0 && (
                  <div className="selected-summary">
                    <div className="summary-text">
                      <MessageSquare size={16} />
                      <span>Will send to: <strong>{selectedGroups.map(g => g.name).join(', ')}</strong></span>
                    </div>
                    <button 
                      type="button" 
                      className="btn-send-now"
                      onClick={handleSendNow}
                      disabled={sending}
                    >
                      {sending ? 'Sending...' : 'Send List Now'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* ============ FOOTER ============ */}
          <div className="modal-footer">
            <button type="button" className="btn-danger" onClick={handleDeleteSheet}>
              Delete Sheet
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>Saving...</>
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .settings-modal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #1a1a1a;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          padding: 4px;
        }

        .modal-body {
          padding: 24px;
        }

        .settings-section {
          margin-bottom: 20px;
        }

        .settings-section h4 {
          font-size: 14px;
          margin-bottom: 12px;
          color: #1a1a1a;
        }

        .section-label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          color: #1a1a1a;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          cursor: pointer;
          font-size: 14px;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #1a1a1a;
        }

        .divider {
          text-align: center;
          margin: 24px 0 20px;
          position: relative;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e0e0e0;
        }

        .divider span {
          background: white;
          padding: 0 12px;
          position: relative;
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        /* WhatsApp Toggle */
        .whatsapp-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .whatsapp-toggle-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .whatsapp-toggle-info .toggle-title {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .whatsapp-toggle-info .toggle-desc {
          font-size: 12px;
          color: #666;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        input:checked + .toggle-slider {
          background-color: #1a1a1a;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        /* Bot Status */
        .bot-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .bot-status.connected {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .bot-status.disconnected {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        /* Groups Grid */
        .groups-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          max-height: 180px;
          overflow-y: auto;
          padding: 4px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
        }

        .group-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          transition: background 0.2s;
          font-size: 13px;
        }

        .group-checkbox:hover {
          background: #f5f5f5;
        }

        .group-checkbox input {
          display: none;
        }

        .checkmark {
          width: 18px;
          height: 18px;
          border: 2px solid #d0d0d0;
          border-radius: 4px;
          flex-shrink: 0;
          transition: 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .group-checkbox input:checked + .checkmark {
          background: #1a1a1a;
          border-color: #1a1a1a;
        }

        .group-checkbox input:checked + .checkmark:after {
          content: '✓';
          color: white;
          font-size: 12px;
        }

        .group-name {
          font-weight: 500;
          flex: 1;
        }

        .group-participants {
          font-size: 11px;
          color: #666;
        }

        .group-active {
          font-size: 10px;
          color: #16a34a;
          background: #dcfce7;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .loading-groups {
          padding: 12px;
          text-align: center;
          color: #666;
          font-size: 14px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .no-groups {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fef9e7;
          border: 1px solid #fdebd0;
          border-radius: 8px;
          font-size: 13px;
          color: #92400e;
        }

        .btn-refresh-groups {
          margin-top: 8px;
          padding: 4px 12px;
          background: none;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #666;
        }

        .btn-refresh-groups:hover {
          background: #f5f5f5;
        }

        .btn-refresh-groups:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Custom Message */
        .custom-message-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }

        .custom-message-input:focus {
          outline: none;
          border-color: #1a1a1a;
        }

        .helper-text {
          font-size: 11px;
          color: #666;
          margin-top: 6px;
        }

        /* Send Options */
        .send-options {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          padding: 4px 0;
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
        }

        .option-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #1a1a1a;
        }

        /* Selected Summary */
        .selected-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px 16px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          margin-top: 12px;
        }

        .summary-text {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #1a1a1a;
        }

        .btn-send-now {
          padding: 6px 16px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }

        .btn-send-now:hover:not(:disabled) {
          background: #16a34a;
        }

        .btn-send-now:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          color: white;
          z-index: 1000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .toast.success { background: #22c55e; }
        .toast.error { background: #ef4444; }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
          position: sticky;
          bottom: 0;
          background: white;
        }

        .btn-danger {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: auto;
        }

        .btn-danger:hover {
          background: #fecaca;
        }

        .btn-secondary {
          padding: 8px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn-primary {
          padding: 8px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .btn-primary:hover:not(:disabled) {
          background: #333;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .settings-modal {
            width: 95%;
            max-height: 95vh;
          }

          .groups-grid {
            grid-template-columns: 1fr;
          }

          .send-options {
            flex-direction: column;
            gap: 8px;
          }

          .selected-summary {
            flex-direction: column;
            align-items: stretch;
          }

          .btn-send-now {
            width: 100%;
            text-align: center;
          }

          .modal-footer {
            flex-wrap: wrap;
          }

          .btn-danger {
            width: 100%;
            margin-right: 0;
            order: 3;
          }
        }
      `}</style>
    </div>
  );
}