// js/audio.js
import { state } from './state.js';

// --- MÓDULO AUDIO SINTETIZADO (Web Audio API) ---
let audioCtx = null;

export function playSound(type) {
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
export function speakHebrew(text) {
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

export function loadVoices() {
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
