// Service Worker Registration with Family Tree Optimizations
// This handles the PWA registration and update notifications

(function () {
  'use strict';

  // Debug logging
  console.log(
    '🔧 SW Debug: Service Worker support:',
    'serviceWorker' in navigator,
  );
  console.log('🔧 SW Debug: Protocol:', window.location.protocol);
  console.log('🔧 SW Debug: Hostname:', window.location.hostname);

  // Only register service worker in production or when testing PWA
  if (
    'serviceWorker' in navigator &&
    (window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost')
  ) {
    console.log('🔧 SW Debug: Conditions met, attempting registration...');

    window.addEventListener('load', function () {
      console.log('🔧 SW Debug: Window loaded, registering service worker...');

      navigator.serviceWorker
        .register('/sw-simple.js', { scope: '/' })
        .then(function (registration) {
          console.log(
            '✅ Family Tree PWA: Service Worker registered successfully',
          );
          console.log('🔧 SW Debug: Registration object:', registration);
          console.log('🔧 SW Debug: Registration scope:', registration.scope);
          console.log(
            '🔧 SW Debug: Registration state:',
            registration.installing,
            registration.waiting,
            registration.active,
          );

          // Check registration state changes
          if (registration.installing) {
            console.log('🔧 SW Debug: Service Worker installing...');
            registration.installing.addEventListener(
              'statechange',
              function () {
                console.log(
                  '🔧 SW Debug: Installing state changed to:',
                  this.state,
                );
              },
            );
          }

          if (registration.waiting) {
            console.log('🔧 SW Debug: Service Worker waiting...');
          }

          if (registration.active) {
            console.log('🔧 SW Debug: Service Worker active!');
          }

          // Check for updates every 5 minutes when app is active
          setInterval(
            () => {
              registration.update();
            },
            5 * 60 * 1000,
          );

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New version available - could show update notification
                console.log('🔄 Family Tree PWA: Update available');
                showUpdateAvailable();
              }
            });
          });
        })
        .catch(function (error) {
          console.error(
            '❌ Family Tree PWA: Service Worker registration failed:',
            error,
          );
          console.error('❌ SW Debug: Error name:', error.name);
          console.error('❌ SW Debug: Error message:', error.message);
          console.error('❌ SW Debug: Full error object:', error);
        });
    });
  } else {
    console.log(
      '❌ SW Debug: Service Worker not supported or wrong protocol/hostname',
    );
    if (!('serviceWorker' in navigator)) {
      console.log('❌ SW Debug: Service Worker not supported by browser');
    }
    if (
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost'
    ) {
      console.log('❌ SW Debug: Not HTTPS or localhost');
    }
  }

  // Simple update notification
  function showUpdateAvailable() {
    // You can enhance this later with a proper UI component
    if (confirm('New family tree data is available! Reload to update?')) {
      window.location.reload();
    }
  }

  // Export for use by family tree components
  window.FamilyTreePWA = {
    // Force refresh family data - clears cache and reloads
    refreshFamilyData: function () {
      // Don't clear cache if offline - that would break everything!
      if (!navigator.onLine) {
        console.log('📱 Offline - cannot refresh data from server');
        // Could show a notification to the user here
        if (
          confirm(
            'You are offline. The app will reload but use cached data. Continue?',
          )
        ) {
          window.location.reload();
        }
        return;
      }

      // Online - safe to clear cache and reload
      if ('serviceWorker' in navigator && 'caches' in window) {
        caches
          .keys()
          .then((cacheNames) => {
            // Clear all family tree related caches
            const familyDataCaches = cacheNames.filter(
              (name) =>
                name.includes('family-tree') ||
                name.includes('family-data') ||
                name.includes('api'),
            );

            return Promise.all(
              familyDataCaches.map((cacheName) => caches.delete(cacheName)),
            );
          })
          .then(() => {
            console.log('🗑️ Family data cache cleared');
            window.location.reload();
          });
      } else {
        window.location.reload();
      }
    },

    // Check if we're working offline
    isOnline: function () {
      return navigator.onLine;
    },
  };
})();
