import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../api';
import { 
  Calendar, MapPin, Clock, ArrowRight, QrCode, Smartphone, 
  X, Mail, Lock, UserPlus, Eye, EyeOff
} from 'lucide-react';
import { 
  FaChevronLeft, FaChevronRight, FaPause, FaPlay, FaChurch, FaPray,
  FaPen, FaPencilAlt, FaFeatherAlt, FaFileAlt, FaPenFancy, FaEdit,
  FaScroll, FaBookOpen, FaHighlighter, FaMarker, FaQuoteLeft,
  FaCalendarAlt, FaMapMarkerAlt, FaClock, FaMobileAlt, FaQrcode,
  FaPrayingHands
} from 'react-icons/fa';
import BASE_URL from '../../../api';

import slide1 from '../../../assets/background2.webp';
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
import logo from '../../../assets/zuca-logo.png';

const slides = [
  { id: 1, image: slide1 },
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

// ============================================================
// SINGLE STYLE BLOCK — injected once at module level
// ============================================================
const PAGE_STYLES = `
@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.6); }
}
@keyframes loginSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(10px); }
}

.link-checkin-page {
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f4f7fb;
}
.link-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.link-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s ease;
}
.link-slide.active { opacity: 1; }
.link-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.link-background-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    rgba(7, 25, 54, 0.76),
    rgba(7, 25, 54, 0.34) 48%,
    rgba(247, 249, 252, 0.92) 100%);
  z-index: 1;
}
.slideshow-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.05);
}
.slideshow-nav-prev { left: 20px; }
.slideshow-nav-next { right: 20px; }
.slideshow-dots {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 20;
  flex-wrap: wrap;
  padding: 0 16px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
}
.dot.active {
  background: white;
  width: 24px;
  border-radius: 4px;
}
.slideshow-play-pause {
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}
.link-layout {
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
.link-brand-panel {
  color: white;
  min-height: 620px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 35px 15px 35px 25px;
  position: relative;
  z-index: 3;
}
.brand-panel-content { max-width: 480px; }
.brand-logo-wrap {
  width: 82px;
  height: 82px;
  background: rgba(255,255,255,.96);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-shadow: 0 15px 35px rgba(0,0,0,.2);
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
  opacity: .78;
  margin-bottom: 14px;
}
.brand-copy h1 {
  font-size: clamp(52px, 6vw, 86px);
  line-height: .87;
  letter-spacing: -4px;
  margin: 0;
  font-weight: 800;
}
.brand-copy h1 span {
  font-weight: 400;
  opacity: .86;
}
.brand-copy p {
  max-width: 390px;
  font-size: 18px;
  line-height: 1.65;
  color: rgba(255,255,255,.82);
  margin: 30px 0 0;
}
.brand-divider {
  width: 65px;
  height: 3px;
  background: white;
  opacity: .7;
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
  border: 1px solid rgba(255,255,255,.35);
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
  color: rgba(255,255,255,.68);
}
.brand-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255,255,255,.65);
  font-size: 12px;
}
.brand-dot { opacity: .4; }
.link-form-panel { display: flex; justify-content: center; }
.link-form-card {
  width: 100%;
  max-width: 620px;
  background: rgba(255,255,255,.97);
  border: 1px solid rgba(255,255,255,.85);
  border-radius: 28px;
  padding: 42px 46px 28px;
  box-shadow: 0 30px 80px rgba(5,20,45,.18);
}
.mobile-logo { display: none; }
.form-header { margin-bottom: 28px; }
.form-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.6px;
  margin-bottom: 7px;
}
.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  animation: pulseDot 1s ease-in-out infinite;
}
.typing-title {
  min-height: 60px;
  display: flex;
  align-items: center;
  margin-top: 8px;
}
.handwriting-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}
.quote-icon {
  color: rgba(139, 92, 246, 0.3);
  font-size: 20px;
  margin-top: 4px;
  flex-shrink: 0;
}
.handwriting-text {
  font-size: 24px;
  font-weight: 300;
  color: #14213d;
  line-height: 1.4;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 0.5px;
  min-height: 40px;
  word-break: break-word;
}
.cursor {
  display: inline-block;
  font-weight: 300;
  color: #8b5cf6;
  transition: opacity 0.1s;
  font-size: 28px;
}
.cursor.visible { opacity: 1; }
.cursor.hidden { opacity: 0; }
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.progress-bar {
  flex: 1;
  height: 3px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  border-radius: 4px;
  transition: width 0.1s ease;
}
.progress-text {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 300;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.typing-details {
  background: rgba(139, 92, 246, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}
.typing-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
}
.detail-icon {
  color: rgba(139, 92, 246, 0.3);
  font-size: 16px;
  width: 24px;
  text-align: center;
}
.typing-line {
  color: rgba(0, 0, 0, 0.4);
  font-size: 15px;
  transition: all 0.3s ease;
}
.typing-line.active { color: rgba(0, 0, 0, 0.8); }
.typing-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.typing-method-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.02);
  color: #14213d;
}
.typing-method-btn svg {
  font-size: 20px;
  color: rgba(0, 0, 0, 0.2);
}
.typing-method-btn .btn-content { flex: 1; }
.typing-method-btn .btn-title {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}
.typing-method-btn .btn-desc {
  display: block;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.25);
}
.typing-reminder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.06);
  margin-bottom: 16px;
}
.typing-reminder svg {
  color: rgba(139, 92, 246, 0.3);
  font-size: 16px;
}
.typing-reminder span {
  color: rgba(0, 0, 0, 0.3);
  font-size: 13px;
}
.handwriting-signature {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0.4;
}
.handwriting-signature svg {
  color: rgba(0, 0, 0, 0.3);
  font-size: 14px;
}
.signature-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.3);
  font-style: italic;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 1px;
}
.link-error-card {
  width: 100%;
  max-width: 620px;
  background: rgba(255,255,255,.97);
  border: 1px solid rgba(255,255,255,.85);
  border-radius: 28px;
  padding: 48px 46px;
  box-shadow: 0 30px 80px rgba(5,20,45,.18);
  text-align: center;
}
.link-error-card .error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.link-error-card h2 {
  color: #14213d;
  font-size: 28px;
  margin: 0 0 8px;
}
.link-error-card p {
  color: #64748b;
  margin-bottom: 24px;
}
.link-error-card .back-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
  font-size: 14px;
  transition: filter 0.2s ease;
}
.link-error-card .back-btn:hover { filter: brightness(0.95); }
.link-meeting-card {
  width: 100%;
  max-width: 620px;
  background: rgba(255,255,255,.97);
  border: 1px solid rgba(255,255,255,.85);
  border-radius: 28px;
  padding: 42px 46px 28px;
  box-shadow: 0 30px 80px rgba(5,20,45,.18);
}
.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #dc2626;
  color: white;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
}
.live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulseDot 1s ease-in-out infinite;
}
.link-meeting-card h1 {
  font-size: 28px;
  font-weight: 700;
  color: #14213d;
  margin: 0 0 24px 0;
}
.meeting-details {
  background: rgba(139, 92, 246, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  color: #475569;
  font-size: 15px;
}
.detail-item svg { color: #8b5cf6; }
.welcome-section {
  text-align: center;
  margin-bottom: 24px;
}
.welcome-section svg {
  font-size: 32px;
  color: #8b5cf6;
  margin-bottom: 12px;
}
.welcome-section p {
  margin: 4px 0;
  color: #475569;
}
.small-note {
  font-size: 13px;
  color: #94a3b8;
}
.login-required-notice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.login-required-notice svg {
  color: #ea580c;
  flex-shrink: 0;
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
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  color: #14213d;
  width: 100%;
  font-family: inherit;
}
.method-btn:hover {
  border-color: #8b5cf6;
  transform: translateX(4px);
  background: rgba(139, 92, 246, 0.05);
}
.method-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-content { flex: 1; text-align: left; }
.btn-title {
  display: block;
  font-weight: 600;
  font-size: 16px;
}
.btn-desc {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}
.self-btn:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}
.qr-btn:hover {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}
.method-btn.requires-login {
  border-color: rgba(234, 88, 12, 0.18);
  background: rgba(255, 247, 237, 0.55);
}
.method-btn.requires-login:hover {
  border-color: #ea580c;
  background: #fff7ed;
}
.method-btn.requires-login .btn-desc {
  color: #c2410c;
  font-weight: 600;
}
.method-btn.requires-login .btn-title {
  color: #7c2d12;
}
.method-btn.requires-login svg:first-child {
  color: #ea580c;
}
.login-lock-icon {
  color: #ea580c !important;
  flex-shrink: 0;
}
.mass-reminder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 12px;
  font-size: 12px;
  color: #475569;
  text-align: center;
}
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.login-modal {
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
}
.modal-header h3 { margin: 0; font-size: 18px; }
.modal-close {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-body { padding: 24px; }
.login-error {
  background: #fee2e2;
  color: #ef4444;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}
.form-group { margin-bottom: 16px; }
.form-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}
.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
}
.form-group input:focus {
  outline: none;
  border-color: #8b5cf6;
}
.password-wrapper { position: relative; }
.password-wrapper input { padding-right: 45px; }
.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
}
.options-row { margin: 16px 0; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
}
.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.register-link {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: #64748b;
}
.register-btn {
  background: none;
  border: none;
  color: #8b5cf6;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  font-family: inherit;
}
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}
.btn-cancel {
  flex: 1;
  padding: 10px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
}
.btn-login {
  flex: 1;
  padding: 10px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
}
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
.toast {
  position: fixed;
  bottom: 22px;
  right: 22px;
  z-index: 11000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 17px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 14px 35px rgba(0,0,0,.22);
  animation: toastIn 0.3s ease;
  color: white;
}
.toast.success { background: #15803d; }
.toast.info { background: #1d4ed8; }
.toast.error { background: #dc2626; }
.toast.closing { animation: toastOut 0.25s ease forwards; }

@media (max-width: 1050px) {
  .link-layout {
    grid-template-columns: .65fr 1fr;
    padding: 35px;
  }
  .link-brand-panel { padding-left: 0; }
  .brand-copy h1 { font-size: 62px; }
  .link-form-card,
  .link-meeting-card,
  .link-error-card { padding: 35px; }
}
@media (max-width: 800px) {
  .link-background {
    position: absolute;
    height: 245px;
  }
  .link-background-overlay {
    background: linear-gradient(180deg,
      rgba(7,25,54,.55),
      rgba(7,25,54,.86));
  }
  .slideshow-nav { width: 34px; height: 34px; }
  .slideshow-nav-prev { left: 10px; }
  .slideshow-nav-next { right: 10px; }
  .link-layout {
    display: block;
    padding: 0;
    min-height: 100vh;
  }
  .link-brand-panel {
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
  .brand-footer { display: none; }
  .link-form-panel {
    position: relative;
    z-index: 5;
  }
  .link-form-card,
  .link-meeting-card,
  .link-error-card {
    max-width: none;
    min-height: calc(100vh - 210px);
    border-radius: 25px 25px 0 0;
    padding: 30px 22px 22px;
    box-shadow: 0 -12px 35px rgba(0,0,0,.10);
  }
  .form-header h2 { font-size: 25px; }
}
@media (max-width: 430px) {
  .link-brand-panel,
  .link-background {
    height: 205px;
    min-height: 205px;
  }
  .brand-copy h1 { font-size: 34px; }
  .link-form-card,
  .link-meeting-card,
  .link-error-card {
    min-height: calc(100vh - 180px);
    padding: 27px 18px 20px;
  }
  .handwriting-text { font-size: 20px; }
  .typing-title { min-height: 50px; }
  .slideshow-nav { width: 30px; height: 30px; }
}
`;

// Inject once globally (runs at module load, not per-render)
if (typeof document !== 'undefined' && !document.getElementById('link-checkin-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'link-checkin-styles';
  styleEl.textContent = PAGE_STYLES;
  document.head.appendChild(styleEl);
}

// ============================================================
// Typing Loading Component
// ============================================================
const TypingLoading = ({ meetingData }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const slideIntervalRef = useRef(null);
  
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const togglePlayPause = () => setIsPlaying(!isPlaying);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
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
  
  const meetingTitle = meetingData?.title || 'Meeting';
  const meetingDate = meetingData?.eventDate ? new Date(meetingData.eventDate).toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  }) : 'Loading date...';
  const meetingTime = meetingData?.eventTime || 'Loading time...';
  const meetingLocation = meetingData?.location || 'Loading location...';
  
  const fullText = [
    `Welcome to ${meetingTitle}`,
    `Loading meeting details...`,
    `Preparing your experience...`,
    `Almost ready...`
  ];
  
  useEffect(() => {
    if (displayText.length > 0) {
      const currentFullText = fullText[currentIndex];
      const percentage = (displayText.length / currentFullText.length) * 100;
      setProgress(percentage);
    }
  }, [displayText, currentIndex]);
  
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);
  
  useEffect(() => {
    const currentFullText = fullText[currentIndex];
    const typingInterval = setInterval(() => {
      if (!isDeleting) {
        if (displayText.length < currentFullText.length) {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % fullText.length);
          setProgress(0);
        }
      }
    }, isDeleting ? 30 : 80);
    return () => clearInterval(typingInterval);
  }, [displayText, isDeleting, currentIndex]);
  
  return (
    <div className="link-checkin-page">
      <div className="link-background" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {slides.map((slide, index) => (
          <div key={slide.id} className={`link-slide ${index === currentSlide ? 'active' : ''}`}>
            <img src={slide.image} alt="" loading="lazy" />
          </div>
        ))}
        <div className="link-background-overlay" />
        
        <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
          <FaChevronLeft size={20} />
        </button>
        <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
          <FaChevronRight size={20} />
        </button>
        
        <div className="slideshow-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
        
        <button className="slideshow-play-pause" onClick={togglePlayPause}>
          {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
        </button>
      </div>

      <div className="link-layout">
        <motion.section
          className="link-brand-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="brand-panel-content">
            <div className="brand-logo-wrap">
              <img src={logo} alt="ZUCA Portal" />
            </div>

            <div className="brand-copy">
              <span className="brand-label">ZETECH UNIVERSITY</span>
              <h1>ZUCA<br /><span>CHECK-IN</span></h1>
              <p>Welcome to your meeting check-in portal.</p>
            </div>

            <div className="brand-divider" />

            <div className="brand-message">
              <span className="brand-cross">✝</span>
              <div>
                <strong>ZUCA Catholic Action</strong>
                <p>Join us in faith, community, and service.</p>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>ZUCA Portal</span>
            <span className="brand-dot">•</span>
            <span>Meeting Check-in</span>
          </div>
        </motion.section>

        <motion.section
          className="link-form-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="link-form-card">
            <div className="mobile-logo">
              <img src={logo} alt="ZUCA" />
            </div>

            <div className="form-header">
              <span className="form-eyebrow" style={{ color: '#8b5cf6' }}>
                <span className="pulse-dot"></span>
                LOADING MEETING
              </span>
              
              <div className="typing-title">
                <div className="handwriting-wrapper">
                  <FaQuoteLeft className="quote-icon" />
                  <span className="handwriting-text">
                    {displayText}
                    <span className={`cursor ${showCursor ? 'visible' : 'hidden'}`}>|</span>
                  </span>
                </div>
              </div>
              
              <div className="progress-bar-wrapper">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="progress-text">{Math.round(progress)}%</span>
              </div>
            </div>

            <div className="typing-details">
              <div className="typing-detail">
                <FaCalendarAlt className="detail-icon" />
                <span className={`typing-line ${currentIndex === 1 ? 'active' : ''}`}>
                  {meetingData ? meetingDate : 'Fetching date...'}
                </span>
              </div>
              <div className="typing-detail">
                <FaMapMarkerAlt className="detail-icon" />
                <span className={`typing-line ${currentIndex === 2 ? 'active' : ''}`}>
                  {meetingData ? meetingLocation : 'Finding location...'}
                </span>
              </div>
              <div className="typing-detail">
                <FaClock className="detail-icon" />
                <span className={`typing-line ${currentIndex === 3 ? 'active' : ''}`}>
                  {meetingData ? meetingTime : 'Checking time...'}
                </span>
              </div>
            </div>

            <div className="typing-methods">
              <div className="typing-method-btn">
                <FaMobileAlt />
                <div className="btn-content">
                  <span className="btn-title">Self Check-in</span>
                  <span className="btn-desc">Checking availability...</span>
                </div>
              </div>
              <div className="typing-method-btn">
                <FaQrcode />
                <div className="btn-content">
                  <span className="btn-title">Scan QR Code</span>
                  <span className="btn-desc">Preparing scanner...</span>
                </div>
              </div>
            </div>

            <div className="typing-reminder">
              <FaPrayingHands />
              <span>Weekly Mass: {meetingTime} @ {meetingLocation}</span>
            </div>

            <div className="handwriting-signature">
              <FaFeatherAlt />
              <span className="signature-text">~ loading your experience ~</span>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

// ============================================================
// MAIN
// ============================================================
export default function LinkCheckin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const slideIntervalRef = useRef(null);

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + slides.length) % slides.length);
  const togglePlayPause = () => setIsPlaying((p) => !p);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
    setTouchStart(null);
  };

  useEffect(() => {
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((p) => (p + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    let cancelled = false;

    const checkLinkAndAuth = async () => {
      setLoading(true);
      setError(null);
      setStatus(null);

      try {
        const response = await api.get(`/api/attendance/link/${token}`);
        if (cancelled) return;

        const data = response.data;

        if (!data?.success || !data?.sheet) {
          setStatus('unavailable');
          setError('This meeting link is not available.');
          setLoading(false);
          return;
        }

        setSheet(data.sheet);

        const userToken = localStorage.getItem('token');

        if (userToken) {
          try {
            const meResponse = await api.get('/api/me', {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (!cancelled && meResponse.data) {
              const sheetId = data.sheetId || data.sheet?.id;
              navigate(`/member/attendance?sheetId=${sheetId}`);
              return;
            }
          } catch (authError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        if (!cancelled) {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;

        const statusCode = err.response?.status;
        const errMsg = (err.response?.data?.error || '').toLowerCase();

        if (statusCode === 404 || errMsg.includes('invalid link') || errMsg.includes('not found')) {
          setStatus('not_found');
          setError('This check-in link was not found. Please ask the organizer for a new one.');
        } else if (errMsg.includes('expired')) {
          setStatus('expired');
          setError('This check-in link has expired. Please ask the organizer for a new one.');
        } else if (errMsg.includes('closed')) {
          setStatus('closed');
          setError('This meeting has been closed. Check-in is no longer available.');
        } else {
          setStatus('unavailable');
          setError(err.response?.data?.error || 'Unable to load this meeting link. Please try again later.');
        }

        setLoading(false);
      }
    };

    checkLinkAndAuth();
    return () => { cancelled = true; };
  }, [token, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedEmail', loginEmail);
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          localStorage.setItem('rememberExpiry', expiryDate.toISOString());
        } else {
          localStorage.setItem('rememberMe', 'false');
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberExpiry');
        }

        setIsLoggedIn(true);
        setShowLoginModal(false);

        const sheetId = sheet?.id || sheet?.sheetId;
        if (!sheetId) {
          setLoginError('Meeting information unavailable.');
          return;
        }
        navigate(`/member/attendance?sheetId=${sheetId}`);
      } else {
        setLoginError(data.error || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setLoginError("Unable to connect. Please check your network.");
    } finally {
      setLoginLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('closing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleSelfCheckin = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (!sheet?.id) {
      showToast('Meeting information unavailable', 'error');
      return;
    }
    
    setCheckingIn(true);
    try {
      await api.post(`/api/attendance/self-checkin`, {
        sheetId: sheet.id,
        deviceId: `link-${Date.now()}`,
        deviceName: 'Shareable Link',
        linkToken: token,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      showToast('Checked in successfully!', 'success');
      setTimeout(() => {
        navigate(`/member/attendance?sheetId=${sheet.id}`);
      }, 1000);
    } catch (error) {
      const errorMsg = error.response?.data;
      if (errorMsg?.error === 'ALREADY_CHECKED_IN') {
        showToast('You have already checked in for this meeting', 'info');
        setTimeout(() => {
          navigate(`/member/attendance?sheetId=${sheet.id}`);
        }, 1000);
      } else {
        showToast(errorMsg?.message || 'Personal check-in is not allowed for this meeting', 'error');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleQRCheckin = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (!sheet?.id) {
      showToast('Meeting information unavailable', 'error');
      return;
    }
    navigate(`/member/attendance?sheetId=${sheet.id}&showScanner=true`);
  };

  if (loading) {
    return <TypingLoading meetingData={sheet} />;
  }

  if (error || !sheet) {
    const statusMap = {
      not_found:   { icon: '🔍', title: 'Link Not Found',   cta: 'Go to Login', path: '/login' },
      expired:     { icon: '⏰', title: 'Link Expired',     cta: 'Go to Login', path: '/login' },
      closed:      { icon: '🔒', title: 'Meeting Closed',   cta: 'Go to Login', path: '/login' },
      unavailable: { icon: '🔗❌', title: 'Invalid Link',   cta: 'Go to Login', path: '/login' },
    };
    const ui = statusMap[status] || statusMap.unavailable;

    return (
      <div className="link-checkin-page">
        <div className="link-background" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {slides.map((slide, index) => (
            <div key={slide.id} className={`link-slide ${index === currentSlide ? 'active' : ''}`}>
              <img src={slide.image} alt="" loading="lazy" />
            </div>
          ))}
          <div className="link-background-overlay" />

          <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
            <FaChevronLeft size={20} />
          </button>
          <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
            <FaChevronRight size={20} />
          </button>

          <div className="slideshow-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>

          <button className="slideshow-play-pause" onClick={togglePlayPause}>
            {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
          </button>
        </div>

        <div className="link-layout">
          <motion.section
            className="link-brand-panel"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="brand-panel-content">
              <div className="brand-logo-wrap">
                <img src={logo} alt="ZUCA Portal" />
              </div>
              <div className="brand-copy">
                <span className="brand-label">ZETECH UNIVERSITY</span>
                <h1>ZUCA<br /><span>CHECK-IN</span></h1>
                <p>Your meeting check-in portal.</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="link-form-panel"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="link-error-card">
              <div className="error-icon">{ui.icon}</div>
              <h2>{ui.title}</h2>
              <p>{error}</p>
              <button className="back-btn" onClick={() => navigate(ui.path)}>
                {ui.cta}
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    );
  }

  return (
    <div className="link-checkin-page">
      <div className="link-background" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {slides.map((slide, index) => (
          <div key={slide.id} className={`link-slide ${index === currentSlide ? 'active' : ''}`}>
            <img src={slide.image} alt="" loading="lazy" />
          </div>
        ))}
        <div className="link-background-overlay" />

        <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
          <FaChevronLeft size={20} />
        </button>
        <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
          <FaChevronRight size={20} />
        </button>

        <div className="slideshow-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <button className="slideshow-play-pause" onClick={togglePlayPause}>
          {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
        </button>
      </div>

      <div className="link-layout">
        <motion.section
          className="link-brand-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="brand-panel-content">
            <div className="brand-logo-wrap">
              <img src={logo} alt="ZUCA Portal" />
            </div>

            <div className="brand-copy">
              <span className="brand-label">ZETECH UNIVERSITY</span>
              <h1>ZUCA<br /><span>CHECK-IN</span></h1>
              <p>Welcome to your meeting check-in portal.</p>
            </div>

            <div className="brand-divider" />

            <div className="brand-message">
              <span className="brand-cross">✝</span>
              <div>
                <strong>ZUCA Catholic Action</strong>
                <p>Join us in faith, community, and service.</p>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>ZUCA Portal</span>
            <span className="brand-dot">•</span>
            <span>Meeting Check-in</span>
          </div>
        </motion.section>

        <motion.section
          className="link-form-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="link-meeting-card">
            <div className="mobile-logo">
              <img src={logo} alt="ZUCA" />
            </div>

            <div className="live-badge">
              <span className="live-dot"></span>
              LIVE MEETING
            </div>

            <h1>{sheet.title}</h1>

            <div className="meeting-details">
              <div className="detail-item">
                <Calendar size={18} />
                <span>{new Date(sheet.eventDate).toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric' 
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

            <div className="welcome-section">
              <FaChurch />
              <p>You've been invited to check in for this meeting.</p>

              {isLoggedIn ? (
                <p className="small-note">Choose your check-in method below:</p>
              ) : (
                <div className="login-required-notice">
                  <Lock size={14} />
                  <span>Please log in to check in for this meeting.</span>
                </div>
              )}
            </div>

            <div className="methods-section">
              <button 
                className={`method-btn self-btn ${!isLoggedIn ? 'requires-login' : ''}`}
                onClick={handleSelfCheckin}
                disabled={checkingIn}
              >
                <Smartphone size={20} />
                <div className="btn-content">
                  <span className="btn-title">Self Check-in</span>
                  <span className="btn-desc">
                    {isLoggedIn ? 'Check in using your account' : 'Login required'}
                  </span>
                </div>
                {isLoggedIn ? <ArrowRight size={18} /> : <Lock size={16} className="login-lock-icon" />}
              </button>
              
              <button 
                className={`method-btn qr-btn ${!isLoggedIn ? 'requires-login' : ''}`}
                onClick={handleQRCheckin}
              >
                <QrCode size={20} />
                <div className="btn-content">
                  <span className="btn-title">Scan QR Code</span>
                  <span className="btn-desc">
                    {isLoggedIn ? 'Scan QR code at the venue' : 'Login required'}
                  </span>
                </div>
                {isLoggedIn ? <ArrowRight size={18} /> : <Lock size={16} className="login-lock-icon" />}
              </button>
            </div>

            <div className="mass-reminder">
              <FaPray size={16} />
              <span>Weekly Mass: Wednesday 4:30 PM @ Annex 002</span>
            </div>
          </div>
        </motion.section>
      </div>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Login to Continue</h3>
              <button className="modal-close" onClick={() => setShowLoginModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="modal-body">
                {loginError && <div className="login-error">{loginError}</div>}
                
                <div className="form-group">
                  <label><Mail size={16} /> Email Address</label>
                  <input
                    type="email"
                    placeholder="Your registered email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label><Lock size={16} /> Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="options-row">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span>Keep me signed in for 30 days</span>
                  </label>
                </div>
                
                <div className="register-link">
                  <span>Don't have an account? </span>
                  <button type="button" onClick={() => { setShowLoginModal(false); navigate('/register'); }} className="register-btn">
                    <UserPlus size={14} /> Register here
                  </button>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowLoginModal(false)}>Cancel</button>
                <button type="submit" className="btn-login" disabled={loginLoading}>
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}