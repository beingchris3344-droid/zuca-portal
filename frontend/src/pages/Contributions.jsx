// frontend/src/pages/Contributions.jsx
import { useEffect, useState } from "react";
import { api } from "../api";
import backgroundImg from "../assets/background.webp";

function Contributions() {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  const [normalContributions, setNormalContributions] = useState([]);
  const [jumuiyaContributions, setJumuiyaContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pledgeInputs, setPledgeInputs] = useState({}); // store amount and message per pledge

  useEffect(() => {
    fetchContributions();
  }, []);

  // ==================== Fetch Contributions ====================
  const fetchContributions = async () => {
    setLoading(true);
    try {
      const normalRes = await api.get("/api/users/contributions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jumuiyaRes = await api.get("/api/users/jumuiya-contributions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNormalContributions(normalRes.data || []);
      setJumuiyaContributions(jumuiyaRes.data || []);
    } catch (err) {
      console.error("Fetch Contributions Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Handle Pledge ====================
  const handlePledge = async (pledge) => {
    const { id } = pledge;
    const { amount, message } = pledgeInputs[id] || {};
    if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount");

    try {
      await api.post(
        `/api/pledges/${id}`,
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

  // ==================== Render Single Contribution ====================
  const renderContributionCard = (contribution) => {
    // Flatten pledges if needed
    const pledges = contribution.pledges || [];

    return (
      <div key={contribution.id} style={styles.card}>
        <h2>{contribution.title}</h2>
        <p>{contribution.description || "No description"}</p>
        <p>
          <strong>Amount Required:</strong> {contribution.amountRequired}
        </p>

        {pledges.length === 0 && (
          <p style={{ marginTop: 10 }}>No pledges yet. You can pledge below.</p>
        )}

        {pledges.map((p) => {
          const remaining = contribution.amountRequired - p.amountPaid - p.pendingAmount;
          const completed = p.amountPaid >= contribution.amountRequired;

          return (
            <div key={p.id} style={{ marginTop: 20 }}>
              {/* Status Bars */}
              <div style={styles.statusBars}>
                <div style={styles.statusLabel}>Pending Approval</div>
                <div style={styles.barBackground}>
                  <div
                    style={{
                      ...styles.barForeground,
                      width: `${(p.pendingAmount / contribution.amountRequired) * 100}%`,
                      backgroundColor: "#f39c12",
                    }}
                  />
                </div>

                <div style={styles.statusLabel}>Amount Paid</div>
                <div style={styles.barBackground}>
                  <div
                    style={{
                      ...styles.barForeground,
                      width: `${(p.amountPaid / contribution.amountRequired) * 100}%`,
                      backgroundColor: "#11da64",
                    }}
                  />
                </div>
              </div>

              {/* Pledge Input */}
              {!completed && (
                <div style={styles.pledgeSection}>
                  <input
                    type="number"
                    placeholder={`Max: ${remaining}`}
                    style={styles.input}
                    value={pledgeInputs[p.id]?.amount || ""}
                    onChange={(e) =>
                      setPledgeInputs({
                        ...pledgeInputs,
                        [p.id]: { ...pledgeInputs[p.id], amount: e.target.value },
                      })
                    }
                    max={remaining}
                    min={1}
                  />
                  <input
                    type="text"
                    placeholder="Message to admin (optional)"
                    style={styles.input}
                    value={pledgeInputs[p.id]?.message || ""}
                    onChange={(e) =>
                      setPledgeInputs({
                        ...pledgeInputs,
                        [p.id]: { ...pledgeInputs[p.id], message: e.target.value },
                      })
                    }
                  />
                  <button style={styles.pledgeBtn} onClick={() => handlePledge(p)}>
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
  };

  // ==================== Render Page ====================
  if (loading) return <div style={styles.loading}>Loading Contributions...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Your Contributions</h1>

      <h2 style={{ marginTop: 20 }}>Normal Contributions</h2>
      {normalContributions.length === 0 && <p>No normal contributions yet.</p>}
      {normalContributions.map(renderContributionCard)}

      <h2 style={{ marginTop: 20 }}>Jumuiya Contributions</h2>
      {jumuiyaContributions.length === 0 && <p>No Jumuiya contributions yet.</p>}
      {jumuiyaContributions.map((j) =>
        j.contributions.map(renderContributionCard)
      )}
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
    fontSize: 22,
    padding: 50,
  },
  title: {
    fontSize: 32,
    marginBottom: 30,
  },
  card: {
    backdropFilter: "blur(12px)",
    background: "rgba(50,50,50,0.6)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  statusBars: {
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  barBackground: {
    width: "100%",
    height: 20,
    background: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    marginBottom: 10,
  },
  barForeground: {
    height: "100%",
    borderRadius: 10,
  },
  pledgeSection: {
    display: "flex",
    gap: 10,
    marginTop: 10,
  },
  input: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    border: "none",
  },
  pledgeBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#00ffd0",
    color: "#000",
    cursor: "pointer",
  },
  completedText: {
    color: "#27ae60",
    fontWeight: "bold",
    marginTop: 10,
  },
};

export default Contributions;