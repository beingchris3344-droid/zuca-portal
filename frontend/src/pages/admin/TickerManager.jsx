import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiPause,
  FiPlay,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiCheck,
  FiLoader
} from "react-icons/fi";
import BASE_URL from "../../api";

const PRESET_COLORS = [
  { key: "purple", bg: "#7c3aed", label: "Purple" },
  { key: "red", bg: "#dc2626", label: "Red" },
  { key: "amber", bg: "#f59e0b", label: "Amber" },
  { key: "green", bg: "#16a34a", label: "Green" },
  { key: "blue", bg: "#2563eb", label: "Blue" },
  { key: "slate", bg: "#1e293b", label: "Slate" }
];

const ROLE_OPTIONS = [
  "member",
  "admin",
  "secretary",
  "treasurer",
  "choir_moderator",
  "media_moderator",
  "jumuia_leader"
];

const LINK_OPTIONS = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/home", label: "Home" },
  { value: "/announcements", label: "Announcements" },
  { value: "/contributions", label: "Contributions" },
  { value: "/mass-programs", label: "Mass Programs" },
  { value: "/mass-readings", label: "Mass Readings" },
  { value: "/liturgical-calendar", label: "Liturgical Calendar" },
  { value: "/hymns", label: "Hymns" },
  { value: "/prayer", label: "Prayer" },
  { value: "/gallery", label: "Gallery" },
  { value: "/youtube", label: "YouTube Hub" },
  { value: "/messenger", label: "Messenger" },
  { value: "/chat", label: "Community Chat" },
  { value: "/games", label: "Games" },
  { value: "/schedules", label: "Schedules" },
  { value: "/join-jumuia", label: "Join Jumuia" },
  { value: "/jumuia-contributions", label: "My Jumuia" },
  { value: "/executive", label: "Executive Team" },
  { value: "/executive/minutes", label: "Executive Minutes" },
  { value: "/minutes", label: "Meeting Minutes" },
  { value: "/member/attendance", label: "My Attendance" },
  { value: "/member/attendance-history", label: "Attendance History" },
  { value: "/feedback", label: "Send Feedback" },
  { value: "/feedback/history", label: "My Feedback History" },
  { value: "/tools/pdf", label: "PDF Tools" },
  { value: "/profile", label: "Birthday Settings" },
  { value: "/profile-settings", label: "Profile Settings" },
  { value: "/user-manual", label: "User Manual" },
  { value: "/help", label: "Help & FAQ" },
  { value: "/privacy-policy", label: "Privacy Policy" },
  { value: "/terms", label: "Terms of Service" },
  { value: "/cookies", label: "Cookies Policy" },
  { value: "/register", label: "Register" },
  { value: "/login", label: "Login" }
];

const EMPTY_FORM = {
  text: "",
  title: "",
  style: "rotate",
  color: "purple",
  customBg: "#7c3aed",
  customText: "",
  linkUrl: "",
  linkText: "",
  target: "all",
  targetRoles: [],
  targetUserIds: [],
  targetJumuiaId: null,
  priority: 5,
  dismissible: true,
  requireAck: false,
  sendPushNotification: false,
  startAt: "",
  endAt: "",
  active: true
};

function getReadableTextColor(hex) {
  if (!hex) return "#ffffff";
  const clean = String(hex).replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if ([r, g, b].some((v) => isNaN(v))) return "#ffffff";
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1f2937" : "#ffffff";
}

function toLocalInput(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function isCustomUrl(url) {
  if (!url) return false;
  return !LINK_OPTIONS.some((o) => o.value === url);
}

export default function TickerManager() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [jumuia, setJumuia] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadTickers = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/ticker/admin`, {
        headers
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/users/light`, {
        headers
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      /* silent */
    }
  };

  const loadJumuia = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/jumuia`, { headers });
      setJumuia(Array.isArray(data) ? data : []);
    } catch (err) {
      /* silent */
    }
  };

  useEffect(() => {
    loadTickers();
    loadUsers();
    loadJumuia();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users.slice(0, 50);
    const q = userSearch.toLowerCase();
    return users
      .filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.membership_number?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [users, userSearch]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setUserSearch("");
    setError("");
  };

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleArrayItem = (key, value) => {
    setForm((f) => {
      const list = f[key] || [];
      return {
        ...f,
        [key]: list.includes(value)
          ? list.filter((x) => x !== value)
          : [...list, value]
      };
    });
  };

  const currentBg =
    form.color === "custom"
      ? form.customBg || "#7c3aed"
      : PRESET_COLORS.find((c) => c.key === form.color)?.bg || "#7c3aed";

  const currentText = getReadableTextColor(currentBg);

  const save = async () => {
    setError("");

    if (!form.text.trim()) {
      setError("Message text is required");
      return;
    }

    if (form.target === "user" && form.targetUserIds.length === 0) {
      setError("Pick at least one user");
      return;
    }

    if (form.target === "role" && form.targetRoles.length === 0) {
      setError("Pick at least one role");
      return;
    }

    const payload = {
      text: form.text,
      title: form.title || null,
      style: form.style,
      color: form.color,
      customBg: form.color === "custom" ? form.customBg : null,
      customText:
        form.color === "custom" ? getReadableTextColor(form.customBg) : null,
      linkUrl: form.linkUrl || null,
      linkText: form.linkText || null,
      target: form.target,
      targetRoles: form.targetRoles,
      targetUserIds: form.targetUserIds,
      targetJumuiaId: form.targetJumuiaId || null,
      priority: Number(form.priority) || 5,
      dismissible: form.dismissible,
      requireAck: form.requireAck,
      sendPushNotification: form.sendPushNotification,
      startAt: form.startAt
        ? new Date(form.startAt).toISOString()
        : new Date().toISOString(),
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      active: form.active
    };

    try {
      setBusy(true);
      if (editingId) {
        await axios.put(`${BASE_URL}/api/ticker/admin/${editingId}`, payload, {
          headers
        });
        setToast("Ticker updated");
      } else {
        await axios.post(`${BASE_URL}/api/ticker/admin`, payload, { headers });
        setToast("Ticker created");
      }
      resetForm();
      loadTickers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (t) => {
    setEditingId(t.id);
    setShowForm(true);
    setForm({
      text: t.text || "",
      title: t.title || "",
      style: t.style || "rotate",
      color: t.color || "purple",
      customBg: t.customBg || "#7c3aed",
      customText: t.customText || "",
      linkUrl: t.linkUrl || "",
      linkText: t.linkText || "",
      target: t.target || "all",
      targetRoles: t.targetRoles || [],
      targetUserIds: t.targetUserIds || [],
      targetJumuiaId: t.targetJumuiaId || null,
      priority: t.priority ?? 5,
      dismissible: t.dismissible ?? true,
      requireAck: t.requireAck ?? false,
      sendPushNotification: t.sendPushNotification ?? false,
      startAt: toLocalInput(t.startAt),
      endAt: toLocalInput(t.endAt),
      active: t.active ?? true
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this ticker?")) return;
    const snapshot = items;
    setItems((prev) => prev.filter((t) => t.id !== id));
    try {
      await axios.delete(`${BASE_URL}/api/ticker/admin/${id}`, { headers });
      setToast("Ticker deleted");
    } catch (err) {
      setItems(snapshot);
      setError(err.response?.data?.error || err.message);
    }
  };

  const toggleActive = async (id) => {
    const snapshot = items;
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
    try {
      await axios.patch(
        `${BASE_URL}/api/ticker/admin/${id}/toggle`,
        {},
        { headers }
      );
    } catch (err) {
      setItems(snapshot);
      setError(err.response?.data?.error || err.message);
    }
  };

  const linkSelectValue = form.linkUrl
    ? isCustomUrl(form.linkUrl)
      ? "custom"
      : form.linkUrl
    : "";

  return (
    <div className="tk-page">
      <div className="tk-container">
        <header className="tk-header">
          <div>
            <h1 className="tk-title">Ticker Manager</h1>
            <p className="tk-subtitle">
              Create scrolling, rotating, or static announcements. Target
              everyone, a role, or a single user.
            </p>
          </div>
          <button
            type="button"
            className="tk-btn tk-btn-primary"
            onClick={() => {
              resetForm();
              setShowForm((s) => !s);
            }}
          >
            {showForm ? <FiX size={13} /> : <FiPlus size={13} />}
            <span>{showForm ? "Close" : "New Ticker"}</span>
          </button>
        </header>

        {toast && <div className="tk-toast tk-toast-success">{toast}</div>}
        {error && <div className="tk-toast tk-toast-error">{error}</div>}

        {showForm && (
          <section className="tk-panel">
            <h2 className="tk-panel-title">
              {editingId ? "Edit Ticker" : "New Ticker"}
            </h2>

            <div className="tk-field">
              <label className="tk-label">
                Message text <span className="tk-required">*</span>
              </label>
              <textarea
                value={form.text}
                onChange={(e) => handleChange("text", e.target.value)}
                rows={2}
                placeholder="e.g. Your account will be deleted in 7 days"
                className="tk-input tk-textarea"
              />
            </div>

            <div className="tk-row tk-row-2">
              <div className="tk-field">
                <label className="tk-label">
                  Title (for push notification)
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Optional"
                  className="tk-input"
                />
              </div>

              <div className="tk-field">
                <label className="tk-label">Style</label>
                <select
                  value={form.style}
                  onChange={(e) => handleChange("style", e.target.value)}
                  className="tk-input"
                >
                  <option value="rotate">Rotate (recommended)</option>
                  <option value="scroll">Scroll</option>
                  <option value="static">Static (fixed bar)</option>
                </select>
              </div>
            </div>

            <div className="tk-field">
              <label className="tk-label">Color</label>

              <div className="tk-color-block">
                <div className="tk-color-presets">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => handleChange("color", c.key)}
                      className={`tk-swatch ${
                        form.color === c.key ? "tk-swatch-active" : ""
                      }`}
                      style={{ background: c.bg }}
                      title={c.label}
                      aria-label={c.label}
                    />
                  ))}
                </div>

                <div className="tk-color-any">
                  <span className="tk-color-any-label">Any color</span>
                  <label className="tk-color-picker">
                    <input
                      type="color"
                      value={
                        form.color === "custom" ? form.customBg : "#7c3aed"
                      }
                      onChange={(e) => {
                        handleChange("color", "custom");
                        handleChange("customBg", e.target.value);
                      }}
                      className="tk-color-input"
                    />
                    <span
                      className={`tk-color-preview ${
                        form.color === "custom" ? "tk-color-preview-active" : ""
                      }`}
                      style={{
                        background:
                          form.color === "custom" ? form.customBg : "#7c3aed"
                      }}
                    />
                    <span className="tk-color-hex">
                      {form.color === "custom"
                        ? form.customBg.toUpperCase()
                        : "Click to pick"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="tk-row tk-row-2">
              <div className="tk-field">
                <label className="tk-label">Link destination (optional)</label>
                <select
                  value={linkSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "custom") {
                      handleChange(
                        "linkUrl",
                        isCustomUrl(form.linkUrl) ? form.linkUrl : ""
                      );
                    } else if (v === "") {
                      handleChange("linkUrl", "");
                      handleChange("linkText", "");
                    } else {
                      handleChange("linkUrl", v);
                      const match = LINK_OPTIONS.find((o) => o.value === v);
                      if (match) handleChange("linkText", match.label);
                    }
                  }}
                  className="tk-input"
                >
                  <option value="">No link</option>
                  {LINK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom">Custom URL</option>
                </select>

                {linkSelectValue === "custom" && (
                  <input
                    type="text"
                    value={form.linkUrl}
                    onChange={(e) => handleChange("linkUrl", e.target.value)}
                    placeholder="/some-page or https://..."
                    className="tk-input tk-input-spaced"
                  />
                )}
              </div>

              <div className="tk-field">
                <label className="tk-label">Link text (optional)</label>
                <input
                  type="text"
                  value={form.linkText}
                  onChange={(e) => handleChange("linkText", e.target.value)}
                  placeholder="Give now"
                  className="tk-input"
                />
              </div>
            </div>

            <div className="tk-row tk-row-3">
              <div className="tk-field">
                <label className="tk-label">Target</label>
                <select
                  value={form.target}
                  onChange={(e) => handleChange("target", e.target.value)}
                  className="tk-input"
                >
                  <option value="all">Everyone</option>
                  <option value="role">By role</option>
                  <option value="user">Specific user(s)</option>
                </select>
              </div>

              <div className="tk-field">
                <label className="tk-label">Priority (1-10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority}
                  onChange={(e) =>
                    handleChange("priority", Number(e.target.value))
                  }
                  className="tk-input"
                />
              </div>

              <div className="tk-field">
                <label className="tk-label">Jumuia (optional)</label>
                <select
                  value={form.targetJumuiaId || ""}
                  onChange={(e) =>
                    handleChange("targetJumuiaId", e.target.value || null)
                  }
                  className="tk-input"
                >
                  <option value="">Not jumuia-specific</option>
                  {jumuia.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.target === "role" && (
              <div className="tk-field">
                <label className="tk-label">Roles</label>
                <div className="tk-pill-row">
                  {ROLE_OPTIONS.map((r) => (
                    <label
                      key={r}
                      className={`tk-pill ${
                        form.targetRoles.includes(r) ? "tk-pill-active" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="tk-hidden"
                        checked={form.targetRoles.includes(r)}
                        onChange={() => toggleArrayItem("targetRoles", r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.target === "user" && (
              <div className="tk-field">
                <label className="tk-label">Users</label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or membership number"
                  className="tk-input"
                />
                <div className="tk-user-list">
                  {filteredUsers.map((u) => {
                    const checked = form.targetUserIds.includes(u.id);
                    return (
                      <label key={u.id} className="tk-user-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleArrayItem("targetUserIds", u.id)
                          }
                        />
                        <span className="tk-user-name">{u.fullName}</span>
                        <span className="tk-user-meta">
                          {u.email}
                          {u.membership_number
                            ? ` · ${u.membership_number}`
                            : ""}
                        </span>
                      </label>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="tk-user-empty">No users found</div>
                  )}
                </div>
              </div>
            )}

            <div className="tk-row tk-row-2">
              <div className="tk-field">
                <label className="tk-label">Start at</label>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => handleChange("startAt", e.target.value)}
                  className="tk-input"
                />
              </div>
              <div className="tk-field">
                <label className="tk-label">End at (optional)</label>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => handleChange("endAt", e.target.value)}
                  className="tk-input"
                />
              </div>
            </div>

            <div className="tk-checks">
              <label className="tk-check">
                <input
                  type="checkbox"
                  checked={form.dismissible}
                  onChange={(e) =>
                    handleChange("dismissible", e.target.checked)
                  }
                />
                Dismissible
              </label>
              <label className="tk-check">
                <input
                  type="checkbox"
                  checked={form.requireAck}
                  onChange={(e) =>
                    handleChange("requireAck", e.target.checked)
                  }
                />
                Require &quot;I understand&quot;
              </label>
              <label className="tk-check">
                <input
                  type="checkbox"
                  checked={form.sendPushNotification}
                  onChange={(e) =>
                    handleChange("sendPushNotification", e.target.checked)
                  }
                />
                Also send push notification
              </label>
              <label className="tk-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => handleChange("active", e.target.checked)}
                />
                Active
              </label>
            </div>

            <div className="tk-field">
              <label className="tk-label">Live preview</label>
              <div
                className="tk-preview-bar"
                style={{ background: currentBg, color: currentText }}
              >
                <span className="tk-preview-text">
                  {form.text || "Your ticker message will appear here"}
                  {form.linkUrl && form.linkText && (
                    <span className="tk-preview-link">{form.linkText}</span>
                  )}
                </span>
                {form.requireAck && (
                  <span
                    className="tk-preview-ack"
                    style={{ borderColor: currentText }}
                  >
                    I understand 
                  </span>
                )}
              </div>
            </div>

            <div className="tk-actions">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="tk-btn tk-btn-primary"
              >
                {busy ? (
                  <>
                    <FiLoader size={13} className="tk-spin" />
                    <span>Saving</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={13} />
                    <span>
                      {editingId ? "Update Ticker" : "Create Ticker"}
                    </span>
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="tk-btn tk-btn-ghost"
                >
                  <FiX size={13} />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </section>
        )}

        <section className="tk-panel">
          <h2 className="tk-panel-title">All Tickers ({items.length})</h2>

          <ul className="tk-list">
            {items.map((t) => {
              const preset = PRESET_COLORS.find((x) => x.key === t.color);
              const bg = preset ? preset.bg : t.customBg || "#7c3aed";
              const text = t.customText || getReadableTextColor(bg);
              return (
                <li key={t.id} className="tk-item">
                  <div
                    className="tk-item-color"
                    style={{ background: bg, color: text }}
                  />

                  <div className="tk-item-body">
                    <div className="tk-item-text">{t.text}</div>
                    <div className="tk-item-meta">
                      {t.style} · priority {t.priority} · target: {t.target}
                      {t.target === "role" &&
                        ` (${t.targetRoles.join(", ")})`}
                      {t.target === "user" &&
                        ` (${t.targetUserIds.length} users)`}
                      {t.requireAck ? " · requires ack" : ""}
                      {t.sendPushNotification ? " · push" : ""}
                      {!t.active ? " · paused" : ""}
                    </div>
                    <div className="tk-item-stats">
                      {t.ackCount ? `${t.ackCount} acknowledged · ` : ""}
                      {t._count?.dismissals || 0} dismissed
                    </div>
                  </div>

                  <div className="tk-item-actions">
                    <button
                      type="button"
                      className="tk-icon-btn"
                      onClick={() => toggleActive(t.id)}
                      title={t.active ? "Pause" : "Resume"}
                    >
                      {t.active ? <FiPause size={14} /> : <FiPlay size={14} />}
                    </button>
                    <button
                      type="button"
                      className="tk-icon-btn"
                      onClick={() => edit(t)}
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="tk-icon-btn tk-icon-btn-danger"
                      onClick={() => remove(t.id)}
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="tk-empty">No tickers yet. Create one above.</li>
            )}
          </ul>
        </section>
      </div>

      <style>{tickerManagerCSS}</style>
    </div>
  );
}

const tickerManagerCSS = `
  .tk-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .tk-container {
    padding: 28px 24px 60px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .tk-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 22px;
    padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5;
  }

  .tk-title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #0f0f0f;
    margin: 0;
  }

  .tk-subtitle {
    font-size: 13.5px;
    color: #737373;
    margin: 6px 0 0 0;
    line-height: 1.5;
    max-width: 640px;
  }

  .tk-toast {
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 16px;
    border: 1px solid;
  }

  .tk-toast-success {
    background: #f0fdf4;
    color: #15803d;
    border-color: #bbf7d0;
  }

  .tk-toast-error {
    background: #fef2f2;
    color: #b91c1c;
    border-color: #fecaca;
  }

  .tk-panel {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
  }

  .tk-panel-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f0f0f;
    margin: 0 0 20px 0;
    letter-spacing: -0.1px;
  }

  .tk-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .tk-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #525252;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tk-required { color: #dc2626; }

  .tk-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 9px;
    font-size: 13px;
    color: #171717;
    background: #ffffff;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .tk-input:focus { border-color: #0f0f0f; }

  .tk-input-spaced { margin-top: 8px; }

  .tk-textarea {
    resize: vertical;
    min-height: 70px;
    line-height: 1.5;
  }

  .tk-row {
    display: grid;
    gap: 14px;
    margin-bottom: 16px;
  }

  .tk-row-2 { grid-template-columns: 1fr 1fr; }
  .tk-row-3 { grid-template-columns: 1fr 1fr 1fr; }

  @media (max-width: 640px) {
    .tk-row-2, .tk-row-3 { grid-template-columns: 1fr; }
  }

  .tk-color-block {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    padding: 14px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
  }

  .tk-color-presets {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .tk-swatch {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.1s ease;
    padding: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  }

  .tk-swatch:hover { transform: scale(1.08); }

  .tk-swatch-active {
    border-color: #0f0f0f;
    transform: scale(1.05);
  }

  .tk-color-any {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-left: 16px;
    border-left: 1px solid #e5e5e5;
  }

  @media (max-width: 640px) {
    .tk-color-any {
      padding-left: 0;
      border-left: none;
      width: 100%;
    }
  }

  .tk-color-any-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #525252;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .tk-color-picker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px 6px 6px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 999px;
    cursor: pointer;
    transition: border-color 0.15s ease;
    position: relative;
    user-select: none;
  }

  .tk-color-picker:hover { border-color: #d4d4d4; }

  .tk-color-input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    cursor: pointer;
    border: none;
    padding: 0;
  }

  .tk-color-preview {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
    pointer-events: none;
  }

  .tk-color-preview-active {
    box-shadow: 0 0 0 2px #0f0f0f, 0 0 0 4px #ffffff inset;
  }

  .tk-color-hex {
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    pointer-events: none;
    white-space: nowrap;
  }

  .tk-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tk-pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border: 1px solid #e5e5e5;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .tk-pill:hover {
    border-color: #d4d4d4;
    background: #fafafa;
  }

  .tk-pill-active {
    background: #f3e8ff;
    border-color: #a855f7;
    color: #6b21a8;
  }

  .tk-hidden { display: none; }

  .tk-user-list {
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    max-height: 240px;
    overflow-y: auto;
    margin-top: 8px;
    background: #ffffff;
  }

  .tk-user-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    font-size: 13px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .tk-user-row:hover { background: #fafafa; }
  .tk-user-row:last-child { border-bottom: none; }

  .tk-user-name {
    font-weight: 600;
    color: #171717;
    white-space: nowrap;
  }

  .tk-user-meta {
    color: #737373;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tk-user-empty {
    padding: 20px;
    text-align: center;
    font-size: 13px;
    color: #a3a3a3;
  }

  .tk-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 16px 0;
    border-top: 1px solid #f5f5f5;
    margin-bottom: 16px;
  }

  .tk-check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #262626;
    cursor: pointer;
    user-select: none;
  }

  .tk-check input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #0f0f0f;
    cursor: pointer;
  }

  .tk-preview-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.5;
  }

  .tk-preview-text { flex: 1; word-break: break-word; }

  .tk-preview-link {
    margin-left: 8px;
    text-decoration: underline;
    font-weight: 700;
  }

  .tk-preview-ack {
    border: 1px solid;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
  }

  .tk-actions {
    display: flex;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid #f5f5f5;
  }

  .tk-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 22px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .tk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .tk-btn-primary {
    background: #0f0f0f;
    color: #ffffff;
    border-color: #0f0f0f;
  }

  .tk-btn-primary:hover:not(:disabled) {
    background: #262626;
    border-color: #262626;
  }

  .tk-btn-ghost {
    background: #ffffff;
    color: #262626;
    border-color: #e5e5e5;
  }

  .tk-btn-ghost:hover {
    background: #f5f5f5;
    border-color: #d4d4d4;
  }

  .tk-spin { animation: tk-spin-anim 1s linear infinite; }

  @keyframes tk-spin-anim {
    to { transform: rotate(360deg); }
  }

  .tk-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tk-item {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .tk-item:hover {
    border-color: #e5e5e5;
    background: #ffffff;
  }

  .tk-item-color {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .tk-item-body { flex: 1; min-width: 0; }

  .tk-item-text {
    font-size: 13.5px;
    font-weight: 600;
    color: #171717;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tk-item-meta {
    font-size: 11.5px;
    color: #737373;
    margin-top: 3px;
  }

  .tk-item-stats {
    font-size: 11px;
    color: #a3a3a3;
    margin-top: 2px;
  }

  .tk-item-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .tk-icon-btn {
    background: transparent;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    color: #525252;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .tk-icon-btn:hover {
    background: #f5f5f5;
    color: #0f0f0f;
  }

  .tk-icon-btn-danger:hover {
    background: #fef2f2;
    color: #b91c1c;
  }

  .tk-empty {
    padding: 30px 20px;
    text-align: center;
    font-size: 13px;
    color: #a3a3a3;
    background: #fafafa;
    border: 1px dashed #e5e5e5;
    border-radius: 12px;
    list-style: none;
  }

  @media (max-width: 640px) {
    .tk-container { padding: 20px 16px 40px; }
    .tk-title { font-size: 22px; }
    .tk-panel { padding: 18px; border-radius: 12px; }
    .tk-item { padding: 12px; gap: 10px; }
    .tk-item-color { width: 38px; height: 38px; }
    .tk-user-meta { display: none; }
  }
`;