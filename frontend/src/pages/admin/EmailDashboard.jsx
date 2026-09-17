// frontend/src/pages/admin/EmailDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { io } from 'socket.io-client';
import BASE_URL from '../../api';
import {
  Mail, CheckCircle, Eye, Link, AlertCircle,
  RefreshCw, Search, Filter, ArrowLeft, Home,
  Download, TrendingUp, Activity, Bell, FileText,
  User, X, Send, Settings, Users, Shield,
  AlertTriangle, Calendar, BarChart3, Lock, Unlock,
  UserX, FileSpreadsheet, Globe, Smartphone, Monitor,
  Tablet, Target, Sliders, Radio, Calendar as CalendarIcon,
  Maximize2, Minimize2, Flame, EyeOff,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import * as XLSX from 'xlsx';

/* =========================================================
   SOCKET
   ========================================================= */
const socket = io(BASE_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

/* =========================================================
   SKELETON
   ========================================================= */
function Skeleton() {
  return (
    <div className="ed-page">
      <div className="ed-container">
        <div className="ed-skel-header">
          <div className="ed-skel ed-skel-title" />
          <div className="ed-skel ed-skel-subtitle" />
        </div>
        <div className="ed-skel-stats">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="ed-skel-stat">
              <div className="ed-skel ed-skel-icon" />
              <div style={{ flex: 1 }}>
                <div className="ed-skel ed-skel-line-md" style={{ width: 50 }} />
                <div className="ed-skel ed-skel-line-sm" style={{ width: 80, marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="ed-skel-tabs">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="ed-skel ed-skel-tab" />
          ))}
        </div>
        <div className="ed-skel-panel">
          <div className="ed-skel ed-skel-line-md" style={{ width: 200 }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="ed-skel-row">
              <div className="ed-skel ed-skel-dot" />
              <div style={{ flex: 1 }}>
                <div className="ed-skel ed-skel-line-md" style={{ width: '40%' }} />
                <div className="ed-skel ed-skel-line-sm" style={{ width: '70%', marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{skeletonCSS}</style>
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */
export default function EmailDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [updating, setUpdating] = useState(false);
  const [showUserHistory, setShowUserHistory] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [period, setPeriod] = useState('30');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    toastTimer.current = setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    );
  }, []);

  /* ---------------- FETCH ---------------- */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, usersRes, settingsRes] = await Promise.all([
        api.get('/api/email/dashboard/stats'),
        api.get('/api/webhooks/brevo/logs?limit=200'),
        api.get('/api/email/users/status'),
        api.get('/api/email/settings'),
      ]);

      setStats(statsRes.data.stats || null);
      setLogs(logsRes.data.logs || []);
      setUsers(usersRes.data.users || []);
      setSettings(settingsRes.data.settings || []);

      const systemTypes = ['password_reset', 'verification'];
      const nonSystem = (settingsRes.data.settings || []).filter(
        (s) => !systemTypes.includes(s.type)
      );
      const allDisabled = nonSystem.length > 0 && nonSystem.every((s) => s.enabled === false);
      setEmergencyMode(allDisabled);
    } catch (error) {
      console.error('Error fetching email data:', error);
      showToast('Failed to load email data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();

    socket.on('new_email_event', (data) => {
      setRealtimeCount((prev) => prev + 1);
      setLastEvent(data);
      setNotificationData(data);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);

      setStats((prev) => {
        if (!prev) return prev;
        const newStats = { ...prev, total: (prev.total || 0) + 1 };
        if (data.eventType === 'delivered') newStats.delivered = (prev.delivered || 0) + 1;
        else if (data.eventType === 'opened') newStats.opened = (prev.opened || 0) + 1;
        else if (data.eventType === 'clicked') newStats.clicked = (prev.clicked || 0) + 1;
        else if (data.eventType === 'hard_bounce' || data.eventType === 'soft_bounce')
          newStats.bounced = (prev.bounced || 0) + 1;
        else if (data.eventType === 'unsubscribe')
          newStats.unsubscribed = (prev.unsubscribed || 0) + 1;

        if (newStats.total > 0) {
          newStats.openRate = Math.round((newStats.opened / newStats.total) * 100);
          newStats.clickRate = Math.round((newStats.clicked / newStats.total) * 100);
          newStats.deliveryRate = Math.round((newStats.delivered / newStats.total) * 100);
        }
        return newStats;
      });

      setLogs((prev) => [
        {
          id: data.id || `socket-${Date.now()}`,
          eventType: data.eventType,
          email: data.email,
          subject: data.subject || 'No subject',
          user: { fullName: data.userName || 'Unknown' },
          createdAt: data.createdAt || new Date(),
          isNew: true,
        },
        ...prev,
      ]);

      const labelMap = {
        delivered: 'Delivered',
        opened: 'Opened',
        clicked: 'Clicked',
        hard_bounce: 'Hard bounce',
        soft_bounce: 'Soft bounce',
        unsubscribe: 'Unsubscribed',
        complaint: 'Complaint',
      };
      showToast(`${labelMap[data.eventType] || 'Event'}: ${data.email}`, 'success');
    });

    return () => {
      socket.off('new_email_event');
    };
  }, [fetchAllData, showToast]);

  /* ---------------- HELPERS ---------------- */
  const getEventIcon = (type) => {
    const icons = {
      delivered: <CheckCircle size={14} />,
      opened: <Eye size={14} />,
      clicked: <Link size={14} />,
      request: <Send size={14} />,
      hard_bounce: <AlertCircle size={14} />,
      soft_bounce: <AlertCircle size={14} />,
      unsubscribe: <UserX size={14} />,
      error: <AlertCircle size={14} />,
      complaint: <AlertTriangle size={14} />,
    };
    return icons[type] || <Activity size={14} />;
  };

  const getEventBadge = (type) => {
    const colors = {
      delivered: 'ok',
      opened: 'info',
      clicked: 'neutral',
      request: 'warn',
      hard_bounce: 'danger',
      soft_bounce: 'warn',
      unsubscribe: 'neutral',
      error: 'danger',
      complaint: 'danger',
    };
    return colors[type] || 'neutral';
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'ok',
      unsubscribed: 'danger',
      bounced: 'warn',
      unknown: 'neutral',
    };
    return colors[status] || 'neutral';
  };

  /* ---------------- OPTIMISTIC ACTIONS ---------------- */
  const toggleSetting = async (id, currentValue) => {
    const original = [...settings];
    // Optimistic flip
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !currentValue } : s))
    );
    setUpdating(true);
    try {
      await api.put(`/api/email/settings/${id}`, { enabled: !currentValue });
      showToast('Email setting updated', 'success');
    } catch {
      setSettings(original);
      showToast('Failed to update setting', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const toggleEmergencyMode = async () => {
    const systemTypes = ['password_reset', 'verification'];
    const nonSystem = settings.filter((s) => !systemTypes.includes(s.type));
    const originalSettings = [...settings];
    const originalEmergency = emergencyMode;
    const newEmergency = !emergencyMode;

    // Optimistic flip on all non-system settings
    setSettings((prev) =>
      prev.map((s) =>
        systemTypes.includes(s.type) ? s : { ...s, enabled: !newEmergency }
      )
    );
    setEmergencyMode(newEmergency);
    setUpdating(true);

    try {
      for (const setting of nonSystem) {
        await api.put(`/api/email/settings/${setting.id}`, { enabled: !newEmergency });
      }
      showToast(newEmergency ? 'Emergency mode enabled' : 'Emergency mode disabled', 'success');
    } catch {
      setSettings(originalSettings);
      setEmergencyMode(originalEmergency);
      showToast('Failed to toggle emergency mode', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleResubscribe = async (userId, email) => {
    if (!window.confirm(`Re-subscribe ${email}? They will start receiving emails again.`)) return;
    const originalUsers = [...users];
    // Optimistic flip
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, emailStatus: 'active' } : u
      )
    );
    try {
      await api.post(`/api/email/resubscribe/${userId}`);
      showToast(`${email} has been re-subscribed`, 'success');
    } catch {
      setUsers(originalUsers);
      showToast('Failed to re-subscribe user', 'error');
    }
  };

  const viewUserHistory = async (user) => {
    try {
      const res = await api.get(`/api/email/history/${user.id}?limit=50`);
      setUserHistory(res.data.logs || []);
      setSelectedUser(user);
      setShowUserHistory(true);
    } catch {
      showToast('Failed to load user history', 'error');
    }
  };

  const exportData = () => {
    const rows = logs.map((log) => ({
      'Event Type': log.eventType,
      Email: log.email,
      Subject: log.subject || 'N/A',
      User: log.user?.fullName || 'Unknown',
      Date: format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      Tag: log.tag || 'N/A',
      'Message ID': log.messageId || 'N/A',
    }));

    if (!rows.length) {
      showToast('Nothing to export', 'error');
      return;
    }

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Email Logs');
      XLSX.writeFile(wb, `email_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const headers = Object.keys(rows[0]);
      const csvRows = [headers.join(',')];
      rows.forEach((row) => {
        const values = headers.map(
          (h) => `"${(row[h] || '').toString().replace(/"/g, '""')}"`
        );
        csvRows.push(values.join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    showToast(`Exported ${rows.length} logs`, 'success');
    setShowExportModal(false);
  };

  /* ---------------- DERIVED ---------------- */
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || log.eventType === filterType;

    let matchesDate = true;
    if (filterDate === 'today') {
      matchesDate = new Date(log.createdAt).toDateString() === new Date().toDateString();
    } else if (filterDate === 'week') {
      matchesDate = new Date(log.createdAt) >= subDays(new Date(), 7);
    } else if (filterDate === 'month') {
      matchesDate = new Date(log.createdAt) >= subDays(new Date(), 30);
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'email') return (a.email || '').localeCompare(b.email || '');
    return 0;
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.emailStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Real stat cards — no fake change %
  const statsCards = [
    { title: 'Total events', value: stats?.total ?? 0, icon: <Activity size={17} /> },
    { title: 'Delivered', value: stats?.delivered ?? 0, icon: <CheckCircle size={17} /> },
    { title: 'Opened', value: stats?.opened ?? 0, icon: <Eye size={17} /> },
    { title: 'Clicked', value: stats?.clicked ?? 0, icon: <Link size={17} /> },
    { title: 'Bounced', value: stats?.bounced ?? 0, icon: <AlertCircle size={17} /> },
    { title: 'Open rate', value: `${stats?.openRate ?? 0}%`, icon: <TrendingUp size={17} /> },
    { title: 'Unsubscribed', value: stats?.unsubscribed ?? 0, icon: <UserX size={17} /> },
    { title: 'Click rate', value: `${stats?.clickRate ?? 0}%`, icon: <Target size={17} /> },
  ];

  // Real campaigns derived from logs grouped by tag (or type)
  const campaignMap = {};
  logs.forEach((log) => {
    const key = log.tag || log.type || 'uncategorised';
    if (!campaignMap[key]) {
      campaignMap[key] = { name: key, sent: 0, opened: 0, clicked: 0 };
    }
    campaignMap[key].sent += 1;
    if (log.eventType === 'opened') campaignMap[key].opened += 1;
    if (log.eventType === 'clicked') campaignMap[key].clicked += 1;
  });
  const campaignStats = Object.values(campaignMap)
    .map((c) => ({
      ...c,
      rate: c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0,
    }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 10);

  // Real device breakdown — from log.device if provided
  const deviceMap = {};
  logs.forEach((log) => {
    const device = log.device || log.userAgentCategory || 'unknown';
    if (!deviceMap[device]) deviceMap[device] = 0;
    deviceMap[device] += 1;
  });
  const totalDeviceLogs = Object.values(deviceMap).reduce((a, b) => a + b, 0);
  const deviceStats = Object.entries(deviceMap).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count,
    percentage: totalDeviceLogs > 0 ? Math.round((count / totalDeviceLogs) * 100) : 0,
  }));
  const deviceIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return <Smartphone size={16} />;
    if (n.includes('tablet')) return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  // Real geo — from log.country if provided
  const geoMap = {};
  logs.forEach((log) => {
    const country = log.country || log.geoCountry || 'unknown';
    if (!geoMap[country]) geoMap[country] = 0;
    geoMap[country] += 1;
  });
  const totalGeoLogs = Object.values(geoMap).reduce((a, b) => a + b, 0);
  const geoData = Object.entries(geoMap)
    .map(([country, count]) => ({
      country,
      count,
      percentage: totalGeoLogs > 0 ? Math.round((count / totalGeoLogs) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const liveEvents = logs.slice(0, 20).map((log) => ({
    ...log,
    timeAgo: formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }),
  }));

  /* ---------------- RENDER ---------------- */
  if (loading) return <Skeleton />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Target size={14} /> },
    { id: 'users', label: 'Users', icon: <Users size={14} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="ed-page">
      <div className="ed-container">
        {toast.show && (
          <div className={`ed-toast ed-toast-${toast.type}`}>{toast.message}</div>
        )}

        {showNotification && notificationData && (
          <div className="ed-realtime-popup">
            <div className={`ed-popup-icon ed-badge-${getEventBadge(notificationData.eventType)}`}>
              {getEventIcon(notificationData.eventType)}
            </div>
            <div className="ed-popup-text">
              <strong>{notificationData.eventType}</strong>
              <span>{notificationData.email}</span>
              <small>
                {formatDistanceToNow(
                  new Date(notificationData.createdAt || new Date()),
                  { addSuffix: true }
                )}
              </small>
            </div>
            <button onClick={() => setShowNotification(false)} className="ed-popup-close">
              <X size={14} />
            </button>
          </div>
        )}

        {/* HEADER */}
        <header className="ed-header">
          <div className="ed-header-left">
            <div className="ed-title-icon">
              <Mail size={20} />
            </div>
            <div>
              <div className="ed-eyebrow">
                <Radio size={12} />
                Real-time · {realtimeCount} events
              </div>
              <h1 className="ed-title">Email control center</h1>
              <p className="ed-subtitle">
                Real-time email tracking, analytics, and management
              </p>
            </div>
          </div>
          <div className="ed-header-actions">
            <button className="ed-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="ed-btn" onClick={() => navigate('/admin')}>
              <Home size={14} /> Dashboard
            </button>
            <button className="ed-btn ed-btn-primary" onClick={fetchAllData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        {/* LIVE BAR */}
        <div className="ed-live-bar">
          <span className="ed-live-dot" />
          <span className="ed-live-count">{realtimeCount} real-time events</span>
          {lastEvent && (
            <span className="ed-live-last">
              Last: {lastEvent.eventType} · {lastEvent.email}
            </span>
          )}
        </div>

        {/* TABS */}
        <nav className="ed-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`ed-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ============ OVERVIEW ============ */}
        {activeTab === 'overview' && (
          <>
            <div className="ed-stats-grid">
              {statsCards.map((card, i) => (
                <div key={i} className="ed-stat">
                  <div className="ed-stat-icon">{card.icon}</div>
                  <div>
                    <div className="ed-stat-value">{card.value}</div>
                    <div className="ed-stat-label">{card.title}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ed-toolbar">
              <div className="ed-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search email, subject, or user"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="ed-select">
                <Filter size={13} />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All events</option>
                  <option value="delivered">Delivered</option>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="request">Sent</option>
                  <option value="hard_bounce">Hard bounce</option>
                  <option value="soft_bounce">Soft bounce</option>
                  <option value="unsubscribe">Unsubscribed</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>
              <div className="ed-select">
                <CalendarIcon size={13} />
                <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div className="ed-select">
                <Sliders size={13} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="latest">Latest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="email">By email</option>
                </select>
              </div>
              <button className="ed-btn" onClick={() => setShowExportModal(true)}>
                <Download size={13} /> Export
              </button>
              <button
                className="ed-btn"
                onClick={() => setViewMode(viewMode === 'list' ? 'compact' : 'list')}
              >
                {viewMode === 'list' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
            </div>

            <section className="ed-panel">
              <div className="ed-panel-head">
                <div className="ed-panel-title">
                  <Activity size={15} />
                  <h3>Real-time activity feed</h3>
                </div>
                <div className="ed-panel-actions">
                  <span className="ed-live-badge">
                    <span className="ed-live-dot" /> Live
                  </span>
                  <span className="ed-panel-badge">{realtimeCount} new</span>
                </div>
              </div>

              {liveEvents.length === 0 ? (
                <div className="ed-empty">
                  <Bell size={26} />
                  <div className="ed-empty-title">No activity yet</div>
                  <div className="ed-empty-sub">Send emails to see events here</div>
                </div>
              ) : (
                <div className="ed-activity-list">
                  {liveEvents.map((log) => (
                    <div
                      key={log.id}
                      className={`ed-activity ${log.isNew ? 'new' : ''}`}
                    >
                      <div className={`ed-activity-icon ed-badge-${getEventBadge(log.eventType)}`}>
                        {getEventIcon(log.eventType)}
                      </div>
                      <div className="ed-activity-body">
                        <div className="ed-activity-top">
                          <span className="ed-activity-type">{log.eventType}</span>
                          <span className="ed-activity-email">{log.email}</span>
                        </div>
                        <div className="ed-activity-meta">
                          <span>{log.subject || 'No subject'}</span>
                          <span>{log.user?.fullName || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="ed-activity-time">{log.timeAgo}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="ed-panel">
              <div className="ed-panel-head">
                <div className="ed-panel-title">
                  <FileText size={15} />
                  <h3>All events ({filteredLogs.length})</h3>
                </div>
                {bulkMode && (
                  <div className="ed-panel-actions">
                    <button className="ed-btn ed-btn-sm" onClick={() => setSelectedLogs([])}>
                      Clear
                    </button>
                    <button className="ed-btn ed-btn-sm" onClick={() => setBulkMode(false)}>
                      Exit
                    </button>
                  </div>
                )}
              </div>

              {sortedLogs.length === 0 ? (
                <div className="ed-empty">
                  <FileText size={26} />
                  <div className="ed-empty-title">No events match your filters</div>
                  <div className="ed-empty-sub">Try changing the date range or event type</div>
                </div>
              ) : (
                <>
                  <div className="ed-table-wrap">
                    <table className={`ed-table ${viewMode === 'compact' ? 'compact' : ''}`}>
                      <thead>
                        <tr>
                          {bulkMode && <th style={{ width: 32 }} />}
                          <th>Event</th>
                          <th>Email</th>
                          <th>Subject</th>
                          <th>User</th>
                          <th>Time</th>
                          <th style={{ width: 80 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLogs.slice(0, 50).map((log) => (
                          <tr key={log.id} className={log.isNew ? 'new' : ''}>
                            {bulkMode && (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedLogs.includes(log.id)}
                                  onChange={() =>
                                    setSelectedLogs((prev) =>
                                      prev.includes(log.id)
                                        ? prev.filter((id) => id !== log.id)
                                        : [...prev, log.id]
                                    )
                                  }
                                />
                              </td>
                            )}
                            <td>
                              <span className={`ed-badge ed-badge-${getEventBadge(log.eventType)}`}>
                                {getEventIcon(log.eventType)}
                                {log.eventType}
                              </span>
                            </td>
                            <td className="ed-cell-email">{log.email}</td>
                            <td className="ed-cell-subject">{log.subject || '—'}</td>
                            <td>{log.user?.fullName || 'Unknown'}</td>
                            <td className="ed-cell-time">
                              {format(new Date(log.createdAt), 'HH:mm')}
                              <span className="ed-date-small">
                                {format(new Date(log.createdAt), 'MMM d')}
                              </span>
                            </td>
                            <td>
                              <div className="ed-row-actions">
                                <button
                                  className="ed-icon-btn"
                                  title="View user history"
                                  onClick={() => {
                                    if (log.user?.id) {
                                      viewUserHistory({
                                        id: log.user.id,
                                        email: log.email,
                                        fullName: log.user?.fullName,
                                      });
                                    }
                                  }}
                                >
                                  <Eye size={13} />
                                </button>
                                {log.eventType === 'unsubscribe' && log.user?.id && (
                                  <button
                                    className="ed-icon-btn ed-icon-btn-ok"
                                    title="Re-subscribe"
                                    onClick={() => handleResubscribe(log.user.id, log.email)}
                                  >
                                    <Unlock size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sortedLogs.length > 50 && (
                    <div className="ed-table-footer">
                      Showing 50 of {sortedLogs.length} events
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {/* ============ CAMPAIGNS ============ */}
        {activeTab === 'campaigns' && (
          <>
            <section className="ed-panel">
              <div className="ed-panel-head">
                <div className="ed-panel-title">
                  <Target size={15} />
                  <h3>Campaign performance</h3>
                </div>
                <span className="ed-panel-badge">{campaignStats.length} campaigns</span>
              </div>

              {campaignStats.length === 0 ? (
                <div className="ed-empty">
                  <Target size={26} />
                  <div className="ed-empty-title">No campaign data yet</div>
                  <div className="ed-empty-sub">
                    Campaigns appear here once emails are logged
                  </div>
                </div>
              ) : (
                <div className="ed-campaign-grid">
                  {campaignStats.map((campaign, i) => (
                    <div key={i} className="ed-campaign">
                      <div className="ed-campaign-top">
                        <span className="ed-campaign-name">{campaign.name}</span>
                        <span className="ed-campaign-sent">{campaign.sent} sent</span>
                      </div>
                      <div className="ed-campaign-stats">
                        <div>
                          <div className="ed-campaign-value">{campaign.opened}</div>
                          <div className="ed-campaign-label">Opened</div>
                        </div>
                        <div>
                          <div className="ed-campaign-value">{campaign.clicked}</div>
                          <div className="ed-campaign-label">Clicked</div>
                        </div>
                        <div>
                          <div className="ed-campaign-value">{campaign.rate}%</div>
                          <div className="ed-campaign-label">Open rate</div>
                        </div>
                      </div>
                      <div className="ed-bar-track">
                        <div
                          className="ed-bar-fill"
                          style={{ width: `${campaign.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="ed-actions-grid">
              <section className="ed-panel">
                <div className="ed-panel-head">
                  <div className="ed-panel-title">
                    <Smartphone size={15} />
                    <h3>Device breakdown</h3>
                  </div>
                </div>
                {deviceStats.length === 0 ? (
                  <div className="ed-empty">
                    <Smartphone size={26} />
                    <div className="ed-empty-title">No device data</div>
                    <div className="ed-empty-sub">
                      Device info appears when clients report user agents
                    </div>
                  </div>
                ) : (
                  <div className="ed-device-grid">
                    {deviceStats.map((device, i) => (
                      <div key={i} className="ed-device">
                        <div className="ed-device-icon">{deviceIcon(device.name)}</div>
                        <div className="ed-device-info">
                          <div className="ed-device-name">{device.name}</div>
                          <div className="ed-device-value">{device.count} events</div>
                        </div>
                        <div className="ed-device-pct">{device.percentage}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="ed-panel">
                <div className="ed-panel-head">
                  <div className="ed-panel-title">
                    <Globe size={15} />
                    <h3>Geographic distribution</h3>
                  </div>
                </div>
                {geoData.length === 0 ? (
                  <div className="ed-empty">
                    <Globe size={26} />
                    <div className="ed-empty-title">No geographic data</div>
                    <div className="ed-empty-sub">
                      Country info appears when events include geo headers
                    </div>
                  </div>
                ) : (
                  <div className="ed-geo-list">
                    {geoData.map((geo, i) => (
                      <div key={i} className="ed-geo">
                        <span className="ed-geo-country">{geo.country}</span>
                        <span className="ed-geo-pct">{geo.percentage}%</span>
                        <div className="ed-bar-track ed-bar-track-sm">
                          <div
                            className="ed-bar-fill"
                            style={{ width: `${geo.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ============ USERS ============ */}
        {activeTab === 'users' && (
          <section className="ed-panel">
            <div className="ed-panel-head">
              <div className="ed-panel-title">
                <Users size={15} />
                <h3>Subscribers ({filteredUsers.length})</h3>
              </div>
            </div>

            <div className="ed-toolbar">
              <div className="ed-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search users by name or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="ed-select">
                <Filter size={13} />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <button className="ed-btn" onClick={() => setShowExportModal(true)}>
                <Download size={13} /> Export
              </button>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="ed-empty">
                <Users size={26} />
                <div className="ed-empty-title">No users match your filters</div>
                <div className="ed-empty-sub">Try a different status filter or search</div>
              </div>
            ) : (
              <div className="ed-table-wrap">
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ width: 100 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 50).map((user) => (
                      <tr key={user.id}>
                        <td className="ed-cell-email">{user.fullName}</td>
                        <td>{user.email}</td>
                        <td>{user.role || user.specialRole || 'Member'}</td>
                        <td>
                          <span
                            className={`ed-badge ed-badge-${getStatusBadge(user.emailStatus)}`}
                          >
                            {user.emailStatus === 'active' && <CheckCircle size={12} />}
                            {user.emailStatus === 'unsubscribed' && <UserX size={12} />}
                            {user.emailStatus === 'bounced' && <AlertCircle size={12} />}
                            {user.emailStatus === 'unknown' && <AlertTriangle size={12} />}
                            {user.emailStatus}
                          </span>
                        </td>
                        <td>
                          <div className="ed-row-actions">
                            <button
                              className="ed-icon-btn"
                              title="View history"
                              onClick={() => viewUserHistory(user)}
                            >
                              <Eye size={13} />
                            </button>
                            {user.emailStatus === 'unsubscribed' && (
                              <button
                                className="ed-icon-btn ed-icon-btn-ok"
                                title="Re-subscribe"
                                onClick={() => handleResubscribe(user.id, user.email)}
                              >
                                <Unlock size={13} />
                              </button>
                            )}
                            <button
                              className="ed-icon-btn"
                              title="Send email"
                              onClick={() => (window.location.href = `mailto:${user.email}`)}
                            >
                              <Mail size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ============ SETTINGS ============ */}
        {activeTab === 'settings' && (
          <>
            <section className="ed-panel ed-panel-warn">
              <div className="ed-panel-head">
                <div className="ed-panel-title">
                  <Shield size={15} />
                  <h3>Emergency mode</h3>
                </div>
                <span
                  className={`ed-badge ${
                    emergencyMode ? 'ed-badge-danger' : 'ed-badge-ok'
                  }`}
                >
                  {emergencyMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="ed-panel-desc">
                When enabled, only password reset and verification emails will be sent.
              </p>
              <button
                className={`ed-btn ${emergencyMode ? 'ed-btn-danger' : 'ed-btn-primary'}`}
                onClick={toggleEmergencyMode}
                disabled={updating}
              >
                {emergencyMode ? (
                  <>
                    <Lock size={13} /> Turn off emergency mode
                  </>
                ) : (
                  <>
                    <Unlock size={13} /> Turn on emergency mode
                  </>
                )}
              </button>
              {emergencyMode && (
                <div className="ed-warning-box">
                  <AlertTriangle size={14} />
                  <span>Only password reset and verification emails are being sent</span>
                </div>
              )}
            </section>

            <section className="ed-panel">
              <div className="ed-panel-head">
                <div className="ed-panel-title">
                  <Mail size={15} />
                  <h3>Email type controls</h3>
                </div>
                <span className="ed-panel-badge">{settings.length} types</span>
              </div>
              {settings.length === 0 ? (
                <div className="ed-empty">
                  <Mail size={26} />
                  <div className="ed-empty-title">No email settings found</div>
                  <div className="ed-empty-sub">Settings appear once the backend reports them</div>
                </div>
              ) : (
                <div className="ed-settings-grid">
                  {settings.map((setting) => {
                    const isSystem = ['password_reset', 'verification'].includes(
                      setting.type
                    );
                    const isLocked = emergencyMode && !isSystem;
                    return (
                      <div key={setting.id} className="ed-setting">
                        <div className="ed-setting-info">
                          <div className="ed-setting-name">{setting.name}</div>
                          <div className="ed-setting-type">{setting.category}</div>
                        </div>
                        <div className="ed-setting-side">
                          <button
                            className={`ed-toggle ${setting.enabled ? 'on' : 'off'}`}
                            onClick={() => toggleSetting(setting.id, setting.enabled)}
                            disabled={updating || isLocked}
                          >
                            <span className="ed-toggle-slider" />
                          </button>
                          {isLocked && <Lock size={12} className="ed-lock-icon" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ============ ANALYTICS ============ */}
        {activeTab === 'analytics' && (
          <>
            <div className="ed-toolbar">
              <div className="ed-select">
                <Calendar size={13} />
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              <button className="ed-btn" onClick={fetchAllData}>
                <RefreshCw size={13} /> Refresh
              </button>
              <button className="ed-btn" onClick={() => setShowExportModal(true)}>
                <Download size={13} /> Export
              </button>
            </div>

            <div className="ed-stats-grid">
              <div className="ed-stat">
                <div className="ed-stat-icon"><Mail size={17} /></div>
                <div>
                  <div className="ed-stat-value">{stats?.total ?? 0}</div>
                  <div className="ed-stat-label">Total events</div>
                </div>
              </div>
              <div className="ed-stat">
                <div className="ed-stat-icon"><CheckCircle size={17} /></div>
                <div>
                  <div className="ed-stat-value">{stats?.delivered ?? 0}</div>
                  <div className="ed-stat-label">Delivered</div>
                </div>
              </div>
              <div className="ed-stat">
                <div className="ed-stat-icon"><Eye size={17} /></div>
                <div>
                  <div className="ed-stat-value">{stats?.opened ?? 0}</div>
                  <div className="ed-stat-label">Opened</div>
                </div>
              </div>
              <div className="ed-stat">
                <div className="ed-stat-icon"><Link size={17} /></div>
                <div>
                  <div className="ed-stat-value">{stats?.clicked ?? 0}</div>
                  <div className="ed-stat-label">Clicked</div>
                </div>
              </div>
            </div>

            <section className="ed-panel">
              <div className="ed-panel-head">
                <div className="ed-panel-title">
                  <BarChart3 size={15} />
                  <h3>Open rate by email type</h3>
                </div>
              </div>
              {settings.length === 0 ? (
                <div className="ed-empty">
                  <BarChart3 size={26} />
                  <div className="ed-empty-title">No analytics data</div>
                  <div className="ed-empty-sub">
                    Analytics appear once email types are configured
                  </div>
                </div>
              ) : (
                <div className="ed-chart">
                  {settings.map((setting) => {
                    const typeOpened = logs.filter(
                      (l) => l.eventType === 'opened' && l.tag?.includes(setting.type)
                    ).length;
                    const typeTotal = logs.filter((l) => l.tag?.includes(setting.type)).length;
                    const rate =
                      typeTotal > 0 ? Math.round((typeOpened / typeTotal) * 100) : 0;
                    return (
                      <div key={setting.id} className="ed-chart-row">
                        <div className="ed-chart-label">
                          <span>{setting.name}</span>
                          <span>{rate}%</span>
                        </div>
                        <div className="ed-bar-track">
                          <div
                            className="ed-bar-fill"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* USER HISTORY MODAL */}
      {showUserHistory && selectedUser && (
        <div className="ed-modal-overlay" onClick={() => setShowUserHistory(false)}>
          <div className="ed-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ed-modal-header">
              <div className="ed-modal-title">
                <User size={16} />
                <h3>Email history · {selectedUser.email}</h3>
              </div>
              <button className="ed-modal-close" onClick={() => setShowUserHistory(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="ed-modal-body">
              <div className="ed-mini-stats">
                <div>
                  <div className="ed-mini-value">{userHistory.length}</div>
                  <div className="ed-mini-label">Total</div>
                </div>
                <div>
                  <div className="ed-mini-value">
                    {userHistory.filter((l) => l.eventType === 'opened').length}
                  </div>
                  <div className="ed-mini-label">Opened</div>
                </div>
                <div>
                  <div className="ed-mini-value">
                    {userHistory.filter((l) => l.eventType === 'clicked').length}
                  </div>
                  <div className="ed-mini-label">Clicked</div>
                </div>
              </div>

              {userHistory.length === 0 ? (
                <div className="ed-empty">
                  <div className="ed-empty-title">No email history</div>
                  <div className="ed-empty-sub">This user hasn't received emails yet</div>
                </div>
              ) : (
                <div className="ed-history-list">
                  {userHistory.map((item, i) => (
                    <div key={i} className="ed-history-item">
                      <span className={`ed-badge ed-badge-${getEventBadge(item.eventType)}`}>
                        {getEventIcon(item.eventType)}
                        {item.eventType}
                      </span>
                      <span className="ed-history-subject">
                        {item.subject || 'No subject'}
                      </span>
                      <span className="ed-history-time">
                        {format(new Date(item.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ed-modal-footer">
              <button className="ed-btn" onClick={() => setShowUserHistory(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="ed-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="ed-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ed-modal-header">
              <div className="ed-modal-title">
                <Download size={16} />
                <h3>Export data</h3>
              </div>
              <button className="ed-modal-close" onClick={() => setShowExportModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="ed-modal-body">
              <p className="ed-modal-desc">
                Export {filteredLogs.length} log entries
              </p>
              <div className="ed-export-options">
                <button
                  className={`ed-export-option ${exportFormat === 'excel' ? 'active' : ''}`}
                  onClick={() => setExportFormat('excel')}
                >
                  <FileSpreadsheet size={18} />
                  <div>
                    <div className="ed-export-title">Excel</div>
                    <div className="ed-export-sub">.xlsx</div>
                  </div>
                </button>
                <button
                  className={`ed-export-option ${exportFormat === 'csv' ? 'active' : ''}`}
                  onClick={() => setExportFormat('csv')}
                >
                  <FileText size={18} />
                  <div>
                    <div className="ed-export-title">CSV</div>
                    <div className="ed-export-sub">.csv</div>
                  </div>
                </button>
              </div>
            </div>
            <div className="ed-modal-footer">
              <button className="ed-btn" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button
                className="ed-btn ed-btn-primary"
                onClick={exportData}
                disabled={filteredLogs.length === 0}
              >
                Export {filteredLogs.length} entries
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{mainCSS}</style>
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .ed-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .ed-container { padding: 28px 24px 60px; max-width: 1360px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .ed-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 16px;
  }
  .ed-header-left { display: flex; align-items: center; gap: 14px; }
  .ed-title-icon {
    width: 44px; height: 44px; border-radius: 11px;
    background: #f5f5f5; color: #262626;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ed-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .ed-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #0f0f0f; }
  .ed-subtitle { font-size: 13.5px; color: #737373; margin: 2px 0 0 0; }
  .ed-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- BUTTONS ---------- */
  .ed-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .ed-btn:hover:not(:disabled) { background: #f5f5f5; border-color: #d4d4d4; }
  .ed-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ed-btn-sm { padding: 6px 10px; font-size: 12px; }
  .ed-btn-primary { background: #0f0f0f; color: #ffffff; border-color: #0f0f0f; }
  .ed-btn-primary:hover:not(:disabled) { background: #262626; border-color: #262626; }
  .ed-btn-danger { background: #dc2626; color: #ffffff; border-color: #dc2626; }
  .ed-btn-danger:hover:not(:disabled) { background: #b91c1c; border-color: #b91c1c; }

  .ed-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 7px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .ed-icon-btn:hover { background: #f5f5f5; color: #171717; border-color: #d4d4d4; }
  .ed-icon-btn-ok { color: #15803d; border-color: #bbf7d0; background: #f0fdf4; }
  .ed-icon-btn-ok:hover { background: #dcfce7; color: #166534; }

  /* ---------- LIVE BAR ---------- */
  .ed-live-bar {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; background: #ffffff;
    border: 1px solid #e5e5e5; border-radius: 10px;
    margin-bottom: 20px; flex-wrap: wrap;
    font-size: 12.5px;
  }
  .ed-live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #16a34a; flex-shrink: 0;
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5);
    animation: ed-pulse 2s infinite;
  }
  @keyframes ed-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
  }
  .ed-live-count { font-weight: 700; color: #0f0f0f; }
  .ed-live-last { color: #737373; font-size: 12px; }

  /* ---------- TABS ---------- */
  .ed-tabs {
    display: flex; gap: 4px; border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px; overflow-x: auto; scrollbar-width: none;
  }
  .ed-tabs::-webkit-scrollbar { display: none; }
  .ed-tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 14px; background: transparent; border: none;
    border-bottom: 2px solid transparent; color: #737373;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease; white-space: nowrap; margin-bottom: -1px;
    font-family: inherit;
  }
  .ed-tab:hover { color: #262626; }
  .ed-tab.active { color: #0f0f0f; border-bottom-color: #0f0f0f; }

  /* ---------- STATS ---------- */
  .ed-stats-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 10px; margin-bottom: 20px;
  }
  @media (max-width: 1024px) { .ed-stats-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 720px) { .ed-stats-grid { grid-template-columns: repeat(2, 1fr); } }

  .ed-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    transition: border-color 0.15s ease;
  }
  .ed-stat:hover { border-color: #d4d4d4; }
  .ed-stat-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ed-stat-value {
    font-size: 20px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -0.5px; line-height: 1.1;
  }
  .ed-stat-label {
    font-size: 10.5px; color: #737373;
    text-transform: uppercase; letter-spacing: 0.05em;
    font-weight: 700; margin-top: 2px;
  }

  /* ---------- TOOLBAR ---------- */
  .ed-toolbar {
    display: flex; gap: 8px; margin-bottom: 16px;
    flex-wrap: wrap; align-items: center;
  }
  .ed-search {
    flex: 1; min-width: 220px;
    display: flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 9px; padding: 0 12px; height: 38px;
    color: #737373; transition: border-color 0.15s ease;
  }
  .ed-search:focus-within { border-color: #a3a3a3; }
  .ed-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-family: inherit; height: 100%;
  }
  .ed-search input::placeholder { color: #a3a3a3; }

  .ed-select {
    position: relative; display: inline-flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 9px;
    height: 38px; padding: 0 12px; min-width: 150px;
    color: #737373; transition: border-color 0.15s ease;
  }
  .ed-select:hover { border-color: #d4d4d4; }
  .ed-select select {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-weight: 500;
    cursor: pointer; appearance: none; font-family: inherit;
    padding-right: 12px;
  }

  /* ---------- PANEL ---------- */
  .ed-panel {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px; margin-bottom: 16px;
  }
  .ed-panel-warn { border-color: #fde68a; background: #fffbeb; }
  .ed-panel-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .ed-panel-title { display: flex; align-items: center; gap: 8px; }
  .ed-panel-title svg { color: #737373; }
  .ed-panel-title h3 {
    font-size: 14px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.1px;
  }
  .ed-panel-actions { display: flex; align-items: center; gap: 8px; }
  .ed-panel-badge {
    padding: 3px 10px; border-radius: 999px;
    background: #f5f5f5; color: #525252;
    font-size: 11px; font-weight: 700;
  }
  .ed-panel-desc {
    font-size: 13px; color: #737373; margin: 0 0 14px 0;
    line-height: 1.5;
  }
  .ed-live-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 10px; border-radius: 999px;
    background: #f0fdf4; color: #15803d;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  /* ---------- BADGES ---------- */
  .ed-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .ed-badge-ok { background: #f0fdf4; color: #15803d; }
  .ed-badge-info { background: #eff6ff; color: #1d4ed8; }
  .ed-badge-warn { background: #fffbeb; color: #b45309; }
  .ed-badge-danger { background: #fef2f2; color: #b91c1c; }
  .ed-badge-neutral { background: #f5f5f5; color: #525252; }

  /* ---------- ACTIVITY ---------- */
  .ed-activity-list { display: flex; flex-direction: column; }
  .ed-activity {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 4px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.15s ease;
  }
  .ed-activity:last-child { border-bottom: none; }
  .ed-activity.new { background: #eff6ff; }
  .ed-activity-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ed-activity-body { flex: 1; min-width: 0; }
  .ed-activity-top {
    display: flex; gap: 10px; align-items: center;
    flex-wrap: wrap; margin-bottom: 3px;
  }
  .ed-activity-type {
    font-size: 11px; font-weight: 700; color: #525252;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .ed-activity-email {
    font-size: 13px; font-weight: 600; color: #0f0f0f;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ed-activity-meta {
    display: flex; gap: 12px; font-size: 11.5px;
    color: #737373; flex-wrap: wrap;
  }
  .ed-activity-time {
    font-size: 11px; color: #a3a3a3;
    white-space: nowrap; flex-shrink: 0;
  }

  /* ---------- TABLE ---------- */
  .ed-table-wrap { overflow-x: auto; margin: 0 -20px; padding: 0 20px; }
  .ed-table {
    width: 100%; border-collapse: collapse;
    font-size: 12.5px; min-width: 720px;
  }
  .ed-table thead th {
    text-align: left; padding: 10px 12px;
    background: #fafafa; font-weight: 700;
    font-size: 10.5px; color: #737373;
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid #e5e5e5;
    white-space: nowrap;
  }
  .ed-table tbody td {
    padding: 12px;
    border-bottom: 1px solid #f5f5f5;
    color: #262626; vertical-align: middle;
  }
  .ed-table tbody tr:last-child td { border-bottom: none; }
  .ed-table tbody tr:hover { background: #fafafa; }
  .ed-table tbody tr.new { background: #eff6ff; }
  .ed-table.compact tbody td { padding: 6px 10px; font-size: 12px; }

  .ed-cell-email { font-weight: 600; color: #0f0f0f; }
  .ed-cell-subject {
    color: #525252; max-width: 220px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ed-cell-time { font-size: 12px; color: #737373; white-space: nowrap; }
  .ed-date-small { display: block; font-size: 10.5px; color: #a3a3a3; }

  .ed-row-actions { display: flex; gap: 4px; }
  .ed-table-footer {
    padding: 12px; text-align: center;
    font-size: 12px; color: #a3a3a3;
    border-top: 1px solid #f5f5f5;
  }

  /* ---------- CAMPAIGNS ---------- */
  .ed-campaign-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .ed-campaign {
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 12px; padding: 16px;
    transition: border-color 0.15s ease;
  }
  .ed-campaign:hover { border-color: #e5e5e5; }
  .ed-campaign-top {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px; margin-bottom: 12px;
  }
  .ed-campaign-name {
    font-size: 13.5px; font-weight: 700; color: #0f0f0f;
    word-break: break-word;
  }
  .ed-campaign-sent { font-size: 11.5px; color: #a3a3a3; flex-shrink: 0; }
  .ed-campaign-stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 12px;
  }
  .ed-campaign-value {
    font-size: 16px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -0.3px;
  }
  .ed-campaign-label {
    font-size: 10.5px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    margin-top: 2px;
  }

  /* ---------- PROGRESS BARS ---------- */
  .ed-bar-track {
    height: 6px; background: #f0f0f0;
    border-radius: 999px; overflow: hidden;
  }
  .ed-bar-track-sm { width: 100%; max-width: 100px; }
  .ed-bar-fill {
    height: 100%; background: #0f0f0f;
    border-radius: 999px;
    transition: width 0.5s ease;
  }

  /* ---------- DEVICE + GEO ---------- */
  .ed-actions-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  }
  @media (max-width: 900px) { .ed-actions-grid { grid-template-columns: 1fr; } }

  .ed-device-grid { display: flex; flex-direction: column; gap: 10px; }
  .ed-device {
    display: grid; grid-template-columns: 36px 1fr auto;
    align-items: center; gap: 12px;
    padding: 12px 14px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 10px;
  }
  .ed-device-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
  }
  .ed-device-info { flex: 1; min-width: 0; }
  .ed-device-name { font-size: 13px; font-weight: 600; color: #171717; }
  .ed-device-value { font-size: 11.5px; color: #737373; margin-top: 2px; }
  .ed-device-pct { font-size: 13px; font-weight: 700; color: #0f0f0f; }

  .ed-geo-list { display: flex; flex-direction: column; gap: 8px; }
  .ed-geo {
    display: grid; grid-template-columns: 1fr auto 120px;
    align-items: center; gap: 12px;
    padding: 10px 14px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 10px;
  }
  .ed-geo-country { font-size: 13px; font-weight: 600; color: #171717; }
  .ed-geo-pct { font-size: 12.5px; font-weight: 700; color: #262626; text-align: right; }

  /* ---------- SETTINGS ---------- */
  .ed-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .ed-setting {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; padding: 12px 14px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 10px;
  }
  .ed-setting-info { flex: 1; min-width: 0; }
  .ed-setting-name {
    font-size: 13.5px; font-weight: 600; color: #171717;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ed-setting-type {
    font-size: 11px; color: #a3a3a3; margin-top: 2px;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
  }
  .ed-setting-side { display: flex; align-items: center; gap: 8px; }
  .ed-lock-icon { color: #a3a3a3; }

  /* ---------- TOGGLE ---------- */
  .ed-toggle {
    position: relative; width: 38px; height: 22px; border-radius: 999px;
    border: none; cursor: pointer; padding: 0;
    transition: background 0.2s ease; flex-shrink: 0;
  }
  .ed-toggle.on { background: #16a34a; }
  .ed-toggle.off { background: #d4d4d4; }
  .ed-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
  .ed-toggle-slider {
    position: absolute; top: 2px; left: 2px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #ffffff; transition: left 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .ed-toggle.on .ed-toggle-slider { left: 18px; }

  /* ---------- WARNING BOX ---------- */
  .ed-warning-box {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; background: #fef2f2;
    border: 1px solid #fecaca; border-radius: 9px;
    color: #b91c1c; font-size: 12.5px; margin-top: 14px;
  }

  /* ---------- CHART ---------- */
  .ed-chart { display: flex; flex-direction: column; gap: 14px; }
  .ed-chart-row { display: flex; flex-direction: column; gap: 6px; }
  .ed-chart-label {
    display: flex; justify-content: space-between;
    font-size: 12.5px; color: #525252; font-weight: 600;
  }

  /* ---------- EMPTY ---------- */
  .ed-empty {
    text-align: center; padding: 48px 24px;
    color: #a3a3a3;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .ed-empty svg { color: #d4d4d4; }
  .ed-empty-title { font-size: 14px; font-weight: 700; color: #262626; }
  .ed-empty-sub {
    font-size: 12.5px; color: #a3a3a3;
    max-width: 320px; line-height: 1.5;
  }

  /* ---------- REALTIME POPUP ---------- */
  .ed-realtime-popup {
    position: fixed; bottom: 24px; right: 24px;
    z-index: 1000;
    background: #ffffff; border-radius: 12px;
    padding: 14px 18px;
    display: flex; align-items: center; gap: 12px;
    max-width: 360px;
    box-shadow: 0 10px 25px -5px rgba(15,15,15,0.15), 0 0 0 1px #e5e5e5;
    animation: ed-slide-in 0.3s ease;
  }
  @keyframes ed-slide-in {
    from { transform: translateX(40px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .ed-popup-icon {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ed-popup-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ed-popup-text strong {
    font-size: 12.5px; color: #0f0f0f;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .ed-popup-text span {
    font-size: 12.5px; color: #525252;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 1px;
  }
  .ed-popup-text small { font-size: 10.5px; color: #a3a3a3; margin-top: 2px; }
  .ed-popup-close {
    background: transparent; border: none; cursor: pointer;
    color: #a3a3a3; padding: 4px; border-radius: 6px;
    display: flex; transition: all 0.15s ease;
  }
  .ed-popup-close:hover { background: #f5f5f5; color: #525252; }

  /* ---------- TOAST ---------- */
  .ed-toast {
    position: fixed; top: 24px; right: 24px;
    padding: 12px 18px; border-radius: 10px;
    color: #ffffff; font-size: 13px; font-weight: 600;
    z-index: 1100;
    box-shadow: 0 10px 25px -5px rgba(15,15,15,0.2);
    animation: ed-toast-in 0.25s ease;
  }
  .ed-toast-success { background: #0f0f0f; }
  .ed-toast-error { background: #dc2626; }
  @keyframes ed-toast-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ---------- MODAL ---------- */
  .ed-modal-overlay {
    position: fixed; inset: 0; background: rgba(15,15,15,0.5);
    backdrop-filter: blur(2px); display: flex; align-items: center;
    justify-content: center; padding: 16px; z-index: 1000;
  }
  .ed-modal {
    background: #ffffff; border-radius: 14px;
    width: 100%; max-width: 560px; max-height: 92vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.2);
    animation: ed-modal-in 0.2s ease;
  }
  @keyframes ed-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ed-modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 18px 22px; border-bottom: 1px solid #f0f0f0; gap: 12px;
  }
  .ed-modal-title { display: flex; align-items: center; gap: 10px; }
  .ed-modal-title svg { color: #737373; }
  .ed-modal-title h3 { font-size: 15px; font-weight: 700; color: #0f0f0f; margin: 0; }
  .ed-modal-close {
    background: transparent; border: none; cursor: pointer;
    color: #a3a3a3; padding: 6px; border-radius: 6px;
    display: flex; transition: all 0.15s ease;
  }
  .ed-modal-close:hover { background: #f5f5f5; color: #171717; }
  .ed-modal-body { padding: 20px 22px; overflow-y: auto; flex: 1; }
  .ed-modal-desc { font-size: 13px; color: #737373; margin: 0 0 16px 0; }
  .ed-modal-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 14px 22px; border-top: 1px solid #f0f0f0;
    background: #fafafa;
  }

  .ed-mini-stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 16px;
    padding: 14px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 10px;
  }
  .ed-mini-value {
    font-size: 18px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -0.3px;
  }
  .ed-mini-label {
    font-size: 10.5px; color: #737373; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    margin-top: 2px;
  }

  .ed-history-list { display: flex; flex-direction: column; gap: 6px; }
  .ed-history-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 9px;
  }
  .ed-history-subject {
    flex: 1; font-size: 12.5px; color: #262626;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ed-history-time { font-size: 11px; color: #a3a3a3; white-space: nowrap; }

  .ed-export-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ed-export-option {
    display: flex; align-items: center; gap: 12px;
    padding: 14px; background: #ffffff;
    border: 2px solid #e5e5e5; border-radius: 11px;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit; text-align: left;
  }
  .ed-export-option:hover { border-color: #d4d4d4; background: #fafafa; }
  .ed-export-option.active { border-color: #0f0f0f; background: #fafafa; }
  .ed-export-option svg { color: #525252; flex-shrink: 0; }
  .ed-export-title { font-size: 13px; font-weight: 700; color: #0f0f0f; }
  .ed-export-sub { font-size: 11px; color: #a3a3a3; margin-top: 1px; }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .ed-container { padding: 20px 16px 40px; }
    .ed-title { font-size: 22px; }
    .ed-header-actions { width: 100%; }
    .ed-header-actions .ed-btn { flex: 1; justify-content: center; }
    .ed-toolbar { flex-direction: column; align-items: stretch; }
    .ed-search, .ed-select { width: 100%; min-width: 0; }
    .ed-geo { grid-template-columns: 1fr auto; gap: 8px; }
    .ed-geo .ed-bar-track-sm { display: none; }
    .ed-table-wrap { margin: 0 -16px; padding: 0 16px; }
    .ed-export-options { grid-template-columns: 1fr; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .ed-skel {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .ed-skel::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: ed-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes ed-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .ed-skel-header {
    padding-bottom: 22px; border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
  }
  .ed-skel-title { width: 240px; height: 26px; }
  .ed-skel-subtitle { width: 320px; height: 13px; margin-top: 10px; }
  .ed-skel-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 10px; margin-bottom: 20px;
  }
  @media (max-width: 1024px) { .ed-skel-stats { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 720px) { .ed-skel-stats { grid-template-columns: repeat(2, 1fr); } }
  .ed-skel-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
  }
  .ed-skel-icon { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; }
  .ed-skel-line-md { height: 16px; border-radius: 4px; }
  .ed-skel-line-sm { height: 11px; border-radius: 4px; }
  .ed-skel-tabs {
    display: flex; gap: 4px; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .ed-skel-tab { width: 90px; height: 20px; border-radius: 4px; }
  .ed-skel-panel {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px;
  }
  .ed-skel-row {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 0; border-bottom: 1px solid #f5f5f5;
  }
  .ed-skel-row:last-child { border-bottom: none; }
  .ed-skel-dot { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; }
`;

const mainCSS = baseCSS;

