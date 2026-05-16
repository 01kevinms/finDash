// ============================================================
// LAYOUT.JS — Sidebar e topbar injetados dinamicamente
// ============================================================

(function() {
  const pages = [
    { href: 'index.html',      icon: '⬡', label: 'Dashboard',  page: 'dashboard'  },
    { href: 'receitas.html',   icon: '↑', label: 'Receitas',   page: 'receitas'   },
    { href: 'despesas.html',   icon: '↓', label: 'Despesas',   page: 'despesas'   },
    { href: 'categorias.html', icon: '◈', label: 'Categorias', page: 'categorias' },
    { href: 'relatorios.html', icon: '◎', label: 'Relatórios', page: 'relatorios' },
  ];

  const currentPage = document.body.dataset.page || 'dashboard';
  const pageTitle   = pages.find(p => p.page === currentPage)?.label || 'Dashboard';

  // Pega o nome do usuário da sessão
  let userName = 'Admin';
  try {
    const u = JSON.parse(sessionStorage.getItem('fin_user'));
    if (u?.name) userName = u.name;
  } catch {}
  const userInitial = userName.charAt(0).toUpperCase();

  const navLinks = pages.map(p => `
    <a href="${p.href}" class="nav-link${p.page === currentPage ? ' active' : ''}" data-page="${p.page}">
      <span class="nav-icon">${p.icon}</span>
      <span class="nav-label">${p.label}</span>
    </a>
  `).join('');

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo-icon">💹</div>
        <div class="sidebar-logo-text">Fin<span>Dash</span></div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Menu</div>
        ${navLinks}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${userInitial}</div>
          <div>
            <div class="user-name">${userName}</div>
            <div class="user-role">Administrador</div>
          </div>
        </div>
      </div>
    </aside>`;

  const topbarHTML = `
    <header class="topbar">
      <button class="topbar-toggle" id="sidebarToggle" aria-label="Menu">☰</button>
      <div class="topbar-title">${pageTitle}</div>
      <div class="topbar-actions">
        <button class="btn-logout" id="logoutBtn">⎋ Sair</button>
      </div>
    </header>`;

  const layout = document.getElementById('appLayout');
  if (!layout) return;

  const mainContent = layout.querySelector('.main-content');
  if (mainContent) {
    layout.insertAdjacentHTML('afterbegin', sidebarHTML);
    mainContent.insertAdjacentHTML('afterbegin', topbarHTML);
  }
})();
