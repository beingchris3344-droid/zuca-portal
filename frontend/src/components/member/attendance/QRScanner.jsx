import React, { useState } from 'react';
import { X, Camera, QrCode } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';

export default function QRScanner({ onClose, onSuccess }) {
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const handleScan = async (data) => {
    if (!data) return;
    
    setScanning(false);
    
    try {
      // Parse the QR data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        setError('Invalid QR code format');
        return;
      }
      
      // Verify it's an attendance QR code
      if (qrData.type !== 'attendance_checkin') {
        setError('Not a valid attendance QR code');
        return;
      }
      
      // Send check-in request
      const response = await axios.post(`${BASE_URL}/api/attendance/qr-checkin`, {
        token: qrData.token
      }, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        onSuccess && onSuccess(response.data.entry);
        onClose();
      }
    } catch (error) {
      const errorMsg = error.response?.data;
      if (errorMsg?.error === 'Invalid or expired QR code') {
        setError('QR code is invalid or has expired');
      } else if (errorMsg?.error === 'Already checked in') {
        setError('You have already checked in for this meeting');
      } else {
        setError(errorMsg?.error || 'Check-in failed');
      }
      setScanning(true);
    }
  };
  
  const handleError = (err) => {
    console.error('Camera error:', err);
    setError('Unable to access camera. Please allow camera permissions.');
  };
  
  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-container" onClick={e => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <h3>
            <Camera size={20} /> Scan QR Code
          </h3>
          <button className="qr-scanner-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="qr-scanner-body">
          {error ? (
            <div className="qr-scanner-error">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button onClick={() => { setError(null); setScanning(true); }}>Try Again</button>
            </div>
          ) : (
            <>
              <div className="scanner-view">
                {scanning && (
                  <div className="scanner-placeholder">
                    <QrCode size={48} />
                    <p>Position QR code in frame</p>
                    <div className="scanner-line"></div>
                  </div>
                )}
              </div>
              <p className="scanner-instruction">
                Point your camera at the QR code displayed on screen
              </p>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        .qr-scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .qr-scanner-container {
          background: white;
          border-radius: 24px;
          width: 90%;
          max-width: 400px;
          overflow: hidden;
        }
        
        .qr-scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .qr-scanner-header h3 {
          margin: 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .qr-scanner-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .qr-scanner-body {
          padding: 24px;
        }
        
        .scanner-view {
          background: #1a1a1a;
          border-radius: 16px;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        
        .scanner-placeholder {
          text-align: center;
          color: white;
        }
        
        .scanner-placeholder p {
          margin-top: 16px;
          font-size: 14px;
        }
        
        .scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #22c55e;
          animation: scan 2s linear infinite;
        }
        
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        
        .scanner-instruction {
          text-align: center;
          font-size: 13px;
          color: #666;
          margin-top: 16px;
        }
        
        .qr-scanner-error {
          text-align: center;
          padding: 20px;
        }
        
        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .qr-scanner-error p {
          margin-bottom: 20px;
          color: #ef4444;
        }
        
        .qr-scanner-error button {
          padding: 8px 24px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}