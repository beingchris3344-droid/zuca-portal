import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { 
  Crown, Users, Mic, Church, Camera, Music, 
  Plus, Edit2, Trash2, UserPlus, X, Check, 
  Search, Filter, ChevronDown, ChevronUp, 
  Phone, Mail, Calendar, Clock,
  TrendingUp, Award, Star, AlertCircle,
  Download, RefreshCw, Eye, UserCheck,
  Briefcase, Shield, Sparkles
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';

// Custom WhatsApp icon (lucide-react doesn't have it)
const WhatsAppIcon = ({ size = 20, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.9z" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M12 15a4 4 0 0 0-4-4" />
  </svg>
);

export default function AdminExecutivePage() {
  const [activeTab, setActiveTab] = useState('positions'); // positions, team, stats
  const [expandedCategories, setExpandedCategories] = useState({
    leadership: true,
    choir: true,
    jumuia: true,
    media: true,
    voice: true
  });
  
  const [positions, setPositions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [availablePositions, setAvailablePositions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customPhone, setCustomPhone] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [positionsRes, assignmentsRes, usersRes, availableRes, statsRes] = await Promise.all([
        api.get('/api/executive/positions'),
        api.get('/api/admin/executive/assignments'),
        api.get('/api/admin/executive/users'),
        api.get('/api/admin/executive/available-positions'),
        api.get('/api/admin/executive/stats')
      ]);
      setPositions(positionsRes.data.positions);
      setAssignments(assignmentsRes.data.assignments);
      setUsers(usersRes.data.users);
      setAvailablePositions(availableRes.data.positions);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'leadership': return <Crown size={18} />;
      case 'choir': return <Mic size={18} />;
      case 'jumuia': return <Church size={18} />;
      case 'media': return <Camera size={18} />;
      case 'voice': return <Music size={18} />;
      default: return <Briefcase size={18} />;
    }
  };

  const getCategoryTitle = (category) => {
    switch(category) {
      case 'leadership': return 'Leadership Team';
      case 'choir': return 'Choir Department';
      case 'jumuia': return 'Jumuia Moderators';
      case 'media': return 'Media Department';
      case 'voice': return 'Voice Representatives';
      default: return category;
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'leadership': return '#3b82f6';
      case 'choir': return '#8b5cf6';
      case 'jumuia': return '#10b981';
      case 'media': return '#f59e0b';
      case 'voice': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getCategoryBg = (category) => {
    switch(category) {
      case 'leadership': return '#eff6ff';
      case 'choir': return '#f5f3ff';
      case 'jumuia': return '#ecfdf5';
      case 'media': return '#fffbeb';
      case 'voice': return '#fef2f2';
      default: return '#f8fafc';
    }
  };

  const getAssignmentForPosition = (positionId) => {
    return assignments.find(a => a.positionId === positionId);
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
    (user.phone && user.phone.includes(searchUsers))
  );

  const handleAssign = async () => {
    if (!selectedUser || !selectedPosition) {
      alert('Please select a user and position');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/admin/executive/assign', {
        userId: selectedUser,
        positionId: selectedPosition.id,
        customPhone: customPhone || null,
        customEmail: customEmail || null
      });
      await fetchAllData();
      setShowAssignModal(false);
      setSelectedPosition(null);
      setSelectedUser(null);
      setCustomPhone('');
      setCustomEmail('');
    } catch (error) {
      alert(error.response?.data?.error || 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAssignment) return;

    setSaving(true);
    try {
      await api.put(`/api/admin/executive/update/${selectedAssignment.id}`, {
        customPhone: customPhone || null,
        customEmail: customEmail || null
      });
      await fetchAllData();
      setShowEditModal(false);
      setSelectedAssignment(null);
      setCustomPhone('');
      setCustomEmail('');
    } catch (error) {
      alert(error.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedAssignment) return;

    setSaving(true);
    try {
      await api.delete(`/api/admin/executive/remove/${selectedAssignment.id}`);
      await fetchAllData();
      setShowRemoveModal(false);
      setSelectedAssignment(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Removal failed');
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = (position) => {
    setSelectedPosition(position);
    setSelectedUser(null);
    setCustomPhone('');
    setCustomEmail('');
    setShowAssignModal(true);
  };

  const openEditModal = (assignment) => {
    setSelectedAssignment(assignment);
    setCustomPhone(assignment.customPhone || assignment.user.phone || '');
    setCustomEmail(assignment.customEmail || assignment.user.email || '');
    setShowEditModal(true);
  };

  const openRemoveModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowRemoveModal(true);
  };

  const getCategoryPositions = (category) => {
    let categoryPositions = positions.filter(p => p.category === category);
    
    if (searchTerm) {
      categoryPositions = categoryPositions.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      categoryPositions = categoryPositions.filter(p => {
        const assigned = getAssignmentForPosition(p.id);
        return statusFilter === 'filled' ? assigned : !assigned;
      });
    }
    
    return categoryPositions;
  };

  if (loading) {
    return (
      <div className="executive-loading">
        <div className="loading-spinner"></div>
        <p>Loading executive management...</p>
      </div>
    );
  }

  return (
    <div className="admin-executive-container">
      {/* Header */}
      <div className="executive-header">
        <div className="header-content">
          <div className="header-icon">
            <Shield size={32} />
          </div>
          <div className="header-text">
            <h1>Executive Management</h1>
            <p>Manage ZUCA leadership structure and executive positions</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchAllData}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Briefcase size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalPositions}</span>
              <span className="stat-label">Total Positions</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><UserCheck size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.filledPositions}</span>
              <span className="stat-label">Filled</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><UserPlus size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.vacantPositions}</span>
              <span className="stat-label">Vacant</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><TrendingUp size={20} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.completionRate}%</span>
              <span className="stat-label">Completion</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="executive-tabs">
        <button 
          className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
        >
          <Briefcase size={16} />
          Position Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <Users size={16} />
          Current Team
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <TrendingUp size={16} />
          Analytics & History
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={14} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="filled">Filled Only</option>
            <option value="vacant">Vacant Only</option>
          </select>
        </div>
      </div>

      {/* Tab Content: Position Management */}
      {activeTab === 'positions' && (
        <div className="positions-container">
          {['leadership', 'choir', 'jumuia', 'media', 'voice'].map(category => {
            const categoryPositions = getCategoryPositions(category);
            if (categoryPositions.length === 0) return null;

            return (
              <div key={category} className="category-section">
                <div 
                  className="category-header"
                  style={{ backgroundColor: getCategoryBg(category) }}
                  onClick={() => toggleCategory(category)}
                >
                  <div className="category-title">
                    {getCategoryIcon(category)}
                    <h3>{getCategoryTitle(category)}</h3>
                    <span className="category-count">{categoryPositions.length} positions</span>
                  </div>
                  {expandedCategories[category] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                {expandedCategories[category] && (
                  <div className="positions-table">
                    <div className="table-header">
                      <div className="col-position">Position</div>
                      <div className="col-occupant">Current Occupant</div>
                      <div className="col-contact">Contact</div>
                      <div className="col-actions">Actions</div>
                    </div>
                    {categoryPositions.map(position => {
                      const assignment = getAssignmentForPosition(position.id);
                      const isFilled = !!assignment;

                      return (
                        <div key={position.id} className={`table-row ${!isFilled ? 'vacant' : ''}`}>
                          <div className="col-position">
                            <div className="position-info">
                              <span className="position-title">{position.title}</span>
                              <span className="position-level">Level {position.level}</span>
                            </div>
                          </div>
                          <div className="col-occupant">
                            {isFilled ? (
                              <div className="occupant-info">
                                {assignment.user.profileImage ? (
                                  <img src={assignment.user.profileImage} alt="" className="occupant-avatar" />
                                ) : (
                                  <div className="occupant-avatar-placeholder">
                                    {assignment.user.fullName.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="occupant-name">{assignment.user.fullName}</div>
                                  <div className="occupant-email">{assignment.user.email}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="vacant-badge">
                                <AlertCircle size={14} />
                                Vacant Position
                              </div>
                            )}
                          </div>
                          <div className="col-contact">
                            {isFilled && (
                              <div className="contact-buttons">
                                {(assignment.customPhone || assignment.user.phone) && (
                                  <>
                                    <a href={`tel:${assignment.customPhone || assignment.user.phone}`} className="contact-link">
                                      <Phone size={14} />
                                    </a>
                                    <a href={`https://wa.me/${(assignment.customPhone || assignment.user.phone).replace(/[^0-9]/g, '')}`} className="contact-link whatsapp">
                                      <WhatsAppIcon size={14} />
                                    </a>
                                  </>
                                )}
                                {(assignment.customEmail || assignment.user.email) && (
                                  <a href={`mailto:${assignment.customEmail || assignment.user.email}`} className="contact-link">
                                    <Mail size={14} />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="col-actions">
                            {isFilled ? (
                              <>
                                <button className="action-btn edit" onClick={() => openEditModal(assignment)}>
                                  <Edit2 size={14} />
                                </button>
                                <button className="action-btn remove" onClick={() => openRemoveModal(assignment)}>
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <button className="action-btn assign" onClick={() => openAssignModal(position)}>
                                <UserPlus size={14} />
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content: Current Team */}
      {activeTab === 'team' && (
        <div className="team-container">
          <div className="team-grid">
            {assignments.map(assignment => (
              <div key={assignment.id} className="team-card">
                <div className="card-header" style={{ borderTopColor: getCategoryColor(assignment.position.category) }}>
                  <div className="position-badge" style={{ backgroundColor: getCategoryColor(assignment.position.category) }}>
                    {assignment.position.title}
                  </div>
                  <div className="card-actions">
                    <button className="icon-btn" onClick={() => openEditModal(assignment)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-btn remove" onClick={() => openRemoveModal(assignment)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {assignment.user.profileImage ? (
                    <img src={assignment.user.profileImage} alt="" className="member-avatar" />
                  ) : (
                    <div className="member-avatar-placeholder">
                      {assignment.user.fullName.charAt(0)}
                    </div>
                  )}
                  <h4 className="member-name">{assignment.user.fullName}</h4>
                  <p className="member-email">{assignment.user.email}</p>
                  {(assignment.customPhone || assignment.user.phone) && (
                    <div className="member-contact">
                      <Phone size={12} />
                      <span>{assignment.customPhone || assignment.user.phone}</span>
                    </div>
                  )}
                  <div className="member-contact-buttons">
                    {(assignment.customPhone || assignment.user.phone) && (
                      <>
                        <a href={`tel:${assignment.customPhone || assignment.user.phone}`} className="contact-chip">
                          <Phone size={12} /> Call
                        </a>
                        <a href={`https://wa.me/${(assignment.customPhone || assignment.user.phone).replace(/[^0-9]/g, '')}`} className="contact-chip whatsapp">
                          <WhatsAppIcon size={12} /> WhatsApp
                        </a>
                      </>
                    )}
                    {(assignment.customEmail || assignment.user.email) && (
                      <a href={`mailto:${assignment.customEmail || assignment.user.email}`} className="contact-chip">
                        <Mail size={12} /> Email
                      </a>
                    )}
                  </div>
                  <div className="assigned-date">
                    <Calendar size={10} />
                    Assigned {formatDistance(new Date(assignment.assignedAt), new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {assignments.length === 0 && (
            <div className="empty-state">
              <Users size={48} />
              <h3>No executives assigned</h3>
              <p>Start by assigning positions to users</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Analytics & History */}
      {activeTab === 'stats' && stats && (
        <div className="stats-container">
          <div className="stats-row">
            <div className="stats-panel">
              <h3><Clock size={16} /> Recent Assignments</h3>
              <div className="history-list">
                {stats.recentAssignments?.map(assignment => (
                  <div key={assignment.id} className="history-item">
                    <div className="history-icon assign">+</div>
                    <div className="history-details">
                      <span className="history-title">{assignment.user.fullName}</span>
                      <span className="history-subtitle">assigned as {assignment.position.title}</span>
                      <span className="history-time">{formatDistance(new Date(assignment.assignedAt), new Date(), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
                {(!stats.recentAssignments || stats.recentAssignments.length === 0) && (
                  <p className="no-history">No recent assignments</p>
                )}
              </div>
            </div>

            <div className="stats-panel">
              <h3><Clock size={16} /> Recent Removals</h3>
              <div className="history-list">
                {stats.recentHistory?.map(history => (
                  <div key={history.id} className="history-item">
                    <div className="history-icon remove">−</div>
                    <div className="history-details">
                      <span className="history-title">{history.user?.fullName}</span>
                      <span className="history-subtitle">removed from {history.position?.title}</span>
                      <span className="history-time">{formatDistance(new Date(history.removedAt), new Date(), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
                {(!stats.recentHistory || stats.recentHistory.length === 0) && (
                  <p className="no-history">No recent removals</p>
                )}
              </div>
            </div>
          </div>

          <div className="stats-panel full-width">
            <h3><Award size={16} /> Category Breakdown</h3>
            <div className="category-stats">
              {stats.byCategory?.map(cat => (
                <div key={cat.category} className="category-stat-item">
                  <div className="category-stat-header">
                    {getCategoryIcon(cat.category)}
                    <span>{getCategoryTitle(cat.category)}</span>
                    <span className="category-stat-count">{cat.filled}/{cat.total}</span>
                  </div>
                  <div className="category-progress-bar">
                    <div 
                      className="category-progress-fill"
                      style={{ 
                        width: `${(cat.filled / cat.total) * 100}%`,
                        backgroundColor: getCategoryColor(cat.category)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedPosition && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Position</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-position-info">
                <div className="position-badge-large" style={{ backgroundColor: getCategoryColor(selectedPosition.category) }}>
                  {getCategoryIcon(selectedPosition.category)}
                  {selectedPosition.title}
                </div>
                <p className="position-level">Level {selectedPosition.level}</p>
              </div>

              <div className="form-group">
                <label>Select User</label>
                <div className="user-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                  />
                </div>
                <div className="users-list">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`user-select-item ${selectedUser === user.id ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(user.id)}
                    >
                      {user.profileImage ? (
                        <img src={user.profileImage} alt="" className="user-avatar" />
                      ) : (
                        <div className="user-avatar-placeholder">{user.fullName.charAt(0)}</div>
                      )}
                      <div className="user-info">
                        <div className="user-name">{user.fullName}</div>
                        <div className="user-details">{user.email} • {user.phone || 'No phone'}</div>
                      </div>
                      {selectedUser === user.id && <Check size={16} className="check-icon" />}
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="no-users">No users available</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Custom Contact (Optional)</label>
                <input
                  type="text"
                  placeholder="Custom phone number"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Custom email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
                <small>Leave blank to use user's default contact</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAssign} disabled={saving || !selectedUser}>
                {saving ? 'Assigning...' : 'Assign Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Executive</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="current-executive">
                <div className="executive-avatar">
                  {selectedAssignment.user.profileImage ? (
                    <img src={selectedAssignment.user.profileImage} alt="" />
                  ) : (
                    <div>{selectedAssignment.user.fullName.charAt(0)}</div>
                  )}
                </div>
                <div>
                  <div className="executive-name">{selectedAssignment.user.fullName}</div>
                  <div className="executive-role">{selectedAssignment.position.title}</div>
                </div>
              </div>

              <div className="form-group">
                <label>Custom Contact Info</label>
                <input
                  type="text"
                  placeholder="Custom phone number"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Custom email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
                <small>These will override the user's default contact info</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowRemoveModal(false)}>
          <div className="modal-content warning" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle size={24} className="warning-icon" />
              <h3>Confirm Removal</h3>
              <button className="modal-close" onClick={() => setShowRemoveModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Remove <strong>{selectedAssignment.user.fullName}</strong> from <strong>{selectedAssignment.position.title}</strong>?</p>
              <div className="warning-box">
                <AlertCircle size={14} />
                <small>This action will move this assignment to history and notify the user.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRemoveModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleRemove} disabled={saving}>
                {saving ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .admin-executive-container {
          min-height: 100vh;
          background: #ffffff;
          padding: 24px;
          margin-top: 30px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .executive-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e8ecf0;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .header-text h1 {
          font-size: 24px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .header-text p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f1f5f9;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e8ecf0;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s;
        }

        .stat-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.blue { background: #eff6ff; color: #3b82f6; }
        .stat-icon.green { background: #ecfdf5; color: #10b981; }
        .stat-icon.orange { background: #fffbeb; color: #f59e0b; }
        .stat-icon.purple { background: #f5f3ff; color: #8b5cf6; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
        }

        .executive-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e8ecf0;
          padding-bottom: 12px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .tab-btn.active {
          background: #f1f5f9;
          color: #3b82f6;
        }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          min-width: 260px;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .filter-group select {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: #475569;
        }

        .category-section {
          margin-bottom: 24px;
          border: 1px solid #e8ecf0;
          border-radius: 16px;
          overflow: hidden;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .category-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .category-title h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .category-count {
          font-size: 12px;
          color: #64748b;
          background: rgba(0,0,0,0.04);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .positions-table {
          border-top: 1px solid #e8ecf0;
        }

        .table-header {
          display: grid;
          grid-template-columns: 200px 1fr 120px 100px;
          background: #f8fafc;
          padding: 12px 20px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          border-bottom: 1px solid #e8ecf0;
        }

        .table-row {
          display: grid;
          grid-template-columns: 200px 1fr 120px 100px;
          padding: 14px 20px;
          border-bottom: 1px solid #f0f2f5;
          transition: background 0.2s;
        }

        .table-row:hover {
          background: #fafbfc;
        }

        .table-row.vacant {
          background: #fefce8;
        }

        .position-info {
          display: flex;
          flex-direction: column;
        }

        .position-title {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .position-level {
          font-size: 11px;
          color: #94a3b8;
        }

        .occupant-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .occupant-avatar, .occupant-avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .occupant-avatar-placeholder {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .occupant-name {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .occupant-email {
          font-size: 11px;
          color: #64748b;
        }

        .vacant-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fef3c7;
          color: #d97706;
          border-radius: 20px;
          font-size: 12px;
        }

        .contact-buttons {
          display: flex;
          gap: 6px;
        }

        .contact-link {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 8px;
          color: #475569;
          transition: all 0.2s;
          text-decoration: none;
        }

        .contact-link:hover {
          background: #e2e8f0;
          color: #3b82f6;
        }

        .contact-link.whatsapp:hover {
          background: #dcfce7;
          color: #22c55e;
        }

        .action-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .action-btn.assign {
          background: #3b82f6;
          color: white;
        }

        .action-btn.assign:hover {
          background: #2563eb;
        }

        .action-btn.edit {
          background: #f1f5f9;
          color: #475569;
        }

        .action-btn.edit:hover {
          background: #e2e8f0;
        }

        .action-btn.remove {
          background: #fef2f2;
          color: #ef4444;
        }

        .action-btn.remove:hover {
          background: #fee2e2;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .team-card {
          background: #ffffff;
          border: 1px solid #e8ecf0;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .team-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-top: 3px solid;
          background: #fafbfc;
        }

        .position-badge {
          padding: 4px 10px;
          border-radius: 20px;
          color: white;
          font-size: 11px;
          font-weight: 500;
        }

        .card-actions {
          display: flex;
          gap: 6px;
        }

        .icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: #f1f5f9;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: #e2e8f0;
        }

        .icon-btn.remove:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .card-body {
          padding: 20px;
          text-align: center;
        }

        .member-avatar, .member-avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 12px;
        }

        .member-avatar-placeholder {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: 600;
          margin: 0 auto 12px;
        }

        .member-name {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .member-email {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 8px 0;
        }

        .member-contact {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          color: #475569;
          margin-bottom: 12px;
        }

        .member-contact-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 11px;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
        }

        .contact-chip:hover {
          background: #e2e8f0;
        }

        .contact-chip.whatsapp:hover {
          background: #dcfce7;
          color: #22c55e;
        }

        .assigned-date {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 10px;
          color: #94a3b8;
        }

        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .stats-panel {
          background: #ffffff;
          border: 1px solid #e8ecf0;
          border-radius: 16px;
          padding: 20px;
        }

        .stats-panel.full-width {
          grid-column: span 2;
        }

        .stats-panel h3 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .history-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
        }

        .history-icon.assign {
          background: #ecfdf5;
          color: #10b981;
        }

        .history-icon.remove {
          background: #fef2f2;
          color: #ef4444;
        }

        .history-details {
          flex: 1;
        }

        .history-title {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
        }

        .history-subtitle {
          display: block;
          font-size: 11px;
          color: #64748b;
        }

        .history-time {
          font-size: 10px;
          color: #94a3b8;
        }

        .category-stats {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .category-stat-item {
          width: 100%;
        }

        .category-stat-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
          margin-bottom: 6px;
        }

        .category-stat-count {
          margin-left: auto;
          font-weight: 600;
          color: #1e293b;
        }

        .category-progress-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .category-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-content {
          background: white;
          border-radius: 24px;
          width: 90%;
          max-width: 500px;
          max-height: 85vh;
          overflow-y: auto;
        }

        .modal-content.warning {
          max-width: 400px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e8ecf0;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #f1f5f9;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          padding: 20px 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e8ecf0;
        }

        .modal-position-info {
          text-align: center;
          margin-bottom: 24px;
        }

        .position-badge-large {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 30px;
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .user-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .user-search input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
        }

        .users-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #e8ecf0;
          border-radius: 12px;
        }

        .user-select-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f2f5;
          transition: background 0.2s;
        }

        .user-select-item:hover {
          background: #f8fafc;
        }

        .user-select-item.selected {
          background: #eff6ff;
        }

        .user-avatar, .user-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-avatar-placeholder {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .user-details {
          font-size: 11px;
          color: #64748b;
        }

        .check-icon {
          color: #10b981;
        }

        .form-group input {
          width: 100%;
          padding: 10px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
        }

        .form-group small {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
        }

        .current-executive {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .executive-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 600;
          overflow: hidden;
        }

        .executive-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .executive-name {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
        }

        .executive-role {
          font-size: 12px;
          color: #64748b;
        }

        .warning-icon {
          color: #f59e0b;
        }

        .warning-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 12px;
          margin-top: 16px;
          color: #d97706;
        }

        .btn-primary, .btn-secondary, .btn-danger {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .no-users, .no-history {
          text-align: center;
          padding: 30px;
          color: #94a3b8;
          font-size: 13px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state h3 {
          font-size: 16px;
          color: #64748b;
          margin: 12px 0 4px;
        }

        .executive-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .table-header, .table-row {
            grid-template-columns: 180px 1fr 100px 80px;
          }
        }

        @media (max-width: 768px) {
          .admin-executive-container {
            padding: 16px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .table-header, .table-row {
            font-size: 12px;
            gap: 8px;
          }
          
          .stats-row {
            grid-template-columns: 1fr;
          }
          
          .stats-panel.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}