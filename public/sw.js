const offlinePage = "/offline.html";
const cacheName = "vinify-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch(offlinePage, { cache: "reload", redirect: "error" });
    if (!response.ok) throw new Error("Offline page unavailable");
    const cache = await caches.open(cacheName);
    await cache.put(offlinePage, response);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("vinify-offline-") && key !== cacheName).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || event.request.mode !== "navigate" || url.origin !== self.location.origin) return;
  if (/^\/(api|account|admin)(\/|$)/.test(url.pathname)) return;

  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match(offlinePage, { cacheName })) ?? Response.error();
  }));
});
