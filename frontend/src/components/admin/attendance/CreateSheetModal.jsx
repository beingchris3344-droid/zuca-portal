import React, { useState } from 'react';
import { X, QrCode, Users, Calendar, Clock, MapPin, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../../api';
import { FaUserTie } from 'react-icons/fa';

export default function CreateSheetModal({ onClose, onCreate }) {
  // ============ STATE ============
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '16:30',
    location: '',
    allowSelfCheckin: true,
    enableQRCheckin: false,
    jumuiaId: '',
    // ✅ WhatsApp Fields
    enableWhatsAppAutoSend: false,
    whatsAppGroupIds: '',
    whatsAppGroupNames: '',
    whatsAppCustomMessage: '',
    whatsAppSendOnCheckin: true,
    whatsAppSendOnClose: true
  });
  
  const [jumuiaList, setJumuiaList] = useState([]);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJumuia, setLoadingJumuia] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [botConnected, setBotConnected] = useState(false);
  
  // ============ FETCH JUMUIA LIST ============
  React.useEffect(() => {
    const fetchJumuia = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/api/jumuia', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJumuiaList(response.data || []);
      } catch (error) {
        console.error('Error fetching jumuia:', error);
      } finally {
        setLoadingJumuia(false);
      }
    };
    fetchJumuia();
  }, []);
  
  // ============ FETCH WHATSAPP GROUPS ============
React.useEffect(() => {
  const fetchWhatsAppGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      // ✅ Uses the same endpoint as WhatsAppBot page
      const response = await api.get('/api/admin/whatsapp/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // ✅ Same structure as WhatsAppBot
        const groupList = response.data.groups || [];
        setWhatsappGroups(groupList);
        
        // Check if bot is connected
        const statusRes = await api.get('/api/admin/whatsapp/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBotConnected(statusRes.data.status?.connected || false);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };
  fetchWhatsAppGroups();
}, []);
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
    
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }
    
    if (!formData.eventDate) {
      alert('Please select a date');
      return;
    }
    
    // Validate WhatsApp groups if enabled
    if (formData.enableWhatsAppAutoSend && selectedGroups.length === 0) {
      alert('Please select at least one WhatsApp group for auto-send');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        title: formData.title,
        description: formData.description || null,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location || null,
        allowSelfCheckin: formData.allowSelfCheckin,
        enableWifiCheckin: formData.enableQRCheckin,
        jumuiaId: formData.jumuiaId || null,
        // ✅ WhatsApp Fields
        enableWhatsAppAutoSend: formData.enableWhatsAppAutoSend || false,
        whatsAppGroupIds: selectedGroups.map(g => g.id).join(','),
        whatsAppGroupNames: selectedGroups.map(g => g.name).join(','),
        whatsAppCustomMessage: formData.whatsAppCustomMessage || null,
        whatsAppSendOnCheckin: formData.whatsAppSendOnCheckin !== false,
        whatsAppSendOnClose: formData.whatsAppSendOnClose !== false
      };
      
      await onCreate(submitData);
      onClose();
    } catch (error) {
      console.error('Error creating sheet:', error);
      alert(error.response?.data?.error || 'Failed to create attendance sheet');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ SET TODAY'S DATE ============
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Attendance Sheet</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Leaders meeting, Choir Practice"
                required
              />
            </div>
            
            {/* Description */}
            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details about the meeting..."
                rows="2"
              />
            </div>
            
            {/* Date & Time Row */}
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  min={today}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="eventTime"
                  value={formData.eventTime}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {/* Location */}
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Annex 002, complex etc"
              />
            </div>
            
            {/* Divider */}
            <div className="divider">
              <span>Check-in Methods</span>
            </div>
            
            {/* Manual Check-in (Always enabled) */}
            <div className="method-item disabled">
              <div className="method-info">
                <span className="method-icon">📋</span>
                <div>
                  <div className="method-title">Manual Check-in</div>
                  <div className="method-desc">Admin adds members manually</div>
                </div>
              </div>
              <span className="always-enabled">Always enabled</span>
            </div>
            
            {/* Self Check-in */}
            <div className="method-item">
              <div className="method-info">
                <span className="method-icon">👤</span>
                <div>
                  <div className="method-title">Self Check-in</div>
                  <div className="method-desc">Members check themselves in via app</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="allowSelfCheckin"
                  checked={formData.allowSelfCheckin}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {/* QR Code Check-in */}
            <div className="method-item">
              <div className="method-info">
                <span className="method-icon"><QrCode size={18} /></span>
                <div>
                  <div className="method-title">QR Code Check-in</div>
                  <div className="method-desc">Members scan QR code to check in</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="enableQRCheckin"
                  checked={formData.enableQRCheckin}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {/* Divider */}
            <div className="divider">
              <span>Target Audience</span>
            </div>
            
            {/* Jumuia Selection */}
            <div className="form-group">
              <label>Target Group (Optional)</label>
              <select
                name="jumuiaId"
                value={formData.jumuiaId}
                onChange={handleChange}
              >
                <option value="">-Everyone</option>
                <option value="executive-team">-Leaders Only</option>
                <option disabled>──────────</option>
                {loadingJumuia ? (
                  <option disabled>Loading Jumuia...</option>
                ) : (
                  jumuiaList.map(j => (
                    <option key={j.id} value={j.id}>- {j.name}</option>
                  ))
                )}
              </select>
              <div className="helper-text">
                Leave empty for all members, or select a specific group
              </div>
            </div>

            {/* ============================================ */}
            {/* ✅ WHATSAPP AUTO-SEND SECTION WITH GROUP SELECTION */}
            {/* ============================================ */}
            <div className="divider">
              <span>📱 WhatsApp Auto-Send</span>
            </div>

            {/* Enable WhatsApp Auto-Send */}
            <div className="form-group">
              <div className="whatsapp-toggle-row">
                <div className="whatsapp-toggle-info">
                  <span className="method-icon">📱</span>
                  <div>
                    <div className="method-title">Enable WhatsApp Auto-Send</div>
                    <div className="method-desc">Automatically send attendance list to WhatsApp groups when members check in</div>
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

            {/* WhatsApp Settings - Only show if enabled */}
            {formData.enableWhatsAppAutoSend && (
              <>
                {/* Bot Connection Status */}
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
                <div className="form-group">
                  <label>Select WhatsApp Groups *</label>
                  {loadingGroups ? (
                    <div className="loading-groups">Loading WhatsApp groups...</div>
                  ) : whatsappGroups.length === 0 ? (
                    <div className="no-groups-message">
                      <AlertCircle size={20} />
                      <div>
                        <div className="no-groups-title">No WhatsApp groups found</div>
                        <div className="no-groups-desc">Link the WhatsApp bot first in admin settings</div>
                      </div>
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
                      ? `${selectedGroups.length} group(s) selected` 
                      : 'Select at least one group to send attendance lists'}
                  </div>
                </div>

                {/* Custom Message */}
                <div className="form-group">
                  <label>Custom Message (Optional)</label>
                  <textarea
                    name="whatsAppCustomMessage"
                    value={formData.whatsAppCustomMessage || ''}
                    onChange={handleChange}
                    placeholder="Custom message with {list} placeholder for attendees list"
                    rows="3"
                  />
                  <div className="helper-text">
                    Available placeholders: {`{title}`}, {`{date}`}, {`{time}`}, {`{location}`}, {`{total}`}, {`{list}`}
                  </div>
                </div>

                {/* Send Options */}
                <div className="form-group">
                  <label>Send Options</label>
                  <div className="send-options-row">
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

                {/* Selected Groups Summary */}
                {selectedGroups.length > 0 && (
                  <div className="selected-groups-summary">
                    <MessageSquare size={16} />
                    <span>Will send to: <strong>{selectedGroups.map(g => g.name).join(', ')}</strong></span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer Buttons */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Sheet'}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-container {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 650px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #666;
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #1a1a1a;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
        }
        
        .form-group textarea {
          resize: vertical;
          min-height: 50px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
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
        
        .method-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .method-item:last-child {
          border-bottom: none;
        }
        
        .method-item.disabled {
          opacity: 0.6;
        }
        
        .method-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .method-icon {
          font-size: 20px;
          width: 32px;
          flex-shrink: 0;
        }
        
        .method-title {
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .method-desc {
          font-size: 12px;
          color: #666;
        }
        
        .always-enabled {
          font-size: 11px;
          color: #22c55e;
          background: #dcfce7;
          padding: 4px 8px;
          border-radius: 20px;
          font-weight: 500;
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
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        
        input:checked + .toggle-slider {
          background-color: #1a1a1a;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }
        
        .helper-text {
          font-size: 11px;
          color: #666;
          margin-top: 6px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
        }
        
        .btn-secondary {
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .btn-secondary:hover {
          background: #e0e0e0;
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .btn-primary:hover {
          background: #333;
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ============================================ */
        /* ✅ WHATSAPP SETTINGS STYLES */
        /* ============================================ */
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
        
        .whatsapp-toggle-info .method-title {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }
        
        .whatsapp-toggle-info .method-desc {
          font-size: 12px;
          color: #666;
        }
        
        .bot-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
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
        
        .groups-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
          padding: 4px 2px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
        }
        
        .group-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.2s;
          font-size: 13px;
          border: 1px solid transparent;
        }
        
        .group-checkbox:hover {
          background: #f5f5f5;
          border-color: #e0e0e0;
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
          padding: 16px;
          text-align: center;
          color: #666;
          font-size: 14px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .no-groups-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #fef9e7;
          border: 1px solid #fdebd0;
          border-radius: 8px;
        }
        
        .no-groups-title {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }
        
        .no-groups-desc {
          font-size: 12px;
          color: #666;
        }
        
        .send-options-row {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          padding: 8px 0;
        }
        
        .option-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
          color: #1a1a1a;
        }
        
        .option-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #1a1a1a;
          cursor: pointer;
        }
        
        .selected-groups-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-size: 13px;
          color: #1a1a1a;
          margin-top: 12px;
        }

        /* ============================================ */
        /* ✅ RESPONSIVE */
        /* ============================================ */
        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .modal-container {
            width: 95%;
            max-height: 95vh;
          }
          
          .modal-body {
            padding: 16px;
          }
          
          .modal-header {
            padding: 16px;
          }
          
          .modal-footer {
            padding: 12px 16px;
          }
          
          .send-options-row {
            gap: 12px;
          }
          
          .whatsapp-toggle-row {
            flex-wrap: wrap;
          }
          
          .whatsapp-toggle-info {
            flex: 1 1 100%;
          }
          
          .groups-grid {
            grid-template-columns: 1fr;
          }
          
          .group-checkbox {
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}