self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let data = { title: 'EVERSTAR', body: 'A time capsule is ready to revisit.', url: './' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  const scope = self.registration.scope;
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: new URL('favicon.svg', scope).href,
    badge: new URL('favicon.svg', scope).href,
    data: { url: new URL(data.url || './', scope).href },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const existing = list.find((client) => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
