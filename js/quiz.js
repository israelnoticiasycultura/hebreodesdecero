// js/quiz.js
import { state, WORDS, addXP, saveUserData } from './state.js';
import { playSound } from './audio.js';
import { usuarioActual } from './state.js'; // We might need a getter if it's let in state.js

export function initQuizMode() {
  state.quiz.active = true;
  state.quiz.currentIndex = 0;
  state.quiz.lives = 3;
  state.quiz.selectedOption = null;
  state.quiz.isChecked = false;
  state.quiz.questions = generateQuizQuestions();

  // Esconder overlays
  const quizGameOverOverlay = document.getElementById("quizGameOverOverlay");
  const quizSuccessOverlay = document.getElementById("quizSuccessOverlay");
  if (quizGameOverOverlay) quizGameOverOverlay.classList.add("hidden");
  if (quizSuccessOverlay) quizSuccessOverlay.classList.add("hidden");

  renderQuizQuestion();
  updateQuizProgress();
}

export function generateQuizQuestions() {
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

export function updateQuizProgress() {
  const percent = (state.quiz.currentIndex / 5) * 100;
  const progressBar = document.getElementById("quizProgressBar");
  if (progressBar) progressBar.style.width = `${percent}%`;

  // Renderizar corazones
  const heartsContainer = document.getElementById("quizHeartsContainer");
  if (heartsContainer) {
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
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

export function renderQuizQuestion() {
  const question = state.quiz.questions[state.quiz.currentIndex];
  if (!question) return;

  state.quiz.selectedOption = null;
  state.quiz.isChecked = false;

  // Botón comprobar deshabilitado
  const actionBtn = document.getElementById("quizActionBtn");
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.innerHTML = "<span>Comprobar</span>";
    actionBtn.className = "w-full py-4 rounded-2xl bg-purple-600/50 text-slate-400 text-sm font-bold flex items-center justify-center cursor-not-allowed";
  }

  // Titulo y texto
  const typeBadge = document.getElementById("quizTypeBadge");
  const textEl = document.getElementById("quizQuestionText");
  if (typeBadge) typeBadge.textContent = question.isHebToSpa ? "Hebreo a Español" : "Español a Hebreo";
  if (textEl) textEl.textContent = question.questionText;

  // Render opciones
  const btns = document.querySelectorAll(".quiz-option-btn");
  btns.forEach((btn, idx) => {
    const choice = question.choices[idx];
    const optionTextEl = btn.querySelector(".option-text");
    const statusIconEl = btn.querySelector(".option-status-icon");
    const keyBadge = btn.querySelector("span:first-child");

    // Restablecer estilos
    btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 text-left text-sm font-bold text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 transition-all active:scale-99 flex items-center justify-between group";
    if (keyBadge) keyBadge.className = "w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-black group-hover:bg-slate-700 transition-all";
    
    if (statusIconEl) {
      statusIconEl.innerHTML = "";
      statusIconEl.classList.add("hidden");
    }

    if (choice) {
      if (optionTextEl) {
        optionTextEl.textContent = question.isHebToSpa ? choice.spanish : choice.hebrew;
        // Estilos hebreos
        if (!question.isHebToSpa) {
          optionTextEl.className = "option-text font-hebrew text-lg font-bold";
        } else {
          optionTextEl.className = "option-text text-sm font-bold";
        }
      }
      btn.style.display = "flex";
    } else {
      btn.style.display = "none";
    }
  });
}

export function handleSelectOption(optionIndex) {
  if (state.quiz.isChecked) return;

  playSound('click');
  state.quiz.selectedOption = optionIndex;

  // Actualizar UI activa en opciones
  const btns = document.querySelectorAll(".quiz-option-btn");
  btns.forEach((btn, idx) => {
    const keyBadge = btn.querySelector("span:first-child");
    if (idx === optionIndex) {
      btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-purple-950/40 border-2 border-purple-500 text-left text-sm font-bold text-purple-200 transition-all active:scale-99 flex items-center justify-between group shadow-neon-purple";
      if (keyBadge) keyBadge.className = "w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black transition-all";
    } else {
      btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 text-left text-sm font-bold text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 transition-all active:scale-99 flex items-center justify-between group";
      if (keyBadge) keyBadge.className = "w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-black group-hover:bg-slate-700 transition-all";
    }
  });

  // Habilitar botón comprobar
  const actionBtn = document.getElementById("quizActionBtn");
  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.className = "w-full py-4 rounded-2xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all active:scale-98 flex items-center justify-center cursor-pointer shadow-lg shadow-purple-900/20";
  }
}

export function handleCheckAnswer() {
  if (!usuarioActual) {
    if (window.abrirModal) window.abrirModal();
    return;
  }
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
      const successOverlay = document.getElementById("quizSuccessOverlay");
      if (successOverlay) successOverlay.classList.remove("hidden");
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
    if (btn) {
      const keyBadge = btn.querySelector("span:first-child");
      const statusIconEl = btn.querySelector(".option-status-icon");

      btn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500 text-left text-sm font-bold text-emerald-200 transition-all flex items-center justify-between shadow-neon-green";
      if (keyBadge) keyBadge.className = "w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black";
      if (statusIconEl) {
        statusIconEl.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400"></i>';
        statusIconEl.classList.remove("hidden");
      }
    }

    if (actionBtn) {
      actionBtn.innerHTML = "<span>Continuar</span>";
      actionBtn.className = "w-full py-4 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all active:scale-98 flex items-center justify-center shadow-lg shadow-emerald-900/20";
    }
  } else {
    playSound('wrong');
    state.quiz.lives--;
    updateQuizProgress();

    // Highlight incorrect selected option
    const wrongBtn = btns[state.quiz.selectedOption];
    if (wrongBtn) {
      const wrongKeyBadge = wrongBtn.querySelector("span:first-child");
      const wrongStatusIconEl = wrongBtn.querySelector(".option-status-icon");

      wrongBtn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-red-950/40 border-2 border-red-500 text-left text-sm font-bold text-red-200 transition-all flex items-center justify-between";
      if (wrongKeyBadge) wrongKeyBadge.className = "w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-xs font-black";
      if (wrongStatusIconEl) {
        wrongStatusIconEl.innerHTML = '<i data-lucide="alert-triangle" class="w-5 h-5 text-red-400"></i>';
        wrongStatusIconEl.classList.remove("hidden");
      }
    }

    // Highlight correct option
    const correctBtn = btns[question.correctIndex];
    if (correctBtn) {
      const correctKeyBadge = correctBtn.querySelector("span:first-child");
      correctBtn.className = "quiz-option-btn w-full p-4 rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/50 text-left text-sm font-bold text-emerald-400 transition-all flex items-center justify-between";
      if (correctKeyBadge) correctKeyBadge.className = "w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black";
    }

    if (actionBtn) {
      actionBtn.innerHTML = "<span>Continuar</span>";
      actionBtn.className = "w-full py-4 rounded-2xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all active:scale-98 flex items-center justify-center";
    }

    if (state.quiz.lives <= 0) {
      // Game Over
      setTimeout(() => {
        const quizGameOverOverlay = document.getElementById("quizGameOverOverlay");
        if (quizGameOverOverlay) quizGameOverOverlay.classList.remove("hidden");
      }, 500);
    }
  }
  
  if (window.lucide) {
    lucide.createIcons();
  }
}
