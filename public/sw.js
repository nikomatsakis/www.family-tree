// Family Tree PWA Service Worker
// Optimized for Greece travel - aggressive caching, offline-first

const CACHE_VERSION = 'family-tree-v2';
const FAMILY_DATA_CACHE = 'family-data-v2';
const APP_CACHE = 'app-cache-v2';

// Resources to cache immediately (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/vendor.js',
  '/assets/family-tree.js',
  '/assets/vendor.css',
  '/assets/family-tree.css',
  '/manifest.json',
  '/sw-registration.js',
];

// Family data API patterns - handle both encrypted and unencrypted files
const FAMILY_API_PATTERNS = [/\/api\/v1\//, /\.json$/, /\.json\.enc$/];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('🔧 Family Tree PWA: Installing service worker');

  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => {
        console.log('📦 Caching app shell for offline use');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('✅ App shell cached - ready for offline use');
        return self.skipWaiting(); // Activate immediately
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Family Tree PWA: Activating service worker');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames
          .filter(
            (cacheName) =>
              (cacheName.startsWith('family-tree-') ||
                cacheName.startsWith('family-data-') ||
                cacheName.startsWith('app-cache-')) &&
              cacheName !== CACHE_VERSION &&
              cacheName !== FAMILY_DATA_CACHE &&
              cacheName !== APP_CACHE,
          )
          .map((cacheName) => caches.delete(cacheName));

        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('🧹 Old caches cleaned up');
        return self.clients.claim(); // Take control immediately
      }),
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Family API data - Cache first with ETag validation
  if (FAMILY_API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(handleFamilyDataRequest(request));
    return;
  }

  // App shell - Cache first (including all routes for Ember SPA)
  if (
    APP_SHELL.some((resource) => url.pathname === resource) ||
    url.pathname === '/' ||
    !url.pathname.includes('.')
  ) {
    // SPA routes (no file extension)
    event.respondWith(handleAppShellRequest(request));
    return;
  }

  // Everything else - Network first with cache fallback
  event.respondWith(handleGenericRequest(request));
});

// Handle family data with aggressive caching + ETag validation
// Note: Encrypted .json.enc files are cached as-is. Decryption happens in the app.
async function handleFamilyDataRequest(request) {
  const cache = await caches.open(FAMILY_DATA_CACHE);
  const cachedResponse = await cache.match(request);

  try {
    // Always try network first for family data to check for updates
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the new response
      await cache.put(request, networkResponse.clone());
      console.log('🌐 Family data updated from network');
      return networkResponse;
    }

    // Network failed, use cache if available
    if (cachedResponse) {
      console.log('📁 Using cached family data (network failed)');
      return cachedResponse;
    }

    return networkResponse; // Return error response
  } catch (error) {
    // Network error - use cached version
    if (cachedResponse) {
      console.log('📱 OFFLINE: Using cached family data');
      return cachedResponse;
    }

    console.log('❌ No cached family data available');
    throw error;
  }
}

// Handle app shell - cache first for instant loading
async function handleAppShellRequest(request) {
  const cache = await caches.open(APP_CACHE);
  const url = new URL(request.url);

  // For SPA routes, always serve index.html
  let cacheKey = request;
  if (!url.pathname.includes('.') && url.pathname !== '/') {
    cacheKey = new Request('/', { method: request.method });
  }

  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    console.log('⚡ App shell from cache (instant)');

    // Update cache in background (only for exact matches)
    if (cacheKey.url === request.url) {
      fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        })
        .catch(() => {
          // Ignore network errors for app shell
        });
    }

    return cachedResponse;
  }

  // Not in cache - fetch and cache
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('❌ App shell not available offline');

    // As fallback, try to serve cached index.html for SPA routes
    if (!url.pathname.includes('.')) {
      const indexResponse = await cache.match('/');
      if (indexResponse) {
        console.log('📱 Serving cached index.html for SPA route');
        return indexResponse;
      }
    }

    throw error;
  }
}

// Handle other requests - network first
async function handleGenericRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Could implement generic caching here if needed
    throw error;
  }
}

// Background sync for when connection returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'family-data-sync') {
    event.waitUntil(syncFamilyData());
  }
});

async function syncFamilyData() {
  console.log('🔄 Background sync: Checking for family data updates');
  // Implementation for background sync when connection returns
  // This could check ETags and update cached data
}
