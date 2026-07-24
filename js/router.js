// js/router.js
import { state } from './state.js';
import { renderVideos, renderMoreVideos } from './videos.js';
import { updateProfileView, updateHomeView } from './home.js';
import { initLearnMode } from './flashcards.js';

const tabMappings = {
  "": "screen-home",
  "#home": "screen-home",
  "#flashcards": "screen-flashcards",
  "#videos": "screen-videos",
  "#profile": "screen-profile",
  "#more": "screen-more"
};

export function handleRoute() {
  const hash = window.location.hash || "#home";
  const targetTabId = tabMappings[hash] || "screen-home";

  if (state.currentTab === targetTabId) return;

  const tabsOrder = ["screen-home", "screen-flashcards", "screen-videos", "screen-profile", "screen-more"];
  const currentIdx = tabsOrder.indexOf(state.currentTab);
  const targetIdx = tabsOrder.indexOf(targetTabId);
  const direction = targetIdx > currentIdx ? "forward" : "backward";

  const updateDOM = () => {
    // Ocultar todas las pantallas
    document.querySelectorAll(".app-screen").forEach(el => el.classList.add("hidden"));
    // Mostrar pantalla destino
    const targetEl = document.getElementById(targetTabId);
    if (targetEl) targetEl.classList.remove("hidden");

    // Actualizar nav bar inferior
    document.querySelectorAll(".nav-link").forEach(link => {
      const isTarget = link.getAttribute("data-tab") === targetTabId;
      if (isTarget) {
        link.className = "nav-link flex flex-col items-center justify-center space-y-1 text-purple-500 transition-colors w-16";
        const icon = link.querySelector("i");
        if (icon) icon.classList.add("fill-current");
      } else {
        link.className = "nav-link flex flex-col items-center justify-center space-y-1 text-slate-500 hover:text-slate-300 transition-colors w-16";
        const icon = link.querySelector("i");
        if (icon) icon.classList.remove("fill-current");
      }
    });

    state.currentTab = targetTabId;

    // Inicialización al entrar a pantalla
    if (targetTabId === 'screen-videos') {
      renderVideos();
    } else if (targetTabId === 'screen-profile') {
      updateProfileView();
    } else if (targetTabId === 'screen-more') {
      renderMoreVideos();
    } else if (targetTabId === 'screen-home') {
      updateHomeView();
    } else if (targetTabId === 'screen-flashcards') {
      // Iniciar en modo aprender por defecto si no estaba configurado
      initLearnMode();
    }
  };

  // Usar API de View Transitions si está disponible
  if (document.startViewTransition) {
    document.startViewTransition({
      update: updateDOM,
      types: [direction]
    });
  } else {
    updateDOM();
  }
}

window.handleRoute = handleRoute;
