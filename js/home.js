// js/home.js
import { state, WORDS, VIDEOS, saveUserData } from './state.js';
import { playSound, speakHebrew } from './audio.js';
import { openVideoModal } from './videos.js';

export function getWordOfTheDay() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  if (WORDS.length === 0) return null;
  
  const index = (dayOfYear + 1) % WORDS.length;
  return WORDS[index];
}

export function updateHomeView() {
  // Configurar saludo
  const hour = new Date().getHours();
  let greeting = "¡Shalom, Aprendiz!";
  if (hour >= 6 && hour < 12) greeting = "¡Buenos días - בוקר טוב!";
  else if (hour >= 12 && hour < 19) greeting = "¡Buenas tardes - אחר צהריים טובים!";
  else greeting = "¡Buenas noches - ערב טוב!";

  const welcomeGreeting = document.getElementById("welcomeGreeting");
  if (welcomeGreeting) {
    welcomeGreeting.textContent = greeting.replace("Estudiante", state.username);
  }

  // Palabra del día
  const pdd = getWordOfTheDay();
  if (pdd) {
    document.getElementById("pddIcon").textContent = pdd.emoji;
    document.getElementById("pddHebrew").textContent = pdd.hebrew;
    document.getElementById("pddSpanish").textContent = pdd.spanish;
    document.getElementById("pddCategory").textContent = pdd.category;

    // Vincular audio
    const audioBtn = document.getElementById("pddAudioBtn");
    if (audioBtn) {
      audioBtn.onclick = (e) => {
        e.stopPropagation();
        playSound('click');
        speakHebrew(pdd.hebrew);
      };
    }

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

      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  // Racha y progreso diario
  const progressPercent = state.completedToday ? 100 : 0;
  const dailyProgressText = document.getElementById("dailyProgressText");
  const dailyProgressBar = document.getElementById("dailyProgressBar");
  if (dailyProgressText) dailyProgressText.textContent = `${progressPercent}% completado`;
  if (dailyProgressBar) dailyProgressBar.style.width = `${progressPercent}%`;
}

export function updateProfileView() {
  const profileStatStreak = document.getElementById("profileStatStreak");
  if (profileStatStreak) profileStatStreak.textContent = state.streak;
  
  const profileStatXp = document.getElementById("profileStatXp");
  if (profileStatXp) profileStatXp.textContent = state.xp;
  
  const profileStatQuizzes = document.getElementById("profileStatQuizzes");
  if (profileStatQuizzes) profileStatQuizzes.textContent = state.quizzesCompleted;
  
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) usernameInput.value = state.username;
  
  const profileAvatarInitial = document.getElementById("profileAvatarInitial");
  if (profileAvatarInitial) profileAvatarInitial.textContent = state.username.charAt(0).toUpperCase() || "A";

  // Configs
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) soundToggle.checked = state.soundEnabled;
}

export function handleResetData() {
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
    updateHomeView();
  }
}

// Global exposure for inline events if any
window.handleResetData = handleResetData;
