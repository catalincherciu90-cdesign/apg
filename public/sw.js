const CACHE_NAME = 'apg-garage-v3';
const CACHE_URLS = [
    '/',
    '/css/style.css',
    '/logo.png',
    '/hero.webp',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/offline.html'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(CACHE_URLS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    if (e.request.method !== 'GET') return;

    e.respondWith(
        fetch(e.request)
            .then(function(response) {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(function() {
                return caches.match(e.request).then(function(cached) {
                    return cached || caches.match('/offline.html');
                });
            })
    );
});
