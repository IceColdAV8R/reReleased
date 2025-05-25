// service-worker.js

// Name of the cache
const CACHE_NAME = 'my-pwa-cache-v1';

// Files to cache
const FILES_TO_CACHE = [
  'https://icecoldav8r.github.io/reReleased/',           // Caches the root (index.html)
  'https://icecoldav8r.github.io/reReleased/styles.css', // Your CSS file
  'https://icecoldav8r.github.io/reReleased/script.js'   // Your JavaScript file
];

// Install event: Cache the files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching files');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event: Serve cached files when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found, otherwise fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback to cached index.html if network fails and no cache match
        return caches.match('https://icecoldav8r.github.io/reReleased/index.html');
      })
  );
});
