// src/components/InAppNotification.jsx - WITHOUT soundManager

import React, { useState, useEffect } from 'react';
import { X, Bell, Megaphone, Calendar, Heart, MessageCircle, Camera, DollarSign } from 'lucide-react';
// DELETE: import soundManager from '../utils/soundManager';

const InAppNotification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // DELETE THIS WHOLE SECTION:
    // if (notification.type === 'message') {
    //   soundManager.playMessageSound();
    // } else {
    //   soundManager.playNotificationSound();
    // }
    
    // Just auto close after 5 seconds - NO CUSTOM SOUND
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  // Rest of your component stays the same...
  const getIcon = () => {
    switch(notification.type) {
      case 'announcement': return <Megaphone size={20} />;
      case 'event':
      case 'program': return <Calendar size={20} />;
      case 'message': return <MessageCircle size={20} />;
      case 'contribution': return <DollarSign size={20} />;
      case 'new_media':
      case 'media_comment':
      case 'media_like': return <Camera size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const getColor = () => {
    switch(notification.type) {
      case 'announcement': return '#00c6ff';
      case 'event':
      case 'program': return '#8b5cf6';
      case 'message': return '#10b981';
      case 'contribution': return '#f59e0b';
      case 'new_media': return '#ec489a';
      case 'media_comment': return '#3b82f6';
      case 'media_like': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const handleClick = () => {
    let path = '/dashboard';
    
    switch(notification.type) {
      case 'announcement': path = '/announcements'; break;
      case 'program': path = '/mass-programs'; break;
      case 'message': path = '/chat'; break;
      case 'contribution': path = '/contributions'; break;
      case 'new_media': path = '/gallery'; break;
      case 'media_comment':
        path = notification.entityId ? `/gallery?media=${notification.entityId}` : '/gallery';
        break;
      case 'media_like': path = '/gallery'; break;
    }
    
    try {
      if (window.navigate) {
        window.navigate(path);
      } else {
        window.location.href = path;
      }
    } catch (err) {
      window.location.href = path;
    }
    
    onClose();
  };

  const getTimeAgo = () => {
    const now = new Date();
    const notifTime = new Date(notification.createdAt || notification.timestamp || Date.now());
    const diff = now - notifTime;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return notifTime.toLocaleDateString();
  };

  if (!isVisible) return null;

  return (
    <div 
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        maxWidth: '380px',
        minWidth: '280px',
        background: 'rgba(26, 26, 46, 0.98)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        borderLeft: `4px solid ${getColor()}`,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        zIndex: 10000,
        cursor: 'pointer',
        animation: 'slideInRight 0.3s ease'
      }}
    >
      <div style={{ padding: '14px 16px', display: 'flex', gap: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: `${getColor()}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: getColor()
        }}>
          {getIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: 'white', 
            fontSize: '14px',
            marginBottom: '4px'
          }}>
            {notification.title || 'ZUCA Portal'}
          </div>
          <div style={{ 
            color: 'rgba(255,255,255,0.8)', 
            fontSize: '13px',
            lineHeight: '1.4',
            marginBottom: '6px'
          }}>
            {notification.message || notification.body}
          </div>
          <div style={{ 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>🕐</span>
            <span>{getTimeAgo()}</span>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            padding: '4px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={14} />
        </button>
      </div>
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default InAppNotification;