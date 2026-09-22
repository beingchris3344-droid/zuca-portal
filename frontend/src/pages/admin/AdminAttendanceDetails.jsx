import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Users, CheckCircle, XCircle, Clock, Wifi, UserPlus, Bell, Edit2, Trash2, Send, RefreshCw, Calendar, MapPin, ArrowLeft, Link2 } from 'lucide-react';
import { api } from '../../api';
import io from 'socket.io-client';
import BASE_URL from '../../api';
import AddMemberModal from '../../components/admin/attendance/AddMemberModal';
import EditMemberModal from '../../components/admin/attendance/EditMemberModal';
import RemindModal from '../../components/admin/attendance/RemindModal';
import LiveActivityFeed from '../../components/admin/attendance/LiveActivityFeed';
import ShareLinkModal from '../../components/admin/attendance/ShareLinkModal';

export default function AdminAttendanceDetails() {
  const { sheetId } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const basePath = (user?.role === "admin" || user?.specialRole === "admin") ? "/admin" : "/secretary";

  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('present');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [remindType, setRemindType] = useState('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // ============ HELPER FUNCTIONS ============
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const updateLocalState = (updater) => {
    setSheetData(prev => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/attendance/sheet/${sheetId}`, { headers: getHeaders() });
      setSheetData(response.data.sheet);
      setLoading(false);

      fetchStatsInBackground();
      fetchEntriesInBackground();
    } catch (error) {
      console.error('Error fetching sheet details:', error);
      showToast('Failed to load sheet details', 'error');
      setLoading(false);
    }
  }, [sheetId, showToast]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchSheetData();
    setRefreshing(false);
  }, [fetchSheetData]);

  const fetchStatsInBackground = async () => {
    try {
      await api.get('/api/attendance/admin/stats', { headers: getHeaders() });
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchEntriesInBackground = async () => {
    try {
      await api.get('/api/attendance/all-entries', { headers: getHeaders() });
    } catch (err) {
      console.error('Entries error:', err);
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredAbsent.map(m => m.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkMarkPresent = async () => {
    if (selectedMembers.length === 0) {
      showToast('No members selected', 'error');
      return;
    }

    const presentUserIds = new Set(sheetData?.entries?.map(e => e.userId) || []);
    const trulyAbsentMembers = selectedMembers.filter(id => !presentUserIds.has(id));
    const alreadyPresentCount = selectedMembers.length - trulyAbsentMembers.length;

    if (trulyAbsentMembers.length === 0) {
      showToast('All selected members are already present!', 'info');
      setSelectedMembers([]);
      setSelectAll(false);
      return;
    }

    if (alreadyPresentCount > 0) {
      showToast(`⚠️ ${alreadyPresentCount} member(s) already present. Marking ${trulyAbsentMembers.length} members.`, 'info');
    }

    if (!window.confirm(`Mark ${trulyAbsentMembers.length} members as present?`)) return;

    setIsBulkProcessing(true);
    const membersToProcess = trulyAbsentMembers;

    const tempEntries = membersToProcess.map(memberId => {
      const member = filteredAbsent.find(m => m.id === memberId);
      return {
        id: 'temp-' + Date.now() + '-' + memberId,
        fullName: member?.fullName || 'Unknown',
        phoneNumber: member?.phone || '-',
        role: member?.role || '-',
        executivePosition: member?.executivePosition || null,
        signMethod: 'MANUAL',
        signTime: new Date().toISOString(),
        isPending: true,
        userId: memberId
      };
    });

    setSheetData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: [...prev.entries, ...tempEntries],
        absentMembers: prev.absentMembers?.filter(m => !membersToProcess.includes(m.id)) || []
      };
    });

    setSelectedMembers([]);
    setSelectAll(false);

    try {
      const membersData = filteredAbsent
        .filter(m => membersToProcess.includes(m.id))
        .map(m => ({
          fullName: m.fullName,
          phoneNumber: m.phone,
          role: m.role || 'Member',
          specialRole: m.specialRole || null,
          membershipNumber: m.membership_number || null,
          jumuiaId: m.jumuiaId || null,
          notes: 'Bulk marked present by admin'
        }));

      await api.post(`/api/attendance/sheet/${sheetId}/entries/batch`,
        { users: membersData },
        { headers: getHeaders() }
      );

      showToast(`✅ ${membersData.length} members marked present!`);
    } catch (error) {
      console.error('Bulk mark error:', error);
      setSheetData(prev => {
        if (!prev) return prev;
        const rolledBackMembers = filteredAbsent.filter(m => membersToProcess.includes(m.id));
        return {
          ...prev,
          entries: prev.entries.filter(e => !e.isPending),
          absentMembers: [...(prev.absentMembers || []), ...rolledBackMembers]
        };
      });
      showToast(error.response?.data?.error || 'Failed to mark members present', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  useEffect(() => {
    fetchSheetData();

    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000
    });

    socket.on('connect', () => {
      socket.emit('join_attendance_sheet', sheetId);
    });

    socket.on('attendance_checkin', (data) => {
      if (data.sheetId === sheetId) {
        showToast(`${data.userName || 'Someone'} just checked in!`, 'info');
      }
    });

    socket.on('attendance_sheet_closed', (data) => {
      if (data.sheetId === sheetId) {
        showToast('This sheet has been closed', 'info');
        fetchSheetData();
      }
    });

    return () => {
      socket.emit('leave_attendance_sheet', sheetId);
      socket.disconnect();
    };
  }, [sheetId, fetchSheetData, showToast]);

  const handleAddMember = async (memberData) => {
    const tempEntry = {
      id: 'temp-' + Date.now(),
      fullName: memberData.fullName,
      phoneNumber: memberData.phoneNumber,
      role: memberData.role,
      executivePosition: memberData.executivePosition || null,
      signMethod: 'MANUAL',
      signTime: new Date().toISOString(),
      isPending: true
    };

    updateLocalState(prev => ({
      ...prev,
      entries: [...prev.entries, tempEntry]
    }));

    setShowAddMember(false);
    showToast('Adding member...', 'info');

    try {
      await api.post(`/api/attendance/sheet/${sheetId}/entry`, memberData, { headers: getHeaders() });
      showToast('Member added successfully!');
    } catch (error) {
      updateLocalState(prev => ({
        ...prev,
        entries: prev.entries.filter(e => e.id !== tempEntry.id)
      }));
      showToast(error.response?.data?.error || 'Failed to add member', 'error');
    }
  };

  const handleEditMember = async (entryId, data) => {
    const oldEntry = sheetData?.entries?.find(e => e.id === entryId);

    updateLocalState(prev => ({
      ...prev,
      entries: prev.entries.map(e =>
        e.id === entryId ? { ...e, ...data, isPending: true } : e
      )
    }));

    setShowEditMember(false);
    setSelectedEntry(null);
    showToast('Updating member...', 'info');

    try {
      await api.put(`/api/attendance/sheet/${sheetId}/entry/${entryId}`, data, { headers: getHeaders() });
      showToast('Member updated successfully!');
    } catch (error) {
      updateLocalState(prev => ({
        ...prev,
        entries: prev.entries.map(e =>
          e.id === entryId ? oldEntry : e
        )
      }));
      showToast(error.response?.data?.error || 'Failed to update member', 'error');
    }
  };

  const handleMarkAbsent = async (entryId, memberName) => {
    if (!window.confirm(`Mark ${memberName} as absent?`)) return;

    const removedEntry = sheetData?.entries?.find(e => e.id === entryId);

    updateLocalState(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== entryId)
    }));

    showToast(`Removing ${memberName}...`, 'info');

    try {
      await api.delete(`/api/attendance/sheet/${sheetId}/entry/${entryId}`, { headers: getHeaders() });
      showToast(`${memberName} marked as absent`, 'info');
    } catch (error) {
      updateLocalState(prev => ({
        ...prev,
        entries: [...prev.entries, removedEntry]
      }));
      showToast(error.response?.data?.error || 'Failed to mark as absent', 'error');
    }
  };

  const handleMarkPresent = async (userId, fullName) => {
    if (!window.confirm(`Mark ${fullName} as present?`)) return;

    updateLocalState(prev => ({
      ...prev,
      absentMembers: prev.absentMembers?.filter(m => m.id !== userId) || []
    }));

    showToast(`Marking ${fullName} present...`, 'info');

    try {
      const userResponse = await api.get(`/api/users`, { headers: getHeaders() });
      const user = userResponse.data.find(u => u.id === userId);

      if (user) {
        await api.post(`/api/attendance/sheet/${sheetId}/entry`, {
          fullName: user.fullName,
          phoneNumber: user.phone,
          role: user.role,
          specialRole: user.specialRole,
          membershipNumber: user.membership_number,
          jumuiaId: user.jumuiaId,
          notes: 'Marked present by admin'
        }, { headers: getHeaders() });

        showToast(`${fullName} marked as present!`);
      }
    } catch (error) {
      updateLocalState(prev => ({
        ...prev,
        absentMembers: [...(prev.absentMembers || []), { id: userId, fullName }]
      }));
      showToast(error.response?.data?.error || 'Failed to mark present', 'error');
    }
  };

  const handleSendReminder = async (userId, customMessage = null) => {
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/remind/${userId}`,
        { customMessage },
        { headers: getHeaders() }
      );
      showToast('Reminder sent successfully!');
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to send reminder', 'error');
    }
  };

  const handleBulkRemind = async (message) => {
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/remind-all`,
        { customMessage: message },
        { headers: getHeaders() }
      );
      showToast('Reminders sent to all absent members!');
      setShowRemindModal(false);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to send reminders', 'error');
    }
  };

  const handleCloseSheet = async () => {
    if (!window.confirm('Close this sheet? No more check-ins will be accepted.')) return;
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/close`, {}, { headers: getHeaders() });
      showToast('Sheet closed successfully');
      setTimeout(() => {
        navigate('/admin/attendance');
      }, 1500);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to close sheet', 'error');
    }
  };

  // ============ FILTER DATA ============
  const presentEntries = sheetData?.entries || [];
  const absentEntries = sheetData?.absentMembers || [];

  const filteredPresent = presentEntries.filter(entry =>
    entry.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.phoneNumber?.includes(searchTerm)
  );

  const filteredAbsent = absentEntries.filter(member =>
    member.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============ STATS ============
  const totalExpected = sheetData?.totalMembers || 0;

  const presentMembersList = presentEntries.filter(entry => entry.userId && entry.role !== 'Guest');
  const guestEntries = presentEntries.filter(entry => !entry.userId || entry.role === 'Guest');

  const totalPresent = presentMembersList.length;
  const totalGuests = guestEntries.length;
  const totalAbsent = totalExpected - totalPresent;

  const attendanceRate = totalExpected > 0 ? ((totalPresent / totalExpected) * 100).toFixed(1) : 0;

  const selfCount = presentEntries.filter(e => e.signMethod === 'SELF').length;
  const qrCount = presentEntries.filter(e => e.signMethod === 'QR_CODE').length;
  const manualCount = presentEntries.filter(e => e.signMethod === 'MANUAL').length;

  // ============ CATEGORY DATA ============
  const hasCategory = !!(
    sheetData?.categoryName &&
    Array.isArray(sheetData?.categoryOptions) &&
    sheetData.categoryOptions.length > 0
  );

  const categoryGroups = hasCategory
    ? sheetData.categoryOptions.map(opt => ({
        option: opt,
        members: presentEntries.filter(e => e.categoryValue === opt),
      }))
    : [];

  const unassigned = hasCategory
    ? presentEntries.filter(e => !e.categoryValue)
    : [];

  const categoryCounts = hasCategory
    ? sheetData.categoryOptions.reduce((acc, opt) => {
        acc[opt] = presentEntries.filter(e => e.categoryValue === opt).length;
        return acc;
      }, {})
    : {};

  const unassignedCount = unassigned.length;

  // ============ SKELETON LOADER ============
  const SkeletonLoader = () => (
    <div className="skeleton-wrapper">
      <div className="skeleton-header">
        <div className="skeleton-back-btn"></div>
        <div className="skeleton-refresh-btn"></div>
      </div>
      <div className="skeleton-sheet-info">
        <div className="skeleton-title"></div>
        <div className="skeleton-meta">
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
        </div>
      </div>
      <div className="stats-grid skeleton">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card skeleton">
            <div className="skeleton-stat-value"></div>
            <div className="skeleton-stat-label"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-methods">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-method-item"></div>
        ))}
      </div>
      <div className="skeleton-actions">
        <div className="skeleton-action-btn"></div>
        <div className="skeleton-action-btn"></div>
        <div className="skeleton-action-btn"></div>
      </div>
      <div className="skeleton-search"></div>
      <div className="skeleton-tabs">
        <div className="skeleton-tab"></div>
        <div className="skeleton-tab"></div>
      </div>
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const LiveIndicator = () => (
    <div className="live-indicator">
      <span className="pulse-ring"></span>
      <span>LIVE</span>
    </div>
  );

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="attendance-details-page">
        <SkeletonLoader />
        <style>{`
          .skeleton-wrapper { padding: 24px; background: #f5f5f5; min-height: 100vh; }
          .skeleton-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .skeleton-back-btn, .skeleton-refresh-btn { width: 140px; height: 40px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
          .skeleton-sheet-info { background: white; border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; }
          .skeleton-title { width: 250px; height: 28px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 6px; margin-bottom: 12px; }
          .skeleton-meta { display: flex; gap: 16px; }
          .skeleton-meta-item { width: 120px; height: 16px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
          .stats-grid.skeleton { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
          .stat-card.skeleton { padding: 16px; background: white; border-radius: 12px; border: 1px solid #e0e0e0; }
          .skeleton-stat-value { width: 60px; height: 32px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 6px; margin: 0 auto 8px; }
          .skeleton-stat-label { width: 80px; height: 12px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; margin: 0 auto; }
          .skeleton-methods { display: flex; justify-content: center; gap: 32px; padding: 12px 24px; margin-bottom: 20px; background: white; border: 1px solid #e0e0e0; border-radius: 12px; }
          .skeleton-method-item { width: 100px; height: 20px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
          .skeleton-actions { display: flex; gap: 12px; margin-bottom: 20px; }
          .skeleton-action-btn { width: 120px; height: 36px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
          .skeleton-search { width: 100%; height: 42px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; margin-bottom: 16px; }
          .skeleton-tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; }
          .skeleton-tab { width: 100px; height: 36px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 20px; }
          .skeleton-table { background: white; border-radius: 12px; overflow: hidden; }
          .skeleton-table-header { display: flex; gap: 16px; padding: 12px; background: #fafafa; border-bottom: 1px solid #e0e0e0; }
          .skeleton-th { width: 100px; height: 16px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
          .skeleton-table-row { display: flex; gap: 16px; padding: 12px; border-bottom: 1px solid #f0f0f0; }
          .skeleton-td { width: 100px; height: 14px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
          @keyframes skeleton-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <div className="attendance-details-page">
      <style>{`
        .attendance-details-page { padding: 24px; background: #f5f5f5; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: black; padding: 8px 16px; background: #1a1a1a; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; }
        .refresh-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #1a1a1a; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; color: white; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sheet-info { background: white; border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; }
        .sheet-info h1 { margin: 0 0 8px 0; font-size: 24px; }
        .sheet-meta { display: flex; gap: 16px; font-size: 13px; color: #666; flex-wrap: wrap; }
        .sheet-meta span { display: flex; align-items: center; gap: 4px; }
        .status { font-weight: 500; }
        .status.active { color: #22c55e; }
        .status.closed { color: #666; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e0e0e0; }
        .stat-value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
        .stat-label { font-size: 12px; color: #666; }
        .stat-card.success .stat-value { color: #22c55e; }
        .stat-card.danger .stat-value { color: #ef4444; }

        .methods-breakdown { display: flex; justify-content: center; gap: 32px; padding: 12px 24px; margin-bottom: 20px; background: white; border: 1px solid #e0e0e0; border-radius: 12px; flex-wrap: wrap; }
        .method-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .method-dot { width: 10px; height: 10px; border-radius: 50%; }
        .method-dot.self { background: #3b82f6; }
        .method-dot.qr { background: #059669; }
        .method-dot.manual { background: #f59e0b; }
        .method-count { font-weight: 600; margin-left: 4px; }

        /* Category strip — official gray */
        .category-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 20px; margin-bottom: 20px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 12px; font-size: 13px; }
        .category-strip-label { font-weight: 700; color: #1a1a1a; margin-right: 4px; }
        .category-chip { display: inline-flex; align-items: center; gap: 6px; background: white; border: 1px solid #d0d0d0; color: #1a1a1a; padding: 4px 10px; border-radius: 6px; font-size: 12px; }
        .category-chip strong { background: #1a1a1a; color: white; padding: 0 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .category-chip.muted { background: #f5f5f5; border-color: #e0e0e0; color: #666; }
        .category-chip.muted strong { background: #999; }

        .action-buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 480px) { .action-buttons { grid-template-columns: 1fr; } }
        .btn-primary, .btn-secondary, .btn-danger { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; border: none; justify-content: center; }
        .btn-primary { background: #1a1a1a; color: white; }
        .btn-secondary { background: #f0f0f0; color: #1a1a1a; }
        .btn-danger { background: #fee2e2; color: #ef4444; }
        .btn-share { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #1a1a1a; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; justify-content: center; }
        .btn-share:hover { background: #333; transform: translateY(-1px); }

        .search-bar { margin-bottom: 16px; }
        .search-bar input { width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; }

        .tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap; }
        .tab { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: none; border: none; cursor: pointer; font-size: 13px; color: #666; border-bottom: 2px solid transparent; }
        .tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; font-weight: 600; }

        .members-list { background: white; border-radius: 12px; overflow-x: auto; }
        .members-table { width: 100%; border-collapse: collapse; }
        .members-table th, .members-table td { padding: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; }
        .members-table th { background: #fafafa; font-weight: 600; font-size: 12px; color: #666; }

        .method-badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; }
        .method-badge.self { background: #e0f2fe; color: #0284c7; }
        .method-badge.qr_code { background: #dcfce7; color: #059669; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .executive-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; background: #dbeafe; color: #1e40af; }

        /* Category value chip in tables */
        .category-badge { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #f0f0f0; color: #1a1a1a; border: 1px solid #e0e0e0; }
        .category-badge.empty { background: white; color: #999; border-style: dashed; font-weight: 500; }

        .no-role { color: #94a3b8; font-size: 12px; }
        .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; }
        .icon-btn.edit { color: #3b82f6; }
        .icon-btn.absent { color: #f59e0b; }
        .icon-btn.absent:hover { background: #fef3c7; }
        .btn-small { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; border: none; background: #f0f0f0; }
        .btn-small.success { background: #dcfce7; color: #22c55e; }
        .empty-state { text-align: center; padding: 40px; color: #666; }

        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 8px; background: #1a1a1a; color: white; font-size: 13px; z-index: 1100; }
        .toast.error { background: #ef4444; }
        .toast.success { background: #22c55e; }

        .live-indicator { position: fixed; bottom: 20px; right: 20px; background: #1a1a1a; color: #22c55e; padding: 8px 16px; border-radius: 40px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .pulse-ring { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; position: relative; }
        .pulse-ring::before { content: ''; position: absolute; width: 100%; height: 100%; background: #22c55e; border-radius: 50%; animation: pulse-ring 1.5s infinite; }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }

        .bulk-actions-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px; }
        .bulk-select-all { display: flex; align-items: center; gap: 8px; }
        .bulk-select-all input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
        .selected-count { font-size: 12px; color: #64748b; margin-left: 8px; }
        .btn-bulk-mark { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #22c55e; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-bulk-mark:hover:not(:disabled) { background: #16a34a; transform: translateY(-1px); }
        .btn-bulk-mark:disabled { opacity: 0.6; cursor: not-allowed; }
        .loading-spinner-small { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }

        .members-table tr.selected { background: #f0fdf4; }
        .members-table tr.selected td:first-child { border-left: 3px solid #22c55e; }

        /* ========== BY CATEGORY TAB ========== */
        .category-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 20px; }
        .category-group { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; }
        .category-group.unassigned { background: #f5f5f5; border-style: dashed; }
        .category-group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; }
        .category-group-name { font-weight: 700; font-size: 14px; color: #1a1a1a; }
        .category-group-count { font-size: 11px; color: #666; background: white; padding: 2px 8px; border-radius: 6px; border: 1px solid #e0e0e0; }
        .category-group-empty { font-size: 12px; color: #999; text-align: center; padding: 10px 0; }
        .category-member-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .category-member { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: white; border: 1px solid #f0f0f0; border-radius: 8px; font-size: 13px; }
        .category-member-name { font-weight: 600; color: #1e293b; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .category-member-phone { font-size: 11px; color: #64748b; }
        .category-member-pos { font-size: 10px; background: #dbeafe; color: #1e40af; padding: 1px 8px; border-radius: 6px; }

        @media (max-width: 768px) {
          .bulk-actions-bar { flex-direction: column; align-items: stretch; }
          .bulk-select-all { justify-content: space-between; }
          .btn-bulk-mark { justify-content: center; }
          .attendance-details-page { padding: 12px; }
          .page-header { flex-wrap: wrap; gap: 8px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .methods-breakdown { flex-wrap: wrap; gap: 8px; }
          .action-buttons { grid-template-columns: 1fr; }
          .tabs { flex-wrap: wrap; }
          .members-table { font-size: 12px; }
          .members-table th, .members-table td { padding: 8px; }
          .category-groups { grid-template-columns: 1fr; padding: 12px; }
        }
      `}</style>

      {sheetData?.isActive && <LiveIndicator />}

      {toast.show && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`${basePath}/attendance`)}>
          <ArrowLeft size={28} color="#fdfcfc" />
        </button>
        <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Sheet Info */}
      <div className="sheet-info">
        <h1>{sheetData?.title}</h1>
        <div className="sheet-meta">
          <span><Calendar size={14} /> {new Date(sheetData?.eventDate).toLocaleDateString()}</span>
          <span><Clock size={14} /> {sheetData?.eventTime || '4:30 PM'}</span>
          <span><MapPin size={14} /> {sheetData?.location || 'ZUCA'}</span>
          <span className={`status ${sheetData?.isActive ? 'active' : 'closed'}`}>
            {sheetData?.isActive ? '● ACTIVE' : '● CLOSED'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalExpected}</div>
          <div className="stat-label">Total Expected</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{totalPresent}</div>
          <div className="stat-label">Present (Members)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalGuests}</div>
          <div className="stat-label">Guests</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{totalAbsent >= 0 ? totalAbsent : 0}</div>
          <div className="stat-label">Absent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{attendanceRate}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>
      </div>

      {/* Method Breakdown */}
      <div className="methods-breakdown">
        <div className="method-item">
          <span className="method-dot self"></span>
          <span>Self Check-in</span>
          <span className="method-count">{selfCount}</span>
        </div>
        <div className="method-item">
          <span className="method-dot qr"></span>
          <span>QR Code</span>
          <span className="method-count">{qrCount}</span>
        </div>
        <div className="method-item">
          <span className="method-dot manual"></span>
          <span>Manual (Admin)</span>
          <span className="method-count">{manualCount}</span>
        </div>
      </div>

      {/* Category Strip — only when applicable */}
      {hasCategory && (
        <div className="category-strip">
          <span className="category-strip-label">🎼 {sheetData.categoryName}:</span>
          {sheetData.categoryOptions.map(opt => (
            <span key={opt} className="category-chip">
              {opt} <strong>{categoryCounts[opt] || 0}</strong>
            </span>
          ))}
          <span className="category-chip muted">
            Unassigned <strong>{unassignedCount}</strong>
          </span>
        </div>
      )}

      {/* Live Activity Feed */}
      {sheetData?.isActive && (
        <LiveActivityFeed sheetId={sheetId} onNewCheckin={fetchSheetData} />
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-primary" onClick={() => navigate(`${basePath}/attendance/add-member/${sheetId}`)}>
          <UserPlus size={16} /> Add a Single Member
        </button>
        <button className="btn-secondary" onClick={() => {
          setRemindType('all');
          setShowRemindModal(true);
        }}>
          <Bell size={16} /> Remind All
        </button>
        <button className="btn-share" onClick={() => setShowShareModal(true)}>
          <Link2 size={16} /> Share Link
        </button>
        <button className="btn-primary" onClick={() => navigate(`${basePath}/attendance/add-member/${sheetId}`, {
          state: { defaultToBulkMode: true }
        })}>
          <UserPlus size={16} /> Bulk Add Member
        </button>
        {sheetData?.isActive && (
          <button className="btn-danger" onClick={handleCloseSheet}>
            <XCircle size={16} /> Close Sheet
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'present' ? 'active' : ''}`}
          onClick={() => setActiveTab('present')}
        >
          <CheckCircle size={14} /> Present ({filteredPresent.length})
        </button>
        <button
          className={`tab ${activeTab === 'absent' ? 'active' : ''}`}
          onClick={() => setActiveTab('absent')}
        >
          <XCircle size={14} /> Absent ({filteredAbsent.length})
        </button>
        {hasCategory && (
          <button
            className={`tab ${activeTab === 'category' ? 'active' : ''}`}
            onClick={() => setActiveTab('category')}
          >
            🎼 By {sheetData.categoryName}
          </button>
        )}
      </div>

      {/* Present Members List */}
      {activeTab === 'present' && (
        <div className="members-list">
          {filteredPresent.length === 0 ? (
            <div className="empty-state">No present members found</div>
          ) : (
            <table className="members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Executive Position</th>
                  {hasCategory && <th>{sheetData.categoryName}</th>}
                  <th>Method</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPresent.map(entry => (
                  <tr key={entry.id}>
                    <td><strong>{entry.fullName}</strong></td>
                    <td>{entry.phoneNumber || '-'}</td>
                    <td>{entry.role || '-'}</td>
                    <td>
                      {entry.executivePosition ? (
                        <span className="executive-badge">{entry.executivePosition}</span>
                      ) : (
                        <span className="no-role">-</span>
                      )}
                    </td>
                    {hasCategory && (
                      <td>
                        {entry.categoryValue ? (
                          <span className="category-badge">{entry.categoryValue}</span>
                        ) : (
                          <span className="category-badge empty">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td>
                      <span className={`method-badge ${entry.signMethod?.toLowerCase()}`}>
                        {entry.signMethod === 'SELF' ? 'Self' :
                         entry.signMethod === 'QR_CODE' ? 'QR Code' : 'Manual'}
                      </span>
                    </td>
                    <td>{new Date(entry.signTime).toLocaleTimeString()}</td>
                    <td className="actions">
                      <button
                        className="icon-btn edit"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowEditMember(true);
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="icon-btn absent"
                        onClick={() => handleMarkAbsent(entry.id, entry.fullName)}
                        title="Mark as Absent"
                      >
                        <XCircle size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Absent Members List */}
      {activeTab === 'absent' && (
        <div className="members-list">
          {filteredAbsent.length === 0 ? (
            <div className="empty-state">No absent members found</div>
          ) : (
            <>
              <div className="bulk-actions-bar">
                <div className="bulk-select-all">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    disabled={isBulkProcessing}
                  />
                  <label>Select All</label>
                  <span className="selected-count">
                    {selectedMembers.length} selected
                  </span>
                </div>
                {selectedMembers.length > 0 && (
                  <button
                    className="btn-bulk-mark"
                    onClick={handleBulkMarkPresent}
                    disabled={isBulkProcessing}
                  >
                    {isBulkProcessing ? (
                      <span className="loading-spinner-small"></span>
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    {isBulkProcessing ? 'Processing...' : `Mark ${selectedMembers.length} Present`}
                  </button>
                )}
              </div>

              <table className="members-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        disabled={isBulkProcessing}
                      />
                    </th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Executive Position</th>
                    <th>Jumuia</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsent.map(member => (
                    <tr key={member.id} className={selectedMembers.includes(member.id) ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          disabled={isBulkProcessing}
                        />
                      </td>
                      <td><strong>{member.fullName}</strong></td>
                      <td>{member.phone || '-'}</td>
                      <td>{member.role || '-'}</td>
                      <td>
                        {member.executivePosition ? (
                          <span className="executive-badge">{member.executivePosition}</span>
                        ) : (
                          <span className="no-role">-</span>
                        )}
                      </td>
                      <td>{member.homeJumuia?.name || '-'}</td>
                      <td className="actions">
                        <button
                          className="btn-small"
                          onClick={() => handleSendReminder(member.id)}
                          disabled={isBulkProcessing}
                        >
                          <Send size={12} /> Remind
                        </button>
                        <button
                          className="btn-small success"
                          onClick={() => handleMarkPresent(member.id, member.fullName)}
                          disabled={isBulkProcessing}
                        >
                          <CheckCircle size={12} /> Mark Present
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* By Category Tab */}
      {activeTab === 'category' && hasCategory && (
        <div className="members-list">
          {presentEntries.length === 0 ? (
            <div className="empty-state">No one has checked in yet</div>
          ) : (
            <div className="category-groups">
              {categoryGroups.map(group => (
                <div key={group.option} className="category-group">
                  <div className="category-group-header">
                    <span className="category-group-name">🎼 {group.option}</span>
                    <span className="category-group-count">
                      {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  {group.members.length === 0 ? (
                    <div className="category-group-empty">No one in this section</div>
                  ) : (
                    <ul className="category-member-list">
                      {group.members.map(entry => (
                        <li key={entry.id} className="category-member">
                          <span className="category-member-name">{entry.fullName}</span>
                          {entry.phoneNumber && (
                            <span className="category-member-phone">{entry.phoneNumber}</span>
                          )}
                          {entry.executivePosition && (
                            <span className="category-member-pos">{entry.executivePosition}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {unassigned.length > 0 && (
                <div className="category-group unassigned">
                  <div className="category-group-header">
                    <span className="category-group-name">⚠ Unassigned</span>
                    <span className="category-group-count">
                      {unassigned.length} {unassigned.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <ul className="category-member-list">
                    {unassigned.map(entry => (
                      <li key={entry.id} className="category-member">
                        <span className="category-member-name">{entry.fullName}</span>
                        {entry.phoneNumber && (
                          <span className="category-member-phone">{entry.phoneNumber}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddMember && (
        <AddMemberModal
          sheetId={sheetId}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
        />
      )}

      {showEditMember && selectedEntry && (
        <EditMemberModal
          entry={selectedEntry}
          onClose={() => {
            setShowEditMember(false);
            setSelectedEntry(null);
          }}
          onSave={handleEditMember}
        />
      )}

      {showRemindModal && (
        <RemindModal
          sheet={sheetData}
          remindType={remindType}
          onClose={() => setShowRemindModal(false)}
          onSend={handleBulkRemind}
        />
      )}

      {showShareModal && (
        <ShareLinkModal
          sheet={sheetData}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}