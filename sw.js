// FireFly PWA Service Worker v4
const CACHE = 'firefly-v4';
const STATIC = [
  '/',
  '/index.html',
  '/menu.html',
  '/about.html',
  '/contact.html',
  '/tilbud.html',
  '/booking.html',
  '/thanks.html',
  '/styles.css',
  '/script.js',
  '/foodanimation.js',
  '/images/flyfire.png',
  '/images/qrkode1.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache hver fil individuelt — hvis en mangler stopper ikke hele cachen
      return Promise.allSettled(
        STATIC.map(url => cache.add(url).catch(err => {
          console.warn('Kunne ikke cache: ' + url, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match('/index.html'));
    })
  );
});