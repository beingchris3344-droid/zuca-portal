// frontend/src/components/FloatingAIAssistantButton.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaRobot } from "react-icons/fa";
import { FiX, FiEye, FiEyeOff } from "react-icons/fi";
import logoImg from "../assets/zuca-logo.png";

const FloatingAIAssistantButton = ({ user, onOpenAI }) => {
  const [position, setPosition] = useState(() => {
    return { x: window.innerWidth - 85, y: window.innerHeight - 120 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Default: HIDDEN (false) - user must explicitly show it
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem('ai_button_visible');
    // If saved preference exists, use it; otherwise default to HIDDEN
    return saved !== null ? saved === 'true' : false;
  });
  const [showToggleMenu, setShowToggleMenu] = useState(false);
  const buttonRef = useRef(null);
  const toggleMenuRef = useRef(null);

  // Load saved position
  useEffect(() => {
    const savedPosition = localStorage.getItem('ai_button_position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        const maxX = window.innerWidth - 65;
        const maxY = window.innerHeight - 65;
        setPosition({
          x: Math.min(Math.max(pos.x, 0), maxX),
          y: Math.min(Math.max(pos.y, 0), maxY)
        });
      } catch (e) {}
    }
  }, []);

  // Save position
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('ai_button_position', JSON.stringify(position));
    }
  }, [position]);

  // Save visibility preference
  useEffect(() => {
    localStorage.setItem('ai_button_visible', String(isVisible));
  }, [isVisible]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 65;
      const maxY = window.innerHeight - 65;
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close toggle menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toggleMenuRef.current && !toggleMenuRef.current.contains(event.target)) {
        setShowToggleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Alt + A to toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        toggleVisibility();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    setShowToggleMenu(false);
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    setHasMoved(false);
    const touch = e.touches ? e.touches[0] : e;
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setHasMoved(true);
    const touch = e.touches ? e.touches[0] : e;
    let newX = touch.clientX - dragOffset.x;
    let newY = touch.clientY - dragOffset.y;
    
    const buttonSize = 60;
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  const handleClick = (e) => {
    if (!hasMoved) {
      window.dispatchEvent(new CustomEvent('openZUCAI', { 
        detail: { fullPage: false } 
      }));
    }
    setHasMoved(false);
  };

  // Toggle menu button click
  const handleToggleClick = (e) => {
    e.stopPropagation();
    setShowToggleMenu(!showToggleMenu);
  };

  if (!user) return null;

  // If hidden, show a visible indicator to show the button
  if (!isVisible) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Show Button - Click to reveal the full AI button */}
        <button
          onClick={toggleVisibility}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "2px solid rgba(82, 197, 5, 0.6)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(82, 197, 5, 0.1)",
            transition: "all 0.3s ease",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.borderColor = "rgba(82, 197, 5, 1)";
            e.currentTarget.style.boxShadow = "0 4px 30px rgba(0,0,0,0.5), 0 0 40px rgba(82, 197, 5, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.borderColor = "rgba(82, 197, 5, 0.6)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(82, 197, 5, 0.1)";
          }}
          title="Show AI Assistant (Alt+A)"
        >
          <FaRobot size={22} />
          
          {/* Pulse ring */}
          <div style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "2px solid rgba(82, 197, 5, 0.2)",
            animation: "pulse-ring-green 2s ease-out infinite",
            pointerEvents: "none",
          }} />
          
          {/* Small indicator dot */}
          <div style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid #1a1a2e",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }} />
        </button>
        
        {/* Label */}
        <span
          style={{
            fontSize: "12px",
            color: "white",
            background: "rgba(0,0,0,0.8)",
            padding: "6px 14px",
            borderRadius: "20px",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: window.innerWidth > 768 ? "block" : "none",
            fontWeight: "500",
            letterSpacing: "0.3px",
          }}
        >
          AI Assistant
        </span>
        
        {/* Keyboard shortcut hint */}
        <span
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.4)",
            background: "rgba(0,0,0,0.5)",
            padding: "4px 10px",
            borderRadius: "12px",
            display: window.innerWidth > 768 ? "block" : "none",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          Alt+A
        </span>
      </motion.div>
    );
  }

  return (
    <>
      {/* Toggle Menu */}
      <AnimatePresence>
        {showToggleMenu && (
          <motion.div
            ref={toggleMenuRef}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            style={{
              position: "fixed",
              bottom: `${window.innerHeight - position.y + 70}px`,
              right: `${window.innerWidth - position.x}px`,
              zIndex: 100000,
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(12px)",
              borderRadius: "12px",
              padding: "8px",
              minWidth: "180px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <button
              onClick={toggleVisibility}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <FiEyeOff size={16} color="#f87171" />
              <span>Hide AI Assistant</span>
              <span style={{ marginLeft: "auto", fontSize: "10px", color: "#64748b" }}>
                Alt+A
              </span>
            </button>
            <button
              onClick={() => {
                setShowToggleMenu(false);
                // Reset position to default
                setPosition({ x: window.innerWidth - 85, y: window.innerHeight - 120 });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <FiEye size={16} color="#60a5fa" />
              <span>Reset Position</span>
            </button>
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              margin: "4px 8px",
              paddingTop: "6px",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 14px",
                color: "#64748b",
                fontSize: "11px",
              }}>
                <span>💡</span>
                <span>Always hidden by default</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound Wave Rings - Positioned around the button */}
      <div
        style={{
          position: "fixed",
          left: `${position.x + 30}px`,
          top: `${position.y + 30}px`,
          zIndex: 99998,
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
        }}
      >
        {['rgba(82, 197, 5, 0.97)', 'rgba(89, 207, 10, 0.91)'].map((color, index) => (
          <div
            key={index}
            className="wave-ring"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: `${60 + (index + 1) * 20}px`,
              height: `${60 + (index + 1) * 20}px`,
              borderRadius: "50%",
              border: `2px solid ${color}`,
              animationDelay: `${index * 0.3}s`,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {/* Main Button */}
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #f8f8f8, #ffffff)",
          border: "3px solid rgb(27, 167, 8)",
          boxShadow: isHovered 
            ? "0 8px 32px rgba(27, 167, 8, 0.4), 0 0 0 8px rgba(27, 167, 8, 0.1)"
            : "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: "none",
          touchAction: "none",
          transition: "all 0.3s ease",
          padding: "8px",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <img 
          src={logoImg} 
          alt="ZUCA AI" 
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transition: "transform 0.3s ease",
            borderRadius: "50%",
          }}
        />
        
        {/* Toggle menu button (small gear/eye icon) */}
        <button
          onClick={handleToggleClick}
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "rgba(15, 23, 42, 0.9)",
            border: "2px solid rgba(255,255,255,0.3)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            transition: "all 0.3s ease",
            padding: 0,
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(82, 197, 5, 0.9)";
            e.currentTarget.style.transform = "scale(1.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(15, 23, 42, 0.9)";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Options (Alt+A to toggle visibility)"
        >
          <FiEyeOff size={10} />
        </button>
        
        {/* Pulse animation ring - Gold */}
        <div style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "2px solid rgba(255, 215, 0, 0.3)",
          animation: "pulse-ring-gold 2s ease-out infinite",
          pointerEvents: "none",
        }} />
        
        {/* Small status dot */}
        <div style={{
          position: "absolute",
          bottom: "2px",
          right: "2px",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "#22c55e",
          border: "2px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }} />
        
        {/* AI label on hover */}
        <div style={{
          position: "absolute",
          bottom: "-28px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          fontWeight: "700",
          color: "white",
          background: "rgba(15, 23, 42, 0.9)",
          padding: "4px 12px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          whiteSpace: "nowrap",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          ZUCA AI
        </div>
      </motion.button>

      <style>{`
        @keyframes pulse-ring-gold {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @keyframes pulse-ring-green {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes waveExpand {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        .wave-ring {
          animation: waveExpand 2.5s ease-out infinite;
          pointer-events: none;
        }
      `}</style>
    </>
  );
};

export default FloatingAIAssistantButton;