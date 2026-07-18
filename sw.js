/* Novaé — service worker (installable + offline app shell) */
const CACHE = "novae-v37";
const SHELL = [
  "./", "index.html", "styles.css",
  "lib/react.production.min.js", "lib/react-dom.production.min.js",
  "lib/astronomy.browser.min.js", "lib/satellite.min.js", "lib/three.min.js",
  "js/i18n.js", "js/data.js", "js/deepsky.js", "js/astro.js", "js/planetRender.js",
  "js/SkyMap.js", "js/SkyMap3D.js", "js/PlanetTracker.js", "js/LightPollution.js", "js/Timeline.js", "js/Events.js",
  "js/Library.js", "js/App.js", "js/main.js",
  "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // app shell: cache-first, fall back to network, then index for navigations
    e.respondWith(
      caches.match(req).then((c) => c || fetch(req).then((r) => {
        const cp = r.clone(); caches.open(CACHE).then((ca) => ca.put(req, cp)); return r;
      }).catch(() => (req.mode === "navigate" ? caches.match("index.html") : undefined)))
    );
  } else {
    // CDN (React, astronomy-engine, catalogue, textures): network-first, cache for offline
    e.respondWith(
      fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((ca) => ca.put(req, cp)); return r; })
        .catch(() => caches.match(req))
    );
  }
});
