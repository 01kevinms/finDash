// ============================================================
// AUTH.JS — Autenticação via Storage (api.php ou fallback local)
// ============================================================

const Auth = {
  SESSION_KEY: 'fin_session',
  USER_KEY:    'fin_user',

  isLoggedIn() {
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  async login(username, password) {
    // Storage.findUser já tem fallback: tenta API, senão usa local
    const user = await Storage.findUser(username, password);
    if (user) {
      sessionStorage.setItem(this.SESSION_KEY, 'true');
      sessionStorage.setItem(this.USER_KEY, JSON.stringify({
        id:   user.id,
        name: user.name,
        role: user.role,
      }));
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    window.location.href = 'login.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  currentUser() {
    try {
      return JSON.parse(sessionStorage.getItem(this.USER_KEY))
        || { name: 'Admin', role: 'admin' };
    } catch {
      return { name: 'Admin', role: 'admin' };
    }
  },
};

// ─── Inicializa página de login ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  // Já logado → redireciona direto
  if (Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const usernameVal = document.getElementById('username').value.trim();
    const passwordVal = document.getElementById('password').value;
    const errEl       = document.getElementById('loginError');
    const btn         = loginForm.querySelector('button[type="submit"]');

    // Reset estado visual
    errEl.style.display = 'none';
    ['username', 'password'].forEach(id =>
      document.getElementById(id)?.classList.remove('input-error')
    );
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const ok = await Auth.login(usernameVal, passwordVal);

      if (ok) {
        btn.classList.remove('loading');
        btn.classList.add('success');
        btn.textContent = 'Entrando…';
        setTimeout(() => { window.location.href = 'index.html'; }, 600);
      } else {
        // Credenciais erradas — erro esperado
        showLoginError(errEl, btn, 'Usuário ou senha inválidos.');
      }
    } catch (err) {
      // Erro inesperado (rede, JSON malformado, etc.)
      console.error('[Auth] Erro no login:', err);
      showLoginError(errEl, btn, 'Erro ao conectar. Tente novamente.');
    }
  });

  // Toggle visibilidade da senha
  document.getElementById('togglePassword')?.addEventListener('click', () => {
    const inp  = document.getElementById('password');
    const btn  = document.getElementById('togglePassword');
    const show = inp.type === 'password';
    inp.type   = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
  });
});

// ─── Helper interno ──────────────────────────────────────────
function showLoginError(errEl, btn, msg) {
  btn.classList.remove('loading');
  btn.disabled = false;

  errEl.textContent    = msg;
  errEl.style.display  = 'block';

  ['username', 'password'].forEach(id =>
    document.getElementById(id)?.classList.add('input-error')
  );

  setTimeout(() => {
    errEl.style.display = 'none';
    ['username', 'password'].forEach(id =>
      document.getElementById(id)?.classList.remove('input-error')
    );
  }, 4000);
}