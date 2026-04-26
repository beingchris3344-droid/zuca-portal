// ============================================
// ZUCA PORTAL - SERVICE WORKER
// Fixed for visible notifications on Android
// ============================================

const CACHE_NAME = 'zuca-v1';

// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event
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

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// ============================================
// PUSH NOTIFICATION - THIS IS THE IMPORTANT PART
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received!');
  
  // Default values
  let title = 'ZUCA Portal';
  let options = {
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    data: {
      url: '/dashboard',
      type: 'general'
    }
  };
  
  // Parse the push data
  try {
    if (event.data) {
      const pushData = event.data.json();
      console.log('[SW] Push data:', pushData);
      
      title = pushData.title || title;
      options.body = pushData.body || options.body;
      options.data.url = pushData.url || pushData.data?.url || '/dashboard';
      options.data.type = pushData.type || 'general';
      options.data.id = pushData.id || pushData.data?.id;
    }
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
  }
  
  // Show the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] ✅ Notification shown!'))
      .catch((err) => console.error('[SW] ❌ Failed to show:', err))
  );
});

// ============================================
// NOTIFICATION CLICK - Opens the app
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen || client.url.includes('/dashboard')) {
            return client.focus();
          }
        }
        // Open new window if none exists
        return self.clients.openWindow(urlToOpen);
      })
  );
});