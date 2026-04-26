// ============================================
// ZUCA PORTAL - SERVICE WORKER
// Fixed for visible notifications on Android
// ============================================

const CACHE_NAME = 'zuca-v2';

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
// PUSH NOTIFICATION - THE IMPORTANT PART
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received!');
  
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
  
  try {
    if (event.data) {
      const pushData = event.data.json();
      console.log('[SW] Push data:', pushData);
      
      title = pushData.title || title;
      options.body = pushData.body || options.body;
      options.data.url = pushData.url || pushData.data?.url || '/dashboard';
      options.data.type = pushData.type || 'general';
      options.data.id = pushData.id;
    }
  } catch (err) {
    console.error('[SW] Parse error:', err);
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] ✅ Notification shown!'))
      .catch(err => console.error('[SW] Failed:', err))
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === url || client.url.includes('/dashboard')) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});