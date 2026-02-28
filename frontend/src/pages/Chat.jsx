import { useState } from "react";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      text: message,
      sender: "You",
      time: new Date().toLocaleTimeString(),
    };

    setMessages([...messages, newMessage]);
    setMessage("");
  };

  return (
    <div style={{ padding: "30px", color: "white" }}>
      <h2>💬 Member Chat</h2>

      <div
        style={{
          height: "400px",
          overflowY: "auto",
          background: "rgba(255,255,255,0.05)",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "15px",
        }}
      >
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            <strong>{msg.sender}</strong>:
            <p>{msg.text}</p>
            <small>{msg.time}</small>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "none",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#0fdd20ad",
            color: "white",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;