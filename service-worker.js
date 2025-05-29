const CACHE_NAME = 'my-pwa-cache-v1';
const FILES_TO_CACHE = [
    '/reReleased/index.html',
    '/reReleased/style.css',
    '/reReleased/script.js',
    '/reReleased/pdfjs/pdf.min.js',
    '/reReleased/pdfjs/pdf.worker.min.js',
    '/reReleased/sampleRelease.pdf',
    '/reReleased/192testIcon.png',
    '/reReleased/512testIcon.png'
];
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching files');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});
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
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                return caches.match('/reReleased/index.html');
            });
        })
    );
});
