import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { 
  Calendar, MapPin, Clock, CheckCircle, ArrowRight, QrCode, Smartphone
} from 'lucide-react';
import { 
  FaChevronLeft, FaChevronRight, FaPause, FaPlay, FaChurch, FaPray 
} from 'react-icons/fa';

// Slideshow images (using same assets)
import slide2 from '../../../assets/2.jpg';
import slide3 from '../../../assets/3.jpg';
import slide4 from '../../../assets/4.jpg';
import slide5 from '../../../assets/5.jpg';
import slide6 from '../../../assets/6.jpg';
import slide7 from '../../../assets/7.jpg';
import slide8 from '../../../assets/8.jpg';
import slide9 from '../../../assets/9.jpg';
import slide10 from '../../../assets/10.jpg';
import slide11 from '../../../assets/11.jpg';
import slide12 from '../../../assets/12.jpg';

export default function LinkCheckin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  
  // Slideshow states
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const slideIntervalRef = useRef(null);
  
  const slides = [
    { id: 2, image: slide2, title: "Community Prayer", description: "Join us in worship" },
    { id: 3, image: slide3, title: "Youth in Action", description: "Building a stronger faith community" },
    { id: 4, image: slide4, title: "Mass & Celebrations", description: "Come together in faith" },
    { id: 5, image: slide5, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 6, image: slide6, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 7, image: slide7, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 8, image: slide8, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 9, image: slide9, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 10, image: slide10, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 11, image: slide11, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 12, image: slide12, title: "Zetech Catholic Action", description: "Growing in faith and service" }
  ];
  
  // Slideshow navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };
  
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStart(null);
  };
  
  // Auto-play slideshow
  useEffect(() => {
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [isPlaying, slides.length]);
  
  useEffect(() => {
    const checkLink = async () => {
      try {
        const userToken = localStorage.getItem('token');
        const response = await api.get(`/api/attendance/link/${token}`);
        
        if (response.data.success) {
          setSheet(response.data.sheet);
          
          if (!userToken) {
            localStorage.setItem('redirectAfterLogin', `/attendance/link/${token}`);
            navigate('/login');
            return;
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired link');
      } finally {
        setLoading(false);
      }
    };
    
    checkLink();
  }, [token, navigate]);
  
  const handleSelfCheckin = async () => {
    setCheckingIn(true);
    try {
      await api.post(`/api/attendance/self-checkin`, {
        sheetId: sheet.id,
        deviceId: `link-${Date.now()}`,
        deviceName: 'Shareable Link'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      alert('✅ Checked in successfully!');
      navigate(`/member/attendance?sheetId=${sheet.id}`);
    } catch (error) {
      const errorMsg = error.response?.data;
      if (errorMsg?.error === 'ALREADY_CHECKED_IN') {
        alert('You have already checked in for this meeting');
        navigate(`/member/attendance?sheetId=${sheet.id}`);
      } else {
        alert(errorMsg?.message || 'Personal check-in is not allowed for this meeting');
      }
    } finally {
      setCheckingIn(false);
    }
  };
  
  const handleQRCheckin = () => {
    navigate(`/member/attendance?sheetId=${sheet.id}&showScanner=true`);
  };
  
  if (loading) {
    return (
      <div className="link-checkin-container">
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Loading meeting details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="link-checkin-container">
        <div className="error-card">
          <div className="error-icon">🔗❌</div>
          <h2>Invalid Link</h2>
          <p>{error}</p>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (!sheet) return null;
  
  return (
    <div className="link-checkin-container">
      {/* Slideshow Background */}
      <div 
        className="slideshow-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <div 
            key={slide.id}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="slide-overlay"></div>
          </div>
        ))}
        
        {/* Slideshow Navigation */}
        <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
          <FaChevronLeft size={20} />
        </button>
        <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
          <FaChevronRight size={20} />
        </button>
        
        {/* Slideshow Dots */}
        <div className="slideshow-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
        
        {/* Play/Pause Button */}
        <button className="slideshow-play-pause" onClick={togglePlayPause}>
          {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
        </button>
      </div>
      
      {/* Content */}
      <div className="content-overlay">
        <div className="meeting-card">
          {/* Header */}
          <div className="card-header">
            <div className="live-badge">🔴 LIVE MEETING</div>
            <h1>{sheet.title}</h1>
          </div>
          
          {/* Meeting Details */}
          <div className="details-section">
            <div className="detail-item">
              <Calendar size={18} />
              <span>{new Date(sheet.eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="detail-item">
              <Clock size={18} />
              <span>{sheet.eventTime || '4:30 PM'}</span>
            </div>
            <div className="detail-item">
              <MapPin size={18} />
              <span>{sheet.location || 'ZUCA - Annex 002'}</span>
            </div>
          </div>
          
          {/* Welcome Message */}
          <div className="welcome-section">
            <FaChurch className="welcome-icon" />
            <p>You've been invited to check in for this meeting.</p>
            <p className="small-note">Choose your check-in method below:</p>
          </div>
          
          {/* Check-in Methods */}
          <div className="methods-section">
            <button 
              className="method-btn self-btn"
              onClick={handleSelfCheckin}
              disabled={checkingIn}
            >
              <Smartphone size={20} />
              <div className="btn-content">
                <span className="btn-title">Self Check-in</span>
                <span className="btn-desc">Check in using your account</span>
              </div>
              <ArrowRight size={18} />
            </button>
            
            <button 
              className="method-btn qr-btn"
              onClick={handleQRCheckin}
            >
              <QrCode size={20} />
              <div className="btn-content">
                <span className="btn-title">Scan QR Code</span>
                <span className="btn-desc">Scan QR code at the venue</span>
              </div>
              <ArrowRight size={18} />
            </button>
          </div>
          
          {/* Mass Reminder */}
          <div className="mass-reminder">
            <FaPray size={16} />
            <span>Weekly Mass: Wednesday 4:30 PM @ Annex 002</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .link-checkin-container {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        
        /* Slideshow Styles */
        .slideshow-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
        }
        
        .slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0;
          transition: opacity 1s ease-in-out;
          z-index: 1;
        }
        
        .slide.active {
          opacity: 1;
          z-index: 2;
        }
        
        .slide-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(10, 10, 30, 0.85), rgba(0, 0, 0, 0.75));
          z-index: 1;
        }
        
        /* Slideshow Navigation */
        .slideshow-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.3s ease;
        }
        
        .slideshow-nav:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: translateY(-50%) scale(1.05);
        }
        
        .slideshow-nav-prev {
          left: 20px;
        }
        
        .slideshow-nav-next {
          right: 20px;
        }
        
        .slideshow-dots {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 12px;
          z-index: 20;
          flex-wrap: wrap;
          padding: 0 16px;
        }
        
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        
        .dot.active {
          background: #00c6ff;
          width: 24px;
          border-radius: 10px;
        }
        
        .slideshow-play-pause {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.3s ease;
        }
        
        .slideshow-play-pause:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: scale(1.05);
        }
        
        /* Content Overlay */
        .content-overlay {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
        }
        
        .meeting-card {
          max-width: 500px;
          width: 100%;
          background: rgba(0, 0, 0, 0.67);
          backdrop-filter: blur(10px);
          border-radius: 32px;
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: slideUp 0.5s ease;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .live-badge {
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .card-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin: 0 0 24px 0;
        }
        
        .details-section {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          color: #cbd5e1;
          font-size: 15px;
        }
        
        .welcome-section {
          text-align: center;
          margin-bottom: 24px;
        }
        
        .welcome-icon {
          font-size: 32px;
          color: #00c6ff;
          margin-bottom: 12px;
        }
        
        .welcome-section p {
          margin: 4px 0;
          color: #cbd5e1;
        }
        
        .small-note {
          font-size: 13px;
          color: #94a3b8;
        }
        
        .methods-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .method-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }
        
        .method-btn:hover {
          border-color: #8b5cf6;
          transform: translateX(4px);
          background: rgba(139, 92, 246, 0.1);
        }
        
        .method-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-content {
          flex: 1;
          text-align: left;
        }
        
        .btn-title {
          display: block;
          font-weight: 600;
          font-size: 16px;
          color: white;
        }
        
        .btn-desc {
          display: block;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .self-btn:hover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
        
        .qr-btn:hover {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        
        .mass-reminder {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: rgba(0, 198, 255, 0.1);
          border-radius: 12px;
          font-size: 12px;
          color: #cbd5e1;
          text-align: center;
        }
        
        .loading-card, .error-card {
          max-width: 400px;
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 32px;
          padding: 48px 32px;
          text-align: center;
          color: white;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #00c6ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .error-card h2 {
          margin: 0 0 8px 0;
          color: white;
        }
        
        .error-card p {
          color: #94a3b8;
          margin-bottom: 24px;
        }
        
        .back-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #00c6ff, #007bff);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .slideshow-nav {
            width: 36px;
            height: 36px;
          }
          
          .slideshow-nav-prev {
            left: 10px;
          }
          
          .slideshow-nav-next {
            right: 10px;
          }
          
          .meeting-card {
            padding: 24px;
          }
          
          .card-header h1 {
            font-size: 22px;
          }
          
          .method-btn {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}