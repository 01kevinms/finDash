// ============================================================
// UTILS.JS — Funções utilitárias compartilhadas
// ============================================================

const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  },

  formatDateInput(dateStr) {
    return dateStr ? dateStr.split('T')[0] : '';
  },

  today() {
    return new Date().toISOString().split('T')[0];
  },

  monthLabel(year, month) {
    return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  },

  getMonthRange(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end   = new Date(year, month, 0).toISOString().split('T')[0];
    return { start, end };
  },

  filterByDateRange(transactions, start, end) {
    return transactions.filter(t => {
      const d = t.date;
      return (!start || d >= start) && (!end || d <= end);
    });
  },

  sumByType(transactions, type) {
    return transactions
      .filter(t => t.type === type)
      .reduce((acc, t) => acc + Number(t.value), 0);
  },

  groupByCategory(transactions, categories) {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.category]) map[t.category] = 0;
      map[t.category] += Number(t.value);
    });
    return Object.entries(map).map(([catId, total]) => {
      const cat = categories.find(c => c.id === catId);
      return { catId, name: cat?.name || 'Outros', color: cat?.color || '#64748b', icon: cat?.icon || '📦', total };
    }).sort((a, b) => b.total - a.total);
  },

  groupByMonth(transactions) {
    const map = {};
    transactions.forEach(t => {
      const key = t.date?.slice(0, 7);
      if (!key) return;
      if (!map[key]) map[key] = { receita: 0, despesa: 0 };
      map[key][t.type] += Number(t.value);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  },

  truncate(str, len = 30) {
    return str?.length > len ? str.slice(0, len) + '…' : str;
  },

  statusLabel(status) {
    const map = { confirmado: 'Confirmado', pendente: 'Pendente', cancelado: 'Cancelado' };
    return map[status] || status;
  },

  statusClass(status) {
    const map = { confirmado: 'badge-success', pendente: 'badge-warning', cancelado: 'badge-danger' };
    return map[status] || 'badge-default';
  },

  showToast(msg, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('modal-open'); document.body.classList.add('modal-active'); }
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('modal-open'); document.body.classList.remove('modal-active'); }
  },

  setActivePage(page) {
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },
};
