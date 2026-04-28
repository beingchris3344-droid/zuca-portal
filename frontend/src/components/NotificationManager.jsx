// src/components/NotificationManager.jsx
import React, { useState, useEffect } from 'react';
import InAppNotification from './InAppNotification';
import soundManager from '../utils/soundManager';

const NotificationManager = ({ children }) => {
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Helper: Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Show in-app notification (existing functionality)
  const showInAppNotification = (notification) => {
    const id = Date.now();
    setActiveNotifications(prev => [...prev, { id, ...notification }]);
    
    // Play sound based on notification type
    if (notification.type === 'announcement') {
      soundManager.play('announcement');
    } else if (notification.type === 'game_invite') {
      soundManager.play('gameInvite');
    } else if (notification.type === 'payment') {
      soundManager.play('payment');
    } else {
      soundManager.play('default');
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!isPushSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    setSubscriptionLoading(true);
    
    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permission denied');
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from backend
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/notifications/vapid-public-key`);
      const { publicKey } = await response.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      const token = localStorage.getItem('authToken');
      await fetch(`${apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      setIsPushSubscribed(true);
      
      // Show success notification
      showInAppNotification({
        title: '🔔 Notifications Enabled',
        message: 'You will now receive push notifications even when the app is closed!',
        type: 'success',
        duration: 3000
      });
      
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      
      showInAppNotification({
        title: '❌ Failed to Enable Notifications',
        message: error.message || 'Please check your browser permissions',
        type: 'error',
        duration: 4000
      });
      
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    if (!isPushSupported) return false;

    setSubscriptionLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Tell backend to remove subscription
        const token = localStorage.getItem('authToken');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        
        await fetch(`${apiUrl}/api/notifications/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setIsPushSubscribed(false);
        
        showInAppNotification({
          title: '🔕 Notifications Disabled',
          message: 'You will no longer receive push notifications',
          type: 'info',
          duration: 3000
        });
        
        return true;
      }
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Initialize push notifications on mount
  useEffect(() => {
    // Initialize sound manager
    soundManager.init();
    
    // Check push support
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsPushSupported(supported);
    
    // Expose method to show notifications from anywhere (existing)
    window.showInAppToast = showInAppNotification;
    
    // Listen for service worker messages (for notification clicks)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          console.log('Notification clicked from service worker:', event.data.payload);
          const payload = event.data.payload;
          
          // Navigate based on the notification data
          if (payload.url) {
            window.location.href = payload.url;
          }
        }
      });
    }
    
    // Check existing subscription if user is logged in
    const checkExistingSubscription = async () => {
      if (!supported) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsPushSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };
    
    checkExistingSubscription();
    
    // Make soundManager available globally for testing
    window.soundManager = soundManager;
    
    // Make push functions available globally (optional, for testing)
    window.pushManager = {
      subscribe: subscribeToPush,
      unsubscribe: unsubscribeFromPush,
      isSubscribed: () => isPushSubscribed
    };
    
  }, []); // Empty dependency array - only run once

  // Auto-subscribe if permission granted but not subscribed
  useEffect(() => {
    const autoSubscribe = async () => {
      if (isPushSupported && 
          Notification.permission === 'granted' && 
          !isPushSubscribed && 
          !subscriptionLoading) {
        // Check if user has an auth token (logged in)
        const token = localStorage.getItem('authToken');
        if (token) {
          console.log('Auto-subscribing to push notifications...');
          await subscribeToPush();
        }
      }
    };
    
    autoSubscribe();
  }, [isPushSupported, isPushSubscribed, subscriptionLoading]);

  const removeNotification = (id) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Provide push context to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        isPushSupported,
        isPushSubscribed,
        subscriptionLoading,
        onSubscribePush: subscribeToPush,
        onUnsubscribePush: unsubscribeFromPush
      });
    }
    return child;
  });

  return (
    <>
      {childrenWithProps}
      {activeNotifications.map(notification => (
        <InAppNotification
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
};

export default NotificationManager;