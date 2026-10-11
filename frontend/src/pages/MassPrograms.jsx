// frontend/src/pages/MassPrograms.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import logo from "../assets/zuca-logo.png";
import {
  FaChurch, FaFileWord, FaFilePdf, FaFacebook, FaTelegramPlane,
  FaRegKeyboard,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import {
  FiShare2, FiSearch, FiChevronRight, FiChevronLeft,
  FiCopy, FiPrinter, FiMail, FiX, FiClock,
  FiMusic, FiInbox, FiMoreHorizontal, FiArrowLeft,
  FiCalendar, FiSun,
} from "react-icons/fi";
import {
  BsWhatsapp, BsTwitter, BsFileImage, BsMusicNoteBeamed,
  BsPlayCircle,
} from "react-icons/bs";
import { MdOutlineFormatQuote } from "react-icons/md";
import BASE_URL from "../api";

/* =========================================================
   MODULE-LEVEL CACHE (survives component re-mount)
========================================================= */
let PROGRAMS_CACHE = null;

/* =========================================================
   HELPERS
========================================================= */
const parseSongs = (value) => {
  if (!value) return [];
  if (typeof value === "string" && value.includes(";")) {
    return value.split(";").map((s) => s.trim()).filter((s) => s);
  }
  if (typeof value === "string" && value) return [value];
  if (Array.isArray(value)) return value;
  return [];
};

const formatLongDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

const isToday = (dateStr) =>
  new Date(dateStr).toDateString() === new Date().toDateString();

const isTomorrow = (dateStr) => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return new Date(dateStr).toDateString() === t.toDateString();
};

const isPast = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
};

const songFields = [
  { key: "entrance",     label: "Entrance" },
  { key: "mass",         label: "Mass" },
  { key: "bible",        label: "Bible" },
  { key: "offertory",    label: "Offering" },
  { key: "procession",   label: "Offertory Procession" },
  { key: "mtakatifu",    label: "Sanctus" },
  { key: "signOfPeace",  label: "Peace" },
  { key: "communion",    label: "Communion" },
  { key: "thanksgiving", label: "Thanksgiving" },
  { key: "exit",         label: "Exit" },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 16) return "Good afternoon";
  return "Good evening";
};

const themeBg = (theme) => {
  const map = {
    emerald:  "linear-gradient(135deg, #059669 0%, #0d9488 40%, #7c3aed 100%)",
    sunset:   "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #be185d 100%)",
    ocean:    "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)",
    midnight: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    royal:    "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
    navy:     "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #1e3a8a 100%)",
    violet:   "linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)",
    aurora:   "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #f43f5e 100%)",
    ink:      "linear-gradient(135deg, #1f2937 0%, #0f172a 50%, #000000 100%)",
    forest:   "linear-gradient(135deg, #15803d 0%, #166534 50%, #365314 100%)",
    rose:     "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #d946ef 100%)",
    amber:    "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  };
  return map[theme] || map.navy;
};

/* =========================================================
   SKELETON
========================================================= */
function SkeletonCard() {
  return (
    <div className="mp-sk-card">
      <div className="mp-sk-head">
        <div className="mp-sk-datebox" />
        <div className="mp-sk-info">
          <div className="mp-sk-line mp-sk-line-lg" />
          <div className="mp-sk-line mp-sk-line-md" />
          <div className="mp-sk-line mp-sk-line-sm" />
        </div>
      </div>
      <div className="mp-sk-carousel">
        <div className="mp-sk-song" />
        <div className="mp-sk-song" />
        <div className="mp-sk-song" />
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function MassPrograms() {
  const navigate = useNavigate();

  const [view, setView] = useState("index");
  const [activeProgram, setActiveProgram] = useState(null);

  const [programs, setPrograms] = useState(PROGRAMS_CACHE || []);
  const [loading, setLoading] = useState(!PROGRAMS_CACHE);
  const [openingSong, setOpeningSong] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("massProgramFavorites") || "[]"); }
    catch { return []; }
  });
  const [highlightedSong, setHighlightedSong] = useState(null);
  const [songNotes, setSongNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("songNotes") || "{}"); }
    catch { return {}; }
  });
  const [songPreview, setSongPreview] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [cover, setCover] = useState(null);
  const [theme, setTheme] = useState("navy");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (!stored) return;
    const c = stored.coverImage;
    setCover(c ? (c.startsWith("http") ? c : `${BASE_URL}/${c}`) : null);
    setTheme(stored.profileTheme || localStorage.getItem("profileTheme") || "navy");
  }, []);

  /* ---------- fetch (uses cache, silent refresh) ---------- */
  const fetchPrograms = useCallback(async () => {
    try {
      if (!PROGRAMS_CACHE) setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/mass-programs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = Array.isArray(res.data) ? res.data : [];
      PROGRAMS_CACHE = data;
      setPrograms(data);
    } catch (err) {
      console.error(err);
      if (!PROGRAMS_CACHE) setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    localStorage.setItem("massProgramFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("songNotes", JSON.stringify(songNotes));
  }, [songNotes]);

  /* ---------- navigation ---------- */
  const openProgram = (p) => {
    setActiveProgram(p);
    setView("program");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const closeProgram = () => {
    setView("index");
    setActiveProgram(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  /* ---------- navigate to hymn ---------- */
  const navigateToHymn = async (hymnTitle, e) => {
    e.stopPropagation();
    if (!hymnTitle || hymnTitle === "—" || hymnTitle.trim() === "") return;
    setOpeningSong(hymnTitle);
    try {
      const response = await axios.get(
        `${BASE_URL}/api/songs?search=${encodeURIComponent(hymnTitle)}&limit=5`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const songs = response.data.songs || [];
      if (songs && songs.length > 0) navigate(`/hymn/${songs[0].title}`);
      else {
        showToast(`"${hymnTitle}" not found in hymn book`);
        setOpeningSong(null);
      }
    } catch {
      showToast(`Could not find "${hymnTitle}"`);
      setOpeningSong(null);
    }
  };

  /* ---------- helpers ---------- */
  const previewSong = (songTitle) => {
    setSongPreview(songTitle);
    setTimeout(() => setSongPreview(null), 3000);
  };

  const getSongsArray = (program, fieldKey) => parseSongs(program[fieldKey]);

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = "mp-toast";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const addSongNote = (programId, songKey, songIndex, currentNote) => {
    const noteKey = songIndex !== undefined ? `${programId}-${songKey}-${songIndex}` : `${programId}-${songKey}`;
    const note = prompt("Add a note for this hymn:", currentNote || "");
    if (note !== null) {
      if (note.trim() !== "") {
        setSongNotes((prev) => ({ ...prev, [noteKey]: note }));
        showToast("Note added");
      } else {
        const n = { ...songNotes };
        delete n[noteKey];
        setSongNotes(n);
        showToast("Note removed");
      }
    }
  };

  const highlightSong = (programId, songKey) => {
    setHighlightedSong(`${programId}-${songKey}`);
    setTimeout(() => setHighlightedSong(null), 2000);
  };

  /* ---------- downloads ---------- */
  const downloadAsImage = async (program) => {
    setGeneratingImage(true);
    showToast("Generating image...");
    try {
      const formattedDate = formatLongDate(program.date);
      const rows = songFields.map((field) => {
        const arr = getSongsArray(program, field.key);
        if (arr.length === 0) return "";
        const disp = arr.length === 1 ? arr[0] : arr.map((s, i) => `${i + 1}. ${s}`).join("<br>");
        return `<tr>
          <td style="padding:12px 14px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;text-transform:uppercase;font-size:12px;vertical-align:top;width:30%;">${field.label}</td>
          <td style="padding:12px 14px;border:1px solid #ddd;vertical-align:top;font-size:13px;">${disp}</td>
        </tr>`;
      }).filter(Boolean).join("");

      const container = document.createElement("div");
      container.style.cssText = `padding:24px;background:#fff;max-width:720px;margin:0 auto;font-family:Arial,sans-serif;`;
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="font-size:22px;margin:8px 0;letter-spacing:1px;">MASS PROGRAM</h1>
          <div style="font-size:16px;font-weight:bold;margin-top:6px;">${formattedDate}</div>
          <div style="font-size:13px;margin-top:4px;font-style:italic;">${program.venue}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:10px;border:1px solid #ddd;background:#000;color:#fff;text-transform:uppercase;font-size:12px;letter-spacing:1px;">Time</th>
              <th style="padding:10px;border:1px solid #ddd;background:#000;color:#fff;text-transform:uppercase;font-size:12px;letter-spacing:1px;">Song</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:24px;text-align:center;font-size:10px;color:#999;letter-spacing:2px;">ZUCA PORTAL</div>`;
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff", logging: false });
      document.body.removeChild(container);
      const link = document.createElement("a");
      link.download = `Mass_Program_${program.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Image downloaded");
    } catch (e) { console.error(e); showToast("Failed to generate image"); }
    finally { setGeneratingImage(false); }
  };

  const downloadAsWord = (program) => {
    const formattedDate = formatLongDate(program.date);
    const rows = songFields.map((field) => {
      const arr = getSongsArray(program, field.key);
      if (arr.length === 0) return "";
      const disp = arr.length === 1 ? arr[0] : arr.map((s, i) => `${i + 1}. ${s}`).join("<br>");
      return `<tr>
        <td style="padding:12px 14px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;text-transform:uppercase;font-size:12px;vertical-align:top;width:30%;">${field.label}</td>
        <td style="padding:12px 14px;border:1px solid #ddd;vertical-align:top;font-size:13px;">${disp}</td>
      </tr>`;
    }).filter(Boolean).join("");
    const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mass Program</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}
      h1{text-align:center;letter-spacing:1px;font-size:24px;margin:8px 0;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}
      th{background:#000;color:#fff;padding:10px;border:1px solid #ddd;text-transform:uppercase;font-size:12px;letter-spacing:1px;}</style>
      </head><body>
      <div style="text-align:center;">
        <h1>MASS PROGRAM</h1>
        <div style="font-size:16px;font-weight:bold;">${formattedDate}</div>
        <div style="font-size:13px;font-style:italic;margin-top:4px;">${program.venue}</div>
      </div>
      <table><thead><tr><th>Time</th><th>Song</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="text-align:center;font-size:10px;color:#999;letter-spacing:2px;margin-top:24px;">ZUCA PORTAL</div>
      </body></html>`;
    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mass_Program_${program.date}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Word document downloaded");
  };

  const downloadAsHTML = (program) => {
    const formattedDate = formatLongDate(program.date);
    const rows = songFields.map((field) => {
      const arr = getSongsArray(program, field.key);
      if (arr.length === 0) return "";
      const disp = arr.length === 1 ? arr[0] : arr.map((s, i) => `${i + 1}. ${s}`).join("<br>");
      return `<tr>
        <td style="padding:12px 14px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;text-transform:uppercase;font-size:12px;vertical-align:top;width:30%;">${field.label}</td>
        <td style="padding:12px 14px;border:1px solid #ddd;vertical-align:top;font-size:13px;">${disp}</td>
      </tr>`;
    }).filter(Boolean).join("");
    const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mass Program</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}
      h1{text-align:center;letter-spacing:1px;font-size:24px;margin:8px 0;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}
      th{background:#000;color:#fff;padding:10px;border:1px solid #ddd;text-transform:uppercase;font-size:12px;letter-spacing:1px;}</style>
      </head><body>
      <div style="text-align:center;">
      
        <h1>MASS PROGRAM</h1>
        <div style="font-size:16px;font-weight:bold;">${formattedDate}</div>
        <div style="font-size:13px;font-style:italic;margin-top:4px;">${program.venue}</div>
      </div>
      <table><thead><tr><th>Time</th><th>Song</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="text-align:center;font-size:10px;color:#999;letter-spacing:2px;margin-top:24px;">ZUCA PORTAL</div>
      </body></html>`;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mass_Program_${program.date}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("HTML saved - use Ctrl+P to save as PDF");
  };

  const printProgram = (program) => {
    const formattedDate = formatLongDate(program.date);
    const rows = songFields.map((field) => {
      const arr = getSongsArray(program, field.key);
      if (arr.length === 0) return "";
      const disp = arr.length === 1 ? arr[0] : arr.map((s, i) => `${i + 1}. ${s}`).join("<br>");
      return `<tr>
        <td style="padding:12px 14px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;text-transform:uppercase;font-size:12px;vertical-align:top;width:30%;">${field.label}</td>
        <td style="padding:12px 14px;border:1px solid #ddd;vertical-align:top;font-size:13px;">${disp}</td>
      </tr>`;
    }).filter(Boolean).join("");
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Mass Program</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}
      h1{text-align:center;letter-spacing:1px;font-size:24px;margin:8px 0;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}
      th{background:#000;color:#fff;padding:10px;border:1px solid #ddd;text-transform:uppercase;font-size:12px;letter-spacing:1px;}</style>
      </head><body>
      <div style="text-align:center;">
        
        <h1>MASS PROGRAM</h1>
        <div style="font-size:16px;font-weight:bold;">${formattedDate}</div>
        <div style="font-size:13px;font-style:italic;margin-top:4px;">${program.venue}</div>
      </div>
      <table><thead><tr><th>Time</th><th>Song</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="text-align:center;font-size:10px;color:#999;letter-spacing:2px;margin-top:24px;">ZUCA PORTAL</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    showToast("Print dialog opened");
  };

  /* ---------- share ---------- */
  const generateShareLink = (program) => `${window.location.origin}/mass-programs?program=${program.id}`;

  const shareLink = (program, platform) => {
    const link = generateShareLink(program);
    const formattedDate = formatLongDate(program.date);
    const message = `Mass Program\n${formattedDate}\n${program.venue}\n\nView full program: ${link}`;
    if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    else if (platform === "telegram") window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Mass Program - ${formattedDate}`)}`, "_blank");
    else if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Mass Program ${formattedDate}`)}&url=${encodeURIComponent(link)}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
    else if (platform === "email") window.open(`mailto:?subject=Mass Program - ${formattedDate}&body=${encodeURIComponent(message)}`, "_blank");
    else { navigator.clipboard.writeText(link); showToast("Link copied"); }
  };

  const copyLink = (program) => {
    navigator.clipboard.writeText(generateShareLink(program));
    showToast("Link copied");
  };

  /* ---------- filters ---------- */
  const filteredPrograms = useMemo(() => {
    let filtered = [...programs];
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        songFields.some((f) => parseSongs(p[f.key]).some((song) => song?.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        p.venue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedVenue !== "all") filtered = filtered.filter((p) => p.venue === selectedVenue);
    filtered.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });
    return filtered;
  }, [programs, searchTerm, selectedVenue, sortOrder]);

  const venues = useMemo(
    () => ["all", ...new Set(programs.map((p) => p.venue).filter(Boolean))],
    [programs]
  );

  const coverStyle = cover
    ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: themeBg(theme) };

  /* =========================================================
     INDEX VIEW
  ========================================================= */
  if (view === "index") {
    const today = filteredPrograms.filter((p) => isToday(p.date));
    const upcoming = filteredPrograms.filter((p) => !isPast(p.date) && !isToday(p.date));
    const past = filteredPrograms.filter((p) => isPast(p.date) && !isToday(p.date));
    const userFirst = user?.fullName?.split(" ")[0] || "friend";

    return (
      <div className="mp">
        {/* HERO */}
        <div className="mp-hero">
          {cover
            ? <img className="mp-cover" src={cover} alt="" />
            : <div className="mp-cover" style={{ background: themeBg(theme) }} />}
          <div className="mp-shade" />
          <button className="mp-hero-back" onClick={() => navigate(-1)}>
            <FiArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div className="mp-hero-copy">
            <div className="mp-hero-eyebrow">ZETECH UNIVERSITY CATHOLIC ACTION</div>
            <h1>{getGreeting()}, {userFirst}</h1>
            <p>Browse every mass program and tap a song to open its lyrics</p>
          </div>
        </div>

        <div className="mp-shell">
          {/* TOOLBAR */}
          <div className="mp-toolbar">
            <div className="mp-search">
              <FiSearch size={15} />
              <input
                type="text"
                placeholder="Search hymns or venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="mp-search-x" aria-label="Clear">
                  <FiX size={13} />
                </button>
              )}
            </div>

            {venues.length > 2 && (
              <select
                className="mp-select"
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
              >
                {venues.map((v) => (
                  <option key={v} value={v}>
                    {v === "all" ? "All Venues" : v.length > 22 ? v.substring(0, 22) + "..." : v}
                  </option>
                ))}
              </select>
            )}

            <button
              className="mp-tool"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            >
              <FiClock size={15} />
              <span className="mp-tool-label">{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
            </button>
          </div>

          {/* CONTENT */}
          {loading && programs.length === 0 ? (
            <div className="mp-list">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="mp-empty">
              <div className="mp-empty-icon">
                <FiInbox size={28} />
              </div>
              <b>No programs found</b>
              <span>
                {searchTerm || selectedVenue !== "all"
                  ? "Try a different search or clear your filters"
                  : "Check back soon for the next mass schedule"}
              </span>
              {(searchTerm || selectedVenue !== "all") && (
                <button
                  className="mp-empty-action"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedVenue("all");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <ProgramGroup
                  title="Today"
                  icon={<FiSun size={12} />}
                  items={today}
                  onOpen={openProgram}
                  coverStyle={coverStyle}
                />
              )}
              {upcoming.length > 0 && (
                <ProgramGroup
                  title="Upcoming"
                  icon={<FiCalendar size={12} />}
                  items={upcoming}
                  onOpen={openProgram}
                  coverStyle={coverStyle}
                />
              )}
              {past.length > 0 && (
                <ProgramGroup
                  title="Past"
                  icon={<FiClock size={12} />}
                  items={past}
                  onOpen={openProgram}
                  coverStyle={coverStyle}
                  muted
                />
              )}
            </>
          )}

          <footer className="mp-index-foot">ZUCA Portal</footer>
        </div>
        <style>{mainCSS}</style>
      </div>
    );
  }

  /* =========================================================
     PROGRAM VIEW — THE TABLE
  ========================================================= */
  const p = activeProgram;
  if (!p) return null;

  const presentRows = songFields
    .map((f) => ({ ...f, songs: parseSongs(p[f.key]) }))
    .filter((f) => f.songs.length > 0);

  const totalHymns = presentRows.reduce((a, r) => a + r.songs.length, 0);

  return (
    <div className="mp">
      <div className="mp-topbar">
        <button className="mp-topbar-btn" onClick={closeProgram} aria-label="Back">
          <FiArrowLeft size={16} />
          <span>All programs</span>
        </button>

        <div className="mp-topbar-right">
          <button className="mp-topbar-icon" onClick={() => setShowMenu(true)} aria-label="More">
            <FiMoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Poster header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mp-program-head"
      >
        <h1 className="mp-program-title">Mass Program</h1>
        <div className="mp-program-date">{formatLongDate(p.date)}</div>
        <div className="mp-program-venue">{p.venue}</div>
        <div className="mp-program-meta">
          {p.time && p.time !== "To be announced" && (
            <span><FiClock size={12} /> {p.time}</span>
          )}
          <span><FiMusic size={12} /> {totalHymns} hymn{totalHymns !== 1 ? "s" : ""}</span>
        </div>
        <div className="mp-program-hint">
  Tap any song to open its lyrics
</div>

      </motion.header>

      {/* The table — clean rows, no heavy borders */}
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="mp-program"
      >
        <div className="mp-table-wrap">
          <div className="mp-table-head">
            <div className="mp-th mp-th-sched">Time</div>
            <div className="mp-th mp-th-song">Song</div>
          </div>

          <div className="mp-table-body">
            {presentRows.map((row, rIdx) => (
              <div key={row.key} className={`mp-table-row ${rIdx % 2 === 1 ? "alt" : ""}`}>
                <div className="mp-td mp-td-sched">
                  <span className="mp-sched-label">{row.label}</span>
                </div>
                <div className="mp-td mp-td-song">
                  {row.songs.map((song, idx) => {
                    const songKey = `${p.id}-${row.key}-${idx}`;
                    const isHL = highlightedSong === songKey;
                    const note = songNotes[songKey];
                    const isOpening = openingSong === song;
                    return (
                      <div
                        key={idx}
                        className={`mp-song-line ${isHL ? "hl" : ""}`}
                        onClick={(e) => !isOpening && navigateToHymn(song, e)}
                        title="Tap to open lyrics"
                      >
                        <div className="mp-song-main">
                          {row.songs.length > 1 && (
                            <span className="mp-song-num">{idx + 1}</span>
                          )}
                          {isOpening ? (
                            <span className="mp-song-loading">
                              <span className="mp-song-spinner" />
                              Opening...
                            </span>
                          ) : (
                            <span className="mp-song-name">{song}</span>
                          )}
                        </div>
                        <div className="mp-song-tools">
                          <button
                            className="mp-song-tool"
                            onClick={(e) => { e.stopPropagation(); previewSong(song); }}
                            title="Preview"
                          >
                            <BsPlayCircle size={13} />
                          </button>
                          <button
                            className="mp-song-tool"
                            onClick={(e) => {
                              e.stopPropagation();
                              addSongNote(p.id, row.key, idx, note);
                            }}
                            title="Add note"
                          >
                            <FaRegKeyboard size={11} />
                          </button>
                          <button
                            className="mp-song-tool"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(song);
                              highlightSong(p.id, `${row.key}-${idx}`);
                              showToast("Copied: " + song.substring(0, 30) + "...");
                            }}
                            title="Copy"
                          >
                            <FiCopy size={11} />
                          </button>
                        </div>
                        {note && (
                          <div className="mp-song-note">
                            <MdOutlineFormatQuote size={10} />
                            {note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="mp-program-foot">ZUCA PORTAL</footer>
      </motion.article>

      {/* Overflow menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mp-sheet-overlay"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mp-sheet-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mp-sheet-menu-head">
                <h3>Program options</h3>
                <button onClick={() => setShowMenu(false)} aria-label="Close">
                  <FiX size={16} />
                </button>
              </div>

              <button onClick={() => { setShowMenu(false); setShareModal(p); }}>
                <FiShare2 size={17} /> Share
              </button>
              <button onClick={() => { setShowMenu(false); shareLink(p, "whatsapp"); }}>
                <BsWhatsapp size={17} color="#25D366" /> WhatsApp
              </button>
              <button onClick={() => { setShowMenu(false); copyLink(p); }}>
                <FiCopy size={17} /> Copy link
              </button>
              <div className="mp-sheet-sep" />
              <button onClick={() => { setShowMenu(false); printProgram(p); }}>
                <FiPrinter size={17} /> Print
              </button>
              <button onClick={() => { setShowMenu(false); downloadAsHTML(p); }}>
                <FaFilePdf size={17} color="#dc2626" /> Save as PDF
              </button>
              <button onClick={() => { setShowMenu(false); downloadAsWord(p); }}>
                <FaFileWord size={17} color="#1d4ed8" /> Save as Word
              </button>
              <button
                onClick={() => { setShowMenu(false); downloadAsImage(p); }}
                disabled={generatingImage}
              >
                <BsFileImage size={17} /> Save as image
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview toast */}
      <AnimatePresence>
        {songPreview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mp-preview-toast"
          >
            <BsMusicNoteBeamed size={14} />
            <span>Previewing: {songPreview}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mp-overlay"
            onClick={() => setShareModal(null)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="mp-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mp-modal-head">
                <h3>Share mass program</h3>
                <button className="mp-topbar-icon" onClick={() => setShareModal(null)} aria-label="Close">
                  <FiX size={16} />
                </button>
              </div>

              <div className="mp-link-box">
                <input
                  type="text"
                  value={generateShareLink(shareModal)}
                  readOnly
                  onClick={() => copyLink(shareModal)}
                />
                <button onClick={() => copyLink(shareModal)}>
                  <FiCopy size={14} />
                </button>
              </div>

              <div className="mp-modal-options">
                <button onClick={() => shareLink(shareModal, "whatsapp")}>
                  <BsWhatsapp size={20} color="#25D366" /><span>WhatsApp</span>
                </button>
                <button onClick={() => shareLink(shareModal, "telegram")}>
                  <FaTelegramPlane size={20} color="#0088cc" /><span>Telegram</span>
                </button>
                <button onClick={() => shareLink(shareModal, "twitter")}>
                  <BsTwitter size={20} color="#1DA1F2" /><span>Twitter</span>
                </button>
                <button onClick={() => shareLink(shareModal, "facebook")}>
                  <FaFacebook size={20} color="#1877F2" /><span>Facebook</span>
                </button>
                <button onClick={() => shareLink(shareModal, "email")}>
                  <FiMail size={20} /><span>Email</span>
                </button>
                <button onClick={() => shareLink(shareModal, "copy")}>
                  <FiCopy size={20} /><span>Copy link</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{mainCSS}</style>
    </div>
  );
}

/* =========================================================
   ProgramGroup
========================================================= */
function ProgramGroup({ title, icon, items, onOpen, coverStyle, muted }) {
  return (
    <section className={`mp-group ${muted ? "muted" : ""}`}>
      <div className="mp-group-head">
        <span className="mp-group-icon">{icon}</span>
        <span className="mp-group-title">{title}</span>
        <span className="mp-group-count">{items.length}</span>
      </div>
      <div className="mp-group-list">
        {items.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            onOpen={onOpen}
            coverStyle={coverStyle}
          />
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   ProgramCard
========================================================= */
function ProgramCard({ program, onOpen, coverStyle }) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const [idx, setIdx] = useState(0);

  const slides = useMemo(() => {
    const out = [];
    songFields.forEach((f) => {
      const songs = parseSongs(program[f.key]);
      songs.forEach((song, i) => {
        out.push({
          label: f.label,
          song,
          key: `${f.key}-${i}`,
          fieldKey: f.key,
          index: i,
          total: songs.length,
        });
      });
    });
    return out;
  }, [program]);

  const totalHymns = slides.length;
  const todays = isToday(program.date);
  const tomorrow = isTomorrow(program.date);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      const el = trackRef.current;
      if (!el) return;
      const card = el.querySelector(".mp-song-card");
      const w = (card?.offsetWidth || 240) + 12;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const next = el.scrollLeft + w;
      if (next >= maxScroll - 4) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollTo({ left: next, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const card = el.querySelector(".mp-song-card");
    const w = (card?.offsetWidth || 240) + 12;
    setIdx(Math.round(el.scrollLeft / w));
  };

  const slide = (dir, e) => {
    e?.stopPropagation();
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".mp-song-card");
    const w = (card?.offsetWidth || 240) + 12;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <article className={`mp-card ${todays ? "today" : ""}`}>
      <header className="mp-card-head" onClick={() => onOpen(program)}>
        <div className="mp-row-date-box">
          <span className="mp-row-day">{new Date(program.date).getDate()}</span>
          <span className="mp-row-month">
            {new Date(program.date).toLocaleString("en-US", { month: "short" })}
          </span>
        </div>

        <div className="mp-row-main">
          <div className="mp-row-title-row">
            <div className="mp-row-venue">{program.venue}</div>
            {todays && <span className="mp-pill mp-pill-green">Today</span>}
            {tomorrow && <span className="mp-pill mp-pill-blue">Tomorrow</span>}
          </div>
          <div className="mp-row-meta">
            <span className="mp-row-date-label">
              {new Date(program.date).toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            {program.time && program.time !== "To be announced" && (
              <span className="mp-row-meta-item">
                <FiClock size={11} /> {program.time}
              </span>
            )}
            <span className="mp-row-meta-item">
              <FiMusic size={11} /> {totalHymns} hymn{totalHymns !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <FiChevronRight size={16} className="mp-row-chev" />
      </header>

      {slides.length > 0 && (
        <div
          className="mp-card-carousel"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onTouchStart={() => { pausedRef.current = true; }}
          onTouchEnd={() => {
            setTimeout(() => { pausedRef.current = false; }, 2500);
          }}
        >
          <div className="mp-song-track mp-song-track--inline" ref={trackRef} onScroll={onScroll}>
            {slides.map((s, i) => (
              <div
                key={i}
                className="mp-song-card mp-song-card--mini"
                style={coverStyle}
                onClick={(e) => { e.stopPropagation(); onOpen(program); }}
              >
                <div className="mp-song-card-shade" />
                <div className="mp-song-card-body">
                  <div className="mp-song-card-eyebrow">
                    {s.label}
                    {s.total > 1 && (
                      <span className="mp-song-card-index"> · {s.index + 1}/{s.total}</span>
                    )}
                  </div>
                  <h4 className="mp-song-card-title">{s.song}</h4>
                </div>
              </div>
            ))}
          </div>

          {slides.length > 1 && (
            <div className="mp-card-controls">
              <div className="mp-card-dots">
                {slides.slice(0, Math.min(slides.length, 8)).map((_, i) => (
                  <button
                    key={i}
                    className={i === idx ? "on" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      const el = trackRef.current;
                      if (!el) return;
                      const card = el.querySelector(".mp-song-card");
                      const w = (card?.offsetWidth || 240) + 12;
                      el.scrollTo({ left: i * w, behavior: "smooth" });
                    }}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
                {slides.length > 8 && <span className="mp-card-dots-more">+{slides.length - 8}</span>}
              </div>

              <div className="mp-card-arrows">
                <button onClick={(e) => slide(-1, e)} aria-label="Previous">
                  <FiChevronLeft size={13} />
                </button>
                <button onClick={(e) => slide(1, e)} aria-label="Next">
                  <FiChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* =========================================================
   STYLES
========================================================= */
const mainCSS = `
  .mp{
    --ink:#0f172a;--mut:#64748b;--faint:#94a3b8;
    --ln:#e5e7eb;--soft:#f8fafc;--bg:#f8fafc;--card:#ffffff;
    --red:#dc2626;--green:#16a34a;--blue:#3b82f6;

    min-height:100vh;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;
    box-sizing:border-box;-webkit-font-smoothing:antialiased;
    padding-bottom:40px;
  }
  .mp *{box-sizing:border-box}
  .mp button{font-family:inherit;cursor:pointer}
  .mp h1,.mp h2,.mp h3,.mp h4,.mp p{margin:0}

  /* ---------- SKELETON ---------- */
  .mp-list{display:flex;flex-direction:column;gap:14px}
  .mp-sk-card{
    background:#fff;border:1px solid var(--ln);border-radius:16px;
    overflow:hidden;
  }
  .mp-sk-head{display:flex;gap:14px;padding:16px}
  .mp-sk-datebox{
    width:52px;height:52px;border-radius:12px;flex-shrink:0;
    background:linear-gradient(90deg,#eef2f7 25%,#e2e8f0 50%,#eef2f7 75%);
    background-size:200% 100%;
    animation:mp-sk 1.4s infinite;
  }
  .mp-sk-info{flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center}
  .mp-sk-line{
    height:12px;border-radius:6px;
    background:linear-gradient(90deg,#eef2f7 25%,#e2e8f0 50%,#eef2f7 75%);
    background-size:200% 100%;
    animation:mp-sk 1.4s infinite;
  }
  .mp-sk-line-lg{height:16px;width:60%}
  .mp-sk-line-md{width:40%}
  .mp-sk-line-sm{width:28%}
  .mp-sk-carousel{display:flex;gap:12px;padding:0 16px 16px;overflow:hidden}
  .mp-sk-song{
    flex:0 0 76%;height:120px;border-radius:12px;
    background:linear-gradient(90deg,#eef2f7 25%,#e2e8f0 50%,#eef2f7 75%);
    background-size:200% 100%;
    animation:mp-sk 1.4s infinite;
  }
  @media (min-width:640px){.mp-sk-song{flex:0 0 230px}}
  @media (min-width:1024px){.mp-sk-song{flex:0 0 250px}}
  @keyframes mp-sk{to{background-position:-200% 0}}

  /* ---------- HERO ---------- */
  .mp-hero{position:relative;height:220px;overflow:hidden;background:var(--ink)}
  .mp-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .mp-shade{
    position:absolute;inset:0;
    background:
      linear-gradient(180deg, rgba(15,23,42,.65) 0%, rgba(15,23,42,.20) 32%, rgba(15,23,42,.75) 100%),
      linear-gradient(90deg, rgba(15,23,42,.55) 0%, rgba(15,23,42,.10) 55%, transparent 100%);
  }
  .mp-hero-back{
    position:absolute;top:16px;left:16px;z-index:3;
    display:inline-flex;align-items:center;gap:6px;
    padding:8px 12px;background:rgba(255,255,255,.16);
    border:1px solid rgba(255,255,255,.35);border-radius:10px;
    color:#fff;font-size:12.5px;font-weight:700;
    cursor:pointer;backdrop-filter:blur(8px);
    font-family:inherit;transition:background .15s ease;
  }
  .mp-hero-back:hover{background:rgba(255,255,255,.28)}
  .mp-hero-copy{
    position:absolute;left:20px;right:20px;bottom:20px;z-index:2;
    color:#fff;display:flex;flex-direction:column;gap:4px;
  }
  .mp-hero-eyebrow{
    font-size:10px;font-weight:800;letter-spacing:.14em;
    text-transform:uppercase;opacity:.85;
    text-shadow:0 1px 6px rgba(0,0,0,.6);
  }
  .mp-hero-copy h1{
    font-size:22px;font-weight:800;letter-spacing:-.02em;
    text-shadow:0 2px 14px rgba(0,0,0,.75), 0 1px 3px rgba(0,0,0,.6);
  }
  .mp-hero-copy p{
    font-size:12.5px;opacity:.92;
    text-shadow:0 1px 8px rgba(0,0,0,.7);
  }
  @media (min-width:768px){
    .mp-hero{height:260px;border-radius:0 0 24px 24px}
    .mp-hero-copy h1{font-size:28px}
    .mp-hero-copy p{font-size:13.5px}
    .mp-hero-back{top:20px;left:24px}
  }

  /* ---------- SHELL ---------- */
  .mp-shell{max-width:1080px;margin:0 auto;padding:0 16px;margin-top:24px}
  @media (min-width:768px){.mp-shell{padding:0 24px;margin-top:32px}}

  /* ---------- TOOLBAR ---------- */
  .mp-toolbar{
    display:flex;gap:10px;margin-bottom:24px;
    flex-wrap:wrap;align-items:center;
  }
  .mp-search{
    position:relative;flex:1 1 240px;
    display:flex;align-items:center;gap:10px;
    padding:0 14px;height:44px;
    background:var(--card);border:1px solid var(--ln);
    border-radius:10px;color:var(--faint);
    transition:border-color .15s ease,box-shadow .15s ease;
  }
  .mp-search:focus-within{border-color:var(--ink);box-shadow:0 0 0 3px rgba(15,23,42,.06)}
  .mp-search input{
    flex:1;border:0;outline:0;background:transparent;
    font-size:14px;color:var(--ink);font-family:inherit;min-width:0;
  }
  .mp-search input::placeholder{color:var(--faint)}
  .mp-search-x{
    border:0;background:var(--soft);border-radius:6px;
    width:22px;height:22px;display:grid;place-items:center;
    cursor:pointer;color:var(--mut);
  }
  .mp-search-x:hover{background:var(--ln)}
  .mp-select{
    height:44px;padding:0 14px;
    background:var(--card);border:1px solid var(--ln);
    border-radius:10px;font-size:13.5px;font-weight:600;
    color:var(--ink);cursor:pointer;font-family:inherit;
    outline:none;transition:border-color .15s ease;
  }
  .mp-select:focus{border-color:var(--ink)}
  .mp-tool{
    height:44px;padding:0 14px;
    display:inline-flex;align-items:center;gap:6px;
    background:var(--card);border:1px solid var(--ln);
    border-radius:10px;color:var(--mut);
    font-size:13px;font-weight:600;transition:all .15s ease;
  }
  .mp-tool:hover{background:var(--soft);color:var(--ink);border-color:#cbd5e1}
  @media (max-width:640px){
    .mp-tool-label{display:none}
  }

  /* ---------- GROUPS ---------- */
  .mp-group{margin-bottom:32px}
  .mp-group-head{
    display:flex;align-items:center;gap:8px;
    margin-bottom:12px;padding:0 2px;
  }
  .mp-group-icon{color:var(--faint);display:flex}
  .mp-group-title{
    font-size:11.5px;font-weight:800;letter-spacing:.14em;
    text-transform:uppercase;color:var(--mut);
  }
  .mp-group-count{
    margin-left:auto;font-size:11px;font-weight:700;
    color:var(--faint);padding:2px 8px;background:var(--card);
    border:1px solid var(--ln);border-radius:999px;
  }
  .mp-group-list{display:flex;flex-direction:column;gap:14px}

  /* ---------- CARD ---------- */
  .mp-card{
    background:var(--card);
    border:1px solid var(--ln);
    border-radius:16px;
    overflow:hidden;
    transition:all .18s ease;
    box-shadow:0 2px 8px -6px rgba(15,23,42,.15);
  }
  .mp-card:hover{
    border-color:#cbd5e1;
    box-shadow:0 12px 28px -18px rgba(15,23,42,.3);
  }
  .mp-card.today{
    border-color:var(--ink);
    box-shadow:0 0 0 3px rgba(15,23,42,.06), 0 4px 14px -8px rgba(15,23,42,.25);
  }
  .mp-group.muted .mp-card{opacity:.78}
  .mp-group.muted .mp-card:hover{opacity:1}

  .mp-card-head{
    display:flex;align-items:center;gap:14px;
    padding:16px;cursor:pointer;
    transition:background .12s ease;
  }
  .mp-card-head:hover{background:var(--soft)}

  .mp-row-date-box{
    flex-shrink:0;width:52px;height:52px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:var(--ink);color:#fff;border-radius:12px;
    line-height:1;gap:1px;
  }
  .mp-row-day{font-size:19px;font-weight:800;letter-spacing:-.02em}
  .mp-row-month{
    font-size:9.5px;font-weight:800;
    text-transform:uppercase;letter-spacing:.06em;
    color:#cbd5e1;
  }

  .mp-row-main{flex:1;min-width:0}
  .mp-row-title-row{
    display:flex;align-items:center;gap:8px;
    flex-wrap:wrap;margin-bottom:4px;
  }
  .mp-row-venue{
    font-size:15.5px;font-weight:700;color:var(--ink);
    letter-spacing:-.01em;line-height:1.25;
    word-break:break-word;
    overflow-wrap:anywhere;
  }
  .mp-row-meta{
    display:flex;align-items:center;gap:12px;
    font-size:12.5px;color:var(--mut);flex-wrap:wrap;
  }
  .mp-row-meta-item{display:inline-flex;align-items:center;gap:5px;font-weight:500}
  .mp-row-meta-item svg{color:var(--faint)}
  .mp-row-date-label{
    font-weight:700;color:var(--mut);
    text-transform:uppercase;letter-spacing:.04em;
    font-size:11px;
  }

  .mp-pill{
    font-size:10px;font-weight:800;
    letter-spacing:.04em;text-transform:uppercase;
    padding:3px 8px;border-radius:999px;
    border:1px solid transparent;
  }
  .mp-pill-green{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
  .mp-pill-blue{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}

  .mp-row-chev{color:var(--faint);flex-shrink:0}

  /* ---------- INLINE CAROUSEL ---------- */
  .mp-card-carousel{position:relative;padding:0 0 12px}
  .mp-song-track--inline{
    padding:0 16px;
    scroll-snap-type:x mandatory;
    scrollbar-width:none;
  }
  .mp-song-track--inline::-webkit-scrollbar{display:none}
  .mp-song-track{display:flex;gap:12px;overflow-x:auto}
  .mp-song-track::-webkit-scrollbar{display:none}

  .mp-song-card{
    position:relative;
    flex:0 0 82%;
    border-radius:16px;
    overflow:hidden;
    scroll-snap-align:start;
    cursor:pointer;
    box-shadow:0 8px 22px -12px rgba(15,23,42,.4);
    transition:transform .2s ease, box-shadow .2s ease;
    background:#0f172a;
  }
  .mp-song-card:hover{
    transform:translateY(-3px);
    box-shadow:0 16px 32px -14px rgba(15,23,42,.5);
  }

  .mp-song-card--mini{
    flex:0 0 76%;
    min-height:120px;
    border-radius:12px;
    box-shadow:0 6px 16px -10px rgba(15,23,42,.35);
  }
  @media (min-width:640px){
    .mp-song-card--mini{flex:0 0 230px}
  }
  @media (min-width:1024px){
    .mp-song-card--mini{flex:0 0 250px}
  }
  .mp-song-card--mini .mp-song-card-body{
    padding:16px 16px 14px;
    justify-content:flex-end;
  }
  .mp-song-card--mini .mp-song-card-eyebrow{
    font-size:9px;letter-spacing:.16em;margin-bottom:6px;
  }

  /* Dark gradient overlay — always readable over photos */
  .mp-song-card-shade{
    position:absolute;inset:0;z-index:1;
    background:
      linear-gradient(180deg,
        rgba(15,23,42,.55) 0%,
        rgba(15,23,42,.7) 45%,
        rgba(15,23,42,.96) 100%);
  }

  .mp-song-card-body{
    position:relative;z-index:2;
    display:flex;flex-direction:column;
    color:#fff;
    min-height:100%;
  }

  .mp-song-card-eyebrow{
    font-size:9.5px;font-weight:800;
    letter-spacing:.18em;text-transform:uppercase;
    color:rgba(255,255,255,.85);
    margin-bottom:6px;
    text-shadow:0 1px 3px rgba(0,0,0,.6);
  }
  .mp-song-card-index{
    color:rgba(255,255,255,.6);
    font-weight:700;
  }

  /* No truncation, no clamp — full title always visible */
  .mp-song-card-title{
    font-size:14px;font-weight:800;
    line-height:1.35;
    color:#fff;
    letter-spacing:-.005em;
    text-transform:uppercase;
    text-shadow:0 2px 8px rgba(0,0,0,.75);
    word-break:break-word;
    overflow-wrap:anywhere;
  }
  @media (min-width:640px){
    .mp-song-card-title{font-size:14.5px}
  }

  /* Carousel controls */
  .mp-card-controls{
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 16px 0;gap:12px;
  }
  .mp-card-dots{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .mp-card-dots button{
    width:6px;height:6px;padding:0;border:0;
    border-radius:50%;background:#cbd5e1;cursor:pointer;
    transition:all .15s ease;
  }
  .mp-card-dots button.on{width:20px;border-radius:6px;background:var(--ink)}
  .mp-card-dots-more{font-size:10px;font-weight:700;color:var(--faint);margin-left:2px}
  .mp-card-arrows{display:flex;gap:4px}
  .mp-card-arrows button{
    width:28px;height:28px;display:grid;place-items:center;
    background:var(--card);border:1px solid var(--ln);
    border-radius:8px;color:var(--mut);cursor:pointer;
    transition:all .15s ease;font-family:inherit;
  }
  .mp-card-arrows button:hover{
    background:var(--ink);color:#fff;border-color:var(--ink);
  }

  /* ---------- EMPTY / FOOT ---------- */
  .mp-empty{
    display:flex;flex-direction:column;align-items:center;gap:8px;
    padding:60px 24px;text-align:center;
    background:var(--card);border:1px dashed var(--ln);
    border-radius:14px;color:var(--faint);
  }
  .mp-empty-icon{
    width:56px;height:56px;border-radius:14px;
    background:var(--soft);display:grid;place-items:center;
    color:var(--faint);margin-bottom:4px;
  }
  .mp-empty b{color:var(--ink);font-size:15px;font-weight:700;letter-spacing:-.01em}
  .mp-empty span{font-size:13px;line-height:1.5;max-width:300px}
  .mp-empty-action{
    margin-top:12px;padding:10px 18px;
    background:var(--ink);color:#fff;border:0;border-radius:10px;
    font-size:13px;font-weight:700;
    transition:opacity .15s ease;font-family:inherit;
  }
  .mp-empty-action:hover{opacity:.9}

  .mp-index-foot{
    margin-top:40px;text-align:center;
    font-size:10.5px;letter-spacing:.14em;
    text-transform:uppercase;color:var(--faint);
    font-weight:700;
  }

  /* ---------- TOP BAR + PROGRAM HEADER ---------- */
  .mp-topbar{
    position:sticky;top:0;z-index:50;
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;
    background:rgba(248,250,252,.88);
    backdrop-filter:saturate(180%) blur(12px);
    -webkit-backdrop-filter:saturate(180%) blur(12px);
  }
  @media (min-width:768px){
    .mp-topbar{padding:14px 24px;max-width:1080px;margin:0 auto;}
  }
  .mp-topbar-btn{
    display:inline-flex;align-items:center;gap:8px;
    padding:8px 12px;background:transparent;border:0;border-radius:9px;
    color:var(--ink);font-size:13.5px;font-weight:600;
    transition:background .12s ease;font-family:inherit;
  }
  .mp-topbar-btn:hover{background:var(--soft)}
  .mp-topbar-right{display:flex;align-items:center;gap:2px}
  .mp-topbar-icon{
    width:40px;height:40px;display:grid;place-items:center;
    background:transparent;border:0;border-radius:10px;color:var(--ink);
    transition:background .12s ease;font-family:inherit;
  }
  .mp-topbar-icon:hover{background:var(--soft)}

  .mp-program-head{
    text-align:center;
    padding:16px 16px 28px;
    max-width:820px;margin:0 auto;
  }
  @media (min-width:640px){
    .mp-program-head{padding:24px 32px 36px}
  }
  .mp-program-org{
    font-size:10.5px;font-weight:800;
    letter-spacing:.22em;text-transform:uppercase;
    color:var(--mut);
    margin-bottom:16px;
    padding:8px 14px;
    border:1px solid var(--ln);
    display:inline-block;
    border-radius:8px;
    background:var(--card);
  }
  .mp-program-title{
    font-size:24px;font-weight:900;
    letter-spacing:-.02em;
    color:var(--ink);
    margin:0 0 14px;
    line-height:1.1;
  }
  @media (min-width:640px){.mp-program-title{font-size:32px}}
  .mp-program-date{
    font-size:15px;font-weight:700;color:var(--ink);
    letter-spacing:.01em;margin-bottom:6px;
  }
  .mp-program-venue{
    font-size:13px;font-weight:600;
    letter-spacing:.08em;text-transform:uppercase;
    color:var(--mut);
    word-break:break-word;overflow-wrap:anywhere;
  }
  .mp-program-meta{
    display:flex;align-items:center;justify-content:center;gap:16px;
    margin-top:14px;flex-wrap:wrap;
  }
  .mp-program-meta span{
    display:inline-flex;align-items:center;gap:6px;
    font-size:12px;font-weight:600;color:var(--mut);
  }
  .mp-program-meta svg{color:var(--faint)}

  /* ---------- TABLE (clean, no heavy borders) ---------- */
  .mp-program{
    max-width:820px;margin:0 auto;
    padding:0 16px 60px;
  }
  @media (min-width:640px){
    .mp-program{padding:0 32px 80px}
  }

  .mp-table-wrap{
    background:var(--card);
    border:1px solid #dbeafe;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 8px 26px -18px rgba(15,23,42,.32);
  }
  .mp-table-head{
    display:grid;
    grid-template-columns:minmax(104px, 30%) minmax(0, 1fr);
    background:linear-gradient(110deg,#102b59,#0b1b38);
    color:#fff;
  }
  .mp-th{
    padding:14px 16px;
    font-size:11px;
    font-weight:800;
    letter-spacing:.12em;
    text-transform:uppercase;
    color:rgba(255,255,255,.96);
  }
  .mp-th-sched{ border-right:1px solid rgba(255,255,255,.14) }

  .mp-table-body{ display:block }

  .mp-table-row{
    display:grid;
    grid-template-columns:minmax(104px, 30%) minmax(0, 1fr);
    border-bottom:1px solid #e6eef9;
    transition:background .15s ease;
  }
  .mp-table-row:last-child{border-bottom:0}
  .mp-table-row.alt{background:#f1f7ff}
  .mp-table-row:hover{background:#eaf3ff}

  .mp-td{
    padding:16px;
    vertical-align:top;
    min-width:0;
  }
  .mp-td-sched{
    border-right:1px solid #dbeafe;
    display:flex;align-items:flex-start;
  }
  .mp-sched-label{
    font-size:11px;
    font-weight:850;
    letter-spacing:.07em;
    text-transform:uppercase;
    color:var(--ink);
    line-height:1.45;
    overflow-wrap:anywhere;
  }
  .mp-td-song{
    font-weight:500;
    line-height:1.55;
    min-width:0;
  }

  .mp-song-line{
    display:flex;align-items:flex-start;justify-content:space-between;
    flex-wrap:wrap;
    gap:7px 8px;
    padding:9px 8px;
    border-radius:9px;
    cursor:pointer;
    transition:background .12s ease;
    position:relative;
  }
  .mp-song-line + .mp-song-line{margin-top:2px}
  .mp-song-line:hover{background:#eef4fb}
  .mp-song-line.hl{background:#ecfdf5}
  .mp-song-main{
    display:flex;align-items:flex-start;gap:9px;flex:1 1 150px;min-width:0;
  }
  .mp-song-num{
    display:inline-grid;place-items:center;
    width:20px;height:20px;border-radius:6px;
    background:var(--soft);
    color:var(--mut);
    font-size:10.5px;font-weight:800;
    flex-shrink:0;margin-top:1px;
  }
  .mp-song-name{
    text-transform:uppercase;
    font-size:13px;
    font-weight:750;
    letter-spacing:.015em;
    color:var(--ink);
    transition:color .12s ease;
    line-height:1.5;
    word-break:normal;
    overflow-wrap:anywhere;
    min-width:0;
  }
  .mp-song-line:hover .mp-song-name{color:#0369a1}
  @media (min-width:640px){
    .mp-song-name{font-size:14px}
  }
  .mp-song-tools{
    display:flex;gap:5px;flex:0 0 auto;align-items:center;
    opacity:1;transition:opacity .15s ease;
    margin-left:auto;
  }
  .mp-song-line:hover .mp-song-tools{opacity:1}
  @media (max-width:768px){.mp-song-tools{opacity:1}}
  .mp-song-tool{
    width:30px;height:30px;display:grid;place-items:center;
    background:#f8fbff;border:1px solid #d6e7ff;border-radius:50%;
    color:#2459a6;cursor:pointer;
    transition:background .12s ease,color .12s ease,transform .12s ease;
    font-family:inherit;flex-shrink:0;
  }
  .mp-song-tool:hover{background:#dbeafe;color:#123b79;transform:translateY(-1px)}
  .mp-song-tool:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
  .mp-song-loading{
    display:inline-flex;align-items:center;gap:8px;
    font-size:12.5px;color:var(--mut);font-weight:600;
  }
  .mp-song-spinner{
    width:12px;height:12px;
    border:2px solid var(--ln);
    border-top-color:var(--ink);
    border-radius:50%;
    animation:mp-spin .8s linear infinite;
  }
  @keyframes mp-spin{to{transform:rotate(360deg)}}
  .mp-song-note{
    font-size:11.5px;color:#6d28d9;font-weight:600;
    margin:6px 0 2px 36px;
    padding:4px 10px;
    background:#f5f3ff;border-radius:6px;
    display:inline-flex;align-items:center;gap:5px;
  }

  .mp-program-foot{
    margin-top:28px;text-align:center;
    font-size:10.5px;font-weight:700;
    letter-spacing:.22em;text-transform:uppercase;
    color:var(--faint);
  }

  /* ---------- BOTTOM SHEET ---------- */
  .mp-sheet-overlay{
    position:fixed;inset:0;background:rgba(15,23,42,.55);
    backdrop-filter:blur(4px);
    z-index:1000;display:flex;align-items:flex-end;justify-content:center;
  }
  @media (min-width:640px){.mp-sheet-overlay{align-items:center}}
  .mp-sheet-menu{
    width:100%;max-width:460px;background:#fff;
    border-radius:20px 20px 0 0;
    padding:14px 10px calc(20px + env(safe-area-inset-bottom, 0px));
    box-shadow:0 -8px 32px -8px rgba(15,23,42,.25);
  }
  @media (min-width:640px){
    .mp-sheet-menu{border-radius:16px;margin:20px;padding:16px 10px}
  }
  .mp-sheet-menu-head{
    display:flex;align-items:center;justify-content:space-between;
    padding:6px 12px 10px;
  }
  .mp-sheet-menu-head h3{font-size:14.5px;font-weight:800;color:var(--ink)}
  .mp-sheet-menu-head button{
    width:32px;height:32px;display:grid;place-items:center;
    background:var(--soft);border:0;border-radius:9px;color:var(--ink);
    font-family:inherit;
  }
  .mp-sheet-menu > button{
    width:100%;display:flex;align-items:center;gap:14px;
    padding:13px 14px;background:transparent;border:0;
    border-radius:10px;
    font-size:14px;font-weight:600;color:var(--ink);
    text-align:left;transition:background .12s ease;font-family:inherit;
  }
  .mp-sheet-menu > button:hover{background:var(--soft)}
  .mp-sheet-menu > button:disabled{opacity:.5;cursor:not-allowed}
  .mp-sheet-sep{height:1px;background:var(--ln);margin:6px 10px}

  /* ---------- TOASTS + MODAL ---------- */
  .mp-toast{
    position:fixed;left:50%;bottom:24px;transform:translateX(-50%);
    padding:11px 20px;border-radius:10px;font-size:13px;font-weight:600;
    color:#fff;background:var(--ink);z-index:10000;
    box-shadow:0 12px 32px -10px rgba(15,23,42,.4);white-space:nowrap;
    animation:mp-toast-in .25s ease;
    max-width:90%;overflow:hidden;text-overflow:ellipsis;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  }
  @keyframes mp-toast-in{
    from{opacity:0;transform:translateX(-50%) translateY(8px)}
    to{opacity:1;transform:translateX(-50%) translateY(0)}
  }
  .mp-preview-toast{
    position:fixed;left:50%;bottom:24px;transform:translateX(-50%);
    padding:11px 20px;border-radius:10px;font-size:13px;font-weight:600;
    color:#fff;background:var(--ink);z-index:9998;
    box-shadow:0 12px 32px -10px rgba(15,23,42,.4);
    display:inline-flex;align-items:center;gap:9px;max-width:90%;
  }
  .mp-preview-toast span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}


  .mp-program-hint{
  display:inline-flex;
  align-items:center;
  gap:6px;
  margin-top:14px;
  padding:6px 12px;
  background:#f1f5f9;
  color:var(--mut);
  font-size:11.5px;
  font-weight:600;
  letter-spacing:.02em;
  border-radius:999px;
}
  .mp-overlay{
    position:fixed;inset:0;background:rgba(15,23,42,.55);
    backdrop-filter:blur(4px);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:16px;
  }
  .mp-modal{
    background:#fff;border-radius:16px;width:100%;max-width:440px;
    max-height:90vh;display:flex;flex-direction:column;overflow:hidden;
    box-shadow:0 40px 80px -30px rgba(15,23,42,.4);padding:20px;
  }
  .mp-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}
  .mp-modal-head h3{font-size:15px;font-weight:800;color:var(--ink);letter-spacing:-.01em}

  .mp-link-box{display:flex;gap:8px;margin-bottom:18px}
  .mp-link-box input{
    flex:1;padding:11px 14px;border:1px solid var(--ln);border-radius:10px;
    background:var(--soft);font-size:12.5px;color:var(--ink);
    outline:none;cursor:pointer;
    font-family:'SF Mono',Menlo,Consolas,monospace;
    overflow:hidden;text-overflow:ellipsis;
  }
  .mp-link-box button{
    padding:11px 14px;border:1px solid var(--ln);border-radius:10px;
    background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--ink);transition:background .12s ease;font-family:inherit;
  }
  .mp-link-box button:hover{background:var(--soft)}

  .mp-modal-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .mp-modal-options button{
    display:flex;flex-direction:column;align-items:center;gap:8px;
    padding:16px 8px;background:var(--soft);
    border:1px solid transparent;border-radius:12px;
    cursor:pointer;font-size:11.5px;font-weight:700;color:var(--ink);
    transition:all .15s ease;font-family:inherit;
  }
  .mp-modal-options button:hover{background:#eef2f7;border-color:var(--ln)}

  /* ---------- MOBILE ---------- */
  @media (max-width:640px){
    .mp-hero{height:200px}
    .mp-hero-copy h1{font-size:19px}
    .mp-hero-copy p{font-size:12px}
    .mp-row-date-box{width:46px;height:46px}
    .mp-row-day{font-size:17px}
    .mp-row-venue{font-size:14.5px}
    .mp-row-meta{font-size:11.5px;gap:10px}
    .mp-program-head{padding:12px 16px 24px}
    .mp-program-title{font-size:22px}
    .mp-program-date{font-size:14px}
    .mp-song-card--mini{flex:0 0 74%;min-height:120px}
    .mp-card-head{padding:14px}
    .mp-table-head{grid-template-columns:minmax(88px, 31%) minmax(0, 1fr)}
    .mp-table-row{grid-template-columns:minmax(88px, 31%) minmax(0, 1fr)}
    .mp-th{padding:12px 10px;font-size:9.5px;letter-spacing:.1em}
    .mp-td{padding:10px 9px}
    .mp-sched-label{font-size:9.5px;letter-spacing:.045em}
    .mp-td-song{line-height:1.45}
    .mp-song-line{padding:8px 5px;gap:7px 5px}
    .mp-song-main{flex-basis:100%;gap:7px}
    .mp-song-name{font-size:12px;line-height:1.45}
    .mp-song-tools{margin-left:0;gap:5px;padding-left:0}
    .mp-song-tool{width:28px;height:28px}
    .mp-song-num{width:18px;height:18px;font-size:10px}
  }

    /* ============================================================
     DESKTOP CARD PROPORTIONS
     Keeps a single program card from looking stretched on wide
     screens, and makes the mini song carousel feel intentional.
     ============================================================ */
  @media (min-width: 900px){
    /* 1. Constrain the group so a lone card isn't a wide slab */
    .mp-group-list{
      max-width: 640px;
      margin: 0 auto;
    }

    /* 2. Slimmer, wider mini cards so the row fills properly */
    .mp-song-card--mini{
      flex: 0 0 190px;
      min-height: 108px;
      border-radius: 14px;
    }
    .mp-song-card--mini .mp-song-card-body{
      padding: 14px 14px 12px;
    }
    .mp-song-card--mini .mp-song-card-eyebrow{
      font-size: 8.5px;
      letter-spacing: .16em;
      margin-bottom: 5px;
    }
    .mp-song-card--mini .mp-song-card-title{
      font-size: 13px;
      line-height: 1.35;
    }

    /* 3. Softer inner padding so card feels deliberate, not empty */
    .mp-card-head{
      padding: 18px 20px;
      gap: 16px;
    }
    .mp-row-date-box{
      width: 56px;
      height: 56px;
    }
    .mp-row-venue{
      font-size: 16.5px;
    }

    /* 4. Align the carousel with the new card padding */
    .mp-song-track--inline{
      padding: 0 20px;
      gap: 10px;
    }
    .mp-card-carousel{
      padding-bottom: 10px;
    }
    .mp-card-controls{
      padding: 10px 20px 0;
    }

    /* 5. Tighter dots/arrows so the footer isn't visually heavy */
    .mp-card-arrows button{
      width: 30px;
      height: 30px;
    }
    .mp-card-dots button{
      width: 7px;
      height: 7px;
    }
    .mp-card-dots button.on{
      width: 22px;
    }
  }

  /* ------------------------------------------------------------
     Very wide screens: give the card a touch more room but keep
     it centred, so it still reads like a document, not a strip.
     ------------------------------------------------------------ */
  @media (min-width: 1400px){
    .mp-group-list{
      max-width: 720px;
    }
    .mp-song-card--mini{
      flex: 0 0 205px;
    }
  }
`;