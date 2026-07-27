// js/api.js

import { supabaseClient } from './auth.js';
import { state, usuarioActual } from './state.js';

export const COUNTER_API_URL_V1_INC = "https://api.counterapi.dev/v1/desmitifica/compartir";
export const COUNTER_API_URL_V1_HDC = "https://api.counterapi.dev/v1/desmitifica/compartirhdc";

export async function obtenerContador(counterApiUrl = COUNTER_API_URL_V1_INC, elementId = 'contador-global') {
  try {
    const res = await fetch(counterApiUrl + "/");
    if (!res.ok) throw new Error('Error al cargar contador');
    const data = await res.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error al obtener contador:', error);
  }
}

export async function incrementarContadorV1(counterApiUrl = COUNTER_API_URL_V1_INC, elementId = 'contador-global') {
  try {
    const res = await fetch(counterApiUrl + "/up");
    if (!res.ok) throw new Error('Error al incrementar contador');
    await obtenerContador(counterApiUrl, elementId);
  } catch (error) {
    console.error('Error al incrementar contador:', error);
  }
}

export async function actualizarContadorEnPantalla(counterApiUrl = COUNTER_API_URL_V1_INC, elementId = 'contador-global') {
  try {
    const currentCounter = await obtenerContador(counterApiUrl, elementId);
    const el = document.getElementById(elementId);
    if (el && elementId === 'contador-global') {
      const userIncShares = state.incCompartidos || 0;
      if (usuarioActual && userIncShares > 0) {
        el.innerHTML = `<span class="inline-block">${currentCounter} verdades difundidas</span> <span class="inline-block whitespace-nowrap">• <span class="text-emerald-400 font-bold">¡Tú has aportado ${userIncShares}! 🌟</span></span>`;
      } else {
        el.textContent = `${currentCounter} verdades difundidas. ¡Ayuda a compartir!`;
      }
    }
    if (el && elementId === 'contador-hdc') {
      const userShares = state.clasesCompartidas || 0;
      if (usuarioActual && userShares > 0) {
        el.innerHTML = `<span class="inline-block">${currentCounter} clases compartidas</span> <span class="inline-block whitespace-nowrap">• <span class="text-amber-400 font-bold">¡Tú has aportado ${userShares}! 💫</span></span>`;
      } else {
        el.textContent = `${currentCounter} clases compartidas por amigos del canal!`;
      }
    }
  } catch (error) {
    console.error('Error al obtener contador:', error);
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = 'No se pudo cargar el contador.';
    }
  }
}

export async function registrarActividadCompletada(expGanada) {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient.rpc('completar_actividad_diaria', {
      exp_ganada: expGanada
    });

    if (error) {
      console.error('Error de Supabase al actualizar racha/xp:', error);
      return false;
    }

    console.log(`Actividad completada. +${expGanada} XP enviados a Supabase.`);
    return true;
  } catch (err) {
    console.error('Excepción al registrar actividad:', err);
    return false;
  }
}
