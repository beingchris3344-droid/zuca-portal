import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, AlertCircle, CheckCircle, WifiOff, Zap } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceId, getDeviceName } from '../../../utils/deviceId';
import { saveOfflineCheckin, getPendingCount } from '../../../utils/offlineStorage';

export default function QRScanner({ onClose, onSuccess, sheetId: propSheetId }) {
  // State management
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [scanCount, setScanCount] = useState(0);
  
  // Refs for performance
  const scannerRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessing = useRef(false);
  const lastScanTime = useRef(0);
  const animationFrameRef = useRef(null);
  const successTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  
  // Headers for API calls
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show success animation
  const showSuccessAnimation = (message, isOfflineMode = false) => {
    setSuccessMessage(isOfflineMode ? '📱 Saved Offline! Will sync automatically' : message);
    setShowSuccess(true);
    
    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate(200);
    
    // Auto close after success
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  // Optimized scan success handler
  const onScanSuccess = useCallback(async (decodedText, decodedResult) => {
    // Throttle scans - prevent duplicates within 500ms
    const now = Date.now();
    if (isProcessing.current || (now - lastScanTime.current) < 500) {
      return;
    }
    
    lastScanTime.current = now;
    isProcessing.current = true;
    
    // Quick validation - check format without full parse
    if (!decodedText.includes('"type":"attendance_checkin"')) {
      isProcessing.current = false;
      return;
    }
    
    // Pause scanner immediately to prevent multiple scans
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.pause();
        setIsScanning(false);
      } catch (err) {
        console.debug('Pause error:', err);
      }
    }
    
    try {
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch (e) {
        setError('Invalid QR code format');
        await resumeScanner();
        isProcessing.current = false;
        return;
      }
      
      // Validate QR type
      if (qrData.type !== 'attendance_checkin') {
        setError('Not a valid attendance QR code');
        await resumeScanner();
        isProcessing.current = false;
        return;
      }
      
      const scannedSheetId = qrData.sheetId;
      
      // Handle offline mode
      if (isOffline) {
        const saved = await saveOfflineCheckin(scannedSheetId, getDeviceId(), 'QR Scan (Offline)');
        if (saved) {
          const newCount = await getPendingCount();
          console.log('📱 Offline QR saved! Pending:', newCount);
          setScanCount(prev => prev + 1);
          showSuccessAnimation('✓ Check-in Saved Offline', true);
          onSuccess && onSuccess({ offline: true, message: 'QR check-in saved offline' });
        } else {
          setError('Failed to save offline check-in');
          await resumeScanner();
        }
        isProcessing.current = false;
        return;
      }
      
      // Online check-in
      const response = await axios.post(`${BASE_URL}/api/attendance/qr-checkin`, {
        token: qrData.token,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      }, {
        headers: getHeaders(),
        timeout: 5000 // 5 second timeout for faster failure
      });
      
      if (response.data.success) {
        setScanCount(prev => prev + 1);
        showSuccessAnimation('✓ Check-in Successful!');
        onSuccess && onSuccess(response.data.entry);
      }
      
    } catch (error) {
      const errorMsg = error.response?.data;
      
      // Handle network errors with offline fallback
      if (error.message === 'Network Error' || !navigator.onLine) {
        try {
          const qrData = JSON.parse(decodedText);
          const saved = await saveOfflineCheckin(qrData.sheetId, getDeviceId(), 'QR Scan (Offline Fallback)');
          if (saved) {
            setError('📱 Internet lost. Saved offline for sync.');
            setTimeout(() => {
              showSuccessAnimation('✓ Saved Offline - Will sync', true);
              onSuccess && onSuccess({ offline: true });
            }, 1000);
            return;
          }
        } catch (e) {
          // Fall through
        }
        setError('No internet connection. Please check your network.');
      } else if (errorMsg?.error === 'Invalid or expired QR code') {
        setError('QR code is invalid or has expired');
      } else if (errorMsg?.error === 'Already checked in') {
        setError('You have already checked in for this meeting');
      } else if (errorMsg?.error === 'DEVICE_ALREADY_USED') {
        setError('This device has already been used for check-in');
      } else {
        setError(errorMsg?.error || 'Check-in failed');
      }
      
      // Resume scanner after error
      await resumeScanner();
      isProcessing.current = false;
    }
  }, [isScanning, isOffline, onSuccess]);

  // Resume scanner function
  const resumeScanner = async () => {
    if (scannerRef.current && !isScanning) {
      try {
        await scannerRef.current.resume();
        setIsScanning(true);
      } catch (err) {
        console.debug('Resume error:', err);
      }
    }
  };

  // Silent error handler - only log critical errors
  const onScanError = useCallback((err) => {
    // Ignore common scanning errors for performance
    if (err && err.message && 
        !err.message.includes('No MultiFormat Readers') &&
        !err.message.includes('NotFoundException') &&
        !err.message.includes('getVideoFrame') &&
        !err.message.includes('video element')) {
      console.debug('Scan debug:', err);
    }
  }, []);

  // Stop camera tracks
  const stopCameraTracks = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          if (track && track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (err) {
        console.debug('Stop tracks error:', err);
      }
      streamRef.current = null;
    }
  };

  // Stop scanner completely
  const stopScanner = async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.debug('Stop scanner error:', err);
      }
      scannerRef.current = null;
    }
    stopCameraTracks();
  };

  // Request camera with optimized settings
  const requestCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access');
      setPermissionDenied(true);
      return false;
    }
    
    try {
      stopCameraTracks();
      
      // Request with optimal settings for speed
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { exact: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } 
      }).catch(async (err) => {
        if (err.name === 'OverconstrainedError') {
          return await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
        }
        throw err;
      });
      
      streamRef.current = stream;
      // Don't stop tracks - keep for scanner
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera access denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
      return false;
    }
  };

  // Initialize scanner with optimizations
  const initializeScanner = async () => {
    const element = document.getElementById("qr-reader");
    if (!element) {
      setError("Scanner element not found");
      return false;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access');
      setPermissionDenied(true);
      return false;
    }
    
    setIsInitializing(true);
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setIsInitializing(false);
      return false;
    }
    
    try {
      const scanner = new Html5Qrcode("qr-reader", {
        verbose: false,
        formatsToSupport: [Html5Qrcode.SupportedFormats.QR_CODE]
      });
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          disableFlip: false,
          showTorchButtonIfSupported: true,
          defaultZoomValueIfSupported: 2,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        onScanSuccess,
        onScanError
      );
      
      scannerRef.current = scanner;
      setIsScanning(true);
      setError(null);
      setPermissionDenied(false);
      setIsInitializing(false);
      return true;
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setIsInitializing(false);
      
      // Try front camera as fallback
      try {
        const scanner = new Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "user" },
          {
            fps: 30,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanError
        );
        
        scannerRef.current = scanner;
        setIsScanning(true);
        setError(null);
        setIsInitializing(false);
        return true;
      } catch (fallbackErr) {
        setError(`Could not start camera: ${err.message || 'Unknown error'}`);
        setPermissionDenied(true);
        return false;
      }
    }
  };

  // Retry handler
  const handleRetry = async () => {
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    setIsInitializing(false);
    setShowSuccess(false);
    
    await stopScanner();
    
    const readerElement = document.getElementById("qr-reader");
    if (readerElement) {
      readerElement.innerHTML = '';
    }
    
    setTimeout(() => {
      initializeScanner();
    }, 300);
  };

  // Initialize on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        await initializeScanner();
      }
    };
    
    if (!window.isSecureContext) {
      setError('Camera requires HTTPS connection');
      setPermissionDenied(true);
      return;
    }
    
    init();
    
    return () => {
      mounted = false;
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      stopScanner();
    };
  }, []);

  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-container" ref={containerRef} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-scanner-header">
          <h3>
            <Camera size={20} /> 
            Scan QR Code
            {scanCount > 0 && <span className="scan-badge">{scanCount}</span>}
          </h3>
          <div className="header-status">
            {isOffline && (
              <span className="offline-badge">
                <WifiOff size={12} /> OFFLINE
              </span>
            )}
            {isScanning && !isOffline && (
              <span className="live-badge">
                <Zap size={12} /> LIVE
              </span>
            )}
          </div>
          <button className="qr-scanner-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Scanner Body */}
        <div className="qr-scanner-body">
          {/* Success Animation */}
          {showSuccess && (
            <div className="success-animation">
              <div className="success-circle">
                <CheckCircle size={48} />
              </div>
              <p className="success-message">{successMessage}</p>
            </div>
          )}
          
          {/* Error States */}
          {(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && (
            <div className="qr-scanner-error">
              <div className="error-icon">🌐</div>
              <h4>Browser Not Supported</h4>
              <p>Please use Chrome, Firefox, or Safari for camera access</p>
              <button onClick={onClose} className="close-btn">Close</button>
            </div>
          )}
          
          {(permissionDenied || error) && navigator.mediaDevices?.getUserMedia && (
            <div className="qr-scanner-error">
              <div className="error-icon">{permissionDenied ? "📷" : "⚠️"}</div>
              <h4>{permissionDenied ? "Camera Access Denied" : "Scan Failed"}</h4>
              <p>{error}</p>
              <div className="error-buttons">
                <button onClick={handleRetry} className="retry-btn">
                  Try Again
                </button>
                <button onClick={onClose} className="close-btn">
                  Close
                </button>
              </div>
            </div>
          )}
          
          {/* Scanner View */}
          {!error && !permissionDenied && navigator.mediaDevices?.getUserMedia && (
            <>
              <div className="scanner-wrapper">
                <div id="qr-reader" className="scanner-view"></div>
                {isInitializing && (
                  <div className="scanner-loading">
                    <div className="spinner"></div>
                    <p>Starting camera...</p>
                  </div>
                )}
                {!isInitializing && isScanning && (
                  <>
                    <div className="scan-overlay">
                      <div className="scan-frame">
                        <div className="scan-corner top-left"></div>
                        <div className="scan-corner top-right"></div>
                        <div className="scan-corner bottom-left"></div>
                        <div className="scan-corner bottom-right"></div>
                        <div className="scan-line"></div>
                      </div>
                    </div>
                    <div className="scanner-instructions">
                      <p className="scanner-instruction">
                        📱 Point camera at QR code
                      </p>
                      <p className="scanner-hint">
                        {isOffline 
                          ? "⚠️ Offline mode - scans will sync when online"
                          : "Center QR code in frame for instant scan"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes scanLine {
          0% { transform: translateY(-150px); }
          100% { transform: translateY(150px); }
        }
        
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
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
        
        .qr-scanner-container {
          background: white;
          border-radius: 32px;
          width: 90%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          animation: slideUp 0.3s ease;
        }
        
        .qr-scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
          position: relative;
        }
        
        .qr-scanner-header h3 {
          margin: 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .scan-badge {
          background: #10b981;
          color: white;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 20px;
          margin-left: 8px;
        }
        
        .header-status {
          display: flex;
          gap: 8px;
          margin-left: auto;
          margin-right: 12px;
        }
        
        .offline-badge {
          background: #f59e0b;
          color: white;
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .live-badge {
          background: #10b981;
          color: white;
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
          animation: pulse 2s infinite;
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
          position: relative;
          min-height: 450px;
        }
        
        .scanner-wrapper {
          position: relative;
        }
        
        .scanner-view {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
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
        
        #qr-reader__dashboard_section_csr,
        #qr-reader__dashboard_section_fsr,
        #qr-reader__dashboard_section {
          display: none !important;
        }
        
        .scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        
        .scan-frame {
          position: relative;
          width: 280px;
          height: 280px;
        }
        
        .scan-corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 3px solid #10b981;
        }
        
        .top-left {
          top: 0;
          left: 0;
          border-right: none;
          border-bottom: none;
          border-radius: 8px 0 0 0;
        }
        
        .top-right {
          top: 0;
          right: 0;
          border-left: none;
          border-bottom: none;
          border-radius: 0 8px 0 0;
        }
        
        .bottom-left {
          bottom: 0;
          left: 0;
          border-right: none;
          border-top: none;
          border-radius: 0 0 0 8px;
        }
        
        .bottom-right {
          bottom: 0;
          right: 0;
          border-left: none;
          border-top: none;
          border-radius: 0 0 8px 0;
        }
        
        .scan-line {
          position: absolute;
          top: 0;
          left: 10px;
          right: 10px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          animation: scanLine 2s linear infinite;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }
        
        .scanner-instructions {
          margin-top: 20px;
          text-align: center;
        }
        
        .scanner-instruction {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }
        
        .scanner-hint {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        
        /* Success Animation */
        .success-animation {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(16, 185, 129, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          z-index: 10;
          animation: fadeIn 0.3s ease;
        }
        
        .success-circle {
          background: white;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          animation: successPop 0.5s ease;
        }
        
        .success-message {
          color: white;
          font-size: 18px;
          font-weight: 600;
          margin-top: 20px;
          animation: slideDown 0.3s ease;
        }
        
        /* Error States */
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
        
        .error-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .retry-btn, .close-btn {
          padding: 10px 28px;
          border: none;
          border-radius: 40px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .retry-btn {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        
        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .close-btn {
          background: #e2e8f0;
          color: #1e293b;
        }
        
        .close-btn:hover {
          background: #cbd5e1;
          transform: translateY(-2px);
        }
        
        /* Loading State */
        .scanner-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          z-index: 5;
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
        }
        
        /* Responsive */
        @media (max-width: 640px) {
          .qr-scanner-container {
            width: 95%;
            border-radius: 24px;
          }
          
          .qr-scanner-body {
            padding: 16px;
          }
          
          .scan-frame {
            width: 240px;
            height: 240px;
          }
        }
      `}</style>
    </div>
  );
}