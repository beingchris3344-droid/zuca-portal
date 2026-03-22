// frontend/src/pages/Landing2.jsx
import { useNavigate } from "react-router-dom";
import { 
  FaInstagram, 
  FaFacebookF, 
  FaYoutube, 
  FaTiktok, 
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaChurch,
  FaMusic,
  FaUsers,
  FaHandsHelping,
  FaHeart,
  FaPray,
  FaClock,
  FaLocationArrow,
  FaDownload,
  FaUserPlus,
  FaSignInAlt,
  FaBars,
  FaTimes,
  FaChevronDown
} from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import logo from "../assets/zuca-logo.png";
import bg from "../assets/background2.webp";
import NotificationPrompt from '../components/NotificationPrompt';

function Landing2() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const massRef = useRef(null);
  const connectRef = useRef(null);
  const contactRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      updateActiveSection();
    };
    
    window.addEventListener("scroll", handleScroll);
    
    // Fade-in on scroll observer
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in");
          }
        });
      },
      { threshold: 0.1 }
    );
    
    document.querySelectorAll(".fade-section").forEach(section => observer.observe(section));
    
    // Check if already installed
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isPWA) {
      setShowInstallButton(false);
    }
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const updateActiveSection = () => {
    const sections = [
      { id: 'home', ref: heroRef },
      { id: 'about', ref: aboutRef },
      { id: 'mass', ref: massRef },
      { id: 'connect', ref: connectRef },
      { id: 'contact', ref: contactRef }
    ];

    const scrollPosition = window.scrollY + 100;

    for (const section of sections) {
      if (section.ref.current) {
        const { offsetTop, offsetHeight } = section.ref.current;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  };

  const scrollToSection = (sectionId) => {
    const sectionRef = {
      home: heroRef,
      about: aboutRef,
      mass: massRef,
      connect: connectRef,
      contact: contactRef
    }[sectionId];

    if (sectionRef?.current) {
      const offset = 70;
      const elementPosition = sectionRef.current.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Notification prompt
  useEffect(() => {
    const token = localStorage.getItem('token');
    const notificationsPrompted = localStorage.getItem('notificationsPrompted');
    
    if (token && !notificationsPrompted && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallButton(false);
      }
    } else {
      alert(
        '📱 To install ZUCA Portal on your device:\n\n' +
        '🔵 Android (Chrome):\n' +
        '• Tap the menu button (⋮) at top right\n' +
        '• Select "Add to Home screen"\n' +
        '• Tap "Add" or "Install"\n\n' +
        '🍎 iPhone/iPad (Safari):\n' +
        '• Tap the Share button (📤) at bottom\n' +
        '• Scroll down and tap "Add to Home Screen"\n' +
        '• Tap "Add" in top right\n\n' +
        '💻 Desktop (Chrome/Edge):\n' +
        '• Click the install icon (➕) in address bar\n' +
        '• Click "Install"'
      );
    }
  };

  return (
    <div className="landing-wrapper">
      {/* Top Bar - Hidden on mobile */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <FaHandsHelping className="top-bar-icon" />
            <span>Zetech Catholic Action • Faith & Fellowship</span>
          </div>
          <div className="top-bar-right">
            <span className="mass-badge">Weekly Mass: Wednesday 4:30 PM</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`navbar ${scrollY > 50 ? 'navbar-scrolled' : ''}`}>
        <div className="nav-container">
          <div className="logo-container">
            <img src={logo} alt="ZUCA Logo" className="logo-img" />
            <span className="logo-text">ZUCA</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="nav-links-desktop">
            <button onClick={() => scrollToSection('home')} className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}>Home</button>
            <button onClick={() => scrollToSection('about')} className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}>About</button>
            <button onClick={() => scrollToSection('connect')} className={`nav-link ${activeSection === 'connect' ? 'active' : ''}`}>Connect</button>
            <button onClick={() => scrollToSection('mass')} className={`nav-link ${activeSection === 'mass' ? 'active' : ''}`}>Mass</button>
          </div>
          
          {/* Mobile Menu Button */}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        <div className={`nav-links-mobile ${mobileMenuOpen ? 'open' : ''}`}>
          <button onClick={() => scrollToSection('home')} className="nav-link-mobile">Home</button>
          <button onClick={() => scrollToSection('about')} className="nav-link-mobile">About</button>
          <button onClick={() => scrollToSection('connect')} className="nav-link-mobile">Connect</button>
          <button onClick={() => scrollToSection('mass')} className="nav-link-mobile">Mass</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" ref={heroRef} className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-container">
          {/* Floating Action Buttons */}
          <div className="floating-actions">
            <div className="floating-card">
              <div className="floating-card-inner">
                <img src={logo} alt="ZUCA Logo" className="floating-logo" />
                <div className="floating-buttons">
                  {showInstallButton && (
                    <button onClick={handleInstallClick} className="btn-install">
                      <FaDownload /> Install
                    </button>
                  )}
                  <button onClick={() => navigate("/gallery")} className="btn-gallery">
                    📷 ZUCA GALLERY
                  </button>
                  <button onClick={() => navigate("/liturgical-calendar")} className="btn-calendar">
                    📅 Liturgical Calendar
                  </button>
                  <button onClick={() => navigate("/register")} className="btn-register">
                    Join Us
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-header">
              <img src={logo} alt="ZUCA Logo" className="welcome-logo" />
              <h2 className="welcome-title">Zetech University</h2>
            </div>
            <div className="welcome-subtitle">CATHOLIC ACTION</div>
            <div className="zuca-name">(Z.U.C.A)</div>
            <p className="welcome-text">
              Welcome to the Zetech University Catholic Action Portal. Here you can view announcements, 
              explore mass schedules and other relevant programs, and connect with members — all in one powerful platform.
            </p>
            <div className="welcome-buttons">
              <button onClick={() => navigate("/register")} className="btn-primary">
                <FaUserPlus /> REGISTER
              </button>
              <button onClick={() => navigate("/login")} className="btn-secondary">
                <FaSignInAlt /> MEMBER LOGIN
              </button>
            </div>
          </div>

          {/* Mass Info Card */}
          <div className="mass-info-card">
            <FaChurch className="mass-info-icon" />
            <div className="mass-info-text">
              <strong>Wednesday Mass:</strong> 4:30 PM
              <span className="mass-location">Annex Building 002</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mass Schedule Section */}
      <section id="mass" ref={massRef} className="section mass-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaPray className="section-icon" />
            <h2 className="section-title">Weekly Mass & Choir Practice</h2>
            <p className="section-subtitle">Join us in prayer and Jumuia</p>
          </div>

          <div className="mass-cards">
            <div className="mass-card">
              <FaChurch className="card-icon" />
              <h3 className="card-title">Wednesday Mass</h3>
              <div className="card-info">
                <FaClock className="info-icon" />
                <span>4:30 PM</span>
              </div>
              <div className="card-info">
                <FaLocationArrow className="info-icon" />
                <span>Annex Building 002</span>
              </div>
              <p className="card-note">come join us!</p>
            </div>

            <div className="mass-card">
              <FaPray className="card-icon" />
              <h3 className="card-title">Daily Choir Practice</h3>
              <div className="card-info">
                <FaClock className="info-icon" />
                <span>4:00 PM - 6:00 PM</span>
              </div>
              <div className="card-info">
                <FaLocationArrow className="info-icon" />
                <span>ZETECH ANNEX 002</span>
              </div>
              <p className="card-note">All are welcome to attend</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Section */}
      <section id="connect" ref={connectRef} className="section social-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaHeart className="section-icon" />
            <h2 className="section-title-light">Connect With Us</h2>
            <p className="section-subtitle-light">Follow our community on social media</p>
          </div>

          <div className="social-grid">
            <a href="https://www.instagram.com/zetechcatholicaction?igsh=d211Y2htZW9qbGU3" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle instagram">
                <FaInstagram />
              </div>
              <span className="social-platform">Instagram</span>
              <span className="social-handle">@zetechcatholicaction</span>
            </a>

            <a href="https://www.facebook.com/share/1ELDK56qEJ" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle facebook">
                <FaFacebookF />
              </div>
              <span className="social-platform">Facebook</span>
              <span className="social-handle">Zetech Catholic Action</span>
            </a>

            <a href="https://www.youtube.com/@zetechUniversityCatholic" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle youtube">
                <FaYoutube />
              </div>
              <span className="social-platform">YouTube</span>
              <span className="social-handle">Subscribe for New Releases</span>
            </a>

            <a href="https://www.tiktok.com/@zetechcatholicaction?_t=ZM-8yeypKK8YpM&_r=1" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle tiktok">
                <FaTiktok />
              </div>
              <span className="social-platform">TikTok</span>
              <span className="social-handle">@zetechcatholicaction</span>
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" ref={aboutRef} className="section about-section fade-section">
        <div className="container">
          <div className="section-header">
            <img src={logo} alt="ZUCA Logo" className="about-logo" />
            <h2 className="section-title-dark">Our Community</h2>
          </div>

          <div className="about-content">
            <p className="about-text">
              Zetech Catholic Action is a vibrant student group committed to evangelism, faith, and fellowship 
              through music and action. Our mission is to spread the message of hope, love, and faith within 
              our campus community and beyond. Our songs will be an expression of our devotion and a call to 
              all to embrace God's grace.
            </p>

            <div className="activities-grid">
              <div className="activity-item">
                <FaChurch className="activity-icon" />
                <span>Weekly Mass</span>
              </div>
              <div className="activity-item">
                <FaMusic className="activity-icon" />
                <span>St Kizito Choir</span>
              </div>
              <div className="activity-item">
                <FaUsers className="activity-icon" />
                <span>Jumuiyas</span>
              </div>
              <div className="activity-item">
                <FaHandsHelping className="activity-icon" />
                <span>Outdoor functions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section contact-section fade-section" ref={contactRef}>
        <div className="container">
          <div className="section-header">
            <FaEnvelope className="section-icon-light" />
            <h2 className="section-title-light">Get In Touch</h2>
          </div>

          <div className="contact-grid">
            <div className="contact-item">
              <FaMapMarkerAlt className="contact-icon" />
              <span>Zetech C/A, Ruiru</span>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
              <a href="mailto:zucaportal2025@gmail.com" className="contact-link">zucaportal2025@gmail.com</a>
            </div>
            <div className="contact-item">
              <FaPhone className="contact-icon" />
              <span>zuca406@gmail.com</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-social">
            <a href="https://www.instagram.com/zetechcatholicaction" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaInstagram />
            </a>
            <a href="https://www.facebook.com/share/1ELDK56qEJ" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaFacebookF />
            </a>
            <a href="https://www.youtube.com/@zetechUniversityCatholic" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaYoutube />
            </a>
            <a href="https://www.tiktok.com/@zetechcatholicaction" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaTiktok />
            </a>
          </div>

          {showInstallButton && (
            <div className="footer-install">
              <button onClick={handleInstallClick} className="btn-install-footer">
                <FaDownload /> Install ZUCA App
              </button>
            </div>
          )}

          <div className="footer-credit">
            <span>Built with</span>
            <FaHeart className="credit-heart" />
            <span>by</span>
            <span className="credit-name">@CHRISTECH WEBSYS</span>
          </div>

          <div className="footer-copyright">
            <p>© {new Date().getFullYear()} Zetech Catholic Action Portal</p>
          </div>
        </div>
      </footer>

      {/* Notification Prompt */}
      {showNotificationPrompt && (
        <NotificationPrompt onClose={() => {
          setShowNotificationPrompt(false);
          localStorage.setItem('notificationsPrompted', 'true');
        }} />
      )}

      <style jsx>{`
        /* Reset and Base Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'TimesNewRoman', Roboto, sans-serif;
          color: #ffffff;
          overflow-x: hidden;
          min-height: 100vh;
          background: #0a0a1e;
        }

        /* Top Bar */
        .top-bar {
          background: rgba(20, 28, 96, 0.95);
          padding: 8px 20px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1001;
          backdrop-filter: blur(10px);
        }

        .top-bar-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .top-bar-icon {
          color: #ffd700;
          font-size: 12px;
        }

        .mass-badge {
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
        }

        /* Navigation */
        .navbar {
          position: fixed;
          top: 36px;
          left: 0;
          right: 0;
          z-index: 1000;
          transition: all 0.3s ease;
          background: transparent;
        }

        .navbar-scrolled {
          background: rgba(11, 11, 31, 0.95);
          backdrop-filter: blur(10px);
          top: 0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-img {
          width: 40px;
          height: auto;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #00c6ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-links-desktop {
          display: flex;
          gap: 30px;
        }

        .nav-link {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 0;
          position: relative;
          transition: all 0.3s;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #00c6ff, #007bff);
          transition: width 0.3s;
        }

        .nav-link:hover::after,
        .nav-link.active::after {
          width: 100%;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
        }

        .nav-links-mobile {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(11, 11, 31, 0.98);
          backdrop-filter: blur(10px);
          flex-direction: column;
          padding: 20px;
          gap: 15px;
          transform: translateY(-100%);
          transition: transform 0.3s ease;
        }

        .nav-links-mobile.open {
          transform: translateY(0);
          display: flex;
        }

        .nav-link-mobile {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          padding: 12px;
          text-align: center;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.3s;
        }

        .nav-link-mobile:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Hero Section */
        .hero-section {
          min-height: 100vh;
          background-image: url(${bg});
          background-size: cover;
          background-position: center;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(10, 10, 30, 0.85), rgba(10, 177, 29, 0.2));
        }

        .hero-container {
          position: relative;
          z-index: 2;
          max-width: 900px;
          width: 100%;
          text-align: center;
        }

        /* Floating Actions */
        .floating-actions {
          margin-bottom: 30px;
        }

        .floating-card {
          background: rgba(32, 32, 41, 0.78);
          backdrop-filter: blur(10px);
          border-radius: 60px;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: inline-block;
          max-width: 100%;
        }

        .floating-card-inner {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(16, 75, 238, 0.17);
          border-radius: 60px;
          padding: 7px 20px 7px 7px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .floating-logo {
          width: 55px;
          height: 55px;
          border-radius: 50%;
          border: 2px solid #00c6ff;
        }

        .floating-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-install,
        .btn-gallery,
        .btn-calendar,
        .btn-register {
          padding: 8px 20px;
          border-radius: 30px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s;
        }

        .btn-install {
          background: linear-gradient(135deg, #ffd700, #ffaa00);
          color: #000;
        }

        .btn-gallery {
          background: linear-gradient(135deg, #0c992d, #0a7a24);
          color: white;
        }

        .btn-calendar {
          background: linear-gradient(135deg, #2896b5, #007bff);
          color: white;
        }

        .btn-register {
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          color: white;
        }

        .btn-install:hover,
        .btn-gallery:hover,
        .btn-calendar:hover,
        .btn-register:hover {
          transform: translateY(-2px);
        }

        /* Welcome Card */
        .welcome-card {
          background: rgba(31, 97, 196, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: clamp(30px, 5vw, 40px) clamp(20px, 4vw, 30px);
          margin: 0 auto 25px;
          max-width: 600px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .welcome-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .welcome-logo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid #00c6ff;
        }

        .welcome-title {
          font-size: clamp(20px, 5vw, 24px);
          font-weight: 800;
          color: white;
        }

        .welcome-subtitle {
          font-size: clamp(24px, 6vw, 32px);
          font-weight: 900;
          background: linear-gradient(135deg, #00c6ff, #007bff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
        }

        .zuca-name {
          font-size: clamp(16px, 4vw, 20px);
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 20px;
        }

        .welcome-text {
          font-size: clamp(14px, 3vw, 16px);
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .welcome-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 28px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          color: white;
        }

        .btn-secondary {
          background: transparent;
          border: 2px solid #00c6ff;
          color: white;
        }

        .btn-primary:hover,
        .btn-secondary:hover {
          transform: translateY(-2px);
        }

        /* Mass Info Card */
        .mass-info-card {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(5px);
          padding: 12px 24px;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          margin: 0 auto;
        }

        .mass-info-icon {
          font-size: 20px;
          color: #00c6ff;
        }

        .mass-info-text {
          font-size: 14px;
          text-align: left;
        }

        .mass-location {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* General Section Styles */
        .section {
          padding: 60px 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .section-icon {
          font-size: 48px;
          color: #00c6ff;
          margin-bottom: 20px;
        }

        .section-icon-light {
          font-size: 48px;
          color: #00c6ff;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 800;
          margin-bottom: 15px;
          color: white;
        }

        .section-title-light {
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 800;
          margin-bottom: 15px;
          color: white;
        }

        .section-title-dark {
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 800;
          margin-bottom: 15px;
          color: #0a0a25;
        }

        .section-subtitle,
        .section-subtitle-light {
          font-size: 16px;
          color: #94a3b8;
        }

        /* Mass Section */
        .mass-section {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
        }

        .mass-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          max-width: 700px;
          margin: 0 auto;
        }

        .mass-card {
          background: rgba(255, 255, 255, 0.08);
          padding: 35px 25px;
          border-radius: 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.3s;
        }

        .mass-card:hover {
          transform: translateY(-5px);
        }

        .card-icon {
          font-size: 48px;
          color: #00c6ff;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 20px;
          color: white;
        }

        .card-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 12px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .info-icon {
          font-size: 14px;
          color: #00c6ff;
        }

        .card-note {
          font-size: 13px;
          color: #94a3b8;
          font-style: italic;
          margin-top: 15px;
        }

        /* Social Section */
        .social-section {
          background: #0a0a25;
        }

        .social-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 25px;
          max-width: 900px;
          margin: 0 auto;
        }

        .social-card {
          padding: 30px 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s;
          cursor: pointer;
        }

        .social-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.1);
        }

        .social-icon-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 5px;
        }

        .social-icon-circle.instagram {
          background: radial-gradient(circle at 30% 30%, #f09433, #d62976, #962fbf);
        }

        .social-icon-circle.facebook {
          background: #1877F2;
        }

        .social-icon-circle.youtube {
          background: #FF0000;
        }

        .social-icon-circle.tiktok {
          background: #000000;
        }

        .social-platform {
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .social-handle {
          font-size: 11px;
          color: #94a3b8;
        }

        /* About Section */
        .about-section {
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        }

        .about-logo {
          width: 70px;
          height: auto;
          margin-bottom: 20px;
        }

        .about-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .about-text {
          font-size: 18px;
          line-height: 1.7;
          color: #1e293b;
          text-align: center;
          margin-bottom: 40px;
        }

        .activities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          max-width: 500px;
          margin: 0 auto;
        }

        .activity-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px;
          background: white;
          border-radius: 12px;
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .activity-icon {
          font-size: 18px;
          color: #00c6ff;
        }

        /* Contact Section */
        .contact-section {
          background: linear-gradient(135deg, #0f172a, #1e293b);
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .contact-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          font-size: 14px;
          color: white;
        }

        .contact-icon {
          font-size: 18px;
          color: #00c6ff;
        }

        .contact-link {
          color: white;
          text-decoration: none;
          transition: color 0.3s;
        }

        .contact-link:hover {
          color: #00c6ff;
        }

        /* Footer */
        .footer {
          background: #0f0f1a;
          padding: 40px 20px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-social {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .footer-social-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          transition: all 0.3s;
        }

        .footer-social-icon:hover {
          background: #00c6ff;
          transform: translateY(-3px);
        }

        .footer-install {
          margin-bottom: 25px;
        }

        .btn-install-footer {
          padding: 12px 28px;
          border-radius: 30px;
          border: none;
          background: linear-gradient(135deg, #ffd700, #ffaa00);
          color: #000;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .footer-credit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 15px;
          font-size: 14px;
          color: #94a3b8;
        }

        .credit-heart {
          color: #ff6b6b;
        }

        .credit-name {
          color: #00c6ff;
          font-weight: 600;
        }

        .footer-copyright {
          font-size: 12px;
          color: #64748b;
        }

        /* Animations */
        .fade-section {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease;
        }

        .fade-section.fade-in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .top-bar {
            display: none;
          }

          .navbar {
            top: 0;
          }

          .nav-links-desktop {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .floating-card-inner {
            padding: 7px 15px;
          }

          .floating-logo {
            width: 45px;
            height: 45px;
          }

          .btn-install,
          .btn-gallery,
          .btn-calendar,
          .btn-register {
            padding: 6px 14px;
            font-size: 11px;
          }

          .mass-cards {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .social-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }

          .activities-grid {
            grid-template-columns: 1fr;
          }

          .contact-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .section {
            padding: 40px 16px;
          }

          .welcome-buttons {
            flex-direction: column;
            gap: 12px;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .social-grid {
            grid-template-columns: 1fr;
          }

          .floating-buttons {
            flex-direction: column;
            width: 100%;
          }

          .btn-install,
          .btn-gallery,
          .btn-calendar,
          .btn-register {
            width: 100%;
            justify-content: center;
          }

          .mass-info-card {
            flex-direction: column;
            text-align: center;
            padding: 15px;
          }

          .mass-info-text {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default Landing2;