const CACHE_NAME = 'vidya-steam-v3';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './css/about.css',
  './css/home.css',
  './css/live-quiz.css',
  './css/projects.css',
  './css/sessions.css',
  './css/whiteboard.css',
  './js/about.js',
  './js/home.js',
  './js/leaderboard.js',
  './js/live-quiz.js',
  './js/main.js',
  './js/projects.js',
  './js/quiz.js',
  './js/routing.js',
  './js/session.js',
  './js/state.js',
  './js/whiteboard.js',
  './pages/about.html',
  './pages/home.html',
  './pages/live-quiz.html',
  './pages/project-detail.html',
  './pages/projects.html',
  './pages/session-detail.html',
  './pages/sessions.html',
  './pages/whiteboard.html',
  './pages/offline.html',
  './site.json',
  './students.json',
  './projects/projects.json',
  './manifest.json',
  './icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install event: Pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
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
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network first for HTML, Cache first for everything else
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 1. Bypass cache for Live Quiz backend (Firebase / GAS)
  if (
    requestUrl.hostname.includes('firebaseio.com') ||
    requestUrl.hostname.includes('googleapis.com') ||
    requestUrl.hostname.includes('gstatic.com') ||
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.pathname.includes('/live-quiz-data/')
  ) {
    // Network only for live quiz backend
    // Only exception is the fonts on googleapis/gstatic
    if (!requestUrl.hostname.includes('fonts.googleapis.com') && !requestUrl.hostname.includes('fonts.gstatic.com')) {
       return; // Default fetch behavior (network only)
    }
  }

  // 2. Cache-First Strategy for everything else (with network fallback and dynamic caching)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse; // Return from cache
      }

      // Not in cache, fetch from network
      return fetch(event.request).then(networkResponse => {
        // Don't cache non-successful responses or non-GET requests
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || event.request.method !== 'GET') {
           // For 3rd party like fonts.gstatic.com, type is 'cors', so we allow caching if status is 200
           if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' && requestUrl.hostname.includes('fonts.gstatic.com')) {
             // Let it fall through to caching below
           } else if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' && requestUrl.pathname.endsWith('.json')) {
              // Cache dynamic JSONs
           } else {
              return networkResponse;
           }
        }

        // Cache the dynamically fetched response (images, sessions, projects, fonts)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(error => {
        // Network failed (offline) and not in cache
        console.warn('Fetch failed; returning offline page instead.', error);
        
        // If it's a navigation request (HTML), return the offline page
        if (event.request.mode === 'navigate') {
          return caches.match('./pages/offline.html');
        }
        
        // For images or other assets, we could return a placeholder here, but failing is fine
      });
    })
  );
});
