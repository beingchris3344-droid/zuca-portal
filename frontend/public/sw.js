// ================== ZUCA SERVICE WORKER ==================
const CACHE_NAME = 'zuca-v4';

// ================== INSTALL ==================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  // ❌ IMPORTANT: Do NOT use skipWaiting here
  // This prevents "app updated in background" spam
});

// ================== ACTIVATE ==================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    self.clients.claim()
  );
});

// ================== FETCH (Optional Offline Support) ==================
self.addEventListener('fetch', (event) => {
  // Optional: You can expand caching later
  return;
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
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Payload:', payload);

      title = payload.title || title;
      options.body = payload.body || options.body;
      options.data.url = payload.data?.url || payload.url || '/';

      // Optional enhancements
      if (payload.type === 'announcement') {
        options.body = `📢 ${options.body}`;
      }

      if (payload.type === 'game_invite') {
        options.body = `🎮 ${options.body}`;
        options.vibrate = [500, 200, 500];
      }

      if (payload.type === 'payment') {
        options.body = `💰 ${options.body}`;
      }

    } catch (err) {
      console.log('[SW] Non-JSON push payload');
      options.body = event.data.text() || options.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ================== NOTIFICATION CLICK ==================
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

// ================== PUSH SUBSCRIPTION CHANGE ==================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
});