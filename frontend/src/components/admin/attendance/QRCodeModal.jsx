import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, RefreshCw, Calendar, MapPin, Clock } from 'lucide-react';
import { api } from '../../../api';

export default function QRCodeModal({ sheet, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetInfo, setSheetInfo] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  const generateQRCode = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/attendance/sheet/${sheet.id}/qr`, { headers: getHeaders() });
      setQrCodeUrl(response.data.qrCodeUrl);
      setSheetInfo(response.data.sheet);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to generate QR code', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const startCamera = async () => {
    try {
      // Request camera permission and start immediately
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } // Use back camera by default
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        startScanning();
      }
    } catch (error) {
      console.error('Camera error:', error);
      showToast('Unable to access camera. Please check permissions.', 'error');
    }
  };
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanning(false);
  };
  
  const startScanning = () => {
    setScanning(true);
  };
  
  const handleScan = async (decodedText) => {
    if (!scanning) return;
    
    try {
      // Send check-in request
      const response = await api.post('/api/attendance/checkin', {
        qrCode: decodedText,
        sheetId: sheet.id
      }, { headers: getHeaders() });
      
      if (response.data.success) {
        showToast('✓ Check-in successful!', 'success');
        stopCamera();
        // Optional: play success sound
        // new Audio('/success.mp3').play();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Check-in failed', 'error');
    }
  };
  
  // Initialize QR scanner with html5-qrcode or similar
  useEffect(() => {
    if (cameraActive && videoRef.current) {
      // You'll need to install and import a QR scanner library like 'html5-qrcode'
      // For now, I'll show the structure. Install with: npm install html5-qrcode
      const loadScanner = async () => {
        const Html5Qrcode = (await import('html5-qrcode')).Html5Qrcode;
        const html5QrCode = new Html5Qrcode("qr-reader");
        
        const qrCodeSuccessCallback = (decodedText) => {
          handleScan(decodedText);
        };
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback
        );
        
        return () => {
          html5QrCode.stop();
        };
      };
      
      loadScanner();
    }
  }, [cameraActive]);
  
  useEffect(() => {
    generateQRCode();
    
    // Start camera automatically when modal opens
    startCamera();
    
    // Cleanup when modal closes
    return () => {
      stopCamera();
    };
  }, [sheet.id]);
  
  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-container" onClick={e => e.stopPropagation()}>
        
        {toast.show && (
          <div className={`qr-toast ${toast.type}`}>{toast.message}</div>
        )}
        
        <div className="qr-modal-header">
          <h3>📱 Scan QR Code</h3>
          <button className="qr-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="qr-modal-body">
          {/* Camera Preview - Shows immediately */}
          <div className="camera-container">
            {!cameraActive ? (
              <div className="camera-placeholder">
                <Camera size={48} />
                <p>Requesting camera access...</p>
              </div>
            ) : (
              <>
                <div id="qr-reader" className="qr-reader"></div>
                <div className="scan-overlay">
                  <div className="scan-frame"></div>
                </div>
              </>
            )}
          </div>
          
          {/* Meeting Info */}
          <div className="qr-meeting-info">
            <h4>{sheetInfo?.title || sheet.title}</h4>
            <div className="qr-meta">
              <span><Calendar size={14} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
              <span><Clock size={14} /> {sheet.eventTime || '4:30 PM'}</span>
              <span><MapPin size={14} /> {sheet.location || 'ZUCA'}</span>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="qr-instructions">
            <p>📸 Position the QR code in front of the camera to check in</p>
            <p>🔄 Camera starts automatically - no file upload needed</p>
          </div>
          
          {/* Control Buttons */}
          <div className="qr-actions">
            {!cameraActive ? (
              <button className="qr-camera-btn" onClick={startCamera}>
                <Camera size={16} /> Start Camera
              </button>
            ) : (
              <button className="qr-refresh-btn" onClick={() => {
                stopCamera();
                startCamera();
              }}>
                <RefreshCw size={16} /> Restart Camera
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .qr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .qr-modal-container {
          background: white;
          border-radius: 24px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .qr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .qr-modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .qr-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .qr-modal-body {
          padding: 24px;
          text-align: center;
        }
        
        .camera-container {
          position: relative;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 20px;
          aspect-ratio: 4/3;
        }
        
        .qr-reader {
          width: 100%;
          height: 100%;
        }
        
        .qr-reader video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }
        
        .scan-frame {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 250px;
          border: 2px solid #00ff00;
          border-radius: 16px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
          animation: pulse 1.5s infinite;
        }
        
        .scan-frame::before,
        .scan-frame::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid #00ff00;
        }
        
        .scan-frame::before {
          top: -2px;
          left: -2px;
          border-right: none;
          border-bottom: none;
        }
        
        .scan-frame::after {
          bottom: -2px;
          right: -2px;
          border-left: none;
          border-top: none;
        }
        
        @keyframes pulse {
          0%, 100% {
            border-color: #00ff00;
            opacity: 1;
          }
          50% {
            border-color: #00ff88;
            opacity: 0.7;
          }
        }
        
        .camera-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          color: #666;
          height: 100%;
          min-height: 300px;
        }
        
        .camera-placeholder p {
          margin-top: 12px;
        }
        
        .qr-meeting-info {
          margin-bottom: 16px;
        }
        
        .qr-meeting-info h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }
        
        .qr-meta {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 12px;
          color: #666;
          flex-wrap: wrap;
        }
        
        .qr-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .qr-instructions {
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #64748b;
          text-align: left;
        }
        
        .qr-instructions p {
          margin: 6px 0;
        }
        
        .qr-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .qr-camera-btn, .qr-refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          border: none;
          background: #1a1a1a;
          color: white;
        }
        
        .qr-refresh-btn {
          background: #e0f2fe;
          color: #0284c7;
        }
        
        .qr-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          background: #1a1a1a;
          color: white;
          font-size: 14px;
          z-index: 2100;
          font-weight: 500;
        }
        
        .qr-toast.error {
          background: #ef4444;
        }
        
        .qr-toast.success {
          background: #22c55e;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}