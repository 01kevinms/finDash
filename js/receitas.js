// ============================================================
// RECEITAS.JS
// ============================================================

let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  await initReceitas();
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('mainContent')?.classList.toggle('expanded');
  });
});

async function initReceitas() {
  await populateCatSelect('receitaCategoria', 'receita');
  await renderReceitas();

  document.getElementById('btnNovaReceita')?.addEventListener('click', () => openForm());
  document.getElementById('formReceita')?.addEventListener('submit', saveReceita);
  document.getElementById('btnCancelarReceita')?.addEventListener('click', () => Utils.closeModal('modalReceita'));
  document.getElementById('modalReceita')?.addEventListener('click', e => {
    if (e.target.id === 'modalReceita') Utils.closeModal('modalReceita');
  });

  ['searchReceita','filterStatus','filterDateStart','filterDateEnd'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', renderReceitas)
  );
  document.getElementById('filterStatus')?.addEventListener('change', renderReceitas);
  document.getElementById('btnLimparFiltros')?.addEventListener('click', clearFilters);
}

async function populateCatSelect(selectId, type) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const cats = await Storage.getCategories();
    const filtered = cats.filter(c => c.type === type || c.type === 'ambos');
    sel.innerHTML = `<option value="">Selecione a categoria</option>` +
      filtered.map(c => `<option value="${c.id}">${c.icon} ${Utils.escapeHtml(c.name)}</option>`).join('');
  } catch { sel.innerHTML = `<option value="">Erro ao carregar</option>`; }
}

async function openForm(id = null) {
  editingId = id;
  const form = document.getElementById('formReceita');
  form.reset();
  document.getElementById('receitaData').value = Utils.today();

  if (id) {
    document.getElementById('modalTitle').textContent = 'Editar Receita';
    try {
      const tx = await Storage.getTransactionById(id);
      document.getElementById('receitaDescricao').value = tx.description;
      document.getElementById('receitaValor').value = tx.value;
      document.getElementById('receitaCategoria').value = tx.category;
      document.getElementById('receitaData').value = Utils.formatDateInput(tx.date);
      document.getElementById('receitaStatus').value = tx.status;
    } catch { Utils.showToast('Erro ao carregar receita.', 'error'); return; }
  } else {
    document.getElementById('modalTitle').textContent = 'Nova Receita';
  }
  Utils.openModal('modalReceita');
}

async function saveReceita(e) {
  e.preventDefault();
  const data = {
    description: document.getElementById('receitaDescricao').value.trim(),
    value: parseFloat(document.getElementById('receitaValor').value),
    category: document.getElementById('receitaCategoria').value,
    date: document.getElementById('receitaData').value,
    status: document.getElementById('receitaStatus').value,
    type: 'receita',
  };

  if (!data.description || !data.value || !data.category || !data.date) {
    Utils.showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  const btn = document.querySelector('#formReceita button[type="submit"]');
  btn.disabled = true;
  try {
    if (editingId) {
      await Storage.updateTransaction(editingId, data);
      Utils.showToast('Receita atualizada com sucesso!');
    } else {
      await Storage.addTransaction(data);
      Utils.showToast('Receita cadastrada com sucesso!');
    }
    Utils.closeModal('modalReceita');
    await renderReceitas();
  } catch { Utils.showToast('Erro ao salvar. Verifique o servidor.', 'error'); }
  finally { btn.disabled = false; }
}

async function deleteReceita(id) {
  if (!confirm('Deseja excluir esta receita?')) return;
  try {
    await Storage.deleteTransaction(id);
    Utils.showToast('Receita excluída.', 'info');
    await renderReceitas();
  } catch { Utils.showToast('Erro ao excluir.', 'error'); }
}

function clearFilters() {
  ['searchReceita','filterStatus','filterDateStart','filterDateEnd']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderReceitas();
}

async function renderReceitas() {
  const params = {
    type: 'receita',
    search:    document.getElementById('searchReceita')?.value || '',
    status:    document.getElementById('filterStatus')?.value || '',
    dateStart: document.getElementById('filterDateStart')?.value || '',
    dateEnd:   document.getElementById('filterDateEnd')?.value || '',
  };

  const tbody = document.getElementById('tabelaReceitas');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Carregando…</td></tr>`;

  try {
    const [txs, cats] = await Promise.all([
      Storage.getTransactions(params),
      Storage.getCategories(),
    ]);

    const total = Utils.sumByType(txs, 'receita');
    const totalEl = document.getElementById('totalReceitas');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(total);
    const countEl = document.getElementById('countReceitas');
    if (countEl) countEl.textContent = `${txs.length} registro${txs.length !== 1 ? 's' : ''}`;

    if (!tbody) return;
    tbody.innerHTML = txs.length ? txs.map(t => {
      const cat = cats.find(c => c.id === t.category);
      return `<tr>
        <td class="td-desc"><span class="cat-dot" style="background:${cat?.color||'#10b981'}"></span>${Utils.escapeHtml(t.description)}</td>
        <td><span class="badge-cat">${cat?.icon||''} ${cat?.name||'—'}</span></td>
        <td class="td-amount text-success">+${Utils.formatCurrency(t.value)}</td>
        <td>${Utils.formatDate(t.date)}</td>
        <td><span class="badge ${Utils.statusClass(t.status)}">${Utils.statusLabel(t.status)}</span></td>
        <td class="td-actions">
          <button class="btn-icon btn-edit" onclick="openForm('${t.id}')" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteReceita('${t.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="empty-row">Nenhuma receita encontrada.</td></tr>`;
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:var(--red)">⚠️ Erro ao conectar ao servidor.</td></tr>`;
  }
}
