// Family Tree Service Worker
//
// 💡: Offline use (e.g. travelling in Greece) is the hard requirement, but the
// site changes rarely, so we revalidate with ETags instead of re-downloading.
// Every cached response keeps the server's ETag / Last-Modified headers; we
// send them back as If-None-Match / If-Modified-Since and a 304 costs only
// headers. We do this by hand against the Cache API (rather than relying on
// the browser HTTP cache) because the Cache API copy is the one we depend on
// offline, and the HTTP cache can be evicted independently of it.
//
// Strategies:
// - Family data (/api/v1/, *.json, /reference-material/): network first with
//   a short timeout, conditional request, fall back to cache. One reload is
//   enough to see new data; offline or on a slow link we serve the cache.
// - Everything else (app shell, assets): serve cache instantly, revalidate in
//   the background so code updates arrive on the next load.

const CACHE_NAME = 'family-tree-v2';
const CACHE_PREFIX = 'family-tree-';
const NETWORK_TIMEOUT_MS = 3000;

const APP_SHELL = [
  '/',
  '/assets/vendor.js',
  '/assets/family-tree.js',
  '/assets/vendor.css',
  '/assets/family-tree.css',
  '/manifest.json',
  '/sw-registration.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            fetch(url, { cache: 'no-store' })
              .then((response) => {
                if (response.ok) return cache.put(url, response);
                console.error(
                  '❌ SW: failed to precache',
                  url,
                  response.status,
                );
              })
              // 💡: Don't fail installation for a missing asset; it will be
              // cached on first use instead.
              .catch((error) => console.error('❌ SW: precache', url, error)),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 💡: Cross-origin requests can't be meaningfully revalidated (opaque
  // responses hide headers); keep the old cache-first behaviour so they still
  // work offline.
  if (url.origin !== self.location.origin) {
    event.respondWith(crossOriginCacheFirst(request));
    return;
  }

  if (request.headers.has('range')) {
    event.respondWith(handleRangeRequest(request));
    return;
  }

  if (isFamilyData(url)) {
    event.respondWith(networkFirst(request, cacheKeyFor(request), event));
    return;
  }

  event.respondWith(cacheFirstRevalidate(request, cacheKeyFor(request), event));
});

function isFamilyData(url) {
  return (
    url.pathname.startsWith('/api/v1/') ||
    url.pathname.startsWith('/reference-material/') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.json.enc')
  );
}

// 💡: Ember is a single-page app: every route without a file extension is
// served index.html (see the catch-all redirect in netlify.toml), so all of
// them share the '/' cache entry and work offline.
function cacheKeyFor(request) {
  const url = new URL(request.url);
  if (request.mode === 'navigate' && !url.pathname.includes('.')) {
    return new URL('/', url).href;
  }
  return url.href;
}

// Fetch `url`, sending validators from `cached` so an unchanged resource comes
// back as a bodiless 304. Resolves to the response to use: the cached copy on
// 304, otherwise the fresh network response (stored in the cache when ok).
async function revalidate(url, cached) {
  const headers = new Headers();
  const etag = cached && cached.headers.get('ETag');
  const lastModified = cached && cached.headers.get('Last-Modified');
  if (etag) headers.set('If-None-Match', etag);
  else if (lastModified) headers.set('If-Modified-Since', lastModified);

  // 💡: cache: 'no-store' bypasses the browser HTTP cache, so the 304 reaches
  // us instead of being silently converted into a 200 from that cache.
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (response.status === 304 && cached) return cached;

  if (response.ok && response.status === 200 && !isSpaFallback(url, response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, response.clone());
  }
  return response;
}

// 💡: Netlify's catch-all redirect answers missing files (e.g.
// /api/v1/roots.json.enc on an unencrypted deploy) with index.html and a 200.
// Never cache that under a data URL, or offline we'd hand the app HTML where it
// expects JSON.
function isSpaFallback(url, response) {
  const type = response.headers.get('content-type') || '';
  const path = new URL(url).pathname;
  return (
    type.includes('text/html') &&
    path !== '/' &&
    path.includes('.') &&
    !path.endsWith('.html')
  );
}

async function networkFirst(request, key, event) {
  const cached = await caches.match(key);
  const network = revalidate(key, cached);

  if (!cached) return network;

  // Keep the cache up to date even if we answer from it after the timeout.
  event.waitUntil(network.catch(() => {}));

  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS),
  );
  return Promise.race([network.catch(() => cached), timeout]).then((response) =>
    // Server errors (5xx etc.) shouldn't hide data we already have.
    response.ok || response.status === 304 ? response : cached,
  );
}

async function cacheFirstRevalidate(request, key, event) {
  const cached = await caches.match(key);
  const network = revalidate(key, cached);

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

// 💡: pdf.js loads PDFs with Range requests. 206 responses can't be stored in
// the Cache API, so we cache the whole file once and slice it ourselves. That
// keeps reference documents readable offline after they've been opened once.
async function handleRangeRequest(request) {
  const key = request.url;
  let full = await caches.match(key);

  if (!full) {
    try {
      full = await revalidate(key, undefined);
    } catch {
      return new Response(null, { status: 503, statusText: 'Offline' });
    }
    if (!full.ok) return full;
  } else {
    // Make sure we aren't slicing a stale copy, without blocking if offline.
    full = await Promise.race([
      revalidate(key, full).catch(() => full),
      new Promise((resolve) =>
        setTimeout(() => resolve(full), NETWORK_TIMEOUT_MS),
      ),
    ]).then((response) => (response.ok ? response : full));
  }

  const buffer = await full.clone().arrayBuffer();
  const size = buffer.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range').trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    return rangeNotSatisfiable(size);
  }

  let start;
  let end;
  if (match[1] === '') {
    // Suffix range: last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start > end || start >= size) return rangeNotSatisfiable(size);

  const headers = new Headers(full.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}

function rangeNotSatisfiable(size) {
  return new Response(null, {
    status: 416,
    headers: { 'Content-Range': `bytes */${size}` },
  });
}

async function crossOriginCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}
