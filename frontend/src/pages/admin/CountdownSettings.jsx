// frontend/src/pages/admin/CountdownSettings.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../../api";
import {
  FiArrowLeft, FiSave, FiClock, FiCalendar, FiType,
  FiFlag, FiToggleLeft, FiToggleRight,
  FiCheckCircle, FiAlertCircle, FiRefreshCw, FiX,
} from "react-icons/fi";
import { FaCalendarAlt, FaPlusCircle } from "react-icons/fa";

/* =========================================================
   CONSTANTS
   ========================================================= */
// Same base emojis as the original + more
const COMMON_ICONS = [
  // Original set
  "🎄", "🎉", "🚀", "🎂", "🎊", "⭐", "🔥", "💫", "🌟", "🎯",
  "🏆", "🎈", "🎁", "✨", "🌺", "🌸", "🌈", "🎶",
  // More added
  "✝️", "🕊️", "🙏", "⛪", "📖", "🕯️", "👼", "☀️",
  "🌙", "❄️", "🍀", "💎", "👑", "🔔",
];

const COLOR_PRESETS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ef4444",
  "#f59e0b", "#ec4899", "#06b6d4", "#f97316",
];

const DEFAULT_FORM = {
  targetDate: "",
  title: "",
  subtitle: "",
  icon: "🎄",
  isActive: false,
  eventColor: "#10b981",
};

/* =========================================================
   HELPERS
   ========================================================= */
const computeTimeLeft = (targetDate) => {
  if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

const pad2 = (n) => String(n).padStart(2, "0");

/* =========================================================
   SKELETON
   ========================================================= */
function Skeleton() {
  return (
    <div className="cd-page">
      <div className="cd-container">
        <div className="cd-skeleton-header">
          <div className="cd-skeleton cd-skeleton-btn" />
          <div className="cd-skeleton cd-skeleton-title" />
          <div className="cd-skeleton cd-skeleton-btn" />
        </div>

        <div className="cd-grid">
          <div className="cd-col">
            <div className="cd-skeleton-panel">
              <div className="cd-skeleton cd-skeleton-line-md" style={{ width: 140 }} />
              <div className="cd-skeleton cd-skeleton-toggle" />
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ marginTop: 16 }}>
                  <div className="cd-skeleton cd-skeleton-line-sm" style={{ width: 80 }} />
                  <div className="cd-skeleton cd-skeleton-input" />
                </div>
              ))}
              <div className="cd-skeleton cd-skeleton-icons" />
            </div>
            <div className="cd-skeleton-panel">
              <div className="cd-skeleton cd-skeleton-line-md" style={{ width: 120 }} />
              <div className="cd-skeleton cd-skeleton-status" />
              <div className="cd-skeleton cd-skeleton-status" />
              <div className="cd-skeleton cd-skeleton-status" />
            </div>
          </div>

          <div className="cd-col">
            <div className="cd-skeleton-panel">
              <div className="cd-skeleton cd-skeleton-line-md" style={{ width: 110 }} />
              <div className="cd-skeleton cd-skeleton-preview" />
            </div>
          </div>
        </div>
      </div>
      <style>{skeletonCSS}</style>
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */
function CountdownSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [previewTime, setPreviewTime] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0,
  });
  const [message, setMessage] = useState(null);

  const msgTimer = useRef(null);
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const flash = useCallback((type, text, timeout = 3000) => {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMessage({ type, text });
    msgTimer.current = setTimeout(() => setMessage(null), timeout);
  }, []);

  /* ---------------- FETCH ---------------- */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/countdown-settings`);
      if (response.data?.success && response.data?.settings) {
        const s = response.data.settings;
        setSettings(s);
        setFormData({
          targetDate: s.targetDate ? new Date(s.targetDate).toISOString().slice(0, 16) : "",
          title: s.title || "",
          subtitle: s.subtitle || "",
          icon: s.icon || "🎄",
          isActive: s.isActive || false,
          eventColor: s.eventColor || "#10b981",
        });
        setPreviewTime(computeTimeLeft(s.targetDate));
      }
    } catch (error) {
      console.error("Error fetching countdown settings:", error);
      flash("error", "Failed to load countdown settings");
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* ---------------- LIVE PREVIEW ---------------- */
  useEffect(() => {
    if (!formData.targetDate) {
      setPreviewTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    setPreviewTime(computeTimeLeft(formData.targetDate));
    const interval = setInterval(() => {
      setPreviewTime(computeTimeLeft(formData.targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [formData.targetDate]);

  /* ---------------- FORM ---------------- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleIconSelect = (icon) => {
    setFormData((prev) => ({ ...prev, icon }));
  };

  const handleColorSelect = (color) => {
    setFormData((prev) => ({ ...prev, eventColor: color }));
  };

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!formData.targetDate) {
      flash("error", "Please select a target date");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/countdown-settings`,
        formData,
        { headers }
      );
      if (response.data?.success) {
        flash("success", "Countdown settings saved successfully");
        setSettings(response.data.settings);
        setPreviewTime(computeTimeLeft(formData.targetDate));
      }
    } catch (error) {
      console.error("Error saving countdown settings:", error);
      flash("error", error.response?.data?.error || "Failed to save settings", 5000);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- TOGGLE ---------------- */
  const handleToggle = async () => {
    const newActive = !formData.isActive;
    const original = formData.isActive;
    setFormData((prev) => ({ ...prev, isActive: newActive }));
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/admin/countdown-settings/toggle`,
        { isActive: newActive },
        { headers }
      );
      if (response.data?.success) {
        flash("success", `Countdown ${newActive ? "activated" : "deactivated"}`, 2000);
      }
    } catch (error) {
      console.error("Error toggling countdown:", error);
      setFormData((prev) => ({ ...prev, isActive: original }));
      flash("error", "Failed to toggle countdown");
    }
  };

  /* =========================================================
     RENDER
     ========================================================= */
  if (loading) return <Skeleton />;

  return (
    <div className="cd-page">
      <div className="cd-container">
        {/* ================= HEADER ================= */}
        <header className="cd-header">
          <div className="cd-header-left">
            <button
              className="cd-back-btn"
              onClick={() => navigate("/admin")}
              title="Back"
            >
              <FiArrowLeft size={16} />
            </button>
            <div>
              <div className="cd-eyebrow">
                <FiClock size={12} />
                Portal widget
              </div>
              <h1 className="cd-title">Countdown settings</h1>
              <p className="cd-subtitle">
                Configure the countdown timer displayed across the portal
              </p>
            </div>
          </div>
          <div className="cd-header-actions">
            <button
              className="cd-btn"
              onClick={handleToggle}
              disabled={saving}
              title={formData.isActive ? "Deactivate" : "Activate"}
            >
              <span className={`cd-status-dot ${formData.isActive ? "live" : "hidden"}`} />
              {formData.isActive ? "Active" : "Inactive"}
            </button>
            <button
              className="cd-btn cd-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <FiRefreshCw size={14} className="cd-spin" /> Saving...
                </>
              ) : (
                <>
                  <FiSave size={14} /> Save changes
                </>
              )}
            </button>
          </div>
        </header>

        {/* ================= ALERT ================= */}
        <AnimatePresence>
          {message && (
            <motion.div
              className={`cd-alert cd-alert-${message.type}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {message.type === "success" ? (
                <FiCheckCircle size={15} />
              ) : (
                <FiAlertCircle size={15} />
              )}
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)}>
                <FiX size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="cd-grid">
          {/* ================= LEFT: FORM ================= */}
          <div className="cd-col">
            {/* --- GENERAL --- */}
            <section className="cd-panel">
              <div className="cd-panel-head">
                <h3>General settings</h3>
                <p className="cd-panel-sub">Basic event information</p>
              </div>

              {/* Active toggle */}
              <div className="cd-field">
                <label>Status</label>
                <button
                  type="button"
                  className={`cd-toggle-row ${formData.isActive ? "active" : ""}`}
                  onClick={handleToggle}
                >
                  <div className="cd-toggle-info">
                    <strong>
                      {formData.isActive ? "Active" : "Inactive"}
                    </strong>
                    <small>
                      {formData.isActive
                        ? "Countdown is visible to users"
                        : "Countdown is hidden from users"}
                    </small>
                  </div>
                  <div className={`cd-toggle-switch ${formData.isActive ? "on" : ""}`}>
                    {formData.isActive ? (
                      <FiToggleRight size={26} />
                    ) : (
                      <FiToggleLeft size={26} />
                    )}
                  </div>
                </button>
              </div>

              {/* Title */}
              <div className="cd-field">
                <label>
                  <FiType size={12} /> Event title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. CHRISTMAS CELEBRATION"
                />
              </div>

              {/* Subtitle */}
              <div className="cd-field">
                <label>
                  <FiFlag size={12} /> Subtitle
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="e.g. JOIN US FOR THE BIRTHDAY OF JESUS CHRIST"
                />
              </div>

              {/* Target date */}
              <div className="cd-field">
                <label>
                  <FiCalendar size={12} /> Target date & time
                </label>
                <input
                  type="datetime-local"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleChange}
                />
              </div>
            </section>

            {/* --- APPEARANCE --- */}
            <section className="cd-panel">
              <div className="cd-panel-head">
                <h3>Appearance</h3>
                <p className="cd-panel-sub">Icon and colour</p>
              </div>

              {/* Icon */}
              <div className="cd-field">
                <label>Icon</label>
                <div className="cd-icon-grid">
                  {COMMON_ICONS.map((icon, i) => (
                    <button
                      key={`${icon}-${i}`}
                      type="button"
                      className={`cd-icon-option ${
                        formData.icon === icon ? "selected" : ""
                      }`}
                      onClick={() => handleIconSelect(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="cd-field">
                <label>
                  <FaPlusCircle size={11} /> Event colour
                </label>
                <div className="cd-color-row">
                  <input
                    type="color"
                    name="eventColor"
                    value={formData.eventColor}
                    onChange={handleChange}
                    className="cd-color-picker"
                  />
                  <span className="cd-color-hex">{formData.eventColor}</span>
                  <div className="cd-color-presets">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`cd-color-preset ${
                          formData.eventColor === color ? "selected" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* --- CURRENT STATUS --- */}
            <section className="cd-panel">
              <div className="cd-panel-head">
                <h3>Current status</h3>
              </div>
              <div className="cd-status-list">
                <div className="cd-status-row">
                  <span className="cd-status-label">Status</span>
                  <span
                    className={`cd-status-value ${
                      formData.isActive ? "ok" : "off"
                    }`}
                  >
                    {formData.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="cd-status-row">
                  <span className="cd-status-label">Event</span>
                  <span className="cd-status-value">
                    {formData.title || "Not set"}
                  </span>
                </div>
                <div className="cd-status-row">
                  <span className="cd-status-label">Target date</span>
                  <span className="cd-status-value">
                    {formData.targetDate
                      ? new Date(formData.targetDate).toLocaleString()
                      : "Not set"}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* ================= RIGHT: PREVIEW ================= */}
          <div className="cd-col">
            <section className="cd-panel cd-panel-sticky">
              <div className="cd-panel-head">
                <h3>Live preview</h3>
                <p className="cd-panel-sub">What visitors will see</p>
              </div>

              <div className="cd-preview">
                <div className="cd-preview-inner">
                  <div className="cd-preview-head">
                    <span className="cd-preview-icon">{formData.icon || "🎄"}</span>
                    <span className="cd-preview-title">
                      {formData.title || "COUNTDOWN"}
                    </span>
                    <span className="cd-preview-icon">{formData.icon || "🎄"}</span>
                  </div>

                  <div className="cd-preview-time">
                    <TimeBlock value={previewTime.days} label="Days" color={formData.eventColor} />
                    <span className="cd-preview-sep">:</span>
                    <TimeBlock value={previewTime.hours} label="Hours" color={formData.eventColor} />
                    <span className="cd-preview-sep">:</span>
                    <TimeBlock value={previewTime.minutes} label="Minutes" color={formData.eventColor} />
                    <span className="cd-preview-sep">:</span>
                    <TimeBlock value={previewTime.seconds} label="Seconds" color={formData.eventColor} />
                  </div>

                  {formData.subtitle && (
                    <div className="cd-preview-subtitle">
                      <FaCalendarAlt size={11} color={formData.eventColor} />
                      {formData.subtitle}
                    </div>
                  )}

                  <div className="cd-preview-status">
                    <span
                      className={`cd-status-dot ${
                        formData.isActive ? "live" : "hidden"
                      }`}
                    />
                    {formData.isActive ? "Live on portal" : "Hidden from portal"}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{mainCSS}</style>
    </div>
  );
}

/* =========================================================
   TIME BLOCK
   ========================================================= */
function TimeBlock({ value, label, color }) {
  return (
    <div className="cd-time-block">
      <div
        className="cd-time-value"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        }}
      >
        {pad2(value)}
      </div>
      <div className="cd-time-label">{label}</div>
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .cd-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .cd-container { padding: 28px 24px 60px; max-width: 1360px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .cd-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .cd-header-left { display: flex; align-items: center; gap: 14px; }
  .cd-back-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .cd-back-btn:hover { background: #f5f5f5; color: #171717; }
  .cd-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }
  .cd-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -0.5px; color: #0f0f0f;
  }
  .cd-subtitle { font-size: 13.5px; color: #737373; margin: 4px 0 0 0; }
  .cd-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- BUTTONS ---------- */
  .cd-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .cd-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .cd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cd-btn-primary {
    background: #0f0f0f; color: #ffffff; border-color: #0f0f0f;
  }
  .cd-btn-primary:hover { background: #262626; border-color: #262626; }

  .cd-spin { animation: cd-spin 0.9s linear infinite; }
  @keyframes cd-spin { to { transform: rotate(360deg); } }

  .cd-status-dot {
    width: 8px; height: 8px; border-radius: 50%; display: inline-block;
  }
  .cd-status-dot.live {
    background: #16a34a;
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6);
    animation: cd-pulse 2s infinite;
  }
  .cd-status-dot.hidden { background: #a3a3a3; }
  @keyframes cd-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6); }
    50% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
  }

  /* ---------- ALERTS ---------- */
  .cd-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .cd-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .cd-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .cd-alert button {
    margin-left: auto; background: none; border: none; cursor: pointer;
    color: inherit; padding: 4px; border-radius: 6px; display: flex;
  }
  .cd-alert button:hover { background: rgba(0,0,0,0.05); }

  /* ---------- GRID ---------- */
  .cd-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  }
  @media (max-width: 1024px) { .cd-grid { grid-template-columns: 1fr; } }

  .cd-col { display: flex; flex-direction: column; gap: 16px; }

  /* ---------- PANEL ---------- */
  .cd-panel {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px;
  }
  .cd-panel-sticky { position: sticky; top: 24px; }
  @media (max-width: 1024px) { .cd-panel-sticky { position: static; } }

  .cd-panel-head { margin-bottom: 18px; }
  .cd-panel-head h3 {
    font-size: 14px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.1px;
  }
  .cd-panel-sub {
    font-size: 12.5px; color: #a3a3a3; margin: 4px 0 0 0;
  }

  /* ---------- FIELDS ---------- */
  .cd-field { margin-bottom: 18px; }
  .cd-field:last-child { margin-bottom: 0; }
  .cd-field > label {
    display: flex; align-items: center; gap: 6px;
    font-size: 11.5px; font-weight: 700; color: #525252;
    text-transform: uppercase; letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .cd-field input[type="text"],
  .cd-field input[type="datetime-local"] {
    width: 100%; padding: 10px 12px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    font-size: 13.5px; color: #171717;
    font-family: inherit; background: #ffffff;
    transition: border-color 0.15s ease;
  }
  .cd-field input:focus { outline: none; border-color: #0f0f0f; }

  /* ---------- STATUS TOGGLE ROW ---------- */
  .cd-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; width: 100%;
    padding: 14px 16px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 10px; cursor: pointer;
    transition: all 0.15s ease; text-align: left;
    font-family: inherit;
  }
  .cd-toggle-row:hover { border-color: #e5e5e5; background: #f5f5f5; }
  .cd-toggle-row.active { border-color: #0f0f0f; background: #fafafa; }
  .cd-toggle-info { flex: 1; min-width: 0; }
  .cd-toggle-info strong {
    display: block; font-size: 13.5px; font-weight: 700;
    color: #171717;
  }
  .cd-toggle-info small {
    display: block; font-size: 12px; color: #737373;
    margin-top: 3px; line-height: 1.4;
  }
  .cd-toggle-switch {
    display: flex; align-items: center;
    color: #a3a3a3; transition: color 0.2s ease;
  }
  .cd-toggle-switch.on { color: #0f0f0f; }

  /* ---------- ICON GRID ---------- */
  .cd-icon-grid {
    display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px;
    max-height: 260px; overflow-y: auto;
    padding: 4px;
    border: 1px solid #f0f0f0; border-radius: 10px;
    background: #fafafa;
  }
  @media (max-width: 640px) {
    .cd-icon-grid { grid-template-columns: repeat(6, 1fr); }
  }
  .cd-icon-option {
    aspect-ratio: 1;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #e5e5e5; border-radius: 9px;
    background: #ffffff; cursor: pointer;
    font-size: 18px; transition: all 0.15s ease;
    font-family: inherit;
  }
  .cd-icon-option:hover {
    border-color: #a3a3a3; background: #f5f5f5;
    transform: scale(1.05);
  }
  .cd-icon-option.selected {
    border-color: #0f0f0f; background: #f5f5f5;
    box-shadow: 0 0 0 2px #0f0f0f;
  }

  /* ---------- COLOR ROW ---------- */
  .cd-color-row {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .cd-color-picker {
    width: 42px; height: 42px; border-radius: 9px;
    border: 2px solid #e5e5e5; cursor: pointer;
    background: transparent; padding: 2px; flex-shrink: 0;
    transition: border-color 0.15s ease;
  }
  .cd-color-picker:hover { border-color: #a3a3a3; }
  .cd-color-hex {
    padding: 10px 12px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    font-size: 12.5px; font-family: 'SF Mono', Menlo, Consolas, monospace;
    text-transform: uppercase; color: #171717;
    background: #fafafa;
  }
  .cd-color-presets {
    display: flex; gap: 6px; flex-wrap: wrap;
    margin-left: auto;
  }
  .cd-color-preset {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid transparent; cursor: pointer;
    transition: all 0.15s ease; flex-shrink: 0;
  }
  .cd-color-preset:hover { transform: scale(1.1); }
  .cd-color-preset.selected {
    border-color: #ffffff;
    box-shadow: 0 0 0 2px #0f0f0f;
  }

  /* ---------- STATUS LIST ---------- */
  .cd-status-list {
    display: flex; flex-direction: column; gap: 8px;
  }
  .cd-status-row {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px;
    padding: 10px 14px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 9px;
  }
  .cd-status-label {
    font-size: 12px; color: #737373; font-weight: 500;
  }
  .cd-status-value {
    font-size: 12.5px; color: #171717; font-weight: 600;
    text-align: right; word-break: break-word;
  }
  .cd-status-value.ok { color: #15803d; }
  .cd-status-value.off { color: #a3a3a3; }

  /* ============================================================
     PREVIEW (dark themed)
     ============================================================ */
  .cd-preview {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: 14px; padding: 32px 20px;
    display: flex; align-items: center; justify-content: center;
    min-height: 300px;
  }
  .cd-preview-inner { width: 100%; text-align: center; }

  .cd-preview-head {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; margin-bottom: 26px; flex-wrap: wrap;
  }
  .cd-preview-icon { font-size: 28px; line-height: 1; }
  .cd-preview-title {
    font-size: 20px; font-weight: 700; color: #ffffff;
    letter-spacing: 0.06em; text-transform: uppercase;
  }

  .cd-preview-time {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-bottom: 18px; flex-wrap: wrap;
  }

  .cd-time-block { text-align: center; min-width: 58px; }
  .cd-time-value {
    display: inline-block;
    font-size: 30px; font-weight: 800;
    color: #ffffff; padding: 10px 16px;
    border-radius: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .cd-time-label {
    font-size: 10px; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.1em;
    font-weight: 600; margin-top: 6px;
  }
  .cd-preview-sep {
    color: #475569; font-weight: 700;
    font-size: 24px; margin-bottom: 22px;
  }

  .cd-preview-subtitle {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12.5px; color: #cbd5e1;
    padding: 8px 14px; background: rgba(255,255,255,0.04);
    border-radius: 999px;
    margin-top: 6px;
    border-top: none;
  }

  .cd-preview-status {
    display: inline-flex; align-items: center; gap: 8px;
    margin-top: 18px; font-size: 12px;
    color: #94a3b8; font-weight: 500;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .cd-container { padding: 20px 16px 40px; }
    .cd-title { font-size: 22px; }
    .cd-color-presets { margin-left: 0; }
    .cd-header-actions { width: 100%; }
    .cd-header-actions .cd-btn { flex: 1; justify-content: center; }
    .cd-time-block { min-width: 44px; }
    .cd-time-value { font-size: 22px; padding: 6px 10px; }
    .cd-preview-sep { font-size: 18px; margin-bottom: 18px; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .cd-skeleton {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .cd-skeleton::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: cd-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes cd-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .cd-skeleton-header {
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .cd-skeleton-btn { width: 120px; height: 38px; border-radius: 9px; }
  .cd-skeleton-title { width: 220px; height: 26px; }
  .cd-skeleton-panel {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px;
  }
  .cd-skeleton-line-md { height: 18px; border-radius: 4px; }
  .cd-skeleton-line-sm { height: 11px; border-radius: 4px; }
  .cd-skeleton-input {
    height: 42px; border-radius: 9px; width: 100%; margin-top: 8px;
  }
  .cd-skeleton-toggle {
    height: 62px; border-radius: 10px; margin-top: 16px; width: 100%;
  }
  .cd-skeleton-icons {
    height: 200px; border-radius: 10px; margin-top: 16px;
  }
  .cd-skeleton-status {
    height: 40px; border-radius: 9px; margin-top: 8px;
  }
  .cd-skeleton-preview {
    height: 300px; border-radius: 14px; margin-top: 16px;
  }
`;

const mainCSS = baseCSS;

export default CountdownSettings;