// frontend/src/pages/admin/EmailManagement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import {
  ArrowLeft, Mail, Bell, Calendar, Users, DollarSign,
  Megaphone, Music, Gamepad2, FileText, Clock,
  CheckCircle, XCircle, RefreshCw, Save, Search,
  AlertCircle, Phone,
} from 'lucide-react';

/* =========================================================
   SKELETON
   ========================================================= */
function Skeleton() {
  return (
    <div className="em-page">
      <div className="em-container">
        <div className="em-skel-header">
          <div className="em-skel em-skel-back" />
          <div style={{ flex: 1 }}>
            <div className="em-skel em-skel-title" />
            <div className="em-skel em-skel-line-sm" style={{ width: 280, marginTop: 8 }} />
          </div>
          <div className="em-skel em-skel-btn" />
        </div>
        <div className="em-skel-stats">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="em-skel-stat">
              <div className="em-skel em-skel-stat-icon" />
              <div style={{ flex: 1 }}>
                <div className="em-skel em-skel-line-md" style={{ width: 40 }} />
                <div className="em-skel em-skel-line-sm" style={{ width: 80, marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="em-skel em-skel-search" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="em-skel-section">
            <div className="em-skel em-skel-line-md" style={{ width: 160 }} />
            {[...Array(2)].map((__, j) => (
              <div key={j} className="em-skel-row">
                <div className="em-skel em-skel-line-md" style={{ width: 180 }} />
                <div className="em-skel em-skel-pill" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <style>{skeletonCSS}</style>
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */
export default function EmailManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [allSettings, setAllSettings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);
  const [stats, setStats] = useState(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/email/settings`, { headers: getHeaders() }),
        axios.get(`${BASE_URL}/api/admin/email/stats`, { headers: getHeaders() }),
      ]);

      setSettings(settingsRes.data.settings || {});
      setAllSettings(settingsRes.data.all || []);
      setStats(statsRes.data);

      const cats = Object.keys(settingsRes.data.settings || {});
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching email settings:', error);
      setMessage({ type: 'error', text: 'Failed to load email settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (type, currentEnabled) => {
    try {
      const newState = !currentEnabled;

      const updatedSettings = { ...settings };
      for (const category in updatedSettings) {
        updatedSettings[category] = updatedSettings[category].map(s =>
          s.type === type ? { ...s, enabled: newState } : s
        );
      }
      setSettings(updatedSettings);

      setAllSettings(allSettings.map(s =>
        s.type === type ? { ...s, enabled: newState } : s
      ));

      await axios.put(
        `${BASE_URL}/api/admin/email/settings/${type}`,
        { enabled: newState },
        { headers: getHeaders() }
      );

      setMessage({
        type: 'success',
        text: `Email "${type}" ${newState ? 'enabled' : 'disabled'} successfully`,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling email setting:', error);
      fetchSettings();
      setMessage({ type: 'error', text: 'Failed to update setting' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCategoryToggle = async (category, enabled) => {
    try {
      const newState = !enabled;

      const updatedSettings = { ...settings };
      if (updatedSettings[category]) {
        updatedSettings[category] = updatedSettings[category].map(s => ({
          ...s,
          enabled: newState,
        }));
      }
      setSettings(updatedSettings);

      setAllSettings(allSettings.map(s =>
        s.category === category ? { ...s, enabled: newState } : s
      ));

      await axios.put(
        `${BASE_URL}/api/admin/email/categories/${category}/toggle`,
        { enabled: newState },
        { headers: getHeaders() }
      );

      setMessage({
        type: 'success',
        text: `Category "${category}" ${newState ? 'enabled' : 'disabled'} successfully`,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling category:', error);
      fetchSettings();
      setMessage({ type: 'error', text: 'Failed to update category' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Reset all email settings to default (enabled)?')) return;

    try {
      setSaving(true);
      await axios.post(
        `${BASE_URL}/api/admin/email/settings/reset`,
        {},
        { headers: getHeaders() }
      );
      await fetchSettings();
      setMessage({ type: 'success', text: 'All email settings reset to default' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      setMessage({ type: 'error', text: 'Failed to reset settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      event: <Calendar size={15} />,
      attendance: <CheckCircle size={15} />,
      announcement: <Megaphone size={15} />,
      pledge: <DollarSign size={15} />,
      user: <Users size={15} />,
      program: <Music size={15} />,
      schedule: <Clock size={15} />,
      minutes: <FileText size={15} />,
      game: <Gamepad2 size={15} />,
      report: <FileText size={15} />,
      notification: <Bell size={15} />,
      sms: <Phone size={15} />,
      campaign: <Megaphone size={15} />,
    };
    return icons[category] || <Mail size={15} />;
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      event: '📅',
      attendance: '✅',
      announcement: '📢',
      pledge: '💰',
      user: '👤',
      program: '🎵',
      schedule: '📋',
      minutes: '📝',
      game: '🎮',
      report: '📊',
      notification: '🔔',
      sms: '📱',
      campaign: '📣',
    };
    return emojis[category] || '📧';
  };

  const getCategoryName = (category) => {
    const names = {
      event: 'Event Reminders',
      attendance: 'Attendance',
      announcement: 'Announcements',
      pledge: 'Pledges & Payments',
      user: 'User Management',
      program: 'Mass Programs',
      schedule: 'Schedules',
      minutes: 'Meeting Minutes',
      game: 'Games',
      report: 'Reports',
      notification: 'Notifications',
      sms: 'SMS',
      campaign: 'Campaigns',
    };
    return names[category] || category;
  };

  const filteredSettings = allSettings.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryOrder = ['event', 'attendance', 'announcement', 'pledge', 'user', 'program', 'schedule', 'minutes', 'game', 'report', 'notification', 'sms', 'campaign'];

  const sortedCategories = categories.sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  if (loading) return <Skeleton />;

  const totalEnabled = allSettings.filter(s => s.enabled).length;
  const totalDisabled = allSettings.filter(s => !s.enabled).length;

  return (
    <div className="em-page">
      <div className="em-container">
        {/* HEADER */}
        <header className="em-header">
          <div className="em-header-left">
            <button className="em-back-btn" onClick={() => navigate('/admin/dashboard')} title="Back">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="em-eyebrow">
                <Mail size={12} />
                Notifications
              </div>
              <h1 className="em-title">Email Management</h1>
              <p className="em-subtitle">
                Control which email notifications are sent to users
              </p>
            </div>
          </div>
          <div className="em-header-actions">
            <button className="em-btn" onClick={fetchSettings} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'em-spin' : ''} />
              Refresh
            </button>
            <button className="em-btn em-btn-primary" onClick={handleResetAll} disabled={saving}>
              <Save size={14} />
              {saving ? 'Resetting...' : 'Reset all'}
            </button>
          </div>
        </header>

        {/* MESSAGE */}
        {message && (
          <div className={`em-alert em-alert-${message.type}`}>
            {message.type === 'success' ? (
              <CheckCircle size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* STATS */}
        <div className="em-stats">
          <div className="em-stat">
            <div className="em-stat-icon"><Mail size={17} /></div>
            <div>
              <div className="em-stat-value">{allSettings.length}</div>
              <div className="em-stat-label">Total types</div>
            </div>
          </div>
          <div className="em-stat">
            <div className="em-stat-icon"><CheckCircle size={17} /></div>
            <div>
              <div className="em-stat-value">{totalEnabled}</div>
              <div className="em-stat-label">Enabled</div>
            </div>
          </div>
          <div className="em-stat">
            <div className="em-stat-icon"><XCircle size={17} /></div>
            <div>
              <div className="em-stat-value">{totalDisabled}</div>
              <div className="em-stat-label">Disabled</div>
            </div>
          </div>
          <div className="em-stat">
            <div className="em-stat-icon"><Bell size={17} /></div>
            <div>
              <div className="em-stat-value">{categories.length}</div>
              <div className="em-stat-label">Categories</div>
            </div>
          </div>
          <div className="em-stat">
            <div className="em-stat-icon"><Mail size={17} /></div>
            <div>
              <div className="em-stat-value">{stats?.overall?.total_emails || 0}</div>
              <div className="em-stat-label">Emails sent</div>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="em-toolbar">
          <div className="em-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search email types by name, type, or category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="em-search-clear" onClick={() => setSearchTerm('')}>
                <XCircle size={13} />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="em-search-info">
              {filteredSettings.length}{' '}
              {filteredSettings.length === 1 ? 'result' : 'results'}
            </div>
          )}
        </div>

        {/* CATEGORIES */}
        <div className="em-settings">
          {sortedCategories.length === 0 ? (
            <div className="em-empty">
              <div className="em-empty-icon"><Mail size={26} /></div>
              <div className="em-empty-title">No email settings</div>
              <div className="em-empty-sub">
                No email settings found. Toggle an email type to create it.
              </div>
            </div>
          ) : (
            sortedCategories.map((category) => {
              const categoryItems = allSettings.filter((s) => s.category === category);
              if (categoryItems.length === 0) return null;

              const isAllEnabled = categoryItems.every((s) => s.enabled);
              const enabledCount = categoryItems.filter((s) => s.enabled).length;

              return (
                <section key={category} className="em-section">
                  <div className="em-section-head">
                    <div className="em-section-title">
                      <span className="em-section-icon">{getCategoryIcon(category)}</span>
                      <h3>{getCategoryName(category)}</h3>
                      <span className="em-section-count">
                        {enabledCount}/{categoryItems.length} enabled
                      </span>
                    </div>
                    <button
                      className={`em-cat-toggle ${isAllEnabled ? 'on' : 'off'}`}
                      onClick={() => handleCategoryToggle(category, isAllEnabled)}
                    >
                      {isAllEnabled ? 'Turn all off' : 'Turn all on'}
                    </button>
                  </div>

                  <div className="em-items">
                    {categoryItems.map((setting) => (
                      <div key={setting.type} className="em-item">
                        <div className="em-item-info">
                          <div className={`em-item-dot ${setting.enabled ? 'on' : 'off'}`} />
                          <div className="em-item-details">
                            <div className="em-item-name">{setting.name}</div>
                            <div className="em-item-type">{setting.type}</div>
                            {setting.description && (
                              <div className="em-item-desc">{setting.description}</div>
                            )}
                          </div>
                        </div>

                        <div className="em-item-side">
                          <span className={`em-status ${setting.enabled ? 'on' : 'off'}`}>
                            {setting.enabled ? 'ON' : 'OFF'}
                          </span>
                          <button
                            className={`em-toggle ${setting.enabled ? 'on' : 'off'}`}
                            onClick={() => handleToggle(setting.type, setting.enabled)}
                            aria-label={`Toggle ${setting.name}`}
                          >
                            <span className="em-toggle-slider" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      <style>{mainCSS}</style>
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .em-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .em-container { padding: 28px 24px 60px; max-width: 1200px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .em-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .em-header-left { display: flex; align-items: center; gap: 14px; }
  .em-back-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .em-back-btn:hover { background: #f5f5f5; color: #171717; }
  .em-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .em-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -0.5px; color: #0f0f0f;
  }
  .em-subtitle { font-size: 13.5px; color: #737373; margin: 2px 0 0 0; }
  .em-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- BUTTONS ---------- */
  .em-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .em-btn:hover:not(:disabled) { background: #f5f5f5; border-color: #d4d4d4; }
  .em-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .em-btn-primary {
    background: #0f0f0f; color: #ffffff; border-color: #0f0f0f;
  }
  .em-btn-primary:hover:not(:disabled) { background: #262626; border-color: #262626; }

  .em-spin { animation: em-spin 0.9s linear infinite; }
  @keyframes em-spin { to { transform: rotate(360deg); } }

  /* ---------- ALERT ---------- */
  .em-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .em-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .em-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* ---------- STATS ---------- */
  .em-stats {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 10px; margin-bottom: 20px;
  }
  @media (max-width: 900px) { .em-stats { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) { .em-stats { grid-template-columns: repeat(2, 1fr); } }

  .em-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
  }
  .em-stat-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .em-stat-value {
    font-size: 20px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -0.5px; line-height: 1.1;
  }
  .em-stat-label {
    font-size: 10.5px; color: #737373;
    text-transform: uppercase; letter-spacing: 0.05em;
    font-weight: 700; margin-top: 2px;
  }

  /* ---------- TOOLBAR ---------- */
  .em-toolbar {
    display: flex; align-items: center; gap: 12px;
    flex-wrap: wrap; margin-bottom: 20px;
  }
  .em-search {
    flex: 1; min-width: 240px; max-width: 480px;
    display: flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 10px; padding: 0 12px; height: 40px;
    color: #737373; transition: border-color 0.15s ease;
  }
  .em-search:focus-within { border-color: #a3a3a3; }
  .em-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 13px; color: #171717; font-family: inherit; height: 100%;
  }
  .em-search input::placeholder { color: #a3a3a3; }
  .em-search-clear {
    background: transparent; border: none; cursor: pointer;
    color: #a3a3a3; padding: 3px; border-radius: 6px; display: flex;
  }
  .em-search-clear:hover { background: #f5f5f5; color: #525252; }
  .em-search-info {
    font-size: 12.5px; color: #737373; font-weight: 500;
  }

  /* ---------- SECTIONS ---------- */
  .em-settings { display: flex; flex-direction: column; gap: 16px; }

  .em-section {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px;
  }
  .em-section-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
    padding-bottom: 14px; border-bottom: 1px solid #f0f0f0;
  }
  .em-section-title {
    display: flex; align-items: center; gap: 10px;
    flex-wrap: wrap;
  }
  .em-section-icon {
    width: 30px; height: 30px; border-radius: 8px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .em-section-title h3 {
    font-size: 14px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.1px;
  }
  .em-section-count {
    font-size: 11px; color: #737373; font-weight: 600;
    background: #f5f5f5; padding: 3px 9px;
    border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .em-cat-toggle {
    padding: 6px 12px; border-radius: 8px;
    border: 1px solid #e5e5e5; background: #ffffff;
    color: #262626; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit; white-space: nowrap;
  }
  .em-cat-toggle:hover { background: #f5f5f5; border-color: #d4d4d4; }

  /* ---------- ITEMS ---------- */
  .em-items { display: flex; flex-direction: column; gap: 6px; }
  .em-item {
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px;
    padding: 12px 14px; background: #fafafa;
    border-radius: 10px;
    transition: background 0.12s ease;
  }
  .em-item:hover { background: #f5f5f5; }

  .em-item-info {
    display: flex; align-items: flex-start; gap: 12px;
    flex: 1; min-width: 0;
  }
  .em-item-dot {
    width: 8px; height: 8px; border-radius: 50%;
    margin-top: 6px; flex-shrink: 0;
  }
  .em-item-dot.on { background: #16a34a; }
  .em-item-dot.off { background: #d4d4d4; }

  .em-item-details { min-width: 0; flex: 1; }
  .em-item-name {
    font-size: 13.5px; font-weight: 600; color: #171717;
    line-height: 1.4;
  }
  .em-item-type {
    font-size: 11px; color: #a3a3a3;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    margin-top: 1px;
  }
  .em-item-desc {
    font-size: 12px; color: #737373;
    margin-top: 4px; line-height: 1.5;
  }

  .em-item-side {
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .em-status {
    font-size: 10.5px; font-weight: 700;
    padding: 3px 9px; border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .em-status.on { background: #f0fdf4; color: #15803d; }
  .em-status.off { background: #f5f5f5; color: #737373; }

  /* ---------- TOGGLE ---------- */
  .em-toggle {
    position: relative;
    width: 42px; height: 24px; border-radius: 999px;
    border: none; cursor: pointer; padding: 0;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }
  .em-toggle.on { background: #16a34a; }
  .em-toggle.off { background: #d4d4d4; }
  .em-toggle-slider {
    position: absolute; top: 2px; left: 2px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #ffffff;
    transition: left 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .em-toggle.on .em-toggle-slider { left: 20px; }

  /* ---------- EMPTY ---------- */
  .em-empty {
    text-align: center; padding: 72px 24px;
    background: #ffffff; border: 1px dashed #e5e5e5;
    border-radius: 14px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .em-empty-icon {
    width: 60px; height: 60px; border-radius: 16px;
    background: #f5f5f5; color: #a3a3a3;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .em-empty-title {
    font-size: 15px; font-weight: 700; color: #0f0f0f;
  }
  .em-empty-sub {
    font-size: 12.5px; color: #737373;
    max-width: 380px; line-height: 1.5;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .em-container { padding: 20px 16px 40px; }
    .em-title { font-size: 22px; }
    .em-header { flex-direction: column; align-items: stretch; }
    .em-header-actions { width: 100%; }
    .em-header-actions .em-btn { flex: 1; justify-content: center; }
    .em-toolbar { flex-direction: column; align-items: stretch; }
    .em-search { max-width: none; }
    .em-item { flex-direction: column; align-items: stretch; gap: 10px; }
    .em-item-side { justify-content: space-between; }
    .em-section-head { flex-direction: column; align-items: stretch; gap: 10px; }
    .em-cat-toggle { width: 100%; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .em-skel {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .em-skel::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: em-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes em-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .em-skel-header {
    display: flex; align-items: center; gap: 14px;
    padding-bottom: 22px; border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
  }
  .em-skel-back { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; }
  .em-skel-title { width: 200px; height: 26px; }
  .em-skel-line-sm { height: 11px; border-radius: 4px; }
  .em-skel-line-md { height: 16px; border-radius: 4px; }
  .em-skel-btn { width: 110px; height: 38px; border-radius: 9px; }
  .em-skel-stats {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 10px; margin-bottom: 20px;
  }
  @media (max-width: 900px) { .em-skel-stats { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) { .em-skel-stats { grid-template-columns: repeat(2, 1fr); } }
  .em-skel-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
  }
  .em-skel-stat-icon { width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0; }
  .em-skel-search {
    height: 40px; border-radius: 10px; margin-bottom: 20px;
    max-width: 480px; width: 100%;
  }
  .em-skel-section {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px; margin-bottom: 16px;
  }
  .em-skel-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 14px; background: #fafafa;
    border-radius: 10px; margin-top: 8px;
  }
  .em-skel-pill { width: 100px; height: 24px; border-radius: 999px; }
`;

const mainCSS = baseCSS;

