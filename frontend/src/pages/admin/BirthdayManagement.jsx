import React, { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import {
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiImage,
  FiCheck,
  FiX,
  FiClock,
  FiUsers,
  FiSend,
  FiSettings,
  FiTrendingUp,
  FiCamera,
  FiAlertCircle,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFilter
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

export default function BirthdayManagement() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [stats, setStats] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("today");

  const [whatsAppGroups, setWhatsAppGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [settingsRes, todayRes, statsRes, allBirthdaysRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/birthday/settings`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/today`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/stats`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/all`, { headers })
      ]);

      setSettings(settingsRes.data.settings);
      setTodayBirthdays(todayRes.data.users || []);
      setAllBirthdays(allBirthdaysRes.data.users || []);
      setStats(statsRes.data.stats);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load birthday data");
    } finally {
      setLoading(false);
    }
  };

const fetchWhatsAppGroups = async () => {
  setLoadingGroups(true);
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${BASE_URL}/api/birthday/whatsapp-groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.data.success) {
      const groups = res.data.groups || [];
      setWhatsAppGroups(groups);
      // Get groups where isActive = true
      const activeGroupIds = groups.filter(g => g.isActive).map(g => g.groupId);
      setSelectedGroups(activeGroupIds);
    }
  } catch (err) {
    console.error("Error fetching WhatsApp groups:", err);
  } finally {
    setLoadingGroups(false);
  }
};

  useEffect(() => {
    fetchData();
    fetchWhatsAppGroups();
  }, []);

  const handleProcessAll = async () => {
    if (!window.confirm("Process all birthdays today?")) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/process-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message);
      fetchData();
    } catch (err) {
      setError("Failed to process birthdays");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessSingle = async (userId) => {
    if (!window.confirm("Process this user's birthday?")) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/process/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message);
      fetchData();
    } catch (err) {
      setError("Failed to process user");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAdvert = async (userId, advertId) => {
    if (!window.confirm("Delete this birthday advertisement?")) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      
      await axios.delete(`${BASE_URL}/api/advertisements/${advertId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await axios.put(`${BASE_URL}/api/birthday/user-settings`, {
        birthdayAdvertId: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess("Birthday advertisement deleted successfully!");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete ad");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateSettings = async (field, value) => {
    try {
      const token = localStorage.getItem("token");
      const updated = { ...settings, [field]: value };
      const res = await axios.put(
        `${BASE_URL}/api/birthday/settings`,
        updated,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(res.data.settings);
      setSuccess("Settings updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update settings");
    }
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSaveWhatsAppGroups = async () => {
  setProcessing(true);
  try {
    const token = localStorage.getItem("token");
    
    // Send all selected group IDs to backend
    await axios.post(`${BASE_URL}/api/birthday/whatsapp-groups/save`, {
      selectedGroupIds: selectedGroups
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setSuccess("WhatsApp groups updated successfully!");
    await fetchWhatsAppGroups();
    setTimeout(() => setSuccess(""), 3000);
  } catch (err) {
    setError("Failed to update WhatsApp groups");
  } finally {
    setProcessing(false);
  }
};

  const filteredBirthdays = allBirthdays.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.membership_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="birthday-admin-page">
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>Birthday Management</h1>
            <p>Manage birthday adverts and wishes for ZUCA members</p>
          </div>
          <button className="admin-refresh-btn" onClick={fetchData}>
            <FiRefreshCw className="spinning" />
            Refresh
          </button>
        </div>

        <div className="skeleton-stats">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-stat-card">
              <div className="skeleton-icon"></div>
              <div className="skeleton-content">
                <div className="skeleton-value"></div>
                <div className="skeleton-label"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="skeleton-settings">
          <div className="skeleton-title"></div>
          <div className="skeleton-toggles">
            <div className="skeleton-toggle"></div>
            <div className="skeleton-toggle"></div>
            <div className="skeleton-toggle"></div>
          </div>
        </div>

        <div className="skeleton-whatsapp">
          <div className="skeleton-title"></div>
          <div className="skeleton-groups">
            <div className="skeleton-group-item"></div>
            <div className="skeleton-group-item"></div>
            <div className="skeleton-group-item"></div>
          </div>
          <div className="skeleton-save-btn"></div>
        </div>

        <div className="skeleton-tabs">
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
        </div>

        <div className="skeleton-list">
          <div className="skeleton-list-header"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-user-info">
                <div className="skeleton-name"></div>
                <div className="skeleton-email"></div>
              </div>
              <div className="skeleton-badge"></div>
              <div className="skeleton-btn"></div>
            </div>
          ))}
        </div>

        <style>{`
          .birthday-admin-page {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
          }

          .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .admin-header-left h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 4px 0;
          }

          .admin-header-left p {
            font-size: 14px;
            color: #64748b;
            margin: 0;
          }

          .admin-refresh-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .admin-refresh-btn:hover {
            background: #e2e8f0;
          }

          .spinning {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .skeleton-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }

          .skeleton-stat-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 18px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
          }

          .skeleton-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: #e2e8f0;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .skeleton-value {
            width: 60px;
            height: 24px;
            background: #e2e8f0;
            border-radius: 4px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-label {
            width: 80px;
            height: 12px;
            background: #e2e8f0;
            border-radius: 4px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-settings {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 24px;
          }

          .skeleton-whatsapp {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 24px;
          }

          .skeleton-title {
            width: 150px;
            height: 20px;
            background: #e2e8f0;
            border-radius: 4px;
            margin-bottom: 16px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-toggles {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
          }

          .skeleton-toggle {
            width: 180px;
            height: 22px;
            background: #e2e8f0;
            border-radius: 4px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-groups {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 12px 0;
          }

          .skeleton-group-item {
            height: 48px;
            background: #e2e8f0;
            border-radius: 10px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-save-btn {
            height: 40px;
            width: 100%;
            background: #e2e8f0;
            border-radius: 10px;
            animation: pulse 1.5s ease-in-out infinite;
            margin-top: 12px;
          }

          .skeleton-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
          }

          .skeleton-tab {
            width: 180px;
            height: 40px;
            background: #e2e8f0;
            border-radius: 10px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-list {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 20px;
          }

          .skeleton-list-header {
            width: 200px;
            height: 20px;
            background: #e2e8f0;
            border-radius: 4px;
            margin-bottom: 16px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px;
            background: #f8fafc;
            border-radius: 12px;
            margin-bottom: 12px;
          }

          .skeleton-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #e2e8f0;
            flex-shrink: 0;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-user-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .skeleton-name {
            width: 150px;
            height: 16px;
            background: #e2e8f0;
            border-radius: 4px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-email {
            width: 200px;
            height: 12px;
            background: #e2e8f0;
            border-radius: 4px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-badge {
            width: 80px;
            height: 24px;
            background: #e2e8f0;
            border-radius: 20px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-btn {
            width: 80px;
            height: 32px;
            background: #e2e8f0;
            border-radius: 8px;
            animation: pulse 1.5s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          @media (max-width: 768px) {
            .skeleton-stats {
              grid-template-columns: repeat(2, 1fr);
            }

            .skeleton-toggles {
              flex-direction: column;
            }

            .skeleton-tab {
              width: 100%;
            }
          }

          @media (max-width: 480px) {
            .skeleton-stats {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="birthday-admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Birthday Management</h1>
          <p>Manage birthday adverts and wishes for ZUCA members</p>
        </div>
        <button className="admin-refresh-btn" onClick={fetchData}>
          <FiRefreshCw className={loading ? "spinning" : ""} />
          Refresh
        </button>
      </div>

      {success && (
        <div className="admin-success-alert">
          <FiCheck size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="admin-error-alert">
          <FiAlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiUsers size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalOptedIn || 0}</span>
            <span className="stat-label">Opted In</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiCamera size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalWithPhoto || 0}</span>
            <span className="stat-label">With Photo</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FiTrendingUp size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalBirthdayAds || 0}</span>
            <span className="stat-label">Total Adverts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiCalendar size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.todayBirthdays || 0}</span>
            <span className="stat-label">Today's Birthdays</span>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="settings-section">
        <h3>
          <FiSettings size={18} />
          Settings
        </h3>
        <div className="settings-grid">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings?.autoCreateAdvert}
              onChange={(e) => handleUpdateSettings("autoCreateAdvert", e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Auto-create adverts
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings?.sendPushToAll}
              onChange={(e) => handleUpdateSettings("sendPushToAll", e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Send push notifications
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings?.sendToWhatsApp}
              onChange={(e) => handleUpdateSettings("sendToWhatsApp", e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Send to WhatsApp groups
          </label>
        </div>
      </div>

      {/* WhatsApp Groups Selection - LIKE CREATESHEETMODAL */}
      <div className="settings-section">
        <h3>
          <FaWhatsapp size={18} style={{ color: '#25D366' }} />
          WhatsApp Groups for Birthday Messages
        </h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
          Select which WhatsApp groups should receive birthday messages
        </p>

        {loadingGroups ? (
          <div className="loading-groups">Loading groups...</div>
        ) : whatsAppGroups.length === 0 ? (
          <div className="empty-groups">
            <FiAlertCircle size={20} />
            <div>
              <div className="empty-groups-title">No WhatsApp groups found</div>
              <div className="empty-groups-desc">Link the WhatsApp bot first in admin settings</div>
            </div>
          </div>
        ) : (
          <div className="whatsapp-groups-grid">
            {whatsAppGroups.map(group => (
              <label key={group.groupId} className="group-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(group.groupId)}
                  onChange={() => toggleGroup(group.groupId)}
                />
                <span className="checkmark"></span>
                <span className="group-name">{group.groupName || 'Unnamed Group'}</span>
                <span className="group-participants">{group.participants || 0} members</span>
                {selectedGroups.includes(group.groupId) && (
                  <span className="group-selected-badge">Selected</span>
                )}
              </label>
            ))}
          </div>
        )}

        <div className="helper-text">
          {selectedGroups.length > 0 
            ? `${selectedGroups.length} group(s) selected for birthday messages` 
            : 'Select at least one group to send birthday messages'}
        </div>

        <button
          className="save-groups-btn"
          onClick={handleSaveWhatsAppGroups}
          disabled={processing || loadingGroups}
        >
          {processing ? "Saving..." : "Save WhatsApp Groups"}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === "today" ? "active" : ""}`}
          onClick={() => setActiveTab("today")}
        >
          <FiClock size={16} />
          Today's Birthdays ({todayBirthdays.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <FiUsers size={16} />
          All Birthdays ({allBirthdays.length})
        </button>
      </div>

      {/* Today's Birthdays */}
      {activeTab === "today" && (
        <div className="birthday-list-section">
          <div className="section-header">
            <h3>
              <FiCalendar size={18} />
              Today's Birthdays
            </h3>
            <button
              className="process-all-btn"
              onClick={handleProcessAll}
              disabled={processing || todayBirthdays.length === 0}
            >
              <FiSend size={16} />
              {processing ? "Processing..." : "Process All"}
            </button>
          </div>

          {todayBirthdays.length === 0 ? (
            <div className="empty-state">
              <FiCalendar size={48} />
              <p>No birthdays today</p>
              <span>Check back tomorrow</span>
            </div>
          ) : (
            <div className="birthday-list">
              {todayBirthdays.map((user) => (
                <div key={user.id} className="birthday-item">
                  <div className="birthday-user">
                    <div className="user-avatar">
                      {user.birthdayPhoto ? (
                        <img src={user.birthdayPhoto} alt={user.fullName} />
                      ) : (
                        <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.fullName}</span>
                      <span className="user-email">{user.email}</span>
                      <span className="user-membership">{user.membership_number}</span>
                    </div>
                  </div>
                  <div className="birthday-status">
                    {user.birthdayAdvertId ? (
                      <span className="badge completed">
                        <FiCheck size={14} /> Processed
                      </span>
                    ) : (
                      <span className="badge pending">
                        <FiClock size={14} /> Pending
                      </span>
                    )}
                  </div>
                  <div className="birthday-actions">
                    {user.birthdayAdvertId ? (
                      <button
                        className="delete-ad-btn"
                        onClick={() => handleDeleteAdvert(user.id, user.birthdayAdvertId)}
                        disabled={processing}
                        title="Delete birthday ad"
                      >
                        <FiTrash2 size={14} />
                        Delete Ad
                      </button>
                    ) : (
                      <button
                        className="process-btn"
                        onClick={() => handleProcessSingle(user.id)}
                        disabled={processing}
                      >
                        <FiSend size={14} />
                        Process
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Birthdays */}
      {activeTab === "all" && (
        <div className="birthday-list-section">
          <div className="section-header">
            <h3>
              <FiUsers size={18} />
              All Users (Opted In)
            </h3>
            <div className="search-wrapper">
              <FiSearch size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or membership..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {allBirthdays.length === 0 ? (
            <div className="empty-state">
              <FiUser size={48} />
              <p>No users have opted in yet</p>
              <span>Users can opt in from their profile settings</span>
            </div>
          ) : filteredBirthdays.length === 0 ? (
            <div className="empty-state">
              <FiSearch size={48} />
              <p>No results found</p>
              <span>Try a different search term</span>
            </div>
          ) : (
            <div className="birthday-list">
              {filteredBirthdays.map((user) => (
                <div key={user.id} className="birthday-item">
                  <div className="birthday-user">
                    <div className="user-avatar">
                      {user.birthdayPhoto ? (
                        <img src={user.birthdayPhoto} alt={user.fullName} />
                      ) : (
                        <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.fullName}</span>
                      <span className="user-email">{user.email}</span>
                      <span className="user-membership">{user.membership_number}</span>
                      <span className="user-birthday">
                        🎂 {user.birthMonth}/{user.birthDay}
                      </span>
                    </div>
                  </div>
                  <div className="birthday-status">
                    {user.birthdayAdvertId ? (
                      <span className="badge completed">
                        <FiCheck size={14} /> Advert Created
                      </span>
                    ) : (
                      <span className="badge pending">
                        <FiClock size={14} /> Not Processed
                      </span>
                    )}
                  </div>
                  <div className="birthday-actions">
                    {user.birthdayAdvertId ? (
                      <button
                        className="delete-ad-btn"
                        onClick={() => handleDeleteAdvert(user.id, user.birthdayAdvertId)}
                        disabled={processing}
                        title="Delete birthday ad"
                      >
                        <FiTrash2 size={14} />
                        Delete Ad
                      </button>
                    ) : (
                      <button
                        className="process-btn"
                        onClick={() => handleProcessSingle(user.id)}
                        disabled={processing}
                      >
                        <FiSend size={14} />
                        Process
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .birthday-admin-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .admin-header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .admin-header-left p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .admin-refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .admin-refresh-btn:hover {
          background: #e2e8f0;
        }

        .admin-success-alert,
        .admin-error-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .admin-success-alert {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .admin-error-alert {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .admin-success-alert button,
        .admin-error-alert button {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.blue { background: #dbeafe; color: #2563eb; }
        .stat-icon.green { background: #dcfce7; color: #16a34a; }
        .stat-icon.purple { background: #f3e8ff; color: #9333ea; }
        .stat-icon.orange { background: #fef3c7; color: #d97706; }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
        }

        .settings-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .settings-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px 0;
        }

        .settings-grid {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
        }

        .toggle-label input {
          display: none;
        }

        .toggle-label .toggle-slider {
          position: relative;
          width: 40px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 999px;
          background: #cbd5e1;
          transition: 0.2s ease;
        }

        .toggle-label .toggle-slider::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          transition: 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .toggle-label input:checked + .toggle-slider {
          background: #2563eb;
        }

        .toggle-label input:checked + .toggle-slider::after {
          transform: translateX(18px);
        }

        .whatsapp-groups-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          max-height: 250px;
          overflow-y: auto;
          padding: 4px 2px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          margin: 8px 0;
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

        .group-checkbox .checkmark {
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
          background: #2563eb;
          border-color: #2563eb;
        }

        .group-checkbox input:checked + .checkmark:after {
          content: '✓';
          color: white;
          font-size: 12px;
        }

        .group-checkbox .group-name {
          font-weight: 500;
          flex: 1;
        }

        .group-checkbox .group-participants {
          font-size: 11px;
          color: #666;
        }

        .group-selected-badge {
          font-size: 10px;
          color: #2563eb;
          background: #dbeafe;
          padding: 2px 10px;
          border-radius: 12px;
          font-weight: 600;
        }

        .empty-groups {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #fef9e7;
          border: 1px solid #fdebd0;
          border-radius: 8px;
        }

        .empty-groups-title {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .empty-groups-desc {
          font-size: 12px;
          color: #666;
        }

        .loading-groups {
          padding: 16px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .helper-text {
          font-size: 12px;
          color: #64748b;
          margin: 8px 0 12px 0;
        }

        .save-groups-btn {
          width: 100%;
          padding: 10px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 4px;
        }

        .save-groups-btn:hover:not(:disabled) {
          background: #20b859;
        }

        .save-groups-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .tab-btn:hover {
          background: #e2e8f0;
        }

        .tab-btn.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .birthday-list-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: #94a3b8;
        }

        .search-input {
          padding: 8px 12px 8px 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          width: 280px;
          outline: none;
          transition: 0.2s ease;
        }

        .search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .process-all-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .process-all-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .process-all-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        .empty-state svg {
          color: #cbd5e1;
          margin-bottom: 12px;
        }

        .empty-state p {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          margin: 0;
        }

        .empty-state span {
          font-size: 14px;
          color: #94a3b8;
        }

        .birthday-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .birthday-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          flex-wrap: wrap;
        }

        .birthday-user {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 200px;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-avatar span {
          font-size: 18px;
          font-weight: 700;
          color: #64748b;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          color: #0f172a;
        }

        .user-email {
          font-size: 12px;
          color: #64748b;
        }

        .user-membership {
          font-size: 11px;
          color: #94a3b8;
        }

        .user-birthday {
          font-size: 12px;
          color: #2563eb;
          font-weight: 600;
        }

        .birthday-status {
          flex-shrink: 0;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.completed {
          background: #dcfce7;
          color: #16a34a;
        }

        .badge.pending {
          background: #fef3c7;
          color: #d97706;
        }

        .birthday-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .process-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .process-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .process-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .delete-ad-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .delete-ad-btn:hover:not(:disabled) {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .delete-ad-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .settings-grid {
            flex-direction: column;
            gap: 12px;
          }

          .birthday-item {
            flex-wrap: wrap;
          }

          .birthday-status {
            margin-left: auto;
          }

          .search-input {
            width: 100%;
          }

          .tabs-container {
            flex-wrap: wrap;
          }

          .tab-btn {
            flex: 1;
            justify-content: center;
          }

          .whatsapp-groups-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
          }

          .search-wrapper {
            width: 100%;
          }

          .search-input {
            width: 100%;
          }

          .process-all-btn {
            width: 100%;
            justify-content: center;
          }

          .birthday-actions {
            width: 100%;
          }

          .process-btn,
          .delete-ad-btn {
            flex: 1;
            justify-content: center;
          }

          .group-checkbox {
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}