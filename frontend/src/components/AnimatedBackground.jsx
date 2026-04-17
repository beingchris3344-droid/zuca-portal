// frontend/src/components/AnimatedBackground.jsx
import { useEffect, useState } from "react";

const AnimatedBackground = () => {
  const [bubbles, setBubbles] = useState([]);
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate random bubbles
    const bubbleCount = 12;
    const newBubbles = [];
    for (let i = 0; i < bubbleCount; i++) {
      newBubbles.push({
        id: i,
        size: Math.random() * 120 + 40,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
    setBubbles(newBubbles);

    // Generate random stars
    const starCount = 30;
    const newStars = [];
    for (let i = 0; i < starCount; i++) {
      newStars.push({
        id: i,
        size: Math.random() * 4 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
    setStars(newStars);
  }, []);

  return (
    <div className="animated-bg-container">
      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={`bubble-${bubble.id}`}
          className="animated-bubble"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            top: `${bubble.top}%`,
            left: `${bubble.left}%`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
            opacity: bubble.opacity,
          }}
        />
      ))}
      
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="animated-star"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            opacity: star.opacity,
          }}
        />
      ))}

      <style>{`
        .animated-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .animated-bubble {
          position: absolute;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.05));
          border-radius: 50%;
          animation: floatBubble infinite ease-in-out;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }

        .animated-star {
          position: absolute;
          background: #3b82f6;
          border-radius: 50%;
          animation: twinkle infinite alternate;
          box-shadow: 0 0 4px rgba(59, 130, 246, 0.3);
        }

        @keyframes floatBubble {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(40px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-30px, -80px) scale(0.9);
          }
          75% {
            transform: translate(50px, -30px) scale(1.05);
          }
        }

        @keyframes twinkle {
          0% {
            opacity: 0.2;
            transform: scale(1);
          }
          100% {
            opacity: 0.8;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;