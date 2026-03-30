// frontend/src/components/Notifications.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiBell, FiX, FiCheck, FiClock, FiEyeOff } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import io from "socket.io-client";
import badgeManager from "../utils/badgeManager";
import pushService from "../services/pushService";

export default function Notifications({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);
  const hasMarkedReadForCurrentPage = useRef(new Set());
  
  // Store dismissed notifications in localStorage (persists across refreshes)
  const [dismissedIds, setDismissedIds] = useState(() => {
    if (!userId) return new Set();
    const saved = localStorage.getItem(`dismissed_notifications_${userId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save dismissed IDs to localStorage whenever they change
  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(
      `dismissed_notifications_${userId}`, 
      JSON.stringify([...dismissedIds])
    );
  }, [dismissedIds, userId]);

  // Fetch notifications - FILTER OUT DISMISSED ONES
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out dismissed notifications
      const filtered = res.data.filter(n => !dismissedIds.has(n.id));
      setNotifications(filtered);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dismissedIds]);

  // Connect to Socket.IO for real-time updates
  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current.emit('join', userId);
    });

    // ========== FIXED NEW NOTIFICATION HANDLER ==========
    socketRef.current.on('new_notification', (notification) => {
      try {
        console.log('🔔 New notification received:', notification);
        
        if (dismissedIds.has(notification.id)) {
          console.log('Notification was previously dismissed, ignoring');
          return;
        }
        
        // ✅ REMOVED: soundManager.playNotificationSound() - Let system handle sound
        
        setNotifications(prev => {
          const exists = prev.some(n => n.id === notification.id);
          if (exists) return prev;
          
          // ✅ KEEP THIS - In-app toast only (shows when app is open)
          try {
            if (window.showInAppToast) {
              window.showInAppToast({
                title: notification.title || "New Notification",
                message: notification.message,
                body: notification.message,
                type: notification.type,
                id: notification.id,
                entityId: notification.entityId,
                createdAt: notification.createdAt,
                data: notification.data
              });
            }
          } catch(e) { console.log('Toast error:', e); }
          
          // ✅ REMOVED: Browser notification code - Service worker handles this
          // The service worker already shows native notifications with system sound
          
          // Badge - keep this
          try {
            if (badgeManager && badgeManager.incrementBadge) {
              badgeManager.incrementBadge();
            }
          } catch(e) { console.log('Badge error:', e); }
          
          return [notification, ...prev];
        });
        
      } catch(err) {
        console.error('Notification handler crashed:', err);
      }
    });

    socketRef.current.on('new_notification_batch', () => {
      fetchNotifications();
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Socket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, dismissedIds, fetchNotifications]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // Don't auto-request - let the user click enable button
      // Notification.requestPermission(); // REMOVED auto-request
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Update unread count and badge
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
    // Update app badge (like WhatsApp)
    badgeManager.updateBadgeCount(unread);
  }, [notifications]);

  // Load badge count on mount
  useEffect(() => {
    badgeManager.loadCount();
  }, []);

  // Auto-mark notifications as read when viewing their pages
  useEffect(() => {
    if (!userId || !location.pathname) return;

    const markNotificationsForCurrentPage = async () => {
      let pageType = null;
      let pagePath = location.pathname;

      if (pagePath.includes('/announcements')) {
        pageType = 'announcement';
      } else if (pagePath.includes('/mass-programs')) {
        pageType = 'program';
      } else if (pagePath.includes('/chat')) {
        pageType = 'message';
      } else if (pagePath.includes('/contributions')) {
        pageType = 'contribution';
      } else if (pagePath.includes('/jumuia-contributions')) {
        pageType = 'contribution';
      } else if (pagePath.includes('/gallery')) {
        pageType = 'new_media';
      } else if (pagePath.includes('/dashboard')) {
        return;
      }

      if (!pageType) return;

      const pageKey = `${pageType}-${pagePath}`;
      
      if (hasMarkedReadForCurrentPage.current.has(pageKey)) return;

      const unreadForThisPage = notifications.filter(
        n => !n.read && n.type === pageType
      );

      if (unreadForThisPage.length === 0) return;

      console.log(`Auto-marking ${unreadForThisPage.length} ${pageType} notifications as read`);

      try {
        const token = localStorage.getItem("token");
        
        await axios.put(
          `${BASE_URL}/api/notifications/mark-by-type/${userId}`,
          { type: pageType },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setNotifications(prev =>
          prev.map(n => 
            n.type === pageType ? { ...n, read: true } : n
          )
        );

        hasMarkedReadForCurrentPage.current.add(pageKey);
        
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }
    };

    const timer = setTimeout(() => {
      markNotificationsForCurrentPage();
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, userId, notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );

      // Decrement badge count
      badgeManager.decrementBadge();

      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
    } catch (err) {
      console.error("Error marking as read:", err);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );

      // Clear badge count
      badgeManager.updateBadgeCount(0);

      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/notifications/${userId}/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
    } catch (err) {
      console.error("Error marking all as read:", err);
      fetchNotifications();
    }
  };

  // Dismiss all notifications PERMANENTLY (stored in localStorage)
  const dismissAllFromDropdown = () => {
    const newDismissed = new Set(dismissedIds);
    notifications.forEach(n => newDismissed.add(n.id));
    setDismissedIds(newDismissed);
    
    setNotifications([]);
    setShowDropdown(false);
    // Clear badge
    badgeManager.updateBadgeCount(0);
    console.log("All notifications permanently dismissed");
  };

  // Dismiss single notification PERMANENTLY
  const dismissNotification = (notificationId) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(notificationId);
    setDismissedIds(newDismissed);
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Update badge after dismissal
    const newUnreadCount = notifications.filter(n => n.id !== notificationId && !n.read).length;
    badgeManager.updateBadgeCount(newUnreadCount);
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    
    let path = '/dashboard';
    switch(notif.type) {
      case 'announcement':
        path = '/announcements';
        break;
      case 'program':
        path = '/mass-programs';
        break;
      case 'message':
        path = '/chat';
        break;
      case 'contribution':
        path = '/contributions';
        break;
      case 'new_media':
        path = '/gallery';
        break;
      case 'media_comment':
        if (notif.data?.mediaId) {
          path = `/gallery?media=${notif.data.mediaId}`;
        } else {
          path = '/gallery';
        }
        break;
      case 'media_like':
        path = '/gallery';
        break;
    }
    
    navigate(path);
    setShowDropdown(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Just now';
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'announcement': return '📢';
      case 'message': return '💬';
      case 'program': return '⛪';
      case 'event': return '📅';
      case 'contribution': return '💰';
      case 'new_media': return '📸';
      case 'media_comment': return '💬';
      case 'media_like': return '❤️';
      default: return '🔔';
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div style={styles.container} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDropdown(!showDropdown)}
        style={styles.bellButton}
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={styles.badge}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
        {isLoading && unreadCount === 0 && (
          <span style={styles.loadingDot} />
        )}
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={styles.dropdown}
          >
            <div style={styles.dropdownHeader}>
              <h3 style={styles.dropdownTitle}>
                Notifications
                {unreadCount > 0 && (
                  <span style={styles.unreadCountBadge}>{unreadCount} new</span>
                )}
              </h3>
              <div style={styles.headerActions}>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={styles.markAllButton} title="Mark all as read">
                    <FiCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={dismissAllFromDropdown} style={styles.dismissAllButton} title="Dismiss all from view">
                    <FiEyeOff size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={styles.notificationList}>
              {/* Unread Section */}
              {unreadNotifications.length > 0 && (
                <>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>NEW</span>
                  </div>
                  {unreadNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      style={styles.notificationItemWrapper}
                    >
                      <div 
                        style={styles.unreadNotificationItem}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div style={styles.notificationIcon}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div style={styles.notificationContent}>
                          <div style={styles.notificationTitle}>{notif.title}</div>
                          <div style={styles.notificationMessage}>{notif.message}</div>
                          <div style={styles.notificationTime}>
                            <FiClock size={10} />
                            {formatTime(notif.createdAt)}
                          </div>
                        </div>
                        <div style={styles.unreadDot} />
                      </div>
                      <button 
                        style={styles.dismissButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notif.id);
                        }}
                        title="Dismiss permanently"
                      >
                        <FiX size={14} />
                      </button>
                    </motion.div>
                  ))}
                </>
              )}

              {/* Read Section */}
              {readNotifications.length > 0 && (
                <>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>EARLIER</span>
                  </div>
                  {readNotifications.slice(0, 5).map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={styles.notificationItemWrapper}
                    >
                      <div 
                        style={styles.readNotificationItem}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div style={styles.notificationIcon}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div style={styles.notificationContent}>
                          <div style={styles.notificationTitle}>{notif.title}</div>
                          <div style={styles.notificationMessage}>{notif.message}</div>
                          <div style={styles.notificationTime}>
                            <FiClock size={10} />
                            {formatTime(notif.createdAt)}
                          </div>
                        </div>
                      </div>
                      <button 
                        style={styles.dismissButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notif.id);
                        }}
                        title="Dismiss permanently"
                      >
                        <FiX size={14} />
                      </button>
                    </motion.div>
                  ))}
                  {readNotifications.length > 5 && (
                    <div style={styles.viewAllContainer}>
                      <button style={styles.viewAllButton}>
                        View all read notifications
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Empty State */}
              {notifications.length === 0 && (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🔔</span>
                  <p style={styles.emptyText}>No notifications</p>
                </div>
              )}
            </div>

            <div style={styles.dropdownFooter}>
              <button onClick={() => setShowDropdown(false)} style={styles.closeButton}>
                <FiX size={14} /> Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    zIndex: 999999,
  },
  
  bellButton: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "12px",
    padding: "8px 12px",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    transition: "all 0.2s",
  },
  
  badge: {
    position: "absolute",
    top: "-5px",
    right: "-5px",
    background: "#ef4444",
    color: "white",
    fontSize: "10px",
    fontWeight: "bold",
    borderRadius: "50%",
    width: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  
  loadingDot: {
    position: "absolute",
    top: "0px",
    right: "0px",
    width: "8px",
    height: "8px",
    background: "#3b82f6",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite",
  },
  
  dropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: "0",
    width: "380px",
    maxWidth: "calc(100vw - 20px)",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    overflow: "hidden",
    zIndex: 1000,
  },
  
  dropdownHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
  },
  
  dropdownTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  
  unreadCountBadge: {
    background: "#3b82f6",
    color: "white",
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "20px",
    fontWeight: "500",
  },
  
  headerActions: {
    display: "flex",
    gap: "8px",
  },
  
  markAllButton: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "8px",
    padding: "6px",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  
  dismissAllButton: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "8px",
    padding: "6px",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  
  notificationList: {
    maxHeight: "400px",
    overflowY: "auto",
  },
  
  sectionHeader: {
    padding: "12px 20px 8px",
    background: "#f8fafc",
  },
  
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: "0.5px",
  },
  
  notificationItemWrapper: {
    display: "flex",
    alignItems: "flex-start",
    borderBottom: "1px solid #f1f5f9",
    position: "relative",
  },
  
  unreadNotificationItem: {
    flex: 1,
    padding: "14px 20px",
    cursor: "pointer",
    display: "flex",
    gap: "12px",
    background: "#eff6ff",
    transition: "background 0.2s",
  },
  
  readNotificationItem: {
    flex: 1,
    padding: "14px 20px",
    cursor: "pointer",
    display: "flex",
    gap: "12px",
    transition: "background 0.2s",
  },
  
  notificationIcon: {
    fontSize: "20px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    borderRadius: "10px",
  },
  
  notificationContent: {
    flex: 1,
  },
  
  notificationTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: "4px",
  },
  
  notificationMessage: {
    fontSize: "13px",
    color: "#475569",
    marginBottom: "6px",
    lineHeight: "1.4",
  },
  
  notificationTime: {
    fontSize: "11px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  
  unreadDot: {
    width: "8px",
    height: "8px",
    background: "#3b82f6",
    borderRadius: "50%",
    marginTop: "16px",
  },
  
  dismissButton: {
    background: "transparent",
    border: "none",
    padding: "8px",
    cursor: "pointer",
    color: "#cbd5e1",
    borderRadius: "6px",
    margin: "8px",
    transition: "all 0.2s",
  },
  
  emptyState: {
    padding: "60px 20px",
    textAlign: "center",
  },
  
  emptyIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "12px",
  },
  
  emptyText: {
    fontSize: "14px",
    color: "#94a3b8",
    margin: 0,
  },
  
  viewAllContainer: {
    padding: "12px 20px",
    textAlign: "center",
    borderTop: "1px solid #f1f5f9",
  },
  
  viewAllButton: {
    background: "transparent",
    border: "none",
    color: "#3b82f6",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  
  dropdownFooter: {
    padding: "12px 20px",
    borderTop: "1px solid #e2e8f0",
    textAlign: "center",
  },
  
  closeButton: {
    background: "#f1f5f9",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#64748b",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
};

// Add keyframes for animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
`;
document.head.appendChild(styleSheet);