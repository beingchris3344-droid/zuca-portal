// frontend/src/pages/admin/ContributionsPage.jsx
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import BASE_URL from "../../api";
import backgroundImg from "../../assets/background.png";
import io from "socket.io-client";

// Professional icon components
const Icons = {
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Excel: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2" ry="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>,
  Doc: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 13 10 21 14 18 14 13 22 3"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Spinner: () => <svg className="spinner-small" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32"><animate attributeName="stroke-dashoffset" values="32;0" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>,
  Trash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Copy: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
};

function ContributionsPage() {
  const navigate = useNavigate();
  const [contributionTypes, setContributionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Silent background refresh
  const [newContribution, setNewContribution] = useState({
    title: "",
    description: "",
    amountRequired: "",
    deadline: "",
  });
  const [pledgeInputs, setPledgeInputs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPledges, setSelectedPledges] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]); // For bulk campaign actions
  const [selectAllCampaigns, setSelectAllCampaigns] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [expandedMember, setExpandedMember] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [updatingPledges, setUpdatingPledges] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'excel',
    campaign: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const exportMenuRef = useRef(null);

  // Loading states for buttons
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [bulkDeletingCampaigns, setBulkDeletingCampaigns] = useState(false);
  const [bulkDuplicatingCampaigns, setBulkDuplicatingCampaigns] = useState(false);
  const [approvingPledge, setApprovingPledge] = useState(null);
  const [addingManual, setAddingManual] = useState(null);
  const [resettingPledge, setResettingPledge] = useState(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Connected to real-time updates');
    });

    socket.on('pledge_updated', (updatedPledge) => {
      setContributionTypes(prevTypes => {
        return prevTypes.map(type => {
          if (type.id === updatedPledge.contributionTypeId) {
            return {
              ...type,
              pledges: type.pledges?.map(pledge => 
                pledge.id === updatedPledge.id ? updatedPledge : pledge
              )
            };
          }
          return type;
        });
      });
    });

    socket.on('pledge_created', (newPledge) => {
      setContributionTypes(prevTypes => {
        return prevTypes.map(type => {
          if (type.id === newPledge.contributionTypeId) {
            return {
              ...type,
              pledges: [newPledge, ...(type.pledges || [])]
            };
          }
          return type;
        });
      });
    });

    return () => socket.disconnect();
  }, []);

  // Check authentication
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
  }, [token, navigate]);

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type, id: Date.now() });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Silent background refresh function
  const silentRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const typesRes = await axios.get(`${BASE_URL}/api/contribution-types`, { headers });
      setContributionTypes(typesRes.data);
      console.log('Background refresh completed');
    } catch (err) {
      console.error("Background refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [headers]);

  // Set up silent background refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      silentRefresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [silentRefresh]);

  // Fetch all data (initial load)
  const fetchAll = async () => {
    setLoading(true);
    try {
      const typesRes = await axios.get(`${BASE_URL}/api/contribution-types`, { headers });
      setContributionTypes(typesRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
      showNotification(err.response?.data?.error || "Failed to fetch contributions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAll();
    }
  }, [token]);

  // Optimistic update helper
  const optimisticUpdate = (pledgeId, updates) => {
    setContributionTypes(prevTypes => {
      return prevTypes.map(type => ({
        ...type,
        pledges: type.pledges?.map(pledge => 
          pledge.id === pledgeId ? { ...pledge, ...updates } : pledge
        )
      }));
    });
  };

  // Calculate stats for a contribution type
  const calculateTypeStats = (type) => {
    const pledges = type.pledges || [];
    
    const activePledges = pledges.filter(p => 
      (p.pendingAmount || 0) > 0 || (p.amountPaid || 0) > 0
    );
    
    const totalApproved = pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalPending = pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
    
    const totalPossible = pledges.length * type.amountRequired;
    const completion = totalPossible > 0 ? (totalApproved / totalPossible) * 100 : 0;
    
    const contributors = new Set(activePledges.map(p => p.userId)).size;
    
    const pendingCount = pledges.filter(p => 
      p.status === "PENDING" && (p.pendingAmount || 0) > 0
    ).length;
    
    const completedCount = pledges.filter(p => 
      p.status === "COMPLETED" || 
      (p.amountPaid || 0) >= type.amountRequired
    ).length;
    
    return {
      totalApproved,
      totalPending,
      pendingCount,
      completedCount,
      completion: Math.min(completion, 100),
      contributors,
      totalMembers: pledges.length,
      perMemberAmount: type.amountRequired,
    };
  };

  // Handle add contribution type with loading state
  const handleAddContributionType = async () => {
    if (!newContribution.title || !newContribution.amountRequired) {
      showNotification("Title and amount are required", "error");
      return;
    }

    setCreatingCampaign(true);
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/contribution-types`,
        {
          title: newContribution.title,
          description: newContribution.description,
          amountRequired: parseFloat(newContribution.amountRequired),
          deadline: newContribution.deadline || null,
        },
        { headers }
      );
      
      setContributionTypes(prev => [response.data, ...prev]);
      setNewContribution({ title: "", description: "", amountRequired: "", deadline: "" });
      showNotification("Campaign created successfully");
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.error || "Failed to create campaign", "error");
    } finally {
      setCreatingCampaign(false);
    }
  };

  // Handle delete contribution type with loading state
  const handleDeleteContributionType = async (id) => {
    if (!window.confirm("Delete this campaign? This will delete all associated pledges.")) return;
    
    setDeletingCampaign(id);
    setContributionTypes(prev => prev.filter(t => t.id !== id));
    
    try {
      await axios.delete(`${BASE_URL}/api/contribution-types/${id}`, { headers });
      showNotification("Campaign deleted");
    } catch (err) {
      fetchAll();
      showNotification(err.response?.data?.error || "Failed to delete", "error");
    } finally {
      setDeletingCampaign(null);
    }
  };

  // UPDATED: Bulk delete campaigns with backend API call
  const handleBulkDeleteCampaigns = async () => {
    if (!selectedCampaigns.length) {
      showNotification("No campaigns selected", "error");
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete ${selectedCampaigns.length} selected campaigns? This action cannot be undone and will delete all associated pledges.`)) return;

    setBulkDeletingCampaigns(true);

    try {
      // Make API call to delete campaigns from database
      const response = await axios.post(
        `${BASE_URL}/api/contribution-types/bulk-delete`,
        { ids: selectedCampaigns },
        { headers }
      );

      // Remove selected campaigns from UI only after successful backend deletion
      setContributionTypes(prev => prev.filter(campaign => !selectedCampaigns.includes(campaign.id)));
      
      setSelectedCampaigns([]);
      setSelectAllCampaigns(false);
      showNotification(response.data.message || `${selectedCampaigns.length} campaigns permanently deleted`, "success");
    } catch (err) {
      console.error("Bulk delete error:", err);
      showNotification(err.response?.data?.error || "Failed to delete campaigns", "error");
      // Refresh data to ensure UI is in sync with database
      fetchAll();
    } finally {
      setBulkDeletingCampaigns(false);
    }
  };

  // UPDATED: Bulk duplicate campaigns with backend API call
  const handleBulkDuplicateCampaigns = async () => {
    if (!selectedCampaigns.length) {
      showNotification("No campaigns selected", "error");
      return;
    }

    setBulkDuplicatingCampaigns(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/contribution-types/bulk-duplicate`,
        { ids: selectedCampaigns },
        { headers }
      );

      // Add duplicated campaigns to UI
      setContributionTypes(prev => [...response.data.campaigns, ...prev]);
      
      setSelectedCampaigns([]);
      setSelectAllCampaigns(false);
      showNotification(response.data.message || `${selectedCampaigns.length} campaigns duplicated successfully`, "success");
    } catch (err) {
      console.error("Bulk duplicate error:", err);
      showNotification(err.response?.data?.error || "Failed to duplicate campaigns", "error");
    } finally {
      setBulkDuplicatingCampaigns(false);
    }
  };

  // Toggle select campaign (for bulk actions)
  const toggleSelectCampaign = (id) => {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle select all campaigns
  const toggleSelectAllCampaigns = () => {
    if (selectAllCampaigns) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(contributionTypes.map(t => t.id));
    }
    setSelectAllCampaigns(!selectAllCampaigns);
  };

  // Handle approve pledge with loading state
  const handleApprovePledge = async (pledgeId, p, type) => {
    setUpdatingPledges(prev => ({ ...prev, [pledgeId]: true }));
    setApprovingPledge(pledgeId);
    
    const newPaid = p.amountPaid + p.pendingAmount;
    const newStatus = newPaid >= type.amountRequired ? "COMPLETED" : "APPROVED";
    
    optimisticUpdate(pledgeId, {
      amountPaid: newPaid,
      pendingAmount: 0,
      status: newStatus
    });

    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/approve`, {}, { headers });
      showNotification("Pledge approved successfully");
    } catch (err) {
      fetchAll();
      showNotification(err.response?.data?.error || "Approval failed", "error");
    } finally {
      setUpdatingPledges(prev => ({ ...prev, [pledgeId]: false }));
      setApprovingPledge(null);
    }
  };

  // Handle manual add with loading state
  const handleManualAdd = async (pledgeId, p, type) => {
    const addAmount = parseFloat(pledgeInputs[pledgeId]?.amount || 0);
    if (!addAmount || addAmount <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }

    setUpdatingPledges(prev => ({ ...prev, [pledgeId]: true }));
    setAddingManual(pledgeId);

    const totalPaid = p.amountPaid + addAmount;
    const newStatus = totalPaid >= type.amountRequired ? "COMPLETED" : p.status;

    optimisticUpdate(pledgeId, {
      amountPaid: totalPaid,
      status: newStatus
    });

    try {
      await axios.put(
        `${BASE_URL}/api/pledges/${pledgeId}/manual-add`,
        { amount: addAmount },
        { headers }
      );
      
      setPledgeInputs({
        ...pledgeInputs,
        [pledgeId]: { ...pledgeInputs[pledgeId], amount: "" }
      });
      
      showNotification("Amount added successfully");
    } catch (err) {
      fetchAll();
      showNotification(err.response?.data?.error || "Failed to add", "error");
    } finally {
      setUpdatingPledges(prev => ({ ...prev, [pledgeId]: false }));
      setAddingManual(null);
    }
  };

  // Handle edit message
  const handleEditMessage = async (pledgeId) => {
    const msg = pledgeInputs[pledgeId]?.message;
    if (msg === undefined) return;

    setUpdatingPledges(prev => ({ ...prev, [pledgeId]: true }));

    optimisticUpdate(pledgeId, { message: msg });

    try {
      await axios.put(
        `${BASE_URL}/api/pledges/${pledgeId}/edit-message`,
        { message: msg },
        { headers }
      );
      showNotification("Message updated");
    } catch (err) {
      fetchAll();
      showNotification(err.response?.data?.error || "Failed to update message", "error");
    } finally {
      setUpdatingPledges(prev => ({ ...prev, [pledgeId]: false }));
    }
  };

  // Handle reset pledge with loading state
  const handleResetPledge = async (pledgeId) => {
    if (!window.confirm("Reset this pledge? This will clear all amounts and status.")) return;
    
    setUpdatingPledges(prev => ({ ...prev, [pledgeId]: true }));
    setResettingPledge(pledgeId);

    optimisticUpdate(pledgeId, {
      amountPaid: 0,
      pendingAmount: 0,
      message: null,
      status: "PENDING",
    });

    try {
      await axios.put(`${BASE_URL}/api/pledges/${pledgeId}/reset`, {}, { headers });
      showNotification("Pledge reset");
    } catch (err) {
      fetchAll();
      showNotification(err.response?.data?.error || "Reset failed", "error");
    } finally {
      setUpdatingPledges(prev => ({ ...prev, [pledgeId]: false }));
      setResettingPledge(null);
    }
  };

  // Handle bulk approve (members)
  const handleBulkApprove = async () => {
    const pendingSelected = selectedPledges.filter(id => {
      const pledge = contributionTypes
        .flatMap(t => t.pledges || [])
        .find(p => p.id === id);
      return pledge && pledge.pendingAmount > 0 && pledge.status === "PENDING";
    });

    if (!pendingSelected.length) {
      showNotification("No pending pledges selected", "error");
      return;
    }

    setBulkApproving(true);

    pendingSelected.forEach(id => {
      setUpdatingPledges(prev => ({ ...prev, [id]: true }));
      
      const pledge = contributionTypes
        .flatMap(t => t.pledges || [])
        .find(p => p.id === id);
      
      if (pledge) {
        optimisticUpdate(id, {
          amountPaid: pledge.amountPaid + pledge.pendingAmount,
          pendingAmount: 0,
          status: "APPROVED"
        });
      }
    });

    try {
      for (const id of pendingSelected) {
        await axios.put(`${BASE_URL}/api/pledges/${id}/approve`, {}, { headers });
      }
      setSelectedPledges([]);
      setSelectAll(false);
      showNotification(`${pendingSelected.length} pledges approved`);
    } catch (err) {
      fetchAll();
      showNotification(err.response?.data?.error || "Bulk approve failed", "error");
    } finally {
      pendingSelected.forEach(id => {
        setUpdatingPledges(prev => ({ ...prev, [id]: false }));
      });
      setBulkApproving(false);
    }
  };

  // Toggle select pledge (members)
  const toggleSelectPledge = (id) => {
    setSelectedPledges((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filter pledges by status
  const filterPledgesByStatus = (pledges) => {
    if (activeTab === "all") return pledges;
    if (activeTab === "pending") return pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0);
    if (activeTab === "approved") return pledges.filter(p => p.status === "APPROVED");
    if (activeTab === "completed") return pledges.filter(p => p.status === "COMPLETED" || (p.amountPaid || 0) >= (p.contributionType?.amountRequired || 0));
    return pledges;
  };

  // Filter pledges by search
  const filterPledgesBySearch = (pledges) => {
    if (!searchTerm) return pledges;
    return pledges.filter(p => 
      p.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get status badge style
  const getStatusStyle = (status, completed) => {
    if (completed) return "completed";
    switch(status) {
      case "APPROVED": return "approved";
      case "PENDING": return "pending";
      default: return "default";
    }
  };

  // Get status text
  const getStatusText = (pledge, type) => {
    if ((pledge.amountPaid || 0) >= (type.amountRequired || 0)) return "COMPLETED";
    if (pledge.status === "APPROVED") return "APPROVED";
    if (pledge.status === "PENDING" && pledge.pendingAmount > 0) return "PENDING";
    if (pledge.amountPaid > 0) return "APPROVED";
    return "NO PLEDGE";
  };

  // Export functions
  const exportToExcel = (data, filename) => {
    const cleanData = data.map(({ Email, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanData);
    
    const colWidths = [];
    const headers = Object.keys(cleanData[0] || {});
    
    headers.forEach(header => {
      let maxLength = header.length;
      cleanData.forEach(row => {
        const cellValue = String(row[header] || '');
        maxLength = Math.max(maxLength, cellValue.length);
      });
      colWidths.push({ wch: Math.min(maxLength + 2, 30) });
    });
    
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contributions");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToCSV = (data, filename) => {
    const cleanData = data.map(({ Email, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  const exportToDoc = (data, filename) => {
    const cleanData = data.map(({ Email, ...rest }) => rest);
    
    const columnHeaders = {
      Campaign: "Campaign",
      Member: "Member",
      AmountRequired: "Amount Required (KES)",
      AmountPaid: "Amount Paid (KES)",
      PendingAmount: "Pending (KES)",
      Status: "Status",
      Message: "Message",
      Date: "Date"
    };

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          body { 
            font-family: 'Times New Roman', Times, serif; 
            margin: 1in 0.75in; 
            color: #000000;
            line-height: 1.4;
            font-size: 11pt;
          }
          h1 { 
            color: #000000; 
            border-bottom: 2px solid #000000; 
            padding-bottom: 6px;
            font-size: 24pt;
            font-weight: bold;
            margin: 0 0 15px 0;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header-info {
            margin-bottom: 20px;
            padding: 12px 15px;
            background: #f5f5f5;
            border: 1px solid #cccccc;
            font-size: 11pt;
            border-radius: 4px;
          }
          .header-info p {
            margin: 4px 0;
          }
          .header-info strong {
            font-weight: bold;
            min-width: 120px;
            display: inline-block;
          }
          .table-container {
            width: 100%;
            overflow-x: auto;
            margin: 20px 0;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            font-size: 10pt;
            border: 1px solid #999999;
            table-layout: fixed;
          }
          th { 
            background: #e0e0e0; 
            color: #000000; 
            padding: 8px 6px; 
            text-align: left; 
            font-weight: bold;
            border: 1px solid #999999;
            font-size: 10pt;
            word-wrap: break-word;
          }
          td { 
            padding: 6px; 
            border: 1px solid #999999;
            vertical-align: top;
            word-wrap: break-word;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .amount {
            text-align: right;
            font-family: 'Courier New', monospace;
            white-space: nowrap;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 8px;
            background: #f0f0f0;
            border: 1px solid #999999;
            font-weight: bold;
            font-size: 9pt;
            border-radius: 3px;
          }
          .footer {
            margin-top: 25px;
            text-align: right;
            font-size: 9pt;
            color: #666666;
            border-top: 1px solid #cccccc;
            padding-top: 10px;
          }
          th:nth-child(1) { width: 15%; }
          th:nth-child(2) { width: 15%; }
          th:nth-child(3) { width: 10%; }
          th:nth-child(4) { width: 10%; }
          th:nth-child(5) { width: 10%; }
          th:nth-child(6) { width: 8%; }
          th:nth-child(7) { width: 22%; }
          th:nth-child(8) { width: 10%; }
        </style>
      </head>
      <body>
        <h1>CONTRIBUTIONS REPORT</h1>
        
        <div class="header-info">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Records:</strong> ${cleanData.length}</p>
          <p><strong>Campaign:</strong> ${exportOptions.campaign === 'all' ? 'All Campaigns' : contributionTypes.find(t => t.id === exportOptions.campaign)?.title}</p>
          <p><strong>Status Filter:</strong> ${exportOptions.status.charAt(0).toUpperCase() + exportOptions.status.slice(1)}</p>
          ${exportOptions.dateFrom ? `<p><strong>Date Range:</strong> ${new Date(exportOptions.dateFrom).toLocaleDateString()} to ${exportOptions.dateTo ? new Date(exportOptions.dateTo).toLocaleDateString() : 'Present'}</p>` : ''}
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${Object.keys(cleanData[0] || {}).map(key => `<th>${columnHeaders[key] || key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${cleanData.map(row => {
                return `
                  <tr>
                    ${Object.entries(row).map(([key, val]) => {
                      if (key === 'Status') {
                        return `<td><span class="status-badge">${val}</span></td>`;
                      }
                      if (key.includes('Amount') || key.includes('Paid') || key.includes('Required') || key.includes('Pending')) {
                        return `<td class="amount">KES ${typeof val === 'number' ? val.toLocaleString() : val}</td>`;
                      }
                      if (key === 'Message' && val && val.length > 50) {
                        return `<td>${val.substring(0, 50)}...</td>`;
                      }
                      return `<td>${val || '-'}</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated by ZUCA Portal - Contributions Management System</p>
          <p>This is a system-generated document</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    saveAs(blob, `${filename}.doc`);
  };

  const handleExport = () => {
    const { format, campaign, status, dateFrom, dateTo } = exportOptions;

    let data = [];

    if (campaign === 'all') {
      contributionTypes.forEach(type => {
        let filteredPledges = type.pledges || [];
        
        if (status !== 'all') {
          if (status === 'pending') {
            filteredPledges = filteredPledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0);
          } else if (status === 'approved') {
            filteredPledges = filteredPledges.filter(p => p.status === "APPROVED");
          } else if (status === 'completed') {
            filteredPledges = filteredPledges.filter(p => p.status === "COMPLETED" || (p.amountPaid || 0) >= type.amountRequired);
          }
        }

        if (dateFrom || dateTo) {
          filteredPledges = filteredPledges.filter(p => {
            const pledgeDate = new Date(p.createdAt);
            if (dateFrom && new Date(dateFrom) > pledgeDate) return false;
            if (dateTo && new Date(dateTo) < pledgeDate) return false;
            return true;
          });
        }

        filteredPledges.forEach(pledge => {
          data.push({
            Campaign: type.title,
            Member: pledge.user?.fullName || "Unknown",
            Email: pledge.user?.email || "",
            AmountRequired: type.amountRequired,
            AmountPaid: pledge.amountPaid || 0,
            PendingAmount: pledge.pendingAmount || 0,
            Status: (pledge.amountPaid || 0) >= type.amountRequired ? "COMPLETED" : pledge.status,
            Message: pledge.message || "-",
            Date: new Date(pledge.createdAt).toLocaleDateString(),
          });
        });
      });
    } else {
      const type = contributionTypes.find(t => t.id === campaign);
      if (type) {
        let filteredPledges = type.pledges || [];
        
        if (status !== 'all') {
          if (status === 'pending') {
            filteredPledges = filteredPledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0);
          } else if (status === 'approved') {
            filteredPledges = filteredPledges.filter(p => p.status === "APPROVED");
          } else if (status === 'completed') {
            filteredPledges = filteredPledges.filter(p => p.status === "COMPLETED" || (p.amountPaid || 0) >= type.amountRequired);
          }
        }

        if (dateFrom || dateTo) {
          filteredPledges = filteredPledges.filter(p => {
            const pledgeDate = new Date(p.createdAt);
            if (dateFrom && new Date(dateFrom) > pledgeDate) return false;
            if (dateTo && new Date(dateTo) < pledgeDate) return false;
            return true;
          });
        }

        filteredPledges.forEach(pledge => {
          data.push({
            Campaign: type.title,
            Member: pledge.user?.fullName || "Unknown",
            Email: pledge.user?.email || "",
            AmountRequired: type.amountRequired,
            AmountPaid: pledge.amountPaid || 0,
            PendingAmount: pledge.pendingAmount || 0,
            Status: (pledge.amountPaid || 0) >= type.amountRequired ? "COMPLETED" : pledge.status,
            Message: pledge.message || "-",
            Date: new Date(pledge.createdAt).toLocaleDateString(),
          });
        });
      }
    }

    if (data.length === 0) {
      showNotification("No data to export", "error");
      return;
    }

    const filename = `contributions_${new Date().toISOString().split('T')[0]}`;

    if (format === 'excel') {
      exportToExcel(data, filename);
    } else if (format === 'csv') {
      exportToCSV(data, filename);
    } else if (format === 'doc') {
      exportToDoc(data, filename);
    }

    setShowExportMenu(false);
    showNotification(`Export completed: ${data.length} records`, "success");
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalCampaigns = contributionTypes.length;
    const totalMembers = new Set(contributionTypes.flatMap(t => t.pledges?.map(p => p.userId) || [])).size;
    const pendingCount = contributionTypes.reduce((sum, t) => 
      sum + (t.pledges?.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length || 0), 0);
    const totalCollected = contributionTypes.reduce((sum, t) => 
      sum + (t.pledges?.reduce((s, p) => s + (p.amountPaid || 0), 0) || 0), 0);

    return { totalCampaigns, totalMembers, pendingCount, totalCollected };
  }, [contributionTypes]);

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="loading-container"
      >
        <div className="spinner" />
        <p className="loading-text">Loading contributions dashboard...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="contributions-page"
    >
      {/* Background Image with Overlay */}
      <div className="background" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="background-overlay" />

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            key={notification.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className={`notification ${notification.type}`}
          >
            {notification.type === "success" ? "✓" : "⚠"} {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="header">
        <div>
          <h1 className="title">Contributions Management</h1>
          <p className="subtitle">Monitor and manage member contributions</p>
        </div>

        {/* Export Button with Dropdown */}
        <div className="export-dropdown" ref={exportMenuRef}>
          <button 
            className="export-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Icons.Download />
            Export Data
            <span className="chevron">{showExportMenu ? "▼" : "▶"}</span>
          </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="export-menu"
              >
                <div className="export-option">
                  <label>Format</label>
                  <div className="format-buttons">
                    <button
                      className={exportOptions.format === 'excel' ? 'active' : ''}
                      onClick={() => setExportOptions({...exportOptions, format: 'excel'})}
                    >
                      <Icons.Excel /> Excel
                    </button>
                    <button
                      className={exportOptions.format === 'csv' ? 'active' : ''}
                      onClick={() => setExportOptions({...exportOptions, format: 'csv'})}
                    >
                      <Icons.Download /> CSV
                    </button>
                    <button
                      className={exportOptions.format === 'doc' ? 'active' : ''}
                      onClick={() => setExportOptions({...exportOptions, format: 'doc'})}
                    >
                      <Icons.Doc /> Document
                    </button>
                  </div>
                </div>

                <div className="export-option">
                  <label>Campaign</label>
                  <select
                    value={exportOptions.campaign}
                    onChange={(e) => setExportOptions({...exportOptions, campaign: e.target.value})}
                  >
                    <option value="all">All Campaigns</option>
                    {contributionTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.title}</option>
                    ))}
                  </select>
                </div>

                <div className="export-option">
                  <label>Status Filter</label>
                  <select
                    value={exportOptions.status}
                    onChange={(e) => setExportOptions({...exportOptions, status: e.target.value})}
                  >
                    <option value="all">All Pledges</option>
                    <option value="pending">Pending Only</option>
                    <option value="approved">Approved Only</option>
                    <option value="completed">Completed Only</option>
                  </select>
                </div>

                <div className="export-option">
                  <label>Date Range</label>
                  <div className="date-range">
                    <input
                      type="date"
                      placeholder="From"
                      value={exportOptions.dateFrom}
                      onChange={(e) => setExportOptions({...exportOptions, dateFrom: e.target.value})}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      placeholder="To"
                      value={exportOptions.dateTo}
                      onChange={(e) => setExportOptions({...exportOptions, dateTo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="export-actions">
                  <button className="cancel-btn" onClick={() => setShowExportMenu(false)}>
                    Cancel
                  </button>
                  <button className="export-confirm-btn" onClick={handleExport}>
                    Export Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div>
            <span className="stat-value">{summaryStats.totalCampaigns}</span>
            <span className="stat-label">Active Campaigns</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <span className="stat-value">{summaryStats.totalMembers}</span>
            <span className="stat-label">Contributors</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <div>
            <span className="stat-value">{summaryStats.pendingCount}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <span className="stat-value">KES {summaryStats.totalCollected.toLocaleString()}</span>
            <span className="stat-label">Collected</span>
          </div>
        </div>
      </div>

      {/* Create Campaign Form */}
      <div className="create-campaign">
        <h2 className="section-title">Create New Campaign</h2>
        <div className="campaign-form">
          <input
            className="form-input"
            placeholder="Campaign title *"
            value={newContribution.title}
            onChange={(e) => setNewContribution({ ...newContribution, title: e.target.value })}
          />
          <input
            className="form-input"
            placeholder="Description (optional)"
            value={newContribution.description}
            onChange={(e) => setNewContribution({ ...newContribution, description: e.target.value })}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Amount per member (KES) *"
            value={newContribution.amountRequired}
            onChange={(e) => setNewContribution({ ...newContribution, amountRequired: e.target.value })}
          />
          <input
            className="form-input"
            type="date"
            placeholder="Deadline (optional)"
            value={newContribution.deadline}
            onChange={(e) => setNewContribution({ ...newContribution, deadline: e.target.value })}
          />
          <button 
            className="create-btn" 
            onClick={handleAddContributionType}
            disabled={creatingCampaign}
          >
            {creatingCampaign ? <Icons.Spinner /> : <Icons.Plus />}
            {creatingCampaign ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Campaign Selection Header */}
      <div className="campaign-selection-header">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={selectAllCampaigns}
            onChange={toggleSelectAllCampaigns}
          />
          Select All Campaigns
        </label>
        {selectedCampaigns.length > 0 && (
          <div className="campaign-bulk-actions">
            <span className="selected-count">{selectedCampaigns.length} campaigns selected</span>
            <button 
              className="bulk-delete-campaigns-btn"
              onClick={handleBulkDeleteCampaigns}
              disabled={bulkDeletingCampaigns}
            >
              {bulkDeletingCampaigns ? <Icons.Spinner /> : <Icons.Trash />}
              {bulkDeletingCampaigns ? 'Deleting...' : 'Delete Selected'}
            </button>
            <button 
              className="bulk-duplicate-campaigns-btn"
              onClick={handleBulkDuplicateCampaigns}
              disabled={bulkDuplicatingCampaigns}
            >
              {bulkDuplicatingCampaigns ? <Icons.Spinner /> : <Icons.Copy />}
              {bulkDuplicatingCampaigns ? 'Duplicating...' : 'Duplicate Selected'}
            </button>
          </div>
        )}
      </div>

      {/* Campaigns List */}
      <div className="campaigns-list">
        {contributionTypes.map((type) => {
          const typeStats = calculateTypeStats(type);
          const isCollapsed = collapsed[type.id];
          const isSelected = selectedCampaigns.includes(type.id);
          
          let filteredPledges = type.pledges || [];
          filteredPledges = filterPledgesBySearch(filteredPledges);
          
          const pendingPledges = filteredPledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0);
          const approvedPledges = filteredPledges.filter(p => p.status === "APPROVED");
          const completedPledges = filteredPledges.filter(p => p.status === "COMPLETED" || (p.amountPaid || 0) >= type.amountRequired);
          const noPledge = filteredPledges.filter(p => !p.pendingAmount && !p.amountPaid);

          return (
            <motion.div
              key={type.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="campaign-card"
            >
              {/* Campaign Header with Checkbox */}
              <div className="campaign-header" onClick={() => setCollapsed({ ...collapsed, [type.id]: !isCollapsed })}>
                <div className="campaign-header-left">
                  <input
                    type="checkbox"
                    className="campaign-checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectCampaign(type.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="campaign-info">
                    <h3 className="campaign-name">{type.title}</h3>
                    <div className="campaign-meta">
                      <span className="campaign-target">KES {type.amountRequired?.toLocaleString()} per member</span>
                      {type.deadline && (
                        <span className="campaign-deadline">Due {new Date(type.deadline).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="campaign-progress-info">
                  <div className="progress-stats">
                    <span className="progress-percent">{typeStats.completion.toFixed(1)}%</span>
                    <span className="progress-count">{typeStats.contributors}/{typeStats.totalMembers} members</span>
                  </div>
                  <span className="collapse-icon">{isCollapsed ? "▼" : "▲"}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${typeStats.completion}%` }}
                  />
                </div>
              </div>

              {/* Expanded Content */}
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="campaign-details"
                >
                  {/* Search and Filter Bar */}
                  <div className="member-filters">
                    <div className="search-wrapper">
                      <Icons.Search />
                      <input
                        type="text"
                        placeholder="Search members..."
                        className="member-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="status-tabs">
                      <button 
                        className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                      >
                        All ({filteredPledges.length})
                      </button>
                      <button 
                        className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                      >
                        Pending ({pendingPledges.length})
                      </button>
                      <button 
                        className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('approved')}
                      >
                        Approved ({approvedPledges.length})
                      </button>
                      <button 
                        className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                      >
                        Completed ({completedPledges.length})
                      </button>
                    </div>

                    {/* Bulk Actions for Members */}
                    {selectedPledges.length > 0 && (
                      <div className="bulk-actions">
                        <span className="selected-count">{selectedPledges.length} selected</span>
                        <button className="bulk-approve" onClick={handleBulkApprove} disabled={bulkApproving}>
                          {bulkApproving ? <Icons.Spinner /> : <Icons.Check />}
                          {bulkApproving ? 'Approving...' : 'Approve Selected'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Members List */}
                  <div className="members-list">
                    {activeTab === 'all' && (
                      <>
                        {pendingPledges.length > 0 && (
                          <div className="member-section">
                            <h4 className="section-heading pending-heading">
                              ⏳ Pending Approval ({pendingPledges.length})
                            </h4>
                            {pendingPledges.map((pledge) => (
                              <MemberRow
                                key={pledge.id}
                                pledge={pledge}
                                type={type}
                                isExpanded={expandedMember === pledge.id}
                                onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                                onApprove={handleApprovePledge}
                                onManualAdd={handleManualAdd}
                                onEditMessage={handleEditMessage}
                                onReset={handleResetPledge}
                                onSelect={toggleSelectPledge}
                                isSelected={selectedPledges.includes(pledge.id)}
                                inputValue={pledgeInputs[pledge.id]}
                                onInputChange={(id, field, value) => 
                                  setPledgeInputs({
                                    ...pledgeInputs,
                                    [id]: { ...pledgeInputs[id], [field]: value }
                                  })
                                }
                                isUpdating={updatingPledges[pledge.id]}
                                approvingId={approvingPledge}
                                addingId={addingManual}
                                resettingId={resettingPledge}
                              />
                            ))}
                          </div>
                        )}

                        {approvedPledges.length > 0 && (
                          <div className="member-section">
                            <h4 className="section-heading approved-heading">
                              ✓ Approved ({approvedPledges.length})
                            </h4>
                            {approvedPledges.map((pledge) => (
                              <MemberRow
                                key={pledge.id}
                                pledge={pledge}
                                type={type}
                                isExpanded={expandedMember === pledge.id}
                                onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                                onManualAdd={handleManualAdd}
                                onEditMessage={handleEditMessage}
                                onReset={handleResetPledge}
                                onSelect={toggleSelectPledge}
                                isSelected={selectedPledges.includes(pledge.id)}
                                inputValue={pledgeInputs[pledge.id]}
                                onInputChange={(id, field, value) => 
                                  setPledgeInputs({
                                    ...pledgeInputs,
                                    [id]: { ...pledgeInputs[id], [field]: value }
                                  })
                                }
                                isUpdating={updatingPledges[pledge.id]}
                                approvingId={approvingPledge}
                                addingId={addingManual}
                                resettingId={resettingPledge}
                              />
                            ))}
                          </div>
                        )}

                        {completedPledges.length > 0 && (
                          <div className="member-section">
                            <h4 className="section-heading completed-heading">
                              ✅ Completed ({completedPledges.length})
                            </h4>
                            {completedPledges.map((pledge) => (
                              <MemberRow
                                key={pledge.id}
                                pledge={pledge}
                                type={type}
                                isExpanded={expandedMember === pledge.id}
                                onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                                onEditMessage={handleEditMessage}
                                onSelect={toggleSelectPledge}
                                isSelected={selectedPledges.includes(pledge.id)}
                                inputValue={pledgeInputs[pledge.id]}
                                onInputChange={(id, field, value) => 
                                  setPledgeInputs({
                                    ...pledgeInputs,
                                    [id]: { ...pledgeInputs[id], [field]: value }
                                  })
                                }
                                isUpdating={updatingPledges[pledge.id]}
                                approvingId={approvingPledge}
                                addingId={addingManual}
                                resettingId={resettingPledge}
                              />
                            ))}
                          </div>
                        )}

                        {noPledge.length > 0 && (
                          <div className="member-section">
                            <h4 className="section-heading default-heading">
                              📭 No Pledge ({noPledge.length})
                            </h4>
                            {noPledge.map((pledge) => (
                              <MemberRow
                                key={pledge.id}
                                pledge={pledge}
                                type={type}
                                isExpanded={expandedMember === pledge.id}
                                onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                                onManualAdd={handleManualAdd}
                                onEditMessage={handleEditMessage}
                                onSelect={toggleSelectPledge}
                                isSelected={selectedPledges.includes(pledge.id)}
                                inputValue={pledgeInputs[pledge.id]}
                                onInputChange={(id, field, value) => 
                                  setPledgeInputs({
                                    ...pledgeInputs,
                                    [id]: { ...pledgeInputs[id], [field]: value }
                                  })
                                }
                                isUpdating={updatingPledges[pledge.id]}
                                approvingId={approvingPledge}
                                addingId={addingManual}
                                resettingId={resettingPledge}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'pending' && (
                      <>
                        {pendingPledges.map((pledge) => (
                          <MemberRow
                            key={pledge.id}
                            pledge={pledge}
                            type={type}
                            isExpanded={expandedMember === pledge.id}
                            onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                            onApprove={handleApprovePledge}
                            onManualAdd={handleManualAdd}
                            onEditMessage={handleEditMessage}
                            onReset={handleResetPledge}
                            onSelect={toggleSelectPledge}
                            isSelected={selectedPledges.includes(pledge.id)}
                            inputValue={pledgeInputs[pledge.id]}
                            onInputChange={(id, field, value) => 
                              setPledgeInputs({
                                ...pledgeInputs,
                                [id]: { ...pledgeInputs[id], [field]: value }
                              })
                            }
                            isUpdating={updatingPledges[pledge.id]}
                            approvingId={approvingPledge}
                            addingId={addingManual}
                            resettingId={resettingPledge}
                          />
                        ))}
                      </>
                    )}

                    {activeTab === 'approved' && (
                      <>
                        {approvedPledges.map((pledge) => (
                          <MemberRow
                            key={pledge.id}
                            pledge={pledge}
                            type={type}
                            isExpanded={expandedMember === pledge.id}
                            onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                            onManualAdd={handleManualAdd}
                            onEditMessage={handleEditMessage}
                            onReset={handleResetPledge}
                            onSelect={toggleSelectPledge}
                            isSelected={selectedPledges.includes(pledge.id)}
                            inputValue={pledgeInputs[pledge.id]}
                            onInputChange={(id, field, value) => 
                              setPledgeInputs({
                                ...pledgeInputs,
                                [id]: { ...pledgeInputs[id], [field]: value }
                              })
                            }
                            isUpdating={updatingPledges[pledge.id]}
                            approvingId={approvingPledge}
                            addingId={addingManual}
                            resettingId={resettingPledge}
                          />
                        ))}
                      </>
                    )}

                    {activeTab === 'completed' && (
                      <>
                        {completedPledges.map((pledge) => (
                          <MemberRow
                            key={pledge.id}
                            pledge={pledge}
                            type={type}
                            isExpanded={expandedMember === pledge.id}
                            onToggle={() => setExpandedMember(expandedMember === pledge.id ? null : pledge.id)}
                            onEditMessage={handleEditMessage}
                            onSelect={toggleSelectPledge}
                            isSelected={selectedPledges.includes(pledge.id)}
                            inputValue={pledgeInputs[pledge.id]}
                            onInputChange={(id, field, value) => 
                              setPledgeInputs({
                                ...pledgeInputs,
                                [id]: { ...pledgeInputs[id], [field]: value }
                              })
                            }
                            isUpdating={updatingPledges[pledge.id]}
                            approvingId={approvingPledge}
                            addingId={addingManual}
                            resettingId={resettingPledge}
                          />
                        ))}
                      </>
                    )}
                  </div>

                  {/* Campaign Footer */}
                  <div className="campaign-footer">
                    <button 
                      className="delete-campaign-btn"
                      onClick={() => handleDeleteContributionType(type.id)}
                      disabled={deletingCampaign === type.id}
                    >
                      {deletingCampaign === type.id ? <Icons.Spinner /> : null}
                      {deletingCampaign === type.id ? 'Deleting...' : 'Delete Campaign'}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <style>{`
        .contributions-page {
          min-height: 100vh;
          padding: 24px;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-y: auto;
          background: #199dea75;
          border-radius: 30px;
        }

        .background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-size: cover;
          background-position: center;
          z-index: -2;
        }

        .background-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%);
          z-index: -1;
        }

        /* Notification */
        .notification {
          position: fixed;
          top: 24px;
          right: 24px;
          padding: 12px 24px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .notification.success { background: #10b981; }
        .notification.error { background: #ef4444; }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        /* Export Dropdown */
        .export-dropdown {
          position: relative;
        }
        .export-btn {
          padding: 10px 20px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .export-btn:hover {
          background: #f8fafc;
        }
        .chevron {
          font-size: 12px;
          color: #94a3b8;
        }
        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          padding: 20px;
          z-index: 100;
        }
        @media (max-width: 768px) {
          .export-menu {
            width: 300px;
          }
        }
        .export-option {
          margin-bottom: 20px;
        }
        .export-option label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 8px;
        }
        .format-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .format-buttons button {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .format-buttons button.active {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }
        .export-option select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
          color: #1e293b;
        }
        .date-range {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .date-range input {
          flex: 1;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
        }
        .date-range span {
          color: #94a3b8;
        }
        .export-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .cancel-btn {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
        }
        .export-confirm-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background: #2563eb;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          background: #f1f5f9;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }
        .stat-label {
          display: block;
          font-size: 13px;
          color: #64748b;
        }

        /* Create Campaign */
        .create-campaign {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px 0;
        }
        .campaign-form {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr auto;
          gap: 12px;
        }
        @media (max-width: 1024px) {
          .campaign-form {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 768px) {
          .campaign-form {
            grid-template-columns: 1fr;
          }
        }
        .form-input {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
        }
        .form-input:focus {
          outline: none;
          border-color: #2563eb;
        }
        .create-btn {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .create-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .create-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Campaign Selection Header */
        .campaign-selection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #0f172a;
          cursor: pointer;
        }
        .campaign-bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bulk-delete-campaigns-btn, .bulk-duplicate-campaigns-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .bulk-delete-campaigns-btn {
          background: #fee2e2;
          color: #ef4444;
        }
        .bulk-delete-campaigns-btn:hover:not(:disabled) {
          background: #fecaca;
        }
        .bulk-duplicate-campaigns-btn {
          background: #e2e8f0;
          color: #475569;
        }
        .bulk-duplicate-campaigns-btn:hover:not(:disabled) {
          background: #cbd5e1;
        }
        .bulk-delete-campaigns-btn:disabled, .bulk-duplicate-campaigns-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Campaigns List */
        .campaigns-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Campaign Card */
        .campaign-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .campaign-header {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .campaign-header:hover {
          background: #f8fafc;
        }
        .campaign-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .campaign-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .campaign-info {
          flex: 1;
        }
        .campaign-name {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 8px 0;
        }
        .campaign-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .campaign-target {
          font-size: 13px;
          color: #2563eb;
          background: #eff6ff;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .campaign-deadline {
          font-size: 13px;
          color: #64748b;
        }
        .campaign-progress-info {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .progress-stats {
          text-align: right;
        }
        .progress-percent {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }
        .progress-count {
          display: block;
          font-size: 12px;
          color: #64748b;
        }
        .collapse-icon {
          font-size: 20px;
          color: #94a3b8;
        }

        /* Progress Bar */
        .progress-bar-container {
          padding: 0 20px 20px;
        }
        .progress-bar {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.3s;
        }

        /* Campaign Details */
        .campaign-details {
          border-top: 1px solid #f1f5f9;
        }

        /* Member Filters */
        .member-filters {
          padding: 20px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        .search-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 16px;
          color: #94a3b8;
        }
        .member-search {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
        }
        .status-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background: #f1f5f9;
        }
        .tab-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        /* Bulk Actions for Members */
        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 8px;
        }
        .selected-count {
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
        }
        .bulk-approve {
          padding: 6px 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .bulk-approve:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Members List */
        .members-list {
          padding: 0 20px;
        }
        .member-section {
          margin-bottom: 24px;
        }
        .section-heading {
          padding: 12px 0;
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 2px solid;
        }
        .pending-heading {
          color: #d97706;
          border-bottom-color: #fef3c7;
        }
        .approved-heading {
          color: #059669;
          border-bottom-color: #d1fae5;
        }
        .completed-heading {
          color: #2563eb;
          border-bottom-color: #dbeafe;
        }
        .default-heading {
          color: #64748b;
          border-bottom-color: #e2e8f0;
        }

        /* Member Row */
        .member-row {
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          margin-bottom: 8px;
          position: relative;
        }
        .member-row.updating {
          opacity: 0.7;
          pointer-events: none;
        }
        .member-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .member-summary:hover {
          background: #f8fafc;
        }
        .member-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .member-avatar {
          width: 36px;
          height: 36px;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }
        .member-details {
          flex: 1;
          min-width: 0;
        }
        .member-name {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
          font-size: 14px;
        }
        .member-amounts {
          display: flex;
          gap: 16px;
          font-size: 12px;
          flex-wrap: wrap;
        }
        .amount-paid {
          color: #059669;
        }
        .amount-pending {
          color: #d97706;
        }
        .member-status {
          margin: 0 12px;
          flex-shrink: 0;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .status-badge.pending {
          background: #fef3c7;
          color: #d97706;
        }
        .status-badge.approved {
          background: #d1fae5;
          color: #059669;
        }
        .status-badge.completed {
          background: #dbeafe;
          color: #2563eb;
        }
        .status-badge.default {
          background: #f1f5f9;
          color: #64748b;
        }
        .expand-icon {
          font-size: 16px;
          color: #94a3b8;
          flex-shrink: 0;
        }

        /* Spinner small */
        .spinner-small {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Member Expanded View */
        .member-expanded {
          padding: 16px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }
        .action-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 12px;
        }
        .action-input {
          width: 100px;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
        }
        .action-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn.approve {
          background: #10b981;
          color: white;
        }
        .action-btn.approve:hover:not(:disabled) {
          background: #059669;
        }
        .action-btn.add {
          background: #2563eb;
          color: white;
        }
        .action-btn.add:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .action-btn.reset {
          background: #f1f5f9;
          color: #64748b;
        }
        .action-btn.reset:hover:not(:disabled) {
          background: #e2e8f0;
        }
        .message-input {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .message-field {
          flex: 1;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
        }
        .completed-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #d1fae5;
          color: #059669;
          border-radius: 6px;
          font-weight: 500;
        }

        /* Campaign Footer */
        .campaign-footer {
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
          text-align: right;
        }
        .delete-campaign-btn {
          padding: 8px 16px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .delete-campaign-btn:hover:not(:disabled) {
          background: #fecaca;
        }
        .delete-campaign-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Loading */
        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f1f5f9;
          border-top: 3px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        .loading-text {
          color: #64748b;
          font-size: 14px;
        }
      `}</style>
    </motion.div>
  );
}

// Member Row Component
function MemberRow({ 
  pledge, 
  type, 
  isExpanded, 
  onToggle, 
  onApprove, 
  onManualAdd, 
  onEditMessage, 
  onReset, 
  onSelect, 
  isSelected, 
  inputValue, 
  onInputChange,
  isUpdating,
  approvingId,
  addingId,
  resettingId 
}) {
  const status = (pledge.amountPaid || 0) >= (type.amountRequired || 0) ? "COMPLETED" : pledge.status;
  const canApprove = pledge.pendingAmount > 0 && pledge.status === "PENDING";
  const isCompleted = status === "COMPLETED";
  const remaining = type.amountRequired - (pledge.amountPaid || 0);
  
  const isApproving = approvingId === pledge.id;
  const isAdding = addingId === pledge.id;
  const isResetting = resettingId === pledge.id;

  return (
    <div className={`member-row ${isUpdating ? 'updating' : ''}`}>
      <div className="member-summary" onClick={onToggle}>
        <input
          type="checkbox"
          className="member-checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(pledge.id);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={isUpdating}
        />
        <div className="member-avatar">
          {pledge.user?.fullName?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="member-details">
          <div className="member-name">{pledge.user?.fullName || "Unknown"}</div>
          <div className="member-amounts">
            <span className="amount-paid">Paid: KES {pledge.amountPaid?.toLocaleString() || 0}</span>
            <span className="amount-pending">Pending: KES {pledge.pendingAmount?.toLocaleString() || 0}</span>
          </div>
        </div>
        <div className="member-status">
          <span className={`status-badge ${getStatusStyle(pledge.status, isCompleted)}`}>
            {status}
          </span>
        </div>
        <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
      </div>

      {isExpanded && (
        <div className="member-expanded">
          {!isCompleted ? (
            <>
              <div className="action-group">
                {canApprove && (
                  <button 
                    className="action-btn approve"
                    onClick={() => onApprove(pledge.id, pledge, type)}
                    disabled={isUpdating || isApproving}
                  >
                    {isApproving ? <Icons.Spinner /> : null}
                    {isApproving ? 'Approving...' : '✓ Approve'}
                  </button>
                )}
                
                <input
                  type="number"
                  placeholder="Amount"
                  className="action-input"
                  value={inputValue?.amount || ""}
                  onChange={(e) => onInputChange(pledge.id, 'amount', e.target.value)}
                  disabled={isUpdating || isAdding}
                />
                <button 
                  className="action-btn add"
                  onClick={() => onManualAdd(pledge.id, pledge, type)}
                  disabled={isUpdating || isAdding}
                >
                  {isAdding ? <Icons.Spinner /> : null}
                  {isAdding ? 'Adding...' : '+ Add'}
                </button>

                <button 
                  className="action-btn reset"
                  onClick={() => onReset(pledge.id)}
                  disabled={isUpdating || isResetting}
                >
                  {isResetting ? <Icons.Spinner /> : null}
                  {isResetting ? 'Resetting...' : '↻ Reset'}
                </button>
              </div>

              <div className="message-input">
                <input
                  type="text"
                  placeholder="Edit message"
                  className="message-field"
                  value={inputValue?.message || ""}
                  onChange={(e) => onInputChange(pledge.id, 'message', e.target.value)}
                  disabled={isUpdating}
                />
                <button 
                  className="action-btn"
                  onClick={() => onEditMessage(pledge.id)}
                  disabled={isUpdating}
                >
                  Update
                </button>
              </div>

              {remaining > 0 && pledge.amountPaid > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  Remaining: KES {remaining.toLocaleString()}
                </div>
              )}
            </>
          ) : (
            <div className="completed-badge">
              ✓ Completed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function
function getStatusStyle(status, completed) {
  if (completed) return "completed";
  switch(status) {
    case "APPROVED": return "approved";
    case "PENDING": return "pending";
    default: return "default";
  }
}

export default ContributionsPage;