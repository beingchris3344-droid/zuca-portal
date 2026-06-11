// frontend/src/pages/treasurer/TreasurerReports.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import BASE_URL from "../../api";

export default function TreasurerReports() {
  const [activeTab, setActiveTab] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
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

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  
  const inCategories = ["Contributions", "Donations", "Fundraising", "Events", "Other Income"];
  const outCategories = ["Choir Expenses", "Events", "Maintenance", "Supplies", "Other Expense"];

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all data - defined as a simple async function
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Campaign Summary
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
      
      // Fetch Member Summary
      const membersRes = await axios.get(`${BASE_URL}/api/treasurer/member-summary`, { headers });
      if (membersRes.data.success) {
        setMembers(membersRes.data.members || []);
      }
      
      // Fetch Ledger Transactions
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
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Failed to load data", "error");
      setLoading(false);
    }
  };

  // Run once on mount
  useEffect(() => {
    fetchData();
  }, []); // Empty array = run once

  // Calculate running balance
  const getRunningBalance = () => {
    let balance = 0;
    return [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(t => {
        if (t.type === "IN") balance += t.amount;
        else balance -= t.amount;
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

  const totalMoneyIn = filteredTransactions.filter(t => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
  const totalMoneyOut = filteredTransactions.filter(t => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = filteredTransactions.length > 0 ? filteredTransactions[filteredTransactions.length - 1].runningBalance : ledgerSummary.balance;

  const campaignStats = campaigns.map(campaign => ({
    id: campaign.id,
    title: campaign.title,
    target: campaign.target,
    collected: campaign.collected,
    pending: campaign.pending,
    paidMembers: campaign.paidMembers,
    totalMembers: campaign.totalMembers,
    completion: campaign.completion,
    status: campaign.status
  }));

  const grandTotalCollected = campaignStats.reduce((sum, c) => sum + c.collected, 0);
  const grandTotalPending = campaignStats.reduce((sum, c) => sum + c.pending, 0);
  const overallCompletion = campaignSummary.totalTarget > 0 ? (campaignSummary.totalCollected / campaignSummary.totalTarget) * 100 : 0;

  // Add transaction
  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/treasurer/ledger`, newTransaction, { headers });
      if (response.data.success) {
        await fetchData();
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: "",
          category: "",
          type: "IN",
          amount: "",
          reference: "",
          notes: ""
        });
        setShowAddTransaction(false);
        showToast("Transaction added successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add transaction", "error");
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      date: transaction.date.split('T')[0] || transaction.date,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount,
      reference: transaction.reference || "",
      notes: transaction.notes || ""
    });
    setShowAddTransaction(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    try {
      const response = await axios.put(`${BASE_URL}/api/treasurer/ledger/${editingTransaction.id}`, newTransaction, { headers });
      if (response.data.success) {
        await fetchData();
        setEditingTransaction(null);
        setShowAddTransaction(false);
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: "",
          category: "",
          type: "IN",
          amount: "",
          reference: "",
          notes: ""
        });
        showToast("Transaction updated successfully");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update transaction", "error");
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
      Date: new Date(t.date).toLocaleDateString(),
      Description: t.description,
      Category: t.category,
      "Money IN": t.type === "IN" ? t.amount : "-",
      "Money OUT": t.type === "OUT" ? t.amount : "-",
      Balance: t.runningBalance,
      Reference: t.reference || ""
    }));
    exportToExcel(exportData, `treasurer_ledger_${new Date().toISOString().split('T')[0]}`, "Ledger");
    showToast("Ledger exported successfully");
  };

  const exportCampaigns = () => {
    const exportData = campaignStats.map(c => ({
      Campaign: c.title,
      "Target (KES)": c.target,
      "Collected (KES)": c.collected,
      "Pending (KES)": c.pending,
      "Paid Members": c.paidMembers,
      "Total Members": c.totalMembers,
      "Completion %": c.completion?.toFixed(1) || 0,
      Status: c.status
    }));
    exportToExcel(exportData, `campaign_report_${new Date().toISOString().split('T')[0]}`, "Campaigns");
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
        <div className="stat-card in"><div className="stat-icon">💰</div><div className="stat-info"><span className="stat-value">KES {totalMoneyIn.toLocaleString()}</span><span className="stat-label">Total Money IN</span></div></div>
        <div className="stat-card out"><div className="stat-icon">💸</div><div className="stat-info"><span className="stat-value">KES {totalMoneyOut.toLocaleString()}</span><span className="stat-label">Total Money OUT</span></div></div>
        <div className="stat-card balance"><div className="stat-icon">📊</div><div className="stat-info"><span className="stat-value">KES {currentBalance.toLocaleString()}</span><span className="stat-label">Current Balance</span></div></div>
        <div className="stat-card collected"><div className="stat-icon">🎯</div><div className="stat-info"><span className="stat-value">KES {grandTotalCollected.toLocaleString()}</span><span className="stat-label">Total Campaign Collections</span></div></div>
      </div>

      <div className="tab-navigation">
        <button className={`tab-btn ${activeTab === "ledger" ? "active" : ""}`} onClick={() => setActiveTab("ledger")}>📒 Cash Ledger</button>
        <button className={`tab-btn ${activeTab === "campaigns" ? "active" : ""}`} onClick={() => setActiveTab("campaigns")}>📊 Campaign Summary</button>
        <button className={`tab-btn ${activeTab === "members" ? "active" : ""}`} onClick={() => setActiveTab("members")}>👥 Member Contributions</button>
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
            <table className="ledger-table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Money IN</th><th>Money OUT</th><th>Balance</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr><td colSpan="7" className="empty-row">No transactions found</td></tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className={t.type === "IN" ? "in-row" : "out-row"}>
                      <td>{new Date(t.date).toLocaleDateString()}</td>
                      <td>{t.description}</td>
                      <td>{t.category}</td>
                      <td className="amount-in">{t.type === "IN" ? `KES ${t.amount?.toLocaleString()}` : "-"}</td>
                      <td className="amount-out">{t.type === "OUT" ? `KES ${t.amount?.toLocaleString()}` : "-"}</td>
                      <td className="amount-balance">KES {t.runningBalance?.toLocaleString()}</td>
                      <td className="actions"><button className="edit-btn" onClick={() => handleEditTransaction(t)}>✏️</button><button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)}>🗑️</button></td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot><tr className="totals-row"><td colSpan="3"><strong>TOTALS</strong></td><td className="amount-in"><strong>KES {totalMoneyIn.toLocaleString()}</strong></td><td className="amount-out"><strong>KES {totalMoneyOut.toLocaleString()}</strong></td><td className="amount-balance"><strong>KES {currentBalance.toLocaleString()}</strong></td><td></td></tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {/* CAMPAIGN TAB */}
      {activeTab === "campaigns" && (
        <div className="campaigns-tab">
          <div className="campaign-actions"><button className="btn-export" onClick={exportCampaigns}>📎 Export Campaign Report</button></div>
          <div className="campaign-summary-cards">
            <div className="summary-card"><span className="summary-value">{campaignSummary.totalCampaigns}</span><span className="summary-label">Total Campaigns</span></div>
            <div className="summary-card"><span className="summary-value">KES {campaignSummary.totalCollected.toLocaleString()}</span><span className="summary-label">Total Collected</span></div>
            <div className="summary-card"><span className="summary-value">KES {campaignSummary.totalPending.toLocaleString()}</span><span className="summary-label">Total Pending</span></div>
            <div className="summary-card"><span className="summary-value">{overallCompletion.toFixed(1)}%</span><span className="summary-label">Overall Completion</span></div>
          </div>
          <div className="campaign-table-container">
            <table className="campaign-table">
              <thead><tr><th>Campaign</th><th>Target (KES)</th><th>Collected (KES)</th><th>Pending (KES)</th><th>Paid Members</th><th>Completion</th><th>Status</th></tr></thead>
              <tbody>
                {campaignStats.map((c) => (
                  <tr key={c.id}>
                    <td className="campaign-title">{c.title}</td>
                    <td>KES {c.target?.toLocaleString()}</td>
                    <td className="amount-in">KES {c.collected?.toLocaleString()}</td>
                    <td className="amount-out">KES {c.pending?.toLocaleString()}</td>
                    <td>{c.paidMembers} / {c.totalMembers}</td>
                    <td><div className="progress-cell"><div className="progress-bar-small"><div className="progress-fill" style={{ width: `${c.completion}%` }}></div></div><span>{c.completion?.toFixed(1)}%</span></div></td>
                    <td><span className={`status-badge ${c.status?.toLowerCase().replace(" ", "-")}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEMBER TAB */}
      {activeTab === "members" && (
        <div className="members-tab">
          <div className="member-actions">
            <input type="text" className="search-input" placeholder="Search member by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <button className="btn-export" onClick={exportMembers}>📎 Export Member Report</button>
          </div>
          <div className="member-table-container">
            <table className="member-table">
              <thead><tr><th>Member Name</th><th>Membership #</th><th>Jumuia</th><th>Total Paid (KES)</th><th>Total Pending (KES)</th><th>Campaigns</th><th>Status</th></tr></thead>
              <tbody>
                {members.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.membershipNumber || "-"}</td>
                    <td>{m.jumuia}</td>
                    <td className="amount-in">KES {m.total_paid?.toLocaleString()}</td>
                    <td className="amount-out">KES {m.total_pending?.toLocaleString()}</td>
                    <td>{m.campaigns_participated}</td>
                    <td><span className={`status-badge ${m.status?.toLowerCase().replace(" ", "-")}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}>
            <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h3>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</h3>
              <div className="form-group"><label>Date</label><input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} /></div>
              <div className="form-group"><label>Transaction Type</label><div className="type-buttons"><button className={`type-btn ${newTransaction.type === "IN" ? "active-in" : ""}`} onClick={() => setNewTransaction({ ...newTransaction, type: "IN", category: inCategories[0] })}>💰 Money IN</button><button className={`type-btn ${newTransaction.type === "OUT" ? "active-out" : ""}`} onClick={() => setNewTransaction({ ...newTransaction, type: "OUT", category: outCategories[0] })}>💸 Money OUT</button></div></div>
              <div className="form-group"><label>Description</label><input type="text" placeholder="Enter description" value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} /></div>
              <div className="form-group"><label>Category</label><select value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}><option value="">Select category</option>{(newTransaction.type === "IN" ? inCategories : outCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
              <div className="form-group"><label>Amount (KES)</label><input type="number" placeholder="Enter amount" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} /></div>
              <div className="form-group"><label>Reference (Optional)</label><input type="text" placeholder="Receipt #, Invoice #, etc." value={newTransaction.reference} onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })} /></div>
              <div className="form-group"><label>Notes (Optional)</label><textarea placeholder="Additional notes..." value={newTransaction.notes} onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })} rows={3} className="form-textarea" /></div>
              <div className="modal-actions"><button className="btn-cancel" onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}>Cancel</button><button className="btn-save" onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction}>{editingTransaction ? "Update" : "Save"}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .treasurer-reports { padding: 24px; max-width: 1400px; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
        .reports-header { margin-bottom: 24px; }
        .reports-header h1 { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
        .reports-header p { font-size: 14px; color: #64748b; margin: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-icon { font-size: 32px; width: 56px; height: 56px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-info { flex: 1; }
        .stat-value { display: block; font-size: 24px; font-weight: 700; color: #0f172a; }
        .stat-label { display: block; font-size: 13px; color: #64748b; }
        .stat-card.in .stat-icon { background: #dcfce7; color: #10b981; }
        .stat-card.out .stat-icon { background: #fee2e2; color: #ef4444; }
        .stat-card.balance .stat-icon { background: #eff6ff; color: #3b82f6; }
        .stat-card.collected .stat-icon { background: #fef3c7; color: #f59e0b; }
        .tab-navigation { display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
        .tab-btn { padding: 12px 24px; background: none; border: none; font-size: 15px; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.2s; border-radius: 8px 8px 0 0; }
        .tab-btn:hover { color: #3b82f6; background: #f1f5f9; }
        .tab-btn.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; background: #eff6ff; }
        .ledger-actions { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .ledger-filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .filter-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .btn-add, .btn-export { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-add { background: #3b82f6; color: white; }
        .btn-export { background: #10b981; color: white; }
        .ledger-table-container, .campaign-table-container, .member-table-container { overflow-x: auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .ledger-table, .campaign-table, .member-table { width: 100%; border-collapse: collapse; }
        .ledger-table th, .ledger-table td, .campaign-table th, .campaign-table td, .member-table th, .member-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .ledger-table th, .campaign-table th, .member-table th { background: #f8fafc; font-weight: 600; color: #1e293b; }
        .in-row { background: #f0fdf4; }
        .out-row { background: #fef2f2; }
        .amount-in { color: #10b981; font-weight: 500; }
        .amount-out { color: #ef4444; font-weight: 500; }
        .amount-balance { font-weight: 600; color: #1e293b; }
        .totals-row { background: #f1f5f9; font-weight: 600; }
        .actions { display: flex; gap: 8px; }
        .edit-btn, .delete-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; }
        .edit-btn { background: #eff6ff; color: #3b82f6; }
        .delete-btn { background: #fee2e2; color: #ef4444; }
        .campaign-summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .summary-card { background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .summary-value { display: block; font-size: 24px; font-weight: 700; color: #0f172a; }
        .summary-label { font-size: 13px; color: #64748b; }
        .progress-cell { display: flex; align-items: center; gap: 8px; }
        .progress-bar-small { width: 80px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: #10b981; transition: width 0.3s; }
        .member-actions { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
        .search-input { flex: 1; padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .status-badge.completed { background: #dcfce7; color: #10b981; }
        .status-badge.partial { background: #fef3c7; color: #f59e0b; }
        .status-badge.active { background: #eff6ff; color: #3b82f6; }
        .status-badge.not-started { background: #f1f5f9; color: #64748b; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; }
        .type-buttons { display: flex; gap: 12px; }
        .type-btn { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .type-btn.active-in { background: #dcfce7; border-color: #10b981; color: #10b981; }
        .type-btn.active-out { background: #fee2e2; border-color: #ef4444; color: #ef4444; }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .btn-cancel { flex: 1; padding: 10px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
        .btn-save { flex: 1; padding: 10px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer; }
        .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 24px; border-radius: 8px; color: white; z-index: 1100; animation: slideIn 0.3s ease; }
        .toast.success { background: #10b981; }
        .toast.error { background: #ef4444; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .reports-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
        .spinner { width: 48px; height: 48px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-row { text-align: center; color: #64748b; }
        .campaign-title { font-weight: 600; color: #1e293b; }
        @media (max-width: 768px) {
          .treasurer-reports { padding: 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .campaign-summary-cards { grid-template-columns: repeat(2, 1fr); }
          .ledger-actions { flex-direction: column; }
          .member-actions { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}