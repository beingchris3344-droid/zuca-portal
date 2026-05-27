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
  const [isInitializing, setIsInitializing] = useState(false);
  const scannerRef = useRef(null);
  const scannerInitialized = useRef(false);
  const isProcessing = useRef(false);
  const streamRef = useRef(null);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const onScanSuccess = async (decodedText, decodedResult) => {
    if (isProcessing.current) {
      console.log('Already processing a scan, ignoring...');
      return;
    }
    
    isProcessing.current = true;
    
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.pause();
        setIsScanning(false);
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
    
    try {
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
      
      if (qrData.type !== 'attendance_checkin') {
        setError('Not a valid attendance QR code');
        isProcessing.current = false;
        if (scannerRef.current) {
          await scannerRef.current.resume();
          setIsScanning(true);
        }
        return;
      }
      
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
      
      isProcessing.current = false;
      
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
    // Only log critical errors
    if (err && err.message && 
        !err.message.includes('No MultiFormat Readers') &&
        !err.message.includes('NotFoundException')) {
      console.error('Scan error:', err);
    }
  };
  
  const stopCameraTracks = () => {
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
  };
  
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
    stopCameraTracks();
  };
  
  // Check if mediaDevices is supported
  const isMediaDevicesSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };
  
  const requestCameraPermission = async () => {
    // Check if browser supports camera access
    if (!isMediaDevicesSupported()) {
      setError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.');
      setPermissionDenied(true);
      return false;
    }
    
    try {
      stopCameraTracks();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { exact: "environment" } 
        } 
      }).catch(async (err) => {
        // If back camera fails, try default camera
        if (err.name === 'OverconstrainedError') {
          return await navigator.mediaDevices.getUserMedia({ video: true });
        }
        throw err;
      });
      
      streamRef.current = stream;
      // Stop the tracks immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera access denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera access is not supported on this device/browser.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Could not access the back camera. Please make sure your device has a camera.');
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
      return false;
    }
  };
  
  const initializeScanner = async () => {
    const element = document.getElementById("qr-reader");
    if (!element) {
      console.error("qr-reader element not found");
      setError("Scanner element not found. Please refresh the page.");
      return false;
    }
    
    // Check browser support first
    if (!isMediaDevicesSupported()) {
      setError('Your browser does not support camera access. Please use Chrome, Firefox, or Safari.');
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
      const scanner = new Html5Qrcode("qr-reader");
      
      // Try to start with back camera, fallback to default
      let cameraConstraints = { facingMode: "environment" };
      
      await scanner.start(
        cameraConstraints,
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
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
      
      // Try with default camera if back camera fails
      if (err.message && err.message.includes('facingMode')) {
        try {
          const scanner = new Html5Qrcode("qr-reader");
          await scanner.start(
            { facingMode: "user" }, // Try front camera
            {
              fps: 10,
              qrbox: { width: 280, height: 280 },
              aspectRatio: 1.0,
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
        } catch (fallbackErr) {
          console.error("Failed with front camera too:", fallbackErr);
        }
      }
      
      setError(`Could not start camera: ${err.message || 'Unknown error'}`);
      setPermissionDenied(true);
      return false;
    }
  };
  
  const handleRetry = async () => {
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    setIsInitializing(false);
    
    await stopScanner();
    
    scannerInitialized.current = false;
    isProcessing.current = false;
    
    const readerElement = document.getElementById("qr-reader");
    if (readerElement) {
      readerElement.innerHTML = '';
    }
    
    setTimeout(() => {
      initializeScanner();
    }, 300);
  };
  
  useEffect(() => {
    let mounted = true;
    let initTimeout = null;
    
    const init = async () => {
      if (mounted) {
        await initializeScanner();
      }
    };
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setError('Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost.');
      setPermissionDenied(true);
      return;
    }
    
    initTimeout = setTimeout(init, 100);
    
    return () => {
      mounted = false;
      if (initTimeout) clearTimeout(initTimeout);
      stopScanner();
      scannerInitialized.current = false;
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
          {!isMediaDevicesSupported() && (
            <div className="qr-scanner-error">
              <div className="error-icon">🌐</div>
              <h4>Browser Not Supported</h4>
              <p>Your browser does not support camera access. Please use Chrome, Firefox, Safari, or another modern browser.</p>
              <button onClick={onClose} className="close-btn">Close</button>
            </div>
          )}
          
          {(permissionDenied || error) && isMediaDevicesSupported() && (
            <div className="qr-scanner-error">
              <div className="error-icon">{permissionDenied ? "📷" : "⚠️"}</div>
              <h4>{permissionDenied ? "Camera Access Denied" : "Scan Failed"}</h4>
              <p>{error || (permissionDenied ? "Please allow camera access to scan QR codes." : "An error occurred while scanning.")}</p>
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
          
          {!error && !permissionDenied && isMediaDevicesSupported() && (
            <>
              <div id="qr-reader" className="scanner-view"></div>
              {isInitializing && (
                <div className="scanner-loading">
                  <div className="spinner"></div>
                  <p>Starting camera...</p>
                </div>
              )}
              {!isInitializing && isScanning && (
                <>
                  <p className="scanner-instruction">
                    📱 Point your camera at the QR code
                  </p>
                  <p className="scanner-hint">
                    Make sure the QR code is well lit and centered
                  </p>
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
      `}</style>
    </div>
  );
}