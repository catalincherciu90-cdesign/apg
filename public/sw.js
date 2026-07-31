const CACHE_NAME = 'apg-garage-v9';
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

// Notificare push (programare nouă). Mesaj fix (push fără payload).
self.addEventListener('push', function(e) {
    var titlu = 'APG Garage';
    var corp = 'Ai o programare nouă. Deschide adminul pentru detalii.';
    if (e.data) {
        try { var d = e.data.json(); titlu = d.title || titlu; corp = d.body || corp; } catch (err) {}
    }
    e.waitUntil(self.registration.showNotification(titlu, {
        body: corp,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'programare-noua',
        data: { url: '/admin' }
    }));
});

self.addEventListener('notificationclick', function(e) {
    e.notification.close();
    var url = (e.notification.data && e.notification.data.url) || '/admin';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url.indexOf('/admin') !== -1 && 'focus' in list[i]) return list[i].focus();
            }
            return clients.openWindow(url);
        })
    );
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
