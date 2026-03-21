// FireFly PWA Service Worker
const CACHE = 'firefly-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/menu.html',
  '/about.html',
  '/contact.html',
  '/minkonto.html',
  '/booking.html',
  '/thanks.html',
  '/styles.css',
  '/script.js',
  '/foodanimations.js',
  '/images/flyfire.png',
  '/images/qrkode.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys
        .filter(key => key !== CACHE)
        .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(response => response || fetch(e.request))
      .catch(() => caches.match('/index.html'))
  );
});