// Importar SDKs de Firebase compatibles con Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuración de Firebase (Reemplazar con tus credenciales reales)
const firebaseConfig = {
  apiKey: "AIzaSyB-avxGifa96vRZTm5dLow2JqyWfKJ8ZkU",
  authDomain: "hebreo-desde-cero.firebaseapp.com",
  projectId: "hebreo-desde-cero",
  storageBucket: "hebreo-desde-cero.firebasestorage.app",
  messagingSenderId: "794941611934",
  appId: "1:794941611934:web:376846397ecb24f987808f",
  measurementId: "G-TTYPWY1561"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Configurar el recibo de notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano:', payload);
  const notificationTitle = payload.notification?.title || '¡Hora de estudiar Hebreo! 🌟';
  const notificationOptions = {
    body: payload.notification?.body || 'Es momento de repasar tus flashcards y completar tu práctica diaria.',
    icon: payload.notification?.icon || 'assets/icon-192.png',
    badge: payload.notification?.badge || 'assets/icon-192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

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

// Manejar clics en las notificaciones para abrir/enfocar la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});
