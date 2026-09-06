import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import {
  FiArrowLeft,
  FiCalendar,
  FiImage,
  FiCheck,
  FiX,
  FiUpload,
  FiMaximize2,
} from "react-icons/fi";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [showFullImage, setShowFullImage] = useState(false);

  // ============================================================
  // FETCH USER DATA
  // ============================================================
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await axios.get(`${BASE_URL}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = res.data;

        setUser(userData);
        setOptIn(userData.birthdayOptIn || false);
        setMessage(userData.birthdayMessage || "");
        setPhoto(userData.birthdayPhoto || null);

        if (userData.birthDate) {
          const date = new Date(userData.birthDate);
          setBirthDate(date.toISOString().split("T")[0]);
        }

        localStorage.setItem("user", JSON.stringify(userData));
      } catch (err) {
        console.error("Error fetching user data:", err);

        const userData = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        setUser(userData);
        setOptIn(userData.birthdayOptIn || false);
        setMessage(userData.birthdayMessage || "");
        setPhoto(userData.birthdayPhoto || null);

        if (userData.birthDate) {
          const date = new Date(userData.birthDate);
          setBirthDate(date.toISOString().split("T")[0]);
        }
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // ============================================================
  // CREATE 16:9 BIRTHDAY IMAGE
  // ============================================================
  const createBirthdayImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // ----------------------------------------------------
          // FINAL IMAGE SIZE
          // ----------------------------------------------------
          const canvas = document.createElement("canvas");

          canvas.width = 1920;
          canvas.height = 1080;

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Could not create canvas context");
          }

          // ----------------------------------------------------
          // BACKGROUND
          // Enlarged + blurred copy of original image
          // ----------------------------------------------------

          const bgScale = Math.max(
            canvas.width / img.width,
            canvas.height / img.height
          );

          const bgWidth = img.width * bgScale;
          const bgHeight = img.height * bgScale;

          const bgX = (canvas.width - bgWidth) / 2;
          const bgY = (canvas.height - bgHeight) / 2;

          ctx.save();

          // Blur the background
          ctx.filter = "blur(28px)";

          // Slightly enlarge it to prevent transparent edges
          ctx.drawImage(
            img,
            bgX - 40,
            bgY - 40,
            bgWidth + 80,
            bgHeight + 80
          );

          ctx.restore();

          // ----------------------------------------------------
          // SUBTLE DARK OVERLAY
          // Makes the center image stand out
          // ----------------------------------------------------

          ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          // ----------------------------------------------------
          // SHARP CENTER IMAGE
          // Keeps original proportions
          // ----------------------------------------------------

          const mainScale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );

          const mainWidth = img.width * mainScale;
          const mainHeight = img.height * mainScale;

          const mainX = (canvas.width - mainWidth) / 2;
          const mainY = (canvas.height - mainHeight) / 2;

          // No blur here
          ctx.filter = "none";

          ctx.drawImage(
            img,
            mainX,
            mainY,
            mainWidth,
            mainHeight
          );

          // ----------------------------------------------------
          // CONVERT CANVAS TO JPEG
          // ----------------------------------------------------

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);

              if (!blob) {
                reject(
                  new Error("Failed to create processed image")
                );
                return;
              }

              resolve(blob);
            },
            "image/jpeg",
            0.92
          );
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to load image"));
      };

      img.src = objectUrl;
    });
  };

  // ============================================================
  // SAVE BIRTHDAY SETTINGS
  // ============================================================
  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");

      const data = {
        birthdayOptIn: optIn,
        birthdayMessage: message,
      };

      if (birthDate) {
        data.birthDate = birthDate;
      }

      const res = await axios.put(
        `${BASE_URL}/api/birthday/user-settings`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = res.data.user;

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);

      setSuccess(
        "Birthday settings saved successfully!"
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to save settings"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PHOTO UPLOAD
  // ============================================================
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Allow the same image to be selected again
    e.target.value = "";

    // ----------------------------------------------------------
    // FILE TYPE CHECK
    // ----------------------------------------------------------

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    // ----------------------------------------------------------
    // FILE SIZE CHECK
    // ----------------------------------------------------------

    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be less than 10MB.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // --------------------------------------------------------
      // PROCESS IMAGE
      // --------------------------------------------------------

      const processedBlob =
        await createBirthdayImage(file);

      // --------------------------------------------------------
      // CREATE NEW FILE
      // --------------------------------------------------------

      const processedFile = new File(
        [processedBlob],
        `birthday-photo-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
        }
      );

      // --------------------------------------------------------
      // UPLOAD PROCESSED IMAGE
      // --------------------------------------------------------

      const formData = new FormData();

      formData.append(
        "photo",
        processedFile
      );

      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${BASE_URL}/api/birthday/upload-photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      // --------------------------------------------------------
      // UPDATE PHOTO
      // --------------------------------------------------------

      setPhoto(res.data.photoUrl);

      const updatedUser = res.data.user;

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);

      setSuccess(
        "Photo processed and uploaded successfully!"
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Photo processing/upload error:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to process and upload photo"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REMOVE PHOTO
  // ============================================================
  const handleRemovePhoto = async () => {
    if (
      !window.confirm(
        "Remove your birthday photo?"
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${BASE_URL}/api/birthday/user-settings`,
        {
          birthdayPhoto: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPhoto(null);

      const updatedUser = {
        ...user,
        birthdayPhoto: null,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);

      setSuccess("Photo removed");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to remove photo:",
        err
      );

      setError(
        "Failed to remove photo"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================
  if (fetching) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>
          Loading profile...
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <FiArrowLeft size={20} />
          Back to Dashboard
        </button>

        <h1 style={styles.title}>
          Birthday Settings
        </h1>
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div style={styles.successAlert}>
          <FiCheck size={18} />

          <span>{success}</span>

          <button
            onClick={() =>
              setSuccess("")
            }
            style={styles.alertClose}
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div style={styles.errorAlert}>
          <FiX size={18} />

          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
            style={styles.alertClose}
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      <div style={styles.card}>
        {/* ================================================== */}
        {/* BIRTHDAY WISHES */}
        {/* ================================================== */}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            Birthday Wishes
          </h3>

          <p style={styles.sectionDesc}>
            Here you can set up your birthday photo. If you opt in, your birthday will be celebrated on the dashboard and in the main WhatsApp group on the day of your birthday.
          </p>
        </div>

        {/* ================================================== */}
        {/* OPT IN */}
        {/* ================================================== */}

        <div style={styles.optInSection}>
          <label
            style={styles.toggleWrapper}
            className="toggle-wrapper"
          >
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) =>
                setOptIn(e.target.checked)
              }
              style={styles.toggleInput}
              className="toggle-input"
            />

            <span
              style={styles.toggleSlider}
              className="toggle-slider"
            />

            <div>
              <strong
                style={styles.toggleLabel}
              >
                Yes, create a birthday advert
                for me
              </strong>

              <small
                style={styles.toggleHint}
              >
                Your birthday will be celebrated
                on the dashboard
              </small>
            </div>
          </label>
        </div>

        {optIn && (
          <>
            {/* ================================================== */}
            {/* BIRTHDAY */}
            {/* ================================================== */}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Your Birthday
              </label>

              <div
                style={styles.inputWrapper}
              >
                <FiCalendar
                  style={styles.inputIcon}
                />

                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) =>
                    setBirthDate(
                      e.target.value
                    )
                  }
                  style={styles.dateInput}
                  className="date-input"
                />
              </div>
            </div>

            {/* ================================================== */}
            {/* PHOTO */}
            {/* ================================================== */}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Your Photo
              </label>

              <div
                style={styles.photoSection}
              >
                {photo ? (
                  <div
                    style={styles.photoPreview}
                    className="photo-preview"
                  >
                    <img
                      src={photo}
                      alt="Birthday"
                      style={styles.photoImg}
                    />

                    {/* IMAGE BUTTONS */}
                    <div
                      style={
                        styles.imageButtons
                      }
                    >
                      <button
                        className="image-btn"
                        style={
                          styles.imageBtn
                        }
                        onClick={() =>
                          setShowFullImage(
                            true
                          )
                        }
                      >
                        <FiMaximize2
                          size={16}
                        />

                        View Full Image
                      </button>

                      <label
                        className="image-btn"
                        style={
                          styles.imageBtnUpload
                        }
                      >
                        <FiUpload
                          size={16}
                        />

                        Change Image

                        <input
                          type="file"
                          accept="image/*"
                          onChange={
                            handlePhotoUpload
                          }
                          style={
                            styles.hiddenInput
                          }
                        />
                      </label>
                    </div>

                    {/* REMOVE BUTTON */}
                    <button
                      onClick={
                        handleRemovePhoto
                      }
                      style={
                        styles.removeBtn
                      }
                    >
                      <FiX size={14} />

                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <label
                    style={
                      styles.uploadPlaceholder
                    }
                    className="upload-placeholder"
                  >
                    <FiImage
                      size={32}
                      style={
                        styles.uploadIcon
                      }
                    />

                    <strong>
                      Upload Your Photo
                    </strong>

                    <span>
                      PNG, JPG, WEBP — Max 10MB
                    </span>

                    <small
                      style={
                        styles.uploadHint
                      }
                    >
                      Portrait photos are
                      automatically converted
                      to 16:9
                    </small>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handlePhotoUpload
                      }
                      style={
                        styles.hiddenInput
                      }
                    />
                  </label>
                )}
              </div>
            </div>

            {/* ================================================== */}
            {/* PERSONAL MESSAGE */}
            {/* ================================================== */}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Personal Message (Optional)
              </label>

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
                placeholder="Write a personal message to be displayed on your birthday..."
                rows="3"
                style={styles.textarea}
                className="textarea"
              />
            </div>

            {/* ================================================== */}
            {/* PREVIEW */}
            {/* ================================================== */}

            <div
              style={styles.previewSection}
            >
              <h4
                style={styles.previewTitle}
              >
                Preview
              </h4>

              <div
                style={styles.previewCard}
              >
                <div
                  style={styles.previewImage}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt="Preview"
                      style={
                        styles.previewImg
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.previewPlaceholder
                      }
                    >
                      Your photo here
                    </div>
                  )}
                </div>

                <div
                  style={
                    styles.previewContent
                  }
                >
                  <span
                    style={
                      styles.previewLabel
                    }
                  >
                    Happy Birthday!
                  </span>

                  <strong
                    style={
                      styles.previewName
                    }
                  >
                    {user?.fullName}
                  </strong>

                  <p
                    style={
                      styles.previewMessage
                    }
                  >
                    {message ||
                      "From all of us at ZUCA"}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================================================== */}
        {/* SAVE */}
        {/* ================================================== */}

        <button
          style={styles.saveBtn}
          onClick={handleSave}
          disabled={loading}
          className="save-btn"
        >
          {loading
            ? "Processing..."
            : "Save Birthday Settings"}

          <FiCheck size={16} />
        </button>
      </div>

      {/* ==================================================== */}
      {/* FULL IMAGE MODAL */}
      {/* ==================================================== */}

      {showFullImage && photo && (
        <div
          style={
            styles.fullImageOverlay
          }
          onClick={() =>
            setShowFullImage(false)
          }
        >
          <div
            style={
              styles.fullImageContent
            }
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              style={
                styles.fullImageClose
              }
              onClick={() =>
                setShowFullImage(false)
              }
            >
              <FiX size={24} />
            </button>

            <img
              src={photo}
              alt="Birthday full view"
              style={styles.fullImage}
            />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CSS */}
      {/* ==================================================== */}

      <style>{`
        .toggle-wrapper:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .toggle-input:checked + .toggle-slider {
          background: #2563eb;
        }

        .toggle-input:checked + .toggle-slider::after {
          transform: translateX(20px);
        }

        .toggle-slider::after {
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

        .date-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .photo-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #f1f5f9;
          width: 100%;
        }

        .photo-preview:hover .image-btn {
          opacity: 1;
        }

        .image-btn {
          transition: opacity 0.3s ease;
        }

        .upload-placeholder:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .save-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 640px) {
          .image-btn {
            font-size: 11px !important;
            padding: 6px 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "24px",
    maxWidth: "800px",
    margin: "0 auto",
  },

  loadingText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "16px",
    padding: "40px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
  },

  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#0f172a",
    cursor: "pointer",
    transition: "0.2s ease",
  },

  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  alertClose: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e2e8f0",
  },

  section: {
    marginBottom: "20px",
  },

  sectionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },

  sectionDesc: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },

  optInSection: {
    margin: "16px 0 24px 0",
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
    transition: "0.2s ease",
  },

  toggleInput: {
    display: "none",
  },

  toggleSlider: {
    position: "relative",
    width: "44px",
    height: "24px",
    flexShrink: 0,
    borderRadius: "999px",
    background: "#cbd5e1",
    transition: "0.2s ease",
  },

  toggleLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    display: "block",
  },

  toggleHint: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },

  formGroup: {
    marginBottom: "20px",
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

  photoSection: {
    position: "relative",
  },

  photoPreview: {
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#f1f5f9",
    width: "100%",
  },

  photoImg: {
    width: "100%",
    height: "auto",
    display: "block",
    objectFit: "contain",
  },

  imageButtons: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    gap: "12px",
    zIndex: 5,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  imageBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "rgba(15, 23, 42, 0.8)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
    opacity: 0,
  },

  imageBtnUpload: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "rgba(37, 99, 235, 0.85)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
    opacity: 0,
  },

  hiddenInput: {
    display: "none",
  },

  removeBtn: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    background: "rgba(220, 38, 38, 0.8)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    zIndex: 5,
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
    textAlign: "center",
  },

  uploadIcon: {
    color: "#94a3b8",
  },

  uploadHint: {
    color: "#64748b",
    fontSize: "11px",
    marginTop: "3px",
  },

  previewSection: {
    margin: "20px 0",
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
    flexShrink: 0,
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
    flex: 1,
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

  fullImageOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.9)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },

  fullImageContent: {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },

  fullImage: {
    maxWidth: "100%",
    maxHeight: "90vh",
    borderRadius: "12px",
    objectFit: "contain",
    boxShadow:
      "0 20px 60px rgba(0, 0, 0, 0.5)",
  },

  fullImageClose: {
    position: "absolute",
    top: "-48px",
    right: "-48px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background:
      "rgba(255, 255, 255, 0.15)",
    border: "none",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "0.2s ease",
  },
};