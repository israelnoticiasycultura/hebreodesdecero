// js/state.js

// Variable global para mantener el estado de la sesión
export let usuarioActual = null;

export function setUsuarioActual(user) {
  usuarioActual = user;
}

export let WORDS = [];

export async function loadWords() {
  try {
    const response = await fetch('./js/words.json');
    if (!response.ok) throw new Error('No se pudo cargar words.json');
    WORDS = await response.json();
  } catch (error) {
    console.error('Error cargando palabras:', error);
    WORDS = [];
  }
}

// Estado global de la aplicación
export const state = {
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

export let VIDEOS = [];

export async function loadVideos() {
  try {
    const response = await fetch('./js/videos.json');
    if (!response.ok) throw new Error('No se pudo cargar videos.json');
    VIDEOS = await response.json();
  } catch (error) {
    console.error('Error cargando videos:', error);
    VIDEOS = [];
  }
}

// --- ACTUALIZACIÓN DE ESTADÍSTICAS GLOBALES ---
export function updateStatsHeader() {
  const headerStreak = document.getElementById("headerStreak");
  const headerXp = document.getElementById("headerXp");
  if (headerStreak) headerStreak.textContent = state.streak;
  if (headerXp) headerXp.textContent = state.xp;
}

export function saveUserData() {
  localStorage.setItem('hebrew_xp', state.xp);
  localStorage.setItem('hebrew_streak', state.streak);
  localStorage.setItem('hebrew_quizzes', state.quizzesCompleted);
  localStorage.setItem('hebrew_last_quiz_date', state.lastQuizDate);
  localStorage.setItem('hebrew_completed_today', state.completedToday);
  localStorage.setItem('hebrew_username', state.username);
  localStorage.setItem('hebrew_sound_enabled', state.soundEnabled);
  updateStatsHeader();
}

export function addXP(amount) {
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
