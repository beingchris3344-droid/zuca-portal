// src/components/common/CelebrationOverlay.jsx
import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

const CelebrationOverlay = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <>
      <style>{`
        .celebration-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeInCelebration 0.3s ease;
        }

        @keyframes fadeInCelebration {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .celebration-content {
          text-align: center;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          position: relative;
        }

        .celebration-icon {
          font-size: 80px;
          display: block;
          margin-bottom: 20px;
          animation: bounceIcon 0.6s ease;
        }

        @keyframes bounceIcon {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        .celebration-title {
          font-size: 48px;
          font-weight: 900;
          background: linear-gradient(135deg, #f6d365, #fda085, #f6d365);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradientShift 1.5s ease infinite;
          margin: 0;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .celebration-subtitle {
          font-size: 24px;
          color: white;
          margin: 12px 0 30px 0;
          font-weight: 500;
        }

        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 10000;
        }

        .confetti-piece {
          position: absolute;
          top: -20px;
          animation: confettiFall linear infinite;
        }

        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }

        .stars-container {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 20px 0;
        }

        .star {
          font-size: 30px;
          animation: twinkle 0.8s ease infinite alternate;
        }

        .star:nth-child(2) { animation-delay: 0.2s; }
        .star:nth-child(3) { animation-delay: 0.4s; }
        .star:nth-child(4) { animation-delay: 0.6s; }
        .star:nth-child(5) { animation-delay: 0.8s; }

        @keyframes twinkle {
          from { transform: scale(1) rotate(0deg); opacity: 0.5; }
          to { transform: scale(1.4) rotate(20deg); opacity: 1; }
        }

        .success-meter {
          margin-top: 30px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 16px 24px;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .meter-bar {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, #f6d365, #fda085);
          border-radius: 10px;
          animation: meterPulse 0.5s ease infinite alternate;
        }

        @keyframes meterPulse {
          from { opacity: 0.7; }
          to { opacity: 1; }
        }

        .meter-text {
          color: white;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        @media (max-width: 640px) {
          .celebration-title {
            font-size: 36px;
          }
          .celebration-icon {
            font-size: 60px;
          }
          .celebration-subtitle {
            font-size: 18px;
          }
        }
      `}</style>

      {/* Confetti */}
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
              backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'][Math.floor(Math.random() * 6)],
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="celebration-overlay">
        <div className="celebration-content">
         <span className="celebration-icon">
  <CheckCircle size={80} color="#22c55e" strokeWidth={1.5} />
</span>
          <h2 className="celebration-title">CHECKED IN!</h2>
          <p className="celebration-subtitle">Hey there! you've  checked in for this meeting 🎊</p>
          
          <div className="stars-container">
            <span className="star">⭐</span>
            <span className="star">🌟</span>
            <span className="star">✨</span>
            <span className="star">⭐</span>
            <span className="star">🌟</span>
          </div>
          
          <div className="success-meter">
            <div className="meter-bar">
              <div className="meter-fill"></div>
            </div>
            <span className="meter-text">💪 ATTENDANCE CONFIRMED!</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CelebrationOverlay;