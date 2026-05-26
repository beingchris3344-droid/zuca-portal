import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

export default function AttendanceHistoryList() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, thisMonth, lastMonth
  
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
  
  const filteredHistory = getFilteredHistory();
  
  if (loading) {
    return <div className="history-loading">Loading attendance history...</div>;
  }
  
  return (
    <div className="attendance-history">
      {/* Stats Summary */}
      {stats && (
        <div className="history-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.attendanceRate}%</div>
            <div className="stat-label">Attendance Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{history.filter(h => {
              const d = new Date(h.signTime);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}</div>
            <div className="stat-label">This Month</div>
          </div>
        </div>
      )}
      
      {/* Filter Tabs */}
      <div className="history-filters">
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
        <div className="empty-history">
          <div className="empty-icon">📋</div>
          <p>No attendance records found</p>
          <span>Check in to meetings to see your history</span>
        </div>
      ) : (
        <div className="history-list">
          {filteredHistory.map(record => (
            <div key={record.id} className="history-item">
              <div className="history-icon">
                <CheckCircle size={20} className="success-icon" />
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
                     record.signMethod === 'WIFI_AUTO' ? 'Wi-Fi Auto' : 'Manual'}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="history-arrow" />
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .attendance-history { padding: 0 0 20px 0; }
        .history-stats { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat-card { flex: 1; background: #f8fafc; border-radius: 12px; padding: 12px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; }
        .history-filters { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .filter-btn { background: none; border: none; padding: 6px 16px; font-size: 13px; cursor: pointer; border-radius: 20px; }
        .filter-btn.active { background: #1e293b; color: white; }
        .history-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
        .history-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 12px; cursor: pointer; }
        .history-item:hover { background: #f1f5f9; }
        .history-icon .success-icon { color: #22c55e; }
        .history-details { flex: 1; }
        .history-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
        .history-meta { display: flex; gap: 12px; font-size: 11px; color: #64748b; margin-bottom: 6px; }
        .method-badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; }
        .method-badge.self { background: #dbeafe; color: #2563eb; }
        .method-badge.wifi_auto { background: #dcfce7; color: #16a34a; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .history-arrow { color: #94a3b8; }
        .empty-history { text-align: center; padding: 40px; background: #f8fafc; border-radius: 16px; }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-history p { font-weight: 500; margin-bottom: 4px; }
        .empty-history span { font-size: 12px; color: #94a3b8; }
        .history-loading { text-align: center; padding: 40px; color: #64748b; }
      `}</style>
    </div>
  );
}