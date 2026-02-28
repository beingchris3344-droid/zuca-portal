// frontend/src/pages/admin/AnnouncementsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../../api"; // centralized API URL

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Fetch Announcements Error:", err);
      setError("Failed to load announcements.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      return alert("Both Title & Content are required");
    }

    try {
      await axios.post(
        `${BASE_URL}/api/announcements`,
        { title: title.trim(), content: content.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle("");
      setContent("");
      fetchAnnouncements();
    } catch (err) {
      console.error("Add Announcement Error:", err);
      alert("Failed to add announcement");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await axios.delete(`${BASE_URL}/api/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAnnouncements();
    } catch (err) {
      console.error("Delete Announcement Error:", err);
      alert("Failed to delete announcement");
    }
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "2rem auto",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: "1rem", color: "#fdfdfd", }}>Create Announcement</h2>

      {/* Form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          style={textareaStyle}
        />
        <button onClick={handleAdd} style={buttonStyle}>
          Add Announcement
        </button>
      </div>

      {/* Existing Announcements */}
      <h3 style={{ marginBottom: "1rem", color: "#fefefe" }}>Existing Announcements</h3>

      {loading ? (
        <p>Loading announcements...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : announcements.length === 0 ? (
        <p style={{ textAlign: "center", color: "#fdf8f8" }}>No announcements yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {announcements.map((a) => (
            <div key={a.id} style={announcementCard}>
              <div>
                <h4 style={{ margin: 0, color: "#007bff" }}>{a.title}</h4>
                <p style={{ margin: "0.25rem 0", fontWeight: "700", color: "#070707" }}>{a.content}</p>
                <small style={{fontWeight: "700", color: "#000000" }}>
                  {new Date(a.createdAt).toLocaleString()}
                </small>
              </div>
              <button onClick={() => handleDelete(a.id)} style={deleteBtn}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- STYLES ----------
const inputStyle = {
  padding: "0.75rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "1rem",
  fontWeight: "700",
  outline: "none",
  transition: "border 0.2s",
};

const textareaStyle = { ...inputStyle, resize: "vertical" };

const buttonStyle = {
  padding: "0.85rem 0.5rem",
  borderRadius: "20px",
  backgroundColor: "#007bffa0",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: "1000",
  transition: "background 0.2s",
};

const announcementCard = {
  border: "1px solid #006eff",
  borderRadius: "8px",
  padding: "1rem",
  backgroundColor: "#f9f9f9",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  transition: "transform 0.2s",
};

const deleteBtn = {
  padding: "0.25rem 0.5rem",
  borderRadius: "4px",
  backgroundColor: "#ff011a",
  color: "#faf8fe",
  border: "none",
  cursor: "pointer",
  fontWeight: "1500",
  transition: "background 0.2s",
};