// ============================================================
// STORAGE.JS — Camada de dados com fallback automático
//
// MODO API  → usa api.php (requer servidor PHP)
// MODO LOCAL → usa localStorage (Live Server / abertura direta)
//
// O modo é detectado automaticamente na primeira chamada:
// se o fetch do api.php retornar o código-fonte PHP (não JSON),
// o Storage assume modo local e usa localStorage para tudo.
// ============================================================

const Storage = (() => {

  // ── Dados seed para localStorage ──────────────────────────
  const SEED = {
    users: [
      { id: 'usr001', username: 'admin', password: 'admin',
        name: 'Administrador', role: 'admin', createdAt: '2025-01-01T00:00:00.000Z' }
    ],
    categories: [
      { id: 'cat001', name: 'Salário',             type: 'receita', color: '#10b981', icon: '💼', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat002', name: 'Freelance',            type: 'receita', color: '#6366f1', icon: '💻', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat003', name: 'Investimentos',        type: 'receita', color: '#f59e0b', icon: '📈', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat004', name: 'Aluguéis Recebidos',   type: 'receita', color: '#06b6d4', icon: '🏢', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat006', name: 'Alimentação',          type: 'despesa', color: '#f97316', icon: '🍔', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat007', name: 'Transporte',           type: 'despesa', color: '#8b5cf6', icon: '🚗', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat008', name: 'Moradia',              type: 'despesa', color: '#ef4444', icon: '🏠', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat009', name: 'Saúde',                type: 'despesa', color: '#ec4899', icon: '🏥', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'cat005', name: 'Outros',               type: 'ambos',   color: '#64748b', icon: '📦', createdAt: '2025-01-01T00:00:00.000Z' },
    ],
    transactions: [
      { id: 'tx001', description: 'Salário Janeiro',       value: 5800,   category: 'cat001', type: 'receita', date: '2025-01-05', status: 'confirmado', createdAt: '2025-01-05T08:00:00.000Z' },
      { id: 'tx002', description: 'Aluguel Janeiro',       value: 1500,   category: 'cat008', type: 'despesa', date: '2025-01-05', status: 'confirmado', createdAt: '2025-01-05T09:00:00.000Z' },
      { id: 'tx003', description: 'Supermercado Semana 1', value: 320.5,  category: 'cat006', type: 'despesa', date: '2025-01-07', status: 'confirmado', createdAt: '2025-01-07T10:00:00.000Z' },
      { id: 'tx004', description: 'Conta de Luz',          value: 145.8,  category: 'cat008', type: 'despesa', date: '2025-01-10', status: 'confirmado', createdAt: '2025-01-10T10:00:00.000Z' },
      { id: 'tx005', description: 'Internet Fibra',        value: 120,    category: 'cat008', type: 'despesa', date: '2025-01-10', status: 'confirmado', createdAt: '2025-01-10T11:00:00.000Z' },
    ],
    settings: {
      currency: 'BRL', locale: 'pt-BR', theme: 'dark',
      monthStart: 1, version: '1.0.0',
    },
  };

  // ── Estado do modo ─────────────────────────────────────────
  // null = não testado ainda | true = PHP ok | false = local
  let _apiMode = null;

  // ── Detecta se o PHP está executando ──────────────────────
  async function _detectMode() {
    if (_apiMode !== null) return _apiMode;
    try {
      const res  = await fetch('api.php?action=listar_settings');
      const text = await res.text();
      // Se a resposta começar com '<' é HTML/PHP bruto — sem PHP rodando
      if (text.trimStart().startsWith('<') || !res.ok) {
        _apiMode = false;
      } else {
        JSON.parse(text); // valida que é JSON de fato
        _apiMode = true;
      }
    } catch {
      _apiMode = false;
    }
    if (!_apiMode) {
      console.warn('[Storage] PHP indisponível → modo localStorage ativo.');
      _seedLocalStorage();
    } else {
      console.info('[Storage] Modo API (PHP) ativo.');
    }
    return _apiMode;
  }

  // ── Seed do localStorage ───────────────────────────────────
  function _seedLocalStorage() {
    if (!localStorage.getItem('fin_categories'))
      localStorage.setItem('fin_categories', JSON.stringify(SEED.categories));
    if (!localStorage.getItem('fin_transactions'))
      localStorage.setItem('fin_transactions', JSON.stringify(SEED.transactions));
    if (!localStorage.getItem('fin_settings'))
      localStorage.setItem('fin_settings', JSON.stringify(SEED.settings));
  }

  // ── Helpers localStorage ───────────────────────────────────
  function _lsRead(key) {
    try { return JSON.parse(localStorage.getItem('fin_' + key)) || []; }
    catch { return []; }
  }
  function _lsWrite(key, data) {
    localStorage.setItem('fin_' + key, JSON.stringify(data));
  }
  function _nextId(prefix, list) {
    const nums = list.map(i => parseInt((i.id || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return prefix + String(next).padStart(3, '0');
  }

  // ── Helpers API ────────────────────────────────────────────
  async function _apiGet(action) {
    const res = await fetch(`api.php?action=${action}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  async function _apiPostId(action, id) {
    const form = new FormData();
    form.append('id', String(id));
    const res = await fetch(`api.php?action=${action}`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  async function _apiPostDados(action, dados) {
    const form = new FormData();
    form.append('dados', JSON.stringify(dados));
    const res = await fetch(`api.php?action=${action}`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  async function _apiPostIdDados(action, id, dados) {
    const form = new FormData();
    form.append('id', String(id));
    form.append('dados', JSON.stringify(dados));
    const res = await fetch(`api.php?action=${action}`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ══════════════════════════════════════════════════════════
  // API PÚBLICA
  // ══════════════════════════════════════════════════════════

  // ── Categories ────────────────────────────────────────────

  async function getCategories() {
    if (await _detectMode()) return _apiGet('listar_categories');
    return _lsRead('categories');
  }

  async function getCategoryById(id) {
    if (await _detectMode()) return _apiPostId('buscar_categoria', id);
    return _lsRead('categories').find(c => c.id === id) || null;
  }

  async function addCategory(data) {
    const item = { ...data, createdAt: new Date().toISOString() };
    if (await _detectMode()) return _apiPostDados('criar_categoria', item);
    const list = _lsRead('categories');
    item.id = _nextId('cat', list);
    _lsWrite('categories', [...list, item]);
    return item;
  }

  async function updateCategory(id, data) {
    if (await _detectMode()) return _apiPostIdDados('atualizar_categoria', id, data);
    const list = _lsRead('categories').map(c => c.id === id ? { ...c, ...data, id } : c);
    _lsWrite('categories', list);
    return list.find(c => c.id === id);
  }

  async function deleteCategory(id) {
    if (await _detectMode()) return _apiPostId('deletar_categoria', id);
    _lsWrite('categories', _lsRead('categories').filter(c => c.id !== id));
    return { deletado: true, id };
  }

  // ── Transactions ──────────────────────────────────────────

  async function getTransactions(params = {}) {
    let txs;
    if (await _detectMode()) {
      txs = await _apiGet('listar_transactions');
    } else {
      txs = _lsRead('transactions');
    }

    if (params.type)      txs = txs.filter(t => t.type === params.type);
    if (params.status)    txs = txs.filter(t => t.status === params.status);
    if (params.category)  txs = txs.filter(t => t.category === params.category);
    if (params.dateStart) txs = txs.filter(t => t.date >= params.dateStart);
    if (params.dateEnd)   txs = txs.filter(t => t.date <= params.dateEnd);
    if (params.search) {
      const q = params.search.toLowerCase();
      txs = txs.filter(t => t.description.toLowerCase().includes(q));
    }
    txs.sort((a, b) => (a.date < b.date ? 1 : -1));
    return txs;
  }

  async function getTransactionById(id) {
    if (await _detectMode()) return _apiPostId('buscar_transaction', id);
    return _lsRead('transactions').find(t => t.id === id) || null;
  }

  async function addTransaction(data) {
    const item = { ...data, createdAt: new Date().toISOString() };
    if (await _detectMode()) return _apiPostDados('criar_transaction', item);
    const list = _lsRead('transactions');
    item.id = _nextId('tx', list);
    _lsWrite('transactions', [item, ...list]);
    return item;
  }

  async function updateTransaction(id, data) {
    if (await _detectMode()) return _apiPostIdDados('atualizar_transaction', id, data);
    const list = _lsRead('transactions').map(t => t.id === id ? { ...t, ...data, id } : t);
    _lsWrite('transactions', list);
    return list.find(t => t.id === id);
  }

  async function deleteTransaction(id) {
    if (await _detectMode()) return _apiPostId('deletar_transaction', id);
    _lsWrite('transactions', _lsRead('transactions').filter(t => t.id !== id));
    return { deletado: true, id };
  }

  // ── Settings ──────────────────────────────────────────────

  async function getSettings() {
    if (await _detectMode()) return _apiGet('listar_settings');
    return _lsRead('settings');
  }

  async function updateSettings(data) {
    if (await _detectMode()) return _apiPostDados('atualizar_settings', data);
    const current = _lsRead('settings');
    const merged  = Array.isArray(current) ? { ...data } : { ...current, ...data };
    _lsWrite('settings', merged);
    return merged;
  }

  // ── Auth ──────────────────────────────────────────────────

  async function findUser(username, password) {
    let users;
    if (await _detectMode()) {
      try { users = await _apiGet('listar_users'); }
      catch { users = SEED.users; }
    } else {
      users = SEED.users;
    }
    return users.find(u => u.username === username && u.password === password) || null;
  }

  // ── Exporta ───────────────────────────────────────────────
  return {
    getCategories, getCategoryById, addCategory, updateCategory, deleteCategory,
    getTransactions, getTransactionById, addTransaction, updateTransaction, deleteTransaction,
    getSettings, updateSettings,
    findUser,
  };

})();