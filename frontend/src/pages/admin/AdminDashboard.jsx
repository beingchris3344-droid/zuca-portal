// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import backgroundImg from "../../assets/background.png";
import BASE_URL from "../../api";

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAnnouncements: 0,
    totalContributions: 0,
    totalSongs: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle
  const [usersCollapsed, setUsersCollapsed] = useState(false); // COLLAPSIBLE STATE

  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, usersRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats(statsRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Admin Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Delete User Error:", err);
      alert("Failed to delete user");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (loading) return <div style={styles.loading}>Loading Admin Dashboard...</div>;

  return (
    <div style={styles.container}>
      {/* ===== MOBILE SIDEBAR TOGGLE ===== */}
      <button style={styles.sidebarToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* ===== SIDEBAR ===== */}
      <div
        style={{
          ...styles.sidebar,
          left: sidebarOpen ? "0" : "-220px", // slide in/out
        }}
      >
        <h3 style={{ marginBottom: "20px" }}>Admin Menu</h3>
        <button onClick={handleLogout} style={styles.sidebarLogoutBtn}>
          Logout
        </button>
      </div>

      {/* ===== STATS ===== */}
      <div style={styles.statsGrid}>
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} style={styles.statCard}>
            <h3>{key.replace(/total/, "Total ").replace(/([A-Z])/g, " $1")}</h3>
            <p>{value}</p>
          </div>
        ))}
      </div>

      {/* ===== USERS TABLE ===== */}
      <div style={styles.tableContainer}>
        <h2 style={styles.tableTitle}>
          All Users
          <button
            onClick={() => setUsersCollapsed(!usersCollapsed)}
            style={styles.collapseBtn}
          >
            {usersCollapsed ? "Show" : "Hide"}
          </button>
        </h2>

        {!usersCollapsed && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.id.slice(0, 8)}...</td>
                    <td style={styles.td}>{user.fullName}</td>
                    <td style={styles.td} title={user.email}>
                      {user.email.length > 25 ? user.email.slice(0, 25) + "..." : user.email}
                    </td>
                    <td style={styles.td}>{user.role}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={styles.deleteBtn}
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
      </div>
    </div>
  );
}

/* ====== STYLES ====== */
const styles = {
  container: {
    flex: 1,
    minHeight: "100vh",
    padding: "40px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#fff",
    background: `url(${backgroundImg}) no-repeat center center`,
    backgroundSize: "cover",
    overflowY: "auto",
    position: "relative",
  },
  loading: {
    textAlign: "center",
    fontSize: "20px",
    padding: "50px",
  },

  /* ===== SIDEBAR ===== */
  sidebar: {
    position: "fixed",
    top: 0,
    left: "-220px",
    width: "200px",
    height: "100%",
    background: "rgba(50,50,50,0.9)",
    backdropFilter: "blur(10px)",
    padding: "20px",
    borderRadius: "0 10px 10px 0",
    transition: "left 0.3s ease",
    zIndex: 1000,
  },
  sidebarLogoutBtn: {
    padding: "8px 15px",
    borderRadius: "20px",
    border: "none",
    background: "#ff4d6d",
    color: "#fff",
    cursor: "pointer",
  },
  sidebarToggle: {
    display: "none",
    position: "fixed",
    top: "15px",
    left: "15px",
    padding: "10px",
    borderRadius: "50%",
    border: "none",
    background: "#00ffd0",
    fontSize: "20px",
    cursor: "pointer",
    zIndex: 1001,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  statCard: {
    padding: "25px",
    borderRadius: "20px",
    backdropFilter: "blur(12px)",
    background: "rgba(53, 45, 45, 0.47)",
    border: "1px solid rgba(37, 34, 34, 0.2)",
    textAlign: "center",
  },
  tableContainer: {
    backdropFilter: "blur(12px)",
    background: "rgba(50, 120, 195, 0.57)",
    border: "1px solid rgb(21, 226, 103)",
    borderRadius: "20px",
    padding: "25px",
  },
  tableWrapper: {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  tableTitle: {
    marginBottom: "15px",
    fontSize: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collapseBtn: {
    padding: "6px 12px",
    borderRadius: "12px",
    border: "none",
    background: "#00ffd0",
    color: "#000",
    cursor: "pointer",
    fontSize: "14px",
  },
  table: {
    width: "100%",
    minWidth: "600px",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "2px solid rgba(255,255,255,0.4)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    transition: "background 0.2s",
  },
  td: {
    padding: "12px",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    padding: "6px 12px",
    borderRadius: "12px",
    border: "none",
    background: "#ff4d6d",
    color: "#fff",
    cursor: "pointer",
  },

  /* ===== MEDIA QUERIES ===== */
  "@media(max-width: 768px)": {
    sidebarToggle: {
      display: "block",
    },
  },
};

export default AdminDashboard;