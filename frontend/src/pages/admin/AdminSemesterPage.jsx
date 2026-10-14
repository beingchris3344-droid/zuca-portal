// frontend/src/pages/admin/AdminSemesterPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft, FiCalendar, FiCheck, FiAlertCircle, FiDownload,
  FiRefreshCw, FiUsers, FiTrash2, FiUnlock, FiLock,
} from "react-icons/fi";
import zucaLogo from "../../assets/zuca-logo.png";
import BASE_URL from "../../api";

/* ================================================================
   Semester Management — admin page
   ================================================================ */

export default function AdminSemesterPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [semesters, setSemesters] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [roster, setRoster] = useState({ count: 0, members: [] });
  const [rosterLoading, setRosterLoading] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [busyAction, setBusyAction] = useState("");

  const [activeSection, setActiveSection] = useState("overview");

  const selected = semesters.find((s) => s.id === selectedId) || null;

  /* ---------- fetch semesters ---------- */
  const loadSemesters = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/semesters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSemesters(res.data.semesters || []);
      if (!selectedId && res.data.semesters?.length) {
        setSelectedId(res.data.semesters[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not load semesters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSemesters(); /* eslint-disable-next-line */ }, []);

  /* ---------- fetch roster ---------- */
  const loadRoster = async (semesterId) => {
    if (!semesterId) return;
    try {
      setRosterLoading(true);
      const res = await axios.get(
        `${BASE_URL}/api/semesters/${semesterId}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoster({
        count: res.data.count || 0,
        withoutAdmission: res.data.withoutAdmission || 0,
        alumniCount: res.data.alumniCount || 0,
        members: res.data.members || [],
      });
    } catch (err) {
      setError(err.response?.data?.error || "Could not load roster.");
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => { loadRoster(selectedId); /* eslint-disable-next-line */ }, [selectedId]);

  /* ---------- open / close ---------- */
  const openRegistration = async () => {
    if (!selectedId) return;
    setBusyAction("open");
    setError(""); setSuccess("");
    try {
      const res = await axios.post(
        `${BASE_URL}/api/semesters/${selectedId}/open-registration`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message || "Registration opened.");
      await loadSemesters();
    } catch (err) {
      setError(err.response?.data?.error || "Could not open registration.");
    } finally {
      setBusyAction("");
    }
  };

  const closeRegistration = async () => {
    if (!selectedId) return;
    if (!window.confirm("Close registration for this semester?")) return;
    setBusyAction("close");
    setError(""); setSuccess("");
    try {
      const res = await axios.post(
        `${BASE_URL}/api/semesters/${selectedId}/close-registration`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message || "Registration closed.");
      await loadSemesters();
    } catch (err) {
      setError(err.response?.data?.error || "Could not close registration.");
    } finally {
      setBusyAction("");
    }
  };

  const resendNotifications = async () => {
    if (!selectedId) return;
    if (!window.confirm("Resend 'registration open' notifications to all users?")) return;
    setBusyAction("resend");
    setError(""); setSuccess("");
    try {
      await axios.post(
        `${BASE_URL}/api/semesters/${selectedId}/resend-notifications`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Notifications are being sent in the background.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not resend notifications.");
    } finally {
      setBusyAction("");
    }
  };

  /* ---------- update settings ---------- */
  const updateSetting = async (field, value) => {
    if (!selectedId) return;
    setSavingSettings(true);
    setError(""); setSuccess("");
    try {
      await axios.put(
        `${BASE_URL}/api/semesters/${selectedId}/notification-settings`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSemesters((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, [field]: value } : s))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Could not save setting.");
    } finally {
      setSavingSettings(false);
    }
  };

  /* ---------- export csv ---------- */
  const exportCSV = () => {
    if (!selectedId) return;
    const url = `${BASE_URL}/api/semesters/${selectedId}/export.csv`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `roster_${(selected?.title || "semester").replace(/[^a-z0-9]/gi, "_")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setError("Could not export CSV."));
  };

  /* ---------- remove member ---------- */
  const removeMember = async (userId, name) => {
    if (!selectedId) return;
    if (!window.confirm(`Remove ${name} from this semester?`)) return;
    try {
      await axios.delete(
        `${BASE_URL}/api/semesters/${selectedId}/members/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadRoster(selectedId);
      await loadSemesters();
    } catch (err) {
      setError(err.response?.data?.error || "Could not remove member.");
    }
  };

  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="adm-page">
      <div className="adm-container">
        {/* HEADER */}
        <header className="adm-header">
          <div className="adm-header-brand">
            <img src={zucaLogo} alt="ZUCA" className="adm-header-logo" />
            <div>
              <div className="adm-eyebrow">
                <FiCalendar size={12} /> Administration
              </div>
              <h1 className="adm-title">Semester Management</h1>
              <p className="adm-subtitle">
                Open registration, manage members and notifications
              </p>
            </div>
          </div>
          <div className="adm-header-actions">
            <button className="adm-btn" onClick={() => navigate(-1)}>
              <FiArrowLeft size={14} /> Back
            </button>
            <button className="adm-btn" onClick={loadSemesters}>
              <FiRefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="adm-panel">
            <div className="adm-skel-line title" />
            <div className="adm-skel-line" />
            <div className="adm-skel-line" />
          </div>
        ) : semesters.length === 0 ? (
          <div className="adm-empty">
            <FiCalendar size={26} />
            <div className="adm-empty-title">No semesters yet</div>
            <div className="adm-empty-sub">
              Create a semester schedule first to manage registration.
            </div>
          </div>
        ) : (
          <>
            {/* SELECTOR */}
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h3>Select semester</h3>
                  <p className="adm-panel-sub">
                    Choose which semester you are managing
                  </p>
                </div>
              </div>

              <select
                className="adm-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} · {s.memberCount} member{s.memberCount !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>

              {selected && (
                <>
                  <div className="adm-meta">
                    <div className="adm-meta-item">
                      <span className="adm-meta-label">Period</span>
                      <span className="adm-meta-value">
                        {fmtDate(selected.startDate)} — {fmtDate(selected.endDate)}
                      </span>
                    </div>
                    <div className="adm-meta-item">
                      <span className="adm-meta-label">Registration</span>
                      <span className={`adm-status ${selected.registrationOpen ? "open" : "closed"}`}>
                        <span className="adm-status-dot" />
                        {selected.registrationOpen ? "OPEN" : "CLOSED"}
                      </span>
                    </div>
                    <div className="adm-meta-item">
                      <span className="adm-meta-label">Members</span>
                      <span className="adm-meta-value">{selected.memberCount}</span>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* ALERTS */}
            {error && (
              <div className="adm-alert adm-alert-error">
                <FiAlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="adm-alert adm-alert-success">
                <FiCheck size={15} />
                <span>{success}</span>
              </div>
            )}

            {/* STATS */}
            {selected && (
              <div className="adm-stats">
                <div className="adm-stat">
                  <div className="adm-stat-icon"><FiUsers size={18} /></div>
                  <div>
                    <div className="adm-stat-value">{roster.count}</div>
                    <div className="adm-stat-label">Members</div>
                  </div>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon"><FiCheck size={18} /></div>
                  <div>
                    <div className="adm-stat-value">{roster.alumniCount || 0}</div>
                    <div className="adm-stat-label">Alumni</div>
                  </div>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon"><FiAlertCircle size={18} /></div>
                  <div>
                    <div className="adm-stat-value">{roster.withoutAdmission || 0}</div>
                    <div className="adm-stat-label">Missing Adm. No.</div>
                  </div>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">
                    {selected.registrationOpen ? <FiUnlock size={18} /> : <FiLock size={18} />}
                  </div>
                  <div>
                    <div className="adm-stat-value">
                      {selected.registrationOpen ? "Open" : "Closed"}
                    </div>
                    <div className="adm-stat-label">Registration</div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION TABS */}
            {selected && (
              <nav className="adm-section-tabs">
                <button
                  className={`adm-section-tab ${activeSection === "overview" ? "active" : ""}`}
                  onClick={() => setActiveSection("overview")}
                >
                  <FiUsers size={14} /> Roster
                </button>
                <button
                  className={`adm-section-tab ${activeSection === "controls" ? "active" : ""}`}
                  onClick={() => setActiveSection("controls")}
                >
                  <FiUnlock size={14} /> Controls
                </button>
                <button
                  className={`adm-section-tab ${activeSection === "notifications" ? "active" : ""}`}
                  onClick={() => setActiveSection("notifications")}
                >
                  <FiRefreshCw size={14} /> Notifications
                </button>
              </nav>
            )}

            {/* CONTROLS */}
            {selected && activeSection === "controls" && (
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h3>Registration controls</h3>
                    <p className="adm-panel-sub">
                      Open or close registration, resend notifications, export the roster
                    </p>
                  </div>
                </div>

                <div className="adm-btn-row">
                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={openRegistration}
                    disabled={busyAction === "open" || selected.registrationOpen}
                  >
                    <FiUnlock size={13} />
                    {selected.registrationOpen ? "Registration Already Open" : "Open Registration"}
                  </button>
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={closeRegistration}
                    disabled={busyAction === "close" || !selected.registrationOpen}
                  >
                    <FiLock size={13} />
                    Close Registration
                  </button>
                </div>

                <div className="adm-btn-row">
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={resendNotifications}
                    disabled={busyAction === "resend"}
                  >
                    <FiRefreshCw size={13} />
                    {busyAction === "resend" ? "Sending…" : "Resend Notifications"}
                  </button>
                  <button className="adm-btn adm-btn-ghost" onClick={exportCSV}>
                    <FiDownload size={13} />
                    Export CSV
                  </button>
                </div>
              </section>
            )}

            {/* NOTIFICATION SETTINGS */}
            {selected && activeSection === "notifications" && (
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h3>Notification settings</h3>
                    <p className="adm-panel-sub">
                      Control when members receive push and email notifications
                    </p>
                  </div>
                  {savingSettings && <span className="adm-loading-dot" />}
                </div>

                <div className="adm-toggle-list">
                  <ToggleRow
                    label="Send push notifications when registration opens"
                    checked={!!selected.notifyOnOpen}
                    onChange={(v) => updateSetting("notifyOnOpen", v)}
                    disabled={savingSettings}
                  />
                  <ToggleRow
                    label="Send emails when registration opens"
                    checked={!!selected.notifyOnOpenEmail}
                    onChange={(v) => updateSetting("notifyOnOpenEmail", v)}
                    disabled={savingSettings}
                  />
                  <ToggleRow
                    label="Send push confirmation when a member registers"
                    checked={!!selected.notifyOnRegister}
                    onChange={(v) => updateSetting("notifyOnRegister", v)}
                    disabled={savingSettings}
                  />
                  <ToggleRow
                    label="Send email confirmation when a member registers"
                    checked={!!selected.notifyOnRegisterEmail}
                    onChange={(v) => updateSetting("notifyOnRegisterEmail", v)}
                    disabled={savingSettings}
                  />
                </div>
              </section>
            )}

            {/* ROSTER */}
            {selected && activeSection === "overview" && (
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h3>Member roster</h3>
                    <p className="adm-panel-sub">
                      {roster.count} member{roster.count !== 1 ? "s" : ""} registered
                      {roster.alumniCount > 0 && ` · ${roster.alumniCount} alumni`}
                      {roster.withoutAdmission > 0 && ` · ${roster.withoutAdmission} missing adm. no.`}
                    </p>
                  </div>
                  {rosterLoading && <span className="adm-loading-dot" />}
                </div>

                {roster.members.length === 0 ? (
                  <div className="adm-empty-inline">
                    <FiUsers size={18} />
                    <div>
                      <div className="adm-empty-inline-title">No members yet</div>
                      <div className="adm-empty-inline-sub">
                        Members who register will appear here
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="adm-table">
                    <div className="adm-tr adm-tr-head">
                      <div className="adm-th">#</div>
                      <div className="adm-th">Name</div>
                      <div className="adm-th">Admission No.</div>
                      <div className="adm-th">Contact</div>
                      <div className="adm-th">Role</div>
                      <div className="adm-th adm-th-action"></div>
                    </div>
                    {roster.members.map((m) => (
                      <div key={m.userId} className="adm-tr">
                        <div className="adm-td adm-td-num">{m.index}</div>
                        <div className="adm-td adm-td-name">{m.name}</div>
                        <div className="adm-td adm-td-mono">
                          {m.admissionNumber || <span className="adm-missing">—</span>}
                          {m.isAlumni && (
                            <span className="adm-alumni-tag">Alumnus</span>
                          )}
                        </div>
                        <div className="adm-td adm-td-mono">{m.contact || "—"}</div>
                        <div className="adm-td">{m.role || "member"}</div>
                        <div className="adm-td adm-td-action">
                          <button
                            className="adm-remove-btn"
                            onClick={() => removeMember(m.userId, m.name)}
                            title="Remove from semester"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <footer className="adm-footer">ZUCA PORTAL · ADMIN</footer>
          </>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ================================================================
   ToggleRow
   ================================================================ */
function ToggleRow({ label, checked, onChange, disabled }) {
  return (
    <label className={`adm-toggle ${disabled ? "disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="adm-toggle-input"
      />
      <span className="adm-toggle-slider" />
      <span className="adm-toggle-label">{label}</span>
    </label>
  );
}

/* ================================================================
   CSS — matches the Birthday admin look
   ================================================================ */
const css = `
  /* ===================== PAGE ===================== */
  .adm-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .adm-container { padding: 28px 24px 60px; max-width: 1180px; margin: 0 auto; }

  /* ===================== HEADER ===================== */
  .adm-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .adm-header-brand { display: flex; align-items: center; gap: 14px; }
  .adm-header-logo {
    width: 44px; height: 44px; border-radius: 10px;
    background: #ffffff; border: 1px solid #e5e5e5;
    padding: 5px; object-fit: contain; flex-shrink: 0;
  }
  .adm-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px;
  }
  .adm-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -.5px; color: #0f0f0f;
  }
  .adm-subtitle { font-size: 13.5px; color: #737373; margin: 4px 0 0 0; }
  .adm-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ===================== BUTTONS ===================== */
  .adm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all .15s ease; white-space: nowrap; font-family: inherit;
  }
  .adm-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .adm-btn:disabled { opacity: .5; cursor: not-allowed; }
  .adm-btn-primary { background: #0f0f0f; color: #ffffff; border-color: #0f0f0f; }
  .adm-btn-primary:hover:not(:disabled) { background: #262626; border-color: #262626; }
  .adm-btn-ghost { background: #ffffff; color: #262626; border-color: #e5e5e5; }
  .adm-btn-ghost:hover:not(:disabled) { background: #f5f5f5; border-color: #d4d4d4; }

  .adm-btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .adm-btn-row:last-child { margin-bottom: 0; }

  /* ===================== ALERTS ===================== */
  .adm-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .adm-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .adm-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* ===================== STATS ===================== */
  .adm-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 22px;
  }
  @media (max-width: 768px) { .adm-stats { grid-template-columns: repeat(2, 1fr); } }
  .adm-stat {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px;
    padding: 16px 18px; display: flex; align-items: center; gap: 14px;
  }
  .adm-stat-icon {
    width: 40px; height: 40px; border-radius: 10px; background: #f5f5f5;
    color: #262626; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .adm-stat-value {
    font-size: 22px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -.5px; line-height: 1.1;
  }
  .adm-stat-label {
    font-size: 11px; color: #737373; text-transform: uppercase;
    letter-spacing: .05em; font-weight: 600; margin-top: 2px;
  }

  /* ===================== SECTION TABS ===================== */
  .adm-section-tabs {
    display: flex; gap: 4px; background: #f5f5f5; padding: 4px;
    border-radius: 10px; margin-bottom: 16px; width: fit-content; max-width: 100%;
    overflow-x: auto; scrollbar-width: none;
  }
  .adm-section-tabs::-webkit-scrollbar { display: none; }
  .adm-section-tab {
    display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px;
    background: transparent; border: none; border-radius: 7px;
    color: #737373; font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: all .15s ease; font-family: inherit; white-space: nowrap;
  }
  .adm-section-tab:hover { color: #262626; }
  .adm-section-tab.active {
    background: #ffffff; color: #0f0f0f; box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }

  /* ===================== PANEL ===================== */
  .adm-panel {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 14px;
    padding: 20px; margin-bottom: 20px;
  }
  .adm-panel-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .adm-panel-head h3 {
    font-size: 14px; font-weight: 700; color: #0f0f0f; margin: 0;
    display: flex; align-items: center; gap: 8px;
  }
  .adm-panel-sub { font-size: 12.5px; color: #a3a3a3; margin: 4px 0 0 0; }

  .adm-loading-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #0f0f0f; animation: adm-pulse 1.2s ease-in-out infinite;
    display: inline-block;
  }
  @keyframes adm-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } }

  /* ===================== SELECTOR ===================== */
  .adm-select {
    width: 100%; padding: 11px 14px; border: 1px solid #e5e5e5;
    border-radius: 10px; background: #ffffff;
    font-family: inherit; font-size: 14px; color: #0f0f0f;
    outline: none; cursor: pointer;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .adm-select:focus {
    border-color: #0f0f0f; box-shadow: 0 0 0 3px rgba(15,15,15,.06);
  }

  .adm-meta {
    display: flex; flex-wrap: wrap; gap: 20px 32px;
    margin-top: 18px; padding-top: 18px; border-top: 1px solid #f5f5f5;
  }
  .adm-meta-item { display: flex; flex-direction: column; gap: 4px; }
  .adm-meta-label {
    font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: #a3a3a3;
  }
  .adm-meta-value { font-size: 13.5px; font-weight: 600; color: #0f0f0f; }

  /* ===================== STATUS ===================== */
  .adm-status {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
  }
  .adm-status-dot { width: 7px; height: 7px; border-radius: 50%; }
  .adm-status.open { color: #15803d; }
  .adm-status.open .adm-status-dot { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
  .adm-status.closed { color: #b91c1c; }
  .adm-status.closed .adm-status-dot { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.15); }

  /* ===================== TOGGLES ===================== */
  .adm-toggle-list { display: flex; flex-direction: column; gap: 10px; }
  .adm-toggle {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px;
    border: 1px solid #f0f0f0; border-radius: 10px;
    cursor: pointer; transition: all .15s ease;
    background: #ffffff;
  }
  .adm-toggle:hover:not(.disabled) { background: #fafafa; border-color: #e5e5e5; }
  .adm-toggle.disabled { cursor: not-allowed; opacity: .6; }
  .adm-toggle-input { position: absolute; opacity: 0; pointer-events: none; }
  .adm-toggle-slider {
    position: relative; width: 36px; height: 20px;
    background: #e5e5e5; border-radius: 999px; flex-shrink: 0;
    transition: background .2s ease;
  }
  .adm-toggle-slider::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,.15);
    transition: transform .2s ease;
  }
  .adm-toggle-input:checked + .adm-toggle-slider { background: #0f0f0f; }
  .adm-toggle-input:checked + .adm-toggle-slider::after { transform: translateX(16px); }
  .adm-toggle-label { font-size: 13px; font-weight: 500; color: #262626; line-height: 1.4; }

  /* ===================== ROSTER TABLE ===================== */
  .adm-table {
    border: 1px solid #e5e5e5; border-radius: 10px;
    overflow: hidden; font-size: 12.5px;
  }
  .adm-tr {
    display: grid;
    grid-template-columns: 44px minmax(140px,1.6fr) minmax(140px,1.4fr) minmax(120px,1fr) minmax(90px,.9fr) 48px;
    align-items: center; border-bottom: 1px solid #f5f5f5;
  }
  .adm-tr:last-child { border-bottom: 0; }
  .adm-tr-head { background: #fafafa; border-bottom: 1px solid #e5e5e5; }
  .adm-tr:not(.adm-tr-head):hover { background: #fafafa; }

  .adm-th {
    padding: 10px 14px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #a3a3a3;
  }
  .adm-th-action { text-align: right; }

  .adm-td {
    padding: 12px 14px; color: #525252;
    overflow-wrap: anywhere; min-width: 0;
  }
  .adm-td-num {
    color: #a3a3a3; font-weight: 700;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px;
  }
  .adm-td-name { font-weight: 600; color: #0f0f0f; font-size: 13px; line-height: 1.35; }
  .adm-td-mono {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px; color: #525252;
  }
  .adm-td-action { text-align: right; }

  .adm-missing { color: #b45309; }
  .adm-alumni-tag {
    display: inline-block; margin-left: 6px;
    padding: 2px 7px;
    background: #f5f3ff; color: #6d28d9;
    border: 1px solid #ddd6fe; border-radius: 999px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
  }

  .adm-remove-btn {
    width: 30px; height: 30px;
    display: inline-flex; align-items: center; justify-content: center;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 8px; color: #a3a3a3; padding: 0;
    transition: all .15s ease;
  }
  .adm-remove-btn:hover {
    background: #fef2f2; color: #dc2626; border-color: #fecaca;
  }

  /* ===================== EMPTY / INLINE ===================== */
  .adm-empty {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 14px;
    padding: 56px 32px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    color: #a3a3a3;
  }
  .adm-empty svg { color: #d4d4d4; }
  .adm-empty-title { font-size: 14.5px; font-weight: 700; color: #262626; margin-top: 4px; }
  .adm-empty-sub { font-size: 12.5px; color: #a3a3a3; max-width: 340px; line-height: 1.5; }

  .adm-empty-inline {
    display: flex; align-items: center; gap: 12px; padding: 18px;
    background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; color: #737373;
  }
  .adm-empty-inline-title { font-size: 13px; font-weight: 600; color: #262626; }
  .adm-empty-inline-sub { font-size: 12px; color: #a3a3a3; margin-top: 2px; }

  /* ===================== SKELETON ===================== */
  .adm-skel-line {
    height: 14px; border-radius: 6px; margin-bottom: 14px;
    background: linear-gradient(90deg,#f0f0f0 25%,#e5e5e5 50%,#f0f0f0 75%);
    background-size: 200% 100%;
    animation: adm-sk 1.4s infinite;
  }
  .adm-skel-line.title { height: 24px; max-width: 60%; }
  @keyframes adm-sk { to { background-position: -200% 0 } }

  /* ===================== FOOTER ===================== */
  .adm-footer {
    padding: 18px 0 0; text-align: center;
    font-size: 10px; font-weight: 700;
    letter-spacing: .22em; text-transform: uppercase;
    color: #a3a3a3;
  }

  /* ===================== RESPONSIVE ===================== */
  @media (max-width: 720px) {
    .adm-container { padding: 20px 16px 40px; }
    .adm-title { font-size: 22px; }
    .adm-tr { grid-template-columns: 40px 1fr 48px; row-gap: 6px; }
    .adm-th:nth-child(3),
    .adm-th:nth-child(4),
    .adm-th:nth-child(5) { display: none; }
    .adm-td:nth-child(3),
    .adm-td:nth-child(4),
    .adm-td:nth-child(5) {
      grid-column: 2 / 3; padding-top: 0; padding-bottom: 4px;
    }
    .adm-td-num { grid-row: span 4; padding-top: 14px; }
    .adm-td-action { grid-row: 1 / 5; align-self: start; padding-top: 12px; }
    .adm-td-mono { font-size: 11px; }
    .adm-header { flex-direction: column; align-items: stretch; }
    .adm-header-actions { width: 100%; }
    .adm-btn-row { flex-direction: column; }
    .adm-btn { width: 100%; justify-content: center; }
  }
`;