const CACHE_NAME = 'productometer-v1';
const ASSETS_TO_CACHE = [
    './',
    './Features/Academics_Monitoring/index.html',
    './Features/Academics_Monitoring/style.css',
    './Features/Academics_Monitoring/scripts.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});