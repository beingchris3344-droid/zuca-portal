import React, { useState, useEffect } from 'react';
import { X, User, Phone, Briefcase, Home, FileText, Search, CheckCircle } from 'lucide-react';
import { api } from '../../../api';

export default function AddMemberModal({ sheetId, onClose, onAdd }) {
  // ============ STATE ============
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    role: 'member',
    specialRole: '',
    membershipNumber: '',
    jumuiaId: '',
    jumuiaName: '',
    notes: ''
  });
  
  const [jumuiaList, setJumuiaList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingJumuia, setLoadingJumuia] = useState(true);
  
  // ============ FETCH JUMUIA LIST ============
  useEffect(() => {
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
  
  // ============ SEARCH USER BY PHONE ============
  const searchUserByPhone = async (phone) => {
    if (!phone || phone.length < 6) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const users = response.data || [];
      const results = users.filter(user => 
        user.phone && user.phone.includes(phone) ||
        user.membership_number && user.membership_number.includes(phone)
      );
      setSearchResults(results.slice(0, 5));
    } catch (error) {
      console.error('Error searching user:', error);
    } finally {
      setSearching(false);
    }
  };
  
  // ============ HANDLE INPUT CHANGE ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'phoneNumber') {
      searchUserByPhone(value);
    }
  };
  
  // ============ SELECT EXISTING USER ============
  const selectUser = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      phoneNumber: user.phone || '',
      role: user.role || 'member',
      specialRole: user.specialRole || '',
      membershipNumber: user.membership_number || '',
      jumuiaId: user.jumuiaId || '',
      jumuiaName: user.homeJumuia?.name || '',
      notes: ''
    });
    setSearchResults([]);
  };
  
  // ============ CLEAR SELECTION ============
  const clearSelection = () => {
    setSelectedUser(null);
    setFormData({
      fullName: '',
      phoneNumber: '',
      role: 'member',
      specialRole: '',
      membershipNumber: '',
      jumuiaId: '',
      jumuiaName: '',
      notes: ''
    });
  };
  
  // ============ HANDLE SUBMIT ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName) {
      alert('Please enter full name');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || null,
        role: formData.role,
        specialRole: formData.specialRole || null,
        membershipNumber: formData.membershipNumber || null,
        jumuiaId: formData.jumuiaId || null,
        jumuiaName: formData.jumuiaName || null,
        notes: formData.notes || null
      };
      
      await onAdd(submitData);
      onClose();
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ ROLE OPTIONS ============
  const roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'jumuia_leader', label: 'Jumuia Leader' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'choir_moderator', label: 'Choir Moderator' },
    { value: 'media_moderator', label: 'Media Moderator' },
    { value: 'Guest', label: 'Guest (Not in System)' }
  ];
  
  // ============ SPECIAL ROLE OPTIONS ============
  const specialRoleOptions = [
    { value: '', label: 'None' },
    { value: 'chairperson', label: 'Chairperson' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'jumuia_leader', label: 'Jumuia Leader' },
    { value: 'choir_moderator', label: 'Choir Moderator' },
    { value: 'media_moderator', label: 'Media Moderator' }
  ];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>Add Member to Attendance</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Search Result Dropdown */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="search-title">Found existing users:</div>
            {searchResults.map(user => (
              <div key={user.id} className="search-result-item" onClick={() => selectUser(user)}>
                <div className="result-info">
                  <div className="result-name">{user.fullName}</div>
                  <div className="result-details">
                    {user.membership_number && <span>🆔 {user.membership_number}</span>}
                    {user.phone && <span>📞 {user.phone}</span>}
                  </div>
                </div>
                <button className="select-btn">Select</button>
              </div>
            ))}
          </div>
        )}
        
        {/* Selected User Badge */}
        {selectedUser && (
          <div className="selected-badge">
            <CheckCircle size={16} />
            <span>Selected: {selectedUser.fullName}</span>
            <button onClick={clearSelection} className="clear-btn">Change</button>
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Full Name */}
            <div className="form-group">
              <label><User size={14} /> Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g., John Mwangi"
                required
              />
            </div>
            
            {/* Phone Number */}
            <div className="form-group">
              <label><Phone size={14} /> Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="e.g., 0712345678"
              />
              <div className="helper-text">
                💡 Enter phone number to search for existing member
              </div>
            </div>
            
            {/* Role */}
            <div className="form-row">
              <div className="form-group">
                <label><Briefcase size={14} /> Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Special Role</label>
                <select
                  name="specialRole"
                  value={formData.specialRole}
                  onChange={handleChange}
                >
                  {specialRoleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Membership Number */}
            <div className="form-group">
              <label>Membership Number</label>
              <input
                type="text"
                name="membershipNumber"
                value={formData.membershipNumber}
                onChange={handleChange}
                placeholder="e.g., Z#001"
              />
            </div>
            
            {/* Jumuia */}
            <div className="form-row">
              <div className="form-group">
                <label><Home size={14} /> Jumuia</label>
                <select
                  name="jumuiaId"
                  value={formData.jumuiaId}
                  onChange={handleChange}
                >
                  <option value="">None</option>
                  {loadingJumuia ? (
                    <option disabled>Loading...</option>
                  ) : (
                    jumuiaList.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))
                  )}
                </select>
              </div>
              
              <div className="form-group">
                <label>Jumuia Name (Custom)</label>
                <input
                  type="text"
                  name="jumuiaName"
                  value={formData.jumuiaName}
                  onChange={handleChange}
                  placeholder="For guests or custom entry"
                />
              </div>
            </div>
            
            {/* Notes */}
            <div className="form-group">
              <label><FileText size={14} /> Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes about this member..."
                rows="2"
              />
            </div>
            
          </div>
          
          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Member'}
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
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .search-results {
          margin: 0 24px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        
        .search-title {
          padding: 10px 16px;
          background: #f8f8f8;
          font-size: 12px;
          font-weight: 500;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .search-result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
        }
        
        .search-result-item:hover {
          background: #f8f8f8;
        }
        
        .result-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .result-details {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #666;
        }
        
        .select-btn {
          padding: 4px 12px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
        }
        
        .selected-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 24px 16px;
          padding: 10px 16px;
          background: #dcfce7;
          border-radius: 10px;
          font-size: 13px;
        }
        
        .clear-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: #22c55e;
          cursor: pointer;
          font-size: 12px;
          text-decoration: underline;
        }
        
        .modal-body {
          padding: 20px 24px;
        }
        
        .form-group {
          margin-bottom: 18px;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 13px;
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
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #1a1a1a;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .helper-text {
          font-size: 11px;
          color: #666;
          margin-top: 6px;
        }
        
        textarea {
          resize: vertical;
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
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}