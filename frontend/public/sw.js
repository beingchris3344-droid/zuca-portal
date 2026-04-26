// ZUCA Portal - WORKING PUSH NOTIFICATIONS
const CACHE_NAME = 'zuca-v4';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// CRITICAL: Push event handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push received!');
  
  // Default notification
  let title = 'ZUCA Portal';
  let options = {
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    requireInteraction: true,
    silent: false
  };
  
  // Parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Payload:', payload);
      
      title = payload.title || title;
      options.body = payload.body || options.body;
      options.data.url = payload.url || payload.data?.url || '/';
      options.data.type = payload.type || 'general';
      
      // Special handling for different types
      if (payload.type === 'announcement') {
        options.body = `📢 ${options.body}`;
      } else if (payload.type === 'game_invite') {
        options.body = `🎮 ${options.body}`;
        options.vibrate = [500, 200, 500];
      }
    } catch (e) {
      console.log('[SW] Could not parse JSON, using text');
      options.body = event.data.text() || options.body;
    }
  }
  
  // Show the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] ✅ Notification displayed!'))
      .catch(err => console.error('[SW] ❌ Show failed:', err))
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if (client.url === url || (client.url.includes('/dashboard') && url === '/')) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});