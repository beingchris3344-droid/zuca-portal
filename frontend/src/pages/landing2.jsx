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
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaPause,
  FaPlay
} from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import logo from "../assets/zuca-logo.png";
// Slideshow images 
import slide1 from "../assets/background2.webp";
import slide2 from "../assets/2.jpg"; 
import slide3 from "../assets/3.jpg"; 
import slide4 from "../assets/4.jpg"; 
import slide5 from "../assets/5.jpg"; 
import slide6 from "../assets/6.jpg";
import slide7 from "../assets/7.jpg";
import slide8 from "../assets/8.jpg";
import slide9 from "../assets/9.jpg";
import slide10 from "../assets/10.jpg";
import slide11 from "../assets/11.jpg";
import slide12 from "../assets/12.jpg";
import NotificationPrompt from '../components/NotificationPrompt';

function Landing2() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const massRef = useRef(null);
  const connectRef = useRef(null);
  const contactRef = useRef(null);
  const slideIntervalRef = useRef(null);
  const slideshowRef = useRef(null);

  // Slideshow images array
  const slides = [
    { id: 1, image: slide1, title: "Welcome to ZUCA", description: "Faith & Fellowship" },
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

  // Slideshow navigation functions
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
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
          <div className="logo-container" onClick={() => scrollToSection('home')} style={{ cursor: 'pointer' }}>
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

      {/* Hero Section with Slideshow */}
      <section id="home" ref={heroRef} className="hero-section">
        {/* Slideshow Background */}
        <div 
          className="slideshow-container"
          ref={slideshowRef}
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
          
          {/* Slideshow Navigation Arrows */}
          <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
            <FaChevronLeft />
          </button>
          <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
            <FaChevronRight />
          </button>
          
          {/* Slideshow Dots */}
          <div className="slideshow-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          
          {/* Play/Pause Button */}
          <button className="slideshow-play-pause" onClick={togglePlayPause}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
        </div>

        <div className="hero-container">
          {/* Action Buttons Row - Independently arranged */}
          <div className="action-buttons-row">
            {showInstallButton && (
              <button onClick={handleInstallClick} className="action-btn action-btn-install">
                <FaDownload /> Install Our App
              </button>
            )}
            <button onClick={() => navigate("/gallery")} className="action-btn action-btn-gallery">
              📷 Our Gallery
            </button>
            <button onClick={() => navigate("/liturgical-calendar")} className="action-btn action-btn-calendar">
              📅 Liturgical Calendar
            </button>
            <button onClick={() => navigate("/user-manual")} className="action-btn action-btn-register">
              <FaUserPlus /> 📚 Our User's Manual
            </button>
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
              Welcome to the Zetech University Catholic Action official Portal. All in one place where you can view announcements, 
              explore mass schedules and other relevant programs, and also connect with other members — all in one powerful platform.
            </p>
            <div className="welcome-buttons">
              <button onClick={() => navigate("/register")} className="btn-primary">
                <FaUserPlus /> REGISTER
              </button>
              <p>OR</p>
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
            <h2 className="section-title-dark">Our History</h2>
          </div>

          <div className="about-content">
            <p className="about-text">
             <strong>St. Kizito ZUCA</strong> was established in <strong>October 2018</strong> by a 
group of Catholic students who met at school and decided to recite the Holy Rosary in the evenings. When Madam 
Veronica happened to pass by, she noticed them and helped formalize the initiative into a structured group. The students continued with their practice until July, when the group was officially launched as a club at Zetech University.
</p>

<p className="about-text">
Madam Veronica became the group's matron, and Mr. Martin Butita became the patron. The first leadership team was composed of <strong>Magige Brian</strong> as chairperson, <strong>Shiru</strong> as vice moderator, <strong>Nick</strong> as secretary, and <strong>Petronila</strong> as organizing secretary.
</p>

<p className="about-text">
The second chairperson was <strong>Collins Nalwa</strong>, with <strong>Daisy Chepngetich</strong> serving as his vice. Thereafter, <strong>Faustine</strong> assumed the role of chairperson, with <strong>Josephine Owuor</strong> as vice. Josephine later took over as chairperson for a period of about two months, during which <strong>Cheru</strong> served as her vice. Following further consultations and a challenging term of leadership, their roles were exchanged: <strong>Cheru</strong> became chairperson, and <strong>Josephine</strong> became vice. Shortly afterward, <strong>Josephine</strong> stepped down from the vice chair position, and <strong>Phelister</strong> took over the role.
</p>

<p className="about-text">
After their tenure, <strong>Raphael Kamura</strong> was appointed chairperson, with <strong>Brighet</strong> as his assistant. Due to other commitments, <strong>Raphael</strong> stepped down, leading to the appointment of <strong>Sylvester</strong> as chairperson 
while <strong>Brighet</strong> remained as assistant chairperson. Subsequently, <strong>Brighet</strong> stepped down upon 
completing her studies, and <strong>Cecilia</strong> was appointed as vice moderator. Currently, <strong>Tonny</strong> serves as the chairperson and to day <strong>ZUCA</strong> is still growing.
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
                <span>Jumuias</span>
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
              <span>Zetech University , Ruiru</span>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
              <a href="mailto:zucaportal2025@gmail.com" className="contact-link">zucaportal2025@gmail.com</a>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
                            <a href="mailto:zucaportal2025@gmail.com" className="contact-link">zuca406@gmail.com</a>

              <span></span>
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
            <span></span>
            
            <span></span>
            <span className="credit-name"></span>
          </div>

          <div className="footer-copyright">
            <p>© {new Date().getFullYear()} Zetech Catholic Action Portal</p>
            <p>Built by @CHRISTECH WEBSYS</p>
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
          background: rgba(30, 46, 192, 0.95);
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

        /* Hero Section with Slideshow */
        .hero-section {
          min-height: 100vh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
          overflow: hidden;
        }

        .slideshow-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
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
          background: linear-gradient(135deg, rgba(10, 10, 30, 0.23), rgba(10, 177, 29, 0.2));
          z-index: 1;
        }

        /* Slideshow Navigation Arrows */
        .slideshow-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.03);
          backdrop-filter: blur(1px);
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
          font-size: 20px;
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

        /* Slideshow Dots */
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

        /* Play/Pause Button */
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
          font-size: 14px;
        }

        .slideshow-play-pause:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: scale(1.05);
        }

        .hero-container {
          position: relative;
          z-index: 10;
          max-width: 900px;
          width: 100%;
          text-align: center;
        }

        /* Action Buttons Row - Clean independent arrangement */
        .action-buttons-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }

        .action-btn {
          padding: 12px 24px;
          border-radius: 40px;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }

        .action-btn:hover {
          transform: translateY(-3px);
          filter: brightness(1.05);
        }

        .action-btn-install {
          background: linear-gradient(135deg, #ffd700, #ffaa00);
          color: #1a1a2e;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }

        .action-btn-gallery {
          background: linear-gradient(135deg, #0c992d, #0a7a24);
          color: white;
          box-shadow: 0 4px 15px rgba(12, 153, 45, 0.3);
        }

        .action-btn-calendar {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
          color: white;
          box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);
        }

        .action-btn-register {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          color: white;
          box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);
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
          color: white;
        }

        .social-icon-circle.facebook {
          background: #0214dc;
          color: #ffffff;
        }

        .social-icon-circle.youtube {
          background: #FF0000;
          color: white;
        }

        .social-icon-circle.tiktok {
          background: #000000;
          color: white;
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

          .action-buttons-row {
            gap: 12px;
          }

          .action-btn {
            padding: 8px 16px;
            font-size: 12px;
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

          .slideshow-nav {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .slideshow-nav-prev {
            left: 10px;
          }

          .slideshow-nav-next {
            right: 10px;
          }

          .slideshow-play-pause {
            width: 36px;
            height: 36px;
            font-size: 12px;
            bottom: 15px;
            right: 15px;
          }
        }

        @media (max-width: 480px) {
          .social-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons-row {
            flex-direction: column;
            width: 100%;
          }

          .action-btn {
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

          .slideshow-nav {
            width: 30px;
            height: 30px;
            font-size: 14px;
          }

          .dot {
            width: 8px;
            height: 8px;
          }

          .dot.active {
            width: 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default Landing2;