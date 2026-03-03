// frontend/src/pages/admin/ContributionsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import backgroundImg from "../../assets/background.png";

function ContributionsPage() {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  const [contributionTypes, setContributionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContribution, setNewContribution] = useState({
    title: "",
    description: "",
    amountRequired: "",
  });
  const [pledgeInputs, setPledgeInputs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPledges, setSelectedPledges] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [typesRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/contribution-types`, { headers }),
      ]);
      setContributionTypes(typesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContributionType = async () => {
    if (!newContribution.title || !newContribution.amountRequired) {
      alert("Title & Amount required");
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/contribution-types`,
        {
          title: newContribution.title,
          description: newContribution.description,
          amountRequired: parseFloat(newContribution.amountRequired),
        },
        { headers }
      );
      setNewContribution({ title: "", description: "", amountRequired: "" });
      fetchAll();
    } catch {
      alert("Failed to create contribution");
    }
  };

  const handleDeleteContributionType = async (id) => {
    if (!window.confirm("Delete this contribution type?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/contribution-types/${id}`, { headers });
      fetchAll();
    } catch {
      alert("Failed to delete contribution type");
    }
  };

  const handleApprovePledge = async (pledgeId, p, type) => {
    const totalAfterApprove = p.amountPaid + p.pendingAmount;
    if (totalAfterApprove > type.amountRequired) {
      return alert("Cannot approve: would exceed required amount");
    }
    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/approve`, {}, { headers });
      fetchAll();
    } catch {
      alert("Failed to approve pledge");
    }
  };

  const handleManualAdd = async (pledgeId, p, type) => {
    const addAmount = parseFloat(pledgeInputs[pledgeId]?.amount || 0);
    if (!addAmount || addAmount <= 0) return;

    const totalAfterAdd = p.amountPaid + p.pendingAmount + addAmount;
    if (totalAfterAdd > type.amountRequired) {
      return alert("Cannot add: would exceed required amount");
    }

    try {
      await axios.put(
        `${BASE_URL}/api/pledges/${pledgeId}/manual-add`,
        { amount: addAmount },
        { headers }
      );
      setPledgeInputs({
        ...pledgeInputs,
        [pledgeId]: { ...pledgeInputs[pledgeId], amount: "" },
      });
      fetchAll();
    } catch {
      alert("Failed to add manually");
    }
  };

  const handleEditMessage = async (pledgeId) => {
    const msg = pledgeInputs[pledgeId]?.message;
    if (msg === undefined) return;

    try {
      await axios.put(
        `${BASE_URL}/api/pledges/${pledgeId}/edit-message`,
        { message: msg },
        { headers }
      );
      fetchAll();
    } catch {
      alert("Failed to update message");
    }
  };

  const handleResetPledge = async (pledgeId) => {
    if (!window.confirm("Reset this pledge?")) return;
    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/reset`, {}, { headers });
      fetchAll();
    } catch {
      alert("Failed to reset pledge");
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedPledges.length) return alert("Select pledges first");

    try {
      await Promise.all(
        selectedPledges.map((id) =>
          axios.put(`${BASE_URL}/api/pledges/${id}/approve`, {}, { headers })
        )
      );
      setSelectedPledges([]);
      setSelectAll(false);
      fetchAll();
    } catch {
      alert("Bulk approve failed");
    }
  };

  const toggleSelectPledge = (id) => {
    setSelectedPledges((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPledges([]);
    } else {
      const allIds = [];
      contributionTypes.forEach((type) => {
        type.pledges.forEach((p) => {
          if (p.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) {
            allIds.push(p.id);
          }
        });
      });
      setSelectedPledges(allIds);
    }
    setSelectAll(!selectAll);
  };

  if (loading) return <div style={styles.loading}>Loading Contributions...</div>;

  return (
    <div style={styles.container}>
      {/* ===== New Contribution Form ===== */}
      <div style={styles.newContribution}>
        <h2 style={styles.sectionTitle}>Add New Contribution Type</h2>
        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Title"
            value={newContribution.title}
            onChange={(e) =>
              setNewContribution({ ...newContribution, title: e.target.value })
            }
          />
          <input
            style={styles.input}
            placeholder="Description"
            value={newContribution.description}
            onChange={(e) =>
              setNewContribution({ ...newContribution, description: e.target.value })
            }
          />
          <input
            style={styles.input}
            type="number"
            placeholder="Amount Required"
            value={newContribution.amountRequired}
            onChange={(e) =>
              setNewContribution({
                ...newContribution,
                amountRequired: e.target.value,
              })
            }
          />
        </div>
        <button style={styles.addBtn} onClick={handleAddContributionType}>
          Add Contribution
        </button>
      </div>

      {/* ===== Search + Bulk Approve ===== */}
      <input
        style={{ ...styles.input, marginBottom: 20 }}
        placeholder="Search members..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {selectedPledges.length > 0 && (
        <button style={styles.bulkBtn} onClick={handleBulkApprove}>
          Approve Selected ({selectedPledges.length})
        </button>
      )}

      {/* ===== Contribution Types ===== */}
      {contributionTypes.map((type) => {
        const filteredPledges = type.pledges.filter((p) =>
          p.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const isCollapsed = collapsed[type.id];

        return (
          <div key={type.id} style={styles.contributionCard}>
            <div style={styles.cardHeader}>
              <h3
                style={styles.cardTitle}
                onClick={() =>
                  setCollapsed({ ...collapsed, [type.id]: !isCollapsed })
                }
              >
                {type.title} - {type.amountRequired} {isCollapsed ? "▼" : "▲"}
              </h3>
              <button
                style={styles.deleteBtn}
                onClick={() => handleDeleteContributionType(type.id)}
              >
                Delete
              </button>
            </div>

            {!isCollapsed && (
              <>
                <p>{type.description}</p>
                <div style={styles.tableOuter}>
                  <div style={styles.tableScrollY}>
                    <table style={styles.table}>
                      <thead style={styles.thead}>
                        <tr>
                          <th style={styles.th}>Select</th>
                          <th style={styles.th}>User</th>
                          <th style={styles.th}>Pending</th>
                          <th style={styles.th}>Paid</th>
                          <th style={styles.th}>Message</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPledges.map((p) => {
                          const completed =
                            p.amountPaid + p.pendingAmount >= type.amountRequired;

                          return (
                            <>
                              <tr key={p.id}>
                                <td style={styles.tdCenter}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPledges.includes(p.id)}
                                    onChange={() => toggleSelectPledge(p.id)}
                                  />
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.userCard}>
                                    <strong>{p.user.fullName}</strong>
                                  </div>
                                </td>
                                <td style={styles.td}>{p.pendingAmount}</td>
                                <td style={styles.td}>{p.amountPaid}</td>
                                <td style={styles.td}>{p.message || "-"}</td>
                                <td style={styles.td}>{p.status}</td>
                                <td style={styles.td}>
                                  {completed ? (
                                    <div style={styles.completedText}>✅ Completed</div>
                                  ) : (
                                    <div style={styles.actionPlaceholder}></div>
                                  )}
                                </td>
                              </tr>

                              {/* Horizontal action row aligned right */}
                              {!completed && (
                                <tr>
                                  <td colSpan={7} style={styles.actionsRow}>
                                    <div style={styles.horizontalActionsRight}>
                                      {p.pendingAmount > 0 &&
                                        p.status === "PENDING" &&
                                        p.amountPaid + p.pendingAmount <=
                                          type.amountRequired && (
                                          <button
                                            style={styles.actionBtn}
                                            onClick={() =>
                                              handleApprovePledge(p.id, p, type)
                                            }
                                          >
                                            Approve
                                          </button>
                                        )}

                                      <input
                                        type="text"
                                        placeholder="Message"
                                        style={styles.inlineInputHorizontal}
                                        value={pledgeInputs[p.id]?.message || ""}
                                        onChange={(e) =>
                                          setPledgeInputs({
                                            ...pledgeInputs,
                                            [p.id]: {
                                              ...pledgeInputs[p.id],
                                              message: e.target.value,
                                            },
                                          })
                                        }
                                      />
                                      <button
                                        style={styles.actionBtn}
                                        onClick={() => handleEditMessage(p.id)}
                                      >
                                        Update
                                      </button>

                                      <input
                                        type="number"
                                        placeholder="Amount"
                                        style={styles.inlineInputHorizontal}
                                        value={pledgeInputs[p.id]?.amount || ""}
                                        onChange={(e) =>
                                          setPledgeInputs({
                                            ...pledgeInputs,
                                            [p.id]: {
                                              ...pledgeInputs[p.id],
                                              amount: e.target.value,
                                            },
                                          })
                                        }
                                      />
                                      <button
                                        style={styles.actionBtn}
                                        onClick={() => handleManualAdd(p.id, p, type)}
                                      >
                                        Add
                                      </button>

                                      <button
                                        style={{ ...styles.actionBtn, background: "#ff4d6d" }}
                                        onClick={() => handleResetPledge(p.id)}
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    padding: "clamp(16px, 4vw, 32px)",
    minHeight: "100vh",
    color: "#fff",
    background: `url(${backgroundImg}) no-repeat center center`,
    backgroundSize: "cover",
  },
  sectionTitle: { marginBottom: 20 },
  formGrid: {
    display: "grid",
    gap: 15,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginBottom: 20,
  },
  input: {
    padding: 14,
    borderRadius: 8,
    border: "none",
    fontWeight: 600,
    fontSize: 15,
    width: "100%",
  },
  newContribution: {
    backdropFilter: "blur(12px)",
    background: "rgba(0,0,0,0.6)",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  addBtn: {
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: "#1eff00",
    fontWeight: "bold",
    cursor: "pointer",
  },
  bulkBtn: {
    marginBottom: 20,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: "#ffb400",
    fontWeight: "bold",
    cursor: "pointer",
  },
  contributionCard: {
    backdropFilter: "blur(12px)",
    background: "rgba(50,50,50,0.6)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  cardTitle: {
    margin: 0,
    cursor: "pointer",
    fontSize: 18,
  },
  deleteBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: "#ff4d6d",
    color: "#fff",
    cursor: "pointer",
  },
  tableOuter: {
    overflowX: "auto",
    marginTop: 15,
  },
  tableScrollY: {
    maxHeight: 450,
    overflowY: "auto",
    position: "relative",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 700,
  },
  thead: {
    position: "sticky",
    top: 0,
    background: "rgba(0,0,0,0.9)",
    zIndex: 5,
  },
  th: {
    padding: "14px 12px",
    textAlign: "left",
    fontSize: 15,
    fontWeight: 700,
    borderBottom: "1px solid rgba(255,255,255,0.3)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "6px 12px",
    fontSize: 15,
    fontWeight: 500,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    whiteSpace: "nowrap",
  },
  tdCenter: {
    padding: "14px 12px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  userCard: {
    padding: 6,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 6,
  },
  actionsRow: { padding: 0 },
  horizontalActionsRight: {
    display: "flex",
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    alignItems: "center",
    padding: "4px 0",
  },
  inlineInputHorizontal: {
    padding: 6,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    width: 70,
    boxSizing: "border-box",
  },
  actionBtn: {
    padding: "6px 8px",
    borderRadius: 6,
    border: "none",
    background: "#32c50adb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 13,
  },
  completedText: { color: "#27ae60", fontWeight: "bold", marginTop: 4 },
  actionPlaceholder: { height: 40 },
  loading: { textAlign: "center", padding: 50, fontSize: 20 },
};

export default ContributionsPage;