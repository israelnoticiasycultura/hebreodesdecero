// ==========================================
// INICIALIZACIÓN DE SUPABASE
// ==========================================
const supabaseUrl = 'https://gjyqwqaabzajoflqwped.supabase.co';
const supabaseKey = 'sb_publishable_ZM3R9fFL9JY-OK_Lvi9lHw_E00H_Rlj';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// Variable global para mantener el estado de la sesión
let usuarioActual = null;

let WORDS = [];

async function loadWords() {
  try {
    const response = await fetch('./js/words.json');
    if (!response.ok) throw new Error('No se pudo cargar words.json');
    WORDS = await response.json();
  } catch (error) {
    console.error('Error cargando palabras:', error);
    WORDS = [];
  }

  state.flashcards.list = [...WORDS];
}

const COUNTER_API_URL_V1_INC = "https://api.counterapi.dev/v1/desmitifica/compartir";
const COUNTER_API_URL_V1_HDC = "https://api.counterapi.dev/v1/desmitifica/compartirhdc";

async function obtenerContador(counterApiUrl = COUNTER_API_URL_V1_INC, elementId = 'contador-global') {
  try {
    const res = await fetch(counterApiUrl + "/");
    if (!res.ok) throw new Error('Error al cargar contador');
    const data = await res.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error al obtener contador:', error);
  }
}

async function incrementarContadorV1(counterApiUrl = COUNTER_API_URL_V1_INC, elementId = 'contador-global') {
  try {
    const res = await fetch(counterApiUrl + "/up");
    if (!res.ok) throw new Error('Error al incrementar contador');
    await obtenerContador(counterApiUrl, elementId);
  } catch (error) {
    console.error('Error al incrementar contador:', error);
  }
}

async function actualizarContadorEnPantalla(counterApiUrl = COUNTER_API_URL_V1_INC, elementId = 'contador-global') {
  try {
    const currentCounter = await obtenerContador(counterApiUrl, elementId);
    const el = document.getElementById(elementId);
    if (el && elementId === 'contador-global') {
      el.textContent = `${currentCounter} verdades difundidas. ¡Ayuda a compartir!`;
    }
    if (el && elementId === 'contador-hdc') {
      el.textContent = `${currentCounter} veces compartidas por amigos del canal!`;
    }
  } catch (error) {
    console.error('Error al obtener contador:', error);
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = 'No se pudo cargar el contador.';
    }
  }
}


// Estado global de la aplicación
const state = {
  xp: parseInt(localStorage.getItem('hebrew_xp')) || 0,
  streak: parseInt(localStorage.getItem('hebrew_streak')) || 0,
  quizzesCompleted: parseInt(localStorage.getItem('hebrew_quizzes')) || 0,
  lastQuizDate: localStorage.getItem('hebrew_last_quiz_date') || "",
  completedToday: localStorage.getItem('hebrew_completed_today') === "true" || false,
  username: localStorage.getItem('hebrew_username') || "Estudiante",
  soundEnabled: localStorage.getItem('hebrew_sound_enabled') !== "false", // default true
  currentTab: "screen-home",

  // Estado de Flashcards (Modo Aprender)
  flashcards: {
    currentIndex: 0,
    isFlipped: false,
    list: []
  },

  // Estado del Quiz (Modo Jugar)
  quiz: {
    active: false,
    currentIndex: 0,
    lives: 3,
    questions: [],
    selectedOption: null,
    isChecked: false
  },

  // Filtros de videos
  videoFilter: "all",
  moreVideos: []
};

let VIDEOS = [];

async function loadVideos() {
  try {
    const response = await fetch('./js/videos.json');
    if (!response.ok) throw new Error('No se pudo cargar videos.json');
    VIDEOS = await response.json();
  } catch (error) {
    console.error('Error cargando videos:', error);
    VIDEOS = [];
  }

  state.flashcards.list = [...VIDEOS];
}

// --- MÓDULO AUDIO SINTETIZADO (Web Audio API) ---
let audioCtx = null;

function playSound(type) {
  if (!state.soundEnabled) return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'correct') {
      // Tono Duolingo éxito
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'wrong') {
      // Tono Duolingo error
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'click') {
      // Click suave tactil
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'flip') {
      // Sonido de tarjeta girando
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (err) {
    console.warn("Web Audio API no soportado o deshabilitado:", err);
  }
}

// --- MÓDULO TEXT TO SPEECH (Web Speech API) ---
function speakHebrew(text) {
  if (typeof speechSynthesis === 'undefined') return;

  speechSynthesis.cancel();

  // Limpiar nikud (vocales hebreas) para mejorar la compatibilidad del TTS en algunos navegadores
  // Nota: Aunque la mayoría de motores modernos leen hebreo con nikud, quitarlo a veces estabiliza la síntesis.
  const cleanText = text.replace(/[\u0591-\u05C7]/g, "");

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'he-IL';

  // Buscar voz seleccionada
  const selectedVoiceName = document.getElementById("ttsVoiceSelect")?.value;
  if (selectedVoiceName && selectedVoiceName !== 'default') {
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === selectedVoiceName);
    if (voice) {
      utterance.voice = voice;
    }
  }

  speechSynthesis.speak(utterance);
}

function loadVoices() {
  const select = document.getElementById("ttsVoiceSelect");
  if (!select) return;

  select.innerHTML = '<option value="default">Voz por defecto del sistema (he-IL)</option>';

  if (typeof speechSynthesis === 'undefined') return;

  const voices = speechSynthesis.getVoices();
  const hebrewVoices = voices.filter(v => v.lang.includes('he') || v.lang.includes('HE') || v.lang.includes('il') || v.lang.includes('IL'));

  hebrewVoices.forEach(voice => {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    select.appendChild(opt);
  });
}

if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

// --- CONFIGURACIÓN DE PANTALLA INICIO & PALABRA DEL DÍA ---
function getWordOfTheDay() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = (dayOfYear + 1) % WORDS.length;

  return WORDS[index];
}

function updateHomeView() {
  // Configurar saludo
  const hour = new Date().getHours();
  let greeting = "¡Shalom, Aprendiz!";
  if (hour >= 6 && hour < 12) greeting = "¡Buenos días - בוקר טוב!";
  else if (hour >= 12 && hour < 19) greeting = "¡Buenas tardes - אחר צהריים טובים!";
  else greeting = "¡Buenas noches - ערב טוב!";

  document.getElementById("welcomeGreeting").textContent = greeting.replace("Estudiante", state.username);

  // Palabra del día
  const pdd = getWordOfTheDay();
  document.getElementById("pddIcon").textContent = pdd.emoji;
  document.getElementById("pddHebrew").textContent = pdd.hebrew;
  document.getElementById("pddSpanish").textContent = pdd.spanish;
  document.getElementById("pddCategory").textContent = pdd.category;

  // Vincular audio
  const audioBtn = document.getElementById("pddAudioBtn");
  audioBtn.onclick = (e) => {
    e.stopPropagation();
    playSound('click');
    speakHebrew(pdd.hebrew);
  };

  // Vincular thumbnails de YouTube para la palabra del día
  const thumbsContainer = document.getElementById("pddYoutubeThumbs");
  if (thumbsContainer) {
    const videoIds = Array.isArray(pdd.videos) && pdd.videos.length > 0
      ? pdd.videos
      : (VIDEOS[0] ? [VIDEOS[0].id] : []);

    thumbsContainer.innerHTML = "";

    const videosToShow = videoIds
      .map(id => {
        const match = VIDEOS.find(video => video.id === id);
        return {
          id,
          title: match?.title || "Video de Hebreo",
        };
      })
      .filter(video => video.id);

    videosToShow.forEach(video => {
      const thumbCard = document.createElement('div');
      thumbCard.className = 'relative overflow-hidden rounded-2xl cursor-pointer hover:border-purple-500/40 border border-slate-800 transition-all group';
      thumbCard.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
          <div class="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
            <i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i>
          </div>
        </div>
        <img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}" class="w-full h-24 object-cover filter brightness-75 group-hover:scale-105 transition-all duration-500">
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-2.5 z-20">
          <p class="text-[11px] font-bold text-slate-200 line-clamp-1">${video.title}</p>
        </div>
      `;

      thumbCard.onclick = () => openVideoModal(video.id, video.title);
      thumbsContainer.appendChild(thumbCard);
    });

    lucide.createIcons();
  }

  // Racha y progreso diario
  updateStatsHeader();
  const progressPercent = state.completedToday ? 100 : 0;
  document.getElementById("dailyProgressText").textContent = `${progressPercent}% completado`;
  document.getElementById("dailyProgressBar").style.width = `${progressPercent}%`;
}

// --- ACTUALIZACIÓN DE ESTADÍSTICAS GLOBALES ---
function updateStatsHeader() {
  document.getElementById("headerStreak").textContent = state.streak;
  document.getElementById("headerXp").textContent = state.xp;
}

function saveUserData() {
  localStorage.setItem('hebrew_xp', state.xp);
  localStorage.setItem('hebrew_streak', state.streak);
  localStorage.setItem('hebrew_quizzes', state.quizzesCompleted);
  localStorage.setItem('hebrew_last_quiz_date', state.lastQuizDate);
  localStorage.setItem('hebrew_completed_today', state.completedToday);
  localStorage.setItem('hebrew_username', state.username);
  localStorage.setItem('hebrew_sound_enabled', state.soundEnabled);
  updateStatsHeader();
}

function addXP(amount) {
  state.xp += amount;

  // Chequear racha diaria
  const todayStr = new Date().toDateString();
  if (state.lastQuizDate !== todayStr) {
    if (state.lastQuizDate === new Date(Date.now() - 86400000).toDateString()) {
      state.streak += 1;
    } else if (state.lastQuizDate === "") {
      state.streak = 1;
    } else {
      // Si pasó más de un día, la racha se reinicia a 1
      state.streak = 1;
    }
    state.lastQuizDate = todayStr;
    state.completedToday = true;
  }

  saveUserData();
}

// --- SUB-VIEW: FLASHCARDS (APRENDER) ---
function initLearnMode() {
  state.flashcards.currentIndex = 0;
  state.flashcards.isFlipped = false;
  state.flashcards.list = [...WORDS].sort(() => Math.random() - 0.5); // barajar

  renderFlashcard();
}

function renderFlashcard() {
  const card = state.flashcards.list[state.flashcards.currentIndex];
  if (!card) return;

  // Restablecer flip visual
  const flipEl = document.getElementById("flipCard");
  flipEl.classList.remove("rotate-y-180");
  state.flashcards.isFlipped = false;

  // Actualizar datos
  document.getElementById("cardFrontText").textContent = card.hebrew;
  document.getElementById("cardBackText").textContent = card.spanish;
  document.getElementById("cardCategory").textContent = card.category;
  document.getElementById("cardEmoji").textContent = card.emoji;

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

      // Render thumbnail para el reverso
      const thumbsBack = document.getElementById("cardYoutubeThumbsBack");
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

      // Vincular clicks
      document.getElementById("cardYoutubeThumbBtn").onclick = (e) => {
        e.stopPropagation();
        openVideoModal(videoId, videoTitle);
      };
      document.getElementById("cardYoutubeThumbBtnBack").onclick = (e) => {
        e.stopPropagation();
        openVideoModal(videoId, videoTitle);
      };
    } else {
      cardYoutubeCard.classList.add("hidden");
      cardYoutubeCardBack.classList.add("hidden");
    }
  }

  // Recrear iconos de Lucide
  lucide.createIcons();

  document.getElementById("learnProgressText").textContent = `Tarjeta ${state.flashcards.currentIndex + 1} de ${state.flashcards.list.length}`;
}

function handleLearnNext() {
  state.flashcards.currentIndex = (state.flashcards.currentIndex + 1) % state.flashcards.list.length;
  renderFlashcard();
}

function handleLearnEasy() {
  // Facil: Eliminamos de la lista actual de la sesión (se considera aprendida en esta ronda)
  state.flashcards.list.splice(state.flashcards.currentIndex, 1);

  if (state.flashcards.list.length === 0) {
    // Sesión completada
    playSound('correct');
    addXP(10);
    alert("¡Felicidades! Has revisado todas las tarjetas de esta ronda. +10 XP");
    initLearnMode();
  } else {
    // Ajustar index si quedamos fuera de rango
    if (state.flashcards.currentIndex >= state.flashcards.list.length) {
      state.flashcards.currentIndex = 0;
    }
    renderFlashcard();
  }
}

function handleLearnHard() {
  // Difícil: Mantener en lista y pasar a la siguiente para repetirla luego
  if (state.flashcards.list.length > 1) {
    state.flashcards.currentIndex = (state.flashcards.currentIndex + 1) % state.flashcards.list.length;
  }
  renderFlashcard();
}

// --- SUB-VIEW: QUIZ GAME ---
function initQuizMode() {
  state.quiz.active = true;
  state.quiz.currentIndex = 0;
  state.quiz.lives = 3;
  state.quiz.selectedOption = null;
  state.quiz.isChecked = false;
  state.quiz.questions = generateQuizQuestions();

  // Esconder overlays
  document.getElementById("quizGameOverOverlay").classList.add("hidden");
  document.getElementById("quizSuccessOverlay").classList.add("hidden");

  renderQuizQuestion();
  updateQuizProgress();
}

function generateQuizQuestions() {
  const shuffledWords = [...WORDS].sort(() => Math.random() - 0.5);
  const selectedWords = shuffledWords.slice(0, 5); // 5 preguntas

  return selectedWords.map(word => {
    const isHebToSpa = Math.random() > 0.5;

    // Distractores
    const distractors = WORDS
      .filter(w => w.hebrew !== word.hebrew)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const choices = [word, ...distractors].sort(() => Math.random() - 0.5);

    return {
      word,
      isHebToSpa,
      questionText: isHebToSpa
        ? `¿Qué significa la palabra '${word.hebrew}'?`
        : `¿Cómo se dice '${word.spanish}' en hebreo?`,
      choices,
      correctIndex: choices.findIndex(c => c.hebrew === word.hebrew)
    };
  });
}

function updateQuizProgress() {
  const percent = (state.quiz.currentIndex / 5) * 100;
  document.getElementById("quizProgressBar").style.width = `${percent}%`;

  // Renderizar corazones
  const heartsContainer = document.getElementById("quizHeartsContainer");
  heartsContainer.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement("i");
    heart.setAttribute("data-lucide", "heart");
    if (i < state.quiz.lives) {
      heart.className = "w-5 h-5 fill-current text-brand-red";
    } else {
      heart.className = "w-5 h-5 text-slate-700";
    }
    heartsContainer.appendChild(heart);
  }
  lucide.createIcons();
}

function renderQuizQuestion() {
  const question = state.quiz.questions[state.quiz.currentIndex];
  if (!question) return;

  state.quiz.selectedOption = null;
  state.quiz.isChecked = false;

  // Botón comprobar deshabilitado
  const actionBtn = document.getElementById("quizActionBtn");
  actionBtn.disabled = true;
  actionBtn.innerHTML = "<span>Comprobar</span>";
  actionBtn.className = "w-full py-4 rounded-2xl bg-purple-600/50 text-slate-400 text-sm font-bold flex items-center justify-center cursor-not-allowed";

  // Titulo y texto
  document.getElementById("quizTypeBadge").textContent = question.isHebToSpa ? "Hebreo a Español" : "Español a Hebreo";
  document.getElementById("quizQuestionText").textContent = question.questionText;

  // Render opciones
  const btns = document.querySelectorAll(".quiz-option-btn");
  btns.forEach((btn, idx) => {
    const choice = question.choices[idx];
    const optionTextEl = btn.querySelector(".option-text");
    const statusIconEl = btn.querySelector(".option-status-icon");
    const keyBadge = btn.querySelector("span:first-child");

    // Restablecer estilos
    btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 text-left text-sm font-bold text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 transition-all active:scale-99 flex items-center justify-between group";
    keyBadge.className = "w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-black group-hover:bg-slate-700 transition-all";
    statusIconEl.innerHTML = "";
    statusIconEl.classList.add("hidden");

    if (choice) {
      optionTextEl.textContent = question.isHebToSpa ? choice.spanish : choice.hebrew;
      // Estilos hebreos
      if (!question.isHebToSpa) {
        optionTextEl.className = "option-text font-hebrew text-lg font-bold";
      } else {
        optionTextEl.className = "option-text text-sm font-bold";
      }
      btn.style.display = "flex";
    } else {
      btn.style.display = "none";
    }
  });
}

function handleSelectOption(optionIndex) {
  if (state.quiz.isChecked) return;

  playSound('click');
  state.quiz.selectedOption = optionIndex;

  // Actualizar UI activa en opciones
  const btns = document.querySelectorAll(".quiz-option-btn");
  btns.forEach((btn, idx) => {
    const keyBadge = btn.querySelector("span:first-child");
    if (idx === optionIndex) {
      btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-purple-950/40 border-2 border-purple-500 text-left text-sm font-bold text-purple-200 transition-all active:scale-99 flex items-center justify-between group shadow-neon-purple";
      keyBadge.className = "w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black transition-all";
    } else {
      btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 text-left text-sm font-bold text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 transition-all active:scale-99 flex items-center justify-between group";
      keyBadge.className = "w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-black group-hover:bg-slate-700 transition-all";
    }
  });

  // Habilitar botón comprobar
  const actionBtn = document.getElementById("quizActionBtn");
  actionBtn.disabled = false;
  actionBtn.className = "w-full py-4 rounded-2xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all active:scale-98 flex items-center justify-center cursor-pointer shadow-lg shadow-purple-900/20";
}

function handleCheckAnswer() {
  if (state.quiz.isChecked) {
    // Si ya fue chequeado, sirve como botón de "Continuar"
    playSound('click');
    state.quiz.currentIndex++;
    if (state.quiz.currentIndex >= 5) {
      // Victoria
      playSound('correct');
      addXP(15);
      state.quizzesCompleted++;
      saveUserData();
      // Renderizar overlay victoria
      document.getElementById("quizSuccessOverlay").classList.remove("hidden");
    } else {
      renderQuizQuestion();
      updateQuizProgress();
    }
    return;
  }

  state.quiz.isChecked = true;
  const question = state.quiz.questions[state.quiz.currentIndex];
  const isCorrect = state.quiz.selectedOption === question.correctIndex;

  const btns = document.querySelectorAll(".quiz-option-btn");
  const actionBtn = document.getElementById("quizActionBtn");

  if (isCorrect) {
    playSound('correct');
    // Highlight correct
    const btn = btns[question.correctIndex];
    const keyBadge = btn.querySelector("span:first-child");
    const statusIconEl = btn.querySelector(".option-status-icon");

    btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500 text-left text-sm font-bold text-emerald-200 transition-all flex items-center justify-between shadow-neon-green";
    keyBadge.className = "w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black";
    statusIconEl.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400"></i>';
    statusIconEl.classList.remove("hidden");

    actionBtn.innerHTML = "<span>Continuar</span>";
    actionBtn.className = "w-full py-4 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all active:scale-98 flex items-center justify-center shadow-lg shadow-emerald-900/20";
  } else {
    playSound('wrong');
    state.quiz.lives--;
    updateQuizProgress();

    // Highlight incorrect selected option
    const wrongBtn = btns[state.quiz.selectedOption];
    const wrongKeyBadge = wrongBtn.querySelector("span:first-child");
    const wrongStatusIconEl = wrongBtn.querySelector(".option-status-icon");

    wrongBtn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-red-950/40 border-2 border-red-500 text-left text-sm font-bold text-red-200 transition-all flex items-center justify-between";
    wrongKeyBadge.className = "w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-xs font-black";
    wrongStatusIconEl.innerHTML = '<i data-lucide="alert-triangle" class="w-5 h-5 text-red-400"></i>';
    wrongStatusIconEl.classList.remove("hidden");

    // Highlight correct option
    const correctBtn = btns[question.correctIndex];
    const correctKeyBadge = correctBtn.querySelector("span:first-child");

    correctBtn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/50 text-left text-sm font-bold text-emerald-400 transition-all flex items-center justify-between";
    correctKeyBadge.className = "w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black";

    actionBtn.innerHTML = "<span>Continuar</span>";
    actionBtn.className = "w-full py-4 rounded-2xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all active:scale-98 flex items-center justify-center";

    if (state.quiz.lives <= 0) {
      // Game Over
      setTimeout(() => {
        document.getElementById("quizGameOverOverlay").classList.remove("hidden");
      }, 500);
    }
  }
  lucide.createIcons();
}

// --- SUB-VIEW TOGGLE CONTROLLER ---
function setFlashcardTab(tabName) {
  const btnLearn = document.getElementById("tabBtnLearn");
  const btnQuiz = document.getElementById("tabBtnQuiz");
  const viewLearn = document.getElementById("subview-learn");
  const viewQuiz = document.getElementById("subview-quiz");

  if (tabName === 'learn') {
    btnLearn.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-white bg-purple-600 shadow-md";
    btnQuiz.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-slate-400";
    viewLearn.classList.remove("hidden");
    viewQuiz.classList.add("hidden");

    state.quiz.active = false;
    initLearnMode();
  } else {
    btnQuiz.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-white bg-purple-600 shadow-md";
    btnLearn.className = "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 z-10 text-slate-400";
    viewQuiz.classList.remove("hidden");
    viewLearn.classList.add("hidden");

    initQuizMode();
  }
}

function extractYouTubeVideoId(url) {
  if (!url) return null;

  const patterns = [
    /youtube\.com\/watch\?[^\s]*v=([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    /youtu\.be\/([A-Za-z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('v');
  } catch (error) {
    return null;
  }
}

function buildYouTubeThumbnail(url) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "";
}

async function loadVideosIsraelNoticias() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/israelnoticiasycultura/desmitifica/main/preguntas.json');
    if (!response.ok) throw new Error('No se pudo cargar preguntas.json');

    const data = await response.json();
    state.moreVideos = (data || [])
      .filter(item => item?.video)
      .map(item => ({
        title: item.titulo || 'Video recomendado',
        url: item.video,
        thumbnail: buildYouTubeThumbnail(item.video)
      }));
  } catch (error) {
    console.error('Error cargando videos para Más:', error);
    state.moreVideos = [];
  }
}

function shareVideo(url, platform) {
  const shareText = 'Mirá este video que vale la pena compartir:';
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${shareText} ${url}`);

  let shareUrl = '';

  switch (platform) {
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${encodedText}`;
      break;
    case 'telegram':
      shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    default:
      break;
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }
}

async function copyVideoUrl(url, button) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    const originalLabel = button.innerHTML;
    button.innerHTML = '<span class="text-[10px] font-bold">¡Copiado!</span>';
    setTimeout(() => {
      button.innerHTML = originalLabel;
    }, 1200);
  } catch (error) {
    console.error('No se pudo copiar el enlace:', error);
    alert('No se pudo copiar el enlace.');
  }
}

function createShareButtonGroup(url, counterApiUrl, { includeLabel = false } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-wrap items-center gap-2';

  if (includeLabel) {
    const label = document.createElement('span');
    label.className = 'text-sm font-medium text-slate-300 self-center mr-1';
    label.textContent = 'Compartir:';
    wrapper.appendChild(label);
  }

  const actions = [
    { action: 'whatsapp', className: 'border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20', icon: 'message-circle' },
    { action: 'telegram', className: 'border border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20', icon: 'send' },
    { action: 'copy', className: 'border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20', icon: 'copy' },
    { action: 'facebook', className: 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20', icon: 'facebook' }
  ];

  actions.forEach(({ action, className, icon }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `share-btn px-2.5 py-2 rounded-xl transition-all ${className}`;
    button.setAttribute('data-share-action', action);
    button.setAttribute('data-url', url);

    if (action === 'facebook') {
      button.innerHTML = '<i class="fab fa-facebook-f"></i>';
    } else {
      button.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i>`;
    }

    button.onclick = async (event) => {
      event.stopPropagation();
      const shareAction = button.getAttribute('data-share-action');
      const shareUrl = button.getAttribute('data-url');

      if (shareAction === 'copy') {
        await copyVideoUrl(shareUrl, button);
      } else {
        shareVideo(shareUrl, shareAction);
      }

      await incrementarContadorV1(counterApiUrl);
    };

    wrapper.appendChild(button);
  });

  return wrapper;
}

function renderMoreVideos() {
  const container = document.getElementById('moreVideosList');
  if (!container) return;

  container.innerHTML = '';

  if (!state.moreVideos.length) {
    container.innerHTML = '<div class="text-center py-8 text-sm text-slate-500">No se pudieron cargar los videos en este momento.</div>';
    return;
  }

  // Seleccionar aleatoriamente máximo 10 videos
  const shuffled = [...state.moreVideos].sort(() => Math.random() - 0.5);
  const selectedVideos = shuffled.slice(0, 10);

  selectedVideos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all flex flex-col group';

    card.innerHTML = `
      <div class="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer" data-video-id="${extractYouTubeVideoId(video.url) || ''}" data-video-title="${video.title}" data-video-url="${video.url}">
        <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
          <div class="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
            <i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i>
          </div>
        </div>
        <img src="${video.thumbnail}" alt="${video.title}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-90">
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div class="space-y-1">
          <h4 class="text-sm font-bold text-slate-200 line-clamp-2 leading-normal">${video.title}</h4>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="text-sm font-medium text-slate-300 self-center mr-2">Compartir:</span>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all" data-share-action="whatsapp" data-url="${video.url}">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
          </button>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all" data-share-action="telegram" data-url="${video.url}">
            <i data-lucide="send" class="w-4 h-4"></i>
          </button>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all" data-share-action="copy" data-url="${video.url}">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all" data-share-action="facebook" data-url="${video.url}">
            <i class="fab fa-facebook-f"></i>
          </button>
        </div>
      </div>
    `;

    const openArea = card.querySelector('[data-video-id]');
    openArea.onclick = () => {
      const videoId = openArea.getAttribute('data-video-id');
      const title = openArea.getAttribute('data-video-title');
      const url = openArea.getAttribute('data-video-url');
      if (videoId) {
        openVideoModal(videoId, title);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    card.querySelectorAll('.share-btn').forEach(button => {
      button.onclick = async (event) => {
        event.stopPropagation();
        const action = button.getAttribute('data-share-action');
        const url = button.getAttribute('data-url');

        if (action === 'copy') {
          await copyVideoUrl(url, button);
        } else {
          shareVideo(url, action);
        }

        await incrementarContadorV1(COUNTER_API_URL_V1_INC);
      };
    });

    container.appendChild(card);
  });

  lucide.createIcons();
}

// --- SCREEN: CLASES ---
function renderVideos() {
  const container = document.getElementById("videosListContainer");
  if (!container) return;

  const filtered = VIDEOS.filter(video => state.videoFilter === 'all' || video.category === state.videoFilter);

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">No se encontraron videos.</div>`;
    return;
  }

  filtered.forEach(video => {
    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-500/40 transition-all flex flex-col group relative";
    const shareUrl = video.urlList || video.url || `https://youtu.be/${video.id}`;
    const videoIndex = VIDEOS.findIndex(item => item.id === video.id);
    const classLabel = videoIndex === 0 ? 'INTRODUCCIÓN' : `CLASE ${videoIndex}`;

    card.innerHTML = `
      <div class="relative aspect-video w-full overflow-hidden bg-slate-950">
        <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
          <div class="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
            <i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i>
          </div>
        </div>
        <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-90">
        <span class="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300 z-20">${video.duration}</span>
      </div>
      <div class="flex items-start gap-3 p-4">
        <div class="space-y-2">
          <span class="text-[10px] font-bold leading-tight text-slate-100 border border-purple-800/30 px-2 py-0.5 rounded-full">${classLabel}</span>
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/50 border border-purple-800/30 px-2 py-0.5 rounded-full">${video.category === 'alfabeto' ? 'Alfabeto' : video.category === 'phrases' ? 'Vocabulario' : 'Gramática'}</span>
          <h4 class="text-sm font-bold text-slate-200 line-clamp-2 pt-1 leading-normal group-hover:text-purple-300 transition-colors">${video.title}</h4>
          <div class="video-share-actions"></div>
          </div>
        </div>
      </div>
    `;

    const shareContainer = card.querySelector('.video-share-actions');
    shareContainer.appendChild(createShareButtonGroup(shareUrl, COUNTER_API_URL_V1_HDC, { includeLabel: true }));

    card.onclick = () => {
      openVideoModal(video.id, video.title, shareUrl);
    };

    container.appendChild(card);
  });
  lucide.createIcons();
}

function handleVideoFilter(filterName, btn) {
  playSound('click');
  state.videoFilter = filterName;

  // Actualizar botones
  document.querySelectorAll(".video-filter-btn").forEach(b => {
    b.className = "video-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 transition-all";
  });
  btn.className = "video-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm border border-purple-500/20";

  renderVideos();
}

// --- MODAL DE YOUTUBE ---
function openVideoModal(videoId, title, shareUrl = `https://youtu.be/${videoId}`) {
  playSound('click');

  const modal = document.getElementById("youtubeModal");
  const iframe = document.getElementById("youtubeIframe");
  const titleEl = document.getElementById("youtubeModalTitle");
  const openAppBtn = document.getElementById("youtubeOpenAppBtn");
  const shareActionsContainer = document.getElementById("youtubeShareActions");

  titleEl.textContent = title;
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  openAppBtn.href = `https://youtu.be/${videoId}`;

  if (shareActionsContainer) {
    shareActionsContainer.innerHTML = '';
    shareActionsContainer.appendChild(createShareButtonGroup(shareUrl, COUNTER_API_URL_V1_HDC));
  }

  modal.classList.remove("hidden");
  // Retraso para disparar la animación CSS de fade in + scale
  setTimeout(() => {
    modal.classList.remove("opacity-0", "scale-95");
  }, 10);
  lucide.createIcons();
}

function closeVideoModal() {
  playSound('click');

  const modal = document.getElementById("youtubeModal");
  const iframe = document.getElementById("youtubeIframe");

  modal.classList.add("opacity-0", "scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    iframe.src = ""; // Detener video
  }, 300);
}

// --- SCREEN: MÁS / CONFIGURACIÓN ---
function updateProfileView() {
  document.getElementById("profileStatStreak").textContent = state.streak;
  document.getElementById("profileStatXp").textContent = state.xp;
  document.getElementById("profileStatQuizzes").textContent = state.quizzesCompleted;
  document.getElementById("usernameInput").value = state.username;
  document.getElementById("profileAvatarInitial").textContent = state.username.charAt(0).toUpperCase() || "A";

  // Configs
  document.getElementById("soundToggle").checked = state.soundEnabled;
}

function handleResetData() {
  if (confirm("¿Estás seguro de que quieres restablecer tu progreso? Esto borrará tu racha, XP e historial de aprendizaje.")) {
    playSound('wrong');
    state.xp = 0;
    state.streak = 0;
    state.quizzesCompleted = 0;
    state.lastQuizDate = "";
    state.completedToday = false;
    state.username = "Aprendiz";
    saveUserData();
    updateProfileView();
    updateStatsHeader();
    alert("Datos restablecidos.");
  }
}

// --- ENRUTADOR DE LA SPA ---
const tabMappings = {
  "": "screen-home",
  "#home": "screen-home",
  "#flashcards": "screen-flashcards",
  "#videos": "screen-videos",
  "#profile": "screen-profile",
  "#more": "screen-more"
};

function handleRoute() {
  const hash = window.location.hash || "#home";
  const targetTabId = tabMappings[hash] || "screen-home";

  // VALIDACIÓN DE USUARIO PARA PRÁCTICA
  if (targetTabId === "screen-flashcards" && !usuarioActual && typeof abrirModal === "function") {
    abrirModal();
    // Restaurar el hash al tab anterior si es posible
    const currentHash = Object.keys(tabMappings).find(key => tabMappings[key] === state.currentTab) || "#home";
    history.replaceState(null, null, currentHash);
    return;
  }

  if (state.currentTab === targetTabId) return;

  const tabsOrder = ["screen-home", "screen-flashcards", "screen-videos", "screen-profile", "screen-more"];
  const currentIdx = tabsOrder.indexOf(state.currentTab);
  const targetIdx = tabsOrder.indexOf(targetTabId);
  const direction = targetIdx > currentIdx ? "forward" : "backward";

  const updateDOM = () => {
    // Ocultar todas las pantallas
    document.querySelectorAll(".app-screen").forEach(el => el.classList.add("hidden"));
    // Mostrar pantalla destino
    document.getElementById(targetTabId).classList.remove("hidden");

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

// --- CAPTURA DE EVENTO INSTALACIÓN PWA ---
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

// --- INICIALIZACIÓN GLOBAL ---
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadWords(), loadVideos(), loadVideosIsraelNoticias()]);

  // Inicializar voces TTS
  loadVoices();

  // Vincular eventos de pestañas Flashcards
  document.getElementById("tabBtnLearn").onclick = () => {
    playSound('click');
    setFlashcardTab('learn');
  };
  document.getElementById("tabBtnQuiz").onclick = () => {
    playSound('click');
    setFlashcardTab('quiz');
  };

  // Vincular eventos de Aprender (Flashcards)
  document.getElementById("flipCardContainer").onclick = () => {
    playSound('flip');
    const flipEl = document.getElementById("flipCard");
    flipEl.classList.toggle("rotate-y-180");
    state.flashcards.isFlipped = !state.flashcards.isFlipped;
  };
  document.getElementById("cardAudioBtn").onclick = (e) => {
    e.stopPropagation(); // evitar flip al clickear audio
    playSound('click');
    const card = state.flashcards.list[state.flashcards.currentIndex];
    speakHebrew(card.hebrew);
  };
  document.getElementById("cardAudioBtnBack").onclick = (e) => {
    e.stopPropagation(); // evitar flip al clickear audio
    playSound('click');
    const card = state.flashcards.list[state.flashcards.currentIndex];
    speakHebrew(card.hebrew);
  };
  document.getElementById("learnNextBtn").onclick = () => {
    playSound('click');
    handleLearnNext();
  };
  document.getElementById("learnEasyBtn").onclick = () => {
    playSound('click');
    handleLearnEasy();
  };
  document.getElementById("learnHardBtn").onclick = () => {
    playSound('click');
    handleLearnHard();
  };

  // Vincular eventos Swipe (Gestos táctiles) en tarjeta
  let touchStartX = 0;
  let touchEndX = 0;
  const flipContainer = document.getElementById("flipCardContainer");

  flipContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  flipContainer.addEventListener('touchend', (e) => {
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

  // Vincular eventos del Quiz
  document.querySelectorAll(".quiz-option-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute("data-option"));
      handleSelectOption(idx);
    };
  });
  document.getElementById("quizActionBtn").onclick = () => {
    handleCheckAnswer();
  };
  document.getElementById("quizRetryBtn").onclick = () => {
    playSound('click');
    initQuizMode();
  };
  document.getElementById("quizCompleteBtn").onclick = () => {
    playSound('click');
    window.location.hash = "#home";
  };

  // Vincular filtros de videos
  document.querySelectorAll(".video-filter-btn").forEach(btn => {
    btn.onclick = () => {
      const category = btn.getAttribute("data-filter");
      handleVideoFilter(category, btn);
    };
  });

  // Vincular eventos de Modal Youtube
  document.getElementById("closeYoutubeModal").onclick = () => {
    closeVideoModal();
  };
  document.getElementById("youtubeModal").onclick = (e) => {
    if (e.target === document.getElementById("youtubeModal")) {
      closeVideoModal();
    }
  };

  // Vincular eventos de configuración Perfil
  document.getElementById("soundToggle").onchange = (e) => {
    state.soundEnabled = e.target.checked;
    saveUserData();
  };
  document.getElementById("usernameInput").onblur = (e) => {
    state.username = e.target.value.trim() || "Aprendiz";
    saveUserData();
    updateProfileView();
  };
  document.getElementById("usernameInput").onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };
  document.getElementById("resetDataBtn").onclick = () => {
    handleResetData();
  };

  // Vincular PWA Install Button
  const pwaInstallBtn = document.getElementById("pwaInstallBtn");
  pwaInstallBtn.onclick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('El usuario aceptó la instalación');
          document.getElementById("pwaInstallBanner").classList.add("hidden");
        }
        deferredPrompt = null;
      });
    }
  };

  // Inicializar enrutamiento
  window.addEventListener("hashchange", handleRoute);

  // Renderizar Inicio por defecto
  handleRoute();
  updateHomeView();
  await actualizarContadorEnPantalla(COUNTER_API_URL_V1_HDC, 'contador-hdc');
  await actualizarContadorEnPantalla(COUNTER_API_URL_V1_INC, 'contador-global');
  lucide.createIcons();
});

// ==========================================
// LÓGICA DE INTERFAZ DEL MODAL Y SUPABASE
// ==========================================
const authModal = document.getElementById('auth-modal');
const closeBtn = document.getElementById('auth-close-btn');

window.abrirModal = function () {
  if (authModal) authModal.classList.remove('hidden');
  limpiarMensajes();
}

window.cerrarModal = function () {
  if (authModal) authModal.classList.add('hidden');
}

if (closeBtn) closeBtn.addEventListener('click', cerrarModal);

if (authModal) {
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) cerrarModal();
  });
}

window.switchAuthTab = function (tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  limpiarMensajes();

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

function mostrarMensaje(formId, tipo, texto) {
  const msgDiv = document.getElementById(`${formId}-message`);
  if (msgDiv) {
    msgDiv.className = `auth-message ${tipo}`;
    msgDiv.textContent = texto;
  }
}

function limpiarMensajes() {
  const loginMsg = document.getElementById('login-message');
  const regMsg = document.getElementById('register-message');
  if (loginMsg) loginMsg.textContent = '';
  if (regMsg) regMsg.textContent = '';
}

window.handleRegister = async function (event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) throw error;

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      mostrarMensaje('register', 'error', 'Este correo ya está registrado.');
    } else {
      mostrarMensaje('register', 'success', '¡Registro exitoso! Por favor revisa tu bandeja de entrada para verificar tu correo antes de ingresar.');
      document.getElementById('register-form').reset();
    }
  } catch (error) {
    console.error('Error en el registro:', error);
    mostrarMensaje('register', 'error', error.message || 'Error al crear la cuenta.');
  }
}

window.handleLogin = async function (event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Debes verificar tu correo antes de poder iniciar sesión. Revisa tu bandeja de entrada.');
      }
      throw error;
    }

    cerrarModal();
    document.getElementById('login-form').reset();
    console.log("Sesión iniciada exitosamente.");

    // Al loguearse, redirigir a flashcards
    window.location.hash = '#flashcards';

  } catch (error) {
    console.error('Error en login:', error);
    mostrarMensaje('login', 'error', error.message || 'Correo o contraseña incorrectos.');
  }
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      usuarioActual = session.user;
      console.log('Usuario autenticado:', usuarioActual.email);
    } else {
      usuarioActual = null;
      console.log('Usuario desconectado');
    }
  });
}
