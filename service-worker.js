/* Family Budget - service worker (offline-first)
 *
 * IMPORTANT: change VERSION every time you redeploy changed files, so phones download the new app.
 *
 * Strategies
 *   App shell (HTML/CSS/JS/icons, pre-cached) ... cache-first
 *   Page navigations ......................... cache-first (index.html), then network, then offline.html
 *   Other same-origin GET files .............. stale-while-revalidate
 *   Everything else (non-GET, other sites) ... not touched
 */
const VERSION = '2026-10-14-5';
const SHELL_CACHE = 'fb-shell-' + VERSION;
const RUNTIME_CACHE = 'fb-runtime-v1';

const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.json', 'offline.html',
  'icons/icon-32.png', 'icons/icon-120.png', 'icons/icon-152.png', 'icons/icon-167.png',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];
const SPLASH = ["splash/splash-1320x2868.png", "splash/splash-1206x2622.png", "splash/splash-1260x2736.png", "splash/splash-1290x2796.png", "splash/splash-1179x2556.png", "splash/splash-1170x2532.png", "splash/splash-1284x2778.png", "splash/splash-1242x2688.png", "splash/splash-1125x2436.png", "splash/splash-1080x2340.png", "splash/splash-828x1792.png", "splash/splash-1242x2208.png", "splash/splash-750x1334.png"];

/* Download one file fresh from the server. Netlify can answer /index.html with a redirect, and a redirected response
   cannot be used to open a page offline, so keep a clean copy instead. */
async function fetchClean(u) {
  const res = await fetch(new Request(u, { cache: 'reload' }));
  if (!res.ok) throw new Error('Could not download ' + u + ' (' + res.status + ')');
  return res.redirected ? new Response(await res.blob(), { status: 200, statusText: 'OK', headers: res.headers }) : res;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const got = await Promise.all(SHELL.map(async (u) => [u, await fetchClean(u)]));      // nothing is saved unless every file arrived
    for (const [u, res] of got) await cache.put(u, res);
    await Promise.allSettled(SPLASH.map(async (u) => cache.put(u, await fetchClean(u))));  // best effort
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, RUNTIME_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n)));  // also removes the old fb-v1 cache
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { event.respondWith(navigation(req)); return; }
  event.respondWith(asset(req, event));
});

async function navigation(req) {
  const shell = await caches.open(SHELL_CACHE);
  const page = (await shell.match('index.html')) || (await shell.match('./'));
  if (page) return page;                                   // cache-first: opens with no internet
  try { return await fetch(req); }
  catch (err) {
    const off = await shell.match('offline.html');
    return off || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function asset(req, event) {
  const shell = await caches.open(SHELL_CACHE);
  const hit = await shell.match(req, { ignoreSearch: true });
  if (hit) return hit;                                     // cache-first for the app shell
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = await runtime.match(req);
  const refresh = fetch(req).then((res) => {
    if (res && res.ok && (res.type === 'basic' || res.type === 'default')) runtime.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) { event.waitUntil(refresh); return cached; } // stale-while-revalidate
  const res = await refresh;
  return res || new Response('', { status: 504, statusText: 'Offline' });
}
