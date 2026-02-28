// frontend/src/pages/SongsPage.jsx

import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../api";

const songFields = [
  { key: "entrance", label: "Entrance Hymn" },
  { key: "mass", label: "Mass Hymn" },
  { key: "bible", label: "Bible Reading" },
  { key: "offertory", label: "Offertory Hymn" },
  { key: "procession", label: "Procession Hymn" },
  { key: "mtakatifu", label: "Mtakatifu Hymn" },
  { key: "signOfPeace", label: "Sign of Peace" },
  { key: "communion", label: "Communion Hymn" },
  { key: "thanksgiving", label: "Thanksgiving Hymn" },
  { key: "exit", label: "Exit Hymn" },
];

export default function SongsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date: "", venue: "", songs: {} });
  const [formError, setFormError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPrograms();
  }, [token]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrograms(res.data);
    } catch (err) {
      console.error("Fetch Programs Error:", err);
      alert("Failed to load programs");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    if (songFields.some(f => f.key === key)) {
      setForm(prev => ({ ...prev, songs: { ...prev.songs, [key]: value } }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleEdit = (program) => {
    setEditingId(program.id);
    setForm({
      date: program.date,
      venue: program.venue,
      songs: songFields.reduce((acc, f) => {
        acc[f.key] = program[f.key] || "";
        return acc;
      }, {}),
    });
    setIsFormOpen(true);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ date: "", venue: "", songs: {} });
    setFormError("");
  };

  const handleCancelProgram = () => {
    setForm({ date: "", venue: "", songs: {} });
    setFormError("");
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (programs.length > 0) {
      const parseDate = (str) => {
        if (!str) return new Date(0);
        const [year, month, day] = str.split("-").map(Number);
        return new Date(year, month - 1, day);
      };

      const sortedPrograms = [...programs]
        .filter(p => p.id !== editingId)
        .sort((a, b) => parseDate(b.date) - parseDate(a.date));

      const lastProgram = sortedPrograms[0];

      if (lastProgram) {
        // NEW: normalize strings to avoid duplicates with small variations
        const normalize = (str) =>
          str
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""); // remove spaces & punctuation

        const duplicateSongs = songFields
          .filter(f => normalize(form.songs[f.key] || "") === normalize(lastProgram[f.key] || ""))
          .map(f => f.label);

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

          const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
            const dayNumber = getOrdinal(date.getDate());
            const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
            const year = date.getFullYear();
            return `${dayName} ${dayNumber} ${monthName} ${year}`;
          };

          setFormError(`😫 Cannot add these song(s): ${duplicateSongs.join(", ")}. They were already sung in the last program (${formatDate(lastProgram.date)}).`);
          return;
        }
      }
    }

    const payload = { date: form.date, venue: form.venue, ...form.songs };

    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/songs/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${BASE_URL}/api/songs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchPrograms();
      handleCancel();
    } catch (err) {
      console.error("Save Program Error:", err);
      alert("Failed to save program");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this program?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/songs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPrograms();
    } catch (err) {
      console.error("Delete Program Error:", err);
      alert("Failed to delete program");
    }
  };

  const toggleProgram = (id) => {
    setExpandedPrograms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={page}>
      <h1 style={title}>SONGS PROGRAM  (EDIT)</h1>

      <div style={glassCard}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setIsFormOpen(prev => !prev)}
        >
          <h2 style={sectionTitle}>{editingId ? "Edit Program" : "Create New Program"}</h2>
          <span style={{ fontSize: "18px", color: "#25e317" }}>{isFormOpen ? "▲" : "▼"}</span>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit}>
            <div style={row}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
                style={input}
              />
              <input
                type="text"
                value={form.venue}
                onChange={(e) => handleChange("venue", e.target.value)}
                placeholder="Venue"
                required
                style={input}
              />
            </div>

            <div style={grid}>
              {songFields.map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column" }}>
                  {form.songs[f.key] && (
                    <span style={{ ...songLabel, marginBottom: "4px" }}>{f.label}</span>
                  )}
                  <input
                    type="text"
                    value={form.songs[f.key] || ""}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.label}
                    style={input}
                  />
                </div>
              ))}
            </div>

            {formError && (
              <div style={{ marginTop: 12, color: "#ff0004", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: "10px" }}>
              <button type="submit" style={primaryBtn}>
                {editingId ? "Update Program" : "Create Program"}
              </button>
              <button type="button" onClick={handleCancelProgram} style={secondaryBtn}>
                Cancel Program
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={list}>
        {programs.map(p => (
          <div key={p.id} style={glassCard}>
            <div
              style={{ ...programHeader, cursor: "pointer" }}
              onClick={() => toggleProgram(p.id)}
            >
              <strong>{p.date}</strong>
              <span>
                {p.venue} {expandedPrograms[p.id] ? "▲" : "▼"}
              </span>
            </div>

            {expandedPrograms[p.id] && (
              <div>
                <div style={grid}>
                  {songFields.map(f => (
                    <div key={f.key} style={songBox}>
                      <span style={songLabel}>{f.label}</span>
                      <span>{p[f.key]}</span>
                    </div>
                  ))}
                </div>
                <div style={actions}>
                  <button onClick={() => handleEdit(p)} style={editBtn}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={deleteBtn}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */
const page = {
  minHeight: "100vh",
  padding: "40px 20px",
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  background: `
    radial-gradient(circle at top left, #142353da, transparent 60%),
    radial-gradient(circle at bottom right, #164f70, transparent 60%),
    #0b908d00
  `,
};

const title = {
  textAlign: "center",
  fontSize: "2.2rem",
  fontWeight: 1000,
  color: "#f7f8f7",
  marginBottom: "40px",
};

const sectionTitle = {
  fontSize: "1.4rem",
  fontWeight: 800,
  color: "#ccced3",
  marginBottom: "20px",
};

const glassCard = {
  maxWidth: "1100px",
  margin: "0 auto 35px",
  padding: "30px",
  borderRadius: "16px",
  background: "#262020e0",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
};

const row = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};

const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5f5",
  fontWeight: 900,
  fontSize: "18px",
  outline: "none",
};

const programHeader = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "20px",
  fontSize: "15px",
  fontWeight: 600,
  color: "#e3e3e3",
};

const songBox = {
  background: "#fffffffa",
  border: "1px solid #e2e8f0",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: 1000,
  fontSize: "14px",
  lineHeight: 1.4,
};

const songLabel = {
  fontWeight: 900,
  fontSize: "15px",
  color: "#0cf63e",
  marginBottom: "4px",
  display: "block",
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const primaryBtn = {
  padding: "10px 18px",
  borderRadius: "10px",
  border: "none",
  background: "#25eb74a8",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn = { ...primaryBtn, background: "#64748b" };

const editBtn = {
  padding: "8px 16px",
  background: "#25eb2c00",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "13px",
  cursor: "pointer",
};

const deleteBtn = { ...editBtn, background: "#dc2626" };

const list = { marginTop: "30px" };