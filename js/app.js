// js/app.js
import { loadWords, loadVideos, state, saveUserData, VIDEOS, usuarioActual } from './state.js';
import { loadVideosIsraelNoticias, handleVideoFilter, closeVideoModal, renderVideos, renderMoreVideos, createShareButtonGroup } from './videos.js';
import { loadVoices, playSound, speakHebrew } from './audio.js';
import { handleRoute } from './router.js';
import { updateHomeView, updateProfileView, handleResetData } from './home.js';
import { setFlashcardTab, handleLearnNext, handleLearnEasy, handleLearnGood, handleLearnHard } from './flashcards.js';
import { initQuizMode, handleSelectOption, handleCheckAnswer, retryQuizMode } from './quiz.js';
import { supabaseClient, cerrarModal } from './auth.js';
import { actualizarContadorEnPantalla, WORKER_URL_HDC, WORKER_URL_INC } from './api.js';
import { initNotifications, inicializarWebPush, desactivarWebPush, guardarConfiguracionLocal } from './notifications.js';
import { initClockPicker } from './timepicker.js';

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadWords(), loadVideos(), loadVideosIsraelNoticias()]);

  // Inicializar voces TTS
  loadVoices();

  // Vincular eventos de pestañas Flashcards
  const tabBtnLearn = document.getElementById("tabBtnLearn");
  if (tabBtnLearn) {
    tabBtnLearn.onclick = () => {
      playSound('click');
      setFlashcardTab('learn');
    };
  }

  const tabBtnQuiz = document.getElementById("tabBtnQuiz");
  if (tabBtnQuiz) {
    tabBtnQuiz.onclick = () => {
      playSound('click');
      setFlashcardTab('quiz');
    };
  }

  // Vincular eventos de Aprender (Flashcards)
  const flipCardContainer = document.getElementById("flipCardContainer");
  if (flipCardContainer) {
    flipCardContainer.onclick = () => {
      playSound('flip');
      const flipEl = document.getElementById("flipCard");
      if (flipEl) flipEl.classList.toggle("rotate-y-180");
      state.flashcards.isFlipped = !state.flashcards.isFlipped;
    };
  }

  const cardAudioBtn = document.getElementById("cardAudioBtn");
  if (cardAudioBtn) {
    cardAudioBtn.onclick = (e) => {
      e.stopPropagation(); // evitar flip al clickear audio
      playSound('click');
      const card = state.flashcards.list[state.flashcards.currentIndex];
      if (card) speakHebrew(card.hebrew);
    };
  }

  const cardAudioBtnBack = document.getElementById("cardAudioBtnBack");
  if (cardAudioBtnBack) {
    cardAudioBtnBack.onclick = (e) => {
      e.stopPropagation(); // evitar flip al clickear audio
      playSound('click');
      const card = state.flashcards.list[state.flashcards.currentIndex];
      if (card) speakHebrew(card.hebrew);
    };
  }

  const learnNextBtn = document.getElementById("learnNextBtn");
  if (learnNextBtn) {
    learnNextBtn.onclick = () => {
      playSound('click');
      handleLearnNext();
    };
  }

  const learnEasyBtn = document.getElementById("learnEasyBtn");
  if (learnEasyBtn) {
    learnEasyBtn.onclick = () => {
      playSound('click');
      handleLearnEasy();
    };
  }

  const learnGoodBtn = document.getElementById("learnGoodBtn");
  if (learnGoodBtn) {
    learnGoodBtn.onclick = () => {
      playSound('click');
      handleLearnGood();
    };
  }

  const learnHardBtn = document.getElementById("learnHardBtn");
  if (learnHardBtn) {
    learnHardBtn.onclick = () => {
      playSound('click');
      handleLearnHard();
    };
  }

  // Vincular eventos Swipe (Gestos táctiles) en tarjeta
  let touchStartX = 0;
  let touchEndX = 0;

  if (flipCardContainer) {
    flipCardContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    flipCardContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchEndX - touchStartX;
      const threshold = 70; // px

      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          // Deslizar a la derecha -> Fácil
          handleLearnEasy();
        } else {
          // Deslizar a la izquierda -> Difícil
          handleLearnHard();
        }
      }
    }, { passive: true });
  }

  // Vincular eventos del Quiz
  document.querySelectorAll(".quiz-option-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute("data-option"));
      handleSelectOption(idx);
    };
  });

  const quizActionBtn = document.getElementById("quizActionBtn");
  if (quizActionBtn) {
    quizActionBtn.onclick = () => {
      handleCheckAnswer();
    };
  }

  const quizRetryBtn = document.getElementById("quizRetryBtn");
  if (quizRetryBtn) {
    quizRetryBtn.onclick = () => {
      playSound('click');
      retryQuizMode();
    };
  }

  const quizCompleteBtn = document.getElementById("quizCompleteBtn");
  if (quizCompleteBtn) {
    quizCompleteBtn.onclick = () => {
      playSound('click');
      window.location.hash = "#home";
    };
  }

  // Vincular filtros de videos
  document.querySelectorAll(".video-filter-btn").forEach(btn => {
    btn.onclick = () => {
      const category = btn.getAttribute("data-filter");
      handleVideoFilter(category, btn);
    };
  });

  // Vincular eventos de Modal Youtube
  const closeYoutubeModalBtn = document.getElementById("closeYoutubeModal");
  if (closeYoutubeModalBtn) {
    closeYoutubeModalBtn.onclick = () => {
      closeVideoModal();
    };
  }

  const youtubeModal = document.getElementById("youtubeModal");
  if (youtubeModal) {
    youtubeModal.onclick = (e) => {
      if (e.target === youtubeModal) {
        closeVideoModal();
      }
    };
  }

  // Vincular eventos de Modal Auth
  const authCloseBtn = document.getElementById("auth-close-btn");
  if (authCloseBtn) {
    authCloseBtn.onclick = () => {
      cerrarModal();
    };
  }

  const authModal = document.getElementById("auth-modal");
  if (authModal) {
    authModal.onclick = (e) => {
      if (e.target === authModal) {
        cerrarModal();
      }
    };
  }

  // Vincular eventos de configuración Perfil
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.checked = state.soundEnabled;
    soundToggle.onchange = (e) => {
      state.soundEnabled = e.target.checked;
      saveUserData();
    };
  }

  // Vincular eventos de Notificaciones y Recordatorios de estudio
  initClockPicker();
  const notificationToggle = document.getElementById("notificationToggle");
  const notificationSettingsGroup = document.getElementById("notificationSettingsGroup");
  const notificationTimeInput = document.getElementById("notificationTimeInput");
  const notificationTimeDisplay = document.getElementById("notificationTimeDisplay");
  const notificationIntervalSelect = document.getElementById("notificationIntervalSelect");

  if (notificationToggle && notificationSettingsGroup && notificationTimeInput && notificationIntervalSelect) {
    // Establecer valores iniciales basados en el estado
    notificationToggle.checked = state.recordatorioActivo;
    const initialHour = state.recordatorioHora ? state.recordatorioHora.split(':')[0].padStart(2, '0') : "20";
    const formattedHour = `${initialHour}:00`;
    notificationTimeInput.value = formattedHour;
    if (notificationTimeDisplay) {
      notificationTimeDisplay.textContent = formattedHour;
    }
    notificationIntervalSelect.value = state.recordatorioIntervalo;

    if (state.recordatorioActivo) {
      notificationSettingsGroup.classList.remove("hidden");
    } else {
      notificationSettingsGroup.classList.add("hidden");
    }

    const guardarCambiosRecordatorio = async (e) => {
      const activo = notificationToggle.checked;
      const hora = notificationTimeInput.value;
      const intervalo = parseInt(notificationIntervalSelect.value);

      if (e && e.target === notificationToggle) {
        if (activo) {
          notificationSettingsGroup.classList.remove("hidden");
          const token = await inicializarWebPush();
          if (!token) {
            notificationToggle.checked = false;
            notificationSettingsGroup.classList.add("hidden");
            return;
          }
        } else {
          notificationSettingsGroup.classList.add("hidden");
          await desactivarWebPush();
          return;
        }
      }

      guardarConfiguracionLocal(activo, hora, intervalo);
    };

    notificationToggle.onchange = (e) => guardarCambiosRecordatorio(e);
    notificationTimeInput.onchange = (e) => guardarCambiosRecordatorio(e);
    notificationIntervalSelect.onchange = (e) => guardarCambiosRecordatorio(e);
  }

  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.onblur = async (e) => {
      const newName = e.target.value.trim() || "Estudiante";
      state.username = newName;
      saveUserData();
      updateProfileView();

      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.auth.updateUser({
            data: { full_name: newName }
          });
          if (error) {
            console.error("Error al actualizar nombre en Supabase:", error);
          } else {
            console.log("Nombre actualizado en Supabase:", newName);
          }
        } catch (err) {
          console.error("Excepción al actualizar nombre en Supabase:", err);
        }
      }
    };

    usernameInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    };
  }

  const resetDataBtn = document.getElementById("resetDataBtn");
  if (resetDataBtn) {
    resetDataBtn.onclick = () => {
      handleResetData();
    };
  }

  // Vincular click del Avatar en Header
  const headerAvatarBtn = document.getElementById("headerAvatarBtn");
  if (headerAvatarBtn) {
    headerAvatarBtn.onclick = () => {
      playSound('click');
      if (usuarioActual) {
        window.location.hash = "#profile";
      } else {
        if (window.abrirModal) {
          window.abrirModal();
        }
      }
    };
  }

  // Vincular eventos del componente Tu Aporte y Difusión
  const btnShareRandomClass = document.getElementById("btnShareRandomClass");
  if (btnShareRandomClass) {
    btnShareRandomClass.onclick = () => {
      playSound('click');
      if (!VIDEOS || VIDEOS.length === 0) return;
      const randomVideo = VIDEOS[Math.floor(Math.random() * VIDEOS.length)];
      const shareUrl = randomVideo.urlList || randomVideo.url || `https://youtu.be/${randomVideo.id}`;

      const container = document.getElementById("profileShareActionsContainer");
      const titleEl = document.getElementById("profileShareTitle");
      const buttonsEl = document.getElementById("profileShareButtons");

      titleEl.textContent = `Compartir Clase: "${randomVideo.title}"`;
      buttonsEl.innerHTML = "";

      const group = createShareButtonGroup(shareUrl, WORKER_URL_HDC, {
        customText: 'Mira esta clase que vale la pena:'
      });

      buttonsEl.appendChild(group);
      container.classList.remove("hidden");

      if (window.lucide) {
        window.lucide.createIcons();
      }
    };
  }

  const btnShareRandomIsrael = document.getElementById("btnShareRandomIsrael");
  if (btnShareRandomIsrael) {
    btnShareRandomIsrael.onclick = () => {
      playSound('click');
      if (!state.moreVideos || state.moreVideos.length === 0) return;
      const randomVideo = state.moreVideos[Math.floor(Math.random() * state.moreVideos.length)];
      const shareUrl = randomVideo.url;

      const container = document.getElementById("profileShareActionsContainer");
      const titleEl = document.getElementById("profileShareTitle");
      const buttonsEl = document.getElementById("profileShareButtons");

      titleEl.textContent = `Compartir Verdad sobre Israel: "${randomVideo.title}"`;
      buttonsEl.innerHTML = "";

      const group = createShareButtonGroup(shareUrl, WORKER_URL_INC);

      buttonsEl.appendChild(group);
      container.classList.remove("hidden");

      if (window.lucide) {
        window.lucide.createIcons();
      }
    };
  }

  // Vincular PWA Install Button
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostrar banner de instalación
    const banner = document.getElementById("pwaInstallBanner");
    if (banner) {
      banner.classList.remove("hidden");
    }
  });

  const pwaInstallBtn = document.getElementById("pwaInstallBtn");
  if (pwaInstallBtn) {
    pwaInstallBtn.onclick = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('El usuario aceptó la instalación');
            const banner = document.getElementById("pwaInstallBanner");
            if (banner) banner.classList.add("hidden");
          }
          deferredPrompt = null;
        });
      }
    };
  }

  // Inicializar enrutamiento
  window.addEventListener("hashchange", handleRoute);

  // Renderizar Inicio por defecto
  handleRoute();
  updateHomeView();
  updateProfileView();
  await actualizarContadorEnPantalla(WORKER_URL_HDC, 'contador-hdc');
  await actualizarContadorEnPantalla(WORKER_URL_INC, 'contador-global');

  // Inicializar motor de notificaciones
  initNotifications();

  if (window.lucide) {
    lucide.createIcons();
  }
});

