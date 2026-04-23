self.addEventListener('install', () => {
  self.skipWaiting();
});

function getDefaultAppUrl() {
  return new URL('./', self.location.origin).href;
}

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'A small check-in arrived.',
    body: 'Someone was thinking of you.',
    data: { url: getDefaultAppUrl() },
  };

  try {
    if (event.data) payload = event.data.json();
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: payload.data || { url: getDefaultAppUrl() },
      tag: payload.tag,
      renotify: Boolean(payload.renotify),
      requireInteraction: Boolean(payload.requireInteraction),
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.url || './', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(targetUrl).then((focusedClient) => focusedClient.focus());
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
