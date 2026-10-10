// frontend/src/pages/UserSchedules.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import BASE_URL from "../api";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FiCalendar, FiList, FiSearch, FiArrowLeft, FiEye, FiX,
  FiFileText, FiImage, FiClock, FiMapPin, FiChevronLeft,
  FiChevronRight, FiPlus, FiDownload, FiInbox,
  FiExternalLink, FiMaximize2, FiMinimize2, FiCheck,
} from "react-icons/fi";
import { FaFilePdf, FaFileWord } from "react-icons/fa";

/* ============================================================
   THEMES
============================================================ */
const THEMES = {
  emerald:  "linear-gradient(135deg, #059669 0%, #0d9488 40%, #7c3aed 100%)",
  sunset:   "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #be185d 100%)",
  ocean:    "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)",
  forest:   "linear-gradient(135deg, #15803d 0%, #166534 50%, #365314 100%)",
  midnight: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
  royal:    "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
  rose:     "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #d946ef 100%)",
  amber:    "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  sky:      "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #2563eb 100%)",
  navy:     "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #1e3a8a 100%)",
  mint:     "linear-gradient(135deg, #6ee7b7 0%, #10b981 50%, #047857 100%)",
  violet:   "linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)",
  aurora:   "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #f43f5e 100%)",
  ink:      "linear-gradient(135deg, #1f2937 0%, #0f172a 50%, #000000 100%)",
};

/* ============================================================
   CALENDAR HELPERS
============================================================ */
const pad = (n) => String(n).padStart(2, "0");

// Local time formatter for ICS (no Z, so it's a floating local time)
const fmtICS = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
};

// UTC ISO compact for Google links
const fmtGoogle = (d) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`;
};

const eventStart = (ev) => {
  if (ev.time) return new Date(`${ev.date}T${ev.time}`);
  const d = new Date(ev.date);
  d.setHours(16, 30, 0, 0);
  return d;
};
const eventEnd = (ev) => {
  const s = eventStart(ev);
  return new Date(s.getTime() + 60 * 60 * 1000);
};

// Detect platform — returns "apple" | "google" | "outlook" | "generic"
const detectPlatform = () => {
  if (typeof navigator === "undefined") return "generic";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Macintosh/.test(ua)) return "apple";
  if (/Android/.test(ua)) return "google";
  if (/Windows/.test(ua)) return "outlook";
  return "generic";
};

/* ============================================================
   ADD-TO-CALENDAR TARGETS
============================================================ */

// Google — opens web view; on Android the Google Calendar app intercepts it
const googleUrl = (ev, title) => {
  const s = eventStart(ev);
  const e = eventEnd(ev);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.event,
    dates: `${fmtGoogle(s)}/${fmtGoogle(e)}`,
    details: `${ev.section || ""} — ${title}`.trim(),
    location: "Zetech University",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Outlook Web — opens Outlook on the web; Windows Mail intercepts on desktop
const outlookUrl = (ev, title) => {
  const s = eventStart(ev);
  const e = eventEnd(ev);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.event,
    startdt: s.toISOString(),
    enddt: e.toISOString(),
    body: `${ev.section || ""} — ${title}`.trim(),
    location: "Zetech University",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

// Apple / generic — webcal:// works on iOS & macOS
// We host the ICS as a data: URI, but Safari refuses long ones.
// Best practical path: build a blob and give the user a real .ics on desktop.
const buildVEvent = (ev, title, index = 0) => {
  const s = eventStart(ev);
  const e = eventEnd(ev);
  const uid = `zuca-${title.replace(/\W+/g, "-")}-${index}-${s.getTime()}@zuca`;
  const desc = `${ev.section || ""} — ${title}`.trim();
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmtICS(new Date())}Z`,
    `DTSTART:${fmtICS(s)}`,
    `DTEND:${fmtICS(e)}`,
    `SUMMARY:${ev.event.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${desc.replace(/,/g, "\\,")}`,
    `LOCATION:Zetech University`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
  ];
};

const buildICS = (events, title) => {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZUCA Portal//Schedules//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const body = events.flatMap((ev, i) => buildVEvent(ev, title, i));
  return [...head, ...body, "END:VCALENDAR"].join("\r\n");
};

// Download .ics file (fallback + "Add all")
const downloadICS = (events, filename) => {
  const blob = new Blob([buildICS(events, filename)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.replace(/\s+/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ============================================================
   THE MAIN ACTION — direct add, no download
============================================================ */
const addToCalendar = (ev, scheduleTitle, platformOverride = null) => {
  const platform = platformOverride || detectPlatform();
  const title = scheduleTitle;

  // ----- Apple path: iOS/macOS opens .ics blob as calendar event directly -----
  if (platform === "apple") {
    // Safari on iOS happily opens a blob: URL as a .ics download;
    // tapping it goes straight to Calendar. Use it.
    const blob = new Blob([buildICS([ev], title)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    // Navigate in-place; iOS Calendar takes over
    window.location.href = url;
    // Cleanup later
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "apple";
  }

  // ----- Google path (Android, desktop Chrome/Firefox) -----
  if (platform === "google") {
    // Open in new tab so we don't lose the page
    window.open(googleUrl(ev, title), "_blank", "noopener");
    return "google";
  }

  // ----- Outlook path (Windows) -----
  if (platform === "outlook") {
    window.open(outlookUrl(ev, title), "_blank", "noopener");
    return "outlook";
  }

  // ----- Generic fallback: Google (most universal web option) -----
  window.open(googleUrl(ev, title), "_blank", "noopener");
  return "google";
};

/* ============================================================
   Date parsing
============================================================ */
const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};
const parseScheduleDate = (raw, fallbackYear) => {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})\s*[\/\-\s]\s*([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (!m) {
    const alt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (alt) {
      const d = new Date(Number(alt[3]), Number(alt[2]) - 1, Number(alt[1]));
      return isNaN(d) ? null : d.toISOString();
    }
    return null;
  }
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  const year = m[3] ? Number(m[3]) : fallbackYear;
  if (month === undefined) return null;
  const d = new Date(year, month, day);
  return isNaN(d) ? null : d.toISOString();
};
const flattenScheduleEvents = (schedule) => {
  const out = [];
  const year = schedule.startDate ? new Date(schedule.startDate).getFullYear() : new Date().getFullYear();
  (schedule.sections || []).forEach((sec) => {
    (sec.tableRows || []).forEach((row) => {
      if (!row.date || !row.event) return;
      const parsed = parseScheduleDate(row.date, year);
      if (!parsed) return;
      out.push({
        date: parsed,
        event: row.event.trim(),
        section: sec.title || "Schedule",
        scheduleId: schedule.id,
        scheduleTitle: schedule.title,
      });
    });
  });
  return out.sort((a, b) => new Date(a.date) - new Date(b.date));
};

/* ============================================================
   Calendar
============================================================ */
function MonthCalendar({ month, year, events, onPickDay, onPrev, onNext }) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const d = new Date(ev.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const k = d.getDate();
        if (!map[k]) map[k] = [];
        map[k].push(ev);
      }
    });
    return map;
  }, [events, month, year]);

  const monthLabel = new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="us-cal">
      <div className="us-cal-head">
        <button onClick={onPrev} aria-label="Previous month" className="us-cal-arrow"><FiChevronLeft size={16} /></button>
        <span className="us-cal-title">{monthLabel}</span>
        <button onClick={onNext} aria-label="Next month" className="us-cal-arrow"><FiChevronRight size={16} /></button>
      </div>
      <div className="us-cal-grid us-cal-grid-head">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="us-cal-weekday">{d}</div>
        ))}
      </div>
      <div className="us-cal-grid">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay[day] || [] : [];
          return (
            <button
              key={i}
              className={`us-cal-day ${day ? "" : "empty"} ${dayEvents.length ? "has-events" : ""}`}
              onClick={() => day && dayEvents.length && onPickDay(day, dayEvents)}
              disabled={!day || dayEvents.length === 0}
            >
              {day && <span className="us-cal-day-num">{day}</span>}
              {dayEvents.length > 0 && (
                <span className="us-cal-day-dots">
                  {dayEvents.slice(0, 3).map((_, j) => <i key={j} className="us-cal-dot" />)}
                  {dayEvents.length > 3 && <span className="us-cal-more">+{dayEvents.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Main
============================================================ */
function UserSchedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cover, setCover] = useState(null);
  const [theme, setTheme] = useState("navy");
  const [featIdx, setFeatIdx] = useState(0);
  const [featPaused, setFeatPaused] = useState(false);
  const featRef = useRef(null);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [daySheet, setDaySheet] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---------- user cover/theme ---------- */
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (!stored) return;
    const c = stored.coverImage;
    setCover(c ? (c.startsWith("http") ? c : `${BASE_URL}/${c}`) : null);
    setTheme(stored.profileTheme || localStorage.getItem("profileTheme") || "navy");
  }, []);

  /* ---------- fetch ---------- */
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/schedules?published=true");
      const sorted = (response.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSchedules(sorted);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      showToast("Failed to load schedules", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("recently_viewed_schedules");
    if (stored) {
      try { setRecentlyViewed(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  /* ---------- fullscreen ---------- */
  const enterFullscreen = () => {
    const el = document.querySelector(".us-modal-panel");
    if (el?.requestFullscreen) el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    else setIsFullscreen(false);
  };
  const toggleFullscreen = () => (isFullscreen ? exitFullscreen() : enterFullscreen());

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && showModal) closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [showModal]);

  const addToRecentlyViewed = (schedule) => {
    const updated = [schedule, ...recentlyViewed.filter((s) => s.id !== schedule.id)].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem("recently_viewed_schedules", JSON.stringify(updated));
  };
  const viewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setShowModal(true);
    setModalTab("list");
    addToRecentlyViewed(schedule);
  };
  const closeModal = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setIsFullscreen(false);
    setShowModal(false);
    setSelectedSchedule(null);
    setDaySheet(null);
  };

  /* ---------- downloads ---------- */
  const buildFullDocumentHTML = (schedule) => {
    const sections = schedule.sections || [];
    const generalPoints = schedule.generalPoints || [];
    const additionalNotes = schedule.additionalNotes || "";
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${schedule.title}</title>
    <style>
      body { font-family: 'Times New Roman', Arial, sans-serif; font-size: 12pt; line-height: 1.4; margin: 0 auto; padding: 40px; max-width: 900px; }
      h1 { font-size: 20pt; font-weight: bold; margin: 10pt 0; text-align: center; }
      h2 { font-size: 18pt; font-weight: bold; margin: 8pt 0; text-align: center; }
      h3 { font-size: 16pt; font-weight: bold; margin: 6pt 0; border-left: 3px solid #3b82f6; padding-left: 10px; }
      table { border-collapse: collapse; width: 100%; margin: 15px 0; }
      th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; font-weight: bold; }
      ul, ol { margin: 5px 0; padding-left: 20px; }
      li { margin: 3px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9pt; color: #666; }
    </style></head><body><div>
      <h1>ZETECH UNIVERSITY CATHOLIC ACTION</h1>
      <h2>${schedule.title}</h2>
      ${schedule.startDate ? `<p style="text-align: center;">${new Date(schedule.startDate).toLocaleDateString()} - ${new Date(schedule.endDate).toLocaleDateString()}</p>` : ""}
      <div style="margin: 20px 0;">
        <p><strong>The ${schedule.title} activities will take place as follows:</strong></p>
        <ul>${generalPoints.filter(p => p.text && p.text.trim()).map(p => `<li>${p.text}</li>`).join("")}</ul>
      </div>`;
    sections.forEach((section) => {
      const validRows = section.tableRows?.filter((r) => r.date && r.event) || [];
      if (section.title || validRows.length > 0 || section.freeText) {
        html += `<div style="margin: 25px 0;"><h3>${section.title || "Section"}</h3>
          <table><thead><tr><th>DATE</th><th>EVENT/LEADING</th></tr></thead><tbody>
          ${validRows.map((row) => `<tr><td>${row.date}</td><td>${row.event}</td></tr>`).join("")}
          </tbody></table>
          ${section.freeText ? `<p style="margin-top: 10px;">${section.freeText}</p>` : ""}
        </div>`;
      }
    });
    html += `<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc;">
      ${additionalNotes ? additionalNotes.split("\n").map((line) => `<p style="margin: 0 0 4px;">${line}</p>`).join("") : ""}
      </div>
      <div class="footer">ZUCA PORTAL SYSTEM</div>
    </div></body></html>`;
    return html;
  };

  const downloadAsPDF = async (schedule) => {
    setDownloadLoading(true);
    try {
      const fullHtml = buildFullDocumentHTML(schedule);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = fullHtml;
      Object.assign(tempDiv.style, { position: "absolute", left: "-9999px", top: "0", width: "900px", background: "white" });
      document.body.appendChild(tempDiv);
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false });
      document.body.removeChild(tempDiv);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`${schedule.title.replace(/\s/g, "_")}.pdf`);
      showToast("PDF downloaded", "success");
    } catch (err) { showToast("Failed to generate PDF", "error"); }
    finally { setDownloadLoading(false); }
  };

  const downloadAsImage = async (schedule) => {
    setDownloadLoading(true);
    try {
      const fullHtml = buildFullDocumentHTML(schedule);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = fullHtml;
      Object.assign(tempDiv.style, { position: "absolute", left: "-9999px", top: "0", width: "900px", background: "white" });
      document.body.appendChild(tempDiv);
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false });
      document.body.removeChild(tempDiv);
      const link = document.createElement("a");
      link.download = `${schedule.title.replace(/\s/g, "_")}.png`;
      link.href = canvas.toDataURL();
      link.click();
      showToast("Image downloaded", "success");
    } catch (err) { showToast("Failed to generate image", "error"); }
    finally { setDownloadLoading(false); }
  };

  const downloadAsWord = (schedule) => {
    setDownloadLoading(true);
    try {
      const fullHtml = buildFullDocumentHTML(schedule);
      const blob = new Blob([fullHtml], { type: "application/msword" });
      const link = document.createElement("a");
      link.download = `${schedule.title.replace(/\s/g, "_")}.doc`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("Word document downloaded", "success");
    } catch (err) { showToast("Failed to generate Word document", "error"); }
    finally { setDownloadLoading(false); }
  };

  /* ---------- filter ---------- */
  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch = (schedule.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const scheduleYear = schedule.startDate ? new Date(schedule.startDate).getFullYear() : null;
    const matchesYear = yearFilter === "all" || scheduleYear === parseInt(yearFilter);
    return matchesSearch && matchesYear;
  });

  const availableYears = [...new Set(
    schedules.map((s) => (s.startDate ? new Date(s.startDate).getFullYear() : null)).filter(Boolean)
  )].sort((a, b) => b - a);

  /* ---------- flatten ---------- */
  const allEvents = useMemo(() => {
    const list = [];
    filteredSchedules.forEach((s) => {
      flattenScheduleEvents(s).forEach((ev) => list.push(ev));
    });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredSchedules]);

  const featuredEvents = useMemo(() => {
    const now = new Date();
    return allEvents.filter((ev) => eventStart(ev) >= now).slice(0, 10);
  }, [allEvents]);

  const getScheduleStatus = (schedule) => {
    const now = new Date();
    const start = schedule.startDate ? new Date(schedule.startDate) : null;
    const end = schedule.endDate ? new Date(schedule.endDate) : null;
    if (end && end < now) return { text: "Completed", tone: "" };
    if (start && start > now) return { text: "Upcoming", tone: "" };
    return { text: "Active", tone: "" };
  };

  const goBack = () => navigate(-1);

  /* ---------- DIRECT add handlers (no download) ---------- */
  const handleAddOneFromCard = (ev, e) => {
    e?.stopPropagation?.();
    const s = schedules.find((x) => x.id === ev.scheduleId) || { title: ev.scheduleTitle };
    const route = addToCalendar(ev, s.title);
    showToast(
      route === "apple" ? "Opening your calendar…" : "Opening calendar in a new tab…",
      "success"
    );
  };

  const scheduleEvents = useMemo(() => {
    if (!selectedSchedule) return [];
    return flattenScheduleEvents(selectedSchedule);
  }, [selectedSchedule]);

  const handleAddOne = (ev, e) => {
    e?.stopPropagation?.();
    if (!selectedSchedule) return;
    const route = addToCalendar(ev, selectedSchedule.title);
    showToast(
      route === "apple" ? "Opening your calendar…" : "Opening calendar in a new tab…",
      "success"
    );
  };

  const handleAddSection = (sectionTitle, e) => {
    e?.stopPropagation?.();
    const secEvents = scheduleEvents.filter((ev) => ev.section === sectionTitle);
    if (!secEvents.length) return;
    // Bulk → always ICS (can't do multi-event on Google via URL)
    downloadICS(secEvents, `${selectedSchedule.title} - ${sectionTitle}`);
    showToast(`Added ${secEvents.length} event${secEvents.length > 1 ? "s" : ""}`, "success");
  };

  const handleAddAll = () => {
    if (!selectedSchedule || !scheduleEvents.length) return;
    downloadICS(scheduleEvents, selectedSchedule.title);
    showToast(`Added ${scheduleEvents.length} events`, "success");
  };

  /* ---------- featured slider + autoplay ---------- */
  const slideFeat = (dir) => {
    const el = featRef.current;
    if (el) el.scrollBy({ left: dir * ((el.firstChild?.offsetWidth || 300) + 14), behavior: "smooth" });
  };
  const onFeatScroll = (e) => {
    const el = e.currentTarget;
    setFeatIdx(Math.round(el.scrollLeft / ((el.firstChild?.offsetWidth || 300) + 14)));
  };

  useEffect(() => {
    if (featPaused || featuredEvents.length < 2) return;
    const id = setInterval(() => {
      const el = featRef.current;
      if (!el) return;
      const cardW = (el.firstChild?.offsetWidth || 300) + 14;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const next = el.scrollLeft + cardW;
      if (next >= maxScroll - 4) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollTo({ left: next, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(id);
  }, [featPaused, featuredEvents.length]);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="us">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`us-toast us-toast-${toast.type}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= HERO ================= */}
      <section className="us-hero">
        {cover
          ? <img className="us-cover" src={cover} alt="Cover" />
          : <div className="us-cover" style={{ background: THEMES[theme] || THEMES.navy }} />}
        <div className="us-shade" />

        <button className="us-hero-back" onClick={goBack}>
          <FiArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className="us-hero-copy">
          <div className="us-hero-eyebrow">ZETECH UNIVERSITY CATHOLIC ACTION</div>
          <h1>Semester Schedules</h1>
          <p>Save any event straight to your phone's calendar — one tap, no downloads</p>
        </div>
      </section>

      {/* ================= TOOLBAR ================= */}
      <section className="us-toolbar">
        <div className="us-search">
          <FiSearch size={14} />
          <input
            type="text"
            placeholder="Search schedules…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="us-search-x" aria-label="Clear">
              <FiX size={13} />
            </button>
          )}
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="us-select"
        >
          <option value="all">All Years</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="us-count">
          {allEvents.length} event{allEvents.length !== 1 ? "s" : ""}
        </span>
      </section>

      {/* ================= FEATURED SLIDER ================= */}
      {!loading && featuredEvents.length > 0 && (
        <section className="us-feat">
          <div className="us-feat-head">
            <div>
              <h2>Upcoming events</h2>
              <p>Swipe through — tap to save any event to your calendar</p>
            </div>
            <div className="us-feat-actions">
              <button
                className="us-feat-arrow"
                onClick={() => setFeatPaused((p) => !p)}
                aria-label={featPaused ? "Play" : "Pause"}
                title={featPaused ? "Play" : "Pause"}
              >
                {featPaused ? <FiEye size={14} /> : <FiX size={14} />}
              </button>
              <button className="us-feat-arrow" onClick={() => slideFeat(-1)} aria-label="Previous"><FiChevronLeft size={16} /></button>
              <button className="us-feat-arrow" onClick={() => slideFeat(1)} aria-label="Next"><FiChevronRight size={16} /></button>
            </div>
          </div>

          <div
            className="us-feat-track"
            ref={featRef}
            onScroll={onFeatScroll}
            onMouseEnter={() => setFeatPaused(true)}
            onMouseLeave={() => setFeatPaused(false)}
            onTouchStart={() => setFeatPaused(true)}
            onTouchEnd={() => setFeatPaused(false)}
          >
            {featuredEvents.map((ev, i) => {
              const d = new Date(ev.date);
              return (
                <article key={`${ev.scheduleId}-${i}`} className="us-ev">
                  <div
                    className="us-ev-bg"
                    style={
                      cover
                        ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: THEMES[theme] || THEMES.navy }
                    }
                  />
                  <div className="us-ev-shade" />

                  <div className="us-ev-head">
                    <div className="us-ev-datebox">
                      <em>{d.toLocaleString("en-US", { weekday: "short" })}</em>
                      <b>{d.getDate()}</b>
                      <i>{d.toLocaleString("en-US", { month: "short" })}</i>
                    </div>
                    <span className="us-ev-section">{ev.section}</span>
                  </div>

                  <div className="us-ev-body">
                    <h3>{ev.event}</h3>
                    <div className="us-ev-meta">
                      <span><FiClock size={11} /> 4:30 PM</span>
                      <span><FiMapPin size={11} /> Zetech</span>
                    </div>
                    <div className="us-ev-actions">
                      <button
                        className="us-ev-add"
                        onClick={(e) => handleAddOneFromCard(ev, e)}
                        title="Add to calendar"
                      >
                        <FiCalendar size={13} />
                        <span>Add to calendar</span>
                      </button>
                      <button
                        className="us-ev-open"
                        onClick={(e) => {
                          e.stopPropagation();
                          const s = schedules.find((x) => x.id === ev.scheduleId);
                          if (s) viewSchedule(s);
                        }}
                      >
                        <FiEye size={13} />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {featuredEvents.length > 1 && (
            <div className="us-feat-dots">
              {featuredEvents.slice(0, 12).map((_, i) => (
                <button
                  key={i}
                  className={i === featIdx ? "on" : ""}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => {
                    setFeatPaused(true);
                    const el = featRef.current;
                    if (el) el.scrollTo({ left: i * ((el.firstChild?.offsetWidth || 300) + 14), behavior: "smooth" });
                    setTimeout(() => setFeatPaused(false), 8000);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= ALL SCHEDULES ================= */}
      {loading ? (
        <div className="us-loader">
          <div className="us-spinner" />
          <p>Loading schedules…</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="us-empty">
          <FiInbox size={40} />
          <b>No schedules found</b>
          <span>Try a different search or year</span>
        </div>
      ) : (
        <section className="us-all">
          <div className="us-all-head">
            <h2>All schedules</h2>
            <span>{filteredSchedules.length} total</span>
          </div>
          <div className="us-grid">
            {filteredSchedules.map((schedule, index) => {
              const status = getScheduleStatus(schedule);
              const evCount = flattenScheduleEvents(schedule).length;
              return (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="us-card"
                  whileHover={{ y: -3 }}
                >
                  <div className="us-card-head">
                    <div className="us-card-icon"><FiCalendar size={18} /></div>
                    <span className={`us-pill us-pill-${status.tone}`}>{status.text}</span>
                  </div>
                  <h3>{schedule.title}</h3>
                  {schedule.startDate && (
                    <div className="us-card-date">
                      {new Date(schedule.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" — "}
                      {new Date(schedule.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                  <div className="us-card-meta">
                    <FiList size={12} />
                    <span>{evCount} event{evCount !== 1 ? "s" : ""}</span>
                  </div>
                  <button className="us-view" onClick={() => viewSchedule(schedule)}>
                    <FiEye size={14} />
                    <span>View schedule</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= RECENT ================= */}
      {recentlyViewed.length > 1 && (
        <section className="us-recent">
          <div className="us-recent-head">
            <FiClock size={14} />
            <h2>Recently viewed</h2>
          </div>
          <div className="us-recent-list">
            {recentlyViewed.map((s) => (
              <button key={s.id} className="us-recent-item" onClick={() => viewSchedule(s)}>
                <FiCalendar size={14} />
                <span className="us-recent-title">{s.title}</span>
                {s.startDate && (
                  <span className="us-recent-date">
                    {new Date(s.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <FiChevronRight size={13} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ================= MODAL ================= */}
      <AnimatePresence>
        {showModal && selectedSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="us-overlay"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="us-modal-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="us-modal-head">
                <div className="us-modal-title">
                  <h2>{selectedSchedule.title}</h2>
                  {selectedSchedule.startDate && (
                    <span>
                      {new Date(selectedSchedule.startDate).toLocaleDateString()} – {new Date(selectedSchedule.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="us-modal-actions">
                  <button className="us-icon-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
                    {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                  </button>
                  <button className="us-icon-btn" onClick={closeModal} aria-label="Close"><FiX size={16} /></button>
                </div>
              </div>

              <div className="us-tabs">
                <button className={modalTab === "list" ? "on" : ""} onClick={() => setModalTab("list")}>
                  <FiList size={14} /><span>List</span>
                </button>
                <button className={modalTab === "calendar" ? "on" : ""} onClick={() => setModalTab("calendar")}>
                  <FiCalendar size={14} /><span>Calendar</span>
                </button>
                <div className="us-tabs-spacer" />
                <button className="us-tab-cta" onClick={handleAddAll}><FiDownload size={13} /><span>Add all</span></button>
              </div>

              <div className="us-modal-body">
                {modalTab === "list" ? (
                  <div className="us-list">
                    {selectedSchedule.generalPoints?.length > 0 && (
                      <div className="us-doc-intro">
                        <div className="us-doc-brand">ZETECH UNIVERSITY CATHOLIC ACTION</div>
                        <div className="us-doc-intro-text">Activities will take place as follows:</div>
                        <ul className="us-doc-points">
                          {selectedSchedule.generalPoints
                            .filter((p) => p.text && p.text.trim())
                            .map((p, i) => <li key={i}>{p.text}</li>)}
                        </ul>
                      </div>
                    )}

                    {(selectedSchedule.sections || []).map((sec, idx) => {
                      const rows = (sec.tableRows || []).filter((r) => r.date && r.event);
                      if (!sec.title && !rows.length && !sec.freeText) return null;
                      const secKey = sec.title || `section-${idx}`;
                      return (
                        <section key={secKey} className="us-section">
                          <div className="us-section-head">
                            <h3><span className="us-section-bar" />{sec.title || "Section"}</h3>
                            {rows.length > 0 && (
                              <button className="us-section-add" onClick={(e) => handleAddSection(sec.title, e)}>
                                <FiDownload size={12} /><span>Save all</span>
                              </button>
                            )}
                          </div>
                          {rows.length > 0 && (
                            <div className="us-table">
                              <div className="us-tr us-tr-head">
                                <div className="us-th">Date</div>
                                <div className="us-th">Event</div>
                                <div className="us-th us-th-action">Add</div>
                              </div>
                              {rows.map((row, i) => {
                                const iso = parseScheduleDate(
                                  row.date,
                                  selectedSchedule.startDate ? new Date(selectedSchedule.startDate).getFullYear() : new Date().getFullYear()
                                );
                                const ev = iso ? { date: iso, event: row.event, section: sec.title || "Schedule" } : null;
                                return (
                                  <div key={i} className="us-tr">
                                    <div className="us-td us-td-date">{row.date}</div>
                                    <div className="us-td">{row.event}</div>
                                    <div className="us-td us-td-action">
                                      {ev && (
                                        <button
                                          className="us-add-btn"
                                          onClick={(e) => handleAddOne(ev, e)}
                                          title="Add to my calendar"
                                        >
                                          <FiCalendar size={12} />
                                          <span>Add</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {sec.freeText && <div className="us-section-note">{sec.freeText}</div>}
                        </section>
                      );
                    })}
                    {selectedSchedule.additionalNotes && (
                      <div className="us-section-note us-section-note-final">{selectedSchedule.additionalNotes}</div>
                    )}
                    <div className="us-doc-footer">ZUCA PORTAL · AUTO SYSTEM GENERATED</div>
                  </div>
                ) : (
                  <div className="us-cal-wrap">
                    <MonthCalendar
                      month={calMonth}
                      year={calYear}
                      events={scheduleEvents}
                      onPrev={() => { const m = calMonth - 1; if (m < 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(m); }}
                      onNext={() => { const m = calMonth + 1; if (m > 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(m); }}
                      onPickDay={(day, events) => setDaySheet({ day, events })}
                    />
                    {scheduleEvents.length > 0 && (
                      <div className="us-upcoming">
                        <div className="us-upcoming-head">Upcoming from this schedule</div>
                        {scheduleEvents.slice(0, 5).map((ev, i) => (
                          <div key={i} className="us-upcoming-row">
                            <div className="us-upcoming-date">
                              {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                            <div className="us-upcoming-body">
                              <b>{ev.event}</b>
                              <span>{ev.section}</span>
                            </div>
                            <button
                              className="us-add-btn"
                              onClick={(e) => handleAddOne(ev, e)}
                              title="Add to my calendar"
                            >
                              <FiCalendar size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="us-modal-foot">
                <button className="us-dl us-dl-pdf" onClick={() => downloadAsPDF(selectedSchedule)} disabled={downloadLoading}>
                  <FaFilePdf size={14} /><span>PDF</span>
                </button>
                <button className="us-dl us-dl-img" onClick={() => downloadAsImage(selectedSchedule)} disabled={downloadLoading}>
                  <FiImage size={14} /><span>Image</span>
                </button>
                <button className="us-dl us-dl-doc" onClick={() => downloadAsWord(selectedSchedule)} disabled={downloadLoading}>
                  <FaFileWord color="#1d4ed8" size={14} /><span>Word</span>
                </button>
              </div>

              <AnimatePresence>
                {daySheet && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="us-day-overlay" onClick={() => setDaySheet(null)}
                  >
                    <motion.div
                      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="us-day-sheet"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="us-day-head">
                        <b>{new Date(calYear, calMonth, daySheet.day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</b>
                        <button onClick={() => setDaySheet(null)} className="us-icon-btn"><FiX size={15} /></button>
                      </div>
                      {daySheet.events.map((ev, i) => (
                        <div key={i} className="us-day-row">
                          <div className="us-day-marker" />
                          <div className="us-day-body">
                            <b>{ev.event}</b>
                            <span>{ev.section} · <FiClock size={11} /> 4:30 PM</span>
                          </div>
                          <button
                            className="us-add-btn"
                            onClick={(e) => handleAddOne(ev, e)}
                            title="Add to my calendar"
                          >
                            <FiCalendar size={13} />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= STYLES ================= */}
      <style>{`
        .us{
          max-width:1240px;margin:0 auto;
          padding:0 16px 60px;min-height:100vh;
          background:#f8fafc;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;
          color:#0f172a;box-sizing:border-box;
        }
        .us *{box-sizing:border-box}

        .us-hero{
          position:relative;margin:0 -16px 20px;
          height:220px;overflow:hidden;
          border-radius:0 0 22px 22px;background:#0f172a;
        }
        .us-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .us-shade{
          position:absolute;inset:0;
          background:
            linear-gradient(180deg, rgba(15,23,42,.65) 0%, rgba(15,23,42,.20) 32%, rgba(15,23,42,.75) 100%),
            linear-gradient(90deg, rgba(15,23,42,.55) 0%, rgba(15,23,42,.10) 55%, transparent 100%);
        }
        .us-hero-back{
          position:absolute;top:16px;left:16px;z-index:3;
          display:inline-flex;align-items:center;gap:6px;
          padding:8px 12px;background:rgba(255,255,255,.16);
          border:1px solid rgba(255,255,255,.35);border-radius:10px;
          color:#fff;font-size:12.5px;font-weight:700;
          cursor:pointer;backdrop-filter:blur(8px);
          font-family:inherit;transition:background .15s ease;
        }
        .us-hero-back:hover{background:rgba(255,255,255,.28)}
        .us-hero-copy{
          position:absolute;left:20px;right:20px;bottom:20px;z-index:2;
          color:#fff;display:flex;flex-direction:column;gap:4px;
        }
        .us-hero-eyebrow{
          font-size:10px;font-weight:800;letter-spacing:.12em;
          text-transform:uppercase;opacity:.85;
          text-shadow:0 1px 6px rgba(0,0,0,.6);
        }
        .us-hero-copy h1{
          margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em;
          text-shadow:0 2px 14px rgba(0,0,0,.75), 0 1px 3px rgba(0,0,0,.6);
        }
        .us-hero-copy p{
          margin:0;font-size:12.5px;opacity:.92;
          text-shadow:0 1px 8px rgba(0,0,0,.7);max-width:640px;
        }

        .us-toolbar{
          display:flex;gap:10px;margin-bottom:22px;
          flex-wrap:wrap;align-items:center;
        }
        .us-search{
          position:relative;flex:1 1 240px;
          display:flex;align-items:center;gap:8px;
          padding:0 12px;height:42px;
          background:#fff;border:1px solid #e5e7eb;
          border-radius:10px;color:#94a3b8;
        }
        .us-search input{
          flex:1;border:0;outline:0;background:transparent;
          font-size:14px;color:#0f172a;font-family:inherit;min-width:0;
        }
        .us-search-x{
          border:0;background:#f1f5f9;border-radius:6px;
          width:22px;height:22px;display:grid;place-items:center;
          cursor:pointer;color:#64748b;
        }
        .us-select{
          height:42px;padding:0 14px;
          background:#fff;border:1px solid #e5e7eb;
          border-radius:10px;font-size:14px;font-weight:600;
          color:#0f172a;cursor:pointer;font-family:inherit;
        }
        .us-select:focus{outline:none;border-color:#0f172a}
        .us-count{font-size:12.5px;color:#64748b;font-weight:600;padding:0 4px}

        .us-feat{margin-bottom:28px}
        .us-feat-head{
          display:flex;align-items:flex-end;justify-content:space-between;
          gap:12px;margin-bottom:12px;
        }
        .us-feat-head h2{margin:0 0 2px;font-size:16px;font-weight:800;letter-spacing:-.01em}
        .us-feat-head p{margin:0;font-size:12px;color:#94a3b8;font-weight:500}
        .us-feat-actions{display:flex;gap:6px}
        .us-feat-arrow{
          width:34px;height:34px;display:grid;place-items:center;
          background:#fff;border:1px solid #e5e7eb;border-radius:9px;
          color:#475569;cursor:pointer;transition:all .12s ease;
        }
        .us-feat-arrow:hover{background:#0f172a;color:#fff;border-color:#0f172a}

        .us-feat-track{
          display:flex;gap:14px;overflow-x:auto;
          scroll-snap-type:x mandatory;scrollbar-width:none;
          padding-bottom:4px;
        }
        .us-feat-track::-webkit-scrollbar{display:none}

        .us-ev{
          position:relative;flex:0 0 86%;height:210px;
          border-radius:18px;overflow:hidden;scroll-snap-align:start;
          background:#0f172a;box-shadow:0 8px 22px -16px rgba(15,23,42,.5);
          color:#fff;display:flex;flex-direction:column;justify-content:space-between;
        }
        .us-ev-bg{position:absolute;inset:0;z-index:0}
        .us-ev-shade{
          position:absolute;inset:0;z-index:1;
          background:linear-gradient(180deg,
            rgba(15,23,42,.35) 0%,
            rgba(15,23,42,.05) 30%,
            rgba(15,23,42,.82) 100%);
        }
        .us-ev-head{
          position:relative;z-index:2;
          display:flex;align-items:flex-start;justify-content:space-between;
          gap:8px;padding:14px;
        }
        .us-ev-datebox{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          width:52px;padding:6px 0;border-radius:10px;
          background:rgba(255,255,255,.95);color:#0f172a;line-height:1;
          box-shadow:0 2px 8px rgba(0,0,0,.2);
        }
        .us-ev-datebox em{font-style:normal;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8}
        .us-ev-datebox b{font-size:19px;font-weight:800;margin:1px 0}
        .us-ev-datebox i{font-style:normal;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8}
        .us-ev-section{
          font-size:10px;font-weight:800;letter-spacing:.05em;
          text-transform:uppercase;padding:5px 10px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        .us-ev-body{
          position:relative;z-index:2;
          padding:14px;display:flex;flex-direction:column;gap:6px;
        }
        .us-ev-body h3{
          margin:0;font-size:15px;font-weight:800;line-height:1.25;color:#fff;
          text-shadow:0 1px 3px rgba(0,0,0,.6);
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
        }
        .us-ev-meta{
          display:flex;align-items:center;gap:12px;font-size:11px;
          opacity:.95;text-shadow:0 1px 2px rgba(0,0,0,.5);
        }
        .us-ev-meta span{display:inline-flex;align-items:center;gap:4px}
        .us-ev-actions{display:flex;gap:6px;margin-top:6px}
        .us-ev-add{
          display:inline-flex;align-items:center;gap:6px;
          padding:8px 12px;border-radius:9px;
          background:#fff;color:#0f172a;border:0;
          font-size:12px;font-weight:800;
          cursor:pointer;font-family:inherit;transition:transform .12s ease;
        }
        .us-ev-add:hover{transform:translateY(-1px)}
        .us-ev-open{
          display:inline-flex;align-items:center;gap:6px;
          padding:8px 12px;border-radius:9px;
          background:rgba(255, 255, 255, 0);
          border:1px solid rgba(255, 255, 255, 0);
          color:#fff;font-size:12px;font-weight:700;
          cursor:pointer;font-family:inherit;backdrop-filter:blur(6px);
          transition:background .15s ease;
        }
        .us-ev-open:hover{background:rgba(255,255,255,.28)}

        .us-feat-dots{display:flex;gap:6px;justify-content:center;margin-top:12px;flex-wrap:wrap}
        .us-feat-dots button{width:6px;height:6px;padding:0;border:0;border-radius:50%;background:#cbd5e1;cursor:pointer;transition:all .15s ease}
        .us-feat-dots button.on{width:20px;border-radius:6px;background:#0f172a}

        .us-all-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}
        .us-all-head h2{margin:0;font-size:16px;font-weight:800;letter-spacing:-.01em}
        .us-all-head span{font-size:12px;color:#94a3b8;font-weight:600}

        .us-grid{
          display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
          gap:16px;margin-bottom:32px;
        }
        .us-card{
          background:#fff;border:1px solid #e5e7eb;
          border-radius:14px;padding:18px;
          display:flex;flex-direction:column;gap:10px;
          transition:box-shadow .18s ease, border-color .18s ease;
          cursor:pointer;
        }
        .us-card:hover{box-shadow:0 12px 28px -18px rgba(15,23,42,.35);border-color:#d4d4d8}
        .us-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .us-card-icon{
          width:34px;height:34px;border-radius:10px;
          background:#f4f4f5;color:#0f172a;
          display:grid;place-items:center;flex-shrink:0;
        }
        .us-pill{
          font-size:10.5px;font-weight:800;letter-spacing:.04em;
          text-transform:uppercase;padding:4px 9px;border-radius:999px;
          border:1px solid transparent;
        }
        .us-pill-green{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
        .us-pill-amber{color:#b45309;background:#fffbeb;border-color:#fde68a}
        .us-pill-neutral{color:#475569;background:#f1f5f9;border-color:#e2e8f0}

        .us-card h3{
          margin:0;font-size:15.5px;font-weight:700;color:#0f172a;
          line-height:1.3;letter-spacing:-.01em;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
        }
        .us-card-date{font-size:12.5px;color:#64748b;font-weight:500}
        .us-card-meta{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;margin-top:auto}
        .us-view{
          margin-top:6px;display:inline-flex;align-items:center;justify-content:center;
          gap:8px;padding:10px 12px;
          background:#0f172a;color:#fff;border:0;border-radius:10px;
          font-size:13px;font-weight:700;cursor:pointer;
          font-family:inherit;transition:opacity .15s ease, transform .12s ease;
        }
        .us-view:hover{opacity:.92;transform:translateY(-1px)}

        .us-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:#64748b;gap:14px}
        .us-spinner{width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#0f172a;border-radius:50%;animation:us-spin 1s linear infinite}
        @keyframes us-spin{to{transform:rotate(360deg)}}
        .us-empty{
          display:flex;flex-direction:column;align-items:center;gap:6px;
          padding:60px 20px;background:#fff;border:1px dashed #e5e7eb;
          border-radius:14px;color:#94a3b8;text-align:center;
        }
        .us-empty b{color:#0f172a;font-size:14px}
        .us-empty span{font-size:12.5px}

        .us-recent{border-top:1px solid #e5e7eb;padding-top:20px}
        .us-recent-head{display:flex;align-items:center;gap:8px;color:#64748b;margin-bottom:10px}
        .us-recent-head h2{margin:0;font-size:12.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
        .us-recent-list{display:flex;flex-direction:column;gap:6px}
        .us-recent-item{
          display:flex;align-items:center;gap:10px;
          padding:10px 12px;background:#fff;border:1px solid #e5e7eb;
          border-radius:10px;cursor:pointer;font-family:inherit;
          text-align:left;transition:background .12s ease, border-color .12s ease;
          color:#0f172a;
        }
        .us-recent-item:hover{background:#f8fafc;border-color:#d4d4d8}
        .us-recent-item svg{color:#94a3b8;flex-shrink:0}
        .us-recent-title{flex:1;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .us-recent-date{font-size:11.5px;color:#94a3b8}

        .us-overlay{
          position:fixed;inset:0;
          background:rgba(15,23,42,.55);backdrop-filter:blur(4px);
          z-index:1000;display:flex;align-items:center;
          justify-content:center;padding:16px;
        }
        .us-modal-panel{
          background:#fff;border-radius:16px;
          width:100%;max-width:920px;max-height:92vh;
          display:flex;flex-direction:column;overflow:hidden;
          box-shadow:0 40px 80px -30px rgba(0,0,0,.4);
          border:1px solid #e5e7eb;position:relative;
        }
        .us-modal-panel:fullscreen{border-radius:0;max-width:100%;max-height:100vh}
        .us-modal-head{
          display:flex;align-items:flex-start;justify-content:space-between;
          gap:12px;padding:14px 18px;border-bottom:1px solid #e5e7eb;
          background:#fff;flex-shrink:0;
        }
        .us-modal-title h2{margin:0 0 2px;font-size:15px;font-weight:800;color:#0f172a;letter-spacing:-.01em}
        .us-modal-title span{display:block;font-size:11.5px;color:#94a3b8;font-weight:500}
        .us-modal-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}
        .us-icon-btn{
          width:32px;height:32px;display:grid;place-items:center;
          background:transparent;border:0;border-radius:8px;
          color:#64748b;cursor:pointer;transition:background .12s ease,color .12s ease;
        }
        .us-icon-btn:hover{background:#f4f4f5;color:#0f172a}

        .us-tabs{
          display:flex;align-items:center;gap:6px;
          padding:10px 14px;border-bottom:1px solid #e5e7eb;
          background:#fafafa;flex-shrink:0;
        }
        .us-tabs > button{
          display:inline-flex;align-items:center;gap:6px;
          padding:7px 12px;border-radius:8px;
          border:1px solid transparent;background:transparent;
          color:#475569;font-size:12.5px;font-weight:700;
          cursor:pointer;font-family:inherit;transition:all .12s ease;
        }
        .us-tabs > button:hover{background:#f1f5f9;color:#0f172a}
        .us-tabs > button.on{
          background:#fff;border-color:#e5e7eb;color:#0f172a;
          box-shadow:0 1px 2px rgba(15,23,42,.05);
        }
        .us-tabs-spacer{flex:1}
        .us-tabs .us-tab-cta{
          background:#0f172a;color:#fff;border-color:#0f172a;
          padding:7px 11px;font-size:12px;
        }
        .us-tabs .us-tab-cta:hover{background:#1e293b;color:#fff}
        .us-tabs .us-tab-cta svg{color:#fff}

        .us-modal-body{flex:1;overflow-y:auto;background:#f8fafc;padding:18px}

        .us-list{
          max-width:820px;margin:0 auto;
          background:#fff;border:1px solid #e5e7eb;
          border-radius:14px;padding:26px;
          display:flex;flex-direction:column;gap:22px;
        }
        .us-doc-intro{display:flex;flex-direction:column;gap:8px;padding-bottom:18px;border-bottom:1px solid #f1f5f9}
        .us-doc-brand{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}
        .us-doc-intro-text{font-size:14px;color:#0f172a;font-weight:600}
        .us-doc-points{margin:6px 0 0;padding-left:20px;font-size:13.5px;line-height:1.7;color:#334155}
        .us-doc-points li{margin-bottom:2px}
        .us-section{display:flex;flex-direction:column;gap:12px}
        .us-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .us-section-head h3{
          margin:0;display:flex;align-items:center;gap:10px;
          font-size:14.5px;font-weight:800;color:#0f172a;letter-spacing:-.01em;
        }
        .us-section-bar{width:4px;height:18px;background:#22c55e;border-radius:2px;flex-shrink:0}
        .us-section-add{
          display:inline-flex;align-items:center;gap:6px;
          padding:6px 10px;background:#fff;
          border:1px solid #e5e7eb;border-radius:8px;
          color:#0f172a;font-size:11.5px;font-weight:700;
          cursor:pointer;font-family:inherit;transition:all .12s ease;flex-shrink:0;
        }
        .us-section-add:hover{background:#ecfdf5;border-color:#a7f3d0;color:#047857}

        .us-table{
          display:flex;flex-direction:column;
          border:1px solid #e5e7eb;border-radius:12px;
          overflow:hidden;background:#fff;
        }
        .us-tr{
          display:grid;grid-template-columns:120px 1fr 80px;
          align-items:center;gap:8px;padding:11px 14px;
          border-bottom:1px solid #f1f5f9;transition:background .12s ease;
        }
        .us-tr:last-child{border-bottom:0}
        .us-tr:not(.us-tr-head):hover{background:#fafafa}
        .us-tr-head{background:#fafafa;border-bottom:1px solid #e5e7eb;padding-top:9px;padding-bottom:9px}
        .us-th{
          font-size:10.5px;font-weight:800;letter-spacing:.08em;
          text-transform:uppercase;color:#94a3b8;
        }
        .us-th-action{text-align:right}
        .us-td{font-size:13.5px;color:#334155;line-height:1.4;word-break:break-word}
        .us-td-date{font-weight:700;color:#0f172a;white-space:nowrap}
        .us-td-action{text-align:right;display:flex;justify-content:flex-end}
        .us-add-btn{
          display:inline-flex;align-items:center;gap:5px;
          padding:6px 10px;border-radius:8px;
          
          font-size:11.5px;font-weight:800;
          cursor:pointer;font-family:inherit;transition:all .12s ease;
          white-space:nowrap;
        }
       
        .us-upcoming-row .us-add-btn,
        .us-day-row .us-add-btn{
          width:34px;height:34px;padding:0;justify-content:center;
        }

        .us-section-note{
          font-size:12.5px;color:#64748b;font-style:italic;
          padding:10px 14px;background:#f8fafc;border-radius:10px;
          border-left:3px solid #cbd5e1;line-height:1.6;
        }
        .us-section-note-final{margin-top:6px}
        .us-doc-footer{
          text-align:center;font-size:11px;color:#94a3b8;
          letter-spacing:.06em;text-transform:uppercase;font-weight:700;
          padding-top:14px;border-top:1px solid #f1f5f9;
        }

        .us-cal-wrap{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
        .us-cal{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px}
        .us-cal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
        .us-cal-title{font-size:14px;font-weight:800;color:#0f172a;letter-spacing:-.01em}
        .us-cal-arrow{
          width:32px;height:32px;display:grid;place-items:center;
          background:transparent;border:1px solid #e5e7eb;border-radius:8px;
          color:#475569;cursor:pointer;transition:background .12s ease;
        }
        .us-cal-arrow:hover{background:#f4f4f5}
        .us-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
        .us-cal-grid-head{margin-bottom:6px}
        .us-cal-weekday{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;text-align:center;padding:6px 0}
        .us-cal-day{
          position:relative;aspect-ratio:1;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
          border-radius:8px;border:1px solid transparent;background:transparent;
          color:#334155;font-family:inherit;cursor:pointer;transition:all .12s ease;
        }
        .us-cal-day.empty{cursor:default;opacity:.3}
        .us-cal-day:not(.empty):hover{background:#f4f4f5}
        .us-cal-day.has-events{background:#f0fdf4;color:#047857;font-weight:700}
        .us-cal-day.has-events:hover{background:#dcfce7}
        .us-cal-day-num{font-size:13px}
        .us-cal-day-dots{display:flex;align-items:center;gap:2px}
        .us-cal-dot{width:4px;height:4px;border-radius:50%;background:#16a34a;display:inline-block}
        .us-cal-more{font-size:8.5px;color:#047857;font-weight:800;margin-left:2px}

        .us-upcoming{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px}
        .us-upcoming-head{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px}
        .us-upcoming-row{
          display:grid;grid-template-columns:60px 1fr 40px;
          align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;
        }
        .us-upcoming-row:last-child{border-bottom:0}
        .us-upcoming-date{font-size:11.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.03em}
        .us-upcoming-body{display:flex;flex-direction:column;min-width:0}
        .us-upcoming-body b{font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .us-upcoming-body span{font-size:11px;color:#94a3b8;font-weight:500}

        .us-modal-foot{
          display:flex;align-items:center;justify-content:flex-end;gap:8px;
          padding:12px 18px;border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0;
        }
        .us-dl{
          display:inline-flex;align-items:center;gap:6px;
          padding:9px 14px;border-radius:9px;border:1px solid #e5e7eb;
          background:#fff;color:#0f172a;font-size:12.5px;font-weight:700;
          cursor:pointer;font-family:inherit;transition:all .12s ease;
        }
        .us-dl:hover:not(:disabled){background:#f4f4f5}
        .us-dl-pdf{border-color:#fecaca;color:#b91c1c}
        .us-dl-pdf:hover:not(:disabled){background:#fef2f2}
        .us-dl-img:hover:not(:disabled){background:#ecfdf5}
        .us-dl:disabled{opacity:.5;cursor:not-allowed}

        .us-day-overlay{
          position:absolute;inset:0;background:rgba(15,23,42,.4);
          z-index:10;display:flex;align-items:flex-end;justify-content:center;
          border-radius:16px;
        }
        .us-day-sheet{
          width:100%;max-width:520px;background:#fff;
          border-radius:16px 16px 0 0;padding:16px 18px;
          box-shadow:0 -8px 30px -10px rgba(15,23,42,.25);
        }
        .us-day-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
        .us-day-head b{font-size:13.5px;font-weight:800;color:#0f172a}
        .us-day-row{display:grid;grid-template-columns:6px 1fr 40px;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid #f1f5f9}
        .us-day-row:last-child{border-bottom:0}
        .us-day-marker{width:6px;height:34px;border-radius:4px;background:#22c55e}
        .us-day-body{display:flex;flex-direction:column;min-width:0}
        .us-day-body b{font-size:13.5px;font-weight:700;color:#0f172a;line-height:1.3}
        .us-day-body span{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#94a3b8;font-weight:500;margin-top:2px}

        .us-toast{
          position:fixed;left:50%;bottom:24px;transform:translateX(-50%);
          padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;
          color:#fff;z-index:10000;box-shadow:0 8px 24px -10px rgba(0,0,0,.35);
          white-space:nowrap;
        }
        .us-toast-success{background:#0f172a}
        .us-toast-error{background:#dc2626}
        .us-toast-info{background:#0f172a}

        @media (min-width:768px){
          .us-hero{height:260px;border-radius:0 0 24px 24px}
          .us-hero-copy h1{font-size:28px}
          .us-hero-copy p{font-size:13.5px}
          .us-ev{flex:0 0 300px;height:220px}
        }
        @media (min-width:1024px){
          .us-ev{flex:0 0 320px}
        }
        @media (max-width:768px){
          .us{padding:0 12px 48px}
          .us-hero{margin:0 -12px 16px;height:200px}
          .us-hero-back{top:12px;left:12px;padding:7px 10px;font-size:12px}
          .us-hero-copy{left:14px;right:14px;bottom:14px}
          .us-hero-copy h1{font-size:19px}
          .us-hero-copy p{font-size:12px}
          .us-hero-eyebrow{font-size:9.5px}
          .us-grid{grid-template-columns:1fr;gap:12px}
          .us-modal-panel{max-height:100vh;border-radius:12px}
          .us-modal-head{padding:12px 14px}
          .us-modal-title h2{font-size:14px}
          .us-tabs{padding:8px 10px;gap:4px;overflow-x:auto;scrollbar-width:none}
          .us-tabs::-webkit-scrollbar{display:none}
          .us-tabs > button{padding:6px 10px;font-size:11.5px;flex-shrink:0}
          .us-modal-body{padding:12px}
          .us-list{padding:18px}
          .us-tr{grid-template-columns:88px 1fr 68px;padding:10px 12px;gap:6px}
          .us-td{font-size:12.5px}
          .us-td-date{font-size:12px}
          .us-add-btn{padding:5px 8px;font-size:11px}
          .us-modal-foot{padding:10px 14px;flex-wrap:wrap}
          .us-dl{flex:1;justify-content:center;padding:9px 8px}
          .us-dl span{font-size:12px}
          .us-cal-day-num{font-size:12px}
          .us-upcoming-row{grid-template-columns:52px 1fr 40px}
        }
        @media (max-width:420px){
          .us-tabs .us-tab-cta span{display:none}
          .us-tabs .us-tab-cta{padding:7px 9px}
          .us-section-head{flex-wrap:wrap}
          .us-tr{grid-template-columns:78px 1fr 60px}
          .us-add-btn span{display:none}
          .us-add-btn{padding:6px 8px}
          .us-dl span{display:none}
          .us-dl{padding:9px 12px}
          .us-ev{height:200px}
          .us-ev-body h3{font-size:14px}
          .us-ev-open span{display:none}
          .us-ev-open{padding:8px 10px}
        }
      `}</style>
    </div>
  );
}

export default UserSchedules;