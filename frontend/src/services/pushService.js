// frontend/src/services/pushService.js
import badgeManager from '../utils/badgeManager';
import BASE_URL from '../api';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.vapidPublicKey = null;
    this.permission = 'default';
    this.notificationCallbacks = [];
  }

  // Register a callback for incoming notifications
  onNotification(callback) {
    this.notificationCallbacks.push(callback);
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }

  // Handle in-app notification
  handleInAppNotification(notification) {
    console.log('📱 In-app notification received:', notification);
    
    // ✅ Increment badge count when notification arrives
    badgeManager.increment();
    
    // Call all registered callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (err) {
        console.error('Error in notification callback:', err);
      }
    });
  }

  // Setup in-app notifications listener
  setupInAppNotifications() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REGISTER_CLIENT',
        userId: localStorage.getItem('userId')
      });
    }
    
    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          console.log('Notification clicked from service worker:', event.data.payload);
          // Handle navigation
          if (event.data.payload.url) {
            window.location.href = event.data.payload.url;
          }
        }
      });
    }
  }

  // Update badge count
  async updateBadgeCount(count) {
    return badgeManager.updateBadgeCount(count);
  }

  // Initialize - fetch VAPID key
  async init() {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/vapid-public-key`);
      const data = await res.json();
      this.vapidPublicKey = data.publicKey;
      console.log('✅ VAPID key loaded');
      
      this.setupInAppNotifications();
    } catch (err) {
      console.error('Failed to get VAPID key:', err);
    }
  }

  // Request permission from user
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notifications are blocked');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting permission:', err);
      return false;
    }
  }

  // Register service worker
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', this.swRegistration);
      
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');
      
      return true;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.swRegistration) {
      await this.registerServiceWorker();
    }

    if (!this.vapidPublicKey) {
      await this.init();
    }

    // Safety check
    if (!this.vapidPublicKey) {
      console.error('No VAPID public key available');
      return false;
    }

    try {
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        
        console.log('✅ New push subscription created');
      } else {
        console.log('✅ Using existing push subscription');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('User not logged in, skipping server subscription');
        return false;
      }

      // Save subscription to server
      const response = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('✅ Push subscription saved to server');
      
      // Load badge count after subscription
      await badgeManager.loadCount();
      
      return true;
    } catch (err) {
      console.error('Failed to subscribe to push:', err);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.swRegistration) return true;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${BASE_URL}/api/notifications/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      console.log('✅ Successfully unsubscribed');
      
      // Clear badge on unsubscribe
      await badgeManager.updateBadgeCount(0);
      
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      return false;
    }
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    // Safety check
    if (!base64String || base64String === 'undefined' || base64String === 'null') {
      console.error('Invalid VAPID key:', base64String);
      return new Uint8Array(0);
    }
    
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get current permission status
  getPermissionStatus() {
    return Notification.permission;
  }

  // Clear all badges (useful on logout)
  async clearBadge() {
    await badgeManager.updateBadgeCount(0);
  }
}

export default new PushNotificationService();