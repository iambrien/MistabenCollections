const CACHE_NAME = "mistaben-admin-v3";
const STATIC_ASSETS = ["/admin", "/admin/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate" && url.pathname.startsWith("/admin")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("/admin"))
        )
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
  }
});

// ── Badge update via postMessage ──
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_BADGE") {
    const count = event.data.count || 0;
    if ("setAppBadge" in self.registration) {
      if (count > 0) {
        self.registration.setAppBadge(count).catch(() => {});
      } else {
        self.registration.clearAppBadge().catch(() => {});
      }
    }
  }

  // App sends new order data → SW shows system notification (works even when tab is backgrounded/another app)
  if (event.data && event.data.type === "SHOW_ORDER_NOTIFICATION") {
    const { orderId, customerName, amount, orderShortId } = event.data;
    const title = "🛍️ New Order — Mistaben Collections";
    const body = `Order #${orderShortId} from ${customerName}${amount ? " · ₦" + Number(amount).toLocaleString() : ""}`;
    const options = {
      body,
      icon: "/admin-icon-512.png",
      badge: "/admin-icon-512.png",
      tag: `order-${orderId}`,           // unique per order, no duplication
      renotify: true,
      requireInteraction: true,          // stays on screen until dismissed
      data: { url: "/admin/orders" },
      vibrate: [200, 100, 200],
      actions: [
        { action: "view", title: "View Order" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// ── Handle push (for future server-side push support) ──
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Mistaben Collections";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/admin-icon-512.png",
    badge: "/admin-icon-512.png",
    tag: data.tag || "default",
    requireInteraction: true,
    data: { url: data.url || "/admin/orders" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click → focus/open admin orders ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/orders";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing admin window if open
      for (const client of clients) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
