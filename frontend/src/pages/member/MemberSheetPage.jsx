import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import {
  Calendar, MapPin, Clock, Users, CheckCircle,
  ArrowLeft, RefreshCw, ChevronRight, QrCode, Lock,
  FileText, XCircle, AlertCircle, Zap
} from 'lucide-react';
import { FaFileAlt } from 'react-icons/fa';
import { getDeviceId, getDeviceName } from '../../utils/deviceId';
import CategoryPickerModal from './CategoryPickerModal';
import QRScanner from '../../components/member/attendance/QRScanner';
export default function MemberSheetPage() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
 const [showScanner, setShowScanner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showPicker, setShowPicker] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchSheet = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await axios.get(`${BASE_URL}/api/attendance/sheet/${sheetId}`, {
        headers: getHeaders()
      });

      const data = res.data?.sheet;
      if (!data) {
        setError('Meeting not found.');
        return;
      }

      setSheet(data);

      const me = JSON.parse(localStorage.getItem('user') || '{}');
      const myEntry = (data.entries || []).find(e => e.userId === me.id);
      setUserEntry(myEntry || null);

    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message;
      if (status === 403) setError('You do not have access to this meeting.');
      else if (status === 404) setError('This meeting was not found.');
      else setError(msg || 'Failed to load meeting.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (sheetId) fetchSheet();
  }, [sheetId]);

  const handleCheckin = async (categoryValue = null) => {
    setCheckingIn(true);
    try {
      const payload = {
        sheetId,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      };
      if (categoryValue) payload.categoryValue = categoryValue;

      await axios.post(`${BASE_URL}/api/attendance/self-checkin`, payload, {
        headers: getHeaders()
      });

      showToast('✅ Checked in successfully!', 'success');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      await fetchSheet(true);

    } catch (err) {
      const data = err.response?.data || {};
      const code = data.error;

      if (code === 'ALREADY_CHECKED_IN') {
        showToast('You are already checked in.', 'info');
        await fetchSheet(true);
      } else if (code === 'DEVICE_ALREADY_USED') {
        showToast('This device has already been used to check in.', 'error');
      } else {
        showToast(data.message || data.error || 'Check-in failed.', 'error');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const onCheckinButtonClick = () => {
    if (!sheet) return;

    const isRequiredCategory =
      sheet.categoryName &&
      Array.isArray(sheet.categoryOptions) &&
      sheet.categoryOptions.length > 0 &&
      sheet.categoryRequired === true;

    if (isRequiredCategory) {
      setShowPicker(true);
      return;
    }

    handleCheckin();
  };

  const handlePickerSelect = (value) => {
    setShowPicker(false);
    handleCheckin(value);
  };

  // ============== LOADING ==============
  if (loading) {
    return (
      <div className="member-sheet-page">
        <div className="hero-header">
          <div className="hero-bg-pattern"></div>
          <div className="skeleton-header">
            <div className="skeleton-back"></div>
          </div>
          <div className="hero-content">
            <div className="skeleton-greeting"></div>
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
          </div>
        </div>
        <div className="meetings-list">
          <div className="meeting-card-premium skeleton-card">
            <div className="skeleton-badge"></div>
            <div className="skeleton-title-line"></div>
            <div className="skeleton-detail"></div>
            <div className="skeleton-detail"></div>
            <div className="skeleton-btn"></div>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  // ============== ERROR ==============
  if (error) {
    return (
      <div className="member-sheet-page">
        <div className="hero-header">
          <div className="hero-bg-pattern"></div>
          <button className="back-btn-hero" onClick={() => navigate('/member/attendance')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="hero-content">
            <h1 className="hero-title">Meeting</h1>
          </div>
        </div>

        <div className="empty-state-premium">
          <div className="empty-state-icon"><XCircle size={64} color="#ef4444" /></div>
          <h3>Unable to Open</h3>
          <p>{error}</p>
          <button className="history-btn-premium" onClick={() => navigate('/member/attendance')}>
            <ArrowLeft size={16} /> Back to meetings
          </button>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  const totalMembers = sheet.totalMembers || 0;
  const presentCount = sheet.entries?.length || 0;
  const attendanceRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;

  const hasCategory = !!(
    sheet.categoryName &&
    Array.isArray(sheet.categoryOptions) &&
    sheet.categoryOptions.length > 0
  );
  const isCategoryRequired = hasCategory && sheet.categoryRequired === true;

  const showFullDescription = expandedDescription || (sheet.description || '').length <= 150;

  return (
    <div className="member-sheet-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>{toast.message}</div>
      )}

      {/* Hero Header */}
      <div className="hero-header">
        <div className="hero-bg-pattern"></div>
        <button className="back-btn-hero" onClick={() => navigate('/member/attendance')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="hero-content">
          <div className="hero-greeting">
            <span className="greeting-emoji">✝</span>
            <span className="greeting-text">{sheet.isActive ? 'Live meeting' : 'Closed meeting'}</span>
          </div>
          <h1 className="hero-title">{sheet.title}</h1>
          <p className="hero-subtitle">
            {new Date(sheet.eventDate).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric'
            })} • {sheet.eventTime || '4:30 PM'}
          </p>
        </div>
        <button className="refresh-btn-hero" onClick={() => fetchSheet(true)} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {/* Main card */}
      <div className="meetings-list">
        <div className="meeting-card-premium">
          <div className="card-glow"></div>

          <div className="card-header-premium">
            <div className="badge-group">
              {sheet.isActive ? (
                <span className="live-badge-premium">
                  <Zap size={12} /> LIVE NOW
                </span>
              ) : (
                <span className="closed-badge-premium">
                  <Lock size={12} /> CLOSED
                </span>
              )}
              {isCategoryRequired && (
                <span className="qr-badge-premium">
                  🎼 {sheet.categoryName}
                </span>
              )}
            </div>
            <div className="time-badge">
              <Clock size={14} />
              <span>{sheet.eventTime || '4:30 PM'}</span>
            </div>
          </div>

          {/* Description */}
          {sheet.description && (
            <div className="meeting-description-premium">
              <div className="description-icon">
                <FileText size={16} />
              </div>
              <div className="description-content">
                <p className={`description-text-premium ${!showFullDescription ? 'truncated' : ''}`}>
                  {showFullDescription
                    ? sheet.description
                    : sheet.description.substring(0, 150) + '...'}
                </p>
                {sheet.description.length > 150 && (
                  <button
                    className="description-expand-btn"
                    onClick={() => setExpandedDescription(!expandedDescription)}
                  >
                    {expandedDescription ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="details-grid-premium">
            <div className="detail-card-premium">
              <Calendar size={18} />
              <div>
                <span className="detail-label">Date</span>
                <span className="detail-value">
                  {new Date(sheet.eventDate).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="detail-card-premium">
              <MapPin size={18} />
              <div>
                <span className="detail-label">Location</span>
                <span className="detail-value">{sheet.location || 'ZUCA'}</span>
              </div>
            </div>
            <div className="detail-card-premium">
              <Users size={18} />
              <div>
                <span className="detail-label">Attendance</span>
                <span className="detail-value">{presentCount} of {totalMembers} checked in</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          {totalMembers > 0 && (
            <div className="progress-section">
              <div className="progress-header">
                <span>Check-in Progress</span>
                <span className="progress-percent">{attendanceRate}%</span>
              </div>
              <div className="progress-bar-premium">
                <div className="progress-fill-premium" style={{ width: `${attendanceRate}%` }}></div>
              </div>
            </div>
          )}

          {/* Category notice — ONLY when required */}
          {isCategoryRequired && !userEntry && (
            <div className="category-notice">
              <AlertCircle size={16} color="#0a0a0a" />
              <span>
                You'll be asked to pick your <strong>{sheet.categoryName}</strong> when you check in.
              </span>
            </div>
          )}

          {/* If already checked in */}
          {userEntry && (
            <div className="already-checked-in">
              <CheckCircle size={22} color="#16a34a" />
              <div>
                <div className="checked-title">You're checked in</div>
                <div className="checked-meta">
                  at {new Date(userEntry.signTime).toLocaleTimeString()} via {userEntry.signMethod}
                  {userEntry.categoryValue && (
                    <> • <strong>{userEntry.categoryValue}</strong></>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="action-buttons-group">
            {!userEntry && (
              <button
                className="checkin-btn-premium"
                onClick={onCheckinButtonClick}
                disabled={checkingIn || !sheet.isActive}
                style={{ flex: 1 }}
              >
                {checkingIn ? (
                  <>
                    <div className="btn-spinner"></div>
                    Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {isCategoryRequired
                      ? `Check in (${sheet.categoryName})`
                      : 'Self Check-in'}
                    <ChevronRight size={18} className="btn-arrow" />
                  </>
                )}
              </button>
            )}

            {sheet.isActive && (
             <button
  className="checkin-btn-qr"
  onClick={() => setShowScanner(true)}
>
  <QrCode size={18} />
  Scan QR
</button>
            )}
          </div>
        </div>
      </div>

      {/* Category picker (opens only when required) */}
      {showPicker && isCategoryRequired && (
        <CategoryPickerModal
          categoryName={sheet.categoryName}
          options={sheet.categoryOptions}
          required={true}
          onSelect={handlePickerSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

    {showScanner && (
  <QRScanner
    onClose={() => setShowScanner(false)}
    onScanned={(payload) => {
      setShowScanner(false);
      handleCheckin(payload?.categoryValue || null);
    }}
  />
)}

      <style>{pageStyles}</style>
    </div>
  );
}

// ============== STYLES ==============
const pageStyles = `
.member-sheet-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
  margin-bottom: 70px;
  padding: 0;
}

.hero-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 20px 0 60px;
  position: relative;
  overflow: hidden;
}
.hero-bg-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 50%);
  pointer-events: none;
}
.back-btn-hero {
  position: absolute;
  top: 20px;
  left: 24px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  padding: 8px 16px;
  border-radius: 40px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  transition: all 0.2s;
}
.back-btn-hero:hover {
  background: rgba(255,255,255,0.2);
  transform: translateX(-4px);
}
.refresh-btn-hero {
  position: absolute;
  top: 20px;
  right: 24px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  width: 40px;
  height: 40px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn-hero:hover {
  background: rgba(255,255,255,0.2);
  transform: rotate(90deg);
}
.refresh-btn-hero:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hero-content {
  text-align: center;
  padding: 40px 24px 0;
}
.hero-greeting {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  padding: 6px 16px;
  border-radius: 40px;
  margin-bottom: 14px;
}
.greeting-text {
  font-size: 12px;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}
.greeting-emoji { font-size: 14px; }

.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 10px 0;
  letter-spacing: -0.5px;
}
.hero-subtitle {
  font-size: 14px;
  color: #94a3b8;
  max-width: 500px;
  margin: 0 auto;
}

.meetings-list {
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: -40px auto 0;
  position: relative;
  z-index: 2;
}

.meeting-card-premium {
  background: white;
  border-radius: 28px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.12);
  animation: fadeInUp 0.5s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-glow {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, #dc2626, #f97316, #dc2626);
  background-size: 200% 100%;
  animation: shimmerGlow 2s infinite;
}
@keyframes shimmerGlow {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.card-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.badge-group { display: flex; gap: 8px; flex-wrap: wrap; }

.live-badge-premium,
.closed-badge-premium,
.qr-badge-premium {
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.5px;
}
.live-badge-premium {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
}
.closed-badge-premium {
  background: #64748b;
  color: white;
}
.qr-badge-premium {
  background: #f3f0ff;
  color: #7c3aed;
}
.time-badge {
  background: #f8fafc;
  padding: 5px 12px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meeting-description-premium {
  display: flex;
  gap: 12px;
  margin: 0 0 20px 0;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border-left: 4px solid #3b82f6;
}
.description-icon {
  flex-shrink: 0;
  width: 32px; height: 32px;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  margin-top: 2px;
}
.description-content { flex: 1; min-width: 0; }
.description-text-premium {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #334155;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.description-text-premium.truncated {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.description-expand-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
}

.details-grid-premium {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.detail-card-premium {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 16px;
  transition: all 0.2s;
}
.detail-card-premium:hover {
  background: #f1f5f9;
  transform: translateX(4px);
}
.detail-card-premium div { display: flex; flex-direction: column; }
.detail-label {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.detail-value {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.progress-section { margin-bottom: 20px; }
.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}
.progress-percent { font-weight: 700; color: #3b82f6; }
.progress-bar-premium {
  height: 8px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.progress-fill-premium {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 10px;
  transition: width 0.5s ease;
}

.category-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f3f0ff;
  border: 1px solid #e9d5ff;
  border-radius: 14px;
  font-size: 13px;
  color: #5b21b6;
  margin-bottom: 16px;
}

.already-checked-in {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  margin-bottom: 16px;
}
.checked-title { font-weight: 600; color: #166534; font-size: 14px; }
.checked-meta { font-size: 12px; color: #64748b; margin-top: 2px; }

.action-buttons-group {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.checkin-btn-premium {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: inherit;
}
.checkin-btn-premium:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(15, 23, 42, 0.3);
}
.checkin-btn-premium:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.btn-arrow { transition: transform 0.2s ease; }
.checkin-btn-premium:hover:not(:disabled) .btn-arrow { transform: translateX(4px); }
.btn-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.checkin-btn-qr {
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 16px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: inherit;
}
.checkin-btn-qr:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin { animation: spin 1s linear infinite; }

.empty-state-premium {
  text-align: center;
  padding: 60px 24px;
  margin: 40px 24px;
  background: white;
  border-radius: 32px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.empty-state-icon { margin-bottom: 20px; }
.empty-state-premium h3 {
  font-size: 22px;
  margin-bottom: 8px;
  color: #1e293b;
}
.empty-state-premium p {
  color: #64748b;
  margin-bottom: 24px;
}
.history-btn-premium {
  background: #f1f5f9;
  border: none;
  padding: 12px 24px;
  border-radius: 40px;
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: inherit;
}
.history-btn-premium:hover {
  background: #e2e8f0;
  gap: 12px;
}

.toast-notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 24px;
  border-radius: 16px;
  background: #1e293b;
  color: white;
  font-size: 14px;
  z-index: 1000;
  animation: slideUp 0.3s ease;
  max-width: 350px;
  width: 90%;
  text-align: center;
  white-space: pre-line;
  line-height: 1.5;
}
.toast-notification.error { background: #ef4444; }
.toast-notification.success { background: #22c55e; }
.toast-notification.info { background: #1d4ed8; }

@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.skeleton-card {
  min-height: 280px;
}
.skeleton-badge {
  width: 100px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 30px;
  margin-bottom: 16px;
  animation: pulse 1.5s infinite;
}
.skeleton-title-line {
  width: 200px;
  height: 28px;
  background: #e2e8f0;
  border-radius: 8px;
  margin-bottom: 20px;
  animation: pulse 1.5s infinite;
}
.skeleton-detail {
  height: 60px;
  background: #f1f5f9;
  border-radius: 16px;
  margin-bottom: 12px;
  animation: pulse 1.5s infinite;
}
.skeleton-btn {
  height: 52px;
  background: #e2e8f0;
  border-radius: 20px;
  animation: pulse 1.5s infinite;
}
.skeleton-header {
  padding: 20px 0 0;
}
.skeleton-back {
  width: 80px;
  height: 36px;
  background: #334155;
  border-radius: 40px;
  margin-left: 24px;
}
.skeleton-greeting {
  width: 140px;
  height: 28px;
  background: #334155;
  border-radius: 40px;
  margin: 0 auto 16px;
}
.skeleton-title {
  width: 240px;
  height: 40px;
  background: #334155;
  border-radius: 8px;
  margin: 0 auto 12px;
}
.skeleton-subtitle {
  width: 280px;
  height: 18px;
  background: #334155;
  border-radius: 4px;
  margin: 0 auto;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (max-width: 640px) {
  .hero-title { font-size: 24px; }
  .meetings-list { padding: 0 16px; }
  .meeting-card-premium { padding: 20px; border-radius: 24px; }
  .details-grid-premium { grid-template-columns: 1fr; }
  .action-buttons-group { flex-direction: column; }
  .checkin-btn-qr { justify-content: center; }
}
`;