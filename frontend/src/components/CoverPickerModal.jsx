import React, { useState, useEffect, useRef } from "react";
import { FiX, FiUpload, FiCheck } from "react-icons/fi";
import axios from "axios";
import BASE_URL from "../api";

const CoverPickerModal = ({ onClose, onSelect, currentCoverUrl }) => {
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchCovers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BASE_URL}/api/covers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCovers(res.data.covers || []);
      } catch (err) {
        console.error("Failed to load covers", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCovers();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cover", file);

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${BASE_URL}/api/covers/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setCovers((prev) => [res.data.cover, ...prev]);
      onSelect(res.data.cover.url);
      onClose();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid #e5e5e5"
        }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Select Cover</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#0f0f0f",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: "12.5px",
                fontWeight: 600,
                opacity: uploading ? 0.6 : 1
              }}
            >
              <FiUpload size={14} />
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleUpload}
              style={{ display: "none" }}
            />
            <button
              onClick={onClose}
              style={{
                background: "#f5f5f5",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                padding: "8px",
                cursor: "pointer"
              }}
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#737373" }}>Loading...</p>
          ) : covers.length === 0 ? (
            <p style={{ textAlign: "center", color: "#737373" }}>No covers yet. Upload one!</p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "12px"
            }}>
              {covers.map((cover) => {
                const isSelected = currentCoverUrl === cover.url;
                return (
                  <div
                    key={cover.id}
                    onClick={() => { onSelect(cover.url); onClose(); }}
                    style={{
                      cursor: "pointer",
                      border: isSelected ? "3px solid #0f0f0f" : "1px solid #e5e5e5",
                      borderRadius: "10px",
                      overflow: "hidden",
                      position: "relative"
                    }}
                  >
                    <img
                      src={cover.url}
                      alt="Cover"
                      style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }}
                    />
                    {isSelected && (
                      <div style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "#0f0f0f",
                        color: "#fff",
                        borderRadius: "50%",
                        padding: "4px"
                      }}>
                        <FiCheck size={12} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverPickerModal;