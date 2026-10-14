// frontend/src/pages/MySemester.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft, FiCheck, FiAlertCircle, FiPrinter, FiCalendar,
} from "react-icons/fi";
import zucaLogo from "../assets/zuca-logo.png";
import BASE_URL from "../api";

/* ================================================================
   Semester Registration — minimal official layout
   ================================================================ */

export default function MySemester() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [semester, setSemester] = useState(null);
  const [membership, setMembership] = useState(null);
  const [profile, setProfile] = useState({ admissionNumber: "", phone: "" });
  const [isAlumni, setIsAlumni] = useState(false);

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [contact, setContact] = useState("");
  const [showForm, setShowForm] = useState(false);

  const token = localStorage.getItem("token");
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  const fetchSemester = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/my-semester`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSemester(res.data.semester);
      setMembership(res.data.membership);
      setProfile(res.data.user || { admissionNumber: "", phone: "" });
      setIsAlumni(!!res.data.isAlumni);

      setAdmissionNumber(
        res.data.membership?.admissionNumber ||
        res.data.user?.admissionNumber ||
        storedUser.admissionNumber ||
        ""
      );
      setContact(
        res.data.membership?.contact ||
        res.data.user?.phone ||
        storedUser.phone ||
        ""
      );
    } catch (err) {
      setError(err.response?.data?.error || "Could not load semester information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSemester(); /* eslint-disable-next-line */ }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!admissionNumber.trim()) {
      setError("Admission number is required. Alumni: type N/A.");
      return;
    }
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/my-semester/register`,
        {
          admissionNumber: admissionNumber.trim(),
          contact: contact.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message || "Registration recorded.");
      setShowForm(false);
      setIsAlumni(!!res.data.isAlumni);
      setTimeout(fetchSemester, 400);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const registrationOpen = !!semester?.registrationOpen;
  const registered = !!membership?.registered;
  const roleLabel = (() => {
    const r = membership?.role || storedUser.specialRole || storedUser.role || "member";
    return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  })();

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="sem-page">
      {/* Topbar */}
      <div className="sem-topbar">
        <button className="sem-topbar-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={14} />
          <span>Back</span>
        </button>
        <button className="sem-topbar-btn" onClick={() => window.print()}>
          <FiPrinter size={14} />
          <span>Print</span>
        </button>
      </div>

      <div className="sem-wrap">
        {loading ? (
          <div className="sem-skel">
            <div className="sem-skel-line title" />
            <div className="sem-skel-line sub" />
            <div className="sem-skel-line row" />
            <div className="sem-skel-line row" />
            <div className="sem-skel-line row" />
          </div>
        ) : !semester ? (
          <div className="sem-empty">
            <FiCalendar size={26} />
            <h2>No Active Semester</h2>
            <p>There is no active semester at the moment. Please check back later.</p>
          </div>
        ) : (
          <article className="sem-card">
            {/* Logo header */}
            <header className="sem-head">
              <div className="sem-head-inner">
                <img src={zucaLogo} alt="ZUCA" className="sem-head-logo" />
                <div className="sem-head-title">
                  ZETECH UNIVERSITY CATHOLIC ACTION
                </div>
              </div>
            </header>

            {/* Semester title */}
            <section className="sem-title-block">
              <div className="sem-eyebrow">Semester Registration</div>
              <h1 className="sem-title">{semester.title}</h1>
              <div className="sem-period">
                {fmtDate(semester.startDate)} — {fmtDate(semester.endDate)}
              </div>
              <div className="sem-status-wrap">
                <span className={`sem-status ${registrationOpen ? "open" : "closed"}`}>
                  <span className="sem-status-dot" />
                  {registrationOpen ? "Registration Open" : "Registration Closed"}
                </span>
              </div>
            </section>

            {/* Alerts */}
            {error && (
              <div className="sem-alert sem-alert-error">
                <FiAlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="sem-alert sem-alert-success">
                <FiCheck size={14} />
                <span>{success}</span>
              </div>
            )}

            {/* User details */}
            <section className="sem-details">
              <Row label="Full Name" value={storedUser.fullName || "—"} />
              <Row label="Membership No." value={storedUser.membership_number || "—"} mono />
              <Row
                label="Admission No."
                value={(() => {
                  const v = (admissionNumber || profile.admissionNumber || "").trim();
                  if (!v) return <span className="sem-missing">Not provided</span>;
                  if (/^n\/?a$/i.test(v) || /^alumni/i.test(v)) {
                    return <span className="sem-alumni-tag">N/A — Alumnus</span>;
                  }
                  return v;
                })()}
                mono
              />
              <Row
                label="Contact"
                value={membership?.contact || profile.phone || storedUser.phone || "—"}
                mono
              />
              <Row label="Role" value={roleLabel} />
              <Row
                label="Status"
                value={
                  <span className={`sem-status ${registered ? "open" : "closed"}`}>
                    <span className="sem-status-dot" />
                    {registered ? "Registered" : "Not Registered"}
                  </span>
                }
              />
            </section>

            {/* Action */}
            {!registered && registrationOpen && !showForm && (
              <div className="sem-action">
                <button
                  type="button"
                  className="sem-btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  <FiCheck size={13} /> Register for This Semester
                </button>
              </div>
            )}

            {!registered && registrationOpen && showForm && (
              <form onSubmit={handleRegister} className="sem-form">
                <div className="sem-field">
                  <label className="sem-label">
                    Admission Number <span className="sem-req">*</span>
                  </label>
                  <input
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g. BAF-05-0029/2024"
                    className="sem-input"
                    autoComplete="off"
                    required
                    autoFocus
                  />
                  <small className="sem-hint">
                    Students: your Zetech admission number. Alumni: type <strong>N/A</strong>.
                  </small>
                </div>

                <div className="sem-field">
                  <label className="sem-label">Contact Telephone</label>
                  <input
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className="sem-input"
                    autoComplete="tel"
                  />
                </div>

                <div className="sem-form-actions">
                  <button
                    type="button"
                    className="sem-btn-ghost"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sem-btn-primary"
                    disabled={submitting || !admissionNumber.trim()}
                  >
                    {submitting ? (
                      <><span className="sem-spinner" /> Submitting…</>
                    ) : (
                      <><FiCheck size={13} /> Submit Registration</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {!registered && !registrationOpen && (
              <div className="sem-closed-note">
                <FiAlertCircle size={14} />
                <span>Registration is not open yet. Please check back later.</span>
              </div>
            )}

            <footer className="sem-footer">ZUCA PORTAL</footer>
          </article>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ================================================================
   Row
   ================================================================ */
function Row({ label, value, mono }) {
  return (
    <div className="sem-row">
      <dt className="sem-row-label">{label}</dt>
      <dd className={`sem-row-value ${mono ? "mono" : ""}`}>{value}</dd>
    </div>
  );
}

/* ================================================================
   CSS
   ================================================================ */
const css = `
  .sem-page{
    min-height:100vh;
    background:#f4f6f9;
    color:#0f172a;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;
    padding:0 0 60px;
    box-sizing:border-box;
  }
  .sem-page *{box-sizing:border-box}
  .sem-page button{font-family:inherit;cursor:pointer}
  .sem-page h1,.sem-page h2,.sem-page p{margin:0}
  .sem-page dl,.sem-page dt,.sem-page dd{margin:0}

  /* ---------- TOPBAR ---------- */
  .sem-topbar{
    max-width:640px;margin:0 auto;
    display:flex;align-items:center;justify-content:space-between;
    padding:14px 20px;gap:8px;
  }
  .sem-topbar-btn{
    display:inline-flex;align-items:center;gap:6px;
    padding:7px 12px;background:transparent;
    border:1px solid transparent;border-radius:6px;
    color:#475569;font-size:12px;font-weight:700;
    letter-spacing:.04em;text-transform:uppercase;
    transition:background .12s ease,border-color .12s ease;
  }
  .sem-topbar-btn:hover{background:#fff;border-color:#d7dce5;color:#0f172a}

  /* ---------- WRAP ---------- */
  .sem-wrap{max-width:640px;margin:0 auto;padding:0 20px}

  /* ---------- CARD ---------- */
  .sem-card{
    background:#fff;
    border:1px solid #d7dce5;
    border-radius:8px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(15,23,42,.05);
  }

  /* ---------- HEAD ---------- */
  .sem-head{
    background:#0b2347;
    padding:14px 20px;
    border-bottom:3px solid #0ea5e9;
  }
  .sem-head-inner{
    display:flex;align-items:center;gap:10px;
  }
  .sem-head-logo{
    width:34px;height:34px;border-radius:6px;
    background:#fff;padding:4px;object-fit:contain;flex-shrink:0;
  }
  .sem-head-title{
    font-size:11.5px;font-weight:800;
    letter-spacing:.14em;text-transform:uppercase;
    color:#fff;line-height:1.4;
  }

  /* ---------- TITLE ---------- */
  .sem-title-block{
    padding:28px 24px 22px;
    text-align:center;
    border-bottom:1px solid #edf0f5;
  }
  .sem-eyebrow{
    display:inline-block;
    font-size:10px;font-weight:800;
    letter-spacing:.2em;text-transform:uppercase;
    color:#0b2347;
    padding:4px 10px;
    border:1px solid #d7dce5;
    border-radius:2px;
    margin-bottom:14px;
    background:#f4f6f9;
  }
  .sem-title{
    font-family:Georgia,'Times New Roman',serif;
    font-size:22px;font-weight:700;
    letter-spacing:-.01em;
    color:#0b2347;
    line-height:1.3;
    margin-bottom:10px;
  }
  .sem-period{
    font-family:'SF Mono',Menlo,Consolas,monospace;
    font-size:12.5px;font-weight:600;
    color:#64748b;
    letter-spacing:.02em;
    margin-bottom:14px;
  }
  .sem-status-wrap{
    display:flex;justify-content:center;
  }
  .sem-status{
    display:inline-flex;align-items:center;gap:7px;
    font-size:11px;font-weight:800;
    letter-spacing:.14em;text-transform:uppercase;
  }
  .sem-status-dot{
    width:7px;height:7px;border-radius:50%;
  }
  .sem-status.open{color:#047857}
  .sem-status.open .sem-status-dot{
    background:#10b981;
    box-shadow:0 0 0 3px rgba(16,185,129,.18);
  }
  .sem-status.closed{color:#9d174d}
  .sem-status.closed .sem-status-dot{
    background:#e11d48;
    box-shadow:0 0 0 3px rgba(225,29,72,.15);
  }

  /* ---------- ALERTS ---------- */
  .sem-alert{
    display:flex;align-items:center;gap:10px;
    margin:16px 24px 0;
    padding:11px 14px;
    border-radius:6px;
    font-size:12.5px;font-weight:600;
  }
  .sem-alert-error{
    background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;
  }
  .sem-alert-success{
    background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;
  }

  /* ---------- DETAILS ---------- */
  .sem-details{
    padding:18px 24px 20px;
    display:flex;flex-direction:column;
    border-bottom:1px solid #edf0f5;
  }
  .sem-row{
    display:grid;
    grid-template-columns:minmax(120px,36%) minmax(0,1fr);
    gap:14px;
    padding:11px 0;
    border-bottom:1px solid #f1f4f9;
    align-items:baseline;
  }
  .sem-row:last-child{border-bottom:0}
  .sem-row-label{
    font-size:10.5px;font-weight:800;
    letter-spacing:.12em;text-transform:uppercase;
    color:#64748b;
  }
  .sem-row-value{
    font-size:14px;font-weight:600;
    color:#0f172a;
    line-height:1.4;
    overflow-wrap:anywhere;
  }
  .sem-row-value.mono{
    font-family:'SF Mono',Menlo,Consolas,monospace;
    font-size:13px;
    letter-spacing:.02em;
  }
  .sem-missing{
    color:#b45309;font-style:italic;font-weight:600;
  }
  .sem-alumni-tag{
    display:inline-block;
    padding:2px 8px;
    background:#f5f3ff;
    color:#6d28d9;
    border:1px solid #ddd6fe;
    border-radius:3px;
    font-size:11.5px;
    font-weight:700;
    letter-spacing:.04em;
    text-transform:uppercase;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  }

  /* ---------- ACTION ---------- */
  .sem-action{
    padding:20px 24px;
    border-bottom:1px solid #edf0f5;
  }
  .sem-closed-note{
    display:flex;align-items:center;gap:10px;
    margin:16px 24px;
    padding:12px 14px;
    background:#fffbeb;
    border:1px solid #fde68a;
    color:#78350f;
    border-radius:6px;
    font-size:12.5px;font-weight:600;
    line-height:1.5;
  }
  .sem-closed-note svg{color:#d97706;flex-shrink:0}

  /* ---------- FORM ---------- */
  .sem-form{
    padding:20px 24px;
    display:flex;flex-direction:column;gap:14px;
    border-bottom:1px solid #edf0f5;
  }
  .sem-field{display:flex;flex-direction:column;gap:6px}
  .sem-label{
    font-size:10.5px;font-weight:800;
    letter-spacing:.12em;text-transform:uppercase;
    color:#475569;
  }
  .sem-req{color:#dc2626;margin-left:2px}
  .sem-input{
    width:100%;padding:11px 12px;
    border:1px solid #d7dce5;border-radius:6px;
    background:#fff;
    font-family:inherit;font-size:14px;
    color:#0f172a;outline:none;
    transition:border-color .15s ease,box-shadow .15s ease;
  }
  .sem-input:focus{
    border-color:#0b2347;
    box-shadow:0 0 0 3px rgba(11,35,71,.08);
  }
  .sem-hint{
    font-size:11px;color:#94a3b8;
    line-height:1.5;margin-top:2px;
  }
  .sem-form-actions{
    display:flex;justify-content:flex-end;gap:10px;
    padding-top:10px;margin-top:4px;
    border-top:1px solid #f1f4f9;
  }

  /* ---------- BUTTONS ---------- */
  .sem-btn-primary{
    display:inline-flex;align-items:center;justify-content:center;
    gap:8px;
    padding:12px 20px;
    border:1px solid #0b2347;
    border-radius:6px;
    background:#0b2347;
    color:#fff;
    font-family:inherit;
    font-size:12px;font-weight:800;
    letter-spacing:.12em;text-transform:uppercase;
    cursor:pointer;
    transition:background .15s ease,border-color .15s ease,opacity .15s ease;
    width:100%;
  }
  .sem-btn-primary:hover:not(:disabled){
    background:#0ea5e9;border-color:#0ea5e9;
  }
  .sem-btn-primary:disabled{
    opacity:.45;cursor:not-allowed;
  }
  .sem-btn-ghost{
    display:inline-flex;align-items:center;justify-content:center;
    gap:8px;
    padding:12px 20px;
    border:1px solid #d7dce5;
    border-radius:6px;
    background:#fff;
    color:#475569;
    font-family:inherit;
    font-size:12px;font-weight:800;
    letter-spacing:.12em;text-transform:uppercase;
    cursor:pointer;
    transition:background .15s ease,border-color .15s ease;
  }
  .sem-btn-ghost:hover:not(:disabled){
    background:#f4f6f9;border-color:#94a3b8;color:#0f172a;
  }
  .sem-spinner{
    width:12px;height:12px;
    border:2px solid rgba(255,255,255,.35);
    border-top-color:#fff;
    border-radius:50%;
    animation:sem-spin .7s linear infinite;
    display:inline-block;
  }
  @keyframes sem-spin{to{transform:rotate(360deg)}}

  /* ---------- FOOTER ---------- */
  .sem-footer{
    padding:14px 24px 16px;
    text-align:center;
    font-size:9.5px;font-weight:800;
    letter-spacing:.24em;text-transform:uppercase;
    color:#94a3b8;
    background:#f8fafc;
  }

  /* ---------- EMPTY ---------- */
  .sem-empty{
    background:#fff;border:1px solid #d7dce5;border-radius:8px;
    padding:56px 32px;text-align:center;
    display:flex;flex-direction:column;align-items:center;gap:10px;
    color:#94a3b8;
  }
  .sem-empty h2{
    font-family:Georgia,'Times New Roman',serif;
    font-size:18px;font-weight:700;color:#0b2347;
  }
  .sem-empty p{
    font-size:13px;color:#64748b;
    line-height:1.55;max-width:340px;
  }

  /* ---------- SKELETON ---------- */
  .sem-skel{
    background:#fff;border:1px solid #d7dce5;border-radius:8px;
    padding:36px 24px;
    display:flex;flex-direction:column;gap:16px;
  }
  .sem-skel-line{
    height:14px;border-radius:6px;
    background:linear-gradient(90deg,#eef2f7 25%,#e2e8f0 50%,#eef2f7 75%);
    background-size:200% 100%;
    animation:sem-sk 1.4s infinite;
  }
  .sem-skel-line.title{
    height:26px;max-width:70%;margin:0 auto;
  }
  .sem-skel-line.sub{
    height:14px;max-width:45%;margin:0 auto 12px;
  }
  .sem-skel-line.row{
    height:12px;margin:0;
  }
  @keyframes sem-sk{to{background-position:-200% 0}}

  /* ---------- RESPONSIVE ---------- */
  @media (max-width:520px){
    .sem-topbar{padding:12px 14px}
    .sem-wrap{padding:0 12px}
    .sem-head{padding:12px 16px}
    .sem-head-logo{width:30px;height:30px}
    .sem-head-title{font-size:10px;letter-spacing:.1em}
    .sem-title-block{padding:24px 18px 20px}
    .sem-title{font-size:19px}
    .sem-period{font-size:11.5px}
    .sem-details{padding:16px 18px}
    .sem-row{grid-template-columns:1fr;gap:3px;padding:10px 0}
    .sem-row-label{font-size:10px}
    .sem-row-value{font-size:13.5px}
    .sem-action{padding:18px}
    .sem-form{padding:18px}
    .sem-form-actions{flex-direction:column-reverse}
    .sem-form-actions .sem-btn-ghost{width:100%}
    .sem-closed-note{margin:16px 18px}
    .sem-alert{margin:16px 18px 0}
  }
`;