// frontend/src/pages/admin/SongsPage.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus, FiX, FiEdit2, FiTrash2, FiCalendar,
  FiMapPin, FiChevronDown, FiChevronUp, FiRefreshCw,
  FiAlertCircle, FiSearch, FiCheck, FiSave, FiClock,
  FiDownload, FiMinus, FiBook, FiMoreVertical, FiList,
} from "react-icons/fi";
import { GiChurch } from "react-icons/gi";
import { BsFileWord, BsFilePdf, BsFileImage } from "react-icons/bs";
import html2canvas from "html2canvas";
import axios from "axios";
import io from "socket.io-client";
import backgroundImg from "../../assets/background.png";
import BASE_URL from "../../api";
import BookletModal from "../../components/BookletModal";
import { FaFilePdf } from "react-icons/fa";

/* ============================================================
   CONSTANTS
   ============================================================ */
const songFields = [
  { key: "entrance", label: "Entrance Hymn", maxSongs: 3, required: true },
  { key: "mass", label: "Mass Hymn", maxSongs: 2, required: true },
  { key: "bible", label: "Bible Reading", maxSongs: 2, required: true },
  { key: "offertory", label: "Offertory Hymn", maxSongs: 3, required: true },
  { key: "procession", label: "Procession Hymn", maxSongs: 2, required: false },
  { key: "mtakatifu", label: "Mtakatifu Hymn", maxSongs: 2, required: true },
  { key: "signOfPeace", label: "Sign of Peace", maxSongs: 1, required: true },
  { key: "communion", label: "Communion Hymn", maxSongs: 3, required: true },
  { key: "thanksgiving", label: "Thanksgiving Hymn", maxSongs: 2, required: false },
  { key: "exit", label: "Exit Hymn", maxSongs: 2, required: true },
];

const initializeSongs = () => {
  const songs = {};
  songFields.forEach((field) => {
    songs[field.key] = [""];
  });
  return songs;
};

const parseSongsFromString = (value) => {
  if (!value) return [""];
  if (Array.isArray(value)) return value.length ? value : [""];
  if (typeof value === "string") {
    if (value.includes(";")) {
      const parsed = value.split(";").map((s) => s.trim()).filter((s) => s);
      return parsed.length ? parsed : [""];
    }
    return value ? [value] : [""];
  }
  return [""];
};

const checkAccess = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return false;
  }
  if (user.role !== "admin" && user.role !== "choir_moderator") {
    window.location.href = "/dashboard";
    return false;
  }
  return true;
};

const formatDate = (dateString) => {
  if (!dateString) return "No date";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function SongsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date: "", venue: "", songs: initializeSongs() });
  const [formError, setFormError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVenue, setFilterVenue] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [selectedProgramForBooklet, setSelectedProgramForBooklet] = useState(null);

  const [songSearchResults, setSongSearchResults] = useState({});
  const [searchingFields, setSearchingFields] = useState({});
  const [activeField, setActiveField] = useState(null);

  const programRefs = useRef({});
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftsList, setShowDraftsList] = useState(false);

  /* ---------- DRAFTS ---------- */
  const loadSavedDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === "programDraft") {
        try {
          const draftData = JSON.parse(localStorage.getItem(key));
          if (draftData && draftData.data) {
            drafts.push({
              key: key,
              timestamp: draftData.timestamp || 0,
              date: draftData.data.date || "No date",
              venue: draftData.data.venue || "No venue",
              editingId: draftData.editingId || null,
            });
          }
        } catch (err) {
          console.error("Error parsing draft:", err);
        }
      }
    }
    drafts.sort((a, b) => b.timestamp - a.timestamp);
    setSavedDrafts(drafts);
  };

  const loadSpecificDraft = (draftKey) => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const formData = parsed.data;
      if (!formData.songs || Object.keys(formData.songs).length === 0) {
        formData.songs = initializeSongs();
      }
      setForm(formData);
      setEditingId(parsed.editingId || null);
      setShowDraftsList(false);
      setIsFormOpen(true);
      setDraftLoaded(true);
      showNotification("Draft loaded", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error loading draft:", err);
      showNotification("Failed to load draft", "error");
    }
  };

  const deleteDraft = (draftKey, event) => {
    event.stopPropagation();
    if (window.confirm("Delete this saved draft?")) {
      localStorage.removeItem(draftKey);
      loadSavedDrafts();
      showNotification("Draft deleted", "info");
      if (savedDrafts.length === 1) setShowDraftsList(false);
    }
  };

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    loadSavedDrafts();
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role);
    setHasAccess(checkAccess());
  }, []);

  useEffect(() => {
    const savedDraft = localStorage.getItem("programDraft");
    if (savedDraft && !draftLoaded) {
      try {
        const draft = JSON.parse(savedDraft);
        const draftTime = draft.timestamp || 0;
        const now = Date.now();
        if (now - draftTime < 24 * 60 * 60 * 1000) {
          const loadedForm = draft.data;
          if (!loadedForm.songs || Object.keys(loadedForm.songs).length === 0) {
            loadedForm.songs = initializeSongs();
          }
          setForm(loadedForm);
          setEditingId(draft.editingId || null);
          setDraftLoaded(true);
          showNotification("Draft restored", "info");
        } else {
          localStorage.removeItem("programDraft");
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  useEffect(() => {
    const draftTimeout = setTimeout(() => {
      const hasContent =
        form.date ||
        form.venue ||
        Object.values(form.songs).some((arr) => arr.some((s) => s));
      if (hasContent) {
        localStorage.setItem(
          "programDraft",
          JSON.stringify({ data: form, editingId, timestamp: Date.now() })
        );
      }
    }, 1000);
    return () => clearTimeout(draftTimeout);
  }, [form, editingId]);

  useEffect(() => {
    const socket = io(BASE_URL);
    socket.on("connect", () => console.log("Connected"));
    socket.on("program_updated", (program) => {
      setPrograms((prev) => prev.map((p) => (p.id === program.id ? program : p)));
    });
    socket.on("program_created", (program) => {
      setPrograms((prev) => [program, ...prev]);
    });
    socket.on("program_deleted", (id) => {
      setPrograms((prev) => prev.filter((p) => p.id !== id));
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [token]);

  /* ---------- FETCH ---------- */
  const fetchPrograms = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/mass-programs`, { headers });
      let programsData = res.data;
      if (res.data.programs && Array.isArray(res.data.programs)) programsData = res.data.programs;
      else if (Array.isArray(res.data)) programsData = res.data;
      else programsData = [];
      setPrograms(programsData);
    } catch (err) {
      showNotification("Failed to load programs", "error");
      setPrograms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  /* ---------- SONG SEARCH ---------- */
  const performSearch = async (fieldKey, songIndex, searchText) => {
    const searchId = `${fieldKey}-${songIndex}`;
    if (!searchText || searchText.trim().length < 2) {
      showNotification("Enter at least 2 characters to search", "info");
      return;
    }
    setSearchingFields((prev) => ({ ...prev, [searchId]: true }));
    try {
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        params: { search: searchText.trim(), limit: 10 },
      });
      const songs = res.data.songs || [];
      const results = songs.map((song) => ({
        id: song.id,
        title: song.title,
        reference: song.reference || "",
        preview: song.firstLine || "",
      }));
      setSongSearchResults((prev) => ({ ...prev, [searchId]: results }));
      setActiveField(searchId);
      if (results.length === 0) {
        showNotification(`No songs found matching "${searchText}"`, "info");
      }
    } catch (err) {
      console.error("Search error:", err);
      showNotification("Search failed. Please try again.", "error");
    } finally {
      setSearchingFields((prev) => ({ ...prev, [searchId]: false }));
    }
  };

  const selectSong = (fieldKey, songIndex, songTitle) => {
    setForm((prev) => {
      const updatedSongs = [...prev.songs[fieldKey]];
      updatedSongs[songIndex] = songTitle;
      return { ...prev, songs: { ...prev.songs, [fieldKey]: updatedSongs } };
    });
    const searchId = `${fieldKey}-${songIndex}`;
    setSongSearchResults((prev) => ({ ...prev, [searchId]: [] }));
    setActiveField(null);
  };

  const handleSongChange = (fieldKey, songIndex, value) => {
    setForm((prev) => {
      const updatedSongs = [...prev.songs[fieldKey]];
      updatedSongs[songIndex] = value;
      return { ...prev, songs: { ...prev.songs, [fieldKey]: updatedSongs } };
    });
    const searchId = `${fieldKey}-${songIndex}`;
    setSongSearchResults((prev) => ({ ...prev, [searchId]: [] }));
    setActiveField(null);
  };

  const addSongSlot = (fieldKey) => {
    const field = songFields.find((f) => f.key === fieldKey);
    if (field && form.songs[fieldKey].length < field.maxSongs) {
      setForm((prev) => ({
        ...prev,
        songs: { ...prev.songs, [fieldKey]: [...prev.songs[fieldKey], ""] },
      }));
    }
  };

  const removeSongSlot = (fieldKey, songIndex) => {
    setForm((prev) => {
      const updatedSongs = prev.songs[fieldKey].filter((_, i) => i !== songIndex);
      return { ...prev, songs: { ...prev.songs, [fieldKey]: updatedSongs } };
    });
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ---------- EDIT / CANCEL ---------- */
  const handleEdit = (program) => {
    setEditingId(program.id);
    const songs = {};
    songFields.forEach((field) => {
      songs[field.key] = parseSongsFromString(program[field.key]);
    });
    setForm({ date: program.date, venue: program.venue, songs });
    setIsFormOpen(true);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ date: "", venue: "", songs: initializeSongs() });
    setFormError("");
    localStorage.removeItem("programDraft");
  };

  const handleCancelProgram = () => {
    setForm({ date: "", venue: "", songs: initializeSongs() });
    setFormError("");
    setEditingId(null);
    setIsFormOpen(false);
    localStorage.removeItem("programDraft");
  };

  /* ---------- VALIDATION ---------- */
  const checkForDuplicates = () => {
    if (programs.length === 0) return true;
    const parseDate = (str) => {
      if (!str) return new Date(0);
      const [year, month, day] = str.split("-").map(Number);
      return new Date(year, month - 1, day);
    };
    const sortedPrograms = [...programs]
      .filter((p) => p.id !== editingId)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
    const lastProgram = sortedPrograms[0];
    if (!lastProgram) return true;

    const doTitlesMatch = (inputTitle, existingTitle) => {
      if (!inputTitle || !existingTitle) return false;
      const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedInput = normalize(inputTitle);
      const normalizedExisting = normalize(existingTitle);
      if (normalizedInput === normalizedExisting) return true;
      if (
        normalizedExisting.includes(normalizedInput) ||
        normalizedInput.includes(normalizedExisting)
      )
        return true;
      const inputWords = normalizedInput.split(/\s+/).filter((w) => w.length > 2);
      for (const word of inputWords) {
        if (normalizedExisting.includes(word)) return true;
      }
      return false;
    };

    const duplicateSongs = [];
    for (const field of songFields) {
      const inputSongs = form.songs[field.key];
      const lastSongs = parseSongsFromString(lastProgram[field.key]);
      for (const inputSong of inputSongs) {
        if (!inputSong) continue;
        for (const lastSong of lastSongs) {
          if (lastSong && doTitlesMatch(inputSong, lastSong)) {
            duplicateSongs.push(`${field.label}: "${inputSong}"`);
            break;
          }
        }
      }
    }
    if (duplicateSongs.length > 0) {
      const getOrdinal = (n) => {
        if (n > 3 && n < 21) return n + "th";
        switch (n % 10) {
          case 1: return n + "st";
          case 2: return n + "nd";
          case 3: return n + "rd";
          default: return n + "th";
        }
      };
      const formatDateShort = (dateStr) => {
        const date = new Date(dateStr);
        const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
        const dayNumber = getOrdinal(date.getDate());
        const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
        const year = date.getFullYear();
        return `${dayName} ${dayNumber} ${monthName} ${year}`;
      };
      setFormError(
        `Duplicate detected: ${duplicateSongs
          .slice(0, 3)
          .join(", ")}. Already sung on ${formatDateShort(lastProgram.date)}. Please choose different songs.`
      );
      return false;
    }
    return true;
  };

  const validateRequiredSongs = () => {
    const missingRequired = [];
    for (const field of songFields) {
      if (field.required) {
        const songs = form.songs[field.key];
        const hasValidSong = songs && songs.some((song) => song && song.trim() !== "");
        if (!hasValidSong) missingRequired.push(field.label);
      }
    }
    if (missingRequired.length > 0) {
      setFormError(`Please fill at least one song for: ${missingRequired.join(", ")}`);
      return false;
    }
    return true;
  };

  /* ---------- SUBMIT / DELETE ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.venue) {
      setFormError("Date and venue are required");
      return;
    }
    if (!validateRequiredSongs()) return;
    if (!checkForDuplicates()) return;

    setIsSaving(true);
    const payload = {
      date: form.date,
      venue: form.venue,
      ...Object.entries(form.songs).reduce((acc, [key, songs]) => {
        const filteredSongs = songs.filter((song) => song && song.trim() !== "");
        acc[key] = filteredSongs.length > 0 ? filteredSongs.join("; ") : "";
        return acc;
      }, {}),
    };

    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/admin/mass-programs/${editingId}`, payload, { headers });
        showNotification("Program updated successfully", "success");
      } else {
        await axios.post(`${BASE_URL}/api/admin/mass-programs`, payload, { headers });
        showNotification("Program created successfully", "success");
      }
      fetchPrograms();
      handleCancel();
      setIsFormOpen(false);
    } catch (err) {
      console.error("Save Error:", err);
      setFormError(err.response?.data?.error || "Failed to save program");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this program?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/admin/mass-programs/${id}`, { headers });
      showNotification("Program deleted", "info");
      fetchPrograms();
    } catch (err) {
      showNotification("Failed to delete program", "error");
    }
  };

  const toggleProgram = (id) => {
    setExpandedPrograms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSongsArray = (program, fieldKey) => {
    const value = program[fieldKey];
    if (!value) return [];
    if (typeof value === "string") {
      if (value.includes(";")) {
        return value.split(";").map((s) => s.trim()).filter((s) => s);
      }
      return value ? [value] : [];
    }
    return [];
  };

  /* ---------- DOWNLOADS ---------- */
  const downloadAsWord = (program) => {
    const songsRows = songFields
      .map((field) => {
        const songsArray = getSongsArray(program, field.key);
        let songsDisplay = "";
        if (songsArray.length === 0) songsDisplay = "—";
        else if (songsArray.length === 1) songsDisplay = songsArray[0];
        else songsDisplay = songsArray.map((song, idx) => `${idx + 1}. ${song}`).join("<br>");
        return `<tr><td class="song-label">${field.label}</td><td class="song-value">${songsDisplay}</td></tr>`;
      })
      .join("");

    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Calibri', 'Arial', sans-serif; max-width: 1000px; margin: 0 auto; padding: 30px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #0f0f0f; text-align: center; border-bottom: 3px solid #0f0f0f; padding-bottom: 12px; margin-bottom: 20px; font-size: 26px; }
        .header { text-align: center; margin-bottom: 25px; }
        .date { color: #525252; font-size: 15px; margin: 8px 0; }
        .venue { font-size: 19px; font-weight: bold; color: #0f0f0f; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #0f0f0f; color: white; padding: 12px; text-align: left; font-size: 14px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
        .song-label { font-weight: 700; color: #0f0f0f; width: 30%; background: #fafafa; }
        .song-value { line-height: 1.5; width: 70%; }
        .footer { margin-top: 30px; text-align: center; color: #737373; font-size: 11px; border-top: 1px solid #e5e5e5; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formatDate(program.date)}</div>
          <div class="venue">${program.venue}</div>
        </div>
        <table>
          <thead><tr><th>Liturgy Part</th><th>Song / Reading</th></tr></thead>
          <tbody>${songsRows}</tbody>
        </table>
        <div class="footer">ZUCA PORTAL</div>
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
    showNotification("Word document downloaded", "success");
  };

  const downloadAsPDF = (program) => {
    const songsRows = songFields
      .map((field) => {
        const songsArray = getSongsArray(program, field.key);
        let songsDisplay = "";
        if (songsArray.length === 0) songsDisplay = "—";
        else if (songsArray.length === 1) songsDisplay = songsArray[0];
        else songsDisplay = songsArray.map((song, idx) => `${idx + 1}. ${song}`).join("<br>");
        return `<div class="song-row"><div class="song-label">${field.label}</div><div class="song-value">${songsDisplay}</div></div>`;
      })
      .join("");

    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 30px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #0f0f0f; text-align: center; border-bottom: 2px solid #0f0f0f; padding-bottom: 10px; margin-bottom: 20px; font-size: 24px; }
        .header { text-align: center; margin-bottom: 30px; }
        .date { color: #262626; font-size: 14px; margin: 8px 0; }
        .venue { font-size: 17px; font-weight: bold; margin-top: 5px; }
        .song-row { display: flex; margin: 10px 0; padding: 8px; border-bottom: 1px solid #e5e5e5; }
        .song-label { font-weight: bold; width: 200px; flex-shrink: 0; }
        .song-value { flex: 1; line-height: 1.5; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #e5e5e5; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formatDate(program.date)}</div>
          <div class="venue">${program.venue}</div>
        </div>
        ${songsRows}
        <div class="footer">ZUCA PORTAL</div>
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
    showNotification("HTML saved - use Ctrl+P to save as PDF", "info");
  };

  const downloadAsImage = async (program) => {
    setGeneratingImage(true);
    showNotification("Generating image...", "info");
    try {
      const songsHtml = songFields
        .map((field) => {
          const songsArray = getSongsArray(program, field.key);
          let songsDisplay = "";
          if (songsArray.length === 0) songsDisplay = '<div style="color: #a3a3a3;">—</div>';
          else if (songsArray.length === 1) songsDisplay = `<div>${songsArray[0]}</div>`;
          else songsDisplay = songsArray.map((song, idx) => `<div style="margin-top: 3px;">${idx + 1}. ${song}</div>`).join("");
          return `
          <div style="padding: 10px; background: #fafafa; border-radius: 8px; border-left: 3px solid #0f0f0f; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #0f0f0f; margin-bottom: 6px;">${field.label}</div>
            <div style="font-size: 12px;">${songsDisplay}</div>
          </div>`;
        })
        .join("");

      const container = document.createElement("div");
      container.style.padding = "20px";
      container.style.background = "white";
      container.style.borderRadius = "8px";
      container.style.maxWidth = "800px";
      container.style.margin = "0 auto";
      container.style.fontFamily = "Arial, sans-serif";

      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0f0f0f; border-bottom: 3px solid #0f0f0f; padding-bottom: 10px; font-size: 22px;">MASS PROGRAM</h1>
          <div style="color: #737373; margin-top: 10px; font-size: 14px;">${formatDate(program.date)}</div>
          <div style="font-size: 16px; font-weight: bold; color: #0f0f0f;">${program.venue}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">${songsHtml}</div>
        <div style="margin-top: 25px; text-align: center; color: #737373; border-top: 1px solid #e5e5e5; padding-top: 12px; font-size: 10px;">ZUCA PORTAL</div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
      document.body.removeChild(container);

      const link = document.createElement("a");
      link.download = `Mass_Program_${program.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showNotification("Image downloaded", "success");
    } catch (error) {
      console.error(error);
      showNotification("Failed to generate image", "error");
    } finally {
      setGeneratingImage(false);
    }
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const venues = ["all", ...new Set(programs.map((p) => p.venue).filter(Boolean))];

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(p).some(
        (val) => typeof val === "string" && val.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesVenue = filterVenue === "all" || p.venue === filterVenue;
    return matchesSearch && matchesVenue;
  });

  if (!hasAccess) return null;

  const isChoirModerator = userRole === "choir_moderator";
  const canModify = userRole === "admin" || isChoirModerator;

  /* ============================================================
     SKELETON LOADER
     ============================================================ */
  if (loading) {
    return (
      <div className="sp-page">
        <div className="sp-container">
          <div className="sp-skeleton-header">
            <div className="sp-skeleton-header-left">
              <div className="sp-skeleton sp-skeleton-icon" />
              <div>
                <div className="sp-skeleton sp-skeleton-title" />
                <div className="sp-skeleton sp-skeleton-subtitle" />
              </div>
            </div>
            <div className="sp-skeleton-actions">
              <div className="sp-skeleton sp-skeleton-btn" />
              <div className="sp-skeleton sp-skeleton-btn" />
            </div>
          </div>
          <div className="sp-skeleton-toolbar">
            <div className="sp-skeleton sp-skeleton-input" />
            <div className="sp-skeleton sp-skeleton-input" style={{ maxWidth: 180 }} />
          </div>
          <div className="sp-skeleton-list">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="sp-skeleton-card">
                <div className="sp-skeleton-row">
                  <div className="sp-skeleton sp-skeleton-line-md" style={{ width: 220 }} />
                  <div className="sp-skeleton sp-skeleton-line-sm" style={{ width: 120 }} />
                </div>
                <div className="sp-skeleton-row" style={{ marginTop: 14 }}>
                  <div className="sp-skeleton sp-skeleton-line-sm" style={{ width: "100%" }} />
                </div>
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
    <div className="sp-page">
      <div className="background-image" style={{ backgroundImage: `url(${backgroundImg})` }}></div>
      <div className="background-overlay"></div>

      <AnimatePresence>
        {notification.show && (
          <motion.div
            className={`sp-toast sp-toast-${notification.type}`}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
          >
            {notification.type === "success" && <FiCheck size={15} />}
            {notification.type === "error" && <FiAlertCircle size={15} />}
            {notification.type === "info" && <FiClock size={15} />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sp-container">
        {/* HEADER */}
        <header className="sp-header">
          <div className="sp-header-left">
            <div className="sp-title-icon"><GiChurch size={22} /></div>
            <div>
              <div className="sp-eyebrow">Liturgy library</div>
              <h1 className="sp-title">Mass Programs</h1>
              <p className="sp-subtitle">
                {isChoirModerator
                  ? "Manage songs and liturgy as Choir Moderator"
                  : "Manage songs and liturgy programs"}
              </p>
            </div>
          </div>
          <div className="sp-header-actions">
            {isChoirModerator && (
              <span className="sp-role-badge">Choir Moderator</span>
            )}
            <button
              className="sp-icon-btn"
              onClick={() => fetchPrograms(true)}
              disabled={refreshing}
              title="Refresh"
            >
              <FiRefreshCw size={15} className={refreshing ? "sp-spin" : ""} />
            </button>
            <button
              className="sp-icon-btn"
              onClick={() => {
                loadSavedDrafts();
                setShowDraftsList(!showDraftsList);
              }}
              title="Saved drafts"
            >
              <FiSave size={15} />
              {savedDrafts.length > 0 && (
                <span className="sp-icon-badge">{savedDrafts.length}</span>
              )}
            </button>
            {canModify && (
              <button
                className="sp-btn sp-btn-primary"
                onClick={() => setIsFormOpen(!isFormOpen)}
              >
                {isFormOpen ? <FiX size={14} /> : <FiPlus size={14} />}
                {isFormOpen ? "Close" : "New Program"}
              </button>
            )}
          </div>
        </header>

        {/* Draft indicator */}
        {draftLoaded && (
          <div className="sp-draft-indicator">
            <FiClock size={14} />
            <span>Draft restored from previous session</span>
            <button
              className="sp-draft-clear"
              onClick={() => {
                localStorage.removeItem("programDraft");
                setForm({ date: "", venue: "", songs: initializeSongs() });
                setEditingId(null);
                setDraftLoaded(false);
                showNotification("Draft cleared", "info");
              }}
            >
              <FiX size={12} /> Clear
            </button>
          </div>
        )}

        {/* Drafts drawer */}
        <AnimatePresence>
          {showDraftsList && (
            <>
              <motion.div
                className="sp-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDraftsList(false)}
              />
              <motion.aside
                className="sp-drawer"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                <div className="sp-drawer-header">
                  <div>
                    <h3>Saved drafts</h3>
                    <p className="sp-drawer-sub">
                      {savedDrafts.length} draft{savedDrafts.length !== 1 ? "s" : ""} auto-saved
                    </p>
                  </div>
                  <button
                    className="sp-icon-btn"
                    onClick={() => setShowDraftsList(false)}
                  >
                    <FiX size={16} />
                  </button>
                </div>

                <div className="sp-drawer-body">
                  {savedDrafts.length === 0 ? (
                    <div className="sp-drawer-empty">
                      <FiSave size={28} />
                      <div className="sp-drawer-empty-title">No saved drafts</div>
                      <div className="sp-drawer-empty-sub">
                        Drafts are auto-saved as you fill the form
                      </div>
                    </div>
                  ) : (
                    savedDrafts.map((draft) => (
                      <div
                        key={draft.key}
                        className="sp-draft-item"
                        onClick={() => loadSpecificDraft(draft.key)}
                      >
                        <div className="sp-draft-info">
                          <div className="sp-draft-title">
                            <FiCalendar size={12} /> {draft.date || "No date"}
                          </div>
                          <div className="sp-draft-venue">
                            <FiMapPin size={12} /> {draft.venue || "No venue"}
                          </div>
                          <div className="sp-draft-meta">
                            <FiClock size={11} /> {new Date(draft.timestamp).toLocaleString()}
                          </div>
                          {draft.editingId && (
                            <span className="sp-draft-badge">Editing</span>
                          )}
                        </div>
                        <button
                          className="sp-draft-delete"
                          onClick={(e) => deleteDraft(draft.key, e)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {savedDrafts.length > 0 && (
                  <div className="sp-drawer-footer">
                    <button
                      className="sp-btn sp-btn-danger"
                      onClick={() => {
                        if (window.confirm("Delete ALL saved drafts?")) {
                          localStorage.removeItem("programDraft");
                          loadSavedDrafts();
                          setShowDraftsList(false);
                          showNotification("All drafts cleared", "info");
                        }
                      }}
                    >
                      <FiTrash2 size={13} /> Clear all drafts
                    </button>
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="sp-toolbar">
          <div className="sp-search">
            <FiSearch size={15} />
            <input
              type="text"
              placeholder="Search programs by venue or song..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="sp-search-clear" onClick={() => setSearchTerm("")}>
                <FiX size={14} />
              </button>
            )}
          </div>
          <div className="sp-filter">
            <FiList size={14} />
            <select value={filterVenue} onChange={(e) => setFilterVenue(e.target.value)}>
              <option value="all">All venues</option>
              {venues
                .filter((v) => v !== "all")
                .map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
            </select>
            <FiChevronDown size={13} className="sp-filter-chevron" />
          </div>
        </div>

        {/* Form */}
        {canModify && (
          <AnimatePresence>
            {isFormOpen && (
              <motion.div
                className="sp-form-card"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div className="sp-form-header">
                  <div>
                    <h3>{editingId ? "Edit program" : "New program"}</h3>
                    <p className="sp-form-sub">
                      {editingId
                        ? "Update the liturgy details and songs"
                        : "Fill in the liturgy details and select songs"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Meta */}
                  <div className="sp-form-meta">
                    <div className="sp-field">
                      <label>
                        <FiCalendar size={12} /> Date <span className="sp-req">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => handleChange("date", e.target.value)}
                        required
                      />
                    </div>
                    <div className="sp-field">
                      <label>
                        <FiMapPin size={12} /> Venue <span className="sp-req">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.venue}
                        onChange={(e) => handleChange("venue", e.target.value)}
                        placeholder="e.g., Main Church"
                        required
                      />
                    </div>
                  </div>

                  {/* Songs */}
                  <div className="sp-songs-section">
                    <div className="sp-songs-heading">
                      <h4>Liturgy parts</h4>
                      <p className="sp-songs-sub">
                        Add songs for each part of the Mass. Use search to autocomplete.
                      </p>
                    </div>
                    <div className="sp-songs-grid">
                      {songFields.map((field) => (
                        <div key={field.key} className="sp-song-field">
                          <div className="sp-song-field-head">
                            <span className="sp-song-field-label">
                              {field.label}
                              {field.required && <span className="sp-req-badge">Required</span>}
                            </span>
                            <span className="sp-song-field-limit">
                              {form.songs[field.key].length}/{field.maxSongs}
                            </span>
                          </div>

                          <div className="sp-song-inputs">
                            {form.songs[field.key].map((song, idx) => {
                              const searchId = `${field.key}-${idx}`;
                              const results = songSearchResults[searchId] || [];
                              const isSearching = searchingFields[searchId];
                              const showDropdown =
                                activeField === searchId && results.length > 0;

                              return (
                                <div key={idx} className="sp-song-input-row">
                                  <span className="sp-song-num">{idx + 1}.</span>
                                  <div className="sp-song-input-wrap">
                                    <input
                                      type="text"
                                      value={song}
                                      onChange={(e) =>
                                        handleSongChange(field.key, idx, e.target.value)
                                      }
                                      placeholder={`Enter song title`}
                                      autoComplete="off"
                                    />
                                    {showDropdown && (
                                      <div className="sp-song-dropdown">
                                        {results.map((result) => (
                                          <div
                                            key={result.id}
                                            className="sp-song-item"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              selectSong(field.key, idx, result.title);
                                            }}
                                          >
                                            <div className="sp-song-item-title">
                                              {result.title}
                                            </div>
                                            {result.reference && (
                                              <div className="sp-song-item-ref">
                                                {result.reference}
                                              </div>
                                            )}
                                            {result.preview && (
                                              <div className="sp-song-item-preview">
                                                {result.preview}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => performSearch(field.key, idx, song)}
                                    className="sp-song-search-btn"
                                    disabled={isSearching || !song || song.trim().length < 2}
                                    title="Search song library"
                                  >
                                    {isSearching ? (
                                      <span className="sp-spinner-xs" />
                                    ) : (
                                      <FiSearch size={13} />
                                    )}
                                  </button>
                                  {form.songs[field.key].length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSongSlot(field.key, idx)}
                                      className="sp-song-remove-btn"
                                      title="Remove"
                                    >
                                      <FiMinus size={13} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            {form.songs[field.key].length < field.maxSongs && (
                              <button
                                type="button"
                                onClick={() => addSongSlot(field.key)}
                                className="sp-song-add-btn"
                              >
                                <FiPlus size={12} /> Add another
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formError && (
                    <div className="sp-form-error">
                      <FiAlertCircle size={15} />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="sp-form-actions">
                    <button
                      type="button"
                      onClick={handleCancelProgram}
                      className="sp-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="sp-btn sp-btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span className="sp-spinner-xs" />
                          {editingId ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          <FiSave size={14} />
                          {editingId ? "Update program" : "Create program"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Program list */}
        <div className="sp-content">
          {filteredPrograms.length === 0 ? (
            <div className="sp-empty">
              <div className="sp-empty-icon"><GiChurch size={32} /></div>
              <h3>No programs found</h3>
              <p>
                {searchTerm || filterVenue !== "all"
                  ? "Try adjusting your search or filter"
                  : "Create your first mass program to get started"}
              </p>
              {!searchTerm && filterVenue === "all" && canModify && (
                <button className="sp-btn sp-btn-primary" onClick={() => setIsFormOpen(true)}>
                  <FiPlus size={14} /> Create program
                </button>
              )}
            </div>
          ) : (
            <div className="sp-program-list">
              {filteredPrograms.map((program, index) => (
                <motion.div
                  key={program.id}
                  className="sp-program-card"
                  ref={(el) => (programRefs.current[program.id] = el)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div
                    className="sp-program-head"
                    onClick={() => toggleProgram(program.id)}
                  >
                    <div className="sp-program-info">
                      <div className="sp-program-date">
                        <FiCalendar size={13} />
                        <span>{formatDate(program.date)}</span>
                      </div>
                      <div className="sp-program-venue">
                        <FiMapPin size={13} />
                        <span>{program.venue}</span>
                      </div>
                    </div>

                    <div className="sp-program-actions">
                      {canModify && (
                        <button
                          className="sp-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(program);
                          }}
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}

                      <button
                        className="sp-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProgramForBooklet(program);
                        }}
                        title="View full booklet with lyrics"
                      >
                        <FaFilePdf color="red" size={24} /> 
                      </button>

                      <div className="sp-dropdown">
                        <button
                          className="sp-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(program.id);
                          }}
                          disabled={generatingImage}
                          title="Download"
                        >
                          <FiDownload size={14} />
                        </button>
                        {activeDropdown === program.id && (
                          <div className="sp-dropdown-menu">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsWord(program);
                                toggleDropdown(null);
                              }}
                            >
                              <BsFileWord size={14} /> Word document
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsPDF(program);
                                toggleDropdown(null);
                              }}
                            >
                              <BsFilePdf size={14} /> PDF (print)
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsImage(program);
                                toggleDropdown(null);
                              }}
                            >
                              <BsFileImage size={14} /> Image (PNG)
                            </button>
                          </div>
                        )}
                      </div>

                      {canModify && (
                        <button
                          className="sp-action-btn sp-action-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(program.id);
                          }}
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}

                      <button
                        className="sp-expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProgram(program.id);
                        }}
                      >
                        {expandedPrograms[program.id] ? (
                          <FiChevronUp size={16} />
                        ) : (
                          <FiChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedPrograms[program.id] && (
                      <motion.div
                        className="sp-program-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="sp-songs-display">
                          {songFields.map((field) => {
                            const songsArray = getSongsArray(program, field.key);
                            return (
                              <div key={field.key} className="sp-song-display-item">
                                <div className="sp-song-display-label">{field.label}</div>
                                <div className="sp-song-display-value">
                                  {songsArray.length > 0 ? (
                                    songsArray.map((song, idx) => (
                                      <div key={idx} className="sp-song-line">
                                        <span className="sp-song-line-num">{idx + 1}.</span>
                                        <span>{song}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="sp-no-song">—</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProgramForBooklet && (
        <BookletModal
          program={selectedProgramForBooklet}
          onClose={() => setSelectedProgramForBooklet(null)}
        />
      )}

      <style>{mainCSS}</style>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const baseCSS = `
  .sp-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
    padding: 24px;
  }
  .background-image, .background-overlay { display: none; }
  .sp-container { max-width: 1360px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .sp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    flex-wrap: wrap;
    padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
  }
  .sp-header-left { display: flex; align-items: center; gap: 14px; }
  .sp-title-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #f5f5f5;
    color: #262626;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sp-eyebrow {
    font-size: 11px;
    color: #737373;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }
  .sp-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.4px;
    color: #0f0f0f;
  }
  .sp-subtitle {
    font-size: 13px;
    color: #737373;
    margin: 2px 0 0 0;
  }
  .sp-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sp-role-badge {
    font-size: 11.5px;
    font-weight: 600;
    color: #525252;
    background: #f5f5f5;
    border: 1px solid #e5e5e5;
    padding: 6px 12px;
    border-radius: 999px;
    white-space: nowrap;
  }

  /* ---------- BUTTONS ---------- */
  .sp-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 9px;
    border: 1px solid #e5e5e5;
    background: #ffffff;
    color: #262626;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    transition: background 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
    font-family: inherit;
  }
  .sp-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .sp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sp-btn-primary {
    background: #0f0f0f;
    color: #ffffff;
    border-color: #0f0f0f;
  }
  .sp-btn-primary:hover { background: #262626; border-color: #262626; }
  .sp-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .sp-btn-danger:hover { background: #fef2f2; border-color: #fca5a5; }

  .sp-icon-btn {
    position: relative;
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    border: 1px solid #e5e5e5;
    background: #ffffff;
    color: #525252;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .sp-icon-btn:hover { background: #f5f5f5; color: #171717; border-color: #d4d4d4; }
  .sp-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sp-icon-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #0f0f0f;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 999px;
    min-width: 16px;
    text-align: center;
    border: 2px solid #fafafa;
  }

  .sp-spin { animation: sp-spin 1s linear infinite; }
  @keyframes sp-spin { to { transform: rotate(360deg); } }
  .sp-spinner-xs {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: sp-spin 0.7s linear infinite;
    display: inline-block;
  }

  /* ---------- TOAST ---------- */
  .sp-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 11px 18px;
    border-radius: 10px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 9999;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.2);
  }
  .sp-toast-success { background: #0f0f0f; }
  .sp-toast-error { background: #dc2626; }
  .sp-toast-info { background: #525252; }

  /* ---------- DRAFT INDICATOR ---------- */
  .sp-draft-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 10px;
    margin-bottom: 16px;
    color: #b45309;
    font-size: 13px;
    font-weight: 500;
  }
  .sp-draft-clear {
    margin-left: auto;
    background: transparent;
    border: none;
    color: #b45309;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
  }
  .sp-draft-clear:hover { background: #fef3c7; }

  /* ---------- DRAWER (DRAFTS) ---------- */
  .sp-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 15, 0.4);
    z-index: 60;
  }
  .sp-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 380px;
    max-width: 90vw;
    background: #ffffff;
    border-left: 1px solid #e5e5e5;
    z-index: 61;
    display: flex;
    flex-direction: column;
    box-shadow: -20px 0 40px -20px rgba(15, 15, 15, 0.15);
  }
  .sp-drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  .sp-drawer-header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f0f0f;
  }
  .sp-drawer-sub {
    font-size: 12px;
    color: #a3a3a3;
    margin: 4px 0 0 0;
  }
  .sp-drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 12px 20px;
  }
  .sp-drawer-empty {
    text-align: center;
    padding: 60px 24px;
    color: #a3a3a3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .sp-drawer-empty svg { color: #d4d4d4; }
  .sp-drawer-empty-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #525252;
  }
  .sp-drawer-empty-sub { font-size: 12px; }

  .sp-draft-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sp-draft-item:hover { border-color: #d4d4d4; background: #fafafa; }
  .sp-draft-info { flex: 1; min-width: 0; }
  .sp-draft-title, .sp-draft-venue, .sp-draft-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: #525252;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sp-draft-title { color: #0f0f0f; font-weight: 600; }
  .sp-draft-venue { margin-top: 3px; }
  .sp-draft-meta {
    color: #a3a3a3;
    font-size: 11px;
    margin-top: 6px;
  }
  .sp-draft-badge {
    display: inline-block;
    margin-top: 6px;
    background: #f5f5f5;
    color: #525252;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sp-draft-delete {
    background: transparent;
    border: none;
    color: #a3a3a3;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sp-draft-delete:hover { background: #fef2f2; color: #b91c1c; }
  .sp-drawer-footer {
    padding: 14px 20px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
  }
  .sp-drawer-footer .sp-btn { width: 100%; justify-content: center; }

  /* ---------- TOOLBAR ---------- */
  .sp-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .sp-search {
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 0 12px;
    height: 40px;
    color: #737373;
    transition: border-color 0.15s ease;
  }
  .sp-search:focus-within { border-color: #a3a3a3; }
  .sp-search input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #171717;
    font-family: inherit;
    height: 100%;
  }
  .sp-search input::placeholder { color: #a3a3a3; }
  .sp-search-clear {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #a3a3a3;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }
  .sp-search-clear:hover { background: #f5f5f5; color: #525252; }

  .sp-filter {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 0 12px;
    height: 40px;
    min-width: 180px;
    color: #737373;
  }
  .sp-filter select {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #171717;
    cursor: pointer;
    appearance: none;
    font-family: inherit;
    padding-right: 16px;
  }
  .sp-filter-chevron {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: #a3a3a3;
  }

  /* ---------- FORM ---------- */
  .sp-form-card {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(15, 15, 15, 0.04);
  }
  .sp-form-header { margin-bottom: 20px; }
  .sp-form-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #0f0f0f;
    margin: 0;
  }
  .sp-form-sub {
    font-size: 12.5px;
    color: #a3a3a3;
    margin: 3px 0 0 0;
  }

  .sp-form-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 24px;
  }
  @media (max-width: 640px) {
    .sp-form-meta { grid-template-columns: 1fr; }
  }

  .sp-field label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 7px;
  }
  .sp-req { color: #dc2626; }
  .sp-field input[type="text"],
  .sp-field input[type="date"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 9px;
    font-size: 13.5px;
    color: #171717;
    font-family: inherit;
    background: #ffffff;
    transition: border-color 0.15s ease;
  }
  .sp-field input:focus {
    outline: none;
    border-color: #0f0f0f;
  }

  .sp-songs-section { margin-bottom: 24px; }
  .sp-songs-heading {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
  }
  .sp-songs-heading h4 {
    font-size: 13px;
    font-weight: 700;
    color: #0f0f0f;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sp-songs-sub {
    font-size: 12px;
    color: #a3a3a3;
    margin: 4px 0 0 0;
  }
  .sp-songs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  @media (max-width: 900px) {
    .sp-songs-grid { grid-template-columns: 1fr; }
  }

  .sp-song-field {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 14px;
  }
  .sp-song-field-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    gap: 8px;
  }
  .sp-song-field-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 700;
    color: #0f0f0f;
  }
  .sp-req-badge {
    font-size: 9.5px;
    padding: 2px 7px;
    background: #f5f5f5;
    color: #525252;
    border-radius: 999px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sp-song-field-limit {
    font-size: 11px;
    color: #a3a3a3;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .sp-song-inputs { display: flex; flex-direction: column; gap: 6px; }
  .sp-song-input-row {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }
  .sp-song-num {
    font-size: 12px;
    color: #a3a3a3;
    font-weight: 600;
    width: 16px;
    flex-shrink: 0;
  }
  .sp-song-input-wrap { flex: 1; position: relative; min-width: 0; }
  .sp-song-input-wrap input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 12.5px;
    color: #171717;
    background: #ffffff;
    transition: border-color 0.15s ease;
    font-family: inherit;
  }
  .sp-song-input-wrap input:focus {
    outline: none;
    border-color: #0f0f0f;
  }
  .sp-song-search-btn,
  .sp-song-remove-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
    background: #ffffff;
    color: #525252;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sp-song-search-btn:hover:not(:disabled) { background: #f5f5f5; color: #171717; }
  .sp-song-search-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sp-song-remove-btn { color: #b91c1c; }
  .sp-song-remove-btn:hover { background: #fef2f2; border-color: #fecaca; }

  .sp-song-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: 1px dashed #d4d4d4;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    margin-top: 2px;
  }
  .sp-song-add-btn:hover {
    background: #f5f5f5;
    border-color: #a3a3a3;
    color: #171717;
  }

  .sp-song-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    max-height: 260px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.15);
  }
  .sp-song-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.12s ease;
  }
  .sp-song-item:last-child { border-bottom: none; }
  .sp-song-item:hover { background: #fafafa; }
  .sp-song-item-title {
    font-weight: 600;
    font-size: 12.5px;
    color: #0f0f0f;
  }
  .sp-song-item-ref {
    font-size: 11px;
    color: #737373;
    margin-top: 2px;
  }
  .sp-song-item-preview {
    font-size: 11px;
    color: #a3a3a3;
    margin-top: 2px;
    font-style: italic;
  }

  .sp-form-error {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #b91c1c;
    font-size: 13px;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .sp-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }

  /* ---------- PROGRAM LIST ---------- */
  .sp-content { margin-top: 4px; }
  .sp-program-list { display: flex; flex-direction: column; gap: 10px; }
  .sp-program-card {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.15s ease;
  }
  .sp-program-card:hover { border-color: #d4d4d4; }

  .sp-program-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    cursor: pointer;
    background: #ffffff;
  }
  .sp-program-info {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .sp-program-date, .sp-program-venue {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #525252;
    font-size: 13.5px;
    font-weight: 500;
    white-space: nowrap;
  }
  .sp-program-date svg, .sp-program-venue svg { color: #a3a3a3; }
  .sp-program-venue { color: #171717; font-weight: 600; }

  .sp-program-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .sp-action-btn {
    width: 34px;
    height: 34px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #525252;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .sp-action-btn:hover { background: #f5f5f5; color: #171717; border-color: #d4d4d4; }
  .sp-action-danger { color: #b91c1c; }
  .sp-action-danger:hover { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

  .sp-expand-btn {
    background: transparent;
    border: none;
    color: #a3a3a3;
    cursor: pointer;
    width: 30px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.15s ease;
  }
  .sp-expand-btn:hover { background: #f5f5f5; color: #525252; }

  .sp-dropdown { position: relative; }
  .sp-dropdown-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 4px;
    min-width: 190px;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.15);
    z-index: 20;
    animation: sp-menu-in 0.12s ease;
  }
  @keyframes sp-menu-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .sp-dropdown-menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border: none;
    background: transparent;
    color: #262626;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 7px;
    text-align: left;
    transition: background 0.12s ease;
    font-family: inherit;
  }
  .sp-dropdown-menu button:hover { background: #f5f5f5; }

  .sp-program-details {
    border-top: 1px solid #f0f0f0;
    padding: 20px;
    background: #fafafa;
    overflow: hidden;
  }
  .sp-songs-display {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 10px;
  }
  .sp-song-display-item {
    background: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .sp-song-display-label {
    font-size: 11px;
    font-weight: 700;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .sp-song-display-value {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sp-song-line {
    display: flex;
    gap: 6px;
    font-size: 13px;
    color: #171717;
    line-height: 1.5;
  }
  .sp-song-line-num {
    color: #a3a3a3;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .sp-no-song {
    color: #d4d4d4;
    font-style: italic;
    font-size: 12.5px;
  }

  /* ---------- EMPTY ---------- */
  .sp-empty {
    text-align: center;
    padding: 70px 24px;
    background: #ffffff;
    border-radius: 14px;
    border: 2px dashed #e5e5e5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .sp-empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: #f5f5f5;
    color: #a3a3a3;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .sp-empty h3 {
    font-size: 17px;
    font-weight: 700;
    margin: 0;
    color: #0f0f0f;
  }
  .sp-empty p {
    font-size: 13px;
    color: #737373;
    margin: 0 0 8px 0;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .sp-page { padding: 16px; }
    .sp-header { flex-direction: column; align-items: stretch; }
    .sp-header-actions { width: 100%; justify-content: flex-end; }
    .sp-form-actions { flex-direction: column-reverse; }
    .sp-form-actions .sp-btn { width: 100%; justify-content: center; }
    .sp-program-head { flex-direction: column; align-items: stretch; gap: 12px; }
    .sp-program-info { gap: 8px; flex-direction: column; align-items: flex-start; }
    .sp-program-actions { justify-content: flex-end; }
    .sp-drawer { width: 100%; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .sp-skeleton {
    background: #ececec;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .sp-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: sp-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes sp-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .sp-skeleton-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .sp-skeleton-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .sp-skeleton-icon { width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0; }
  .sp-skeleton-title { width: 180px; height: 24px; }
  .sp-skeleton-subtitle { width: 240px; height: 13px; margin-top: 8px; }
  .sp-skeleton-actions { display: flex; gap: 8px; }
  .sp-skeleton-btn { width: 38px; height: 38px; border-radius: 9px; }
  .sp-skeleton-toolbar { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
  .sp-skeleton-input { flex: 1; min-width: 220px; height: 40px; border-radius: 10px; }
  .sp-skeleton-list { display: flex; flex-direction: column; gap: 10px; }
  .sp-skeleton-card {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    padding: 20px;
  }
  .sp-skeleton-row { display: flex; gap: 12px; align-items: center; }
  .sp-skeleton-line-sm { height: 12px; border-radius: 4px; }
  .sp-skeleton-line-md { height: 16px; border-radius: 4px; }
`;

const mainCSS = baseCSS;

