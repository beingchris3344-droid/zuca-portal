// frontend/src/pages/treasurer/TreasurerReports.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import * as XLSX from 'xlsx';
import BASE_URL from "../../api";

export default function TreasurerReports() {
  const [activeTab, setActiveTab] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [members, setMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [campaignSummary, setCampaignSummary] = useState({
    totalCampaigns: 0,
    totalCollected: 0,
    totalPending: 0,
    totalTarget: 0,
    overallCompletion: 0,
    activeCampaigns: 0,
    completedCampaigns: 0
  });
  const [ledgerSummary, setLedgerSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    count: 0
  });
  
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    type: "IN",
    amount: "",
    reference: "",
    notes: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [inAmount, setInAmount] = useState("");
  const [outAmount, setOutAmount] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  
  const inCategories = ["Contributions", "Registration", "Sponsors", "Events", "Other Income"];
  const outCategories = ["Choir Expenses", "Events", "Maintenance", "Supplies", "Other Expense"];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const campaignsRes = await axios.get(`${BASE_URL}/api/treasurer/campaign-summary`, { headers });
      if (campaignsRes.data.success) {
        setCampaigns(campaignsRes.data.campaigns || []);
        setCampaignSummary(campaignsRes.data.summary || {
          totalCampaigns: 0,
          totalCollected: 0,
          totalPending: 0,
          totalTarget: 0,
          overallCompletion: 0,
          activeCampaigns: 0,
          completedCampaigns: 0
        });
      }
      
      const membersRes = await axios.get(`${BASE_URL}/api/treasurer/member-summary`, { headers });
      if (membersRes.data.success) {
        setMembers(membersRes.data.members || []);
      }
      
      const ledgerRes = await axios.get(`${BASE_URL}/api/treasurer/ledger`, { headers });
      if (ledgerRes.data.success) {
        setTransactions(ledgerRes.data.transactions || []);
        setLedgerSummary(ledgerRes.data.summary || {
          totalIn: 0,
          totalOut: 0,
          balance: 0,
          count: 0
        });
      }
      
      const auditRes = await axios.get(`${BASE_URL}/api/treasurer/audit-trail`, { headers });
      if (auditRes.data.success) {
        setAuditLogs(auditRes.data.auditLogs || []);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Failed to load data", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRunningBalance = () => {
    let balance = 0;
    return [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(t => {
        if (t.type === "IN") balance += Number(t.amount);
        else balance -= Number(t.amount);
        return { ...t, runningBalance: balance };
      });
  };

  const transactionsWithBalance = getRunningBalance();

  const filteredTransactions = transactionsWithBalance.filter(t => {
    if (dateRange.start && new Date(t.date) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(t.date) > new Date(dateRange.end)) return false;
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalMoneyIn = filteredTransactions.filter(t => t.type === "IN").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalMoneyOut = filteredTransactions.filter(t => t.type === "OUT").reduce((sum, t) => sum + Number(t.amount), 0);
  const currentBalance = filteredTransactions.length > 0 ? filteredTransactions[filteredTransactions.length - 1].runningBalance : ledgerSummary.balance;

  const handleAmountChange = (value) => {
    if (newTransaction.type === "IN") {
      setInAmount(value);
      setNewTransaction({ ...newTransaction, amount: value });
    } else {
      setOutAmount(value);
      setNewTransaction({ ...newTransaction, amount: value });
    }
  };

  const handleTypeChange = (type) => {
    let amount = "";
    if (type === "IN") {
      amount = inAmount;
    } else {
      amount = outAmount;
    }
    
    setNewTransaction({ 
      ...newTransaction, 
      type: type, 
      category: type === "IN" ? inCategories[0] : outCategories[0],
      amount: amount 
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
      const response = await axios.post(`${BASE_URL}/api/treasurer/ledger`, {
        ...newTransaction,
        amount: amountNum
      }, { headers });
      
      if (response.data.success) {
        await fetchData();
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: "",
          category: newTransaction.type === "IN" ? inCategories[0] : outCategories[0],
          type: newTransaction.type,
          amount: "",
          reference: "",
          notes: ""
        });
        setInAmount("");
        setOutAmount("");
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
    const amount = transaction.amount.toString();
    
    if (transaction.type === "IN") {
      setInAmount(amount);
      setOutAmount("");
    } else {
      setOutAmount(amount);
      setInAmount("");
    }
    
    setNewTransaction({
      date: transaction.date.split('T')[0] || transaction.date,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      amount: amount,
      reference: transaction.reference || "",
      notes: transaction.notes || ""
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
      const response = await axios.put(`${BASE_URL}/api/treasurer/ledger/${editingTransaction.id}`, {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      }, { headers });
      
      if (response.data.success) {
        await fetchData();
        setEditingTransaction(null);
        setShowAddTransaction(false);
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: "",
          category: "Contributions",
          type: "IN",
          amount: "",
          reference: "",
          notes: ""
        });
        setInAmount("");
        setOutAmount("");
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
    try {
      const response = await axios.delete(`${BASE_URL}/api/treasurer/ledger/${id}`, { headers });
      if (response.data.success) {
        await fetchData();
        showToast("Transaction deleted successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete transaction", "error");
    }
  };

  const exportToExcel = (data, filename, sheetName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportLedger = () => {
    const exportData = filteredTransactions.map(t => ({
      "Date": new Date(t.date).toLocaleDateString(),
      "Description": t.description,
      "Category": t.category,
      "Money IN": t.type === "IN" ? t.amount : "-",
      "Money OUT": t.type === "OUT" ? t.amount : "-",
      "Balance": t.runningBalance,
      "Reference": t.reference || ""
    }));
    exportToExcel(exportData, `treasurer_ledger_${new Date().toISOString().split('T')[0]}`, "Ledger");
    showToast("Ledger exported successfully");
  };

  const exportCampaigns = () => {
    const campaignStats = campaigns.map(campaign => ({
      Campaign: campaign.title,
      "Target (KES)": campaign.target,
      "Collected (KES)": campaign.collected,
      "Pending (KES)": campaign.pending,
      "Paid Members": campaign.paidMembers,
      "Total Members": campaign.totalMembers,
      "Completion %": campaign.completion?.toFixed(1) || 0,
      Status: campaign.status
    }));
    exportToExcel(campaignStats, `campaign_report_${new Date().toISOString().split('T')[0]}`, "Campaigns");
    showToast("Campaign report exported successfully");
  };

  const exportMembers = () => {
    const exportData = members.map(m => ({
      Name: m.name,
      "Membership #": m.membershipNumber || "-",
      Jumuia: m.jumuia,
      "Total Paid (KES)": m.total_paid,
      "Total Pending (KES)": m.total_pending,
      "Campaigns Participated": m.campaigns_participated,
      Status: m.status
    }));
    exportToExcel(exportData, `member_report_${new Date().toISOString().split('T')[0]}`, "Members");
    showToast("Member report exported successfully");
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="treasurer-reports">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="reports-header">
        <h1>💰 Treasurer Reports Dashboard</h1>
        <p>Manage cash flow, track campaigns, and view member contributions</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card in">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-value">KES {totalMoneyIn.toLocaleString()}</span>
            <span className="stat-label">Total Money IN</span>
          </div>
        </div>
        <div className="stat-card out">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <span className="stat-value">KES {totalMoneyOut.toLocaleString()}</span>
            <span className="stat-label">Total Money OUT</span>
          </div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-value">KES {currentBalance.toLocaleString()}</span>
            <span className="stat-label">Current Balance</span>
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button className={`tab-btn ${activeTab === "ledger" ? "active" : ""}`} onClick={() => setActiveTab("ledger")}>
          <span>📒</span>
          <span>Cash Ledger</span>
        </button>
        <button className={`tab-btn ${activeTab === "campaigns" ? "active" : ""}`} onClick={() => setActiveTab("campaigns")}>
          <span>📊</span>
          <span>Activity & Audit Trail</span>
        </button>
        <button className={`tab-btn ${activeTab === "members" ? "active" : ""}`} onClick={() => setActiveTab("members")}>
          <span>👥</span>
          <span>Member Contributions</span>
        </button>
      </div>

      {/* LEDGER TAB */}
      {activeTab === "ledger" && (
        <div className="ledger-tab">
          <div className="ledger-actions">
            <div className="ledger-filters">
              <input type="date" className="filter-input" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
              <span>to</span>
              <input type="date" className="filter-input" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
              <input type="text" className="filter-input" placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="ledger-buttons">
              <button className="btn-add" onClick={() => setShowAddTransaction(true)}>➕ Add Transaction</button>
              <button className="btn-export" onClick={exportLedger}>📎 Export Ledger</button>
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
                          <button className="edit-btn" onClick={() => handleEditTransaction(t)}>✏️</button>
                          <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)}>🗑️</button>
                        </div>
                      </div>
                      <div className="card-description">{t.description}</div>
                      <div className="card-category">{t.category}</div>
                      <div className="card-amounts">
                        {t.type === "IN" ? (
                          <span className="amount-in">+ KES {t.amount?.toLocaleString()}</span>
                        ) : (
                          <span className="amount-out">- KES {t.amount?.toLocaleString()}</span>
                        )}
                        <span className="card-balance">Balance: KES {t.runningBalance?.toLocaleString()}</span>
                      </div>
                      {t.reference && <div className="card-reference">Ref: {t.reference}</div>}
                      {t.notes && <div className="card-notes">📝 {t.notes}</div>}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <table className="ledger-table">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Money IN</th><th>Money OUT</th><th>Balance</th><th>Reference</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan="8" className="empty-row">No transactions found</td></tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className={t.type === "IN" ? "in-row" : "out-row"}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td>{t.description}</td>
                        <td>{t.category}</td>
                        <td className="amount-in">{t.type === "IN" ? `KES ${t.amount?.toLocaleString()}` : "-"}</td>
                        <td className="amount-out">{t.type === "OUT" ? `KES ${t.amount?.toLocaleString()}` : "-"}</td>
                        <td className="amount-balance">KES {t.runningBalance?.toLocaleString()}</td>
                        <td>{t.reference || "-"}</td>
                        <td className="actions">
                          <button className="edit-btn" onClick={() => handleEditTransaction(t)}>✏️ Edit</button>
                          <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)}>🗑️ Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td colSpan="3"><strong>TOTALS</strong></td>
                    <td className="amount-in"><strong>KES {totalMoneyIn.toLocaleString()}</strong></td>
                    <td className="amount-out"><strong>KES {totalMoneyOut.toLocaleString()}</strong></td>
                    <td className="amount-balance"><strong>KES {currentBalance.toLocaleString()}</strong></td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY & AUDIT TRAIL TAB (Formerly Campaign Summary) */}
      {activeTab === "campaigns" && (
        <div className="audit-tab">
          <div className="audit-header">
            <h2>📝 Ledger Activity & Audit Trail</h2>
            <p>Complete history of all transactions, edits, and deletions</p>
          </div>

          {/* Overall Summary Card */}
          <div className="overall-summary-card">
            <h3>💰 Overall Financial Health</h3>
            <div className="summary-stats">
              <div className="stat-badge in">Total Money IN: KES {totalMoneyIn.toLocaleString()}</div>
              <div className="stat-badge out">Total Money OUT: KES {totalMoneyOut.toLocaleString()}</div>
              <div className="stat-badge balance">Current Balance: KES {currentBalance.toLocaleString()}</div>
            </div>
            <p className="overall-text">
              As of today, the treasury has received a total of <strong>KES {totalMoneyIn.toLocaleString()}</strong> in income 
              and spent <strong>KES {totalMoneyOut.toLocaleString()}</strong> on expenses. 
              The current available balance is <strong>KES {currentBalance.toLocaleString()}</strong>.
              {totalMoneyIn > totalMoneyOut 
                ? " 🎉 ZUCA is in a positive financial position." 
                : " ⚠️ Expenses have exceeded income. Please review spending."}
            </p>
          </div>

          {/* Audit Trail - All Changes */}
          <div className="audit-trail-card">
            <h3>🔒 Audit Trail - Every Change Tracked</h3>
            <p className="audit-warning">
              ⚠️ Every create, edit, and delete operation is logged below. This prevents Inconveniences and maintains transparency.
            </p>
            
            {auditLogs.length === 0 ? (
              <div className="audit-empty">No changes recorded yet. Adding/editing transactions will appear here.</div>
            ) : (
              <div className="audit-timeline">
                {auditLogs.map((log, index) => (
                  <motion.div 
                    key={log.id} 
                    className={`audit-item audit-${log.action?.toLowerCase()}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="audit-header">
                      <div className="audit-action">
                        {log.action === "CREATE" && "➕ CREATED"}
                        {log.action === "UPDATE" && "✏️ UPDATED"}
                        {log.action === "DELETE" && "🗑️ DELETED"}
                      </div>
                      <div className="audit-time">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                    
                    <div className="audit-details">
                      <div className="audit-performed-by">
                        👤 By: <strong>{log.performedByName || "Unknown"}</strong>
                        {log.ipAddress && <span className="audit-ip">📍 IP: {log.ipAddress}</span>}
                      </div>
                      
                      {log.action === "CREATE" && log.newData && (
                        <div className="audit-changes">
                          <div className="change-highlight">
                            Added new transaction: <strong>{log.newData.description}</strong>
                          </div>
                          <div className="change-details">
                            Amount: KES {log.newData.amount?.toLocaleString()} | 
                            Type: {log.newData.type} | 
                            Category: {log.newData.category}
                          </div>
                        </div>
                      )}
                      
                      {log.action === "UPDATE" && log.changedFields && (
                        <div className="audit-changes">
                          <div className="change-warning">⚠️ Changes detected:</div>
                          {log.changedFields.map((change, i) => (
                            <div key={i} className="change-diff">
                              <span className="field-name">{change.field}:</span>
                              <span className="old-value">"{change.oldValue}"</span>
                              <span className="arrow">→</span>
                              <span className="new-value">"{change.newValue}"</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {log.action === "DELETE" && log.oldData && (
                        <div className="audit-changes">
                          <div className="change-critical">⚠️ DELETED TRANSACTION:</div>
                          <div className="change-details">
                            Description: {log.oldData.description}<br/>
                            Amount: KES {log.oldData.amount?.toLocaleString()}<br/>
                            Type: {log.oldData.type}<br/>
                            Category: {log.oldData.category}<br/>
                            Date: {log.oldData.date ? new Date(log.oldData.date).toLocaleDateString() : "Unknown"}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Summary */}
          <div className="recent-activity-card">
            <h3>📊 Recent Activity Summary</h3>
            <div className="recent-stats">
              <div className="recent-stat">
                <span className="recent-number">{auditLogs.length}</span>
                <span className="recent-label">Total Actions Logged</span>
              </div>
              <div className="recent-stat">
                <span className="recent-number">{auditLogs.filter(l => l.action === "CREATE").length}</span>
                <span className="recent-label">Transactions Created</span>
              </div>
              <div className="recent-stat">
                <span className="recent-number">{auditLogs.filter(l => l.action === "UPDATE").length}</span>
                <span className="recent-label">Edits Made</span>
              </div>
              <div className="recent-stat">
                <span className="recent-number">{auditLogs.filter(l => l.action === "DELETE").length}</span>
                <span className="recent-label">Transactions Deleted</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER TAB */}
      {activeTab === "members" && (
        <div className="members-tab">
          <div className="member-actions">
            <input type="text" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <button className="btn-export" onClick={exportMembers}>📎 Export Members</button>
          </div>
          <div className="member-table-container">
            {isMobile ? (
              <div className="mobile-cards">
                {members.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                  <div key={m.id} className="member-mobile-card">
                    <div className="member-name">{m.name}</div>
                    <div>🆔 {m.membershipNumber || "No membership"}</div>
                    <div>🏠 {m.jumuia}</div>
                    <div className="amount-in">💰 Paid: KES {m.total_paid?.toLocaleString()}</div>
                    <div className="amount-out">⏳ Pending: KES {m.total_pending?.toLocaleString()}</div>
                    <span className={`status-badge ${m.status?.toLowerCase()}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <table className="member-table">
                <thead>
                  <tr><th>Name</th><th>Membership</th><th>Jumuia</th><th>Paid</th><th>Pending</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {members.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.membershipNumber || "-"}</td>
                      <td>{m.jumuia}</td>
                      <td className="amount-in">KES {m.total_paid?.toLocaleString()}</td>
                      <td className="amount-out">KES {m.total_pending?.toLocaleString()}</td>
                      <td><span className={`status-badge ${m.status?.toLowerCase()}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}>
            <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h3>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</h3>
              
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Transaction Type</label>
                <div className="type-buttons">
                  <button className={`type-btn ${newTransaction.type === "IN" ? "active-in" : ""}`} onClick={() => handleTypeChange("IN")}>
                    💰 Money IN
                  </button>
                  <button className={`type-btn ${newTransaction.type === "OUT" ? "active-out" : ""}`} onClick={() => handleTypeChange("OUT")}>
                    💸 Money OUT
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="Enter description" value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}>
                  <option value="">Select category</option>
                  {(newTransaction.type === "IN" ? inCategories : outCategories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount (KES)</label>
                <input type="number" placeholder="Enter amount" value={newTransaction.amount} onChange={(e) => handleAmountChange(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Reference (Optional)</label>
                <input type="text" placeholder="Receipt #, Invoice #, etc." value={newTransaction.reference} onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea placeholder="Additional notes..." value={newTransaction.notes} onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })} rows={3} />
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }} disabled={isSaving || isUpdating}>
                  Cancel
                </button>
                <button className="btn-save" onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction} disabled={isSaving || isUpdating}>
                  {(isSaving || isUpdating) ? (
                    <><span className="spinner-small"></span>{editingTransaction ? "Updating..." : "Saving..."}</>
                  ) : (editingTransaction ? "Update" : "Save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .treasurer-reports { padding: 20px; max-width: 1400px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-icon { font-size: 32px; width: 60px; height: 60px; background: #f0fdf4; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-value { font-size: 24px; font-weight: bold; display: block; }
        .stat-label { font-size: 14px; color: #666; }
        .tab-navigation { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
        .tab-btn { padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 16px; display: flex; align-items: center; gap: 8px; }
        .tab-btn.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; margin-bottom: -2px; }
        .ledger-actions { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .ledger-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .filter-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
        .btn-add, .btn-export { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .btn-add { background: #3b82f6; color: white; }
        .btn-export { background: #10b981; color: white; }
        .ledger-table, .campaign-table, .member-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        .ledger-table th, .campaign-table th, .member-table th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; }
        .ledger-table td, .campaign-table td, .member-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .in-row { background: #f0fdf4; }
        .out-row { background: #fef2f2; }
        .amount-in { color: #10b981; font-weight: 600; }
        .amount-out { color: #ef4444; font-weight: 600; }
        .edit-btn, .delete-btn { padding: 4px 8px; margin: 0 4px; border: none; border-radius: 4px; cursor: pointer; }
        .edit-btn { background: #dbeafe; color: #2563eb; }
        .delete-btn { background: #fee2e2; color: #dc2626; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
        .type-buttons { display: flex; gap: 10px; }
        .type-btn { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
        .type-btn.active-in { background: #10b981; color: white; border-color: #10b981; }
        .type-btn.active-out { background: #ef4444; color: white; border-color: #ef4444; }
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel, .btn-save { flex: 1; padding: 10px; border: none; border-radius: 6px; cursor: pointer; }
        .btn-cancel { background: #e5e7eb; }
        .btn-save { background: #3b82f6; color: white; }
        .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 24px; border-radius: 8px; color: white; z-index: 1100; animation: slideIn 0.3s ease; }
        .toast.success { background: #10b981; }
        .toast.error { background: #ef4444; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .status-badge.completed { background: #d1fae5; color: #065f46; }
        .status-badge.active { background: #dbeafe; color: #1e40af; }
        .status-badge.partial { background: #fed7aa; color: #92400e; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr; } .ledger-actions { flex-direction: column; } }

        .spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-save:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        input:disabled, select:disabled, textarea:disabled, button:disabled { cursor: not-allowed; opacity: 0.7; }

        /* Audit Trail Styles */
        .audit-tab { padding: 20px; }
        .audit-header { text-align: center; margin-bottom: 30px; }
        .audit-header h2 { color: #1e293b; margin-bottom: 10px; }
        .audit-header p { color: #64748b; }
        
        .overall-summary-card, .audit-trail-card, .recent-activity-card {
          background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .overall-summary-card h3, .audit-trail-card h3, .recent-activity-card h3 { margin-bottom: 15px; color: #1e293b; }
        
        .summary-stats { display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 15px; }
        .stat-badge { padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        .stat-badge.in { background: #dcfce7; color: #10b981; }
        .stat-badge.out { background: #fee2e2; color: #ef4444; }
        .stat-badge.balance { background: #eff6ff; color: #3b82f6; }
        .overall-text { line-height: 1.6; color: #334155; }
        
        .audit-warning { background: #fef3c7; padding: 10px; border-radius: 8px; color: #92400e; margin-bottom: 20px; }
        .audit-timeline { max-height: 500px; overflow-y: auto; }
        
        .audit-item { padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid; background: #f8fafc; }
        .audit-create { border-left-color: #10b981; background: #f0fdf4; }
        .audit-update { border-left-color: #f59e0b; background: #fffbeb; }
        .audit-delete { border-left-color: #ef4444; background: #fef2f2; }
        
        .audit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px; }
        .audit-action { font-weight: bold; font-size: 14px; }
        .audit-create .audit-action { color: #10b981; }
        .audit-update .audit-action { color: #f59e0b; }
        .audit-delete .audit-action { color: #ef4444; }
        .audit-time { font-size: 12px; color: #64748b; }
        .audit-performed-by { font-size: 13px; margin-bottom: 10px; color: #475569; }
        .audit-ip { margin-left: 10px; font-size: 11px; color: #94a3b8; }
        
        .audit-changes { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
        .change-warning, .change-critical { font-weight: bold; margin-bottom: 8px; color: #dc2626; }
        .change-highlight { font-weight: bold; margin-bottom: 8px; color: #10b981; }
        .change-diff { font-size: 13px; padding: 5px 0; font-family: monospace; }
        .field-name { font-weight: bold; color: #3b82f6; margin-right: 8px; }
        .old-value { color: #dc2626; text-decoration: line-through; margin-right: 8px; }
        .arrow { margin-right: 8px; }
        .new-value { color: #10b981; font-weight: bold; }
        .change-details { font-size: 13px; line-height: 1.6; color: #334155; }
        .audit-empty { text-align: center; padding: 40px; color: #64748b; background: #f8fafc; border-radius: 8px; }
        
        .recent-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .recent-stat { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
        .recent-number { display: block; font-size: 28px; font-weight: bold; color: #3b82f6; }
        .recent-label { font-size: 12px; color: #64748b; }
      `}</style>
    </div>
  );
}