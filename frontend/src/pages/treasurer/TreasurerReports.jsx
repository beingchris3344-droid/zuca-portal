import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";
import {
  FiRefreshCw, FiCalendar, FiFileText, FiDownload, FiChevronRight,
  FiTrash2, FiPlus, FiX, FiChevronDown, FiChevronUp, FiSearch,
  FiEdit2, FiLock, FiFolder, FiArrowLeft,
} from "react-icons/fi";
import {
  FaBook, FaRegFilePowerpoint, FaRegFileAlt, FaUser, FaPlus,
  FaWallet, FaArrowDown, FaArrowUp, FaBalanceScale,
} from "react-icons/fa";
import BASE_URL from "../../api";

/* ---------------------------------------------------------------- */
/* Skeleton                                                          */
/* ---------------------------------------------------------------- */
const Skeleton = () => (
  <div className="sk-wrap">
    <div className="sk-bar-row">
      <div className="sk sk-btn" />
      <div className="sk sk-btn" />
    </div>
    <div className="sk-grid">
      {[0, 1, 2, 3].map((i) => <div key={i} className="sk sk-card" />)}
    </div>
    <div className="sk-tabs">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="sk sk-tab" />)}</div>
    <div className="sk-panel">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="sk sk-row" />)}
    </div>
  </div>
);

const Spinner = ({ label }) => (
  <div className="inline-loader">
    <span className="ldr" />
    {label && <span>{label}</span>}
  </div>
);

const emptyRow = (type = "IN") => ({
  key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
  date: new Date().toISOString().slice(0, 10),
  description: "",
  category: type === "IN" ? "Contributions" : "Choir Expenses",
  amount: "",
    reference: "",
  projectId: "",
  notes: "",
});

/* ---------------------------------------------------------------- */
/* Main                                                              */
/* ---------------------------------------------------------------- */
export default function TreasurerReports() {
  const navigate = useNavigate();

  /* ---------- boot / global ---------- */
  const [booting, setBooting] = useState(true);
  const [semesterLoading, setSemesterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  /* ---------- semesters ---------- */
  const [allSemesters, setAllSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [semesterMenuOpen, setSemesterMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  /* ---------- data ---------- */
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [ledgerSummary, setLedgerSummary] = useState({
    totalIn: 0, totalOut: 0, balance: 0, count: 0, openingBalance: 0, closingBalance: 0,
  });

  /* ---------- ui state ---------- */
  const [activeTab, setActiveTab] = useState("ledger");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [memberSearch, setMemberSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  /* ---------- add/edit ---------- */
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [addMode, setAddMode] = useState("single");
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: "Contributions",
    type: "IN",
    amount: "",
    reference: "",
    notes: "",
    projectId: "",
  });
  const [bulkType, setBulkType] = useState("IN");
  const [bulkRows, setBulkRows] = useState([emptyRow("IN")]);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  /* ---------- project create/detail ---------- */
  const [showProjModal, setShowProjModal] = useState(false);
  const [projForm, setProjForm] = useState({ name: "", description: "", targetAmount: "", startDate: "", endDate: "" });
  const [savingProj, setSavingProj] = useState(false);
  const [detailProject, setDetailProject] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ---------- reopen ---------- */
  const [showReopen, setShowReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  /* ---------- report ---------- */
  const [reportScope, setReportScope] = useState("semester");
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportProjectId, setReportProjectId] = useState(null);
  const [reportStart, setReportStart] = useState(new Date().toISOString().slice(0, 10));
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }), []);
  const abortRef = useRef(null);

  const IN_CATS = ["Contributions", "Registration", "Sponsors", "Events", "Other Income"];
  const OUT_CATS = ["Choir Expenses", "Events", "Maintenance", "Supplies", "Other Expense"];

  const selectedSemester = allSemesters.find((s) => s.id === selectedSemesterId);
  const readOnly = selectedSemester ? !selectedSemester.isActive && selectedSemester.isClosed : false;

  /* ---------------------------------------------------------------- */
  /* helpers                                                           */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const flash = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---------------------------------------------------------------- */
  /* fetch                                                             */
  /* ---------------------------------------------------------------- */
  const loadSemesters = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/treasurer/semester/list`, { headers });
      if (data.success && data.semesters?.length) {
        setAllSemesters(data.semesters);
        const active = data.semesters.find((s) => s.isActive) || data.semesters[0];
        setSelectedSemesterId(active.id);
      }
    } catch {
      flash("Failed to load semesters", "error");
    } finally {
      setBooting(false);
    }
  }, [headers]);

  const loadAll = useCallback(async (semId, signal) => {
    if (!semId) return;
    const p = `?semesterId=${semId}`;
    const [camp, mem, led, proj] = await Promise.all([
      axios.get(`${BASE_URL}/api/treasurer/campaign-summary${p}`, { headers, signal }),
      axios.get(`${BASE_URL}/api/treasurer/member-summary${p}`, { headers, signal }),
      axios.get(`${BASE_URL}/api/treasurer/ledger${p}`, { headers, signal }),
      axios.get(`${BASE_URL}/api/treasurer/projects${p}`, { headers, signal }),
    ]);
    if (mem.data.success) setMembers(mem.data.members || []);
    if (led.data.success) {
      setTransactions(led.data.transactions || []);
      setLedgerSummary(led.data.summary || { totalIn: 0, totalOut: 0, balance: 0, count: 0, openingBalance: 0, closingBalance: 0 });
    }
    if (proj.data.success) setProjects(proj.data.projects || []);
    void camp;
  }, [headers]);

  const refreshLedger = useCallback(async () => {
    if (!selectedSemesterId) return;
    const p = `?semesterId=${selectedSemesterId}`;
    const [led, proj] = await Promise.all([
      axios.get(`${BASE_URL}/api/treasurer/ledger${p}`, { headers }),
      axios.get(`${BASE_URL}/api/treasurer/projects${p}`, { headers }),
    ]);
    if (led.data.success) {
      setTransactions(led.data.transactions || []);
      setLedgerSummary(led.data.summary || { totalIn: 0, totalOut: 0, balance: 0, count: 0, openingBalance: 0, closingBalance: 0 });
    }
    if (proj.data.success) setProjects(proj.data.projects || []);
  }, [selectedSemesterId, headers]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      if (selectedSemesterId) await loadAll(selectedSemesterId);
    } catch { /* noop */ }
    setRefreshing(false);
  }, [loadAll, selectedSemesterId]);

  /* ---------------------------------------------------------------- */
  /* boot + semester switch                                            */
  /* ---------------------------------------------------------------- */
  useEffect(() => { loadSemesters(); }, [loadSemesters]);

  useEffect(() => {
    if (!selectedSemesterId) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setSemesterLoading(true);
    (async () => {
      try {
        await loadAll(selectedSemesterId, abortRef.current.signal);
      } catch (e) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") flash("Failed to load data", "error");
      } finally {
        setSemesterLoading(false);
      }
    })();
  }, [selectedSemesterId, loadAll]);

  /* ---------------------------------------------------------------- */
  /* lazy audit                                                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (activeTab !== "campaigns" || auditLoaded) return;
    (async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/treasurer/audit-trail`, { headers });
        if (data.success) setAuditLogs(data.auditLogs || []);
        setAuditLoaded(true);
      } catch { /* noop */ }
    })();
  }, [activeTab, auditLoaded, headers]);

  /* ---------------------------------------------------------------- */
  /* report defaults                                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (reportScope === "semester" && selectedSemester) {
      setReportStart(selectedSemester.startDate.slice(0, 10));
      setReportEnd(selectedSemester.endDate.slice(0, 10));
    } else if (reportScope === "year") {
      setReportStart(`${reportYear}-01-01`);
      setReportEnd(`${reportYear}-12-31`);
    }
  }, [reportScope, selectedSemesterId, reportYear, selectedSemester]);

  /* ---------------------------------------------------------------- */
  /* derived (memoized)                                                */
  /* ---------------------------------------------------------------- */
  const availableYears = useMemo(() => {
    const s = new Set();
    allSemesters.forEach((x) => { s.add(new Date(x.startDate).getFullYear()); s.add(new Date(x.endDate).getFullYear()); });
    s.add(new Date().getFullYear());
    return Array.from(s).sort((a, b) => b - a);
  }, [allSemesters]);

  const withBalances = useMemo(() => {
    let b = ledgerSummary.openingBalance || 0;
    return [...transactions]
      .sort((x, y) => new Date(x.date) - new Date(y.date))
      .map((t) => {
        b += t.type === "IN" ? Number(t.amount) : -Number(t.amount);
        return { ...t, runningBalance: b };
      });
  }, [transactions, ledgerSummary.openingBalance]);

  const visibleTx = useMemo(() => {
    const term = deferredSearch.toLowerCase();
    return withBalances.filter((t) => {
      if (dateRange.start && new Date(t.date) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(t.date) > new Date(dateRange.end)) return false;
      if (term && !t.description?.toLowerCase().includes(term)) return false;
      if (projectFilter === "none" && t.projectId) return false;
      if (projectFilter !== "all" && projectFilter !== "none" && t.projectId !== projectFilter) return false;
      return true;
    });
  }, [withBalances, dateRange, deferredSearch, projectFilter]);

  const totals = useMemo(() => {
    let inSum = 0, outSum = 0;
    for (const t of visibleTx) {
      if (t.type === "IN") inSum += Number(t.amount);
      else outSum += Number(t.amount);
    }
    const lastBal = visibleTx.length ? visibleTx[visibleTx.length - 1].runningBalance : ledgerSummary.balance;
    return { totalIn: inSum, totalOut: outSum, balance: lastBal };
  }, [visibleTx, ledgerSummary.balance]);

  const visibleMembers = useMemo(
    () => members.filter((m) => m.name?.toLowerCase().includes(memberSearch.toLowerCase())),
    [members, memberSearch]
  );

  /* ---------------------------------------------------------------- */
  /* single add/edit (optimistic)                                      */
  /* ---------------------------------------------------------------- */
  const saveTx = async () => {
    if (!txForm.description || !txForm.amount || !txForm.category) {
      flash("Fill description, category, amount", "error"); return;
    }
    const amt = parseFloat(txForm.amount);
    if (!amt || amt <= 0) { flash("Amount must be positive", "error"); return; }

    const isEdit = !!editingTx;
    const snapshot = transactions;
    const optimistic = {
      id: isEdit ? editingTx.id : `tmp-${Date.now()}`,
      date: txForm.date, description: txForm.description, category: txForm.category,
      type: txForm.type, amount: amt,
      reference: txForm.reference || null, notes: txForm.notes || null,
      projectId: txForm.projectId || null,
      project: txForm.projectId ? projects.find((p) => p.id === txForm.projectId) : null,
      attachments: isEdit ? editingTx.attachments : [],
    };
    setTransactions((prev) => isEdit
      ? prev.map((t) => t.id === editingTx.id ? optimistic : t)
      : [...prev, optimistic]);
    setShowTxModal(false);

    setSaving(true);
    try {
      const payload = {
        date: txForm.date, description: txForm.description, category: txForm.category,
        type: txForm.type, amount: amt, reference: txForm.reference || null,
        notes: txForm.notes || null, projectId: txForm.projectId || null,
      };
      const res = isEdit
        ? await axios.put(`${BASE_URL}/api/treasurer/ledger/${editingTx.id}`, payload, { headers })
        : await axios.post(`${BASE_URL}/api/treasurer/ledger`, payload, { headers });
      if (!res.data.success) throw new Error("Save failed");
      flash(isEdit ? "Updated" : "Added");
      refreshLedger().catch(() => {});
    } catch (e) {
      setTransactions(snapshot);
      flash(e.response?.data?.error || "Save failed", "error");
    } finally {
      setSaving(false);
      setEditingTx(null);
      resetTx();
    }
  };

  const deleteTx = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await axios.delete(`${BASE_URL}/api/treasurer/ledger/${id}`, { headers });
      if (!res.data.success) throw new Error();
      flash("Deleted");
      refreshLedger().catch(() => {});
    } catch (e) {
      setTransactions(snapshot);
      flash(e.response?.data?.error || "Delete failed", "error");
    }
  };

  const resetTx = () => setTxForm({
    date: new Date().toISOString().slice(0, 10), description: "", category: "Contributions",
    type: "IN", amount: "", reference: "", notes: "", projectId: "",
  });

  const startEdit = (tx) => {
    setEditingTx(tx);
    setAddMode("single");
    setTxForm({
      date: (tx.date || "").slice(0, 10), description: tx.description, category: tx.category,
      type: tx.type, amount: String(tx.amount), reference: tx.reference || "",
      notes: tx.notes || "", projectId: tx.projectId || "",
    });
    setShowTxModal(true);
  };

  const setFormType = (type) => setTxForm((f) => ({
    ...f, type, category: type === "IN" ? IN_CATS[0] : OUT_CATS[0],
  }));

  /* ---------------------------------------------------------------- */
  /* bulk add                                                          */
  /* ---------------------------------------------------------------- */
  const switchBulkType = (type) => {
    setBulkType(type);
    setBulkRows((rows) => rows.map((r) => ({ ...r, category: type === "IN" ? IN_CATS[0] : OUT_CATS[0] })));
  };

  const saveBulk = async () => {
    const valid = bulkRows.filter((r) => r.description.trim() && parseFloat(r.amount) > 0 && r.category);
    if (!valid.length) { flash("Add at least one complete row", "error"); return; }
    setBulkSaving(true);
    setBulkProgress({ done: 0, total: valid.length });

    const snapshot = transactions;
    const placeholders = valid.map((r, i) => ({
      id: `tmp-${Date.now()}-${i}`,
      date: r.date, description: r.description.trim(), category: r.category,
           type: bulkType, amount: parseFloat(r.amount), reference: r.reference || null,
      notes: r.notes || null,
      projectId: r.projectId || null, attachments: [],
    }));
    setTransactions((prev) => [...prev, ...placeholders]);

    let ok = 0, fail = 0, done = 0;
    await Promise.allSettled(
      valid.map(async (r) => {
        try {
          const res = await axios.post(`${BASE_URL}/api/treasurer/ledger`, {
            date: r.date, description: r.description.trim(), category: r.category,
            type: bulkType, amount: parseFloat(r.amount), reference: r.reference || null,
            notes: r.notes || null, projectId: r.projectId || null,
          }, { headers });
          if (res.data.success) ok++; else fail++;
        } catch { fail++; }
        done += 1;
        setBulkProgress({ done, total: valid.length });
      })
    );
    setBulkSaving(false);
    if (fail === 0) flash(`${ok} added`);
    else {
      setTransactions(snapshot);
      flash(`${ok} added, ${fail} failed`, "error");
    }
    setBulkRows([emptyRow(bulkType)]);
    setShowTxModal(false);
    refreshLedger().catch(() => {});
  };

  /* ---------------------------------------------------------------- */
  /* projects                                                          */
  /* ---------------------------------------------------------------- */
  const saveProject = async () => {
    if (!projForm.name.trim()) { flash("Project name required", "error"); return; }
    setSavingProj(true);
    const snapshot = projects;
    const temp = {
      id: `tmp-${Date.now()}`, name: projForm.name.trim(), description: projForm.description || null,
      targetAmount: projForm.targetAmount ? parseFloat(projForm.targetAmount) : null,
      status: "OPEN", contributionsIn: 0, expensesOut: 0, net: 0, transactionCount: 0,
    };
    setProjects((prev) => [temp, ...prev]);
    setShowProjModal(false);
    try {
      const res = await axios.post(`${BASE_URL}/api/treasurer/projects`, {
        name: projForm.name.trim(), description: projForm.description || null,
        targetAmount: projForm.targetAmount ? parseFloat(projForm.targetAmount) : null,
        startDate: projForm.startDate || null, endDate: projForm.endDate || null,
      }, { headers });
      if (!res.data.success) throw new Error();
      flash("Project created");
      refreshLedger().catch(() => {});
    } catch (e) {
      setProjects(snapshot);
      flash(e.response?.data?.error || "Create failed", "error");
    } finally {
      setSavingProj(false);
      setProjForm({ name: "", description: "", targetAmount: "", startDate: "", endDate: "" });
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete project? Linked transactions must be removed first.")) return;
    const snapshot = projects;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (detailProject?.id === id) { setDetailProject(null); setDetailData(null); }
    try {
      const res = await axios.delete(`${BASE_URL}/api/treasurer/projects/${id}`, { headers });
      if (!res.data.success) throw new Error();
      flash("Project deleted");
    } catch (e) {
      setProjects(snapshot);
      flash(e.response?.data?.error || "Delete failed", "error");
    }
  };

  const openProject = async (p) => {
    setDetailProject(p);
    setDetailLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/treasurer/projects/${p.id}`, { headers });
      if (data.success) setDetailData(data.project);
    } catch {
      flash("Could not load project", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* reopen                                                            */
  /* ---------------------------------------------------------------- */
  const reopenSemester = async () => {
    if (reopenReason.trim().length < 5) { flash("Reason must be at least 5 characters", "error"); return; }
    setReopening(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/treasurer/semester/${selectedSemesterId}/reopen`,
        { reason: reopenReason.trim() }, { headers }
      );
      if (!res.data.success) throw new Error();
      flash("Semester reopened");
      setShowReopen(false);
      setReopenReason("");
      setBannerDismissed(true);
      const { data } = await axios.get(`${BASE_URL}/api/treasurer/semester/list`, { headers });
      if (data.success) setAllSemesters(data.semesters);
      refreshAll();
    } catch (e) {
      flash(e.response?.data?.error || "Reopen failed", "error");
    } finally {
      setReopening(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* report                                                            */
  /* ---------------------------------------------------------------- */
  const buildReport = (txList, start, end, label) => {
    const filtered = txList.filter((t) => {
      const d = t.date.slice(0, 10);
      return d >= start && d <= end;
    });
    const totalIn = filtered.filter((t) => t.type === "IN").reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = filtered.filter((t) => t.type === "OUT").reduce((s, t) => s + Number(t.amount), 0);
    const inc = {}, exp = {};
    filtered.forEach((t) => {
      if (t.type === "IN") inc[t.category] = (inc[t.category] || 0) + Number(t.amount);
      else exp[t.category] = (exp[t.category] || 0) + Number(t.amount);
    });
    return {
      startDate: start, endDate: end, transactions: filtered,
      totalIn, totalOut, balance: totalIn - totalOut,
      incomeByCategory: inc, expenseByCategory: exp,
      transactionCount: filtered.length,
      generatedOn: new Date().toLocaleString(),
      scopeLabel: label,
    };
  };

  /* ---- narrative builder: names every transaction ---- */
  const buildNarrative = (report) => {
    if (!report) return null;
    const { transactions, totalIn, totalOut, balance, startDate, endDate, scopeLabel } = report;
    const fmt = (n) => `KES ${Number(n).toLocaleString()}`;
    const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const group = (type) => {
      const map = {};
      for (const t of transactions) {
        if (t.type !== type) continue;
        if (!map[t.category]) map[t.category] = { total: 0, entries: [] };
        map[t.category].total += Number(t.amount);
        map[t.category].entries.push(t);
      }
      return Object.entries(map)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([cat, g]) => ({
          category: cat,
          total: g.total,
          entries: [...g.entries].sort((x, y) => Number(y.amount) - Number(x.amount)),
        }));
    };
    const incomes = group("IN");
    const expenses = group("OUT");

    const byMonth = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { in: 0, out: 0, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
      if (t.type === "IN") byMonth[key].in += Number(t.amount);
      else byMonth[key].out += Number(t.amount);
    }
    const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));

    const entryLine = (e) => {
  const ref = e.reference ? ` (ref ${e.reference})` : "";
  const proj = e.project?.name ? ` [${e.project.name}]` : "";
  return `${e.description || "untitled"} - ${fmt(e.amount)}${ref}${proj}`;
};

 const incomeSentences = incomes.map(({ category, total, entries }) => {
  const pct = totalIn > 0 ? ((total / totalIn) * 100).toFixed(1) : "0.0";
  const summary = entries.length === 1
    ? `${category}: ${fmt(total)} (${pct}% of total income) from 1 entry.`
    : `${category}: ${fmt(total)} (${pct}% of total income) across ${entries.length} entries.`;
  const itemLines = entries.map((e) => entryLine(e));
  return { category, summary, itemLines };
});

const expenseSentences = expenses.map(({ category, total, entries }) => {
  const pct = totalOut > 0 ? ((total / totalOut) * 100).toFixed(1) : "0.0";
  const summary = entries.length === 1
    ? `${category}: ${fmt(total)} (${pct}% of total expenses) on 1 item.`
    : `${category}: ${fmt(total)} (${pct}% of total expenses) across ${entries.length} items.`;
  const itemLines = entries.map((e) => entryLine(e));
  return { category, summary, itemLines };
});
    const monthLines = months.map(([, m]) => {
  const net = m.in - m.out;
  return `${m.label}: received ${fmt(m.in)}, spent ${fmt(m.out)}, net ${net >= 0 ? "+" : "-"}${fmt(Math.abs(net))}`;
});

   const verdict = balance > 0
  ? `The treasury closed the period with a surplus of ${fmt(balance)}. Income exceeded expenses and reserves grew.`
  : balance < 0
    ? `The treasury closed the period with a deficit of ${fmt(Math.abs(balance))}. Expenses exceeded income and reserves were drawn down to cover the gap.`
    : `The treasury closed the period exactly break-even at ${fmt(0)}. Income and expenses were equal.`;

    return {
      period: `${fmtDate(startDate)} to ${fmtDate(endDate)}`,
      scopeLabel,
      totalIn,
      totalOut,
      balance,
      transactionCount: transactions.length,
      incomeSentences,
      expenseSentences,
      monthLines,
      topIncome: incomes[0] || null,
      topExpense: expenses[0] || null,
      verdict,
      hasIncomes: incomes.length > 0,
      hasExpenses: expenses.length > 0,
      hasMonths: months.length > 0,
    };
  };

  const runReport = useCallback(async () => {
    setGenerating(true);
    try {
      if (reportScope === "semester") {
        const sem = selectedSemester;
        if (!sem) { flash("Select a semester", "error"); return; }
        setReportData(buildReport(transactions, sem.startDate.slice(0, 10), sem.endDate.slice(0, 10), sem.title));
      } else if (reportScope === "custom") {
        if (!reportStart || !reportEnd) { flash("Pick both dates", "error"); return; }
        setReportData(buildReport(transactions, reportStart, reportEnd, "Custom range"));
      } else if (reportScope === "year") {
        const sems = allSemesters.filter((s) =>
          new Date(s.startDate).getFullYear() === reportYear ||
          new Date(s.endDate).getFullYear() === reportYear
        );
        let all = [];
        for (const s of sems) {
          const { data } = await axios.get(`${BASE_URL}/api/treasurer/ledger?semesterId=${s.id}`, { headers });
          if (data.success && Array.isArray(data.transactions)) all = all.concat(data.transactions);
        }
        setReportData(buildReport(all, `${reportYear}-01-01`, `${reportYear}-12-31`, `Year ${reportYear}`));
      } else if (reportScope === "project") {
        if (!reportProjectId) { flash("Select a project", "error"); return; }
        const { data } = await axios.get(`${BASE_URL}/api/treasurer/projects/${reportProjectId}`, { headers });
        if (data.success && data.project) {
          const p = data.project;
          const tx = (p.transactions || []).map((t) => ({ ...t, project: { id: p.id, name: p.name } }));
          const start = p.startDate ? p.startDate.slice(0, 10) : "2000-01-01";
          const end = p.endDate ? p.endDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
          setReportData(buildReport(tx, start, end, `Project · ${p.name}`));
        }
      }
      flash("Report generated");
    } catch {
      flash("Report generation failed", "error");
    } finally {
      setGenerating(false);
    }
  }, [reportScope, reportYear, reportProjectId, reportStart, reportEnd, selectedSemester, transactions, allSemesters, headers]);

  const exportPDF = () => {
    if (!reportData) return;
    const el = document.getElementById("report-export");
    if (!el) return;
    html2pdf().set({
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `ZUCA-report-${(reportData.scopeLabel || reportData.startDate).replace(/\W+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    }).from(el).save();
    flash("PDF downloaded");
  };

  const exportWord = () => {
    if (!reportData) return;
    const el = document.getElementById("report-export");
    if (!el) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:'Times New Roman',serif;margin:40px;line-height:1.6;color:#000}
      .rpt-head{text-align:center;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:24px}
      .rpt-sum{display:flex;gap:12px;margin-bottom:20px}
      .rpt-sum>div{flex:1;background:#f5f5f5;padding:14px;text-align:center;border-radius:6px}
      .rpt-sum strong{font-size:20px;display:block;margin-top:4px}
      .rpt-section{border:1px solid #ddd;border-radius:6px;padding:14px;margin-bottom:16px}
      .rpt-section h4{margin:0 0 10px;text-transform:uppercase;font-size:11px;letter-spacing:.5px;color:#555}
      .rpt-list{list-style:none;padding:0;margin:0}
      .rpt-list li{font-size:12px;line-height:1.6;margin-bottom:6px;padding-left:14px;position:relative}
      .rpt-list li::before{content:'●';position:absolute;left:0;color:#888;font-size:8px;top:5px}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
      th{background:#f2f2f2}
      .rpt-tx-row.in{background:#d4edda}
      .rpt-tx-row.out{background:#f8d7da}
      .rpt-tx-row{display:grid;grid-template-columns:80px 1fr 100px 80px;gap:8px;padding:6px 8px;font-size:11px;border-bottom:1px solid #eee}
      .rpt-tx-amt{text-align:right;font-weight:600}
      .rpt-foot{margin-top:30px;text-align:center;font-size:11px;border-top:1px solid #ddd;padding-top:14px;color:#666}
    </style></head><body>${el.innerHTML}</body></html>`;
    saveAs(new Blob([html], { type: "application/msword" }),
      `ZUCA-report-${(reportData.scopeLabel || reportData.startDate).replace(/\W+/g, "_")}.doc`);
    flash("Word downloaded");
  };

  /* ---------------------------------------------------------------- */
  /* export excel                                                      */
  /* ---------------------------------------------------------------- */
  const exportLedgerXLSX = () => {
    const rows = visibleTx.map((t) => ({
      Date: new Date(t.date).toLocaleDateString(),
      Description: t.description, Category: t.category,
      Project: t.project?.name || "",
      "IN (KES)": t.type === "IN" ? t.amount : "",
      "OUT (KES)": t.type === "OUT" ? t.amount : "",
      "Balance (KES)": t.runningBalance,
      Reference: t.reference || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `ZUCA-ledger-${new Date().toISOString().slice(0, 10)}.xlsx`);
    flash("Ledger exported");
  };

  const exportMembersXLSX = () => {
    const rows = members.map((m) => ({
      Name: m.name, "Membership #": m.membershipNumber || "—", Jumuia: m.jumuia,
      "Paid (KES)": m.total_paid || 0, "Pending (KES)": m.total_pending || 0, Status: m.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, `ZUCA-members-${new Date().toISOString().slice(0, 10)}.xlsx`);
    flash("Members exported");
  };

  /* ---------------------------------------------------------------- */
  /* narrative (derived)                                               */
  /* ---------------------------------------------------------------- */
  const narrative = useMemo(() => (reportData ? buildNarrative(reportData) : null), [reportData]);

  /* ---------------------------------------------------------------- */
  /* render                                                            */
  /* ---------------------------------------------------------------- */
  if (booting) {
    return (
      <div className="app"><Skeleton />
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  return (
    <div className="app">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Top bar */}
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <FiArrowLeft size={14} /> Back
        </button>
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={refreshAll} disabled={refreshing || semesterLoading}>
            <FiRefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <h1>Treasury</h1>
        <div className="semester-row">
          <div className="semester-picker" onClick={() => !semesterLoading && setSemesterMenuOpen((v) => !v)}>
            <FiCalendar size={13} />
            <span>{selectedSemester?.title || "Select semester"}</span>
            {semesterLoading
              ? <span className="pill-dot" />
              : semesterMenuOpen ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          </div>
          {readOnly && !bannerDismissed && (
            <button className="banner-link" onClick={() => setShowReopen(true)}>
              <FiLock size={12} /> Closed · reopen
            </button>
          )}
        </div>
        {semesterMenuOpen && !semesterLoading && (
          <div className="semester-menu">
            {allSemesters.map((s) => (
              <button
                key={s.id}
                className={`semester-item ${s.id === selectedSemesterId ? "active" : ""}`}
                onClick={() => { setSelectedSemesterId(s.id); setSemesterMenuOpen(false); setBannerDismissed(false); }}
              >
                <span className="semester-item-title">{s.title}</span>
                <span className={`tag tag-${s.status.toLowerCase()}`}>{s.status}</span>
                <span className="semester-item-dates">
                  {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI row — no background on icons */}
      <div className="kpis">
        <Kpi icon={<FaWallet />} label="Opening" value={ledgerSummary.openingBalance} loading={semesterLoading} />
        <Kpi icon={<FaArrowDown />} label="IN" value={totals.totalIn} loading={semesterLoading} tone="in" />
        <Kpi icon={<FaArrowUp />} label="OUT" value={totals.totalOut} loading={semesterLoading} tone="out" />
        <Kpi icon={<FaBalanceScale />} label="Balance" value={totals.balance} loading={semesterLoading} tone="balance" />
      </div>

      {/* Banner */}
      {readOnly && !bannerDismissed && (
        <div className="banner">
          <FiLock size={16} />
          <div className="banner-body">
            <strong>Semester closed — view only</strong>
            <span>Reopen to make changes. All actions are audited.</span>
          </div>
          <div className="banner-actions">
            <button className="btn btn-outline" onClick={() => setShowReopen(true)}>Reopen</button>
            <button className="btn btn-ghost" onClick={() => setBannerDismissed(true)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            <span className="tab-ico">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      {/* LEDGER */}
      {activeTab === "ledger" && (
        <section className="panel">
          <div className="toolbar">
            <div className="filters">
              <div className="input-group">
                <FiSearch size={13} className="input-ico" />
                <input
                  className="input"
                  placeholder="Search…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <input type="date" className="input" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
              <span className="dim">–</span>
              <input type="date" className="input" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
              <select className="input select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="all">All projects</option>
                <option value="none">General only</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="actions">
              <button className="btn btn-ghost" onClick={exportLedgerXLSX}>
                <FiDownload size={13} /> Export
              </button>
              <button className="btn btn-outline" disabled={readOnly} onClick={() => openBulk()}>
                <FaPlus size={11} /> Bulk
              </button>
              <button className="btn btn-primary" disabled={readOnly} onClick={openSingle}>
                <FiPlus size={13} /> Add
              </button>
            </div>
          </div>

          {semesterLoading ? (
            <div className="panel-state"><Spinner label="Loading ledger" /></div>
          ) : visibleTx.length === 0 ? (
            <div className="panel-state"><FaBook size={32} /><p>No transactions</p><span>Add one or bulk-import to begin.</span></div>
          ) : isMobile ? (
            <MobileCards list={visibleTx} onEdit={startEdit} onDelete={deleteTx} readOnly={readOnly} />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Description</th><th>Category</th><th>Project</th>
                    <th className="num">IN</th><th className="num">OUT</th><th className="num">Balance</th>
                    <th>Ref</th><th className="right"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTx.map((t) => (
                    <tr key={t.id} className={t.type === "IN" ? "row-in" : "row-out"}>
                      <td className="nowrap dim">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="cell-strong">{t.description}</td>
                      <td className="dim">{t.category}</td>
                      <td>{t.project ? <span className="tag tag-project">{t.project.name}</span> : <span className="dim">—</span>}</td>
                      <td className="num cell-in">{t.type === "IN" ? Number(t.amount).toLocaleString() : "—"}</td>
                      <td className="num cell-out">{t.type === "OUT" ? Number(t.amount).toLocaleString() : "—"}</td>
                      <td className="num cell-balance">{t.runningBalance.toLocaleString()}</td>
                      <td className="dim nowrap">{t.reference || "—"}</td>
                      <td className="right">
                        <button className="icon-btn" disabled={readOnly} onClick={() => startEdit(t)} title="Edit"><FiEdit2 size={12} /></button>
                        <button className="icon-btn icon-danger" disabled={readOnly} onClick={() => deleteTx(t.id)} title="Delete"><FiTrash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="cell-total">Totals</td>
                    <td className="num cell-in">{totals.totalIn.toLocaleString()}</td>
                    <td className="num cell-out">{totals.totalOut.toLocaleString()}</td>
                    <td className="num cell-balance">{totals.balance.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}

      {/* PROJECTS */}
      {activeTab === "projects" && (
        <section className="panel">
          <div className="toolbar">
            <div className="toolbar-title">
              <h3>Projects</h3>
              <span>Per-project contributions and spend</span>
            </div>
            <button className="btn btn-primary" disabled={readOnly} onClick={() => setShowProjModal(true)}>
              <FiPlus size={13} /> New
            </button>
          </div>

          {semesterLoading ? (
            <div className="panel-state"><Spinner label="Loading projects" /></div>
          ) : projects.length === 0 ? (
            <div className="panel-state"><FiFolder size={32} /><p>No projects yet</p><span>Create one to begin.</span></div>
          ) : (
            <div className="cards">
              {projects.map((p) => (
                <button key={p.id} className="proj-card" onClick={() => openProject(p)}>
                  <header>
                    <h4>{p.name}</h4>
                    <span className={`tag tag-${p.status?.toLowerCase()}`}>{p.status}</span>
                  </header>
                  {p.description && <p className="proj-desc">{p.description}</p>}
                  <div className="proj-stats">
                    <div><span>IN</span><strong className="cell-in">{(p.contributionsIn || 0).toLocaleString()}</strong></div>
                    <div><span>OUT</span><strong className="cell-out">{(p.expensesOut || 0).toLocaleString()}</strong></div>
                    <div><span>NET</span><strong className={p.net >= 0 ? "cell-in" : "cell-out"}>{(p.net || 0).toLocaleString()}</strong></div>
                  </div>
                  {p.targetAmount && (
                    <div className="proj-progress">
                      <div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.min(p.completion || 0, 100)}%` }} /></div>
                      <span>{(p.completion || 0).toFixed(0)}% of {p.targetAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <footer>
                    <span>{p.transactionCount} tx</span>
                    <FiChevronRight size={14} />
                  </footer>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* REPORT */}
      {activeTab === "report" && (
        <section className="panel">
          <div className="report-toolbar">
            <div className="segmented">
              {["semester", "year", "custom", "project"].map((s) => (
                <button key={s} className={`seg ${reportScope === s ? "active" : ""}`} onClick={() => setReportScope(s)}>
                  {s === "semester" ? "Semester" : s === "year" ? "Year" : s === "custom" ? "Range" : "Project"}
                </button>
              ))}
            </div>
            <div className="report-inputs">
              {reportScope === "semester" && (
                <select className="input" value={selectedSemesterId || ""} onChange={(e) => setSelectedSemesterId(e.target.value)}>
                  {allSemesters.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              )}
              {reportScope === "year" && (
                <select className="input" value={reportYear} onChange={(e) => setReportYear(+e.target.value)}>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {reportScope === "custom" && (
                <>
                  <input type="date" className="input" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
                  <span className="dim">–</span>
                  <input type="date" className="input" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
                </>
              )}
              {reportScope === "project" && (
                <select className="input" value={reportProjectId || ""} onChange={(e) => setReportProjectId(e.target.value || null)}>
                  <option value="">Pick project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <button className="btn btn-primary" onClick={runReport} disabled={generating}>
                {generating ? <><span className="ldr-sm" /> Generating</> : <><FiCalendar size={13} /> Generate</>}
              </button>
            </div>
          </div>

          {generating && <div className="panel-state"><Spinner label="Building report" /></div>}

          {reportData && !generating && (
            <div className="report-preview">
              <div className="report-actions">
                <button className="btn btn-ghost" onClick={exportPDF}><FiDownload size={13} /> PDF</button>
                <button className="btn btn-ghost" onClick={exportWord}><FiFileText size={13} /> Word</button>
              </div>

              <div id="report-export" className="report-body">
                {/* HEADER */}
                <div className="rpt-head">
                  <h2>ZUCA TREASURY FINANCIAL REPORT</h2>
                  <p className="rpt-scope">{reportData.scopeLabel}</p>
                  <p>Period: {new Date(reportData.startDate).toLocaleDateString()} – {new Date(reportData.endDate).toLocaleDateString()}</p>
                  <p className="dim">Generated {reportData.generatedOn}</p>
                </div>

                {/* SUMMARY CARDS */}
                <div className="rpt-sum">
                  <div className="rpt-sum-income"><span>Income</span><strong>KES {reportData.totalIn.toLocaleString()}</strong></div>
                  <div className="rpt-sum-expense"><span>Expenses</span><strong>KES {reportData.totalOut.toLocaleString()}</strong></div>
                  <div className={reportData.balance >= 0 ? "rpt-sum-income" : "rpt-sum-expense"}><span>Net</span><strong>KES {reportData.balance.toLocaleString()}</strong></div>
                </div>

                {/* EXECUTIVE SUMMARY */}
                {narrative && (
                  <div className="rpt-exec">
                    <h4>Executive summary</h4>
                    <p>
                      This financial report covers <strong>{narrative.period}</strong> for the{" "}
                      <strong>{narrative.scopeLabel}</strong>. The treasury recorded{" "}
                      <strong>{narrative.transactionCount} {narrative.transactionCount === 1 ? "transaction" : "transactions"}</strong> during this period —{" "}
                      <strong className="cell-in">KES {reportData.totalIn.toLocaleString()}</strong> in income and{" "}
                      <strong className="cell-out">KES {reportData.totalOut.toLocaleString()}</strong> in expenses — producing a net{" "}
                      <strong>{reportData.balance >= 0 ? "surplus" : "deficit"}</strong> of{" "}
                      <strong>KES {Math.abs(reportData.balance).toLocaleString()}</strong>.
                    </p>
                    <p>{narrative.verdict}</p>
                  </div>
                )}

                {/* WHERE MONEY CAME FROM */}
                {narrative?.hasIncomes && (
                  <div className="rpt-section">
                    <h4><span className="dot dot-in" /> Where the money came from</h4>
                    <p className="rpt-lead">
                      The treasury received <strong className="cell-in">KES {reportData.totalIn.toLocaleString()}</strong> across{" "}
                      <strong>{narrative.incomeSentences.length} {narrative.incomeSentences.length === 1 ? "income category" : "income categories"}</strong>.
                      {narrative.topIncome && (
                        <> The single largest source was <strong>{narrative.topIncome.category}</strong>, contributing{" "}
                          <strong>KES {narrative.topIncome.total.toLocaleString()}</strong>{" "}
                          ({((narrative.topIncome.total / reportData.totalIn) * 100).toFixed(1)}% of all income).</>
                      )}
                    </p>
                   <div className="rpt-groups">
  {narrative.incomeSentences.map((g, i) => (
    <div key={i} className="rpt-group">
      <div className="rpt-group-summary">
        <span className="dot dot-in" />
        <span>{g.summary}</span>
      </div>
      <ul className="rpt-sublist">
        {g.itemLines.map((line, j) => (
          <li key={j}>{line}</li>
        ))}
      </ul>
    </div>
  ))}
</div>
                  </div>
                )}

                {/* WHERE MONEY WENT */}
                {narrative?.hasExpenses && (
                  <div className="rpt-section">
                    <h4><span className="dot dot-out" /> Where the money went</h4>
                    <p className="rpt-lead">
                      The treasury spent <strong className="cell-out">KES {reportData.totalOut.toLocaleString()}</strong> across{" "}
                      <strong>{narrative.expenseSentences.length} {narrative.expenseSentences.length === 1 ? "expense category" : "expense categories"}</strong>.
                      {narrative.topExpense && (
                        <> The largest outlay was on <strong>{narrative.topExpense.category}</strong> —{" "}
                          <strong>KES {narrative.topExpense.total.toLocaleString()}</strong>{" "}
                          ({((narrative.topExpense.total / reportData.totalOut) * 100).toFixed(1)}% of all expenses).</>
                      )}
                    </p>
                    <div className="rpt-groups">
  {narrative.expenseSentences.map((g, i) => (
    <div key={i} className="rpt-group">
      <div className="rpt-group-summary">
        <span className="dot dot-out" />
        <span>{g.summary}</span>
      </div>
      <ul className="rpt-sublist">
        {g.itemLines.map((line, j) => (
          <li key={j}>{line}</li>
        ))}
      </ul>
    </div>
  ))}
</div>
                  </div>
                )}

                {/* MONTH BY MONTH */}
                {narrative?.hasMonths && (
                  <div className="rpt-section">
                    <h4><span className="dot dot-neutral" /> Month-by-month flow</h4>
                    <ul className="rpt-list rpt-list-tight">
                      {narrative.monthLines.map((line, i) => (
                        <li key={i}><span className="dot dot-neutral" /><span>{line}.</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CATEGORY TABLES */}
                {(Object.keys(reportData.incomeByCategory).length > 0 || Object.keys(reportData.expenseByCategory).length > 0) && (
                  <div className="rpt-breakdown">
                    {Object.keys(reportData.incomeByCategory).length > 0 && (
                      <div>
                        <h4>Income by category</h4>
                        {Object.entries(reportData.incomeByCategory)
                          .sort((a, b) => b[1] - a[1])
                          .map(([c, v]) => (
                            <div className="rpt-row" key={c}>
                              <span>{c}</span>
                              <span>KES {v.toLocaleString()}
                                {reportData.totalIn > 0 && <span className="dim small"> · {((v / reportData.totalIn) * 100).toFixed(1)}%</span>}
                              </span>
                            </div>
                          ))}
                        <div className="rpt-row rpt-total"><span>Total</span><span>KES {reportData.totalIn.toLocaleString()}</span></div>
                      </div>
                    )}
                    {Object.keys(reportData.expenseByCategory).length > 0 && (
                      <div>
                        <h4>Expenses by category</h4>
                        {Object.entries(reportData.expenseByCategory)
                          .sort((a, b) => b[1] - a[1])
                          .map(([c, v]) => (
                            <div className="rpt-row" key={c}>
                              <span>{c}</span>
                              <span>KES {v.toLocaleString()}
                                {reportData.totalOut > 0 && <span className="dim small"> · {((v / reportData.totalOut) * 100).toFixed(1)}%</span>}
                              </span>
                            </div>
                          ))}
                        <div className="rpt-row rpt-total"><span>Total</span><span>KES {reportData.totalOut.toLocaleString()}</span></div>
                      </div>
                    )}
                  </div>
                )}

                {/* FULL LEDGER */}
                <div className="rpt-tx">
                  <h4>Full transaction history ({reportData.transactions.length})</h4>
                  <div className="rpt-tx-table">
                    {reportData.transactions.map((t, i) => (
                      <div key={i} className={`rpt-tx-row ${t.type === "IN" ? "in" : "out"}`}>
                        <span className="dim">{new Date(t.date).toLocaleDateString()}</span>
                        <span className="rpt-tx-desc">
                          {t.description}
                          {t.reference && <span className="dim small"> · ref {t.reference}</span>}
                          {t.project?.name && <span className="dim small"> · {t.project.name}</span>}
                        </span>
                        <span className="dim small">{t.category}</span>
                        <span className="rpt-tx-amt">{t.type === "IN" ? "+" : "−"} {Number(t.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="rpt-foot">
                  <p>This is an auto-generated report from the ZUCA Portal Treasury System.</p>
                  <p>All amounts are in Kenyan Shillings (KES).</p>
                </div>
              </div>
            </div>
          )}

          {!reportData && !generating && (
            <div className="panel-state"><FaRegFilePowerpoint size={32} /><p>No report yet</p><span>Pick a scope and generate.</span></div>
          )}
        </section>
      )}

      {/* AUDIT */}
      {activeTab === "campaigns" && (
        <section className="panel">
          <div className="toolbar">
            <div className="toolbar-title">
              <h3>Activity & Audit</h3>
              <span>Every change is permanently logged</span>
            </div>
          </div>

          <div className="kpis kpis-inline">
            <MiniStat label="IN" value={totals.totalIn} tone="in" />
            <MiniStat label="OUT" value={totals.totalOut} tone="out" />
            <MiniStat label="Balance" value={totals.balance} tone="balance" />
          </div>

          {!auditLoaded ? (
            <div className="panel-state"><Spinner label="Loading audit" /></div>
          ) : auditLogs.length === 0 ? (
            <div className="panel-state"><p>No activity yet</p></div>
          ) : (
            <div className="audit-list">
              {auditLogs.map((log) => (
                <div key={log.id} className={`audit-item audit-${log.action?.toLowerCase()}`}>
                  <div className="audit-meta">
                    <span className="audit-tag">{log.action?.replace("PROJECT_", "PROJECT ")}</span>
                    <span className="dim">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="audit-body">
                    <span><FaUser size={10} /> {log.performedByName || "Unknown"}</span>
                    {log.action === "CREATE" && log.newData && (
                      <span className="dim">Created · {log.newData.description || log.newData.name}</span>
                    )}
                    {log.action === "UPDATE" && log.changedFields?.length > 0 && (
                      <span className="dim">
                        {log.changedFields.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(" · ")}
                      </span>
                    )}
                    {log.action === "DELETE" && log.oldData && (
                      <span className="dim">Deleted · {log.oldData.description || log.oldData.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MEMBERS */}
      {activeTab === "members" && (
        <section className="panel">
          <div className="toolbar">
            <div className="input-group">
              <FiSearch size={13} className="input-ico" />
              <input className="input" placeholder="Search members…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={exportMembersXLSX}><FiDownload size={13} /> Export</button>
          </div>

          {semesterLoading ? (
            <div className="panel-state"><Spinner label="Loading members" /></div>
          ) : visibleMembers.length === 0 ? (
            <div className="panel-state"><FaUser size={32} /><p>No members</p></div>
          ) : isMobile ? (
            <div className="member-cards">
              {visibleMembers.map((m) => (
                <div key={m.id} className="member-card">
                  <div className="member-name">{m.name}</div>
                  <div className="dim small">{m.membershipNumber || "—"} · {m.jumuia}</div>
                  <div className="member-amounts">
                    <span className="cell-in">Paid {Number(m.total_paid || 0).toLocaleString()}</span>
                    <span className="cell-out">Pending {Number(m.total_pending || 0).toLocaleString()}</span>
                  </div>
                  <span className={`tag tag-${m.status?.toLowerCase().replace(/\s/g, "-")}`}>{m.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Membership</th><th>Jumuia</th>
                    <th className="num">Paid</th><th className="num">Pending</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-strong">{m.name}</td>
                      <td className="dim">{m.membershipNumber || "—"}</td>
                      <td className="dim">{m.jumuia}</td>
                      <td className="num cell-in">{Number(m.total_paid || 0).toLocaleString()}</td>
                      <td className="num cell-out">{Number(m.total_pending || 0).toLocaleString()}</td>
                      <td><span className={`tag tag-${m.status?.toLowerCase().replace(/\s/g, "-")}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {showTxModal && (
          <Modal onClose={() => !saving && !bulkSaving && closeTx()}>
            <div className="modal-head">
              <h3>{addMode === "bulk" ? "Bulk add" : editingTx ? "Edit transaction" : "Add transaction"}</h3>
              {!editingTx && (
                <div className="segmented small">
                  <button className={`seg ${addMode === "single" ? "active" : ""}`} onClick={() => setAddMode("single")}>Single</button>
                  <button className={`seg ${addMode === "bulk" ? "active" : ""}`} onClick={() => setAddMode("bulk")}>Bulk</button>
                </div>
              )}
            </div>

            {addMode === "single" ? (
              <SingleForm
                form={txForm} setForm={setTxForm} setType={setFormType}
                inCats={IN_CATS} outCats={OUT_CATS} projects={projects}
              />
            ) : (
                            <BulkForm
                type={bulkType} setType={switchBulkType}
                rows={bulkRows} setRows={setBulkRows}
                inCats={IN_CATS} outCats={OUT_CATS}
                projects={projects}
              />
            )}

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={closeTx} disabled={saving || bulkSaving}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={addMode === "single" ? saveTx : saveBulk}
                disabled={saving || bulkSaving}
              >
                {addMode === "bulk"
                  ? bulkSaving
                    ? <><span className="ldr-sm" /> {bulkProgress.done}/{bulkProgress.total}</>
                    : `Save ${bulkRows.filter((r) => r.description && r.amount).length}`
                  : saving
                    ? <><span className="ldr-sm" /> Saving</>
                    : editingTx ? "Update" : "Save"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProjModal && (
          <Modal onClose={() => !savingProj && setShowProjModal(false)}>
            <div className="modal-head"><h3>New project</h3></div>
            <div className="form">
              <label>Name *</label>
              <input className="input" value={projForm.name} onChange={(e) => setProjForm({ ...projForm, name: e.target.value })} />
              <label>Description</label>
              <textarea className="input" rows={2} value={projForm.description} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} />
              <label>Target (KES)</label>
              <input type="number" className="input" value={projForm.targetAmount} onChange={(e) => setProjForm({ ...projForm, targetAmount: e.target.value })} />
              <div className="form-row">
                <div><label>Start</label><input type="date" className="input" value={projForm.startDate} onChange={(e) => setProjForm({ ...projForm, startDate: e.target.value })} /></div>
                <div><label>End</label><input type="date" className="input" value={projForm.endDate} onChange={(e) => setProjForm({ ...projForm, endDate: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowProjModal(false)} disabled={savingProj}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProject} disabled={savingProj}>
                {savingProj ? <><span className="ldr-sm" /> Creating</> : "Create"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailProject && (
          <Modal wide onClose={() => { setDetailProject(null); setDetailData(null); }}>
            <div className="modal-head">
              <div>
                <h3>{detailProject.name}</h3>
                {detailProject.description && <p className="dim small">{detailProject.description}</p>}
              </div>
              <button className="icon-btn" onClick={() => { setDetailProject(null); setDetailData(null); }}><FiX size={14} /></button>
            </div>
            {detailLoading ? (
              <div className="panel-state"><Spinner label="Loading" /></div>
            ) : detailData ? (
              <>
                <div className="kpis kpis-inline">
                  <MiniStat label="IN" value={detailData.contributionsIn || 0} tone="in" />
                  <MiniStat label="OUT" value={detailData.expensesOut || 0} tone="out" />
                  <MiniStat label="NET" value={detailData.net || 0} tone={detailData.net >= 0 ? "in" : "out"} />
                </div>
                <div className="detail-tx">
                  {detailData.transactions?.length === 0 ? (
                    <p className="dim">No transactions</p>
                  ) : (
                    detailData.transactions.map((t) => (
                      <div key={t.id} className="detail-tx-row">
                        <span className="dim nowrap">{new Date(t.date).toLocaleDateString()}</span>
                        <span>{t.description}</span>
                        <span className={t.type === "IN" ? "cell-in" : "cell-out"}>
                          {t.type === "IN" ? "+" : "−"} {Number(t.amount).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
            <div className="modal-foot">
              <button className="btn btn-danger" onClick={() => deleteProject(detailProject.id)}>
                <FiTrash2 size={13} /> Delete
              </button>
              <button className="btn btn-ghost" onClick={() => { setDetailProject(null); setDetailData(null); }}>Close</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReopen && (
          <Modal onClose={() => !reopening && setShowReopen(false)}>
            <div className="modal-head"><h3>Reopen semester</h3></div>
            <p className="dim small">Reopening <strong>{selectedSemester?.title}</strong> unlocks the books. All actions are logged.</p>
            <div className="form">
              <label>Reason *</label>
              <textarea className="input" rows={3} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="e.g. Missing expense from March" />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowReopen(false)} disabled={reopening}>Cancel</button>
              <button className="btn btn-primary" onClick={reopenSemester} disabled={reopening}>
                {reopening ? <><span className="ldr-sm" /> Reopening</> : "Reopen"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <style>{BASE_CSS}</style>
    </div>
  );

  /* ---------- inline subcomponents ---------- */
  function openSingle() {
    setEditingTx(null);
    setAddMode("single");
    resetTx();
    setShowTxModal(true);
  }
  function openBulk() {
    setAddMode("bulk");
    setBulkType("IN");
    setBulkRows([emptyRow("IN")]);
    setShowTxModal(true);
  }
  function closeTx() {
    setShowTxModal(false);
    setEditingTx(null);
    resetTx();
    setBulkRows([emptyRow(bulkType)]);
  }
}

/* ---------------------------------------------------------------- */
/* small components                                                  */
/* ---------------------------------------------------------------- */
const TABS = [
  { id: "ledger", label: "Ledger", icon: <FaBook size={12} /> },
  { id: "projects", label: "Projects", icon: <FiFolder size={12} /> },
  { id: "report", label: "Report", icon: <FaRegFilePowerpoint size={12} /> },
  { id: "campaigns", label: "Audit", icon: <FaRegFileAlt size={12} /> },
  { id: "members", label: "Members", icon: <FaUser size={12} /> },
];

function Kpi({ icon, label, value, loading, tone }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ""}`}>
      <span className="kpi-icon">{icon}</span>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        {loading
          ? <span className="kpi-skeleton" />
          : <span className="kpi-value">{Number(value || 0).toLocaleString()}</span>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className={`mini-stat ${tone ? `mini-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{Number(value || 0).toLocaleString()}</strong>
    </div>
  );
}

function MobileCards({ list, onEdit, onDelete, readOnly }) {
  return (
    <div className="mobile-cards">
      {list.map((t) => (
        <div key={t.id} className={`mcard ${t.type === "IN" ? "mcard-in" : "mcard-out"}`}>
          <div className="mcard-top">
            <span className="dim small">{new Date(t.date).toLocaleDateString()}</span>
            <div className="mcard-actions">
              <button className="icon-btn" disabled={readOnly} onClick={() => onEdit(t)}><FiEdit2 size={11} /></button>
              <button className="icon-btn icon-danger" disabled={readOnly} onClick={() => onDelete(t.id)}><FiTrash2 size={11} /></button>
            </div>
          </div>
          <div className="mcard-desc">{t.description}</div>
          <div className="mcard-meta">
            <span className="dim small">{t.category}</span>
            {t.project && <span className="tag tag-project">{t.project.name}</span>}
          </div>
          <div className="mcard-amounts">
            <span className={t.type === "IN" ? "cell-in" : "cell-out"}>
              {t.type === "IN" ? "+" : "−"} {Number(t.amount).toLocaleString()}
            </span>
            <span className="dim small">Bal {t.runningBalance.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SingleForm({ form, setForm, setType, inCats, outCats, projects }) {
  return (
    <div className="form">
      <div className="form-row">
        <div><label>Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div>
          <label>Type</label>
          <div className="segmented small">
            <button className={`seg ${form.type === "IN" ? "active-in" : ""}`} onClick={() => setType("IN")}>IN</button>
            <button className={`seg ${form.type === "OUT" ? "active-out" : ""}`} onClick={() => setType("OUT")}>OUT</button>
          </div>
        </div>
      </div>
      <label>Description</label>
      <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="form-row">
        <div>
          <label>Category</label>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {(form.type === "IN" ? inCats : outCats).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label>Amount (KES)</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
      </div>
      <label>Project</label>
      <select className="input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
        <option value="">General</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <label>Reference</label>
      <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      <label>Notes</label>
      <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    </div>
  );
}

function BulkForm({ type, setType, rows, setRows, inCats, outCats, projects }) {
  const update = (key, field, value) => setRows((r) => r.map((row) => row.key === key ? { ...row, [field]: value } : row));
  const remove = (key) => setRows((r) => r.length <= 1 ? r : r.filter((row) => row.key !== key));
  const add = () => setRows((r) => [...r, emptyRow(type)]);
  const cats = type === "IN" ? inCats : outCats;
  return (
    <>
      <div className="segmented small" style={{ marginBottom: 12 }}>
        <button className={`seg ${type === "IN" ? "active-in" : ""}`} onClick={() => setType("IN")}>All IN</button>
        <button className={`seg ${type === "OUT" ? "active-out" : ""}`} onClick={() => setType("OUT")}>All OUT</button>
      </div>
      <div className="bulk-wrap">
        {rows.map((r, i) => (
          <div className="bulk-card" key={r.key}>
            <div className="bulk-card-head">
              <span className="dim small">Row {i + 1}</span>
              <button className="icon-btn icon-danger" onClick={() => remove(r.key)} disabled={rows.length <= 1}><FiX size={11} /></button>
            </div>
            <div className="bulk-row">
              <input type="date" className="input" value={r.date} onChange={(e) => update(r.key, "date", e.target.value)} />
              <input className="input" placeholder="Description" value={r.description} onChange={(e) => update(r.key, "description", e.target.value)} />
              <select className="input" value={r.category} onChange={(e) => update(r.key, "category", e.target.value)}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" className="input" placeholder="0" value={r.amount} onChange={(e) => update(r.key, "amount", e.target.value)} />
              <input className="input" placeholder="ref" value={r.reference} onChange={(e) => update(r.key, "reference", e.target.value)} />
            </div>
            <div className="bulk-row-secondary">
              <select className="input" value={r.projectId || ""} onChange={(e) => update(r.key, "projectId", e.target.value)}>
                <option value="">General</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className="input" placeholder="Notes" value={r.notes || ""} onChange={(e) => update(r.key, "notes", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-outline" onClick={add} style={{ marginTop: 8 }}><FiPlus size={11} /> Add row</button>
    </>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`modal ${wide ? "modal-wide" : ""}`}
        initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */
/* CSS                                                               */
/* ---------------------------------------------------------------- */
const BASE_CSS = `
  :root {
    --bg: #f7f8fa;
    --surface: #ffffff;
    --border: #e5e7eb;
    --border-soft: #f0f2f5;
    --text: #0f172a;
    --text-dim: #64748b;
    --text-mute: #94a3b8;
    --accent: #2563eb;
    --accent-hover: #1d4ed8;
    --in: #059669;
    --out: #dc2626;
    --danger: #dc2626;
    --radius: 8px;
    --radius-lg: 12px;
    --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
    --shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    --shadow-lg: 0 20px 48px rgba(15, 23, 42, 0.16);
  }
  * { box-sizing: border-box; }
  .app {
    padding: 16px 20px 32px;
    max-width: 1360px;
    margin: 0 auto;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13.5px;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
    font-variant-numeric: tabular-nums;
  }

  /* ---- topbar ---- */
  .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .topbar-right { display: flex; gap: 6px; }

  .header { margin-bottom: 16px; position: relative; }
  .header h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.3px; }
  .semester-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .semester-picker {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 999px; cursor: pointer; font-size: 12px;
    color: var(--text); font-weight: 500;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .semester-picker:hover { border-color: #cbd5e1; box-shadow: var(--shadow-sm); }
  .pill-dot {
    width: 8px; height: 8px; border-radius: 50%;
    border: 2px solid #cbd5e1; border-top-color: var(--accent);
    animation: spin .7s linear infinite;
  }
  .banner-link {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 10px; background: #fef3c7; border: 1px solid #fde68a;
    color: #92400e; border-radius: 999px; font-size: 11px; font-weight: 600;
    cursor: pointer;
  }

  .semester-menu {
    position: absolute; top: calc(100% + 2px); left: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
    min-width: 320px; max-width: 92vw; z-index: 50; overflow: hidden;
  }
  .semester-item {
    display: grid; grid-template-columns: 1fr auto; gap: 4px 8px;
    padding: 10px 14px; width: 100%; text-align: left;
    border: none; background: none; cursor: pointer;
    border-bottom: 1px solid var(--border-soft);
    transition: background .12s ease;
  }
  .semester-item:last-child { border-bottom: none; }
  .semester-item:hover { background: #f8fafc; }
  .semester-item.active { background: #eff6ff; }
  .semester-item-title { font-weight: 600; color: var(--text); font-size: 12.5px; }
  .semester-item-dates { grid-column: 1 / -1; font-size: 11px; color: var(--text-dim); }

  /* ---- kpis (NO background on icons) ---- */
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .kpis-inline { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 12px; }
  .kpi {
    display: flex; align-items: center; gap: 12px;
    padding: 14px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
  .kpi-icon {
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--text-mute); flex-shrink: 0; font-size: 18px;
    background: transparent; border: none;
    width: 24px; height: 24px;
  }
  .kpi-in .kpi-icon { color: var(--in); }
  .kpi-out .kpi-icon { color: var(--out); }
  .kpi-balance .kpi-icon { color: var(--accent); }
  .kpi-body { min-width: 0; flex: 1; }
  .kpi-label { font-size: 10.5px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .5px; font-weight: 600; display: block; }
  .kpi-value { font-size: 16px; font-weight: 700; color: var(--text); display: block; line-height: 1.2; margin-top: 2px; }
  .kpi-skeleton { display: block; height: 16px; width: 80px; margin-top: 2px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 4px; }

  .mini-stat {
    display: flex; flex-direction: column; gap: 2px;
    padding: 10px 14px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 8px;
  }
  .mini-stat span { font-size: 10.5px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
  .mini-stat strong { font-size: 14px; font-weight: 700; color: var(--text); }
  .mini-in strong { color: var(--in); }
  .mini-out strong { color: var(--out); }

  /* ---- banner ---- */
  .banner {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; margin-bottom: 14px;
    background: #fffbeb; border: 1px solid #fde68a;
    border-radius: var(--radius-lg); color: #92400e;
    flex-wrap: wrap;
  }
  .banner-body { flex: 1; min-width: 180px; }
  .banner-body strong { display: block; font-size: 12.5px; }
  .banner-body span { font-size: 11.5px; opacity: .85; }
  .banner-actions { display: flex; gap: 6px; }

  /* ---- tabs ---- */
  .tabs {
    display: flex; gap: 2px; margin-bottom: 14px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto; scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 14px; background: none; border: none;
    font-size: 12.5px; font-weight: 500; color: var(--text-dim);
    cursor: pointer; border-bottom: 2px solid transparent;
    margin-bottom: -1px; white-space: nowrap;
    transition: color .12s ease, border-color .12s ease;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
  .tab-ico { display: inline-flex; opacity: .85; }

  /* ---- panel ---- */
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .toolbar {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; flex-wrap: wrap; padding: 12px 16px;
    border-bottom: 1px solid var(--border-soft);
  }
  .toolbar-title h3 { margin: 0; font-size: 13.5px; font-weight: 600; }
  .toolbar-title span { font-size: 11.5px; color: var(--text-dim); }
  .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex: 1; min-width: 0; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }

  /* ---- inputs ---- */
  .input {
    padding: 7px 11px; border: 1px solid var(--border);
    border-radius: var(--radius); font-size: 12.5px;
    background: var(--surface); color: var(--text);
    font-family: inherit; min-width: 0;
    transition: border-color .12s ease, box-shadow .12s ease;
  }
  .input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, .1); }
  .input.select { cursor: pointer; min-width: 140px; }
  .input-group { position: relative; display: inline-flex; flex: 1; max-width: 280px; }
  .input-group .input { padding-left: 30px; width: 100%; }
  .input-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-mute); pointer-events: none; }

  /* ---- buttons ---- */
  .btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 12px; border-radius: var(--radius);
    font-size: 12.5px; font-weight: 500; font-family: inherit;
    cursor: pointer; border: 1px solid transparent;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
    white-space: nowrap;
  }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--text-dim); border-color: var(--border); }
  .btn-ghost:hover:not(:disabled) { background: #f8fafc; color: var(--text); }
  .btn-outline { background: var(--surface); color: var(--accent); border-color: #c7d2fe; }
  .btn-outline:hover:not(:disabled) { background: #eff6ff; }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn-danger { background: #fef2f2; color: var(--danger); border-color: #fecaca; }
  .btn-danger:hover:not(:disabled) { background: #fee2e2; }

  .icon-btn {
    display: inline-grid; place-items: center;
    width: 26px; height: 26px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text-dim); cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
    margin-left: 3px;
  }
  .icon-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; color: var(--text); }
  .icon-btn.icon-danger:hover:not(:disabled) { background: #fef2f2; border-color: #fecaca; color: var(--danger); }
  .icon-btn:disabled { opacity: .4; cursor: not-allowed; }

  /* ---- table ---- */
  .table-wrap { overflow-x: auto; }
  .data-table {
    width: 100%; border-collapse: collapse; font-size: 12.5px;
  }
  .data-table thead th {
    text-align: left; padding: 10px 14px;
    background: #fafbfc; color: var(--text-dim);
    font-size: 10.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .5px;
    border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .data-table thead th.num { text-align: right; }
  .data-table thead th.right { text-align: right; width: 70px; }
  .data-table tbody td {
    padding: 11px 14px; border-bottom: 1px solid var(--border-soft);
    color: var(--text); vertical-align: middle;
  }
  .data-table tbody tr:last-child td { border-bottom: none; }
  .data-table tbody tr:hover { background: #f8fafc; }
  .data-table tbody tr.row-in { background: #fafffc; }
  .data-table tbody tr.row-out { background: #fffbfb; }
  .data-table tbody tr.row-in:hover { background: #f0fdf4; }
  .data-table tbody tr.row-out:hover { background: #fef2f2; }
  .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .data-table td.right { text-align: right; white-space: nowrap; }
  .data-table tfoot td {
    padding: 12px 14px; background: #f8fafc; font-weight: 600;
    border-top: 1px solid var(--border); color: var(--text);
    font-size: 12.5px;
  }
  .nowrap { white-space: nowrap; }
  .dim { color: var(--text-dim); }
  .small { font-size: 11px; }
  .cell-strong { font-weight: 500; color: var(--text); }
  .cell-in { color: var(--in); font-weight: 600; }
  .cell-out { color: var(--out); font-weight: 600; }
  .cell-balance { color: var(--text); font-weight: 600; }
  .cell-total { color: var(--text-mute); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }

  /* ---- tags ---- */
  .tag {
    display: inline-block; padding: 2px 8px;
    border-radius: 999px; font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .3px;
  }
  .tag-project { background: #eff6ff; color: #1e40af; text-transform: none; letter-spacing: 0; }
  .tag-active { background: #ecfdf5; color: #047857; }
  .tag-closed { background: #fef2f2; color: #b91c1c; }
  .tag-upcoming { background: #fffbeb; color: #92400e; }
  .tag-open { background: #eff6ff; color: #1e40af; }
  .tag-completed { background: #ecfdf5; color: #047857; }
  .tag-cancelled { background: #fef2f2; color: #b91c1c; }
  .tag-completed, .tag-partial, .tag-pledged, .tag-no-pledge { text-transform: capitalize; }

  /* ---- states ---- */
  .panel-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 60px 20px; gap: 6px;
    color: var(--text-dim); text-align: center;
  }
  .panel-state svg { color: var(--text-mute); margin-bottom: 4px; }
  .panel-state p { margin: 0; font-weight: 500; color: var(--text); }
  .panel-state span { font-size: 12px; }

  .inline-loader { display: inline-flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 12.5px; }
  .ldr {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #e2e8f0; border-top-color: var(--accent);
    animation: spin .7s linear infinite;
  }
  .ldr-sm {
    display: inline-block; width: 11px; height: 11px;
    border-radius: 50%; border: 2px solid rgba(255,255,255,.4);
    border-top-color: white; animation: spin .7s linear infinite;
  }

  /* ---- projects ---- */
  .cards {
    display: grid; gap: 10px; padding: 12px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  .proj-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 14px;
    cursor: pointer; text-align: left; font-family: inherit;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .proj-card:hover { border-color: #cbd5e1; box-shadow: var(--shadow-sm); }
  .proj-card header { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
  .proj-card h4 { margin: 0; font-size: 13.5px; font-weight: 600; }
  .proj-desc { margin: 0 0 12px; font-size: 12px; color: var(--text-dim); line-height: 1.45; }
  .proj-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .proj-stats > div { padding: 8px 10px; background: #f8fafc; border-radius: 6px; }
  .proj-stats span { display: block; font-size: 9.5px; color: var(--text-mute); font-weight: 600; letter-spacing: .4px; }
  .proj-stats strong { display: block; font-size: 12px; font-weight: 700; color: var(--text); margin-top: 2px; }
  .proj-progress { margin-bottom: 10px; }
  .prog-bar { height: 4px; background: #f1f5f9; border-radius: 999px; overflow: hidden; margin-bottom: 5px; }
  .prog-fill { height: 100%; background: var(--accent); transition: width .3s ease; }
  .proj-progress span { font-size: 10.5px; color: var(--text-mute); }
  .proj-card footer { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-soft); font-size: 11px; color: var(--text-mute); }

  /* ---- report ---- */
  .report-toolbar { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border-soft); }
  .report-inputs { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .segmented { display: inline-flex; background: #f1f5f9; padding: 3px; border-radius: 7px; gap: 2px; flex-wrap: wrap; }
  .segmented.small { padding: 2px; }
  .seg { padding: 6px 12px; background: none; border: none; border-radius: 5px; font-size: 12px; font-weight: 500; color: var(--text-dim); cursor: pointer; transition: all .12s ease; }
  .seg.active { background: var(--surface); color: var(--accent); box-shadow: var(--shadow-sm); font-weight: 600; }
  .seg.active-in { background: var(--in); color: white; }
  .seg.active-out { background: var(--out); color: white; }

  .report-preview { padding: 16px; }
  .report-actions { display: flex; gap: 6px; justify-content: flex-end; margin-bottom: 12px; flex-wrap: wrap; }
  .report-body { max-width: 780px; margin: 0 auto; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); font-size: 12.5px; }
  .rpt-head { text-align: center; padding-bottom: 14px; border-bottom: 2px solid var(--border); margin-bottom: 16px; }
  .rpt-head h2 { margin: 0 0 4px; font-size: 16px; font-weight: 700; letter-spacing: .2px; }
  .rpt-head p { margin: 2px 0; color: var(--text-dim); font-size: 12px; }
  .rpt-scope { color: var(--accent) !important; font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: .5px; }
  .rpt-sum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .rpt-sum > div { padding: 12px; background: #f8fafc; border-radius: 8px; text-align: center; }
  .rpt-sum span { display: block; font-size: 10px; color: var(--text-mute); text-transform: uppercase; font-weight: 600; letter-spacing: .5px; }
  .rpt-sum strong { display: block; font-size: 15px; font-weight: 700; margin-top: 3px; }
  .rpt-sum-income strong { color: var(--in); }
  .rpt-sum-expense strong { color: var(--out); }

  .rpt-exec { background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px; }
  .rpt-exec h4 { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); font-weight: 600; }
  .rpt-exec p { margin: 0 0 8px; font-size: 12.5px; line-height: 1.6; color: var(--text); }
  .rpt-exec p:last-child { margin-bottom: 0; }
  .rpt-exec strong { font-weight: 600; }

  .rpt-section { margin-bottom: 16px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
  .rpt-section h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); }
  .rpt-lead { margin: 0 0 10px; font-size: 12.5px; line-height: 1.65; color: var(--text); }
  .rpt-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .rpt-list li { display: flex; gap: 8px; font-size: 12px; line-height: 1.6; color: var(--text); padding-left: 2px; }
  .rpt-list li > span:last-child { flex: 1; }
    .rpt-groups { display: flex; flex-direction: column; gap: 12px; }
  .rpt-group { padding: 8px 0; border-bottom: 1px solid var(--border-soft); }
  .rpt-group:last-child { border-bottom: none; padding-bottom: 0; }
  .rpt-group-summary {
    display: flex; gap: 8px; align-items: flex-start;
    font-size: 12.5px; font-weight: 600; color: var(--text);
    margin-bottom: 6px;
  }
  .rpt-sublist {
    list-style: none; padding: 0 0 0 14px; margin: 0;
    display: flex; flex-direction: column; gap: 3px;
    border-left: 2px solid var(--border-soft);
  }
  .rpt-sublist li {
    font-size: 12px; line-height: 1.5; color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .rpt-list-tight li { font-size: 11.5px; }
  .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 7px; }
  .dot-in { background: var(--in); }
  .dot-out { background: var(--out); }
  .dot-neutral { background: #94a3b8; }

  .rpt-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .rpt-breakdown h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); }
  .rpt-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border-soft); font-size: 12px; }
  .rpt-total { border-top: 1px solid var(--border); border-bottom: none; font-weight: 600; padding-top: 8px; margin-top: 2px; }
  .rpt-tx h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); }
  .rpt-tx-table { border: 1px solid var(--border-soft); border-radius: 6px; overflow: hidden; }
  .rpt-tx-row { display: grid; grid-template-columns: 80px 1fr 100px 80px; gap: 8px; padding: 6px 8px; font-size: 11.5px; border-bottom: 1px solid var(--border-soft); align-items: center; }
  .rpt-tx-row:last-child { border-bottom: none; }
  .rpt-tx-row.in { background: #fafffc; }
  .rpt-tx-row.out { background: #fffbfb; }
  .rpt-tx-amt { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .rpt-tx-row.in .rpt-tx-amt { color: var(--in); }
  .rpt-tx-row.out .rpt-tx-amt { color: var(--out); }
  .rpt-foot { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-soft); font-size: 10.5px; color: var(--text-mute); }

  /* ---- audit ---- */
  .audit-list { padding: 12px 16px; max-height: 560px; overflow-y: auto; }
  .audit-item { padding: 10px 12px; border-left: 3px solid var(--border); background: #fafbfc; border-radius: 6px; margin-bottom: 8px; }
  .audit-create { border-left-color: var(--in); background: #fafffc; }
  .audit-update { border-left-color: #d97706; background: #fffdf8; }
  .audit-delete { border-left-color: var(--out); background: #fffbfb; }
  .audit-meta { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .audit-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text); }
  .audit-body { font-size: 12px; color: var(--text); display: flex; flex-direction: column; gap: 3px; }
  .audit-body span { display: inline-flex; align-items: center; gap: 4px; }

  /* ---- members ---- */
  .member-cards { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
  .member-card { padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
  .member-name { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
  .member-amounts { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin: 8px 0; }

  /* ---- mobile cards ---- */
  .mobile-cards { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
  .mcard { padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; border-left: 3px solid var(--border); }
  .mcard-in { border-left-color: var(--in); }
  .mcard-out { border-left-color: var(--out); }
  .mcard-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .mcard-actions { display: flex; gap: 4px; }
  .mcard-desc { font-weight: 500; font-size: 13px; margin-bottom: 6px; }
  .mcard-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
  .mcard-amounts { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 600; }

  /* ---- modal ---- */
  .modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, .55); backdrop-filter: blur(2px); display: grid; place-items: center; padding: 16px; }
  .modal { background: var(--surface); border-radius: var(--radius-lg); width: 100%; max-width: 720px; max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); padding: 20px; }
  .modal-wide { max-width: 780px; }
  .modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .modal-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
  .modal-head p { margin: 2px 0 0; }
  .modal-foot { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-soft); }
  .form { display: flex; flex-direction: column; gap: 10px; }
  .form label { font-size: 11px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-row > div { display: flex; flex-direction: column; gap: 4px; }

  /* ---- bulk ---- */
  .bulk-wrap { display: flex; flex-direction: column; gap: 8px; }
  .bulk-card { padding: 14px; background: #f8fafc; border: 1px solid var(--border-soft); border-radius: 8px; }
  .bulk-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .bulk-row { display: grid; grid-template-columns: 130px minmax(220px, 2fr) 140px 110px 110px; gap: 8px; align-items: center; }
  .bulk-row-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .bulk-row .input, .bulk-row-secondary .input { padding: 9px 10px; font-size: 13px; }

  /* ---- toast ---- */
  .toast { position: fixed; bottom: 16px; right: 16px; z-index: 200; padding: 10px 16px; border-radius: var(--radius); color: white; font-size: 12.5px; font-weight: 500; box-shadow: var(--shadow-lg); animation: slideIn .25s ease; max-width: 90vw; }
  .toast-success { background: #111827; }
  .toast-error { background: var(--danger); }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* ---- skeleton ---- */
  .sk-wrap { max-width: 1360px; margin: 0 auto; padding: 16px 20px; }
  .sk { background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
  .sk-bar-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
  .sk-btn { width: 90px; height: 32px; }
  .sk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .sk-card { height: 62px; border-radius: var(--radius-lg); }
  .sk-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
  .sk-tab { width: 90px; height: 34px; }
  .sk-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px; }
  .sk-row { height: 40px; margin-bottom: 6px; }

  /* ---- responsive ---- */
  @media (max-width: 1024px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .rpt-breakdown { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .app { padding: 12px; }
    .header h1 { font-size: 18px; }
    .kpis { grid-template-columns: 1fr; gap: 8px; }
    .kpi { padding: 11px; }
    .kpi-icon { width: 20px; height: 20px; font-size: 16px; }
    .kpi-value { font-size: 15px; }
    .toolbar { padding: 10px 12px; }
    .filters { flex-direction: column; align-items: stretch; width: 100%; }
    .filters .input, .filters .input-group { max-width: none; width: 100%; }
    .actions { width: 100%; }
    .actions .btn { flex: 1; justify-content: center; }
    .data-table { display: none; }
    .report-body { padding: 14px; }
    .rpt-sum { grid-template-columns: 1fr; }
    .rpt-tx-row { grid-template-columns: 1fr auto; }
    .rpt-tx-row > :nth-child(2), .rpt-tx-row > :nth-child(3) { grid-column: 1; }
    .rpt-tx-amt { grid-column: 2; grid-row: 1; }
    .form-row { grid-template-columns: 1fr; }
    .bulk-row { grid-template-columns: 1fr 1fr; gap: 8px; }
    .bulk-row .input:nth-child(2) { grid-column: 1 / -1; }
    .bulk-row-secondary { grid-template-columns: 1fr; }
    .modal { padding: 16px; }
    .semester-menu { min-width: 0; width: min(92vw, 340px); }
  }
  @media (max-width: 480px) {
    .actions .btn { flex: 1 1 100%; }
    .seg { flex: 1 1 100%; text-align: center; }
  }
`;