import React, { useState, useRef, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onClose, onSuccess }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const onScanSuccess = async (decodedText, decodedResult) => {
    try {
      // Parse the QR data
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
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
    }
  };
  
  const onScanError = (err) => {
    console.error('Scan error:', err);
  };
  
  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );
    
    scanner.render(onScanSuccess, onScanError);
    scannerRef.current = scanner;
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);
  
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
              <button onClick={() => { setError(null); }}>Try Again</button>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="scanner-view"></div>
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
          max-width: 500px;
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
          padding: 20px;
        }
        
        .scanner-view {
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
        }
        
        .scanner-instruction {
          text-align: center;
          font-size: 13px;
          color: #666;
          margin-top: 16px;
        }
        
        .qr-scanner-error {
          text-align: center;
          padding: 40px 20px;
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