import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiX,
  FiSave,
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiCamera,
  FiTrash2,
  FiArrowLeft,
  FiShield,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import BASE_URL from "../api";

import ProfileImageCropper from "./ProfileImageCropper";
import FingerprintRegistration from "./FingerprintRegistration";
import { FaFingerprint } from "react-icons/fa";
import BirthdaySettings from "./BirthdaySettings";

const guiltMessages = [
  "🎵 You'll miss the beautiful choir hymns...",
  "🙏 Who will pray with us at mass?",
  "🏠 Your Jumuia family will miss you dearly...",
  "💬 The community chat won't be the same without you...",
  "📸 All those gallery memories together...",
  "🎮 Who will challenge us to Bible Trivia now?",
  "⛪ Sunday mass won't feel complete without you...",
];

/* ================================================================
   CREATE 16:9 PROFILE IMAGE
   - Original image stays sharp
   - Background is enlarged version of same image
   - Background is blurred
   - Nothing gets stretched
================================================================ */

const createProfileImage16x9 = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const WIDTH = 1920;
        const HEIGHT = 1080;

        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not create image canvas."));
          return;
        }

        /*
         * ------------------------------------------------------------
         * Helper: cover image without distortion
         * ------------------------------------------------------------
         */
        const drawCover = (context, image, x, y, width, height) => {
          const imageRatio = image.width / image.height;
          const targetRatio = width / height;

          let sourceWidth;
          let sourceHeight;
          let sourceX;
          let sourceY;

          if (imageRatio > targetRatio) {
            // Image is wider than target
            sourceHeight = image.height;
            sourceWidth = image.height * targetRatio;

            sourceX = (image.width - sourceWidth) / 2;
            sourceY = 0;
          } else {
            // Image is taller than target
            sourceWidth = image.width;
            sourceHeight = image.width / targetRatio;

            sourceX = 0;
            sourceY = (image.height - sourceHeight) / 2;
          }

          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            x,
            y,
            width,
            height
          );
        };

        /*
         * ------------------------------------------------------------
         * 1. Draw enlarged blurred background
         * ------------------------------------------------------------
         */

        ctx.save();

        ctx.filter = "blur(35px)";

        // Draw slightly larger so blur does not create transparent edges
        drawCover(
          ctx,
          img,
          -60,
          -60,
          WIDTH + 120,
          HEIGHT + 120
        );

        ctx.restore();

        /*
         * ------------------------------------------------------------
         * 2. Add a very subtle dark overlay
         * ------------------------------------------------------------
         */

        ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        /*
         * ------------------------------------------------------------
         * 3. Draw original image sharp in the center
         * ------------------------------------------------------------
         */

        const originalRatio = img.width / img.height;
        const canvasRatio = WIDTH / HEIGHT;

        let foregroundWidth;
        let foregroundHeight;

        if (originalRatio > canvasRatio) {
          // Landscape image
          foregroundWidth = WIDTH;
          foregroundHeight = WIDTH / originalRatio;
        } else {
          // Portrait / square image
          foregroundHeight = HEIGHT;
          foregroundWidth = HEIGHT * originalRatio;
        }

        const foregroundX =
          (WIDTH - foregroundWidth) / 2;

        const foregroundY =
          (HEIGHT - foregroundHeight) / 2;

        ctx.drawImage(
          img,
          foregroundX,
          foregroundY,
          foregroundWidth,
          foregroundHeight
        );

        /*
         * ------------------------------------------------------------
         * 4. Convert to JPEG
         * ------------------------------------------------------------
         */

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(
                new Error("Could not process the image.")
              );
              return;
            }

            const processedFile = new File(
              [blob],
              `profile-${Date.now()}.jpg`,
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );

            resolve(processedFile);
          },
          "image/jpeg",
          0.92
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    img.src = objectUrl;
  });
};

function ProfileSettings({
  isOpen,
  onClose,
  user,
  onUserUpdate,
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password visibility
  const [showPasswordFields, setShowPasswordFields] =
    useState(false);
  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // Profile image
  const [selectedImageFile, setSelectedImageFile] =
    useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] =
    useState(false);

  const fileInputRef = useRef(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] =
    useState("");
  const [deletePassword, setDeletePassword] =
    useState("");
  const [deleteCountdown, setDeleteCountdown] =
    useState(5);
  const [deleting, setDeleting] = useState(false);

  // Fingerprint
  const [fingerprintUpdated, setFingerprintUpdated] =
    useState(false);

  /* ============================================================
     LOAD USER DATA
  ============================================================ */

  useEffect(() => {
    if (!user) return;

    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    const imageUrl = user.profileImage?.startsWith("http")
      ? user.profileImage
      : user.profileImage
      ? `${BASE_URL}/${user.profileImage}`
      : null;

    setProfileImage(imageUrl);
  }, [user]);

  /* ============================================================
     DELETE COUNTDOWN
  ============================================================ */

  useEffect(() => {
    let timer;

    if (deleteStep === 3 && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((count) => count - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [deleteStep, deleteCountdown]);

  /* ============================================================
     FORM INPUT
  ============================================================ */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* ============================================================
     PROFILE IMAGE SELECT
  ============================================================ */

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    /*
     * Allow up to 10MB original image.
     * The image will be compressed before uploading.
     */
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10MB or smaller.");
      return;
    }

    setError("");
    setSuccess("");

    setSelectedImageFile(file);
    setShowCropper(true);

    // Allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* ============================================================
     PROFILE IMAGE UPLOAD
  ============================================================ */

  const handleImageUpload = async (croppedFile) => {
    if (!croppedFile || !user) return;

    try {
      setError("");
      setSuccess("");
      setUploadingImage(true);

      /*
       * Convert the cropped image to the final 16:9 image.
       *
       * Result:
       * - 1920 × 1080
       * - sharp original image
       * - enlarged blurred background
       * - no stretching
       */

      const processedFile =
        await createProfileImage16x9(croppedFile);

      const token = localStorage.getItem("token");

      const fd = new FormData();

      fd.append("profile", processedFile);

      const res = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-profile`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updated = res.data.user;

      const img =
        updated.profileImage?.startsWith("http")
          ? updated.profileImage
          : updated.profileImage
          ? `${BASE_URL}/${updated.profileImage}`
          : null;

      setProfileImage(img);

      localStorage.setItem(
        "user",
        JSON.stringify(updated)
      );

      if (onUserUpdate) {
        onUserUpdate(updated);
      }

      setSelectedImageFile(null);
      setShowCropper(false);

      setSuccess("Profile picture updated!");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Profile image upload error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to upload image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /* ============================================================
     REMOVE PROFILE IMAGE
  ============================================================ */

  const handleRemovePhoto = async () => {
    if (
      !window.confirm(
        "Remove your profile picture?"
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      await axios.delete(
        `${BASE_URL}/api/users/${user.id}/delete-profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProfileImage(null);

      const updated = {
        ...user,
        profileImage: null,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updated)
      );

      if (onUserUpdate) {
        onUserUpdate(updated);
      }

      setSuccess("Profile picture removed.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Remove profile image error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to remove image."
      );
    }
  };

  /* ============================================================
     SAVE PROFILE
  ============================================================ */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (
      !formData.email.trim() ||
      !formData.email.includes("@")
    ) {
      setError("Please enter a valid email.");
      return;
    }

    if (showPasswordFields) {
      if (!formData.currentPassword) {
        setError(
          "Current password is required."
        );
        return;
      }

      if (formData.newPassword.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (
        formData.newPassword !==
        formData.confirmPassword
      ) {
        setError("Passwords don't match.");
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const data = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      };

      if (showPasswordFields) {
        data.currentPassword =
          formData.currentPassword;

        data.newPassword =
          formData.newPassword;
      }

      const res = await axios.put(
        `${BASE_URL}/api/users/profile`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      if (onUserUpdate) {
        onUserUpdate(res.data.user);
      }

      setSuccess("Profile updated!");

      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setShowPasswordFields(false);

      setTimeout(() => {
        setSuccess("");
      }, 2000);
    } catch (err) {
      console.error(
        "Profile update error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Update failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     DELETE ACCOUNT
  ============================================================ */

  const handleDeleteAccount = async () => {
    if (deleteCountdown > 0 || deleting) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${BASE_URL}/api/delete-my-account`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: {
            password: deletePassword,
            reason: deleteReason,
          },
        }
      );

      localStorage.clear();

      window.location.href =
        "/login?deleted=true";
    } catch (err) {
      console.error(
        "Delete account error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Delete failed."
      );

      setDeleting(false);
      setDeleteStep(0);
      setShowDeleteConfirm(false);
      setDeleteCountdown(5);
    }
  };

  /* ============================================================
     FINGERPRINT
  ============================================================ */

  const handleFingerprintRegistered = () => {
    setFingerprintUpdated((prev) => !prev);

    setSuccess(
      "✅ Fingerprint settings updated!"
    );

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  /* ============================================================
     RESET DELETE FLOW
  ============================================================ */

  const resetDeleteFlow = () => {
    setShowDeleteConfirm(false);
    setDeleteStep(0);
    setDeleteReason("");
    setDeleteConfirmText("");
    setDeletePassword("");
    setDeleteCountdown(5);
    setDeleting(false);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={s.overlay}
          onClick={onClose}
        >
          <motion.div
            initial={{
              scale: 0.95,
              y: 30,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
            }}
            exit={{
              scale: 0.95,
              y: 30,
              opacity: 0,
            }}
            style={s.modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <div style={s.header}>
              <button
                type="button"
                onClick={onClose}
                style={s.backBtn}
                aria-label="Close settings"
              >
                <FiArrowLeft size={20} />
              </button>

              <h2 style={s.title}>
                Profile Settings
              </h2>

              <div style={{ width: 40 }} />
            </div>

            {/* ==================================================
                PROFILE PHOTO
            ================================================== */}

            <div style={s.photoSection}>
              <div
                style={s.photoWrapper}
                onClick={() => {
                  if (
                    profileImage &&
                    !uploadingImage
                  ) {
                    setShowFullImage(true);
                  }
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={s.photo}
                  />
                ) : (
                  <div
                    style={s.photoPlaceholder}
                  >
                    {user?.fullName
                      ?.charAt(0)
                      ?.toUpperCase() || "U"}
                  </div>
                )}

                <div style={s.cameraBadge}>
                  {uploadingImage ? (
                    <span
                      style={s.cameraSpinner}
                    />
                  ) : (
                    <FiCamera size={20} />
                  )}
                </div>
              </div>

              <div style={s.photoActions}>
                <label
                  style={{
                    ...s.uploadBtn,
                    opacity: uploadingImage
                      ? 0.6
                      : 1,
                    cursor: uploadingImage
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  <FiCamera size={14} />

                  {uploadingImage
                    ? "Uploading..."
                    : "Change"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    hidden
                    ref={fileInputRef}
                    onChange={
                      handleImageSelect
                    }
                    disabled={uploadingImage}
                  />
                </label>

                {profileImage && (
                  <button
                    type="button"
                    onClick={
                      handleRemovePhoto
                    }
                    style={s.removeBtn}
                    disabled={uploadingImage}
                  >
                    <FiTrash2 size={14} />
                    Remove
                  </button>
                )}
              </div>

              <p style={s.hint}>
                Click photo to enlarge • JPG,
                PNG, WEBP up to 10MB
              </p>

              <p style={s.formatHint}>
                Your photo will automatically be
                optimized to 16:9.
              </p>
            </div>

            {/* ==================================================
                MAIN FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit}
              style={s.form}
            >
              {/* ==================================================
                  BASIC INFORMATION
              ================================================== */}

              <div style={s.section}>
                <h3 style={s.sectionTitle}>
                  Basic Information
                </h3>

                <div style={s.field}>
                  <label style={s.label}>
                    <FiUser size={14} />
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    style={s.input}
                    autoComplete="name"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>
                    <FiMail size={14} />
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={s.input}
                    autoComplete="email"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>
                    <FiPhone size={14} />
                    Phone
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={s.input}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* ==================================================
                  SECURITY
              ================================================== */}

              <div style={s.section}>
                <div style={s.pwHeader}>
                  <h3 style={s.sectionTitle}>
                    Security
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswordFields(
                        (prev) => !prev
                      )
                    }
                    style={s.pwToggle}
                  >
                    <FiLock size={14} />

                    {showPasswordFields
                      ? "Cancel"
                      : "Change Password"}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {showPasswordFields && (
                    <motion.div
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                      }}
                      style={s.pwSection}
                    >
                      <div style={s.field}>
                        <label style={s.label}>
                          <FiShield size={14} />
                          Current Password
                        </label>

                        <div
                          style={s.pwWrapper}
                        >
                          <input
                            type={
                              showCurrentPassword
                                ? "text"
                                : "password"
                            }
                            name="currentPassword"
                            value={
                              formData.currentPassword
                            }
                            onChange={
                              handleChange
                            }
                            style={s.pwInput}
                            placeholder="Current password"
                            autoComplete="current-password"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(
                                (prev) =>
                                  !prev
                              )
                            }
                            style={s.eyeBtn}
                            aria-label={
                              showCurrentPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showCurrentPassword ? (
                              <FiEyeOff
                                size={18}
                              />
                            ) : (
                              <FiEye
                                size={18}
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      <div style={s.field}>
                        <label style={s.label}>
                          <FiLock size={14} />
                          New Password
                        </label>

                        <div
                          style={s.pwWrapper}
                        >
                          <input
                            type={
                              showNewPassword
                                ? "text"
                                : "password"
                            }
                            name="newPassword"
                            value={
                              formData.newPassword
                            }
                            onChange={
                              handleChange
                            }
                            style={s.pwInput}
                            placeholder="Min. 6 characters"
                            autoComplete="new-password"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowNewPassword(
                                (prev) =>
                                  !prev
                              )
                            }
                            style={s.eyeBtn}
                            aria-label={
                              showNewPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showNewPassword ? (
                              <FiEyeOff
                                size={18}
                              />
                            ) : (
                              <FiEye
                                size={18}
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      <div style={s.field}>
                        <label style={s.label}>
                          <FiCheckCircle
                            size={14}
                          />
                          Confirm Password
                        </label>

                        <div
                          style={s.pwWrapper}
                        >
                          <input
                            type={
                              showConfirmPassword
                                ? "text"
                                : "password"
                            }
                            name="confirmPassword"
                            value={
                              formData.confirmPassword
                            }
                            onChange={
                              handleChange
                            }
                            style={s.pwInput}
                            placeholder="Confirm password"
                            autoComplete="new-password"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(
                                (prev) =>
                                  !prev
                              )
                            }
                            style={s.eyeBtn}
                            aria-label={
                              showConfirmPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showConfirmPassword ? (
                              <FiEyeOff
                                size={18}
                              />
                            ) : (
                              <FiEye
                                size={18}
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ==================================================
                  FINGERPRINT
              ================================================== */}

              <div style={s.section}>
                <h3
                  style={{
                    ...s.sectionTitle,
                    color: "#7c3aed",
                    borderBottomColor:
                      "#ddd6fe",
                  }}
                >
                  <FaFingerprint
                    size={16}
                    style={{
                      marginRight: 8,
                    }}
                  />

                  Fingerprint Login
                </h3>

                <FingerprintRegistration
                  key={fingerprintUpdated}
                  onRegistered={
                    handleFingerprintRegistered
                  }
                />
              </div>

              {/* ==================================================
                  BIRTHDAY
              ================================================== */}

              <BirthdaySettings
                user={user}
                onUpdate={onUserUpdate}
              />

              {/* ==================================================
                  DANGER ZONE
              ================================================== */}

              <div style={s.section}>
                <h3
                  style={{
                    ...s.sectionTitle,
                    color: "#dc2626",
                    borderBottomColor:
                      "#fecaca",
                  }}
                >
                  ⚠️ Danger Zone
                </h3>

                {!showDeleteConfirm ? (
                  <div style={dz.box}>
                    <p
                      style={dz.warning}
                    >
                      <strong>
                        Delete your account
                        permanently.
                      </strong>{" "}
                      This removes all data —
                      attendance, contributions,
                      messages, memberships.
                      Cannot be undone.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setShowDeleteConfirm(
                          true
                        )
                      }
                      style={dz.initialBtn}
                    >
                      <FiTrash2 size={14} />
                      Delete My Account
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    style={dz.confirmBox}
                  >
                    {/* STEP 0 */}

                    {deleteStep === 0 && (
                      <>
                        <p
                          style={
                            dz.confirmTitle
                          }
                        >
                          😢 Are you absolutely
                          sure?
                        </p>

                        <div
                          style={dz.lossBox}
                        >
                          <p
                            style={
                              dz.lossTitle
                            }
                          >
                            You will permanently
                            lose:
                          </p>

                          <ul
                            style={
                              dz.lossList
                            }
                          >
                            <li>
                              📊 All attendance
                              records
                            </li>
                            <li>
                              💰 Contribution
                              history
                            </li>
                            <li>
                              🏠 Jumuia
                              membership
                            </li>
                            <li>
                              💬 All messages
                            </li>
                            <li>
                              👑 Executive
                              positions
                            </li>
                            <li>
                              📸 Uploaded media
                            </li>
                          </ul>
                        </div>

                        <p
                          style={
                            dz.guiltText
                          }
                        >
                          "
                          {
                            guiltMessages[
                              Math.floor(
                                Math.random() *
                                  guiltMessages.length
                              )
                            ]
                          }
                          "
                        </p>

                        <div
                          style={dz.btnRow}
                        >
                          <button
                            type="button"
                            onClick={
                              resetDeleteFlow
                            }
                            style={
                              dz.cancelBtn
                            }
                          >
                            Never mind, I'll
                            stay 🙏
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteStep(1)
                            }
                            style={
                              dz.continueBtn
                            }
                          >
                            I understand,
                            continue
                          </button>
                        </div>
                      </>
                    )}

                    {/* STEP 1 */}

                    {deleteStep === 1 && (
                      <>
                        <p
                          style={
                            dz.confirmTitle
                          }
                        >
                          📝 Why are you leaving?
                        </p>

                        <select
                          value={deleteReason}
                          onChange={(e) =>
                            setDeleteReason(
                              e.target.value
                            )
                          }
                          style={dz.select}
                        >
                          <option value="">
                            Select a reason...
                          </option>

                          <option value="graduated">
                            🎓 Graduated /
                            Completed studies
                          </option>

                          <option value="transferred">
                            🏫 Transferred to
                            another school
                          </option>

                          <option value="inactive">
                            😴 No longer active
                            in ZUCA
                          </option>

                          <option value="privacy">
                            🔒 Privacy concerns
                          </option>

                          <option value="other">
                            💬 Other
                          </option>
                        </select>

                        <div
                          style={dz.btnRow}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteStep(0)
                            }
                            style={
                              dz.cancelBtn
                            }
                          >
                            ← Back
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteStep(2)
                            }
                            style={
                              dz.continueBtn
                            }
                          >
                            Continue
                          </button>
                        </div>
                      </>
                    )}

                    {/* STEP 2 */}

                    {deleteStep === 2 && (
                      <>
                        <p
                          style={
                            dz.confirmTitle
                          }
                        >
                          ⚠️ Final Confirmation
                        </p>

                        <p
                          style={
                            dz.typeLabel
                          }
                        >
                          Type{" "}
                          <span
                            style={
                              dz.typeHighlight
                            }
                          >
                            DELETE MY ACCOUNT
                          </span>{" "}
                          to confirm:
                        </p>

                        <input
                          type="text"
                          value={
                            deleteConfirmText
                          }
                          onChange={(e) =>
                            setDeleteConfirmText(
                              e.target.value
                            )
                          }
                          placeholder="DELETE MY ACCOUNT"
                          style={
                            dz.confirmInput
                          }
                          autoComplete="off"
                        />

                        <p
                          style={{
                            ...dz.typeLabel,
                            marginTop: 12,
                          }}
                        >
                          Enter your password:
                        </p>

                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) =>
                            setDeletePassword(
                              e.target.value
                            )
                          }
                          placeholder="Your password"
                          style={
                            dz.confirmInput
                          }
                          autoComplete="current-password"
                        />

                        <div
                          style={dz.btnRow}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteStep(1)
                            }
                            style={
                              dz.cancelBtn
                            }
                          >
                            ← Back
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteStep(3)
                            }
                            disabled={
                              deleteConfirmText !==
                                "DELETE MY ACCOUNT" ||
                              !deletePassword
                            }
                            style={{
                              ...dz.continueBtn,
                              background:
                                "#dc2626",
                              opacity:
                                deleteConfirmText ===
                                  "DELETE MY ACCOUNT" &&
                                deletePassword
                                  ? 1
                                  : 0.5,
                              cursor:
                                deleteConfirmText ===
                                  "DELETE MY ACCOUNT" &&
                                deletePassword
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                          >
                            Delete My Account
                          </button>
                        </div>
                      </>
                    )}

                    {/* STEP 3 */}

                    {deleteStep === 3 && (
                      <div
                        style={{
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#dc2626",
                            marginBottom: 8,
                          }}
                        >
                          😭 This is really
                          happening...
                        </p>

                        <p
                          style={{
                            color: "#64748b",
                            marginBottom: 16,
                          }}
                        >
                          Deleting in{" "}
                          {deleteCountdown}s...
                        </p>

                        <button
                          type="button"
                          onClick={
                            handleDeleteAccount
                          }
                          disabled={
                            deleteCountdown >
                              0 || deleting
                          }
                          style={{
                            padding:
                              "12px 28px",
                            background:
                              deleteCountdown >
                              0
                                ? "#94a3b8"
                                : "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor:
                              deleteCountdown >
                              0
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {deleteCountdown > 0
                            ? `Wait ${deleteCountdown}s...`
                            : deleting
                            ? "Deleting..."
                            : "💔 Yes, Delete Forever"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            resetDeleteFlow
                          }
                          style={{
                            display: "block",
                            margin:
                              "12px auto 0",
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            fontSize: 13,
                            textDecoration:
                              "underline",
                          }}
                        >
                          I changed my mind!
                          Keep my account 🙏
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* ==================================================
                  ERROR
              ================================================== */}

              {error && (
                <div style={s.errorMsg}>
                  <FiAlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* ==================================================
                  SUCCESS
              ================================================== */}

              {success && (
                <div style={s.successMsg}>
                  <FiCheckCircle size={14} />
                  <span>{success}</span>
                </div>
              )}

              {/* ==================================================
                  ACTIONS
              ================================================== */}

              <div style={s.actions}>
                <button
                  type="button"
                  onClick={onClose}
                  style={s.cancelBtn}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...s.saveBtn,
                    opacity: loading
                      ? 0.7
                      : 1,
                    cursor: loading
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {loading ? (
                    <span
                      style={s.spinner}
                    />
                  ) : (
                    <FiSave size={16} />
                  )}

                  {loading
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>

            {/* ==================================================
                FULL PROFILE IMAGE
            ================================================== */}

            <AnimatePresence>
              {showFullImage &&
                profileImage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={
                      s.fullImgOverlay
                    }
                    onClick={() =>
                      setShowFullImage(false)
                    }
                  >
                    <motion.div
                      initial={{
                        scale: 0.9,
                      }}
                      animate={{
                        scale: 1,
                      }}
                      exit={{
                        scale: 0.9,
                      }}
                      style={
                        s.fullImgContent
                      }
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <img
                        src={profileImage}
                        alt="Profile"
                        style={s.fullImg}
                      />

                      <button
                        type="button"
                        style={
                          s.fullImgClose
                        }
                        onClick={() =>
                          setShowFullImage(
                            false
                          )
                        }
                        aria-label="Close image"
                      >
                        <FiX size={24} />
                      </button>
                    </motion.div>
                  </motion.div>
                )}
            </AnimatePresence>

            {/* ==================================================
                PROFILE IMAGE CROPPER
            ================================================== */}

            <AnimatePresence>
              {showCropper &&
                selectedImageFile && (
                  <ProfileImageCropper
                    imageFile={
                      selectedImageFile
                    }
                    onCropComplete={(
                      croppedFile
                    ) => {
                      handleImageUpload(
                        croppedFile
                      );
                    }}
                    onClose={() => {
                      if (
                        !uploadingImage
                      ) {
                        setShowCropper(false);
                        setSelectedImageFile(
                          null
                        );
                      }
                    }}
                  />
                )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   MAIN STYLES
================================================================ */

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(8px)",
  },

  modal: {
    background: "#fff",
    borderRadius: 28,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow:
      "0 25px 50px -12px rgba(0,0,0,0.25)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 10,
  },

  backBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: 12,
    padding: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#475569",
  },

  title: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1e293b",
    margin: 0,
  },

  photoSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 24,
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  photoWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: "50%",
    cursor: "pointer",
    marginBottom: 16,
  },

  photo: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #fff",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.15)",
  },

  photoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 48,
    fontWeight: 700,
    color: "white",
    border: "4px solid #fff",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    background: "#3b82f6",
    borderRadius: "50%",
    width: 38,
    height: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    border: "2px solid #fff",
  },

  cameraSpinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation:
      "spin 0.6s linear infinite",
  },

  photoActions: {
    display: "flex",
    gap: 12,
    marginBottom: 8,
  },

  uploadBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },

  removeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fee2e2",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },

  hint: {
    fontSize: 11,
    color: "#94a3b8",
    margin: 0,
  },

  formatHint: {
    fontSize: 11,
    color: "#64748b",
    margin: "5px 0 0",
  },

  form: {
    padding: 24,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "2px solid #e2e8f0",
  },

  field: {
    marginBottom: 16,
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: "#475569",
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  },

  pwHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  pwToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: "#3b82f6",
    cursor: "pointer",
  },

  pwSection: {
    overflow: "hidden",
  },

  pwWrapper: {
    position: "relative",
  },

  pwInput: {
    width: "100%",
    padding: "12px 40px 12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  },

  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    padding: 4,
  },

  errorMsg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    background: "#fef2f2",
    borderRadius: 12,
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 20,
  },

  successMsg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    background: "#ecfdf5",
    borderRadius: 12,
    color: "#10b981",
    fontSize: 13,
    marginBottom: 20,
  },

  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 24,
    paddingTop: 20,
    borderTop: "1px solid #e2e8f0",
  },

  cancelBtn: {
    padding: "10px 20px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    color: "#475569",
    cursor: "pointer",
  },

  saveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 24px",
    background: "#3b82f6",
    border: "none",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    color: "white",
  },

  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation:
      "spin 0.6s linear infinite",
    display: "inline-block",
  },

  fullImgOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
  },

  fullImgContent: {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },

  fullImg: {
    maxWidth: "100%",
    maxHeight: "90vh",
    borderRadius: 16,
    objectFit: "contain",
    display: "block",
  },

  fullImgClose: {
    position: "absolute",
    top: -40,
    right: -40,
    background: "rgba(0,0,0,0.5)",
    border: "none",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    cursor: "pointer",
  },
};

/* ================================================================
   DANGER ZONE STYLES
================================================================ */

const dz = {
  box: {
    background: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #fecaca",
  },

  warning: {
    fontSize: 13,
    color: "#991b1b",
    margin: "0 0 12px",
    lineHeight: 1.5,
  },

  initialBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  confirmBox: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    border: "2px solid #fecaca",
    marginTop: 12,
  },

  confirmTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 12,
  },

  lossBox: {
    background: "#f0fdf4",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },

  lossTitle: {
    fontWeight: 600,
    color: "#16a34a",
    marginBottom: 6,
    fontSize: 13,
  },

  lossList: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.8,
    paddingLeft: 16,
    margin: 0,
  },

  guiltText: {
    fontStyle: "italic",
    color: "#64748b",
    marginBottom: 14,
    fontSize: 13,
  },

  btnRow: {
    display: "flex",
    gap: 10,
    marginTop: 14,
  },

  cancelBtn: {
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    color: "#475569",
  },

  continueBtn: {
    padding: "8px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  select: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    marginBottom: 12,
    background: "#fff",
    boxSizing: "border-box",
  },

  typeLabel: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
  },

  typeHighlight: {
    background: "#fee2e2",
    padding: "2px 8px",
    borderRadius: 4,
    fontFamily: "monospace",
    fontWeight: 700,
    color: "#dc2626",
  },

  confirmInput: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    marginBottom: 8,
    boxSizing: "border-box",
  },
};

export default ProfileSettings;