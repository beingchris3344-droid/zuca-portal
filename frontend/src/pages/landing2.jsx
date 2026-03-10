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
  FaBell,
  FaCalendarAlt,
  FaHandsHelping,
  FaHeart,
  FaCross,
  FaPray,
  FaClock,
  FaLocationArrow,
  FaBold,
  FaUnderline,
  FaHammer,
  FaFontAwesomeLogoFull,
  FaHandPointDown
} from "react-icons/fa";
import { useEffect, useState } from "react";
import logo from "../assets/zuca-logo.png";
import bg from "../assets/background2.webp";
import { FiUnderline } from "react-icons/fi";

function Landing2() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
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
      { threshold: 0.2 }
    );
    
    document.querySelectorAll(".fade-section").forEach(section => observer.observe(section));
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div style={pageWrapper}>
      {/* Simple Top Bar with Just Basic Info */}
      <div style={topBarStyle}>
        <div style={topBarContentStyle}>
          <div style={topBarLeftStyle}>
            <FaHandsHelping style={topBarHeartStyle} />
            <span>Zetech Catholic Action • Faith & Fellowship</span>
          </div>
          <div style={topBarRightStyle}>
            <span style={topBarMassStyle}>Weekly Mass: Wednesday 4:30 PM</span>
          </div>
        </div>
      </div>

      {/* Simple Navigation */}
      <nav style={{ ...navStyle, background: scrollY > 50 ? "rgba(33, 33, 222, 0.9)" : "transparent", backdropFilter: scrollY > 50 ? "blur(10px)" : "none" }}>
        <div style={navContentStyle}>
          <div style={logoContainerStyle}>
            <img src={logo} alt="ZUCA Logo" style={logoStyle} />
            <span style={logoTextStyle}>ZUCA</span>
          </div>
          <div style={navLinksStyle}>
            <a href="#home" style={navLinkStyle}>Home</a>
            <a href="#about" style={navLinkStyle}>About</a>
            <a href="#connect" style={navLinkStyle}>Connect</a>
            <a href="#mass" style={navLinkStyle}>Mass</a>
            <button onClick={() => navigate("/login")} style={navButtonStyle}>Login</button>
            <button onClick={() => navigate("/register")} style={navButtonPrimaryStyle}>Join Us</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" style={heroStyle(bg)}>
        <div style={heroOverlayStyle} />
        <div style={heroContentStyle}>
          <img src={logo} alt="ZUCA Logo" style={heroLogoStyle} />
          <h1 style={heroTitleStyle}>
            <span style={heroMassIconStyle}>Zetech University Catholic Action </span>
            <br />
            <span style={gradientTextStyle}>Z U C A - PORTAL</span>
          </h1>
          <p style={heroSubtitleStyle}>
            Join us on this spiritual journey as we use the power of music to inspire, uplift, and evangelize. Don't forget to like, share, and subscribe for more inspiring content from Zetech Catholic Action!
          </p>
          
          {/* Simple Mass Info Card */}
          <div style={heroMassCardStyle}>
            <FaChurch style={heroMassIconStyle} />
            <div style={heroMassTextStyle}>
              <strong style={{ color: "#00c6ff" }}>Wednesday Mass:</strong> 4:30 PM
              <span style={{ display: "block", fontSize: "14px", color: "#94a3b8" }}>Annex Building 002:</span>
            </div>
          </div>
          
          <div style={heroButtonsStyle}>
            <button onClick={() => navigate("/register")} style={heroButtonPrimaryStyle}>
              REGISTER ZUCA
            </button>
            <button onClick={() => navigate("/login")} style={heroButtonSecondaryStyle}>
              MEMBER LOGIN
            </button>
          </div>
        </div>
      </section>

      {/* Mass Schedule Section - Prominent */}
      <section id="mass" className="fade-section" style={massSectionStyle}>
        <div style={sectionContainerStyle}>
          <div style={massHeaderStyle}>
            <FaPray style={massIconStyle} />
            <h2 style={massTitleStyle}>Weekly Mass & Choir Practice</h2>
            <p style={massSubtitleStyle}>Join us in prayer and Jumuia</p>
          </div>

          <div style={massCardsStyle}>
            <div style={massCardStyle}>
              <FaChurch style={massCardIconStyle} />
              <h3 style={massCardTitleStyle}>Wednesday Mass</h3>
              <div style={massTimeStyle}>
                <FaClock style={massTimeIconStyle} />
                <span>4:30 PM</span>
              </div>
              <div style={massLocationStyle}>
                <FaLocationArrow style={massLocationIconStyle} />
                <span>Annex Building 002</span>
              </div>
              <p style={massNoteStyle}>come join us!</p>
            </div>

            <div style={massCardStyle}>
              <FaPray style={massCardIconStyle} />
              <h3 style={massCardTitleStyle}>Daily Choir Practice</h3>
              <div style={massTimeStyle}>
                <FaClock style={massTimeIconStyle} />
                <span>From (4:00 PM - 6:00 PM</span>
              </div>
              <div style={massLocationStyle}>
                <FaLocationArrow style={massLocationIconStyle} />
                <span>ZETECH ANNEX 002 </span>
              </div>
              <p style={massNoteStyle}>All are welcome to attend</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Section - Medium Icons */}
      <section id="connect" className="fade-section" style={socialSectionStyle}>
        <div style={sectionContainerStyle}>
          <div style={sectionHeaderStyle}>
            <FaHeart style={sectionIconStyle} />
            <h2 style={sectionTitleLightStyle}>Connect With Us</h2>
            <p style={sectionSubtitleStyle}>Follow our community on social media</p>
          </div>

          {/* Medium-sized Social Icons Grid */}
          <div style={socialGridStyle}>
            <a 
              href="https://www.instagram.com/zetechcatholicaction?igsh=d211Y2htZW9qbGU3" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={socialCardStyle}
            >
              <div style={{ ...socialIconCircleStyle, background: "radial-gradient(circle at 30% 30%, #f09433, #d62976, #962fbf)" }}>
                <FaInstagram style={socialIconStyle} />
              </div>
              <span style={socialPlatformStyle}>Instagram</span>
              <span style={socialHandleStyle}>@zetechcatholicaction</span>
            </a>

            <a 
              href="https://www.facebook.com/share/1ELDK56qEJ" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={socialCardStyle}
            >
              <div style={{ ...socialIconCircleStyle, background: "#1877F2" }}>
                <FaFacebookF style={socialIconStyle} />
              </div>
              <span style={socialPlatformStyle}>Facebook</span>
              <span style={socialHandleStyle}>Zetech Catholic Action</span>
            </a>

            <a 
              href="https://www.youtube.com/@zetechUniversityCatholic" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={socialCardStyle}
            >
              <div style={{ ...socialIconCircleStyle, background: "#FF0000" }}>
                <FaYoutube style={socialIconStyle} />
              </div>
              <span style={socialPlatformStyle}>YouTube</span>
              <span style={socialHandleStyle}>Subscribe for New Releases</span>
            </a>

            <a 
              href="https://www.tiktok.com/@zetechcatholicaction?_t=ZM-8yeypKK8YpM&_r=1" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={socialCardStyle}
            >
              <div style={{ ...socialIconCircleStyle, background: "#000000" }}>
                <FaTiktok style={socialIconStyle} />
              </div>
              <span style={socialPlatformStyle}>TikTok</span>
              <span style={socialHandleStyle}>@zetechcatholicaction</span>
            </a>
          </div>
        </div>
      </section>

      {/* About Section - Simple */}
      <section id="about" className="fade-section" style={aboutSectionStyle}>
        <div style={sectionContainerStyle}>
          <div style={sectionHeaderStyle}>

                        <img src={logo} alt="ZUCA Logo" style={logoStyle} />

            <h2 style={sectionTitleDarkStyle}>Our Community</h2>
            
          </div>

          <div style={aboutContentStyle}>
            <p style={aboutTextStyle}>
              Zetech Catholic Action is a vibrant student group committed to evangelism, faith, and fellowship through music and action. Our mission is to spread the message of hope, love, and faith within our campus community and beyond. Our songs will be an  expression of our devotion and a call to all to embrace God’s grace.
            </p>

            <div style={activitiesGridStyle}>
              <div style={activityItemStyle}>
                <FaChurch style={activityIconStyle} />
                <span>Weekly Mass</span>
              </div>
              <div style={activityItemStyle}>
                <FaMusic style={activityIconStyle} />
                <span>St Kizito Choir</span>
              </div>
              <div style={activityItemStyle}>
                <FaUsers style={activityIconStyle} />
                <span>Jumuias</span>
              </div>
              <div style={activityItemStyle}>
                <FaHandsHelping style={activityIconStyle} />
                <span>Outdoor functions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="fade-section" style={contactSectionStyle}>
        <div style={sectionContainerStyle}>
          <div style={sectionHeaderStyle}>
            <FaEnvelope style={sectionIconLightStyle} />
            <h2 style={sectionTitleLightStyle}>Get In Touch</h2>
          </div>

          <div style={contactSimpleGridStyle}>
            <div style={contactSimpleItemStyle}>
              <FaMapMarkerAlt style={contactSimpleIconStyle} />
              <span>Zetech C/A, Ruiru</span>
            </div>
            <div style={contactSimpleItemStyle}>
              <FaEnvelope style={contactSimpleIconStyle} />
              <a href="mailto:zucaportal2025@gmail.com" style={contactSimpleLinkStyle}>zucaportal2025@gmail.com</a>
            </div>
            <div style={contactSimpleItemStyle}>
              <FaPhone style={contactSimpleIconStyle} />
              <span>zuca406@gmail.com</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Credit */}
      <footer style={footerStyle}>
        <div style={footerContentStyle}>
          <div style={footerSocialMinStyle}>
            <a href="https://www.instagram.com/zetechcatholicaction" target="_blank" rel="noopener noreferrer" style={footerSocialMinIconStyle}>
              <FaInstagram />
            </a>
            <a href="https://www.facebook.com/share/1ELDK56qEJ" target="_blank" rel="noopener noreferrer" style={footerSocialMinIconStyle}>
              <FaFacebookF />
            </a>
            <a href="https://www.youtube.com/@zetechUniversityCatholic" target="_blank" rel="noopener noreferrer" style={footerSocialMinIconStyle}>
              <FaYoutube />
            </a>
            <a href="https://www.tiktok.com/@zetechcatholicaction" target="_blank" rel="noopener noreferrer" style={footerSocialMinIconStyle}>
              <FaTiktok />
            </a>
          </div>

          <div style={creditStyle}>
            <span>Built with</span>
            <FaHeart style={creditHeartStyle} />
            <span>by</span>
            <span style={creditNameStyle}> @CHRISTECH WEBSYS;</span>
          </div>

          <div style={copyrightStyle}>
            <p>© {new Date().getFullYear()} Zetech Catholic Action  Portal</p>
          </div>
        </div>
      </footer>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .fade-section {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s ease;
          }
          
          .fade-section.fade-in {
            opacity: 1;
            transform: translateY(0);
          }
          
          @media (max-width: 768px) {
            nav {
              padding: 10px 0;
            }
            
            .social-card {
              margin: 10px;
            }
          }
        `}
      </style>
    </div>
  );
}

// Styles - All Responsive
const pageWrapper = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'TimesNewRoman', Roboto, sans-serif",
  color: "#ffffff",
  overflowX: "hidden"
};

// Top Bar - Simple
const topBarStyle = {
  background: "#141c60c0",
  padding: "8px ",
  position: "fixed",
  top: -6,
  left: 0,
  right: 0,
  zIndex: 1001,
  borderBottom: "4px solid rgba(13, 123, 197, 0.97)"
};

const topBarContentStyle = {
  maxWidth: "1300px",
  margin: "0 auto",
  padding: "0 50px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  flexWrap: "wrap",
  
  gap: "1px"
};

const topBarLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#ffffff"
};

const topBarHeartStyle = {
  color: "#efeff3",
  fontSize: "12px"
};

const topBarRightStyle = {
  color: "#ffffff",
  fontWeight: "900"
};

const topBarMassStyle = {
  fontSize: "13px"
};

// Navigation
const navStyle = {
  position: "fixed",
  top: "36px",
  left: 0,
  right: 0,
  zIndex: 1000,
  transition: "all 0.3s ease",
  padding: "10px 0"
};

const navContentStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "15px"
};

const logoContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const logoStyle = {
  width: "40px",
  height: "auto"
};

const logoTextStyle = {
  fontSize: "20px",
  fontWeight: "700",
  background: "linear-gradient(135deg, #fff, #00c6ff)",
  
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const navLinksStyle = {
  display: "flex",
  gap: "20px",
  alignItems: "center",
  flexWrap: "wrap"
};

const navLinkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: "500",
  transition: "color 0.3s"
};

const navButtonStyle = {
  padding: "6px 16px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "linear-gradient(135deg, #0c992d",
  color: "#eaedeb",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer"
};

const navButtonPrimaryStyle = {
  padding: "6px 16px",
  borderRadius: "20px",
  border: "none",
  background: "linear-gradient(135deg, #2896b5, #007bff)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer"
};

// Hero Section
const heroStyle = (bg) => ({
  minHeight: "100vh",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 15px 40px"
});

const heroOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(135deg, rgba(10,10,30,0.9), rgba(30,0,80,0.85))"
};

const heroContentStyle = {
  position: "relative",
  zIndex: 2,
  textAlign: "center",
  maxWidth: "800px"
};

const heroLogoStyle = {
  width: "150px",
  height: "auto",
  marginTop: "26px"

};

const heroTitleStyle = {
  fontSize: "clamp(28px, 6vw, 48px)",
  fontWeight: "800",
  marginBottom: "15px",
  lineHeight: "1.2"
};




const heroTitleSmallStyle = {
  fontSize: "clamp(14px, 3vw, 18px)",
  fontWeight: "400",
  display: "block",
  marginBottom: "5px",
  color: "#94a3b8"
};

const gradientTextStyle = {
  background: "linear-gradient(135deg, #00c6ff, #007bff)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const heroSubtitleStyle = {
  fontSize: "clamp(14px, 3vw, 16px)",
  color: "#cbd5e1",
  marginBottom: "40px",
  maxWidth: "600px",
  margin: "0 auto 30px"
 
};

const heroMassCardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  background: "rgba(222, 219, 236, 0.19)",
  padding: "12px 20px",
  borderRadius: "40px",
  width: "fit-content",
  margin: "0 auto 30px",
  border: "1px solid rgb(126, 148, 250)"
};

const heroMassIconStyle = {
  fontSize: "20px",
  color: "#00c6ff"
};

const heroMassTextStyle = {
  fontSize: "19px",
  textAlign: "left"
};

const heroButtonsStyle = {
  display: "flex",
  gap: "15px",
  justifyContent: "center",
  flexWrap: "wrap"
};

const heroButtonPrimaryStyle = {
  padding: "12px 30px",
  borderRadius: "30px",
  border: "none",
  background: "linear-gradient(135deg, #00c6ff, #007bff)",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer"
};

const heroButtonSecondaryStyle = {
  padding: "12px 30px",
  borderRadius: "30px",
  border: "2px solid #00c6ff",
  background: "transparent",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer"
};

// Mass Section
const massSectionStyle = {
  padding: "60px 15px",
  background: "linear-gradient(135deg, #375bd1c5, #0a0a0cfe)"
};

const sectionContainerStyle = {
  maxWidth: "1200px",
  margin: "0 auto"
};

const massHeaderStyle = {
  textAlign: "center",
  marginBottom: "40px"
};

const massIconStyle = {
  fontSize: "60px",
  color: "#f5f9f6",
  marginBottom: "25px"
};

const massTitleStyle = {
  fontSize: "clamp(24px, 5vw, 32px)",
  fontWeight: "1000",
  marginBottom: "10px",
  color: "#ffffff"
};

const massSubtitleStyle = {
  fontSize: "15px",
  color: "#94a3b8"
};

const massCardsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "25px",
  maxWidth: "600px",
  margin: "0 auto"
};

const massCardStyle = {
  background: "rgba(75, 71, 71, 0.7)",
  padding: "30px 20px",
  borderRadius: "20px",
  textAlign: "center",
  border: "1px solid rgba(255,255,255,0.1)"
};

const massCardIconStyle = {
  fontSize: "30px",
  color: "#00c6ff",
  marginBottom: "15px"
};

const massCardTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  marginBottom: "15px",
  color: "#fff"
};

const massTimeStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  marginBottom: "10px",
  color: "#cbd5e1",
  fontSize: "15px"
};

const massTimeIconStyle = {
  fontSize: "14px",
  color: "#00c6ff"
};

const massLocationStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  marginBottom: "15px",
  color: "#cbd5e1",
  fontSize: "14px"
};

const massLocationIconStyle = {
  fontSize: "14px",
  color: "#00c6ff"
};

const massNoteStyle = {
  fontSize: "13px",
  color: "#94a3b8",
  fontStyle: "italic"
};

// Social Section - Medium Icons
const socialSectionStyle = {
  padding: "60px 15px",
  background: "#0a0a25"
};

const sectionHeaderStyle = {
  textAlign: "center",
  marginBottom: "40px"
};

const sectionIconStyle = {
  fontSize: "30px",
  color: "#f9f3f3",
  marginBottom: "15px"
};

const sectionTitleLightStyle = {
  fontSize: "clamp(22px, 5vw, 30px)",
  fontWeight: "700",
  marginBottom: "10px",
  color: "#fff"
};

const sectionSubtitleStyle = {
  fontSize: "17px",
  color: "#94a3b8",
  maxWidth: "500px",
  margin: "0 auto"
};

const socialGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
  maxWidth: "800px",
  margin: "0 auto"
};

const socialCardStyle = {
  padding: "25px 15px",
  borderRadius: "20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "10px",
  textDecoration: "none",
  color: "#fff",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  transition: "all 0.3s",
  cursor: "pointer"
};

const socialIconCircleStyle = {
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "5px"
};

const socialIconStyle = {
  fontSize: "24px",
  color: "#fff"
};

const socialPlatformStyle = {
  fontSize: "16px",
  fontWeight: "600"
};

const socialHandleStyle = {
  fontSize: "12px",
  opacity: 0.8
};

// About Section
const aboutSectionStyle = {
  padding: "60px 15px",
  background: "#a5c3be8f"
};

const aboutsectionstyle = {
  fontSize: "30px",
  color: "#00c6ff",
  marginBottom: "15px"
};

const sectionTitleDarkStyle = {
  fontSize: "clamp(22px, 5vw, 30px)",
  fontWeight: "700",
  marginBottom: "20px",
  color: "#0a0a25"
};

const aboutContentStyle = {
  maxWidth: "700px",
  margin: "0 auto"
};

const aboutTextStyle = {
  fontSize: "18px",
  lineHeight: "1.5",
  color: "#1742d1",
  marginBottom: "50px",
  textAlign: "center"
};

const activitiesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "15px",
  maxWidth: "400px",
  margin: "0 auto"
};

const activityItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px",
  background: "#47474c4e",
  borderRadius: "10px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  fontSize: "14px",
  color: "#1e293b"
};

const activityIconStyle = {
  fontSize: "16px",
  color: "#00c6ff"
};

// Contact Section
const contactSectionStyle = {
  padding: "50px 15px",
  background: "linear-gradient(135deg, #0f172aa0, #1e293b)"
};

const sectionIconLightStyle = {
  fontSize: "30px",
  color: "#00c6ff",
  marginBottom: "15px"
};

const contactSimpleGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "15px",
  maxWidth: "700px",
  margin: "0 auto"
};

const contactSimpleItemStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "10px",
  fontSize: "14px",
  color: "#fff"
};

const contactSimpleIconStyle = {
  fontSize: "16px",
  color: "#00c6ff"
};

const contactSimpleLinkStyle = {
  color: "#fff",
  textDecoration: "none"
};

// Footer
const footerStyle = {
  background: "#131315d6",
  padding: "40px 15px 20px",
  borderTop: "1px solid rgba(255,255,255,0.1)"
};

const footerContentStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  textAlign: "center"
};

const footerSocialMinStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  marginBottom: "20px"
};

const footerSocialMinIconStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "rgba(7, 7, 7, 0.69)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  fontSize: "16px",
  transition: "all 0.3s",
  cursor: "pointer"
};

const creditStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  marginBottom: "15px",
  fontSize: "14px",
  color: "#94a3b8"
};

const creditHeartStyle = {
  fontSize: "14px",
  color: "#f8f8f8"
};

const creditNameStyle = {
  color: "#00c6ff",
  fontWeight: "600"
};

const copyrightStyle = {
  fontSize: "13px",
  color: "#64748b"
};

export default Landing2;