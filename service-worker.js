/* ======================================================
   SMART INVENTORY - SERVICE WORKER
   Makes app installable, works offline, and loads faster
   ====================================================== */

const CACHE_NAME = "Kona-Mart-cache-v1";
const OFFLINE_URL = "index.html";

const ASSETS_TO_CACHE = [
  "./",
   "./setup.html",
  "./index.html",
  "./business.html",
   "./index.js",
  "./style.css",
   "./studio.html",
  "./script.js",
    "./saved.html",
  "./manifest.json",
  "./Kona100.png",
  "./Kona101.png",
  "./inventory192.png",
  "./inventory512.png",
  "./inventory512maskable.png"
];

/* -------------------------------
   INSTALL: Cache app shell
--------------------------------*/
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: caching app shell");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* -------------------------------
   ACTIVATE: Remove old caches
--------------------------------*/
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Service Worker: deleting old cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* -------------------------------
   FETCH: Network first, fallback to cache
--------------------------------*/
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy of successful requests
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || caches.match(OFFLINE_URL)))
  );
});
