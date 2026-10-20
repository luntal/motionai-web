import {
  activateUserSession,
  describeAuthError,
  getAuthenticatedUser,
  getCurrentUser,
  login,
  logout,
  register,
  resumeUserSession,
  showBackendMessage,
  setUnauthorizedHandler
} from './api.js';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

function styleElement(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

// Resolves with the authenticated user once login or registration succeeded (null if cancelled).
function showAuthOverlay({ message = '', cancellable = false } = {}) {
  return new Promise((resolve) => {
    let mode = 'login';

    const overlay = styleElement(document.createElement('div'), {
      position: 'fixed',
      inset: '0',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10, 14, 20, 0.92)',
      font: '14px system-ui, sans-serif',
      color: '#fff'
    });

    const form = styleElement(document.createElement('form'), {
      width: 'min(360px, 90vw)',
      padding: '24px',
      borderRadius: '16px',
      background: 'rgba(28, 35, 46, 0.98)',
      border: '1px solid rgba(255,255,255,0.18)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
    form.noValidate = true;

    const title = styleElement(document.createElement('h2'), { margin: '0 0 4px', fontSize: '20px' });
    const info = styleElement(document.createElement('div'), { minHeight: '18px', color: '#ffb4b4' });
    info.setAttribute('role', 'alert');
    info.textContent = message;

    const inputStyle = {
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(255,255,255,0.08)',
      color: '#fff',
      fontSize: '14px'
    };
    const emailInput = styleElement(document.createElement('input'), inputStyle);
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.placeholder = 'E-Mail-Adresse';
    emailInput.autocomplete = 'username';
    emailInput.required = true;

    const passwordInput = styleElement(document.createElement('input'), inputStyle);
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.placeholder = 'Passwort';
    passwordInput.maxLength = MAX_PASSWORD_LENGTH;
    passwordInput.required = true;

    const submitButton = styleElement(document.createElement('button'), {
      padding: '10px 12px',
      borderRadius: '8px',
      border: '0',
      background: '#2f7bf5',
      color: '#fff',
      fontSize: '14px',
      cursor: 'pointer'
    });
    submitButton.type = 'submit';

    const switchButton = styleElement(document.createElement('button'), {
      padding: '6px',
      border: '0',
      background: 'transparent',
      color: '#9ec1ff',
      cursor: 'pointer',
      textDecoration: 'underline'
    });
    switchButton.type = 'button';

    const applyMode = () => {
      const isLogin = mode === 'login';
      title.textContent = isLogin ? 'Anmelden' : 'Registrieren';
      submitButton.textContent = isLogin ? 'Anmelden' : 'Konto erstellen';
      switchButton.textContent = isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden';
      passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
      passwordInput.placeholder = isLogin ? 'Passwort' : `Passwort (mind. ${MIN_PASSWORD_LENGTH} Zeichen)`;
      info.textContent = '';
    };

    switchButton.addEventListener('click', () => {
      mode = mode === 'login' ? 'register' : 'login';
      applyMode();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        info.textContent = 'Bitte E-Mail-Adresse und Passwort eingeben.';
        return;
      }
      if (mode === 'register' && (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)) {
        info.textContent = `Das Passwort muss ${MIN_PASSWORD_LENGTH} bis ${MAX_PASSWORD_LENGTH} Zeichen lang sein.`;
        return;
      }

      submitButton.disabled = true;
      info.textContent = '';
      try {
        const user = mode === 'login' ? await login(email, password) : await register(email, password);
        passwordInput.value = '';
        overlay.remove();
        resolve(user);
      } catch (error) {
        info.textContent = describeAuthError(error, mode);
        passwordInput.value = '';
      } finally {
        submitButton.disabled = false;
      }
    });

    applyMode();
    info.textContent = message;
    const nodes = [title, info, emailInput, passwordInput, submitButton, switchButton];
    if (cancellable) {
      const cancelButton = styleElement(document.createElement('button'), {
        padding: '6px',
        border: '0',
        background: 'transparent',
        color: '#ccc',
        cursor: 'pointer'
      });
      cancelButton.type = 'button';
      cancelButton.textContent = 'Als Gast fortfahren';
      cancelButton.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
      nodes.push(cancelButton);
    }
    nodes.forEach((node) => form.appendChild(node));
    overlay.appendChild(form);
    document.body.appendChild(overlay);
    emailInput.focus();
  });
}

function createAccountWidget(user) {
  const isGuest = !user;
  const container = styleElement(document.createElement('div'), {
    position: 'fixed',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 6px 6px 14px',
    borderRadius: '999px',
    background: 'rgba(20, 26, 35, 0.88)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
    font: '13px system-ui, sans-serif',
    color: '#fff'
  });

  const label = document.createElement('span');
  label.textContent = isGuest ? '👤 Gast' : `👤 ${user.email}`;

  const logoutButton = styleElement(document.createElement('button'), {
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer'
  });
  logoutButton.type = 'button';
  logoutButton.textContent = isGuest ? 'Anmelden' : 'Abmelden';
  logoutButton.addEventListener('click', async () => {
    if (isGuest) {
      // The session cookie is set by now; a reload starts the app as this account.
      const loggedIn = await showAuthOverlay({ cancellable: true });
      if (loggedIn) {
        window.location.reload();
      }
      return;
    }
    logoutButton.disabled = true;
    try {
      await logout();
    } finally {
      logoutButton.disabled = false;
    }
  });

  container.appendChild(label);
  container.appendChild(logoutButton);
  document.body.appendChild(container);
}

// Starts as the logged-in account if a valid session exists, otherwise as local guest without any backend sync.
export async function startAuthenticatedSession() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    showBackendMessage(`Server nicht erreichbar, Gastmodus: ${describeAuthError(error, 'login')}`);
  }

  if (!user) {
    createAccountWidget(null);
    return null;
  }

  setUnauthorizedHandler(async () => {
    const sessionUser = getAuthenticatedUser();
    const renewed = await showAuthOverlay({ message: 'Die Sitzung ist abgelaufen. Bitte erneut anmelden.' });
    if (!sessionUser || renewed.id !== sessionUser.id || !(await resumeUserSession(renewed))) {
      window.location.reload();
    }
  });

  await activateUserSession(user);
  createAccountWidget(user);
  return user;
}
