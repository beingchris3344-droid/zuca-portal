// frontend/src/pages/admin/JumuiaManagement.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../api"; // axios instance with auth headers

export default function JumuiaManagement() {
  const [jumuiaList, setJumuiaList] = useState([]);
  const [expandedJumuia, setExpandedJumuia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);

  const tdStyle = { padding: "8px", border: "1px solid #ccc" };
  const removeBtnStyle = {
    padding: "4px 8px",
    border: "none",
    borderRadius: "4px",
    backgroundColor: "#e67e22",
    color: "white",
    cursor: "pointer",
  };

  // Fetch all Jumuia and their members
  useEffect(() => {
    const fetchJumuia = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/jumuia"); // get all Jumuia
        const dataWithMembers = await Promise.all(
          res.data.map(async (j) => {
            const membersRes = await api.get(`/api/admin/jumuia/${j.id}/users`);
            return { ...j, members: membersRes.data };
          })
        );
        setJumuiaList(dataWithMembers);
      } catch (err) {
        console.error("Fetch Jumuia Error:", err);
        setError("Failed to fetch Jumuia and members.");
      } finally {
        setLoading(false);
      }
    };

    fetchJumuia();
  }, []);

  const toggleExpand = (id) => {
    setExpandedJumuia(expandedJumuia === id ? null : id);
  };

  // Remove member from a Jumuia
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from the Jumuia?")) return;
    setUpdatingMemberId(userId);
    try {
      await api.patch(`/api/admin/jumuia/${userId}`, { jumuiaId: null });
      setJumuiaList(jumuiaList.map((ju) => ({
        ...ju,
        members: ju.members.filter((m) => m.id !== userId),
      })));
    } catch (err) {
      console.error("Remove Member Error:", err.response || err);
      alert("Failed to remove member.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Move member to another Jumuia
  const handleMoveMember = async (userId, newJumuiaId) => {
    setUpdatingMemberId(userId);
    try {
      await api.patch(`/api/admin/jumuia/${userId}`, { jumuiaId: newJumuiaId });
      // Refresh member lists
      const membersRes = await api.get(`/api/admin/jumuia/${newJumuiaId}/users`);
      setJumuiaList(jumuiaList.map((ju) => ({
        ...ju,
        members: ju.id === newJumuiaId
          ? membersRes.data
          : ju.members.filter(m => m.id !== userId),
      })));
    } catch (err) {
      console.error("Move Member Error:", err.response || err);
      alert("Failed to move member.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Compute totals
  const totalJumuia = jumuiaList.length;
  const totalMembers = jumuiaList.reduce((sum, j) => sum + j.members.length, 0);

  if (loading) return <p>Loading Jumuia...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2>Manage Jumuia & Members</h2>

      {/* Summary Bar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "10px 16px",
          backgroundColor: "#f1f1f1",
          borderRadius: "8px",
          fontWeight: "700",
        }}
      >
        <div>Total Jumuia: {totalJumuia}</div>
        <div>Total Members: {totalMembers}</div>
      </div>

      {jumuiaList.map((j) => (
        <div key={j.id} style={{ border: "1px solid #ccc", borderRadius: "10px" }}>
          {/* Jumuia Header */}
          <div
            onClick={() => toggleExpand(j.id)}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              backgroundColor: "#4e73df",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopLeftRadius: "10px",
              borderTopRightRadius: "10px",
            }}
          >
            <span>{j.name} ({j.members.length} members)</span>
            <span>{expandedJumuia === j.id ? "▲" : "▼"}</span>
          </div>

          {/* Members Table */}
          {expandedJumuia === j.id && (
            <div style={{ padding: "16px", backgroundColor: "#f9f9f9", overflowX: "auto" }}>
              {j.members.length === 0 ? (
                <p>No members in this Jumuia.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#ddd" }}>
                      <th style={tdStyle}>Name</th>
                      <th style={tdStyle}>Email</th>
                      <th style={tdStyle}>Role</th>
                      <th style={tdStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {j.members.map((m) => (
                      <tr key={m.id}>
                        <td style={tdStyle}>{m.fullName}</td>
                        <td style={tdStyle}>{m.email}</td>
                        <td style={tdStyle}>{m.role}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {/* Move Member Dropdown */}
                            <select
                              disabled={updatingMemberId === m.id}
                              value={j.id}
                              onChange={(e) => handleMoveMember(m.id, e.target.value)}
                            >
                              {jumuiaList.map((ju) => (
                                <option key={ju.id} value={ju.id}>{ju.name}</option>
                              ))}
                            </select>

                            {/* Remove from Jumuia */}
                            <button
                              disabled={updatingMemberId === m.id}
                              onClick={() => handleRemoveMember(m.id)}
                              style={removeBtnStyle}
                            >
                              Remove
                            </button>

                            {/* Delete Member Completely */}
                            <button
                              disabled={updatingMemberId === m.id}
                              onClick={async () => {
                                if (!window.confirm(`Are you sure you want to delete ${m.fullName} completely?`)) return;
                                setUpdatingMemberId(m.id);
                                try {
                                  await api.delete(`/api/admin/user/${m.id}`);
                                  // Remove from UI
                                  setJumuiaList(jumuiaList.map(ju => ({
                                    ...ju,
                                    members: ju.members.filter(u => u.id !== m.id)
                                  })));
                                } catch (err) {
                                  console.error("Delete Member Error:", err.response || err);
                                  alert("Failed to delete member.");
                                } finally {
                                  setUpdatingMemberId(null);
                                }
                              }}
                              style={{
                                ...removeBtnStyle,
                                backgroundColor: "#c0392b", // red for delete
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}