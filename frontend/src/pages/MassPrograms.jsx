// frontend/src/pages/MassPrograms.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { FiShare2 } from "react-icons/fi";
import { BsMusicNoteBeamed, BsBook, BsSun } from "react-icons/bs";
import BASE_URL from "../api";

const songFields = [
  { key: "entrance", label: "Entrance Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "mass", label: "Mass Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "bible", label: "Bible Reading", icon: <BsBook /> },
  { key: "offertory", label: "Offertory Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "procession", label: "Procession Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "mtakatifu", label: "Mtakatifu Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "signOfPeace", label: "Sign of Peace", icon: <BsSun /> },
  { key: "communion", label: "Communion Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "thanksgiving", label: "Thanksgiving Hymn", icon: <BsMusicNoteBeamed /> },
  { key: "exit", label: "Exit Hymn", icon: <BsMusicNoteBeamed /> },
];

export default function MassPrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]); // existing mobile expand
  const [collapsedIds, setCollapsedIds] = useState([]); // new toggle for all devices
  const token = localStorage.getItem("token");

  const isMobile = window.innerWidth <= 768;

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setPrograms(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load Mass programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    const daySuffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    return `${month} ${day}${daySuffix} ${year}`;
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const shareProgram = (program) => {
    const text = songFields
      .map((f) => `${f.label}: ${program[f.key] || "—"}`)
      .join("\n");

    navigator.clipboard.writeText(
      `${formatDate(program.date)}\nVenue: ${program.venue}\n\n${text}`
    );
    alert("Mass program copied!");
  };

  return (
    <div style={container}>
      <h1 style={title}>Mass Programs</h1>

      {loading && <p style={{ textAlign: "center", color: "#fff" }}>Loading…</p>}

      <div style={programList}>
        {programs.map((p) => {
          const isExpanded = expandedIds.includes(p.id);
          const isCollapsed = collapsedIds.includes(p.id);

          return (
            <div key={p.id} style={card}>
              {/* Header with collapse triangle */}
              <div
                style={{ ...cardHeader, cursor: "pointer" }}
                onClick={() => toggleCollapse(p.id)}
        
              >
                <div>
                  <span style={cardDate}>{formatDate(p.date)}</span>{" "}
                  <span style={cardVenue}>{p.venue}</span>
                </div>
                <div style={{ fontSize: "18px", color: "#25e317" }}>{isCollapsed ? "▼" : "▲"}</div>
              
              </div>

              {/* Songs content */}
              {!isCollapsed && (
                <div
                  style={{
                    ...songContainer,
                    gap: isMobile ? "6px" : "10px",
                    gridTemplateColumns: isMobile
                      ? "repeat(2, 1fr)"
                      : "repeat(auto-fit, minmax(140px, 1fr))",
                  }}
                >
                  {songFields.map((f, idx) => {
                    if (isMobile && !isExpanded && idx > 3) return null;

                    return (
                      <div
                        key={f.key}
                        style={{
                          ...songItem,
                          padding: isMobile ? "10px 8px" : "22px",
                        }}
                      >
                        <div
                          style={{
                            ...songIcon,
                            fontSize: isMobile ? "16px" : "24px",
                            marginBottom: isMobile ? "4px" : "10px",
                          }}
                        >
                          {f.icon}
                        </div>

                        <div
                          style={{
                            ...songLabel,
                            fontSize: isMobile ? "12px" : "17px",
                            marginBottom: "2px",
                          }}
                        >
                          {f.label}
                        </div>

                        <div
                          style={{
                            ...songValue,
                            fontSize: isMobile ? "13px" : "18px",
                          }}
                        >
                          {p[f.key] || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mobile expand button */}
              {isMobile && !isCollapsed && (
                <div style={{ textAlign: "center", marginTop: "6px" }}>
                  <button style={expandButton} onClick={() => toggleExpand(p.id)}>
                    {isExpanded ? "Show Less" : "View All"}
                  </button>
                </div>
              )}

              {/* Share button */}
              {!isCollapsed && (
                <div style={{ textAlign: "right", marginTop: "8px" }}>
                  <button style={shareButton} onClick={() => shareProgram(p)}>
                    <FiShare2 size={16} /> Share
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- STYLES (UNCHANGED COLORS) ---------------- */

// (All your previous styles remain exactly the same)

/* ---------------- STYLES (UNCHANGED COLORS) ---------------- */

const container = {
  padding: "30px 15px",
  fontFamily: "'Segoe UI', sans-serif",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #33394431, #20618457)",
  boxShadow: "0 20px 40px rgba(39, 158, 142, 0.74)",
  minHeight: "10vh",
};

const title = {
  textAlign: "center",
  fontSize: "2.2rem",
  fontWeight: 700,
  color: "#ffffff59",
  marginBottom: "0px",
};

const programList = {
  display: "flex",
  flexDirection: "column",
  gap: "25px",
  maxWidth: "1000px",
  margin: "0 auto",
};

const card = {
  borderRadius: "25px",
  padding: "12px",
  maxWidth: "1600px",
  backdropFilter: "blur(22px)",
  background: "rgba(255, 255, 255, 0)",
  boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
  border: "5px solid rgba(255, 255, 255, 0.2)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
};

const cardDate = {
  fontWeight: 700,
  fontSize: "1.3rem",
  color: "#ffd700",
};

const cardVenue = {
  fontStyle: "italic",
  fontSize: "1rem",
  color: "#ffffff",
};

const songContainer = {
  display: "grid",
  marginTop: "15px",
};

const songItem = {
  borderRadius: "15px",
  background: "rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(6px)",
  textAlign: "center",
};

const songIcon = {
  color: "#daf485",
};

const songLabel = {
  fontWeight: 800,
  color: "#f7d461fb",
};

const songValue = {
  fontWeight: 900,
  color: "#fbf9f9",
};

const shareButton = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  padding: "5px 10px",
  borderRadius: "8px",
  border: "none",
  background: "#ffd700",
  color: "#000",
  fontWeight: 600,
  cursor: "pointer",
};

const expandButton = {
  padding: "6px 12px",
  borderRadius: "10px",
  border: "none",
  background: "rgba(245, 231, 231, 0.96)",
  fontWeight: 600,
  cursor: "pointer",
};