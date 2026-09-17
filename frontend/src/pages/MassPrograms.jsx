// frontend/src/pages/MassPrograms.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import logo from "../assets/zuca-logo.png";
import { FaChurch, FaRegKeyboard, FaFileWord, FaFilePdf, FaFacebook, FaTelegramPlane, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import {
  FiShare2, FiCalendar, FiMapPin, FiSearch, FiChevronDown, FiChevronUp,
  FiCopy, FiDownload, FiClock, FiHeart, FiPrinter, FiMail, FiEye,
} from "react-icons/fi";
import {
  BsMusicNoteBeamed, BsWhatsapp, BsTwitter, BsMusicNoteList,
  BsPlayCircle, BsFileImage,
} from "react-icons/bs";
import { MdOutlineFormatQuote } from "react-icons/md";
import BASE_URL from "../api";

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

const songFields = [
  { key: "entrance",    label: "Entrance",    icon: "", category: "opening",      mobileOrder: 1,  description: "Entrance procession song" },
  { key: "mass",        label: "Mass",        icon: "", category: "liturgy",      mobileOrder: 2,  description: "lord have mercy and gloriuos" },
  { key: "bible",       label: "Reading",     icon: "", category: "word",         mobileOrder: 3,  description: "Bible procession song" },
  { key: "offertory",   label: "Offertory",   icon: "", category: "offering",     mobileOrder: 4,  description: "Preparation of gifts" },
  { key: "procession",  label: "Procession",  icon: "", category: "procession",   mobileOrder: 5,  description: "Offering procession song" },
  { key: "mtakatifu",   label: "Mtakatifu",   icon: "", category: "special",      mobileOrder: 6,  description: "Kylie" },
  { key: "signOfPeace", label: "Peace",       icon: "", category: "peace",        mobileOrder: 7,  description: "Sign of Peace" },
  { key: "communion",   label: "Communion",   icon: "", category: "communion",    mobileOrder: 8,  description: "Communion song" },
  { key: "thanksgiving",label: "Thanksgiving",icon: "", category: "thanksgiving", mobileOrder: 9,  description: "Post-Communion" },
  { key: "exit",        label: "Exit",        icon: "", category: "closing",      mobileOrder: 10, description: "Recessional song" },
];

const mobileCompactFields = songFields.slice(0, 6);

export default function MassPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openingSong, setOpeningSong] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [highlightedSong, setHighlightedSong] = useState(null);
  const [songNotes, setSongNotes] = useState({});
  const [viewMode, setViewMode] = useState("compact");
  const [songPreview, setSongPreview] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [stats, setStats] = useState({ total: 0, venues: 0, upcoming: 0, totalHymns: 0 });
  const [shareModal, setShareModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDownloadMenu, setShowDownloadMenu] = useState(null);
  const downloadMenuRef = useRef(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- NAVIGATE TO HYMN ---------------- */
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
      if (songs && songs.length > 0) {
        navigate(`/hymn/${songs[0].title}`);
      } else {
        showToast(`"${hymnTitle}" not found in hymn book`);
        setOpeningSong(null);
      }
    } catch (err) {
      console.error("Error finding hymn:", err);
      showToast(`Could not find "${hymnTitle}"`);
      setOpeningSong(null);
    }
  };

  /* ---------------- FETCH ---------------- */
  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/mass-programs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const programsData = Array.isArray(res.data) ? res.data : [];
      setPrograms(programsData);

      const now = new Date();
      const upcoming = programsData.filter((p) => new Date(p.date) >= now).length;
      const venues = [...new Set(programsData.map((p) => p.venue).filter(Boolean))].length;
      setCollapsedIds(programsData.map((p) => p.id));

      let hymnCount = 0;
      programsData.forEach((p) => {
        songFields.forEach((f) => {
          hymnCount += parseSongs(p[f.key]).length;
        });
      });

      setStats({
        total: programsData.length,
        venues,
        upcoming,
        totalHymns: hymnCount,
      });
    } catch (err) {
      console.error(err);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPrograms();
    const savedFavorites = localStorage.getItem("massProgramFavorites");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    const savedNotes = localStorage.getItem("songNotes");
    if (savedNotes) setSongNotes(JSON.parse(savedNotes));
  }, [fetchPrograms]);

  useEffect(() => {
    localStorage.setItem("massProgramFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("songNotes", JSON.stringify(songNotes));
  }, [songNotes]);

  /* ---------------- HELPERS ---------------- */
  const getSongFrequency = (key) => {
    let count = 0;
    programs.forEach((p) => {
      count += parseSongs(p[key]).length;
    });
    return count;
  };

  const getUniqueSongs = (key) => {
    const songs = new Set();
    programs.forEach((p) => {
      parseSongs(p[key]).forEach((s) => songs.add(s));
    });
    return Array.from(songs);
  };

  const addSongNote = (programId, songKey, songIndex, currentNote) => {
    const noteKey =
      songIndex !== undefined
        ? `${programId}-${songKey}-${songIndex}`
        : `${programId}-${songKey}`;
    const note = prompt("Add a note for this hymn:", currentNote || "");
    if (note !== null) {
      if (note.trim() !== "") {
        setSongNotes((prev) => ({ ...prev, [noteKey]: note }));
        showToast("Note added");
      } else {
        const newNotes = { ...songNotes };
        delete newNotes[noteKey];
        setSongNotes(newNotes);
        showToast("Note removed");
      }
    }
  };

  const highlightSong = (programId, songKey) => {
    setHighlightedSong(`${programId}-${songKey}`);
    setTimeout(() => setHighlightedSong(null), 2000);
  };

  const previewSong = (songTitle) => {
    setSongPreview(songTitle);
    setTimeout(() => setSongPreview(null), 3000);
  };

  const getSongsArray = (program, fieldKey) => parseSongs(program[fieldKey]);

  /* ---------------- DOWNLOADS ---------------- */
  const generateShareImage = async (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      max-width: 600px;
      font-family: 'Arial', sans-serif;
      color: white;
    `;
    const songsHtml = songFields.map((field) => {
      const songsArray = parseSongs(program[field.key]);
      if (songsArray.length === 0) return "";
      return `
        <div style="margin-bottom: 12px; background: rgba(255,255,255,0.15); padding: 10px; border-radius: 12px;">
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">${field.label}</div>
          <div style="font-size: 12px;">
            ${songsArray.map((song, idx) => idx === 0 ? song : `<div style="margin-top: 4px;">${idx + 1}. ${song}</div>`).join("")}
          </div>
        </div>`;
    }).join("");
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 28px;">⛪</div>
        <h1 style="font-size: 24px; margin: 8px 0;">MASS PROGRAM</h1>
        <div style="font-size: 14px;">${formattedDate}</div>
        <div style="font-size: 16px; font-weight: bold; margin-top: 8px;">${program.venue}</div>
      </div>
      ${songsHtml}
      <div style="text-align: center; margin-top: 20px; font-size: 10px; opacity: 0.7;">
        ZUCA SYSTEM GENERATED | ZUCA Portal
      </div>`;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: null });
    document.body.removeChild(container);
    return canvas.toDataURL("image/png");
  };

  const downloadAsImage = async (program) => {
    setGeneratingImage(true);
    showToast("Generating image...");
    try {
      const formattedDate = new Date(program.date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const songsHtml = songFields.map((field) => {
        const songsArray = getSongsArray(program, field.key);
        if (songsArray.length === 0) return "";
        let songsDisplay = "";
        if (songsArray.length === 1) {
          songsDisplay = `<div style="font-size: 13px; line-height: 1.4;">${songsArray[0]}</div>`;
        } else {
          songsDisplay = songsArray.map((song, idx) =>
            `<div style="font-size: 13px; line-height: 1.4; margin-top: ${idx === 0 ? "0" : "6px"};">${idx + 1}. ${song}</div>`
          ).join("");
        }
        return `
          <div style="padding: 10px; background: #fafafa; border-radius: 8px; border-left: 3px solid #0f0f0f; margin-bottom: 8px; break-inside: avoid;">
            <div style="font-weight: bold; color: #0f0f0f; margin-bottom: 6px; font-size: 13px;">${field.label}</div>
            ${songsDisplay}
          </div>`;
      }).filter((h) => h).join("");

      const container = document.createElement("div");
      container.style.cssText = `padding: 20px; background: white; border-radius: 12px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;`;
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0f0f0f; border-bottom: 3px solid #0f0f0f; padding-bottom: 10px; font-size: 24px; margin: 0;">MASS PROGRAM</h1>
          <div style="color: #737373; margin-top: 12px; font-size: 14px;">${formattedDate}</div>
          <div style="font-size: 16px; font-weight: bold; color: #0f0f0f; margin-top: 5px;">${program.venue}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">${songsHtml}</div>
        <div style="margin-top: 25px; text-align: center; color: #737373; border-top: 1px solid #e5e5e5; padding-top: 12px; font-size: 10px;">ZUCA SYSTEM GENERATED | ZUCA PORTAL</div>`;
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff", logging: false });
      document.body.removeChild(container);
      const link = document.createElement("a");
      link.download = `Mass_Program_${program.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Image downloaded successfully");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const downloadAsWord = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const songsRows = songFields.map((field) => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length === 0) return "";
      let songsDisplay = songsArray.length === 1
        ? songsArray[0]
        : songsArray.map((song, idx) => `${idx + 1}. ${song}`).join("<br>");
      return `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; font-weight: 600; color: #0f0f0f; width: 30%; background: #fafafa;">${field.label}</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; line-height: 1.4;">${songsDisplay}</td></tr>`;
    }).filter((h) => h).join("");
    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Calibri', 'Arial', sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #0f0f0f; text-align: center; border-bottom: 3px solid #0f0f0f; padding-bottom: 15px; margin-bottom: 20px; font-size: 28px; }
        .header { text-align: center; margin-bottom: 30px; }
        .date { color: #737373; font-size: 16px; margin: 10px 0; }
        .venue { font-size: 20px; font-weight: bold; color: #0f0f0f; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        .footer { margin-top: 40px; text-align: center; color: #737373; font-size: 11px; border-top: 1px solid #e5e5e5; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formattedDate}</div>
          <div class="venue">${program.venue}</div>
        </div>
        <table><tbody>${songsRows}</tbody></table>
        <div class="footer">ZUCA SYSTEM GENERATED | ZUCA PORTAL</div>
      </div>
    </body>
    </html>`;
    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mass_Program_${program.date}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Word document downloaded");
  };

  const downloadAsPDF = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const songsRows = songFields.map((field) => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length === 0) return "";
      let songsDisplay = songsArray.length === 1
        ? songsArray[0]
        : songsArray.map((song, idx) => `${idx + 1}. ${song}`).join("<br>");
      return `<div class="song-row"><div class="song-label">${field.label}</div><div class="song-value">${songsDisplay}</div></div>`;
    }).filter((h) => h).join("");
    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #0f0f0f; text-align: center; border-bottom: 2px solid #0f0f0f; padding-bottom: 12px; margin-bottom: 20px; font-size: 26px; }
        .header { text-align: center; margin-bottom: 35px; }
        .date { color: #262626; font-size: 14px; margin: 8px 0; }
        .venue { font-size: 18px; font-weight: bold; margin-top: 5px; }
        .song-row { display: flex; margin: 10px 0; padding: 8px; border-bottom: 1px solid #e5e5e5; break-inside: avoid; }
        .song-label { font-weight: bold; width: 200px; flex-shrink: 0; }
        .song-value { flex: 1; line-height: 1.4; }
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #e5e5e5; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formattedDate}</div>
          <div class="venue">${program.venue}</div>
        </div>
        ${songsRows}
        <div class="footer">ZUCA SYSTEM GENERATED | ZUCA PORTAL</div>
      </div>
    </body>
    </html>`;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mass_Program_${program.date}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("HTML saved - use Ctrl+P to save as PDF");
  };

  /* ---------------- SHARE ---------------- */
  const generateShareLink = (program) =>
    `${window.location.origin}/mass-programs?program=${program.id}`;

  const shareLink = (program, platform) => {
    const link = generateShareLink(program);
    const formattedDate = new Date(program.date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const message = `Mass Program\n${formattedDate}\n${program.venue}\n\nView full program: ${link}`;
    if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    else if (platform === "telegram") window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Mass Program - ${formattedDate}`)}`, "_blank");
    else if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Mass Program ${formattedDate}`)}&url=${encodeURIComponent(link)}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
    else if (platform === "email") window.open(`mailto:?subject=Mass Program - ${formattedDate}&body=${encodeURIComponent(message)}`, "_blank");
    else {
      navigator.clipboard.writeText(link);
      showToast("Link copied to clipboard");
    }
  };

  const copyLink = (program) => {
    const link = generateShareLink(program);
    navigator.clipboard.writeText(link);
    showToast("Link copied to clipboard");
  };

  const printProgram = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const songsRows = songFields.map((field) => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length === 0) return "";
      const songsDisplay = songsArray.length === 1
        ? songsArray[0]
        : songsArray.map((song, idx) => `${idx + 1}. ${song}`).join("<br>");
      return `<tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5; vertical-align: top; font-weight: bold; width: 200px;">${field.label}</td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5; vertical-align: top;">${songsDisplay}</td></tr>`;
    }).filter((h) => h).join("");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<!DOCTYPE html>
      <html><head><title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; padding: 40px 20px; max-width: 900px; margin: 0 auto; }
        h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .date { color: #333; margin: 8px 0; }
        .venue { font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .footer { margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <div class="header"><h1>MASS PROGRAM</h1><div class="date">${formattedDate}</div><div class="venue">${program.venue}</div></div>
        <table>${songsRows}</table>
        <div class="footer">ZUCA SYSTEM GENERATED | ZUCA PORTAL</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    showToast("Print dialog opened");
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleExpand = (id) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleCollapse = (id) =>
    setCollapsedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleFavorite = (id) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...new Set([...favorites, id])];
    setFavorites(newFavorites);
    showToast(newFavorites.includes(id) ? "Added to favorites" : "Removed from favorites");
  };

  /* ---------------- FILTERS ---------------- */
  const filteredPrograms = useMemo(() => {
    let filtered = [...programs];
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        songFields.some((f) => {
          const songs = parseSongs(p[f.key]);
          return songs.some((song) => song?.toLowerCase().includes(searchTerm.toLowerCase()));
        }) || p.venue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedVenue !== "all") filtered = filtered.filter((p) => p.venue === selectedVenue);
    if (showFavoritesOnly) filtered = filtered.filter((p) => favorites.includes(p.id));
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    return filtered;
  }, [programs, searchTerm, selectedVenue, showFavoritesOnly, favorites, sortOrder]);

  const venues = useMemo(
    () => ["all", ...new Set(programs.map((p) => p.venue))],
    [programs]
  );

  const handleDownloadClick = (p, type) => {
    if (type === "word") downloadAsWord(p);
    else if (type === "pdf") downloadAsPDF(p);
    else if (type === "image") downloadAsImage(p);
    setShowDownloadMenu(null);
  };

  /* ---------------- LOADING (unchanged) ---------------- */
  if (loading) {
    return (
      <div style={loadingContainer}>
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={loadingSpinner}
        >
          {logo ? <img src={logo} alt="Loading..." style={{ width: 40, height: 60 }} /> : <FaChurch size={60} />}
        </motion.div>
        <p style={loadingText}>Preparing the liturgy...</p>
        <p style={loadingSubtext}>Loading hymns and programs</p>
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mp-page">
      <div className="mp-container">
        {/* HEADER */}
        <div className="mp-header">
          <div className="mp-header-top">
            <div className="mp-header-left">
              <div className="mp-logo-box">
                {logo ? <img src={logo} alt="Logo" className="mp-logo" /> : <FaChurch size={24} />}
              </div>
              <div>
                <h1 className="mp-title">Mass Programs</h1>
                <p className="mp-subtitle">{stats.totalHymns} hymns · {stats.venues} venues</p>
              </div>
            </div>
          </div>

          {/* Compact stats */}
          <div className="mp-stats">
            <button className="mp-stat" onClick={() => setShowFavoritesOnly(false)}>
              <div className="mp-stat-value">{stats.total}</div>
              <div className="mp-stat-label">Programs</div>
            </button>
            <button className="mp-stat">
              <div className="mp-stat-value">{stats.upcoming}</div>
              <div className="mp-stat-label">Upcoming</div>
            </button>
            <button className="mp-stat">
              <div className="mp-stat-value">{stats.venues}</div>
              <div className="mp-stat-label">Venues</div>
            </button>
            <button
              className={`mp-stat ${showFavoritesOnly ? "active" : ""}`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <div className="mp-stat-value">
                <FiHeart style={{ fill: showFavoritesOnly ? "currentColor" : "none" }} />
              </div>
              <div className="mp-stat-label">Favorites</div>
            </button>
          </div>

          {/* Search */}
          <div className="mp-search-wrap">
            <FiSearch className="mp-search-icon" size={14} />
            <input
              type="text"
              placeholder="Search hymns or venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mp-search-input"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="mp-search-clear">✕</button>
            )}
          </div>

          {/* Filters */}
          <div className="mp-filters">
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="mp-select"
            >
              {venues.map((v) => (
                <option key={v} value={v}>
                  {v === "all" ? "All Venues" : v.length > 20 ? v.substring(0, 20) + "..." : v}
                </option>
              ))}
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="mp-btn"
            >
              <FiClock size={12} />
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </button>

            <button
              onClick={() => setViewMode(viewMode === "compact" ? "detailed" : "compact")}
              className="mp-btn"
            >
              <FiEye size={12} />
              {viewMode === "compact" ? "Detailed" : "Compact"}
            </button>
          </div>

          {/* Results */}
          <div className="mp-results">
            <strong>{filteredPrograms.length}</strong> programs ·
            <strong>
              {filteredPrograms.reduce(
                (acc, p) => acc + songFields.reduce((sum, f) => sum + parseSongs(p[f.key]).length, 0),
                0
              )}
            </strong> hymns
          </div>
        </div>

        {/* PROGRAMS */}
        <div className="mp-list">
          <AnimatePresence>
            {filteredPrograms.map((p) => {
              const isExpanded = expandedIds.includes(p.id);
              const isCollapsed = collapsedIds.includes(p.id);
              const isFavorite = favorites.includes(p.id);
              const displayFields = isMobile && !isExpanded ? mobileCompactFields : songFields;
              const hasTime = p.time && p.time !== "To be announced";

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mp-card ${isFavorite ? "fav" : ""}`}
                >
                  {/* Card header */}
                  <div className="mp-card-header" onClick={() => toggleCollapse(p.id)}>
                    <div className="mp-card-header-left">
                      <div className="mp-date-badge">
                        <span className="mp-date-day">{new Date(p.date).getDate()}</span>
                        <span className="mp-date-month">
                          {new Date(p.date).toLocaleString("default", { month: "short" })}
                        </span>
                      </div>
                      <div className="mp-card-info">
                        <div className="mp-card-title-row">
                          <span className="mp-card-date">{formatDate(p.date)}</span>
                          {new Date(p.date).toDateString() === new Date().toDateString() && (
                            <span className="mp-today-chip">Today</span>
                          )}
                        </div>
                        <div className="mp-card-meta">
                          <FiMapPin size={11} />
                          <span>{p.venue.length > 25 ? p.venue.substring(0, 25) + "..." : p.venue}</span>
                        </div>
                        {hasTime && (
                          <div className="mp-card-meta">
                            <FiClock size={11} />
                            <span>{p.time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mp-card-header-right">
                      <button
                        className="mp-icon-btn"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                      >
                        <FiHeart
                          size={16}
                          style={{
                            color: isFavorite ? "#dc2626" : "#a3a3a3",
                            fill: isFavorite ? "#dc2626" : "none",
                          }}
                        />
                      </button>
                      <div className="mp-chevron">
                        {isCollapsed ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Songs grid */}
                  {!isCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mp-songs">
                      {displayFields.map((f) => {
                        const songsArray = parseSongs(p[f.key]);
                        if (songsArray.length === 0) return null;
                        const frequency = getSongFrequency(f.key);
                        const uniqueSongs = getUniqueSongs(f.key).length;

                        return songsArray.map((song, idx) => {
                          const songKey = `${p.id}-${f.key}-${idx}`;
                          const isHighlighted = highlightedSong === songKey;
                          const note = songNotes[songKey] || songNotes[`${p.id}-${f.key}`];
                          const displayLabel = idx === 0 ? f.label : `${f.label} ${idx + 1}`;
                          const isOpening = openingSong === song;

                          return (
                            <motion.div
                              key={`${f.key}-${idx}`}
                              className={`mp-song ${isHighlighted ? "highlighted" : ""}`}
                              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(15,15,15,0.08)" }}
                            >
                              {isOpening && (
                                <div className="mp-song-loading">
                                  <div className="mp-song-spinner" />
                                  <span>Opening lyrics...</span>
                                </div>
                              )}

                              <div className="mp-song-head">
                                <div className="mp-song-label">{displayLabel}</div>
                                {viewMode === "detailed" && idx === 0 && (
                                  <div className="mp-song-meta">
                                    <span title={`Used in ${frequency} programs`}>
                                      <FiEye size={9} /> {frequency}
                                    </span>
                                    <span title={`${uniqueSongs} unique songs`}>
                                      <BsMusicNoteList size={9} /> {uniqueSongs}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mp-song-value-wrap">
  <div
    className="mp-song-value"
    onClick={(e) => !isOpening && navigateToHymn(song, e)}
    title="Click to view lyrics in hymn book"
  >
    {song}
    <span className="mp-song-view-icon">   <FaEye/> </span>
  </div>
  <div className="mp-song-hint">Tap to open lyrics</div>
  {viewMode === "detailed" && idx === 0 && f.description && (
    <div className="mp-song-desc">{f.description}</div>
  )}
</div>

                              <div className="mp-song-actions">
                                <button
                                  className="mp-song-action"
                                  onClick={(e) => { e.stopPropagation(); previewSong(song); }}
                                  title="Preview song"
                                >
                                  <BsPlayCircle size={13} />
                                </button>
                                <button
                                  className="mp-song-action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addSongNote(p.id, f.key, idx, note);
                                  }}
                                  title="Add note"
                                >
                                  <FaRegKeyboard size={11} />
                                </button>
                                <button
                                  className="mp-song-action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(song);
                                    highlightSong(p.id, `${f.key}-${idx}`);
                                    showToast("Copied: " + song.substring(0, 30) + "...");
                                  }}
                                  title="Copy to clipboard"
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
                            </motion.div>
                          );
                        });
                      })}

                      {isMobile && !isExpanded && (
                        <button
                          className="mp-expand-btn"
                          onClick={() => toggleExpand(p.id)}
                        >
                          + {songFields.length - mobileCompactFields.length} more sections
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  {!isCollapsed && (
                    <div className="mp-actions">
                      <button className="mp-action" onClick={() => copyLink(p)}>
                        <FiCopy size={13} />
                        <span>Copy link</span>
                      </button>
                      <button
                        className="mp-action"
                        style={{ background: "#25D366", color: "#ffffff", borderColor: "#25D366" }}
                        onClick={() => shareLink(p, "whatsapp")}
                      >
                        <BsWhatsapp size={13} />
                        <span>WhatsApp</span>
                      </button>
                      <button className="mp-action" onClick={() => setShareModal(p)}>
                        <FiShare2 size={13} />
                        <span>Share</span>
                      </button>
                      <button className="mp-action" onClick={() => printProgram(p)}>
                        <FiPrinter size={13} />
                        <span>Print</span>
                      </button>

                      <div className="mp-download-wrap" ref={downloadMenuRef}>
                        <button
                          className="mp-action mp-action-wide"
                          onClick={() =>
                            setShowDownloadMenu(showDownloadMenu === p.id ? null : p.id)
                          }
                        >
                          <FiDownload size={13} />
                          <span>Save as...</span>
                          <FiChevronDown size={10} />
                        </button>
                        <AnimatePresence>
                          {showDownloadMenu === p.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="mp-download-menu"
                            >
                              <button onClick={() => handleDownloadClick(p, "word")}>
                                <FaFileWord size={13} /> Word (.doc)
                              </button>
                              <button onClick={() => handleDownloadClick(p, "pdf")}>
                                <FaFilePdf size={13} /> HTML / PDF
                              </button>
                              <button
                                onClick={() => handleDownloadClick(p, "image")}
                                disabled={generatingImage}
                              >
                                <BsFileImage size={13} /> Image (.png)
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Song preview toast */}
        <AnimatePresence>
          {songPreview && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
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
              className="mp-modal-overlay"
              onClick={() => setShareModal(null)}
            >
              <motion.div
                initial={{ scale: 0.94, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 12 }}
                className="mp-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mp-modal-head">
                  <h3>Share mass program</h3>
                  <button className="mp-modal-close" onClick={() => setShareModal(null)}>
                    ✕
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
                    <BsWhatsapp size={20} color="#25D366" />
                    <span>WhatsApp</span>
                  </button>
                  <button onClick={() => shareLink(shareModal, "telegram")}>
                    <FaTelegramPlane size={20} color="#0088cc" />
                    <span>Telegram</span>
                  </button>
                  <button onClick={() => shareLink(shareModal, "twitter")}>
                    <BsTwitter size={20} color="#1DA1F2" />
                    <span>Twitter</span>
                  </button>
                  <button onClick={() => shareLink(shareModal, "facebook")}>
                    <FaFacebook size={20} color="#1877F2" />
                    <span>Facebook</span>
                  </button>
                  <button onClick={() => shareLink(shareModal, "email")}>
                    <FiMail size={20} />
                    <span>Email</span>
                  </button>
                  <button onClick={() => shareLink(shareModal, "copy")}>
                    <FiCopy size={20} />
                    <span>Copy link</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{mainCSS}</style>
    </motion.div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .mp-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .mp-container { padding: 20px 16px 60px; max-width: 1200px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .mp-header { margin-bottom: 20px; }
  .mp-header-top { margin-bottom: 16px; }
  .mp-header-left { display: flex; align-items: center; gap: 12px; }
  .mp-logo-box {
    width: 46px; height: 46px; border-radius: 11px;
    background: #ffffff; border: 1px solid #e5e5e5;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .mp-logo { width: 32px; height: auto; }
  .mp-title { font-size: 22px; font-weight: 700; color: #0f0f0f; margin: 0; letter-spacing: -0.3px; }
  .mp-subtitle { font-size: 12.5px; color: #737373; margin: 2px 0 0 0; }

  /* ---------- STATS ---------- */
  .mp-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 8px; margin-bottom: 14px;
  }
  .mp-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 12px 6px;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit; color: inherit;
  }
  .mp-stat:hover { border-color: #d4d4d4; }
  .mp-stat.active { border-color: #dc2626; background: #fef2f2; }
  .mp-stat.active .mp-stat-value { color: #dc2626; }
  .mp-stat-value {
    font-size: 18px; font-weight: 800; color: #0f0f0f;
    line-height: 1.1; display: inline-flex; align-items: center;
    justify-content: center;
  }
  .mp-stat-label {
    font-size: 10px; color: #737373;
    text-transform: uppercase; letter-spacing: 0.05em;
    font-weight: 700;
  }

  /* ---------- SEARCH ---------- */
  .mp-search-wrap {
    position: relative; margin-bottom: 12px;
  }
  .mp-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%); color: #a3a3a3;
  }
  .mp-search-input {
    width: 100%; padding: 11px 40px 11px 40px;
    border: 1px solid #e5e5e5; border-radius: 999px;
    background: #ffffff; font-size: 13px;
    color: #171717; font-family: inherit;
    outline: none; transition: border-color 0.15s ease;
  }
  .mp-search-input:focus { border-color: #a3a3a3; }
  .mp-search-input::placeholder { color: #a3a3a3; }
  .mp-search-clear {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    background: #f5f5f5; border: none; cursor: pointer;
    color: #525252; width: 22px; height: 22px;
    border-radius: 50%; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease;
  }
  .mp-search-clear:hover { background: #e5e5e5; color: #171717; }

  /* ---------- FILTERS ---------- */
  .mp-filters {
    display: grid; grid-template-columns: 1fr auto auto;
    gap: 8px; margin-bottom: 12px;
  }
  .mp-select {
    padding: 9px 14px; border-radius: 999px;
    border: 1px solid #e5e5e5; background: #ffffff;
    font-size: 12.5px; color: #171717; font-family: inherit;
    outline: none; cursor: pointer;
    transition: border-color 0.15s ease;
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 32px;
  }
  .mp-select:hover { border-color: #d4d4d4; }
  .mp-select:focus { border-color: #0f0f0f; }

  .mp-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 14px; border-radius: 999px;
    border: 1px solid #e5e5e5; background: #ffffff;
    font-size: 12.5px; font-weight: 600; color: #262626;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit; white-space: nowrap;
  }
  .mp-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }

  /* ---------- RESULTS ---------- */
  .mp-results {
    font-size: 12.5px; color: #737373; margin-bottom: 4px;
  }
  .mp-results strong {
    color: #0f0f0f; font-weight: 700;
    margin: 0 3px;
  }

  /* ---------- CARD ---------- */
  .mp-list { display: flex; flex-direction: column; gap: 12px; }

  .mp-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 14px;
    transition: border-color 0.15s ease;
  }
  .mp-card:hover { border-color: #d4d4d4; }
  .mp-card.fav { border-left: 3px solid #dc2626; }

  .mp-card-header {
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; cursor: pointer;
    margin-bottom: 10px;
  }
  .mp-card-header-left {
    display: flex; gap: 12px; align-items: center;
    flex: 1; min-width: 0;
  }
  .mp-date-badge {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 46px; height: 46px; flex-shrink: 0;
    background: #0f0f0f; color: #ffffff;
    border-radius: 11px;
  }
  .mp-date-day { font-size: 17px; font-weight: 800; line-height: 1; }
  .mp-date-month {
    font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.04em; margin-top: 2px;
    opacity: 0.85;
  }
  .mp-card-info { flex: 1; min-width: 0; }
  .mp-card-title-row {
    display: flex; align-items: center; gap: 6px;
    flex-wrap: wrap; margin-bottom: 4px;
  }
  .mp-card-date {
    font-size: 14.5px; font-weight: 700; color: #0f0f0f;
  }
  .mp-today-chip {
    font-size: 9.5px; padding: 2px 8px;
    background: #f0fdf4; color: #15803d;
    border-radius: 999px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .mp-card-meta {
    display: flex; align-items: center; gap: 4px;
    color: #737373; font-size: 11.5px;
    margin-top: 2px;
  }
  .mp-card-meta svg { color: #a3a3a3; }

  .mp-card-header-right {
    display: flex; align-items: center; gap: 4px;
    flex-shrink: 0;
  }
  .mp-icon-btn {
    background: transparent; border: none; cursor: pointer;
    padding: 6px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease;
  }
  .mp-icon-btn:hover { background: #f5f5f5; }
  .mp-chevron {
    color: #a3a3a3; padding: 6px;
    display: flex; align-items: center;
  }

  /* ---------- SONGS ---------- */
  .mp-songs {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 8px; margin-bottom: 12px;
  }
  @media (max-width: 640px) {
    .mp-songs { grid-template-columns: 1fr; }
  }

  .mp-song {
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 10px; padding: 11px 12px;
    position: relative; transition: all 0.15s ease;
  }
  .mp-song.highlighted {
    background: #eff6ff; border-color: #bfdbfe;
  }

  .mp-song-loading {
    position: absolute; inset: 0;
    background: rgba(255,255,255,0.9);
    border-radius: 10px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 6px; z-index: 10;
    font-size: 11px; color: #0f0f0f; font-weight: 600;
  }
  .mp-song-spinner {
    width: 20px; height: 20px;
    border: 2px solid #e5e5e5;
    border-top-color: #0f0f0f;
    border-radius: 50%;
    animation: mp-spin 0.8s linear infinite;
  }
  @keyframes mp-spin { to { transform: rotate(360deg); } }

  .mp-song-head {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 6px; flex-wrap: wrap;
  }
  .mp-song-label {
    font-size: 10.5px; font-weight: 700;
    color: #737373; text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .mp-song-meta {
    display: flex; gap: 6px; margin-left: auto;
  }
  .mp-song-meta span {
    display: inline-flex; align-items: center; gap: 2px;
    font-size: 9.5px; color: #a3a3a3;
    font-weight: 600;
  }

  .mp-song-value-wrap { margin-bottom: 4px; }
  .mp-song-value {
    font-size: 12.5px; font-weight: 600; color: #0f0f0f;
    word-break: break-word; line-height: 1.4;
    display: flex; align-items: center;
    justify-content: space-between; gap: 8px;
    cursor: pointer; transition: color 0.15s ease;
  }
  .mp-song-value:hover { color: #4f46e5; }
  .mp-song-value:hover .mp-song-view-icon { opacity: 1; }
  .mp-song-view-icon {
    font-size: 10px; opacity: 0.35;
    transition: opacity 0.15s ease;
  }
  .mp-song-desc {
    font-size: 10.5px; color: #a3a3a3;
    margin-top: 3px; font-style: italic;
  }

  .mp-song-actions {
    display: flex; justify-content: flex-end;
    gap: 4px; margin-top: 6px;
  }
  .mp-song-action {
    background: transparent; border: none; cursor: pointer;
    color: #737373; padding: 3px; border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease;
  }
  .mp-song-action:hover { background: #f5f5f5; color: #0f0f0f; }

  .mp-song-note {
    font-size: 10.5px; color: #6d28d9;
    margin-top: 6px; padding: 4px 8px;
    background: #f5f3ff; border-radius: 6px;
    display: inline-flex; align-items: center; gap: 4px;
    font-weight: 500;
  }

  .mp-expand-btn {
    grid-column: 1 / -1;
    padding: 10px; background: #ffffff;
    border: 1px dashed #d4d4d4; border-radius: 10px;
    font-size: 11.5px; font-weight: 600;
    color: #525252; cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .mp-expand-btn:hover { background: #fafafa; border-color: #a3a3a3; color: #0f0f0f; }

  /* ---------- ACTIONS ---------- */
  .mp-actions {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 6px; margin-top: 10px;
    position: relative;
  }
  .mp-action {
    display: flex; flex-direction: column;
    align-items: center; gap: 4px;
    padding: 9px 4px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 9px;
    font-size: 10.5px; font-weight: 600;
    color: #525252; cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .mp-action:hover { background: #f5f5f5; border-color: #e5e5e5; color: #0f0f0f; }

  .mp-download-wrap { position: relative; grid-column: span 4; }
  .mp-action-wide {
    flex-direction: row; justify-content: center; gap: 6px;
    padding: 9px 12px;
  }
  .mp-download-menu {
    position: absolute; bottom: calc(100% + 6px); left: 0; right: 0;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 10px; padding: 5px;
    box-shadow: 0 8px 20px -6px rgba(15,15,15,0.15);
    z-index: 20;
    display: flex; flex-direction: column; gap: 2px;
  }
  .mp-download-menu button {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; background: transparent;
    border: none; border-radius: 7px;
    font-size: 12.5px; font-weight: 600;
    color: #262626; text-align: left;
    cursor: pointer; transition: background 0.12s ease;
    font-family: inherit;
  }
  .mp-download-menu button:hover { background: #f5f5f5; }
  .mp-download-menu button:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ---------- PREVIEW TOAST ---------- */
  .mp-preview-toast {
    position: fixed; bottom: 80px; left: 50%;
    transform: translateX(-50%);
    background: #0f0f0f; color: #ffffff;
    padding: 10px 18px; border-radius: 999px;
    font-size: 12.5px; font-weight: 600;
    z-index: 9998;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 20px -4px rgba(15,15,15,0.25);
    max-width: 90%;
  }
  .mp-preview-toast span {
    white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; max-width: 220px;
  }

  /* ---------- MODAL ---------- */
  .mp-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,15,15,0.5);
    backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; z-index: 1000;
  }
  .mp-modal {
    background: #ffffff; border-radius: 14px;
    padding: 20px; max-width: 420px; width: 100%;
    max-height: 85vh; overflow-y: auto;
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.2);
  }
  .mp-modal-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px;
  }
  .mp-modal-head h3 {
    font-size: 15px; font-weight: 700;
    color: #0f0f0f; margin: 0;
  }
  .mp-modal-close {
    background: transparent; border: none;
    color: #a3a3a3; cursor: pointer;
    font-size: 15px; padding: 4px 8px;
    border-radius: 6px; transition: all 0.15s ease;
  }
  .mp-modal-close:hover { background: #f5f5f5; color: #171717; }

  .mp-link-box {
    display: flex; gap: 8px; margin-bottom: 18px;
  }
  .mp-link-box input {
    flex: 1; padding: 10px 12px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    background: #fafafa; font-size: 12px;
    color: #262626; outline: none;
    cursor: pointer;
    overflow: hidden; text-overflow: ellipsis;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
  }
  .mp-link-box button {
    padding: 10px 12px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    background: #ffffff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #0f0f0f; transition: all 0.15s ease;
  }
  .mp-link-box button:hover { background: #f5f5f5; }

  .mp-modal-options {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .mp-modal-options button {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 14px 8px;
    background: #fafafa; border: 1px solid #f0f0f0;
    border-radius: 11px; cursor: pointer;
    font-size: 11.5px; font-weight: 600;
    color: #262626; transition: all 0.15s ease;
    font-family: inherit;
  }
  .mp-modal-options button:hover { background: #f5f5f5; border-color: #e5e5e5; }

  /* ---------- TOAST (created via DOM) ---------- */
`;

const toastStyle = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #0f0f0f; color: white; padding: 12px 22px; border-radius: 999px; font-size: 13px; font-weight: 600; box-shadow: 0 10px 25px -5px rgba(15,15,15,0.3); z-index: 9999; animation: mp-slide-in 0.3s ease; white-space: nowrap; max-width: 90%; overflow: hidden; text-overflow: ellipsis; font-family: 'Inter', sans-serif;`;

const mainCSS = `
  ${baseCSS}
  @keyframes mp-slide-in {
    from { transform: translateX(-50%) translateY(10px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
`;

/* =========================================================
   LOADING STYLES — UNCHANGED
   ========================================================= */
const loadingContainer = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  borderRadius: "40px",
};

const loadingSpinner = {
  width: "60px",
  height: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  background: "#ffffff",
  borderRadius: "50%",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginBottom: "16px",
};

const loadingText = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: "4px",
};

const loadingSubtext = {
  color: "#64748b",
  fontSize: "12px",
};

