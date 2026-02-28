import { useState, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import BASE_URL, { api } from "../api";

export default function Notifications({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  // Fetch notifications for this user
  const fetchNotifications = async () => {
    try {
      const res = await api.get(`${BASE_URL}/api/notifications/${userId}`);
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: Poll every 30s for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    // Optional: send to backend to persist
    api.put(`${BASE_URL}/api/notifications/mark-read/${id}`).catch(console.error);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <FiBell />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "35px",
            width: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            background: "rgba(0,0,0,0.9)",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            zIndex: 100,
            color: "white",
            padding: "10px 0",
          }}
        >
          {notifications.length === 0 ? (
            <div style={{ padding: "10px", textAlign: "center", opacity: 0.7 }}>
              No notifications
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                style={{
                  padding: "10px 15px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  background: n.read ? "transparent" : "rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                <strong>{n.title}</strong>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>{n.message}</div>
                <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "4px" }}>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}