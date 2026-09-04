import React, { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../api";
import { FiCalendar, FiUpload, FiCheck, FiImage, FiX } from "react-icons/fi";

export default function BirthdaySettings({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [optIn, setOptIn] = useState(user?.birthdayOptIn || false);
  const [birthDate, setBirthDate] = useState("");
  const [photo, setPhoto] = useState(user?.birthdayPhoto || null);
  const [message, setMessage] = useState(user?.birthdayMessage || "");
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (user?.birthDate) {
      const date = new Date(user.birthDate);
      setBirthDate(date.toISOString().split("T")[0]);
    }
    if (user?.birthdayPhoto) {
      setPhoto(user.birthdayPhoto);
    }
    if (user?.birthdayMessage) {
      setMessage(user.birthdayMessage);
    }
  }, [user]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoLoading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${BASE_URL}/api/birthday/upload-photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setPhoto(res.data.photoUrl);
      setPreview(URL.createObjectURL(file));
      setShowPreview(true);
      onUpdate(res.data.user);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.response?.data?.error || "Failed to upload photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove your birthday photo?")) return;
    setPhoto(null);
    setPreview(null);
    setShowPreview(false);
    
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/birthday/user-settings`, {
        birthdayPhoto: null
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const updatedUser = { ...user, birthdayPhoto: null };
      onUpdate(updatedUser);
    } catch (error) {
      console.error("Remove photo error:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const data = {
        birthdayOptIn: optIn,
        birthdayMessage: message,
      };

      if (birthDate) {
        data.birthDate = birthDate;
      }

      const res = await axios.put(`${BASE_URL}/api/birthday/user-settings`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onUpdate(res.data.user);
      alert("Birthday settings saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert(error.response?.data?.error || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Birthday Wishes</h3>
        <p style={styles.subtitle}>Get a birthday advert and wishes from the ZUCA community</p>
      </div>

      <div style={styles.optInSection}>
        <label style={styles.toggleWrapper} className="birthday-toggle-wrapper">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            style={styles.toggleInput}
            className="birthday-toggle-input"
          />
          <span style={styles.toggleSlider} className="birthday-toggle-slider"></span>
          <div style={styles.toggleText}>
            <strong style={styles.toggleLabel}>Yes, create a birthday advert for me</strong>
            <small style={styles.toggleHint}>Your birthday will be celebrated on the dashboard</small>
          </div>
        </label>
      </div>

      {optIn && (
        <>
          <div style={styles.formGroup}>
            <label style={styles.label}>Your Birthday</label>
            <div style={styles.inputWrapper}>
              <FiCalendar style={styles.inputIcon} />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="Select your birthday"
                style={styles.dateInput}
                className="birthday-date-input"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Your Photo</label>
            <div style={styles.photoUpload}>
              {photo ? (
                <div style={styles.photoPreview} className="birthday-photo-preview">
                  <img src={photo} alt="Birthday" style={styles.photoImg} />
                  <div style={styles.photoOverlay} className="birthday-photo-overlay">
                    <label style={styles.changePhotoBtn} className="birthday-change-photo-btn">
                      <FiUpload size={14} />
                      <span>Change Photo</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={styles.hiddenInput} />
                    </label>
                    <button onClick={handleRemovePhoto} style={styles.removePhotoBtn} className="birthday-remove-photo-btn">
                      <FiX size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label style={styles.uploadPlaceholder} className="birthday-upload-placeholder">
                  <FiImage size={32} style={styles.uploadIcon} />
                  <strong style={styles.uploadLabel}>Upload Your Photo</strong>
                  <span style={styles.uploadHint}>PNG, JPG, WEBP — Max 10MB</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={styles.hiddenInput} />
                </label>
              )}
              {photoLoading && <div style={styles.spinner}>Uploading...</div>}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Personal Message (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a personal message to be displayed on your birthday..."
              rows="3"
              style={styles.textarea}
              className="birthday-textarea"
            />
          </div>

          <div style={styles.previewSection}>
            <h4 style={styles.previewTitle}>Preview</h4>
            <div style={styles.previewCard}>
              <div style={styles.previewImage}>
                {photo ? (
                  <img src={photo} alt="Preview" style={styles.previewImg} />
                ) : (
                  <div style={styles.previewPlaceholder}>Your photo here</div>
                )}
              </div>
              <div style={styles.previewContent}>
                <span style={styles.previewLabel}>Happy Birthday!</span>
                <strong style={styles.previewName}>{user?.fullName}</strong>
                <p style={styles.previewMessage}>{message || "From all of us at ZUCA"}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        style={styles.saveBtn}
        onClick={handleSave}
        disabled={loading}
        className="birthday-save-btn"
      >
        {loading ? "Saving..." : "Save Birthday Settings"}
        <FiCheck size={16} />
      </button>

      <style>{`
        .birthday-toggle-wrapper:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .birthday-toggle-input:checked + .birthday-toggle-slider {
          background: #2563eb;
        }

        .birthday-toggle-input:checked + .birthday-toggle-slider::after {
          transform: translateX(20px);
        }

        .birthday-toggle-slider::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          transition: 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .birthday-date-input:focus,
        .birthday-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .birthday-photo-preview:hover .birthday-photo-overlay {
          opacity: 1;
        }

        .birthday-change-photo-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .birthday-remove-photo-btn:hover {
          background: rgba(220, 38, 38, 0.9);
        }

        .birthday-upload-placeholder:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .birthday-save-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .birthday-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    margin: "16px 0",
    border: "1px solid #e2e8f0",
  },
  header: {
    marginBottom: "16px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0",
  },
  optInSection: {
    margin: "16px 0",
  },
  toggleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    padding: "14px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s ease",
  },
  toggleInput: {
    display: "none",
  },
  toggleSlider: {
    position: "relative",
    width: "44px",
    height: "24px",
    flexShrink: "0",
    borderRadius: "999px",
    background: "#cbd5e1",
    transition: "0.2s ease",
  },
  toggleText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  toggleLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
  },
  toggleHint: {
    fontSize: "12px",
    color: "#64748b",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: "6px",
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  dateInput: {
    width: "100%",
    padding: "10px 12px 10px 40px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    transition: "0.2s ease",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    transition: "0.2s ease",
    boxSizing: "border-box",
    minHeight: "80px",
  },
  photoUpload: {
    position: "relative",
  },
  photoPreview: {
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    maxHeight: "200px",
  },
  photoImg: {
    width: "100%",
    height: "100%",
    maxHeight: "200px",
    objectFit: "cover",
    display: "block",
  },
  photoOverlay: {
    position: "absolute",
    bottom: "0",
    left: "0",
    right: "0",
    background: "rgba(15, 23, 42, 0.7)",
    padding: "12px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    opacity: "0",
    transition: "0.3s ease",
  },
  changePhotoBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "white",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 14px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.15)",
    transition: "0.2s ease",
    border: "none",
  },
  removePhotoBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "white",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 14px",
    borderRadius: "8px",
    background: "rgba(220, 38, 38, 0.7)",
    border: "none",
    transition: "0.2s ease",
  },
  uploadPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "160px",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
    cursor: "pointer",
    transition: "0.2s ease",
    padding: "20px",
    gap: "6px",
  },
  uploadIcon: {
    color: "#94a3b8",
  },
  uploadLabel: {
    fontSize: "14px",
    color: "#0f172a",
  },
  uploadHint: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  hiddenInput: {
    display: "none",
  },
  spinner: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(15, 23, 42, 0.8)",
    color: "white",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
  },
  previewSection: {
    margin: "16px 0",
  },
  previewTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: "10px",
  },
  previewCard: {
    display: "flex",
    gap: "16px",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #e2e8f0",
    alignItems: "center",
  },
  previewImage: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: "0",
    background: "#e2e8f0",
  },
  previewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  previewPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "#94a3b8",
    textAlign: "center",
  },
  previewContent: {
    flex: "1",
  },
  previewLabel: {
    fontSize: "12px",
    color: "#2563eb",
    fontWeight: "700",
    display: "block",
  },
  previewName: {
    fontSize: "16px",
    color: "#0f172a",
    display: "block",
  },
  previewMessage: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  saveBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s ease",
    marginTop: "8px",
  },
};