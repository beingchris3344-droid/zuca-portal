import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Calendar, FileText, Download, FolderOpen, ChevronRight } from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx";
import BASE_URL from "../../api";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";
import {
  FaBook,
  FaPlus,
  FaRegFilePowerpoint,
  FaUser,
  FaRegFileAlt,
  FaEdit,
  FaStickyNote,
  FaFolder,
  FaFolderOpen as FaFolderOpenSolid,
  FaTimes,
  FaPaperclip,
  FaLock
} from "react-icons/fa";

const SkeletonLoader = () => (
  <div className="skeleton-wrapper">
    <div className="skeleton-header">
      <div className="skeleton-back-btn"></div>
      <div className="skeleton-refresh-btn"></div>
    </div>
    <div className="skeleton-stats-grid">
      <div className="skeleton-stat-card"></div>
      <div className="skeleton-stat-card"></div>
      <div className="skeleton-stat-card"></div>
      <div className="skeleton-stat-card"></div>
    </div>
    <div className="skeleton-tabs">
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
      <div className="skeleton-tab"></div>
    </div>
    <div className="skeleton-table">
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
    </div>
  </div>
);

export default function TreasurerReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [members, setMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [allSemesters, setAllSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);
  const [closedBannerDismissed, setClosedBannerDismissed] = useState(false);
  const [projectDetail, setProjectDetail] = useState(null);
  const [loadingProjectDetail, setLoadingProjectDetail] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeSemesterTitle, setActiveSemesterTitle] = useState("");
  const [semesterLocked, setSemesterLocked] = useState(false);

  // ---------- REPORT STATE ----------
  const [reportScope, setReportScope] = useState("semester"); // semester | year | custom | project
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportProjectId, setReportProjectId] = useState(null);
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [campaignSummary, setCampaignSummary] = useState({
    totalCampaigns: 0,
    totalCollected: 0,
    totalPending: 0,
    totalTarget: 0,
    overallCompletion: 0,
    activeCampaigns: 0,
    completedCampaigns: 0
  });

  const selectedSemester = allSemesters.find((s) => s.id === selectedSemesterId);

  const [ledgerSummary, setLedgerSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    count: 0,
    openingBalance: 0,
    closingBalance: 0
  });

  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    category: "",
    type: "IN",
    amount: "",
    reference: "",
    notes: "",
    projectId: ""
  });

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    targetAmount: "",
    startDate: "",
    endDate: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const inCategories = ["Contributions", "Registration", "Sponsors", "Events", "Other Income"];
  const outCategories = ["Choir Expenses", "Events", "Maintenance", "Supplies", "Other Expense"];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const semParam = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : "";
      const [campaignsRes, membersRes, ledgerRes, auditRes, projectsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/treasurer/campaign-summary${semParam}`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/member-summary${semParam}`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/ledger${semParam}`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/audit-trail`, { headers }),
        axios.get(`${BASE_URL}/api/treasurer/projects${semParam}`, { headers })
      ]);

      if (campaignsRes.data.success) {
        setCampaigns(campaignsRes.data.campaigns || []);
        setCampaignSummary(
          campaignsRes.data.summary || {
            totalCampaigns: 0,
            totalCollected: 0,
            totalPending: 0,
            totalTarget: 0,
            overallCompletion: 0,
            activeCampaigns: 0,
            completedCampaigns: 0
          }
        );
        if (campaignsRes.data.semesterTitle) setActiveSemesterTitle(campaignsRes.data.semesterTitle);
      }

      if (membersRes.data.success) setMembers(membersRes.data.members || []);

      if (ledgerRes.data.success) {
        setTransactions(ledgerRes.data.transactions || []);
        setLedgerSummary(
          ledgerRes.data.summary || {
            totalIn: 0,
            totalOut: 0,
            balance: 0,
            count: 0,
            openingBalance: 0,
            closingBalance: 0
          }
        );
      }

      if (auditRes.data.success) setAuditLogs(auditRes.data.auditLogs || []);
      if (projectsRes.data.success) setProjects(projectsRes.data.projects || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSemesterId]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/treasurer/semester/list`, { headers });
        if (res.data.success && res.data.semesters.length > 0) {
          setAllSemesters(res.data.semesters);
          const active = res.data.semesters.find((s) => s.isActive) || res.data.semesters[0];
          setSelectedSemesterId(active.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load semesters:", err);
        setLoading(false);
      }
    };
    loadSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemesterId) {
      fetchData();
    }
  }, [selectedSemesterId]);

  const loadProjectDetail = async (projectId) => {
    setLoadingProjectDetail(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/treasurer/projects/${projectId}`, { headers });
      if (res.data.success) setProjectDetail(res.data.project);
    } catch (err) {
      showToast("Failed to load project details", "error");
    } finally {
      setLoadingProjectDetail(false);
    }
  };

  // ---------- DERIVED LISTS ----------
  const availableYears = useMemo(() => {
    const years = new Set();
    allSemesters.forEach((s) => {
      years.add(new Date(s.startDate).getFullYear());
      years.add(new Date(s.endDate).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allSemesters]);

  // Keep report dates in sync with the selected semester/year
  useEffect(() => {
    if (reportScope === "semester" && selectedSemester) {
      setReportStartDate(new Date(selectedSemester.startDate).toISOString().split("T")[0]);
      setReportEndDate(new Date(selectedSemester.endDate).toISOString().split("T")[0]);
    } else if (reportScope === "year") {
      setReportStartDate(`${reportYear}-01-01`);
      setReportEndDate(`${reportYear}-12-31`);
    }
  }, [reportScope, selectedSemesterId, reportYear]);

  // ---------- REPORT GENERATION ----------
  // Builds a report object with the exact shape the existing preview expects:
  // { startDate, endDate, transactions[], totalIn, totalOut, balance, incomeByCategory, expenseByCategory, transactionCount, generatedOn }
  const buildReportFromTransactions = (txList, start, end, extra = {}) => {
    const filtered = txList.filter((t) => {
      const tDate = new Date(t.date).toISOString().split("T")[0];
      return tDate >= start && tDate <= end;
    });

    const totalIn = filtered.filter((t) => t.type === "IN").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalOut = filtered.filter((t) => t.type === "OUT").reduce((sum, t) => sum + Number(t.amount), 0);
    const incomeByCategory = {};
    const expenseByCategory = {};

    filtered.forEach((t) => {
      if (t.type === "IN") {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + Number(t.amount);
      } else {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Number(t.amount);
      }
    });

    return {
      startDate: start,
      endDate: end,
      transactions: filtered,
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      incomeByCategory,
      expenseByCategory,
      transactionCount: filtered.length,
      generatedOn: new Date().toLocaleString(),
      ...extra
    };
  };

 const generateReport = useCallback(async () => {
  setGeneratingReport(true);
  try {
    if (reportScope === "semester") {
      const sem = allSemesters.find((s) => s.id === selectedSemesterId);
      if (!sem) {
        showToast("Select a semester first", "error");
        return;
      }
      const start = new Date(sem.startDate).toISOString().split("T")[0];
      const end = new Date(sem.endDate).toISOString().split("T")[0];
      const data = buildReportFromTransactions(transactions, start, end, {
        scopeLabel: sem.title
      });
      setReportData(data);
    } else if (reportScope === "custom") {
      if (!reportStartDate || !reportEndDate) {
        showToast("Please select both start and end dates", "error");
        return;
      }
      const data = buildReportFromTransactions(transactions, reportStartDate, reportEndDate, {
        scopeLabel: "Custom Range"
      });
      setReportData(data);
    } else if (reportScope === "year") {
      const semestersInYear = allSemesters.filter((s) => {
        const sy = new Date(s.startDate).getFullYear();
        const ey = new Date(s.endDate).getFullYear();
        return sy === reportYear || ey === reportYear;
      });
      let allTx = [];
      for (const s of semestersInYear) {
        const res = await axios.get(`${BASE_URL}/api/treasurer/ledger?semesterId=${s.id}`, { headers });
        if (res.data.success && Array.isArray(res.data.transactions)) {
          allTx = allTx.concat(res.data.transactions);
        }
      }
      const start = `${reportYear}-01-01`;
      const end = `${reportYear}-12-31`;
      const data = buildReportFromTransactions(allTx, start, end, {
        scopeLabel: `Year ${reportYear}`
      });
      setReportData(data);
    } else if (reportScope === "project") {
      if (!reportProjectId) {
        showToast("Select a project first", "error");
        return;
      }
      const res = await axios.get(`${BASE_URL}/api/treasurer/projects/${reportProjectId}`, { headers });
      if (res.data.success && res.data.project) {
        const proj = res.data.project;
        const projTx = (proj.transactions || []).map((t) => ({ ...t, project: { id: proj.id, name: proj.name } }));
        const start = proj.startDate
          ? new Date(proj.startDate).toISOString().split("T")[0]
          : "2000-01-01";
        const end = proj.endDate
          ? new Date(proj.endDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        const data = buildReportFromTransactions(projTx, start, end, {
          scopeLabel: `Project: ${proj.name}`
        });
        setReportData(data);
      }
    }
    showToast("Report generated successfully!");
  } catch (err) {
    console.error(err);
    showToast("Failed to generate report", "error");
  } finally {
    setGeneratingReport(false);
  }
}, [
  reportScope,
  reportYear,
  reportProjectId,
  reportStartDate,
  reportEndDate,
  selectedSemesterId,
  allSemesters,
  transactions
]);

  const exportReportAsPDF = () => {
    if (!reportData) return;
    const element = document.getElementById("report-content-for-export");
    if (!element) return;
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `ZUCA_Financial_Report_${reportData.scopeLabel || reportData.startDate}.pdf`.replace(/\s+/g, "_"),
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(opt).from(element).save();
    showToast("PDF downloaded!");
  };

  const exportReportAsWord = () => {
    if (!reportData) return;
    const element = document.getElementById("report-content-for-export");
    if (!element) return;
    const styles = document.createElement("style");
    styles.textContent = `
      body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
      .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
      .report-header h2 { font-size: 24px; margin-bottom: 5px; }
      .report-summary { display: flex; justify-content: space-between; margin: 20px 0; }
      .summary-card { background: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px; flex: 1; margin: 0 10px; }
      .summary-amount { font-size: 24px; font-weight: bold; }
      .summary-card.income .summary-amount { color: #28a745; }
      .summary-card.expense .summary-amount { color: #dc3545; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f2f2f2; }
      .transaction-item.in { background: #d4edda; }
      .transaction-item.out { background: #f8d7da; }
      .footer { margin-top: 50px; text-align: center; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    `;
    const clone = element.cloneNode(true);
    clone.prepend(styles);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ZUCA Financial Report</title></head><body>${clone.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    saveAs(blob, `ZUCA_Financial_Report_${reportData.scopeLabel || reportData.startDate}.doc`.replace(/\s+/g, "_"));
    showToast("Word document downloaded!");
  };

  const getRunningBalance = () => {
    let balance = 0;
    return [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((t) => {
        if (t.type === "IN") balance += Number(t.amount);
        else balance -= Number(t.amount);
        return { ...t, runningBalance: balance };
      });
  };

  const transactionsWithBalance = getRunningBalance();

  const filteredTransactions = transactionsWithBalance.filter((t) => {
    if (dateRange.start && new Date(t.date) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(t.date) > new Date(dateRange.end)) return false;
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (projectFilter !== "all") {
      if (projectFilter === "none") {
        if (t.projectId) return false;
      } else if (t.projectId !== projectFilter) {
        return false;
      }
    }
    return true;
  });

  const totalMoneyIn = filteredTransactions.filter((t) => t.type === "IN").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalMoneyOut = filteredTransactions.filter((t) => t.type === "OUT").reduce((sum, t) => sum + Number(t.amount), 0);
  const currentBalance =
    filteredTransactions.length > 0
      ? filteredTransactions[filteredTransactions.length - 1].runningBalance
      : ledgerSummary.balance;

  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const resetTransactionForm = () => {
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "Contributions",
      type: "IN",
      amount: "",
      reference: "",
      notes: "",
      projectId: ""
    });
  };

  const handleTypeChange = (type) => {
    setNewTransaction({
      ...newTransaction,
      type,
      category: type === "IN" ? inCategories[0] : outCategories[0]
    });
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const amountNum = parseFloat(newTransaction.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Please enter a valid amount greater than 0", "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        date: newTransaction.date,
        description: newTransaction.description,
        category: newTransaction.category,
        type: newTransaction.type,
        amount: amountNum,
        reference: newTransaction.reference || null,
        notes: newTransaction.notes || null
      };
      if (newTransaction.projectId) payload.projectId = newTransaction.projectId;

      const response = await axios.post(`${BASE_URL}/api/treasurer/ledger`, payload, { headers });
      if (response.data.success) {
        await refreshData();
        resetTransactionForm();
        setShowAddTransaction(false);
        showToast("Transaction added successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add transaction", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      date: transaction.date.split("T")[0] || transaction.date,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount.toString(),
      reference: transaction.reference || "",
      notes: transaction.notes || "",
      projectId: transaction.projectId || ""
    });
    setShowAddTransaction(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    setIsUpdating(true);
    try {
      const payload = {
        date: newTransaction.date,
        description: newTransaction.description,
        category: newTransaction.category,
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        reference: newTransaction.reference || null,
        notes: newTransaction.notes || null,
        projectId: newTransaction.projectId || null
      };
      const response = await axios.put(
        `${BASE_URL}/api/treasurer/ledger/${editingTransaction.id}`,
        payload,
        { headers }
      );
      if (response.data.success) {
        await refreshData();
        setEditingTransaction(null);
        setShowAddTransaction(false);
        resetTransactionForm();
        showToast("Transaction updated successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update transaction", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${BASE_URL}/api/treasurer/ledger/${id}`, { headers });
      if (response.data.success) {
        await refreshData();
        showToast("Transaction deleted successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete transaction", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name || newProject.name.trim().length === 0) {
      showToast("Project name is required", "error");
      return;
    }
    setIsSavingProject(true);
    try {
      const payload = {
        name: newProject.name.trim(),
        description: newProject.description || null,
        targetAmount: newProject.targetAmount ? parseFloat(newProject.targetAmount) : null,
        startDate: newProject.startDate || null,
        endDate: newProject.endDate || null
      };
      const res = await axios.post(`${BASE_URL}/api/treasurer/projects`, payload, { headers });
      if (res.data.success) {
        await refreshData();
        setNewProject({ name: "", description: "", targetAmount: "", startDate: "", endDate: "" });
        setShowAddProject(false);
        showToast("Project created successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create project", "error");
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Delete this project? Linked transactions must be removed first.")) return;
    try {
      const res = await axios.delete(`${BASE_URL}/api/treasurer/projects/${projectId}`, { headers });
      if (res.data.success) {
        await refreshData();
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setProjectDetail(null);
        }
        showToast("Project deleted");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete project", "error");
    }
  };

  const exportToExcel = (data, filename, sheetName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportLedger = () => {
    const exportData = filteredTransactions.map((t) => ({
      Date: new Date(t.date).toLocaleDateString(),
      Description: t.description,
      Category: t.category,
      Project: t.project?.name || "",
      "Money IN": t.type === "IN" ? t.amount : "",
      "Money OUT": t.type === "OUT" ? t.amount : "",
      Balance: t.runningBalance,
      Reference: t.reference || "",
      Attachments: t.attachments?.length || 0
    }));
    exportToExcel(exportData, `treasurer_ledger_${new Date().toISOString().split("T")[0]}`, "Ledger");
    showToast("Ledger exported successfully");
  };

  const exportCampaigns = () => {
    const campaignStats = campaigns.map((campaign) => ({
      Campaign: campaign.title,
      "Target (KES)": campaign.target,
      "Collected (KES)": campaign.collected,
      "Pending (KES)": campaign.pending,
      "Paid Members": campaign.paidMembers,
      "Total Members": campaign.totalMembers,
      "Completion %": campaign.completion?.toFixed(1) || 0,
      Status: campaign.status
    }));
    exportToExcel(campaignStats, `campaign_report_${new Date().toISOString().split("T")[0]}`, "Campaigns");
    showToast("Campaign report exported successfully");
  };

  const exportMembers = () => {
    const exportData = members.map((m) => ({
      Name: m.name,
      "Membership #": m.membershipNumber || "-",
      Jumuia: m.jumuia,
      "Total Paid (KES)": m.total_paid,
      "Total Pending (KES)": m.total_pending,
      "Campaigns Participated": m.campaigns_participated,
      Status: m.status
    }));
    exportToExcel(exportData, `member_report_${new Date().toISOString().split("T")[0]}`, "Members");
    showToast("Member report exported successfully");
  };

  const openProjectDetail = (project) => {
    setSelectedProject(project);
    loadProjectDetail(project.id);
  };

  const closeProjectDetail = () => {
    setSelectedProject(null);
    setProjectDetail(null);
  };

  const isReadOnly = selectedSemester ? !selectedSemester.isActive && selectedSemester.isClosed : false;

  if (loading) {
    return (
      <div className="treasurer-reports-page">
        <SkeletonLoader />
        <style>{`
          .treasurer-reports-page { padding: 24px; background: #f8fafc; min-height: 100vh; }
          .skeleton-wrapper { max-width: 1400px; margin: 0 auto; }
          .skeleton-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .skeleton-back-btn, .skeleton-refresh-btn { width: 100px; height: 40px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
          .skeleton-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .skeleton-stat-card { height: 90px; background: white; border-radius: 12px; padding: 20px; border: 1px solid #e0e0e0; background-image: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; }
          .skeleton-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; }
          .skeleton-tab { width: 120px; height: 40px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
          .skeleton-table { background: white; border-radius: 12px; padding: 12px; }
          .skeleton-row { height: 50px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; margin-bottom: 10px; }
          @keyframes skeleton-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @media (max-width: 768px) { .skeleton-stats-grid { grid-template-columns: 1fr; } .skeleton-tab { width: 80px; height: 35px; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="treasurer-reports">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="reports-header">
        <h1>ZUCA Treasury Reports</h1>
        {allSemesters.length > 0 && (
          <div className="semester-switcher">
            <div
              className="semester-pill"
              onClick={() => setShowSemesterDropdown(!showSemesterDropdown)}
              style={{ cursor: "pointer" }}
            >
              <span className="semester-pill-icon">📅</span>
              <span className="semester-pill-text">
                {allSemesters.find((s) => s.id === selectedSemesterId)?.title || "Select Semester"}
              </span>
              <span className="semester-pill-chevron">{showSemesterDropdown ? "▲" : "▼"}</span>
            </div>

            {showSemesterDropdown && (
              <div className="semester-dropdown">
                {allSemesters.map((sem) => (
                  <div
                    key={sem.id}
                    className={`semester-option ${sem.id === selectedSemesterId ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedSemesterId(sem.id);
                      setShowSemesterDropdown(false);
                      setClosedBannerDismissed(false);
                    }}
                  >
                    <div className="semester-option-main">
                      <span className="semester-option-title">{sem.title}</span>
                      <span className={`semester-option-status status-${sem.status.toLowerCase()}`}>
                        {sem.status}
                      </span>
                    </div>
                    <span className="semester-option-dates">
                      {new Date(sem.startDate).toLocaleDateString()} – {new Date(sem.endDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <p>All cash flow, projects, campaigns, and member contributions</p>
      </div>

      <div className="stats-grid stats-grid-4">
        <div className="stat-card opening">
          <div className="stat-icon">◈</div>
          <div className="stat-info">
            <span className="stat-value">KES {(ledgerSummary.openingBalance || 0).toLocaleString()}</span>
            <span className="stat-label">Opening Balance</span>
          </div>
        </div>
        <div className="stat-card in">
          <div className="stat-icon">↳</div>
          <div className="stat-info">
            <span className="stat-value">KES {totalMoneyIn.toLocaleString()}</span>
            <span className="stat-label">Total Money IN</span>
          </div>
        </div>
        <div className="stat-card out">
          <div className="stat-icon">⤵︎</div>
          <div className="stat-info">
            <span className="stat-value">KES {totalMoneyOut.toLocaleString()}</span>
            <span className="stat-label">Total Money OUT</span>
          </div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <span className="stat-value">KES {currentBalance.toLocaleString()}</span>
            <span className="stat-label">Current Balance</span>
          </div>
        </div>
      </div>

      {isReadOnly && !closedBannerDismissed && (
        <div className="closed-semester-banner">
          <div className="closed-banner-left">
            <FaLock size={20} />
            <div>
              <strong>This semester's books are closed.</strong>
              <p>You can view all data but edits are disabled.</p>
            </div>
          </div>
          <div className="closed-banner-actions">
            <button className="btn-reopen-semester" onClick={() => setShowReopenModal(true)}>
              Reopen Semester
            </button>
            <button className="btn-dismiss-banner" onClick={() => setClosedBannerDismissed(true)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => setActiveTab("ledger")}
        >
          <span><FaBook /></span> Cash Ledger
        </button>
        <button
          className={`tab-btn ${activeTab === "projects" ? "active" : ""}`}
          onClick={() => setActiveTab("projects")}
        >
          <span><FaFolder /></span> Projects
        </button>
        <button
          className={`tab-btn ${activeTab === "report" ? "active" : ""}`}
          onClick={() => setActiveTab("report")}
        >
          <span><FaRegFilePowerpoint /></span> Financial Report
        </button>
        <button
          className={`tab-btn ${activeTab === "campaigns" ? "active" : ""}`}
          onClick={() => setActiveTab("campaigns")}
        >
          <span><FaRegFileAlt /></span> Activity & Audit
        </button>
        <button
          className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          <span><FaUser /></span> Members
        </button>
      </div>

      {activeTab === "ledger" && (
        <div className="ledger-tab">
          <div className="ledger-actions">
            <div className="ledger-filters">
              <input
                type="date"
                className="filter-input"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="filter-sep">to</span>
              <input
                type="date"
                className="filter-input"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
              <input
                type="text"
                className="filter-input"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="filter-input filter-select"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">All Projects</option>
                <option value="none">No Project (General)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="ledger-buttons">
              <button
                className="btn-add"
                onClick={() => setShowAddTransaction(true)}
                disabled={isReadOnly}
                title={isReadOnly ? "Reopen semester to edit" : ""}
              >
                <FaPlus /> Add Transaction
              </button>
              <button className="btn-export" onClick={exportLedger}>📎 Export</button>
            </div>
          </div>

          <div className="ledger-table-container">
            {isMobile ? (
              <div className="mobile-cards">
                {filteredTransactions.length === 0 ? (
                  <div className="empty-row">No transactions found</div>
                ) : (
                  filteredTransactions.map((t) => (
                    <div key={t.id} className={`mobile-card ${t.type === "IN" ? "in-card" : "out-card"}`}>
                      <div className="card-header">
                        <span className="card-date">{new Date(t.date).toLocaleDateString()}</span>
                        <div className="card-actions-mobile">
                          <button className="edit-btn" onClick={() => handleEditTransaction(t)} disabled={isDeleting || isReadOnly}><FaEdit /></button>
                          <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)} disabled={isDeleting || isReadOnly}>
                            {isDeleting ? "⏳" : "🗑️"}
                          </button>
                        </div>
                      </div>
                      <div className="card-description">{t.description}</div>
                      <div className="card-category">
                        {t.category}
                        {t.project && <span className="project-badge-inline">{t.project.name}</span>}
                        {t.attachments && t.attachments.length > 0 && (
                          <span
                            className="attachment-badge-inline"
                            onClick={() => window.open(t.attachments[0].cloudinaryUrl, "_blank")}
                          >
                            📎 {t.attachments.length}
                          </span>
                        )}
                      </div>
                      <div className="card-amounts">
                        {t.type === "IN" ? (
                          <span className="amount-in">+ KES {t.amount?.toLocaleString()}</span>
                        ) : (
                          <span className="amount-out">- KES {t.amount?.toLocaleString()}</span>
                        )}
                        <span className="card-balance">Balance: KES {t.runningBalance?.toLocaleString()}</span>
                      </div>
                      {t.reference && <div className="card-reference">Ref: {t.reference}</div>}
                      {t.notes && (
                        <div className="card-notes">
                          <FaStickyNote /> {t.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Project</th>
                      <th>Money IN</th>
                      <th>Money OUT</th>
                      <th>Balance</th>
                      <th>Docs</th>
                      <th>Reference</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="empty-row">No transactions found</td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className={t.type === "IN" ? "in-row" : "out-row"}>
                          <td>{new Date(t.date).toLocaleDateString()}</td>
                          <td>{t.description}</td>
                          <td>{t.category}</td>
                          <td>
                            {t.project ? (
                              <span className="project-badge">{t.project.name}</span>
                            ) : (
                              <span className="project-badge project-badge-none">—</span>
                            )}
                          </td>
                          <td className="amount-in">
                            {t.type === "IN" ? `KES ${t.amount?.toLocaleString()}` : "-"}
                          </td>
                          <td className="amount-out">
                            {t.type === "OUT" ? `KES ${t.amount?.toLocaleString()}` : "-"}
                          </td>
                          <td className="amount-balance">KES {t.runningBalance?.toLocaleString()}</td>
                          <td>
                            {t.attachments && t.attachments.length > 0 ? (
                              <button
                                type="button"
                                className="attachment-badge"
                                onClick={() => window.open(t.attachments[0].cloudinaryUrl, "_blank")}
                                title={`${t.attachments.length} attachment(s)`}
                              >
                                📎 {t.attachments.length}
                              </button>
                            ) : (
                              <span className="attachment-badge attachment-badge-none">—</span>
                            )}
                          </td>
                          <td>{t.reference || "-"}</td>
                          <td className="actions">
                            <button
                              className="edit-btn"
                              onClick={() => handleEditTransaction(t)}
                              disabled={isDeleting || isReadOnly}
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteTransaction(t.id)}
                              disabled={isDeleting || isReadOnly}
                            >
                              {isDeleting ? "⏳ Deleting..." : "🗑️ Delete"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td colSpan="4"><strong>TOTALS</strong></td>
                      <td className="amount-in"><strong>KES {totalMoneyIn.toLocaleString()}</strong></td>
                      <td className="amount-out"><strong>KES {totalMoneyOut.toLocaleString()}</strong></td>
                      <td className="amount-balance"><strong>KES {currentBalance.toLocaleString()}</strong></td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="projects-tab">
          <div className="projects-actions">
            <div>
              <h3><FaFolderOpenSolid /> Projects</h3>
              <p>Track contributions and expenses per project</p>
            </div>
            <button
              className="btn-add"
              onClick={() => setShowAddProject(true)}
              disabled={isReadOnly}
              title={isReadOnly ? "Reopen semester to edit" : ""}
            >
              <FaPlus /> New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="projects-empty">
              <FaFolder size={48} />
              <h3>No projects yet</h3>
              <p>Create your first project to start tracking contributions and expenses.</p>
              <button className="btn-add" onClick={() => setShowAddProject(true)}>
                <FaPlus /> Create Project
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((p) => (
                <motion.div
                  key={p.id}
                  className="project-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => openProjectDetail(p)}
                >
                  <div className="project-card-header">
                    <h4>{p.name}</h4>
                    <span className={`project-status project-status-${p.status?.toLowerCase()}`}>
                      {p.status}
                    </span>
                  </div>
                  {p.description && <p className="project-card-desc">{p.description}</p>}
                  <div className="project-card-stats">
                    <div className="project-stat in">
                      <span className="project-stat-label">In</span>
                      <span className="project-stat-value">KES {(p.contributionsIn || 0).toLocaleString()}</span>
                    </div>
                    <div className="project-stat out">
                      <span className="project-stat-label">Out</span>
                      <span className="project-stat-value">KES {(p.expensesOut || 0).toLocaleString()}</span>
                    </div>
                    <div className="project-stat net">
                      <span className="project-stat-label">Net</span>
                      <span className={`project-stat-value ${p.net >= 0 ? "positive" : "negative"}`}>
                        KES {(p.net || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {p.targetAmount && (
                    <div className="project-progress">
                      <div className="project-progress-bar">
                        <div
                          className="project-progress-fill"
                          style={{ width: `${Math.min(p.completion || 0, 100)}%` }}
                        />
                      </div>
                      <span className="project-progress-text">
                        {(p.completion || 0).toFixed(1)}% of KES {p.targetAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="project-card-footer">
                    <span className="project-tx-count">{p.transactionCount} transactions</span>
                    <ChevronRight size={16} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "report" && (
        <div className="report-tab">
          <div className="report-generator">
            <h3><FaRegFilePowerpoint /> Generate Financial Report</h3>

            <div className="report-scope-tabs">
              <button
                className={`scope-tab ${reportScope === "semester" ? "active" : ""}`}
                onClick={() => setReportScope("semester")}
              >
                By Semester
              </button>
              <button
                className={`scope-tab ${reportScope === "year" ? "active" : ""}`}
                onClick={() => setReportScope("year")}
              >
                By Year
              </button>
              <button
                className={`scope-tab ${reportScope === "custom" ? "active" : ""}`}
                onClick={() => setReportScope("custom")}
              >
                Custom Range
              </button>
              <button
                className={`scope-tab ${reportScope === "project" ? "active" : ""}`}
                onClick={() => setReportScope("project")}
              >
                By Project
              </button>
            </div>

            <div className="report-scope-body">
              {reportScope === "semester" && (
                <div className="scope-row">
                  <label>Semester</label>
                  <select
                    value={selectedSemesterId || ""}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                  >
                    {allSemesters.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportScope === "year" && (
                <div className="scope-row">
                  <label>Year</label>
                  <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportScope === "custom" && (
                <div className="scope-row">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                  />
                  <label>End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                  />
                </div>
              )}

              {reportScope === "project" && (
                <div className="scope-row">
                  <label>Project</label>
                  <select
                    value={reportProjectId || ""}
                    onChange={(e) => setReportProjectId(e.target.value || null)}
                  >
                    <option value="">— Select project —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="report-actions">
              <button className="btn-generate" onClick={generateReport} disabled={generatingReport}>
                {generatingReport ? <span className="spinner-small"></span> : <Calendar size={16} />}
                {generatingReport ? "Generating..." : "Generate Report"}
              </button>
              {reportData && (
                <>
                  <button className="btn-export-pdf" onClick={exportReportAsPDF}>
                    <Download size={16} /> Download PDF
                  </button>
                  <button className="btn-export-word" onClick={exportReportAsWord}>
                    <FileText size={16} /> Download Word
                  </button>
                </>
              )}
            </div>
          </div>

          {reportData && (
            <div className="report-preview">
              <div id="report-content-for-export" className="report-content">
                <div className="report-header">
                  <h2>ZUCA TREASURY FINANCIAL REPORT</h2>
                  {reportData.scopeLabel && (
                    <p className="report-scope-label">{reportData.scopeLabel}</p>
                  )}
                  <p>Period: {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}</p>
                  <p>Generated: {reportData.generatedOn}</p>
                </div>

                <div className="report-summary">
                  <div className="summary-card income">
                    <div className="summary-details">
                      <span className="summary-label">Total Income</span>
                      <span className="summary-amount">KES {reportData.totalIn.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="summary-card expense">
                    <div className="summary-details">
                      <span className="summary-label">Total Expenses</span>
                      <span className="summary-amount">KES {reportData.totalOut.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={`summary-card balance ${reportData.balance >= 0 ? "positive" : "negative"}`}>
                    <div className="summary-details">
                      <span className="summary-label">Net Balance</span>
                      <span className="summary-amount">KES {reportData.balance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="report-narrative">
                  <h3>Executive Summary</h3>
                  <p>
                    This financial report covers the period from <strong>{new Date(reportData.startDate).toLocaleDateString()}</strong> to <strong>{new Date(reportData.endDate).toLocaleDateString()}</strong>. During this period, the treasury processed <strong>{reportData.transactionCount} transactions</strong>.
                  </p>
                  <p>
                    Total income received was <strong>KES {reportData.totalIn.toLocaleString()}</strong>, while total expenses incurred were <strong>KES {reportData.totalOut.toLocaleString()}</strong>. This results in a net <strong>{reportData.balance >= 0 ? "surplus" : "deficit"}</strong> of <strong>KES {Math.abs(reportData.balance).toLocaleString()}</strong>.
                  </p>
                  <p>
                    ZUCA is currently in a <strong>{reportData.balance >= 0 ? "positive" : "negative"}</strong> financial position with a closing balance of <strong>KES {reportData.balance.toLocaleString()}</strong>.
                  </p>
                </div>

                {Object.keys(reportData.incomeByCategory).length > 0 && (
                  <div className="report-breakdown">
                    <div className="breakdown-section">
                      <h3>Income by Category</h3>
                      <ul>
                        {Object.entries(reportData.incomeByCategory).map(([cat, amount]) => (
                          <li key={cat}>
                            <span>{cat}</span>
                            <span>KES {amount.toLocaleString()} ({((amount / reportData.totalIn) * 100).toFixed(1)}%)</span>
                          </li>
                        ))}
                      </ul>
                      <div className="breakdown-total">Total: KES {reportData.totalIn.toLocaleString()}</div>
                    </div>
                    <div className="breakdown-section">
                      <h3>Expenses by Category</h3>
                      <ul>
                        {Object.entries(reportData.expenseByCategory).map(([cat, amount]) => (
                          <li key={cat}>
                            <span>{cat}</span>
                            <span>KES {amount.toLocaleString()} ({((amount / reportData.totalOut) * 100).toFixed(1)}%)</span>
                          </li>
                        ))}
                      </ul>
                      <div className="breakdown-total">Total: KES {reportData.totalOut.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                <div className="report-transactions">
                  <h3>Transaction History</h3>
                  <div className="transactions-list">
                    {reportData.transactions.map((t, idx) => (
                      <div key={idx} className={`transaction-item ${t.type === "IN" ? "in" : "out"}`}>
                        <div className="transaction-date">{new Date(t.date).toLocaleDateString()}</div>
                        <div className="transaction-description">{t.description}</div>
                        <div className="transaction-category">{t.category}</div>
                        <div className={`transaction-amount ${t.type === "IN" ? "in" : "out"}`}>
                          {t.type === "IN" ? "+" : "-"} KES {t.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-footer">
                  <p>This is an auto-generated report from ZUCA Portal Treasury System.</p>
                  <p>All amounts are in Kenyan Shillings (KES)</p>
                </div>
              </div>
            </div>
          )}

          {!reportData && !generatingReport && (
            <div className="report-placeholder">
              <FileText size={48} />
              <h3>No Report Generated Yet</h3>
              <p>Choose a scope and click "Generate Report" to view the financial summary</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "campaigns" && (
        <div className="audit-tab">
          <div className="audit-header">
            <h2><FaBook /> Ledger Activity & Audit Trail</h2>
            <p>Complete history of all transactions, edits, and deletions</p>
          </div>

          <div className="overall-summary-card">
            <h3>Overall Financial Health</h3>
            <div className="summary-stats">
              <div className="stat-badge in">Total IN: KES {totalMoneyIn.toLocaleString()}</div>
              <div className="stat-badge out">Total OUT: KES {totalMoneyOut.toLocaleString()}</div>
              <div className="stat-badge balance">Balance: KES {currentBalance.toLocaleString()}</div>
            </div>
          </div>

          <div className="audit-trail-card">
            <h3>🔒 Audit Trail</h3>
            <p className="audit-warning">⚠️ Every create, edit, and delete operation is logged below.</p>
            {auditLogs.length === 0 ? (
              <div className="audit-empty">No changes recorded yet.</div>
            ) : (
              <div className="audit-timeline">
                {auditLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    className={`audit-item audit-${log.action?.toLowerCase()}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <div className="audit-header-row">
                      <div className="audit-action">
                        {log.action === "CREATE" && "CREATED"}
                        {log.action === "UPDATE" && "UPDATED"}
                        {log.action === "DELETE" && "DELETED"}
                        {log.action?.startsWith("PROJECT_") && log.action.replace("PROJECT_", "PROJECT ")}
                      </div>
                      <div className="audit-time">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="audit-details">
                      <div className="audit-performed-by">
                        <FaUser /> By: <strong>{log.performedByName || "Unknown"}</strong>
                      </div>
                      {log.action === "CREATE" && log.newData && (
                        <div className="audit-changes">
                          <div className="change-highlight">
                            Added: <strong>{log.newData.description || log.newData.name}</strong>
                          </div>
                          {log.newData.amount && (
                            <div className="change-details">Amount: KES {log.newData.amount?.toLocaleString()} | Type: {log.newData.type}</div>
                          )}
                        </div>
                      )}
                      {log.action === "UPDATE" && log.changedFields && log.changedFields.length > 0 && (
                        <div className="audit-changes">
                          <div className="change-warning">⚠️ Changes:</div>
                          {log.changedFields.map((change, i) => (
                            <div key={i} className="change-diff">
                              <span className="field-name">{change.field}:</span>
                              <span className="old-value">"{change.oldValue}"</span> → <span className="new-value">"{change.newValue}"</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {log.action === "DELETE" && log.oldData && (
                        <div className="audit-changes">
                          <div className="change-critical">DELETED: {log.oldData.description || log.oldData.name}</div>
                          {log.oldData.amount && (
                            <div className="change-details">Amount: KES {log.oldData.amount?.toLocaleString()}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="members-tab">
          <div className="member-actions">
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            <button className="btn-export" onClick={exportMembers}>📎 Export</button>
          </div>
          <div className="member-table-container">
            {isMobile ? (
              <div className="mobile-cards">
                {filteredMembers.map((m) => (
                  <div key={m.id} className="member-mobile-card">
                    <div className="member-name">{m.name}</div>
                    <div>🆔 {m.membershipNumber || "No membership"}</div>
                    <div>🏠 {m.jumuia}</div>
                    <div className="amount-in">💰 Paid: KES {m.total_paid?.toLocaleString()}</div>
                    <div className="amount-out">⏳ Pending: KES {m.total_pending?.toLocaleString()}</div>
                    <span className={`status-badge ${m.status?.toLowerCase().replace(" ", "-")}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="member-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Membership</th>
                      <th>Jumuia</th>
                      <th>Paid</th>
                      <th>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>{m.membershipNumber || "-"}</td>
                        <td>{m.jumuia}</td>
                        <td className="amount-in">KES {m.total_paid?.toLocaleString()}</td>
                        <td className="amount-out">KES {m.total_pending?.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${m.status?.toLowerCase().replace(" ", "-")}`}>{m.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddTransaction(false);
              setEditingTransaction(null);
              resetTransactionForm();
            }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</h3>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Transaction Type</label>
                <div className="type-buttons">
                  <button
                    className={`type-btn ${newTransaction.type === "IN" ? "active-in" : ""}`}
                    onClick={() => handleTypeChange("IN")}
                  >
                    Money IN
                  </button>
                  <button
                    className={`type-btn ${newTransaction.type === "OUT" ? "active-out" : ""}`}
                    onClick={() => handleTypeChange("OUT")}
                  >
                    Money OUT
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Enter description"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {(newTransaction.type === "IN" ? inCategories : outCategories).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount (KES)</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Project (optional)</label>
                <select
                  value={newTransaction.projectId}
                  onChange={(e) => setNewTransaction({ ...newTransaction, projectId: e.target.value })}
                >
                  <option value="">No Project (General)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="Receipt #"
                  value={newTransaction.reference}
                  onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  placeholder="Additional notes..."
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddTransaction(false);
                    setEditingTransaction(null);
                    resetTransactionForm();
                  }}
                  disabled={isSaving || isUpdating}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
                  disabled={isSaving || isUpdating}
                >
                  {(isSaving || isUpdating) ? (
                    <>
                      <span className="spinner-small"></span>
                      {editingTransaction ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    editingTransaction ? "Update" : "Save"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Project Modal */}
      <AnimatePresence>
        {showAddProject && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddProject(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Create New Project</h3>

              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Trip to Subukia"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="What is this project about?"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Target Amount (KES)</label>
                <input
                  type="number"
                  placeholder="e.g., 50000"
                  value={newProject.targetAmount}
                  onChange={(e) => setNewProject({ ...newProject, targetAmount: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowAddProject(false)} disabled={isSavingProject}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleAddProject} disabled={isSavingProject}>
                  {isSavingProject ? (
                    <>
                      <span className="spinner-small"></span>Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeProjectDetail}
          >
            <motion.div
              className="modal-content modal-content-large"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-project-header">
                <div>
                  <h3>{selectedProject.name}</h3>
                  {selectedProject.description && <p>{selectedProject.description}</p>}
                </div>
                <button className="modal-close-btn" onClick={closeProjectDetail}>
                  <FaTimes />
                </button>
              </div>

              {loadingProjectDetail ? (
                <div className="project-detail-loading">Loading...</div>
              ) : projectDetail ? (
                <>
                  <div className="project-detail-stats">
                    <div className="project-detail-stat in">
                      <span>IN</span>
                      <strong>KES {(projectDetail.contributionsIn || 0).toLocaleString()}</strong>
                    </div>
                    <div className="project-detail-stat out">
                      <span>OUT</span>
                      <strong>KES {(projectDetail.expensesOut || 0).toLocaleString()}</strong>
                    </div>
                    <div className="project-detail-stat net">
                      <span>NET</span>
                      <strong className={projectDetail.net >= 0 ? "positive" : "negative"}>
                        KES {(projectDetail.net || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="project-detail-transactions">
                    <h4>Transactions ({projectDetail.transactionCount})</h4>
                    {projectDetail.transactions?.length === 0 ? (
                      <div className="empty-row">No transactions yet</div>
                    ) : (
                      <div className="project-detail-tx-list">
                        {projectDetail.transactions?.map((t) => (
                          <div key={t.id} className={`project-detail-tx ${t.type === "IN" ? "in" : "out"}`}>
                            <div className="project-detail-tx-date">{new Date(t.date).toLocaleDateString()}</div>
                            <div className="project-detail-tx-desc">{t.description}</div>
                            <div className={`project-detail-tx-amount ${t.type === "IN" ? "amount-in" : "amount-out"}`}>
                              {t.type === "IN" ? "+" : "-"} KES {t.amount?.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              <div className="modal-actions">
                <button className="btn-delete" onClick={() => handleDeleteProject(selectedProject.id)}>
                  Delete Project
                </button>
                <button className="btn-cancel" onClick={closeProjectDetail}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reopen Semester Modal */}
      <AnimatePresence>
        {showReopenModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowReopenModal(false);
              setReopenReason("");
            }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Reopen Semester</h3>
              <p style={{ color: "#64748b", marginBottom: 20, fontSize: 13 }}>
                Reopening <strong>{selectedSemester?.title}</strong> will unlock its books for editing.
                All changes will be logged in the audit trail.
              </p>

              <div className="form-group">
                <label>Reason for reopening *</label>
                <textarea
                  placeholder="e.g., Missing expense from March 2026"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowReopenModal(false);
                    setReopenReason("");
                  }}
                  disabled={reopenLoading}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={async () => {
                    if (reopenReason.trim().length < 5) {
                      showToast("Please provide a reason (min 5 characters)", "error");
                      return;
                    }
                    setReopenLoading(true);
                    try {
                      const res = await axios.post(
                        `${BASE_URL}/api/treasurer/semester/${selectedSemesterId}/reopen`,
                        { reason: reopenReason.trim() },
                        { headers }
                      );
                      if (res.data.success) {
                        showToast("Semester reopened successfully");
                        setShowReopenModal(false);
                        setReopenReason("");
                        setClosedBannerDismissed(true);

                        const listRes = await axios.get(`${BASE_URL}/api/treasurer/semester/list`, { headers });
                        if (listRes.data.success) setAllSemesters(listRes.data.semesters);

                        await fetchData();
                      }
                    } catch (err) {
                      showToast(err.response?.data?.error || "Failed to reopen semester", "error");
                    } finally {
                      setReopenLoading(false);
                    }
                  }}
                  disabled={reopenLoading}
                >
                  {reopenLoading ? <><span className="spinner-small"></span>Reopening...</> : "Reopen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .treasurer-reports { padding: 24px; max-width: 1400px; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .back-btn, .refresh-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; font-size: 14px; }
        .back-btn:hover, .refresh-btn:hover { background: #f1f5f9; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .reports-header { text-align: center; margin-bottom: 30px; }
        .reports-header h1 { font-size: 26px; margin-bottom: 8px; color: #0f172a; }
        .reports-header p { color: #64748b; font-size: 14px; }

        .semester-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          color: #1e40af;
          font-size: 13px;
          font-weight: 600;
          margin: 12px 0;
        }
        .semester-pill-icon { font-size: 14px; }
        .semester-pill-text { text-transform: uppercase; letter-spacing: 0.5px; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 14px; padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border-left: 4px solid transparent; }
        .stat-card.opening { border-left-color: #8b5cf6; }
        .stat-card.in { border-left-color: #10b981; }
        .stat-card.out { border-left-color: #ef4444; }
        .stat-card.balance { border-left-color: #3b82f6; }
        .stat-icon { font-size: 24px; width: 48px; height: 48px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-value { font-size: 16px; font-weight: 800; display: block; color: #0f172a; line-height: 1.2; }
        .stat-label { font-size: 12px; color: #64748b; }

        .tab-navigation { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; flex-wrap: wrap; }
        .tab-btn { padding: 12px 18px; background: none; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; color: #64748b; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s ease; }
        .tab-btn:hover { color: #3b82f6; }
        .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; }

        .ledger-actions { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .ledger-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .filter-sep { color: #64748b; font-size: 13px; }
        .filter-input { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: white; }
        .filter-select { min-width: 180px; cursor: pointer; }
        .ledger-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-add, .btn-export { padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 6px; }
        .btn-add { background: #3b82f6; color: white; }
        .btn-add:hover { background: #2563eb; }
        .btn-export { background: #10b981; color: white; }
        .btn-export:hover { background: #059669; }
        .btn-add:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.5); }

        .table-scroll { overflow-x: auto; border-radius: 12px; }
        .ledger-table, .member-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-width: 900px; }
        .member-table { min-width: 500px; }
        .ledger-table th, .member-table th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; }
        .ledger-table td, .member-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .in-row { background: #f0fdf4; }
        .out-row { background: #fef2f2; }
        .amount-in { color: #10b981; font-weight: 600; }
        .amount-out { color: #ef4444; font-weight: 600; }
        .amount-balance { font-weight: 600; color: #0f172a; }

        .project-badge { display: inline-block; padding: 3px 10px; background: #eef2ff; color: #4338ca; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .project-badge-none { background: transparent; color: #94a3b8; }
        .project-badge-inline { display: inline-block; margin-left: 8px; padding: 2px 8px; background: #eef2ff; color: #4338ca; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .attachment-badge { padding: 4px 10px; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .attachment-badge:hover { background: #fde68a; }
        .attachment-badge-none { background: transparent; border: none; color: #cbd5e1; cursor: default; }
        .attachment-badge-inline { display: inline-block; margin-left: 8px; padding: 2px 8px; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; }

        .edit-btn, .delete-btn { padding: 5px 9px; margin: 0 3px; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; }
        .edit-btn { background: #dbeafe; color: #1d4ed8; }
        .delete-btn { background: #fee2e2; color: #b91c1c; }

        .totals-row { background: #f8fafc; font-weight: 700; }
        .totals-row td { border-top: 2px solid #e2e8f0; border-bottom: none; }
        .empty-row { padding: 40px; text-align: center; color: #94a3b8; }

        .projects-tab { padding: 8px 0; }
        .projects-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .projects-actions h3 { margin: 0; display: flex; align-items: center; gap: 10px; color: #0f172a; }
        .projects-actions p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .projects-empty { text-align: center; padding: 60px 20px; background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .projects-empty h3 { margin: 16px 0 8px; color: #64748b; }
        .projects-empty p { color: #94a3b8; margin-bottom: 20px; }
        .projects-empty svg { color: #cbd5e1; }

        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .project-card { background: white; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.2s ease; border: 1px solid #f1f5f9; }
        .project-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #e2e8f0; }
        .project-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .project-card-header h4 { margin: 0; font-size: 16px; color: #0f172a; }
        .project-status { padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .project-status-open { background: #dbeafe; color: #1e40af; }
        .project-status-completed { background: #d1fae5; color: #065f46; }
        .project-status-cancelled { background: #fee2e2; color: #991b1b; }
        .project-card-desc { color: #64748b; font-size: 13px; margin: 0 0 16px; line-height: 1.5; }
        .project-card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .project-stat { display: flex; flex-direction: column; padding: 10px; background: #f8fafc; border-radius: 8px; }
        .project-stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px; }
        .project-stat-value { font-size: 13px; font-weight: 700; color: #0f172a; }
        .project-stat-value.positive { color: #10b981; }
        .project-stat-value.negative { color: #ef4444; }
        .project-progress { margin-bottom: 14px; }
        .project-progress-bar { height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
        .project-progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 999px; transition: width 0.3s ease; }
        .project-progress-text { font-size: 11px; color: #64748b; }
        .project-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 12px; }

        .report-tab { padding: 8px 0; }
        .report-generator { background: white; border-radius: 14px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .report-generator h3 { margin: 0 0 18px; color: #0f172a; display: flex; align-items: center; gap: 10px; }

        .report-scope-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .scope-tab { padding: 8px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #475569; }
        .scope-tab.active { background: #1e40af; color: white; border-color: #1e40af; }

        .report-scope-body { margin-bottom: 16px; }
        .scope-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .scope-row label { font-size: 13px; font-weight: 600; color: #334155; }
        .scope-row select, .scope-row input[type="date"] { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: white; }

        .report-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-generate { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-export-pdf { background: #ef4444; color: white; display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-export-word { background: #3b82f6; color: white; display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }

        .report-preview { background: white; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .report-content { max-width: 900px; margin: 0 auto; }
        .report-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .report-header h2 { color: #0f172a; margin-bottom: 8px; }
        .report-header p { color: #64748b; font-size: 14px; margin: 4px 0; }
        .report-scope-label { color: #1e40af !important; font-weight: 600; }
        .report-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
        .summary-card { background: #f8fafc; border-radius: 12px; padding: 16px; }
        .summary-details { display: flex; flex-direction: column; }
        .summary-label { font-size: 12px; color: #64748b; }
        .summary-amount { font-size: 20px; font-weight: 700; }
        .summary-card.income .summary-amount { color: #10b981; }
        .summary-card.expense .summary-amount { color: #ef4444; }
        .summary-card.positive .summary-amount { color: #10b981; }
        .summary-card.negative .summary-amount { color: #ef4444; }
        .report-narrative { background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .report-narrative h3 { margin-bottom: 12px; color: #0f172a; }
        .report-narrative p { margin: 8px 0; line-height: 1.6; color: #334155; }
        .report-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .breakdown-section { background: #f8fafc; border-radius: 12px; padding: 20px; }
        .breakdown-section h3 { margin-bottom: 15px; color: #0f172a; }
        .breakdown-section ul { list-style: none; padding: 0; margin: 0; }
        .breakdown-section li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; gap: 8px; }
        .breakdown-total { margin-top: 15px; padding-top: 10px; font-weight: 700; text-align: right; border-top: 2px solid #e2e8f0; }
        .report-transactions { margin-bottom: 30px; }
        .report-transactions h3 { margin-bottom: 15px; color: #0f172a; }
        .transactions-list { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .transaction-item { display: flex; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: white; gap: 10px; }
        .transaction-item:last-child { border-bottom: none; }
        .transaction-item.in { background: #f0fdf4; }
        .transaction-item.out { background: #fef2f2; }
        .transaction-date { width: 100px; font-size: 12px; color: #64748b; flex-shrink: 0; }
        .transaction-description { flex: 2; font-weight: 500; font-size: 13px; }
        .transaction-category { flex: 1; font-size: 12px; color: #64748b; }
        .transaction-amount { width: 120px; text-align: right; font-weight: 600; font-size: 13px; }
        .transaction-amount.in { color: #10b981; }
        .transaction-amount.out { color: #ef4444; }
        .report-footer { text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
        .report-placeholder { text-align: center; padding: 60px 20px; background: white; border-radius: 14px; }
        .report-placeholder h3 { margin: 16px 0 8px; color: #64748b; }
        .report-placeholder p { color: #94a3b8; }
        .report-placeholder svg { color: #cbd5e1; }

        .audit-tab { padding: 8px 0; }
        .audit-header { margin-bottom: 20px; }
        .audit-header h2 { margin: 0 0 6px; display: flex; align-items: center; gap: 10px; color: #0f172a; }
        .audit-header p { color: #64748b; margin: 0; font-size: 13px; }
        .overall-summary-card, .audit-trail-card { background: white; border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .overall-summary-card h3, .audit-trail-card h3 { margin: 0 0 14px; color: #0f172a; }
        .summary-stats { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-badge { padding: 8px 16px; border-radius: 999px; font-weight: 600; font-size: 13px; }
        .stat-badge.in { background: #dcfce7; color: #065f46; }
        .stat-badge.out { background: #fee2e2; color: #991b1b; }
        .stat-badge.balance { background: #eff6ff; color: #1e40af; }
        .audit-warning { background: #fef3c7; padding: 10px; border-radius: 8px; color: #92400e; margin-bottom: 20px; font-size: 13px; }
        .audit-empty { padding: 30px; text-align: center; color: #94a3b8; }
        .audit-timeline { max-height: 500px; overflow-y: auto; }
        .audit-item { padding: 14px; margin-bottom: 12px; border-radius: 10px; border-left: 4px solid; background: #f8fafc; }
        .audit-create { border-left-color: #10b981; background: #f0fdf4; }
        .audit-update { border-left-color: #f59e0b; background: #fffbeb; }
        .audit-delete { border-left-color: #ef4444; background: #fef2f2; }
        .audit-header-row { display: flex; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
        .audit-action { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .audit-time { font-size: 11px; color: #64748b; }
        .audit-performed-by { font-size: 12px; margin-bottom: 8px; color: #475569; }
        .audit-changes { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .change-highlight { font-size: 13px; }
        .change-details { font-size: 12px; color: #64748b; margin-top: 4px; }
        .change-warning { font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 4px; }
        .change-critical { font-size: 13px; color: #991b1b; font-weight: 600; }
        .change-diff { font-size: 12px; padding: 4px 0; font-family: monospace; }
        .field-name { font-weight: 700; color: #3b82f6; margin-right: 6px; }
        .old-value { color: #dc2626; text-decoration: line-through; margin-right: 6px; }
        .new-value { color: #10b981; font-weight: 700; }

        .member-actions { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .member-actions input { flex: 1; min-width: 200px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
        .status-badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .status-badge.completed { background: #dcfce7; color: #065f46; }
        .status-badge.partial { background: #fef3c7; color: #92400e; }
        .status-badge.pledged { background: #dbeafe; color: #1e40af; }
        .status-badge.no-pledge { background: #f1f5f9; color: #64748b; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .modal-content { background: white; border-radius: 14px; padding: 24px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
        .modal-content-large { max-width: 720px; }
        .modal-content h3 { margin: 0 0 20px; color: #0f172a; }
        .modal-project-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px; }
        .modal-project-header h3 { margin: 0 0 4px; }
        .modal-project-header p { margin: 0; color: #64748b; font-size: 13px; }
        .modal-close-btn { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; }
        .modal-close-btn:hover { background: #e2e8f0; }

        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #334155; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .type-buttons { display: flex; gap: 10px; }
        .type-btn { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-weight: 500; font-size: 13px; }
        .type-btn.active-in { background: #10b981; color: white; border-color: #10b981; }
        .type-btn.active-out { background: #ef4444; color: white; border-color: #ef4444; }
        .modal-actions { display: flex; gap: 10px; margin-top: 24px; }
        .btn-cancel, .btn-save, .btn-delete { flex: 1; padding: 11px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
        .btn-cancel { background: #e5e7eb; color: #374151; }
        .btn-cancel:hover { background: #d1d5db; }
        .btn-save { background: #3b82f6; color: white; }
        .btn-save:hover { background: #2563eb; }
        .btn-save:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-delete { background: #ef4444; color: white; }
        .btn-delete:hover { background: #dc2626; }

        .project-detail-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .project-detail-stat { padding: 14px; border-radius: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 4px; }
        .project-detail-stat span { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
        .project-detail-stat strong { font-size: 15px; color: #0f172a; }
        .project-detail-stat.in strong { color: #10b981; }
        .project-detail-stat.out strong { color: #ef4444; }
        .project-detail-stat strong.positive { color: #10b981; }
        .project-detail-stat strong.negative { color: #ef4444; }
        .project-detail-transactions h4 { margin: 0 0 12px; color: #0f172a; }
        .project-detail-tx-list { max-height: 300px; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 10px; }
        .project-detail-tx { display: flex; align-items: center; padding: 10px 14px; gap: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .project-detail-tx:last-child { border-bottom: none; }
        .project-detail-tx.in { background: #f0fdf4; }
        .project-detail-tx.out { background: #fef2f2; }
        .project-detail-tx-date { width: 90px; color: #64748b; font-size: 12px; flex-shrink: 0; }
        .project-detail-tx-desc { flex: 1; font-weight: 500; }
        .project-detail-tx-amount { font-weight: 700; }
        .project-detail-loading { padding: 40px; text-align: center; color: #94a3b8; }

        .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 24px; border-radius: 8px; color: white; z-index: 1100; animation: slideIn 0.3s ease; font-size: 14px; font-weight: 500; }
        .toast.success { background: #10b981; }
        .toast.error { background: #ef4444; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }

        .mobile-cards { display: none; flex-direction: column; gap: 12px; }
        .mobile-card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .in-card { border-left: 4px solid #10b981; }
        .out-card { border-left: 4px solid #ef4444; }
        .card-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .card-date { font-size: 12px; color: #64748b; }
        .card-description { font-weight: 600; margin-bottom: 4px; font-size: 14px; }
        .card-category { font-size: 12px; color: #64748b; margin-bottom: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .card-amounts { display: flex; justify-content: space-between; margin-top: 8px; flex-wrap: wrap; gap: 8px; }
        .card-balance { font-size: 12px; font-weight: 700; color: #0f172a; }
        .member-mobile-card { background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
        .member-name { font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 4px; }

        .semester-switcher { position: relative; display: inline-block; margin: 12px 0; }
        .semester-pill-chevron { font-size: 10px; margin-left: 4px; color: #1e40af; }
        .semester-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          min-width: 380px;
          max-width: 90vw;
          z-index: 100;
          overflow: hidden;
          animation: dropdownIn 0.15s ease;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .semester-option { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.12s ease; }
        .semester-option:last-child { border-bottom: none; }
        .semester-option:hover { background: #f8fafc; }
        .semester-option.selected { background: #eff6ff; }
        .semester-option-main { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
        .semester-option-title { font-weight: 600; color: #0f172a; font-size: 13px; }
        .semester-option-status { padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
        .semester-option-status.status-active { background: #d1fae5; color: #065f46; }
        .semester-option-status.status-closed { background: #fee2e2; color: #991b1b; }
        .semester-option-status.status-upcoming { background: #fef3c7; color: #92400e; }
        .semester-option-dates { font-size: 11px; color: #64748b; }

        .closed-semester-banner {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 14px 18px; background: #fef3c7; border: 1px solid #fcd34d;
          border-radius: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .closed-banner-left { display: flex; align-items: center; gap: 12px; color: #92400e; }
        .closed-banner-left strong { display: block; font-size: 14px; }
        .closed-banner-left p { margin: 2px 0 0; font-size: 12px; color: #78350f; }
        .closed-banner-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-reopen-semester { padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-reopen-semester:hover { background: #d97706; }
        .btn-dismiss-banner { padding: 8px 16px; background: transparent; border: 1px solid #fcd34d; color: #92400e; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; }
        .btn-dismiss-banner:hover { background: #fef3c7; }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .report-breakdown { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .treasurer-reports { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr; gap: 12px; }
          .tab-navigation { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .tab-navigation::-webkit-scrollbar { display: none; }
          .tab-btn { padding: 8px 12px; font-size: 12px; white-space: nowrap; flex-shrink: 0; }
          .report-summary { grid-template-columns: 1fr; gap: 12px; }
          .report-generator { padding: 16px; }
          .report-preview { padding: 16px; }
          .report-actions { flex-direction: column; }
          .btn-generate, .btn-export-pdf, .btn-export-word { justify-content: center; width: 100%; }
          .ledger-table, .member-table { display: none; }
          .mobile-cards { display: flex; }
          .projects-grid { grid-template-columns: 1fr; }
          .transaction-item { flex-wrap: wrap; gap: 8px; }
          .transaction-date { width: 100%; }
          .transaction-amount { width: 100%; text-align: left; }
          .modal-content { padding: 18px; }
          .form-row { grid-template-columns: 1fr; }
          .project-detail-stats { grid-template-columns: 1fr; }
          .ledger-filters { flex-direction: column; align-items: stretch; width: 100%; }
          .filter-input, .filter-select { width: 100%; }
          .filter-sep { display: none; }
          .ledger-buttons { width: 100%; }
          .ledger-buttons .btn-add, .ledger-buttons .btn-export { flex: 1; justify-content: center; }
          .semester-dropdown { min-width: 0; width: min(94vw, 380px); left: 50%; transform: translateX(-50%); }
          .semester-pill { font-size: 11px; padding: 7px 12px; }
          .semester-pill-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
          .scope-row { flex-direction: column; align-items: stretch; }
          .scope-row select, .scope-row input[type="date"] { width: 100%; }
          .report-scope-tabs { flex-wrap: wrap; }
          .scope-tab { flex: 1 1 calc(50% - 4px); text-align: center; }
        }

        @media (max-width: 480px) {
          .reports-header h1 { font-size: 20px; }
          .stat-value { font-size: 14px; }
          .stat-icon { width: 40px; height: 40px; font-size: 18px; }
          .btn-generate, .btn-export-pdf, .btn-export-word { font-size: 13px; padding: 10px 12px; }
          .transaction-description { flex: 1 1 100%; }
          .transaction-category { flex: 1 1 100%; font-size: 11px; }
          .closed-semester-banner { padding: 12px; }
          .closed-banner-actions { width: 100%; }
          .btn-reopen-semester, .btn-dismiss-banner { flex: 1; }
          .scope-tab { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}