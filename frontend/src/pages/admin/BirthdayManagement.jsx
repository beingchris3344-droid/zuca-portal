import React, { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../api";

import {
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiImage,
  FiCheck,
  FiX,
  FiClock,
  FiUsers,
  FiSend,
  FiSettings,
  FiTrendingUp,
  FiCamera,
  FiAlertCircle,
  FiTrash2,
  FiSearch,
  FiPlus,
  FiUpload,
  FiSave,
  FiUserPlus,
  FiArrowLeft,
  FiEdit,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { FaWhatsapp } from "react-icons/fa";

/* =========================================================
   CREATE 16:9 BIRTHDAY IMAGE
   ========================================================= */
const createBirthdayImage = (file) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");

        const canvasWidth = 1920;
        const canvasHeight = 1080;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not create image canvas."));
          return;
        }

        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;

        // 1. DRAW ENLARGED BLURRED BACKGROUND
        const backgroundScale = Math.max(
          canvasWidth / sourceWidth,
          canvasHeight / sourceHeight
        );

        const backgroundWidth = sourceWidth * backgroundScale;
        const backgroundHeight = sourceHeight * backgroundScale;

        const backgroundX = (canvasWidth - backgroundWidth) / 2;
        const backgroundY = (canvasHeight - backgroundHeight) / 2;

        ctx.save();
        ctx.filter = "blur(35px)";
        ctx.drawImage(
          image,
          backgroundX,
          backgroundY,
          backgroundWidth,
          backgroundHeight
        );
        ctx.restore();

        // 2. SUBTLE DARK OVERLAY
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 3. DRAW ORIGINAL IMAGE SHARP AND UNDISTORTED
        const foregroundScale = Math.min(
          canvasWidth / sourceWidth,
          canvasHeight / sourceHeight
        );

        const foregroundWidth = sourceWidth * foregroundScale;
        const foregroundHeight = sourceHeight * foregroundScale;

        const foregroundX = (canvasWidth - foregroundWidth) / 2;
        const foregroundY = (canvasHeight - foregroundHeight) / 2;

        ctx.drawImage(
          image,
          foregroundX,
          foregroundY,
          foregroundWidth,
          foregroundHeight
        );

        // 4. CONVERT TO JPEG
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(new Error("Failed to process image."));
              return;
            }

            const processedFile = new File(
              [blob],
              "birthday-16x9.jpg",
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

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load selected image."));
    };

    image.src = objectUrl;
  });
};

/* =========================================================
   CONVERT RELATIVE IMAGE URL TO FULL URL
   ========================================================= */
const getImageUrl = (image) => {
  if (!image) return null;

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return `${BASE_URL}/${image.replace(/^\/+/, "")}`;
};

export default function BirthdayManagement() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [stats, setStats] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("today");

  /* =========================================================
     ADD / EDIT BIRTHDAY
     ========================================================= */

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [userSearch, setUserSearch] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);

  const [addFormData, setAddFormData] = useState({
    birthDate: "",
    birthdayOptIn: true,
    birthdayMessage: "",
  });

  const [addPhotoFile, setAddPhotoFile] = useState(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState(null);

  const [loadingAllUsers, setLoadingAllUsers] = useState(false);

  /* =========================================================
     WHATSAPP
     ========================================================= */

  const [whatsAppGroups, setWhatsAppGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  /* =========================================================
     FETCH MAIN DATA
     ========================================================= */

  const fetchData = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        settingsRes,
        todayRes,
        statsRes,
        allBirthdaysRes,
        detailedStatsRes,
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/birthday/settings`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/today`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/stats`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/all`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/stats/detailed`, { headers }),
      ]);

      setSettings(settingsRes.data.settings);
      setTodayBirthdays(todayRes.data.users || []);
      setAllBirthdays(allBirthdaysRes.data.users || []);
      setStats(statsRes.data.stats);
      setDetailedStats(detailedStatsRes.data.stats);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load birthday data");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH USERS
     ========================================================= */

  const fetchAllUsers = async () => {
    setLoadingAllUsers(true);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${BASE_URL}/api/birthday/admin/users?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const users = res.data.users || [];

      setAllUsers(users);
      setFilteredUsers(users);
    } catch (err) {
      console.error("Error fetching all users:", err);
      setError("Failed to load users");
    } finally {
      setLoadingAllUsers(false);
    }
  };

  /* =========================================================
     FETCH WHATSAPP GROUPS
     ========================================================= */

  const fetchWhatsAppGroups = async () => {
  setLoadingGroups(true);
  try {
    const token = localStorage.getItem("token");

    const groupsRes = await axios.get(`${BASE_URL}/api/birthday/whatsapp-groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (groupsRes.data.success) {
      setWhatsAppGroups(groupsRes.data.groups || []);
    }

    const settingsRes = await axios.get(`${BASE_URL}/api/birthday-whatsapp/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (settingsRes.data.success) {
      const savedIds = settingsRes.data.settings?.selectedGroupIds || [];
      setSelectedGroups(savedIds);
    }
  } catch (err) {
    console.error("Error fetching birthday WhatsApp groups:", err);
  } finally {
    setLoadingGroups(false);
  }
};

  useEffect(() => {
    fetchData();
    fetchWhatsAppGroups();
  }, []);

  /* =========================================================
     FILTER USERS
     ========================================================= */

  useEffect(() => {
    if (userSearch.trim() === "") {
      setFilteredUsers(allUsers);
      return;
    }

    const search = userSearch.toLowerCase().trim();

    const filtered = allUsers.filter((user) => {
      return (
        user.fullName?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.membership_number?.toLowerCase().includes(search)
      );
    });

    setFilteredUsers(filtered);
  }, [userSearch, allUsers]);

  /* =========================================================
     OPTIMISTIC UPDATE HELPERS
     ========================================================= */

  const optimisticUpdate = (userId, updates) => {
    // Update allBirthdays
    setAllBirthdays((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      )
    );

    // Update todayBirthdays
    setTodayBirthdays((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      )
    );
  };

  const optimisticDelete = (userId) => {
    // Remove from allBirthdays
    setAllBirthdays((prev) => prev.filter((user) => user.id !== userId));

    // Remove from todayBirthdays
    setTodayBirthdays((prev) => prev.filter((user) => user.id !== userId));
  };

  const optimisticAdd = (user) => {
    setAllBirthdays((prev) => [...prev, user]);
  };

  /* =========================================================
     OPEN ADD/EDIT MODAL
     ========================================================= */

  const handleOpenModal = async () => {
    setShowAddModal(true);
    setSelectedUser(null);
    setUserSearch("");

    setAddFormData({
      birthDate: "",
      birthdayOptIn: true,
      birthdayMessage: "",
    });

    setAddPhotoFile(null);
    setAddPhotoPreview(null);

    await fetchAllUsers();
  };

  /* =========================================================
     OPEN EDIT MODAL FOR EXISTING USER
     ========================================================= */

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);

    if (user.birthDate) {
      const date = new Date(user.birthDate);

      setAddFormData({
        birthDate: date.toISOString().split("T")[0],
        birthdayOptIn: user.birthdayOptIn !== undefined ? user.birthdayOptIn : true,
        birthdayMessage: user.birthdayMessage || "",
      });

      setAddPhotoPreview(getImageUrl(user.birthdayPhoto));
    } else {
      setAddFormData({
        birthDate: "",
        birthdayOptIn: true,
        birthdayMessage: "",
      });

      setAddPhotoPreview(null);
    }

    setAddPhotoFile(null);
  };

  /* =========================================================
     SELECT USER
     ========================================================= */

  const handleSelectUser = (user) => {
    setSelectedUser(user);

    if (user.birthDate) {
      const date = new Date(user.birthDate);

      setAddFormData({
        birthDate: date.toISOString().split("T")[0],
        birthdayOptIn: user.birthdayOptIn !== undefined ? user.birthdayOptIn : true,
        birthdayMessage: user.birthdayMessage || "",
      });

      setAddPhotoPreview(getImageUrl(user.birthdayPhoto));
    } else {
      setAddFormData({
        birthDate: "",
        birthdayOptIn: true,
        birthdayMessage: "",
      });

      setAddPhotoPreview(null);
    }

    setAddPhotoFile(null);
    setFilteredUsers([]);
    setUserSearch("");
  };

  /* =========================================================
     SELECT / CHANGE PHOTO
     ========================================================= */

  const handleAddPhotoSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be less than 10MB.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const processedFile = await createBirthdayImage(file);
      setAddPhotoFile(processedFile);

      const previewUrl = URL.createObjectURL(processedFile);
      setAddPhotoPreview(previewUrl);
    } catch (err) {
      console.error("Image processing error:", err);
      setError("Failed to process the photo. Please try another image.");
    }
  };

  /* =========================================================
     REMOVE PHOTO FROM CURRENT FORM
     ========================================================= */

  const handleRemovePhoto = () => {
    setAddPhotoFile(null);
    setAddPhotoPreview(null);
  };

  /* =========================================================
     SAVE USER BIRTHDAY - OPTIMISTIC
     ========================================================= */

  const handleSaveUserBirthday = async () => {
    if (!selectedUser) {
      setError("Please select a user first");
      return;
    }

    if (!addFormData.birthDate) {
      setError("Please select a birth date");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    // Store original state for rollback
    const originalUser = { ...selectedUser };
    const originalAllBirthdays = [...allBirthdays];
    const originalTodayBirthdays = [...todayBirthdays];

    // Optimistic update
    const optimisticData = {
      birthdayOptIn: addFormData.birthdayOptIn,
      birthDate: addFormData.birthDate,
      birthdayMessage: addFormData.birthdayMessage || "",
      birthdayPhoto: addPhotoPreview || selectedUser.birthdayPhoto || null,
    };

    optimisticUpdate(selectedUser.id, optimisticData);

    try {
      const token = localStorage.getItem("token");

      let photoUrl = null;

      if (addPhotoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("photo", addPhotoFile, "birthday-16x9.jpg");

        const uploadRes = await axios.post(
          `${BASE_URL}/api/birthday/admin/upload-photo/${selectedUser.id}`,
          uploadFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        photoUrl = uploadRes.data.photoUrl;
      } else {
        photoUrl = addPhotoPreview || selectedUser.birthdayPhoto || null;
      }

      const data = {
        birthdayOptIn: addFormData.birthdayOptIn,
        birthDate: addFormData.birthDate,
        birthdayMessage: addFormData.birthdayMessage || "",
        birthdayPhoto: photoUrl || null,
      };

      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/user/${selectedUser.id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update with server data
      optimisticUpdate(selectedUser.id, res.data.user);

      setSuccess(`✅ Birthday saved for ${res.data.user.fullName}`);

      setTimeout(() => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedUser(null);
        setAddFormData({
          birthDate: "",
          birthdayOptIn: true,
          birthdayMessage: "",
        });
        setAddPhotoFile(null);
        setAddPhotoPreview(null);
        setAllUsers([]);
        setFilteredUsers([]);
        setSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Error saving birthday:", err);
      // Rollback on error
      setAllBirthdays(originalAllBirthdays);
      setTodayBirthdays(originalTodayBirthdays);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to save birthday"
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     TOGGLE OPT-IN - OPTIMISTIC
     ========================================================= */

  const handleToggleOptIn = async (userId, currentOptIn) => {
    if (!window.confirm(`Toggle opt-in for this user?`)) return;

    setProcessing(true);
    setError("");

    // Store original state for rollback
    const originalAllBirthdays = [...allBirthdays];
    const originalTodayBirthdays = [...todayBirthdays];

    // Optimistic update
    optimisticUpdate(userId, { birthdayOptIn: !currentOptIn });

    try {
      const token = localStorage.getItem("token");

      const res = await axios.patch(
        `${BASE_URL}/api/birthday/admin/user/${userId}/toggle-optin`,
        { birthdayOptIn: !currentOptIn },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Confirm with server data
      optimisticUpdate(userId, { birthdayOptIn: res.data.user.birthdayOptIn });

      setSuccess(res.data.message);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      // Rollback on error
      setAllBirthdays(originalAllBirthdays);
      setTodayBirthdays(originalTodayBirthdays);
      setError("Failed to toggle opt-in");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     DELETE USER BIRTHDAY - OPTIMISTIC
     ========================================================= */

  const handleDeleteUserBirthday = async () => {
    if (!userToDelete) return;

    if (!window.confirm(`Delete birthday data for ${userToDelete.fullName}?`)) {
      setUserToDelete(null);
      setShowDeleteModal(false);
      return;
    }

    setProcessing(true);
    setError("");

    const userId = userToDelete.id;
    const userFullName = userToDelete.fullName;

    // Store original state for rollback
    const originalAllBirthdays = [...allBirthdays];
    const originalTodayBirthdays = [...todayBirthdays];

    // Optimistic delete
    optimisticDelete(userId);

    setUserToDelete(null);
    setShowDeleteModal(false);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.delete(
        `${BASE_URL}/api/birthday/admin/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(`✅ ${res.data.message}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      // Rollback on error
      setAllBirthdays(originalAllBirthdays);
      setTodayBirthdays(originalTodayBirthdays);
      setError(err.response?.data?.error || "Failed to delete birthday data");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     PROCESS ALL - OPTIMISTIC
     ========================================================= */

  const handleProcessAll = async () => {
    if (!window.confirm("Process all birthdays today?")) {
      return;
    }

    setProcessing(true);
    setError("");

    // Store original state for rollback
    const originalTodayBirthdays = [...todayBirthdays];

    // Optimistic update - mark all as processed
    setTodayBirthdays((prev) =>
      prev.map((user) => ({
        ...user,
        birthdayAdvertId: `processing-${user.id}`,
      }))
    );

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/process-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(res.data.message);
      // Refresh data in background
      setTimeout(() => fetchData(), 1000);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      // Rollback
      setTodayBirthdays(originalTodayBirthdays);
      setError("Failed to process birthdays");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     PROCESS SINGLE - OPTIMISTIC
     ========================================================= */

  const handleProcessSingle = async (userId) => {
    if (!window.confirm("Process this user's birthday?")) {
      return;
    }

    setProcessing(true);
    setError("");

    // Store original state for rollback
    const originalAllBirthdays = [...allBirthdays];
    const originalTodayBirthdays = [...todayBirthdays];

    // Optimistic update - mark as processing
    optimisticUpdate(userId, { birthdayAdvertId: `processing-${userId}` });

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/process/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(res.data.message);
      // Refresh data in background
      setTimeout(() => fetchData(), 1000);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      // Rollback
      setAllBirthdays(originalAllBirthdays);
      setTodayBirthdays(originalTodayBirthdays);
      setError("Failed to process user");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     DELETE ADVERTISEMENT - OPTIMISTIC
     ========================================================= */

  const handleDeleteAdvert = async (userId, advertId) => {
    if (!window.confirm("Delete this birthday advertisement?")) {
      return;
    }

    setProcessing(true);
    setError("");

    // Store original state for rollback
    const originalAllBirthdays = [...allBirthdays];
    const originalTodayBirthdays = [...todayBirthdays];

    // Optimistic update
    optimisticUpdate(userId, { birthdayAdvertId: null });

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${BASE_URL}/api/advertisements/${advertId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await axios.put(
        `${BASE_URL}/api/birthday/user-settings`,
        {
          birthdayAdvertId: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("✅ Birthday advertisement deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      // Rollback
      setAllBirthdays(originalAllBirthdays);
      setTodayBirthdays(originalTodayBirthdays);
      setError(err.response?.data?.error || "Failed to delete ad");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     UPDATE SETTINGS - OPTIMISTIC
     ========================================================= */

  const handleUpdateSettings = async (field, value) => {
    // Optimistic update
    const originalSettings = { ...settings };
    setSettings((prev) => ({ ...prev, [field]: value }));

    try {
      const token = localStorage.getItem("token");

      const updated = {
        ...settings,
        [field]: value,
      };

      const res = await axios.put(
        `${BASE_URL}/api/birthday/settings`,
        updated,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSettings(res.data.settings);
      setSuccess("Settings updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      // Rollback
      setSettings(originalSettings);
      setError("Failed to update settings");
    }
  };

  /* =========================================================
     WHATSAPP GROUPS - OPTIMISTIC
     ========================================================= */

  const toggleGroup = (groupId) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSaveWhatsAppGroups = async () => {
  setProcessing(true);
  setError("");

  try {
    const token = localStorage.getItem("token");

    await axios.post(
      `${BASE_URL}/api/birthday-whatsapp/save`,
      {
        selectedGroupIds: selectedGroups,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setSuccess("✅ Birthday WhatsApp groups updated successfully!");
    await fetchWhatsAppGroups();
    setTimeout(() => setSuccess(""), 3000);
  } catch (err) {
    console.error(err);
    setError("Failed to update birthday WhatsApp groups");
  } finally {
    setProcessing(false);
  }
};

  /* =========================================================
     FILTER BIRTHDAYS
     ========================================================= */

  const filteredBirthdays = allBirthdays.filter(
    (user) =>
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.membership_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* =========================================================
     FORMAT DATE
     ========================================================= */

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not set";

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Not set";

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  /* =========================================================
     LOADING SCREEN
     ========================================================= */

  if (loading) {
    return (
      <div className="birthday-admin-page">
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>Birthday Management</h1>
            <p>Manage birthday adverts and wishes for ZUCA members</p>
          </div>
          <button className="admin-refresh-btn" onClick={fetchData}>
            <FiRefreshCw className="spinning" />
            Refresh
          </button>
        </div>

        <div className="skeleton-stats">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-stat-card">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-value" />
                <div className="skeleton-label" />
              </div>
            </div>
          ))}
        </div>

        <div className="skeleton-settings">
          <div className="skeleton-title" />
          <div className="skeleton-toggles">
            <div className="skeleton-toggle" />
            <div className="skeleton-toggle" />
            <div className="skeleton-toggle" />
          </div>
        </div>

        <div className="skeleton-list">
          <div className="skeleton-list-header" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-avatar" />
              <div className="skeleton-user-info">
                <div className="skeleton-name" />
                <div className="skeleton-email" />
              </div>
              <div className="skeleton-badge" />
              <div className="skeleton-btn" />
            </div>
          ))}
        </div>

        <style>{`
          .birthday-admin-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
          .admin-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
          .admin-header-left h1 { font-size:24px; font-weight:700; color:#0f172a; margin:0 0 4px; }
          .admin-header-left p { font-size:14px; color:#64748b; margin:0; }
          .admin-refresh-btn { display:flex; align-items:center; gap:8px; padding:10px 20px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; font-weight:600; color:#0f172a; cursor:pointer; }
          .spinning { animation:spin 1s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
          .skeleton-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
          .skeleton-stat-card, .skeleton-settings, .skeleton-list { background:#fff; border:1px solid #e2e8f0; border-radius:14px; }
          .skeleton-stat-card { display:flex; align-items:center; gap:14px; padding:18px; }
          .skeleton-icon { width:44px; height:44px; border-radius:12px; background:#e2e8f0; animation:pulse 1.5s infinite; }
          .skeleton-content { display:flex; flex-direction:column; gap:6px; }
          .skeleton-value { width:60px; height:24px; background:#e2e8f0; border-radius:4px; }
          .skeleton-label { width:80px; height:12px; background:#e2e8f0; border-radius:4px; }
          .skeleton-settings { padding:20px; margin-bottom:24px; }
          .skeleton-title { width:150px; height:20px; background:#e2e8f0; border-radius:4px; margin-bottom:16px; }
          .skeleton-toggles { display:flex; gap:24px; }
          .skeleton-toggle { width:180px; height:22px; background:#e2e8f0; border-radius:4px; }
          .skeleton-list { padding:20px; }
          .skeleton-list-header { width:200px; height:20px; background:#e2e8f0; border-radius:4px; margin-bottom:16px; }
          .skeleton-item { display:flex; align-items:center; gap:16px; padding:14px; background:#f8fafc; border-radius:12px; margin-bottom:12px; }
          .skeleton-avatar { width:44px; height:44px; border-radius:50%; background:#e2e8f0; }
          .skeleton-user-info { flex:1; }
          .skeleton-name { width:150px; height:16px; background:#e2e8f0; margin-bottom:6px; }
          .skeleton-email { width:200px; height:12px; background:#e2e8f0; }
          .skeleton-badge { width:80px; height:24px; background:#e2e8f0; border-radius:20px; }
          .skeleton-btn { width:80px; height:32px; background:#e2e8f0; border-radius:8px; }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
          @media(max-width:768px) { .skeleton-stats { grid-template-columns:repeat(2,1fr); } .skeleton-toggles { flex-direction:column; } }
          @media(max-width:480px) { .skeleton-stats { grid-template-columns:1fr; } }
        `}</style>
      </div>
    );
  }

  /* =========================================================
     MAIN PAGE
     ========================================================= */

  return (
    <div className="birthday-admin-page">
      {/* HEADER */}
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Birthday Management</h1>
          <p>Manage birthday adverts and wishes for ZUCA members</p>
        </div>

        <div className="header-actions">
          <button
            className="admin-refresh-btn add-birthday-btn"
            onClick={handleOpenModal}
          >
            <FiPlus size={18} />
            Add Birthday
          </button>

          <button className="admin-refresh-btn" onClick={fetchData}>
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {success && (
        <div className="admin-success-alert">
          <FiCheck size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="admin-error-alert">
          <FiAlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* =====================================================
          STATS
          ===================================================== */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiUsers size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalOptedIn || 0}</span>
            <span className="stat-label">Opted In</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiCamera size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalWithPhoto || 0}</span>
            <span className="stat-label">With Photo</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FiTrendingUp size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalBirthdayAds || 0}</span>
            <span className="stat-label">Total Adverts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiCalendar size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.todayBirthdays || 0}</span>
            <span className="stat-label">Today's Birthdays</span>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      {detailedStats && (
        <div className="detailed-stats">
          <div className="detail-stat">
            <span className="detail-value">{detailedStats.totalWithMessage || 0}</span>
            <span className="detail-label">With Message</span>
          </div>
          <div className="detail-stat">
            <span className="detail-value">{detailedStats.upcomingBirthdays || 0}</span>
            <span className="detail-label">Upcoming (7 days)</span>
          </div>
        </div>
      )}

      {/* =====================================================
          SETTINGS
          ===================================================== */}

      <div className="settings-section">
        <h3>
          <FiSettings size={18} />
          Settings
        </h3>

        <div className="settings-grid">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings?.autoCreateAdvert || false}
              onChange={(e) =>
                handleUpdateSettings("autoCreateAdvert", e.target.checked)
              }
            />
            <span className="toggle-slider" />
            Auto-create adverts
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings?.sendPushToAll || false}
              onChange={(e) =>
                handleUpdateSettings("sendPushToAll", e.target.checked)
              }
            />
            <span className="toggle-slider" />
            Send push notifications
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings?.sendToWhatsApp || false}
              onChange={(e) =>
                handleUpdateSettings("sendToWhatsApp", e.target.checked)
              }
            />
            <span className="toggle-slider" />
            Send to WhatsApp groups
          </label>
        </div>
      </div>

      {/* =====================================================
          WHATSAPP GROUPS
          ===================================================== */}

      <div className="settings-section">
        <h3>
          <FaWhatsapp size={18} style={{ color: "#25D366" }} />
          WhatsApp Groups for Birthday Messages
        </h3>

        <p className="section-description">
          Select which WhatsApp groups should receive birthday messages
        </p>

        {loadingGroups ? (
          <div className="loading-groups">Loading groups...</div>
        ) : whatsAppGroups.length === 0 ? (
          <div className="empty-groups">
            <FiAlertCircle size={20} />
            <div>
              <div className="empty-groups-title">No WhatsApp groups found</div>
              <div className="empty-groups-desc">
                Link the WhatsApp bot first in admin settings
              </div>
            </div>
          </div>
        ) : (
          <div className="whatsapp-groups-grid">
            {whatsAppGroups.map((group) => (
              <label key={group.groupId} className="group-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(group.groupId)}
                  onChange={() => toggleGroup(group.groupId)}
                />
                <span className="checkmark" />
                <span className="group-name">
                  {group.groupName || "Unnamed Group"}
                </span>
                <span className="group-participants">
                  {group.participants || 0} members
                </span>
                {selectedGroups.includes(group.groupId) && (
                  <span className="group-selected-badge">Selected</span>
                )}
              </label>
            ))}
          </div>
        )}

        <div className="helper-text">
          {selectedGroups.length > 0
            ? `${selectedGroups.length} group(s) selected for birthday messages`
            : "Select at least one group to send birthday messages"}
        </div>

        <button
          className="save-groups-btn"
          onClick={handleSaveWhatsAppGroups}
          disabled={processing || loadingGroups}
        >
          {processing ? "Saving..." : "Save WhatsApp Groups"}
        </button>
      </div>

      {/* =====================================================
          TABS
          ===================================================== */}

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === "today" ? "active" : ""}`}
          onClick={() => setActiveTab("today")}
        >
          <FiClock size={16} />
          Today's Birthdays ({todayBirthdays.length})
        </button>

        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <FiUsers size={16} />
          All Birthdays ({allBirthdays.length})
        </button>
      </div>

      {/* =====================================================
          TODAY
          ===================================================== */}

      {activeTab === "today" && (
        <div className="birthday-list-section">
          <div className="section-header">
            <h3>
              <FiCalendar size={18} />
              Today's Birthdays
            </h3>

            <button
              className="process-all-btn"
              onClick={handleProcessAll}
              disabled={processing || todayBirthdays.length === 0}
            >
              <FiSend size={16} />
              {processing ? "Processing..." : "Process All"}
            </button>
          </div>

          {todayBirthdays.length === 0 ? (
            <div className="empty-state">
              <FiCalendar size={48} />
              <p>No birthdays today</p>
              <span>Check back tomorrow</span>
            </div>
          ) : (
            <div className="birthday-list">
              {todayBirthdays.map((user) => (
                <div key={user.id} className="birthday-item">
                  <div className="birthday-user">
                    <div className="user-avatar">
                      {user.birthdayPhoto ? (
                        <img
                          src={getImageUrl(user.birthdayPhoto)}
                          alt={user.fullName}
                        />
                      ) : (
                        <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="user-info">
                      <span className="user-name">{user.fullName}</span>
                      <span className="user-email">{user.email}</span>
                      <span className="user-membership">
                        {user.membership_number}
                      </span>
                    </div>
                  </div>

                  <div className="birthday-status">
                    {user.birthdayAdvertId ? (
                      <span className="badge completed">
                        <FiCheck size={14} />
                        Processed
                      </span>
                    ) : (
                      <span className="badge pending">
                        <FiClock size={14} />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="birthday-actions">
                    {user.birthdayAdvertId ? (
                      <button
                        className="delete-ad-btn"
                        onClick={() =>
                          handleDeleteAdvert(user.id, user.birthdayAdvertId)
                        }
                        disabled={processing}
                      >
                        <FiTrash2 size={14} />
                        Delete Ad
                      </button>
                    ) : (
                      <button
                        className="process-btn"
                        onClick={() => handleProcessSingle(user.id)}
                        disabled={processing}
                      >
                        <FiSend size={14} />
                        Process
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          ALL BIRTHDAYS
          ===================================================== */}

      {activeTab === "all" && (
        <div className="birthday-list-section">
          <div className="section-header">
            <h3>
              <FiUsers size={18} />
              All Users (Opted In)
            </h3>

            <div className="search-wrapper">
              <FiSearch size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or membership..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {allBirthdays.length === 0 ? (
            <div className="empty-state">
              <FiUser size={48} />
              <p>No users have opted in yet</p>
              <span>Users can opt in from their profile settings</span>
            </div>
          ) : filteredBirthdays.length === 0 ? (
            <div className="empty-state">
              <FiSearch size={48} />
              <p>No results found</p>
              <span>Try a different search term</span>
            </div>
          ) : (
            <div className="birthday-list">
              {filteredBirthdays.map((user) => (
                <div key={user.id} className="birthday-item">
                  <div className="birthday-user">
                    <div className="user-avatar">
                      {user.profileImage ? (
                        <img
                          src={getImageUrl(user.profileImage)}
                          alt={user.fullName}
                        />
                      ) : user.birthdayPhoto ? (
                        <img
                          src={getImageUrl(user.birthdayPhoto)}
                          alt={user.fullName}
                        />
                      ) : (
                        <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="user-info">
                      <span className="user-name">{user.fullName}</span>
                      <span className="user-email">{user.email}</span>
                      <span className="user-membership">
                        {user.membership_number}
                      </span>
                      <span className="user-birthday">
                        🎂 {formatDate(user.birthDate)}
                      </span>
                    </div>
                  </div>

                 <div className="birthday-status">
  {user.birthdayAdvertId && typeof user.birthdayAdvertId === 'string' && !user.birthdayAdvertId.startsWith('processing-') ? (
    <span className="badge completed">
      <FiCheck size={14} /> Advert Created
    </span>
  ) : user.birthdayAdvertId && typeof user.birthdayAdvertId === 'string' && user.birthdayAdvertId.startsWith('processing-') ? (
    <span className="badge processing">
      <FiClock size={14} /> Processing...
    </span>
  ) : (
    <span className="badge pending">
      <FiClock size={14} /> Not Processed
    </span>
  )}
</div>

                  <div className="birthday-actions">
                    <button
                      className="edit-user-btn"
                      onClick={() => handleEditUser(user)}
                      disabled={processing}
                      title="Edit birthday"
                    >
                      <FiEdit size={14} />
                      Edit
                    </button>

                    <button
                      className="toggle-optin-btn"
                      onClick={() =>
                        handleToggleOptIn(user.id, user.birthdayOptIn)
                      }
                      disabled={processing}
                      title={user.birthdayOptIn ? "Disable opt-in" : "Enable opt-in"}
                    >
                      {user.birthdayOptIn ? (
                        <FiEye size={14} />
                      ) : (
                        <FiEyeOff size={14} />
                      )}
                      {user.birthdayOptIn ? "Opted In" : "Opted Out"}
                    </button>

                    {user.birthdayAdvertId && typeof user.birthdayAdvertId === 'string' && !user.birthdayAdvertId.startsWith('processing-') ? (
  <button
    className="delete-ad-btn"
    onClick={() => handleDeleteAdvert(user.id, user.birthdayAdvertId)}
    disabled={processing}
  >
    <FiTrash2 size={14} />
    Delete Ad
  </button>
) : !user.birthdayAdvertId ? (
  <button
    className="process-btn"
    onClick={() => handleProcessSingle(user.id)}
    disabled={processing}
  >
    <FiSend size={14} />
    Process
  </button>
) : null}

                    <button
                      className="delete-user-btn"
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteModal(true);
                      }}
                      disabled={processing}
                      title="Delete birthday data"
                    >
                      <FiTrash2 size={14} />
                      Clear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          ADD / EDIT BIRTHDAY MODAL
          ===================================================== */}

      {(showAddModal || showEditModal) && (
        <div
          className="modal-overlay"
          onClick={() => !processing && (setShowAddModal(false), setShowEditModal(false))}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FiUserPlus size={20} />
                {showEditModal ? "Edit Birthday" : "Add/Edit Birthday"}
              </h2>

              <button
                className="modal-close"
                onClick={() => {
                  if (!processing) {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="modal-body">
              {/* USER SEARCH - Only in Add mode */}
              {showAddModal && !selectedUser ? (
                <div className="search-user-section">
                  <label className="form-label">Search for a user</label>

                  <div className="search-input-wrapper">
                    <FiSearch className="search-input-icon" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or membership number..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="search-user-input"
                    />
                  </div>

                  {loadingAllUsers ? (
                    <div className="loading-users-indicator">
                      <div className="loading-spinner" />
                      Loading users...
                    </div>
                  ) : (
                    <div className="user-list-container">
                      {filteredUsers.length === 0 ? (
                        <div className="no-results">
                          <FiUser size={24} />
                          <p>No users found</p>
                          <span>Try a different search term</span>
                        </div>
                      ) : (
                        <div className="user-list-scroll">
                          {filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className="search-result-item"
                              onClick={() => handleSelectUser(user)}
                            >
                              <div className="result-avatar">
                                {user.profileImage ? (
                                  <img
                                    src={getImageUrl(user.profileImage)}
                                    alt={user.fullName}
                                  />
                                ) : (
                                  <span>
                                    {user.fullName?.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="result-info">
                                <div className="result-name">{user.fullName}</div>
                                <div className="result-email">{user.email}</div>
                                <div className="result-member">
                                  {user.membership_number}
                                </div>
                              </div>

                              {user.birthDate ? (
                                <span className="result-birthday">
                                  🎂 {formatDate(user.birthDate)}
                                </span>
                              ) : (
                                <span className="result-no-birthday">
                                  No birthday set
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* SELECTED USER FORM */
                <div>
                  <div className="selected-user-bar">
                    {showAddModal && (
                      <button
                        className="back-to-search"
                        onClick={() => {
                          setSelectedUser(null);
                          setUserSearch("");
                          setFilteredUsers(allUsers);
                        }}
                        disabled={processing}
                      >
                        <FiArrowLeft size={16} />
                        Change User
                      </button>
                    )}

                    <div className="selected-user-info">
                      <div className="selected-user-avatar">
                        {selectedUser?.profileImage ? (
                          <img
                            src={getImageUrl(selectedUser.profileImage)}
                            alt={selectedUser.fullName}
                          />
                        ) : (
                          <span>
                            {selectedUser?.fullName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="selected-user-name">
                          {selectedUser?.fullName}
                        </div>
                        <div className="selected-user-email">
                          {selectedUser?.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OPT IN */}
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={addFormData.birthdayOptIn}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            birthdayOptIn: e.target.checked,
                          })
                        }
                        className="form-checkbox"
                      />
                      Opt in for birthday wishes
                    </label>
                  </div>

                  {/* DATE */}
                  <div className="form-group">
                    <label className="form-label">Birthday Date *</label>
                    <div className="input-wrapper">
                      <FiCalendar className="input-icon" />
                      <input
                        type="date"
                        value={addFormData.birthDate}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            birthDate: e.target.value,
                          })
                        }
                        className="date-input"
                      />
                    </div>
                  </div>

                  {/* BIRTHDAY PHOTO */}
                  <div className="form-group">
                    <label className="form-label">
                      <FiImage size={16} />
                      Birthday Photo
                    </label>

                    <div className="photo-section">
                      {addPhotoPreview ? (
                        <div className="photo-preview-container">
                          <img
                            src={addPhotoPreview}
                            alt="Birthday"
                            className="photo-preview-img"
                          />

                          <div className="photo-overlay">
                            <span>16:9 Birthday Image</span>
                          </div>

                          <div className="photo-actions">
                            <label className="photo-change-btn">
                              <FiUpload size={14} />
                              Change Photo
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAddPhotoSelect}
                                className="hidden-input"
                                disabled={processing}
                              />
                            </label>

                            <button
                              type="button"
                              className="photo-remove-btn"
                              onClick={handleRemovePhoto}
                              disabled={processing}
                            >
                              <FiTrash2 size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="upload-placeholder">
                          <FiCamera size={36} />
                          <strong>Upload Birthday Photo</strong>
                          <span>Portrait or landscape images supported</span>
                          <span className="upload-note">
                            Automatically converted to 16:9
                          </span>
                          <span>PNG, JPG, WEBP — Max 10MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAddPhotoSelect}
                            className="hidden-input"
                            disabled={processing}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* MESSAGE */}
                  <div className="form-group">
                    <label className="form-label">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      value={addFormData.birthdayMessage}
                      onChange={(e) =>
                        setAddFormData({
                          ...addFormData,
                          birthdayMessage: e.target.value,
                        })
                      }
                      placeholder="Write a personal birthday message..."
                      rows="3"
                      className="textarea"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => {
                  if (!processing) {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }
                }}
                disabled={processing}
              >
                Cancel
              </button>

              {selectedUser && (
                <button
                  className="save-btn"
                  onClick={handleSaveUserBirthday}
                  disabled={processing}
                >
                  {processing ? "Saving..." : "Save Birthday"}
                  {!processing && <FiSave size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      {showDeleteModal && userToDelete && (
  <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
    <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>
          <FiTrash2 size={22} style={{ color: "#dc2626" }} />
          Delete Birthday Data
        </h2>
        <button
          className="modal-close"
          onClick={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }}
        >
          <FiX size={24} />
        </button>
      </div>

      <div className="modal-body">
        <div className="delete-confirm-content">
          <FiAlertCircle size={56} color="#dc2626" />
          <h3>Are you sure?</h3>
          <p>
            This will permanently delete all birthday data for{" "}
            <strong style={{ color: "#0f172a" }}>{userToDelete.fullName}</strong>
          </p>
          <ul>
            <li>Birthday date</li>
            <li>Birthday photo</li>
            <li>Birthday message</li>
            <li>Opt-in status</li>
            {userToDelete.birthdayAdvertId && typeof userToDelete.birthdayAdvertId === 'string' && (
              <li>Birthday advertisement</li>
            )}
          </ul>
          <p className="delete-warning">⚠️ This action cannot be undone.</p>
        </div>
      </div>

      <div className="modal-footer">
        <button
          className="cancel-btn"
          onClick={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }}
          disabled={processing}
        >
          Cancel
        </button>
        <button
          className="delete-confirm-btn"
          onClick={handleDeleteUserBirthday}
          disabled={processing}
        >
          {processing ? "Deleting..." : "Delete Birthday Data"}
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  </div>
)}

      {/* =========================================================
          STYLES
          ========================================================= */}

      <style>{`
        .birthday-admin-page { padding:24px; max-width:1200px; margin:0 auto; }
        .admin-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .admin-header-left h1 { font-size:24px; font-weight:700; color:#0f172a; margin:0 0 4px; }
        .admin-header-left p { font-size:14px; color:#64748b; margin:0; }
        .header-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .admin-refresh-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 20px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; font-weight:600; color:#0f172a; cursor:pointer; transition:.2s; }
        .admin-refresh-btn:hover { background:#e2e8f0; }
        .add-birthday-btn { background:#2563eb; color:#fff; border-color:#2563eb; }
        .add-birthday-btn:hover { background:#1d4ed8; }
        .spinning { animation:spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .admin-success-alert, .admin-error-alert { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:10px; margin-bottom:20px; }
        .admin-success-alert { background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; }
        .admin-error-alert { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
        .admin-success-alert button, .admin-error-alert button { margin-left:auto; background:none; border:none; cursor:pointer; color:inherit; }

        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
        .stat-card { display:flex; align-items:center; gap:14px; padding:18px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; }
        .stat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
        .stat-icon.blue { background:#dbeafe; color:#2563eb; }
        .stat-icon.green { background:#dcfce7; color:#16a34a; }
        .stat-icon.purple { background:#f3e8ff; color:#9333ea; }
        .stat-icon.orange { background:#fef3c7; color:#d97706; }
        .stat-content { display:flex; flex-direction:column; }
        .stat-value { font-size:24px; font-weight:800; color:#0f172a; }
        .stat-label { font-size:12px; color:#64748b; }

        .detailed-stats { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
        .detail-stat { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 20px; display:flex; align-items:center; gap:12px; flex:1; min-width:120px; }
        .detail-value { font-size:20px; font-weight:800; color:#0f172a; }
        .detail-label { font-size:12px; color:#64748b; }

        .settings-section { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin-bottom:24px; }
        .settings-section h3 { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:700; color:#0f172a; margin:0 0 16px; }
        .section-description { color:#64748b; font-size:14px; margin:0 0 16px; }
        .settings-grid { display:flex; gap:24px; flex-wrap:wrap; }
        .toggle-label { display:flex; align-items:center; gap:10px; cursor:pointer; font-size:14px; font-weight:500; color:#0f172a; }
        .toggle-label input { display:none; }
        .toggle-slider { position:relative; width:40px; height:22px; border-radius:999px; background:#cbd5e1; transition:.2s; }
        .toggle-slider::after { content:""; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.15); }
        .toggle-label input:checked + .toggle-slider { background:#2563eb; }
        .toggle-label input:checked + .toggle-slider::after { transform:translateX(18px); }

        .whatsapp-groups-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; max-height:250px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px; margin:8px 0; }
        .group-checkbox { display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px 12px; border-radius:8px; font-size:13px; border:1px solid transparent; }
        .group-checkbox:hover { background:#f5f5f5; border-color:#e0e0e0; }
        .group-checkbox input { display:none; }
        .checkmark { width:18px; height:18px; border:2px solid #d0d0d0; border-radius:4px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .group-checkbox input:checked + .checkmark { background:#2563eb; border-color:#2563eb; }
        .group-checkbox input:checked + .checkmark::after { content:"✓"; color:#fff; font-size:12px; }
        .group-name { font-weight:500; flex:1; }
        .group-participants { font-size:11px; color:#666; }
        .group-selected-badge { font-size:10px; color:#2563eb; background:#dbeafe; padding:2px 10px; border-radius:12px; font-weight:600; }

        .empty-groups { display:flex; align-items:center; gap:12px; padding:16px; background:#fef9e7; border:1px solid #fdebd0; border-radius:8px; }
        .empty-groups-title { font-weight:500; color:#1a1a1a; font-size:14px; }
        .empty-groups-desc { font-size:12px; color:#666; }
        .loading-groups { padding:16px; text-align:center; color:#64748b; background:#f8fafc; border-radius:8px; }
        .helper-text { font-size:12px; color:#64748b; margin:8px 0 12px; }
        .save-groups-btn { width:100%; padding:10px; background:#25D366; color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; }
        .save-groups-btn:disabled { opacity:.5; cursor:not-allowed; }

        .tabs-container { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .tab-btn { display:flex; align-items:center; gap:8px; padding:10px 20px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; font-weight:600; color:#64748b; cursor:pointer; }
        .tab-btn.active { background:#2563eb; color:#fff; border-color:#2563eb; }

        .birthday-list-section { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; }
        .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px; }
        .section-header h3 { display:flex; align-items:center; gap:8px; font-size:16px; color:#0f172a; margin:0; }
        .search-wrapper { position:relative; display:flex; align-items:center; }
        .search-icon { position:absolute; left:12px; color:#94a3b8; }
        .search-input { padding:8px 12px 8px 36px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; width:280px; outline:none; }
        .search-input:focus { border-color:#2563eb; }

        .process-all-btn, .process-btn { display:flex; align-items:center; gap:8px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
        .process-all-btn { padding:8px 16px; font-size:13px; }
        .process-btn { padding:6px 14px; font-size:12px; }
        .process-all-btn:disabled, .process-btn:disabled { opacity:.5; cursor:not-allowed; }

        .empty-state { text-align:center; padding:40px; color:#94a3b8; }
        .empty-state p { font-size:16px; font-weight:600; color:#64748b; margin:0; }
        .empty-state span { font-size:14px; }

        .birthday-list { display:flex; flex-direction:column; gap:12px; }
        .birthday-item { display:flex; align-items:center; gap:16px; padding:14px; background:#f8fafc; border-radius:12px; border:1px solid #f1f5f9; flex-wrap:wrap; }
        .birthday-user { display:flex; align-items:center; gap:12px; flex:1; min-width:200px; }
        .user-avatar { width:44px; height:44px; border-radius:50%; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }
        .user-avatar span { font-size:18px; font-weight:700; color:#64748b; }
        .user-info { display:flex; flex-direction:column; }
        .user-name { font-weight:600; color:#0f172a; }
        .user-email { font-size:12px; color:#64748b; }
        .user-membership { font-size:11px; color:#94a3b8; }
        .user-birthday { font-size:12px; color:#2563eb; font-weight:600; }
        .birthday-status { flex-shrink:0; }
        .badge { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; }
        .badge.completed { background:#dcfce7; color:#16a34a; }
        .badge.pending { background:#fef3c7; color:#d97706; }
        .badge.processing { background:#dbeafe; color:#2563eb; }
        .birthday-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .edit-user-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; }
        .edit-user-btn:disabled { opacity:.5; cursor:not-allowed; }
        .toggle-optin-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; }
        .toggle-optin-btn:disabled { opacity:.5; cursor:not-allowed; }
        .delete-user-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; }
        .delete-user-btn:disabled { opacity:.5; cursor:not-allowed; }
        .delete-ad-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; }
        .delete-ad-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* MODAL STYLES */
        .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; }
        .modal-content { background:#fff; border-radius:16px; max-width:640px; width:100%; max-height:90vh; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.2); }
       .delete-modal {
  max-width: 480px;
  width: 100%;
  margin: auto;
  position: relative;
  top: 50%;
  transform: translateY(-50%);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  margin: auto;
}

.delete-modal .modal-body {
  text-align: center;
  padding: 32px 24px;
}

.delete-confirm-content {
  text-align: center;
  padding: 10px 0;
}

.delete-confirm-content h3 {
  font-size: 22px;
  color: #0f172a;
  margin: 16px 0 8px;
}

.delete-confirm-content p {
  color: #64748b;
  font-size: 15px;
  margin: 8px 0;
  line-height: 1.6;
}

.delete-confirm-content ul {
  text-align: left;
  color: #64748b;
  font-size: 14px;
  margin: 16px auto;
  padding-left: 20px;
  max-width: 320px;
  list-style: disc;
}

.delete-confirm-content ul li {
  margin: 6px 0;
}

.delete-warning {
  color: #dc2626 !important;
  font-weight: 700;
  margin-top: 12px !important;
  padding: 10px;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}

.delete-confirm-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.delete-confirm-btn:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
}

.delete-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid #e2e8f0; }
        .modal-header h2 { display:flex; align-items:center; gap:10px; font-size:18px; color:#0f172a; margin:0; }
        .modal-close { background:none; border:none; color:#94a3b8; cursor:pointer; }
        .modal-body { padding:24px; overflow:auto; max-height:calc(90vh - 140px); }
        .modal-footer { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid #e2e8f0; }
        .cancel-btn { padding:8px 20px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
        .cancel-btn:disabled { opacity:.5; cursor:not-allowed; }
        .save-btn { display:flex; align-items:center; gap:8px; padding:8px 20px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
        .save-btn:disabled { opacity:.5; cursor:not-allowed; }
        .delete-confirm-btn { display:flex; align-items:center; gap:8px; padding:8px 20px; background:#dc2626; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
        .delete-confirm-btn:disabled { opacity:.5; cursor:not-allowed; }

        .delete-confirm-content { text-align:center; padding:16px 0; }
        .delete-confirm-content h3 { font-size:20px; color:#0f172a; margin:12px 0 8px; }
        .delete-confirm-content p { color:#64748b; font-size:14px; margin:8px 0; }
        .delete-confirm-content ul { text-align:left; color:#64748b; font-size:14px; margin:12px auto; padding-left:24px; max-width:300px; }
        .delete-confirm-content ul li { margin:4px 0; }
        .delete-warning { color:#dc2626 !important; font-weight:600; }

        /* USER SEARCH */
        .search-user-section { display:flex; flex-direction:column; gap:12px; }
        .form-label { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#0f172a; }
        .form-checkbox { width:18px; height:18px; accent-color:#2563eb; }
        .search-input-wrapper { position:relative; }
        .search-input-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; }
        .search-user-input { width:100%; padding:10px 12px 10px 40px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
        .search-user-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }

        .user-list-container { border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; }
        .user-list-scroll { max-height:350px; overflow-y:auto; }
        .user-list-scroll::-webkit-scrollbar { width:6px; }
        .user-list-scroll::-webkit-scrollbar-track { background:#f1f5f9; }
        .user-list-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }

        .search-result-item { display:flex; align-items:center; gap:12px; padding:10px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; }
        .search-result-item:last-child { border-bottom:none; }
        .search-result-item:hover { background:#f8fafc; }
        .result-avatar, .selected-user-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .result-avatar { width:36px; height:36px; }
        .result-avatar img, .selected-user-avatar img { width:100%; height:100%; object-fit:cover; }
        .result-info { flex:1; }
        .result-name { font-weight:600; font-size:14px; color:#0f172a; }
        .result-email { font-size:12px; color:#64748b; }
        .result-member { font-size:11px; color:#94a3b8; }
        .result-birthday { font-size:11px; color:#2563eb; background:#dbeafe; padding:2px 8px; border-radius:12px; }
        .result-no-birthday { font-size:11px; color:#94a3b8; }

        .loading-users-indicator { display:flex; align-items:center; justify-content:center; gap:12px; padding:40px; color:#64748b; }
        .loading-spinner { width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation:spin .8s linear infinite; }
        .no-results { text-align:center; padding:40px; color:#94a3b8; }
        .no-results p { font-weight:600; color:#64748b; margin:4px 0; }

        .selected-user-bar { display:flex; align-items:center; gap:16px; padding:12px 16px; background:#f8fafc; border-radius:12px; margin-bottom:20px; flex-wrap:wrap; }
        .back-to-search { display:flex; align-items:center; gap:6px; background:none; border:none; color:#64748b; font-size:13px; cursor:pointer; }
        .back-to-search:hover { color:#0f172a; }
        .selected-user-info { display:flex; align-items:center; gap:12px; flex:1; }
        .selected-user-name { font-weight:600; color:#0f172a; }
        .selected-user-email { font-size:12px; color:#64748b; }

        .form-group { margin-bottom:16px; }
        .input-wrapper { position:relative; }
        .input-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; }
        .date-input, .textarea { width:100%; border:1px solid #cbd5e1; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
        .date-input { padding:10px 12px 10px 40px; }
        .date-input:focus, .textarea:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
        .textarea { padding:10px 12px; resize:vertical; font-family:inherit; min-height:80px; }

        .photo-section { position:relative; margin-top:10px; }
        .photo-preview-container { position:relative; border-radius:12px; overflow:hidden; background:#0f172a; }
        .photo-preview-img { width:100%; aspect-ratio:16/9; object-fit:contain; display:block; background:#0f172a; }
        .photo-overlay { position:absolute; top:10px; left:10px; background:rgba(15,23,42,.75); color:#fff; padding:5px 9px; border-radius:6px; font-size:11px; font-weight:600; pointer-events:none; }
        .photo-actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
        .photo-change-btn, .photo-remove-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; }
        .photo-change-btn { background:#2563eb; color:#fff; }
        .photo-remove-btn { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .hidden-input { display:none; }
        .upload-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:170px; border:2px dashed #cbd5e1; border-radius:12px; background:#f8fafc; cursor:pointer; padding:20px; gap:7px; text-align:center; color:#64748b; transition:.2s; }
        .upload-placeholder:hover { border-color:#2563eb; background:#eff6ff; color:#2563eb; }
        .upload-placeholder strong { color:#0f172a; font-size:15px; }
        .upload-note { color:#2563eb; font-weight:600; font-size:12px; }

        @media(max-width:768px) {
          .birthday-admin-page { padding:16px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); }
          .settings-grid { flex-direction:column; gap:12px; }
          .birthday-item { flex-wrap:wrap; }
          .birthday-status { margin-left:auto; }
          .search-input { width:100%; }
          .whatsapp-groups-grid { grid-template-columns:1fr; }
          .admin-header { flex-direction:column; align-items:stretch; }
          .header-actions { width:100%; }
          .header-actions button { flex:1; }
          .modal-content { max-height:95vh; }
          .modal-body { max-height:calc(95vh - 130px); }
          .birthday-actions { width:100%; }
          .birthday-actions button { flex:1; justify-content:center; }
        }

        @media(max-width:480px) {
          .stats-grid { grid-template-columns:1fr; }
          .section-header { flex-direction:column; align-items:stretch; }
          .search-wrapper { width:100%; }
          .search-input { width:100%; }
          .process-all-btn { width:100%; justify-content:center; }
          .selected-user-bar { flex-direction:column; align-items:stretch; }
          .modal-overlay { padding:10px; }
          .modal-body { padding:18px; }
          .modal-header, .modal-footer { padding-left:18px; padding-right:18px; }
        }
      `}</style>
    </div>
  );
}