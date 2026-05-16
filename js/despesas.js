// ============================================================
// DESPESAS.JS
// ============================================================

let editingDespesaId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  await initDespesas();
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('mainContent')?.classList.toggle('expanded');
  });
});

async function initDespesas() {
  await Promise.all([
    populateDespesaCatSelect('despesaCategoria', 'despesa'),
    populateDespesaCatFilterSelect(),
  ]);
  await renderDespesas();

  document.getElementById('btnNovaDespesa')?.addEventListener('click', () => openDespesaForm());
  document.getElementById('formDespesa')?.addEventListener('submit', saveDespesa);
  document.getElementById('btnCancelarDespesa')?.addEventListener('click', () => Utils.closeModal('modalDespesa'));
  document.getElementById('modalDespesa')?.addEventListener('click', e => {
    if (e.target.id === 'modalDespesa') Utils.closeModal('modalDespesa');
  });

  ['searchDespesa','filterDespesaDateStart','filterDespesaDateEnd'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', renderDespesas)
  );
  ['filterDespesaStatus','filterDespesaCat'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', renderDespesas)
  );
  document.getElementById('btnLimparFiltrosDespesa')?.addEventListener('click', clearDespesaFilters);
}

async function populateDespesaCatSelect(selectId, type) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const cats = await Storage.getCategories();
    sel.innerHTML = `<option value="">Selecione a categoria</option>` +
      cats.filter(c => c.type === type || c.type === 'ambos')
        .map(c => `<option value="${c.id}">${c.icon} ${Utils.escapeHtml(c.name)}</option>`).join('');
  } catch { sel.innerHTML = `<option value="">Erro ao carregar</option>`; }
}

async function populateDespesaCatFilterSelect() {
  const sel = document.getElementById('filterDespesaCat');
  if (!sel) return;
  try {
    const cats = await Storage.getCategories();
    sel.innerHTML = `<option value="">Todas as categorias</option>` +
      cats.filter(c => c.type === 'despesa' || c.type === 'ambos')
        .map(c => `<option value="${c.id}">${c.icon} ${Utils.escapeHtml(c.name)}</option>`).join('');
  } catch {}
}

async function openDespesaForm(id = null) {
  editingDespesaId = id;
  const form = document.getElementById('formDespesa');
  form.reset();
  document.getElementById('despesaData').value = Utils.today();
  document.getElementById('modalDespesaTitle').textContent = id ? 'Editar Despesa' : 'Nova Despesa';

  if (id) {
    try {
      const tx = await Storage.getTransactionById(id);
      document.getElementById('despesaDescricao').value = tx.description;
      document.getElementById('despesaValor').value = tx.value;
      document.getElementById('despesaCategoria').value = tx.category;
      document.getElementById('despesaData').value = Utils.formatDateInput(tx.date);
      document.getElementById('despesaStatus').value = tx.status;
    } catch { Utils.showToast('Erro ao carregar despesa.', 'error'); return; }
  }
  Utils.openModal('modalDespesa');
}

async function saveDespesa(e) {
  e.preventDefault();
  const data = {
    description: document.getElementById('despesaDescricao').value.trim(),
    value: parseFloat(document.getElementById('despesaValor').value),
    category: document.getElementById('despesaCategoria').value,
    date: document.getElementById('despesaData').value,
    status: document.getElementById('despesaStatus').value,
    type: 'despesa',
  };

  if (!data.description || !data.value || !data.category || !data.date) {
    Utils.showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  const btn = document.querySelector('#formDespesa button[type="submit"]');
  btn.disabled = true;
  try {
    if (editingDespesaId) {
      await Storage.updateTransaction(editingDespesaId, data);
      Utils.showToast('Despesa atualizada com sucesso!');
    } else {
      await Storage.addTransaction(data);
      Utils.showToast('Despesa cadastrada com sucesso!');
    }
    Utils.closeModal('modalDespesa');
    await renderDespesas();
  } catch { Utils.showToast('Erro ao salvar. Verifique o servidor.', 'error'); }
  finally { btn.disabled = false; }
}

async function deleteDespesa(id) {
  if (!confirm('Deseja excluir esta despesa?')) return;
  try {
    await Storage.deleteTransaction(id);
    Utils.showToast('Despesa excluída.', 'info');
    await renderDespesas();
  } catch { Utils.showToast('Erro ao excluir.', 'error'); }
}

function clearDespesaFilters() {
  ['searchDespesa','filterDespesaStatus','filterDespesaCat','filterDespesaDateStart','filterDespesaDateEnd']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderDespesas();
}

async function renderDespesas() {
  const params = {
    type: 'despesa',
    search:    document.getElementById('searchDespesa')?.value || '',
    status:    document.getElementById('filterDespesaStatus')?.value || '',
    category:  document.getElementById('filterDespesaCat')?.value || '',
    dateStart: document.getElementById('filterDespesaDateStart')?.value || '',
    dateEnd:   document.getElementById('filterDespesaDateEnd')?.value || '',
  };

  const tbody = document.getElementById('tabelaDespesas');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Carregando…</td></tr>`;

  try {
    const [txs, cats] = await Promise.all([
      Storage.getTransactions(params),
      Storage.getCategories(),
    ]);

    const total = txs.reduce((s, t) => s + Number(t.value), 0);
    const totalEl = document.getElementById('totalDespesas');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(total);
    const countEl = document.getElementById('countDespesas');
    if (countEl) countEl.textContent = `${txs.length} registro${txs.length !== 1 ? 's' : ''}`;

    if (!tbody) return;
    tbody.innerHTML = txs.length ? txs.map(t => {
      const cat = cats.find(c => c.id === t.category);
      return `<tr>
        <td class="td-desc"><span class="cat-dot" style="background:${cat?.color||'#f43f5e'}"></span>${Utils.escapeHtml(t.description)}</td>
        <td><span class="badge-cat">${cat?.icon||''} ${cat?.name||'—'}</span></td>
        <td class="td-amount text-danger">-${Utils.formatCurrency(t.value)}</td>
        <td>${Utils.formatDate(t.date)}</td>
        <td><span class="badge ${Utils.statusClass(t.status)}">${Utils.statusLabel(t.status)}</span></td>
        <td class="td-actions">
          <button class="btn-icon btn-edit" onclick="openDespesaForm('${t.id}')" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteDespesa('${t.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="empty-row">Nenhuma despesa encontrada.</td></tr>`;
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:var(--red)">⚠️ Erro ao conectar ao servidor.</td></tr>`;
  }
}
