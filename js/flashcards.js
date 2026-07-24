// js/flashcards.js
import { state, WORDS, VIDEOS, usuarioActual, addXP } from './state.js';
import { supabaseClient, abrirModal } from './auth.js';
import { playSound } from './audio.js';
import { openVideoModal } from './videos.js';
import { initQuizMode } from './quiz.js';

export async function initLearnMode() {
  // Mostrar estado de carga
  const cardFrontText = document.getElementById("cardFrontText");
  const cardBackText = document.getElementById("cardBackText");
  const cardCategory = document.getElementById("cardCategory");
  const cardEmoji = document.getElementById("cardEmoji");
  const actionsPanel = document.getElementById("learnActionsPanel");

  if (cardFrontText) cardFrontText.textContent = "Cargando...";
  if (cardBackText) cardBackText.textContent = "Buscando tus palabras pendientes...";
  if (cardCategory) cardCategory.textContent = "Cargando";
  if (cardEmoji) cardEmoji.textContent = "⏳";
  if (actionsPanel) actionsPanel.classList.add("hidden");

  try {
    let sessionCards = [];
    const totalNeeded = 5;

    if (!usuarioActual) {
      // Usuario no logueado: mostrar las primeras tarjetas por defecto
      sessionCards = WORDS.slice(0, totalNeeded).map(w => {
        return {
          ...w,
          progress: null
        };
      });
    } else {
      if (!supabaseClient) {
        throw new Error("Cliente de Supabase no inicializado.");
      }

      // Obtener todo el progreso del usuario actual
      const { data: allProgress, error } = await supabaseClient
        .from('user_progress')
        .select('*')
        .eq('user_id', usuarioActual.id);

      if (error) throw error;

      const nowISO = new Date().toISOString();

      // 1. Filtrar tarjetas pendientes (next_review <= ahora)
      const dueProgress = allProgress ? allProgress.filter(p => p.next_review <= nowISO) : [];

      // Mapear con la info lingüística local de WORDS
      const dueCards = [];
      dueProgress.forEach(prog => {
        const word = WORDS.find(w => w.id === Number(prog.word_id));
        if (word) {
          dueCards.push({
            ...word,
            progress: prog
          });
        }
      });

      // Ordenar pendientes por fecha (next_review) de forma ascendente (más antiguos primero)
      dueCards.sort((a, b) => new Date(a.progress.next_review) - new Date(b.progress.next_review));

      sessionCards = [...dueCards];

      // 2. Si faltan tarjetas para la cuota de 5, rellenar con tarjetas nuevas
      if (sessionCards.length < totalNeeded) {
        const todayStr = nowISO.split('T')[0];
        let newCardsToday = 0;

        // Verificar cuántas tarjetas nuevas se introdujeron hoy
        if (allProgress && allProgress.length > 0 && allProgress[0].created_at !== undefined) {
          newCardsToday = allProgress.filter(p => p.created_at && p.created_at.startsWith(todayStr)).length;
        } else {
          // Si Supabase no retorna created_at, usamos localStorage como fallback
          newCardsToday = parseInt(localStorage.getItem('hebrew_new_cards_count_' + todayStr)) || 0;
        }

        const maxNewCardsPerDay = 5;
        const allowedNewCards = Math.max(0, maxNewCardsPerDay - newCardsToday);

        const remainingCount = Math.min(totalNeeded - sessionCards.length, allowedNewCards);

        if (remainingCount > 0) {
          const allProgressWordIds = new Set(allProgress ? allProgress.map(p => Number(p.word_id)) : []);

          // Filtrar palabras locales nuevas (no registradas en user_progress)
          const newWords = WORDS.filter(w => !allProgressWordIds.has(w.id));

          // Ordenar por id secuencial de words.json
          newWords.sort((a, b) => a.id - b.id);

          const addedNewWords = newWords.slice(0, remainingCount).map(w => {
            return {
              ...w,
              progress: null // Aún sin progreso registrado
            };
          });

          sessionCards = sessionCards.concat(addedNewWords);
        }
      }
    }

    state.flashcards.list = sessionCards;
    state.flashcards.currentIndex = 0;
    state.flashcards.isFlipped = false;

    renderFlashcard();

  } catch (err) {
    console.error("Error al inicializar sesión de práctica:", err);
    if (cardFrontText) cardFrontText.textContent = "Error";
    if (cardBackText) cardBackText.textContent = "No se pudieron cargar los datos de Supabase: " + err.message;
    if (cardCategory) cardCategory.textContent = "Error";
    if (cardEmoji) cardEmoji.textContent = "⚠️";
  }
}

export function renderFlashcard() {
  const card = state.flashcards.list[state.flashcards.currentIndex];
  const actionsPanel = document.getElementById("learnActionsPanel");
  
  const cardFrontText = document.getElementById("cardFrontText");
  const cardBackText = document.getElementById("cardBackText");
  const cardCategory = document.getElementById("cardCategory");
  const cardEmoji = document.getElementById("cardEmoji");
  const learnProgressText = document.getElementById("learnProgressText");

  if (!card) {
    if (cardFrontText) cardFrontText.textContent = "¡Todo al día!";
    if (cardBackText) cardBackText.textContent = "No hay más tarjetas por repasar hoy. ¡Vuelve mañana!";
    if (cardCategory) cardCategory.textContent = "Completado";
    if (cardEmoji) cardEmoji.textContent = "🎉";
    if (learnProgressText) learnProgressText.textContent = "Tarjeta 0 de 0";
    if (actionsPanel) actionsPanel.classList.add("hidden");

    // Ocultar thumbnails de videos y audios si no hay tarjeta
    const cardYoutubeCard = document.getElementById("cardYoutubeCard");
    const cardYoutubeCardBack = document.getElementById("cardYoutubeCardBack");
    if (cardYoutubeCard) cardYoutubeCard.classList.add("hidden");
    if (cardYoutubeCardBack) cardYoutubeCardBack.classList.add("hidden");

    const cardCategoryBack = document.getElementById("cardCategoryBack");
    const cardBackInstructionPractice = document.getElementById("cardBackInstructionPractice");
    const cardAudioBtn = document.getElementById("cardAudioBtn");
    const cardAudioBtnBack = document.getElementById("cardAudioBtnBack");
    const cardBackInstructionText = document.getElementById("cardBackInstructionText");
    if (cardCategoryBack) cardCategoryBack.classList.add("hidden");
    if (cardBackInstructionPractice) cardBackInstructionPractice.classList.add("hidden");
    if (cardAudioBtn) cardAudioBtn.classList.add("hidden");
    if (cardAudioBtnBack) cardAudioBtnBack.classList.add("hidden");
    if (cardBackInstructionText) cardBackInstructionText.classList.add("hidden");

    return;
  }

  if (actionsPanel) actionsPanel.classList.remove("hidden");
  const cardAudioBtn = document.getElementById("cardAudioBtn");
  const cardAudioBtnBack = document.getElementById("cardAudioBtnBack");
  if (cardAudioBtn) cardAudioBtn.classList.remove("hidden");
  if (cardAudioBtnBack) cardAudioBtnBack.classList.remove("hidden");

  // Restablecer flip visual
  const flipEl = document.getElementById("flipCard");
  if (flipEl) flipEl.classList.remove("rotate-y-180");
  state.flashcards.isFlipped = false;

  // Actualizar datos
  if (cardFrontText) cardFrontText.textContent = card.hebrew;
  if (cardBackText) cardBackText.textContent = card.spanish;
  if (cardCategory) cardCategory.textContent = card.category;
  if (cardEmoji) cardEmoji.textContent = card.emoji;

  // Manejar componente de video de Youtube en las tarjetas
  const cardYoutubeCard = document.getElementById("cardYoutubeCard");
  const cardYoutubeCardBack = document.getElementById("cardYoutubeCardBack");

  if (cardYoutubeCard && cardYoutubeCardBack) {
    const hasVideo = Array.isArray(card.videos) && card.videos.length > 0 && card.videos[0];
    if (hasVideo) {
      const videoId = card.videos[0];
      const videoMatch = VIDEOS.find(video => video.id === videoId);
      const videoTitle = videoMatch?.title || "Video de Hebreo";

      cardYoutubeCard.classList.remove("hidden");
      cardYoutubeCardBack.classList.remove("hidden");

      // Render thumbnail para el frente
      const thumbsFront = document.getElementById("cardYoutubeThumbs");
      if (thumbsFront) {
        thumbsFront.innerHTML = `
          <div class="relative overflow-hidden rounded-xl cursor-pointer hover:border-purple-500/40 border border-slate-800 transition-all group" id="cardYoutubeThumbBtn">
            <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
              <div class="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
                <i data-lucide="play" class="w-4 h-4 fill-current ml-0.5"></i>
              </div>
            </div>
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${videoTitle}" class="w-full h-16 object-cover filter brightness-75 group-hover:scale-105 transition-all duration-500">
          </div>
        `;
      }

      // Render thumbnail para el reverso
      const thumbsBack = document.getElementById("cardYoutubeThumbsBack");
      if (thumbsBack) {
        thumbsBack.innerHTML = `
          <div class="relative overflow-hidden rounded-xl cursor-pointer hover:border-purple-500/40 border border-slate-800 transition-all group" id="cardYoutubeThumbBtnBack">
            <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
              <div class="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
                <i data-lucide="play" class="w-4 h-4 fill-current ml-0.5"></i>
              </div>
            </div>
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${videoTitle}" class="w-full h-16 object-cover filter brightness-75 group-hover:scale-105 transition-all duration-500">
          </div>
        `;
      }

      // Vincular clicks
      const thumbBtn = document.getElementById("cardYoutubeThumbBtn");
      const thumbBtnBack = document.getElementById("cardYoutubeThumbBtnBack");
      if (thumbBtn) {
        thumbBtn.onclick = (e) => {
          e.stopPropagation();
          openVideoModal(videoId, videoTitle);
        };
      }
      if (thumbBtnBack) {
        thumbBtnBack.onclick = (e) => {
          e.stopPropagation();
          openVideoModal(videoId, videoTitle);
        };
      }
    } else {
      cardYoutubeCard.classList.add("hidden");
      cardYoutubeCardBack.classList.add("hidden");
    }
  }

  // Recrear iconos de Lucide
  if (window.lucide) {
    lucide.createIcons();
  }

  if (learnProgressText) learnProgressText.textContent = `Tarjeta ${state.flashcards.currentIndex + 1} de ${state.flashcards.list.length}`;
}

export function handleLearnNext() {
  if (!usuarioActual) {
    abrirModal();
    return;
  }
  state.flashcards.currentIndex = (state.flashcards.currentIndex + 1) % state.flashcards.list.length;
  renderFlashcard();
}

export async function handleLearnResponse(rating) {
  if (!usuarioActual) {
    abrirModal();
    return;
  }

  const card = state.flashcards.list[state.flashcards.currentIndex];
  if (!card) return;

  // Extraer valores actuales o usar por defecto
  let repetitions = 0;
  let interval = 0;
  let ease_factor = 2.5;
  let progressId = null;

  if (card.progress) {
    repetitions = Number(card.progress.repetitions) || 0;
    interval = Number(card.progress.interval) || 0;
    ease_factor = Number(card.progress.ease_factor) || 2.5;
    progressId = card.progress.id;
  }

  // Aplicar algoritmo SM-2 simplificado según rating
  if (rating === 1) { // Difícil
    repetitions = 0;
    interval = 1;
    ease_factor = Math.max(1.3, ease_factor - 0.20);
  } else if (rating === 2) { // Bien
    interval = 2;
    repetitions = repetitions + 1;
  } else if (rating === 3) { // Fácil
    interval = 3;
    repetitions = repetitions + 1;
    ease_factor = ease_factor + 0.15;
  }

  // Calcular nueva fecha: next_review = Fecha_Actual + interval (en días)
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReviewStr = nextDate.toISOString();

  // Guardar en Supabase
  const payload = {
    user_id: usuarioActual.id,
    word_id: card.id,
    repetitions: repetitions,
    interval: interval,
    ease_factor: ease_factor,
    next_review: nextReviewStr
  };

  if (progressId) {
    payload.id = progressId;
  } else {
    // Si no tiene progressId, es una tarjeta nueva. Actualizamos contador local
    const todayStr = new Date().toISOString().split('T')[0];
    let newCardsCount = parseInt(localStorage.getItem('hebrew_new_cards_count_' + todayStr)) || 0;
    localStorage.setItem('hebrew_new_cards_count_' + todayStr, newCardsCount + 1);
  }

  try {
    const { data, error } = await supabaseClient
      .from('user_progress')
      .upsert(payload)
      .select();

    if (error) throw error;

    // Si la respuesta devuelve el registro guardado, actualizamos la referencia en memoria
    if (data && data[0] && state.flashcards.list[state.flashcards.currentIndex]) {
      state.flashcards.list[state.flashcards.currentIndex].progress = data[0];
    }
  } catch (err) {
    console.error("Error al guardar progreso en Supabase:", err);
    alert("Error al guardar tu progreso en Supabase. Se intentará continuar.");
  }

  // Avanzar inmediatamente: eliminamos de la sesión activa
  state.flashcards.list.splice(state.flashcards.currentIndex, 1);

  if (state.flashcards.list.length === 0) {
    playSound('correct');
    addXP(10);
    alert("¡Felicidades! Has completado tu sesión de estudio de hoy. +10 XP");
    window.location.hash = "#home";
  } else {
    // Si quitamos el elemento, el siguiente pasa al mismo currentIndex
    if (state.flashcards.currentIndex >= state.flashcards.list.length) {
      state.flashcards.currentIndex = 0;
    }
    renderFlashcard();
  }
}

export function handleLearnEasy() {
  handleLearnResponse(3);
}

export function handleLearnGood() {
  handleLearnResponse(2);
}

export function handleLearnHard() {
  handleLearnResponse(1);
}

export function setFlashcardTab(tabName) {
  const btnLearn = document.getElementById("tabBtnLearn");
  const btnQuiz = document.getElementById("tabBtnQuiz");
  const viewLearn = document.getElementById("subview-learn");
  const viewQuiz = document.getElementById("subview-quiz");

  if (tabName === 'learn') {
    if (btnLearn) btnLearn.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-white bg-purple-600 shadow-md";
    if (btnQuiz) btnQuiz.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-slate-400";
    if (viewLearn) viewLearn.classList.remove("hidden");
    if (viewQuiz) viewQuiz.classList.add("hidden");

    state.quiz.active = false;
    initLearnMode();
  } else {
    if (btnQuiz) btnQuiz.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-white bg-purple-600 shadow-md";
    if (btnLearn) btnLearn.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-slate-400";
    if (viewQuiz) viewQuiz.classList.remove("hidden");
    if (viewLearn) viewLearn.classList.add("hidden");

    initQuizMode();
  }
}

window.setFlashcardTab = setFlashcardTab;
window.handleLearnNext = handleLearnNext;
window.handleLearnEasy = handleLearnEasy;
window.handleLearnGood = handleLearnGood;
window.handleLearnHard = handleLearnHard;
