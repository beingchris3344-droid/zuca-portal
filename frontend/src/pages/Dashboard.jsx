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
  FiPlay, FiPause, FiMaximize2, FiArrowRight, FiUsers, FiMoreHorizontal, FiCheck, FiUpload, FiDownload, FiShare2, FiCopy, FiTrash, FiEdit2, FiSearch, FiFilter, FiFileText,
  FiDollarSign, FiClipboard, FiTrash2, FiUser, FiXCircle, FiCheckCircle, FiInfo, FiLink, FiExternalLink, FiChevronDown, FiChevronUp, FiArrowLeft, FiArrowUp, FiArrowDown, FiArrowRightCircle, FiArrowLeftCircle, FiActivity,
} from "react-icons/fi";
import { FaFilePdf, FaHandHoldingHeart, FaHeart, FaWhatsapp } from "react-icons/fa";
import { MdWavingHand } from "react-icons/md";
import { color } from "framer-motion";

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
const saveUser = (partial) => {
  try {
    const current = JSON.parse(localStorage.getItem("user") || "{}");
    const merged = { ...current, ...partial };
    localStorage.setItem("user", JSON.stringify(merged));
    return merged;
  } catch {
    return partial;
  }
};

// Preserves existing \n\n paragraphs; if the text is one long run-on
// string, splits it into paragraphs every ~2 sentences.
const formatAdText = (text) => {
  if (!text) return "";
  const trimmed = String(text).trim();
  if (trimmed.includes("\n")) return trimmed; // already has paragraphs
  const sentences = trimmed.split(/(?<=[.!?])\s+(?=[A-Z"“])/);
  const out = [];
  for (let i = 0; i < sentences.length; i += 2) {
    out.push(sentences.slice(i, i + 2).join(" "));
  }
  return out.join("\n\n");
};
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
  return (
    <div className="zd-db">
      <em>{x.toLocaleString("en-US", { weekday: "short" })}</em>
      <b>{x.getDate()}</b>
      <i>{x.toLocaleString("default", { month: "short" })}</i>
    </div>
  );
};
const Avatar = ({ p, size = 40 }) => (
  <div className="zd-av" style={{ width: size, height: size }}>
    {p?.profileImage ? <img src={p.profileImage} alt="" /> : <span>{(p?.fullName || p?.name || "U")[0].toUpperCase()}</span>}
  </div>
);

/* ===== ATTENDANCE GRAPH — colorful & range aware ===== */
function AttendanceGraph({ meetings, range = "monthly", width = 800, height = 260 }) {
  if (!meetings || meetings.length === 0) return null;

  const now = new Date();
  const buckets = [];

  if (range === "weekly") {
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i * 7 + 6));
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      buckets.push({ label: `W${8 - i}`, start, end, total: 0, attended: 0 });
    }
  } else if (range === "semester") {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      buckets.push({
        label: start.toLocaleString("en-US", { month: "short" }),
        start,
        end,
        total: 0,
        attended: 0,
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i * 5 + 4));
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() - i * 5);
      end.setHours(23, 59, 59, 999);
      buckets.push({
        label: `${end.getDate()}/${end.getMonth() + 1}`,
        start,
        end,
        total: 0,
        attended: 0,
      });
    }
  }

  meetings.forEach((m) => {
    const d = new Date(m.eventDate);
    for (const b of buckets) {
      if (d >= b.start && d <= b.end) {
        b.total++;
        if (m.userAttended) b.attended++;
        break;
      }
    }
  });

  const points = buckets.map((b) => ({
    label: b.label,
    rate: b.total > 0 ? (b.attended / b.total) * 100 : 0,
    total: b.total,
    attended: b.attended,
  }));

  const padX = 46;
  const padTop = 20;
  const padBot = 36;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBot;

  const xFor = (i) => padX + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);
  const yFor = (rate) => padTop + chartH - (rate / 100) * chartH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.rate)}`).join(" ");
  const areaPath =
    `M ${xFor(0)} ${padTop + chartH} ` +
    points.map((p, i) => `L ${xFor(i)} ${yFor(p.rate)}`).join(" ") +
    ` L ${xFor(points.length - 1)} ${padTop + chartH} Z`;

  // Color per point — green if >=75%, amber 40-74%, red <40%
  const colorFor = (rate) => {
    if (rate >= 75) return "#10b981";
    if (rate >= 40) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="zd-att-graph-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="attAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="attLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[25, 50, 75, 100].map((v) => (
        <line
          key={v}
          x1={padX}
          y1={yFor(v)}
          x2={padX + chartW}
          y2={yFor(v)}
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {[0, 25, 50, 75, 100].map((v) => (
        <text
          key={`y-${v}`}
          x={padX - 10}
          y={yFor(v) + 4}
          fontSize="11"
          fill="#94a3b8"
          textAnchor="end"
          fontWeight="700"
        >
          {v}%
        </text>
      ))}

      {/* Baseline */}
      <line
        x1={padX}
        y1={padTop + chartH}
        x2={padX + chartW}
        y2={padTop + chartH}
        stroke="#cbd5e1"
        strokeWidth="1"
      />

      {/* Gradient area under line */}
      <path d={areaPath} fill="url(#attAreaGrad)" />

      {/* Colored gradient line */}
      <path
        d={linePath}
        fill="none"
        stroke="url(#attLineGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points + labels, each colored by their rate */}
      {points.map((p, i) => (
        <g key={i}>
          <title>{`${p.label} · ${p.attended}/${p.total} attended (${p.rate.toFixed(0)}%)`}</title>
          <circle
            cx={xFor(i)}
            cy={yFor(p.rate)}
            r="6"
            fill="#ffffff"
            stroke={colorFor(p.rate)}
            strokeWidth="3"
          />
          <circle
            cx={xFor(i)}
            cy={yFor(p.rate)}
            r="2"
            fill={colorFor(p.rate)}
          />
          <text
            x={xFor(i)}
            y={height - 12}
            textAnchor="middle"
            fontSize="11.5"
            fill="#475569"
            fontWeight="800"
          >
            {p.label}
          </text>
          <text
            x={xFor(i)}
            y={yFor(p.rate) - 12}
            textAnchor="middle"
            fontSize="11"
            fill={colorFor(p.rate)}
            fontWeight="800"
          >
            {p.rate.toFixed(0)}%
          </text>
        </g>
      ))}
    </svg>
  );
}

function attendanceInsight(stats, meetings, user, upcoming = []) {
  if (!stats) return null;

  const name = user?.fullName?.split(" ")[0] || "friend";
  const rate = parseInt(stats.attendanceRate) || 0;
  const total = stats.totalMeetings || 0;
  const attended = stats.attendedMeetings || 0;
  const missed = stats.missedMeetings || 0;

  if (total === 0) {
    return (
      <span className="zd-insight-p">
        <strong>{name}</strong>, there aren't any meetings on record for you yet
        this semester. Once the first one is marked, you'll start seeing your
        pattern here. For now, the slate is clean.
      </span>
    );
  }

  const byMonth = {};
  (meetings || []).forEach((m) => {
    const d = new Date(m.eventDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { total: 0, attended: 0 };
    byMonth[key].total++;
    if (m.userAttended) byMonth[key].attended++;
  });

  const sortedMonths = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const rates = sortedMonths.map(([, v]) => (v.total > 0 ? (v.attended / v.total) * 100 : 0));

  let bestMonth = null;
  if (sortedMonths.length) {
    const [key, v] = sortedMonths.reduce((a, b) =>
      b[1].total > 0 && (a[1].total === 0 || b[1].attended / b[1].total > a[1].attended / a[1].total) ? b : a
    );
    if (v.total > 0) {
      const label = new Date(`${key}-01`).toLocaleString("en-US", { month: "long" });
      bestMonth = { label, rate: Math.round((v.attended / v.total) * 100) };
    }
  }

  const sortedMeetings = [...(meetings || [])].sort(
    (a, b) => new Date(b.eventDate) - new Date(a.eventDate)
  );
  let streak = 0;
  for (const m of sortedMeetings) {
    if (m.userAttended) streak++;
    else break;
  }

  const lastAttended = sortedMeetings.find((m) => m.userAttended);
  const daysSince = lastAttended
    ? Math.floor((Date.now() - new Date(lastAttended.eventDate)) / 864e5)
    : null;

  let trendUp = null;
  let trendDown = null;
  let trendFlat = false;
  if (rates.length >= 2) {
    const diff = Math.round(rates[rates.length - 1] - rates[rates.length - 2]);
    if (diff > 5) trendUp = diff;
    else if (diff < -5) trendDown = Math.abs(diff);
    else trendFlat = true;
  }

  const nextMeeting = upcoming?.length
    ? [...upcoming].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))[0]
    : null;
  const nextWhen = nextMeeting
    ? new Date(nextMeeting.eventDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : null;

  const opening =
    rate >= 90 ? (
      <><strong>{name}</strong>, your attendance for this semester has been <strong>outstanding</strong>. You've made <strong>{attended} of {total}</strong> meetings, which puts you at <strong>{rate}%</strong>.</>
    ) : rate >= 75 ? (
      <><strong>{name}</strong>, you've built a <strong>solid record</strong> this semester <strong>{attended} of {total}</strong> meetings attended, sitting at <strong>{rate}%</strong>.</>
    ) : rate >= 50 ? (
      <><strong>{name}</strong>, you're at <strong>{rate}%</strong> this semester  <strong>{attended} out of {total}</strong> meetings. There's a real foundation here, but it's not quite where it could be.</>
    ) : (
      <><strong>{name}</strong>, you've made <strong>{attended} of {total}</strong> meetings so far, which comes out to <strong>{rate}%</strong>. It's an honest number and the good news is there's plenty of room to move it.</>
    );

  const patternBits = [];
  if (streak >= 5) {
    patternBits.push(<>You're on a <strong>{streak}-meeting streak</strong> right now the kind of consistency that quietly sets the tone for everyone else.</>);
  } else if (streak >= 3) {
    patternBits.push(<>You've shown up <strong>{streak} meetings in a row</strong>, and that rhythm is starting to look like a habit.</>);
  } else if (streak === 2) {
    patternBits.push(<>You've made the last <strong>two meetings</strong> — small, but it counts.</>);
  } else if (streak === 0 && daysSince !== null && daysSince <= 14) {
    patternBits.push(<>You missed the most recent one, but you were there not long before, so it isn't a pattern yet.</>);
  } else if (streak === 0 && daysSince !== null && daysSince > 14) {
    patternBits.push(<>It's been a while since the last meeting you attended, and that gap is worth closing before it widens.</>);
  }

  if (bestMonth && total >= 4) {
    patternBits.push(<><strong>{bestMonth.label}</strong> was your strongest month so far you hit <strong>{bestMonth.rate}%</strong> there, which is worth remembering what was different about that stretch.</>);
  }

  if (trendUp) {
    patternBits.push(<>Compared to the month before, you're <strong>up {trendUp}%</strong>  whatever you changed recently is working.</>);
  } else if (trendDown) {
    patternBits.push(<>Compared to the month before, you've <strong>slipped {trendDown}%</strong>, so this is the moment to steady things before the dip becomes the new normal.</>);
  } else if (trendFlat && total >= 4) {
    patternBits.push(<>Month to month, your numbers have stayed roughly the same  <strong>consistent, though not climbing</strong>.</>);
  }

  const missBits = [];
  if (missed === 0) missBits.push(<>You haven't missed a single one.</>);
  else if (missed === 1) missBits.push(<>Only <strong>one missed meeting</strong> so far barely registers.</>);
  else if (missed <= 3) missBits.push(<><strong>{missed} missed meetings</strong> is a manageable number to claw back.</>);
  else missBits.push(<><strong>{missed} missed meetings</strong> is where the percentage is really being held down.</>);

  if (daysSince !== null) {
    if (daysSince === 0) missBits.push(<>You were there <strong>today</strong>, which is the best possible sign.</>);
    else if (daysSince === 1) missBits.push(<>You were there <strong>just yesterday</strong>.</>);
    else if (daysSince <= 7) missBits.push(<>Your last meeting was <strong>{daysSince} days ago</strong>.</>);
    else if (daysSince <= 21) missBits.push(<>It's been <strong>{daysSince} days</strong> since your last attendance.</>);
    else missBits.push(<>Your last recorded attendance was <strong>{daysSince} days ago</strong>.</>);
  }

  const close =
    nextMeeting && nextWhen ? (
      <>The next one is <strong>{nextWhen}</strong>{nextMeeting.title ? <> — <strong>{nextMeeting.title}</strong></> : null}, so there's a clear chance to add to the tally.</>
    ) : (
      <>Keep an eye on the schedule for the next meeting, and let's see where the number lands by the end of the semester.</>
    );

  return (
    <>
      <span className="zd-insight-p">{opening}</span>
      {patternBits.length > 0 && (
        <span className="zd-insight-p">{patternBits.map((b, i) => <React.Fragment key={i}>{b} </React.Fragment>)}</span>
      )}
      <span className="zd-insight-p">{missBits.map((b, i) => <React.Fragment key={i}>{b} </React.Fragment>)}</span>
      <span className="zd-insight-p">{close}</span>
    </>
  );
}
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

  const [myAttendance, setMyAttendance] = useState(null);
  const [attRange, setAttRange] = useState("monthly");

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
        if (!Array.isArray(d)) return;
        setPledges(d.filter((p) => p.status !== "COMPLETED").slice(0, 3));
        const paid = d.reduce((s, p) => s + (p.amountPaid || 0), 0);
        const pending = d.reduce((s, p) => s + (p.pendingAmount || 0), 0);
        setFin((f) => ({ ...f, paid, pending, pledged: paid + pending }));
      }),
      g("camps", "/api/contribution-types", (d) =>
        setFin((f) => ({ ...f, camps: (d || []).filter((c) => !c.deadline || new Date(c.deadline) > new Date()).length }))),
      g("hymns", "/api/songs?limit=3", (d) => { setHymns(d?.songs || []); setTotalHymns(d?.total || 0); }),
      g("mass", "/api/mass-programs", (d) => setMass((d || []).filter((p) => new Date(p.date) >= new Date()).slice(0, 4))),
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
          const merged = saveUser(r.data);
          setUser(merged);
          if (!r.data.homeJumuia) return;
          const j = await axios.get(`${BASE_URL}/api/jumuia/${r.data.homeJumuia.id}`, H());
          setJumuia({ name: j.data.name, leader: j.data.leaders?.[0]?.fullName || "TBA",
            members: j.data._count?.members || 0, next: j.data.nextMeeting });
        })
        .catch((e) => console.error("me", e.message))
        .finally(() => setReady((p) => ({ ...p, jumuia: true }))),

      g("myAttendance", "/api/attendance/member/all-meetings?semesterId=current", (d) => setMyAttendance(d)),
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

  useEffect(() => {
    if (ads.length < 2 || paused) return;
    const t = setInterval(() => setAdIdx((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length, paused]);

  const logout = () => { localStorage.removeItem("user"); localStorage.removeItem("token"); navigate("/login"); };
  const pickTheme = (id) => {
    setTheme(id);
    localStorage.setItem("profileTheme", id);
    const merged = saveUser({ profileTheme: id });
    setUser(merged);
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
      const merged = saveUser(u);
      setUser(merged);
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
      setCover(null);
      const merged = saveUser({ coverImage: null });
      setUser(merged);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Failed to remove cover.");
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

  const lastName = user.fullName?.split(" ").slice(1).join(" ") || "";
const nextEventText = nextEvent
  ? `Dear  ${lastName}, kindly remember that on  (${new Date(nextEvent.eventDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}) - we will be having (${nextEvent.title}) Event `
  : null;

  const utility = [
    ["Scan QR", QrCode, () => setScanner(true)],
    ["Ask ZUCA", FiMessageSquare, () => window.dispatchEvent(new CustomEvent("openZUCAI"))],
     ["PDF Tools", FaFilePdf , () => navigate("/tools/pdf")], 
    ["Feedback", FiAlertCircle, () => navigate("/feedback")],
    ["Settings", FiSettings, () => navigate("/profile-settings")],
    ["Exit", FiLogOut, logout, true],
  ];
  const bottom = [["Attendance", FiUser, "/member/attendance"], ["Lyrics", FiMusic, "/hymns"], ["Mass programs", FiBook, "/mass-programs"]];

  return (
    <div className="zd">
      <div className="zd-wrap">
        <div className="zd-hero">
          {cover
            ? <img className="zd-cover" src={cover} alt="Cover" />
            : <div className="zd-cover" style={{ background: THEMES[theme] || THEMES.navy }} />}
          <div className="zd-shade" />
                    <button className="zd-ib zd-tl" onClick={load} aria-label="Refresh dashboard">
            <FiRefreshCw size={17} className={refreshing ? "spin" : ""} />
            <span className="zd-ib-label">Refresh</span>
          </button>
          <div className="zd-tr">
            <label className="zd-ib" title="Upload cover photo">
              <FiCamera size={17} />
              <span className="zd-ib-label">Cover</span>
              <input type="file" accept="image/*" hidden onChange={onCover} />
            </label>
            <button className="zd-ib" onClick={() => setPicker((v) => !v)} aria-label="Choose banner theme">
              <FiSliders size={17} />
              <span className="zd-ib-label">Theme</span>
            </button>
            {cover && (
              <button
                className="zd-ib zd-ib-danger"
                onClick={removeCover}
                title="Remove cover photo"
                aria-label="Remove cover photo"
              >
                <FiTrash2 size={17} />
                <span className="zd-ib-label">Remove</span>
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
                <span>Acc.Type: - {user.role || "Member"}</span>
                <span>M.NO:- {user.membership_number || "Z#TEMP"}</span>
                <span>Phone:- {user.phone && <FiPhone size={11} />}{user.phone}</span>
                <span>Jumuia:- {user.homeJumuia?.name || "Not specified"}</span>
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

        <div className="zd-actions">
         <button onClick={() => navigate("/tools/pdf")} className="zd-act">
  <FaFilePdf color="red" size={15} /><span>i <FaHeart color="red" /> PDF tools</span>
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
        <br />

        <div className="zd-toprow">
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
                    <span><FiCalendar size={14} /> {cd.subtitle}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {sheets.length > 0 && (
            <div className="active-meetings-card">
              <div className="section-header">
                <div className="header-with-icon">
                  <div className="header-icon-meeting"></div>
                  <div>
                    <h3>ACTIVE MEETINGS</h3>
                    <p className="header-subtitle">Click to verify your attendance</p>
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

          
        </div>

         {ad && (
              <section>
                <div className="zd-trend"><i />What's trending</div>
                <div className="zd-ad anim-slide" key={ad.id}>
                  <div className="zd-adimg">
                    {ad.image ? <img src={ad.image} alt={ad.title || "Advertisement"} /> : <div className="zd-adph"><FiImage size={40} /></div>}
                  </div>
                  <div className="zd-adtx">
                    <small>ZETECH UNIVERSITY CATHOLIC ACTION</small>
                    {ad.title && <h2>{ad.title}</h2>}
{ad.description && (
  <p>{formatAdText(ad.description)}</p>
)}
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

        <div className="zd-grid">
          
          <main className="zd-main">
           

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
                            : cover
                              ? `url(${cover}) center/cover`
                              : (THEMES[theme] || THEMES.navy),
                        }}
                      >
                        <div
                          className="zd-evbg"
                          style={
                            e.image
                              ? { backgroundImage: `url(${e.image})` }
                              : cover
                                ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }
                                : { background: "transparent" }
                          }
                        />
                       <div className="zd-evhead">
  <DateBox d={e.eventDate} />
  <div className="zd-evhead-tx">
    <b>{e.title}</b>
    <span><FiClock size={12} /> {e.eventTime || "Time TBA"}</span>
    <span><FiMapPin size={12} /> {e.location || "Venue TBA"}</span>
  </div>
</div>
{sameDay(e.eventDate) && <span className="zd-tag red">TODAY</span>}
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

            {/* ===== MY ATTENDANCE — after events ===== */}
            {myAttendance?.stats && (
              <section className="zd-att-full">
                <header className="zd-att-full-head">
                  <div className="zd-att-full-title">
                    <span className="zd-att-full-icon"><FiActivity /></span>
                    <div>
                      <h3>My Attendance</h3>
                      <p>
                        {myAttendance.stats.totalMeetings} meetings · {myAttendance.stats.attendanceRate}% rate
                      </p>
                    </div>
                  </div>

                  <div className="zd-att-full-controls">
                    <select
                      className="zd-att-select"
                      value={attRange}
                      onChange={(e) => setAttRange(e.target.value)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="semester">Semester</option>
                    </select>
                    <button
                      className="zd-att-full-cta"
                      onClick={() => navigate("/member/attendance-history")}
                    >
                      Full report <FiArrowRight size={13} />
                    </button>
                  </div>
                </header>

                <div className="zd-att-full-body">
  <div className="zd-att-full-graph">
    <AttendanceGraph
      meetings={myAttendance.allMeetings}
      range={attRange}
    />
  </div>

  <div className="zd-att-full-side">
    <div className="zd-att-stat">
      <span className="zd-att-stat-num">{myAttendance.stats.attendedMeetings}</span>
      <span className="zd-att-stat-lbl">Attended</span>
    </div>
    <div className="zd-att-stat">
      <span className="zd-att-stat-num">{myAttendance.stats.missedMeetings}</span>
      <span className="zd-att-stat-lbl">Missed</span>
    </div>
    <div className="zd-att-stat">
      <span className="zd-att-stat-num">{myAttendance.stats.upcomingMeetings}</span>
      <span className="zd-att-stat-lbl">Upcoming</span>
    </div>
    <div className="zd-att-stat">
      <span className="zd-att-stat-num">{myAttendance.stats.attendanceRate}%</span>
      <span className="zd-att-stat-lbl">Rate</span>
    </div>
  </div>
</div>

{/* 👇 insight now sits below the graph + stats, full width */}
<div className="zd-att-full-insight-wrap">
  <div className="zd-att-full-insight">
    {attendanceInsight(myAttendance.stats, myAttendance.allMeetings, user, events)}
  </div>
</div>
              </section>
            )}

            <div className="zd-two">
              <Card icon={<FiBook color="black" />} title="Readings" sub="Daily and Mass readings" to="/mass-readings">
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

            {/* ===== MASS PROGRAMS ===== */}
<Card icon={<FiGrid />} title="Mass programs" sub="Upcoming" to="/mass-programs" link="See all">
  {!ready.mass ? <Sk n={2} /> : mass.length === 0 ? <Empty t="No upcoming mass programs" /> : (
    <div className="zd-list">
      {mass.map((m) => {
        // The 10 liturgical moments in order
        const slots = [
          ["Entrance",     m.entrance],
          ["Mass",         m.mass],
          ["Bible",        m.bible],
          ["Offertory",    m.offertory],
          ["Procession",   m.procession],
          ["Mtakatifu",    m.mtakatifu],
          ["Sign of Peace",m.signOfPeace],
          ["Communion",    m.communion],
          ["Thanksgiving", m.thanksgiving],
          ["Exit",         m.exit],
        ].filter(([, v]) => v && String(v).trim() !== "");

        return (
          <div key={m.id} className="zd-mp-item">
            <Row
              lead={<DateBox d={m.date} />}
              title={m.venue || "Mass"}
              text={m.time || "4:30 PM"}
              onClick={() => navigate("/mass-programs")}
            />

            {slots.length > 0 && (
              <ul className="zd-mp-songs">
                {slots.slice(0, 3).map(([label, song]) => (
                  <li key={label}>
                    <FiMusic size={11} />
                    <span>
                      <b className="zd-mp-moment">{label}:</b> {song}
                    </span>
                  </li>
                ))}
                {slots.length > 3 && (
                  <li className="zd-mp-songs-more">
                    +{slots.length - 3} more songs
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  )}
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
{ad.description && (
  <p>{formatAdText(ad.description)}</p>
)}
              {ad.buttonText && ad.link && <button className="zd-btn" onClick={() => (window.location.href = ad.link)}>{ad.buttonText} <FiArrowRight /></button>}
            </div>
          </div>
        </div>
      )}

      {pendingCover && <CoverCropper imageFile={pendingCover} onCropComplete={saveCover} onClose={() => setPendingCover(null)} />}
      {scanner && <QRScanner onClose={() => setScanner(false)} onSuccess={() => { setScanner(false); load(); }} />}
      <ProfileSettings
        isOpen={settings}
        onClose={() => setSettings(false)}
        user={user}
        onUserUpdate={(u) => setUser(saveUser(u))}
      />

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

.zd-toprow{display:contents}
.zd-today-tile{display:none}

/* hero */
.zd-hero{
  position:relative;
  height:270px;
  overflow:hidden;
  border-radius:0 0 8px 8px;
  background:var(--ink);
}
.zd-cover{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
}
.zd-shade{
  position:absolute;
  inset:0;
  background:
    linear-gradient(180deg,rgba(15,23,42,.60) 0%,rgba(15,23,42,.20) 28%,rgba(15,23,42,.55) 55%,rgba(15,23,42,.95) 100%),
    linear-gradient(90deg,rgba(15,23,42,.65) 0%,rgba(15,23,42,.15) 50%,transparent 100%);
}

/* icon buttons — always show label */
.zd-ib{
  position:relative;
  width:auto;
  min-width:38px;
  height:38px;
  padding:0 12px;
  gap:6px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:11px;
  border:1px solid rgba(255,255,255,.35);
  background:rgba(255,255,255,.18);
  color:#fff;
  backdrop-filter:blur(8px);
  cursor:pointer;
  flex-shrink:0;
  transition:background .15s ease, transform .15s ease;
}
.zd-ib:hover{background:rgba(255,255,255,.3)}
.zd-ib:active{transform:scale(.96)}

.zd-ib-label{
  font-size:12px;
  font-weight:700;
  white-space:nowrap;
  color:#fff;
}

.zd-ib-danger{
  background:rgba(220,38,38,.25);
  border-color:rgba(248,113,113,.5);
  color:#fecaca;
}
.zd-ib-danger:hover{
  background:rgba(220,38,38,.55);
  color:#fff;
  border-color:rgba(248,113,113,.8);
  transform:scale(1.05);
}

/* button clusters — top-left and top-right */
.zd-tl{
  position:absolute;
  top:16px;
  left:16px;
  z-index:3;
}
.zd-tr{
  position:absolute;
  top:16px;
  right:16px;
  display:flex;
  gap:8px;
  z-index:3;
  max-width:calc(100% - 100px);   /* leaves room for the Refresh button on the left */
  flex-wrap:wrap;                 /* 👈 wrap into rows when space runs out */
  justify-content:flex-end;       /* 👈 keep them anchored right */
}

/* greeting — stays centered */
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
  font-size:20px;
  font-weight:800;
  letter-spacing:-.3px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  flex-wrap:wrap;
  line-height:1.15;
  text-shadow:0 2px 14px rgba(0,0,0,.75),0 1px 3px rgba(0,0,0,.6);
}
.zd-greet p{
  font-size:11.5px;
  opacity:.95;
  margin:0;
  text-shadow:0 1px 8px rgba(0,0,0,.7);
}

/* ============================================================
   HERO — responsive (labels always visible)
   ============================================================ */

/* Tablets: shrink padding & font a touch */
@media (max-width:640px){
  .zd-hero{height:250px}
  .zd-ib{height:34px;min-width:34px;padding:0 9px;gap:5px}
  .zd-ib-label{font-size:11px}
  .zd-greet h1{font-size:17px}
  .zd-greet p{font-size:11px}
  .zd-tl{top:12px;left:12px}
  .zd-tr{top:12px;right:12px;gap:6px;max-width:calc(100% - 90px)}
}

/* Phones: labels stay, but shrink further and allow wrapping */
@media (max-width:480px){
  .zd-hero{height:230px}
  .zd-ib{height:32px;min-width:32px;padding:0 8px;gap:4px;border-radius:9px}
  .zd-ib-label{font-size:10px}
  .zd-tl{top:10px;left:10px}
  .zd-tr{top:10px;right:10px;gap:5px;max-width:calc(100% - 80px)}
  .zd-greet{left:14px;right:14px}
  .zd-greet h1{font-size:15px;gap:4px}
  .zd-greet p{font-size:10.5px}
}

/* Very small phones: allow top-right cluster to go 2 rows */
@media (max-width:360px){
  .zd-tr{
    max-width:calc(100% - 70px);
  }
  .zd-ib{padding:0 7px;gap:3px}
  .zd-ib-label{font-size:9.5px}
}

.zd-picker{position:fixed;top:64px;right:16px;z-index:6;width:360px;max-width:calc(100% - 32px);max-height:60vh;overflow-y:auto;background:#fff;color:var(--ink);border-radius:16px;padding:16px;box-shadow:0 25px 50px -12px rgba(15,23,42,.35)}
.zd-picker>div:first-child{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;font-weight:700;color:#0f172a}
.zd-picker>div:first-child button{border:0;background:#f1f5f9;border-radius:8px;width:26px;height:26px;display:grid;place-items:center;cursor:pointer;color:#475569}
.zd-sw{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.zd-sw button{aspect-ratio:1;border:0;border-radius:10px;color:#fff;display:grid;place-items:center;cursor:pointer;transition:transform .15s ease}
.zd-sw button:hover{transform:scale(1.08)}
.zd-picker small{display:block;margin-top:12px;color:#94a3b8;font-size:11px;text-align:center;line-height:1.4}

/* active meetings */
.active-meetings-card{background:#fff;border-radius:10px;padding:1.2rem;margin:16px 16px 1.5rem;border-left:4px solid #dc2626;box-shadow:0 6px 18px -12px rgba(15,23,42,.25)}
.header-icon-meeting{width:10px;height:10px;background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:1.6rem;color:#fff;flex-shrink:0}
.header-with-icon{display:flex;align-items:center;gap:12px}
.meeting-count-badge{padding:.2rem .5rem;border-radius:30px;font-size:.7rem;font-weight:700;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;white-space:nowrap}
.active-meetings-list{display:flex;flex-direction:column;gap:1rem;margin-top:1rem}
.meeting-card-active{background:#fff;border-radius:20px;padding:1rem;border:1px solid #e2e8f0;transition:all .3s ease}
.meeting-card-active:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.1);border-color:#dc2626}
.meeting-status-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
.live-indicator{background:#dc2626;color:#fff;font-size:.7rem;padding:.2rem .6rem;border-radius:20px;font-weight:600}
.meeting-time-sm{font-size:.7rem;color:#64748b;display:flex;align-items:center;gap:.25rem}
.meeting-title-sm{font-size:1rem;font-weight:700;color:#1e293b;margin:0 0 .5rem 0}
.meeting-details-sm{display:flex;gap:1rem;font-size:.7rem;color:#64748b;margin-bottom:.5rem;flex-wrap:wrap}
.meeting-details-sm span{display:inline-flex;align-items:center;gap:.25rem}
.meeting-stats-sm{display:flex;align-items:center;gap:.3rem;font-size:.7rem;color:#64748b;margin-bottom:.5rem}
.meeting-wifi-sm{display:flex;align-items:center;gap:.3rem;font-size:.7rem;color:#3b82f6;margin-bottom:.75rem}
.checkin-btn-sm{width:100%;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:0;padding:.6rem;border-radius:12px;font-weight:600;font-size:.8rem;cursor:pointer;transition:all .3s ease}
.checkin-btn-sm:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(220,38,38,.3)}
.view-all-meetings{width:100%;background:transparent;border:1px solid #dc2626;color:#dc2626;padding:.6rem;border-radius:12px;font-weight:600;font-size:.75rem;cursor:pointer;margin-top:1rem;transition:all .3s ease}
.view-all-meetings:hover{background:#dc2626;color:#fff}
@media (max-width:640px){
  .active-meetings-card{padding:1rem;margin:12px 12px 1.5rem}
  .meeting-title-sm{font-size:.9rem}
  .checkin-btn-sm{font-size:.7rem;padding:.5rem}
}

/* countdown */
.countdown-container{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:24px;padding:2rem;margin-bottom:1.5rem;text-align:center;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);animation:cdSlideDown .6s ease-out}
@keyframes cdSlideDown{0%{opacity:0;transform:translateY(-30px) scale(.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
.countdown-content{position:relative;z-index:1}
.countdown-header{display:flex;align-items:center;justify-content:center;gap:.75rem;margin-bottom:1.5rem}
.countdown-icon{font-size:1.5rem;animation:cdPulse 2s ease-in-out infinite}
@keyframes cdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
.countdown-title{font-size:1.25rem;font-weight:700;color:#fff;letter-spacing:1px}
.countdown-grid{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:1.5rem}
.countdown-item{text-align:center;min-width:60px}
.countdown-number{font-size:3rem;font-weight:800;color:#fff;line-height:1;padding:.5rem;border-radius:12px;min-width:60px;font-variant-numeric:tabular-nums}
.countdown-label{font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-top:.25rem}
.countdown-separator{font-size:2rem;font-weight:700;color:#475569;padding-bottom:1.5rem;animation:cdBlink 1s ease-in-out infinite}
@keyframes cdBlink{0%,100%{opacity:1}50%{opacity:.2}}
.countdown-event-info{display:flex;justify-content:center;gap:1.5rem;flex-wrap:wrap;padding-top:1rem;border-top:1px solid rgba(255,255,255,.05)}
.countdown-event-info span{font-size:.85rem;color:#94a3b8;font-weight:500;display:inline-flex;align-items:center;gap:6px}
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
.zd-prof{
  position:relative;
  z-index:2;
  margin:-46px 16px 0;
  background:#fff;
  border:1px solid var(--ln);
  border-radius:18px;
  box-shadow:0 12px 30px -16px rgba(15,23,42,.25);
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  overflow:hidden;
}

.zd-pmain{
  display:flex;
  align-items:flex-start;
  gap:14px;
  padding:14px 16px;
  flex:1 1 100%;
  min-width:0;
  flex-wrap:wrap;              /* 👈 allow button to drop below info */
}

/* avatar — never shrinks, keeps position */
.zd-pav{
  position:relative;
  width:76px;
  height:76px;
  border-radius:50%;
  border:3px solid #fff;
  box-shadow:0 0 0 1px var(--ln);
  flex:0 0 auto;
  cursor:pointer;
  margin-top:2px;
}
.zd-pav img,
.zd-pav>span{
  width:100%;
  height:100%;
  border-radius:50%;
  object-fit:cover;
  display:grid;
  place-items:center;
  background:var(--ink);
  color:#fff;
  font-size:28px;
  font-weight:800;
}
.zd-on{
  position:absolute;
  left:3px;
  bottom:3px;
  width:13px;
  height:13px;
  border-radius:50%;
  background:#22c55e;
  border:2px solid #fff;
}
.zd-pav b{
  position:absolute;
  right:-2px;
  bottom:-2px;
  width:24px;
  height:24px;
  border-radius:50%;
  background:#fff;
  border:1px solid var(--ln);
  display:grid;
  place-items:center;
}

/* info — full text, wraps at word boundaries only */
.zd-pinfo{
  flex:1 1 200px;              /* 👈 needs at least ~200px before shrinking */
  min-width:0;
}
.zd-pinfo h2{
  font-size:18px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:-.2px;
  margin:0 0 4px 0;
  line-height:1.2;
  white-space:normal;
  overflow-wrap:break-word;    /* 👈 break at word boundaries only */
  word-break:normal;           /* 👈 NOT 'break-word' — that was breaking mid-word */
  hyphens:none;
}
.zd-pinfo p{
  font-size:12.5px;
  color:var(--mut);
  margin:0 0 8px 0;
  line-height:1.3;
  white-space:normal;
  overflow-wrap:break-word;
  word-break:normal;
  hyphens:none;
}

/* chips — wrap at word boundaries only */
.zd-chips{
  display:flex;
  flex-wrap:wrap;
  gap:6px 12px;
  max-width:100%;
}
.zd-chips span{
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:0;
  border:0;
  border-radius:0;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  color:#334155;
  background:transparent;
  white-space:normal;
  overflow-wrap:break-word;    /* 👈 break at word boundaries only */
  word-break:normal;
  hyphens:none;
  max-width:100%;
}

/* profile button — sits on its own line when space is tight */
.zd-pgo{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 10px;
  border:1px solid var(--ln);
  border-radius:10px;
  background:#fff;
  color:#475569;
  font-size:11px;
  font-weight:600;
  cursor:pointer;
  flex:0 0 auto;
  align-self:flex-start;
  white-space:nowrap;
  transition:all .18s ease;
  margin-left:auto;            /* 👈 push right when on same row as info */
}
.zd-pgo:hover{
  background:var(--ink);
  color:#fff;
  border-color:transparent;
  transform:translateY(-1px);
  box-shadow:0 6px 14px -6px rgba(15,23,42,.4);
}
.zd-pgo svg{flex-shrink:0}

/* stats bar — same position, same row */
.zd-stats{
  display:flex;
  flex:1 1 100%;
  border-top:1px solid var(--ln);
  flex-wrap:nowrap;
}
.zd-stats>*{
  flex:1 1 0;
  min-width:0;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  padding:12px 6px;
  text-decoration:none;
  color:var(--ink);
}
.zd-stats>*+*{border-left:1px solid var(--ln)}
.zd-stats svg{font-size:18px;color:#475569;flex-shrink:0}
.zd-stats span{display:flex;flex-direction:column;min-width:0}
.zd-stats b{
  font-size:13px;
  font-weight:800;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.zd-stats small{
  font-size:10px;
  color:var(--mut);
  text-transform:uppercase;
  letter-spacing:.4px;
  font-weight:600;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* tiny phones — shrink sizes, keep everything readable */
@media (max-width:420px){
  .zd-pmain{gap:10px;padding:12px}
  .zd-pav{width:60px;height:60px}
  .zd-pav img,.zd-pav>span{font-size:22px}
  .zd-pinfo h2{font-size:15px}
  .zd-pinfo p{font-size:11px}
  .zd-chips{gap:5px 10px}
  .zd-chips span{font-size:10px}
  .zd-pgo{padding:5px 8px;font-size:10px}
  .zd-stats b{font-size:11.5px}
  .zd-stats small{font-size:9px}
}

/* layout */
.zd-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding:16px}
.zd-main,.zd-rail{display:flex;flex-direction:column;gap:16px;min-width:0}
.zd-two{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}

/* LIVE tag */
.zd-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:1px;padding:5px 12px;border-radius:99px;text-transform:uppercase}
.zd-tag.red{background:#fff;color:#dc2626;box-shadow:0 3px 10px rgba(0,0,0,.25)}
.zd-tag.red::before{content:"";width:7px;height:7px;border-radius:50%;background:#dc2626;animation:zd-live-dot 1.2s ease-in-out infinite}
@keyframes zd-live-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}

.zd-link{background:none;border:0;color:var(--ink);font-size:13px;font-weight:700;text-decoration:underline;text-underline-offset:3px;padding:4px}

/* advert */
.zd-trend{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#334155;margin:0 0 8px 2px}
.zd-trend i{width:7px;height:7px;border-radius:50%;background:#22c55e}
/* Advert — mobile-first: fixed 220px card, image band on top, text below */
.zd-ad{
  display:flex;
  flex-direction:column;
  background:#fff;
  border:1px solid var(--ln);
  border-radius:16px;
  overflow:hidden;
  height:220px;
  animation:zf .4s ease;
}
@keyframes zf{from{opacity:0}to{opacity:1}}

.zd-adimg{
  flex:0 0 auto;
  width:100%;
  height:100px;
  background:#0f172a;
  overflow:hidden;
}
.zd-adimg img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.zd-adph{height:100px;display:grid;place-items:center;color:#94a3b8}

.zd-adtx{
  flex:1;
  min-height:0;
  padding:10px 14px 12px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  gap:4px;
  min-width:0;
  overflow:hidden;
}
.zd-adtx small{
  font-size:9px;
  font-weight:800;
  letter-spacing:.06em;
  color:var(--mut);
  text-transform:uppercase;
}
.zd-adtx h2{
  margin:2px 0;
  font-size:14px;
  line-height:1.25;
  font-weight:800;
  color:var(--ink);
  letter-spacing:-.2px;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.zd-adtx p{
  margin:0;
  color:var(--mut);
  font-size:11.5px;
  line-height:1.45;
  max-width:65ch;
  white-space:normal;
  overflow-wrap:anywhere;
  word-break:break-word;
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

.zd-adimg::-webkit-scrollbar,
.zd-adtx::-webkit-scrollbar{width:6px}
.zd-adimg::-webkit-scrollbar-track,
.zd-adtx::-webkit-scrollbar-track{background:transparent}
.zd-adimg::-webkit-scrollbar-thumb{background:#475569;border-radius:6px}
.zd-adtx::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:6px}
.zd-adimg::-webkit-scrollbar-thumb:hover{background:#64748b}
.zd-adtx::-webkit-scrollbar-thumb:hover{background:#94a3b8}
  .zd-btn{display:inline-flex;align-items:center;gap:6px;width:fit-content;margin-top:2px;background:var(--ink);color:#fff;border:0;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700}
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
.zd-ev{position:relative;flex:0 0 86%;height:250px;border-radius:18px;overflow:hidden;scroll-snap-align:start;cursor:pointer;background:var(--ink);box-shadow:0 8px 22px -16px rgba(15,23,42,.5)}
.zd-evbg{position:absolute;inset:0;background:linear-gradient(135deg,#0f172a,#334155) center/cover}
.zd-ev::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(0deg,
    rgba(15,23,42,.45) 0%,
    rgba(15,23,42,0) 40%);
  pointer-events:none;
  z-index:1;
}
.zd-ev .zd-evbg{ z-index:0; }
.zd-ev .zd-tag,
.zd-ev .zd-evbar{ z-index:2; }
.zd-ev .zd-tag{position:absolute;top:96px;right:12px;z-index:3}
.zd-evhead{
  position:absolute;
  left:0;right:0;top:0;
  padding:14px 14px 46px;
  display:flex;
  align-items:flex-start;
  gap:10px;
  color:#fff;
  background:linear-gradient(
    180deg,
    rgba(15,23,42,.88) 0%,
    rgba(15,23,42,.62) 55%,
    rgba(15,23,42,0) 100%
  );
  z-index:2;
}
.zd-evhead-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.zd-evhead b{font-size:14.5px;font-weight:800;line-height:1.25;word-break:break-word;display:block;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.zd-evhead span{font-size:11.5px;opacity:.95;display:flex;align-items:center;gap:5px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.zd-evhead span svg{flex-shrink:0}
.zd-db{background:#fff;color:var(--ink);border-radius:11px;min-width:48px;padding:6px 0;text-align:center;flex-shrink:0}
.zd-db b{display:block;font-size:19px;line-height:1;font-weight:800}
.zd-db i{font-size:10px;font-weight:800;text-transform:uppercase;font-style:normal;color:var(--mut)}

.zd-upload-reading{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:10px 14px;border:1px dashed #161516;border-radius:12px;background:transparent;color:#161516;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .18s ease;font-family:inherit}
.zd-upload-reading:hover{background:#8b5cf6;color:#fff;border-style:solid;transform:translateY(-1px);box-shadow:0 6px 14px -6px rgba(2,2,2,.5)}
.zd-upload-reading svg{flex-shrink:0;width:15px;height:15px}
@media (max-width:520px){.zd-upload-reading{padding:9px 12px;font-size:12px;gap:6px}}

/* action pills */
.zd-actions{display:flex;gap:6px;flex-wrap:wrap;padding:12px 16px 0}
.zd-act{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;border:1px solid var(--ln);background:#fff;color:#475569;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s ease}
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
.zd-greet-next{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:6px 12px;background:rgba(255,255,255,0);border:0px solid rgba(255,255,255,.32);color:#fff;border-radius:0px;font-size:11.5px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px);transition:all .18s ease;pointer-events:auto;max-width:100%;white-space:normal;text-align:center}
.zd-greet-next:hover{background:rgba(255,255,255,.3);transform:translateY(-1px)}
.zd-greet-next svg{flex-shrink:0}
.zd-greet-next span{white-space:normal;word-break:break-word;line-height:1.35}

/* cards */
.zd-card{background:#fff;border:1px solid var(--ln);border-radius:16px;padding:16px;box-shadow:0 4px 14px -10px rgba(15,23,42,.25);min-width:0}
.zd-ch{display:flex;align-items:center;gap:10px;margin-bottom:12px}

.zd-ct{flex:1;min-width:0}
.zd-ct h3{font-size:15px;font-weight:800}
.zd-ct p{font-size:11.5px;color:var(--mut);margin-top:1px}
.zd-ch em{font-style:normal;font-size:11px;font-weight:700;background:#f1f5f9;border:1px solid var(--ln);border-radius:99px;padding:2px 9px;white-space:nowrap}
.zd-ch>button{background:none;border:0;font-size:12.5px;font-weight:700;color:var(--ink);text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.zd-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:10px}
.zd-tabs button{flex:1;border:0;background:none;border-radius:8px;padding:7px;font-size:12px;font-weight:700;color:var(--mut)}
.zd-tabs .on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(15,23,42,.12)}

.zd-mp-item{
  border-bottom:1px solid #f1f5f9;
  padding-bottom:4px;
}
.zd-mp-item:last-child{border-bottom:0}
.zd-mp-item .zd-row{border-bottom:0}

.zd-mp-songs{
  list-style:none;
  margin:0 0 6px 60px;
  padding:0;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.zd-mp-songs li{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:11.5px;
  color:#64748b;
  line-height:1.35;
}
.zd-mp-songs li svg{
  color:#94a3b8;
  flex-shrink:0;
}
.zd-mp-songs li span{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.zd-mp-moment{
  color:#0f172a;
  font-weight:800;
  margin-right:2px;
}
.zd-mp-songs-more{
  font-style:italic;
  color:#94a3b8;
  font-size:11px;
}
.zd-list{display:flex;flex-direction:column}
.zd-row{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid #f1f5f9}
.zd-row:last-child{border-bottom:0}
.zd-row.click{cursor:pointer}.zd-row.click:hover{background:var(--bg)}
.zd-row>svg{color:#94a3b8;flex-shrink:0}
.zd-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.zd-rt b{font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zd-rt span{font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zd-row small{font-size:11px;color:#94a3b8;white-space:nowrap}
.zd-db em{
  display:block;
  font-size:9.5px;
  font-weight:800;
  text-transform:uppercase;
  font-style:normal;
  color:var(--mut);
  letter-spacing:.4px;
  margin-bottom:1px;
}
.zd-row .zd-db{
  background:transparent;
  color:#000;
  border-radius:0;
  min-width:auto;
  padding:0;
  text-align:left;
}
.zd-row .zd-db b{
  display:inline;
  font-size:15px;
  font-weight:800;
}
.zd-row .zd-db i{
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
  font-style:normal;
  color:#000;
  margin-left:4px;
}
.zd-dot{width:9px;height:9px;border-radius:50%;background:#e2e8f0;flex-shrink:0}.zd-dot.on{background:var(--ink)}

.zd-cele{font-size:12px;font-weight:700;background:var(--ink);color:#fff;border-radius:99px;padding:5px 12px;width:fit-content;margin-bottom:6px}
.zd-av{border-radius:50%;overflow:hidden;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:14px}
.zd-av img{width:100%;height:100%;object-fit:cover}
.zd-mini{width:30px;height:30px;border-radius:50%;border:1px solid var(--ln);display:grid;place-items:center;color:#334155;flex-shrink:0}
.zd-empty{display:flex;flex-direction:column;align-items:center;gap:3px;padding:20px 10px;border:1px dashed var(--ln);border-radius:12px;background:var(--bg);text-align:center}
.zd-empty b{font-size:13px}.zd-empty span{font-size:11.5px;color:var(--mut)}
.zd-sk{height:56px;border-radius:12px;margin-bottom:8px;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zk 1.5s infinite}
@keyframes zk{to{background-position:-200% 0}}

/* rail */
.zd-cd{background:var(--ink);color:#fff;border-radius:16px;padding:16px;text-align:center;border-top:4px solid #fff}
.zd-cd small{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;opacity:.85}
.zd-cd>div{display:flex;justify-content:center;gap:8px;margin:12px 0 4px}
.zd-cd span{flex:1;max-width:66px;background:rgba(255,255,255,.1);border-radius:10px;padding:8px 0;display:flex;flex-direction:column}
.zd-cd b{font-size:24px;font-variant-numeric:tabular-nums;line-height:1}
.zd-cd i{font-size:9.5px;font-style:normal;text-transform:uppercase;opacity:.7;margin-top:3px}
.zd-cd p{font-size:12px;opacity:.8;margin-top:8px}
.zd-fin{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.zd-fin>div{border:1px solid var(--ln);border-radius:11px;padding:10px}
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
/* attendance card — inside main column */
.zd-att-full{
  margin:0;
  background:#fff;
  border:1px solid var(--ln);
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 6px 22px -14px rgba(15,23,42,.25);
}
.zd-att-full-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  padding:20px 24px;
  border-bottom:1px solid var(--ln);
  flex-wrap:wrap;
}
.zd-att-full-title{
  display:flex;
  align-items:center;
  gap:14px;
  min-width:0;
}
.zd-att-full-icon{
  width:46px;
  height:46px;
  
  color:black;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  font-size:20px;
}
.zd-att-full-title h3{
  font-size:16px;
  font-weight:800;
  color:var(--ink);
  margin:0 0 2px;
  letter-spacing:-.2px;
}
.zd-att-full-title p{
  font-size:12px;
  color:var(--mut);
  margin:0;
  font-weight:500;
}
.zd-att-full-controls{
  display:flex;
  align-items:center;
  gap:10px;
  flex-shrink:0;
}
.zd-att-select{
  padding:9px 14px;
  border:1px solid var(--ln);
  border-radius:10px;
  background:#fff;
  color:var(--ink);
  font-size:12.5px;
  font-weight:700;
  cursor:pointer;
  font-family:inherit;
  min-width:130px;
  transition:border-color .15s;
}
.zd-att-select:hover{border-color:#94a3b8}
.zd-att-select:focus{outline:none;border-color:var(--ink);box-shadow:0 0 0 3px rgba(15,23,42,.08)}
.zd-att-full-cta{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:9px 16px;
  background:var(--ink);
  color:#fff;
  border:0;
  border-radius:10px;
  font-size:12.5px;
  font-weight:700;
  cursor:pointer;
  font-family:inherit;
  transition:opacity .15s;
}
.zd-att-full-cta:hover{opacity:.9}
.zd-att-full-body{
  display:grid;
  grid-template-columns:1fr;
  gap:0;
}
@media (min-width:900px){
  .zd-att-full-body{
    grid-template-columns: 1fr 260px;
  }
}
.zd-att-full-graph{
  padding:20px 24px 8px;
  min-width:0;
  border-bottom:1px solid var(--ln);
}
@media (min-width:900px){
  .zd-att-full-graph{
    border-bottom:0;
    border-right:1px solid var(--ln);
  }
}
.zd-att-graph-svg{
  width:100%;
  height:auto;
  max-height:280px;
  display:block;
}
.zd-att-full-side{
  padding:20px 24px;
  display:flex;
  flex-direction:column;
  gap:12px;
}
@media (min-width:900px){
  .zd-att-full-side{
    padding:24px;
  }
}
.zd-att-stat{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  padding:10px 14px;
  border:1px solid var(--ln);
  border-radius:12px;
}
.zd-att-stat-num{
  font-size:20px;
  font-weight:500;
  color:var(--ink);
  letter-spacing:-.5px;
  line-height:1;
}
.zd-att-stat-lbl{
  font-size:10.5px;
  font-weight:500;
  color:var(--mut);
  text-transform:uppercase;
  letter-spacing:.5px;
}
.zd-att-full-insight-wrap{
  padding:0 24px 24px;
  border-top:1px solid var(--ln);
  background:#fff;
}
.zd-att-full-insight{
  font-size:13px;
  line-height:1.75;
  color:#334155;
  font-weight:500;
  margin:20px 0 0;
  padding:18px 20px;
  background:#f8fafc;
  border-radius:14px;
  border-left:4px solid #0f172a;
}

.zd-att-full-insight .zd-insight-p{
  display:block;
  margin-bottom:12px;
}
.zd-att-full-insight .zd-insight-p:last-child{
  margin-bottom:0;
}
.zd-att-full-insight strong{
  color:#0f172a;
  font-weight:800;
}
@media (max-width:600px){
  .zd-att-full-head{padding:16px 18px;gap:12px}
  .zd-att-full-title h3{font-size:15px}
  .zd-att-full-title p{font-size:11.5px}
  .zd-att-full-icon{width:40px;height:40px;font-size:18px}
  .zd-att-full-controls{width:100%;justify-content:space-between}
  .zd-att-select{flex:1;min-width:0}
  .zd-att-full-graph{padding:14px 12px 6px}
  .zd-att-full-side{padding:16px 18px}
  .zd-att-stat-num{font-size:18px}
    .zd-att-full-insight-wrap{padding:0 18px 18px}
  .zd-att-full-insight{font-size:12.5px;padding:14px 16px;line-height:1.7}
}

/* footer */
.zd-foot{margin:8px 16px 24px;background:var(--ink);color:#cbd5e1;border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.zd-foot>div{display:flex;align-items:center;gap:10px;text-align:left}
.zd-foot img{width:42px;height:42px;object-fit:contain;background:rgba(255,255,255,.08);border-radius:10px;padding:5px;cursor:pointer}
.zd-foot span{display:flex;flex-direction:column}.zd-foot b{color:#fff}.zd-foot small{font-size:11px;color:#94a3b8}
.zd-foot nav{display:flex;gap:18px}
.zd-foot nav button{background:none;border:0;color:#94a3b8;font-size:13px}.zd-foot nav button:hover{color:#fff}
.zd-foot p{font-size:11px;color:#94a3b8}.zd-foot p b{color:#e2e8f0}

/* mobile nav */
.zd-bnav{position:fixed;left:0;right:0;bottom:0;z-index:50;display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-top:1px solid var(--ln);padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))}
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
.zd-modal h2{font-size:28px;line-height:1.15}
.zd-modal p{
  color:var(--mut);
  line-height:1.7;
  font-size:15px;
  white-space:pre-line;
  overflow-wrap:anywhere;
  word-break:break-word;
  max-width:65ch;
}
.zd-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.95);display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.15);z-index:2}



/* tablet */
@media (min-width:768px){
  .zd-bnav{display:none}
  .zd-hero{height:240px;border-radius:0 0 22px 22px}
  .zd-greet h1{font-size:23px}
  .zd-pmain{flex:1 1 0}
  .zd-stats{flex:0 0 auto;border-top:0;border-left:1px solid var(--ln);align-self:stretch}
    .zd-stats>*{padding:0 20px}
  .zd-arrow{display:grid}
      /* Advert — desktop: image left, text right, fixed 200px card */
  .zd-ad{
    display:flex;
    flex-direction:row;
    align-items:stretch;
    max-height:200px;
    height:200px;
    overflow:hidden;
  }
  .zd-adimg{
    flex:0 0 34%;
    height:100%;
    background:#0f172a;
    overflow:hidden;
  }
  .zd-adimg img{
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
  }
  .zd-adtx{
    flex:1;
    height:100%;
    padding:14px 20px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:6px;
    min-width:0;
    min-height:0;
    overflow:hidden;
  }
  .zd-adtx small{
    font-size:9px;
  }
  .zd-adtx h2{
    font-size:16px;
    line-height:1.25;
    margin:2px 0;
    display:-webkit-box;
    -webkit-line-clamp:1;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  .zd-adtx p{
    font-size:11.5px;
    line-height:1.45;
    white-space:normal;
    margin:0;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  .zd-btn{
    margin-top:6px;
  }
  .zd-ev{flex:0 0 300px;height:250px}
  .zd-two{grid-template-columns:repeat(2,minmax(0,1fr))}
  .zd-foot{flex-direction:row;justify-content:space-between;flex-wrap:wrap;text-align:left}
  .zd-foot p{flex:1 1 100%;text-align:center}
}


/* ============================================================
   DESKTOP ≥900px — auto-fit grid, no gaps
============================================================ */
@media (min-width:900px){
  .zd-wrap{padding:0 24px}

  .zd-toprow{
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));
    gap:16px;
    margin:20px 0 0;
    align-items:stretch;
  }
  .zd-toprow > *{margin:0}

  .zd-today-tile{
    display:flex;
    flex-direction:column;
    gap:12px;
    background:#fff;
    border:1px solid var(--ln);
    border-radius:16px;
    padding:18px;
    box-shadow:0 4px 14px -10px rgba(15,23,42,.25);
  }
  .zd-today-label{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--mut)}
  .zd-today-title{font-size:17px;font-weight:800;letter-spacing:-.3px;margin-bottom:6px}
  .zd-today-list{display:flex;flex-direction:column;gap:10px;padding:12px 0;border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}
  .zd-today-row{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;gap:8px}
  .zd-today-row span{font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--mut)}
  .zd-today-row b{font-weight:800;color:var(--ink);text-align:right}
  .zd-today-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border:0;border-radius:10px;background:var(--ink);color:#fff;font-size:13px;font-weight:700;cursor:pointer;align-self:flex-start}
  .zd-today-btn:hover{opacity:.9}

  .zd-grid{
    grid-template-columns:minmax(0, 1fr) 340px;
    align-items:stretch;
    padding:20px 0;
    gap:20px;
  }
  .zd-main,
  .zd-rail{
    display:flex;
    flex-direction:column;
    gap:16px;
    min-width:0;
    height:100%;
  }
  .zd-rail > *:last-child{
    flex:1;
    min-height:0;
  }
  .zd-two{align-items:start}
  .zd-two > .zd-card{height:auto}

  .zd-hero{margin:0;border-radius:0 0 22px 22px}
  .zd-prof{margin:-46px 0 0}
  .zd-actions{padding:16px 0 0}
  .zd-foot{margin:24px 0}
}



@media (max-width:480px){
  .zd-greet-next{font-size:10.5px;padding:5px 10px;gap:4px;max-width:100%}
}
@media (prefers-reduced-motion:reduce){.zd *{animation:none!important;transition:none!important}}

/* ============================================================
   ADVERT — mobile only: image top, text bottom, title always visible
   (Desktop untouched — desktop rules live in the min-width:768px block)
============================================================ */
@media (max-width: 767px){

  /* Card: vertical stack, auto height, no clipping of text */
  .zd-ad{
    display:flex !important;
    flex-direction:column !important;
    align-items:stretch !important;
    height:auto !important;
    max-height:none !important;
    overflow:visible !important;
  }

  /* Image band on top — fixed height so it never eats the text */
  .zd-adimg{
    flex:0 0 auto !important;
    width:100% !important;
    height:180px !important;
    background:#0f172a !important;
    overflow:hidden !important;
  }
  .zd-adimg img{
    width:100% !important;
    height:100% !important;
    object-fit:cover !important;
    display:block !important;
  }
  .zd-adph{
    height:180px !important;
    display:grid !important;
    place-items:center !important;
    color:#94a3b8 !important;
  }

  /* Text block below — flows naturally, no forced clamps */
  .zd-adtx{
    flex:1 1 auto !important;
    height:auto !important;
    min-height:0 !important;
    padding:12px 14px 14px !important;
    display:flex !important;
    flex-direction:column !important;
    justify-content:flex-start !important;
    gap:6px !important;
    overflow:visible !important;
  }

  .zd-adtx small{
    font-size:9px !important;
    flex:0 0 auto !important;
  }

  /* Title — full, wraps naturally, no truncation */
  .zd-adtx h2{
    flex:0 0 auto !important;
    font-size:15px !important;
    line-height:1.3 !important;
    margin:2px 0 4px !important;
    display:block !important;
    -webkit-line-clamp:unset !important;
    white-space:normal !important;
    overflow:visible !important;
    max-height:none !important;
  }

  /* Description — keep the paragraph formatting from formatAdText() */
  .zd-adtx p{
    flex:1 1 auto !important;
    min-height:0 !important;
    font-size:12px !important;
    line-height:1.5 !important;
    color:var(--mut) !important;
    white-space:pre-line !important;
    overflow-wrap:anywhere !important;
    word-break:break-word !important;
    margin:0 !important;
    display:block !important;
    -webkit-line-clamp:unset !important;
    overflow:visible !important;
    max-height:none !important;
  }

  /* CTA button */
  .zd-btn{
    flex:0 0 auto !important;
    margin-top:8px !important;
  }

  /* Advert controls under the card — stack nicely on phones */
  .zd-adctl{
    gap:8px !important;
  }
  .zd-adctl > div:first-child{
    flex:1 1 auto !important;
    justify-content:center !important;
  }
  .zd-adctl > button{
    flex:1 1 auto !important;
    justify-content:center !important;
  }
  .zd-dots{
    flex:1 1 100% !important;
    justify-content:center !important;
  }
}


/* ============================================================
   ADVERT — slow, smooth slide-in between ads
============================================================ */
@keyframes zdAdSlideIn {
  from {
    opacity: 0;
    transform: translateX(60px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.zd-ad.anim-slide {
  /* 1.1s = noticeably slow; ease-out curve keeps the ending soft */
  animation: zdAdSlideIn 1.1s cubic-bezier(.25,.8,.35,1) both;
}

/* Respect reduced-motion preferences */
@media (prefers-reduced-motion: reduce){
  .zd-ad.anim-slide{
    animation: none !important;
  }
}
      `}</style>
    </div>
  );
}