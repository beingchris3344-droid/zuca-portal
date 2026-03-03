// frontend/src/pages/JumuiaContributions.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

const JumuiaContributions = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/contributions/jumuia");
        setContributions(res.data);
      } catch (err) {
        console.error("Fetch Contributions Error:", err.response || err);
        setError(err.response?.data?.error || "Failed to fetch contributions");
      } finally {
        setLoading(false);
      }
    };
    fetchContributions();
  }, []);

  if (loading)
    return <p style={{ textAlign: "center", fontSize: "1.2rem" }}>Loading contributions...</p>;
  if (error)
    return (
      <p style={{ color: "red", textAlign: "center", fontSize: "1.2rem" }}>
        {error}
      </p>
    );

  return (
    <div style={container}>
      <h1 style={title}>Jumuia Contributions</h1>
      {contributions.length === 0 ? (
        <p style={subtitle}>No contributions found for your Jumuiya.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead style={thead}>
              <tr>
                <th style={th}>Title</th>
                <th style={th}>Description</th>
                <th style={th}>Amount Required</th>
                <th style={th}>Amount Paid</th>
                <th style={th}>Pending</th>
                <th style={th}>Status</th>
                <th style={th}>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => {
                const tokenUserId = JSON.parse(atob(localStorage.getItem("token").split(".")[1])).userId;
                const userPledge = c.pledges.find((p) => p.user.id === tokenUserId);
                return (
                  <tr key={c.id} style={tr}>
                    <td style={td}>{c.title}</td>
                    <td style={td}>{c.description || "-"}</td>
                    <td style={td}>{c.amountRequired}</td>
                    <td style={{ ...td, fontWeight: "bold" }}>{userPledge?.amountPaid || 0}</td>
                    <td style={{ ...td, fontWeight: "bold" }}>{userPledge?.pendingAmount || 0}</td>
                    <td style={{ ...td, color: userPledge?.status === "COMPLETED" ? "#00b894" : "#fdcb6e" }}>
                      {userPledge?.status || "PENDING"}
                    </td>
                    <td style={td}>{c.deadline ? new Date(c.deadline).toLocaleDateString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ===== STYLES =====
const container = {
  padding: "2rem",
  maxWidth: "1200px",
  margin: "0 auto",
  fontFamily: "'Inter', sans-serif",
  color: "#f4f4f5",
};

const title = {
  fontSize: "2rem",
  marginBottom: "0.5rem",
  textAlign: "center",
};

const subtitle = {
  textAlign: "center",
  opacity: 0.8,
  marginBottom: "1rem",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.95rem",
};

const thead = {
  background: "linear-gradient(90deg, #4e73df, #00cec9)",
  color: "#fff",
};

const th = {
  padding: "12px 15px",
  textAlign: "left",
  fontWeight: "600",
};

const tr = {
  background: "rgba(24,23,28,0.6)",
  transition: "background 0.2s, transform 0.2s",
  cursor: "default",
};

const td = {
  padding: "10px 12px",
};

export default JumuiaContributions;