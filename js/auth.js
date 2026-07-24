// js/auth.js
import { state, setUsuarioActual, saveUserData } from './state.js';
import { updateProfileView, updateHomeView } from './home.js';

// ==========================================
// INICIALIZACIÓN DE SUPABASE
// ==========================================
const supabaseUrl = 'https://gjyqwqaabzajoflqwped.supabase.co';
const supabaseKey = 'sb_publishable_ZM3R9fFL9JY-OK_Lvi9lHw_E00H_Rlj';
export const supabaseClient = (window.supabase && supabaseUrl && supabaseKey) ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      setUsuarioActual(session.user);
      console.log('Usuario autenticado:', session.user.email);
    } else {
      setUsuarioActual(null);
      console.log('Usuario desconectado');
    }
  });
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
