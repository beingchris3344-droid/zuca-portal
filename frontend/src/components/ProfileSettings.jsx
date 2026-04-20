import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  FiX, FiSave, FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, 
  FiAlertCircle, FiCamera, FiTrash2, FiArrowLeft, FiEdit2, FiShield,
  FiEye, FiEyeOff
} from "react-icons/fi";
import BASE_URL from "../api";
import ProfileImageCropper from './ProfileImageCropper';

function ProfileSettings({ isOpen, onClose, user, onUserUpdate }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      const imageUrl = user.profileImage?.startsWith("http")
        ? user.profileImage
        : user.profileImage ? `${BASE_URL}/${user.profileImage}` : null;
      setProfileImage(imageUrl);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Invalid email address");
      return false;
    }
    if (showPasswordFields) {
      if (!formData.currentPassword) {
        setError("Current password is required to change password");
        return false;
      }
      if (formData.newPassword.length < 6) {
        setError("New password must be at least 6 characters");
        return false;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setSelectedImageFile(file);
    setShowCropper(true);
  };

  const handleImageUpload = async (croppedFile) => {
    const formData = new FormData();
    formData.append("profile", croppedFile);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      const updatedUser = response.data.user;
      const imageUrl = updatedUser.profileImage?.startsWith("http")
        ? updatedUser.profileImage
        : `${BASE_URL}/${updatedUser.profileImage}`;
      setProfileImage(imageUrl);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      setSuccess("Profile picture updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Profile upload failed:", error);
      setError("Failed to upload image");
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove your profile picture?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/users/${user.id}/delete-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileImage(null);
      const updatedUser = { ...user, profileImage: null };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      setSuccess("Profile picture removed");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Failed to remove image");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const updateData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone
      };

      if (showPasswordFields) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await axios.put(`${BASE_URL}/api/users/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUser = response.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      
      setSuccess("Profile updated successfully!");
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setShowPasswordFields(false);

      setTimeout(() => {
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.overlay}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={styles.header}>
              <button onClick={onClose} style={styles.backBtn}>
                <FiArrowLeft size={20} />
              </button>
              <h2 style={styles.title}>Profile Settings</h2>
              <div style={{ width: 40 }}></div>
            </div>

            {/* Profile Picture Section */}
            <div style={styles.profileSection}>
              <div 
                style={styles.profileImageWrapper}
                onClick={() => setShowFullImage(true)}
              >
                {profileImage ? (
                  <img src={profileImage} alt={user?.fullName} style={styles.profileImage} />
                ) : (
                  <div style={styles.profilePlaceholder}>
                    {user?.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={styles.cameraOverlay}>
                  <FiCamera size={20} />
                </div>
              </div>
              
              <div style={styles.profileActions}>
                <label style={styles.uploadBtn}>
                  <FiCamera size={14} /> Change Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                  />
                </label>
                {profileImage && (
                  <button onClick={handleRemovePhoto} style={styles.removeBtn}>
                    <FiTrash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <p style={styles.profileHint}>Click photo to enlarge • JPG, PNG up to 2MB</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Basic Information */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Basic Information</h3>
                
                <div style={styles.field}>
                  <label style={styles.label}>
                    <FiUser size={14} /> Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter your full name"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    <FiMail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter your email"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    <FiPhone size={14} /> Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              {/* Change Password Section */}
              <div style={styles.section}>
                <div style={styles.passwordHeader}>
                  <h3 style={styles.sectionTitle}>Security</h3>
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    style={styles.passwordToggle}
                  >
                    <FiLock size={14} />
                    {showPasswordFields ? "Cancel" : "Change Password"}
                  </button>
                </div>

                {showPasswordFields && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={styles.passwordSection}
                  >
                    {/* Current Password with Eye Toggle */}
                    <div style={styles.field}>
                      <label style={styles.label}>
                        <FiShield size={14} /> Current Password
                      </label>
                      <div style={styles.passwordInputWrapper}>
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          style={styles.passwordInput}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          style={styles.eyeButton}
                        >
                          {showCurrentPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password with Eye Toggle */}
                    <div style={styles.field}>
                      <label style={styles.label}>
                        <FiLock size={14} /> New Password
                      </label>
                      <div style={styles.passwordInputWrapper}>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          style={styles.passwordInput}
                          placeholder="Min. 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={styles.eyeButton}
                        >
                          {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password with Eye Toggle */}
                    <div style={styles.field}>
                      <label style={styles.label}>
                        <FiCheckCircle size={14} /> Confirm New Password
                      </label>
                      <div style={styles.passwordInputWrapper}>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          style={styles.passwordInput}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={styles.eyeButton}
                        >
                          {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Messages */}
              {error && (
                <div style={styles.errorMsg}>
                  <FiAlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div style={styles.successMsg}>
                  <FiCheckCircle size={14} />
                  <span>{success}</span>
                </div>
              )}

              {/* Actions */}
              <div style={styles.actions}>
                <button type="button" onClick={onClose} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={styles.saveBtn}>
                  {loading ? (
                    <span style={styles.spinner}></span>
                  ) : (
                    <FiSave size={16} />
                  )}
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Full Image Modal */}
            <AnimatePresence>
              {showFullImage && profileImage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={styles.fullImageOverlay}
                  onClick={() => setShowFullImage(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    style={styles.fullImageContent}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={profileImage} alt="Profile" style={styles.fullImage} />
                    <button style={styles.fullImageClose} onClick={() => setShowFullImage(false)}>
                      <FiX size={24} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Cropper */}
            {showCropper && (
              <ProfileImageCropper
                imageFile={selectedImageFile}
                onCropComplete={(croppedFile) => {
                  setShowCropper(false);
                  handleImageUpload(croppedFile);
                }}
                onClose={() => {
                  setShowCropper(false);
                  setSelectedImageFile(null);
                }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(8px)",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "28px",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    background: "#ffffff",
    zIndex: 10,
  },
  backBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "12px",
    padding: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  title: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  profileSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  profileImageWrapper: {
    position: "relative",
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    cursor: "pointer",
    marginBottom: "16px",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
    fontWeight: "700",
    color: "white",
    border: "4px solid #ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: "4px",
    right: "4px",
    background: "#3b82f6",
    borderRadius: "50%",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    border: "2px solid #ffffff",
  },
  profileActions: {
    display: "flex",
    gap: "12px",
    marginBottom: "8px",
  },
  uploadBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
  },
  removeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fee2e2",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
  },
  profileHint: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: 0,
  },
  form: {
    padding: "24px",
  },
  section: {
    marginBottom: "28px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "2px solid #e2e8f0",
  },
  field: {
    marginBottom: "16px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#475569",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "14px",
    transition: "all 0.2s",
    outline: "none",
    background: "#ffffff",
  },
  passwordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  passwordToggle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#3b82f6",
    cursor: "pointer",
  },
  passwordSection: {
    overflow: "hidden",
  },
  passwordInputWrapper: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    width: "100%",
    padding: "12px 40px 12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "14px",
    transition: "all 0.2s",
    outline: "none",
    background: "#ffffff",
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
  },
  errorMsg: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "#fef2f2",
    borderRadius: "12px",
    color: "#dc2626",
    fontSize: "13px",
    marginBottom: "20px",
  },
  successMsg: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "#ecfdf5",
    borderRadius: "12px",
    color: "#10b981",
    fontSize: "13px",
    marginBottom: "20px",
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0",
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 24px",
    background: "#3b82f6",
    border: "none",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "600",
    color: "white",
    cursor: "pointer",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    display: "inline-block",
  },
  fullImageOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
  },
  fullImageContent: {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  fullImage: {
    maxWidth: "100%",
    maxHeight: "90vh",
    borderRadius: "16px",
    objectFit: "contain",
  },
  fullImageClose: {
    position: "absolute",
    top: "-40px",
    right: "-40px",
    background: "rgba(0,0,0,0.5)",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    cursor: "pointer",
  },
};

export default ProfileSettings;