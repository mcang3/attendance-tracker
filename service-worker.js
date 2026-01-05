// Service Worker for Offline Functionality
const CACHE_NAME = 'attendance-tracker-v1';
const urlsToCache = [
    '/',
    '/attendance-tracker.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600;7..72,700&family=DM+Sans:wght@400;500;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // If both cache and network fail, return offline page
                    return new Response(
                        '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            })
    );
});

// Background sync for pending submissions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncAttendanceData());
    }
});

async function syncAttendanceData() {
    // This will be triggered when connection is restored
    // The main app will handle the actual syncing
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_REQUESTED'
        });
    });
}
