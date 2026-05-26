import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getDeviceId, getDeviceName } from '../../../utils/deviceId';

export default function QRScanner({ onClose, onSuccess }) {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef(null);
  const scannerInitialized = useRef(false);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const onScanSuccess = async (decodedText, decodedResult) => {
    // Stop scanning immediately to prevent multiple scans
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.pause();
        setIsScanning(false);
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
    
    try {
      // Parse the QR data
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch (e) {
        setError('Invalid QR code format');
        // Resume scanning after error
        if (scannerRef.current) {
          await scannerRef.current.resume();
          setIsScanning(true);
        }
        return;
      }
      
      // Verify it's an attendance QR code
      if (qrData.type !== 'attendance_checkin') {
        setError('Not a valid attendance QR code');
        if (scannerRef.current) {
          await scannerRef.current.resume();
          setIsScanning(true);
        }
        return;
      }
      
      // Send check-in request with device ID
      const response = await axios.post(`${BASE_URL}/api/attendance/qr-checkin`, {
        token: qrData.token,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
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
      } else if (errorMsg?.error === 'DEVICE_ALREADY_USED') {
        setError('This device has already been used to check someone into this meeting');
      } else {
        setError(errorMsg?.error || 'Check-in failed');
      }
      
      // Resume scanning after error
      if (scannerRef.current) {
        try {
          await scannerRef.current.resume();
          setIsScanning(true);
        } catch (err) {
          console.error('Error resuming scanner:', err);
        }
      }
    }
  };
  
  const onScanError = (err) => {
    // Don't show every scan error to user
    console.error('Scan error:', err);
  };
  
  // Request camera permission once
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop all tracks immediately - we just need permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      }
      return false;
    }
  };
  
  useEffect(() => {
    let mounted = true;
    
    const initScanner = async () => {
      // Request permission first
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }
      
      if (!mounted) return;
      
      // Initialize scanner only once
      if (!scannerInitialized.current) {
        scannerInitialized.current = true;
        
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
          },
          false
        );
        
        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
        setIsScanning(true);
      }
    };
    
    initScanner();
    
    return () => {
      mounted = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.error('Error clearing scanner:', err);
        }
        scannerRef.current = null;
      }
    };
  }, []);
  
  const handleRetry = () => {
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    scannerInitialized.current = false;
    
    // Reinitialize scanner
    setTimeout(() => {
      const initScanner = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;
        
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
          },
          false
        );
        
        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
        setIsScanning(true);
      };
      initScanner();
    }, 500);
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
          {permissionDenied ? (
            <div className="qr-scanner-error">
              <div className="error-icon">📷</div>
              <h4>Camera Access Denied</h4>
              <p>Please allow camera access to scan QR codes.</p>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          ) : error ? (
            <div className="qr-scanner-error">
              <div className="error-icon">⚠️</div>
              <h4>Scan Failed</h4>
              <p>{error}</p>
              <button onClick={handleRetry}>Try Again</button>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="scanner-view"></div>
              <p className="scanner-instruction">
                📱 Point your camera at the QR code
              </p>
              <p className="scanner-hint">
                Make sure the QR code is well lit and centered
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
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .qr-scanner-container {
          background: white;
          border-radius: 32px;
          width: 90%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .qr-scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        
        .qr-scanner-header h3 {
          margin: 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .qr-scanner-close {
          background: rgba(255,255,255,0.1);
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .qr-scanner-close:hover {
          background: rgba(255,255,255,0.2);
        }
        
        .qr-scanner-body {
          padding: 24px;
        }
        
        .scanner-view {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          min-height: 300px;
        }
        
        .scanner-instruction {
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          margin-top: 20px;
          margin-bottom: 4px;
        }
        
        .scanner-hint {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        
        .qr-scanner-error {
          text-align: center;
          padding: 40px 24px;
        }
        
        .error-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }
        
        .qr-scanner-error h4 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #1e293b;
        }
        
        .qr-scanner-error p {
          margin-bottom: 24px;
          color: #64748b;
          font-size: 14px;
        }
        
        .qr-scanner-error button {
          padding: 10px 28px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
          border: none;
          border-radius: 40px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .qr-scanner-error button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* Hide the default scanner UI elements we don't want */
        #qr-reader__dashboard_section_csr {
          display: none !important;
        }
        
        #qr-reader__dashboard_section_fsr {
          display: none !important;
        }
        
        /* Style the scanner region */
        #qr-reader {
          border: none !important;
          box-shadow: none !important;
        }
        
        #qr-reader video {
          border-radius: 16px;
        }
        
        /* Loading state while scanning */
        .scanner-loading {
          text-align: center;
          padding: 40px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}