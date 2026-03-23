const CACHE_NAME = "experthub-v1";
const OFFLINE_URL = "/offline";

// Assets to cache on install
const PRECACHE_ASSETS = [
  "/offline",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

// Install event — precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — network-first strategy with offline fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API requests, auth, and streaming endpoints
  if (
    request.url.includes("/api/") ||
    request.url.includes("/auth/") ||
    request.url.includes("/_next/webpack")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (
          response.status === 200 &&
          (request.url.includes("/_next/static/") ||
            request.url.includes("/icons/") ||
            request.url.includes("/fonts/"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Try cache first
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // For navigation requests, show offline page
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }

          return new Response("Offline", { status: 503 });
        });
      })
  );
});
