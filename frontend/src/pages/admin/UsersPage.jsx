// frontend/src/pages/admin/UsersPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../../api"; // centralized API URL

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalUser, setModalUser] = useState(null); // selected user for modal
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch Users Error:", err);
      setError("Failed to fetch users. Are you logged in as admin?");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      console.error("Delete User Error:", err);
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  const changeRole = async (id, newRole) => {
    try {
      await axios.put(
        `${BASE_URL}/api/users/${id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (err) {
      console.error("Change Role Error:", err);
      alert(err.response?.data?.error || "Role change failed");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>User Management</h1>

      {loading ? (
        <p style={styles.loading}>Loading users...</p>
      ) : error ? (
        <p style={{ color: "red", textAlign: "center" }}>{error}</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Profile</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Online</th>
                <th style={styles.th}>Change Role</th>
                <th style={styles.th}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.id.slice(0, 8)}...</td>

                  {/* ===== UPDATED PROFILE IMAGE LOGIC ===== */}
                  <td style={styles.td}>
                    {u.profileImage ? (
                      <img
                        src={
                          u.profileImage.startsWith("http")
                            ? u.profileImage
                            : `${BASE_URL}/${u.profileImage}`
                        }
                        alt="Profile"
                        style={styles.profileThumb}
                        onClick={() => setModalUser(u)}
                      />
                    ) : (
                      <div
                        style={styles.avatarFallback}
                        onClick={() => setModalUser(u)}
                      >
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      style={styles.viewBtn}
                      onClick={() => setModalUser(u)}
                    >
                      View
                    </button>
                  </td>

                  <td style={styles.td}>{u.fullName}</td>
                  <td style={{ ...styles.td, ...styles.email }} title={u.email}>
                    {u.email.length > 30 ? u.email.slice(0, 30) + "..." : u.email}
                  </td>
                  <td style={styles.td}>{u.role}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: u.online ? "#2ecc71" : "#e74c3c",
                        marginRight: "6px",
                      }}
                    />
                    {u.online ? "Online" : "Offline"}
                  </td>
                  <td style={styles.td}>
                    {u.role === "member" ? (
                      <button
                        style={{ ...styles.roleBtn, background: "#2ecc71" }}
                        onClick={() => changeRole(u.id, "admin")}
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button
                        style={{ ...styles.roleBtn, background: "#ff9800" }}
                        onClick={() => changeRole(u.id, "member")}
                      >
                        Make Member
                      </button>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => deleteUser(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== MODAL ===== */}
      {modalUser && (
        <div style={styles.modalOverlay} onClick={() => setModalUser(null)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ===== UPDATED MODAL PROFILE IMAGE ===== */}
            {modalUser.profileImage ? (
              <img
                src={
                  modalUser.profileImage.startsWith("http")
                    ? modalUser.profileImage
                    : `${BASE_URL}/${modalUser.profileImage}`
                }
                alt="Profile"
                style={styles.modalImage}
              />
            ) : (
              <div style={styles.avatarFallbackLarge}>
                {modalUser.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <h2>{modalUser.fullName}</h2>
            <p>{modalUser.email}</p>
            <p>Role: {modalUser.role}</p>
            <button
              style={styles.closeBtn}
              onClick={() => setModalUser(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- STYLES ----------
const styles = {
  container: {
    padding: "20px",
    minHeight: "100vh",
    background: "linear-gradient(to right, #201d2db0, #928dab)",
    color: "#fff",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  title: {
    fontSize: "25px",
    marginBottom: "25px",
    textAlign: "center",
    letterSpacing: "1px",
  },
  loading: {
    textAlign: "center",
    fontSize: "18px",
  },
  tableContainer: {
    overflowX: "auto",
    borderRadius: "12px",
    background: "rgba(0,0,0,0.3)",
    padding: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },
  thead: {
    borderBottom: "2px solid rgba(255,255,255,0.4)",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    transition: "background 0.2s",
  },
  td: {
    padding: "12px",
    verticalAlign: "middle",
  },
  email: {
    maxWidth: "250px",
    wordWrap: "break-word",
  },
  profileThumb: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
    marginRight: "10px",
    cursor: "pointer",
    border: "2px solid #00ffd0",
  },
  avatarFallback: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#00ffd0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "10px",
  },
  avatarFallbackLarge: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "#00ffd0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    fontWeight: "bold",
    margin: "0 auto 20px",
  },
  viewBtn: {
    marginTop: "5px",
    padding: "4px 8px",
    background: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  deleteBtn: {
    padding: "6px 12px",
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    minWidth: "80px",
  },
  roleBtn: {
    padding: "6px 12px",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    minWidth: "80px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "#222",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    maxWidth: "400px",
    width: "90%",
    color: "#fff",
    position: "relative",
  },
  modalImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "20px",
    border: "3px solid #00ffd0",
  },
  closeBtn: {
    padding: "8px 16px",
    marginTop: "20px",
    background: "#ff4d6d",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};