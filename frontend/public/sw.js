// ============================================
// ZUCA PORTAL - COMPLETE SERVICE WORKER v5.0
// FIXED: Forced visible notifications + proper navigation
// ============================================

self.__WB_MANIFEST;

const CACHE_NAME = 'zuca-portal-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/badge-icon.png'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] ✅ Caching assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] 🚀 Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] ❌ Cache failed:', err);
      })
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] 🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Claiming clients');
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH EVENT
// ============================================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch((err) => {
          console.error('[SW] Fetch failed:', err);
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline');
        });
      })
  );
});

// ============================================
// PUSH NOTIFICATION - FORCED VISIBLE FOR ANDROID
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] 📱 Push received:', event);
  
  // Default values - ALL configured for visibility
  let notificationTitle = 'ZUCA Portal';
  let notificationOptions = {
    body: 'You have a new notification from ZUCA',
    icon: '/android-chrome-192x192.png',
    badge: '/badge-icon.png',
    vibrate: [500, 200, 500, 200, 500],  // Stronger vibration
    timestamp: Date.now(),
    requireInteraction: true,  // CRITICAL: Forces visibility
    silent: false,             // CRITICAL: Must be false
    renotify: true,
    tag: `zuca-${Date.now()}`,
    priority: 2,               // High priority
    urgency: 'high',           // High urgency
    data: {
      url: '/dashboard',
      type: 'general',
      timestamp: Date.now()
    },
    actions: [
      { action: 'view', title: '📖 View Details' },
      { action: 'dismiss', title: '❌ Dismiss' }
    ]
  };
  
  let badgeCount = 1;
  
  try {
    if (event.data) {
      const rawData = event.data.json();
      console.log('[SW] Raw push data:', rawData);
      
      // Handle different formats
      if (rawData.title && (rawData.body || rawData.message)) {
        notificationTitle = rawData.title;
        notificationOptions.body = rawData.body || rawData.message;
        notificationOptions.data = {
          ...notificationOptions.data,
          ...rawData.data,
          url: rawData.data?.url || rawData.url || '/dashboard',
          type: rawData.type || rawData.data?.type || 'general',
          id: rawData.id || rawData.data?.id,
          entityId: rawData.entityId || rawData.data?.entityId
        };
        badgeCount = rawData.badgeCount || rawData.data?.badgeCount || 1;
      }
      else if (rawData.notification) {
        notificationTitle = rawData.notification.title || notificationTitle;
        notificationOptions.body = rawData.notification.body || notificationOptions.body;
        const fcmData = rawData.data || {};
        notificationOptions.data = {
          ...notificationOptions.data,
          url: fcmData.url || '/dashboard',
          type: fcmData.type || 'general',
          id: fcmData.id,
          entityId: fcmData.entityId
        };
        badgeCount = parseInt(fcmData.badgeCount) || 1;
      }
      else if (rawData.data) {
        notificationTitle = rawData.data.title || notificationTitle;
        notificationOptions.body = rawData.data.body || rawData.data.message || notificationOptions.body;
        notificationOptions.data = {
          ...notificationOptions.data,
          url: rawData.data.url || '/dashboard',
          type: rawData.data.type || 'general',
          id: rawData.data.id,
          entityId: rawData.data.entityId
        };
        badgeCount = parseInt(rawData.data.badgeCount) || 1;
      }
      else if (rawData.body || rawData.message) {
        notificationTitle = rawData.title || notificationTitle;
        notificationOptions.body = rawData.body || rawData.message;
        notificationOptions.data = { ...notificationOptions.data, ...rawData };
        badgeCount = rawData.badgeCount || 1;
      }
      
      // CRITICAL: Force visibility for all notifications
      notificationOptions.silent = false;
      notificationOptions.requireInteraction = true;
      
      // Customize based on type
      if (notificationOptions.data.type === 'announcement') {
        notificationOptions.actions = [
          { action: 'view', title: '📢 Read Announcement' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ];
      } else if (notificationOptions.data.type === 'game_invite') {
        notificationOptions.actions = [
          { action: 'accept', title: '🎮 Accept' },
          { action: 'decline', title: '❌ Decline' }
        ];
        notificationOptions.vibrate = [500, 300, 500];
      } else if (notificationOptions.data.type === 'pledge' || notificationOptions.data.type === 'contribution') {
        notificationOptions.actions = [
          { action: 'view', title: '💰 View Pledge' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ];
      } else if (notificationOptions.data.type === 'event_reminder') {
        notificationOptions.actions = [
          { action: 'view', title: '📅 View Event' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ];
      }
    }
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
  }
  
  // Set app badge
  if (self.navigator && self.navigator.setAppBadge) {
    self.navigator.setAppBadge(badgeCount).catch(() => {});
    console.log(`[SW] 📱 App badge set to ${badgeCount}`);
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => console.log('[SW] ✅ Notification shown (visible)'))
      .catch((err) => console.error('[SW] ❌ Failed to show:', err))
  );
});

// ============================================
// NOTIFICATION CLICK HANDLER - PROPER NAVIGATION
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🔔 Notification clicked:', event.action);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  // Clear app badge
  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge();
  }
  
  // Handle actions
  if (action === 'dismiss') {
    return;
  }
  
  if (action === 'accept') {
    // Accept game invite
    openOrFocusWindow('/games');
    sendMessageToClients({
      type: 'ACCEPT_GAME_INVITE',
      inviteId: data.id,
      fromUserId: data.fromUserId
    });
    return;
  }
  
  if (action === 'decline') {
    sendMessageToClients({
      type: 'DECLINE_GAME_INVITE',
      inviteId: data.id
    });
    return;
  }
  
  if (action === 'pay') {
    openOrFocusWindow('/contributions');
    return;
  }
  
  // Determine URL based on notification type
  let urlToOpen = data.url || '/dashboard';
  
  // Deep linking
  if (data.type === 'announcement' && data.id) {
    urlToOpen = `/announcements/${data.id}`;
  } else if (data.type === 'gallery' || data.type === 'media') {
    urlToOpen = '/gallery';
  } else if (data.type === 'mass' || data.type === 'calendar') {
    urlToOpen = '/liturgical-calendar';
  } else if (data.type === 'mass_program' || data.type === 'program') {
    urlToOpen = '/mass-programs';
  } else if (data.type === 'contribution' || data.type === 'pledge' || data.type === 'pledge_approved') {
    urlToOpen = '/contributions';
  } else if (data.type === 'chat_mention') {
    urlToOpen = '/chat';
  } else if (data.type === 'game_invite') {
    urlToOpen = '/games';
  } else if (data.type === 'event_reminder') {
    urlToOpen = '/schedules';
  }
  
  console.log('[SW] Opening URL:', urlToOpen);
  
  event.waitUntil(openOrFocusWindow(urlToOpen));
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function openOrFocusWindow(url) {
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  // Try to find existing client with matching URL
  for (const client of allClients) {
    if (client.url === url || (client.url.includes('/dashboard') && url === '/dashboard')) {
      return client.focus();
    }
  }
  
  // Try to navigate an existing client
  if (allClients.length > 0) {
    try {
      await allClients[0].navigate(url);
      return allClients[0].focus();
    } catch (err) {
      // If navigation fails, open new window
    }
  }
  
  // Open new window as last resort
  return self.clients.openWindow(url);
}

async function sendMessageToClients(message) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// ============================================
// PUSH SUBSCRIPTION CHANGE (FCM)
// ============================================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] 🔄 Push subscription changed');
  // Subscription refresh handled by frontend
});

// ============================================
// MESSAGE HANDLER
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] 📨 Message:', event.data);
  
  const { type, data } = event.data;
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'UPDATE_BADGE' && self.navigator?.setAppBadge) {
    const count = data?.count || 0;
    if (count > 0) {
      self.navigator.setAppBadge(count);
    } else {
      self.navigator.clearAppBadge();
    }
  } else if (type === 'GET_AUTH_TOKEN' && event.ports?.[0]) {
    const token = localStorage?.getItem('token') || null;
    event.ports[0].postMessage({ type: 'AUTH_TOKEN', token });
  }
});

// ============================================
// ERROR HANDLING
// ============================================
self.addEventListener('error', (error) => {
  console.error('[SW] Error:', error);
});

console.log('🚀 ZUCA Service Worker v5.0 - VISIBLE NOTIFICATIONS + PROPER NAVIGATION');