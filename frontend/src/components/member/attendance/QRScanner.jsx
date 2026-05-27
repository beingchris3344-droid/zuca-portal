import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceId, getDeviceName } from '../../../utils/deviceId';

export default function QRScanner({ onClose, onSuccess }) {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef(null);
  const scannerInitialized = useRef(false);
  const isProcessing = useRef(false); // Prevents duplicate requests
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const onScanSuccess = async (decodedText, decodedResult) => {
    // CRITICAL: Lock must be set BEFORE any async operation
    if (isProcessing.current) {
      console.log('Already processing a scan, ignoring...');
      return;
    }
    
    // Set lock IMMEDIATELY (synchronously)
    isProcessing.current = true;
    
    // Stop scanning (async, but lock is already set)
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
        isProcessing.current = false;
        if (scannerRef.current) {
          await scannerRef.current.resume();
          setIsScanning(true);
        }
        return;
      }
      
      // Verify it's an attendance QR code
      if (qrData.type !== 'attendance_checkin') {
        setError('Not a valid attendance QR code');
        isProcessing.current = false;
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
        onClose(); // Modal closes, lock doesn't need reset
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
      
      isProcessing.current = false;
      
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
    console.error('Scan error:', err);
  };
  
  // Request camera permission once
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      }
      return false;
    }
  };
  
  // Stop scanner function
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  };
  
  useEffect(() => {
    let mounted = true;
    let retryTimeout = null;
    
    const initScanner = async () => {
      // Check if element exists
      const element = document.getElementById("qr-reader");
      if (!element) {
        console.error("qr-reader element not found");
        if (mounted) {
          setError("Scanner element not found. Please refresh the page.");
        }
        return;
      }
      
      const hasPermission = await requestCameraPermission();
      if (!hasPermission || !mounted) return;
      
      if (!scannerInitialized.current) {
        scannerInitialized.current = true;
        
        try {
          // Create scanner instance
          const scanner = new Html5Qrcode("qr-reader");
          
          // Start scanning with proper configuration
          await scanner.start(
            { facingMode: "environment" }, // Use back camera
            {
              fps: 10,
              qrbox: { width: 280, height: 280 },
              aspectRatio: 1.0,
              showTorchButtonIfSupported: true,
              showZoomSliderIfSupported: true,
              defaultZoomValueIfSupported: 2,
            },
            onScanSuccess,
            onScanError
          );
          
          if (mounted) {
            scannerRef.current = scanner;
            setIsScanning(true);
            setError(null);
          }
        } catch (err) {
          console.error("Failed to start scanner:", err);
          if (mounted) {
            if (err.name === 'NotAllowedError') {
              setPermissionDenied(true);
              setError("Camera access denied. Please allow camera access and refresh the page.");
            } else if (err.name === 'NotFoundError') {
              setError("No camera found on this device.");
            } else if (err.message && err.message.includes('Already started')) {
              // Try to stop and restart
              await stopScanner();
              scannerInitialized.current = false;
              retryTimeout = setTimeout(initScanner, 500);
            } else {
              setError(`Could not start camera: ${err.message || 'Unknown error'}`);
            }
            setPermissionDenied(true);
          }
        }
      }
    };
    
    // Small delay to ensure DOM is ready
    retryTimeout = setTimeout(initScanner, 100);
    
    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      stopScanner();
      scannerInitialized.current = false;
    };
  }, []); // Empty dependency array - only run on mount
  
  const handleRetry = async () => {
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    
    // Stop existing scanner
    await stopScanner();
    
    // Reset refs
    scannerInitialized.current = false;
    isProcessing.current = false;
    
    // Small delay before retry
    setTimeout(async () => {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;
      
      try {
        const element = document.getElementById("qr-reader");
        if (!element) {
          setError("Scanner element not found. Please refresh the page.");
          return;
        }
        
        const scanner = new Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
          },
          onScanSuccess,
          onScanError
        );
        
        scannerRef.current = scanner;
        setIsScanning(true);
        setError(null);
        setPermissionDenied(false);
      } catch (err) {
        console.error("Failed to restart scanner:", err);
        setError("Could not restart camera. Please refresh the page.");
        setPermissionDenied(true);
      }
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
              <button onClick={handleRetry}>Try Again</button>
              <button onClick={onClose} style={{ marginLeft: '10px', background: '#64748b' }}>Close</button>
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
              {!isScanning && (
                <div className="scanner-loading">
                  <div className="spinner"></div>
                  <p>Starting camera...</p>
                </div>
              )}
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
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .qr-scanner-container {
          background: white;
          border-radius: 32px;
          width: 90%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
          transform: rotate(90deg);
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
          position: relative;
        }
        
        #qr-reader {
          width: 100%;
          border: none !important;
          box-shadow: none !important;
        }
        
        #qr-reader video {
          width: 100%;
          height: auto;
          border-radius: 16px;
          object-fit: cover;
        }
        
        /* Hide default scanner UI elements */
        #qr-reader__dashboard_section_csr {
          display: none !important;
        }
        
        #qr-reader__dashboard_section_fsr {
          display: none !important;
        }
        
        #qr-reader__dashboard_section {
          display: none !important;
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
        
        .scanner-loading {
          text-align: center;
          padding: 40px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
        }
        
        .scanner-loading p {
          color: white;
          margin-top: 16px;
          font-size: 14px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Torch button styling */
        #qr-reader__torch_button {
          background: rgba(0,0,0,0.7) !important;
          color: white !important;
          border-radius: 50% !important;
          padding: 8px !important;
          margin: 8px !important;
        }
        
        /* Zoom slider styling */
        #qr-reader__zoom_slider {
          background: rgba(0,0,0,0.7) !important;
          padding: 8px !important;
          border-radius: 20px !important;
        }
      `}</style>
    </div>
  );
}