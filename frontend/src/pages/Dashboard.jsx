import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import logo from "../assets/zuca-logo.png";
import ProfileSettings from "../components/ProfileSettings";
import React from "react";
import CoverCropper from "../components/CoverCropper";
import QRScanner from "../components/member/attendance/QRScanner";
import { QrCode } from "lucide-react";
import {
  FiBell, FiRefreshCw, FiCamera, FiSliders, FiX, FiChevronRight, FiChevronLeft,
  FiHome, FiCalendar, FiMessageCircle, FiHeart, FiMusic, FiImage, FiBook, FiGrid, 
  FiMessageSquare, FiAlertCircle, FiSettings, FiLogOut, FiPhone, FiClock, FiMapPin,
  FiPlay, FiPause, FiMaximize2, FiArrowRight, FiUsers, FiMoreHorizontal, FiCheck,FiUpload, FiDownload, FiShare2, FiCopy, FiTrash, FiEdit2, FiSearch, FiFilter, FiFileText,
  FiDollarSign, FiClipboard, FiTrash2, FiUser, FiXCircle, FiCheckCircle, FiInfo, FiLink, FiExternalLink, FiChevronDown, FiChevronUp, FiArrowLeft, FiArrowUp, FiArrowDown, FiArrowRightCircle, FiArrowLeftCircle,
} from "react-icons/fi";
import { FaHandHoldingHeart, FaWhatsapp } from "react-icons/fa";
import { MdWavingHand } from "react-icons/md";

const THEMES = {
  emerald:  "linear-gradient(135deg, #059669 0%, #0d9488 40%, #7c3aed 100%)",
  sunset:   "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #be185d 100%)",
  ocean:    "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)",
  forest:   "linear-gradient(135deg, #15803d 0%, #166534 50%, #365314 100%)",
  midnight: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
  royal:    "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
  rose:     "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #d946ef 100%)",
  amber:    "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  sky:      "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #2563eb 100%)",
  azure:    "linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #1e40af 100%)",
  ice:      "linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 50%, #0ea5e9 100%)",
  navy:     "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #1e3a8a 100%)",
  mint:     "linear-gradient(135deg, #6ee7b7 0%, #10b981 50%, #047857 100%)",
  lime:     "linear-gradient(135deg, #bef264 0%, #84cc16 50%, #15803d 100%)",
  jade:     "linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #115e59 100%)",
  sage:     "linear-gradient(135deg, #a7f3d0 0%, #4ade80 50%, #065f46 100%)",
  violet:   "linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)",
  lavender: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #7c3aed 100%)",
  fuchsia:  "linear-gradient(135deg, #e879f9 0%, #d946ef 50%, #a21caf 100%)",
  blush:    "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 50%, #ec4899 100%)",
  coral:    "linear-gradient(135deg, #fb923c 0%, #f87171 50%, #e11d48 100%)",
  peach:    "linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #f97316 100%)",
  gold:     "linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%)",
  fire:     "linear-gradient(135deg, #facc15 0%, #f97316 50%, #dc2626 100%)",
  slate:    "linear-gradient(135deg, #64748b 0%, #475569 50%, #1e293b 100%)",
  charcoal: "linear-gradient(135deg, #4b5563 0%, #374151 50%, #111827 100%)",
  stone:    "linear-gradient(135deg, #d6d3d1 0%, #78716c 50%, #292524 100%)",
  ink:      "linear-gradient(135deg, #1f2937 0%, #0f172a 50%, #000000 100%)",
  aurora:   "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #f43f5e 100%)",
  twilight: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)",
  neon:     "linear-gradient(135deg, #06b6d4 0%, #f0abfc 50%, #a3e635 100%)",
  candy:    "linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #60a5fa 100%)",
};
const PRIMARY = [
  ["Home", FiHome, "/dashboard"], ["Events", FiCalendar, "/schedules"],
  ["Chat", FiMessageCircle, "/chat"], ["Give", FiHeart, "/contributions"],
  ["Hymns", FiMusic, "/hymns"], ["Gallery", FiImage, "/gallery"],
  ["Readings", FiBook, "/mass-readings"], ["Mass programs", FiGrid, "/mass-programs"],
];
const tk = () => localStorage.getItem("token");
const H = () => ({ headers: { Authorization: `Bearer ${tk()}` } });
const money = (n) => `KES ${(n || 0).toLocaleString()}`;
const ago = (d) => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  if (m < 10080) return `${Math.floor(m / 1440)} d ago`;
  return new Date(d).toLocaleDateString();
};
const sameDay = (d) => new Date(d).toDateString() === new Date().toDateString();

/* ---------- small shared pieces ---------- */
function Card({ icon, title, sub, badge, to, link = "See all", children, className = "" }) {
  const nav = useNavigate();
  return (
    <section className={`zd-card ${className}`}>
      <header className="zd-ch">
        <span className="zd-ci">{icon}</span>
        <div className="zd-ct"><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
        {badge != null && badge !== "" && <em>{badge}</em>}
        {to && <button onClick={() => nav(to)}>{link}</button>}
      </header>
      {children}
    </section>
  );
}
const Sk = ({ n = 2 }) => Array.from({ length: n }).map((_, i) => <div key={i} className="zd-sk" />);
const Empty = ({ t, s }) => <div className="zd-empty"><b>{t}</b>{s && <span>{s}</span>}</div>;
const Row = ({ lead, title, text, meta, onClick, arrow = true }) => (
  <div className={`zd-row ${onClick ? "click" : ""}`} onClick={onClick}>
    {lead}
    <div className="zd-rt"><b>{title}</b>{text && <span>{text}</span>}</div>
    {meta && <small>{meta}</small>}
    {arrow && onClick && <FiChevronRight />}
  </div>
);
const DateBox = ({ d }) => {
  const x = new Date(d);
  return <div className="zd-db"><b>{x.getDate()}</b><i>{x.toLocaleString("default", { month: "short" })}</i></div>;
};
const Avatar = ({ p, size = 40 }) => (
  <div className="zd-av" style={{ width: size, height: size }}>
    {p?.profileImage ? <img src={p.profileImage} alt="" /> : <span>{(p?.fullName || p?.name || "U")[0].toUpperCase()}</span>}
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [cover, setCover] = useState(null);
  const [theme, setTheme] = useState("navy");
  const [ready, setReady] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const [events, setEvents] = useState([]);
  const [ads, setAds] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [ann, setAnn] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [today, setToday] = useState(null);
  const [readings, setReadings] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [fin, setFin] = useState({ pledged: 0, paid: 0, pending: 0, camps: 0 });
  const [hymns, setHymns] = useState([]);
  const [totalHymns, setTotalHymns] = useState(0);
  const [mass, setMass] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [online, setOnline] = useState([]);
  const [chats, setChats] = useState([]);
  const [exec, setExec] = useState([]);
  const [invites, setInvites] = useState([]);
  const [jumuia, setJumuia] = useState(null);
  const [cd, setCd] = useState(null);
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });

  const [adIdx, setAdIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fullAd, setFullAd] = useState(false);
  const [evIdx, setEvIdx] = useState(0);
 const [rtab, setRtab] = useState("mass");
  const [utab, setUtab] = useState("ann");
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [settings, setSettings] = useState(false);
  const [pendingCover, setPendingCover] = useState(null);
  const evRef = useRef(null);

  /* ---------- load everything (same endpoints as before) ---------- */
  const load = useCallback(async () => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    const g = (key, url, fn, secure = true) =>
      axios.get(`${BASE_URL}${url}`, secure ? H() : undefined)
        .then((r) => fn(r.data))
        .catch((e) => console.error(key, e.message))
        .finally(() => setReady((p) => ({ ...p, [key]: true })));
    setRefreshing(true);
    await Promise.all([
      g("events", "/api/upcoming-events?limit=6", (d) => setEvents(d || [])),
      g("ads", "/api/advertisements", (d) => setAds(Array.isArray(d) ? d : []), false),
      g("sheets", "/api/attendance/active", (d) => setSheets(d.sheets || [])),
      g("ann", "/api/announcements", (d) => setAnn((d || []).slice(0, 3))),
      g("today", "/api/calendar/today", setToday, false),
      g("readings", "/api/mass-readings?limit=2", (d) => setReadings(d.readings || [])),
      g("pledges", "/api/my-pledges", (d) => {
        const a = d || [];
        setPledges(a.filter((p) => p.status !== "COMPLETED").slice(0, 3));
        const paid = a.reduce((s, p) => s + (p.amountPaid || 0), 0);
        const pending = a.reduce((s, p) => s + (p.pendingAmount || 0), 0);
        setFin((f) => ({ ...f, paid, pending, pledged: paid + pending }));
      }),
      g("camps", "/api/contribution-types", (d) =>
        setFin((f) => ({ ...f, camps: (d || []).filter((c) => !c.deadline || new Date(c.deadline) > new Date()).length }))),
      g("hymns", "/api/songs?limit=3", (d) => { setHymns(d?.songs || []); setTotalHymns(d?.total || 0); }),
      g("mass", "/api/mass-programs", (d) => setMass((d || []).filter((p) => new Date(p.date) >= new Date()).slice(0, 3))),
      g("gallery", "/api/media/public?limit=12", (d) =>
        setGallery((d.media || []).filter((i) => i.type === "image" || i.mediaType === "image" || i.mimeType?.startsWith("image/")).slice(0, 6))),
      g("online", "/api/chat/online", (d) => setOnline(d || [])),
      g("chats", "/api/chat/enhanced", (d) => setChats((d || []).slice(0, 3))),
      g("exec", "/api/executive/team", (d) => d.success && setExec((d.executives || []).slice(0, 6)), false),
      g("invites", "/api/games/invites", (d) => setInvites(d || [])),
      g("cd", "/api/countdown-settings", (d) => d?.success && setCd(d.settings), false),
      u?.id && g("notifs", `/api/notifications/${u.id}`, (d) => {
        setNotifs((d || []).slice(0, 3));
        setUnread((d || []).filter((n) => !n.read).length);
      }),
      axios.get(`${BASE_URL}/api/me`, H())
        .then(async (r) => {
          if (!r.data.homeJumuia) return;
          const j = await axios.get(`${BASE_URL}/api/jumuia/${r.data.homeJumuia.id}`, H());
          setJumuia({ name: j.data.name, leader: j.data.leaders?.[0]?.fullName || "TBA",
            members: j.data._count?.members || 0, next: j.data.nextMeeting });
        })
        .catch((e) => console.error("jumuia", e.message))
        .finally(() => setReady((p) => ({ ...p, jumuia: true }))),
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (user) {
      const c = user.coverImage;
      setCover(c ? (c.startsWith("http") ? c : `${BASE_URL}/${c}`) : null);
      setTheme(user.profileTheme || localStorage.getItem("profileTheme") || "navy");
    }
    load();
    const t = setInterval(load, 60000);
    const evs = ["newNotification", "notificationUpdate", "notificationRead", "notificationAllRead", "online"];
    evs.forEach((e) => window.addEventListener(e, load));
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, load)); };
    // eslint-disable-next-line
  }, [load]);

  useEffect(() => {
    if (!window.io || !user) return;
    const s = window.io(BASE_URL, { auth: { token: tk() } });
    s.on("connect", () => s.emit("join", user.id));
    ["new_notification", "new_message", "online_members", "game_invite_received"].forEach((e) =>
      s.on(e, () => { load(); if (e === "new_notification") window.dispatchEvent(new CustomEvent("newNotification")); }));
    return () => s.disconnect();
  }, [user, load]);

  /* countdown */
  useEffect(() => {
    if (!cd?.isActive) return;
    const tick = () => {
      const diff = new Date(cd.targetDate) - new Date();
      if (diff <= 0) return setLeft({ d: 0, h: 0, m: 0, s: 0, done: true });
      setLeft({ d: Math.floor(diff / 864e5), h: Math.floor((diff % 864e5) / 36e5),
        m: Math.floor((diff % 36e5) / 6e4), s: Math.floor((diff % 6e4) / 1e3), done: false });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [cd]);

  /* ad autoplay */
  useEffect(() => {
    if (ads.length < 2 || paused) return;
    const t = setInterval(() => setAdIdx((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length, paused]);

  /* ---------- actions ---------- */
  const logout = () => { localStorage.removeItem("user"); localStorage.removeItem("token"); navigate("/login"); };
  const pickTheme = (id) => {
    setTheme(id);
    localStorage.setItem("profileTheme", id);
    const s = { ...JSON.parse(localStorage.getItem("user") || "{}"), profileTheme: id };
    localStorage.setItem("user", JSON.stringify(s));
    setUser(s);
    setPicker(false);
  };
  const onCover = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return alert("Please select an image file.");
    if (f.size > 10 * 1024 * 1024) return alert("Image must be 10MB or smaller.");
    setPendingCover(f);
  };
  const saveCover = async (file) => {
    if (!file || !user) return;
    try {
      const fd = new FormData();
      fd.append("cover", file);
      const r = await axios.post(`${BASE_URL}/api/users/${user.id}/upload-cover`, fd, {
        headers: { Authorization: `Bearer ${tk()}`, "Content-Type": "multipart/form-data" },
      });
      const u = r.data.user;
      setCover(u.coverImage ? (u.coverImage.startsWith("http") ? u.coverImage : `${BASE_URL}/${u.coverImage}`) : null);
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
      setPendingCover(null);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Failed to upload cover.");
    }
  };


  const removeCover = async () => {
  if (!user) return;
  if (!window.confirm("Remove your cover photo?")) return;
  try {
    await axios.delete(`${BASE_URL}/api/users/${user.id}/delete-cover`, H());
    const updated = { ...user, coverImage: null };
    setCover(null);
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  } catch (err) {
    alert(
      err.response?.data?.error ||
      err.response?.data?.message ||
      "Failed to remove cover."
    );
  }
};
  const slide = (dir) => {
    const el = evRef.current;
    if (el) el.scrollBy({ left: dir * ((el.firstChild?.offsetWidth || 300) + 12), behavior: "smooth" });
  };
  const onEvScroll = (e) => {
    const el = e.currentTarget;
    setEvIdx(Math.round(el.scrollLeft / ((el.firstChild?.offsetWidth || 300) + 12)));
  };

  if (!user) return null;

  const first = user.fullName?.split(" ")[0] || "Member";
  const months = (() => {
    if (!user.createdAt) return "New";
    const c = new Date(user.createdAt), n = new Date();
    const m = (n.getFullYear() - c.getFullYear()) * 12 + n.getMonth() - c.getMonth();
    return m < 1 ? "New" : m === 1 ? "1 month" : `${m} months`;
  })();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 16 ? "Good afternoon" : "Good evening";
  const wa = user.phone ? `https://wa.me/${user.phone.replace(/\D/g, "")}` : "#";
  const ad = ads[adIdx];

  const nextEvent = events && events.length > 0
  ? [...events].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))[0]
  : null;

const nextEventText = nextEvent
  ? `ON  ${new Date(nextEvent.eventDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} - we'll be having (${nextEvent.title}) `.toUpperCase()
  : null;

  const utility = [
    ["Scan QR", QrCode, () => setScanner(true)],
    ["Ask ZUCA", FiMessageSquare, () => window.dispatchEvent(new CustomEvent("openZUCAI"))],
    ["Feedback", FiAlertCircle, () => navigate("/feedback")],
    ["Settings", FiSettings, () => navigate("/profile-settings")],
    ["Exit", FiLogOut, logout, true],
  ];
  const bottom = [["Attendance", FiUser, "/member/attendance"], ["Events", FiCalendar, "/schedules"], ["Lyrics", FiMusic, "/hymns"]];

  return (
    <div className="zd">
      {/* ===== SIDEBAR (desktop / tablet) ===== */}
      <aside className="zd-side">
        <div className="zd-sb-brand" onClick={() => navigate("/dashboard")}>
          <img src={logo} alt="ZUCA" /><span>ZUCA Portal</span>
        </div>
        {PRIMARY.map(([l, I, to]) => (
          <button key={l} className={pathname === to ? "on" : ""} onClick={() => navigate(to)} title={l}>
            <I size={18} /><span>{l}</span>
          </button>
        ))}
        <hr />
        {utility.map(([l, I, f, danger]) => (
          <button key={l} className={danger ? "danger" : ""} onClick={f} title={l}>
            <I size={18} /><span>{l}</span>
          </button>
        ))}
      </aside>

      {/* ===== 1. HERO ===== */}
      <div className="zd-wrap">
        <div className="zd-hero">
          {cover
            ? <img className="zd-cover" src={cover} alt="Cover" />
            : <div className="zd-cover" style={{ background: THEMES[theme] || THEMES.navy }} />}
          <div className="zd-shade" />
          <button className="zd-ib zd-tl" onClick={load} aria-label="Refresh">
            <FiRefreshCw size={17} className={refreshing ? "spin" : ""} />
          </button>
       <div className="zd-tr">
  <label className="zd-ib" title="Upload cover photo">
    <FiCamera size={17} />
    <input type="file" accept="image/*" hidden onChange={onCover} />
  </label>
  <button className="zd-ib" onClick={() => setPicker((v) => !v)} aria-label="Choose theme">
    <FiSliders size={17} />
  </button>
  {cover && (
    <button
      className="zd-ib zd-ib-danger"
      onClick={removeCover}
      title="Remove cover photo"
      aria-label="Remove cover photo"
    >
      <FiTrash2 size={17} />
    </button>
  )}
</div>
       {picker && (
  <div className="zd-picker">
    <div>
      <b>Banner theme</b>
      <button onClick={() => setPicker(false)} aria-label="Close"><FiX /></button>
    </div>
    <div className="zd-sw">
      {Object.entries(THEMES).map(([id, g]) => (
        <button
          key={id}
          style={{
            background: g,
            outline: theme === id ? "3px solid #ffffff" : "none",
            boxShadow:
              theme === id
                ? "0 0 0 2px #0f172a, 0 6px 16px -6px rgba(0,0,0,0.5)"
                : "0 2px 6px -3px rgba(0,0,0,0.3)",
          }}
          title={id}
          onClick={() => pickTheme(id)}
        >
          {theme === id && <FiCheck />}
        </button>
      ))}
    </div>
    <small>Upload a cover photo to override the theme.</small>
  </div>
)}
        <div className="zd-greet">
  <h1>{greeting}, {first} <MdWavingHand size={18} /></h1>
  <p>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
  {nextEventText && (
    <button
      type="button"
      className="zd-greet-next"
      onClick={() => navigate("/schedules")}
    >
      <FiCalendar size={12} />
      <span>{nextEventText}</span>
      <FiChevronRight size={12} />
    </button>
  )}
</div>
        </div>

        {/* profile card */}
        <div className="zd-prof">
          <div className="zd-pmain">
            <div className="zd-pav" onClick={() => setSettings(true)} title="Change profile photo">
              {user.profileImage ? <img src={user.profileImage} alt={user.fullName} /> : <span>{first[0].toUpperCase()}</span>}
              <i className="zd-on" /><b><FiCamera size={12} /></b>
            </div>
            <div className="zd-pinfo">
              <h2>{user.fullName}</h2>
              <p>{user.email}</p>
              <div className="zd-chips">
                <span>{user.role || "Member"}</span>
                <span>{user.membership_number || "Z#TEMP"}</span>
                {user.phone && <span><FiPhone size={11} />{user.phone}</span>}
                {user.homeJumuia && <span><FiUsers size={11} />{user.homeJumuia.name}</span>}
              </div>
            </div>
            <button
  className="zd-pgo"
  onClick={() => navigate("/profile-settings")}
  aria-label="Manage profile and birthday"
  title="Manage profile and birthday"
>
  <FiSettings size={14} />
  <span>Profile &amp; Birthday</span>
  <FiChevronRight size={14} />
</button>
          </div>
          <div className="zd-stats">
            <div><FiCalendar /><span><b>{months}</b><small>Joined</small></span></div>
            <div><FiHeart /><span><b>{money(fin.paid)}</b><small>Total paid</small></span></div>
            <a href={wa} target="_blank" rel="noopener noreferrer"><FaWhatsapp color="#16a34a" /><span><b>Message you</b><small>WhatsApp</small></span></a>
          </div>
        </div>

        {/* ===== ACTION PILLS (QR / Ask / Feedback / Exit) ===== */}
<div className="zd-actions">
  <button onClick={() => navigate("/dashboard")} className="zd-act on">
    <FiGrid size={15} /><span>Dashboard</span>
  </button>
  <button onClick={() => setScanner(true)} className="zd-act">
    <QrCode size={15} /><span>Scan QR</span>
  </button>
  <button onClick={() => window.dispatchEvent(new CustomEvent("openZUCAI"))} className="zd-act">
    <FiMessageSquare size={15} /><span>Ask ZUCA</span>
  </button>
  <button onClick={() => navigate("/feedback")} className="zd-act">
    <FiAlertCircle size={15} /><span>Feedback</span>
  </button>
  <button onClick={logout} className="zd-act danger">
    <FiLogOut size={15} /><span>Exit</span>
  </button>
</div>
<br/>

  {/* ===== COUNTDOWN ===== */}
            {cd?.isActive && !left.done && (
              <div
                className="countdown-container"
                style={{ borderLeft: `4px solid ${cd.eventColor || "#10b981"}` }}
              >
                <div className="countdown-content">
                  <div className="countdown-header">
                    <span className="countdown-icon">{cd.icon || "🎄"}</span>
                    <span className="countdown-title">{cd.title || "COUNTDOWN"}</span>
                    <span className="countdown-icon">{cd.icon || "🎄"}</span>
                  </div>

                  <div className="countdown-grid">
                    {[
                      [left.d, "Days"],
                      [left.h, "Hours"],
                      [left.m, "Minutes"],
                      [left.s, "Seconds"],
                    ].map(([val, lbl], i) => (
                      <React.Fragment key={lbl}>
                        {i > 0 && <div className="countdown-separator">:</div>}
                        <div className="countdown-item">
                          <div
                            className="countdown-number"
                            style={{
                              background: cd.eventColor || "#10b981",
                              color: "#fff",
                              boxShadow: `0 4px 15px ${cd.eventColor || "#10b981"}40`,
                            }}
                          >
                            {String(val).padStart(2, "0")}
                          </div>
                          <div className="countdown-label">{lbl}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  {cd.subtitle && (
                    <div className="countdown-event-info">
                      <span>
                        <FiCalendar size={14} /> {cd.subtitle}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

        {/* ===== 2. ACTIVE MEETINGS ===== */}
{sheets.length > 0 && (
  <div className="active-meetings-card">
    <div className="section-header">
      <div className="header-with-icon">
        <div className="header-icon-meeting"></div>
        <div>
          <h3>ACTIVE MEETINGS</h3>
          <p className="header-subtitle">This is an active meeting click to verify your attendance</p>
        </div>
      </div>
      <div className="meeting-count-badge">{sheets.length} Active</div>
    </div>

    <div className="active-meetings-list">
      {sheets.slice(0, 2).map((sheet) => (
        <div key={sheet.id} className="meeting-card-active">
          <div className="meeting-status-row">
            <span className="live-indicator">● LIVE</span>
            <span className="meeting-time-sm">
              <FiClock size={12} /> {sheet.eventTime || "4:30 PM"}
            </span>
          </div>

          <h4 className="meeting-title-sm">{sheet.title}</h4>

          <div className="meeting-details-sm">
            <span><FiCalendar size={12} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
            <span><FiMapPin size={12} /> {sheet.location || "ZUCA"}</span>
          </div>

          <div className="meeting-stats-sm">
            <FiUsers size={12} />
            <span>{sheet._count?.entries || 0} people checked in</span>
          </div>

          {sheet.enableWifiCheckin && sheet.wifiSSID && (
            <div className="meeting-wifi-sm">
              <span>📶</span>
              <span>Wi-Fi: {sheet.wifiSSID}</span>
            </div>
          )}

          <button
            className="checkin-btn-sm"
            onClick={() => navigate("/member/attendance")}
          >
            Let's Check In →
          </button>
        </div>
      ))}
    </div>

    {sheets.length > 2 && (
      <button
        className="view-all-meetings"
        onClick={() => navigate("/member/attendance")}
      >
        View All {sheets.length} Meetings →
      </button>
    )}
  </div>
)}
        <div className="zd-grid">
          <main className="zd-main">
            {/* ===== 3. ADVERT ===== */}
            {ad && (
              <section>
                <div className="zd-trend"><i />What's trending</div>
                <div className="zd-ad" key={ad.id}>
                  <div className="zd-adimg">
                    {ad.image ? <img src={ad.image} alt={ad.title || "Advertisement"} /> : <div className="zd-adph"><FiImage size={40} /></div>}
                  </div>
                  <div className="zd-adtx">
                    <small>ZETECH UNIVERSITY CATHOLIC ACTION</small>
                    {ad.title && <h2>{ad.title}</h2>}
                    {ad.description && <p>{ad.description}</p>}
                    {ad.link && (
                      <button className="zd-btn" onClick={() => (window.location.href = ad.link)}>
                        {ad.buttonText || "Go to page"} <FiArrowRight />
                      </button>
                    )}
                  </div>
                </div>
                <div className="zd-adctl">
                  <div>
                    <button onClick={() => setAdIdx((i) => (i - 1 + ads.length) % ads.length)} aria-label="Previous"><FiChevronLeft /></button>
                    <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"}>
                      {paused ? <FiPlay /> : <FiPause />}
                    </button>
                    <button onClick={() => setAdIdx((i) => (i + 1) % ads.length)} aria-label="Next"><FiChevronRight /></button>
                  </div>
                  {ads.length > 1 && (
                    <div className="zd-dots">
                      {ads.map((a, i) => <button key={a.id} className={i === adIdx ? "on" : ""} onClick={() => setAdIdx(i)} aria-label={`Advert ${i + 1}`} />)}
                    </div>
                  )}
                  <button onClick={() => setFullAd(true)}><FiMaximize2 /> <span>Full advert</span></button>
                </div>
              </section>
            )}

            {/* ===== 4. UPCOMING EVENTS (sliding) ===== */}
            <section>
              <div className="zd-sh">
                <h3>Upcoming events</h3>
                <div>
                  <button className="zd-arrow" onClick={() => slide(-1)} aria-label="Previous event"><FiChevronLeft /></button>
                  <button className="zd-arrow" onClick={() => slide(1)} aria-label="Next event"><FiChevronRight /></button>
                  <button className="zd-link" onClick={() => navigate("/schedules")}>See all</button>
                </div>
              </div>
              {!ready.events ? <Sk n={1} /> : events.length === 0 ? (
                <Empty t="No upcoming events" s="Check back soon for new schedules" />
              ) : (
                <>
                  <div className="zd-track" ref={evRef} onScroll={onEvScroll}>
                  {events.map((e) => (
  <article
    key={e.id}
    className="zd-ev"
    onClick={() => navigate("/schedules")}
    style={{
      background: e.image
        ? undefined
        : (THEMES[theme] || THEMES.navy),
    }}
  >
    <div
      className="zd-evbg"
      style={
        e.image
          ? { backgroundImage: `url(${e.image})` }
          : { background: "transparent" }
      }
    />
    {sameDay(e.eventDate) && <span className="zd-tag red">TODAY</span>}
    <div className="zd-evbar">
      <DateBox d={e.eventDate} />
      <div>
        <b>{e.title}</b>
        <span><FiClock size={12} /> {e.eventTime || "Time TBA"}</span>
        <span><FiMapPin size={12} /> {e.location || "Venue TBA"}</span>
      </div>
    </div>
  </article>
))}
                  </div>
                  {events.length > 1 && (
                    <div className="zd-dots c">
                      {events.map((e, i) => <button key={e.id} className={i === evIdx ? "on" : ""} aria-label={`Event ${i + 1}`}
                        onClick={() => evRef.current?.scrollTo({ left: i * ((evRef.current.firstChild?.offsetWidth || 300) + 12), behavior: "smooth" })} />)}
                    </div>
                  )}
                </>
              )}
                      </section>

          

            <div className="zd-two">
              <Card icon={<FiBook />} title="Readings" sub="Daily and Mass readings" to="/mass-readings">
               <div className="zd-tabs">
  <button className={rtab === "mass" ? "on" : ""} onClick={() => setRtab("mass")}>Mass readings</button>
  <button className={rtab === "today" ? "on" : ""} onClick={() => setRtab("today")}>Today</button>
</div>
                {rtab === "today" ? (
                  !ready.today ? <Sk /> : !today ? <Empty t="No reading today" /> : (
                    <div className="zd-list">
                      <div className="zd-cele">{today.celebration || "Daily reading"}</div>
                      {[["First reading", today.readings?.firstReading], ["Psalm", today.readings?.psalm],
                        ["Second reading", today.readings?.secondReading], ["Gospel", today.readings?.gospel]]
                        .filter(([, r]) => r).map(([l, r]) => (
                          <Row key={l} title={l} text={r.citation} onClick={() => navigate("/liturgical-calendar")} />
                        ))}
                    </div>
                  )
) : !ready.readings ? <Sk /> : readings.length === 0 ? (
  <>
    <Empty t="No readings available" />
    <button
      type="button"
      className="zd-upload-reading"
      onClick={() => navigate("/mass-readings/upload")}
    >
      <FiUpload size={15} />
      <span>Upload New Reading</span>
    </button>
  </>
) : (
  <>
    <div className="zd-list">
      {readings.map((r) => (
        <Row key={r.id} lead={<DateBox d={r.date} />} title={r.title}
          text={r.description || "Mass readings"} meta={`${r.attachments?.length || 0} files`}
          onClick={() => navigate(`/mass-readings/${r.id}`)} />
      ))}
    </div>

    {/* ===== Upload New Reading — only in Mass readings tab ===== */}
    <button
      type="button"
      className="zd-upload-reading"
      onClick={() => navigate("/mass-readings/upload")}
    >
      <FiUpload size={15} />
      <span>Upload New Reading</span>
    </button>
  </>
)}
</Card>

              <Card icon={<FiBell />} title="Updates" badge={unread ? `${unread} unread` : ""} to="/announcements">
                <div className="zd-tabs">
                  <button className={utab === "ann" ? "on" : ""} onClick={() => setUtab("ann")}>Announcements</button>
                  <button className={utab === "notif" ? "on" : ""} onClick={() => setUtab("notif")}>Notifications</button>
                </div>
                {(utab === "ann" ? !ready.ann : !ready.notifs) ? <Sk /> :
                  (utab === "ann" ? ann : notifs).length === 0 ? <Empty t={utab === "ann" ? "No announcements yet" : "You're all caught up"} /> : (
                    <div className="zd-list">
                      {(utab === "ann" ? ann : notifs).map((n) => (
                        <Row key={n.id}
                          lead={<span className={`zd-dot ${utab === "notif" && !n.read ? "on" : ""}`} />}
                          title={n.title || "Update"} text={(n.content || n.message || "").slice(0, 70)}
                          meta={ago(n.createdAt)} onClick={() => navigate("/announcements")} />
                      ))}
                    </div>
                  )}
              </Card>
            </div>

          
            
            
          </main>

          {/* ===== RIGHT RAIL ===== */}
          <aside className="zd-rail">
            {cd?.isActive && !left.done && (
              <section className="zd-cd" style={{ borderTopColor: cd.eventColor || "#fff" }}>
                <small>{cd.title || "Countdown"}</small>
                <div>
                  {[["Days", left.d], ["Hrs", left.h], ["Min", left.m], ["Sec", left.s]].map(([l, v]) => (
                    <span key={l}><b>{String(v).padStart(2, "0")}</b><i>{l}</i></span>
                  ))}
                </div>
                {cd.subtitle && <p>{cd.subtitle}</p>}
              </section>
            )}

            <Card icon={<FaHandHoldingHeart />} title="My giving" to="/contributions" link="Give">
              <div className="zd-fin">
                {[["Pledged", fin.pledged], ["Paid", fin.paid], ["Pending", fin.pending]].map(([l, v]) => (
                  <div key={l}><b>{money(v)}</b><small>{l}</small></div>
                ))}
                <div><b>{fin.camps}</b><small>Active campaigns</small></div>
              </div>
              {!ready.pledges ? <Sk n={1} /> : pledges.length === 0 ? <Empty t="No active pledges" /> : pledges.map((p) => {
                const pr = p.amountRequired > 0 ? Math.min(100, (p.amountPaid / p.amountRequired) * 100) : 0;
                return (
                  <div key={p.id} className="zd-pl" onClick={() => navigate("/contributions")}>
                    <div><b>{p.title}</b><span>{pr.toFixed(0)}%</span></div>
                    <div className="zd-bar"><i style={{ width: `${pr}%` }} /></div>
                    <small>{money(p.amountPaid)} / {money(p.amountRequired)}</small>
                  </div>
                );
              })}
            </Card>

            {jumuia && (
              <Card icon={<FiUsers />} title="My home jumuia" sub={jumuia.name} to="/jumuia-contributions" link="Contributions">
                <div className="zd-fin">
                  <div><b>{jumuia.leader.split(" ")[0]}</b><small>Leader</small></div>
                  <div><b>{jumuia.members}</b><small>Members</small></div>
                  {jumuia.next && <div><b>{new Date(jumuia.next).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b><small>Next meeting</small></div>}
                </div>
              </Card>
            )}

            <Card icon={<FiUsers />} title="Online now" badge={online.length} to="/chat" link="Join chat">
              {!ready.online ? <Sk n={1} /> : online.length === 0 ? <Empty t="No one is online" /> : (
                <div className="zd-online">
                  {online.map((m) => (
                    <div key={m.id}><Avatar p={m} size={42} /><i /><span>{m.fullName?.split(" ")[0] || "Member"}</span></div>
                  ))}
                </div>
              )}
            </Card>

            <Card icon={<FiClipboard />} title="Executive team" to="/executive" link="Full team">
              {!ready.exec ? <Sk /> : exec.length === 0 ? <Empty t="Leadership team coming soon" /> : (
                <div className="zd-list">
                  {exec.map((x) => (
                    <div key={x.id} className="zd-row click" onClick={() => navigate("/executive")}>
                      <Avatar p={x} />
                      <div className="zd-rt"><b>{x.name?.split(" ")[0] || "Leader"}</b><span>{x.position?.title || "Executive member"}</span></div>
                      {x.phone && <a className="zd-mini" href={`tel:${x.phone}`} onClick={(e) => e.stopPropagation()} aria-label="Call"><FiPhone size={14} /></a>}
                      {x.whatsappLink && <a className="zd-mini" href={x.whatsappLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="WhatsApp"><FaWhatsapp size={15} /></a>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="zd-foot">
          <div>
            <img src={logo} alt="ZUCA" onClick={() => navigate("/dashboard")} />
            <span><b>ZUCA Portal</b><small>Zetech University Catholic Action</small></span>
          </div>
          <nav>
            {[["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([l, to]) => (
              <button key={l} onClick={() => navigate(to)}>{l}</button>
            ))}
          </nav>
          <p>© {new Date().getFullYear()} ZUCA Portal | v 1.0 | Created by <b>@CHRISWEBSYS</b></p>
        </footer>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="zd-bnav">
        {bottom.map(([l, I, to]) => (
          <button key={l} className={pathname === to ? "on" : ""} onClick={() => navigate(to)}><I size={21} /><span>{l}</span></button>
        ))}
        <button onClick={() => setSheet(true)}><FiMoreHorizontal size={21} /><span>More</span></button>
      </nav>

      {sheet && (
        <div className="zd-ov" onClick={() => setSheet(false)}>
          <div className="zd-sheet" onClick={(e) => e.stopPropagation()}>
            <div><h3>More</h3><button onClick={() => setSheet(false)} aria-label="Close"><FiX /></button></div>
            {PRIMARY.slice(3).map(([l, I, to]) => (
              <button key={l} onClick={() => { setSheet(false); navigate(to); }}><I /><span>{l}</span><FiChevronRight /></button>
            ))}
            {utility.map(([l, I, f, danger]) => (
              <button key={l} className={danger ? "danger" : ""} onClick={() => { setSheet(false); f(); }}><I /><span>{l}</span><FiChevronRight /></button>
            ))}
          </div>
        </div>
      )}

      {fullAd && ad && (
        <div className="zd-ov mid" onClick={() => setFullAd(false)}>
          <div className="zd-modal" onClick={(e) => e.stopPropagation()}>
            <button className="zd-x" onClick={() => setFullAd(false)} aria-label="Close"><FiX /></button>
            {ad.image && <img src={ad.image} alt={ad.title || "Advertisement"} />}
            <div>
              <small>ZETECH UNIVERSITY CATHOLIC ACTION</small>
              {ad.title && <h2>{ad.title}</h2>}
              {ad.description && <p>{ad.description}</p>}
              {ad.buttonText && ad.link && <button className="zd-btn" onClick={() => (window.location.href = ad.link)}>{ad.buttonText} <FiArrowRight /></button>}
            </div>
          </div>
        </div>
      )}

      {pendingCover && <CoverCropper imageFile={pendingCover} onCropComplete={saveCover} onClose={() => setPendingCover(null)} />}
      {scanner && <QRScanner onClose={() => setScanner(false)} onSuccess={() => { setScanner(false); load(); }} />}
      <ProfileSettings isOpen={settings} onClose={() => setSettings(false)} user={user} onUserUpdate={(u) => setUser(u)} />
        

      <style>{`
.zd{--ink:#0f172a;--mut:#64748b;--ln:#e2e8f0;--bg:#f8fafc;--red:#dc2626;
  min-height:100vh;background:var(--bg);color:var(--ink);padding-bottom:78px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif}
.zd *{box-sizing:border-box}
.zd h1,.zd h2,.zd h3,.zd p{margin:0}
.zd button{font-family:inherit;cursor:pointer}
.zd button:focus-visible,.zd a:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.zd-wrap{max-width:1240px;margin:0 auto}
.spin{animation:zs 1s linear infinite}@keyframes zs{to{transform:rotate(360deg)}}

/* sidebar */
.zd-side{display:none}
.zd-sb-brand{display:flex;align-items:center;gap:10px;padding:6px 8px 16px;cursor:pointer;font-weight:800}
.zd-sb-brand img{width:36px;height:36px;object-fit:contain}
.zd-side button{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-radius:10px;
  background:none;color:var(--mut);font-size:14px;font-weight:600;text-align:left}
.zd-side button:hover{background:#f1f5f9;color:var(--ink)}
.zd-side button.on{background:var(--ink);color:#fff}
.zd-side button.danger{color:var(--red)}
.zd-side hr{border:0;border-top:1px solid var(--ln);margin:10px 0;width:100%}

/* hero */
.zd-hero{position:relative;height:270px;overflow:hidden;border-radius:0 0 8px 8px;background:var(--ink)}
.zd-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.zd-shade{
  position:absolute;
  inset:0;
  background:
    linear-gradient(180deg,
      rgba(15,23,42,.60) 0%,
      rgba(15,23,42,.20) 28%,
      rgba(15,23,42,.55) 55%,
      rgba(15,23,42,.95) 100%
    ),
    linear-gradient(90deg,
      rgba(15,23,42,.65) 0%,
      rgba(15,23,42,.15) 50%,
      transparent 100%
    );
}
.zd-ib{position:relative;width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.35);
  background:rgba(255,255,255,.18);color:#fff;display:grid;place-items:center;backdrop-filter:blur(8px);cursor:pointer}
.zd-ib:hover{background:rgba(255,255,255,.3)}

.zd-ib-danger{
  background:rgba(220,38,38,.25);
  border-color:rgba(248,113,113,.5);
  color:#fecaca;
}
.zd-ib-danger:hover{
  background:rgba(220,38,38,.55);
  color:#ffffff;
  border-color:rgba(248,113,113,.8);
  transform:scale(1.05);
}
.zd-ib i{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;border-radius:9Spx;background:var(--red);
  font:700 10px/17px sans-serif;font-style:normal;text-align:center;padding:0 4px}
.zd-tl{position:absolute;top:16px;left:16px}
.zd-tr{position:absolute;top:16px;right:16px;display:flex;gap:8px}
.zd-greet{
  position:absolute;
  left:20px;
  right:20px;
  top:50%;
  transform:translateY(-50%);
  color:#fff;
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
  pointer-events:none;
  z-index:2;
}
.zd-greet h1{
  font-size:20px;font-weight:800;letter-spacing:-.3px;
  display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;
  line-height:1.15;
  text-shadow:0 2px 14px rgba(0,0,0,.75),0 1px 3px rgba(0,0,0,.6);
}
.zd-greet p{
  font-size:11.5px;opacity:.95;margin:0;
  text-shadow:0 1px 8px rgba(0,0,0,.7);
}
.zd-picker{
  position: fixed;
  top:64px;
  right:16px;
  z-index:6;
  width:360px;
  max-width:calc(100% - 32px);
  max-height:60vh;
  overflow-y:auto;
  background:#fff;
  color:var(--ink);
  border-radius:16px;
  padding:16px;
  box-shadow:0 25px 50px -12px rgba(15,23,42,.35);
}
.zd-picker>div:first-child{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:12px;
  font-size:13px;
  font-weight:700;
  color:#0f172a;
}
.zd-picker>div:first-child button{
  border:0;
  background:#f1f5f9;
  border-radius:8px;
  width:26px;
  height:26px;
  display:grid;
  place-items:center;
  cursor:pointer;
  color:#475569;
}
.zd-sw{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:8px;
}
.zd-sw button{
  aspect-ratio:1;
  border:0;
  border-radius:10px;
  color:#fff;
  display:grid;
  place-items:center;
  cursor:pointer;
  transition:transform .15s ease;
}
.zd-sw button:hover{
  transform:scale(1.08);
}
.zd-picker small{
  display:block;
  margin-top:12px;
  color:#94a3b8;
  font-size:11px;
  text-align:center;
  line-height:1.4;
}


/* ============================================
   ACTIVE MEETINGS CARD
   ============================================ */
.active-meetings-card{
  background:#fff;
  border-radius:10px;
  padding:1.2rem;
  margin:16px 16px 1.5rem;
  border-left:4px solid #dc2626;
  box-shadow:0 6px 18px -12px rgba(15,23,42,.25);
}
.header-icon-meeting{
  width:10px;height:10px;
  background:linear-gradient(135deg,#dc2626,#b91c1c);
  border-radius:16px;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:1.6rem;color:#fff;
  flex-shrink:0;
}
.header-with-icon{
  display:flex;align-items:center;gap:12px;
}
.meeting-count-badge{
  padding:.2rem .5rem;border-radius:30px;
  font-size:.7rem;font-weight:700;
  BACKGROUND:linear-gradient(135deg,#dc2626,#b91c1c);
  color:#fff;
  white-space:nowrap;
}
.active-meetings-list{
  display:flex;flex-direction:column;gap:1rem;margin-top:1rem;
}
.meeting-card-active{
  background:#fff;border-radius:20px;padding:1rem;
  border:1px solid #e2e8f0;transition:all .3s ease;
}
.meeting-card-active:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 20px rgba(0,0,0,.1);
  border-color:#dc2626;
}
.meeting-status-row{
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:.75rem;
}
.live-indicator{
  background:#dc2626;color:#fff;font-size:.7rem;
  padding:.2rem .6rem;border-radius:20px;font-weight:600;
}
.meeting-time-sm{
  font-size:.7rem;color:#64748b;
  display:flex;align-items:center;gap:.25rem;
}
.meeting-title-sm{
  font-size:1rem;font-weight:700;color:#1e293b;
  margin:0 0 .5rem 0;
}
.meeting-details-sm{
  display:flex;gap:1rem;font-size:.7rem;color:#64748b;
  margin-bottom:.5rem;flex-wrap:wrap;
}
.meeting-details-sm span{
  display:inline-flex;align-items:center;gap:.25rem;
}
.meeting-stats-sm{
  display:flex;align-items:center;gap:.3rem;
  font-size:.7rem;color:#64748b;margin-bottom:.5rem;
}
.meeting-wifi-sm{
  display:flex;align-items:center;gap:.3rem;
  font-size:.7rem;color:#3b82f6;margin-bottom:.75rem;
}
.checkin-btn-sm{
  width:100%;
  background:linear-gradient(135deg,#dc2626,#b91c1c);
  color:#fff;border:0;padding:.6rem;border-radius:12px;
  font-weight:600;font-size:.8rem;cursor:pointer;
  transition:all .3s ease;
}
.checkin-btn-sm:hover{
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(220,38,38,.3);
}
.view-all-meetings{
  width:100%;background:transparent;border:1px solid #dc2626;
  color:#dc2626;padding:.6rem;border-radius:12px;
  font-weight:600;font-size:.75rem;cursor:pointer;
  margin-top:1rem;transition:all .3s ease;
}
.view-all-meetings:hover{background:#dc2626;color:#fff}

@media (max-width:640px){
  .active-meetings-card{padding:1rem;margin:12px 12px 1.5rem}
  .meeting-title-sm{font-size:.9rem}
  .checkin-btn-sm{font-size:.7rem;padding:.5rem}
}

/* ============================================
   COUNTDOWN
   ============================================ */
.countdown-container{
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
  border-radius:24px;padding:2rem;margin-bottom:1.5rem;
  text-align:center;position:relative;overflow:hidden;
  box-shadow:0 8px 32px rgba(0,0,0,.2);
  border:1px solid rgba(255,255,255,.08);
  animation:cdSlideDown .6s ease-out;
}
@keyframes cdSlideDown{
  0%{opacity:0;transform:translateY(-30px) scale(.95)}
  100%{opacity:1;transform:translateY(0) scale(1)}
}
.countdown-container::before{
  content:'';position:absolute;top:-50%;left:-50%;
  width:200%;height:200%;
  background:radial-gradient(circle at center,rgba(96,165,250,.08) 0%,transparent 70%);
  animation:cdRotate 20s linear infinite;
}
@keyframes cdRotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.countdown-container::after{
  content:'';position:absolute;top:-2px;left:-2px;right:-2px;bottom:-2px;
  background:linear-gradient(45deg,#60a5fa,#c084fc,#60a5fa);
  background-size:300% 300%;border-radius:24px;z-index:-1;
  animation:cdBorderGlow 3s ease-in-out infinite;opacity:.3;
}
@keyframes cdBorderGlow{
  0%{background-position:0% 50%;opacity:.3}
  50%{background-position:100% 50%;opacity:.6}
  100%{background-position:0% 50%;opacity:.3}
}
.countdown-content{position:relative;z-index:1}
.countdown-header{
  display:flex;align-items:center;justify-content:center;
  gap:.75rem;margin-bottom:1.5rem;
  animation:cdFadeInUp .8s ease-out;
}
@keyframes cdFadeInUp{
  0%{opacity:0;transform:translateY(20px)}
  100%{opacity:1;transform:translateY(0)}
}
.countdown-icon{
  font-size:1.5rem;
  animation:cdPulse 2s ease-in-out infinite;
}
@keyframes cdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
.countdown-title{
  font-size:1.25rem;font-weight:700;color:#fff;letter-spacing:1px;
}
.countdown-grid{
  display:flex;align-items:center;justify-content:center;
  gap:.5rem;margin-bottom:1.5rem;
}
.countdown-item{
  text-align:center;min-width:60px;
  animation:cdFadeInScale .6s ease-out forwards;opacity:0;
}
.countdown-item:nth-child(1){animation-delay:.1s}
.countdown-item:nth-child(2){animation-delay:.2s}
.countdown-item:nth-child(3){animation-delay:.3s}
.countdown-item:nth-child(4){animation-delay:.4s}
.countdown-item:nth-child(5){animation-delay:.5s}
.countdown-item:nth-child(6){animation-delay:.6s}
.countdown-item:nth-child(7){animation-delay:.7s}
@keyframes cdFadeInScale{
  0%{opacity:0;transform:scale(.8) translateY(20px)}
  100%{opacity:1;transform:scale(1) translateY(0)}
}
.countdown-number{
  font-size:3rem;font-weight:800;color:#fff;line-height:1;
  padding:.5rem;border-radius:12px;min-width:60px;
  font-variant-numeric:tabular-nums;
  transition:transform .3s ease;
}
.countdown-number:hover{transform:scale(1.1)}
.countdown-label{
  font-size:.7rem;color:#94a3b8;font-weight:600;
  text-transform:uppercase;letter-spacing:1px;margin-top:.25rem;
  transition:color .3s ease;
}
.countdown-item:hover .countdown-label{color:#60a5fa}
.countdown-separator{
  font-size:2rem;font-weight:700;color:#475569;
  padding-bottom:1.5rem;
  animation:cdBlink 1s ease-in-out infinite;
}
@keyframes cdBlink{0%,100%{opacity:1}50%{opacity:.2}}
.countdown-event-info{
  display:flex;justify-content:center;gap:1.5rem;flex-wrap:wrap;
  padding-top:1rem;border-top:1px solid rgba(255,255,255,.05);
}
.countdown-event-info span{
  font-size:.85rem;color:#94a3b8;font-weight:500;
  display:inline-flex;align-items:center;gap:6px;
}
@media(max-width:640px){
  .countdown-container{padding:1.5rem 1rem}
  .countdown-number{font-size:2rem;min-width:40px}
  .countdown-item{min-width:40px}
  .countdown-grid{gap:.25rem}
  .countdown-separator{font-size:1.5rem;padding-bottom:1.2rem}
  .countdown-title{font-size:1rem}
  .countdown-event-info{flex-direction:column;gap:.5rem;align-items:center}
  .countdown-event-info span{font-size:.75rem}
}

/* profile card */
.zd-prof{position:relative;z-index:2;margin:-46px 16px 0;background:#fff;border:1px solid var(--ln);border-radius:18px;
  box-shadow:0 12px 30px -16px rgba(15,23,42,.25);display:flex;flex-wrap:wrap;align-items:center}
.zd-pmain{display:flex;align-items:center;gap:14px;padding:14px 16px;flex:1 1 100%;min-width:0}
.zd-pav{position:relative;width:76px;height:76px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px var(--ln);flex-shrink:0;cursor:pointer}
.zd-pav img,.zd-pav>span{width:100%;height:100%;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:var(--ink);color:#fff;font-size:28px;font-weight:800}
.zd-on{position:absolute;left:3px;bottom:3px;width:13px;height:13px;border-radius:50%;background:#22c55e;border:2px solid #fff}
.zd-pav b{position:absolute;right:-2px;bottom:-2px;width:24px;height:24px;border-radius:50%;background:#fff;border:1px solid var(--ln);display:grid;place-items:center}
.zd-pinfo{flex:1;min-width:0}
.zd-pinfo h2{font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:-.2px;overflow-wrap:anywhere}
.zd-pinfo p{font-size:12.5px;color:var(--mut);margin:2px 0 8px;overflow-wrap:anywhere}
.zd-chips{display:flex;flex-wrap:wrap;gap:6px}
.zd-chips span{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border:1px solid var(--ln);border-radius:99px;background:var(--bg);font-size:11px;font-weight:700;text-transform:uppercase;color:#334155}
.zd-pgo{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:1px 1px;
  height:auto;
  width:auto;
  border:1px solid var(--ln);
  border-radius:10px;
  background:#fff;
  color:#475569;
  font-size:7px;
  font-weight:600;
  cursor:pointer;
  flex-shrink:0;
  white-space:nowrap;
  transition:all .18s ease;
}
.zd-pgo:hover{
  background:var(--ink);
  color:#fff;
  border-color:transparent;
  transform:translateY(-1px);
  box-shadow:0 6px 14px -6px rgba(15,23,42,.4);
}
.zd-pgo svg{flex-shrink:0}
.zd-pgo span{display:inline}


.zd-stats{display:flex;flex:1 1 100%;border-top:1px solid var(--ln)}
.zd-stats>*{flex:1;display:flex;align-items:center;justify-content:center;gap:9px;padding:12px 6px;text-decoration:none;color:var(--ink);min-width:0}
.zd-stats>*+*{border-left:1px solid var(--ln)}
.zd-stats svg{font-size:18px;color:#475569;flex-shrink:0}
.zd-stats span{display:flex;flex-direction:column;min-width:0}
.zd-stats b{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zd-stats small{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;font-weight:600}

/* layout */
.zd-pad{padding:16px 16px 0;display:flex;flex-direction:column;gap:10px}
.zd-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding:16px}
.zd-main,.zd-rail{display:flex;flex-direction:column;gap:16px;min-width:0}
.zd-two{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
/* ===== LIVE meetings — BIG, BOLD, RED ===== */
.zd-live{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  flex-wrap:wrap;
  background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);
  border:0;
  border-left:6px solid #7f1d1d;
  border-radius:16px;
  padding:18px 20px;
  box-shadow:0 12px 28px -12px rgba(220,38,38,.55),
             0 0 0 1px rgba(220,38,38,.15);
  color:#ffffff;
  position:relative;
  overflow:hidden;
  animation:zd-live-pulse 2.4s ease-in-out infinite;
}

/* soft pulsing glow */
@keyframes zd-live-pulse{
  0%,100%{
    box-shadow:0 12px 28px -12px rgba(220,38,38,.55),
               0 0 0 1px rgba(220,38,38,.15);
  }
  50%{
    box-shadow:0 12px 34px -8px rgba(220,38,38,.75),
               0 0 0 3px rgba(220,38,38,.15);
  }
}

/* decorative diagonal stripe on the right */
.zd-live::after{
  content:"";
  position:absolute;
  top:-40%;
  right:-10%;
  width:180px;
  height:180%;
  background:linear-gradient(90deg,
    rgba(255,255,255,.08) 0%,
    rgba(255,255,255,.02) 100%);
  transform:rotate(15deg);
  pointer-events:none;
}

.zd-lt{flex:1;min-width:220px;position:relative;z-index:1}

.zd-lt h3{
  font-size:20px;
  font-weight:900;
  margin:8px 0 6px;
  color:#ffffff;
  letter-spacing:-.3px;
  line-height:1.2;
  text-shadow:0 2px 6px rgba(0,0,0,.25);
  text-transform:uppercase;
}

.zd-lt p{
  display:flex;
  flex-wrap:wrap;
  gap:6px 18px;
  font-size:13px;
  color:rgba(255,255,255,.9);
  font-weight:600;
}

.zd-lt p span{
  display:inline-flex;
  align-items:center;
  gap:6px;
}

.zd-lt p span svg{
  width:14px;
  height:14px;
  flex-shrink:0;
}

/* the BIG red → white Check-In button */
.zd-live>button{
  background:#ffffff;
  color:#dc2626;
  border:0;
  border-radius:12px;
  padding:14px 28px;
  font-weight:900;
  font-size:15px;
  letter-spacing:.4px;
  text-transform:uppercase;
  width:100%;
  cursor:pointer;
  position:relative;
  z-index:1;
  box-shadow:0 6px 16px -6px rgba(0,0,0,.35);
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
  animation:zd-live-btn-blink 1.6s ease-in-out infinite;
}

@keyframes zd-live-btn-blink{
  0%,100%{ background:#ffffff; }
  50%    { background:#fff5f5; }
}

.zd-live>button:hover{
  transform:translateY(-2px) scale(1.02);
  box-shadow:0 10px 24px -6px rgba(0,0,0,.45);
  animation-play-state:paused;
  background:#ffffff;
}

.zd-live>button:active{
  transform:translateY(0) scale(1);
}

/* ===== LIVE tag on top ===== */
.zd-tag{
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-size:11px;
  font-weight:900;
  letter-spacing:1px;
  padding:5px 12px;
  border-radius:99px;
  text-transform:uppercase;
}

.zd-tag.red{
  background:#ffffff;
  color:#dc2626;
  box-shadow:0 3px 10px rgba(0,0,0,.25);
}

/* pulsing dot before LIVE */
.zd-tag.red::before{
  content:"";
  width:7px;
  height:7px;
  border-radius:50%;
  background:#dc2626;
  animation:zd-live-dot 1.2s ease-in-out infinite;
}

@keyframes zd-live-dot{
  0%,100%{
    opacity:1;
    transform:scale(1);
  }
  50%{
    opacity:.4;
    transform:scale(.75);
  }
}

/* Mobile tweak */
@media (max-width:520px){
  .zd-live{
    padding:16px 16px;
    border-radius:14px;
    border-left-width:5px;
  }
  .zd-lt h3{
    font-size:16px;
    margin:6px 0 4px;
  }
  .zd-lt p{
    font-size:11.5px;
    gap:4px 12px;
  }
  .zd-live>button{
    padding:12px 20px;
    font-size:13.5px;
    letter-spacing:.3px;
  }
  .zd-tag{
    font-size:10px;
    padding:4px 10px;
  }
}
.zd-link{background:none;border:0;color:var(--ink);font-size:13px;font-weight:700;text-decoration:underline;text-underline-offset:3px;padding:4px}

/* advert */
.zd-trend{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#334155;margin:0 0 8px 2px}
.zd-trend i{width:7px;height:7px;border-radius:50%;background:#22c55e}
.zd-ad{display:flex;flex-direction:column;background:#fff;border:1px solid var(--ln);border-radius:16px;overflow:hidden;animation:zf .4s ease}
@keyframes zf{from{opacity:0}to{opacity:1}}
.zd-adimg{background:#f1f5f9;display:grid;place-items:center}
.zd-adimg img{width:100%;max-height:300px;object-fit:contain;display:block}
.zd-adph{height:150px;display:grid;place-items:center;color:#94a3b8}
.zd-adtx{padding:18px 20px 22px;display:flex;flex-direction:column;justify-content:center;gap:8px}
.zd-adtx small,.zd-modal small{font-size:10px;font-weight:800;letter-spacing:1.3px;color:var(--mut)}
.zd-adtx h2{font-size:24px;line-height:1.15;font-weight:800;letter-spacing:-.4px}
.zd-adtx p{font-size:14px;line-height:1.6;color:var(--mut)}
.zd-btn{display:inline-flex;align-items:center;gap:8px;width:fit-content;margin-top:6px;background:var(--ink);color:#fff;border:0;border-radius:10px;padding:11px 18px;font-size:13px;font-weight:700}
.zd-adctl{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;flex-wrap:wrap}
.zd-adctl>div:first-child{display:flex;gap:6px}
.zd-adctl>button,.zd-adctl>div:first-child button{height:34px;min-width:34px;padding:0 10px;border:1px solid var(--ln);background:#fff;color:#334155;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:700}
.zd-adctl button:hover{background:#f1f5f9}
.zd-dots{display:flex;gap:6px;align-items:center}
.zd-dots.c{justify-content:center;margin-top:10px}
.zd-dots button{width:6px;height:6px;padding:0;border:0;border-radius:50%;background:#cbd5e1}
.zd-dots .on{width:20px;border-radius:6px;background:var(--ink)}

/* events */
.zd-sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.zd-sh h3{font-size:17px;font-weight:800}
.zd-sh>div{display:flex;align-items:center;gap:8px}
.zd-arrow{display:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--ln);background:#fff;place-items:center}
.zd-arrow:hover{background:var(--ink);color:#fff}
.zd-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:2px}
.zd-track::-webkit-scrollbar{display:none}
.zd-ev{
  position:relative;
  flex:0 0 86%;
  height:250px;
  border-radius:18px;
  overflow:hidden;
  scroll-snap-align:start;
  cursor:pointer;
  background:var(--ink);
  box-shadow:0 8px 22px -16px rgba(15,23,42,.5);
  transition:background .4s ease;
}
.zd-evbg{
  position:absolute;
  inset:0;
  background:linear-gradient(135deg,#0f172a,#334155) center/cover;
}
.zd-ev .zd-tag{position:absolute;top:12px;right:12px}
.zd-evbar{
  position:absolute;left:10px;right:10px;bottom:10px;
  display:flex;align-items:flex-start;gap:10px;
  padding:12px;border-radius:14px;
  background:rgba(15, 23, 42, 0.36);
  backdrop-filter:blur(10px);
  color:#fff;
}
.zd-evbar>div:nth-child(2){
  flex:1;min-width:0;
  display:flex;flex-direction:column;gap:4px;
}
.zd-evbar b{
  font-size:14.5px;
  font-weight:800;
  line-height:1.25;
  white-space:normal;
  word-break:break-word;
  overflow:visible;
  display:block;
}
.zd-evbar span{
  font-size:11.5px;
  opacity:.92;
  display:flex;
  align-items:center;
  gap:5px;
  line-height:1.3;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.zd-evbar span svg{flex-shrink:0}
.zd-db{background:#fff;color:var(--ink);border-radius:11px;min-width:48px;padding:6px 0;text-align:center;flex-shrink:0}
.zd-db b{display:block;font-size:19px;line-height:1;font-weight:800}
.zd-db i{font-size:10px;font-weight:800;text-transform:uppercase;font-style:normal;color:var(--mut)}

/* ===== Upload New Reading button (Mass readings tab only) ===== */
.zd-upload-reading{
  width:100%;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  margin-top:12px;
  padding:10px 14px;
  border:1px dashed #161516;
  border-radius:12px;
  background:transparent;
  color:#161516;
  font-size:12.5px;
  font-weight:700;
  cursor:pointer;
  transition:all .18s ease;
  font-family:inherit;
}

.zd-upload-reading:hover{
  background:#8b5cf6;
  color:#ffffff;
  border-style:solid;
  transform:translateY(-1px);
  box-shadow:0 6px 14px -6px rgba(2, 2, 2, 0.5);
}

.zd-upload-reading:active{
  transform:translateY(0);
  box-shadow:0 3px 8px -4px rgba(2, 2, 2, 0.4);
}

.zd-upload-reading svg{
  flex-shrink:0;
  width:15px;
  height:15px;
}

/* ===== Mobile: keep it comfortably sized ===== */
@media (max-width:520px){
  .zd-upload-reading{
    padding:9px 12px;
    font-size:12px;
    gap:6px;
  }
}

/* action pills row */
.zd-actions{
  display:flex;gap:6px;flex-wrap:wrap;
  padding:12px 16px 0;
}
.zd-act{
  display:inline-flex;align-items:center;gap:7px;
  padding:9px 14px;border-radius:10px;
  border:1px solid var(--ln);background:#fff;color:#475569;
  font-size:13px;font-weight:600;cursor:pointer;
  transition:all .18s ease;
}
.zd-act:hover{background:#f1f5f9;color:var(--ink);transform:translateY(-1px)}
.zd-act.on{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border-color:transparent}
.zd-act.danger{color:var(--red);margin-left:auto}
.zd-act.danger:hover{background:#fef2f2}

@media (max-width:768px){
  .zd-actions{padding:10px 12px 0;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
  .zd-actions::-webkit-scrollbar{display:none}
  .zd-act{flex-shrink:0;padding:8px 12px;font-size:12px}
  .zd-act.danger{margin-left:0}
}
  .zd-greet-next{
  display:inline-flex;
  align-items:center;
  gap:6px;
  margin-top:6px;
  padding:6px 12px;
  background:rgba(255, 255, 255, 0);
  border:1px solid rgba(255,255,255,.32);
  color:#fff;
  border-radius:999px;
  font-size:11.5px;
  font-weight:600;
  cursor:pointer;
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  transition:all .18s ease;
  pointer-events:auto;
  max-width:100%;
  white-space:normal;          
  text-align:center;
}
.zd-greet-next:hover{
  background:rgba(255,255,255,.3);
  transform:translateY(-1px);
}
.zd-greet-next svg{flex-shrink:0}
.zd-greet-next span{
  white-space:normal;          
  word-break:break-word;      
  line-height:1.35;
}

/* cards */
.zd-card{background:#fff;border:1px solid var(--ln);border-radius:16px;padding:16px;box-shadow:0 4px 14px -10px rgba(15,23,42,.25);min-width:0}
.zd-ch{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.zd-ci{width:36px;height:36px;border-radius:10px;background:var(--ink);color:#fff;display:grid;place-items:center;flex-shrink:0;font-size:17px}
.zd-ct{flex:1;min-width:0}
.zd-ct h3{font-size:15px;font-weight:800}
.zd-ct p{font-size:11.5px;color:var(--mut);margin-top:1px}
.zd-ch em{font-style:normal;font-size:11px;font-weight:700;background:#f1f5f9;border:1px solid var(--ln);border-radius:99px;padding:2px 9px;white-space:nowrap}
.zd-ch>button{background:none;border:0;font-size:12.5px;font-weight:700;color:var(--ink);text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.zd-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:10px}
.zd-tabs button{flex:1;border:0;background:none;border-radius:8px;padding:7px;font-size:12px;font-weight:700;color:var(--mut)}
.zd-tabs .on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(15,23,42,.12)}
.zd-list{display:flex;flex-direction:column}
.zd-row{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid #f1f5f9}
.zd-row:last-child{border-bottom:0}
.zd-row.click{cursor:pointer}.zd-row.click:hover{background:var(--bg)}
.zd-row>svg{color:#94a3b8;flex-shrink:0}
.zd-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.zd-rt b{font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zd-rt span{font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zd-row small{font-size:11px;color:#94a3b8;white-space:nowrap}
.zd-row .zd-db{background:var(--ink);color:#fff}.zd-row .zd-db i{color:#cbd5e1}
.zd-lead{width:38px;height:38px;border-radius:10px;background:#f1f5f9;display:grid;place-items:center;color:#334155;flex-shrink:0}
.zd-dot{width:9px;height:9px;border-radius:50%;background:#e2e8f0;flex-shrink:0}.zd-dot.on{background:var(--ink)}
.zd-cele{font-size:12px;font-weight:700;background:var(--ink);color:#fff;border-radius:99px;padding:5px 12px;width:fit-content;margin-bottom:6px}
.zd-av{border-radius:50%;overflow:hidden;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:14px}
.zd-av img{width:100%;height:100%;object-fit:cover}
.zd-mini{width:30px;height:30px;border-radius:50%;border:1px solid var(--ln);display:grid;place-items:center;color:#334155;flex-shrink:0}
.zd-empty{display:flex;flex-direction:column;align-items:center;gap:3px;padding:20px 10px;border:1px dashed var(--ln);border-radius:12px;background:var(--bg);text-align:center}
.zd-empty b{font-size:13px}.zd-empty span{font-size:11.5px;color:var(--mut)}
.zd-sk{height:56px;border-radius:12px;margin-bottom:8px;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zk 1.5s infinite}
@keyframes zk{to{background-position:-200% 0}}
.zd-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.zd-gal button{aspect-ratio:1;padding:0;border:1px solid var(--ln);border-radius:12px;overflow:hidden;background:#f1f5f9}
.zd-gal img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
.zd-gal button:hover img{transform:scale(1.06)}

/* rail */
.zd-cd{background:var(--ink);color:#fff;border-radius:16px;padding:16px;text-align:center;border-top:4px solid #fff}
.zd-cd small{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;opacity:.85}
.zd-cd>div{display:flex;justify-content:center;gap:8px;margin:12px 0 4px}
.zd-cd span{flex:1;max-width:66px;background:rgba(255,255,255,.1);border-radius:10px;padding:8px 0;display:flex;flex-direction:column}
.zd-cd b{font-size:24px;font-variant-numeric:tabular-nums;line-height:1}
.zd-cd i{font-size:9.5px;font-style:normal;text-transform:uppercase;opacity:.7;margin-top:3px}
.zd-cd p{font-size:12px;opacity:.8;margin-top:8px}
.zd-fin{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.zd-fin>div{background:var(--bg);border:1px solid var(--ln);border-radius:11px;padding:10px}
.zd-fin b{display:block;font-size:14px;font-weight:800}
.zd-fin small{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;font-weight:600}
.zd-pl{padding:8px 0;cursor:pointer}
.zd-pl>div:first-child{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}
.zd-pl span{font-weight:800}
.zd-bar{height:5px;border-radius:9px;background:#e2e8f0;overflow:hidden}
.zd-bar i{display:block;height:100%;background:var(--ink);border-radius:9px}
.zd-pl small{font-size:11px;color:var(--mut);display:block;margin-top:4px}
.zd-online{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:10px;max-height:230px;overflow-y:auto}
.zd-online>div{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px}
.zd-online i{position:absolute;top:30px;left:calc(50% + 8px);width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid #fff}
.zd-online span{font-size:11px;color:var(--mut);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* footer */
.zd-foot{margin:8px 16px 24px;background:var(--ink);color:#cbd5e1;border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.zd-foot>div{display:flex;align-items:center;gap:10px;text-align:left}
.zd-foot img{width:42px;height:42px;object-fit:contain;background:rgba(255,255,255,.08);border-radius:10px;padding:5px;cursor:pointer}
.zd-foot span{display:flex;flex-direction:column}.zd-foot b{color:#fff}.zd-foot small{font-size:11px;color:#94a3b8}
.zd-foot nav{display:flex;gap:18px}
.zd-foot nav button{background:none;border:0;color:#94a3b8;font-size:13px}.zd-foot nav button:hover{color:#fff}
.zd-foot p{font-size:11px;color:#94a3b8}.zd-foot p b{color:#e2e8f0}

/* mobile nav + sheets */
.zd-bnav{position:fixed;left:0;right:0;bottom:0;z-index:50;display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-top:1px solid var(--ln);
  padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))}
.zd-bnav button{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;color:#94a3b8;font-size:11px;font-weight:600}
.zd-bnav .on{color:var(--ink)}
.zd-ov{position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.6);display:flex;align-items:flex-end;justify-content:center}
.zd-ov.mid{align-items:center;padding:16px;backdrop-filter:blur(4px)}
.zd-sheet{width:100%;max-width:520px;max-height:80vh;overflow-y:auto;background:#fff;border-radius:20px 20px 0 0;padding:14px 16px calc(18px + env(safe-area-inset-bottom,0px))}
.zd-sheet>div{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.zd-sheet>div button{width:34px;height:34px;border-radius:50%;border:0;background:#f1f5f9;display:grid;place-items:center}
.zd-sheet>button{width:100%;display:flex;align-items:center;gap:12px;padding:13px 4px;border:0;border-bottom:1px solid #f1f5f9;background:none;font-size:14.5px;font-weight:600;color:var(--ink);text-align:left}
.zd-sheet>button span{flex:1}.zd-sheet>button>svg:last-child{color:#cbd5e1}
.zd-sheet>button.danger{color:var(--red)}
.zd-modal{position:relative;width:min(860px,100%);max-height:92vh;overflow-y:auto;background:#fff;border-radius:18px}
.zd-modal img{width:100%;max-height:460px;object-fit:contain;background:#f1f5f9;display:block}
.zd-modal>div{padding:22px 24px 26px;display:flex;flex-direction:column;gap:8px}
.zd-modal h2{font-size:28px;line-height:1.15}.zd-modal p{color:var(--mut);line-height:1.65;font-size:15px}
.zd-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.95);display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.15);z-index:2}

/* tablet: icon sidebar */
@media (min-width:768px){
  .zd{padding:0 0 0 72px}
  .zd-bnav{display:none}
  .zd-side{display:flex;flex-direction:column;align-items:stretch;position:fixed;left:0;top:0;bottom:0;width:72px;background:#fff;border-right:1px solid var(--ln);
    padding:14px 10px;overflow-y:auto;z-index:40}
  .zd-side span{display:none}
  .zd-side button{justify-content:center;padding:12px 0}
  .zd-sb-brand{justify-content:center;padding:4px 0 14px}
  .zd-hero{height:240px;border-radius:0 0 22px 22px}
.zd-greet h1{font-size:23px}
  .zd-pmain{flex:1 1 0}
  .zd-stats{flex:0 0 auto;border-top:0;border-left:1px solid var(--ln);align-self:stretch}
  .zd-stats>*{padding:0 20px}
  .zd-live>button{width:auto}
  .zd-ad{flex-direction:row;min-height:270px}
  .zd-adimg{flex:0 0 40%}.zd-adimg img{max-height:none;height:100%;object-fit:contain}
  .zd-adtx{flex:1;padding:28px 34px}.zd-adtx h2{font-size:32px}
  .zd-arrow{display:grid}
.zd-ev{flex:0 0 300px;height:250px}
  .zd-two{grid-template-columns:repeat(2,minmax(0,1fr))}
  .zd-foot{flex-direction:row;justify-content:space-between;flex-wrap:wrap;text-align:left}
  .zd-foot p{flex:1 1 100%;text-align:center}
}
/* desktop: full sidebar + sticky right rail */
@media (min-width:1200px){
  .zd{padding-left:240px}
  .zd-side{width:240px;padding:18px 14px}
  .zd-side span{display:inline}
  .zd-side button{justify-content:flex-start;padding:10px 12px}
  .zd-sb-brand{justify-content:flex-start;padding:4px 8px 18px}
  .zd-hero{margin:0 16px;border-radius:0 0 22px 22px}
  .zd-grid{grid-template-columns:minmax(0,1fr) 340px;align-items:start;padding:20px 16px}
  .zd-rail{position:sticky;top:16px}
  .zd-pad{padding:20px 16px 0}
}

@media (max-width:480px){
  .zd-greet-next{
    font-size:10.5px;
    padding:5px 10px;
    gap:4px;
    max-width:100%;
  }
}
@media (prefers-reduced-motion:reduce){.zd *{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}
