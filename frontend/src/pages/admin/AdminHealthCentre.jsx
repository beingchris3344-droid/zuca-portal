// frontend/src/pages/admin/AdminHealthCentre.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  FiActivity, FiServer, FiDatabase, FiAlertCircle, FiClock, FiUsers,
  FiUserCheck, FiLock, FiBarChart2, FiRefreshCw, FiDownload,
  FiTrash2, FiCpu, FiGlobe, FiMessageSquare, FiHardDrive,
  FiX, FiCheckCircle, FiLoader, FiEye, FiTrendingUp,
  FiShield, FiZap, FiMail, FiVideo
} from "react-icons/fi";

function AdminHealthCentre() {
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState(null);
  const [errors, setErrors] = useState([]);
  const [slowRequests, setSlowRequests] = useState([]);
  const [apiMetrics, setApiMetrics] = useState([]);
  const [pendingResets, setPendingResets] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketStatus, setSocketStatus] = useState(null);
  const [services, setServices] = useState(null);
  const [reports, setReports] = useState([]);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [recentLogins, setRecentLogins] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [storageMetrics, setStorageMetrics] = useState({
    totalSize: 0,
    usedSize: 0,
    freeSize: 0,
    percentUsed: 0,
    totalFiles: 0,
    images: 0,
    videos: 0,
    documents: 0
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [testingService, setTestingService] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [errorTrend, setErrorTrend] = useState([]);
  const [responseTimeTrend, setResponseTimeTrend] = useState([]);
  const [userActivityTrend, setUserActivityTrend] = useState([]);

  const getStatusColor = (status) => {
    if (status === 'healthy' || status === 'configured' || status === 'working') return '#10b981';
    if (status === 'degraded' || status === 'initializing') return '#f59e0b';
    if (status === 'down' || status === 'missing' || status === 'error') return '#ef4444';
    return '#6b7280';
  };

  const handleTestService = async (service) => {
    setTestingService(service);
    try {
      const token = localStorage.getItem("token");
      if (service === 'email') {
        await axios.post(`${BASE_URL}/api/admin/health/test-email`, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert("✅ Test email sent successfully");
      } else if (service === 'youtube') {
        const res = await axios.post(`${BASE_URL}/api/admin/health/test-youtube`, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert(res.data.message || "✅ YouTube API working");
      }
    } catch (error) {
      alert(`❌ Test failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setTestingService(null);
    }
  };

  const handleExportLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      window.open(`${BASE_URL}/api/admin/health/export-logs?token=${token}`, '_blank');
    } catch (error) {
      console.error("Error exporting logs:", error);
      alert("Failed to export logs");
    }
  };

  const handleClearErrors = async () => {
    if (window.confirm("Clear all error logs?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.get(`${BASE_URL}/api/admin/health/clear-errors`, { headers: { Authorization: `Bearer ${token}` } });
        fetchAllData();
      } catch (error) {
        console.error("Error clearing errors:", error);
      }
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/admin/health/reports/${reportId}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchAllData();
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const [
        systemRes, errorsRes, slowRes, metricsRes, resetsRes, 
        pendingRes, onlineRes, socketRes, servicesRes, reportsRes, 
        dbStatsRes, loginsRes, failedRes, storageRes
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/health/system`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/errors?limit=200`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/slow-requests?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/api-metrics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/pending-resets`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/pending-verifications`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/online-users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/socket-status`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/services`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/reports`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/database-stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/recent-logins`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/failed-logins`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/storage-metrics`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false } }))
      ]);
      
      setSystem(systemRes.data);
      setErrors(errorsRes.data.errors || []);
      setSlowRequests(slowRes.data.requests || []);
      setApiMetrics(metricsRes.data.endpoints || []);
      setPendingResets(resetsRes.data.resets || []);
      setPendingVerifications(pendingRes.data.pending || []);
      setOnlineUsers(onlineRes.data.users || []);
      setSocketStatus(socketRes.data);
      setServices(servicesRes.data.services);
      setReports(reportsRes.data.reports || []);
      setDatabaseStats(dbStatsRes.data.stats);
      setRecentLogins(loginsRes.data.logins || []);
      setFailedLogins(failedRes.data.attempts || []);
      
      if (storageRes.data.success) {
        setStorageMetrics(storageRes.data.metrics);
      }
      
      setLastUpdated(new Date());

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayErrors = (errorsRes.data.errors || []).filter(e => 
          new Date(e.timestamp).toISOString().split('T')[0] === dateStr
        );
        last7Days.push({
          date: dateStr,
          errors: dayErrors.length,
          status4xx: dayErrors.filter(e => e.statusCode >= 400 && e.statusCode < 500).length,
          status5xx: dayErrors.filter(e => e.statusCode >= 500).length
        });
      }
      setErrorTrend(last7Days);

      const responseData = (metricsRes.data.endpoints || []).slice(0, 10).map(m => ({
        name: m.endpoint.split('/').pop() || m.endpoint,
        avgTime: parseInt(m.avgTime),
        calls: m.count
      }));
      setResponseTimeTrend(responseData);

      const loginData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLogins = (loginsRes.data.logins || []).filter(l => 
          l.lastActive && new Date(l.lastActive).toISOString().split('T')[0] === dateStr
        );
        loginData.push({
          date: dateStr,
          logins: dayLogins.length
        });
      }
      setUserActivityTrend(loginData);

    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const healthScore = () => {
    let score = 100;
    if (errors.length > 50) score -= 20;
    else if (errors.length > 20) score -= 10;
    else if (errors.length > 5) score -= 5;
    if (slowRequests.length > 20) score -= 15;
    else if (slowRequests.length > 10) score -= 8;
    const downServices = services ? Object.values(services).filter(s => s.status === 'down').length : 0;
    score -= downServices * 10;
    return Math.max(0, Math.min(100, score));
  };

  const securityScore = () => {
    let score = 100;
    if (failedLogins.length > 20) score -= 20;
    else if (failedLogins.length > 10) score -= 10;
    else if (failedLogins.length > 5) score -= 5;
    return Math.max(0, Math.min(100, score));
  };

  const SkeletonCard = () => (
    <div style={styles.skeletonCard}>
      <div style={styles.skeletonIcon}></div>
      <div>
        <div style={styles.skeletonTitle}></div>
        <div style={styles.skeletonValue}></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={{ width: '200px', height: '32px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '8px' }}></div>
            <div style={{ width: '300px', height: '20px', background: '#e2e8f0', borderRadius: '8px' }}></div>
          </div>
        </div>
        <div style={styles.statsGrid}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div style={styles.chartsGrid}>
          {[...Array(2)].map((_, i) => (
            <div key={i} style={styles.skeletonChart}>
              <div style={{ width: '150px', height: '24px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '20px' }}></div>
              <div style={{ height: '200px', background: '#e2e8f0', borderRadius: '8px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏥 Health Centre</h1>
          <p style={styles.subtitle}>Real-time system monitoring and analytics</p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.lastUpdated}>
            <FiClock size={14} />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <button style={{ ...styles.autoBtn, background: autoRefresh ? '#10b981' : '#94a3b8' }} onClick={() => setAutoRefresh(!autoRefresh)}>
            <FiRefreshCw size={14} /> {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </button>
          <button style={styles.exportBtn} onClick={handleExportLogs}>
            <FiDownload size={14} /> Export
          </button>
          <button style={styles.clearBtn} onClick={handleClearErrors}>
            <FiTrash2 size={14} /> Clear Errors
          </button>
        </div>
      </div>

      <div style={styles.scoreGrid}>
        <div style={styles.healthScoreCard}>
          <div style={styles.healthScoreLeft}>
            <FiActivity size={48} color={healthScore() > 80 ? '#10b981' : healthScore() > 50 ? '#f59e0b' : '#ef4444'} />
            <div>
              <div style={styles.healthScoreLabel}>Overall System Health</div>
              <div style={styles.healthScoreValue}>{healthScore()}%</div>
            </div>
          </div>
          <div style={styles.healthScoreBar}>
            <div style={{ ...styles.healthScoreFill, width: `${healthScore()}%`, background: healthScore() > 80 ? '#10b981' : healthScore() > 50 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <div style={styles.healthScoreStats}>
            <div><FiCheckCircle color="#10b981" /> {Object.values(services || {}).filter(s => s.status === 'healthy' || s.status === 'configured').length} Services OK</div>
            <div><FiAlertCircle color="#f59e0b" /> {errors.length} Active Errors</div>
            <div><FiUsers color="#3b82f6" /> {onlineUsers.length} Online Users</div>
          </div>
        </div>

        <div style={styles.securityScoreCard}>
          <div style={styles.healthScoreLeft}>
            <FiShield size={48} color={securityScore() > 80 ? '#10b981' : securityScore() > 50 ? '#f59e0b' : '#ef4444'} />
            <div>
              <div style={styles.healthScoreLabel}>Security Posture</div>
              <div style={styles.healthScoreValue}>{securityScore()}%</div>
            </div>
          </div>
          <div style={styles.healthScoreBar}>
            <div style={{ ...styles.healthScoreFill, width: `${securityScore()}%`, background: securityScore() > 80 ? '#10b981' : securityScore() > 50 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <div style={styles.healthScoreStats}>
            <div><FiLock color="#3b82f6" /> {failedLogins.length} Failed Logins</div>
            <div><FiAlertCircle color="#f59e0b" /> {pendingResets.length} Pending Resets</div>
            <div><FiUserCheck color="#10b981" /> {pendingVerifications.length} Unverified</div>
          </div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiServer /></div>
          <div>
            <div style={styles.statLabel}>Uptime</div>
            <div style={styles.statValue}>{system?.uptime?.formatted || '0d'}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiCpu /></div>
          <div>
            <div style={styles.statLabel}>Memory Usage</div>
            <div style={styles.statValue}>{system?.memory?.percentUsed || 0}%</div>
            <div style={styles.statTrend}>{formatBytes(system?.memory?.used || 0)} / {formatBytes(system?.memory?.total || 0)}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiAlertCircle /></div>
          <div>
            <div style={styles.statLabel}>Total Errors</div>
            <div style={styles.statValue}>{errors.length}</div>
            <div style={styles.statTrend}>{errors.filter(e => e.statusCode >= 500).length} Server Errors</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiUsers /></div>
          <div>
            <div style={styles.statLabel}>Online Users</div>
            <div style={styles.statValue}>{onlineUsers.length}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiDatabase /></div>
          <div>
            <div style={styles.statLabel}>Total Requests</div>
            <div style={styles.statValue}>{system?.requests?.total?.toLocaleString() || 0}</div>
            <div style={styles.statTrend}>{slowRequests.length} Slow Requests</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiMessageSquare /></div>
          <div>
            <div style={styles.statLabel}>Socket Users</div>
            <div style={styles.statValue}>{socketStatus?.connectedUsers || 0}</div>
          </div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3><FiTrendingUp /> Error Trends (Last 7 Days)</h3>
            <div style={styles.legend}>
              <span><span style={{ background: '#ef4444' }}></span> 5xx Errors</span>
              <span><span style={{ background: '#f59e0b' }}></span> 4xx Errors</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={errorTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area type="monotone" dataKey="status5xx" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              <Area type="monotone" dataKey="status4xx" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3><FiBarChart2 /> Slowest API Endpoints</h3>
            <span>Avg Response Time (ms)</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={responseTimeTrend} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" width={120} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="avgTime" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3><FiUserCheck /> User Activity (Last 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={userActivityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area type="monotone" dataKey="logins" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3><FiGlobe /> Service Status</h3>
            <button style={styles.refreshBtn} onClick={fetchAllData}><FiRefreshCw size={14} /> Refresh</button>
          </div>
          <div style={styles.servicesGrid}>
            {services && Object.entries(services).map(([name, status]) => (
              <div key={name} style={styles.serviceCard}>
                <div style={{ ...styles.serviceDot, backgroundColor: getStatusColor(status.status) }} />
                <div style={styles.serviceName}>{name}</div>
                <div style={{ ...styles.serviceStatus, color: getStatusColor(status.status) }}>{status.status}</div>
                {(name === 'email' || name === 'youtube') && (
                  <button style={styles.testBtn} onClick={() => handleTestService(name)} disabled={testingService === name}>
                    {testingService === name ? <FiLoader size={12} /> : 'Test'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.storageGrid}>
        <div style={styles.storageCard}>
          <div style={styles.storageIcon}><FiHardDrive /></div>
          <div style={styles.storageValue}>{storageMetrics.percentUsed.toFixed(1)}%</div>
          <div style={styles.storageLabel}>Storage Used</div>
          <div style={styles.storageBar}>
            <div style={{ width: `${storageMetrics.percentUsed}%`, height: '8px', background: storageMetrics.percentUsed > 90 ? '#ef4444' : '#3b82f6', borderRadius: '4px' }} />
          </div>
          <div style={styles.storageDetails}>
            <span>{formatBytes(storageMetrics.usedSize)}</span>
            <span>of {formatBytes(storageMetrics.totalSize)}</span>
          </div>
        </div>
        <div style={styles.storageCard}>
          <div style={styles.storageIcon}><FiDatabase /></div>
          <div style={styles.storageValue}>{storageMetrics.totalFiles}</div>
          <div style={styles.storageLabel}>Total Files</div>
          <div style={styles.storageTypes}>
            <span>🖼️ {storageMetrics.images} Images</span>
            <span>🎬 {storageMetrics.videos} Videos</span>
            <span>📄 {storageMetrics.documents} Docs</span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2><FiLock /> User Issues</h2>
        </div>
        <div style={styles.userIssuesGrid}>
          <div style={styles.issueCard}>
            <div style={styles.issueIcon}><FiLock /></div>
            <div>
              <div style={styles.issueTitle}>Password Reset Requests</div>
              <div style={styles.issueNumber}>{pendingResets.length}</div>
              {pendingResets.slice(0, 3).map((reset, idx) => (
                <div key={idx} style={styles.issueItem}>{reset.email}</div>
              ))}
            </div>
          </div>
          <div style={styles.issueCard}>
            <div style={styles.issueIcon}><FiMail /></div>
            <div>
              <div style={styles.issueTitle}>Pending Verifications</div>
              <div style={styles.issueNumber}>{pendingVerifications.length}</div>
              {pendingVerifications.slice(0, 3).map((pending, idx) => (
                <div key={idx} style={styles.issueItem}>{pending.email}</div>
              ))}
            </div>
          </div>
          <div style={styles.issueCard}>
            <div style={styles.issueIcon}><FiShield /></div>
            <div>
              <div style={styles.issueTitle}>Failed Login Attempts</div>
              <div style={styles.issueNumber}>{failedLogins.length}</div>
              {failedLogins.slice(0, 3).map((fail, idx) => (
                <div key={idx} style={styles.issueItem}>{fail.email}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2><FiAlertCircle /> Recent Errors</h2>
          <span style={styles.badge}>{errors.length} Total</span>
        </div>
        <div style={styles.errorList}>
          {errors.length === 0 ? (
            <div style={styles.emptyState}>✅ No errors recorded - System is healthy!</div>
          ) : (
            errors.slice(0, 20).map((error, idx) => (
              <div key={idx} style={styles.errorItem} onClick={() => { setSelectedError(error); setShowErrorModal(true); }}>
                <div style={styles.errorTime}>{new Date(error.timestamp).toLocaleString()}</div>
                <div style={{ ...styles.errorStatus, backgroundColor: error.statusCode >= 500 ? '#ef4444' : '#f59e0b' }}>{error.statusCode}</div>
                <div style={styles.errorEndpoint}>{error.endpoint}</div>
                <div style={styles.errorUser}>{error.userId || 'anonymous'}</div>
                <FiEye style={{ color: '#94a3b8', cursor: 'pointer' }} />
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2><FiClock /> Slow Requests ({'>2s'})</h2>
          <span style={styles.badge}>{slowRequests.length}</span>
        </div>
        <div style={styles.slowList}>
          {slowRequests.length === 0 ? (
            <div style={styles.emptyState}>✅ No slow requests detected</div>
          ) : (
            slowRequests.slice(0, 10).map((req, idx) => (
              <div key={idx} style={styles.slowItem}>
                <div style={styles.slowDuration}>{req.duration}ms</div>
                <div style={styles.slowEndpoint}>{req.endpoint}</div>
                <div style={styles.slowUser}>{req.userId || 'anonymous'}</div>
                <div style={styles.slowTime}>{new Date(req.timestamp).toLocaleTimeString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2><FiEye /> User Reports</h2>
        </div>
        <div style={styles.reportsList}>
          {reports.length === 0 ? (
            <div style={styles.emptyState}>📭 No user reports</div>
          ) : (
            reports.slice(0, 10).map((report) => (
              <div key={report.id} style={styles.reportItem}>
                <div style={{ ...styles.reportSeverity, backgroundColor: report.severity === 'critical' ? '#ef4444' : report.severity === 'high' ? '#f97316' : '#f59e0b' }} />
                <div style={styles.reportContent}>
                  <div style={styles.reportTitle}>{report.title}</div>
                  <div style={styles.reportDescription}>{report.description}</div>
                  <div style={styles.reportMeta}>
                    <span>📅 {new Date(report.createdAt).toLocaleString()}</span>
                    <span>👤 {report.userName || report.userId}</span>
                  </div>
                </div>
                {report.status === 'pending' && (
                  <button style={styles.resolveBtn} onClick={() => handleResolveReport(report.id)}>Resolve</button>
                )}
                {report.status === 'resolved' && <FiCheckCircle style={styles.resolvedIcon} />}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2><FiDatabase /> Database Statistics</h2>
        </div>
        <div style={styles.dbStatsGrid}>
          {databaseStats && Object.entries(databaseStats).map(([key, value]) => (
            <div key={key} style={styles.dbStatCard}>
              <div style={styles.dbStatValue}>{value.toLocaleString()}</div>
              <div style={styles.dbStatLabel}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2><FiUserCheck /> Recent User Activity</h2>
        </div>
        <div style={styles.loginsList}>
          {recentLogins.slice(0, 10).map((login, idx) => (
            <div key={idx} style={styles.loginItem}>
              <div>
                <div style={styles.loginName}>{login.fullName}</div>
                <div style={styles.loginEmail}>{login.email}</div>
              </div>
              <div style={styles.loginRole}>{login.role}</div>
              <div style={styles.loginTime}>{new Date(login.lastActive).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {showErrorModal && selectedError && (
        <div style={styles.modalOverlay} onClick={() => setShowErrorModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>🔍 Error Details</h3>
              <button style={styles.modalClose} onClick={() => setShowErrorModal(false)}><FiX /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Status:</span><span style={{ ...styles.modalValue, color: selectedError.statusCode >= 500 ? '#ef4444' : '#f59e0b' }}>{selectedError.statusCode}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Endpoint:</span><span style={styles.modalValue}>{selectedError.endpoint}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Method:</span><span style={styles.modalValue}>{selectedError.method}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Message:</span><span style={styles.modalValue}>{selectedError.message}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Time:</span><span style={styles.modalValue}>{new Date(selectedError.timestamp).toLocaleString()}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>User:</span><span style={styles.modalValue}>{selectedError.userId || 'anonymous'}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>IP:</span><span style={styles.modalValue}>{selectedError.ip || 'unknown'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  lastUpdated: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px' },
  autoBtn: { padding: '8px 16px', borderRadius: '10px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
  exportBtn: { padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
  clearBtn: { padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
  scoreGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' },
  healthScoreCard: { background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  securityScoreCard: { background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  healthScoreLeft: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  healthScoreLabel: { fontSize: '14px', color: '#64748b' },
  healthScoreValue: { fontSize: '32px', fontWeight: '800', color: '#1e293b' },
  healthScoreBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' },
  healthScoreFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  healthScoreStats: { display: 'flex', gap: '24px', fontSize: '13px', color: '#475569', flexWrap: 'wrap' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: 'white', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  statIcon: { fontSize: '32px', color: '#3b82f6' },
  statLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#1e293b' },
  statTrend: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' },
  chartCard: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  legend: { display: 'flex', gap: '16px', fontSize: '12px' },
  section: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  badge: { background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: '#475569' },
  refreshBtn: { background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  servicesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' },
  serviceCard: { background: '#f8fafc', borderRadius: '12px', padding: '16px', position: 'relative', border: '1px solid #e2e8f0' },
  serviceDot: { width: '10px', height: '10px', borderRadius: '50%', position: 'absolute', top: '16px', right: '16px' },
  serviceName: { fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#1e293b' },
  serviceStatus: { fontSize: '12px', textTransform: 'capitalize', marginBottom: '10px' },
  testBtn: { background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontSize: '10px' },
  storageGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' },
  storageCard: { background: 'white', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '1px solid #e2e8f0' },
  storageIcon: { fontSize: '32px', color: '#3b82f6', marginBottom: '12px' },
  storageValue: { fontSize: '32px', fontWeight: '700', color: '#1e293b' },
  storageLabel: { fontSize: '12px', color: '#64748b', marginBottom: '12px' },
  storageBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  storageDetails: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' },
  storageTypes: { display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '11px', color: '#64748b', marginTop: '12px', flexWrap: 'wrap' },
  userIssuesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  issueCard: { background: '#f8fafc', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', border: '1px solid #e2e8f0' },
  issueIcon: { fontSize: '24px' },
  issueTitle: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  issueNumber: { fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' },
  issueItem: { fontSize: '11px', color: '#94a3b8', padding: '2px 0' },
  errorList: { maxHeight: '400px', overflowY: 'auto' },
  errorItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px' },
  errorTime: { width: '160px', fontSize: '12px', color: '#64748b' },
  errorStatus: { width: '45px', padding: '2px 8px', borderRadius: '6px', textAlign: 'center', color: 'white', fontWeight: '600', fontSize: '12px' },
  errorEndpoint: { flex: 1, color: '#1e293b', fontFamily: 'monospace', fontSize: '12px' },
  errorUser: { width: '100px', fontSize: '12px', color: '#64748b' },
  slowList: { maxHeight: '300px', overflowY: 'auto' },
  slowItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' },
  slowDuration: { width: '70px', color: '#ef4444', fontWeight: '600' },
  slowEndpoint: { flex: 1, color: '#1e293b', fontFamily: 'monospace', fontSize: '12px' },
  slowUser: { width: '120px', color: '#64748b', fontSize: '12px' },
  slowTime: { width: '100px', color: '#94a3b8', fontSize: '11px' },
  reportsList: { maxHeight: '300px', overflowY: 'auto' },
  reportItem: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', borderBottom: '1px solid #e2e8f0' },
  reportSeverity: { width: '6px', height: '50px', borderRadius: '3px' },
  reportContent: { flex: 1 },
  reportTitle: { fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' },
  reportDescription: { fontSize: '12px', color: '#64748b', marginBottom: '6px' },
  reportMeta: { display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8' },
  resolveBtn: { background: '#10b981', border: 'none', padding: '5px 12px', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: '500' },
  resolvedIcon: { color: '#10b981', fontSize: '20px' },
  dbStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px' },
  dbStatCard: { background: '#f8fafc', textAlign: 'center', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  dbStatValue: { fontSize: '24px', fontWeight: '700', color: '#3b82f6' },
  dbStatLabel: { fontSize: '10px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' },
  loginsList: { maxHeight: '300px', overflowY: 'auto' },
  loginItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0' },
  loginName: { fontSize: '14px', fontWeight: '500', color: '#1e293b' },
  loginEmail: { fontSize: '12px', color: '#64748b' },
  loginRole: { fontSize: '11px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', color: '#475569' },
  loginTime: { fontSize: '11px', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '20px', width: '550px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0' },
  modalClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' },
  modalBody: { padding: '20px' },
  modalRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
  modalLabel: { fontWeight: '600', color: '#64748b' },
  modalValue: { color: '#1e293b', fontFamily: 'monospace', fontSize: '13px' },
  skeletonCard: { background: 'white', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0' },
  skeletonIcon: { width: '48px', height: '48px', background: '#e2e8f0', borderRadius: '12px' },
  skeletonTitle: { width: '80px', height: '14px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' },
  skeletonValue: { width: '60px', height: '28px', background: '#e2e8f0', borderRadius: '6px' },
  skeletonChart: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }
};

export default AdminHealthCentre;