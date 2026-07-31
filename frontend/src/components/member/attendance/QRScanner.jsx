import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Camera, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceId, getDeviceName } from '../../../utils/deviceId';
import { saveOfflineCheckin, getPendingCount } from '../../../utils/offlineStorage';

// Constants
const SCAN_DEBOUNCE_MS = 1000;
const API_TIMEOUT_MS = 5000;
const CLOSE_DELAY_MS = 800; // Quick close after scan
const MAX_RETRY_ATTEMPTS = 3;

export default function QRScanner({ onClose, onSuccess, sheetId: propSheetId }) {
  // State
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  
  // Refs
  const scannerRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessing = useRef(false);
  const lastScanTime = useRef(0);
  const mountedRef = useRef(true);
  const closeTimeoutRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const isClosingRef = useRef(false);
  
  // Memoized headers
  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (error && retryCount < MAX_RETRY_ATTEMPTS) {
        handleRetry();
      }
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, retryCount]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      stopScanner();
    };
  }, []);

  // Stop camera tracks
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          if (track && track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (err) {
        console.error('Error stopping camera tracks:', err);
      }
      streamRef.current = null;
    }
  }, []);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    stopCameraTracks();
    setIsScanning(false);
  }, [stopCameraTracks]);

  // 🔥 NEW: Clean close function - immediately closes without waiting
  const performClose = useCallback(() => {
    if (isClosingRef.current || !mountedRef.current) return;
    isClosingRef.current = true;
    
    // Clear any pending timeouts
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    // Stop scanner immediately
    stopScanner().then(() => {
      if (mountedRef.current) {
        onClose();
      }
    }).catch(() => {
      // Force close even if stop fails
      if (mountedRef.current) {
        onClose();
      }
    });
  }, [onClose, stopScanner]);

  // 🔥 NEW: Handle scan result with immediate close
  const handleScanResult = useCallback((success, message, data) => {
    if (!mountedRef.current) return;
    
    // Close immediately after a very short delay
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    closeTimeoutRef.current = setTimeout(() => {
      // Call onSuccess callback before closing
      if (success && onSuccess) {
        onSuccess(data);
      }
      // Close the scanner
      performClose();
    }, CLOSE_DELAY_MS);
  }, [onSuccess, performClose]);

  // Process check-in in background
  const processCheckin = useCallback(async (decodedText) => {
    try {
      let token;
      let scannedSheetId;
      
      // Parse QR data
      try {
        const qrData = JSON.parse(decodedText);
        if (qrData.type === 'attendance_checkin') {
          token = qrData.token;
          scannedSheetId = qrData.sheetId;
        } else {
          throw new Error('Not attendance QR');
        }
      } catch (e) {
        const urlMatch = decodedText.match(/\/scan\/([a-f0-9]+)/);
        if (urlMatch && urlMatch[1]) {
          token = urlMatch[1];
        } else {
          handleScanResult(false, 'Invalid QR code format');
          isProcessing.current = false;
          return;
        }
      }
      
      // Offline mode
      if (isOffline) {
        if (scannedSheetId) {
          const saved = await saveOfflineCheckin(
            scannedSheetId, 
            getDeviceId(), 
            `QR Scan (Offline) - ${new Date().toLocaleString()}`
          );
          if (saved) {
            handleScanResult(true, 'Check-in saved offline!', { offline: true });
          } else {
            handleScanResult(false, 'Failed to save offline');
          }
        } else {
          handleScanResult(false, 'Offline mode not supported');
        }
        isProcessing.current = false;
        return;
      }
      
      // Online check-in
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      try {
        const response = await axios.post(
          `${BASE_URL}/api/attendance/qr-checkin`,
          {
            token: token,
            deviceId: getDeviceId(),
            deviceName: getDeviceName()
          },
          {
            headers: getHeaders(),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.data.success && mountedRef.current) {
          handleScanResult(true, 'Check-in successful!', response.data.entry);
        }
      } catch (axiosError) {
        clearTimeout(timeoutId);
        throw axiosError;
      }
      
    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMsg = error.response?.data?.error || error.message;
      
      // Offline fallback
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        try {
          const qrData = JSON.parse(decodedText);
          if (qrData.sheetId) {
            const saved = await saveOfflineCheckin(
              qrData.sheetId, 
              getDeviceId(), 
              `QR Scan (Offline Fallback) - ${new Date().toLocaleString()}`
            );
            if (saved) {
              handleScanResult(true, 'Check-in saved offline!', { offline: true });
              isProcessing.current = false;
              return;
            }
          }
        } catch (e) {}
        handleScanResult(false, 'No internet connection');
      } else if (error.name === 'AbortError') {
        handleScanResult(false, 'Request timed out');
      } else if (errorMsg.includes('Invalid') || errorMsg.includes('expired')) {
        handleScanResult(false, 'QR code expired or invalid');
      } else if (errorMsg.includes('Already checked in')) {
        handleScanResult(true, 'Already checked in');
      } else if (errorMsg.includes('DEVICE_ALREADY_USED')) {
        handleScanResult(false, 'Device already used');
      } else {
        handleScanResult(false, errorMsg || 'Check-in failed');
      }
      
      isProcessing.current = false;
    }
  }, [isOffline, getHeaders, handleScanResult]);

  // Handle successful scan
  const onScanSuccess = useCallback(async (decodedText, decodedResult) => {
    // Debounce
    const now = Date.now();
    if (now - lastScanTime.current < SCAN_DEBOUNCE_MS || isProcessing.current || !mountedRef.current) {
      return;
    }
    lastScanTime.current = now;
    
    isProcessing.current = true;
    
    // 🔥 IMMEDIATELY stop scanner
    await stopScanner();
    
    // Process check-in in background
    processCheckin(decodedText);
    
  }, [stopScanner, processCheckin]);

  // Scan error handler
  const onScanError = useCallback((err) => {
    if (err && err.message && 
        !err.message.includes('No MultiFormat Readers') &&
        !err.message.includes('NotFoundException') &&
        !err.message.includes('NoVideoInputDevices')) {
      console.error('Scan error:', err);
    }
  }, []);

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support camera access.');
      setPermissionDenied(true);
      return false;
    }
    
    try {
      stopCameraTracks();
      
      const constraints = {
        video: {
          facingMode: { exact: cameraFacingMode }
        }
      };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraFacingMode('user');
      }
      
      streamRef.current = stream;
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
  }, [cameraFacingMode, stopCameraTracks]);

  // Initialize scanner
  const initializeScanner = useCallback(async () => {
    const element = document.getElementById('qr-reader');
    if (!element || !mountedRef.current) {
      console.error('qr-reader element not found');
      return false;
    }
    
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support camera access.');
      setPermissionDenied(true);
      return false;
    }
    
    setIsInitializing(true);
    setError(null);
    setPermissionDenied(false);
    isClosingRef.current = false;
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission || !mountedRef.current) {
      setIsInitializing(false);
      return false;
    }
    
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      
      const scanner = new Html5Qrcode('qr-reader');
      
      const config = {
        fps: 20,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };
      
      await scanner.start(
        { facingMode: cameraFacingMode },
        config,
        onScanSuccess,
        onScanError
      );
      
      if (!mountedRef.current) {
        await scanner.stop();
        return false;
      }
      
      scannerRef.current = scanner;
      setIsScanning(true);
      setIsInitializing(false);
      setRetryCount(0);
      return true;
      
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setIsInitializing(false);
      
      if (cameraFacingMode === 'environment') {
        setCameraFacingMode('user');
        initTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            initializeScanner();
          }
        }, 500);
        return false;
      }
      
      setError(`Could not start camera: ${err.message || 'Unknown error'}`);
      setPermissionDenied(true);
      return false;
    }
  }, [cameraFacingMode, requestCameraPermission, onScanSuccess, onScanError]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    setIsInitializing(false);
    setRetryCount(prev => prev + 1);
    isClosingRef.current = false;
    
    await stopScanner();
    
    isProcessing.current = false;
    lastScanTime.current = 0;
    
    const readerElement = document.getElementById('qr-reader');
    if (readerElement) {
      readerElement.innerHTML = '';
    }
    
    initializeScanner();
  }, [stopScanner, initializeScanner]);

  // Initial setup
  useEffect(() => {
    initializeScanner();
    
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [initializeScanner, stopScanner]);

  // Render
  return (
    <div 
      className="qr-scanner-overlay" 
      onClick={performClose}
      role="dialog"
      aria-modal="true"
      aria-label="QR Code Scanner"
    >
      <div className="qr-scanner-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-scanner-header">
          <h3>
            <Camera size={20} /> Scan QR Code
          </h3>
          {isOffline && (
            <span className="offline-badge">📡 OFFLINE</span>
          )}
          <button 
            className="qr-scanner-close" 
            onClick={performClose}
            aria-label="Close scanner"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="qr-scanner-body">
          {error ? (
            <div className="qr-scanner-error">
              <div className="error-icon">{permissionDenied ? '📷' : '⚠️'}</div>
              <h4>{permissionDenied ? 'Camera Access Denied' : 'Scan Failed'}</h4>
              <p>{error}</p>
              <div className="error-buttons">
                <button 
                  onClick={handleRetry} 
                  className="retry-btn"
                  disabled={retryCount >= MAX_RETRY_ATTEMPTS}
                >
                  {retryCount >= MAX_RETRY_ATTEMPTS ? 'Max Retries' : 'Try Again'}
                </button>
                <button onClick={performClose} className="close-btn">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="scanner-view" />
              {isInitializing && (
                <div className="scanner-loading">
                  <div className="spinner" />
                  <p>Starting camera...</p>
                </div>
              )}
              {!isInitializing && isScanning && !error && (
                <>
                  <p className="scanner-instruction">
                    📱 Point camera at QR code
                  </p>
                  <p className="scanner-hint">
                    {isOffline ? (
                      <span><WifiOff size={14} /> Offline mode - check-ins will be saved</span>
                    ) : (
                      <span><Wifi size={14} /> Online mode</span>
                    )}
                  </p>
                  {isOffline && (
                    <div className="offline-badge-scanner">
                      <span>📡 OFFLINE</span>
                      <span className="pending-count">
                        {getPendingCount() > 0 && `(${getPendingCount()} pending)`}
                      </span>
                    </div>
                  )}
                </>
              )}
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
          animation: fadeIn 0.15s ease;
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
          animation: slideUp 0.2s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
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
        
        .offline-badge {
          background: #f59e0b;
          color: white;
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 20px;
          margin-left: 10px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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
          color: white;
        }
        
        .qr-scanner-close:hover {
          background: rgba(255,255,255,0.2);
          transform: rotate(90deg);
        }
        
        .qr-scanner-body {
          padding: 24px;
          position: relative;
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
        
        #qr-reader__dashboard_section_csr,
        #qr-reader__dashboard_section_fsr,
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        
        .offline-badge-scanner {
          text-align: center;
          margin-top: 8px;
          font-size: 11px;
          color: #f59e0b;
          font-weight: 600;
        }
        
        .pending-count {
          color: #94a3b8;
          font-weight: normal;
          margin-left: 4px;
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
        
        .retry-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .retry-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .close-btn {
          background: #e2e8f0;
          color: #1e293b;
        }
        
        .close-btn:hover {
          background: #cbd5e1;
          transform: translateY(-2px);
        }
        
        @media (max-width: 480px) {
          .qr-scanner-container {
            width: 100%;
            border-radius: 0;
            height: 100vh;
            max-height: 100vh;
          }
          
          .scanner-view {
            min-height: 50vh;
          }
          
          .qr-scanner-header {
            padding: 14px 16px;
          }
          
          .qr-scanner-body {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}