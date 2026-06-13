/* Service worker — Álbum 26
   Estrategia: cache-first para el "app shell"; runtime cache para Tesseract
   y Google Fonts (así el OCR funciona sin conexión después del primer uso). */
const CACHE = "album26-v1";

const SHELL = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "data.js",
  "manifest.json",
  "favicon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isRuntimeCDN =
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("unpkg.com") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("tessdata"); // modelos de idioma de Tesseract

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cachea respuestas válidas del shell y de los CDN de OCR/fuentes.
        if (res && (res.status === 200 || res.type === "opaque") &&
            (url.origin === location.origin || isRuntimeCDN)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // Fallback: si se pide una navegación y estamos offline, sirve el index.
        if (req.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
