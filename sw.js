const CACHE_NAME = 'hebreo-desde-cero-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'js/app.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

// Instalar el Service Worker y almacenar en caché los activos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Abriendo caché de la PWA y guardando recursos');
        // Usar map y add uno a uno para evitar que falle toda la instalación si falla un recurso externo
        return Promise.all(
          ASSETS_TO_CACHE.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`No se pudo cachear el recurso: ${url}`, err);
            });
          })
        );
      })
  );
  self.skipWaiting();
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Cache-First con actualización de red para los activos estáticos del sitio
self.addEventListener('fetch', (event) => {
  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') return;

  // Ignorar solicitudes de YouTube o externas dinámicas que requieran red (como iframes)
  if (event.request.url.includes('youtube.com') || event.request.url.includes('youtu.be')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Devolver el recurso en caché si existe
          return cachedResponse;
        }

        // Si no está en caché, buscarlo en la red
        return fetch(event.request)
          .then((networkResponse) => {
            // Verificar si es un recurso válido para cachear
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Guardar dinámicamente en caché recursos cargados del mismo origen o fuentes de Google
            const shouldCache = event.request.url.startsWith(self.location.origin) || 
                                event.request.url.includes('fonts.googleapis.com') || 
                                event.request.url.includes('fonts.gstatic.com');

            if (shouldCache) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }

            return networkResponse;
          })
          .catch((err) => {
            console.error('Error al descargar recurso de red:', err);
            // Fallback para navegación offline si se pierde conexión
            if (event.request.mode === 'navigate') {
              return caches.match('index.html');
            }
          });
      })
  );
});
