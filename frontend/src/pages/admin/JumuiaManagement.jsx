// frontend/src/pages/admin/JumuiaManagement.jsx
import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";

// Professional icon components using Fi icons style
const Icons = {
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Building: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Mail: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Shield: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 13 10 21 14 18 14 13 22 3"/></svg>,
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Eye: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Spinner: () => <svg className="spinner-small" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  FilePdf: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12.5c0-1.1.9-2 2-2s2 .9 2 2v2c0 1.1-.9 2-2 2s-2-.9-2-2v-2z"/><path d="M8 14.5v-4"/><path d="M16 14.5v-4"/></svg>,
  FileWord: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13l1 4 1.5-3L12 17l1.5-4L15 13"/></svg>,
  DownloadCloud: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

// Helper component for member avatar with profile picture support
const MemberAvatar = ({ user }) => {
  const getProfileImageUrl = () => {
    if (!user.profileImage) return null;
    if (user.profileImage.startsWith("http")) return user.profileImage;
    return `${api.defaults.baseURL}/${user.profileImage}`;
  };

  const imageUrl = getProfileImageUrl();

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={user.fullName}
        className="member-avatar-img"
        onError={(e) => {
          e.target.style.display = 'none';
          const fallback = e.target.parentElement.querySelector('.avatar-fallback');
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div className="member-avatar-fallback avatar-fallback">
      {user.fullName?.charAt(0).toUpperCase()}
    </div>
  );
};

// Skeleton components for loading state
const SkeletonStatCard = () => (
  <div className="stat-card skeleton">
    <div className="stat-icon skeleton-shimmer" style={{ background: "#e2e8f0" }}></div>
    <div className="stat-content">
      <div className="skeleton-line" style={{ width: "60px", height: "28px", marginBottom: "8px" }}></div>
      <div className="skeleton-line" style={{ width: "80px", height: "14px" }}></div>
    </div>
  </div>
);

const SkeletonJumuiaCard = () => (
  <div className="jumuia-card skeleton">
    <div className="jumuia-header">
      <div className="jumuia-header-left">
        <div className="jumuia-icon skeleton-shimmer" style={{ background: "#e2e8f0" }}></div>
        <div className="jumuia-info">
          <div className="skeleton-line" style={{ width: "200px", height: "24px", marginBottom: "8px" }}></div>
          <div className="skeleton-line" style={{ width: "100px", height: "20px" }}></div>
        </div>
      </div>
    </div>
  </div>
);

export default function JumuiaManagement() {
  const navigate = useNavigate();
  
  const [jumuiaList, setJumuiaList] = useState([]);
  const [expandedJumuia, setExpandedJumuia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showNewJumuiaModal, setShowNewJumuiaModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [newJumuia, setNewJumuia] = useState({ name: "", description: "", location: "" });
  const [processingId, setProcessingId] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const jumuiaRes = await api.get("/api/jumuia");
        
        const dataWithMembers = await Promise.all(
          jumuiaRes.data.map(async (j) => {
            try {
              const membersRes = await api.get(`/api/admin/jumuia/${j.id}/users`);
              return { 
                ...j, 
                members: membersRes.data,
                stats: {
                  totalContributions: membersRes.data.reduce((sum, m) => sum + (m.contributions || 0), 0),
                  activeMembers: membersRes.data.filter(m => m.lastActive && new Date(m.lastActive) > new Date(Date.now() - 30*24*60*60*1000)).length
                }
              };
            } catch (err) {
              console.error(`Failed to fetch members for ${j.name}:`, err);
              return { ...j, members: [], stats: { totalContributions: 0, activeMembers: 0 } };
            }
          })
        );
        
        setJumuiaList(dataWithMembers);
        showNotification("Data loaded successfully", "success");
      } catch (err) {
        console.error("Fetch error:", err);
        showNotification("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const showNotification = (message, type) => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredJumuia = useMemo(() => {
    if (loading) return [];
    return jumuiaList.map(j => ({
      ...j,
      filteredMembers: j.members.filter(m => {
        const matchesSearch = m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || m.role === roleFilter;
        return matchesSearch && matchesRole;
      })
    }));
  }, [jumuiaList, searchQuery, roleFilter, loading]);

  const handleCreateJumuia = async () => {
    if (!newJumuia.name) {
      showNotification("Jumuia name is required", "error");
      return;
    }

    try {
      setProcessingId("new");
      const response = await api.post("/api/admin/jumuia", newJumuia);
      setJumuiaList([...jumuiaList, { ...response.data, members: [], stats: { totalContributions: 0, activeMembers: 0 } }]);
      setShowNewJumuiaModal(false);
      setNewJumuia({ name: "", description: "", location: "" });
      showNotification("Jumuia created successfully", "success");
    } catch (err) {
      console.error("Create error:", err);
      showNotification("Failed to create Jumuia", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (userId, memberName, jumuiaId) => {
    if (!window.confirm(`Remove ${memberName} from this Jumuia?`)) return;
    
    setProcessingId(userId);
    try {
      await api.patch(`/api/admin/jumuia/${userId}`, { jumuiaId: null });
      
      setJumuiaList(prev => prev.map(j => 
        j.id === jumuiaId 
          ? { ...j, members: j.members.filter(m => m.id !== userId) }
          : j
      ));
      
      showNotification(`${memberName} removed successfully`, "success");
    } catch (err) {
      console.error("Remove error:", err);
      showNotification("Failed to remove member", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMoveMember = async (userId, targetJumuiaId, sourceJumuiaId, memberName) => {
    if (targetJumuiaId === sourceJumuiaId) {
      showNotification("Select a different Jumuia", "warning");
      return;
    }

    setProcessingId(userId);
    try {
      await api.patch(`/api/admin/jumuia/${userId}`, { jumuiaId: targetJumuiaId });
      
      const [targetMembers, sourceMembers] = await Promise.all([
        api.get(`/api/admin/jumuia/${targetJumuiaId}/users`),
        api.get(`/api/admin/jumuia/${sourceJumuiaId}/users`)
      ]);

      setJumuiaList(prev => prev.map(j => {
        if (j.id === targetJumuiaId) return { ...j, members: targetMembers.data };
        if (j.id === sourceJumuiaId) return { ...j, members: sourceMembers.data };
        return j;
      }));

      showNotification(`${memberName} moved successfully`, "success");
    } catch (err) {
      console.error("Move error:", err);
      showNotification("Failed to move member", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAssign = async (targetJumuiaId) => {
    if (selectedMembers.length === 0) {
      showNotification("No members selected", "warning");
      return;
    }

    try {
      await Promise.all(
        selectedMembers.map(memberId =>
          api.patch(`/api/admin/jumuia/${memberId}`, { jumuiaId: targetJumuiaId })
        )
      );

      const updatedJumuia = await Promise.all(
        jumuiaList.map(async (j) => {
          const membersRes = await api.get(`/api/admin/jumuia/${j.id}/users`);
          return { ...j, members: membersRes.data };
        })
      );

      setJumuiaList(updatedJumuia);
      setSelectedMembers([]);
      setBulkMode(false);
      showNotification(`${selectedMembers.length} members assigned`, "success");
    } catch (err) {
      console.error("Bulk assign error:", err);
      showNotification("Failed to assign members", "error");
    }
  };

  // ========== EXPORT FUNCTIONS ==========

  // Generate HTML content for PDF/Word export
  const generateReportHTML = (data, title) => {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let html = `
      <html>
      <head>
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 3px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; margin: 0; color: #1a1a2e; }
          .header .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .header .date { font-size: 12px; color: #888; margin-top: 3px; }
          .jumuia-section { margin-bottom: 40px; page-break-inside: avoid; }
          .jumuia-title { font-size: 20px; font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; margin-bottom: 15px; }
          .jumuia-meta { display: flex; gap: 20px; margin-bottom: 15px; font-size: 13px; color: #555; }
          .jumuia-meta span { background: #f5f5f5; padding: 4px 12px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
          td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { text-align: center; padding-top: 30px; border-top: 2px solid #1a1a2e; margin-top: 30px; font-size: 12px; color: #888; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .badge-admin { background: #fee2e2; color: #dc2626; }
          .badge-treasurer { background: #fef3c7; color: #d97706; }
          .badge-member { background: #f1f5f9; color: #475569; }
          .status-active { color: #059669; font-weight: 600; }
          .status-inactive { color: #94a3b8; }
    `;

    // Add report-specific styles
    if (data.length > 1) {
      html += `
          .report-header { text-align: center; margin-bottom: 20px; }
          .report-header h2 { font-size: 22px; margin: 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
          .summary-item { background: #f5f5f5; padding: 12px; border-radius: 8px; text-align: center; }
          .summary-item .number { font-size: 22px; font-weight: bold; color: #1a1a2e; }
          .summary-item .label { font-size: 12px; color: #666; }
      `;
    }

    html += `
        </style>
      </head>
      <body>
    `;

    // Add report header
    if (data.length > 1) {
      html += `
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">Full Jumuia Management Report</div>
          <div class="date">Generated on ${date}</div>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="number">${data.length}</div>
            <div class="label">Total Jumuia Groups</div>
          </div>
          <div class="summary-item">
            <div class="number">${data.reduce((sum, j) => sum + j.members.length, 0)}</div>
            <div class="label">Total Members</div>
          </div>
          <div class="summary-item">
            <div class="number">${data.reduce((sum, j) => sum + j.members.filter(m => m.role === "admin").length, 0)}</div>
            <div class="label">Total Admins</div>
          </div>
          <div class="summary-item">
            <div class="number">${data.reduce((sum, j) => sum + (j.stats?.activeMembers || 0), 0)}</div>
            <div class="label">Active Members (30d)</div>
          </div>
        </div>
      `;
    }

    // Jumuia sections
    data.forEach((jumuia) => {
      const memberCount = jumuia.members.length;
      const adminCount = jumuia.members.filter(m => m.role === "admin").length;
      const activeCount = jumuia.stats?.activeMembers || 0;

      html += `
        <div class="jumuia-section">
          <div class="jumuia-title">${jumuia.name}</div>
          <div class="jumuia-meta">
            <span>👥 ${memberCount} Members</span>
            <span>🛡️ ${adminCount} Admins</span>
            <span>🟢 ${activeCount} Active</span>
            ${jumuia.location ? `<span>📍 ${jumuia.location}</span>` : ''}
          </div>
      `;

      if (jumuia.members.length > 0) {
        html += `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Member Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Membership #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
        `;

        jumuia.members.forEach((member, idx) => {
          const roleClass = member.role === 'admin' ? 'badge-admin' : 
                           member.role === 'treasurer' ? 'badge-treasurer' : 'badge-member';
          const isActive = member.lastActive && new Date(member.lastActive) > new Date(Date.now() - 7*24*60*60*1000);
          
          html += `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${member.fullName}</strong></td>
              <td><span class="badge ${roleClass}">${member.role}</span></td>
              <td>${member.email}</td>
              <td>${member.membership_number || 'N/A'}</td>
              <td class="${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Active' : 'Inactive'}</td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;
      } else {
        html += `
          <p style="color: #888; font-style: italic; padding: 10px 0;">No members in this Jumuia</p>
        `;
      }

      html += `</div>`;
    });

    // Footer
    html += `
        <div class="footer">
          <p>Generated by Church Management System</p>
          <p>${date}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  // Download as PDF (using window.print)
  const downloadPDF = (html, filename) => {
    const win = window.open('', '_blank');
    if (!win) {
      showNotification("Please allow popups for this site", "error");
      return;
    }
    
    win.document.write(html);
    win.document.close();
    
    setTimeout(() => {
      win.print();
    }, 500);
  };

  // Download as Word (.doc)
  const downloadWord = (html, filename) => {
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 3px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; margin: 0; color: #1a1a2e; }
          .header .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .header .date { font-size: 12px; color: #888; margin-top: 3px; }
          .jumuia-section { margin-bottom: 40px; page-break-inside: avoid; }
          .jumuia-title { font-size: 20px; font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; margin-bottom: 15px; }
          .jumuia-meta { margin-bottom: 15px; font-size: 13px; color: #555; }
          .jumuia-meta span { background: #f5f5f5; padding: 4px 12px; border-radius: 4px; margin-right: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
          td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { text-align: center; padding-top: 30px; border-top: 2px solid #1a1a2e; margin-top: 30px; font-size: 12px; color: #888; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .badge-admin { background: #fee2e2; color: #dc2626; }
          .badge-treasurer { background: #fef3c7; color: #d97706; }
          .badge-member { background: #f1f5f9; color: #475569; }
          .status-active { color: #059669; font-weight: 600; }
          .status-inactive { color: #94a3b8; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
          .summary-item { background: #f5f5f5; padding: 12px; border-radius: 8px; text-align: center; }
          .summary-item .number { font-size: 22px; font-weight: bold; color: #1a1a2e; }
          .summary-item .label { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        ${html.replace(/<html>[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*?<\/html>/, '')}
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { 
      type: 'application/msword;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download individual Jumuia
  const downloadSingleJumuia = (jumuia, format) => {
    setDownloading(true);
    try {
      const data = [jumuia];
      const title = `${jumuia.name} - Members Report`;
      const filename = `${jumuia.name.toLowerCase().replace(/\s+/g, '_')}_members`;
      const html = generateReportHTML(data, title);

      if (format === 'pdf') {
        downloadPDF(html, filename);
      } else if (format === 'word') {
        downloadWord(html, filename);
      }

      showNotification(`Downloading ${jumuia.name} as ${format.toUpperCase()}...`, "success");
    } catch (err) {
      console.error("Download error:", err);
      showNotification("Failed to download", "error");
    } finally {
      setDownloading(false);
      setShowDownloadMenu(false);
    }
  };

  // Download full system report
  const downloadFullReport = (format) => {
    setDownloading(true);
    try {
      const title = "Full Jumuia Management Report";
      const filename = `jumuia_full_report_${new Date().toISOString().split('T')[0]}`;
      const html = generateReportHTML(jumuiaList, title);

      if (format === 'pdf') {
        downloadPDF(html, filename);
      } else if (format === 'word') {
        downloadWord(html, filename);
      }

      showNotification(`Downloading full report as ${format.toUpperCase()}...`, "success");
    } catch (err) {
      console.error("Download error:", err);
      showNotification("Failed to download full report", "error");
    } finally {
      setDownloading(false);
      setShowDownloadMenu(false);
    }
  };

  const handleExport = () => {
    const data = jumuiaList.map(j => ({
      Jumuia: j.name,
      Description: j.description || "",
      Location: j.location || "",
      Members: j.members.length,
      Admins: j.members.filter(m => m.role === "admin").length,
      ActiveMembers: j.stats?.activeMembers || 0,
      MemberList: j.members.map(m => `${m.fullName} (${m.role})`).join(", ")
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jumuia-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showNotification("Export completed", "success");
  };

  const handleViewJumuia = (e, jumuia) => {
    e.stopPropagation();
    navigate(`/jumuia/${jumuia.code || jumuia.id}`);
  };

  const stats = useMemo(() => ({
    totalJumuia: jumuiaList.length,
    totalMembers: jumuiaList.reduce((sum, j) => sum + j.members.length, 0),
    totalAdmins: jumuiaList.reduce((sum, j) => sum + j.members.filter(m => m.role === "admin").length, 0),
    activeMembers: jumuiaList.reduce((sum, j) => sum + (j.stats?.activeMembers || 0), 0)
  }), [jumuiaList]);

  const showSkeleton = loading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="jumuia-management"
    >
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`notification notification-${notification.type}`}
          >
            <span className="notification-icon">{notification.type === "success" ? "✓" : "⚠"}</span>
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="header-section">
        <div>
          <h1 className="page-title">Jumuia Management</h1>
          <p className="page-description">All Jumuia management</p>
        </div>
        <div className="header-actions">
          {/* Download Dropdown */}
          <div className="download-dropdown-wrapper">
            <button 
              className="btn-secondary" 
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={showSkeleton || downloading}
            >
              <Icons.DownloadCloud />
              Download Report
            </button>
            {showDownloadMenu && !showSkeleton && (
              <div className="download-dropdown-menu">
                <div className="dropdown-header">
                  <span>Full System Reports</span>
                </div>
                <button className="dropdown-item-pdf" onClick={() => downloadFullReport('pdf')} disabled={downloading}>
                  <Icons.FilePdf /> Full Report (PDF)
                </button>
                <button className="dropdown-item-word" onClick={() => downloadFullReport('word')} disabled={downloading}>
                  <Icons.FileWord /> Full Report (Word)
                </button>
                <div className="dropdown-divider"></div>
                <div className="dropdown-header">
                  <span>Individual Jumuia</span>
                </div>
                {jumuiaList.map(j => (
                  <div key={j.id} className="dropdown-submenu">
                    <span className="dropdown-jumuia-name">{j.name}</span>
                    <div className="dropdown-submenu-actions">
                      <button className="dropdown-item-pdf" onClick={() => downloadSingleJumuia(j, 'pdf')} disabled={downloading}>
                        <Icons.FilePdf /> PDF
                      </button>
                      <button className="dropdown-item-word" onClick={() => downloadSingleJumuia(j, 'word')} disabled={downloading}>
                        <Icons.FileWord /> Word
                      </button>
                    </div>
                  </div>
                ))}
                <div className="dropdown-divider"></div>
                <button className="dropdown-csv" onClick={handleExport} disabled={downloading}>
                  <Icons.Download /> Export as CSV
                </button>
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={() => setShowNewJumuiaModal(true)} disabled={showSkeleton}>
            <Icons.Plus />
            New Jumuia
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {showSkeleton ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)" }}>
                <Icons.Building />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalJumuia}</span>
                <span className="stat-label">Jumuia Groups</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>
                <Icons.Users />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalMembers}</span>
                <span className="stat-label">Total Members</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
                <Icons.Shield />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalAdmins}</span>
                <span className="stat-label">Admins</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.activeMembers}</span>
                <span className="stat-label">Active (30d)</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={showSkeleton}
          />
        </div>
        
        <div className="filter-wrapper">
          <Icons.Filter />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} disabled={showSkeleton}>
            <option value="all">All Roles</option>
            <option value="member">Members</option>
            <option value="admin">Admins</option>
            <option value="treasurer">Treasurers</option>
          </select>
        </div>

        <button className={`bulk-toggle ${bulkMode ? 'active' : ''}`} onClick={() => setBulkMode(!bulkMode)} disabled={showSkeleton}>
          <Icons.Check />
          Bulk Mode
        </button>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {bulkMode && selectedMembers.length > 0 && !showSkeleton && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bulk-bar"
          >
            <span className="bulk-selected">
              {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="bulk-actions">
              <select onChange={(e) => handleBulkAssign(e.target.value)} defaultValue="">
                <option value="" disabled>Move to Jumuia...</option>
                {jumuiaList.map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
              <button onClick={() => setSelectedMembers([])}>Clear</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jumuia List */}
      <div className="jumuia-list">
        {showSkeleton ? (
          <>
            <SkeletonJumuiaCard />
            <SkeletonJumuiaCard />
            <SkeletonJumuiaCard />
          </>
        ) : (
          filteredJumuia.map((jumuia) => (
            <motion.div
              key={jumuia.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="jumuia-card"
            >
              {/* Header */}
              <div className="jumuia-header">
                <div className="jumuia-header-left" onClick={() => setExpandedJumuia(expandedJumuia === jumuia.id ? null : jumuia.id)}>
                  <div className="jumuia-icon">
                    <Icons.Building />
                  </div>
                  <div className="jumuia-info">
                    <h3 className="jumuia-name">{jumuia.name}</h3>
                    <div className="jumuia-meta">
                      <span className="meta-badge">{jumuia.members.length} members</span>
                      {jumuia.description && <span className="meta-text">{jumuia.description}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="jumuia-header-right">
                  <button 
                    className="download-single-btn pdf-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleJumuia(jumuia, 'pdf');
                    }}
                    disabled={downloading}
                    title="Download as PDF"
                  >
                    <Icons.FilePdf />
                  </button>
                  <button 
                    className="download-single-btn word-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleJumuia(jumuia, 'word');
                    }}
                    disabled={downloading}
                    title="Download as Word"
                  >
                    <Icons.FileWord />
                  </button>
                  <button className="view-full-btn" onClick={(e) => handleViewJumuia(e, jumuia)}>
                    <Icons.Eye />
                    View Full Page
                  </button>
                  <span className="expand-icon">
                    {expandedJumuia === jumuia.id ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                  </span>
                </div>
              </div>

              {/* Members Table */}
              <AnimatePresence>
                {expandedJumuia === jumuia.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="members-container"
                  >
                    {jumuia.filteredMembers.length === 0 ? (
                      <div className="no-members">
                        <Icons.Users />
                        <p>No members found in this Jumuia</p>
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="members-table">
                          <thead>
                            <tr>
                              {bulkMode && <th className="checkbox-cell"></th>}
                              <th>Member</th>
                              <th>Role</th>
                              <th>Contact</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jumuia.filteredMembers.map((member) => (
                              <tr key={member.id}>
                                {bulkMode && (
                                  <td className="checkbox-cell">
                                    <input
                                      type="checkbox"
                                      checked={selectedMembers.includes(member.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedMembers([...selectedMembers, member.id]);
                                        } else {
                                          setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                        }
                                      }}
                                    />
                                  </td>
                                )}
                                <td>
                                  <div className="member-info">
                                    <div className="member-avatar">
                                      <MemberAvatar user={member} />
                                    </div>
                                    <div className="member-details">
                                      <div className="member-name">{member.fullName}</div>
                                      {member.membership_number && (
                                        <div className="member-membership">
                                          #{member.membership_number}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className={`role-badge role-${member.role}`}>
                                    {member.role === "admin" && "Admin"}
                                    {member.role === "treasurer" && "Treasurer"}
                                    {member.role === "member" && "Member"}
                                  </span>
                                </td>
                                <td>
                                  <div className="contact-info">
                                    <Icons.Mail />
                                    <span>{member.email}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`status-badge ${member.lastActive && new Date(member.lastActive) > new Date(Date.now() - 7*24*60*60*1000) ? 'status-active' : 'status-inactive'}`}>
                                    {member.lastActive && new Date(member.lastActive) > new Date(Date.now() - 7*24*60*60*1000) ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-group">
                                    <select
                                      onChange={(e) => handleMoveMember(member.id, e.target.value, jumuia.id, member.fullName)}
                                      defaultValue=""
                                      disabled={processingId === member.id}
                                    >
                                      <option value="" disabled>Move to...</option>
                                      {jumuiaList.filter(j => j.id !== jumuia.id).map(j => (
                                        <option key={j.id} value={j.id}>{j.name}</option>
                                      ))}
                                    </select>
                                    <button
                                      className="remove-btn"
                                      onClick={() => handleRemoveMember(member.id, member.fullName, jumuia.id)}
                                      disabled={processingId === member.id}
                                    >
                                      {processingId === member.id ? <Icons.Spinner /> : "Remove"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* New Jumuia Modal */}
      <AnimatePresence>
        {showNewJumuiaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowNewJumuiaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Create New Jumuia</h2>
                <button className="modal-close" onClick={() => setShowNewJumuiaModal(false)}>
                  <Icons.X />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={newJumuia.name}
                    onChange={(e) => setNewJumuia({ ...newJumuia, name: e.target.value })}
                    placeholder="e.g., St. Joseph Jumuia"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newJumuia.description}
                    onChange={(e) => setNewJumuia({ ...newJumuia, description: e.target.value })}
                    placeholder="Brief description of the Jumuia"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={newJumuia.location}
                    onChange={(e) => setNewJumuia({ ...newJumuia, location: e.target.value })}
                    placeholder="e.g., Nairobi Central"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowNewJumuiaModal(false)}>
                  Cancel
                </button>
                <button className="btn-create" onClick={handleCreateJumuia} disabled={processingId === "new"}>
                  {processingId === "new" ? <Icons.Spinner /> : "Create Jumuia"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .jumuia-management {
          min-height: 100vh;
          padding: 32px;
          margin-top: 50px;
          background: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Download Dropdown Styles */
        .download-dropdown-wrapper {
          position: relative;
          display: inline-block;
        }

        .download-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          min-width: 280px;
          max-height: 420px;
          overflow-y: auto;
          z-index: 100;
          padding: 8px 0;
        }

        .dropdown-header {
          padding: 8px 16px;
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .dropdown-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 6px 12px;
        }

        .dropdown-item-pdf,
        .dropdown-item-word,
        .dropdown-csv {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          color: #1e293b;
          transition: all 0.2s;
          border-radius: 6px;
          margin: 0 4px;
          width: calc(100% - 8px);
        }

        .dropdown-item-pdf:hover:not(:disabled) {
          background: #fef2f2;
        }

        .dropdown-item-word:hover:not(:disabled) {
          background: #eff6ff;
        }

        .dropdown-csv:hover:not(:disabled) {
          background: #f1f5f9;
        }

        .dropdown-item-pdf:disabled,
        .dropdown-item-word:disabled,
        .dropdown-csv:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-item-pdf svg,
        .dropdown-item-word svg {
          flex-shrink: 0;
        }

        .dropdown-submenu {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-radius: 6px;
          margin: 2px 4px;
          transition: all 0.2s;
        }

        .dropdown-submenu:hover {
          background: #f8fafc;
        }

        .dropdown-jumuia-name {
          font-size: 13px;
          color: #1e293b;
          font-weight: 500;
          flex: 1;
        }

        .dropdown-submenu-actions {
          display: flex;
          gap: 4px;
        }

        .dropdown-submenu-actions button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: 11px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #475569;
        }

        .dropdown-submenu-actions button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .dropdown-submenu-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-submenu-actions .pdf-btn:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .dropdown-submenu-actions .word-btn:hover:not(:disabled) {
          background: #eff6ff;
          border-color: #2563eb;
          color: #2563eb;
        }

        .dropdown-csv {
          color: #475569 !important;
        }

        .dropdown-csv:hover:not(:disabled) {
          background: #f1f5f9 !important;
        }

        .download-single-btn {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          margin-right: 6px;
          color: #475569;
        }

        .download-single-btn.pdf-btn:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .download-single-btn.word-btn:hover:not(:disabled) {
          background: #eff6ff;
          border-color: #2563eb;
          color: #2563eb;
        }

        .download-single-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Skeleton Loading */
        .skeleton-shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-line {
          background: #e2e8f0;
          border-radius: 4px;
          animation: shimmer 1.5s infinite;
          background-size: 200% 100%;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Notification */
        .notification {
          position: fixed;
          top: 84px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
        }

        .notification-success { background: #10b981; }
        .notification-error { background: #ef4444; }
        .notification-warning { background: #f59e0b; }

        /* Header */
        .header-section {
          background: white;
          border-radius: 16px;
          padding: 24px 32px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .page-description {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-primary, .btn-secondary {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:disabled, .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        }

        .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }

        .btn-secondary {
          background: white;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
        }

        /* Filters */
        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-wrapper, .filter-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #94a3b8;
        }

        .search-wrapper { flex: 1; min-width: 250px; }
        .search-wrapper input, .filter-wrapper select {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
        }

        .search-wrapper input:disabled, .filter-wrapper select:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .bulk-toggle {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bulk-toggle:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .bulk-toggle.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        /* Bulk Bar */
        .bulk-bar {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bulk-selected { font-weight: 500; color: #0f172a; }
        .bulk-actions { display: flex; gap: 8px; }
        .bulk-actions select, .bulk-actions button {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }

        /* Jumuia List */
        .jumuia-list { display: flex; flex-direction: column; gap: 16px; }

        .jumuia-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .jumuia-header {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafbfc;
          border-bottom: 1px solid #e2e8f0;
        }

        .jumuia-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          flex: 1;
        }

        .jumuia-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .jumuia-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }

        .jumuia-name {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 6px 0;
        }

        .jumuia-meta { display: flex; gap: 12px; }
        .meta-badge {
          padding: 4px 8px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 12px;
          color: #475569;
        }
        .meta-text { font-size: 13px; color: #64748b; }

        .view-full-btn {
          padding: 8px 16px;
          border-radius: 8px;
          background: #3b82f6;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .expand-icon { color: #94a3b8; cursor: pointer; }

        /* Members Table */
        .members-container { padding: 20px; }
        .table-wrapper { overflow-x: auto; }

        .members-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .members-table thead {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }

        .members-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
        }

        .members-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        /* Member Info */
        .member-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .member-avatar {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .member-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          object-fit: cover;
          border: 2px solid #e2e8f0;
        }

        .member-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }

        .member-details {
          flex: 1;
        }

        .member-name {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .member-membership {
          font-size: 11px;
          font-family: monospace;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .role-admin { background: #fef2f2; color: #dc2626; }
        .role-member { background: #f1f5f9; color: #475569; }
        .role-treasurer { background: #fef3c7; color: #d97706; }

        .contact-info { display: flex; align-items: center; gap: 8px; color: #64748b; }
        .contact-info span { color: #1e293b; }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-active { background: #dcfce7; color: #059669; }
        .status-inactive { background: #f1f5f9; color: #64748b; }

        .action-group { display: flex; gap: 8px; }
        .action-group select, .remove-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid #e2e8f0;
        }
        .remove-btn {
          background: #ef4444;
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .remove-btn:hover:not(:disabled) { background: #dc2626; }
        .remove-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          overflow: hidden;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
        .modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; }

        .modal-body { padding: 24px; }
        .form-group { margin-bottom: 20px; }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          color: #475569;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-cancel, .btn-create {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel { background: white; border: 1px solid #e2e8f0; }
        .btn-cancel:hover { background: #f8fafc; }
        .btn-create { background: #3b82f6; color: white; border: none; }
        .btn-create:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
        .btn-create:disabled { opacity: 0.6; cursor: not-allowed; }

        /* No Members */
        .no-members {
          text-align: center;
          padding: 48px;
          color: #94a3b8;
        }

        /* Scrollbar for dropdown */
        .download-dropdown-menu::-webkit-scrollbar {
          width: 4px;
        }

        .download-dropdown-menu::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .download-dropdown-menu::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .jumuia-management { padding: 16px; }
          .header-section { flex-direction: column; gap: 16px; align-items: stretch; }
          .stats-grid { grid-template-columns: 1fr; }
          .filters-bar { flex-direction: column; }
          .search-wrapper { width: 100%; }
          .download-dropdown-menu {
            right: auto;
            left: 0;
            min-width: 250px;
          }
          .jumuia-header {
            flex-direction: column;
            gap: 12px;
          }
          .jumuia-header-right {
            width: 100%;
            flex-wrap: wrap;
            justify-content: flex-start;
          }
          .member-info { min-width: 200px; }
          .action-group { flex-direction: column; }
          .action-group select, .remove-btn { width: 100%; }
          .dropdown-submenu {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          .dropdown-submenu-actions {
            width: 100%;
          }
          .dropdown-submenu-actions button {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
}