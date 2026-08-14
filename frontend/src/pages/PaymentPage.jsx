// frontend/src/pages/PaymentPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaCompressAlt, FaLongArrowAltRight, FaMoneyBillAlt, FaPause, FaPaypal, FaPhoneAlt, FaPhoneSquare, FaPlay, FaSortAmountUp, FaStumbleuponCircle, FaTicketAlt } from "react-icons/fa";
import BASE_URL from "../api";
import logo from "../assets/zuca-logo.png";

// Import slideshow images
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

function PaymentPage() {
  const { slug, campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  
  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const slideIntervalRef = useRef(null);
  const slideshowRef = useRef(null);
  
  // Slideshow images array
  const slides = [
    { id: 2, image: slide2 },
    { id: 3, image: slide3 },
    { id: 4, image: slide4 },
    { id: 5, image: slide5 },
    { id: 6, image: slide6 },
    { id: 7, image: slide7 },
    { id: 8, image: slide8 },
    { id: 9, image: slide9 },
    { id: 10, image: slide10 },
    { id: 11, image: slide11 },
    { id: 12, image: slide12 },
  ];

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

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setTouchStart(null);
  };

  useEffect(() => {
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [isPlaying, slides.length]);

  const pollPaymentStatus = (paymentId) => {
    let attempts = 0;
    const maxAttempts = 60;
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await axios.get(`${BASE_URL}/api/mpesa/payment/${paymentId}/status`);
        
        if (response.data.payment?.status === "SUCCESS") {
          clearInterval(interval);
          setMessage({ text: ` Payment successful! Receipt: ${response.data.payment.mpesaReceiptNumber || 'N/A'}`, type: "success" });
          setProcessing(false);
          
          const senderName = user?.fullName || user?.name || "Customer";
          const senderPhone = phone || user?.phone || "N/A";
          
          const paymentData = {
            receiptNumber: response.data.payment.mpesaReceiptNumber,
            amount: response.data.payment.amount,
            campaignTitle: campaign.title,
            senderName: senderName,
            senderPhone: senderPhone,
            timestamp: new Date().toLocaleString(),
            jumuiaName: campaign.jumuia?.name || '',
          };
          localStorage.setItem("lastPayment", JSON.stringify(paymentData));
          localStorage.removeItem("lastPaymentId");
          
          setTimeout(() => {
            navigate(`/payment-success?receipt=${response.data.payment.mpesaReceiptNumber}&amount=${response.data.payment.amount}&campaign=${encodeURIComponent(campaign.title)}&senderName=${encodeURIComponent(senderName)}&senderPhone=${encodeURIComponent(senderPhone)}&jumuiaName=${encodeURIComponent(campaign.jumuia?.name || '')}`);
          }, 2000);
          return;
        }
        
        if (response.data.payment?.status === "FAILED") {
          clearInterval(interval);
          setMessage({ text: `❌ Payment failed: ${response.data.payment.resultDesc || 'Please try again'}`, type: "error" });
          setProcessing(false);
          localStorage.removeItem("lastPaymentId");
          return;
        }
        
        if (attempts % 5 === 0) {
          setMessage({ text: `⏳ Processing payment... Please check your phone.`, type: "info" });
        }
      } catch (err) {
        console.error("Status check error:", err);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setMessage({ text: " Payment is still being processed. You will receive an SMS and email confirmation shortly.", type: "info" });
        setProcessing(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const checkPendingPayment = async () => {
      const lastPaymentId = localStorage.getItem("lastPaymentId");
      if (lastPaymentId) {
        try {
          const response = await axios.get(`${BASE_URL}/api/mpesa/payment/${lastPaymentId}/status`);
          if (response.data.payment?.status === "SUCCESS") {
            localStorage.removeItem("lastPaymentId");
            navigate(`/payment-success?receipt=${response.data.payment.mpesaReceiptNumber}&amount=${response.data.payment.amount}&campaign=${encodeURIComponent(campaign?.title || "")}`);
          } else if (response.data.payment?.status === "PENDING") {
            setMessage({ text: "We found a pending payment. Waiting for confirmation...", type: "info" });
            setProcessing(true);
            pollPaymentStatus(lastPaymentId);
          } else {
            localStorage.removeItem("lastPaymentId");
          }
        } catch (err) {
          console.error("Error checking pending payment:", err);
        }
      }
    };
    checkPendingPayment();
  }, []);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = !!token && !!user?.id;

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        let response;
        if (campaignId) {
          response = await axios.get(`${BASE_URL}/api/mpesa/campaign-by-id/${campaignId}`);
        } else if (slug) {
          response = await axios.get(`${BASE_URL}/api/mpesa/campaign-by-slug/${slug}`);
        } else {
          throw new Error("No campaign identifier provided");
        }
        setCampaign(response.data);
        setAmount(response.data.amountRequired);
        if (isLoggedIn && user.phone) setPhone(user.phone);
      } catch (err) {
        console.error("Campaign not found:", err);
        setMessage({ text: "Payment link not found or invalid", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [slug, campaignId, isLoggedIn, user.phone]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${BASE_URL}/api/login`, {
        email: loginEmail,
        password: loginPassword
      });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        window.location.reload();
      }
    } catch (err) {
      setLoginMessage(err.response?.data?.error || "Login failed");
    }
  };

  const handlePayment = async () => {
    if (!isLoggedIn) {
      setShowLoginForm(true);
      return;
    }
    
    if (!phone || phone.length < 10) {
      setMessage({ text: "Please enter a valid M-PESA phone number", type: "error" });
      return;
    }
    
    if (!amount || amount < 10) {
      setMessage({ text: "Please enter a valid amount (minimum KES 10)", type: "error" });
      return;
    }
    
    setProcessing(true);
    setMessage({ text: " Sending request to M-PESA...", type: "info" });
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/mpesa/stk-push`,
        {
          campaignId: campaign.id,
          amount: parseFloat(amount),
          phoneNumber: phone,
          userId: user.id
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000 
        }
      );
      
      if (response.data.success) {
        localStorage.setItem("lastPaymentId", response.data.paymentId);
        pollPaymentStatus(response.data.paymentId);
      } else {
        setMessage({ text: `❌ ${response.data.error || "Payment failed. Please try again."}`, type: "error" });
        setProcessing(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setMessage({ text: `❌ ${err.response?.data?.error || "Payment failed"}`, type: "error" });
      setProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner-large"></div>
        <p>Loading payment page...</p>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="payment-error">
        <div className="error-icon">❌</div>
        <h1>Payment Link Not Found</h1>
        <p>This payment link is invalid or has expired.</p>
        <p>Please contact your Jumuia leader or administrator for assistance.</p>
      </div>
    );
  }
  
  return (
    <div className="payment-page">

      {/* Background slideshow */}
      <div className="payment-background" ref={slideshowRef}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`payment-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="payment-background-overlay"></div>
          </div>
        ))}
        
        <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
          <FaChevronLeft />
        </button>
        <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
          <FaChevronRight />
        </button>
        
        <div className="slideshow-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
        
        <button className="slideshow-play-pause" onClick={togglePlayPause}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      </div>

      {/* Main layout */}
      <div className="payment-layout">

        {/* LEFT BRANDING PANEL */}
        <motion.section
          className="payment-brand-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="brand-panel-content">
            <div className="brand-logo-wrap">
              <img src={logo} alt="ZUCA" />
            </div>

            <div className="brand-copy">
              <span className="brand-label">
                ZETECH UNIVERSITY CATHOLIC ACTION
              </span>
              <h1>
                ZUCA
                <br />
                <span>PAYMENT</span>
              </h1>
              <p>
                Make a secure payment via M-PESA
                to support our cause.
              </p>
            </div>

            <div className="brand-divider" />

            <div className="brand-message">
              <span className="brand-cross">✝</span>
              <div>
                <strong>Secure M-PESA Payment</strong>
                <p>
                  Your payment will be processed
                  securely through the M-PESA STK Push.
                </p>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>ZUCA Portal</span>
            <span className="brand-dot">•</span>
            <span>Secure Payment</span>
          </div>
        </motion.section>

        {/* RIGHT FORM PANEL */}
        <motion.section
          className="payment-form-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="payment-form-card">
            <div className="form-header">
              <div className="mobile-logo">
                <img src={logo} alt="ZUCA" />
              </div>
              <div>
                <span className="form-eyebrow">ZUCA CONTRIBUTIONS</span>
                <h2>{campaign.title}</h2>
                <p>Complete your payment via M-PESA</p>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="campaign-info-box">
              <div className="campaign-detail">
                <span className="detail-label">Target Amount</span>
                <span className="detail-value">KES {campaign.amountRequired?.toLocaleString()}</span>
              </div>
              {campaign.jumuia && (
                <div className="campaign-detail">
                  <span className="detail-label">Jumuia</span>
                  <span className="detail-value">{campaign.jumuia.name}</span>
                </div>
              )}
              {campaign.description && (
                <p className="campaign-description">{campaign.description}</p>
              )}
            </div>

            {!isLoggedIn && !showLoginForm && (
              <div className="login-prompt">
                <span className="prompt-icon">🔐</span>
                <p>Please login to make a payment</p>
                <button className="login-prompt-btn" onClick={() => setShowLoginForm(true)}>
                  Login to ZUCA
                </button>
                <p className="register-link">
                  Don't have an account? <Link to="/register">Register here</Link>
                </p>
              </div>
            )}

            {!isLoggedIn && showLoginForm && (
              <div className="login-form-container">
                <h4>Login to ZUCA</h4>
                <form onSubmit={handleLogin}>
                  <div className="field">
                    <label htmlFor="loginEmail">Email address</label>
                    <div className="input-shell">
                      <span className="field-icon">✉</span>
                      <input
                        id="loginEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="loginPassword">Password</label>
                    <div className="input-shell">
                      <span className="field-icon">🔒</span>
                      <input
                        id="loginPassword"
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {loginMessage && (
                    <div className="message-error">{loginMessage}</div>
                  )}
                  <button type="submit" className="login-submit">Login</button>
                  <button type="button" className="login-cancel" onClick={() => setShowLoginForm(false)}>
                    Cancel
                  </button>
                </form>
                <p className="register-link">
                  Don't have an account? <Link to="/register">Register here</Link>
                </p>
              </div>
            )}

            {isLoggedIn && (
              <>
                <div className="user-badge">
                  <span><FaLongArrowAltRight/> Logged in as <strong>{user.fullName}</strong></span>
                </div>

                <div className="field">
                  <label htmlFor="phone"><FaPhoneSquare/> M-PESA Phone Number</label>
                  <div className="input-shell">
                    <span className="field-icon"><FaPhoneAlt/></span>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <small>Enter the number that receives M-PESA messages</small>
                </div>

                <div className="field">
                  <label htmlFor="amount"><FaSortAmountUp/> Amount (KES)</label>
                  <div className="input-shell">
                    <span className="field-icon"><FaMoneyBillAlt/></span>
                    <input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="10"
                    />
                  </div>
                </div>

                <button
                  className="pay-submit"
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner light"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaCompressAlt/> Pay Now with M-PESA
                      <span className="submit-arrow">→</span>
                    </>
                  )}
                </button>
              </>
            )}

            {message.text && (
              <div className={`message-${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        /* ============================================================
           PAYMENT PAGE
        ============================================================ */

        .payment-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f4f7fb;
        }

        /* --------------------------------------------------------------
           BACKGROUND
        -------------------------------------------------------------- */

        .payment-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .payment-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1.2s ease;
        }

        .payment-slide.active {
          opacity: 1;
        }

        .payment-background-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(7, 25, 54, 0.55),
              rgba(7, 25, 54, 0.51) 48%,
              rgba(247, 249, 252, 0.92) 100%
            );
        }

        /* --------------------------------------------------------------
           SLIDESHOW NAV
        -------------------------------------------------------------- */

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
          font-size: 14px;
        }

        .slideshow-play-pause:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: scale(1.05);
        }

        /* --------------------------------------------------------------
           MAIN LAYOUT
        -------------------------------------------------------------- */

        .payment-layout {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(350px, 0.9fr) minmax(540px, 1.1fr);
          align-items: center;
          gap: 40px;
          padding: 45px 7%;
        }

        /* --------------------------------------------------------------
           BRAND PANEL
        -------------------------------------------------------------- */

        .payment-brand-panel {
          color: white;
          min-height: 620px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 35px 15px 35px 25px;
        }

        .brand-panel-content {
          max-width: 480px;
        }

        .brand-logo-wrap {
          width: 80px;
          height: 82px;
          background: rgba(255, 255, 255, 0.88);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
          margin-bottom: 38px;
        }

        .brand-logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-label {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          opacity: 0.78;
          margin-bottom: 14px;
        }

        .brand-copy h1 {
          font-size: clamp(52px, 6vw, 86px);
          line-height: 0.87;
          letter-spacing: -4px;
          margin: 0;
          font-weight: 800;
        }

        .brand-copy h1 span {
          font-weight: 400;
          opacity: 0.86;
        }

        .brand-copy p {
          max-width: 390px;
          font-size: 18px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.82);
          margin: 30px 0 0;
        }

        .brand-divider {
          width: 65px;
          height: 3px;
          background: white;
          opacity: 0.7;
          margin: 35px 0;
          border-radius: 10px;
        }

        .brand-message {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          max-width: 420px;
        }

        .brand-cross {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 50%;
          font-size: 17px;
        }

        .brand-message strong {
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .brand-message p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.68);
        }

        .brand-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 12px;
        }

        .brand-dot {
          opacity: 0.4;
        }

        /* --------------------------------------------------------------
           FORM PANEL
        -------------------------------------------------------------- */

        .payment-form-panel {
          display: flex;
          justify-content: center;
        }

        .payment-form-card {
          width: 100%;
          max-width: 620px;
          background: rgba(255, 255, 255, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 28px;
          padding: 42px 46px 28px;
          box-shadow: 0 30px 80px rgba(5, 20, 45, 0.18);
        }

        .form-header {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 24px;
        }

        .mobile-logo {
          display: none;
        }

        .form-eyebrow {
          display: block;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.6px;
          margin-bottom: 7px;
        }

        .form-header h2 {
          color: #14213d;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.8px;
          margin: 0 0 8px;
          font-weight: 750;
        }

        .form-header p {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        /* --------------------------------------------------------------
           CAMPAIGN INFO
        -------------------------------------------------------------- */

        .campaign-info-box {
          background: #f5f8fc;
          border: 1px solid #e5eaf1;
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 24px;
        }

        .campaign-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .campaign-detail:last-of-type {
          border-bottom: none;
        }

        .detail-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .detail-value {
          color: #14213d;
          font-size: 14px;
          font-weight: 700;
        }

        .campaign-description {
          color: #475569;
          font-size: 13px;
          line-height: 1.6;
          margin: 12px 0 0;
          padding-top: 10px;
          border-top: 1px solid #edf0f4;
        }

        /* --------------------------------------------------------------
           FORM FIELDS
        -------------------------------------------------------------- */

        .field {
          min-width: 0;
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          color: #27364d;
          font-size: 12px;
          font-weight: 700;
          margin: 0 0 7px 2px;
        }

        .input-shell {
          height: 50px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #d9e1ec;
          background: #f8fafc;
          border-radius: 12px;
          padding: 0 13px;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .input-shell:focus-within {
          background: white;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
        }

        .field-icon {
          width: 22px;
          text-align: center;
          opacity: 0.6;
          font-size: 14px;
          flex: 0 0 22px;
        }

        .input-shell input {
          width: 100%;
          min-width: 0;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #172033;
          font-size: 14px;
          font-family: inherit;
        }

        .input-shell input::placeholder {
          color: #9aa7b8;
        }

        .field small {
          display: block;
          color: #8290a3;
          font-size: 10.5px;
          margin: 6px 2px 0;
        }

        /* --------------------------------------------------------------
           LOGIN PROMPT
        -------------------------------------------------------------- */

        .login-prompt {
          text-align: center;
          padding: 24px 20px;
          background: #f0f9ff;
          border: 1px solid #b8d8f0;
          border-radius: 14px;
          margin-bottom: 20px;
        }

        .prompt-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .login-prompt p {
          color: #1e40af;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 14px;
        }

        .login-prompt-btn {
          padding: 12px 24px;
          background: #1d4ed8;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s ease;
        }

        .login-prompt-btn:hover {
          background: #1e40af;
        }

        .register-link {
          margin-top: 14px;
          font-size: 13px;
          color: #64748b;
        }

        .register-link a {
          color: #1d4ed8;
          font-weight: 700;
          text-decoration: none;
        }

        .register-link a:hover {
          text-decoration: underline;
        }

        /* --------------------------------------------------------------
           LOGIN FORM
        -------------------------------------------------------------- */

        .login-form-container {
          padding: 20px 0;
          margin-bottom: 12px;
        }

        .login-form-container h4 {
          color: #14213d;
          font-size: 20px;
          margin: 0 0 18px;
          text-align: center;
        }

        .login-submit {
          width: 100%;
          height: 50px;
          border: 0;
          border-radius: 11px;
          background: #1d4ed8;
          color: white;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 8px;
          transition: background 0.2s ease;
        }

        .login-submit:hover {
          background: #1e40af;
        }

        .login-cancel {
          width: 100%;
          height: 50px;
          border: 1px solid #d9e1ec;
          border-radius: 11px;
          background: transparent;
          color: #64748b;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .login-cancel:hover {
          background: #f1f5f9;
        }

        .message-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          padding: 12px;
          border-radius: 9px;
          font-size: 12px;
          margin-bottom: 14px;
          text-align: center;
        }

        /* --------------------------------------------------------------
           USER BADGE
        -------------------------------------------------------------- */

        .user-badge {
          background: #e8f5e9;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #2e7d32;
          text-align: center;
        }

        /* --------------------------------------------------------------
           PAY SUBMIT
        -------------------------------------------------------------- */

        .pay-submit {
          height: 52px;
          width: 100%;
          border: 0;
          border-radius: 12px;
          background: #1d4ed8;
          color: white;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 18px rgba(29, 78, 216, 0.20);
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease;
          margin-top: 4px;
        }

        .pay-submit:hover:not(:disabled) {
          background: #1e40af;
          box-shadow: 0 11px 22px rgba(29, 78, 216, 0.25);
        }

        .pay-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .submit-arrow {
          font-size: 18px;
          line-height: 1;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(29, 78, 216, 0.2);
          border-top-color: #1d4ed8;
          border-radius: 50%;
          animation: paymentSpin 0.7s linear infinite;
        }

        .spinner.light {
          border-color: rgba(255, 255, 255, 0.3);
          border-top-color: white;
        }

        /* --------------------------------------------------------------
           MESSAGES
        -------------------------------------------------------------- */

        .message-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 16px;
          font-size: 13px;
          text-align: center;
        }

        .message-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 16px;
          font-size: 13px;
          text-align: center;
        }

        .message-info {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 16px;
          font-size: 13px;
          text-align: center;
        }

        /* --------------------------------------------------------------
           LOADING / ERROR
        -------------------------------------------------------------- */

        .payment-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f4f7fb;
          gap: 16px;
        }

        .spinner-large {
          width: 44px;
          height: 44px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #2563eb;
          border-radius: 50%;
          animation: paymentSpin 1s linear infinite;
        }

        .payment-loading p {
          color: #64748b;
          font-size: 14px;
        }

        .payment-error {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          background: #f4f7fb;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .payment-error h1 {
          color: #dc2626;
          font-size: 28px;
          margin: 0 0 12px;
        }

        .payment-error p {
          color: #64748b;
          font-size: 14px;
          max-width: 460px;
          margin: 4px 0;
        }

        /* --------------------------------------------------------------
           ANIMATIONS
        -------------------------------------------------------------- */

        @keyframes paymentSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* --------------------------------------------------------------
           TABLET
        -------------------------------------------------------------- */

        @media (max-width: 1050px) {
          .payment-layout {
            grid-template-columns: 0.65fr 1fr;
            padding: 35px;
          }

          .payment-brand-panel {
            padding-left: 0;
          }

          .brand-copy h1 {
            font-size: 62px;
          }

          .payment-form-card {
            padding: 35px;
          }
        }

        /* --------------------------------------------------------------
           MOBILE
        -------------------------------------------------------------- */

        @media (max-width: 800px) {
          .payment-page {
            background: #f4f7fb;
          }

          .payment-background {
            position: absolute;
            height: 245px;
          }

          .payment-background-overlay {
            background:
              linear-gradient(
                180deg,
                rgba(7, 25, 54, 0.07),
                rgba(7, 25, 54, 0.32)
              );
          }

          .payment-layout {
            display: block;
            padding: 0;
            min-height: 100vh;
          }

          .payment-brand-panel {
            min-height: 245px;
            padding: 25px 24px 28px;
            justify-content: flex-start;
          }

          .brand-logo-wrap {
            width: 55px;
            height: 55px;
            padding: 8px;
            border-radius: 15px;
            margin-bottom: 18px;
          }

          .brand-label {
            font-size: 9px;
            letter-spacing: 1.3px;
            margin-bottom: 5px;
          }

          .brand-copy h1 {
            font-size: 39px;
            letter-spacing: -2px;
          }

          .brand-copy p,
          .brand-divider,
          .brand-message,
          .brand-footer {
            display: none;
          }

          .payment-form-panel {
            position: relative;
            z-index: 5;
            margin-top: 0;
          }

          .payment-form-card {
            max-width: none;
            min-height: calc(100vh - 210px);
            border-radius: 25px 25px 0 0;
            padding: 30px 22px 22px;
            box-shadow: 0 -12px 35px rgba(0, 0, 0, 0.10);
          }

          .form-header {
            margin-bottom: 20px;
          }

          .mobile-logo {
            display: none;
          }

          .form-header h2 {
            font-size: 24px;
          }

          .form-header p {
            font-size: 13px;
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

        /* --------------------------------------------------------------
           SMALL PHONES
        -------------------------------------------------------------- */

        @media (max-width: 430px) {
          .payment-brand-panel {
            height: 205px;
            min-height: 205px;
          }

          .payment-background {
            height: 205px;
          }

          .brand-copy h1 {
            font-size: 34px;
          }

          .payment-form-card {
            min-height: calc(100vh - 180px);
            padding: 27px 18px 20px;
          }

          .form-header h2 {
            font-size: 22px;
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
            width: 19px;
          }
        }
      `}</style>
    </div>
  );
}

export default PaymentPage;