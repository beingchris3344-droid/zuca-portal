// frontend/src/pages/admin/Advertisements.jsx

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { api } from "../../api";
import {
  FiPlus, FiEdit2, FiTrash2, FiPower, FiRefreshCw, FiImage,
  FiCalendar, FiExternalLink, FiX, FiCheck, FiClock,
  FiAlertCircle, FiArrowLeft, FiChevronDown, FiSearch,
  FiMoreVertical, FiLink,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/* =========================================================
   PORTAL PAGES (grouped)
   ========================================================= */
const PORTAL_PAGES_GROUPED = [
  {
    group: "Public",
    pages: [
      { label: "Landing Page", path: "/" },
      { label: "Home", path: "/home" },
      { label: "Login", path: "/login" },
      { label: "Register", path: "/register" },
      { label: "Forgot Password", path: "/forgot-password" },
      { label: "Reset Password", path: "/reset-password" },
      { label: "User Manual", path: "/user-manual" },
      { label: "Payment Page", path: "/pay" },
      { label: "Payment Success", path: "/payment-success" },
    ],
  },
  {
    group: "Worship & Readings",
    pages: [
      { label: "Prayer Book", path: "/prayer" },
      { label: "Liturgical Calendar", path: "/liturgical-calendar" },
      { label: "Mass Readings", path: "/mass-readings" },
      { label: "Hymn Book", path: "/hymns" },
    ],
  },
  {
    group: "Member Portal",
    pages: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Announcements", path: "/announcements" },
      { label: "Mass Programs", path: "/mass-programs" },
      { label: "Schedules", path: "/schedules" },
      { label: "Contributions", path: "/contributions" },
      { label: "Jumuia Contributions", path: "/jumuia-contributions" },
      { label: "Join Jumuia", path: "/join-jumuia" },
      { label: "Executive Team", path: "/executive" },
      { label: "Meeting Minutes", path: "/executive/minutes" },
      { label: "Member Attendance", path: "/member/attendance" },
      { label: "Attendance History", path: "/member/attendance-history" },
    ],
  },
  {
    group: "Media",
    pages: [
      { label: "Gallery", path: "/gallery" },
      { label: "ZUCA / YouTube", path: "/youtube" },
    ],
  },
  {
    group: "Communication",
    pages: [
      { label: "Messenger", path: "/messenger" },
      { label: "Chat", path: "/chat" },
    ],
  },
  {
    group: "Games",
    pages: [
      { label: "Games Arcade", path: "/games" },
      { label: "Tic Tac Toe", path: "/games/tictactoe" },
      { label: "Snake", path: "/games/snake" },
      { label: "Bible Trivia", path: "/games/trivia" },
      { label: "Chess", path: "/games/chess" },
    ],
  },
  {
    group: "Feedback",
    pages: [
      { label: "Feedback", path: "/feedback" },
      { label: "Feedback History", path: "/feedback/history" },
    ],
  },
  {
    group: "Profile",
    pages: [{ label: "My Profile", path: "/profile" }],
  },
];

/* =========================================================
   SORT + FILTER OPTIONS
   ========================================================= */
const SORT_OPTIONS = [
  { value: "recent", label: "Recently created" },
  { value: "title-asc", label: "Title (A → Z)" },
  { value: "title-desc", label: "Title (Z → A)" },
  { value: "status-active", label: "Status (active first)" },
  { value: "status-scheduled", label: "Status (scheduled first)" },
  { value: "status-expired", label: "Status (expired first)" },
  { value: "start-asc", label: "Start date (soonest)" },
  { value: "start-desc", label: "Start date (latest)" },
  { value: "end-asc", label: "End date (soonest)" },
  { value: "end-desc", label: "End date (latest)" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];

/* =========================================================
   HELPERS
   ========================================================= */
const getStatus = (ad) => {
  const now = new Date();
  const start = new Date(ad.startDate);
  const end = new Date(ad.endDate);
  if (end <= now) return "expired";
  if (start > now) return "scheduled";
  if (ad.active) return "active";
  return "inactive";
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTimeLocal = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const sortAdvertisements = (list, sortBy) => {
  const arr = [...list];
  const statusRank = { active: 0, scheduled: 1, expired: 2, inactive: 3 };
  switch (sortBy) {
    case "title-asc":
      return arr.sort((a, b) =>
        (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase())
      );
    case "title-desc":
      return arr.sort((a, b) =>
        (b.title || "").toLowerCase().localeCompare((a.title || "").toLowerCase())
      );
    case "status-active":
      return arr.sort((a, b) => statusRank[getStatus(a)] - statusRank[getStatus(b)]);
    case "status-scheduled":
      return arr.sort((a, b) => {
        const ra = getStatus(a) === "scheduled" ? 0 : 1;
        const rb = getStatus(b) === "scheduled" ? 0 : 1;
        return ra - rb;
      });
    case "status-expired":
      return arr.sort((a, b) => {
        const ra = getStatus(a) === "expired" ? 0 : 1;
        const rb = getStatus(b) === "expired" ? 0 : 1;
        return ra - rb;
      });
    case "start-asc":
      return arr.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    case "start-desc":
      return arr.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    case "end-asc":
      return arr.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    case "end-desc":
      return arr.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    case "recent":
    default:
      return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
};

/* =========================================================
   SKELETON
   ========================================================= */
function Skeleton() {
  return (
    <div className="ads-page">
      <div className="ads-container">
        <div className="ads-skeleton-header">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ads-skeleton ads-skeleton-circle" />
            <div>
              <div className="ads-skeleton ads-skeleton-title" />
              <div className="ads-skeleton ads-skeleton-subtitle" />
            </div>
          </div>
          <div className="ads-skeleton-actions">
            <div className="ads-skeleton ads-skeleton-btn" />
            <div className="ads-skeleton ads-skeleton-btn" />
            <div className="ads-skeleton ads-skeleton-btn" />
          </div>
        </div>

        <div className="ads-skeleton-stats">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ads-skeleton-stat">
              <div className="ads-skeleton ads-skeleton-icon" />
              <div style={{ flex: 1 }}>
                <div className="ads-skeleton ads-skeleton-line-md" style={{ width: 40 }} />
                <div
                  className="ads-skeleton ads-skeleton-line-sm"
                  style={{ width: 80, marginTop: 6 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="ads-skeleton-toolbar">
          <div className="ads-skeleton ads-skeleton-input" />
          <div className="ads-skeleton ads-skeleton-input" style={{ maxWidth: 180 }} />
          <div className="ads-skeleton ads-skeleton-input" style={{ maxWidth: 200 }} />
        </div>

        <div className="ads-skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="ads-skeleton-card">
              <div className="ads-skeleton ads-skeleton-image" />
              <div
                className="ads-skeleton ads-skeleton-line-md"
                style={{ width: "70%", marginTop: 14 }}
              />
              <div
                className="ads-skeleton ads-skeleton-line-sm"
                style={{ width: "100%", marginTop: 8 }}
              />
              <div
                className="ads-skeleton ads-skeleton-line-sm"
                style={{ width: "85%", marginTop: 6 }}
              />
              <div className="ads-skeleton-row">
                <div className="ads-skeleton ads-skeleton-line-sm" style={{ width: 70 }} />
                <div className="ads-skeleton ads-skeleton-line-sm" style={{ width: 70 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{skeletonCSS}</style>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */
const Advertisements = () => {
  const navigate = useNavigate();

  const [advertisements, setAdvertisements] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [openRowMenu, setOpenRowMenu] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const [form, setForm] = useState({
    title: "",
    description: "",
    buttonText: "",
    link: "/",
    startDate: "",
    endDate: "",
    active: true,
    image: null,
  });

  const successTimer = useRef(null);
  const errorTimer = useRef(null);
  const searchDebounce = useRef(null);

  /* ---------------- TOASTS ---------------- */
  const flashSuccess = useCallback((msg) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(msg);
    successTimer.current = setTimeout(() => setSuccess(""), 3500);
  }, []);

  const flashError = useCallback((msg) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setError(msg);
    errorTimer.current = setTimeout(() => setError(""), 5000);
  }, []);

  /* ---------------- FETCH ---------------- */
  const fetchAdvertisements = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        const response = await api.get("/api/advertisements/admin/all", {
          timeout: 15000,
        });
        setAdvertisements(
          Array.isArray(response.data?.advertisements) ? response.data.advertisements : []
        );
      } catch (err) {
        console.error("Failed to fetch advertisements:", err);
        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }
        flashError(err.response?.data?.error || err.message || "Failed to load advertisements");
        setAdvertisements([]);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, flashError]
  );

  useEffect(() => {
    fetchAdvertisements(false);
  }, [fetchAdvertisements]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".ads-row-menu-wrap")) setOpenRowMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchTerm(searchInput), 200);
    return () => clearTimeout(searchDebounce.current);
  }, [searchInput]);

  /* ---------------- DERIVED ---------------- */
  const filteredAds = useMemo(() => {
    let list = [...advertisements];
    if (statusFilter !== "all") {
      list = list.filter((ad) => getStatus(ad) === statusFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (ad) =>
          (ad.title || "").toLowerCase().includes(q) ||
          (ad.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [advertisements, statusFilter, searchTerm]);

  const sortedAds = useMemo(() => sortAdvertisements(filteredAds, sortBy), [filteredAds, sortBy]);

  const counts = useMemo(() => {
    let active = 0,
      scheduled = 0,
      expired = 0,
      inactive = 0;
    advertisements.forEach((ad) => {
      const s = getStatus(ad);
      if (s === "active") active++;
      else if (s === "scheduled") scheduled++;
      else if (s === "expired") expired++;
      else if (s === "inactive") inactive++;
    });
    return { active, scheduled, expired, inactive, total: advertisements.length };
  }, [advertisements]);

  /* ---------------- FORM HANDLERS ---------------- */
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "file") {
      setForm((prev) => ({ ...prev, image: files?.[0] || null }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePageSelect = (e) => {
    const value = e.target.value;
    if (!value) return;
    setForm((prev) => ({ ...prev, link: value }));
  };

  const openCreateModal = () => {
    setEditingAd(null);
    setForm({
      title: "",
      description: "",
      buttonText: "",
      link: "/",
      startDate: "",
      endDate: "",
      active: true,
      image: null,
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (ad) => {
    setEditingAd(ad);
    setOpenRowMenu(null);
    setForm({
      title: ad.title || "",
      description: ad.description || "",
      buttonText: ad.buttonText || "",
      link: ad.link || "/",
      startDate: ad.startDate ? formatDateTimeLocal(ad.startDate) : "",
      endDate: ad.endDate ? formatDateTimeLocal(ad.endDate) : "",
      active: ad.active,
      image: null,
    });
    setError("");
    setShowModal(true);
  };

  /* ---------------- SAVE ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!form.startDate || !form.endDate) {
        flashError("Start date and end date are required.");
        setSaving(false);
        return;
      }
      if (new Date(form.endDate) <= new Date(form.startDate)) {
        flashError("End date must be after start date.");
        setSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("buttonText", form.buttonText);
      formData.append("link", form.link);
      formData.append("startDate", new Date(form.startDate).toISOString());
      formData.append("endDate", new Date(form.endDate).toISOString());
      formData.append("active", form.active);
      if (form.image) formData.append("image", form.image);

      if (editingAd) {
        await api.put(`/api/advertisements/${editingAd.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        flashSuccess("Advertisement updated.");
      } else {
        await api.post("/api/advertisements", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        flashSuccess("Advertisement created.");
      }

      setShowModal(false);
      setEditingAd(null);
      fetchAdvertisements(true);
    } catch (err) {
      console.error("Save error:", err);
      flashError(err.response?.data?.error || "Failed to save advertisement.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- TOGGLE ---------------- */
  const handleToggle = async (ad) => {
    setOpenRowMenu(null);
    const original = [...advertisements];
    setAdvertisements((prev) =>
      prev.map((a) => (a.id === ad.id ? { ...a, active: !a.active } : a))
    );

    try {
      await api.patch(`/api/advertisements/${ad.id}/toggle`);
      flashSuccess(`Advertisement ${ad.active ? "deactivated" : "activated"}.`);
    } catch (err) {
      console.error("Toggle error:", err);
      setAdvertisements(original);
      flashError(err.response?.data?.error || "Failed to update advertisement.");
    }
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (ad) => {
    setOpenRowMenu(null);
    if (!window.confirm(`Delete "${ad.title || "this advertisement"}" permanently?`)) return;
    const original = [...advertisements];
    setAdvertisements((prev) => prev.filter((a) => a.id !== ad.id));

    try {
      await api.delete(`/api/advertisements/${ad.id}`);
      flashSuccess("Advertisement deleted.");
    } catch (err) {
      console.error("Delete error:", err);
      setAdvertisements(original);
      flashError(err.response?.data?.error || "Failed to delete advertisement.");
    }
  };

  /* ---------------- CLEANUP ---------------- */
  const cleanupExpired = async () => {
    if (!window.confirm("Remove all expired advertisements?")) return;
    const original = [...advertisements];
    setAdvertisements((prev) => prev.filter((a) => getStatus(a) !== "expired"));

    try {
      const response = await api.delete("/api/advertisements/admin/cleanup-expired");
      flashSuccess(response.data?.message || "Expired advertisements cleaned up.");
    } catch (err) {
      console.error("Cleanup error:", err);
      setAdvertisements(original);
      flashError(err.response?.data?.error || "Failed to clean expired advertisements.");
    }
  };

  /* ---------------- BACK ---------------- */
  const handleBack = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user.specialRole || user.role;
    if (role === "media_moderator") navigate("/media-moderator");
    else navigate("/admin");
  };

  /* =========================================================
     RENDER
     ========================================================= */
  if (initialLoading) return <Skeleton />;

  return (
    <div className="ads-page">
      <div className="ads-container">
        {/* HEADER */}
        <header className="ads-header">
          <div className="ads-header-left">
            <button className="ads-back-btn" onClick={handleBack} title="Back">
              <FiArrowLeft size={16} />
            </button>
            <div>
              <div className="ads-eyebrow">
                <FiImage size={12} />
                Portal content
              </div>
              <h1 className="ads-title">Advertisements</h1>
              <p className="ads-subtitle">Manage ads displayed across the ZUCA Portal</p>
            </div>
          </div>
          <div className="ads-header-actions">
            <button className="ads-btn" onClick={cleanupExpired}>
              <FiClock size={14} /> Clean expired
            </button>
            <button
              className="ads-btn"
              onClick={() => fetchAdvertisements(true)}
              disabled={refreshing}
            >
              <FiRefreshCw size={14} className={refreshing ? "ads-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="ads-btn ads-btn-primary" onClick={openCreateModal}>
              <FiPlus size={14} /> New advertisement
            </button>
          </div>
        </header>

        {/* ALERTS */}
        {success && (
          <div className="ads-alert ads-alert-success">
            <FiCheck size={15} />
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>
              <FiX size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="ads-alert ads-alert-error">
            <FiAlertCircle size={15} />
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* SUMMARY (clickable filters) */}
        <div className="ads-stats">
          <button
            className={`ads-stat ${statusFilter === "active" ? "selected" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
          >
            <div className="ads-stat-icon"><FiCheck size={18} /></div>
            <div>
              <div className="ads-stat-value">{counts.active}</div>
              <div className="ads-stat-label">Active</div>
            </div>
          </button>
          <button
            className={`ads-stat ${statusFilter === "scheduled" ? "selected" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "scheduled" ? "all" : "scheduled")}
          >
            <div className="ads-stat-icon"><FiClock size={18} /></div>
            <div>
              <div className="ads-stat-value">{counts.scheduled}</div>
              <div className="ads-stat-label">Scheduled</div>
            </div>
          </button>
          <button
            className={`ads-stat ${statusFilter === "expired" ? "selected" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
          >
            <div className="ads-stat-icon"><FiAlertCircle size={18} /></div>
            <div>
              <div className="ads-stat-value">{counts.expired}</div>
              <div className="ads-stat-label">Expired</div>
            </div>
          </button>
          <button
            className={`ads-stat ${statusFilter === "all" ? "selected" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <div className="ads-stat-icon"><FiImage size={18} /></div>
            <div>
              <div className="ads-stat-value">{counts.total}</div>
              <div className="ads-stat-label">Total</div>
            </div>
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="ads-toolbar">
          <div className="ads-search">
            <FiSearch size={14} />
            <input
              type="text"
              placeholder="Search by title or description"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="ads-search-clear" onClick={() => setSearchInput("")}>
                <FiX size={13} />
              </button>
            )}
          </div>
          <div className="ads-select">
            <span className="ads-select-label">Filter</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FiChevronDown size={13} className="ads-select-chevron" />
          </div>
          <div className="ads-select">
            <span className="ads-select-label">Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FiChevronDown size={13} className="ads-select-chevron" />
          </div>
        </div>

        {/* LIST */}
        {advertisements.length === 0 ? (
          <div className="ads-empty">
            <div className="ads-empty-icon"><FiImage size={26} /></div>
            <div className="ads-empty-title">No advertisements yet</div>
            <div className="ads-empty-sub">
              Create your first advertisement to display content across the ZUCA Portal.
            </div>
            <button className="ads-btn ads-btn-primary" onClick={openCreateModal}>
              <FiPlus size={14} /> Create advertisement
            </button>
          </div>
        ) : sortedAds.length === 0 ? (
          <div className="ads-empty">
            <div className="ads-empty-icon"><FiSearch size={26} /></div>
            <div className="ads-empty-title">No ads match your filters</div>
            <div className="ads-empty-sub">
              Try changing the status filter or clearing the search.
            </div>
            <button
              className="ads-btn"
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ads-grid">
            {sortedAds.map((ad) => {
              const status = getStatus(ad);
              return (
                <div key={ad.id} className="ads-card">
                  <div className="ads-card-image">
                    {ad.image ? (
                      <img src={ad.image} alt={ad.title || "Advertisement"} />
                    ) : (
                      <div className="ads-card-noimage">
                        <FiImage size={22} />
                        <span>No image</span>
                      </div>
                    )}
                    <span className={`ads-status ${status}`}>
                      {status === "active" && (
                        <>
                          <FiCheck size={11} /> Active
                        </>
                      )}
                      {status === "scheduled" && (
                        <>
                          <FiClock size={11} /> Scheduled
                        </>
                      )}
                      {status === "expired" && (
                        <>
                          <FiAlertCircle size={11} /> Expired
                        </>
                      )}
                      {status === "inactive" && (
                        <>
                          <FiPower size={11} /> Inactive
                        </>
                      )}
                    </span>
                  </div>

                  <div className="ads-card-body">
                    <div className="ads-card-title-row">
                      <h3 className="ads-card-title">{ad.title || "Untitled advertisement"}</h3>
                      <div className="ads-row-menu-wrap">
                        <button
                          className="ads-icon-btn"
                          onClick={() => setOpenRowMenu(openRowMenu === ad.id ? null : ad.id)}
                        >
                          <FiMoreVertical size={14} />
                        </button>
                        {openRowMenu === ad.id && (
                          <div className="ads-row-menu">
                            <button onClick={() => openEditModal(ad)}>
                              <FiEdit2 size={13} /> Edit
                            </button>
                            <button onClick={() => handleToggle(ad)}>
                              <FiPower size={13} /> {ad.active ? "Deactivate" : "Activate"}
                            </button>
                            <div className="ads-row-menu-divider" />
                            <button
                              className="ads-row-menu-danger"
                              onClick={() => handleDelete(ad)}
                            >
                              <FiTrash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {ad.description && <p className="ads-card-desc">{ad.description}</p>}

                    <div className="ads-card-dates">
                      <div className="ads-date">
                        <FiCalendar size={12} />
                        <div>
                          <small>Starts</small>
                          <strong>{formatDate(ad.startDate)}</strong>
                        </div>
                      </div>
                      <div className="ads-date">
                        <FiCalendar size={12} />
                        <div>
                          <small>Ends</small>
                          <strong>{formatDate(ad.endDate)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="ads-card-meta">
                      {ad.buttonText && (
                        <span className="ads-chip">Button: {ad.buttonText}</span>
                      )}
                      {ad.link && (
                        <span className="ads-chip">
                          <FiLink size={11} /> {ad.link}
                        </span>
                      )}
                    </div>

                    <div className="ads-card-footer">
                      <span className="ads-card-created">
                        Created {formatDateTime(ad.createdAt)}
                      </span>
                      <div className="ads-card-actions">
                        {ad.link && (
                          <a
                            href={ad.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ads-icon-btn"
                            title="Open link"
                          >
                            <FiExternalLink size={14} />
                          </a>
                        )}
                        <button
                          className="ads-btn ads-btn-sm"
                          onClick={() => openEditModal(ad)}
                        >
                          <FiEdit2 size={12} /> Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          CREATE / EDIT MODAL
         ========================================================= */}
      {showModal && (
        <div
          className="ads-modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="ads-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ads-modal-header">
              <div>
                <h2>{editingAd ? "Edit advertisement" : "New advertisement"}</h2>
                <p className="ads-modal-sub">
                  {editingAd
                    ? "Update advertisement details and schedule"
                    : "Create a new advertisement for the portal"}
                </p>
              </div>
              <button
                className="ads-modal-close"
                onClick={() => !saving && setShowModal(false)}
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ads-modal-body">
              {/* IMAGE */}
              <div className="ads-field">
                <label>Advertisement image</label>
                <label className="ads-upload">
                  {form.image ? (
                    <div className="ads-upload-preview">
                      <img src={URL.createObjectURL(form.image)} alt="Preview" />
                      <span className="ads-upload-overlay">Click to replace</span>
                    </div>
                  ) : editingAd?.image ? (
                    <div className="ads-upload-preview">
                      <img src={editingAd.image} alt="Current" />
                      <span className="ads-upload-overlay">Click to replace</span>
                    </div>
                  ) : (
                    <div className="ads-upload-placeholder">
                      <FiImage size={26} />
                      <strong>Upload advertisement image</strong>
                      <span>PNG, JPG, WEBP — Max 10MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {/* TITLE */}
              <div className="ads-field">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Advertisement title"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="ads-field">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the advertisement"
                  rows={4}
                />
              </div>

              {/* BUTTON TEXT */}
              <div className="ads-field">
                <label>Button text</label>
                <input
                  type="text"
                  name="buttonText"
                  value={form.buttonText}
                  onChange={handleChange}
                  placeholder="e.g., Learn more"
                />
              </div>

              {/* LINK */}
              <div className="ads-field">
                <label>Button link</label>
                <div className="ads-select ads-select-full">
                  <select value={form.link} onChange={handlePageSelect}>
                    <option value="">Select a page</option>
                    {PORTAL_PAGES_GROUPED.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.pages.map((page) => (
                          <option key={page.path} value={page.path}>
                            {page.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <FiChevronDown size={13} className="ads-select-chevron" />
                </div>
                <small className="ads-field-help">
                  Page users will open when they click the advertisement button.
                </small>
              </div>

              {/* DATES */}
              <div className="ads-field-row">
                <div className="ads-field">
                  <label>Start date & time</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="ads-field">
                  <label>End date & time</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* ACTIVE */}
              <label className="ads-toggle">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                />
                <span className="ads-toggle-slider" />
                <div>
                  <strong>Advertisement active</strong>
                  <small>
                    Allow this advertisement to display when its schedule is active.
                  </small>
                </div>
              </label>

              {/* ACTIONS */}
              <div className="ads-modal-footer">
                <button
                  type="button"
                  className="ads-btn"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ads-btn ads-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <FiRefreshCw size={13} className="ads-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck size={13} />
                      {editingAd ? "Save changes" : "Create advertisement"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{mainCSS}</style>
    </div>
  );
};

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .ads-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .ads-container { padding: 28px 24px 60px; max-width: 1280px; margin: 0 auto; }

  /* ---------- HEADER ---------- */
  .ads-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .ads-header-left { display: flex; align-items: center; gap: 14px; }
  .ads-back-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .ads-back-btn:hover { background: #f5f5f5; color: #171717; }
  .ads-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }
  .ads-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -0.5px; color: #0f0f0f;
  }
  .ads-subtitle { font-size: 13.5px; color: #737373; margin: 4px 0 0 0; }
  .ads-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- BUTTONS ---------- */
  .ads-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px; border-radius: 9px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease; white-space: nowrap; font-family: inherit;
  }
  .ads-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .ads-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ads-btn-primary { background: #0f0f0f; color: #ffffff; border-color: #0f0f0f; }
  .ads-btn-primary:hover { background: #262626; border-color: #262626; }
  .ads-btn-sm { padding: 6px 10px; font-size: 12px; }

  .ads-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
    text-decoration: none;
  }
  .ads-icon-btn:hover { background: #f5f5f5; color: #171717; }

  .ads-spin { animation: ads-spin 0.9s linear infinite; }
  @keyframes ads-spin { to { transform: rotate(360deg); } }

  /* ---------- ALERTS ---------- */
  .ads-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .ads-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .ads-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .ads-alert button {
    margin-left: auto; background: none; border: none; cursor: pointer;
    color: inherit; padding: 4px; border-radius: 6px; display: flex;
  }
  .ads-alert button:hover { background: rgba(0,0,0,0.05); }

  /* ---------- STATS (clickable) ---------- */
  .ads-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  @media (max-width: 768px) { .ads-stats { grid-template-columns: repeat(2, 1fr); } }

  .ads-stat {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px; background: #ffffff;
    border: 1px solid #e5e5e5; border-radius: 12px;
    cursor: pointer; transition: all 0.15s ease;
    text-align: left; font-family: inherit;
  }
  .ads-stat:hover { border-color: #d4d4d4; background: #fafafa; }
  .ads-stat.selected { border-color: #0f0f0f; background: #fafafa; }
  .ads-stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: #f5f5f5; color: #262626;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ads-stat.selected .ads-stat-icon { background: #0f0f0f; color: #ffffff; }
  .ads-stat-value {
    font-size: 22px; font-weight: 800; color: #0f0f0f;
    letter-spacing: -0.5px; line-height: 1.1;
  }
  .ads-stat-label {
    font-size: 11px; color: #737373; text-transform: uppercase;
    letter-spacing: 0.05em; font-weight: 600; margin-top: 2px;
  }

  /* ---------- TOOLBAR ---------- */
  .ads-toolbar {
    display: flex; gap: 10px; margin-bottom: 18px;
    flex-wrap: wrap; align-items: center;
  }
  .ads-search {
    flex: 1; min-width: 240px;
    display: flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 9px; padding: 0 12px; height: 38px;
    color: #737373; transition: border-color 0.15s ease;
  }
  .ads-search:focus-within { border-color: #a3a3a3; }
  .ads-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-family: inherit; height: 100%;
  }
  .ads-search input::placeholder { color: #a3a3a3; }
  .ads-search-clear {
    background: transparent; border: none; cursor: pointer; color: #a3a3a3;
    padding: 3px; border-radius: 6px; display: flex;
  }
  .ads-search-clear:hover { background: #f5f5f5; color: #525252; }

  .ads-select {
    position: relative; display: inline-flex; align-items: center; gap: 8px;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 9px;
    height: 38px; padding: 0 30px 0 12px; min-width: 180px;
    transition: border-color 0.15s ease;
  }
  .ads-select:hover { border-color: #d4d4d4; }
  .ads-select:focus-within { border-color: #0f0f0f; }
  .ads-select-full { width: 100%; min-width: 0; }
  .ads-select-label {
    font-size: 11px; color: #a3a3a3; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    flex-shrink: 0; padding-right: 6px; border-right: 1px solid #f0f0f0;
  }
  .ads-select select {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 12.5px; color: #171717; font-weight: 500;
    cursor: pointer; appearance: none; font-family: inherit;
    padding: 0; min-width: 0;
  }
  .ads-select-chevron {
    position: absolute; right: 11px; pointer-events: none; color: #a3a3a3;
  }

  /* ---------- GRID ---------- */
  .ads-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }

  .ads-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; overflow: hidden;
    display: flex; flex-direction: column;
    transition: border-color 0.15s ease;
  }
  .ads-card:hover { border-color: #d4d4d4; }

  .ads-card-image {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #f5f5f5;
    overflow: hidden;
  }
  .ads-card-image img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .ads-card-noimage {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px; color: #a3a3a3; font-size: 12px;
  }

  .ads-status {
    position: absolute; top: 12px; left: 12px;
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    background: #ffffff; color: #525252;
    border: 1px solid #e5e5e5;
  }
  .ads-status.active { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .ads-status.scheduled { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .ads-status.expired { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .ads-status.inactive { background: #f5f5f5; color: #737373; border-color: #e5e5e5; }

  .ads-card-body {
    padding: 16px 18px 14px;
    display: flex; flex-direction: column; gap: 12px; flex: 1;
  }

  .ads-card-title-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 10px;
  }
  .ads-card-title {
    font-size: 14.5px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.2px;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .ads-card-desc {
    font-size: 12.5px; color: #525252; line-height: 1.5;
    margin: 0;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .ads-card-dates {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .ads-date {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 8px;
    color: #737373;
  }
  .ads-date small {
    display: block; font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em; color: #a3a3a3;
  }
  .ads-date strong {
    display: block; font-size: 12px; font-weight: 600; color: #171717;
  }

  .ads-card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
  .ads-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px;
    background: #f5f5f5; color: #525252;
    font-size: 11px; font-weight: 500;
    max-width: 100%; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  .ads-card-footer {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px; flex-wrap: wrap;
    padding-top: 12px; border-top: 1px solid #f5f5f5;
    margin-top: auto;
  }
  .ads-card-created { font-size: 11px; color: #a3a3a3; }
  .ads-card-actions { display: flex; gap: 6px; align-items: center; }

  /* ---------- ROW MENU ---------- */
  .ads-row-menu-wrap { position: relative; flex-shrink: 0; }
  .ads-row-menu {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: #ffffff; border: 1px solid #e5e5e5; border-radius: 10px;
    padding: 4px; min-width: 170px;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.15);
    z-index: 30; animation: ads-menu-in 0.12s ease;
  }
  @keyframes ads-menu-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .ads-row-menu button {
    display: flex; align-items: center; gap: 9px; width: 100%;
    padding: 8px 10px; background: transparent; border: none;
    color: #262626; font-size: 12.5px; font-weight: 500;
    text-align: left; border-radius: 7px; cursor: pointer;
    transition: background 0.12s ease; font-family: inherit;
  }
  .ads-row-menu button:hover { background: #f5f5f5; }
  .ads-row-menu-danger { color: #b91c1c !important; }
  .ads-row-menu-danger:hover { background: #fef2f2 !important; }
  .ads-row-menu-divider { height: 1px; background: #f0f0f0; margin: 4px 6px; }

  /* ---------- EMPTY ---------- */
  .ads-empty {
    text-align: center; padding: 64px 24px;
    background: #ffffff; border: 2px dashed #e5e5e5;
    border-radius: 14px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .ads-empty-icon {
    width: 60px; height: 60px; border-radius: 16px;
    background: #f5f5f5; color: #a3a3a3;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .ads-empty-title { font-size: 15px; font-weight: 700; color: #0f0f0f; }
  .ads-empty-sub {
    font-size: 12.5px; color: #737373; margin-bottom: 10px;
    max-width: 360px;
  }

  /* ---------- MODAL ---------- */
  .ads-modal-overlay {
    position: fixed; inset: 0; background: rgba(15, 15, 15, 0.5);
    backdrop-filter: blur(2px); display: flex; align-items: center;
    justify-content: center; padding: 16px; z-index: 1000;
  }
  .ads-modal {
    background: #ffffff; border-radius: 16px;
    width: 100%; max-width: 640px; max-height: 92vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
    animation: ads-modal-in 0.2s ease;
  }
  @keyframes ads-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ads-modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 20px 22px; border-bottom: 1px solid #f0f0f0; gap: 12px;
  }
  .ads-modal-header h2 {
    font-size: 16px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.2px;
  }
  .ads-modal-sub { font-size: 12.5px; color: #a3a3a3; margin: 4px 0 0 0; }
  .ads-modal-close {
    background: transparent; border: none; color: #a3a3a3;
    cursor: pointer; padding: 6px; border-radius: 6px; display: flex;
    transition: all 0.15s ease;
  }
  .ads-modal-close:hover { background: #f5f5f5; color: #171717; }

  .ads-modal-body {
    padding: 20px 22px 0;
    overflow-y: auto; flex: 1;
    display: flex; flex-direction: column; gap: 16px;
  }

  .ads-field { display: flex; flex-direction: column; gap: 7px; }
  .ads-field > label {
    font-size: 11.5px; font-weight: 700; color: #525252;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .ads-field input[type="text"],
  .ads-field input[type="datetime-local"],
  .ads-field textarea {
    width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5;
    border-radius: 9px; font-size: 13.5px; color: #171717;
    font-family: inherit; background: #ffffff;
    transition: border-color 0.15s ease;
  }
  .ads-field input:focus, .ads-field textarea:focus {
    outline: none; border-color: #0f0f0f;
  }
  .ads-field textarea { resize: vertical; min-height: 90px; }
  .ads-field-help { font-size: 11.5px; color: #a3a3a3; margin-top: 2px; }
  .ads-field-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  }
  @media (max-width: 600px) { .ads-field-row { grid-template-columns: 1fr; } }

  /* ---------- UPLOAD ---------- */
  .ads-upload {
    display: block; cursor: pointer;
    border: 2px dashed #d4d4d4; border-radius: 12px;
    background: #fafafa; transition: all 0.15s ease;
    overflow: hidden; position: relative;
  }
  .ads-upload:hover { border-color: #0f0f0f; background: #f5f5f5; }

  .ads-upload-placeholder {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; padding: 32px 20px;
    color: #737373; text-align: center;
  }
  .ads-upload-placeholder strong {
    font-size: 13.5px; color: #171717; font-weight: 600; margin-top: 4px;
  }
  .ads-upload-placeholder span { font-size: 12px; }

  .ads-upload-preview {
    position: relative; aspect-ratio: 16 / 9; overflow: hidden;
  }
  .ads-upload-preview img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .ads-upload-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(15, 15, 15, 0.55); color: #ffffff;
    font-size: 12.5px; font-weight: 600;
    opacity: 0; transition: opacity 0.15s ease;
  }
  .ads-upload:hover .ads-upload-overlay { opacity: 1; }

  /* ---------- TOGGLE ---------- */
  .ads-toggle {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px; background: #fafafa;
    border: 1px solid #f0f0f0; border-radius: 10px;
    cursor: pointer; user-select: none;
  }
  .ads-toggle input { display: none; }
  .ads-toggle-slider {
    position: relative; width: 36px; height: 20px; border-radius: 999px;
    background: #e5e5e5; transition: all 0.2s ease; flex-shrink: 0;
    margin-top: 2px;
  }
  .ads-toggle-slider::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%; background: #ffffff;
    transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .ads-toggle input:checked + .ads-toggle-slider { background: #0f0f0f; }
  .ads-toggle input:checked + .ads-toggle-slider::after { transform: translateX(16px); }
  .ads-toggle strong {
    display: block; font-size: 13.5px; color: #171717; font-weight: 600;
  }
  .ads-toggle small {
    display: block; font-size: 12px; color: #737373; margin-top: 3px;
    line-height: 1.5;
  }

  .ads-modal-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 16px 22px; margin: 20px -22px 0;
    border-top: 1px solid #f0f0f0; background: #fafafa;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 768px) {
    .ads-container { padding: 20px 16px 40px; }
    .ads-title { font-size: 22px; }
    .ads-toolbar { flex-direction: column; align-items: stretch; }
    .ads-select { width: 100%; }
    .ads-header-actions { width: 100%; }
    .ads-header-actions .ads-btn { flex: 1; justify-content: center; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .ads-skeleton {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .ads-skeleton::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: ads-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes ads-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .ads-skeleton-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .ads-skeleton-actions { display: flex; gap: 8px; }
  .ads-skeleton-circle { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; }
  .ads-skeleton-title { width: 200px; height: 24px; }
  .ads-skeleton-subtitle { width: 260px; height: 13px; margin-top: 8px; }
  .ads-skeleton-btn { width: 110px; height: 38px; border-radius: 9px; }

  .ads-skeleton-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  @media (max-width: 768px) { .ads-skeleton-stats { grid-template-columns: repeat(2, 1fr); } }
  .ads-skeleton-stat {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 12px; padding: 16px 18px;
    display: flex; align-items: center; gap: 14px;
  }
  .ads-skeleton-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
  .ads-skeleton-line-md { height: 18px; border-radius: 4px; }
  .ads-skeleton-line-sm { height: 11px; border-radius: 4px; }

  .ads-skeleton-toolbar {
    display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;
  }
  .ads-skeleton-input {
    flex: 1; min-width: 240px; height: 38px; border-radius: 9px;
  }

  .ads-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }
  .ads-skeleton-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; overflow: hidden;
    padding: 0 18px 18px;
  }
  .ads-skeleton-image {
    aspect-ratio: 16 / 9; border-radius: 0;
    margin: 0 -18px 0;
    border-radius: 0;
  }
  .ads-skeleton-row {
    display: flex; gap: 8px; margin-top: 12px;
  }
`;

const mainCSS = baseCSS;

export default Advertisements;