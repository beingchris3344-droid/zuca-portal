// ================== ZUCA SERVICE WORKER - WITH OFFLINE SUPPORT ==================
const CACHE_NAME = 'zuca-v7';
const SYNC_TAG = 'sync-checkins';
const API_CACHE_NAME = 'zuca-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

const CACHEABLE_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico'];

// ================== HELPER FUNCTIONS ==================
function isStaticAsset(url) {
  return CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

function isApiCall(url) {
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
  self.skipWaiting();
});

// ================== ACTIVATE ==================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// ================== FETCH - WITH FIXED API HANDLING ==================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // FIXED: Handle API calls properly without breaking responses
  if (isApiCall(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone BEFORE reading or doing anything
          const responseToCache = response.clone();
          
          // Only cache GET requests for offline use
          if (event.request.method === 'GET') {
            caches.open(API_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          
          // Return the ORIGINAL response immediately
          return response;
        })
        .catch(async () => {
          // Only serve from cache for GET requests when offline
          if (event.request.method === 'GET') {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
              console.log('[SW] Serving cached API response');
              return cachedResponse;
            }
          }
          
          // For POST/PUT/DELETE, return offline error
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'You are offline. Please check your connection.',
              offline: true 
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // Handle navigation (HTML pages)
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
  
  // Handle static assets
  if (event.request.method === 'GET' && isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
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

// ================== BACKGROUND SYNC (FIXED) ==================
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
    
    // Get token from localStorage via client communication
    const token = await getTokenFromClients();
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

async function getTokenFromClients() {
  return new Promise((resolve) => {
    // Ask all clients for their token
    self.clients.matchAll().then(clients => {
      if (clients.length === 0) {
        resolve(null);
        return;
      }
      
      // Send message to first client asking for token
      const client = clients[0];
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.token);
      };
      
      client.postMessage({ type: 'GET_TOKEN' }, [messageChannel.port2]);
      
      // Timeout after 1 second
      setTimeout(() => resolve(null), 1000);
    });
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SET_TOKEN') {
    // Store token in cache for background sync
    caches.open(CACHE_NAME).then(cache => {
      cache.put('/auth-token', new Response(JSON.stringify({ token: event.data.token })));
    });
  }
});

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

async function showSyncNotification(synced, total) {
  await self.registration.showNotification('✅ ZUCA Attendance Synced', {
    body: `${synced} of ${total} offline check-in(s) have been synced.`,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: '/member/attendance' }
  });
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

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
});