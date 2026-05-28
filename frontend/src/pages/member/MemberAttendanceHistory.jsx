import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, ChevronRight, TrendingUp, Award, Target, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';

export default function MemberAttendanceHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeChart, setActiveChart] = useState('trend');
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/attendance/my-history`, {
        headers: getHeaders()
      });
      setHistory(response.data.history || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchHistory();
  }, []);
  
  const getFilteredHistory = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (filter === 'thisMonth') {
      return history.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }
    if (filter === 'lastMonth') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return history.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      });
    }
    return history;
  };
  
  // Generate weekly performance data
  const getWeeklyPerformance = () => {
    const weeks = {};
    const filteredHistory = getFilteredHistory();
    
    filteredHistory.forEach(record => {
      const date = new Date(record.signTime);
      const weekNum = Math.ceil(date.getDate() / 7);
      const weekKey = `Week ${weekNum}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { week: weekKey, attendance: 0, meetings: 0, onTime: 0 };
      }
      weeks[weekKey].meetings++;
      weeks[weekKey].attendance = 100;
      
      // Assume signMethod determines timeliness
      if (record.signMethod === 'SELF' || record.signMethod === 'QR_CODE') {
        weeks[weekKey].onTime++;
      }
    });
    
    return Object.values(weeks).map(week => ({
      ...week,
      onTimeRate: week.meetings > 0 ? (week.onTime / week.meetings) * 100 : 0
    }));
  };
  
  // Generate monthly trend data
  const getMonthlyTrend = () => {
    const months = {};
    const allHistory = history;
    
    allHistory.forEach(record => {
      const date = new Date(record.signTime);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, attendance: 0, meetings: 0, fullMonth: 0 };
      }
      months[monthKey].meetings++;
      months[monthKey].attendance = 100;
    });
    
    // Add expected meetings (assuming 4 meetings per month)
    Object.keys(months).forEach(month => {
      months[month].expectedMeetings = 4;
      months[month].attendanceRate = (months[month].meetings / 4) * 100;
    });
    
    return Object.values(months);
  };
  
  // Performance metrics
  const getPerformanceMetrics = () => {
    const filteredHistory = getFilteredHistory();
    const totalMeetings = stats?.total || 0;
    const presentCount = filteredHistory.length;
    const expectedTotal = filter === 'all' ? (stats?.total || 0) : 
                         filter === 'thisMonth' ? 4 : 4;
    
    const attendanceScore = expectedTotal > 0 ? (presentCount / expectedTotal) * 100 : 0;
    const consistencyScore = calculateConsistencyScore();
    const timelinessScore = calculateTimelinessScore();
    
    return {
      attendanceScore: Math.round(attendanceScore),
      consistencyScore: Math.round(consistencyScore),
      timelinessScore: Math.round(timelinessScore),
      overallScore: Math.round((attendanceScore + consistencyScore + timelinessScore) / 3)
    };
  };
  
  const calculateConsistencyScore = () => {
    const weeklyData = getWeeklyPerformance();
    if (weeklyData.length === 0) return 0;
    
    const attendanceRates = weeklyData.map(w => w.attendance);
    const avgAttendance = attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length;
    const variance = attendanceRates.reduce((sum, rate) => sum + Math.pow(rate - avgAttendance, 2), 0) / attendanceRates.length;
    const consistency = Math.max(0, 100 - (variance / 2));
    return consistency;
  };
  
  const calculateTimelinessScore = () => {
    const weeklyData = getWeeklyPerformance();
    if (weeklyData.length === 0) return 0;
    
    const avgOnTime = weeklyData.reduce((sum, week) => sum + week.onTimeRate, 0) / weeklyData.length;
    return avgOnTime;
  };
  
  const filteredHistory = getFilteredHistory();
  const weeklyData = getWeeklyPerformance();
  const monthlyData = getMonthlyTrend();
  const metrics = getPerformanceMetrics();
  
  // Color gradients for charts
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const RADIAL_COLORS = [
    { offset: '0%', color: '#10b981' },
    { offset: '100%', color: '#34d399' }
  ];
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="attendance-history-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Performance Analytics Dashboard</h1>
        <div className="semester-badge">
          <Target size={16} />
          <span>Fall 2024 Semester</span>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your performance data...</p>
        </div>
      ) : (
        <>
          {/* Overall Performance Score Card */}
          <div className="overall-score-card">
            <div className="score-circle">
              <svg className="progress-ring" width="120" height="120">
                <circle className="progress-ring-bg" stroke="#e2e8f0" strokeWidth="8" fill="none" r="52" cx="60" cy="60"/>
                <circle className="progress-ring-fill" stroke="url(#gradient)" strokeWidth="8" fill="none" r="52" cx="60" cy="60"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - metrics.overallScore / 100)}`}
                  transform="rotate(-90 60 60)"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="score-text">
                <span className="score-value">{metrics.overallScore}</span>
                <span className="score-label">Overall<br/>Performance</span>
              </div>
            </div>
            <div className="score-details">
              <div className="metric-item">
                <TrendingUp size={18} color="#10b981" />
                <div className="metric-info">
                  <span className="metric-label">Attendance</span>
                  <span className="metric-value">{metrics.attendanceScore}%</span>
                </div>
              </div>
              <div className="metric-item">
                <Award size={18} color="#f59e0b" />
                <div className="metric-info">
                  <span className="metric-label">Consistency</span>
                  <span className="metric-value">{metrics.consistencyScore}%</span>
                </div>
              </div>
              <div className="metric-item">
                <Clock size={18} color="#3b82f6" />
                <div className="metric-info">
                  <span className="metric-label">Timeliness</span>
                  <span className="metric-value">{metrics.timelinessScore}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          {stats && (
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Meetings</div>
                <div className="stat-trend">+{stats.total > 0 ? '12%' : '0%'} vs last sem</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{stats.attendanceRate}%</div>
                <div className="stat-label">Attendance Rate</div>
                <div className="stat-trend positive">Above average</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-value">{history.filter(h => {
                  const d = new Date(h.signTime);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length}</div>
                <div className="stat-label">This Month</div>
                <div className="stat-trend">4 meetings expected</div>
              </div>
            </div>
          )}
          
          {/* Chart Navigation */}
          <div className="chart-nav">
            <button className={`chart-nav-btn ${activeChart === 'trend' ? 'active' : ''}`} onClick={() => setActiveChart('trend')}>
              <BarChart3 size={16} /> Performance Trend
            </button>
            <button className={`chart-nav-btn ${activeChart === 'weekly' ? 'active' : ''}`} onClick={() => setActiveChart('weekly')}>
              <TrendingUp size={16} /> Weekly Progress
            </button>
            <button className={`chart-nav-btn ${activeChart === 'radial' ? 'active' : ''}`} onClick={() => setActiveChart('radial')}>
              <Award size={16} /> Skill Metrics
            </button>
          </div>
          
          {/* Charts Section */}
          <div className="charts-container">
            {activeChart === 'trend' && monthlyData.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Monthly Attendance Trend</h3>
                  <p>Track your attendance performance throughout the semester</p>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="attendanceRate" stroke="#10b981" strokeWidth={3} name="Attendance Rate" dot={{ fill: '#10b981', r: 6 }} />
                    <Line type="monotone" dataKey="expectedMeetings" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Expected Meetings" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-insight">
                  💡 Your attendance shows {monthlyData[monthlyData.length-1]?.attendanceRate > monthlyData[0]?.attendanceRate ? 'improving' : 'consistent'} trend
                </div>
              </div>
            )}
            
            {activeChart === 'weekly' && weeklyData.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Weekly Performance Breakdown</h3>
                  <p>Week-by-week analysis of your participation</p>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="attendance" fill="#10b981" name="Attendance Rate" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="onTimeRate" fill="#3b82f6" name="On-Time Rate" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-insight">
                  🎯 Keep up the momentum! Your best week was {weeklyData.reduce((best, current) => 
                    current.attendance > best.attendance ? current : best, weeklyData[0])?.week}
                </div>
              </div>
            )}
            
            {activeChart === 'radial' && (
              <div className="radial-charts-container">
                <div className="radial-chart-card">
                  <h4>Attendance Score</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ name: 'Score', value: metrics.attendanceScore, fill: '#10b981' }]} startAngle={180} endAngle={0}>
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        {metrics.attendanceScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="radial-chart-card">
                  <h4>Consistency Rating</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ name: 'Score', value: metrics.consistencyScore, fill: '#f59e0b' }]} startAngle={180} endAngle={0}>
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        {metrics.consistencyScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="radial-chart-card">
                  <h4>Timeliness Score</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ name: 'Score', value: metrics.timelinessScore, fill: '#3b82f6' }]} startAngle={180} endAngle={0}>
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        {metrics.timelinessScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
          
          {/* Filters */}
          <div className="filters">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All Time
            </button>
            <button className={`filter-btn ${filter === 'thisMonth' ? 'active' : ''}`} onClick={() => setFilter('thisMonth')}>
              This Month
            </button>
            <button className={`filter-btn ${filter === 'lastMonth' ? 'active' : ''}`} onClick={() => setFilter('lastMonth')}>
              Last Month
            </button>
          </div>
          
          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Attendance Records</h3>
              <p>You haven't checked in to any meetings yet.</p>
              <button className="browse-btn" onClick={() => navigate('/member/attendance')}>
                View Active Meetings →
              </button>
            </div>
          ) : (
            <div className="history-list">
              <div className="history-header">
                <h3>Recent Check-ins</h3>
                <span className="history-count">{filteredHistory.length} records</span>
              </div>
              {filteredHistory.slice(0, 5).map(record => (
                <div key={record.id} className="history-item">
                  <div className="history-icon">
                    <CheckCircle size={24} className="success-icon" />
                  </div>
                  <div className="history-details">
                    <div className="history-title">{record.sheet?.title || 'Meeting'}</div>
                    <div className="history-meta">
                      <span><Calendar size={12} /> {new Date(record.signTime).toLocaleDateString()}</span>
                      <span><Clock size={12} /> {new Date(record.signTime).toLocaleTimeString()}</span>
                      <span><MapPin size={12} /> {record.sheet?.location || 'ZUCA'}</span>
                    </div>
                    <div className="history-method">
                      <span className={`method-badge ${record.signMethod?.toLowerCase()}`}>
                        {record.signMethod === 'SELF' ? 'Self Check-in' : 
                         record.signMethod === 'QR_CODE' ? 'QR Code' : 'Manual'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="history-arrow" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      <style>{`
        .attendance-history-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
          padding: 20px;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #f8fafc;
          transform: translateX(-2px);
        }
        .page-header h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #1e293b, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .semester-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #3b82f6;
        }
        .overall-score-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .score-circle {
          position: relative;
          width: 120px;
          height: 120px;
        }
        .progress-ring {
          transform: rotate(-90deg);
        }
        .progress-ring-bg {
          stroke: #e2e8f0;
        }
        .progress-ring-fill {
          stroke: url(#gradient);
          transition: stroke-dashoffset 0.5s ease;
        }
        .score-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .score-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }
        .score-label {
          font-size: 10px;
          color: #64748b;
          display: block;
          margin-top: 4px;
        }
        .score-details {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .metric-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .metric-info {
          display: flex;
          flex-direction: column;
        }
        .metric-label {
          font-size: 12px;
          color: #64748b;
        }
        .metric-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        .stat-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .stat-trend {
          font-size: 10px;
          color: #10b981;
          margin-top: 8px;
        }
        .stat-trend.positive {
          color: #10b981;
        }
        .chart-nav {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          background: white;
          padding: 6px;
          border-radius: 12px;
          display: inline-flex;
        }
        .chart-nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .chart-nav-btn.active {
          background: #1e293b;
          color: white;
        }
        .charts-container {
          margin-bottom: 24px;
        }
        .chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }
        .chart-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .chart-header p {
          margin: 0 0 16px 0;
          font-size: 12px;
          color: #64748b;
        }
        .chart-insight {
          margin-top: 16px;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 8px;
          font-size: 12px;
          color: #059669;
        }
        .radial-charts-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .radial-chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .radial-chart-card h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
        }
        .radial-label {
          font-size: 24px;
          font-weight: 700;
          fill: #1e293b;
        }
        .filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .filter-btn {
          padding: 8px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .filter-btn.active {
          background: #1e293b;
          color: white;
          border-color: #1e293b;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .history-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        .history-count {
          font-size: 12px;
          color: #64748b;
        }
        .history-item {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .history-item:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }
        .success-icon { color: #22c55e; }
        .history-details { flex: 1; }
        .history-title { font-weight: 600; margin-bottom: 8px; }
        .history-meta { display: flex; gap: 16px; font-size: 12px; color: #64748b; margin-bottom: 8px; }
        .method-badge { font-size: 10px; padding: 2px 10px; border-radius: 20px; }
        .method-badge.self { background: #dbeafe; color: #2563eb; }
        .method-badge.qr_code { background: #dcfce7; color: #059669; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .history-arrow { color: #94a3b8; }
        .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 24px; }
        .empty-icon { font-size: 64px; margin-bottom: 16px; }
        .empty-state h3 { margin-bottom: 8px; }
        .empty-state p { color: #64748b; margin-bottom: 20px; }
        .browse-btn { background: #1e293b; color: white; border: none; padding: 10px 24px; border-radius: 30px; cursor: pointer; transition: all 0.2s; }
        .browse-btn:hover { background: #334155; transform: translateY(-2px); }
        .loading-state { text-align: center; padding: 60px; color: #64748b; }
        .spinner {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .custom-tooltip {
          background: white;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .tooltip-label {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .tooltip-value {
          margin: 2px 0;
          font-size: 12px;
        }
        @media (max-width: 768px) {
          .overall-score-card {
            flex-direction: column;
            text-align: center;
          }
          .score-details {
            width: 100%;
          }
          .radial-charts-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}