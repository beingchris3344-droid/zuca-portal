// src/utils/badgeManager.js
class BadgeManager {
  constructor() {
    this.unreadCount = 0;
    this.listeners = [];
  }

  // Update badge count on app icon
  async updateBadgeCount(count) {
    this.unreadCount = Math.max(0, count);
    
    // Save to localStorage
    localStorage.setItem('zuca_unread_count', this.unreadCount);
    
    // Update app badge (like WhatsApp)
    if ('setAppBadge' in navigator) {
      try {
        if (this.unreadCount > 0) {
          await navigator.setAppBadge(this.unreadCount);
          console.log(`📱 App badge set to ${this.unreadCount}`);
        } else {
          await navigator.clearAppBadge();
          console.log('📱 App badge cleared');
        }
      } catch (err) {
        console.error('Badge error:', err);
      }
    }
    
    // Notify service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE',
        count: this.unreadCount
      });
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => listener(this.unreadCount));
    
    return this.unreadCount;
  }

  // Increment badge count by 1
  incrementBadge() {
    return this.updateBadgeCount(this.unreadCount + 1);
  }

  // Decrement badge count by 1
  decrementBadge() {
    return this.updateBadgeCount(Math.max(0, this.unreadCount - 1));
  }

  // Get current unread count
  getUnreadCount() {
    return this.unreadCount;
  }

  // Add listener for badge changes
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Load saved count from storage
  loadCount() {
    const saved = localStorage.getItem('zuca_unread_count');
    if (saved) {
      this.unreadCount = parseInt(saved, 10);
      this.updateBadgeCount(this.unreadCount);
    }
    return this.unreadCount;
  }
}

export default new BadgeManager();