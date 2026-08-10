// js/api.js

import { supabaseClient, actualizarUltimaConexion } from './auth.js';
import { state, usuarioActual, saveUserData } from './state.js';

export const WORKER_URL_HDC = "https://hdc.salva1uno1.workers.dev";
export const WORKER_URL_INC = "https://inc.salva1uno1.workers.dev";

export async function obtenerContador(counterUrl = WORKER_URL_INC, elementId = '') {
  try {
    const res = await fetch(counterUrl);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
    }
    const data = await res.json();
    if (counterUrl === WORKER_URL_INC) {
      return data.clicks ?? 1000;
    }
    return data.clicks ?? 0;
  } catch (error) {
    console.error('Error al obtener contador:', error);
    return counterUrl === WORKER_URL_INC ? 1000 : 0;
  }
}

export async function incrementarContadorV1(counterUrl = WORKER_URL_INC, elementId = 'contador-global') {
  try {
    const res = await fetch(counterUrl, { method: "POST" });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
    }

    // Sincronizar el compartido del usuario local y en Supabase
    if (counterUrl === WORKER_URL_HDC) {
      state.clasesCompartidas = (state.clasesCompartidas || 0) + 1;
      if (!usuarioActual) {
        state.offlineClases = (state.offlineClases || 0) + 1;
      }
      saveUserData();
      try {
        const { updateProfileView } = await import('./home.js');
        updateProfileView();
      } catch (e) {
        console.error('Error al actualizar vista de perfil:', e);
      }
      await incrementarCompartidoUsuario('clase');
    } else if (counterUrl === WORKER_URL_INC) {
      state.incCompartidos = (state.incCompartidos || 0) + 1;
      if (!usuarioActual) {
        state.offlineInc = (state.offlineInc || 0) + 1;
      }
      saveUserData();
      try {
        const { updateProfileView } = await import('./home.js');
        updateProfileView();
      } catch (e) {
        console.error('Error al actualizar vista de perfil:', e);
      }
      await incrementarCompartidoUsuario('israel');
    }

    await actualizarContadorEnPantalla(counterUrl, elementId, true);
  } catch (error) {
    console.error('Error al incrementar contador:', error);
  }
}

const lastFetchTimes = {};

export async function actualizarContadorEnPantalla(counterUrl = WORKER_URL_INC, elementId = 'contador-global', force = false) {
  const now = Date.now();
  if (!force && lastFetchTimes[elementId] && (now - lastFetchTimes[elementId] < 3000)) {
    return;
  }
  lastFetchTimes[elementId] = now;

  try {
    const currentCounter = await obtenerContador(counterUrl, elementId);
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
  // Siempre actualizar la fecha localmente
  state.ultimaConexion = new Date().toISOString();
  saveUserData();

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

    // Sincronizar última conexión en Supabase
    await actualizarUltimaConexion();

    return true;
  } catch (err) {
    console.error('Excepción al registrar actividad:', err);
    return false;
  }
}

export async function incrementarCompartidoUsuario(tipo) {
  if (!supabaseClient || !usuarioActual) return;

  try {
    const isClass = tipo === 'clase';
    const column = isClass ? 'clases_compartidas' : 'inc_compartidos';
    const newValue = isClass ? state.clasesCompartidas : state.incCompartidos;

    const { error } = await supabaseClient
      .from('user_stats')
      .update({ [column]: newValue })
      .eq('user_id', usuarioActual.id);

    if (error) {
      console.error(`Error de Supabase al actualizar ${column}:`, error);
    } else {
      console.log(`Supabase: ${column} actualizado a ${newValue}`);
    }
  } catch (err) {
    console.error('Excepción al actualizar compartido en Supabase:', err);
  }
}
