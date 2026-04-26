// ============================================
// ZUCA PORTAL - COMPLETE SERVICE WORKER
// Supports: Web Push, FCM (Android), APNs (iOS), Badges
// Version: v4.0
// ============================================

self.__WB_MANIFEST;

const CACHE_NAME = 'zuca-portal-v4';
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
// INSTALL EVENT - Cache assets
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
// ACTIVATE EVENT - Clean up old caches
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
// FETCH EVENT - Cache first, network fallback
// ============================================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API calls
  if (event.request.url.includes('/api/')) {
    return;
  }
  
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
        }).catch((err) => {
          console.error('[SW] Fetch failed:', err);
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline');
        });
      })
  );
});

// ============================================
// PUSH NOTIFICATION HANDLER - FCM COMPATIBLE
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] 📱 Push received:', event);
  
  // Default values
  let notificationTitle = 'ZUCA Portal';
  let notificationOptions = {
    body: 'You have a new notification from ZUCA',
    icon: '/android-chrome-192x192.png',
    badge: '/badge-icon.png',
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    requireInteraction: true,
    silent: false,
    renotify: true,
    data: {
      url: '/dashboard',
      type: 'general',
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
  
  let badgeCount = 1;
  
  try {
    if (event.data) {
      const rawData = event.data.json();
      console.log('[SW] Raw push data:', rawData);
      
      // ========== HANDLE DIFFERENT FORMATS ==========
      
      // Format 1: Standard web-push format
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
      // Format 2: FCM notification format (Android Chrome)
      else if (rawData.notification) {
        notificationTitle = rawData.notification.title || notificationTitle;
        notificationOptions.body = rawData.notification.body || notificationOptions.body;
        notificationOptions.icon = rawData.notification.icon || notificationOptions.icon;
        notificationOptions.badge = rawData.notification.badge || notificationOptions.badge;
        
        // Extract data from FCM data payload
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
      // Format 3: FCM data-only message
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
      // Format 4: Simple format (just body)
      else if (rawData.body || rawData.message) {
        notificationTitle = rawData.title || notificationTitle;
        notificationOptions.body = rawData.body || rawData.message;
        notificationOptions.data = {
          ...notificationOptions.data,
          ...rawData
        };
        badgeCount = rawData.badgeCount || 1;
      }
      
      // Add vibration pattern based on priority
      if (notificationOptions.data.priority === 'urgent') {
        notificationOptions.vibrate = [300, 100, 300, 100, 300];
      }
      
      // Add custom actions based on type
      if (notificationOptions.data.type === 'announcement') {
        notificationOptions.actions = [
          { action: 'view', title: '📢 Read Announcement' },
          { action: 'later', title: '⏰ Later' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ];
      } else if (notificationOptions.data.type === 'pledge' || notificationOptions.data.type === 'contribution') {
        notificationOptions.actions = [
          { action: 'view', title: '💰 View Pledge' },
          { action: 'pay', title: '💳 Pay Now' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ];
      } else if (notificationOptions.data.type === 'game_invite') {
        notificationOptions.actions = [
          { action: 'accept', title: '🎮 Accept' },
          { action: 'decline', title: '❌ Decline' }
        ];
        notificationOptions.requireInteraction = true;
      } else if (notificationOptions.data.type === 'event_reminder') {
        notificationOptions.actions = [
          { action: 'view', title: '📅 View Event' },
          { action: 'remind_later', title: '⏰ Remind in 1 hour' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ];
      }
    }
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
    // Try to get text content
    try {
      const text = event.data.text();
      if (text) {
        notificationOptions.body = text;
      }
    } catch (e) {}
  }
  
  // ========== SET APP BADGE (Android Only) ==========
  if (self.navigator && self.navigator.setAppBadge) {
    self.navigator.setAppBadge(badgeCount).catch((err) => {
      console.log('[SW] Badge API not fully supported:', err);
    });
    console.log(`[SW] 📱 App badge set to ${badgeCount}`);
  } else if (self.navigator && self.navigator.clearAppBadge) {
    // Some browsers need badge cleared before setting
    self.navigator.clearAppBadge().then(() => {
      if (badgeCount > 0) {
        self.navigator.setAppBadge(badgeCount);
      }
    }).catch(() => {});
  }
  
  // ========== SHOW NOTIFICATION ==========
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[SW] ✅ Notification shown:', notificationTitle);
      })
      .catch((err) => {
        console.error('[SW] ❌ Failed to show notification:', err);
      })
  );
});

// ============================================
// NOTIFICATION CLICK HANDLER
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🔔 Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // ========== CLEAR APP BADGE ==========
  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge();
    console.log('[SW] 📱 App badge cleared');
  }
  
  // ========== HANDLE ACTION BUTTONS ==========
  if (action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }
  
  if (action === 'later' || action === 'remind_later') {
    // Request a sync for later reminder
    if (self.registration.sync) {
      self.registration.sync.register('reminder-sync').catch(() => {});
    }
    return;
  }
  
  if (action === 'pay') {
    // Open payment page
    openOrFocusWindow('/contributions');
    return;
  }
  
  if (action === 'accept') {
    // Accept game invite
    openOrFocusWindow('/games');
    // Also send event to app via message
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
  
  // ========== DETERMINE URL TO OPEN ==========
  let urlToOpen = data.url || '/dashboard';
  
  // Deep link based on notification type
  if (data.type === 'announcement' && data.id) {
    urlToOpen = `/announcements/${data.id}`;
  } else if (data.type === 'gallery' || data.type === 'media') {
    urlToOpen = '/gallery';
    if (data.entityId) urlToOpen += `?media=${data.entityId}`;
  } else if (data.type === 'mass' || data.type === 'calendar' || data.type === 'liturgical') {
    urlToOpen = '/liturgical-calendar';
  } else if (data.type === 'event' && data.entityId) {
    urlToOpen = `/schedules/events/${data.entityId}`;
  } else if (data.type === 'mass_program' || data.type === 'program') {
    urlToOpen = '/mass-programs';
  } else if (data.type === 'contribution' || data.type === 'pledge') {
    urlToOpen = '/contributions';
  } else if (data.type === 'chat_mention' || data.type === 'mention') {
    urlToOpen = '/chat';
  } else if (data.type === 'jumuia' || data.type === 'jumuia_announcement') {
    urlToOpen = `/jumuia/${data.jumuiaCode || 'my-jumuia'}`;
  } else if (data.type === 'game_invite') {
    urlToOpen = '/games';
  } else if (data.type === 'event_reminder') {
    urlToOpen = '/schedules';
  }
  
  console.log('[SW] Opening URL:', urlToOpen);
  
  // ========== OPEN OR FOCUS WINDOW ==========
  event.waitUntil(openOrFocusWindow(urlToOpen));
});

// Helper function to open or focus a window
async function openOrFocusWindow(url) {
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  // Try to find existing client with same URL or dashboard
  for (const client of allClients) {
    if (client.url === url || (client.url.includes('/dashboard') && url === '/dashboard')) {
      return client.focus();
    }
  }
  
  // Open new window
  if (allClients.length > 0) {
    return allClients[0].navigate(url).then(client => client.focus());
  }
  
  return self.clients.openWindow(url);
}

// Helper to send messages to all clients
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
// FCM COMPATIBILITY - Push Subscription Change
// ============================================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] 🔄 Push subscription changed');
  
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = event.newSubscription;
        
        // Get auth token from any client
        const clients = await self.clients.matchAll({ type: 'window' });
        let token = null;
        
        for (const client of clients) {
          // Ask client for token via message
          return new Promise((resolve) => {
            const channel = new MessageChannel();
            
            channel.port1.onmessage = (e) => {
              if (e.data.type === 'AUTH_TOKEN') {
                token = e.data.token;
                resolve(token);
              }
            };
            
            client.postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2]);
          });
        }
        
        if (token && newSubscription) {
          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription: newSubscription })
          });
          
          if (response.ok) {
            console.log('[SW] ✅ Subscription refreshed with backend');
          }
        }
      } catch (err) {
        console.error('[SW] ❌ Failed to refresh subscription:', err);
      }
    })()
  );
});

// ============================================
// PERIODIC BACKGROUND SYNC (for badge updates)
// ============================================
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] 🔄 Periodic sync:', event.tag);
  
  if (event.tag === 'update-badge') {
    event.waitUntil(
      (async () => {
        try {
          const clients = await self.clients.matchAll({ type: 'window' });
          if (clients.length === 0) {
            // No active clients, fetch unread count directly
            const response = await fetch('/api/notifications/unread-count');
            const data = await response.json();
            
            if (data.unreadCount > 0 && self.navigator.setAppBadge) {
              self.navigator.setAppBadge(data.unreadCount);
            } else if (self.navigator.clearAppBadge) {
              self.navigator.clearAppBadge();
            }
          }
        } catch (err) {
          console.error('[SW] Background sync failed:', err);
        }
      })()
    );
  }
});

// ============================================
// MESSAGE HANDLER FROM APP
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] 📨 Message from app:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'UPDATE_BADGE':
      const count = data?.count || 0;
      if (self.navigator && self.navigator.setAppBadge) {
        if (count > 0) {
          self.navigator.setAppBadge(count);
          console.log(`[SW] 📱 Badge updated to ${count}`);
        } else {
          self.navigator.clearAppBadge();
          console.log('[SW] 📱 Badge cleared');
        }
      }
      break;
      
    case 'SKIP_WAITING':
      console.log('[SW] Skipping waiting, activating new version...');
      self.skipWaiting();
      break;
      
    case 'GET_AUTH_TOKEN':
      // Respond with token if we have it
      if (event.ports && event.ports[0]) {
        const token = localStorage?.getItem('token') || null;
        event.ports[0].postMessage({
          type: 'AUTH_TOKEN',
          token: token
        });
      }
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// ============================================
// ERROR HANDLING
// ============================================
self.addEventListener('error', (error) => {
  console.error('[SW] Service Worker error:', error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

// ============================================
// LOGGING - Service Worker Ready
// ============================================
console.log('🚀 ZUCA Portal Service Worker v4.0 loaded successfully!');
console.log('   ✅ Push notifications enabled');
console.log('   ✅ FCM compatible (Android)');
console.log('   ✅ Badge API supported');
console.log('   ✅ Background sync ready');