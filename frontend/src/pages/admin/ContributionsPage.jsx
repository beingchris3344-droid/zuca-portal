// frontend/src/pages/admin/ContributionsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import backgroundImg from "../../assets/background.png";

function ContributionsPage() {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  const [contributionTypes, setContributionTypes] = useState([]); // normal contributions
  const [jumuiyaContributions, setJumuiyaContributions] = useState({}); // {jumuiyaId: { contributions: [], collapsed: false }}
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newContribution, setNewContribution] = useState({ title: "", description: "", amountRequired: "" });
  const [newJumuiyaContribution, setNewJumuiyaContribution] = useState({}); // {jumuiyaId: { title, description, amountRequired }}

  const [selectedPledges, setSelectedPledges] = useState([]);
  const [pledgeInputs, setPledgeInputs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Jumuiyas fixed
  const jumuiyas = [
    { id: 1, name: "ST. PEREGRINE" },
    { id: 2, name: "ST. BENEDICT" },
    { id: 3, name: "CHRIST THE KING" },
    { id: 4, name: "ST. MICHAEL" },
    { id: 5, name: "ST. GREGORY" },
    { id: 6, name: "ST. PACIFICUS" },
  ];

  useEffect(() => {
    fetchAll();
    fetchJumuiyaContributions();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [typesRes, usersRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/contribution-types`, { headers }),
        axios.get(`${BASE_URL}/api/users`, { headers }),
      ]);
      setContributionTypes(typesRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJumuiyaContributions = async () => {
    try {
      const newState = {};
      for (const j of jumuiyas) {
        const res = await axios.get(`${BASE_URL}/api/admin/jumuiya/${j.id}/contributions`, { headers });
        newState[j.id] = { contributions: res.data.contributions, collapsed: true };
      }
      setJumuiyaContributions(newState);
      setNewJumuiyaContribution(
        jumuiyas.reduce((acc, j) => ({ ...acc, [j.id]: { title: "", description: "", amountRequired: "" } }), {})
      );
    } catch (err) {
      console.error("Fetch Jumuiya contributions error:", err);
    }
  };

  /* ===== Normal Contribution Functions (unchanged) ===== */
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

  const handleApprovePledge = async (pledgeId) => {
    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/approve`, {}, { headers });
      fetchAll();
    } catch {
      alert("Failed to approve pledge");
    }
  };

  const handleManualAdd = async (pledgeId) => {
    const amount = parseFloat(pledgeInputs[pledgeId]?.amount);
    if (!amount || amount <= 0) return;
    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/manual-add`, { amount }, { headers });
      setPledgeInputs({ ...pledgeInputs, [pledgeId]: { ...pledgeInputs[pledgeId], amount: "" } });
      fetchAll();
    } catch {
      alert("Failed to add manually");
    }
  };

  const handleEditMessage = async (pledgeId) => {
    const msg = pledgeInputs[pledgeId]?.message;
    if (msg === undefined) return;
    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/edit-message`, { message: msg }, { headers });
      fetchAll();
    } catch {
      alert("Failed to update message");
    }
  };

  const toggleSelectPledge = (id) => {
    setSelectedPledges((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPledges([]);
    } else {
      const allIds = [];
      contributionTypes.forEach((type) =>
        type.pledges.forEach((p) => {
          if (p.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) allIds.push(p.id);
        })
      );
      setSelectedPledges(allIds);
    }
    setSelectAll(!selectAll);
  };

  /* ===== Jumuiya Contribution Functions ===== */
  const handleAddJumuiyaContribution = async (jumuiyaId) => {
    const { title, description, amountRequired } = newJumuiyaContribution[jumuiyaId];
    if (!title || !amountRequired) return alert("Title & amount required");

    try {
      await axios.post(
        `${BASE_URL}/api/contribution-types`,
        { title, description, amountRequired: parseFloat(amountRequired), jumuiyaId },
        { headers }
      );
      setNewJumuiyaContribution({
        ...newJumuiyaContribution,
        [jumuiyaId]: { title: "", description: "", amountRequired: "" },
      });
      fetchJumuiyaContributions();
    } catch {
      alert("Failed to add Jumuiya contribution");
    }
  };

  const toggleJumuiyaCollapse = (jumuiyaId) => {
    setJumuiyaContributions({
      ...jumuiyaContributions,
      [jumuiyaId]: { ...jumuiyaContributions[jumuiyaId], collapsed: !jumuiyaContributions[jumuiyaId].collapsed },
    });
  };

  if (loading) return <div style={styles.loading}>Loading Contributions...</div>;

  return (
    <div style={styles.container}>
      {/* Normal Contributions */}
      <div style={styles.newContribution}>
        <h2 style={styles.sectionTitle}>Add New Contribution Type</h2>
        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Title"
            value={newContribution.title}
            onChange={(e) => setNewContribution({ ...newContribution, title: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Description"
            value={newContribution.description}
            onChange={(e) => setNewContribution({ ...newContribution, description: e.target.value })}
          />
          <input
            style={styles.input}
            type="number"
            placeholder="Amount Required"
            value={newContribution.amountRequired}
            onChange={(e) =>
              setNewContribution({ ...newContribution, amountRequired: e.target.value })
            }
          />
        </div>
        <button style={styles.addBtn} onClick={handleAddContributionType}>
          Add Contribution
        </button>
      </div>

      <input
        style={{ ...styles.input, marginBottom: 20 }}
        placeholder="Search members..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {selectedPledges.length > 0 && (
        <button style={styles.bulkBtn} onClick={() => {}}>
          Approve Selected ({selectedPledges.length})
        </button>
      )}

      {/* Normal Contributions Cards */}
      {contributionTypes.map((type) => {
        const filteredPledges = type.pledges.filter((p) =>
          p.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const isCollapsed = collapsed[type.id];

        return (
          <div key={type.id} style={styles.contributionCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle} onClick={() => setCollapsed({ ...collapsed, [type.id]: !isCollapsed })}>
                {type.title} - {type.amountRequired} {isCollapsed ? "▼" : "▲"}
              </h3>
              <button style={styles.deleteBtn} onClick={() => handleDeleteContributionType(type.id)}>
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
                        {filteredPledges.map((p) => (
                          <tr key={p.id}>
                            <td style={styles.tdCenter}>
                              <input
                                type="checkbox"
                                checked={selectedPledges.includes(p.id)}
                                onChange={() => toggleSelectPledge(p.id)}
                              />
                            </td>
                            <td style={styles.td}>{p.user.fullName}</td>
                            <td style={styles.td}>{p.pendingAmount}</td>
                            <td style={styles.td}>{p.amountPaid}</td>
                            <td style={styles.td}>{p.message || "-"}</td>
                            <td style={styles.td}>{p.status}</td>
                            <td style={styles.td}>
                              <div style={styles.actionWrap}>
                                <input
                                  type="number"
                                  placeholder="Add"
                                  style={styles.inlineInput}
                                  value={pledgeInputs[p.id]?.amount || ""}
                                  onChange={(e) =>
                                    setPledgeInputs({
                                      ...pledgeInputs,
                                      [p.id]: { ...pledgeInputs[p.id], amount: e.target.value },
                                    })
                                  }
                                />
                                <button style={styles.actionBtn} onClick={() => handleManualAdd(p.id)}>
                                  Add
                                </button>
                                <input
                                  type="text"
                                  placeholder="Message"
                                  style={styles.inlineInput}
                                  value={pledgeInputs[p.id]?.message || ""}
                                  onChange={(e) =>
                                    setPledgeInputs({
                                      ...pledgeInputs,
                                      [p.id]: { ...pledgeInputs[p.id], message: e.target.value },
                                    })
                                  }
                                />
                                <button style={styles.actionBtn} onClick={() => handleEditMessage(p.id)}>
                                  Update
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ===== Jumuiya Contributions ===== */}
      <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Jumuiya Contributions</h2>

      {jumuiyas.map((j) => {
        const jumuiya = jumuiyaContributions[j.id];
        if (!jumuiya) return null;

        return (
          <div key={j.id} style={styles.contributionCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle} onClick={() => toggleJumuiyaCollapse(j.id)}>
                {j.name} Contributions {jumuiya.collapsed ? "▼" : "▲"}
              </h3>
            </div>

            {!jumuiya.collapsed && (
              <>
                {/* Add Contribution for this Jumuiya */}
                <div style={styles.newContribution}>
                  <h4>Add Contribution to {j.name}</h4>
                  <div style={styles.formGrid}>
                    <input
                      style={styles.input}
                      placeholder="Title"
                      value={newJumuiyaContribution[j.id]?.title || ""}
                      onChange={(e) =>
                        setNewJumuiyaContribution({
                          ...newJumuiyaContribution,
                          [j.id]: { ...newJumuiyaContribution[j.id], title: e.target.value },
                        })
                      }
                    />
                    <input
                      style={styles.input}
                      placeholder="Description"
                      value={newJumuiyaContribution[j.id]?.description || ""}
                      onChange={(e) =>
                        setNewJumuiyaContribution({
                          ...newJumuiyaContribution,
                          [j.id]: { ...newJumuiyaContribution[j.id], description: e.target.value },
                        })
                      }
                    />
                    <input
                      style={styles.input}
                      type="number"
                      placeholder="Amount Required"
                      value={newJumuiyaContribution[j.id]?.amountRequired || ""}
                      onChange={(e) =>
                        setNewJumuiyaContribution({
                          ...newJumuiyaContribution,
                          [j.id]: { ...newJumuiyaContribution[j.id], amountRequired: e.target.value },
                        })
                      }
                    />
                  </div>
                  <button style={styles.addBtn} onClick={() => handleAddJumuiyaContribution(j.id)}>
                    Add Contribution
                  </button>
                </div>

                {/* Contributions Table */}
                {jumuiya.contributions.map((c) => (
                  <div key={c.id} style={{ marginTop: 20 }}>
                    <h4>{c.title} - {c.amountRequired}</h4>
                    <div style={styles.tableOuter}>
                      <div style={styles.tableScrollY}>
                        <table style={styles.table}>
                          <thead style={styles.thead}>
                            <tr>
                              <th style={styles.th}>User</th>
                              <th style={styles.th}>Pending</th>
                              <th style={styles.th}>Paid</th>
                              <th style={styles.th}>Message</th>
                              <th style={styles.th}>Status</th>
                              <th style={styles.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.pledges.map((p) => (
                              <tr key={p.id}>
                                <td style={styles.td}>{p.userName}</td>
                                <td style={styles.td}>{p.pendingAmount}</td>
                                <td style={styles.td}>{p.amountPaid}</td>
                                <td style={styles.td}>{p.message || "-"}</td>
                                <td style={styles.td}>{p.status}</td>
                                <td style={styles.td}>
                                  <div style={styles.actionWrap}>
                                    <input
                                      type="number"
                                      placeholder="Add"
                                      style={styles.inlineInput}
                                      value={pledgeInputs[p.id]?.amount || ""}
                                      onChange={(e) =>
                                        setPledgeInputs({
                                          ...pledgeInputs,
                                          [p.id]: { ...pledgeInputs[p.id], amount: e.target.value },
                                        })
                                      }
                                    />
                                    <button style={styles.actionBtn} onClick={() => handleManualAdd(p.id)}>
                                      Add
                                    </button>
                                    <input
                                      type="text"
                                      placeholder="Message"
                                      style={styles.inlineInput}
                                      value={pledgeInputs[p.id]?.message || ""}
                                      onChange={(e) =>
                                        setPledgeInputs({
                                          ...pledgeInputs,
                                          [p.id]: { ...pledgeInputs[p.id], message: e.target.value },
                                        })
                                      }
                                    />
                                    <button style={styles.actionBtn} onClick={() => handleEditMessage(p.id)}>
                                      Update
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: "clamp(16px, 4vw, 32px)",
    minHeight: "100vh",
    color: "#fff",
    background: `url(${backgroundImg}) no-repeat center center`,
    backgroundSize: "cover",
  },

  sectionTitle: {
    marginBottom: 20,
  },

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
    minWidth: 950,
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
    padding: "0px 12px",
    fontSize: 17,
    fontWeight: 700,
    borderBottom: "9px solid rgba(255,255,255,0.1)",
    whiteSpace: "nowrap",
  },

  tdCenter: {
    padding: "14px 12px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },

  actionWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  inlineInput: {
    padding: 6,
    borderRadius: 6,
    border: "1px solid #ccc",
    minWidth: 90,
    fontSize: 14,
  },

  actionBtn: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
    background: "#32c50adb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  loading: {
    textAlign: "center",
    padding: 50,
    fontSize: 20,
  },
};

export default ContributionsPage;