// js/timepicker.js
import { playSound } from './audio.js';

let currentHour = 20;
let isDragging = false;
let onTimeSelectedCallback = null;

const R_OUTER = 88; // Radio para 1..12 (px)
const R_INNER = 54; // Radio para 00, 13..23 (px)
const THRESHOLD_R = 71; // Umbral para decidir si es aro exterior o interior

export function initClockPicker() {
  const modal = document.getElementById('clockPickerModal');
  const dial = document.getElementById('clockDial');
  const numbersContainer = document.getElementById('clockNumbers');
  const cancelBtn = document.getElementById('clockPickerCancelBtn');
  const confirmBtn = document.getElementById('clockPickerConfirmBtn');
  const timeBtn = document.getElementById('notificationTimeBtn');
  const timeDisplay = document.getElementById('notificationTimeDisplay');
  const timeInput = document.getElementById('notificationTimeInput');

  if (!modal || !dial || !numbersContainer) return;

  // Generar los números del reloj (1..12 en aro exterior, 00 / 13..23 en aro interior)
  renderClockNumbers(numbersContainer);

  // Abrir reloj al hacer clic en el botón de hora
  if (timeBtn) {
    timeBtn.addEventListener('click', () => {
      playSound('click');
      const val = timeInput ? timeInput.value : '20:00';
      const initialHour = parseInt(val.split(':')[0], 10) || 20;
      openClockPicker(initialHour, (selectedHour) => {
        const formatted = `${String(selectedHour).padStart(2, '0')}:00`;
        if (timeDisplay) timeDisplay.textContent = formatted;
        if (timeInput) {
          timeInput.value = formatted;
          timeInput.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  // Eventos para arrastrar o tocar la esfera del reloj
  const handlePointer = (e) => {
    const rect = dial.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const dist = Math.sqrt(dx * dx + dy * dy);
    // Ángulo en radianes desde el eje Y superior (12 horas = 0 rad)
    let rad = Math.atan2(dx, -dy);
    if (rad < 0) rad += 2 * Math.PI;

    // Convertir a grados (0 a 360)
    const deg = rad * (180 / Math.PI);
    // Redondear al sector de 30 grados más cercano (0..11)
    const sector = Math.round(deg / 30) % 12;

    let hour;
    const isOuter = dist >= THRESHOLD_R;

    if (isOuter) {
      // Aro exterior: sector 0 es 12, 1..11 son 1..11
      hour = sector === 0 ? 12 : sector;
    } else {
      // Aro interior: sector 0 es 0, 1..11 son 13..23
      hour = sector === 0 ? 0 : sector + 12;
    }

    if (hour !== currentHour) {
      currentHour = hour;
      playSound('click');
      updateClockUI(currentHour);
    }
  };

  dial.addEventListener('mousedown', (e) => {
    isDragging = true;
    handlePointer(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      handlePointer(e);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) isDragging = false;
  });

  dial.addEventListener('touchstart', (e) => {
    isDragging = true;
    handlePointer(e);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isDragging) {
      e.preventDefault();
      handlePointer(e);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (isDragging) isDragging = false;
  });

  // Botón Cancelar
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      playSound('click');
      closeClockPicker();
    });
  }

  // Botón Aceptar
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      playSound('click');
      if (typeof onTimeSelectedCallback === 'function') {
        onTimeSelectedCallback(currentHour);
      }
      closeClockPicker();
    });
  }

  // Cerrar al hacer clic en el backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeClockPicker();
    }
  });
}

function renderClockNumbers(container) {
  container.innerHTML = '';
  const center = 120; // dial w=240, h=240

  // 1. Números del aro exterior (1..12)
  for (let i = 0; i < 12; i++) {
    const hour = i === 0 ? 12 : i;
    const angleDeg = i * 30;
    const rad = angleDeg * (Math.PI / 180);
    const x = center + R_OUTER * Math.sin(rad);
    const y = center - R_OUTER * Math.cos(rad);

    const el = document.createElement('div');
    el.className = 'absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-300 transition-colors clock-num-item';
    el.dataset.hour = String(hour);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = String(hour);
    container.appendChild(el);
  }

  // 2. Números del aro interior (00, 13..23)
  for (let i = 0; i < 12; i++) {
    const hour = i === 0 ? 0 : i + 12;
    const label = i === 0 ? '00' : String(hour);
    const angleDeg = i * 30;
    const rad = angleDeg * (Math.PI / 180);
    const x = center + R_INNER * Math.sin(rad);
    const y = center - R_INNER * Math.cos(rad);

    const el = document.createElement('div');
    el.className = 'absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[10px] font-semibold text-slate-400 transition-colors clock-num-item';
    el.dataset.hour = String(hour);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = label;
    container.appendChild(el);
  }
}

function updateClockUI(hour) {
  const hourDisplay = document.getElementById('clockPickerSelectedHour');
  const hand = document.getElementById('clockHand');
  const numItems = document.querySelectorAll('.clock-num-item');

  if (hourDisplay) {
    hourDisplay.textContent = String(hour).padStart(2, '0');
  }

  // Determinar ángulo y radio según la hora
  const isOuter = hour >= 1 && hour <= 12;
  const sector = isOuter ? (hour % 12) : (hour === 0 ? 0 : hour - 12);
  const angleDeg = sector * 30;
  const handLength = isOuter ? R_OUTER : R_INNER;

  if (hand) {
    hand.style.height = `${handLength}px`;
    hand.style.transform = `rotate(${angleDeg}deg)`;
  }

  // Resaltar el número seleccionado
  numItems.forEach((item) => {
    if (item.dataset.hour === String(hour)) {
      item.classList.add('text-white', 'font-extrabold');
      item.classList.remove('text-slate-300', 'text-slate-400');
    } else {
      item.classList.remove('text-white', 'font-extrabold');
      if (item.dataset.hour >= 1 && item.dataset.hour <= 12) {
        item.classList.add('text-slate-300');
      } else {
        item.classList.add('text-slate-400');
      }
    }
  });
}

export function openClockPicker(initialHour = 20, onConfirm) {
  currentHour = initialHour;
  onTimeSelectedCallback = onConfirm;

  const modal = document.getElementById('clockPickerModal');
  if (!modal) return;

  updateClockUI(currentHour);

  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0', 'scale-95');
    modal.classList.add('opacity-100', 'scale-100');
  });
}

export function closeClockPicker() {
  const modal = document.getElementById('clockPickerModal');
  if (!modal) return;

  modal.classList.remove('opacity-100', 'scale-100');
  modal.classList.add('opacity-0', 'scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}
