// ZUCA Portal - Complete Working Service Worker
const CACHE_NAME = 'zuca-v3';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// THIS IS THE CRITICAL PART - PUSH HANDLER
self.addEventListener('push', function(event) {
  console.log('[SW] Push received');
  
  let data = {
    title: 'ZUCA Portal',
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    url: '/'
  };
  
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Data:', data);
    } catch(e) {
      console.log('[SW] Could not parse JSON');
    }
  }
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || data.data?.url || '/'
    },
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'ZUCA Portal', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({type: 'window'}).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});