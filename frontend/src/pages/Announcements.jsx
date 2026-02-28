// frontend/src/pages/Announcements.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../api";

export default function UserAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token"); // optional auth

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE_URL}/api/announcements`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setAnnouncements(res.data);
      } catch (err) {
        console.error("Announcements Error:", err);
        setError("Failed to load announcements.");
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [token]);

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h2
        style={{
          color: "#f4f4f5",
          fontSize: "1.8rem",
          borderBottom: "2px solid #fdfdfdf6",
          paddingBottom: "0.5rem",
        }}
      >
        Announcements
      </h2>

      {loading && <p>Loading announcements...</p>}
      {!loading && error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && announcements.length === 0 && !error && <p>No announcements yet.</p>}

      {!loading &&
        announcements.map((a) => (
          <div
            key={a.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "20px",
              padding: "1rem",
              background: "linear-gradient(135deg, #f5f7fa, #e4ebf2)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.26)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{a.title}</h3>
            <p style={{ margin: "0 0 0.5rem 0", color: "#252424", fontWeight: "800" }}>{a.content}</p>
            <small style={{ color: "#0a57f0",fontWeight: "700" }}>
              {new Date(a.createdAt).toLocaleString()}
            </small>
          </div>
        ))}
    </div>
  );
}