// frontend/src/pages/admin/AdminHealthCentre.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FiActivity, FiServer, FiDatabase, FiAlertCircle, FiClock, FiUsers,
  FiUserCheck, FiLock, FiBarChart2, FiRefreshCw, FiDownload,
  FiTrash2, FiCpu, FiGlobe, FiMessageSquare, FiHardDrive,
  FiX, FiCheckCircle, FiLoader, FiEye, FiTrendingUp,
  FiShield, FiMail, FiSettings, FiChevronRight,
  FiExternalLink, FiCloud, FiTerminal, FiPlus, FiEdit2, FiSave,
  FiLink, FiCalendar, FiUser,
} from "react-icons/fi";

const EMPTY_METRICS = {
  totalSize: 0,
  usedSize: 0,
  freeSize: 0,
  percentUsed: 0,
  totalFiles: 0,
  images: 0,
  videos: 0,
  documents: 0,
};

/* ============================================================
   Developer services — icon helpers
   ============================================================ */
const DEV_ICON_MAP = {
  terminal: <FiTerminal size={20} />,
  mail: <FiMail size={20} />,
  globe: <FiGlobe size={20} />,
  clock: <FiClock size={20} />,
  database: <FiDatabase size={20} />,
  cloud: <FiCloud size={20} />,
  shield: <FiShield size={20} />,
  server: <FiServer size={20} />,
  link: <FiLink size={20} />,
};

const DEV_ICON_CHOICES = [
  "terminal", "mail", "globe", "clock",
  "database", "cloud", "shield", "server", "link",
];

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
  const [storageMetrics, setStorageMetrics] = useState(EMPTY_METRICS);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [testingService, setTestingService] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  const [errorTrend, setErrorTrend] = useState([]);
  const [responseTimeTrend, setResponseTimeTrend] = useState([]);

  /* ============================================================
     Developer Services state
     ============================================================ */
  const [devServices, setDevServices] = useState([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState(null);

  const [showDevModal, setShowDevModal] = useState(false);
  const [editingDevSlug, setEditingDevSlug] = useState(null);
  const [devForm, setDevForm] = useState({
    slug: "",
    name: "",
    description: "",
    url: "",
    docsUrl: "",
    icon: "terminal",
    category: "",
    isPrimary: false,
    sortOrder: 0,
    loginEmail: "",
    vaultUrl: "",
    lastRotated: "",
    notes: "",
  });

  const [savingDev, setSavingDev] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [deletingDevSlug, setDeletingDevSlug] = useState(null);

  const notesDebounceRef = useRef({});

  /* ============================================================
     Core helpers (existing)
     ============================================================ */
  const getStatusColor = (status) => {
    if (status === "healthy" || status === "configured" || status === "working") return "#16a34a";
    if (status === "degraded" || status === "initializing") return "#d97706";
    if (status === "down" || status === "missing" || status === "error") return "#dc2626";
    return "#94a3b8";
  };

  const getStatusLabel = (status) => {
    const labels = {
      healthy: "Healthy",
      configured: "Configured",
      working: "Working",
      degraded: "Degraded",
      initializing: "Initializing",
      down: "Down",
      missing: "Missing",
      error: "Error",
    };
    return labels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown");
  };

  const openService = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ============================================================
     Existing handlers
     ============================================================ */
  const handleTestService = async (service) => {
    setTestingService(service);
    try {
      const token = localStorage.getItem("token");
      if (service === "email") {
        await axios.post(
          `${BASE_URL}/api/admin/health/test-email`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Test email sent successfully.");
      } else if (service === "youtube") {
        const res = await axios.post(
          `${BASE_URL}/api/admin/health/test-youtube`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert(res.data.message || "YouTube API responded successfully.");
      }
    } catch (error) {
      alert(`Test failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setTestingService(null);
    }
  };

  const getUserDisplay = (userId) => {
    if (!userId) return "Unknown user";
    const onlineUser = onlineUsers.find((u) => u.id === userId);
    if (onlineUser) return onlineUser.fullName || onlineUser.email || userId;
    const loginUser = recentLogins.find((u) => u.id === userId);
    if (loginUser) return loginUser.fullName || loginUser.email || userId;
    return userId;
  };

  const handleExportLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/admin/health/export-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const data = await response.json();

      const calculateHealthScore = () => {
        let score = 100;
        const errorCount = data.errors?.length || 0;
        const slowCount = data.slowRequests?.length || 0;
        if (errorCount > 50) score -= 20;
        else if (errorCount > 20) score -= 10;
        else if (errorCount > 5) score -= 5;
        if (slowCount > 20) score -= 15;
        else if (slowCount > 10) score -= 8;
        else if (slowCount > 5) score -= 3;
        return Math.max(0, Math.min(100, score));
      };

      const score = calculateHealthScore();
      const statusClass = score > 80 ? "good" : score > 50 ? "warn" : "bad";
      const statusText =
        score > 80
          ? "System is healthy"
          : score > 50
          ? "System is degraded"
          : "System needs attention";

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>ZUCA System Health Report</title>
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                padding: 40px; max-width: 1200px; margin: 0 auto;
                color: #1e293b; background: #ffffff;
              }
              .header {
                border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;
                display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
              }
              h1 { font-size: 26px; margin: 0; color: #1e293b; }
              .subtitle { font-size: 13px; color: #64748b; margin: 5px 0 0 0; }
              .meta { text-align: right; font-size: 13px; color: #64748b; }
              .section {
                background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0;
                border: 1px solid #e2e8f0; page-break-inside: avoid;
              }
              .section-title { font-size: 17px; font-weight: 600; margin: 0 0 15px 0; }
              .summary-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 15px 0;
              }
              .summary-item {
                background: white; padding: 16px; border-radius: 10px;
                text-align: center; border: 1px solid #e2e8f0;
              }
              .summary-value { font-size: 26px; font-weight: 700; color: #1e293b; }
              .summary-label { font-size: 12px; color: #64748b; margin-top: 4px; }
              .summary-value.green { color: #10b981; }
              .summary-value.red { color: #ef4444; }
              .summary-value.orange { color: #f59e0b; }
              .summary-value.blue { color: #3b82f6; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              th { background: #1e293b; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
              td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
              tr:nth-child(even) { background: #f1f5f9; }
              .error-code { color: #ef4444; font-weight: 700; font-family: monospace; }
              .timestamp { color: #64748b; font-size: 12px; }
              .footer {
                margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;
                text-align: center; color: #94a3b8; font-size: 12px;
              }
              .health-status {
                text-align: center; font-size: 14px; margin-top: 10px;
                padding: 10px; border-radius: 8px;
              }
              .health-status.good { background: #dcfce7; color: #16a34a; }
              .health-status.warn { background: #fef3c7; color: #d97706; }
              .health-status.bad { background: #fef2f2; color: #dc2626; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
              .badge-error { background: #fef2f2; color: #dc2626; }
              @media print { body { padding: 20px; } .section { break-inside: avoid; } }
              @media (max-width: 768px) {
                .summary-grid { grid-template-columns: repeat(2, 1fr); }
                table { font-size: 11px; }
                td, th { padding: 6px 8px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>ZUCA Backend Health Report</h1>
                <p class="subtitle">System Health Report &bull; ${new Date(data.exportedAt).toLocaleDateString()}</p>
              </div>
              <div class="meta">
                <div><strong>Generated:</strong> ${new Date(data.exportedAt).toLocaleString()}</div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Executive Summary</h2>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-value ${(data.errors?.length || 0) > 0 ? "red" : "green"}">${data.errors?.length || 0}</div>
                  <div class="summary-label">Total Errors</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value ${(data.slowRequests?.length || 0) > 5 ? "orange" : "green"}">${data.slowRequests?.length || 0}</div>
                  <div class="summary-label">Slow Requests</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value blue">${data.system?.requestCount || 0}</div>
                  <div class="summary-label">Total Requests</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value green">${data.system?.uptime ? Math.floor(data.system.uptime / 3600) + "h" : "N/A"}</div>
                  <div class="summary-label">System Uptime</div>
                </div>
              </div>
              <div class="health-status ${statusClass}">
                Health Score: <strong>${score}%</strong> &mdash; ${statusText}
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">System Information</h2>
              <table>
                <tr><td><strong>Uptime</strong></td><td>${Math.floor((data.system?.uptime || 0) / 3600)} hours ${Math.floor(((data.system?.uptime || 0) % 3600) / 60)} minutes</td></tr>
                <tr><td><strong>Total Requests</strong></td><td>${(data.system?.requestCount || 0).toLocaleString()}</td></tr>
                <tr><td><strong>Error Count</strong></td><td>${data.system?.errorCount || 0}</td></tr>
                <tr><td><strong>Health Score</strong></td><td>${score}%</td></tr>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">Error Log (${data.errors?.length || 0})</h2>
              ${
                !data.errors?.length
                  ? '<p style="color: #10b981; font-weight: 600;">No errors recorded.</p>'
                  : `<table><thead><tr><th>Time</th><th>Status</th><th>Endpoint</th><th>Method</th><th>User</th></tr></thead><tbody>
                    ${data.errors
                      .map(
                        (e) => `<tr>
                          <td class="timestamp">${new Date(e.timestamp).toLocaleString()}</td>
                          <td><span class="error-code">${e.statusCode ?? ""}</span></td>
                          <td>${e.endpoint || ""}</td>
                          <td>${e.method || ""}</td>
                          <td>${getUserDisplay(e.userId)}</td>
                        </tr>`
                      )
                      .join("")}
                  </tbody></table>`
              }
            </div>

            <div class="section">
              <h2 class="section-title">Slow Requests (${data.slowRequests?.length || 0})</h2>
              ${
                !data.slowRequests?.length
                  ? '<p style="color: #10b981; font-weight: 600;">No slow requests detected.</p>'
                  : `<table><thead><tr><th>Duration</th><th>Endpoint</th><th>Method</th><th>User</th><th>Time</th></tr></thead><tbody>
                    ${data.slowRequests
                      .map(
                        (r) => `<tr>
                          <td><strong style="color: #ef4444;">${r.duration}ms</strong></td>
                          <td>${r.endpoint || ""}</td>
                          <td>${r.method || ""}</td>
                          <td>${getUserDisplay(r.userId)}</td>
                          <td class="timestamp">${new Date(r.timestamp).toLocaleTimeString()}</td>
                        </tr>`
                      )
                      .join("")}
                  </tbody></table>`
              }
            </div>

            <div class="section">
              <h2 class="section-title">Security Events (${data.maliciousRequests?.length || 0})</h2>
              ${
                !data.maliciousRequests?.length
                  ? '<p style="color: #10b981; font-weight: 600;">No security threats detected.</p>'
                  : `<table><thead><tr><th>Time</th><th>IP</th><th>Type</th><th>Endpoint</th></tr></thead><tbody>
                    ${data.maliciousRequests
                      .map(
                        (r) => `<tr>
                          <td class="timestamp">${new Date(r.timestamp).toLocaleString()}</td>
                          <td>${r.ip || ""}</td>
                          <td><span class="badge badge-error">${r.type || ""}</span></td>
                          <td>${r.endpoint || ""}</td>
                        </tr>`
                      )
                      .join("")}
                  </tbody></table>`
              }
            </div>

            <div class="section">
              <h2 class="section-title">API Endpoint Performance</h2>
              ${
                !data.apiEndpoints?.length
                  ? '<p style="color: #64748b;">No API metrics available.</p>'
                  : `<table><thead><tr><th>Endpoint</th><th>Calls</th><th>Avg Time (ms)</th><th>Slowest (ms)</th></tr></thead><tbody>
                    ${data.apiEndpoints
                      .filter((a) => a.endpoint && a.endpoint.trim() !== "")
                      .slice(0, 20)
                      .map(
                        (a) => `<tr>
                          <td><code style="font-size: 11px;">${a.endpoint}</code></td>
                          <td style="text-align: center;">${a.count ?? 0}</td>
                          <td style="text-align: center;">${a.avgTime ?? ""}</td>
                          <td style="text-align: center; color: ${a.slowest > 2000 ? "#ef4444" : "#10b981"};">${a.slowest ?? ""}</td>
                        </tr>`
                      )
                      .join("")}
                  </tbody></table>`
              }
            </div>

            <div class="footer">
              <p>ZUCA System Health Report &bull; Generated ${new Date(data.exportedAt).toLocaleString()}</p>
              <p style="margin-top: 8px; font-size: 10px; color: #cbd5e1;">Confidential - for authorised administrators only</p>
            </div>

            <script>window.onload = function () { setTimeout(function () { window.print(); }, 800); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Error exporting logs:", error);
      alert("Failed to export logs. Please try again.");
    }
  };

  const handleClearErrors = async () => {
    if (!window.confirm("Clear all error logs?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.get(`${BASE_URL}/api/admin/health/clear-errors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllData();
    } catch (error) {
      console.error("Error clearing errors:", error);
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BASE_URL}/api/admin/health/reports/${reportId}/resolve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAllData();
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [
        systemRes, errorsRes, slowRes, metricsRes, resetsRes,
        pendingRes, onlineRes, socketRes, servicesRes, reportsRes,
        dbStatsRes, loginsRes, failedRes, storageRes,
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/health/system`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/errors?limit=200`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/slow-requests?limit=50`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/api-metrics`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/pending-resets`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/pending-verifications`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/online-users`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/socket-status`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/services`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/reports`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/database-stats`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/recent-logins`, { headers }),
        axios.get(`${BASE_URL}/api/admin/health/failed-logins`, { headers }),
        axios
          .get(`${BASE_URL}/api/admin/health/storage-metrics`, { headers })
          .catch(() => ({ data: { success: false } })),
      ]);

      setSystem(systemRes.data);
      setErrors(errorsRes.data.errors || []);
      setSlowRequests(slowRes.data.requests || []);
      setApiMetrics(metricsRes.data.endpoints || []);
      setPendingResets(resetsRes.data.resets || []);
      setPendingVerifications(pendingRes.data.pending || []);
      setOnlineUsers(onlineRes.data.users || []);
      setSocketStatus(socketRes.data);
      setServices(servicesRes.data.services || null);
      setReports(reportsRes.data.reports || []);
      setDatabaseStats(dbStatsRes.data.stats || null);
      setRecentLogins(loginsRes.data.logins || []);
      setFailedLogins(failedRes.data.attempts || []);

      if (storageRes.data.success && storageRes.data.metrics) {
        setStorageMetrics({ ...EMPTY_METRICS, ...storageRes.data.metrics });
      } else {
        setStorageMetrics(EMPTY_METRICS);
      }

      setLastUpdated(new Date());

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayErrors = (errorsRes.data.errors || []).filter(
          (e) => new Date(e.timestamp).toISOString().split("T")[0] === dateStr
        );
        last7Days.push({
          date: dateStr,
          errors: dayErrors.length,
          status4xx: dayErrors.filter((e) => e.statusCode >= 400 && e.statusCode < 500).length,
          status5xx: dayErrors.filter((e) => e.statusCode >= 500).length,
        });
      }
      setErrorTrend(last7Days);

      const responseData = (metricsRes.data.endpoints || [])
        .filter((m) => m.endpoint)
        .slice(0, 10)
        .map((m) => ({
          name: m.endpoint.split("/").pop() || m.endpoint,
          avgTime: parseInt(m.avgTime) || 0,
          calls: m.count || 0,
        }));
      setResponseTimeTrend(responseData);
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     Developer Services: fetch
     ============================================================ */
  const fetchDevServices = async () => {
    try {
      setDevLoading(true);
      setDevError(null);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/admin/developer-services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevServices(res.data.services || []);
    } catch (err) {
      console.error("Failed to load developer services:", err);
      setDevError(err.response?.data?.error || "Failed to load services");
    } finally {
      setDevLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "developers" && devServices.length === 0 && !devLoading) {
      fetchDevServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  /* ============================================================
     Developer Services: modal handlers
     ============================================================ */
  const openCreateDev = () => {
    setEditingDevSlug(null);
    setDevForm({
      slug: "",
      name: "",
      description: "",
      url: "",
      docsUrl: "",
      icon: "terminal",
      category: "",
      isPrimary: false,
      sortOrder: devServices.length + 1,
      loginEmail: "",
      vaultUrl: "",
      lastRotated: "",
      notes: "",
    });
    setShowDevModal(true);
  };

  const openEditDev = (service) => {
    setEditingDevSlug(service.slug);
    setDevForm({
      slug: service.slug || "",
      name: service.name || "",
      description: service.description || "",
      url: service.url || "",
      docsUrl: service.docsUrl || "",
      icon: service.icon || "terminal",
      category: service.category || "",
      isPrimary: !!service.isPrimary,
      sortOrder: service.sortOrder ?? 0,
      loginEmail: service.loginEmail || "",
      vaultUrl: service.vaultUrl || "",
      lastRotated: service.lastRotated
        ? String(service.lastRotated).slice(0, 10)
        : "",
      notes: service.notes || "",
    });
    setShowDevModal(true);
  };

  const handleSaveDev = async () => {
    if (!devForm.name.trim()) return alert("Name is required");
    if (!devForm.url.trim()) return alert("URL is required");
    if (!editingDevSlug && !devForm.slug.trim()) {
      return alert("ID is required (short slug like 'brevo')");
    }

    setSavingDev(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editingDevSlug) {
        const res = await axios.put(
          `${BASE_URL}/api/admin/developer-services/${editingDevSlug}`,
          devForm,
          { headers }
        );
        setDevServices((prev) =>
          prev.map((s) => (s.slug === editingDevSlug ? res.data.service : s))
        );
      } else {
        const res = await axios.post(
          `${BASE_URL}/api/admin/developer-services`,
          devForm,
          { headers }
        );
        setDevServices((prev) => [...prev, res.data.service]);
      }

      setShowDevModal(false);
      setEditingDevSlug(null);
    } catch (err) {
      console.error("Failed to save service:", err);
      alert(err.response?.data?.error || "Failed to save service");
    } finally {
      setSavingDev(false);
    }
  };

  const handleDeleteDev = async (slug) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    setDeletingDevSlug(slug);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/admin/developer-services/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevServices((prev) => prev.filter((s) => s.slug !== slug));
    } catch (err) {
      console.error("Failed to delete service:", err);
      alert("Failed to delete service");
    } finally {
      setDeletingDevSlug(null);
    }
  };

  /* ============================================================
     Developer Services: inline notes auto-save (debounced)
     ============================================================ */
  const handleNotesChange = (service, newNotes) => {
    // Optimistic local update
    setDevServices((prev) =>
      prev.map((s) => (s.slug === service.slug ? { ...s, notes: newNotes } : s))
    );

    // Clear any pending debounce for this service
    if (notesDebounceRef.current[service.slug]) {
      clearTimeout(notesDebounceRef.current[service.slug]);
    }

    // Schedule the PATCH 700ms after typing stops
    notesDebounceRef.current[service.slug] = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.patch(
          `${BASE_URL}/api/admin/developer-services/${service.slug}/notes`,
          { notes: newNotes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Reconcile with server response (updatedAt etc.)
        setDevServices((prev) =>
          prev.map((s) => (s.slug === service.slug ? res.data.service : s))
        );
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }, 700);
  };

  const handleSaveDevService = openEditDev; // alias for clarity in JSX
  const handleEditDevService = openEditDev; // alias

  /* ============================================================
     Scores
     ============================================================ */
  const healthScore = () => {
    let score = 100;
    if (errors.length > 50) score -= 20;
    else if (errors.length > 20) score -= 10;
    else if (errors.length > 5) score -= 5;
    if (slowRequests.length > 20) score -= 15;
    else if (slowRequests.length > 10) score -= 8;
    const downServices = services
      ? Object.values(services).filter((s) => s.status === "down").length
      : 0;
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

  const hasData = system !== null || errors.length > 0 || services !== null;

  /* ============================================================
     SKELETON LOADER
     ============================================================ */
  if (loading) {
    return (
      <div className="hc-page">
        <div className="hc-container">
          <div className="hc-skeleton-header">
            <div>
              <div className="hc-skeleton hc-skeleton-title" />
              <div className="hc-skeleton hc-skeleton-subtitle" />
            </div>
            <div className="hc-skeleton-actions">
              <div className="hc-skeleton hc-skeleton-pill" />
              <div className="hc-skeleton hc-skeleton-pill" />
              <div className="hc-skeleton hc-skeleton-pill" />
            </div>
          </div>

          <div className="hc-score-grid">
            {[0, 1].map((i) => (
              <div key={i} className="hc-skeleton-card-lg">
                <div className="hc-skeleton-row">
                  <div className="hc-skeleton hc-skeleton-circle-lg" />
                  <div style={{ flex: 1 }}>
                    <div className="hc-skeleton hc-skeleton-line-sm" />
                    <div className="hc-skeleton hc-skeleton-line-xl" style={{ marginTop: 6 }} />
                  </div>
                </div>
                <div className="hc-skeleton hc-skeleton-bar" />
              </div>
            ))}
          </div>

          <div className="hc-stats-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="hc-skeleton-card">
                <div className="hc-skeleton hc-skeleton-icon" />
                <div style={{ flex: 1 }}>
                  <div className="hc-skeleton hc-skeleton-line-sm" style={{ width: 60 }} />
                  <div className="hc-skeleton hc-skeleton-line-md" style={{ width: 80, marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="hc-charts-grid">
            {[0, 1].map((i) => (
              <div key={i} className="hc-skeleton-card-lg">
                <div className="hc-skeleton hc-skeleton-line-md" style={{ width: 180 }} />
                <div className="hc-skeleton hc-skeleton-chart" />
              </div>
            ))}
          </div>
        </div>

        <style>{skeletonCSS}</style>
      </div>
    );
  }

  /* ============================================================
     MAIN RENDER
     ============================================================ */
  return (
    <div className="hc-page">
      <div className="hc-container">
        {/* ============ HEADER ============ */}
        <header className="hc-header">
          <div className="hc-header-left">
            <div className="hc-header-eyebrow">
              <span className="hc-live-dot" />
              Live monitoring
            </div>
            <h1 className="hc-title">Backend Health</h1>
            <p className="hc-subtitle">
              Real-time infrastructure, security, and performance analytics
            </p>
          </div>

          <div className="hc-header-actions">
            <div className="hc-updated">
              <FiClock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <button
              className={`hc-btn ${autoRefresh ? "hc-btn-primary" : ""}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <FiRefreshCw size={13} className={autoRefresh ? "hc-spin-slow" : ""} />
              {autoRefresh ? "Auto ON" : "Auto OFF"}
            </button>
            <button className="hc-btn" onClick={handleExportLogs}>
              <FiDownload size={13} /> Export
            </button>
            <button className="hc-btn hc-btn-danger" onClick={handleClearErrors}>
              <FiTrash2 size={13} /> Clear
            </button>
          </div>
        </header>

        {!hasData && (
          <div className="hc-empty-banner">
            No health data available yet. Metrics will appear once the backend reports activity.
          </div>
        )}

        {/* ============ TABS ============ */}
        <nav className="hc-tabs">
          {[
            { id: "overview", label: "Overview", icon: <FiActivity size={14} /> },
            { id: "services", label: "Services", icon: <FiGlobe size={14} /> },
            { id: "logs", label: "Logs", icon: <FiAlertCircle size={14} />, badge: errors.length },
            { id: "data", label: "Data & Storage", icon: <FiDatabase size={14} /> },
            { id: "developers", label: "Developer Services", icon: <FiTerminal size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`hc-tab ${activeTab === tab.id ? "hc-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && <span className="hc-tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </nav>

        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === "overview" && (
          <>
            <div className="hc-score-grid">
              <ScoreCard
                title="System Health"
                score={healthScore()}
                icon={<FiActivity size={24} />}
                stats={[
                  `${
                    services
                      ? Object.values(services).filter(
                          (s) => s.status === "healthy" || s.status === "configured"
                        ).length
                      : 0
                  } services ok`,
                  `${errors.length} errors`,
                  `${onlineUsers.length} online`,
                ]}
              />
              <ScoreCard
                title="Security Posture"
                score={securityScore()}
                icon={<FiShield size={24} />}
                stats={[
                  `${failedLogins.length} failed`,
                  `${pendingResets.length} resets`,
                  `${pendingVerifications.length} pending`,
                ]}
              />
            </div>

            <div className="hc-stats-grid">
              <StatTile
                icon={<FiServer />}
                label="Uptime"
                value={system?.uptime?.formatted || "—"}
              />
              <StatTile
                icon={<FiCpu />}
                label="Memory"
                value={`${system?.memory?.percentUsed ?? 0}%`}
                sub={`${formatBytes(system?.memory?.used || 0)} / ${formatBytes(
                  system?.memory?.total || 0
                )}`}
              />
              <StatTile
                icon={<FiAlertCircle />}
                label="Errors"
                value={errors.length}
                tone={errors.length > 0 ? "danger" : "ok"}
              />
              <StatTile
                icon={<FiUsers />}
                label="Online"
                value={onlineUsers.length}
              />
              <StatTile
                icon={<FiDatabase />}
                label="Requests"
                value={(system?.requests?.total || 0).toLocaleString()}
                sub={`${slowRequests.length} slow`}
              />
              <StatTile
                icon={<FiMessageSquare />}
                label="Connections"
                value={socketStatus?.connectedUsers || 0}
              />
            </div>

            <div className="hc-charts-grid">
              <div className="hc-panel">
                <div className="hc-panel-header">
                  <div>
                    <h3>
                      <FiTrendingUp /> Error trends
                    </h3>
                    <p className="hc-panel-sub">Last 7 days</p>
                  </div>
                  <div className="hc-legend">
                    <span>
                      <span className="hc-dot hc-dot-red" /> 5xx
                    </span>
                    <span>
                      <span className="hc-dot hc-dot-amber" /> 4xx
                    </span>
                  </div>
                </div>
                {errorTrend.some((d) => d.status4xx || d.status5xx) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={errorTrend}>
                      <defs>
                        <linearGradient id="g5xx" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g4xx" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d97706" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#a3a3a3" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#a3a3a3" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 12 }} />
                      <Area type="monotone" dataKey="status5xx" stackId="1" stroke="#dc2626" strokeWidth={2} fill="url(#g5xx)" />
                      <Area type="monotone" dataKey="status4xx" stackId="1" stroke="#d97706" strokeWidth={2} fill="url(#g4xx)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="hc-empty">No errors recorded in the last 7 days.</div>
                )}
              </div>

              <div className="hc-panel">
                <div className="hc-panel-header">
                  <div>
                    <h3>
                      <FiBarChart2 /> Slowest endpoints
                    </h3>
                    <p className="hc-panel-sub">Avg response time (ms)</p>
                  </div>
                </div>
                {responseTimeTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={responseTimeTrend} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" stroke="#a3a3a3" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={90} stroke="#a3a3a3" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 12 }} />
                      <Bar dataKey="avgTime" fill="#171717" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="hc-empty">No API metrics available.</div>
                )}
              </div>
            </div>

            <div className="hc-issues-grid">
              <IssueCard
                icon={<FiLock />}
                title="Password resets"
                count={pendingResets.length}
                items={pendingResets.slice(0, 3).map((r) => r.email)}
              />
              <IssueCard
                icon={<FiMail />}
                title="Pending verifications"
                count={pendingVerifications.length}
                items={pendingVerifications.slice(0, 3).map((p) => p.email)}
              />
              <IssueCard
                icon={<FiShield />}
                title="Failed logins"
                count={failedLogins.length}
                items={failedLogins.slice(0, 3).map((f) => f.email)}
              />
            </div>
          </>
        )}

        {/* ============ SERVICES TAB ============ */}
        {activeTab === "services" && (
          <section className="hc-panel">
            <div className="hc-panel-header">
              <div>
                <h3>
                  <FiGlobe /> Service status
                </h3>
                <p className="hc-panel-sub">Backend integrations and dependencies</p>
              </div>
              <button className="hc-btn hc-btn-sm" onClick={fetchAllData}>
                <FiRefreshCw size={12} /> Refresh
              </button>
            </div>
            {services && Object.keys(services).length > 0 ? (
              <div className="hc-services-grid">
                {Object.entries(services).map(([name, status]) => (
                  <div key={name} className="hc-service-card">
                    <div className="hc-service-head">
                      <div className="hc-service-name">
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </div>
                      <span
                        className="hc-service-dot"
                        style={{ backgroundColor: getStatusColor(status.status) }}
                      />
                    </div>
                    <div
                      className="hc-service-status"
                      style={{ color: getStatusColor(status.status) }}
                    >
                      {getStatusLabel(status.status)}
                    </div>
                    {(name === "email" || name === "youtube") && (
                      <button
                        className="hc-btn hc-btn-sm"
                        onClick={() => handleTestService(name)}
                        disabled={testingService === name}
                      >
                        {testingService === name ? (
                          <FiLoader className="hc-spin" />
                        ) : (
                          <>
                            Test <FiChevronRight size={12} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="hc-empty">No services reported by the backend.</div>
            )}
          </section>
        )}

        {/* ============ LOGS TAB ============ */}
        {activeTab === "logs" && (
          <>
            <section className="hc-panel">
              <div className="hc-panel-header">
                <div>
                  <h3>
                    <FiAlertCircle /> Recent errors
                  </h3>
                  <p className="hc-panel-sub">
                    {errors.length} total · click a row for details
                  </p>
                </div>
              </div>
              {errors.length === 0 ? (
                <div className="hc-empty">No errors recorded. System is healthy.</div>
              ) : (
                <div className="hc-list">
                  {errors.slice(0, 30).map((error, idx) => (
                    <div
                      key={idx}
                      className="hc-error-row"
                      onClick={() => {
                        setSelectedError(error);
                        setShowErrorModal(true);
                      }}
                    >
                      <div className="hc-error-time">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                      <div
                        className={`hc-error-status ${
                          error.statusCode >= 500 ? "hc-error-5xx" : "hc-error-4xx"
                        }`}
                      >
                        {error.statusCode}
                      </div>
                      <div className="hc-error-endpoint">{error.endpoint}</div>
                      <div className="hc-error-user">{getUserDisplay(error.userId)}</div>
                      <FiChevronRight className="hc-error-view" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="hc-panel">
              <div className="hc-panel-header">
                <div>
                  <h3>
                    <FiClock /> Slow requests
                  </h3>
                  <p className="hc-panel-sub">Requests taking longer than 2 seconds</p>
                </div>
                <span className="hc-badge">{slowRequests.length}</span>
              </div>
              {slowRequests.length === 0 ? (
                <div className="hc-empty">No slow requests detected.</div>
              ) : (
                <div className="hc-list">
                  {slowRequests.slice(0, 15).map((req, idx) => (
                    <div key={idx} className="hc-slow-row">
                      <div className="hc-slow-duration">{req.duration}ms</div>
                      <div className="hc-slow-endpoint">{req.endpoint}</div>
                      <div className="hc-slow-user">{getUserDisplay(req.userId)}</div>
                      <div className="hc-slow-time">
                        {new Date(req.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="hc-panel">
              <div className="hc-panel-header">
                <div>
                  <h3>
                    <FiEye /> User reports
                  </h3>
                  <p className="hc-panel-sub">Issues submitted by users</p>
                </div>
                <span className="hc-badge">{reports.length}</span>
              </div>
              {reports.length === 0 ? (
                <div className="hc-empty">No user reports.</div>
              ) : (
                <div className="hc-list">
                  {reports.slice(0, 10).map((report) => (
                    <div key={report.id} className="hc-report-row">
                      <div
                        className="hc-report-bar"
                        style={{
                          backgroundColor:
                            report.severity === "critical"
                              ? "#dc2626"
                              : report.severity === "high"
                              ? "#ea580c"
                              : "#d97706",
                        }}
                      />
                      <div className="hc-report-content">
                        <div className="hc-report-title">{report.title}</div>
                        <div className="hc-report-desc">{report.description}</div>
                        <div className="hc-report-meta">
                          <span>{new Date(report.createdAt).toLocaleString()}</span>
                          <span>{report.userName || report.userId || "Unknown user"}</span>
                        </div>
                      </div>
                      {report.status === "pending" && (
                        <button
                          className="hc-btn hc-btn-sm"
                          onClick={() => handleResolveReport(report.id)}
                        >
                          Resolve
                        </button>
                      )}
                      {report.status === "resolved" && (
                        <FiCheckCircle className="hc-resolved-icon" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ============ DATA TAB ============ */}
        {activeTab === "data" && (
          <>
            <div className="hc-storage-grid">
              <div className="hc-panel hc-storage-card">
                <div className="hc-storage-head">
                  <div className="hc-storage-icon">
                    <FiHardDrive />
                  </div>
                  <div>
                    <div className="hc-storage-label">Storage Used</div>
                    <div className="hc-storage-value">
                      {storageMetrics.percentUsed > 0
                        ? `${storageMetrics.percentUsed.toFixed(1)}%`
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="hc-bar-track">
                  <div
                    className="hc-bar-fill"
                    style={{
                      width: `${Math.min(storageMetrics.percentUsed, 100)}%`,
                      background: storageMetrics.percentUsed > 90 ? "#dc2626" : "#171717",
                    }}
                  />
                </div>
                <div className="hc-storage-details">
                  <span>{formatBytes(storageMetrics.usedSize)}</span>
                  <span>of {formatBytes(storageMetrics.totalSize)}</span>
                </div>
              </div>

              <div className="hc-panel hc-storage-card">
                <div className="hc-storage-head">
                  <div className="hc-storage-icon">
                    <FiDatabase />
                  </div>
                  <div>
                    <div className="hc-storage-label">Total Files</div>
                    <div className="hc-storage-value">{storageMetrics.totalFiles}</div>
                  </div>
                </div>
                <div className="hc-storage-types">
                  <div className="hc-storage-type">
                    <span>{storageMetrics.images}</span>
                    <small>Images</small>
                  </div>
                  <div className="hc-storage-type">
                    <span>{storageMetrics.videos}</span>
                    <small>Videos</small>
                  </div>
                  <div className="hc-storage-type">
                    <span>{storageMetrics.documents}</span>
                    <small>Docs</small>
                  </div>
                </div>
              </div>
            </div>

            <section className="hc-panel">
              <div className="hc-panel-header">
                <div>
                  <h3>
                    <FiDatabase /> Database statistics
                  </h3>
                  <p className="hc-panel-sub">Record counts across all tables</p>
                </div>
              </div>
              {databaseStats && Object.keys(databaseStats).length > 0 ? (
                <div className="hc-db-grid">
                  {Object.entries(databaseStats).map(([key, value]) => {
                    const labels = {
                      users: "Users",
                      announcements: "Announcements",
                      massPrograms: "Mass Programs",
                      pledges: "Pledges",
                      songs: "Songs",
                      media: "Media",
                      games: "Games",
                      messages: "Messages",
                      notifications: "Notifications",
                      attendanceSheets: "Attendance Sheets",
                      attendanceEntries: "Attendance Entries",
                    };
                    return (
                      <div key={key} className="hc-db-tile">
                        <div className="hc-db-value">{(value || 0).toLocaleString()}</div>
                        <div className="hc-db-label">
                          {labels[key] || key.replace(/([A-Z])/g, " $1").trim()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="hc-empty">No database statistics available.</div>
              )}
            </section>

            <section className="hc-panel">
              <div className="hc-panel-header">
                <div>
                  <h3>
                    <FiUserCheck /> Recent user activity
                  </h3>
                  <p className="hc-panel-sub">Most recent logins and sessions</p>
                </div>
              </div>
              {recentLogins.length === 0 ? (
                <div className="hc-empty">No recent user activity.</div>
              ) : (
                <div className="hc-list">
                  {recentLogins.slice(0, 10).map((login, idx) => (
                    <div key={idx} className="hc-login-row">
                      <div className="hc-login-avatar">
                        {(login.fullName || login.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="hc-login-info">
                        <div className="hc-login-name">
                          {login.fullName || login.email || "Unknown user"}
                        </div>
                        <div className="hc-login-email">{login.email}</div>
                      </div>
                      <div className="hc-login-role">
                        {login.role ? login.role.toUpperCase() : "MEMBER"}
                      </div>
                      <div className="hc-login-time">
                        {new Date(login.lastActive).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ============ DEVELOPER SERVICES TAB ============ */}
        {activeTab === "developers" && (
          <section className="hc-panel">
            <div className="hc-panel-header">
              <div>
                <h3>
                  <FiTerminal /> Developer Services
                </h3>
                <p className="hc-panel-sub">
                  Quick access to the services that power ZUCA
                </p>
              </div>
              <div className="hc-dev-toolbar">
                <span className="hc-badge">{devServices.length} services</span>
                <button className="hc-btn hc-btn-sm" onClick={fetchDevServices}>
                  <FiRefreshCw size={12} /> Refresh
                </button>
                <button className="hc-btn hc-btn-sm hc-btn-primary" onClick={openCreateDev}>
                  <FiPlus size={12} /> Add service
                </button>
              </div>
            </div>

            {devLoading ? (
              <div className="hc-empty">Loading services…</div>
            ) : devError ? (
              <div className="hc-empty">{devError}</div>
            ) : devServices.length === 0 ? (
              <div className="hc-empty">
                No services yet. Click "Add service" to create your first one.
              </div>
            ) : (
              <div className="hc-dev-grid">
                {devServices.map((service) => {
                  const showNotes = expandedNotes[service.slug];
                  return (
                    <div
                      key={service.slug}
                      className={`hc-dev-card ${
                        service.isPrimary ? "hc-dev-card-primary" : ""
                      }`}
                    >
                      <div className="hc-dev-head">
                        <div className="hc-dev-icon">
                          {DEV_ICON_MAP[service.icon] || <FiTerminal size={20} />}
                        </div>
                        <div className="hc-dev-meta">
                          <div className="hc-dev-name">
                            {service.name}
                            {service.isPrimary && (
                              <span className="hc-dev-primary-tag">Primary</span>
                            )}
                          </div>
                          {service.description && (
                            <div className="hc-dev-desc">{service.description}</div>
                          )}
                        </div>
                      </div>

                      {service.category && (
                        <div className="hc-dev-meta-row">
                          <span className="hc-dev-cat">{service.category}</span>
                        </div>
                      )}

                      {(service.loginEmail ||
                        service.vaultUrl ||
                        service.lastRotated) && (
                        <div className="hc-dev-creds">
                          {service.loginEmail && (
                            <div className="hc-dev-cred-row">
                              <FiUser size={12} />
                              <span className="hc-dev-cred-label">Email</span>
                              <span className="hc-dev-cred-value">
                                {service.loginEmail}
                              </span>
                            </div>
                          )}
                          {service.lastRotated && (
                            <div className="hc-dev-cred-row">
                              <FiCalendar size={12} />
                              <span className="hc-dev-cred-label">Rotated</span>
                              <span className="hc-dev-cred-value">
                                {String(service.lastRotated).slice(0, 10)}
                              </span>
                            </div>
                          )}
                          {service.vaultUrl && (
                            <button
                              className="hc-dev-cred-vault"
                              onClick={() => openService(service.vaultUrl)}
                            >
                              <FiLock size={12} />
                              Open password vault
                              <FiExternalLink size={11} />
                            </button>
                          )}
                        </div>
                      )}

                      {service.notes && !showNotes && (
                        <button
                          className="hc-dev-notes-toggle"
                          onClick={() =>
                            setExpandedNotes((prev) => ({
                              ...prev,
                              [service.slug]: true,
                            }))
                          }
                        >
                          Show notes
                        </button>
                      )}

                      {showNotes && (
                        <div className="hc-dev-notes-block">
                          <textarea
                            className="hc-dev-notes-input"
                            defaultValue={service.notes || ""}
                            placeholder="Anything worth remembering — contact person, renewal dates, quirks…"
                            onChange={(e) =>
                              handleNotesChange(service, e.target.value)
                            }
                          />
                          <button
                            className="hc-dev-notes-toggle"
                            onClick={() =>
                              setExpandedNotes((prev) => ({
                                ...prev,
                                [service.slug]: false,
                              }))
                            }
                          >
                            Hide notes
                          </button>
                        </div>
                      )}

                      {!service.notes && !showNotes && (
                        <button
                          className="hc-dev-notes-toggle"
                          onClick={() =>
                            setExpandedNotes((prev) => ({
                              ...prev,
                              [service.slug]: true,
                            }))
                          }
                        >
                          Add notes
                        </button>
                      )}

                      <div className="hc-dev-foot">
                        <button
                          className="hc-btn hc-dev-btn"
                          onClick={() => openService(service.url)}
                        >
                          Open <FiExternalLink size={12} />
                        </button>

                        {service.docsUrl && (
                          <button
                            className="hc-btn hc-btn-sm"
                            onClick={() => openService(service.docsUrl)}
                          >
                            Docs <FiExternalLink size={11} />
                          </button>
                        )}

                        <button
                          className="hc-btn hc-btn-sm"
                          onClick={() => openEditDev(service)}
                          title="Edit service"
                        >
                          <FiEdit2 size={12} />
                        </button>

                        <button
                          className="hc-btn hc-btn-sm hc-btn-danger"
                          onClick={() => handleDeleteDev(service.slug)}
                          disabled={deletingDevSlug === service.slug}
                          title="Delete service"
                        >
                          {deletingDevSlug === service.slug ? (
                            <FiLoader className="hc-spin" size={12} />
                          ) : (
                            <FiTrash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ============ ERROR DETAIL MODAL ============ */}
      {showErrorModal && selectedError && (
        <div className="hc-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="hc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hc-modal-header">
              <div>
                <h3>Error Details</h3>
                <p className="hc-modal-sub">
                  {new Date(selectedError.timestamp).toLocaleString()}
                </p>
              </div>
              <button className="hc-modal-close" onClick={() => setShowErrorModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="hc-modal-body">
              <div className="hc-modal-status-row">
                <span
                  className={`hc-modal-status-pill ${
                    selectedError.statusCode >= 500 ? "hc-error-5xx" : "hc-error-4xx"
                  }`}
                >
                  {selectedError.statusCode}
                </span>
                <span className="hc-modal-method">{selectedError.method}</span>
              </div>
              <ModalRow label="Endpoint" value={selectedError.endpoint} mono />
              <ModalRow label="Message" value={selectedError.message} />
              <ModalRow label="User" value={getUserDisplay(selectedError.userId)} />
              <ModalRow label="IP Address" value={selectedError.ip || "Not recorded"} mono />
            </div>
          </div>
        </div>
      )}

      {/* ============ DEVELOPER SERVICE MODAL ============ */}
      {showDevModal && (
        <div
          className="hc-modal-overlay"
          onClick={() => !savingDev && setShowDevModal(false)}
        >
          <div
            className="hc-modal hc-modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hc-modal-header">
              <div>
                <h3>{editingDevSlug ? "Edit service" : "Add service"}</h3>
                <p className="hc-modal-sub">
                  Links, credentials location, and notes for this service
                </p>
              </div>
              <button
                className="hc-modal-close"
                onClick={() => !savingDev && setShowDevModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="hc-modal-body hc-dev-form">
              <div className="hc-dev-field-row">
                <div className="hc-dev-field">
                  <label>ID (slug) *</label>
                  <input
                    type="text"
                    value={devForm.slug}
                    onChange={(e) =>
                      setDevForm({ ...devForm, slug: e.target.value })
                    }
                    placeholder="e.g. brevo"
                    disabled={!!editingDevSlug}
                  />
                  <small>Lowercase, no spaces. Used as the unique key.</small>
                </div>
                <div className="hc-dev-field">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={devForm.name}
                    onChange={(e) =>
                      setDevForm({ ...devForm, name: e.target.value })
                    }
                    placeholder="e.g. Brevo"
                  />
                </div>
              </div>

              <div className="hc-dev-field">
                <label>Description</label>
                <input
                  type="text"
                  value={devForm.description}
                  onChange={(e) =>
                    setDevForm({ ...devForm, description: e.target.value })
                  }
                  placeholder="Email service and email management"
                />
              </div>

              <div className="hc-dev-field">
                <label>Service URL *</label>
                <input
                  type="url"
                  value={devForm.url}
                  onChange={(e) =>
                    setDevForm({ ...devForm, url: e.target.value })
                  }
                  placeholder="https://app.brevo.com/"
                />
              </div>

              <div className="hc-dev-field">
                <label>Docs URL (optional)</label>
                <input
                  type="url"
                  value={devForm.docsUrl}
                  onChange={(e) =>
                    setDevForm({ ...devForm, docsUrl: e.target.value })
                  }
                  placeholder="https://developers.brevo.com/"
                />
              </div>

              <div className="hc-dev-field-row">
                <div className="hc-dev-field">
                  <label>Icon</label>
                  <select
                    value={devForm.icon}
                    onChange={(e) =>
                      setDevForm({ ...devForm, icon: e.target.value })
                    }
                  >
                    {DEV_ICON_CHOICES.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hc-dev-field">
                  <label>Category</label>
                  <input
                    type="text"
                    value={devForm.category}
                    onChange={(e) =>
                      setDevForm({ ...devForm, category: e.target.value })
                    }
                    placeholder="Email, Database, Media…"
                  />
                </div>
                <div className="hc-dev-field">
                  <label>Order</label>
                  <input
                    type="number"
                    value={devForm.sortOrder}
                    onChange={(e) =>
                      setDevForm({
                        ...devForm,
                        sortOrder: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="hc-dev-field hc-dev-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={devForm.isPrimary}
                    onChange={(e) =>
                      setDevForm({
                        ...devForm,
                        isPrimary: e.target.checked,
                      })
                    }
                  />
                  Mark as primary
                </label>
              </div>

              <div className="hc-dev-divider">Credentials</div>

              <div className="hc-dev-field">
                <label>Login email (shown as text, not a password)</label>
                <input
                  type="text"
                  value={devForm.loginEmail}
                  onChange={(e) =>
                    setDevForm({
                      ...devForm,
                      loginEmail: e.target.value,
                    })
                  }
                  placeholder="admin@zetechcatholicaction.com"
                />
              </div>

              <div className="hc-dev-field">
                <label>Vault link (Bitwarden / 1Password entry URL)</label>
                <input
                  type="url"
                  value={devForm.vaultUrl}
                  onChange={(e) =>
                    setDevForm({
                      ...devForm,
                      vaultUrl: e.target.value,
                    })
                  }
                  placeholder="https://vault.bitwarden.com/#/vault?itemId=…"
                />
                <small>
                  Never store the raw password here. Store a link to it in your
                  password manager instead.
                </small>
              </div>

              <div className="hc-dev-field">
                <label>Last rotated</label>
                <input
                  type="date"
                  value={devForm.lastRotated}
                  onChange={(e) =>
                    setDevForm({
                      ...devForm,
                      lastRotated: e.target.value,
                    })
                  }
                />
              </div>

              <div className="hc-dev-field">
                <label>Notes</label>
                <textarea
                  value={devForm.notes}
                  onChange={(e) =>
                    setDevForm({ ...devForm, notes: e.target.value })
                  }
                  rows={5}
                  placeholder="Anything worth remembering — contact person, quirks, renewal dates…"
                />
              </div>
            </div>

            <div className="hc-modal-footer">
              <button
                className="hc-btn"
                onClick={() => !savingDev && setShowDevModal(false)}
                disabled={savingDev}
              >
                Cancel
              </button>
              <button
                className="hc-btn hc-btn-primary"
                onClick={handleSaveDev}
                disabled={savingDev}
              >
                {savingDev ? (
                  <>
                    <FiLoader className="hc-spin" size={13} /> Saving…
                  </>
                ) : (
                  <>
                    <FiSave size={13} />{" "}
                    {editingDevSlug ? "Save changes" : "Create service"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{mainCSS}</style>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function ScoreCard({ title, score, icon, stats }) {
  const tone =
    score > 80
      ? { bar: "#16a34a", text: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" }
      : score > 50
      ? { bar: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a" }
      : { bar: "#dc2626", text: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };

  return (
    <div className="hc-score-card">
      <div className="hc-score-head">
        <div className="hc-score-icon" style={{ background: tone.bg, color: tone.text }}>
          {icon}
        </div>
        <div className="hc-score-meta">
          <div className="hc-score-label">{title}</div>
          <div className="hc-score-value" style={{ color: tone.text }}>
            {score}%
          </div>
        </div>
      </div>
      <div className="hc-bar-track">
        <div className="hc-bar-fill" style={{ width: `${score}%`, background: tone.bar }} />
      </div>
      <div className="hc-score-stats">
        {stats.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, sub, tone }) {
  return (
    <div className="hc-tile">
      <div className={`hc-tile-icon ${tone === "danger" ? "hc-tile-icon-danger" : ""}`}>
        {icon}
      </div>
      <div className="hc-tile-body">
        <div className="hc-tile-label">{label}</div>
        <div className="hc-tile-value">{value}</div>
        {sub && <div className="hc-tile-sub">{sub}</div>}
      </div>
    </div>
  );
}

function IssueCard({ icon, title, count, items }) {
  return (
    <div className="hc-issue-card">
      <div className="hc-issue-head">
        <div className="hc-issue-icon">{icon}</div>
        <div className="hc-issue-count">{count}</div>
      </div>
      <div className="hc-issue-title">{title}</div>
      <div className="hc-issue-items">
        {items.length === 0 ? (
          <div className="hc-issue-item hc-issue-empty">No items</div>
        ) : (
          items.map((it, i) => (
            <div key={i} className="hc-issue-item">
              {it}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ModalRow({ label, value, mono }) {
  return (
    <div className="hc-modal-row">
      <span className="hc-modal-label">{label}</span>
      <span className={`hc-modal-value ${mono ? "hc-modal-mono" : ""}`}>{value}</span>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const baseCSS = `
  .hc-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .hc-container {
    padding: 28px 24px 60px;
    max-width: 1360px;
    margin: 0 auto;
  }

  /* ---------- HEADER ---------- */
  .hc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    flex-wrap: wrap;
    padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
  }
  .hc-header-left { min-width: 0; }
  .hc-header-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #737373;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .hc-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #16a34a;
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5);
    animation: hc-pulse 2s infinite;
  }
  @keyframes hc-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
    50% { box-shadow: 0 0 0 5px rgba(22, 163, 74, 0); }
  }
  .hc-title {
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.5px;
    color: #0f0f0f;
  }
  .hc-subtitle {
    font-size: 13.5px;
    color: #737373;
    margin: 4px 0 0 0;
  }
  .hc-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .hc-updated {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #525252;
    background: #ffffff;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
  }

  /* ---------- BUTTONS ---------- */
  .hc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
    background: #ffffff;
    color: #262626;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }
  .hc-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .hc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .hc-btn-sm { padding: 5px 10px; font-size: 11.5px; }
  .hc-btn-primary {
    background: #0f0f0f;
    color: #ffffff;
    border-color: #0f0f0f;
  }
  .hc-btn-primary:hover { background: #262626; border-color: #262626; }
  .hc-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .hc-btn-danger:hover { background: #fef2f2; border-color: #fca5a5; }

  .hc-spin-slow { animation: hc-spin 2s linear infinite; }
  .hc-spin { animation: hc-spin 1s linear infinite; }
  @keyframes hc-spin { to { transform: rotate(360deg); } }

  /* ---------- TABS ---------- */
  .hc-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 24px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .hc-tabs::-webkit-scrollbar { display: none; }
  .hc-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 11px 14px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #737373;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
    margin-bottom: -1px;
  }
  .hc-tab:hover { color: #262626; }
  .hc-tab-active {
    color: #0f0f0f;
    border-bottom-color: #0f0f0f;
  }
  .hc-tab-badge {
    background: #f5f5f5;
    color: #525252;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    min-width: 18px;
    text-align: center;
  }
  .hc-tab-active .hc-tab-badge {
    background: #0f0f0f;
    color: #ffffff;
  }

  /* ---------- SCORE CARDS ---------- */
  .hc-score-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }
  @media (min-width: 768px) {
    .hc-score-grid { grid-template-columns: 1fr 1fr; }
  }
  .hc-score-card {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    padding: 22px;
    transition: border-color 0.15s ease;
  }
  .hc-score-head {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }
  .hc-score-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .hc-score-meta { flex: 1; min-width: 0; }
  .hc-score-label {
    font-size: 12px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .hc-score-value {
    font-size: 30px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.8px;
    margin-top: 2px;
  }
  .hc-bar-track {
    height: 6px;
    background: #f5f5f5;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .hc-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.5s ease;
  }
  .hc-score-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #525252;
  }

  /* ---------- STAT TILES ---------- */
  .hc-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }
  @media (min-width: 480px) { .hc-stats-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 768px) { .hc-stats-grid { grid-template-columns: repeat(6, 1fr); } }

  .hc-tile {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: border-color 0.15s ease;
  }
  .hc-tile:hover { border-color: #d4d4d4; }
  .hc-tile-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #262626;
    font-size: 17px;
    flex-shrink: 0;
  }
  .hc-tile-icon-danger {
    background: #fef2f2;
    color: #b91c1c;
  }
  .hc-tile-body { flex: 1; min-width: 0; }
  .hc-tile-label {
    font-size: 10.5px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .hc-tile-value {
    font-size: 17px;
    font-weight: 700;
    color: #171717;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-tile-sub {
    font-size: 10.5px;
    color: #a3a3a3;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---------- CHARTS ---------- */
  .hc-charts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 24px;
  }
  @media (min-width: 900px) { .hc-charts-grid { grid-template-columns: 1fr 1fr; } }

  .hc-panel {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .hc-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .hc-panel-header h2,
  .hc-panel-header h3 {
    font-size: 14.5px;
    font-weight: 700;
    color: #0f0f0f;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.1px;
  }
  .hc-panel-header h3 svg { color: #737373; }
  .hc-panel-sub {
    font-size: 12px;
    color: #a3a3a3;
    margin: 4px 0 0 0;
  }
  .hc-legend {
    display: flex;
    gap: 14px;
    font-size: 11.5px;
    color: #525252;
  }
  .hc-legend > span { display: inline-flex; align-items: center; gap: 6px; }
  .hc-dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
  .hc-dot-red { background: #dc2626; }
  .hc-dot-amber { background: #d97706; }

  /* ---------- STORAGE ---------- */
  .hc-storage-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 16px;
  }
  @media (min-width: 768px) { .hc-storage-grid { grid-template-columns: 1fr 1fr; } }

  .hc-storage-card { margin-bottom: 0; }
  .hc-storage-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }
  .hc-storage-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: #f5f5f5;
    color: #262626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .hc-storage-label {
    font-size: 11.5px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .hc-storage-value {
    font-size: 24px;
    font-weight: 800;
    color: #171717;
    letter-spacing: -0.6px;
    margin-top: 2px;
  }
  .hc-storage-details {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #a3a3a3;
  }
  .hc-storage-types {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .hc-storage-type {
    background: #fafafa;
    border-radius: 10px;
    padding: 12px 8px;
    text-align: center;
  }
  .hc-storage-type > span {
    display: block;
    font-size: 18px;
    font-weight: 800;
    color: #171717;
    letter-spacing: -0.4px;
  }
  .hc-storage-type > small {
    display: block;
    font-size: 10.5px;
    color: #737373;
    margin-top: 2px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ---------- SERVICES ---------- */
  .hc-services-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  @media (min-width: 480px) { .hc-services-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 900px) { .hc-services-grid { grid-template-columns: repeat(4, 1fr); } }

  .hc-service-card {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 16px;
    transition: border-color 0.15s ease;
  }
  .hc-service-card:hover { border-color: #e5e5e5; }
  .hc-service-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .hc-service-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #171717;
  }
  .hc-service-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .hc-service-status {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  /* ---------- DEVELOPER SERVICES ---------- */
  .hc-dev-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .hc-dev-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 640px) { .hc-dev-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .hc-dev-grid { grid-template-columns: repeat(3, 1fr); } }

  .hc-dev-card {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .hc-dev-card:hover { border-color: #e5e5e5; background: #f7f7f7; }
  .hc-dev-card-primary {
    background: #ffffff;
    border-color: #d4d4d4;
  }

  .hc-dev-head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }
  .hc-dev-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    color: #262626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .hc-dev-meta { flex: 1; min-width: 0; }
  .hc-dev-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f0f0f;
    letter-spacing: -0.1px;
    line-height: 1.3;
  }
  .hc-dev-primary-tag {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 7px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #0f0f0f;
    color: #ffffff;
    border-radius: 999px;
    vertical-align: middle;
  }
  .hc-dev-desc {
    font-size: 12.5px;
    color: #737373;
    margin-top: 4px;
    line-height: 1.5;
    word-break: break-word;
  }
  .hc-dev-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .hc-dev-cat {
    display: inline-block;
    padding: 2px 9px;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #f5f5f5;
    color: #525252;
    border-radius: 999px;
  }

  .hc-dev-creds {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
  }
  .hc-dev-cred-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #525252;
  }
  .hc-dev-cred-row svg { color: #a3a3a3; flex-shrink: 0; }
  .hc-dev-cred-label {
    font-weight: 700;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 10.5px;
    min-width: 52px;
  }
  .hc-dev-cred-value {
    color: #171717;
    font-weight: 500;
    word-break: break-all;
  }
  .hc-dev-cred-vault {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    margin-top: 4px;
    padding: 6px 10px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    color: #262626;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
    font-family: inherit;
  }
  .hc-dev-cred-vault:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .hc-dev-cred-vault svg { color: #525252; }

  .hc-dev-notes-toggle {
    background: transparent;
    border: none;
    color: #525252;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    padding: 0;
    align-self: flex-start;
    font-family: inherit;
  }
  .hc-dev-notes-toggle:hover { color: #0f0f0f; }

  .hc-dev-notes-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hc-dev-notes-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    font-size: 12.5px;
    color: #171717;
    font-family: inherit;
    background: #ffffff;
    resize: vertical;
    min-height: 90px;
    line-height: 1.55;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .hc-dev-notes-input:focus { border-color: #a3a3a3; background: #ffffff; }

  .hc-dev-foot {
    display: flex;
    gap: 8px;
    margin-top: auto;
    flex-wrap: wrap;
  }
  .hc-dev-btn {
    align-self: flex-start;
  }

  /* ---------- DEV MODAL ---------- */
  .hc-modal-wide {
    max-width: 640px;
  }
  .hc-dev-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 65vh;
    overflow-y: auto;
    padding: 20px 22px;
  }
  .hc-dev-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  @media (max-width: 600px) {
    .hc-dev-field-row { grid-template-columns: 1fr; }
  }
  .hc-dev-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hc-dev-field label {
    font-size: 11px;
    font-weight: 700;
    color: #525252;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .hc-dev-field input,
  .hc-dev-field select,
  .hc-dev-field textarea {
    width: 100%;
    padding: 9px 11px;
    border: 1px solid #e5e5e5;
    border-radius: 9px;
    font-size: 13px;
    color: #171717;
    background: #ffffff;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .hc-dev-field input:focus,
  .hc-dev-field select:focus,
  .hc-dev-field textarea:focus {
    border-color: #0f0f0f;
  }
  .hc-dev-field input:disabled {
    background: #f5f5f5;
    color: #a3a3a3;
    cursor: not-allowed;
  }
  .hc-dev-field small {
    font-size: 11px;
    color: #a3a3a3;
    line-height: 1.5;
  }
  .hc-dev-field textarea {
    resize: vertical;
    min-height: 90px;
  }
  .hc-dev-checkbox label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 600;
    color: #262626;
    cursor: pointer;
  }
  .hc-dev-checkbox input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #0f0f0f;
  }
  .hc-dev-divider {
    font-size: 11px;
    font-weight: 700;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 8px 0 4px;
    border-top: 1px solid #f0f0f0;
    margin-top: 6px;
  }
  .hc-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 22px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
  }

  /* ---------- ISSUES ---------- */
  .hc-issues-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (min-width: 600px) { .hc-issues-grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 900px) { .hc-issues-grid { grid-template-columns: 1fr 1fr 1fr; } }

  .hc-issue-card {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    padding: 18px;
    transition: border-color 0.15s ease;
  }
  .hc-issue-card:hover { border-color: #d4d4d4; }
  .hc-issue-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .hc-issue-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #f5f5f5;
    color: #262626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
  }
  .hc-issue-count {
    font-size: 24px;
    font-weight: 800;
    color: #171717;
    letter-spacing: -0.5px;
  }
  .hc-issue-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #525252;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .hc-issue-items {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .hc-issue-item {
    font-size: 12px;
    color: #737373;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-issue-empty { font-style: italic; color: #a3a3a3; }

  /* ---------- LIST ROWS ---------- */
  .hc-list { display: flex; flex-direction: column; }

  .hc-error-row {
    display: grid;
    grid-template-columns: 150px 50px 1fr 140px 20px;
    align-items: center;
    gap: 12px;
    padding: 12px 4px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    font-size: 12.5px;
    transition: background 0.12s ease;
  }
  .hc-error-row:hover { background: #fafafa; }
  .hc-error-row:last-child { border-bottom: none; }
  .hc-error-time { font-size: 11.5px; color: #737373; }
  .hc-error-status {
    padding: 3px 9px;
    border-radius: 6px;
    color: #ffffff;
    font-weight: 700;
    font-size: 11px;
    text-align: center;
    min-width: 38px;
  }
  .hc-error-5xx { background: #dc2626; }
  .hc-error-4xx { background: #d97706; }
  .hc-error-endpoint {
    color: #171717;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-error-user {
    color: #737373;
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-error-view { color: #d4d4d4; }

  .hc-slow-row {
    display: grid;
    grid-template-columns: 80px 1fr 140px 100px;
    align-items: center;
    gap: 12px;
    padding: 12px 4px;
    border-bottom: 1px solid #f5f5f5;
    font-size: 12.5px;
  }
  .hc-slow-row:last-child { border-bottom: none; }
  .hc-slow-duration { color: #b91c1c; font-weight: 700; font-size: 12.5px; }
  .hc-slow-endpoint {
    color: #171717;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-slow-user { color: #737373; font-size: 11.5px; }
  .hc-slow-time { color: #a3a3a3; font-size: 11.5px; text-align: right; }

  .hc-report-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px 4px;
    border-bottom: 1px solid #f5f5f5;
  }
  .hc-report-row:last-child { border-bottom: none; }
  .hc-report-bar {
    width: 3px;
    align-self: stretch;
    border-radius: 3px;
    flex-shrink: 0;
    min-height: 40px;
  }
  .hc-report-content { flex: 1; min-width: 0; }
  .hc-report-title { font-size: 13.5px; font-weight: 700; color: #171717; }
  .hc-report-desc { font-size: 12.5px; color: #737373; margin: 4px 0; }
  .hc-report-meta {
    display: flex;
    gap: 14px;
    font-size: 11px;
    color: #a3a3a3;
    flex-wrap: wrap;
  }
  .hc-resolved-icon { color: #16a34a; font-size: 18px; }

  /* ---------- DB ---------- */
  .hc-db-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 480px) { .hc-db-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 768px) { .hc-db-grid { grid-template-columns: repeat(4, 1fr); } }

  .hc-db-tile {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    transition: border-color 0.15s ease;
  }
  .hc-db-tile:hover { border-color: #e5e5e5; }
  .hc-db-value {
    font-size: 22px;
    font-weight: 800;
    color: #171717;
    letter-spacing: -0.5px;
  }
  .hc-db-label {
    font-size: 10.5px;
    color: #737373;
    margin-top: 5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  /* ---------- LOGINS ---------- */
  .hc-login-row {
    display: grid;
    grid-template-columns: 40px 1fr auto auto;
    align-items: center;
    gap: 14px;
    padding: 12px 4px;
    border-bottom: 1px solid #f5f5f5;
  }
  .hc-login-row:last-child { border-bottom: none; }
  .hc-login-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #f5f5f5;
    color: #525252;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13.5px;
    flex-shrink: 0;
  }
  .hc-login-info { min-width: 0; }
  .hc-login-name {
    font-size: 13.5px;
    font-weight: 600;
    color: #171717;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-login-email {
    font-size: 11.5px;
    color: #737373;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-login-role {
    font-size: 10px;
    background: #f5f5f5;
    padding: 3px 10px;
    border-radius: 999px;
    color: #525252;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .hc-login-time { font-size: 11.5px; color: #a3a3a3; }

  /* ---------- EMPTY / BADGE ---------- */
  .hc-empty {
    padding: 32px 12px;
    text-align: center;
    color: #a3a3a3;
    font-size: 13px;
  }
  .hc-empty-banner {
    padding: 14px 18px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    text-align: center;
    color: #525252;
    font-size: 13px;
    margin-bottom: 20px;
  }
  .hc-badge {
    background: #f5f5f5;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    color: #525252;
  }

  /* ---------- MODAL ---------- */
  .hc-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 15, 15, 0.5);
    backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .hc-modal {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.2);
    overflow: hidden;
  }
  .hc-modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 20px 22px; border-bottom: 1px solid #f0f0f0;
  }
  .hc-modal-header h3 { font-size: 16px; font-weight: 700; margin: 0; color: #0f0f0f; }
  .hc-modal-sub { font-size: 12px; color: #a3a3a3; margin: 3px 0 0 0; }
  .hc-modal-close {
    background: transparent; border: none; font-size: 20px;
    cursor: pointer; color: #a3a3a3; padding: 4px;
    border-radius: 6px; transition: background 0.15s ease;
  }
  .hc-modal-close:hover { background: #f5f5f5; color: #171717; }
  .hc-modal-body { padding: 20px 22px; }
  .hc-modal-status-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .hc-modal-status-pill {
    padding: 4px 12px;
    border-radius: 999px;
    color: #ffffff;
    font-weight: 700;
    font-size: 12px;
  }
  .hc-modal-method {
    font-size: 12px;
    font-weight: 700;
    color: #525252;
    background: #f5f5f5;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
  }
  .hc-modal-row {
    display: flex; justify-content: space-between; gap: 14px;
    padding: 10px 0; border-bottom: 1px solid #f5f5f5;
  }
  .hc-modal-row:last-child { border-bottom: none; }
  .hc-modal-label {
    font-size: 12px; font-weight: 600; color: #737373; flex-shrink: 0;
  }
  .hc-modal-value {
    font-size: 12.5px; color: #171717; text-align: right;
    word-break: break-all;
  }
  .hc-modal-mono {
    font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 640px) {
    .hc-container { padding: 20px 16px 40px; }
    .hc-title { font-size: 22px; }
    .hc-score-value { font-size: 26px; }

    .hc-error-row { grid-template-columns: 1fr; gap: 6px; padding: 14px 4px; }
    .hc-error-time { order: 2; font-size: 11px; }
    .hc-error-status { order: 1; width: fit-content; }
    .hc-error-endpoint { order: 3; }
    .hc-error-user { order: 4; }
    .hc-error-view { display: none; }

    .hc-slow-row { grid-template-columns: 1fr 1fr; }
    .hc-slow-endpoint { grid-column: 1 / -1; }

    .hc-login-row { grid-template-columns: 40px 1fr; gap: 12px; }
    .hc-login-role, .hc-login-time { grid-column: 2; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .hc-skeleton {
    background: #ececec;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .hc-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: hc-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes hc-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .hc-skeleton-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; margin-bottom: 22px;
    padding-bottom: 22px; border-bottom: 1px solid #e5e5e5;
  }
  .hc-skeleton-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .hc-skeleton-title { width: 220px; height: 26px; }
  .hc-skeleton-subtitle { width: 280px; height: 14px; margin-top: 8px; }
  .hc-skeleton-pill { width: 90px; height: 32px; border-radius: 8px; }

  .hc-skeleton-card,
  .hc-skeleton-card-lg {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
  }
  .hc-skeleton-card { padding: 14px; display: flex; align-items: center; gap: 12px; }
  .hc-skeleton-card-lg { padding: 22px; border-radius: 14px; }

  .hc-skeleton-row { display: flex; align-items: center; gap: 12px; }
  .hc-skeleton-icon { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; }
  .hc-skeleton-circle-lg { width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0; }
  .hc-skeleton-line-sm { height: 11px; width: 100%; }
  .hc-skeleton-line-md { height: 14px; width: 100%; }
  .hc-skeleton-line-xl { height: 26px; width: 100%; border-radius: 6px; }
  .hc-skeleton-bar { height: 6px; width: 100%; border-radius: 999px; margin-top: 16px; }
  .hc-skeleton-chart { height: 240px; border-radius: 10px; margin-top: 14px; }
`;

const mainCSS = baseCSS;

export default AdminHealthCentre;