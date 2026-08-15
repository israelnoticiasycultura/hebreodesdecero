// js/auth.js
import { state, usuarioActual, setUsuarioActual, saveUserData, updateStatsHeader } from './state.js';
import { updateProfileView, updateHomeView } from './home.js';

// ==========================================
// INICIALIZACIÓN DE SUPABASE
// ==========================================
const supabaseUrl = 'https://gjyqwqaabzajoflqwped.supabase.co';
const supabaseKey = 'sb_publishable_ZM3R9fFL9JY-OK_Lvi9lHw_E00H_Rlj';
export const supabaseClient = (window.supabase && supabaseUrl && supabaseKey) ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      setUsuarioActual(session.user);
      console.log('Usuario autenticado:', session.user.email);
      await fetchUserStats(session.user.id);
    } else {
      setUsuarioActual(null);
      state.clasesCompartidas = 0;
      state.incCompartidos = 0;
      state.offlineClases = 0;
      state.offlineInc = 0;
      saveUserData();
      try {
        updateProfileView();
        updateHomeView();
      } catch (e) {
        console.error('Error al actualizar vistas tras logout:', e);
      }
      console.log('Usuario desconectado');
    }

    try {
      const { actualizarContadorEnPantalla, WORKER_URL_HDC, WORKER_URL_INC } = await import('./api.js');
      await actualizarContadorEnPantalla(WORKER_URL_HDC, 'contador-hdc', true);
      await actualizarContadorEnPantalla(WORKER_URL_INC, 'contador-global', true);
    } catch (err) {
      console.error('Error al actualizar contadores en onAuthStateChange:', err);
    }
  });
}

export function obtenerUtcOffset() {
  return Math.round(-new Date().getTimezoneOffset() / 60);
}

async function fetchUserStats(userId) {
  try {
    // 1. Obtener estadísticas actuales del usuario en Supabase
    const { data, error } = await supabaseClient
      .from('user_stats')
      .select('experiencia, racha, clases_compartidas, inc_compartidos, ultima_conexion, recordatorio_activo, hora_recordatorio, intervalo_horas, utc_offset')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo user_stats:', error);
      return;
    }

    const currentUtcOffset = obtenerUtcOffset();
    let dbClases = 0;
    let dbInc = 0;
    let dbXp = state.xp || 0;
    let dbStreak = state.streak || 0;
    let dbUltimaConexion = state.ultimaConexion;
    let dbRecordatorioActivo = state.recordatorioActivo;
    let dbRecordatorioHora = state.recordatorioHora;
    let dbRecordatorioIntervalo = state.recordatorioIntervalo;

    const recordatorioModificadoLocalmente = localStorage.getItem('hebrew_recordatorio_modificado_localmente') === 'true';

    if (data) {
      dbXp = data.experiencia || 0;
      dbStreak = data.racha || 0;
      dbClases = data.clases_compartidas || 0;
      dbInc = data.inc_compartidos || 0;
      if (data.ultima_conexion) dbUltimaConexion = data.ultima_conexion;

      if (recordatorioModificadoLocalmente) {
        // Si fue modificado localmente, prevalecen los valores locales para subirlos
        dbRecordatorioActivo = state.recordatorioActivo;
        dbRecordatorioHora = state.recordatorioHora;
        dbRecordatorioIntervalo = state.recordatorioIntervalo;
      } else {
        // Si no fue modificado localmente, nos traemos lo que haya en la base de datos
        if (data.recordatorio_activo !== undefined && data.recordatorio_activo !== null) {
          dbRecordatorioActivo = data.recordatorio_activo;
        }
        if (data.hora_recordatorio) dbRecordatorioHora = data.hora_recordatorio;
        if (data.intervalo_horas !== undefined && data.intervalo_horas !== null) {
          dbRecordatorioIntervalo = data.intervalo_horas;
        }
      }
    }

    // 2. Guardar el progreso offline acumulado específico
    const offlineClases = state.offlineClases || 0;
    const offlineInc = state.offlineInc || 0;

    // Detectar si el offset cambió con respecto a lo que había en la base de datos
    const offsetCambio = data && data.utc_offset !== currentUtcOffset;

    // 3. Sincronizar con Supabase si hay progreso offline acumulado, si se modificaron recordatorios localmente, si cambió el offset o si no existe la fila
    if (offlineClases > 0 || offlineInc > 0 || recordatorioModificadoLocalmente || offsetCambio || !data) {
      const nuevoClases = dbClases + offlineClases;
      const nuevoInc = dbInc + offlineInc;

      if (data) {
        // Si ya existe la fila, la actualizamos
        const updatePayload = {
          clases_compartidas: nuevoClases,
          inc_compartidos: nuevoInc,
          utc_offset: currentUtcOffset
        };
        if (recordatorioModificadoLocalmente) {
          updatePayload.recordatorio_activo = dbRecordatorioActivo;
          updatePayload.hora_recordatorio = dbRecordatorioHora;
          updatePayload.intervalo_horas = dbRecordatorioIntervalo;
        }

        const { error: updateError } = await supabaseClient
          .from('user_stats')
          .update(updatePayload)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error al sincronizar estadísticas locales con Supabase:', updateError);
        } else {
          console.log(`Sincronización exitosa (UPDATE): clases_compartidas=${nuevoClases}, inc_compartidos=${nuevoInc}, utc_offset=${currentUtcOffset}`);
          dbClases = nuevoClases;
          dbInc = nuevoInc;
          state.offlineClases = 0;
          state.offlineInc = 0;
          if (recordatorioModificadoLocalmente) {
            localStorage.removeItem('hebrew_recordatorio_modificado_localmente');
          }
        }
      } else {
        // Si no existe la fila, la insertamos
        const { error: insertError } = await supabaseClient
          .from('user_stats')
          .insert({
            user_id: userId,
            experiencia: dbXp,
            racha: dbStreak,
            clases_compartidas: nuevoClases,
            inc_compartidos: nuevoInc,
            recordatorio_activo: dbRecordatorioActivo,
            hora_recordatorio: dbRecordatorioHora,
            intervalo_horas: dbRecordatorioIntervalo,
            utc_offset: currentUtcOffset,
            ultima_conexion: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error al insertar estadísticas locales en Supabase:', insertError);
        } else {
          console.log(`Sincronización exitosa (INSERT): clases_compartidas=${nuevoClases}, inc_compartidos=${nuevoInc}, utc_offset=${currentUtcOffset}`);
          dbClases = nuevoClases;
          dbInc = nuevoInc;
          state.offlineClases = 0;
          state.offlineInc = 0;
          localStorage.removeItem('hebrew_recordatorio_modificado_localmente');
        }
      }
    }

    // 4. Actualizar el estado global con los valores consolidados
    state.xp = dbXp;
    state.streak = dbStreak;
    state.clasesCompartidas = dbClases;
    state.incCompartidos = dbInc;
    state.ultimaConexion = dbUltimaConexion;
    state.recordatorioActivo = dbRecordatorioActivo;
    state.recordatorioHora = dbRecordatorioHora;
    state.recordatorioIntervalo = dbRecordatorioIntervalo;

    updateStatsHeader();
    saveUserData();

    // Actualizar última conexión ahora que se conectó exitosamente
    setTimeout(() => {
      actualizarUltimaConexion();
    }, 1000);

    // Actualizar la vista del perfil
    try {
      const { updateProfileView } = await import('./home.js');
      updateProfileView();
    } catch (e) {
      console.error('Error al actualizar vista de perfil:', e);
    }
  } catch (err) {
    console.error('Excepción al obtener/sincronizar user_stats:', err);
  }
}

export async function actualizarUltimaConexion() {
  const ahora = new Date().toISOString();
  state.ultimaConexion = ahora;
  saveUserData();

  if (supabaseClient && usuarioActual) {
    try {
      await supabaseClient
        .from('user_stats')
        .update({ ultima_conexion: ahora })
        .eq('user_id', usuarioActual.id);
    } catch (err) {
      console.warn("No se pudo actualizar ultima_conexion en Supabase (puede faltar la columna):", err);
    }
  }
}

export async function guardarConfigRecordatorio(activo, hora, intervalo) {
  state.recordatorioActivo = activo;
  state.recordatorioHora = hora;
  state.recordatorioIntervalo = intervalo;
  saveUserData();

  if (supabaseClient && usuarioActual) {
    try {
      const utcOffset = obtenerUtcOffset();

      const { error } = await supabaseClient
        .from('user_stats')
        .update({
          recordatorio_activo: activo,
          hora_recordatorio: hora,
          intervalo_horas: intervalo,
          utc_offset: utcOffset
        })
        .eq('user_id', usuarioActual.id);

      if (error) {
        console.error("Error al actualizar la configuración de recordatorios en Supabase:", error);
      } else {
        console.log(`Configuración de recordatorios guardada en Supabase con utc_offset: ${utcOffset}`);
      }
    } catch (err) {
      console.warn("Excepción al guardar la configuración de recordatorios en Supabase:", err);
    }
  } else {
    // Si no está logueado el usuario, guardar localmente indicando modificación local
    localStorage.setItem('hebrew_recordatorio_modificado_localmente', 'true');
  }
}

// ==========================================
// LÓGICA DE INTERFAZ DEL MODAL
// ==========================================
export function abrirModal() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.classList.remove('hidden');
  limpiarMensajes();
}

export function cerrarModal() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.classList.add('hidden');
}

export function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authWelcomeDesc = document.getElementById('auth-welcome-desc');
  const authPromoConsent = document.getElementById('auth-promo-consent');

  limpiarMensajes();

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');

    if (authWelcomeDesc) {
      authWelcomeDesc.textContent = "Inicia sesión para acceder a ejercicios y guardar tu progreso.";
    }
    if (authPromoConsent) {
      authPromoConsent.classList.add('hidden');
    }
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');

    if (authWelcomeDesc) {
      authWelcomeDesc.innerHTML = "<strong>Regístrate gratis*</strong> para acceder a ejercicios y guardar tu progreso.";
    }
    if (authPromoConsent) {
      authPromoConsent.classList.remove('hidden');
    }
  }
}

export function mostrarMensaje(formId, tipo, texto) {
  const msgDiv = document.getElementById(`${formId}-message`);
  if (msgDiv) {
    msgDiv.className = `auth-message ${tipo}`;
    msgDiv.textContent = texto;
  }
}

export function limpiarMensajes() {
  const loginMsg = document.getElementById('login-message');
  const regMsg = document.getElementById('register-message');
  if (loginMsg) loginMsg.textContent = '';
  if (regMsg) regMsg.textContent = '';
}

export async function handleRegister(event) {
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

export async function handleLogin(event) {
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

    if (data && data.user && data.user.user_metadata && data.user.user_metadata.full_name) {
      const fullName = data.user.user_metadata.full_name;
      const usernameInput = document.getElementById('usernameInput');
      if (usernameInput) {
        usernameInput.value = fullName;
      }
      state.username = fullName;
      saveUserData();
      updateProfileView();
      updateHomeView();
    }

    // Al loguearse, redirigir a flashcards
    window.location.hash = '#flashcards';

  } catch (error) {
    console.error('Error en login:', error);
    let mensaje = error.message;
    if (mensaje === 'Invalid login credentials') {
      mensaje = 'Correo o contraseña incorrectos.';
    }

    mostrarMensaje('login', 'error', mensaje || 'Correo o contraseña incorrectos.');
  }
}

// Expose these for index.html if needed for inline onclick
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.switchAuthTab = switchAuthTab;
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
