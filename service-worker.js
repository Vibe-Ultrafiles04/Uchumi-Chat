/* ======================================================
   KONA MART - POWERFUL SERVICE WORKER (v2)
   Advanced Caching: Media, Static Assets, & Offline Failover
   ====================================================== */

const CACHE_NAME = "Kona-Mart-v2"; // Increment version when you update assets
const OFFLINE_URL = "index.html";

// 1. Static Assets (The App Shell)
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./setup.html",
  "./business.html",
  "./studio.html",
  "./saved.html",
  "./notify.html",
  "./Admin.html",
  "./index.js",
  "./script.js",
  "./style.css",
  "./manifest.json",
  "./Kona100.png",
  "./Kona101.png",
  "./inventory192.png",
  "./inventory512.png",
  "./inventory512maskable.png"
];

// 2. Install Event: Populate Cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Kona Mart: Caching all core assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 3. Activate Event: Clean up old versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Kona Mart: Removing outdated cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 4. Fetch Strategy: Hybrid Power Approach
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // A. MEDIA & IMAGES STRATEGY: Cache-First
  // If it's an image or media, check cache first to save data/speed.
  if (event.request.destination === 'image' || event.request.destination === 'video' || event.request.destination === 'audio') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // B. HTML/DOCUMENTS STRATEGY: Network-First (with Offline Fallback)
  // Ensures user sees newest inventory data but works offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Automatically add new files to cache as user browses
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match(OFFLINE_URL);
        });
      })
  );
});