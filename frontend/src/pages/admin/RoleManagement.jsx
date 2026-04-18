// frontend/src/components/RoleManagement.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import { motion, AnimatePresence } from "framer-motion";

export default function RoleManagement() {
  const [users, setUsers] = useState([]);
  const [jumuias, setJumuias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    special: true, // Changed to true - special roles visible by default
    admin: false,
    regular: false
  });
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, jumuiaRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/jumuia`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data);
      setJumuias(jumuiaRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, role, specialRole, assignedJumuiaId = null) => {
    setUpdating(userId);
    try {
      await axios.put(
        `${BASE_URL}/api/users/${userId}/role`,
        { role, specialRole, assignedJumuiaId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.fullName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.membership_number?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const usersWithSpecialRoles = filteredUsers.filter(user => user.specialRole);
  const admins = filteredUsers.filter(user => user.role === "admin" && !user.specialRole);
  const regularMembers = filteredUsers.filter(user => user.role === "member" && !user.specialRole);

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading users...</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="role-management"
    >
      {/* Header Section - Official Style */}
      <div className="header-section">
        <div>
          <h1 className="page-title">Role Management</h1>
          <p className="page-description">
            Manage user roles and assign special permissions (Jumuia Leaders, Treasurer, Secretary, Choir Moderator, Media Moderator)
          </p>
        </div>
      </div>

      {/* Search Bar - Enhanced */}
      <div className="search-wrapper">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email or membership number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Users with Special Roles Section */}
      {usersWithSpecialRoles.length > 0 && (
        <div className="role-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('special')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection('special');
              }
            }}
          >
            <div className="section-title-wrapper">
              <span className="section-icon">👑</span>
              <div>
                <h2 className="section-title">Users with Special Roles</h2>
                <span className="section-subtitle">Privileged access members</span>
              </div>
            </div>
            <div className="section-actions">
              <span className="section-count">{usersWithSpecialRoles.length}</span>
              <motion.button 
                className="section-toggle"
                animate={{ rotate: expandedSections.special ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.button>
            </div>
          </div>
          
          <AnimatePresence>
            {expandedSections.special && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="section-content"
              >
                <div className="users-grid">
                  {usersWithSpecialRoles.map(user => (
                    <UserRoleCard
                      key={user.id}
                      user={user}
                      jumuias={jumuias}
                      onUpdate={updateUserRole}
                      updating={updating === user.id}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Admins Section */}
      {admins.length > 0 && (
        <div className="role-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('admin')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection('admin');
              }
            }}
          >
            <div className="section-title-wrapper">
              <span className="section-icon">🛡️</span>
              <div>
                <h2 className="section-title">Administrators</h2>
                <span className="section-subtitle">System administrators</span>
              </div>
            </div>
            <div className="section-actions">
              <span className="section-count">{admins.length}</span>
              <motion.button 
                className="section-toggle"
                animate={{ rotate: expandedSections.admin ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.button>
            </div>
          </div>
          
          <AnimatePresence>
            {expandedSections.admin && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="section-content"
              >
                <div className="users-grid">
                  {admins.map(user => (
                    <UserRoleCard
                      key={user.id}
                      user={user}
                      jumuias={jumuias}
                      onUpdate={updateUserRole}
                      updating={updating === user.id}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Regular Members Section */}
      {regularMembers.length > 0 && (
        <div className="role-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('regular')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection('regular');
              }
            }}
          >
            <div className="section-title-wrapper">
              <span className="section-icon">👤</span>
              <div>
                <h2 className="section-title">Regular Members</h2>
                <span className="section-subtitle">Standard members</span>
              </div>
            </div>
            <div className="section-actions">
              <span className="section-count">{regularMembers.length}</span>
              <motion.button 
                className="section-toggle"
                animate={{ rotate: expandedSections.regular ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.button>
            </div>
          </div>
          
          <AnimatePresence>
            {expandedSections.regular && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="section-content"
              >
                <div className="users-grid">
                  {regularMembers.map(user => (
                    <UserRoleCard
                      key={user.id}
                      user={user}
                      jumuias={jumuias}
                      onUpdate={updateUserRole}
                      updating={updating === user.id}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {filteredUsers.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No users found</h3>
          <p className="empty-state-description">
            No users matching "{searchTerm}" were found
          </p>
          <button className="empty-state-button" onClick={() => setSearchTerm("")}>
            Clear Search
          </button>
        </div>
      )}

      <style jsx>{`
        .role-management {
          min-height: 100%;
          margin-top: 50px;
          background: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: white;
          border-radius: 16px;
          padding: 48px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Header Section */
        .header-section {
          background: white;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
          letter-spacing: -0.01em;
        }

        .page-description {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        /* Search Wrapper */
        .search-wrapper {
          margin-bottom: 24px;
        }

        .search-container {
          position: relative;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .search-container:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          color: #94a3b8;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 14px 48px 14px 48px;
          font-size: 14px;
          border: none;
          border-radius: 12px;
          background: transparent;
          outline: none;
          color: #0f172a;
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #f1f5f9;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .clear-search-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Role Sections */
        .role-section {
          background: white;
          border-radius: 16px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.2s;
        }

        .role-section:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .section-header {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-header:hover {
          background: #fafbfc;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon {
          font-size: 24px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 2px 0;
        }

        .section-subtitle {
          font-size: 12px;
          color: #64748b;
          display: block;
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-count {
          background: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .section-toggle {
          background: none;
          border: none;
          font-size: 16px;
          color: #94a3b8;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .section-toggle:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .section-content {
          padding: 24px;
        }

        /* Users Grid */
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        /* Empty State */
        .empty-state {
          background: white;
          border-radius: 16px;
          padding: 64px 32px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .empty-state-description {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 24px 0;
        }

        .empty-state-button {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .empty-state-button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .header-section {
            padding: 20px;
          }

          .page-title {
            font-size: 20px;
          }

          .section-header {
            padding: 16px;
          }

          .section-content {
            padding: 16px;
          }

          .users-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .section-title-wrapper {
            flex: 1;
          }

          .section-subtitle {
            display: none;
          }
        }
      `}</style>
    </motion.div>
  );
}

// UserRoleCard Component - Official Styling
function UserRoleCard({ user, jumuias, onUpdate, updating }) {
  const [role, setRole] = useState(user.role || "member");
  const [specialRole, setSpecialRole] = useState(user.specialRole || "");
  const [assignedJumuia, setAssignedJumuia] = useState(user.assignedJumuiaId || "");

  const handleSave = () => {
    onUpdate(
      user.id,
      role,
      specialRole || null,
      specialRole === "jumuia_leader" ? assignedJumuia : null
    );
  };

  const getCurrentSpecialRole = () => {
    if (!user.specialRole) return null;
    const roles = {
      'jumuia_leader': 'Jumuia Leader',
      'treasurer': 'Treasurer',
      'secretary': 'Secretary',
      'choir_moderator': 'Choir Moderator',
      'media_moderator': 'Media Moderator'
    };
    return roles[user.specialRole];
  };

  const getRoleStyle = (role) => {
    const styles = {
      'jumuia_leader': { background: '#f3e8ff', color: '#7c3aed', icon: '👥' },
      'treasurer': { background: '#fef3c7', color: '#d97706', icon: '💰' },
      'secretary': { background: '#d1fae5', color: '#059669', icon: '📝' },
      'choir_moderator': { background: '#fce7f3', color: '#db2777', icon: '🎵' },
      'media_moderator': { background: '#dbeafe', color: '#3b82f6', icon: '📺' }
    };
    return styles[role] || { background: '#f1f5f9', color: '#475569', icon: '⭐' };
  };

  return (
    <motion.div 
      className="user-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="user-card-header">
        <div className="user-avatar">
          {user.fullName?.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <h3 className="user-name">{user.fullName}</h3>
          <p className="user-email">{user.email}</p>
          <div className="user-meta">
            <span className="membership-badge">
              📋 {user.membership_number}
            </span>
            {user.specialRole && (
              <span 
                className="special-role-badge"
                style={{
                  background: getRoleStyle(user.specialRole).background,
                  color: getRoleStyle(user.specialRole).color
                }}
              >
                {getRoleStyle(user.specialRole).icon} {getCurrentSpecialRole()}
              </span>
            )}
            {user.role === "admin" && !user.specialRole && (
              <span className="admin-badge">🛡️ Admin</span>
            )}
          </div>
        </div>
      </div>

      <div className="user-card-body">
        <div className="form-group">
          <label className="form-label">Account Type</label>
          <select 
            className="form-select"
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            disabled={updating}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Special Role</label>
          <select 
            className="form-select"
            value={specialRole} 
            onChange={(e) => setSpecialRole(e.target.value)}
            disabled={updating}
          >
            <option value="">None</option>
            <option value="jumuia_leader">Jumuia Leader</option>
            <option value="treasurer">Treasurer</option>
            <option value="secretary">Secretary</option>
            <option value="choir_moderator">Choir Moderator</option>
            <option value="media_moderator">Media Moderator</option>
          </select>
        </div>

        {specialRole === "jumuia_leader" && (
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="form-label">Assign Jumuia</label>
            <select 
              className="form-select"
              value={assignedJumuia} 
              onChange={(e) => setAssignedJumuia(e.target.value)}
              disabled={updating}
            >
              <option value="">Select Jumuia</option>
              {jumuias.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </motion.div>
        )}

        <motion.button 
          className="save-button"
          onClick={handleSave}
          disabled={updating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {updating ? (
            <>
              <span className="button-spinner"></span>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </motion.button>
      </div>

      <style jsx>{`
        .user-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .user-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .user-card-header {
          padding: 20px;
          display: flex;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafbfc;
        }

        .user-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 600;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .user-details {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .user-email {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 8px 0;
          word-break: break-word;
        }

        .user-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        .membership-badge {
          font-size: 11px;
          font-family: monospace;
          background: #f1f5f9;
          color: #475569;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .special-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          background: #fef2f2;
          color: #dc2626;
        }

        .user-card-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #0f172a;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .form-select:hover:not(:disabled) {
          border-color: #cbd5e1;
        }

        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-select:disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .save-button {
          width: 100%;
          padding: 10px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .save-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}