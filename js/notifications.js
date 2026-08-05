// js/notifications.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getMessaging, getToken, deleteToken } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js';
import { state, usuarioActual } from './state.js';
import { guardarConfigRecordatorio, supabaseClient } from './auth.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB-avxGifa96vRZTm5dLow2JqyWfKJ8ZkU",
  authDomain: "hebreo-desde-cero.firebaseapp.com",
  projectId: "hebreo-desde-cero",
  storageBucket: "hebreo-desde-cero.firebasestorage.app",
  messagingSenderId: "794941611934",
  appId: "1:794941611934:web:376846397ecb24f987808f",
  measurementId: "G-TTYPWY1561"
};

let app = null;
let messaging = null;

function getFirebaseMessaging() {
  if (!messaging) {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  }
  return messaging;
}

let originalTitle = document.title;
let isBadgeActive = false;

// Inicializa el sistema de notificaciones
export function initNotifications() {
  // Escuchar si regresan a la pestaña para limpiar alertas y globo
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ocultarGloboUI();
    }
  });

  // Limpiar de inmediato al cargar la app
  ocultarGloboUI();
}

// Solicita permisos nativos de notificaciones al navegador
export async function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones de escritorio.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error solicitando permisos de notificación:', err);
    return false;
  }
}

// Inicializa el flujo de Web Push, pide permisos, obtiene el token FCM y lo guarda en Supabase
export async function inicializarWebPush() {
  const permisoConcedido = await solicitarPermisoNotificaciones();
  if (!permisoConcedido) {
    console.warn("Permiso de notificaciones denegado por el usuario.");
    return null;
  }

  try {
    const messagingInstance = getFirebaseMessaging();
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messagingInstance, {
      serviceWorkerRegistration: registration,
      vapidKey: "BAlFM-I2KSmHG4Re5L2V_mXrbw1etoH11ohiOvyum_zI0x3OvI4pK6jkTAFR7sZ_Q1rRMbJ2oorFcskvUc-3Xy0"
    });

    if (token) {
      console.log("Token FCM obtenido con éxito:", token);

      // Guardar token en Supabase
      if (supabaseClient && usuarioActual) {
        const { error } = await supabaseClient
          .from('user_stats')
          .update({ fcm_token: token })
          .eq('user_id', usuarioActual.id);

        if (error) {
          console.error("Error al guardar token de FCM en Supabase:", error);
        } else {
          console.log("Token de FCM sincronizado con Supabase.");
        }
      }

      // Activar notificaciones en local
      guardarConfiguracionLocal(true, state.recordatorioHora, state.recordatorioIntervalo);
      return token;
    } else {
      console.warn("No se pudo obtener el token FCM.");
      return null;
    }
  } catch (err) {
    console.error("Error al inicializar Web Push:", err);
    return null;
  }
}

// Desactiva el Web Push, elimina el token de Firebase y lo pone en null en Supabase
export async function desactivarWebPush() {
  try {
    const messagingInstance = getFirebaseMessaging();
    await deleteToken(messagingInstance);
    console.log("Token FCM eliminado de Firebase.");
  } catch (err) {
    console.warn("No se pudo eliminar el token de Firebase (puede que ya no exista):", err);
  }

  // Eliminar token en Supabase
  if (supabaseClient && usuarioActual) {
    try {
      const { error } = await supabaseClient
        .from('user_stats')
        .update({ fcm_token: null })
        .eq('user_id', usuarioActual.id);

      if (error) {
        console.error("Error al limpiar token de FCM en Supabase:", error);
      } else {
        console.log("Token de FCM eliminado de Supabase.");
      }
    } catch (err) {
      console.warn("Excepción al limpiar token de FCM en Supabase:", err);
    }
  }

  // Desactivar notificaciones en local
  guardarConfiguracionLocal(false, state.recordatorioHora, state.recordatorioIntervalo);
}

// Muestra el globo rojo en la UI
export function mostrarGloboUI() {
  isBadgeActive = true;

  const profileBtn = document.getElementById('headerAvatarBtn') || document.querySelector('[href="#profile"]') || document.getElementById('btn-perfil') || document.querySelector('.nav-profile-btn');
  if (profileBtn) {
    let badge = profileBtn.querySelector('.notification-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notification-badge absolute top-1 right-1 flex h-3 w-3';
      badge.innerHTML = `
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
      `;
      if (getComputedStyle(profileBtn).position === 'static') {
        profileBtn.style.position = 'relative';
      }
      profileBtn.appendChild(badge);
    }
  }

  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch((err) => console.log('AppBadge no soportado:', err));
  }
}

// Oculta el globo rojo de la UI
export function ocultarGloboUI() {
  isBadgeActive = false;
  const badges = document.querySelectorAll('.notification-badge');
  badges.forEach(b => b.remove());

  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => { });
  }
  detenerAlertaTitulo();
}

// Cambia el título de la pestaña con un aviso alternante
let alertaInterval = null;
export function iniciarAlertaTitulo() {
  if (alertaInterval) return;

  let toggle = false;
  alertaInterval = setInterval(() => {
    document.title = toggle ? '¡Hora de practicar! 📖' : originalTitle;
    toggle = !toggle;
  }, 1500);
}

export function detenerAlertaTitulo() {
  if (alertaInterval) {
    clearInterval(alertaInterval);
    alertaInterval = null;
  }
  document.title = originalTitle;
}

// Guarda la configuración local
export function guardarConfiguracionLocal(activo, hora, intervalo) {
  guardarConfigRecordatorio(activo, hora, intervalo);
}
