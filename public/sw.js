const CACHE_VERSION = "cyberball-pwa-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const APP_SHELL_URLS = [
  "/",
  "/offline/",
  "/manifest.webmanifest",
  "/icons/favicon-16.png",
  "/icons/favicon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-192.png",
  "/icons/maskable-icon-512.png",
  "/icons/apple-touch-icon.png"
];

const STATIC_DESTINATIONS = new Set(["style", "script", "font", "image"]);
const DYNAMIC_API_PATTERNS = [
  "/api/",
  "api.boyzi.fun",
  "news.20250114.xyz",
  "/_next/webpack-hmr",
  "/__nextjs"
];

function shouldBypass(request) {
  if (request.method !== "GET") return true;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return true;

  const url = new URL(request.url);
  if (!["http:", "https:"].includes(url.protocol)) return true;

  return DYNAMIC_API_PATTERNS.some((pattern) => request.url.includes(pattern));
}

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || network || fetch(request);
}

async function networkFirstPage(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok && isSameOrigin(request)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || cache.match("/offline/");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("cyberball-pwa-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (shouldBypass(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isSameOrigin(request) && request.url.includes("/_next/static/")) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination)) {
    const cacheName = request.destination === "image" ? IMAGE_CACHE : APP_SHELL_CACHE;
    event.respondWith(staleWhileRevalidate(request, cacheName));
  }
});
