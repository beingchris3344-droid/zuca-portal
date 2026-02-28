// frontend/src/pages/Contributions.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../api";
import backgroundImg from "../assets/background.png";

function Contributions() {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pledgeInputs, setPledgeInputs] = useState({}); // store amount and message per contribution

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/my-pledges`, { headers });
      setContributions(res.data);
    } catch (err) {
      console.error("Fetch Contributions Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Handle Pledge ====================
  const handlePledge = async (contributionId) => {
    const { amount, message } = pledgeInputs[contributionId] || {};

    if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount");

    const contribution = contributions.find((c) => c.id === contributionId);
    if (!contribution) return alert("Contribution type not found");

    const remaining = contribution.amountRequired - contribution.amountPaid - contribution.pendingAmount;
    if (parseFloat(amount) > remaining) return alert("Cannot pledge more than remaining amount");

    try {
      await axios.post(
        `${BASE_URL}/api/pledges/${contribution.contributionTypeId}`, // <-- Use contributionTypeId from backend
        { amount: parseFloat(amount), message: message || "" },
        { headers }
      );
      setPledgeInputs({ ...pledgeInputs, [contributionId]: { amount: "", message: "" } });
      fetchContributions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to pledge");
    }
  };

  if (loading) return <div style={styles.loading}>Loading Contributions...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Your Contributions</h1>

      {contributions.map((c) => {
        const remaining = c.amountRequired - c.amountPaid - c.pendingAmount;
        const completed = c.amountPaid >= c.amountRequired;

        return (
          <div key={c.id} style={styles.card}>
            {/* ===== CONTRIBUTION DETAILS ===== */}
            <h2>{c.title}</h2>
            <p>{c.description || "No description"}</p>
            <p>
              <strong>Amount Required:</strong> {c.amountRequired}
            </p>
            <p>
              <strong>Pending Approval:</strong> {c.pendingAmount} |{" "}
              <strong>Amount Paid:</strong> {c.amountPaid}
            </p>

            {/* ===== STATUS BARS ===== */}
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
                    width: `{(c.amountPaid / c.amountRequired) * 100}%`,
                    backgroundColor: "#10da64",
                  }}
                />
              </div>
            </div>

            {/* ===== PLEDGE INPUTS ===== */}
            {!completed && (
              <div style={styles.pledgeSection}>
                {/* Amount input */}
                <input
                  type="number"
                  placeholder={`Max: {remaining}`}
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

                {/* Message input */}
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

                <button style={styles.pledgeBtn} onClick={() => handlePledge(c.id)}>
                  Pledge
                </button>
              </div>
            )}

            {completed && <div style={styles.completedText}>✅ Contribution Completed!</div>}
          </div>
        );
      })}
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