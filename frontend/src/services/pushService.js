// frontend/src/services/pushService.js
import badgeManager from '../utils/badgeManager';
import BASE_URL from '../api';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.vapidPublicKey = null;
    this.permission = 'default';
    this.notificationCallbacks = [];
    this.isSubscribed = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
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
    
    // Dispatch custom event for global listeners
    window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
  }

  // Setup in-app notifications listener
  setupInAppNotifications() {
    if (!('serviceWorker' in navigator)) return;
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 Message from service worker:', event.data);
      
      const { type, data } = event.data || {};
      
      if (type === 'NOTIFICATION_CLICK') {
        console.log('Notification clicked from service worker:', data);
        // Handle navigation
        if (data?.url) {
          window.location.href = data.url;
        }
      }
      
      if (type === 'AUTH_TOKEN_RESPONSE') {
        // This is handled in the message channel
        console.log('Auth token response received');
      }
      
      if (type === 'GAME_INVITE_ACCEPTED') {
        window.dispatchEvent(new CustomEvent('acceptGameInvite', { detail: data }));
      }
    });
    
    // Set up message channel for auth token requests
    if (navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'GET_AUTH_TOKEN') {
          const token = localStorage.getItem('token');
          messageChannel.port1.postMessage({
            type: 'AUTH_TOKEN_RESPONSE',
            token: token
          });
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'REGISTER_CLIENT', userId: localStorage.getItem('userId') },
        [messageChannel.port2]
      );
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
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      
      if (!data.publicKey) {
        console.error('No VAPID public key in response');
        return false;
      }
      
      this.vapidPublicKey = data.publicKey;
      console.log('✅ VAPID key loaded');
      
      this.setupInAppNotifications();
      return true;
    } catch (err) {
      console.error('Failed to get VAPID key:', err);
      return false;
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
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
      } else if (permission === 'denied') {
        console.log('❌ Notification permission denied');
      }
      
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
      // Unregister any old service workers first
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active && registration.active.scriptURL.includes('sw.js')) {
          console.log('Found existing service worker');
        }
      }
      
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered:', this.swRegistration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');
      
      // Check for waiting service worker (update)
      if (this.swRegistration.waiting) {
        console.log('⏳ Update waiting, sending skip waiting');
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Listen for updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;
        console.log('🆕 New service worker found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✅ Update available, refreshing...');
            // Prompt user or auto-refresh
            if (confirm('New version available! Refresh to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
      
      return true;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.swRegistration) {
      const registered = await this.registerServiceWorker();
      if (!registered) return false;
    }

    if (!this.vapidPublicKey) {
      const initialized = await this.init();
      if (!initialized) return false;
    }

    // Safety check
    if (!this.vapidPublicKey || this.vapidPublicKey === 'undefined') {
      console.error('Invalid VAPID public key');
      return false;
    }

    try {
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        
        // Check if applicationServerKey is valid
        if (!applicationServerKey || applicationServerKey.length === 0) {
          console.error('Invalid application server key');
          return false;
        }
        
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        
        console.log('✅ New push subscription created');
        this.isSubscribed = true;
      } else {
        console.log('✅ Using existing push subscription');
        this.isSubscribed = true;
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
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      console.log('✅ Push subscription saved to server');
      
      // Load badge count after subscription
      await badgeManager.loadCount();
      
      return true;
    } catch (err) {
      console.error('Failed to subscribe to push:', err);
      this.isSubscribed = false;
      
      // Try to re-subscribe if it was a network error
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Retrying subscription (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.subscribe(), 5000);
      }
      
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
        console.log('✅ Unsubscribed from push manager');
      }

      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch(`${BASE_URL}/api/notifications/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          console.log('✅ Subscription removed from server');
        }
      }

      console.log('✅ Successfully unsubscribed');
      this.isSubscribed = false;
      this.reconnectAttempts = 0;
      
      // Clear badge on unsubscribe
      await badgeManager.updateBadgeCount(0);
      
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      return false;
    }
  }

  // Check if already subscribed
  async checkSubscription() {
    if (!this.swRegistration) {
      await this.registerServiceWorker();
    }
    
    if (this.swRegistration) {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = !!subscription;
      return this.isSubscribed;
    }
    
    return false;
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    // Safety check
    if (!base64String || base64String === 'undefined' || base64String === 'null') {
      console.error('Invalid VAPID key:', base64String);
      return new Uint8Array(0);
    }
    
    try {
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
    } catch (err) {
      console.error('Failed to convert VAPID key:', err);
      return new Uint8Array(0);
    }
  }

  // Get current permission status
  getPermissionStatus() {
    return Notification.permission;
  }

  // Get subscription status
  async getSubscriptionStatus() {
    return this.isSubscribed;
  }

  // Clear all badges (useful on logout)
  async clearBadge() {
    await badgeManager.updateBadgeCount(0);
  }

  // Send test notification (for debugging)
  async sendTestNotification() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Not logged in');
      return false;
    }
    
    try {
      const response = await fetch(`${BASE_URL}/api/send-test-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        console.log('✅ Test notification sent');
        return true;
      }
    } catch (err) {
      console.error('Failed to send test notification:', err);
    }
    return false;
  }

  // Complete setup for logged-in user
  async setupForUser() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No user logged in, skipping push setup');
      return false;
    }
    
    try {
      await this.init();
      await this.registerServiceWorker();
      const permissionGranted = await this.requestPermission();
      
      if (permissionGranted) {
        await this.subscribe();
        console.log('✅ Push notifications fully enabled');
        return true;
      } else {
        console.log('⚠️ Notification permission not granted');
        return false;
      }
    } catch (err) {
      console.error('Failed to setup push notifications:', err);
      return false;
    }
  }
}

export default new PushNotificationService();