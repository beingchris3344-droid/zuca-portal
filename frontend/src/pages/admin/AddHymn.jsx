// frontend/src/pages/admin/BirthdayManagement.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import {
  FiRefreshCw, FiCalendar, FiUser, FiCheck, FiX, FiClock,
  FiUsers, FiSend, FiSettings, FiTrendingUp, FiCamera, FiAlertCircle,
  FiTrash2, FiSearch, FiPlus, FiUpload, FiSave, FiArrowLeft,
  FiEdit, FiEye, FiEyeOff, FiMoreVertical, FiChevronDown,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

/* =========================================================
   HELPERS
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
        const sw = image.naturalWidth;
        const sh = image.naturalHeight;
        const bgScale = Math.max(canvasWidth / sw, canvasHeight / sh);
        const bw = sw * bgScale;
        const bh = sh * bgScale;
        ctx.save();
        ctx.filter = "blur(35px)";
        ctx.drawImage(image, (canvasWidth - bw) / 2, (canvasHeight - bh) / 2, bw, bh);
        ctx.restore();
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        const fgScale = Math.min(canvasWidth / sw, canvasHeight / sh);
        const fw = sw * fgScale;
        const fh = sh * fgScale;
        ctx.drawImage(image, (canvasWidth - fw) / 2, (canvasHeight - fh) / 2, fw, fh);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Failed to process image."));
              return;
            }
            resolve(
              new File([blob], "birthday-16x9.jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          0.92
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load selected image."));
    };
    image.src = objectUrl;
  });
};

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http") || image.startsWith("data:")) return image;
  return `${BASE_URL}/${image.replace(/^\/+/, "")}`;
};

/* =========================================================
   SORT OPTIONS
   ========================================================= */
const TODAY_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "member-asc", label: "Membership # (low → high)" },
  { value: "member-desc", label: "Membership # (high → low)" },
  { value: "status-pending", label: "Status (pending first)" },
  { value: "status-processed", label: "Status (processed first)" },
];

const ALL_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "member-asc", label: "Membership # (low → high)" },
  { value: "member-desc", label: "Membership # (high → low)" },
  { value: "birthday-upcoming", label: "Birthday (nearest first)" },
  { value: "birthday-latest", label: "Birthday (latest first)" },
  { value: "status-processed", label: "Status (advert created first)" },
  { value: "status-pending", label: "Status (not processed first)" },
];

const GROUP_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "members-desc", label: "Members (high → low)" },
  { value: "members-asc", label: "Members (low → high)" },
];

/* =========================================================
   SORTING HELPERS
   ========================================================= */
const compareStrings = (a, b) =>
  (a || "").toString().toLowerCase().localeCompare((b || "").toString().toLowerCase());
const compareNumbers = (a, b) => (Number(a) || 0) - (Number(b) || 0);

const dayOfYear = (dateStr) => {
  if (!dateStr) return 99999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 99999;
  const start = new Date(2000, 0, 0);
  return Math.floor((d - start) / (1000 * 60 * 60 * 24));
};

const isProcessedFn = (advertId) =>
  advertId && typeof advertId === "string" && !advertId.startsWith("processing-");

const sortBirthdays = (list, sortBy) => {
  const arr = [...list];
  switch (sortBy) {
    case "name-asc":
      return arr.sort((a, b) => compareStrings(a.fullName, b.fullName));
    case "name-desc":
      return arr.sort((a, b) => compareStrings(b.fullName, a.fullName));
    case "member-asc":
      return arr.sort((a, b) => compareNumbers(a.membership_number, b.membership_number));
    case "member-desc":
      return arr.sort((a, b) => compareNumbers(b.membership_number, a.membership_number));
    case "birthday-upcoming":
      return arr.sort((a, b) => dayOfYear(a.birthDate) - dayOfYear(b.birthDate));
    case "birthday-latest":
      return arr.sort((a, b) => dayOfYear(b.birthDate) - dayOfYear(a.birthDate));
    case "status-pending":
      return arr.sort((a, b) => {
        const pa = isProcessedFn(a.birthdayAdvertId);
        const pb = isProcessedFn(b.birthdayAdvertId);
        if (pa === pb) return compareStrings(a.fullName, b.fullName);
        return pa ? 1 : -1;
      });
    case "status-processed":
      return arr.sort((a, b) => {
        const pa = isProcessedFn(a.birthdayAdvertId);
        const pb = isProcessedFn(b.birthdayAdvertId);
        if (pa === pb) return compareStrings(a.fullName, b.fullName);
        return pa ? -1 : 1;
      });
    default:
      return arr;
  }
};

const sortGroups = (list, sortBy) => {
  const arr = [...list];
  switch (sortBy) {
    case "name-asc":
      return arr.sort((a, b) => compareStrings(a.groupName, b.groupName));
    case "name-desc":
      return arr.sort((a, b) => compareStrings(b.groupName, a.groupName));
    case "members-desc":
      return arr.sort((a, b) => compareNumbers(b.participants, a.participants));
    case "members-asc":
      return arr.sort((a, b) => compareNumbers(a.participants, b.participants));
    default:
      return arr;
  }
};

/* =========================================================
   SORT SELECT
   ========================================================= */
function SortSelect({ value, onChange, options }) {
  return (
    <div className="bd-sort">
      <span className="bd-sort-label">Sort by</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FiChevronDown size={13} className="bd-sort-chevron" />
    </div>
  );
}

/* =========================================================
   SKELETON (isolated component so it doesn't re-render parent)
   ========================================================= */
function Skeleton() {
  return (
    <div className="bd-page">
      <div className="bd-container">
        <div className="bd-skeleton-header">
          <div>
            <div className="bd-skeleton bd-skeleton-title" />
            <div className="bd-skeleton bd-skeleton-subtitle" />
          </div>
          <div className="bd-skeleton-actions">
            <div className="bd-skeleton bd-skeleton-btn" />
            <div className="bd-skeleton bd-skeleton-btn" />
          </div>
        </div>
        <div className="bd-skeleton-stats">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bd-skeleton-stat">
              <div className="bd-skeleton bd-skeleton-icon" />
              <div style={{ flex: 1 }}>
                <div className="bd-skeleton bd-skeleton-line-md" style={{ width: 60 }} />
                <div className="bd-skeleton bd-skeleton-line-sm" style={{ width: 90, marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="bd-skeleton-panel">
          <div className="bd-skeleton-list">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bd-skeleton-row">
                <div className="bd-skeleton bd-skeleton-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="bd-skeleton bd-skeleton-line-md" style={{ width: 160 }} />
                  <div className="bd-skeleton bd-skeleton-line-sm" style={{ width: 220, marginTop: 6 }} />
                </div>
                <div className="bd-skeleton bd-skeleton-pill" />
                <div className="bd-skeleton bd-skeleton-btn-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{skeletonCSS}</style>
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */
export default function BirthdayManagement() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [settings, setSettings] = useState(null);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [stats, setStats] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState("today");
  const [activeSection, setActiveSection] = useState("birthdays");
  const [openRowMenu, setOpenRowMenu] = useState(null);

  const [todaySort, setTodaySort] = useState("name-asc");
  const [allSort, setAllSort] = useState("name-asc");
  const [groupSort, setGroupSort] = useState("name-asc");

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

  const [whatsAppGroups, setWhatsAppGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const successTimer = useRef(null);
  const errorTimer = useRef(null);
  const searchDebounce = useRef(null);

  /* ---------------- TOASTS ---------------- */
  const flashSuccess = useCallback((msg) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(msg);
    successTimer.current = setTimeout(() => setSuccess(""), 3000);
  }, []);

  const flashError = useCallback((msg) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setError(msg);
    errorTimer.current = setTimeout(() => setError(""), 5000);
  }, []);

  /* ---------------- HELPERS ---------------- */
  const isProcessed = (id) =>
    id && typeof id === "string" && !id.startsWith("processing-");
  const isProcessingAdvert = (id) =>
    id && typeof id === "string" && id.startsWith("processing-");

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not set";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Not set";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  /* ---------------- FETCH ---------------- */
  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [settingsRes, todayRes, statsRes, allRes, detailedRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/birthday/settings`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/today`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/stats`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/all`, { headers }),
        axios.get(`${BASE_URL}/api/birthday/admin/stats/detailed`, { headers }),
      ]);
      setSettings(settingsRes.data.settings);
      setTodayBirthdays(todayRes.data.users || []);
      setAllBirthdays(allRes.data.users || []);
      setStats(statsRes.data.stats);
      setDetailedStats(detailedRes.data.stats);
    } catch (err) {
      console.error("Fetch error:", err);
      flashError("Failed to load birthday data");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [flashError]);

  const fetchWhatsAppGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const token = localStorage.getItem("token");
      const [groupsRes, settingsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/birthday/whatsapp-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BASE_URL}/api/birthday/birthday-whatsapp/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (groupsRes.data.success) setWhatsAppGroups(groupsRes.data.groups || []);
      if (settingsRes.data.success)
        setSelectedGroups(settingsRes.data.settings?.selectedGroupIds || []);
    } catch (err) {
      console.error("Error fetching WhatsApp groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    fetchWhatsAppGroups();
  }, [fetchData, fetchWhatsAppGroups]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".bd-row-menu-wrap")) setOpenRowMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchTerm(searchInput), 200);
    return () => clearTimeout(searchDebounce.current);
  }, [searchInput]);

  useEffect(() => {
    if (userSearch.trim() === "") {
      setFilteredUsers(allUsers);
      return;
    }
    const q = userSearch.toLowerCase();
    setFilteredUsers(
      allUsers.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.membership_number?.toLowerCase().includes(q)
      )
    );
  }, [userSearch, allUsers]);

  /* ---------------- DERIVED LISTS ---------------- */
  const sortedTodayBirthdays = useMemo(
    () => sortBirthdays(todayBirthdays, todaySort),
    [todayBirthdays, todaySort]
  );

  const filteredBirthdays = useMemo(() => {
    if (!searchTerm) return allBirthdays;
    const q = searchTerm.toLowerCase();
    return allBirthdays.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.membership_number?.toLowerCase().includes(q)
    );
  }, [allBirthdays, searchTerm]);

  const sortedAllBirthdays = useMemo(
    () => sortBirthdays(filteredBirthdays, allSort),
    [filteredBirthdays, allSort]
  );

  const sortedGroups = useMemo(
    () => sortGroups(whatsAppGroups, groupSort),
    [whatsAppGroups, groupSort]
  );

  /* ---------------- OPTIMISTIC HELPERS ---------------- */
  const updateUserInLists = useCallback((userId, updates) => {
    setAllBirthdays((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    setTodayBirthdays((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
  }, []);

  const removeUserFromLists = useCallback((userId) => {
    setAllBirthdays((prev) => prev.filter((u) => u.id !== userId));
    setTodayBirthdays((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const addUserToList = useCallback((user) => {
    setAllBirthdays((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...user };
        return copy;
      }
      return [user, ...prev];
    });
  }, []);

  /* ---------------- MODALS ---------------- */
  const handleOpenModal = async () => {
    setShowAddModal(true);
    setSelectedUser(null);
    setUserSearch("");
    setAddFormData({ birthDate: "", birthdayOptIn: true, birthdayMessage: "" });
    setAddPhotoFile(null);
    setAddPhotoPreview(null);
    if (allUsers.length === 0) {
      setLoadingAllUsers(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BASE_URL}/api/birthday/admin/users?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const users = res.data.users || [];
        setAllUsers(users);
        setFilteredUsers(users);
      } catch (err) {
        console.error(err);
        flashError("Failed to load users");
      } finally {
        setLoadingAllUsers(false);
      }
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
    setOpenRowMenu(null);
    if (user.birthDate) {
      const d = new Date(user.birthDate);
      setAddFormData({
        birthDate: d.toISOString().split("T")[0],
        birthdayOptIn: user.birthdayOptIn !== undefined ? user.birthdayOptIn : true,
        birthdayMessage: user.birthdayMessage || "",
      });
      setAddPhotoPreview(getImageUrl(user.birthdayPhoto));
    } else {
      setAddFormData({ birthDate: "", birthdayOptIn: true, birthdayMessage: "" });
      setAddPhotoPreview(null);
    }
    setAddPhotoFile(null);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    if (user.birthDate) {
      const d = new Date(user.birthDate);
      setAddFormData({
        birthDate: d.toISOString().split("T")[0],
        birthdayOptIn: user.birthdayOptIn !== undefined ? user.birthdayOptIn : true,
        birthdayMessage: user.birthdayMessage || "",
      });
      setAddPhotoPreview(getImageUrl(user.birthdayPhoto));
    } else {
      setAddFormData({ birthDate: "", birthdayOptIn: true, birthdayMessage: "" });
      setAddPhotoPreview(null);
    }
    setAddPhotoFile(null);
    setFilteredUsers([]);
    setUserSearch("");
  };

  const handleAddPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) return flashError("Please select a valid image file.");
    if (file.size > 10 * 1024 * 1024) return flashError("Photo must be less than 10MB.");
    try {
      const processed = await createBirthdayImage(file);
      setAddPhotoFile(processed);
      setAddPhotoPreview(URL.createObjectURL(processed));
    } catch (err) {
      console.error(err);
      flashError("Failed to process the photo.");
    }
  };

  const handleRemovePhoto = () => {
    setAddPhotoFile(null);
    setAddPhotoPreview(null);
  };

  /* ---------------- SAVE (OPTIMISTIC) ---------------- */
  const handleSaveUserBirthday = async () => {
    if (!selectedUser) return flashError("Please select a user first");
    if (!addFormData.birthDate) return flashError("Please select a birth date");

    const isNew = !allBirthdays.some((u) => u.id === selectedUser.id);
    const originalAll = [...allBirthdays];
    const originalToday = [...todayBirthdays];

    // Optimistic: apply immediately
    const optimistic = {
      birthdayOptIn: addFormData.birthdayOptIn,
      birthDate: addFormData.birthDate,
      birthdayMessage: addFormData.birthdayMessage || "",
      birthdayPhoto: addPhotoPreview || selectedUser.birthdayPhoto || null,
      ...selectedUser,
    };

    if (isNew) addUserToList(optimistic);
    else updateUserInLists(selectedUser.id, optimistic);

    // Close modal instantly
    setShowAddModal(false);
    setShowEditModal(false);
    flashSuccess(`Birthday saved for ${selectedUser.fullName}`);

    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      let photoUrl = null;

      if (addPhotoFile) {
        const fd = new FormData();
        fd.append("photo", addPhotoFile, "birthday-16x9.jpg");
        const uploadRes = await axios.post(
          `${BASE_URL}/api/birthday/admin/upload-photo/${selectedUser.id}`,
          fd,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        photoUrl = uploadRes.data.photoUrl;
      } else {
        photoUrl = selectedUser.birthdayPhoto || null;
      }

      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/user/${selectedUser.id}`,
        {
          birthdayOptIn: addFormData.birthdayOptIn,
          birthDate: addFormData.birthDate,
          birthdayMessage: addFormData.birthdayMessage || "",
          birthdayPhoto: photoUrl || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reconcile with server data
      if (res.data?.user) {
        updateUserInLists(selectedUser.id, res.data.user);
      }

      // Reset form
      setSelectedUser(null);
      setAddFormData({ birthDate: "", birthdayOptIn: true, birthdayMessage: "" });
      setAddPhotoFile(null);
      setAddPhotoPreview(null);
    } catch (err) {
      console.error("Error saving birthday:", err);
      setAllBirthdays(originalAll);
      setTodayBirthdays(originalToday);
      flashError(err.response?.data?.error || "Failed to save birthday");
    } finally {
      setProcessing(false);
    }
  };

  /* ---------------- TOGGLE OPT-IN (OPTIMISTIC) ---------------- */
  const handleToggleOptIn = async (userId, currentOptIn) => {
    setOpenRowMenu(null);
    const originalAll = [...allBirthdays];
    const originalToday = [...todayBirthdays];

    updateUserInLists(userId, { birthdayOptIn: !currentOptIn });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${BASE_URL}/api/birthday/admin/user/${userId}/toggle-optin`,
        { birthdayOptIn: !currentOptIn },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.user) {
        updateUserInLists(userId, { birthdayOptIn: res.data.user.birthdayOptIn });
      }
      flashSuccess(res.data?.message || "Opt-in updated");
    } catch (err) {
      console.error(err);
      setAllBirthdays(originalAll);
      setTodayBirthdays(originalToday);
      flashError("Failed to toggle opt-in");
    }
  };

  /* ---------------- DELETE USER (OPTIMISTIC) ---------------- */
  const handleDeleteUserBirthday = async () => {
    if (!userToDelete) return;
    const userId = userToDelete.id;
    const originalAll = [...allBirthdays];
    const originalToday = [...todayBirthdays];

    removeUserFromLists(userId);
    setUserToDelete(null);
    setShowDeleteModal(false);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${BASE_URL}/api/birthday/admin/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      flashSuccess(res.data?.message || "Birthday data deleted");
    } catch (err) {
      console.error(err);
      setAllBirthdays(originalAll);
      setTodayBirthdays(originalToday);
      flashError(err.response?.data?.error || "Failed to delete birthday data");
    }
  };

  /* ---------------- PROCESS ALL (OPTIMISTIC) ---------------- */
  const handleProcessAll = async () => {
    const originalToday = [...todayBirthdays];

    // Optimistic: mark all as processed
    setTodayBirthdays((prev) =>
      prev.map((u) => ({ ...u, birthdayAdvertId: u.birthdayAdvertId || `processed-${u.id}` }))
    );

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/process-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      flashSuccess(res.data?.message || "All birthdays processed");

      // Silent refresh to sync server IDs
      fetchData(true);
    } catch (err) {
      console.error(err);
      setTodayBirthdays(originalToday);
      flashError("Failed to process birthdays");
    }
  };

  /* ---------------- PROCESS SINGLE (OPTIMISTIC) ---------------- */
  const handleProcessSingle = async (userId) => {
    setOpenRowMenu(null);
    const originalAll = [...allBirthdays];
    const originalToday = [...todayBirthdays];

    updateUserInLists(userId, { birthdayAdvertId: `processed-${userId}` });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE_URL}/api/birthday/admin/process/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      flashSuccess(res.data?.message || "Birthday processed");

      // Silent sync
      fetchData(true);
    } catch (err) {
      console.error(err);
      setAllBirthdays(originalAll);
      setTodayBirthdays(originalToday);
      flashError("Failed to process user");
    }
  };

  /* ---------------- DELETE ADVERT (OPTIMISTIC) ---------------- */
  const handleDeleteAdvert = async (userId, advertId) => {
    setOpenRowMenu(null);
    const originalAll = [...allBirthdays];
    const originalToday = [...todayBirthdays];

    updateUserInLists(userId, { birthdayAdvertId: null });

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/advertisements/${advertId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await axios.put(
        `${BASE_URL}/api/birthday/user-settings`,
        { birthdayAdvertId: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      flashSuccess("Birthday advertisement deleted");
    } catch (err) {
      console.error(err);
      setAllBirthdays(originalAll);
      setTodayBirthdays(originalToday);
      flashError(err.response?.data?.error || "Failed to delete ad");
    }
  };

  /* ---------------- SETTINGS (OPTIMISTIC) ---------------- */
  const handleUpdateSettings = async (field, value) => {
    const originalSettings = { ...settings };
    setSettings((prev) => ({ ...prev, [field]: value }));
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${BASE_URL}/api/birthday/settings`,
        { ...settings, [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(res.data.settings);
      flashSuccess("Settings updated");
    } catch (err) {
      console.error(err);
      setSettings(originalSettings);
      flashError("Failed to update settings");
    }
  };

  /* ---------------- WHATSAPP ---------------- */
  const toggleGroup = (groupId) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSaveWhatsAppGroups = async () => {
    const originalSelected = [...selectedGroups];
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/birthday/birthday-whatsapp/save`,
        { selectedGroupIds: selectedGroups },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      flashSuccess("WhatsApp groups updated");
    } catch (err) {
      console.error(err);
      setSelectedGroups(originalSelected);
      flashError("Failed to update WhatsApp groups");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     RENDER
     ========================================================= */
  if (initialLoading) return <Skeleton />;

  return (
    <div className="bd-page">
      <div className="bd-container">
        {/* HEADER */}
        <header className="bd-header">
          <div>
            <div className="bd-eyebrow">
              <FiCamera size={12} />
              Member engagement
            </div>
            <h1 className="bd-title">Birthday Management</h1>
            <p className="bd-subtitle">
              Manage birthday adverts and wishes for ZUCA members
            </p>
          </div>
          <div className="bd-header-actions">
            <button
              className="bd-btn"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <FiRefreshCw size={14} className={refreshing ? "bd-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="bd-btn bd-btn-primary" onClick={handleOpenModal}>
              <FiPlus size={14} /> Add Birthday
            </button>
          </div>
        </header>

        {/* ALERTS */}
        {success && (
          <div className="bd-alert bd-alert-success">
            <FiCheck size={15} />
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>
              <FiX size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="bd-alert bd-alert-error">
            <FiAlertCircle size={15} />
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="bd-stats">
          <div className="bd-stat">
            <div className="bd-stat-icon"><FiUsers size={18} /></div>
            <div>
              <div className="bd-stat-value">{stats?.totalOptedIn || 0}</div>
              <div className="bd-stat-label">Opted in</div>
            </div>
          </div>
          <div className="bd-stat">
            <div className="bd-stat-icon"><FiCamera size={18} /></div>
            <div>
              <div className="bd-stat-value">{stats?.totalWithPhoto || 0}</div>
              <div className="bd-stat-label">With photo</div>
            </div>
          </div>
          <div className="bd-stat">
            <div className="bd-stat-icon"><FiTrendingUp size={18} /></div>
            <div>
              <div className="bd-stat-value">{stats?.totalBirthdayAds || 0}</div>
              <div className="bd-stat-label">Total adverts</div>
            </div>
          </div>
          <div className="bd-stat">
            <div className="bd-stat-icon"><FiCalendar size={18} /></div>
            <div>
              <div className="bd-stat-value">{stats?.todayBirthdays || 0}</div>
              <div className="bd-stat-label">Today</div>
            </div>
          </div>
        </div>

        {detailedStats && (
          <div className="bd-detail-stats">
            <div className="bd-detail-stat">
              <span className="bd-detail-value">{detailedStats.totalWithMessage || 0}</span>
              <span className="bd-detail-label">With message</span>
            </div>
            <div className="bd-detail-stat">
              <span className="bd-detail-value">{detailedStats.upcomingBirthdays || 0}</span>
              <span className="bd-detail-label">Upcoming (7 days)</span>
            </div>
          </div>
        )}

        {/* SECTION TABS */}
        <nav className="bd-section-tabs">
          <button
            className={`bd-section-tab ${activeSection === "birthdays" ? "active" : ""}`}
            onClick={() => setActiveSection("birthdays")}
          >
            <FiUsers size={14} /> Birthdays
          </button>
          <button
            className={`bd-section-tab ${activeSection === "settings" ? "active" : ""}`}
            onClick={() => setActiveSection("settings")}
          >
            <FiSettings size={14} /> Settings
          </button>
          <button
            className={`bd-section-tab ${activeSection === "whatsapp" ? "active" : ""}`}
            onClick={() => setActiveSection("whatsapp")}
          >
            <FaWhatsapp size={14} /> WhatsApp
          </button>
        </nav>

        {/* SETTINGS */}
        {activeSection === "settings" && (
          <section className="bd-panel">
            <div className="bd-panel-head">
              <h3><FiSettings size={15} /> Birthday settings</h3>
              <p className="bd-panel-sub">Control how birthdays are processed automatically</p>
            </div>
            <div className="bd-toggles">
              <label className="bd-toggle">
                <input
                  type="checkbox"
                  checked={settings?.autoCreateAdvert || false}
                  onChange={(e) => handleUpdateSettings("autoCreateAdvert", e.target.checked)}
                />
                <span className="bd-toggle-slider" />
                <span className="bd-toggle-text">Auto-create adverts</span>
              </label>
              <label className="bd-toggle">
                <input
                  type="checkbox"
                  checked={settings?.sendPushToAll || false}
                  onChange={(e) => handleUpdateSettings("sendPushToAll", e.target.checked)}
                />
                <span className="bd-toggle-slider" />
                <span className="bd-toggle-text">Send push notifications</span>
              </label>
              <label className="bd-toggle">
                <input
                  type="checkbox"
                  checked={settings?.sendToWhatsApp || false}
                  onChange={(e) => handleUpdateSettings("sendToWhatsApp", e.target.checked)}
                />
                <span className="bd-toggle-slider" />
                <span className="bd-toggle-text">Send to WhatsApp groups</span>
              </label>
            </div>
          </section>
        )}

        {/* WHATSAPP */}
        {activeSection === "whatsapp" && (
          <section className="bd-panel">
            <div className="bd-panel-head">
              <div>
                <h3><FaWhatsapp size={15} /> WhatsApp groups</h3>
                <p className="bd-panel-sub">Choose which groups receive birthday messages</p>
              </div>
              {whatsAppGroups.length > 0 && (
                <SortSelect value={groupSort} onChange={setGroupSort} options={GROUP_SORT_OPTIONS} />
              )}
            </div>
            {loadingGroups ? (
              <div className="bd-loading">Loading groups...</div>
            ) : whatsAppGroups.length === 0 ? (
              <div className="bd-empty-inline">
                <FiAlertCircle size={18} />
                <div>
                  <div className="bd-empty-inline-title">No WhatsApp groups found</div>
                  <div className="bd-empty-inline-sub">Link the WhatsApp bot first in admin settings</div>
                </div>
              </div>
            ) : (
              <div className="bd-groups-grid">
                {sortedGroups.map((group) => {
                  const selected = selectedGroups.includes(group.groupId);
                  return (
                    <label
                      key={group.groupId}
                      className={`bd-group-card ${selected ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleGroup(group.groupId)}
                      />
                      <span className="bd-group-check" />
                      <div className="bd-group-info">
                        <div className="bd-group-name">{group.groupName || "Unnamed Group"}</div>
                        <div className="bd-group-meta">{group.participants || 0} members</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="bd-helper">
              {selectedGroups.length > 0
                ? `${selectedGroups.length} group(s) selected`
                : "Select at least one group"}
            </div>
            <button
              className="bd-btn bd-btn-primary bd-btn-full"
              onClick={handleSaveWhatsAppGroups}
              disabled={processing || loadingGroups}
            >
              {processing ? "Saving..." : "Save WhatsApp groups"}
            </button>
          </section>
        )}

        {/* BIRTHDAYS */}
        {activeSection === "birthdays" && (
          <>
            <div className="bd-tabs">
              <button
                className={`bd-tab ${activeTab === "today" ? "active" : ""}`}
                onClick={() => setActiveTab("today")}
              >
                <FiClock size={14} /> Today
                <span className="bd-tab-badge">{todayBirthdays.length}</span>
              </button>
              <button
                className={`bd-tab ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                <FiUsers size={14} /> All
                <span className="bd-tab-badge">{allBirthdays.length}</span>
              </button>
            </div>

            {activeTab === "today" && (
              <section className="bd-panel">
                <div className="bd-panel-head">
                  <div>
                    <h3><FiCalendar size={15} /> Today's birthdays</h3>
                    <p className="bd-panel-sub">
                      {todayBirthdays.length}{" "}
                      {todayBirthdays.length === 1 ? "member" : "members"} celebrating today
                    </p>
                  </div>
                  <div className="bd-panel-actions">
                    <SortSelect value={todaySort} onChange={setTodaySort} options={TODAY_SORT_OPTIONS} />
                    <button
                      className="bd-btn bd-btn-primary"
                      onClick={handleProcessAll}
                      disabled={processing || todayBirthdays.length === 0}
                    >
                      <FiSend size={13} /> Process all
                    </button>
                  </div>
                </div>

                {todayBirthdays.length === 0 ? (
                  <div className="bd-empty">
                    <FiCalendar size={26} />
                    <div className="bd-empty-title">No birthdays today</div>
                    <div className="bd-empty-sub">Check back tomorrow</div>
                  </div>
                ) : (
                  <div className="bd-list">
                    {sortedTodayBirthdays.map((user) => (
                      <div key={user.id} className="bd-row">
                        <div className="bd-row-user">
                          <div className="bd-avatar">
                            {user.birthdayPhoto ? (
                              <img src={getImageUrl(user.birthdayPhoto)} alt={user.fullName} />
                            ) : (
                              <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="bd-user-info">
                            <div className="bd-user-name">{user.fullName}</div>
                            <div className="bd-user-email">{user.email}</div>
                            <div className="bd-user-member">{user.membership_number}</div>
                          </div>
                        </div>

                        <div className="bd-row-status">
                          {isProcessed(user.birthdayAdvertId) ? (
                            <span className="bd-badge bd-badge-success">
                              <FiCheck size={12} /> Processed
                            </span>
                          ) : (
                            <span className="bd-badge bd-badge-warn">
                              <FiClock size={12} /> Pending
                            </span>
                          )}
                        </div>

                        <div className="bd-row-actions">
                          {isProcessed(user.birthdayAdvertId) ? (
                            <button
                              className="bd-btn bd-btn-sm bd-btn-danger"
                              onClick={() => handleDeleteAdvert(user.id, user.birthdayAdvertId)}
                            >
                              <FiTrash2 size={12} /> Delete ad
                            </button>
                          ) : (
                            <button
                              className="bd-btn bd-btn-sm bd-btn-primary"
                              onClick={() => handleProcessSingle(user.id)}
                            >
                              <FiSend size={12} /> Process
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "all" && (
              <section className="bd-panel">
                <div className="bd-panel-head">
                  <div>
                    <h3><FiUsers size={15} /> All opted-in members</h3>
                    <p className="bd-panel-sub">
                      {sortedAllBirthdays.length}{" "}
                      {sortedAllBirthdays.length === 1 ? "member" : "members"}
                      {searchTerm && ` matching "${searchTerm}"`}
                    </p>
                  </div>
                </div>

                <div className="bd-toolbar">
                  <div className="bd-search">
                    <FiSearch size={14} />
                    <input
                      type="text"
                      placeholder="Search by name, email, or membership"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                      <button className="bd-search-clear" onClick={() => setSearchInput("")}>
                        <FiX size={13} />
                      </button>
                    )}
                  </div>
                  <SortSelect value={allSort} onChange={setAllSort} options={ALL_SORT_OPTIONS} />
                </div>

                {allBirthdays.length === 0 ? (
                  <div className="bd-empty">
                    <FiUser size={26} />
                    <div className="bd-empty-title">No members opted in yet</div>
                    <div className="bd-empty-sub">Members can opt in from their profile settings</div>
                  </div>
                ) : sortedAllBirthdays.length === 0 ? (
                  <div className="bd-empty">
                    <FiSearch size={26} />
                    <div className="bd-empty-title">No results found</div>
                    <div className="bd-empty-sub">Try a different search term</div>
                  </div>
                ) : (
                  <div className="bd-list">
                    {sortedAllBirthdays.map((user) => (
                      <div key={user.id} className="bd-row">
                        <div className="bd-row-user">
                          <div className="bd-avatar">
                            {user.profileImage ? (
                              <img src={getImageUrl(user.profileImage)} alt={user.fullName} />
                            ) : user.birthdayPhoto ? (
                              <img src={getImageUrl(user.birthdayPhoto)} alt={user.fullName} />
                            ) : (
                              <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="bd-user-info">
                            <div className="bd-user-name">{user.fullName}</div>
                            <div className="bd-user-email">{user.email}</div>
                            <div className="bd-user-detail-row">
                              <span className="bd-user-member">{user.membership_number}</span>
                              <span className="bd-user-birthday">
                                <FiCalendar size={11} /> {formatDate(user.birthDate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bd-row-status">
                          {isProcessed(user.birthdayAdvertId) ? (
                            <span className="bd-badge bd-badge-success">
                              <FiCheck size={12} /> Advert created
                            </span>
                          ) : (
                            <span className="bd-badge bd-badge-neutral">
                              <FiClock size={12} /> Not processed
                            </span>
                          )}
                        </div>

                        <div className="bd-row-actions">
                          <button
                            className="bd-btn bd-btn-sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <FiEdit size={12} /> Edit
                          </button>

                          <div className="bd-row-menu-wrap">
                            <button
                              className="bd-icon-btn"
                              onClick={() =>
                                setOpenRowMenu(openRowMenu === user.id ? null : user.id)
                              }
                            >
                              <FiMoreVertical size={14} />
                            </button>
                            {openRowMenu === user.id && (
                              <div className="bd-row-menu">
                                <button
                                  onClick={() => handleToggleOptIn(user.id, user.birthdayOptIn)}
                                >
                                  {user.birthdayOptIn ? (
                                    <FiEyeOff size={13} />
                                  ) : (
                                    <FiEye size={13} />
                                  )}
                                  {user.birthdayOptIn ? "Opt out" : "Opt in"}
                                </button>
                                {isProcessed(user.birthdayAdvertId) ? (
                                  <button
                                    className="bd-row-menu-danger"
                                    onClick={() =>
                                      handleDeleteAdvert(user.id, user.birthdayAdvertId)
                                    }
                                  >
                                    <FiTrash2 size={13} /> Delete advert
                                  </button>
                                ) : (
                                  <button onClick={() => handleProcessSingle(user.id)}>
                                    <FiSend size={13} /> Process
                                  </button>
                                )}
                                <div className="bd-row-menu-divider" />
                                <button
                                  className="bd-row-menu-danger"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setShowDeleteModal(true);
                                    setOpenRowMenu(null);
                                  }}
                                >
                                  <FiTrash2 size={13} /> Clear birthday data
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* MODAL + DELETE MODAL — unchanged (see full file below in your project) */}
      {(showAddModal || showEditModal) && (
        <div
          className="bd-modal-overlay"
          onClick={() => !processing && (setShowAddModal(false), setShowEditModal(false))}
        >
          <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bd-modal-header">
              <div>
                <h2>{showEditModal ? "Edit birthday" : "Add birthday"}</h2>
                <p className="bd-modal-sub">
                  {showEditModal
                    ? "Update the member's birthday settings and photo"
                    : "Search for a member and set up their birthday"}
                </p>
              </div>
              <button
                className="bd-modal-close"
                onClick={() => {
                  if (!processing) {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }
                }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="bd-modal-body">
              {showAddModal && !selectedUser ? (
                <div className="bd-user-search">
                  <div className="bd-search bd-search-full">
                    <FiSearch size={15} />
                    <input
                      type="text"
                      placeholder="Search by name, email, or membership number"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  {loadingAllUsers ? (
                    <div className="bd-loading">Loading users...</div>
                  ) : (
                    <div className="bd-user-list">
                      {filteredUsers.length === 0 ? (
                        <div className="bd-empty-inline">
                          <FiUser size={18} />
                          <div>
                            <div className="bd-empty-inline-title">No users found</div>
                            <div className="bd-empty-inline-sub">Try a different search term</div>
                          </div>
                        </div>
                      ) : (
                        <div className="bd-user-list-scroll">
                          {filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className="bd-user-item"
                              onClick={() => handleSelectUser(user)}
                            >
                              <div className="bd-avatar bd-avatar-sm">
                                {user.profileImage ? (
                                  <img src={getImageUrl(user.profileImage)} alt={user.fullName} />
                                ) : (
                                  <span>{user.fullName?.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="bd-user-info">
                                <div className="bd-user-name">{user.fullName}</div>
                                <div className="bd-user-email">{user.email}</div>
                                <div className="bd-user-member">{user.membership_number}</div>
                              </div>
                              {user.birthDate ? (
                                <span className="bd-user-birthday">
                                  <FiCalendar size={11} /> {formatDate(user.birthDate)}
                                </span>
                              ) : (
                                <span className="bd-user-nobirthday">No birthday set</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bd-form">
                  <div className="bd-selected-user">
                    {showAddModal && (
                      <button
                        className="bd-back-btn"
                        onClick={() => {
                          setSelectedUser(null);
                          setUserSearch("");
                          setFilteredUsers(allUsers);
                        }}
                        disabled={processing}
                      >
                        <FiArrowLeft size={13} /> Change user
                      </button>
                    )}
                    <div className="bd-selected-user-info">
                      <div className="bd-avatar bd-avatar-sm">
                        {selectedUser?.profileImage ? (
                          <img
                            src={getImageUrl(selectedUser.profileImage)}
                            alt={selectedUser.fullName}
                          />
                        ) : (
                          <span>{selectedUser?.fullName?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="bd-user-name">{selectedUser?.fullName}</div>
                        <div className="bd-user-email">{selectedUser?.email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bd-field">
                    <label className="bd-checkbox-label">
                      <input
                        type="checkbox"
                        checked={addFormData.birthdayOptIn}
                        onChange={(e) =>
                          setAddFormData({ ...addFormData, birthdayOptIn: e.target.checked })
                        }
                      />
                      <span>Opt in for birthday wishes</span>
                    </label>
                  </div>

                  <div className="bd-field">
                    <label>Birthday date *</label>
                    <div className="bd-input-wrap">
                      <FiCalendar size={14} className="bd-input-icon" />
                      <input
                        type="date"
                        value={addFormData.birthDate}
                        onChange={(e) =>
                          setAddFormData({ ...addFormData, birthDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="bd-field">
                    <label>Birthday photo</label>
                    {addPhotoPreview ? (
                      <div className="bd-photo-preview">
                        <img src={addPhotoPreview} alt="Birthday" />
                        <div className="bd-photo-overlay">16:9 birthday image</div>
                        <div className="bd-photo-actions">
                          <label className="bd-btn bd-btn-sm bd-btn-primary">
                            <FiUpload size={12} /> Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAddPhotoSelect}
                              style={{ display: "none" }}
                              disabled={processing}
                            />
                          </label>
                          <button
                            type="button"
                            className="bd-btn bd-btn-sm bd-btn-danger"
                            onClick={handleRemovePhoto}
                            disabled={processing}
                          >
                            <FiTrash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="bd-upload">
                        <FiCamera size={28} />
                        <strong>Upload birthday photo</strong>
                        <span>Portrait or landscape supported</span>
                        <span className="bd-upload-note">Automatically converted to 16:9</span>
                        <span className="bd-upload-formats">PNG, JPG, WEBP — Max 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAddPhotoSelect}
                          style={{ display: "none" }}
                          disabled={processing}
                        />
                      </label>
                    )}
                  </div>

                  <div className="bd-field">
                    <label>Personal message (optional)</label>
                    <textarea
                      value={addFormData.birthdayMessage}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, birthdayMessage: e.target.value })
                      }
                      placeholder="Write a personal birthday message"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bd-modal-footer">
              <button
                className="bd-btn"
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
                  className="bd-btn bd-btn-primary"
                  onClick={handleSaveUserBirthday}
                  disabled={processing}
                >
                  {processing ? (
                    "Saving..."
                  ) : (
                    <>
                      <FiSave size={13} /> Save birthday
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && userToDelete && (
        <div className="bd-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="bd-modal bd-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bd-modal-header">
              <div>
                <h2>Delete birthday data</h2>
                <p className="bd-modal-sub">This action cannot be undone</p>
              </div>
              <button
                className="bd-modal-close"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="bd-modal-body">
              <div className="bd-delete-content">
                <div className="bd-delete-icon">
                  <FiAlertCircle size={26} />
                </div>
                <h3>Delete all birthday data for {userToDelete.fullName}?</h3>
                <p>The following will be permanently removed:</p>
                <ul>
                  <li>Birthday date</li>
                  <li>Birthday photo</li>
                  <li>Birthday message</li>
                  <li>Opt-in status</li>
                  {isProcessed(userToDelete.birthdayAdvertId) && <li>Birthday advertisement</li>}
                </ul>
              </div>
            </div>
            <div className="bd-modal-footer">
              <button
                className="bd-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="bd-btn bd-btn-danger-solid" onClick={handleDeleteUserBirthday}>
                <FiTrash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{mainCSS}</style>
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .bd-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .bd-container { padding: 28px 24px 60px; max-width: 1280px; margin: 0 auto; }
  .bd-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .bd-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }
  .bd-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #0f0f0f; }
  .bd-subtitle { font-size: 13.5px; color: #737373; margin: 4px 0 0 0; }
  .bd-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .bd-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .bd-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .bd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .bd-btn-primary { background: #0f0f0f; color: #ffffff; border-color: #0f0f0f; }
  .bd-btn-primary:hover { background: #262626; border-color: #262626; }
  .bd-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .bd-btn-danger:hover { background: #fef2f2; border-color: #fca5a5; }
  .bd-btn-danger-solid { background: #dc2626; color: #ffffff; border-color: #dc2626; }
  .bd-btn-danger-solid:hover { background: #b91c1c; }
  .bd-btn-sm { padding: 6px 10px; font-size: 12px; }
  .bd-btn-full { width: 100%; justify-content: center; }

  .bd-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease;
  }
  .bd-icon-btn:hover { background: #f5f5f5; color: #171717; }

  .bd-spin { animation: bd-spin 0.9s linear infinite; }
  @keyframes bd-spin { to { transform: rotate(360deg); } }

  .bd-sort {
    position: relative; display: inline-flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 9px;
    height: 38px; padding: 0 30px 0 12px; min-width: 190px;
    transition: border-color 0.15s ease;
  }
  .bd-sort:hover { border-color: #d4d4d4; }
  .bd-sort:focus-within { border-color: #0f0f0f; }
  .bd-sort-label {
    font-size: 11px; color: #a3a3a3; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    flex-shrink: 0; padding-right: 6px; border-right: 1px solid #f0f0f0;
  }
  .bd-sort select {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-weight: 500;
    cursor: pointer; appearance: none; font-family: inherit; padding: 0; min-width: 0;
  }
  .bd-sort-chevron { position: absolute; right: 11px; pointer-events: none; color: #a3a3a3; }

  .bd-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .bd-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .bd-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .bd-alert button {
    margin-left: auto; background: none; border: none; cursor: pointer;
    color: inherit; padding: 4px; border-radius: 6px; display: flex;
  }
  .bd-alert button:hover { background: rgba(0,0,0,0.05); }

  .bd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
  @media (max-width: 768px) { .bd-stats { grid-template-columns: repeat(2, 1fr); } }
  .bd-stat {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px;
    padding: 16px 18px; display: flex; align-items: center; gap: 14px;
  }
  .bd-stat-icon {
    width: 40px; height: 40px; border-radius: 10px; background: #f5f5f5;
    color: #262626; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .bd-stat-value { font-size: 22px; font-weight: 800; color: #0f0f0f; letter-spacing: -0.5px; line-height: 1.1; }
  .bd-stat-label {
    font-size: 11px; color: #737373; text-transform: uppercase;
    letter-spacing: 0.05em; font-weight: 600; margin-top: 2px;
  }

  .bd-detail-stats { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
  .bd-detail-stat {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 10px;
    padding: 10px 16px; display: flex; align-items: baseline; gap: 10px; flex: 1; min-width: 140px;
  }
  .bd-detail-value { font-size: 16px; font-weight: 800; color: #0f0f0f; }
  .bd-detail-label { font-size: 12px; color: #737373; font-weight: 500; }

  .bd-section-tabs {
    display: flex; gap: 4px; border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px; overflow-x: auto; scrollbar-width: none;
  }
  .bd-section-tabs::-webkit-scrollbar { display: none; }
  .bd-section-tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 14px; background: transparent; border: none;
    border-bottom: 2px solid transparent; color: #737373;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease; white-space: nowrap; margin-bottom: -1px; font-family: inherit;
  }
  .bd-section-tab:hover { color: #262626; }
  .bd-section-tab.active { color: #0f0f0f; border-bottom-color: #0f0f0f; }

  .bd-panel {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 14px;
    padding: 20px; margin-bottom: 20px;
  }
  .bd-panel-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .bd-panel-head h3 {
    font-size: 14px; font-weight: 700; color: #0f0f0f; margin: 0;
    display: flex; align-items: center; gap: 8px;
  }
  .bd-panel-head h3 svg { color: #737373; }
  .bd-panel-sub { font-size: 12.5px; color: #a3a3a3; margin: 4px 0 0 0; }
  .bd-panel-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

  .bd-toolbar {
    display: flex; gap: 10px; margin-bottom: 14px;
    flex-wrap: wrap; align-items: center;
  }
  .bd-toolbar .bd-search { flex: 1; min-width: 240px; max-width: none; }

  .bd-toggles { display: flex; flex-direction: column; gap: 12px; }
  .bd-toggle { display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
  .bd-toggle input { display: none; }
  .bd-toggle-slider {
    position: relative; width: 36px; height: 20px; border-radius: 999px;
    background: #e5e5e5; transition: all 0.2s ease; flex-shrink: 0;
  }
  .bd-toggle-slider::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%; background: #ffffff;
    transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .bd-toggle input:checked + .bd-toggle-slider { background: #0f0f0f; }
  .bd-toggle input:checked + .bd-toggle-slider::after { transform: translateX(16px); }
  .bd-toggle-text { font-size: 13.5px; color: #262626; font-weight: 500; }

  .bd-groups-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    max-height: 340px; overflow-y: auto; padding: 2px; margin-bottom: 14px;
  }
  @media (max-width: 640px) { .bd-groups-grid { grid-template-columns: 1fr; } }
  .bd-group-card {
    display: flex; align-items: center; gap: 12px; padding: 12px 14px;
    border-radius: 10px; border: 1px solid #e5e5e5; background: #ffffff;
    cursor: pointer; transition: all 0.15s ease;
  }
  .bd-group-card:hover { border-color: #d4d4d4; background: #fafafa; }
  .bd-group-card.selected { border-color: #0f0f0f; background: #fafafa; }
  .bd-group-card input { display: none; }
  .bd-group-check {
    width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid #d4d4d4;
    background: #ffffff; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 0.15s ease;
  }
  .bd-group-card input:checked + .bd-group-check { background: #0f0f0f; border-color: #0f0f0f; }
  .bd-group-card input:checked + .bd-group-check::after {
    content: "✓"; color: #ffffff; font-size: 11px; font-weight: 700;
  }
  .bd-group-info { flex: 1; min-width: 0; }
  .bd-group-name {
    font-size: 13px; font-weight: 600; color: #171717;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .bd-group-meta { font-size: 11.5px; color: #a3a3a3; margin-top: 2px; }

  .bd-helper { font-size: 12px; color: #737373; margin-bottom: 12px; }

  .bd-tabs {
    display: flex; gap: 4px; background: #f5f5f5; padding: 4px;
    border-radius: 10px; margin-bottom: 16px; width: fit-content; max-width: 100%;
  }
  .bd-tab {
    display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px;
    background: transparent; border: none; border-radius: 7px;
    color: #737373; font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease; font-family: inherit;
  }
  .bd-tab:hover { color: #262626; }
  .bd-tab.active {
    background: #ffffff; color: #0f0f0f; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .bd-tab-badge {
    background: #e5e5e5; color: #525252; padding: 1px 7px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700; min-width: 18px; text-align: center;
  }
  .bd-tab.active .bd-tab-badge { background: #0f0f0f; color: #ffffff; }

  .bd-search {
    flex: 1; min-width: 240px; max-width: 360px;
    display: flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 9px;
    padding: 0 12px; height: 38px; color: #737373; transition: border-color 0.15s ease;
  }
  .bd-search:focus-within { border-color: #a3a3a3; }
  .bd-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-family: inherit; height: 100%;
  }
  .bd-search input::placeholder { color: #a3a3a3; }
  .bd-search-clear {
    background: transparent; border: none; cursor: pointer; color: #a3a3a3;
    padding: 3px; border-radius: 6px; display: flex;
  }
  .bd-search-clear:hover { background: #f5f5f5; color: #525252; }
  .bd-search-full { max-width: none; width: 100%; margin-bottom: 12px; }

  .bd-list { display: flex; flex-direction: column; }
  .bd-row {
    display: grid; grid-template-columns: 1fr auto auto;
    align-items: center; gap: 16px; padding: 14px 4px;
    border-bottom: 1px solid #f5f5f5; transition: background 0.12s ease;
  }
  .bd-row:last-child { border-bottom: none; }
  .bd-row:hover { background: #fafafa; }
  .bd-row-user { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .bd-avatar {
    width: 42px; height: 42px; border-radius: 12px; background: #f5f5f5;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    flex-shrink: 0; font-size: 15px; font-weight: 700; color: #525252;
  }
  .bd-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .bd-avatar-sm { width: 36px; height: 36px; border-radius: 10px; font-size: 13px; }
  .bd-user-info { min-width: 0; flex: 1; }
  .bd-user-name {
    font-size: 13.5px; font-weight: 600; color: #171717;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .bd-user-email {
    font-size: 12px; color: #737373;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .bd-user-member { font-size: 11px; color: #a3a3a3; margin-top: 1px; }
  .bd-user-detail-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
  .bd-user-birthday {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; color: #525252; font-weight: 600;
    background: #f5f5f5; padding: 2px 8px; border-radius: 999px;
  }
  .bd-user-nobirthday { font-size: 11px; color: #a3a3a3; }

  .bd-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; white-space: nowrap;
  }
  .bd-badge-success { background: #f0fdf4; color: #15803d; }
  .bd-badge-warn { background: #fffbeb; color: #b45309; }
  .bd-badge-info { background: #eff6ff; color: #1d4ed8; }
  .bd-badge-neutral { background: #f5f5f5; color: #525252; }

  .bd-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .bd-row-menu-wrap { position: relative; }
  .bd-row-menu {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 10px;
    padding: 4px; min-width: 190px;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.15);
    z-index: 30; animation: bd-menu-in 0.12s ease;
  }
  @keyframes bd-menu-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .bd-row-menu button {
    display: flex; align-items: center; gap: 9px; width: 100%;
    padding: 8px 10px; background: transparent; border: none;
    color: #262626; font-size: 12.5px; font-weight: 500;
    text-align: left; border-radius: 7px; cursor: pointer;
    transition: background 0.12s ease; font-family: inherit;
  }
  .bd-row-menu button:hover { background: #f5f5f5; }
  .bd-row-menu-danger { color: #b91c1c !important; }
  .bd-row-menu-danger:hover { background: #fef2f2 !important; }
  .bd-row-menu-divider { height: 1px; background: #f0f0f0; margin: 4px 6px; }

  .bd-empty {
    text-align: center; padding: 56px 24px; color: #a3a3a3;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .bd-empty svg { color: #d4d4d4; }
  .bd-empty-title { font-size: 14.5px; font-weight: 700; color: #262626; margin-top: 4px; }
  .bd-empty-sub { font-size: 12.5px; color: #a3a3a3; }

  .bd-empty-inline {
    display: flex; align-items: center; gap: 12px; padding: 18px;
    background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; color: #737373;
  }
  .bd-empty-inline-title { font-size: 13px; font-weight: 600; color: #262626; }
  .bd-empty-inline-sub { font-size: 12px; color: #a3a3a3; margin-top: 2px; }

  .bd-loading { padding: 32px 16px; text-align: center; color: #a3a3a3; font-size: 13px; }

  .bd-modal-overlay {
    position: fixed; inset: 0; background: rgba(15, 15, 15, 0.5);
    backdrop-filter: blur(2px); display: flex; align-items: center;
    justify-content: center; padding: 16px; z-index: 1000;
  }
  .bd-modal {
    background: #ffffff; border-radius: 16px; width: 100%; max-width: 640px;
    max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
    animation: bd-modal-in 0.2s ease;
  }
  .bd-modal-sm { max-width: 460px; }
  @keyframes bd-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .bd-modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 20px 22px; border-bottom: 1px solid #f0f0f0; gap: 12px;
  }
  .bd-modal-header h2 {
    font-size: 16px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.2px;
  }
  .bd-modal-sub { font-size: 12.5px; color: #a3a3a3; margin: 4px 0 0 0; }
  .bd-modal-close {
    background: transparent; border: none; color: #a3a3a3; cursor: pointer;
    padding: 6px; border-radius: 6px; display: flex; transition: all 0.15s ease;
  }
  .bd-modal-close:hover { background: #f5f5f5; color: #171717; }
  .bd-modal-body { padding: 20px 22px; overflow-y: auto; flex: 1; }
  .bd-modal-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 14px 22px; border-top: 1px solid #f0f0f0; background: #fafafa;
  }

  .bd-form { display: flex; flex-direction: column; gap: 16px; }
  .bd-selected-user {
    display: flex; align-items: center; gap: 14px; padding: 12px 14px;
    background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; flex-wrap: wrap;
  }
  .bd-selected-user-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .bd-back-btn {
    display: inline-flex; align-items: center; gap: 5px;
    background: transparent; border: 1px solid #e5e5e5; padding: 5px 10px;
    border-radius: 7px; color: #525252; font-size: 11.5px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all 0.15s ease;
  }
  .bd-back-btn:hover { background: #f5f5f5; color: #171717; }
  .bd-back-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .bd-field { display: flex; flex-direction: column; gap: 7px; }
  .bd-field > label {
    font-size: 11.5px; font-weight: 700; color: #525252;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .bd-field input[type="date"],
  .bd-field input[type="text"],
  .bd-field textarea {
    width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5;
    border-radius: 9px; font-size: 13.5px; color: #171717;
    font-family: inherit; background: #ffffff; transition: border-color 0.15s ease;
  }
  .bd-field input:focus, .bd-field textarea:focus { outline: none; border-color: #0f0f0f; }
  .bd-field textarea { resize: vertical; min-height: 80px; }

  .bd-input-wrap { position: relative; }
  .bd-input-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: #a3a3a3; pointer-events: none;
  }
  .bd-input-wrap input { padding-left: 36px; }

  .bd-checkbox-label {
    display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
    font-size: 13px; color: #262626; font-weight: 500;
    text-transform: none; letter-spacing: normal;
  }
  .bd-checkbox-label input[type="checkbox"] {
    width: 16px; height: 16px; accent-color: #0f0f0f; cursor: pointer;
  }

  .bd-photo-preview { position: relative; border-radius: 10px; overflow: hidden; background: #0f0f0f; }
  .bd-photo-preview img {
    width: 100%; aspect-ratio: 16 / 9; object-fit: contain;
    display: block; background: #0f0f0f;
  }
  .bd-photo-overlay {
    position: absolute; top: 10px; left: 10px;
    background: rgba(15, 15, 15, 0.7); color: #ffffff;
    padding: 4px 9px; border-radius: 6px; font-size: 10.5px; font-weight: 600;
    pointer-events: none;
  }
  .bd-photo-actions { display: flex; gap: 8px; margin-top: 10px; }

  .bd-upload {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 160px; padding: 24px;
    border: 2px dashed #d4d4d4; border-radius: 12px; background: #fafafa;
    color: #737373; cursor: pointer; transition: all 0.15s ease;
    text-align: center; gap: 6px;
  }
  .bd-upload:hover { border-color: #0f0f0f; background: #f5f5f5; color: #262626; }
  .bd-upload strong {
    font-size: 13.5px; color: #171717; font-weight: 600; margin-top: 4px;
  }
  .bd-upload span { font-size: 12px; }
  .bd-upload-note { color: #525252; font-weight: 600; font-size: 11.5px; }
  .bd-upload-formats { color: #a3a3a3; font-size: 11px; }

  .bd-user-search { display: flex; flex-direction: column; }
  .bd-user-list { border: 1px solid #e5e5e5; border-radius: 10px; overflow: hidden; }
  .bd-user-list-scroll { max-height: 360px; overflow-y: auto; }
  .bd-user-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 14px;
    cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background 0.12s ease;
  }
  .bd-user-item:last-child { border-bottom: none; }
  .bd-user-item:hover { background: #fafafa; }

  .bd-delete-content { text-align: center; }
  .bd-delete-icon {
    width: 56px; height: 56px; border-radius: 14px;
    background: #fef2f2; color: #b91c1c;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;
  }
  .bd-delete-content h3 { font-size: 15px; font-weight: 700; color: #0f0f0f; margin: 0 0 6px; }
  .bd-delete-content p { font-size: 13px; color: #737373; margin: 0 0 12px; }
  .bd-delete-content ul {
    text-align: left; list-style: disc; padding-left: 22px;
    margin: 0 auto; max-width: 300px; font-size: 12.5px; color: #525252; line-height: 1.8;
  }

  @media (max-width: 768px) {
    .bd-container { padding: 20px 16px 40px; }
    .bd-title { font-size: 22px; }
    .bd-row { grid-template-columns: 1fr auto; gap: 10px; }
    .bd-row-status { grid-column: 1 / -1; }
    .bd-row-actions { grid-column: 1 / -1; justify-content: flex-end; }
    .bd-search { max-width: none; width: 100%; }
    .bd-panel-head { flex-direction: column; align-items: stretch; }
    .bd-panel-actions { width: 100%; justify-content: space-between; }
    .bd-sort { min-width: 0; width: 100%; }
    .bd-toolbar { flex-direction: column; align-items: stretch; }
    .bd-toolbar .bd-sort { width: 100%; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .bd-skeleton {
    background: #ececec; border-radius: 6px; position: relative; overflow: hidden;
  }
  .bd-skeleton::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: bd-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes bd-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .bd-skeleton-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; padding-bottom: 22px; border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px; flex-wrap: wrap;
  }
  .bd-skeleton-title { width: 220px; height: 26px; }
  .bd-skeleton-subtitle { width: 300px; height: 13px; margin-top: 8px; }
  .bd-skeleton-actions { display: flex; gap: 8px; }
  .bd-skeleton-btn { width: 120px; height: 38px; border-radius: 9px; }
  .bd-skeleton-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 22px;
  }
  @media (max-width: 768px) { .bd-skeleton-stats { grid-template-columns: repeat(2, 1fr); } }
  .bd-skeleton-stat {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px;
    padding: 16px 18px; display: flex; align-items: center; gap: 14px;
  }
  .bd-skeleton-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
  .bd-skeleton-line-md { height: 18px; border-radius: 4px; }
  .bd-skeleton-line-sm { height: 11px; border-radius: 4px; }
  .bd-skeleton-panel {
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 14px;
    padding: 20px; margin-bottom: 20px;
  }
  .bd-skeleton-list { display: flex; flex-direction: column; }
  .bd-skeleton-row {
    display: flex; align-items: center; gap: 14px; padding: 14px 4px;
    border-bottom: 1px solid #f5f5f5;
  }
  .bd-skeleton-row:last-child { border-bottom: none; }
  .bd-skeleton-avatar { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; }
  .bd-skeleton-pill { width: 100px; height: 22px; border-radius: 999px; }
  .bd-skeleton-btn-sm { width: 70px; height: 32px; border-radius: 8px; }
`;

const mainCSS = baseCSS;

