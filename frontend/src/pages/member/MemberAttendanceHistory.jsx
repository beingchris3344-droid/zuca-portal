import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, ChevronRight } from 'lucide-react';

export default function MemberAttendanceHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
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
  
  return (
    <div className="attendance-history-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>My Attendance History</h1>
        <div></div>
      </div>
      
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="stats-cards">
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
              {filteredHistory.map(record => (
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
        }
        .page-header h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
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
          text-align: center;
          border: 1px solid #e2e8f0;
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
        .history-item {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .history-item:hover {
          background: #f8fafc;
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
        .browse-btn { background: #1e293b; color: white; border: none; padding: 10px 24px; border-radius: 30px; cursor: pointer; }
        .loading-state { text-align: center; padding: 60px; color: #64748b; }
      `}</style>
    </div>
  );
}