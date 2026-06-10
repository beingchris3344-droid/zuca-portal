// ================== ZUCA SERVICE WORKER - PRODUCTION READY ==================
const CACHE_NAME = 'zuca-v6';
const SYNC_TAG = 'sync-checkins';

// Only cache these static assets
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// File extensions to cache (static assets only)
const CACHEABLE_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.woff', '.woff2'];

// ================== HELPER FUNCTIONS ==================
function isStaticAsset(url) {
  return CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

function isApiCall(url) {
  // Skip ALL API calls - never intercept
  return url.pathname.includes('/api/');
}

// ================== INSTALL ==================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
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
    })
  );
  
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// ================== FETCH - MAIN HANDLER ==================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // CRITICAL: NEVER intercept API calls
  if (isApiCall(url)) {
    // Let browser handle all API requests directly
    return;
  }
  
  // Handle navigation (HTML pages) with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.match('/index.html');
        });
      })
    );
    return;
  }
  
  // Handle static assets (JS, CSS, images)
  if (event.request.method === 'GET' && isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
              return response;
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// ================== BACKGROUND SYNC ==================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingCheckins());
  }
});

async function syncPendingCheckins() {
  console.log('[SW] Starting background sync...');
  
  try {
    const db = await openDB();
    const pending = await getPendingCheckinsFromDB(db);
    
    if (pending.length === 0) {
      console.log('[SW] No pending check-ins to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${pending.length} pending check-ins...`);
    
    const token = await getTokenFromCache();
    if (!token) {
      console.log('[SW] No auth token available');
      return;
    }
    
    let synced = 0;
    
    for (const checkin of pending) {
      try {
        const response = await fetch('https://zuca-backend-iw9p.onrender.com/api/attendance/self-checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sheetId: checkin.sheetId,
            deviceId: checkin.deviceId,
            deviceName: `${checkin.deviceName} (Background Sync)`
          })
        });
        
        if (response.ok) {
          await removePendingCheckinFromDB(db, checkin.id);
          synced++;
          console.log(`[SW] ✅ Synced: ${checkin.sheetId}`);
        }
      } catch (error) {
        console.error(`[SW] Failed to sync ${checkin.sheetId}:`, error);
      }
    }
    
    console.log(`[SW] Background sync complete: ${synced} synced`);
    
    // Notify all open windows
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced: synced
      });
    });
    
    if (synced > 0) {
      await showSyncNotification(synced, pending.length);
    }
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// ================== INDEXEDDB HELPERS ==================
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zuca_offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getPendingCheckinsFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingCheckins', 'readonly');
    const store = tx.objectStore('pendingCheckins');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function removePendingCheckinFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingCheckins', 'readwrite');
    const store = tx.objectStore('pendingCheckins');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getTokenFromCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/auth-token');
    if (response && response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('[SW] Failed to get token from cache:', error);
  }
  return null;
}

async function showSyncNotification(synced, total) {
  try {
    await self.registration.showNotification('✅ ZUCA Attendance Synced', {
      body: `${synced} of ${total} offline check-in(s) have been synced.`,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: { url: '/member/attendance' }
    });
  } catch (error) {
    console.error('[SW] Failed to show notification:', error);
  }
}

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
    data: { url: '/' }
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      options.body = payload.body || options.body;
      options.data.url = payload.data?.url || payload.url || '/';
    } catch (err) {
      options.body = event.data.text() || options.body;
    }
  }
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// ================== NOTIFICATION CLICK ==================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        // Try to focus an existing window/tab
        for (const client of clientsArr) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        return self.clients.openWindow(url);
      })
  );
});

// ================== PUSH SUBSCRIPTION CHANGE ==================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  // Optionally re-subscribe or update subscription on server
});