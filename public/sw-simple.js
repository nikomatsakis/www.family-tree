// Simple Family Tree Service Worker for Testing
console.log('🔧 Service Worker: Script loaded');

const CACHE_NAME = 'family-tree-v1';

// Install event
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Cache opened');
        // Try to cache files individually to see which one fails
        const urlsToCache = [
          '/',
          '/assets/vendor.js',
          '/assets/family-tree.js',
          '/assets/vendor.css',
          '/assets/family-tree.css',
          '/api/v1/people.json',
          '/api/v1/partnerships.json'
        ];
        
        return Promise.all(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  console.log('✅ Caching:', url);
                  return cache.put(url, response);
                } else {
                  console.error('❌ Failed to fetch for cache:', url, response.status);
                  // Don't fail the whole installation for missing assets
                  return Promise.resolve();
                }
              })
              .catch(error => {
                console.error('❌ Error caching:', url, error);
                // Don't fail the whole installation for missing assets
                return Promise.resolve();
              });
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Install complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Install failed:', error);
        throw error;
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch event
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Family data API - Cache aggressively for Greece travel
  if (url.pathname.includes('/api/v1/') || url.pathname.endsWith('.json')) {
    event.respondWith(handleFamilyDataRequest(event.request));
    return;
  }
  
  // Everything else - Cache first with network fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('⚡ From cache:', event.request.url);
          return response;
        }
        console.log('🌐 From network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // Cache successful responses for next time
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
  );
});

// Handle family data with aggressive caching for Greece travel
async function handleFamilyDataRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // 🇬🇷 Greece Travel Mode: Cache first, then update in background
  if (cachedResponse) {
    console.log('📱 GREECE MODE: Using cached family data');
    
    // Update cache in background for next time
    fetch(request).then(response => {
      if (response.ok) {
        console.log('🔄 Background update: Family data refreshed');
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Ignore network errors - we have cached data
      console.log('📡 No connection: Cached family data is perfect for Greece!');
    });
    
    return cachedResponse;
  }
  
  // No cache - try network and cache result
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('✅ Family data cached for Greece travel');
    }
    return networkResponse;
  } catch (error) {
    console.log('❌ No family data available offline');
    throw error;
  }
}