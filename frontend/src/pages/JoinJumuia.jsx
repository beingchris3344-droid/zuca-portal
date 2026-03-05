// frontend/src/pages/JoinJumuia.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

const JoinJumuia = () => {
  const [jumuiaList, setJumuiaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedJumuia, setJoinedJumuia] = useState(null);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);

      const jRes = await api.get("/api/jumuia");
      setJumuiaList(jRes.data);

      const uRes = await api.get("/api/me");
      setJoinedJumuia(uRes.data?.jumuiaId || null);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  fetchData();

  // 🔥 Re-fetch whenever user returns to tab
  const handleFocus = () => fetchData();
  window.addEventListener("focus", handleFocus);

  return () => window.removeEventListener("focus", handleFocus);

}, []);

  const handleJoin = async (id, name) => {
    setJoiningId(id);
    try {
      const res = await api.patch("/api/join-jumuia", { jumuiaId: id });
     
      alert(`Successfully joined ${name}`);
    } catch (err) {
      console.error("Join Jumuia Error:", err.response || err);
      alert(err.response?.data?.error || "Failed to join Jumuia");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading)
    return <p style={{ textAlign: "center", fontSize: "1.2rem" }}>Loading Jumuias...</p>;
  if (error)
    return (
      <p style={{ color: "red", textAlign: "center", fontSize: "1.2rem" }}>
        {error}
      </p>
    );

  return (
    <div style={container}>
      <h1 style={title}>Join a Jumuia</h1>
      <p style={subtitle}>
        Select a Jumuia to join. You can only join one at a time.
      </p>

      <div style={grid}>
        {jumuiaList.map((j) => (
          <div key={j.id} style={card}>
            <h3 style={cardTitle}>{j.name}</h3>
            <button
              disabled={joinedJumuia || joiningId === j.id}
              onClick={() => handleJoin(j.id, j.name)}
              style={{
                ...button,
                background:
                  joinedJumuia
                    ? "#aaa"
                    : joiningId === j.id
                    ? "linear-gradient(90deg, #6c5ce7, #00b894)"
                    : "linear-gradient(90deg, #4e73df, #00cec9)",
                cursor:
                  joinedJumuia || joiningId === j.id
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {joinedJumuia === j.id
                ? "Joined"
                : joiningId === j.id
                ? "Joining..."
                : "Join"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ====== STYLES ======
const container = {
  padding: "2rem",
  maxWidth: "1200px",
  margin: "0 auto",
  fontFamily: "'Inter', sans-serif",
  color: "#f4f4f5",
};

const title = {
  fontSize: "2.2rem",
  marginBottom: "0.5rem",
  textAlign: "center",
};

const subtitle = {
  fontSize: "1rem",
  marginBottom: "2rem",
  textAlign: "center",
  opacity: 0.8,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1.5rem",
};

const card = {
  background:
    "linear-gradient(145deg, rgba(15, 7, 230, 0.89), rgba(75, 176, 134, 0.8))",
  padding: "1.5rem",
  borderRadius: "15px",
  boxShadow: "0 4px 20px rgba(255, 255, 255, 0.82)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const cardTitle = {
  marginBottom: "1rem",
  fontSize: "1.2rem",
  fontWeight: 600,
  color: "#fff",
  textAlign: "center",
};

const button = {
  padding: "0.6rem 1.2rem",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontWeight: "600",
  fontSize: "0.95rem",
  transition: "all 0.3s ease",
};

// hover effect for cards
Object.assign(card, {
  ":hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
  },
});

export default JoinJumuia;