import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import zucaLogo from "../assets/zuca-logo.png";

/* ---- styles (unchanged from previous answer) ---- */
const styles = `
.zuca-welcome, .zuca-welcome * { box-sizing: border-box; }
.zuca-welcome {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #172033;
}
.zuca-welcome__backdrop {
  position: absolute; inset: 0;
  background: rgba(10, 20, 38, 0.72);
  backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px);
}
.zuca-welcome__modal {
  position: relative; z-index: 1; width: 100%; max-width: 780px;
  max-height: min(88vh, 720px); display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid rgba(255,255,255,0.72);
  border-radius: 20px; background: #fff;
  box-shadow: 0 30px 80px rgba(0,0,0,0.3);
}
.zuca-welcome__topbar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  gap: 14px; padding: 16px 22px; border-bottom: 1px solid #e9edf3; background: #fff;
}
.zuca-welcome__brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.zuca-welcome__logo { width: 38px; height: 38px; flex-shrink: 0; object-fit: contain; }
.zuca-welcome__brand-copy { min-width: 0; }
.zuca-welcome__brand-name { margin: 0; color: #152b4d; font-size: 14px; font-weight: 800; letter-spacing: 0.05em; }
.zuca-welcome__brand-caption { margin: 3px 0 0; color: #778397; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.zuca-welcome__close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; flex-shrink: 0; border: 1px solid #e6eaf0;
  border-radius: 10px; background: #fff; color: #536176; font-size: 20px; line-height: 1;
  cursor: pointer; transition: background 160ms ease, border-color 160ms ease;
}
.zuca-welcome__close:hover { background: #f2f5f9; border-color: #d3dbe6; }
.zuca-welcome__content {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.95fr);
  gap: 26px; padding: 26px;
  scrollbar-width: thin; scrollbar-color: rgba(100,116,139,0.35) transparent;
}
.zuca-welcome__content::-webkit-scrollbar { width: 8px; }
.zuca-welcome__content::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.25); border-radius: 8px; }
.zuca-welcome__intro { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.zuca-welcome__eyebrow {
  display: inline-flex; align-items: center; gap: 8px; width: fit-content;
  margin-bottom: 14px; color: #315f9e; font-size: 10px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.zuca-welcome__eyebrow::before { content: ""; width: 20px; height: 2px; border-radius: 2px; background: #315f9e; }
.zuca-welcome__heading { margin: 0; color: #070250; font-size: clamp(22px, 2.6vw, 30px); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; }
.zuca-welcome__heading span { color: #080808f5; overflow-wrap: anywhere; }
.zuca-welcome__description { max-width: 380px; margin: 12px 0 16px; color: #68768a; font-size: 13px; line-height: 1.65; }
.zuca-welcome__notice { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid #e2eaf4; border-radius: 12px; background: #f6f9fd; }
.zuca-welcome__notice-mark { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; border-radius: 7px; background: #e5eef9; color: #315f9e; font-size: 13px; font-weight: 800; }
.zuca-welcome__notice-title { margin: 1px 0 4px; color: #203958; font-size: 11.5px; font-weight: 800; }
.zuca-welcome__notice-text { margin: 0; color: #69788d; font-size: 11.5px; line-height: 1.55; }
.zuca-welcome__card-area { min-width: 0; align-self: center; }
.zuca-welcome__card-label { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 10px; color: #657389; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.zuca-welcome__card-status { display: inline-flex; align-items: center; gap: 5px; color: #397657; font-size: 9.5px; letter-spacing: 0.04em; }
.zuca-welcome__status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4a9b70; }
.zuca-welcome__id-card {
  position: relative; overflow: hidden; padding: 16px 18px; border: 1px solid #28486f;
  border-radius: 16px; background: linear-gradient(135deg, #19385f 0%, #102847 55%, #0d203b 100%);
  color: #fff; box-shadow: 0 14px 30px rgba(20,44,76,0.18);
}
.zuca-welcome__id-card::before {
  content: ""; position: absolute; top: -80px; right: -60px; width: 180px; height: 180px;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;
  box-shadow: 0 0 0 20px rgba(255,255,255,0.025), 0 0 0 40px rgba(255,255,255,0.02);
  pointer-events: none;
}
.zuca-welcome__id-card::after {
  content: ""; position: absolute; right: -40px; bottom: -80px; width: 160px; height: 160px;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 50%; pointer-events: none;
}
.zuca-welcome__id-header, .zuca-welcome__id-person, .zuca-welcome__id-grid, .zuca-welcome__id-footer { position: relative; z-index: 1; }
.zuca-welcome__id-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.18); }
.zuca-welcome__id-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
.zuca-welcome__id-logo { width: 32px; height: 32px; flex-shrink: 0; padding: 3px; border-radius: 8px; background: #fff; object-fit: contain; }
.zuca-welcome__id-institution { min-width: 0; }
.zuca-welcome__id-institution strong { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; }
.zuca-welcome__id-institution span { display: block; margin-top: 3px; color: #c0cee0; font-size: 8px; font-weight: 600; letter-spacing: 0.09em; }
.zuca-welcome__id-type { flex-shrink: 0; color: #d3dfed; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; }
.zuca-welcome__id-person { display: flex; align-items: center; gap: 12px; padding: 14px 0 12px; }
.zuca-welcome__avatar { position: relative; display: flex; align-items: center; justify-content: center; width: 60px; height: 72px; flex-shrink: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.32); border-radius: 9px; background: #fff; }
.zuca-welcome__avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.zuca-welcome__avatar--logo img { object-fit: contain; padding: 9px; background: #fff; }
.zuca-welcome__id-details { min-width: 0; flex: 1; }
.zuca-welcome__id-caption { margin: 0 0 4px; color: #b9c9de; font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.zuca-welcome__id-name { margin: 0; color: #fff; font-size: 15px; font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
.zuca-welcome__id-number { margin: 5px 0 0; color: #d6e3f4; font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; overflow-wrap: anywhere; }
.zuca-welcome__id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; padding: 10px 0 2px; border-top: 1px solid rgba(255,255,255,0.14); }
.zuca-welcome__id-field { min-width: 0; }
.zuca-welcome__id-field-label { margin: 0 0 2px; color: #aebfd5; font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.zuca-welcome__id-field-value { margin: 0; color: #fff; font-size: 10.5px; font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; }
.zuca-welcome__id-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.18); }
.zuca-welcome__id-footer-label { margin: 0 0 3px; color: #aebfd5; font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.zuca-welcome__id-footer-value { margin: 0; color: #fff; font-size: 10.5px; font-weight: 700; }
.zuca-welcome__id-watermark { width: 26px; height: 26px; object-fit: contain; opacity: 0.8; }
.zuca-welcome__copy-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; padding: 10px 12px; border: 1px solid #e5eaf1; border-radius: 11px; background: #fbfcfe; }
.zuca-welcome__copy-info { min-width: 0; }
.zuca-welcome__copy-label { display: block; margin-bottom: 3px; color: #8290a3; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.zuca-welcome__copy-value { display: block; color: #090d13; font-size: 12px; font-weight: 800; overflow-wrap: anywhere; }
.zuca-welcome__copy-button { flex-shrink: 0; padding: 8px 11px; border: 1px solid #d9e3ef; border-radius: 8px; background: #fff; color: #070707; font-size: 10.5px; font-weight: 800; cursor: pointer; transition: background 160ms ease; }
.zuca-welcome__copy-button:hover { background: #edf4fc; }
.zuca-welcome__copy-button:disabled { opacity: 0.5; cursor: not-allowed; }
.zuca-welcome__footer { flex-shrink: 0; padding: 16px 22px 20px; border-top: 1px solid #e9edf3; background: #fcfdff; }
.zuca-welcome__acknowledgement { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; color: #68768a; font-size: 11.5px; line-height: 1.55; cursor: pointer; }
.zuca-welcome__checkbox { width: 15px; height: 15px; flex-shrink: 0; margin: 2px 0 0; accent-color: #254f83; cursor: pointer; }
.zuca-welcome__footer-actions { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.zuca-welcome__secure-note { display: flex; align-items: center; gap: 8px; color: #8390a2; font-size: 10.5px; line-height: 1.45; }
.zuca-welcome__secure-mark { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; border: 1px solid #dfe6ef; border-radius: 7px; color: #486b96; font-size: 12px; font-weight: 800; }
.zuca-welcome__continue { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 160px; min-height: 42px; padding: 11px 16px; border: 1px solid #1a3d68; border-radius: 10px; background: #1a3d68; color: #fff; font-size: 11.5px; font-weight: 800; cursor: pointer; transition: background 160ms ease, transform 160ms ease, box-shadow 160ms ease; }
.zuca-welcome__continue:hover:not(:disabled) { transform: translateY(-1px); background: #244f83; box-shadow: 0 6px 16px rgba(26,61,104,0.18); }
.zuca-welcome__continue:disabled { border-color: #cbd4df; background: #cbd4df; cursor: not-allowed; }
.zuca-welcome__arrow { font-size: 15px; line-height: 1; }
.zuca-welcome__error { margin: 0 0 12px; padding: 10px 12px; border: 1px solid #f0d3d3; border-radius: 9px; background: #fff7f7; color: #9d3333; font-size: 11.5px; line-height: 1.55; }
.zuca-welcome__loading-light { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: zuca-welcome-spin 0.7s linear infinite; }
@keyframes zuca-welcome-spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .zuca-welcome__modal { max-width: 720px; }
  .zuca-welcome__content { gap: 22px; padding: 22px; }
}
@media (max-width: 760px) {
  .zuca-welcome { padding: 12px; align-items: flex-start; }
  .zuca-welcome__modal { max-width: 620px; max-height: calc(100dvh - 24px); margin: auto 0; border-radius: 18px; }
  .zuca-welcome__topbar { padding: 14px 18px; }
  .zuca-welcome__logo { width: 34px; height: 34px; }
  .zuca-welcome__content { grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 18px; }
  .zuca-welcome__intro { display: block; }
  .zuca-welcome__heading { font-size: 24px; }
  .zuca-welcome__description { margin: 10px 0 14px; }
  .zuca-welcome__notice { padding: 10px; }
  .zuca-welcome__footer { padding: 16px 18px 18px; }
  .zuca-welcome__footer-actions { align-items: stretch; flex-direction: column; gap: 12px; }
  .zuca-welcome__continue { width: 100%; }
  .zuca-welcome__secure-note { justify-content: center; text-align: center; }
}
@media (max-width: 520px) {
  .zuca-welcome { padding: 8px; }
  .zuca-welcome__modal { max-height: calc(100dvh - 16px); border-radius: 16px; }
  .zuca-welcome__topbar { padding: 12px 14px; gap: 10px; }
  .zuca-welcome__logo { width: 30px; height: 30px; }
  .zuca-welcome__brand-name { font-size: 13px; }
  .zuca-welcome__brand-caption { font-size: 9px; }
  .zuca-welcome__close { width: 30px; height: 30px; font-size: 18px; border-radius: 9px; }
  .zuca-welcome__content { padding: 14px; gap: 14px; }
  .zuca-welcome__eyebrow { font-size: 9.5px; margin-bottom: 10px; }
  .zuca-welcome__heading { font-size: 20px; }
  .zuca-welcome__description { font-size: 12px; margin: 8px 0 12px; }
  .zuca-welcome__notice { padding: 10px; gap: 9px; border-radius: 11px; }
  .zuca-welcome__notice-mark { width: 22px; height: 22px; font-size: 12px; border-radius: 6px; }
  .zuca-welcome__notice-title { font-size: 11px; }
  .zuca-welcome__notice-text { font-size: 11px; }
  .zuca-welcome__card-label { font-size: 9.5px; margin-bottom: 8px; }
  .zuca-welcome__id-card { padding: 13px 14px; border-radius: 14px; }
  .zuca-welcome__id-header { padding-bottom: 10px; }
  .zuca-welcome__id-logo { width: 28px; height: 28px; }
  .zuca-welcome__id-institution strong { font-size: 10.5px; }
  .zuca-welcome__id-institution span { font-size: 7.5px; }
  .zuca-welcome__id-type { font-size: 8px; }
  .zuca-welcome__id-person { padding: 12px 0 10px; gap: 10px; }
  .zuca-welcome__avatar { width: 52px; height: 62px; border-radius: 8px; }
  .zuca-welcome__avatar--logo img { padding: 8px; }
  .zuca-welcome__id-caption { font-size: 8px; }
  .zuca-welcome__id-name { font-size: 13.5px; }
  .zuca-welcome__id-number { font-size: 10px; }
  .zuca-welcome__id-grid { grid-template-columns: 1fr 1fr; gap: 7px 10px; padding: 9px 0 2px; }
  .zuca-welcome__id-field-label { font-size: 7.5px; }
  .zuca-welcome__id-field-value { font-size: 10px; }
  .zuca-welcome__id-footer { margin-top: 9px; padding-top: 9px; }
  .zuca-welcome__id-footer-label { font-size: 7.5px; }
  .zuca-welcome__id-footer-value { font-size: 10px; }
  .zuca-welcome__id-watermark { width: 22px; height: 22px; }
  .zuca-welcome__copy-row { padding: 9px 11px; gap: 8px; border-radius: 10px; }
  .zuca-welcome__copy-label { font-size: 8.5px; }
  .zuca-welcome__copy-value { font-size: 11px; }
  .zuca-welcome__copy-button { font-size: 10px; padding: 7px 10px; border-radius: 7px; }
  .zuca-welcome__footer { padding: 14px 14px 16px; }
  .zuca-welcome__acknowledgement { font-size: 11px; margin-bottom: 12px; }
  .zuca-welcome__continue { font-size: 11.5px; min-height: 40px; padding: 10px 14px; }
  .zuca-welcome__secure-note { font-size: 10px; }
}
@media (max-width: 380px) {
  .zuca-welcome { padding: 6px; }
  .zuca-welcome__topbar { padding: 10px 12px; }
  .zuca-welcome__logo { width: 26px; height: 26px; }
  .zuca-welcome__brand-name { font-size: 12px; }
  .zuca-welcome__brand-caption { display: none; }
  .zuca-welcome__close { width: 28px; height: 28px; font-size: 17px; }
  .zuca-welcome__content { padding: 12px; gap: 12px; }
  .zuca-welcome__heading { font-size: 18px; }
  .zuca-welcome__description { font-size: 11.5px; }
  .zuca-welcome__id-grid { grid-template-columns: 1fr; }
  .zuca-welcome__id-card { padding: 12px; }
  .zuca-welcome__avatar { width: 48px; height: 58px; }
  .zuca-welcome__id-name { font-size: 13px; }
  .zuca-welcome__footer { padding: 12px 12px 14px; }
  .zuca-welcome__secure-note { font-size: 9.5px; }
  .zuca-welcome__secure-mark { width: 22px; height: 22px; font-size: 11px; }
}
@media (max-height: 640px) {
  .zuca-welcome__modal { max-height: calc(100dvh - 16px); }
  .zuca-welcome__content { padding: 16px; gap: 16px; }
  .zuca-welcome__id-person { padding: 10px 0; }
  .zuca-welcome__id-grid { padding-top: 8px; }
  .zuca-welcome__footer { padding: 12px 18px 14px; }
  .zuca-welcome__acknowledgement { margin-bottom: 10px; }
}
@media (min-width: 1200px) {
  .zuca-welcome__modal { max-width: 820px; max-height: min(86vh, 700px); }
}
@media (prefers-reduced-motion: reduce) {
  .zuca-welcome *, .zuca-welcome *::before, .zuca-welcome *::after {
    animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;
  }
}
`;

/* ============================================================
   Helpers
   ============================================================ */
function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user || parsed;
  } catch {
    return null;
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

function getFirstValue(object, keys, fallback = "") {
  if (!object) return fallback;
  for (const key of keys) {
    const value = object[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function getDisplayName(user) {
  const direct = getFirstValue(user, [
    "fullName", "full_name", "name", "username", "displayName", "display_name",
  ]);
  if (direct) return String(direct).trim();

  const first = getFirstValue(user, ["firstName", "first_name", "firstname"]);
  const last = getFirstValue(user, ["lastName", "last_name", "lastname"]);
  const combined = `${first} ${last}`.trim();
  return combined || "ZUCA Member";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/* Try multiple API shapes and pick the user object */
function extractUserFromResponse(data) {
  if (!data || typeof data !== "object") return null;
  if (data.user && typeof data.user === "object") return data.user;
  if (data.data?.user && typeof data.data.user === "object") return data.data.user;
  if (data.data && typeof data.data === "object") return data.data;
  /* If the object itself has a name-ish field, assume it IS the user */
  if (
    data.fullName || data.full_name || data.name || data.email ||
    data.membershipNumber || data.membership_number
  ) {
    return data;
  }
  return null;
}

const STALE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

/* ============================================================
   Component
   ============================================================ */
export default function WelcomeModal({ isOpen, onClose }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const onCloseRef = useRef(onClose);
  const hasFetchedRef = useRef(false);
  const lastFetchedAtRef = useRef(0);
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* Mount/unmount tracking — no abort on unmount cleanup */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((fn) => {
    if (mountedRef.current) fn();
  }, []);

  /* ---------- Fetch: stable, safe, never leaves loading stuck ---------- */
  const fetchCurrentUser = useCallback(async (force = false) => {
    const token = readStoredToken();

    if (!token) {
      safeSetState(() => {
        setError("Your session could not be verified. Please sign in again.");
        setLoading(false);
      });
      return;
    }

    const now = Date.now();
    if (!force && now - lastFetchedAtRef.current < STALE_MS) {
      const cached = readStoredUser();
      if (cached) safeSetState(() => setUser(cached));
      safeSetState(() => setLoading(false));
      return;
    }

    /* Abort previous request if any */
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch { /* noop */ }
    }
    const controller = new AbortController();
    abortRef.current = controller;

    /* Hard timeout so loading NEVER stays true forever */
    const timeoutId = window.setTimeout(() => {
      try { controller.abort(); } catch { /* noop */ }
    }, FETCH_TIMEOUT_MS);

    safeSetState(() => {
      setLoading(true);
      setError("");
    });

    try {
      const response = await axios.get(`${BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!mountedRef.current) return;

      console.log("[WelcomeModal] /api/me response:", response.data);

      const currentUser = extractUserFromResponse(response.data);

      if (!currentUser) {
        throw new Error("The server returned invalid user information.");
      }

      safeSetState(() => {
        setUser(currentUser);
        setAvatarFailed(false);
      });
      lastFetchedAtRef.current = Date.now();

      try {
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch { /* noop */ }
    } catch (requestError) {
      if (!mountedRef.current) return;

      const isAbort =
        requestError?.name === "CanceledError" ||
        requestError?.code === "ERR_CANCELED" ||
        requestError?.message === "canceled";

      if (isAbort) {
        console.warn("[WelcomeModal] Request aborted or timed out");
        const cached = readStoredUser();
        if (cached) safeSetState(() => setUser(cached));
        /* Don't set error for timeout — cached fallback is fine */
      } else {
        console.error("[WelcomeModal] Failed to load user:", requestError);
        const cached = readStoredUser();
        if (cached) {
          safeSetState(() => setUser(cached));
        } else {
          safeSetState(() => {
            setError(
              requestError.response?.data?.message ||
                requestError.response?.data?.error ||
                "We could not load your membership details. Please sign in again."
            );
          });
        }
      }
    } finally {
      window.clearTimeout(timeoutId);
      /* ALWAYS release loading — this is the fix for the stuck state */
      safeSetState(() => setLoading(false));
    }
  }, [safeSetState]);

  /* ---------- Effect: run only on open ---------- */
  useEffect(() => {
    if (!isOpen) {
      hasFetchedRef.current = false;
      return;
    }

    /* Guard against StrictMode double-invoke */
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setAcknowledged(false);
    setCopied(false);
    setError("");
    setAvatarFailed(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    fetchCurrentUser();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, fetchCurrentUser]);

  /* ---------- Derived ---------- */
  const name = getDisplayName(user);

  const membershipNumber = String(
    getFirstValue(user, [
      "membershipNumber", "membership_number",
      "memberNumber", "member_number",
      "memberNo", "member_no",
      "membershipNo", "membership_no",
      "regNumber", "reg_number",
      "registrationNumber", "registration_number",
      "registrationNo", "registration_no",
      "admissionNumber", "admission_number",
      "studentNumber", "student_number",
      "regNo", "reg_no",
      "memberId", "member_id",
      "idNumber", "id_number",
    ])
  ).trim();

  const joinedValue = getFirstValue(user, [
    "createdAt", "created_at",
    "joinedAt", "joined_at",
    "dateJoined", "date_joined",
    "registrationDate", "registration_date",
  ]);

  const joinedYear = joinedValue
    ? (() => {
        const date = new Date(joinedValue);
        return Number.isNaN(date.getTime())
          ? String(joinedValue).slice(0, 4)
          : String(date.getFullYear());
      })()
    : String(
        getFirstValue(user, ["yearJoined", "year_joined", "joinYear", "join_year"]) || "—"
      );

  const email = String(getFirstValue(user, ["email", "emailAddress", "email_address"])).trim();
  const phone = String(getFirstValue(user, [
    "phone", "phoneNumber", "phone_number",
    "mobile", "mobileNumber", "mobile_number",
    "telephone", "tel",
  ])).trim();
  const course = String(getFirstValue(user, ["course", "program", "programme", "courseName", "course_name"])).trim();
  const yearOfStudy = String(getFirstValue(user, ["yearOfStudy", "year_of_study", "studyYear", "study_year", "level"])).trim();
  const admissionNumber = String(getFirstValue(user, [
    "admissionNumber", "admission_number",
    "regNo", "reg_no",
    "registrationNumber", "registration_number",
    "studentNumber", "student_number",
  ])).trim();
  const jumuia = String(getFirstValue(user, [
    "jumuia", "jumuiaName", "jumuia_name",
    "smallChristianCommunity", "small_christian_community",
    "community", "group",
  ])).trim();
  const role = String(getFirstValue(user, ["role", "userRole", "user_role", "position"])).trim();
  const gender = String(getFirstValue(user, ["gender", "sex"])).trim();
  const dateOfBirth = getFirstValue(user, ["dateOfBirth", "date_of_birth", "dob", "birthday"]);
  const profileImage = getFirstValue(user, [
    "profilePicture", "profile_picture",
    "profileImage", "profile_image",
    "avatar", "photo", "image", "picture",
  ]);

  const detailFields = [
    { label: "Email", value: email },
    { label: "Phone", value: phone },
    { label: "Course", value: course },
    { label: "Year", value: yearOfStudy },
    { label: "Admission No.", value: admissionNumber },
    { label: "Jumuia", value: jumuia },
    { label: "Role", value: role ? titleCase(role) : "" },
    { label: "Gender", value: gender ? titleCase(gender) : "" },
    { label: "Date of Birth", value: dateOfBirth ? formatDate(dateOfBirth) : "" },
  ].filter((f) => f.value);

  const showAvatarImage = profileImage && !avatarFailed;
  const canContinue = acknowledged && Boolean(membershipNumber) && !loading;

  const handleCopy = async () => {
    if (!membershipNumber) return;
    try {
      await navigator.clipboard.writeText(membershipNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy automatically. Please select and copy your membership number.");
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    onCloseRef.current?.();
  };

  /* ============================================================
     Render
     ============================================================ */
  return (
    <>
      <style>{styles}</style>

      <AnimatePresence>
        {isOpen && (
          <div className="zuca-welcome">
            <motion.div
              className="zuca-welcome__backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              aria-hidden="true"
            />

            <motion.section
              className="zuca-welcome__modal"
              role="dialog" aria-modal="true" aria-labelledby="zuca-welcome-heading"
              initial={{ opacity: 0, y: 20, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <header className="zuca-welcome__topbar">
                <div className="zuca-welcome__brand">
                  <img className="zuca-welcome__logo" src={zucaLogo} alt="ZUCA logo" />
                  <div className="zuca-welcome__brand-copy">
                    <p className="zuca-welcome__brand-name">ZUCA</p>
                    <p className="zuca-welcome__brand-caption">Member portal</p>
                  </div>
                </div>
                <button
                  type="button" className="zuca-welcome__close"
                  onClick={onClose} aria-label="Close welcome window"
                >
                  &times;
                </button>
              </header>

              <div className="zuca-welcome__content">
                <div className="zuca-welcome__intro">
                  <div className="zuca-welcome__eyebrow">Official member access</div>
                  <h1 id="zuca-welcome-heading" className="zuca-welcome__heading">
                    Welcome back,<br /><span>{name}</span>
                  </h1>
                  <p className="zuca-welcome__description">
                    Your ZUCA member portal is ready. Review your membership
                    details below before continuing to your account.
                  </p>
                  <div className="zuca-welcome__notice">
                    <div className="zuca-welcome__notice-mark">i</div>
                    <div>
                      <p className="zuca-welcome__notice-title">Your membership identity</p>
                      <p className="zuca-welcome__notice-text">
                        The identification card displays the membership
                        information associated with your account. Please
                        confirm that the details are correct.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="zuca-welcome__card-area">
                  <div className="zuca-welcome__card-label">
                    <span>Member identification</span>
                    <span className="zuca-welcome__card-status">
                      <span className="zuca-welcome__status-dot" />
                      {loading ? "VERIFYING" : "ACCOUNT DETAILS"}
                    </span>
                  </div>

                  <div className="zuca-welcome__id-card">
                    <div className="zuca-welcome__id-header">
                      <div className="zuca-welcome__id-brand">
                        <img className="zuca-welcome__id-logo" src={zucaLogo} alt="" />
                        <div className="zuca-welcome__id-institution">
                          <strong>ZUCA</strong>
                          <span>MEMBER IDENTIFICATION</span>
                        </div>
                      </div>
                      <span className="zuca-welcome__id-type">MEMBER ID</span>
                    </div>

                    <div className="zuca-welcome__id-person">
                      <div className={`zuca-welcome__avatar ${!showAvatarImage ? "zuca-welcome__avatar--logo" : ""}`}>
                        {showAvatarImage ? (
                          <img
                            src={profileImage}
                            alt={`${name} profile`}
                            onError={() => setAvatarFailed(true)}
                          />
                        ) : (
                          <img src={zucaLogo} alt="ZUCA" />
                        )}
                      </div>

                      <div className="zuca-welcome__id-details">
                        <p className="zuca-welcome__id-caption">Registered member</p>
                        <h2 className="zuca-welcome__id-name">{name}</h2>
                        <p className="zuca-welcome__id-number">
                          {loading
                            ? "Retrieving membership number..."
                            : membershipNumber || "Membership number unavailable"}
                        </p>
                      </div>
                    </div>

                    {detailFields.length > 0 && (
                      <div className="zuca-welcome__id-grid">
                        {detailFields.map((field) => (
                          <div key={field.label} className="zuca-welcome__id-field">
                            <p className="zuca-welcome__id-field-label">{field.label}</p>
                            <p className="zuca-welcome__id-field-value">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="zuca-welcome__id-footer">
                      <div>
                        <p className="zuca-welcome__id-footer-label">Member since</p>
                        <p className="zuca-welcome__id-footer-value">{joinedYear}</p>
                      </div>
                      <img className="zuca-welcome__id-watermark" src={zucaLogo} alt="" />
                    </div>
                  </div>

                  <div className="zuca-welcome__copy-row">
                    <div className="zuca-welcome__copy-info">
                      <span className="zuca-welcome__copy-label">Membership number</span>
                      <span className="zuca-welcome__copy-value">
                        {loading ? "Loading..." : membershipNumber || "Not available"}
                      </span>
                    </div>
                    <button
                      type="button" className="zuca-welcome__copy-button"
                      onClick={handleCopy}
                      disabled={!membershipNumber || loading}
                    >
                      {copied ? "Copied" : "Copy number"}
                    </button>
                  </div>
                </div>
              </div>

              <footer className="zuca-welcome__footer">
                {error && <p className="zuca-welcome__error" role="alert">{error}</p>}

                <label className="zuca-welcome__acknowledgement">
                  <input
                    className="zuca-welcome__checkbox"
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span>
                    I confirm that I have reviewed my membership details and
                    understand that this identification card represents the
                    information associated with my ZUCA account.
                  </span>
                </label>

                <div className="zuca-welcome__footer-actions">
                  <div className="zuca-welcome__secure-note">
                    <span className="zuca-welcome__secure-mark">✓</span>
                    <span>
                      Official ZUCA member portal<br />
                      Account access and identification
                    </span>
                  </div>
                  <button
                    type="button" className="zuca-welcome__continue"
                    onClick={handleContinue}
                    disabled={!canContinue}
                  >
                    {loading ? (
                      <>
                        <span className="zuca-welcome__loading-light" />
                        Verifying details
                      </>
                    ) : (
                      <>
                        Enter member portal
                        <span className="zuca-welcome__arrow">→</span>
                      </>
                    )}
                  </button>
                </div>
              </footer>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}