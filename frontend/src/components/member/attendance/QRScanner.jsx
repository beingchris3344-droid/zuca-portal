import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Camera, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceId, getDeviceName } from '../../../utils/deviceId';
import { saveOfflineCheckin, getPendingCount } from '../../../utils/offlineStorage';

// Constants
const SCAN_DEBOUNCE_MS = 1000;
const API_TIMEOUT_MS = 5000;
const AUTO_CLOSE_DELAY_MS = 1500;
const SUCCESS_CLOSE_DELAY_MS = 2000;
const MAX_RETRY_ATTEMPTS = 3;

// Error messages mapping
const ERROR_MESSAGES = {
  'Invalid or expired QR code': 'This QR code has expired. Please request a new one.',
  'Already checked in': 'You have already checked in to this session.',
  'DEVICE_ALREADY_USED': 'This device has already been used for check-in.',
  'Network Error': 'Network error. Please check your connection.',
  'Request timed out': 'Request timed out. Please try again.',
};

export default function QRScanner({ onClose, onSuccess, sheetId: propSheetId }) {
  // State
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [scanStatus, setScanStatus] = useState(null); // 'success' | 'error' | 'processing'
  const [statusMessage, setStatusMessage] = useState('');
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
  
  // Memoized headers
  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Retry any pending operations
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

  // Immediate close function
  const immediateClose = useCallback(async () => {
    await stopScanner();
  }, [stopScanner]);

  // Show status and auto-close
  const showStatusAndClose = useCallback((status, message, shouldClose = true) => {
    if (!mountedRef.current) return;
    
    setScanStatus(status);
    setStatusMessage(message);
    
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    // Auto close after delay
    if (shouldClose) {
      const delay = status === 'success' ? SUCCESS_CLOSE_DELAY_MS : AUTO_CLOSE_DELAY_MS;
      closeTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onClose();
        }
      }, delay);
    }
  }, [onClose]);

  // Process check-in in background
  const processCheckin = useCallback(async (decodedText) => {
    try {
      let token;
      let scannedSheetId;
      
      // Parse QR data - support both JSON and URL formats
      try {
        const qrData = JSON.parse(decodedText);
        if (qrData.type === 'attendance_checkin') {
          token = qrData.token;
          scannedSheetId = qrData.sheetId;
        } else {
          throw new Error('Not attendance QR');
        }
      } catch (e) {
        // Try URL format
        const urlMatch = decodedText.match(/\/scan\/([a-f0-9]+)/);
        if (urlMatch && urlMatch[1]) {
          token = urlMatch[1];
        } else {
          showStatusAndClose('error', '❌ Invalid QR code format', true);
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
            showStatusAndClose('success', '✅ Check-in saved offline!', true);
            if (onSuccess) onSuccess({ offline: true });
          } else {
            showStatusAndClose('error', '❌ Failed to save offline', true);
          }
        } else {
          showStatusAndClose('error', '⚠️ Offline mode not supported for this QR', true);
        }
        isProcessing.current = false;
        return;
      }
      
      // Online check-in with timeout
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
          showStatusAndClose('success', '✅ Check-in successful!', true);
          if (onSuccess) onSuccess(response.data.entry);
        }
      } catch (axiosError) {
        clearTimeout(timeoutId);
        throw axiosError;
      }
      
    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMsg = error.response?.data?.error || error.message;
      
      // Offline fallback for network errors
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
              showStatusAndClose('success', '✅ Check-in saved offline!', true);
              if (onSuccess) onSuccess({ offline: true });
              isProcessing.current = false;
              return;
            }
          }
        } catch (e) {}
        showStatusAndClose('error', '📡 No internet connection', true);
      } else if (error.name === 'AbortError') {
        showStatusAndClose('error', '⏱️ Request timed out', true);
      } else if (errorMsg.includes('Invalid') || errorMsg.includes('expired')) {
        showStatusAndClose('error', '❌ QR code expired or invalid', true);
      } else if (errorMsg.includes('Already checked in')) {
        showStatusAndClose('success', '✅ Already checked in', true);
      } else if (errorMsg.includes('DEVICE_ALREADY_USED')) {
        showStatusAndClose('error', '📱 Device already used', true);
      } else {
        showStatusAndClose('error', `❌ ${ERROR_MESSAGES[errorMsg] || 'Check-in failed'}`, true);
      }
      
      isProcessing.current = false;
    }
  }, [isOffline, getHeaders, showStatusAndClose, onSuccess]);

  // Handle successful scan
  const onScanSuccess = useCallback(async (decodedText, decodedResult) => {
    // Debounce check
    const now = Date.now();
    if (now - lastScanTime.current < SCAN_DEBOUNCE_MS || scanStatus || !mountedRef.current) {
      return;
    }
    lastScanTime.current = now;
    
    if (isProcessing.current) {
      return;
    }
    
    isProcessing.current = true;
    
    // 🔥 IMMEDIATELY stop scanner
    await immediateClose();
    
    // Show processing status
    showStatusAndClose('processing', '⏳ Processing check-in...', false);
    
    // Process check-in in background
    processCheckin(decodedText);
    
  }, [immediateClose, showStatusAndClose, processCheckin, scanStatus]);

  // Scan error handler - filtered to only log critical errors
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
        // Fallback to default camera
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
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission || !mountedRef.current) {
      setIsInitializing(false);
      return false;
    }
    
    try {
      // Clean up existing scanner
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
      
      // Try fallback to front camera
      if (cameraFacingMode === 'environment') {
        setCameraFacingMode('user');
        // Retry with front camera after delay
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
    // Reset states
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    setIsInitializing(false);
    setScanStatus(null);
    setStatusMessage('');
    setRetryCount(prev => prev + 1);
    
    // Clean up existing scanner
    await stopScanner();
    
    isProcessing.current = false;
    lastScanTime.current = 0;
    
    // Clear the reader element
    const readerElement = document.getElementById('qr-reader');
    if (readerElement) {
      readerElement.innerHTML = '';
    }
    
    // Reinitialize scanner
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

  // Memoized render functions
  const renderStatus = useMemo(() => {
    if (!scanStatus) return null;
    
    const statusConfig = {
      success: {
        icon: '✅',
        className: 'success',
        title: statusMessage || 'Check-in successful!',
        subtitle: 'Check-in completed'
      },
      error: {
        icon: '❌',
        className: 'error',
        title: statusMessage || 'Check-in failed',
        subtitle: 'Please try again'
      },
      processing: {
        icon: '⏳',
        className: 'processing',
        title: statusMessage || 'Processing...',
        subtitle: 'Please wait'
      }
    };
    
    const config = statusConfig[scanStatus];
    
    return (
      <div className={`qr-status-overlay ${config.className}`}>
        <div className="status-icon">{config.icon}</div>
        <h2>{config.title}</h2>
        <p className="status-subtitle">{config.subtitle}</p>
        {scanStatus === 'error' && (
          <button 
            onClick={handleRetry}
            className="retry-btn"
            disabled={retryCount >= MAX_RETRY_ATTEMPTS}
          >
            {retryCount >= MAX_RETRY_ATTEMPTS ? 'Max retries reached' : 'Try Again'}
          </button>
        )}
        <div className="status-close-timer">
          <div className="timer-bar" />
        </div>
      </div>
    );
  }, [scanStatus, statusMessage, handleRetry, retryCount]);

  // Render scanner content
  const renderScanner = useMemo(() => (
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
  ), [isInitializing, isScanning, error, isOffline]);

  return (
    <div 
      className="qr-scanner-overlay" 
      onClick={!scanStatus ? onClose : undefined}
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
            onClick={onClose}
            aria-label="Close scanner"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="qr-scanner-body">
          {error && !scanStatus ? (
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
                <button onClick={onClose} className="close-btn">
                  Close
                </button>
              </div>
            </div>
          ) : scanStatus ? (
            renderStatus
          ) : (
            renderScanner
          )}
        </div>
      </div>
      
      <style>{`
        /* Overlay */
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
        
        /* Container */
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
        
        /* Header */
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
        
        /* Body */
        .qr-scanner-body {
          padding: 24px;
          position: relative;
        }
        
        /* Scanner View */
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
        
        /* Scanner Instructions */
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
        
        /* Loading */
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
        
        /* Error View */
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
        
        /* Status Overlay */
        .qr-status-overlay {
          text-align: center;
          padding: 48px 32px;
          min-height: 350px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .qr-status-overlay.success {
          background: linear-gradient(135deg, #065f46, #047857);
          color: white;
        }
        
        .qr-status-overlay.error {
          background: linear-gradient(135deg, #991b1b, #dc2626);
          color: white;
        }
        
        .qr-status-overlay.processing {
          background: linear-gradient(135deg, #1e293b, #334155);
          color: white;
        }
        
        .status-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: bounceIn 0.5s ease;
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .qr-status-overlay h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }
        
        .status-subtitle {
          margin: 0 0 24px 0;
          opacity: 0.8;
          font-size: 14px;
        }
        
        .qr-status-overlay .retry-btn {
          padding: 12px 32px;
          background: white;
          color: #1e293b;
          border: none;
          border-radius: 40px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .qr-status-overlay .retry-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .qr-status-overlay .retry-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Timer bar */
        .status-close-timer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255,255,255,0.2);
        }
        
        .timer-bar {
          height: 100%;
          background: rgba(255,255,255,0.8);
          animation: timerProgress 2s linear forwards;
        }
        
        @keyframes timerProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        /* Responsive */
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
          
          .qr-status-overlay {
            min-height: 70vh;
            padding: 32px 20px;
          }
        }
      `}</style>
    </div>
  );
}