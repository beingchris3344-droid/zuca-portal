// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUsers, FiBell, FiMusic, FiDollarSign, 
  FiUserCheck, FiCalendar, FiMessageCircle,
  FiActivity, FiTrash2, FiEdit2, FiPieChart, 
  FiBarChart2, FiRefreshCw,
  FiClock, FiCheckCircle, FiArrowUp,
  FiUsers as FiUsersIcon
} from "react-icons/fi";
import { RiAdminLine } from "react-icons/ri";
import { FaDonate, FaChurch } from "react-icons/fa";
import { GiPrayer } from "react-icons/gi";
import axios from "axios";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import io from "socket.io-client";
import BASE_URL from "../../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAnnouncements: 0,
    totalPrograms: 0,
    totalMessages: 0,
    totalPledged: 0,
    activeJumuia: 0,
    onlineUsers: 0,
    recentUsers: 0,
    unreadMessages: 0,
    upcomingEvents: 0,
    completedPledges: 0,
    pendingPledges: 0,
    totalContributions: 0,
    totalSongs: 0
  });
  
  const [users, setUsers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [massPrograms, setMassPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [selectedContribution, setSelectedContribution] = useState("all");
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Load cached data instantly from localStorage
  useEffect(() => {
    const cachedStats = localStorage.getItem('admin_dashboard_stats');
    const cachedUsers = localStorage.getItem('admin_dashboard_users');
    const cachedActivities = localStorage.getItem('admin_dashboard_activities');
    
    if (cachedStats) setStats(JSON.parse(cachedStats));
    if (cachedUsers) setUsers(JSON.parse(cachedUsers));
    if (cachedActivities) setRecentActivities(JSON.parse(cachedActivities));
    
    setLoading(false); // Show UI instantly
  }, []);

  // Save to cache whenever data changes
  useEffect(() => {
    if (stats.totalUsers > 0) {
      localStorage.setItem('admin_dashboard_stats', JSON.stringify(stats));
    }
  }, [stats]);
  
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('admin_dashboard_users', JSON.stringify(users.slice(0, 50)));
    }
  }, [users]);
  
  useEffect(() => {
    if (recentActivities.length > 0) {
      localStorage.setItem('admin_dashboard_activities', JSON.stringify(recentActivities));
    }
  }, [recentActivities]);

  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Dashboard connected');
    });

    socket.on('user_online', (data) => {
      setStats(prev => ({ ...prev, onlineUsers: data.count }));
    });

    socket.on('stats_updated', (newStats) => {
      setStats(prev => ({ ...prev, ...newStats }));
      refreshData();
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
    }
  }, [token]);

  const calculateUserGrowth = (usersList) => {
    const now = new Date();
    const months = [];
    const counts = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      
      const count = usersList.filter(user => {
        const createdAt = new Date(user.createdAt);
        return createdAt.getMonth() === month.getMonth() && 
               createdAt.getFullYear() === month.getFullYear();
      }).length;
      
      counts.push(count);
    }
    
    return { months, counts };
  };

  const refreshData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchDashboardData();
    } catch (err) {
      setError("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [
        statsRes,
        usersRes,
        contributionsRes,
        announcementsRes,
        programsRes,
        messagesRes,
        eventsRes,
        songsRes
      ] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/admin/stats`, { headers }),
        axios.get(`${BASE_URL}/api/users`, { headers }),
        axios.get(`${BASE_URL}/api/contribution-types`, { headers }),
        axios.get(`${BASE_URL}/api/announcements`, { headers }),
        axios.get(`${BASE_URL}/api/songs`, { headers }),
        axios.get(`${BASE_URL}/api/chat/unread`, { headers }),
        axios.get(`${BASE_URL}/api/events/upcoming`, { headers }),
        axios.get(`${BASE_URL}/api/songs`, { headers })
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(prev => ({ ...prev, ...statsRes.value.data }));
      }

      if (usersRes.status === 'fulfilled') {
        const userData = usersRes.value.data || [];
        setUsers(userData);
        
        const onlineUsers = userData.filter(u => u.online).length;
        const activeJumuia = new Set(userData
          .filter(u => u.jumuiaId)
          .map(u => u.jumuiaId)).size;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUsers = userData.filter(u => 
          new Date(u.createdAt) >= sevenDaysAgo
        ).length;

        const growth = calculateUserGrowth(userData);
        setUserGrowthData(growth);

        setStats(prev => ({ 
          ...prev, 
          onlineUsers,
          activeJumuia,
          recentUsers,
          totalUsers: userData.length 
        }));
      }

      if (contributionsRes.status === 'fulfilled') {
        const contribData = contributionsRes.value.data || [];
        setContributions(contribData);

        const totalPledged = contribData.reduce((sum, c) => 
          sum + (c.pledges?.reduce((s, p) => s + (p.amountPaid || 0), 0) || 0), 0);
        
        const pendingPledges = contribData.reduce((sum, c) => 
          sum + (c.pledges?.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length || 0), 0);
        
        const completedPledges = contribData.reduce((sum, c) => 
          sum + (c.pledges?.filter(p => p.status === "COMPLETED" || p.amountPaid >= c.amountRequired).length || 0), 0);

        setStats(prev => ({ 
          ...prev, 
          totalPledged,
          pendingPledges,
          completedPledges,
          totalContributions: contribData.length 
        }));
      }

      if (announcementsRes.status === 'fulfilled') {
        const announcementData = announcementsRes.value.data || [];
        setAnnouncements(Array.isArray(announcementData) ? announcementData.slice(0, 5) : []);
        setStats(prev => ({ 
          ...prev, 
          totalAnnouncements: announcementData.length 
        }));
      }

      if (programsRes.status === 'fulfilled') {
        const programData = programsRes.value.data || [];
        setMassPrograms(Array.isArray(programData) ? programData.slice(0, 3) : []);
        setStats(prev => ({ 
          ...prev, 
          totalPrograms: programData.length 
        }));
      }

      if (messagesRes.status === 'fulfilled') {
        setStats(prev => ({ 
          ...prev, 
          unreadMessages: messagesRes.value.data?.count || 0,
          totalMessages: messagesRes.value.data?.total || 0
        }));
      }

      if (eventsRes.status === 'fulfilled') {
        setStats(prev => ({ 
          ...prev, 
          upcomingEvents: eventsRes.value.data?.length || 0 
        }));
      }

      if (songsRes.status === 'fulfilled') {
        setStats(prev => ({ 
          ...prev, 
          totalSongs: songsRes.value.data?.length || 0 
        }));
      }

      const activities = [];

      if (usersRes.status === 'fulfilled') {
        const userData = usersRes.value.data || [];
        userData.slice(0, 3).forEach(user => {
          if (user.createdAt) {
            activities.push({
              id: `user-${user.id}`,
              type: 'user',
              icon: '👤',
              user: user.fullName,
              action: 'joined',
              target: 'ZUCA community',
              details: `${user.fullName} joined ZUCA community`,
              time: user.createdAt,
              avatar: user.profileImage
            });
          }
        });
      }

      if (contributionsRes.status === 'fulfilled') {
        const contribData = contributionsRes.value.data || [];
        contribData.slice(0, 3).forEach(contribution => {
          if (contribution.pledges) {
            contribution.pledges.slice(0, 2).forEach(pledge => {
              if (pledge.createdAt && pledge.user) {
                let actionText = '';
                if (pledge.amountPaid > 0 && pledge.amountPaid >= contribution.amountRequired) {
                  actionText = `completed payment of KES ${pledge.amountPaid.toLocaleString()}`;
                } else if (pledge.amountPaid > 0) {
                  actionText = `paid KES ${pledge.amountPaid.toLocaleString()}`;
                } else if (pledge.pendingAmount > 0) {
                  actionText = `pledged KES ${pledge.pendingAmount.toLocaleString()}`;
                }
                
                if (actionText) {
                  activities.push({
                    id: `pledge-${pledge.id}`,
                    type: 'pledge',
                    icon: '💰',
                    user: pledge.user?.fullName || 'A member',
                    action: actionText,
                    target: `for ${contribution.title}`,
                    details: `${pledge.user?.fullName || 'A member'} ${actionText} for ${contribution.title}`,
                    time: pledge.createdAt,
                    avatar: pledge.user?.profileImage
                  });
                }
              }
            });
          }
        });
      }

      if (announcementsRes.status === 'fulfilled') {
        const announcementData = announcementsRes.value.data || [];
        announcementData.slice(0, 3).forEach(ann => {
          if (ann.createdAt) {
            activities.push({
              id: `ann-${ann.id}`,
              type: 'announcement',
              icon: '📢',
              user: 'Admin',
              action: 'posted',
              target: 'new announcement',
              details: `New announcement: ${ann.title}`,
              time: ann.createdAt,
              avatar: null
            });
          }
        });
      }

      if (programsRes.status === 'fulfilled') {
        const programData = programsRes.value.data || [];
        programData.slice(0, 3).forEach(program => {
          if (program.createdAt) {
            activities.push({
              id: `program-${program.id}`,
              type: 'program',
              icon: '⛪',
              user: 'Liturgy Team',
              action: 'scheduled',
              target: 'mass program',
              details: `Mass scheduled at ${program.venue || 'Church'} on ${new Date(program.date).toLocaleDateString()}`,
              time: program.createdAt,
              avatar: null
            });
          }
        });
      }

      const sortedActivities = activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 8);
      
      setRecentActivities(sortedActivities);

    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/users/${id}`, { headers });
      setUsers(users.filter((u) => u.id !== id));
      refreshData();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await axios.put(`${BASE_URL}/api/users/${id}/role`, 
        { role: newRole }, 
        { headers }
      );
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      refreshData();
    } catch (err) {
      alert("Failed to update role");
    }
  };

  const filteredUsers = userRoleFilter === "all" 
    ? users 
    : users.filter(u => u.role === userRoleFilter);

  const getContributionChartData = () => {
    if (selectedContribution === "all") {
      const totalRequired = stats.totalUsers * 5000;
      return {
        labels: ['Paid', 'Pending', 'Remaining'],
        data: [
          stats.totalPledged || 0,
          stats.pendingPledges * 1000 || 0,
          Math.max(0, totalRequired - stats.totalPledged) || 0
        ],
        colors: ['#10b981', '#f59e0b', '#94a3b8']
      };
    } else {
      const contribution = contributions.find(c => c.id === selectedContribution);
      if (!contribution) return null;
      
      const totalPaid = contribution.pledges?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
      const totalPending = contribution.pledges?.reduce((sum, p) => sum + (p.pendingAmount || 0), 0) || 0;
      const totalRequired = (contribution.pledges?.length || 0) * contribution.amountRequired;
      
      return {
        labels: ['Paid', 'Pending', 'Remaining'],
        data: [totalPaid, totalPending, Math.max(0, totalRequired - totalPaid - totalPending)],
        colors: ['#10b981', '#f59e0b', '#94a3b8'],
        title: contribution.title
      };
    }
  };

  const chartData = getContributionChartData();

  const growthChartData = {
    labels: userGrowthData.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Users',
        data: userGrowthData.counts || [0, 0, 0, 0, 0, 0],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ],
  };

  const contributionChartData = chartData ? {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.data,
        backgroundColor: chartData.colors,
        borderWidth: 0,
        hoverOffset: 4,
      }
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { 
          color: '#64748b',
          callback: (value) => value 
        }
      },
      x: { 
        grid: { display: false },
        ticks: { color: '#64748b' }
      }
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 11, weight: '500' },
          color: '#334155'
        }
      }
    },
    cutout: '65%',
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Just now';
    }
  };

  // REMOVED loading screen - show content instantly
  return (
    <motion.div 
      style={styles.dashboard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <main style={styles.mainContent}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>Admin Dashboard</h1>
            <p style={styles.pageSubtitle}>
              {error ? 'Welcome Admin' : 'Manage your community'}
            </p>
          </div>
          
          <div style={styles.headerActions}>
            <button 
              style={styles.refreshBtn}
              onClick={refreshData}
              disabled={refreshing}
            >
              <FiRefreshCw style={{ ...styles.refreshIcon, ...(refreshing ? styles.spinning : {}) }} />
            </button>

            <div style={styles.adminProfile}>
              <div style={styles.adminAvatar}>
                <RiAdminLine />
              </div>
              <div style={styles.adminInfo}>
                <span style={styles.adminName}>Admin</span>
                <span style={styles.adminRole}>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Grid - Responsive */}
        <div className="stats-grid" style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, ...styles.statIconUsers}}><FiUsers /></div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{stats.totalUsers || 0}</span>
              <span style={styles.statLabel}>Total Users</span>
              <div style={styles.statFooter}><FiUserCheck style={styles.footerIcon} /><span>{stats.onlineUsers || 0} online</span></div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, ...styles.statIconAnnouncements}}><FiBell /></div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{stats.totalAnnouncements || 0}</span>
              <span style={styles.statLabel}>Announcements</span>
              <div style={styles.statFooter}><FiClock style={styles.footerIcon} /><span>{announcements.length} recent</span></div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, ...styles.statIconContributions}}><FaDonate /></div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>KES {(stats.totalPledged || 0).toLocaleString()}</span>
              <span style={styles.statLabel}>Pledged</span>
              <div style={styles.statFooter}><FiCheckCircle style={{...styles.footerIcon, ...styles.successColor}} /><span>{stats.completedPledges || 0} completed</span></div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, ...styles.statIconPrograms}}><GiPrayer /></div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{stats.totalPrograms || 0}</span>
              <span style={styles.statLabel}>Programs</span>
              <div style={styles.statFooter}><FiCalendar style={styles.footerIcon} /><span>{stats.upcomingEvents || 0} upcoming</span></div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, ...styles.statIconMessages}}><FiMessageCircle /></div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{stats.totalMessages || 0}</span>
              <span style={styles.statLabel}>Messages</span>
              <div style={styles.statFooter}><span>{stats.unreadMessages || 0} unread</span></div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, ...styles.statIconJumuia}}><FaChurch /></div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{stats.activeJumuia || 0}</span>
              <span style={styles.statLabel}>Jumuia Groups</span>
              <div style={styles.statFooter}><FiUsersIcon style={styles.footerIcon} /><span>{stats.recentUsers || 0} new members</span></div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={styles.chartsStack}>
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div><h3 style={styles.chartTitle}>User Growth</h3><p style={styles.chartSubtitle}>Last 6 months</p></div>
              <FiBarChart2 style={styles.chartIcon} />
            </div>
            <div style={styles.chartContainer}>
              {userGrowthData.counts?.some(v => v > 0) ? (
                <Line data={growthChartData} options={chartOptions} />
              ) : (
                <div style={styles.noData}>No data available</div>
              )}
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div><h3 style={styles.chartTitle}>Contributions</h3><p style={styles.chartSubtitle}>{selectedContribution === "all" ? 'Overall' : chartData?.title}</p></div>
              <FiPieChart style={styles.chartIcon} />
            </div>
            
            <select style={styles.contributionSelect} value={selectedContribution} onChange={(e) => setSelectedContribution(e.target.value)}>
              <option value="all">All Contributions</option>
              {contributions.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>

            <div style={{...styles.chartContainer, ...styles.doughnutContainer, marginTop: '16px'}}>
              {contributionChartData ? <Doughnut data={contributionChartData} options={doughnutOptions} /> : <div style={styles.noData}>No data available</div>}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div style={styles.usersCard}>
          <div style={styles.cardHeader}>
            <div><h3 style={styles.cardTitle}>Recent Users</h3><p style={styles.cardSubtitle}>Manage and view all members</p></div>
            <div style={styles.cardActions}>
              <select style={styles.roleFilter} value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="treasurer">Treasurer</option>
              </select>
              <a href="/admin/users" style={styles.viewAll}>View All →</a>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.usersTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>User</th>
                  <th style={styles.tableHeader}>Role</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Joined</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="5" style={styles.noDataCell}>No users found</td></tr>
                ) : (
                  filteredUsers.slice(0, 8).map((user) => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <div style={styles.userCell}>
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.fullName} style={styles.userAvatar} />
                          ) : (
                            <div style={{...styles.userAvatar, ...styles.userAvatarFallback}}>{user.fullName?.charAt(0).toUpperCase()}</div>
                          )}
                          <div style={styles.userInfo}>
                            <div style={styles.userName}>{user.fullName}</div>
                            <div style={styles.userEmail}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{...styles.roleBadge, ...styles[`roleBadge${user.role || 'member'}`]}}>{user.role || 'member'}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{...styles.statusBadge, ...styles[user.online ? 'statusOnline' : 'statusOffline']}}>{user.online ? 'Online' : 'Offline'}</span>
                      </td>
                      <td style={styles.tableCell}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          <button style={styles.iconBtn} onClick={() => { setSelectedUser(user); setShowUserModal(true); }} title="Edit"><FiEdit2 /></button>
                          <button style={styles.iconBtn} onClick={() => handleDeleteUser(user.id)} title="Delete"><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div style={styles.activityCard}>
          <div style={styles.cardHeader}>
            <div><h3 style={styles.cardTitle}>Recent Activity</h3><p style={styles.cardSubtitle}>Latest actions across the platform</p></div>
            <FiActivity style={styles.activityIcon} />
          </div>

          <div style={styles.activityList}>
            {recentActivities.length === 0 ? (
              <div style={styles.noData}>No recent activity</div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={styles.activityIconWrapper}><span style={styles.activityEmoji}>{activity.icon}</span></div>
                  <div style={styles.activityContent}>
                    <p style={styles.activityText}>{activity.details}</p>
                    <span style={styles.activityTime}>{formatTime(activity.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Links */}
          <div style={styles.quickLinks}>
            <h4 style={styles.quickLinksTitle}>Quick Actions</h4>
            <div style={styles.linksGrid}>
              <a href="/admin/announcements" style={styles.quickLink}><FiBell /> New Announcement</a>
              <a href="/admin/contributions" style={styles.quickLink}><FaDonate /> Add Contribution</a>
              <a href="/admin/songs" style={styles.quickLink}><GiPrayer /> Schedule Mass</a>
              <a href="/admin/users" style={styles.quickLink}><FiUsers /> Manage Users</a>
            </div>
          </div>

          {/* Recent Announcements */}
          {announcements.length > 0 && (
            <div style={styles.recentSection}>
              <h4 style={styles.recentSectionTitle}>Recent Announcements</h4>
              {announcements.slice(0, 3).map((ann, i) => (
                <div key={i} style={styles.recentItem}>
                  <span style={styles.recentIcon}>📢</span>
                  <div style={styles.recentContent}>
                    <div style={styles.recentTitle}>{ann.title}</div>
                    <div style={styles.recentTime}>{formatTime(ann.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* User Edit Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <motion.div style={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserModal(false)}>
            <motion.div style={styles.modalContent} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Edit User</h3>
              <div style={styles.modalBody}>
                <div style={styles.userDetail}><label style={styles.userDetailLabel}>Name</label><p style={styles.userDetailValue}>{selectedUser.fullName}</p></div>
                <div style={styles.userDetail}><label style={styles.userDetailLabel}>Email</label><p style={styles.userDetailValue}>{selectedUser.email}</p></div>
                <div style={styles.userDetail}>
                  <label style={styles.userDetailLabel}>Role</label>
                  <select style={styles.userDetailSelect} value={selectedUser.role || 'member'} onChange={(e) => { handleRoleChange(selectedUser.id, e.target.value); setSelectedUser({ ...selectedUser, role: e.target.value }); }}>
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={styles.modalActions}><button style={styles.closeBtn} onClick={() => setShowUserModal(false)}>Close</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Professional White Theme Styles
const styles = {
  dashboard: {
    minHeight: "100vh",
    background: "#f8fafc",
    marginTop: "50px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    position: "relative"
  },
  mainContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
    padding: "20px",
    position: "relative",
    zIndex: 1
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerLeft: {
    flex: 1,
    minWidth: "200px"
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 4px 0"
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  refreshBtn: {
    width: "40px",
    height: "40px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  refreshIcon: { fontSize: "18px" },
  spinning: { animation: "spin 1s linear infinite" },
  adminProfile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "4px 12px 4px 4px",
    background: "#ffffff",
    borderRadius: "40px",
    border: "1px solid #e2e8f0"
  },
  adminAvatar: {
    width: "32px",
    height: "32px",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    color: "white",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px"
  },
  adminInfo: { display: "flex", flexDirection: "column" },
  adminName: { fontSize: "13px", fontWeight: "600", color: "#1e293b" },
  adminRole: { fontSize: "10px", color: "#64748b" },
  statsGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(6, 1fr)", 
    gap: "16px", 
    marginBottom: "24px" 
  },
  statCard: { 
    background: "#ffffff", 
    borderRadius: "16px", 
    padding: "16px", 
    display: "flex", 
    alignItems: "center", 
    gap: "12px", 
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
  },
  statIcon: { 
    width: "44px", 
    height: "44px", 
    borderRadius: "12px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontSize: "20px", 
    flexShrink: 0 
  },
  statIconUsers: { background: "#eff6ff", color: "#3b82f6" },
  statIconAnnouncements: { background: "#fef3c7", color: "#f59e0b" },
  statIconContributions: { background: "#d1fae5", color: "#10b981" },
  statIconPrograms: { background: "#ede9fe", color: "#8b5cf6" },
  statIconMessages: { background: "#fce7f3", color: "#ec4899" },
  statIconJumuia: { background: "#fef3c7", color: "#f59e0b" },
  statContent: { flex: 1, minWidth: 0 },
  statValue: { 
    display: "block", 
    fontSize: "20px", 
    fontWeight: "700", 
    color: "#1e293b", 
    lineHeight: "1.2", 
    marginBottom: "2px" 
  },
  statLabel: { 
    display: "block", 
    fontSize: "10px", 
    color: "#64748b", 
    marginBottom: "4px", 
    textTransform: "uppercase", 
    letterSpacing: "0.5px" 
  },
  statFooter: { 
    display: "flex", 
    alignItems: "center", 
    gap: "4px", 
    fontSize: "10px", 
    color: "#475569", 
    flexWrap: "wrap" 
  },
  footerIcon: { fontSize: "11px", color: "#94a3b8" },
  successColor: { color: "#10b981" },
  chartsStack: { display: "flex", flexDirection: "column", gap: "24px", marginBottom: "24px" },
  chartCard: { 
    background: "#ffffff", 
    borderRadius: "16px", 
    padding: "20px", 
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
  },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  chartTitle: { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 4px 0" },
  chartSubtitle: { fontSize: "12px", color: "#64748b", margin: 0 },
  chartIcon: { color: "#94a3b8", fontSize: "18px" },
  contributionSelect: { 
    width: "100%", 
    padding: "10px", 
    border: "1px solid #e2e8f0", 
    borderRadius: "10px", 
    fontSize: "13px", 
    color: "#1e293b", 
    background: "#ffffff", 
    cursor: "pointer", 
    marginTop: "12px" 
  },
  chartContainer: { height: "250px", width: "100%", position: "relative" },
  doughnutContainer: { height: "250px", display: "flex", alignItems: "center", justifyContent: "center" },
  noData: { textAlign: "center", color: "#94a3b8", padding: "30px", fontStyle: "italic" },
  usersCard: { 
    background: "#ffffff", 
    borderRadius: "16px", 
    padding: "20px", 
    border: "1px solid #e2e8f0", 
    marginBottom: "24px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" },
  cardTitle: { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 4px 0" },
  cardSubtitle: { fontSize: "12px", color: "#64748b", margin: 0 },
  cardActions: { display: "flex", alignItems: "center", gap: "12px" },
  roleFilter: { 
    padding: "8px 12px", 
    border: "1px solid #e2e8f0", 
    borderRadius: "8px", 
    fontSize: "13px", 
    color: "#1e293b", 
    background: "#ffffff", 
    cursor: "pointer" 
  },
  viewAll: { color: "#3b82f6", textDecoration: "none", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap" },
  tableContainer: { overflowX: "auto", overflowY: "auto", maxHeight: "400px", borderRadius: "12px" },
  usersTable: { width: "100%", borderCollapse: "collapse", minWidth: "700px" },
  tableHeader: { 
    textAlign: "left", 
    padding: "12px", 
    fontSize: "12px", 
    fontWeight: "600", 
    color: "#64748b", 
    borderBottom: "1px solid #e2e8f0", 
    position: "sticky", 
    top: 0, 
    background: "#ffffff", 
    zIndex: 10 
  },
  tableRow: { borderBottom: "1px solid #f1f5f9" },
  tableCell: { padding: "12px", color: "#1e293b", fontSize: "13px" },
  noDataCell: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  userCell: { display: "flex", alignItems: "center", gap: "12px" },
  userAvatar: { width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 },
  userAvatarFallback: { 
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", 
    color: "white", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontWeight: "600", 
    fontSize: "14px" 
  },
  userInfo: { minWidth: 0 },
  userName: { 
    fontSize: "13px", 
    fontWeight: "500", 
    color: "#1e293b", 
    marginBottom: "2px", 
    whiteSpace: "nowrap", 
    overflow: "hidden", 
    textOverflow: "ellipsis" 
  },
  userEmail: { fontSize: "10px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  roleBadge: { 
    display: "inline-block", 
    padding: "4px 10px", 
    borderRadius: "20px", 
    fontSize: "10px", 
    fontWeight: "600", 
    textTransform: "capitalize", 
    whiteSpace: "nowrap" 
  },
  roleBadgeadmin: { background: "#fef2f2", color: "#ef4444" },
  roleBadgemember: { background: "#eff6ff", color: "#3b82f6" },
  roleBadgetreasurer: { background: "#d1fae5", color: "#10b981" },
  statusBadge: { 
    display: "inline-block", 
    padding: "4px 10px", 
    borderRadius: "20px", 
    fontSize: "10px", 
    fontWeight: "600", 
    whiteSpace: "nowrap" 
  },
  statusOnline: { background: "#d1fae5", color: "#10b981" },
  statusOffline: { background: "#f1f5f9", color: "#64748b" },
  actionButtons: { display: "flex", gap: "8px" },
  iconBtn: { 
    width: "28px", 
    height: "28px", 
    border: "none", 
    borderRadius: "6px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    cursor: "pointer", 
    background: "#f8fafc", 
    color: "#64748b" 
  },
  activityCard: { 
    background: "#ffffff", 
    borderRadius: "16px", 
    padding: "20px", 
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
  },
  activityIcon: { color: "#94a3b8", fontSize: "18px" },
  activityList: { marginBottom: "20px" },
  activityItem: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  activityIconWrapper: { width: "32px", height: "32px", background: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  activityEmoji: { fontSize: "16px" },
  activityContent: { flex: 1, minWidth: 0 },
  activityText: { fontSize: "12px", color: "#1e293b", margin: "0 0 4px 0", lineHeight: "1.4" },
  activityTime: { fontSize: "10px", color: "#94a3b8" },
  quickLinks: { margin: "20px 0", padding: "16px", background: "#f8fafc", borderRadius: "12px" },
  quickLinksTitle: { fontSize: "14px", fontWeight: "600", color: "#1e293b", margin: "0 0 12px 0" },
  linksGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" },
  quickLink: { 
    display: "flex", 
    alignItems: "center", 
    gap: "8px", 
    padding: "10px", 
    background: "#ffffff", 
    borderRadius: "8px", 
    color: "#1e293b", 
    textDecoration: "none", 
    fontSize: "12px", 
    fontWeight: "500", 
    border: "1px solid #e2e8f0" 
  },
  recentSection: { marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" },
  recentSectionTitle: { fontSize: "14px", fontWeight: "600", color: "#1e293b", margin: "0 0 12px 0" },
  recentItem: { display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" },
  recentIcon: { width: "28px", height: "28px", background: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 },
  recentContent: { flex: 1, minWidth: 0 },
  recentTitle: { fontSize: "12px", fontWeight: "500", color: "#1e293b", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentTime: { fontSize: "10px", color: "#64748b" },
  modalOverlay: { 
    position: "fixed", 
    inset: 0, 
    background: "rgba(0,0,0,0.5)", 
    backdropFilter: "blur(4px)", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 1000, 
    padding: "16px" 
  },
  modalContent: { 
    background: "#ffffff", 
    borderRadius: "16px", 
    padding: "20px", 
    width: "100%", 
    maxWidth: "380px", 
    maxHeight: "90vh", 
    overflowY: "auto" 
  },
  modalTitle: { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 16px" },
  modalBody: { marginBottom: "16px" },
  userDetail: { marginBottom: "14px" },
  userDetailLabel: { display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px" },
  userDetailValue: { margin: 0, fontSize: "13px", color: "#1e293b", fontWeight: "500" },
  userDetailSelect: { 
    width: "100%", 
    padding: "8px", 
    border: "1px solid #e2e8f0", 
    borderRadius: "8px", 
    fontSize: "13px", 
    color: "#1e293b", 
    background: "#ffffff" 
  },
  modalActions: { display: "flex", justifyContent: "flex-end" },
  closeBtn: { 
    padding: "8px 16px", 
    border: "none", 
    borderRadius: "8px", 
    background: "#f1f5f9", 
    color: "#1e293b", 
    fontSize: "13px", 
    fontWeight: "500", 
    cursor: "pointer" 
  }
};

// Add global responsive styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Desktop: 6 columns */
  @media (min-width: 1200px) {
    .stats-grid { grid-template-columns: repeat(6, 1fr) !important; }
  }
  
  /* Tablet: 3 columns */
  @media (min-width: 769px) and (max-width: 1199px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 14px !important; }
  }
  
  /* Mobile: 2 columns */
  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
    .main-content { padding: 16px !important; }
    .chart-container { height: 200px !important; }
    .links-grid { grid-template-columns: 1fr !important; }
    .stat-card { padding: 12px !important; }
    .stat-icon { width: 36px !important; height: 36px !important; font-size: 18px !important; }
    .stat-value { font-size: 16px !important; }
    .stat-label { font-size: 9px !important; }
  }
  
  /* Small mobile: 1 column */
  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(1, 1fr) !important; gap: 10px !important; }
    .header { flex-direction: column !important; align-items: flex-start !important; }
    .header-actions { width: 100% !important; justify-content: space-between !important; }
    .card-header { flex-direction: column !important; align-items: flex-start !important; }
    .card-actions { width: 100% !important; justify-content: space-between !important; }
    .role-filter { flex: 1 !important; }
    .table-container { overflow-x: auto !important; }
    .users-table { min-width: 600px !important; }
  }
`;
document.head.appendChild(styleSheet);

export default AdminDashboard;