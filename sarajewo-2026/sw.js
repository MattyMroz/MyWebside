/* Tylko własne pliki przewodnika. Bez zapisu kafelków OSM, tras Google i zapytań walutowych. */
const CACHE = 'sarajevo-guide-20260906-v1';
const CORE = ['./','./index.html','./app.js','./data.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('sarajevo-guide-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const name = url.pathname.slice(scope.pathname.length);
  if (!['','index.html','app.js','data.js','icon.svg','manifest.webmanifest'].includes(name)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(event.request, {ignoreSearch:true});
    const update = fetch(event.request).then(response => {
      if(response.ok) cache.put(event.request, response.clone());
      return response;
    });
    if(saved){ event.waitUntil(update.catch(() => undefined)); return saved; }
    try { return await update; }
    catch { return event.request.mode === 'navigate' ? (await cache.match('./index.html')) || Response.error() : Response.error(); }
  })());
});
