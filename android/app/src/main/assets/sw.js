// ============================================================
// MAYUR ENTERPRISES — SERVICE WORKER (OFFLINE PWA & APK CACHE)
// ============================================================
const CACHE_NAME = 'mayur-enterprises-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/chart.umd.min.js',
  './js/data.js',
  './js/utils.js',
  './js/dashboard.js',
  './js/buslog.js',
  './js/billing.js',
  './js/attendance.js',
  './js/payroll.js',
  './js/expenses.js',
  './js/profit.js',
  './js/busyexport.js',
  './js/capital.js',
  './js/invoice.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for instant offline responsiveness
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Fallback to cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
