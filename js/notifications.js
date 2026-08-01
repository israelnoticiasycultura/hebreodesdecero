// js/notifications.js

import { state } from './state.js';
import { guardarConfigRecordatorio } from './auth.js';

let notificationInterval = null;
let originalTitle = document.title;
let isBadgeActive = false;

// Inicializa el sistema de notificaciones
export function initNotifications() {
  // Escuchar si cambian de pestaña o regresan a ella
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      verificarYMostrarNotificaciones();
      if (isBadgeActive) {
        detenerAlertaTitulo();
      }
    }
  });

  // Verificar notificaciones de inmediato al cargar la app
  setTimeout(() => {
    verificarYMostrarNotificaciones();
  }, 3000);

  // Intervalo de chequeo cada 5 minutos
  if (notificationInterval) clearInterval(notificationInterval);
  notificationInterval = setInterval(() => {
    verificarYMostrarNotificaciones();
  }, 5 * 60 * 1000);
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

// Verifica si corresponde mostrar la notificación
export function verificarYMostrarNotificaciones() {
  if (!state.recordatorioActivo) {
    ocultarGloboUI();
    return;
  }

  const ultimaConexionMs = Date.parse(state.ultimaConexion) || Date.now();
  const transcurridoMs = Date.now() - ultimaConexionMs;
  const horasTranscurridas = transcurridoMs / (1000 * 60 * 60);

  let debeNotificar = false;

  // Método 1: Basado en intervalo de horas (ej. 24 horas sin ingresar)
  if (horasTranscurridas >= state.recordatorioIntervalo) {
    debeNotificar = true;
  }

  // Método 2: Basado en hora diaria programada
  const hoy = new Date();
  const [horaProg, minProg] = state.recordatorioHora.split(':').map(Number);
  const horaActual = hoy.getHours();
  const minActual = hoy.getMinutes();

  if (horaActual > horaProg || (horaActual === horaProg && minActual >= minProg)) {
    // Si la última conexión fue anterior al día de hoy, debe notificar hoy
    const fechaUltima = new Date(ultimaConexionMs);
    if (fechaUltima.toDateString() !== hoy.toDateString()) {
      debeNotificar = true;
    }
  }

  if (debeNotificar) {
    activarNotificacionCompleta();
  } else {
    ocultarGloboUI();
  }
}

// Activa todos los elementos de notificación (UI + Título + Nativo)
function activarNotificacionCompleta() {
  mostrarGloboUI();
  iniciarAlertaTitulo();
  enviarNotificacionNativa('¡Hora de estudiar Hebreo! 🌟', {
    body: 'Es momento de repasar tus flashcards y completar tu práctica diaria.',
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png',
    tag: 'recordatorio-estudio',
    renotify: true
  });
}

// Envía la notificación nativa usando el Service Worker o la API local
export function enviarNotificacionNativa(titulo, opciones) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Intentar mediante Service Worker para mejor compatibilidad en segundo plano (Android/Chrome)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(titulo, opciones);
    }).catch(() => {
      // Fallback a notificación clásica
      new Notification(titulo, opciones);
    });
  } else {
    new Notification(titulo, opciones);
  }
}

// Muestra el globo rojo en la UI
function mostrarGloboUI() {
  isBadgeActive = true;
  
  // Agregar o actualizar globo rojo en la barra de navegación del header
  const profileBtn = document.getElementById('headerAvatarBtn') || document.querySelector('[href="#profile"]') || document.getElementById('btn-perfil') || document.querySelector('.nav-profile-btn');
  if (profileBtn) {
    // Evitar duplicados
    let badge = profileBtn.querySelector('.notification-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notification-badge absolute top-1 right-1 flex h-3 w-3';
      badge.innerHTML = `
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
      `;
      // Asegurarse de que el botón sea position-relative
      if (getComputedStyle(profileBtn).position === 'static') {
        profileBtn.style.position = 'relative';
      }
      profileBtn.appendChild(badge);
    }
  }
  
  // Actualizar en el Badge API nativo del dispositivo (PWAs)
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch((err) => console.log('AppBadge no soportado:', err));
  }
}

// Oculta el globo rojo de la UI
function ocultarGloboUI() {
  isBadgeActive = false;
  const badges = document.querySelectorAll('.notification-badge');
  badges.forEach(b => b.remove());
  
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
  detenerAlertaTitulo();
}

// Cambia el título de la pestaña con un aviso alternante
let alertaInterval = null;
function iniciarAlertaTitulo() {
  if (alertaInterval) return;
  
  let toggle = false;
  alertaInterval = setInterval(() => {
    document.title = toggle ? '¡Hora de practicar! 📖' : originalTitle;
    toggle = !toggle;
  }, 1500);
}

function detenerAlertaTitulo() {
  if (alertaInterval) {
    clearInterval(alertaInterval);
    alertaInterval = null;
  }
  document.title = originalTitle;
}

// Guarda la configuración
export function guardarConfiguracionLocal(activo, hora, intervalo) {
  guardarConfigRecordatorio(activo, hora, intervalo);
  verificarYMostrarNotificaciones();
}
