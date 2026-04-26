// public/sw.js - Enhanced with Badge Support
self.__WB_MANIFEST;

const CACHE_NAME = 'zuca-portal-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// ========== PUSH NOTIFICATIONS WITH BADGE SUPPORT ==========
self.addEventListener('push', (event) => {
  console.log('[SW] 📱 Push received:', event);
  
  let data = {};
  let notificationTitle = 'ZUCA Portal';
  let notificationOptions = {
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    requireInteraction: true,
    silent: false,
    tag: 'zuca-notification',
    renotify: true,
    data: {
      url: '/',
      type: 'notification',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: '📖 View Details'
      },
      {
        action: 'dismiss',
        title: '❌ Dismiss'
      }
    ]
  };
  
  try {
    if (event.data) {
      data = event.data.json();
      console.log('[SW] Push data:', data);
      
      notificationTitle = data.title || 'ZUCA Portal';
      notificationOptions = {
        body: data.body || 'You have a new notification',
        icon: data.icon || '/android-chrome-192x192.png',
        badge: data.badge || '/favicon.ico',
        vibrate: data.vibrate || [200, 100, 200],
        timestamp: data.timestamp || Date.now(),
        requireInteraction: data.requireInteraction !== false,
        silent: data.silent || false,
        tag: data.tag || `zuca-${data.type || 'notification'}-${data.id || Date.now()}`,
        renotify: data.renotify !== false,
        data: {
          url: data.url || '/',
          type: data.type || 'notification',
          id: data.id,
          entityId: data.entityId,
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'view',
            title: '📖 View Details'
          },
          {
            action: 'dismiss',
            title: '❌ Dismiss'
          }
        ]
      };
      
      // ✅ SET APP BADGE WHEN PUSH ARRIVES
      const badgeCount = data.badgeCount || 1;
      if (self.navigator && self.navigator.setAppBadge) {
        self.navigator.setAppBadge(badgeCount);
        console.log(`[SW] 📱 App badge set to ${badgeCount}`);
      } else {
        console.log('[SW] ⚠️ Badge API not supported in this browser');
      }
    }
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
  }

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[SW] Notification shown');
      })
  );
});

// ========== NOTIFICATION CLICK HANDLER ==========
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🔔 Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  // ✅ CLEAR APP BADGE WHEN NOTIFICATION IS CLICKED
  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge();
    console.log('[SW] 📱 App badge cleared');
  }
  
  if (action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }
  
  let urlToOpen = data.url || '/';
  
  if (data.type === 'announcement' && data.id) {
    urlToOpen = `/announcements/${data.id}`;
  } else if (data.type === 'gallery') {
    urlToOpen = '/gallery';
  } else if (data.type === 'mass' || data.type === 'calendar') {
    urlToOpen = '/liturgical-calendar';
  } else if (data.type === 'event' && data.entityId) {
    urlToOpen = `/events/${data.entityId}`;
  }
  
  console.log('[SW] Opening URL:', urlToOpen);
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen || client.url.includes('/dashboard')) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ========== MESSAGE HANDLER FROM APP ==========
self.addEventListener('message', (event) => {
  console.log('[SW] Message from app:', event.data);
  
  // Handle badge updates from app
  if (event.data.type === 'UPDATE_BADGE') {
    const count = event.data.count || 0;
    if (self.navigator && self.navigator.setAppBadge) {
      if (count > 0) {
        self.navigator.setAppBadge(count);
        console.log(`[SW] 📱 Badge updated to ${count}`);
      } else {
        self.navigator.clearAppBadge();
        console.log('[SW] 📱 Badge cleared');
      }
    }
  }
  
  // Handle skip waiting for auto-updates
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating new version...');
    self.skipWaiting();
  }
});