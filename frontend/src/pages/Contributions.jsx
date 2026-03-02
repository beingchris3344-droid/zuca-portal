// frontend/src/pages/Contributions.jsx
import { useEffect, useState } from "react";
import { api } from "../api"; // use your axios instance
import backgroundImg from "../assets/background.webp";

function Contributions() {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  const [normalContributions, setNormalContributions] = useState([]);
  const [jumuiyaContributions, setJumuiyaContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pledgeInputs, setPledgeInputs] = useState({}); // store amount and message per contribution

  useEffect(() => {
    fetchContributions();
  }, []);

  // ==================== Fetch Contributions ====================
  const fetchContributions = async () => {
    setLoading(true);
    try {
      const normalRes = await api.get("/api/users/contributions", { headers: { Authorization: `Bearer ${token}` } });
      const jumuiyaRes = await api.get("/api/users/jumuiya-contributions", { headers: { Authorization: `Bearer ${token}` } });

      setNormalContributions(normalRes.data || []);
      setJumuiyaContributions(jumuiyaRes.data || []);
    } catch (err) {
      console.error("Fetch Contributions Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Handle Pledge ====================
  const handlePledge = async (contribution) => {
    const { id, contributionTypeId, amountRequired, amountPaid, pendingAmount } = contribution;
    const { amount, message } = pledgeInputs[id] || {};

    if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount");

    const remaining = amountRequired - amountPaid - pendingAmount;
    if (parseFloat(amount) > remaining) return alert("Cannot pledge more than remaining amount");

    try {
      await api.post(
        `/api/pledges/${contributionTypeId}`,
        { amount: parseFloat(amount), message: message || "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPledgeInputs({ ...pledgeInputs, [id]: { amount: "", message: "" } });
      fetchContributions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to pledge");
    }
  };

  // ==================== Render Single Contribution Card ====================
  const renderContributionCard = (c) => {
    const remaining = c.amountRequired - c.amountPaid - c.pendingAmount;
    const completed = c.amountPaid >= c.amountRequired;

    return (
      <div key={c.id} style={styles.card}>
        <h2>{c.title}</h2>
        <p>{c.description || "No description"}</p>
        <p><strong>Amount Required:</strong> {c.amountRequired}</p>
        <p>
          <strong>Pending Approval:</strong> {c.pendingAmount} |{" "}
          <strong>Amount Paid:</strong> {c.amountPaid}
        </p>

        {/* STATUS BARS */}
        <div style={styles.statusBars}>
          <div style={styles.statusLabel}>Pending Approval</div>
          <div style={styles.barBackground}>
            <div
              style={{
                ...styles.barForeground,
                width: `${(c.pendingAmount / c.amountRequired) * 100}%`,
                backgroundColor: "#f39c12",
              }}
            />
          </div>

          <div style={styles.statusLabel}>Amount Paid</div>
          <div style={styles.barBackground}>
            <div
              style={{
                ...styles.barForeground,
                width: `${(c.amountPaid / c.amountRequired) * 100}%`,
                backgroundColor: "#11da64",
              }}
            />
          </div>
        </div>

        {/* PLEDGE INPUT */}
        {!completed && (
          <div style={styles.pledgeSection}>
            <input
              type="number"
              placeholder={`Max: ${remaining}`}
              style={styles.input}
              value={pledgeInputs[c.id]?.amount || ""}
              onChange={(e) =>
                setPledgeInputs({
                  ...pledgeInputs,
                  [c.id]: { ...pledgeInputs[c.id], amount: e.target.value },
                })
              }
              max={remaining}
              min={1}
            />

            <input
              type="text"
              placeholder="Message to admin (optional)"
              style={styles.input}
              value={pledgeInputs[c.id]?.message || ""}
              onChange={(e) =>
                setPledgeInputs({
                  ...pledgeInputs,
                  [c.id]: { ...pledgeInputs[c.id], message: e.target.value },
                })
              }
            />

            <button style={styles.pledgeBtn} onClick={() => handlePledge(c)}>
              Pledge
            </button>
          </div>
        )}

        {completed && <div style={styles.completedText}>✅ Contribution Completed!</div>}
      </div>
    );
  };

  // ==================== Render Page ====================
  if (loading) return <div style={styles.loading}>Loading Contributions...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Your Contributions</h1>

      <h2 style={{ marginTop: "20px" }}>Normal Contributions</h2>
      {normalContributions.length === 0 && <p>No normal contributions yet.</p>}
      {normalContributions.map(renderContributionCard)}

      <h2 style={{ marginTop: "20px" }}>Jumuiya Contributions</h2>
      {jumuiyaContributions.length === 0 && <p>No Jumuiya contributions yet.</p>}
      {jumuiyaContributions.map(renderContributionCard)}
    </div>
  );
}

/* ===== STYLES ===== */
const styles = {
  container: {
    padding: "30px",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#fff",
    background: `url(${backgroundImg}) no-repeat center center`,
    backgroundSize: "cover",
  },
  loading: {
    textAlign: "center",
    fontSize: "22px",
    padding: "50px",
  },
  title: {
    fontSize: "32px",
    marginBottom: "30px",
  },
  card: {
    backdropFilter: "blur(12px)",
    background: "rgba(50,50,50,0.6)",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "25px",
  },
  statusBars: {
    marginBottom: "15px",
  },
  statusLabel: {
    fontSize: "14px",
    marginBottom: "4px",
  },
  barBackground: {
    width: "100%",
    height: "20px",
    background: "rgba(255,255,255,0.2)",
    borderRadius: "10px",
    marginBottom: "10px",
  },
  barForeground: {
    height: "100%",
    borderRadius: "10px",
  },
  pledgeSection: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  },
  input: {
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    border: "none",
  },
  pledgeBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#00ffd0",
    color: "#000",
    cursor: "pointer",
  },
  completedText: {
    color: "#27ae60",
    fontWeight: "bold",
    marginTop: "10px",
  },
};

export default Contributions;