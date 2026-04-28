// ================== ZUCA SERVICE WORKER ==================
const CACHE_NAME = 'zuca-v4';

// ================== INSTALL ==================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  // ❌ IMPORTANT: Do NOT use skipWaiting here
  // This prevents "app updated in background" spam
  
  // Optional: Cache static assets during install
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico',
        '/android-chrome-192x192.png'
      ]).catch(err => console.log('[SW] Cache add failed:', err));
    })
  );
});

// ================== ACTIVATE ==================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  // Clean up old caches
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
    }).then(() => {
      console.log('[SW] Taking control of clients');
      return self.clients.claim();
    })
  );
});

// ================== FETCH (Enhanced Offline Support) ==================
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Optional: Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('Offline - Check your connection', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// ================== PUSH NOTIFICATIONS ==================
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push received');

  let title = 'ZUCA Portal';
  let options = {
    body: 'New notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    data: {
      url: '/',
      type: 'default'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Payload:', payload);

      title = payload.title || title;
      options.body = payload.body || options.body;
      options.data.url = payload.data?.url || payload.url || '/';
      options.data.type = payload.type || 'default';
      
      // Add badge count if provided
      if (payload.badgeCount) {
        options.badgeCount = payload.badgeCount;
      }

      // Type-based enhancements
      switch(payload.type) {
        case 'announcement':
          options.body = `📢 ${options.body}`;
          options.requireInteraction = true; // Stay longer for announcements
          break;
          
        case 'game_invite':
          options.body = `🎮 ${options.body}`;
          options.vibrate = [500, 200, 500];
          options.silent = false;
          break;
          
        case 'payment':
          options.body = `💰 ${options.body}`;
          options.vibrate = [200, 100, 200, 300, 200];
          break;
          
        case 'reminder':
          options.body = `⏰ ${options.body}`;
          options.requireInteraction = false;
          break;
          
        case 'chat':
          options.body = `💬 ${options.body}`;
          break;
      }
      
      // Add image if provided
      if (payload.image) {
        options.image = payload.image;
      }
      
    } catch (err) {
      console.log('[SW] Non-JSON push payload, using as text');
      options.body = event.data.text() || options.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ================== NOTIFICATION CLICK ==================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data);
  
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const notificationType = event.notification.data?.type;

  // Analytics: Track notification clicks (optional)
  console.log(`[SW] User clicked ${notificationType} notification, navigating to ${url}`);

  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientsArr) => {
      // Check if there's already a window/tab open
      for (const client of clientsArr) {
        if (client.url.includes(url) && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus();
        }
      }
      // Open new window if none exists
      console.log('[SW] Opening new window');
      return self.clients.openWindow(url);
    })
  );
});

// ================== PUSH SUBSCRIPTION CHANGE ==================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed, re-subscribing');
  
  // Notify the server about the subscription change
  event.waitUntil(
    (async () => {
      try {
        // Get all clients to send message to main thread
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            message: 'Subscription expired, please re-subscribe'
          });
        }
      } catch (error) {
        console.error('[SW] Failed to notify subscription change:', error);
      }
    })()
  );
});

// ================== HANDLE MESSAGES FROM MAIN THREAD ==================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received from main thread:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_SUBSCRIPTION':
      // Respond with current subscription status
      event.source.postMessage({
        type: 'SUBSCRIPTION_STATUS',
        isSubscribed: !!self.registration.pushManager.getSubscription()
      });
      break;
  }
});