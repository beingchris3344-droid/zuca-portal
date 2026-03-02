// frontend/src/pages/JoinJumuiya.jsx
import { useEffect, useState } from "react";
import axios from "../api"; // your axios instance with baseURL & auth

export default function JoinJumuiya() {
  const [jumuiyas, setJumuiyas] = useState([]);
  const [userJoined, setUserJoined] = useState(false);
  const [joinedJumuiyaName, setJoinedJumuiyaName] = useState("");

  // Fetch all Jumuiyas and user info
  useEffect(() => {
    async function fetchData() {
      try {
        // Get all Jumuiyas
        const resJumuiyas = await axios.get("/api/jumuiyas");
        setJumuiyas(resJumuiyas.data);

        // Get current user info
        const resUser = await axios.get("/api/users/me");
        if (resUser.data.jumuiyaId) {
          setUserJoined(true);
          const joined = resJumuiyas.data.find(
            (j) => j.id === resUser.data.jumuiyaId
          );
          setJoinedJumuiyaName(joined?.name || "");
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    }

    fetchData();
  }, []);

  // Join button handler
  async function handleJoin(jumuiyaId, jumuiyaName) {
    try {
      await axios.post("/api/users/join-jumuiya", { jumuiyaId });
      alert(`Successfully joined ${jumuiyaName}!`);
      setUserJoined(true);
      setJoinedJumuiyaName(jumuiyaName);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to join Jumuiya");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Join a Jumuiya</h1>

      {userJoined && (
        <p>
          ✅ You have joined: <strong>{joinedJumuiyaName}</strong>
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {jumuiyas.map((j) => (
          <li
            key={j.id}
            style={{
              marginBottom: "10px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{j.name}</span>
            <button
              disabled={userJoined}
              onClick={() => handleJoin(j.id, j.name)}
              style={{
                padding: "5px 15px",
                backgroundColor: userJoined ? "#aaa" : "#4caf50",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: userJoined ? "not-allowed" : "pointer",
              }}
            >
              {userJoined ? "Joined" : "Join"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}