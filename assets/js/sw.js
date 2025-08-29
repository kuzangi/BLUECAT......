self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data = { title: "اشعار", body: event.data.text() };
  }

  const title = data.title || "إشعار";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/badge.png",
    tag: data.tag || "general",
    data: { url: data.url || "/", ...data.data },
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = allClients.find(c => c.url === targetUrl);
    if (client) {
      client.focus();
    } else {
      await clients.openWindow(targetUrl);
    }
  })());
});
