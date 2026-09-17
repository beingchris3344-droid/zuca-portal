// frontend/src/pages/JoinJumuia.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import logo from "../assets/zuca-logo.png";
import {
  Search, X, Users, Check, Info, AlertCircle,
  MessageCircle, ArrowLeft, Shield, CheckCircle2,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

/* =========================================================
   SKELETON
   ========================================================= */
function Skeleton() {
  return (
    <div className="jj-page">
      <div className="jj-container">
        <div className="jj-skeleton-header">
          <div className="jj-skeleton-row">
            <div className="jj-skeleton jj-skeleton-icon" />
            <div style={{ flex: 1 }}>
              <div className="jj-skeleton jj-skeleton-line-sm" style={{ width: 160 }} />
              <div className="jj-skeleton jj-skeleton-title" />
              <div className="jj-skeleton jj-skeleton-line-md" style={{ width: 340, marginTop: 10 }} />
            </div>
          </div>
          <div className="jj-skeleton jj-skeleton-badge" />
        </div>

        <div className="jj-skeleton jj-skeleton-search" />

        <div className="jj-skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="jj-skeleton-card">
              <div className="jj-skeleton jj-skeleton-card-icon" />
              <div className="jj-skeleton jj-skeleton-line-lg" style={{ width: "60%", marginTop: 16 }} />
              <div className="jj-skeleton jj-skeleton-line-sm" style={{ width: "100%", marginTop: 8 }} />
              <div className="jj-skeleton jj-skeleton-line-sm" style={{ width: "80%", marginTop: 6 }} />
              <div className="jj-skeleton jj-skeleton-btn" />
            </div>
          ))}
        </div>
      </div>
      <style>{skeletonCSS}</style>
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */
function JoinJumuia() {
  const navigate = useNavigate();
  const [jumuiaList, setJumuiaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedJumuia, setJoinedJumuia] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  const toastTimer = useRef(null);

  /* ---------------- TOAST ---------------- */
  const flash = useCallback((type, text, timeout = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => setToast(null), timeout);
  }, []);

  /* ---------------- USER ---------------- */
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  /* ---------------- FETCH ---------------- */
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [jRes, uRes] = await Promise.all([
        api.get("/api/jumuia"),
        api.get("/api/me"),
      ]);
      setJumuiaList(Array.isArray(jRes.data) ? jRes.data : []);
      setJoinedJumuia(uRes.data?.jumuiaId || null);
    } catch (err) {
      console.error(err);
      setError("Unable to load jumuia groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchData]);

  /* ---------------- JOIN ---------------- */
  const handleJoin = async (id, name) => {
    setJoiningId(id);
    try {
      await api.patch("/api/join-jumuia", { jumuiaId: id });
      setJoinedJumuia(id);
      flash("success", `You joined ${name}`);
    } catch (err) {
      console.error("Join Jumuia Error:", err.response || err);
      flash("error", err.response?.data?.error || "Unable to join. Please try again.");
    } finally {
      setJoiningId(null);
    }
  };

  /* ---------------- WHATSAPP ---------------- */
  const handleWhatsAppClick = (jumuia, e) => {
    if (joinedJumuia !== jumuia.id) {
      e.preventDefault();
      flash("error", `Please join ${jumuia.name} first to access their WhatsApp group.`);
      return;
    }
    if (!jumuia.whatsappLink) {
      e.preventDefault();
      flash("error", "No WhatsApp group link available for this jumuia.");
    }
  };

  const goBack = () => navigate("/dashboard");

  /* ---------------- FILTER ---------------- */
  const filteredJumuia = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return jumuiaList;
    return jumuiaList.filter(
      (j) =>
        j.name?.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q))
    );
  }, [jumuiaList, searchTerm]);

  /* ---------------- ANIMATION VARIANTS ---------------- */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", damping: 22, stiffness: 260 },
    },
  };

  /* =========================================================
     STATES
     ========================================================= */
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="jj-page">
        <div className="jj-container">
          <div className="jj-error">
            <div className="jj-error-icon">
              <AlertCircle size={26} />
            </div>
            <div className="jj-error-title">Something went wrong</div>
            <div className="jj-error-text">{error}</div>
            <button
              className="jj-btn jj-btn-primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN RENDER
     ========================================================= */
  return (
    <motion.div
      className="jj-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="jj-container">
        {/* TOAST */}
        <AnimatePresence>
          {toast && (
            <motion.div
              className={`jj-toast jj-toast-${toast.type}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={15} />
              ) : (
                <AlertCircle size={15} />
              )}
              <span>{toast.text}</span>
              <button onClick={() => setToast(null)}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= HEADER ================= */}
        <motion.header className="jj-header" variants={itemVariants}>
          <div className="jj-header-left">
            <button className="jj-back-btn" onClick={goBack} title="Back">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="jj-eyebrow">
                <Users size={12} />
                Community
              </div>
              <h1 className="jj-title">
                Join a <span className="jj-title-accent">Jumuia</span>
              </h1>
              <p className="jj-subtitle">
                Hey {user?.fullName?.split(" ")[0] || "there"}, join your respective jumuia to
                participate in meetings, contributions, and other activities.
              </p>
            </div>
          </div>
          <div className="jj-header-meta">
            <span className="jj-meta-pill">
              <Users size={13} />
              {jumuiaList.length} {jumuiaList.length === 1 ? "group" : "groups"}
            </span>
            {joinedJumuia && (
              <span className="jj-meta-pill jj-meta-pill-ok">
                <Check size={13} />
                Joined
              </span>
            )}
          </div>
        </motion.header>

        {/* ================= SEARCH ================= */}
        <motion.div className="jj-toolbar" variants={itemVariants}>
          <div className="jj-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by name or description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="jj-search-clear"
                onClick={() => setSearchTerm("")}
                type="button"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="jj-search-info">
              {filteredJumuia.length}{" "}
              {filteredJumuia.length === 1 ? "result" : "results"}
            </div>
          )}
        </motion.div>

        {/* ================= GRID ================= */}
        {filteredJumuia.length === 0 ? (
          <motion.div className="jj-empty" variants={itemVariants}>
            <div className="jj-empty-icon">
              <Users size={26} />
            </div>
            <div className="jj-empty-title">
              {searchTerm ? "No matching groups" : "No jumuia groups available"}
            </div>
            <div className="jj-empty-sub">
              {searchTerm
                ? `Nothing matched "${searchTerm}". Try a different search.`
                : "Check back later — jumuia groups will appear here once available."}
            </div>
            {searchTerm && (
              <button
                className="jj-btn jj-btn-primary"
                onClick={() => setSearchTerm("")}
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <div className="jj-grid">
            <AnimatePresence mode="popLayout">
              {filteredJumuia.map((j, index) => {
                const isJoined = joinedJumuia === j.id;
                const isOtherJoined = joinedJumuia && joinedJumuia !== j.id;
                const isJoining = joiningId === j.id;

                return (
                  <motion.div
                    key={j.id}
                    layout
                    variants={itemVariants}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", damping: 24, delay: index * 0.03 }}
                    className={`jj-card ${isJoined ? "joined" : ""} ${
                      isOtherJoined ? "dimmed" : ""
                    }`}
                  >
                    <div className="jj-card-top">
                      <div className={`jj-card-icon ${isJoined ? "joined" : ""}`}>
                        {isJoined ? <Shield size={20} /> : <Users size={20} />}
                      </div>
                      {isJoined && (
                        <span className="jj-joined-pill">
                          <Check size={11} />
                          Joined
                        </span>
                      )}
                    </div>

                    <div className="jj-card-body">
                      <h3 className="jj-card-title">{j.name}</h3>
                      {j.description && (
                        <p className="jj-card-desc">{j.description}</p>
                      )}

                      {j.whatsappLink && (
                        <div className="jj-card-whatsapp">
                          <div className="jj-card-whatsapp-label">
                            <MessageCircle size={12} />
                            Jumuia chat
                          </div>
                          <a
                            href={j.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleWhatsAppClick(j, e)}
                            className={`jj-whatsapp-link ${
                              !isJoined ? "disabled" : ""
                            }`}
                          >
                            <FaWhatsapp size={14} />
                            <span>
                              {isJoined
                                ? "Open WhatsApp group"
                                : "Join jumuia to access"}
                            </span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="jj-card-footer">
                      <button
                        className={`jj-btn jj-btn-join ${
                          isJoined ? "joined" : ""
                        } ${isOtherJoined ? "disabled" : ""}`}
                        disabled={isOtherJoined || isJoining}
                        onClick={() => handleJoin(j.id, j.name)}
                      >
                        {isJoining ? (
                          <>
                            <span className="jj-spinner-xs" />
                            Joining...
                          </>
                        ) : isJoined ? (
                          <>
                            <Check size={14} />
                            You've joined {j.name}
                          </>
                        ) : isOtherJoined ? (
                          <>
                            Already in another jumuia
                          </>
                        ) : (
                          <>Join this jumuia</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ================= INFO NOTE ================= */}
        {!joinedJumuia && jumuiaList.length > 0 && (
          <motion.div className="jj-info" variants={itemVariants}>
            <div className="jj-info-icon">
              <Info size={14} />
            </div>
            <span>
              Choose one jumuia to join. After joining you'll be able to access
              their WhatsApp group and connect with fellow members.
            </span>
          </motion.div>
        )}
      </div>

      <style>{mainCSS}</style>
    </motion.div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .jj-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .jj-container {
    padding: 28px 24px 60px;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* ---------- HEADER ---------- */
  .jj-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; flex-wrap: wrap; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
  }
  .jj-header-left { display: flex; align-items: center; gap: 14px; }
  .jj-back-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e5e5e5; background: #ffffff; color: #525252;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .jj-back-btn:hover { background: #f5f5f5; color: #171717; }
  .jj-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #737373; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }
  .jj-title {
    font-size: 26px; font-weight: 700; margin: 0;
    letter-spacing: -0.5px; color: #0f0f0f;
  }
  .jj-title-accent {
    position: relative;
    padding-bottom: 2px;
    border-bottom: 2px solid #0f0f0f;
  }
  .jj-subtitle {
    font-size: 13.5px; color: #737373;
    margin: 6px 0 0 0; max-width: 560px; line-height: 1.5;
  }
  .jj-header-meta { display: flex; gap: 8px; flex-wrap: wrap; }
  .jj-meta-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; background: #ffffff;
    border: 1px solid #e5e5e5; border-radius: 999px;
    font-size: 12px; font-weight: 600; color: #525252;
  }
  .jj-meta-pill-ok {
    background: #f0fdf4; border-color: #bbf7d0; color: #15803d;
  }

  /* ---------- TOOLBAR ---------- */
  .jj-toolbar {
    margin-bottom: 22px; display: flex; align-items: center;
    gap: 14px; flex-wrap: wrap;
  }
  .jj-search {
    flex: 1; min-width: 240px; max-width: 480px;
    display: flex; align-items: center; gap: 10px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 10px; padding: 0 12px; height: 42px;
    color: #737373; transition: border-color 0.15s ease;
  }
  .jj-search:focus-within { border-color: #a3a3a3; }
  .jj-search input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 13px; color: #171717; font-family: inherit; height: 100%;
  }
  .jj-search input::placeholder { color: #a3a3a3; }
  .jj-search-clear {
    background: transparent; border: none; cursor: pointer; color: #a3a3a3;
    padding: 3px; border-radius: 6px; display: flex;
  }
  .jj-search-clear:hover { background: #f5f5f5; color: #525252; }
  .jj-search-info {
    font-size: 12.5px; color: #737373; font-weight: 500;
  }

  /* ---------- GRID ---------- */
  .jj-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 480px) {
    .jj-grid { grid-template-columns: 1fr; }
  }

  /* ---------- CARD ---------- */
  .jj-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px;
    display: flex; flex-direction: column; gap: 16px;
    transition: all 0.2s ease;
  }
  .jj-card:hover { border-color: #d4d4d4; }
  .jj-card.joined {
    border-color: #16a34a; background: #fafffb;
  }
  .jj-card.dimmed { opacity: 0.65; }

  .jj-card-top {
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .jj-card-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .jj-card-icon.joined {
    background: #f0fdf4; color: #15803d;
  }
  .jj-joined-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    background: #f0fdf4; color: #15803d;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .jj-card-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .jj-card-title {
    font-size: 16px; font-weight: 700; color: #0f0f0f;
    margin: 0; letter-spacing: -0.2px;
  }
  .jj-card-desc {
    font-size: 13px; color: #737373; line-height: 1.5;
    margin: 0;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ---------- WHATSAPP SECTION ---------- */
  .jj-card-whatsapp {
    margin-top: 8px; padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }
  .jj-card-whatsapp-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: #a3a3a3;
    text-transform: uppercase; letter-spacing: 0.06em;
    font-weight: 600; margin-bottom: 8px;
  }
  .jj-whatsapp-link {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; width: 100%;
    padding: 10px 14px;
    background: #25D366; color: #ffffff;
    border-radius: 10px; text-decoration: none;
    font-size: 12.5px; font-weight: 600;
    transition: all 0.15s ease;
  }
  .jj-whatsapp-link:hover { background: #1eaf54; }
  .jj-whatsapp-link.disabled {
    background: #f5f5f5; color: #a3a3a3;
    cursor: not-allowed; pointer-events: none;
  }

  /* ---------- CARD FOOTER ---------- */
  .jj-card-footer { margin-top: auto; }

  /* ---------- BUTTONS ---------- */
  .jj-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 10px 14px;
    border-radius: 10px; border: 1px solid #e5e5e5;
    background: #ffffff; color: #262626;
    font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit; width: 100%;
    white-space: nowrap;
  }
  .jj-btn:hover:not(:disabled) {
    background: #f5f5f5; border-color: #d4d4d4;
  }
  .jj-btn:disabled { cursor: not-allowed; }
  .jj-btn-primary {
    background: #0f0f0f; color: #ffffff; border-color: #0f0f0f;
    width: auto;
  }
  .jj-btn-primary:hover:not(:disabled) {
    background: #262626; border-color: #262626;
  }

  .jj-btn-join {
    background: #0f0f0f; color: #ffffff; border-color: #0f0f0f;
  }
  .jj-btn-join:hover:not(:disabled) {
    background: #262626; border-color: #262626;
  }
  .jj-btn-join.joined {
    background: #f0fdf4; color: #15803d;
    border-color: #bbf7d0; cursor: default;
  }
  .jj-btn-join.joined:hover { background: #f0fdf4; border-color: #bbf7d0; }
  .jj-btn-join.disabled {
    background: #f5f5f5; color: #a3a3a3;
    border-color: #e5e5e5; cursor: not-allowed;
  }

  .jj-spinner-xs {
    width: 12px; height: 12px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: jj-spin 0.7s linear infinite;
    display: inline-block;
  }
  @keyframes jj-spin { to { transform: rotate(360deg); } }

  /* ---------- EMPTY ---------- */
  .jj-empty {
    text-align: center; padding: 72px 24px;
    background: #ffffff; border: 2px dashed #e5e5e5;
    border-radius: 14px; margin-bottom: 24px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .jj-empty-icon {
    width: 60px; height: 60px; border-radius: 16px;
    background: #f5f5f5; color: #a3a3a3;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .jj-empty-title {
    font-size: 15px; font-weight: 700; color: #0f0f0f;
  }
  .jj-empty-sub {
    font-size: 12.5px; color: #737373;
    max-width: 380px; line-height: 1.5;
    margin-bottom: 6px;
  }

  /* ---------- INFO NOTE ---------- */
  .jj-info {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px; background: #ffffff;
    border: 1px solid #e5e5e5; border-radius: 12px;
    color: #525252; font-size: 12.5px;
    line-height: 1.5;
  }
  .jj-info-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: #f5f5f5; color: #525252;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ---------- ERROR ---------- */
  .jj-error {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 48px 32px;
    max-width: 440px; margin: 80px auto;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .jj-error-icon {
    width: 56px; height: 56px; border-radius: 14px;
    background: #fef2f2; color: #b91c1c;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
  }
  .jj-error-title {
    font-size: 16px; font-weight: 700; color: #0f0f0f;
  }
  .jj-error-text {
    font-size: 13px; color: #737373; margin-bottom: 12px;
  }

  /* ---------- TOAST ---------- */
  .jj-toast {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 500;
  }
  .jj-toast-success {
    background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;
  }
  .jj-toast-error {
    background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;
  }
  .jj-toast button {
    margin-left: auto; background: none; border: none;
    cursor: pointer; color: inherit; padding: 4px; border-radius: 6px;
    display: flex;
  }
  .jj-toast button:hover { background: rgba(0,0,0,0.05); }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 640px) {
    .jj-container { padding: 20px 16px 40px; }
    .jj-title { font-size: 22px; }
    .jj-header { flex-direction: column; align-items: stretch; }
    .jj-toolbar { flex-direction: column; align-items: stretch; }
    .jj-search { max-width: none; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .jj-skeleton {
    background: #ececec; border-radius: 6px;
    position: relative; overflow: hidden;
  }
  .jj-skeleton::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: jj-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes jj-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .jj-skeleton-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 20px; padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5; margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .jj-skeleton-row { display: flex; align-items: center; gap: 14px; }
  .jj-skeleton-icon { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; }
  .jj-skeleton-title { width: 220px; height: 26px; margin-top: 8px; }
  .jj-skeleton-line-sm { height: 11px; border-radius: 4px; }
  .jj-skeleton-line-md { height: 14px; border-radius: 4px; }
  .jj-skeleton-line-lg { height: 20px; border-radius: 4px; }
  .jj-skeleton-badge { width: 120px; height: 34px; border-radius: 999px; }
  .jj-skeleton-search {
    height: 42px; max-width: 480px; border-radius: 10px;
    margin-bottom: 22px; width: 100%;
  }
  .jj-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  .jj-skeleton-card {
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 14px; padding: 20px;
    display: flex; flex-direction: column;
  }
  .jj-skeleton-card-icon {
    width: 48px; height: 48px; border-radius: 12px;
  }
  .jj-skeleton-btn {
    height: 40px; border-radius: 10px;
    margin-top: 20px; width: 100%;
  }
`;

const mainCSS = baseCSS;

export default JoinJumuia;