// js/api.js

export const supabaseUrl = 'https://gjyqwqaabzajoflqwped.supabase.co';
export const supabaseKey = 'sb_publishable_ZM3R9fFL9JY-OK_Lvi9lHw_E00H_Rlj';
export const supabaseClient = (window.supabase && supabaseUrl && supabaseKey) ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

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
