import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft, FiCalendar, FiCheck, FiAlertCircle, FiDownload,
  FiRefreshCw, FiUsers, FiTrash2, FiUnlock, FiLock,
  FiLink, FiCopy, FiShare2, FiUserPlus, FiSearch, FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import zucaLogo from "../../assets/zuca-logo.png";
import BASE_URL from "../../api";

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
  const [exporting, setExporting] = useState("");

  const [activeSection, setActiveSection] = useState("overview");
  const [copied, setCopied] = useState(false);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [pickedUser, setPickedUser] = useState(null);
  const [addAdmission, setAddAdmission] = useState("");
  const [addContact, setAddContact] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const searchTimer = useRef(null);
  const selected = semesters.find((s) => s.id === selectedId) || null;

  const registrationPath = "/my-semester";
  const registrationUrl = `${window.location.origin}${registrationPath}`;
  const shareMessage = selected
    ? `Register for ${selected.title} on the ZUCA Portal: ${registrationUrl}`
    : `Register on the ZUCA Portal: ${registrationUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link. Please copy manually.");
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selected ? `${selected.title} — Registration` : "ZUCA Registration",
          text: shareMessage,
          url: registrationUrl,
        });
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError("Could not open share sheet.");
        }
      }
    } else {
      handleCopyLink();
    }
  };

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

  const exportRoster = async (format) => {
    if (!selectedId || exporting) return;
    setExporting(format);
    setError(""); setSuccess("");
    const url = `${BASE_URL}/api/semesters/${selectedId}/export.${format}`;
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        let msg = "Export failed.";
        try {
          const j = await r.json();
          msg = j.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `roster_${(selected?.title || "semester").replace(/[^a-z0-9]/gi, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setSuccess(`Roster exported as ${format.toUpperCase()}.`);
    } catch (err) {
      setError(err.message || "Could not export roster.");
    } finally {
      setExporting("");
    }
  };

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

  const resetAddPanel = () => {
    setUserQuery("");
    setUserResults([]);
    setPickedUser(null);
    setAddAdmission("");
    setAddContact("");
    setAddRole("");
  };

  const toggleAddPanel = () => {
    if (showAddPanel) {
      resetAddPanel();
      setShowAddPanel(false);
    } else {
      resetAddPanel();
      setShowAddPanel(true);
    }
  };

  const loadEligibleUsers = async (q = "") => {
    if (!selectedId) return;
    setUserSearching(true);
    setError("");
    try {
      const res = await axios.get(
        `${BASE_URL}/api/semesters/${selectedId}/eligible-users?search=${encodeURIComponent(q)}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserResults(res.data.users || []);
    } catch (err) {
      setUserResults([]);
      setError(err.response?.data?.error || "Could not load users.");
    } finally {
      setUserSearching(false);
    }
  };

  useEffect(() => {
    if (!showAddPanel) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadEligibleUsers(userQuery), 250);
    return () => clearTimeout(searchTimer.current);
    /* eslint-disable-next-line */
  }, [userQuery, showAddPanel, selectedId]);

  const pickUser = (u) => {
    setPickedUser(u);
    setUserResults([]);
    setUserQuery(u.fullName || "");
    setAddAdmission(u.admissionNumber || "");
    setAddContact(u.phone || "");
    setAddRole(u.specialRole || u.role || "member");
  };

  const clearPickedUser = () => {
    setPickedUser(null);
    setUserQuery("");
    setUserResults([]);
    setAddAdmission("");
    setAddContact("");
    setAddRole("");
  };

  const submitAddUser = async () => {
    if (!selectedId) return;
    if (!pickedUser) {
      setError("Select a user to register.");
      return;
    }
    if (!addAdmission.trim()) {
      setError("Admission number is required. Enter N/A for alumni.");
      return;
    }
    setAddBusy(true);
    setError(""); setSuccess("");
    try {
      const res = await axios.post(
        `${BASE_URL}/api/semesters/${selectedId}/register-user`,
        {
          userId: pickedUser.id,
          admissionNumber: addAdmission.trim(),
          contact: addContact.trim() || undefined,
          role: addRole.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message || "Member registered.");
      resetAddPanel();
      setShowAddPanel(false);
      await loadRoster(selectedId);
      await loadSemesters();
    } catch (err) {
      setError(err.response?.data?.error || "Could not register user.");
    } finally {
      setAddBusy(false);
    }
  };

  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="adm-page">
      <div className="adm-container">
        <header className="adm-header">
          <div className="adm-header-brand">
            <img src={zucaLogo} alt="ZUCA" className="adm-header-logo" />
            <div>
              <div className="adm-eyebrow">
                <FiCalendar size={12} /> Administration
              </div>
              <h1 className="adm-title">Club Registration</h1>
              <p className="adm-subtitle">
                Open registration, register members, and export rosters
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
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h3>Select semester</h3>
                  <p className="adm-panel-sub">
                    Choose which semester you are managing.
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
              )}
            </section>

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

            {selected && (
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h3><FiLink size={14} /> Share registration link</h3>
                    <p className="adm-panel-sub">
                      Send this link so members can register for{" "}
                      <strong>{selected.title}</strong>
                    </p>
                  </div>
                </div>

                <div className="adm-share-link">
                  <FiLink size={14} className="adm-share-icon" />
                  <input
                    type="text"
                    readOnly
                    value={registrationUrl}
                    onFocus={(e) => e.target.select()}
                    className="adm-share-input"
                  />
                  <button
                    className={`adm-btn adm-btn-primary adm-share-copy ${copied ? "copied" : ""}`}
                    onClick={handleCopyLink}
                  >
                    {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="adm-btn-row adm-share-actions">
                  <button
                    className="adm-btn adm-btn-whatsapp"
                    onClick={handleWhatsAppShare}
                  >
                    <FaWhatsapp size={14} /> WhatsApp
                  </button>
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={handleNativeShare}
                  >
                    <FiShare2 size={13} /> Share
                  </button>
                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={toggleAddPanel}
                  >
                    <FiUserPlus size={13} /> Register a member
                  </button>
                </div>

                {!selected.registrationOpen && (
                  <p className="adm-share-warn">
                    <FiAlertCircle size={13} />
                    Registration is currently closed — open it before sharing.
                  </p>
                )}

                {showAddPanel && (
                  <div className="adm-add-panel">
                    <div className="adm-add-head">
                      <h4>Register a member manually</h4>
                      <button
                        className="adm-add-close"
                        onClick={toggleAddPanel}
                        aria-label="Close"
                      >
                        <FiX size={14} />
                      </button>
                    </div>

                    {!pickedUser ? (
                      <>
                        <div className="adm-search-row">
                          <div className="adm-search">
                            <FiSearch size={14} />
                            <input
                              type="text"
                              placeholder="Search member by name, email, membership #"
                              value={userQuery}
                              onChange={(e) => setUserQuery(e.target.value)}
                            />
                          </div>
                        </div>

                        {userSearching && (
                          <div className="adm-user-loading">Loading users…</div>
                        )}

                        {!userSearching && userResults.length > 0 && (
                          <div className="adm-user-results">
                            {userResults.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                className={`adm-user-result ${u.alreadyRegistered ? "registered" : ""}`}
                                onClick={() => !u.alreadyRegistered && pickUser(u)}
                                disabled={u.alreadyRegistered}
                              >
                                <div className="adm-user-result-name">
                                  {u.fullName}
                                  {u.alreadyRegistered && (
                                    <span className="adm-user-result-tag">Registered</span>
                                  )}
                                </div>
                                <div className="adm-user-result-meta">
                                  {u.membership_number || "—"} · {u.email || "no email"}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {!userSearching && userResults.length === 0 && (
                          <div className="adm-user-loading">
                            No matching users.
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="adm-picked-user">
                          <div>
                            <div className="adm-picked-name">
                              {pickedUser.fullName}
                            </div>
                            <div className="adm-picked-meta">
                              {pickedUser.membership_number || "—"} ·{" "}
                              {pickedUser.email || "no email"}
                            </div>
                          </div>
                          <button
                            className="adm-add-close"
                            onClick={clearPickedUser}
                            title="Change user"
                          >
                            <FiX size={14} />
                          </button>
                        </div>

                        <div className="adm-add-fields">
                          <label className="adm-add-field">
                            <span>Admission number</span>
                            <input
                              type="text"
                              value={addAdmission}
                              onChange={(e) => setAddAdmission(e.target.value)}
                              placeholder="e.g. BAF-05-0029/2024 or N/A"
                            />
                          </label>

                          <label className="adm-add-field">
                            <span>Contact</span>
                            <input
                              type="tel"
                              value={addContact}
                              onChange={(e) => setAddContact(e.target.value)}
                              placeholder="e.g. 0798139693"
                            />
                          </label>

                          <label className="adm-add-field">
                            <span>Role</span>
                            <input
                              type="text"
                              value={addRole}
                              onChange={(e) => setAddRole(e.target.value)}
                              placeholder="e.g. member, chairperson"
                            />
                          </label>
                        </div>

                        <div className="adm-btn-row adm-add-actions">
                          <button
                            className="adm-btn adm-btn-ghost"
                            onClick={clearPickedUser}
                            disabled={addBusy}
                          >
                            Cancel
                          </button>
                          <button
                            className="adm-btn adm-btn-primary"
                            onClick={submitAddUser}
                            disabled={addBusy}
                          >
                            <FiCheck size={13} />
                            {addBusy ? "Registering…" : "Register member"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {selected && (
              <div className="adm-summary">
                <span className="adm-summary-item">
                  <FiUsers size={14} /> {roster.count} member{roster.count !== 1 ? "s" : ""}
                </span>
                {roster.alumniCount > 0 && (
                  <span className="adm-summary-item">· {roster.alumniCount} alumni</span>
                )}
                {roster.withoutAdmission > 0 && (
                  <span className="adm-summary-item adm-summary-warn">
                    · {roster.withoutAdmission} missing admission no.
                  </span>
                )}
                <span className="adm-summary-item">
                  · Registration {selected.registrationOpen ? "open" : "closed"}
                </span>
                {rosterLoading && <span className="adm-loading-dot" />}
              </div>
            )}

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
                </div>

                <div className="adm-btn-row">
                  <span className="adm-export-label">Export:</span>
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={() => exportRoster("xlsx")}
                    disabled={!!exporting}
                  >
                    <FiDownload size={13} />
                    {exporting === "xlsx" ? "Exporting…" : "Excel"}
                  </button>
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={() => exportRoster("pdf")}
                    disabled={!!exporting}
                  >
                    <FiDownload size={13} />
                    {exporting === "pdf" ? "Exporting…" : "PDF"}
                  </button>
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={() => exportRoster("doc")}
                    disabled={!!exporting}
                  >
                    <FiDownload size={13} />
                    {exporting === "doc" ? "Exporting…" : "Word"}
                  </button>
                  <button
                    className="adm-btn adm-btn-ghost"
                    onClick={() => exportRoster("csv")}
                    disabled={!!exporting}
                  >
                    <FiDownload size={13} />
                    {exporting === "csv" ? "Exporting…" : "CSV"}
                  </button>
                </div>
              </section>
            )}

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

            {selected && activeSection === "overview" && (
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h3>Member roster</h3>
                    <p className="adm-panel-sub">
                      Scroll horizontally to see all columns
                    </p>
                  </div>
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
                  <div className="adm-table-wrapper">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Admission No.</th>
                          <th>Contact</th>
                          <th>Role</th>
                          <th>Registered</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.members.map((m) => (
                          <tr key={m.userId}>
                            <td className="adm-td-num">{m.index}</td>
                            <td className="adm-td-name">{m.name}</td>
                            <td className="adm-td-mono">
                              {m.admissionNumber || <span className="adm-missing">—</span>}
                              {m.isAlumni && (
                                <span className="adm-alumni-tag">Alumnus</span>
                              )}
                            </td>
                            <td className="adm-td-mono">{m.contact || "—"}</td>
                            <td>{m.role || "member"}</td>
                            <td className="adm-td-mono">
                              {m.registeredAt ? fmtDate(m.registeredAt) : "—"}
                            </td>
                            <td className="adm-td-action">
                              <button
                                className="adm-remove-btn"
                                onClick={() => removeMember(m.userId, m.name)}
                                title="Remove from semester"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

const css = `
  .adm-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .adm-container { padding: 28px 24px 60px; max-width: 1180px; margin: 0 auto; }

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
  .adm-btn-whatsapp { background: #25D366; color: #ffffff; border-color: #25D366; }
  .adm-btn-whatsapp:hover { background: #1ebe5b; border-color: #1ebe5b; }

  .adm-btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; align-items: center; }
  .adm-btn-row:last-child { margin-bottom: 0; }

  .adm-export-label {
    display: inline-flex; align-items: center;
    font-size: 11px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #a3a3a3; padding: 0 4px;
  }

  .adm-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .adm-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .adm-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  .adm-share-link {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid #e5e5e5; border-radius: 10px;
    padding: 6px 6px 6px 12px; background: #ffffff;
    transition: border-color .15s ease;
  }
  .adm-share-link:focus-within { border-color: #0f0f0f; }
  .adm-share-icon { color: #a3a3a3; flex-shrink: 0; }
  .adm-share-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12.5px; color: #262626;
    padding: 6px 0; min-width: 0;
  }
  .adm-share-copy { flex-shrink: 0; border-radius: 8px !important; }
  .adm-share-copy.copied {
    background: #15803d !important; border-color: #15803d !important;
  }
  .adm-share-actions { margin-top: 10px; margin-bottom: 0; }
  .adm-share-warn {
    display: flex; align-items: center; gap: 8px;
    margin: 12px 0 0; padding: 10px 12px;
    background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
    border-radius: 8px; font-size: 12.5px; font-weight: 500;
  }
  .adm-share-warn svg { flex-shrink: 0; }

  .adm-add-panel {
    margin-top: 16px; padding: 16px;
    border: 1px solid #e5e5e5; border-radius: 12px;
    background: #fafafa;
  }
  .adm-add-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 14px;
  }
  .adm-add-head h4 {
    margin: 0; font-size: 13px; font-weight: 700; color: #0f0f0f;
  }
  .adm-add-close {
    background: transparent; border: none; cursor: pointer;
    color: #737373; padding: 4px; border-radius: 6px; display: flex;
  }
  .adm-add-close:hover { background: #f0f0f0; color: #0f0f0f; }

  .adm-search-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .adm-search {
    flex: 1; min-width: 220px;
    display: flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 9px;
    padding: 0 12px; height: 38px; color: #737373;
    transition: border-color .15s ease;
  }
  .adm-search:focus-within { border-color: #0f0f0f; }
  .adm-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 13px; color: #171717; font-family: inherit; height: 100%;
  }
  .adm-search input::placeholder { color: #a3a3a3; }

  .adm-user-results {
    margin-top: 10px; border: 1px solid #e5e5e5; border-radius: 10px;
    background: #ffffff; max-height: 280px; overflow-y: auto;
  }
  .adm-user-result {
    display: block; width: 100%; text-align: left;
    padding: 10px 14px; border: none; background: transparent;
    cursor: pointer; border-bottom: 1px solid #f5f5f5;
    font-family: inherit;
  }
  .adm-user-result:last-child { border-bottom: none; }
  .adm-user-result:hover:not(:disabled) { background: #fafafa; }
  .adm-user-result:disabled { cursor: not-allowed; opacity: .6; }
  .adm-user-result.registered { background: #fafafa; }
  .adm-user-result-name {
    font-size: 13px; font-weight: 600; color: #0f0f0f;
    display: flex; align-items: center; gap: 8px;
  }
  .adm-user-result-meta { font-size: 12px; color: #737373; margin-top: 2px; }
  .adm-user-result-tag {
    display: inline-block; padding: 1px 6px;
    background: #eef2f7; color: #525252;
    border-radius: 999px; font-size: 10px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
  }
  .adm-user-loading {
    margin-top: 10px; padding: 12px 14px;
    background: #ffffff; border: 1px dashed #e5e5e5; border-radius: 10px;
    font-size: 12.5px; color: #737373; text-align: center;
  }

  .adm-picked-user {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px; background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 10px; margin-bottom: 12px;
  }
  .adm-picked-name { font-size: 13px; font-weight: 700; color: #0f0f0f; }
  .adm-picked-meta { font-size: 12px; color: #737373; margin-top: 2px; }

  .adm-add-fields {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 14px;
  }
  .adm-add-field { display: flex; flex-direction: column; gap: 6px; }
  .adm-add-field span {
    font-size: 10.5px; font-weight: 700; color: #737373;
    text-transform: uppercase; letter-spacing: .08em;
  }
  .adm-add-field input {
    width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5;
    border-radius: 9px; font-size: 13px; font-family: inherit;
    background: #ffffff; color: #171717; outline: none;
  }
  .adm-add-field input:focus {
    border-color: #0f0f0f; box-shadow: 0 0 0 3px rgba(15,15,15,.06);
  }
  .adm-add-actions { justify-content: flex-end; }

  .adm-summary {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    padding: 12px 16px; margin-bottom: 20px;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 10px;
    font-size: 13px; color: #525252; font-weight: 500;
  }
  .adm-summary-item { display: inline-flex; align-items: center; gap: 6px; }
  .adm-summary-item svg { color: #a3a3a3; }
  .adm-summary-warn { color: #b45309; }

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
  .adm-panel-head h3 svg { color: #737373; }
  .adm-panel-sub { font-size: 12.5px; color: #a3a3a3; margin: 4px 0 0 0; line-height: 1.5; }
  .adm-panel-sub strong { color: #525252; font-weight: 600; }

  .adm-loading-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #0f0f0f; animation: adm-pulse 1.2s ease-in-out infinite;
    display: inline-block;
  }
  @keyframes adm-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } }

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

  .adm-table-wrapper {
    width: 100%;
    overflow-x: auto;
    overflow-y: auto;
    max-height: calc(100vh - 320px);
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    background: #ffffff;
    -webkit-overflow-scrolling: touch;
  }
  .adm-table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .adm-table thead th {
    position: sticky; top: 0; z-index: 1;
    padding: 12px 14px;
    background: #fafafa;
    border-bottom: 1px solid #e5e5e5;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #a3a3a3; text-align: left;
    white-space: nowrap;
  }
  .adm-table tbody td {
    padding: 12px 14px;
    border-bottom: 1px solid #f5f5f5;
    color: #525252;
    white-space: nowrap;
    vertical-align: middle;
  }
  .adm-table tbody tr:last-child td { border-bottom: 0; }
  .adm-table tbody tr:hover { background: #fafafa; }

  .adm-td-num {
    color: #a3a3a3; font-weight: 700;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px;
    width: 48px;
  }
  .adm-td-name { font-weight: 600; color: #0f0f0f; font-size: 13px; }
  .adm-td-mono {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px; color: #525252;
  }
  .adm-td-action { text-align: right; width: 60px; }

  .adm-missing { color: #b45309; }
  .adm-alumni-tag {
    display: inline-block; margin-left: 6px;
    padding: 2px 7px;
    background: #f5f3ff; color: #6d28d9;
    border: 1px solid #ddd6fe; border-radius: 999px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
    white-space: nowrap;
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

  .adm-skel-line {
    height: 14px; border-radius: 6px; margin-bottom: 14px;
    background: linear-gradient(90deg,#f0f0f0 25%,#e5e5e5 50%,#f0f0f0 75%);
    background-size: 200% 100%;
    animation: adm-sk 1.4s infinite;
  }
  .adm-skel-line.title { height: 24px; max-width: 60%; }
  @keyframes adm-sk { to { background-position: -200% 0 } }

  .adm-footer {
    padding: 18px 0 0; text-align: center;
    font-size: 10px; font-weight: 700;
    letter-spacing: .22em; text-transform: uppercase;
    color: #a3a3a3;
  }

  @media (max-width: 720px) {
    .adm-container { padding: 20px 16px 40px; }
    .adm-title { font-size: 22px; }
    .adm-header { flex-direction: column; align-items: stretch; }
    .adm-header-actions { width: 100%; }
    .adm-btn-row { flex-direction: column; }
    .adm-btn-row .adm-btn { width: 100%; justify-content: center; }

    .adm-share-link { flex-wrap: wrap; padding: 8px; gap: 8px; }
    .adm-share-input { padding: 6px 0; min-width: 100%; font-size: 12px; }
    .adm-share-copy { width: 100%; justify-content: center; }

    .adm-add-fields { grid-template-columns: 1fr; }
    .adm-search-row { flex-direction: column; }
    .adm-search { min-width: 100%; }

    .adm-summary { font-size: 12.5px; gap: 6px; }
  }
`;