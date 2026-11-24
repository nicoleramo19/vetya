/* Service worker de VetYa: guarda la app para que funcione sin conexión. */
const CACHE = 'vetya-v7';
const ARCHIVOS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/assets/icon.svg',
  '/manifest.webmanifest',
  '/vendor/leaflet.css',
  '/vendor/leaflet.js',
  '/vendor/qrcode-generator.js',
  '/vendor/supabase.js',
  '/js/app.js',
  '/js/triage.js',
  '/js/pets.js',
  '/js/chat.js',
  '/js/map.js',
  '/js/qr.js',
  '/js/supabase.js',
  '/js/data/protocols.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // La API siempre va a la red (nunca se guarda el chat en caché).
  if (url.pathname.startsWith('/api/')) return;
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Red primero: así siempre ves la última versión de la app.
  // Si no hay internet, se usa la copia guardada (la app sigue funcionando).
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() =>
        caches.match(e.request).then((guardado) => guardado || caches.match('/index.html'))
      )
  );
});
