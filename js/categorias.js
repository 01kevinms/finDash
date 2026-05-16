// ============================================================
// CATEGORIAS.JS
// ============================================================

let editingCatId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  await initCategorias();
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('mainContent')?.classList.toggle('expanded');
  });
});

const EMOJI_LIST = ['💼','💻','📈','🏠','🚗','🍔','🏥','🎉','📚','✈️','💰','🛒','💳','📱','🎮','🐾','👗','🏋️','🎵','☕','🧾','📦','🌿','💡','🎁'];
const COLOR_PALETTE = ['#10b981','#6366f1','#f59e0b','#ef4444','#f97316','#8b5cf6','#ec4899','#14b8a6','#0ea5e9','#64748b','#84cc16','#f43f5e'];

async function initCategorias() {
  await renderCategorias();
  renderEmojiPicker();
  renderColorPicker();

  document.getElementById('btnNovaCategoria')?.addEventListener('click', () => openCatForm());
  document.getElementById('formCategoria')?.addEventListener('submit', saveCategoria);
  document.getElementById('btnCancelarCategoria')?.addEventListener('click', () => Utils.closeModal('modalCategoria'));
  document.getElementById('modalCategoria')?.addEventListener('click', e => {
    if (e.target.id === 'modalCategoria') Utils.closeModal('modalCategoria');
  });
  document.getElementById('searchCategoria')?.addEventListener('input', renderCategorias);
  document.getElementById('filterCatTipo')?.addEventListener('change', renderCategorias);
}

function renderEmojiPicker() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  grid.innerHTML = EMOJI_LIST.map(em =>
    `<button type="button" class="emoji-btn" data-emoji="${em}" onclick="selectEmoji('${em}')">${em}</button>`
  ).join('');
}

function selectEmoji(em) {
  document.getElementById('catIcone').value = em;
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('selected', b.dataset.emoji === em));
  updateCatPreview();
}

function renderColorPicker() {
  const grid = document.getElementById('colorGrid');
  if (!grid) return;
  grid.innerHTML = COLOR_PALETTE.map(c =>
    `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}" onclick="selectColor('${c}')"></button>`
  ).join('');
  selectColor(COLOR_PALETTE[0]);
}

function selectColor(color) {
  document.getElementById('catCor').value = color;
  document.querySelectorAll('.color-swatch').forEach(b => b.classList.toggle('selected', b.dataset.color === color));
  updateCatPreview();
}

function updateCatPreview() {
  const icon  = document.getElementById('catIcone')?.value || '📦';
  const color = document.getElementById('catCor')?.value   || '#64748b';
  const name  = document.getElementById('catNome')?.value  || 'Categoria';
  const prev  = document.getElementById('catPreview');
  if (prev) {
    prev.innerHTML = `<span class="cat-preview-chip" style="background:${color}22;border-color:${color}40">
      <span style="color:${color}">${icon}</span> <span>${Utils.escapeHtml(name)}</span>
    </span>`;
  }
}

function openCatForm(id = null) {
  editingCatId = id;
  const form = document.getElementById('formCategoria');
  form.reset();
  document.getElementById('modalCatTitle').textContent = id ? 'Editar Categoria' : 'Nova Categoria';
  selectColor(COLOR_PALETTE[0]);
  selectEmoji(EMOJI_LIST[0]);

  if (id) {
    // Preenche com dados atuais (já disponíveis no grid — evita fetch extra)
    const card = document.querySelector(`.cat-card[data-id="${id}"]`);
    if (card) {
      document.getElementById('catNome').value  = card.dataset.name  || '';
      document.getElementById('catTipo').value  = card.dataset.type  || '';
      selectColor(card.dataset.color || COLOR_PALETTE[0]);
      selectEmoji(card.dataset.icon  || EMOJI_LIST[0]);
    }
  }
  updateCatPreview();
  Utils.openModal('modalCategoria');
}

async function saveCategoria(e) {
  e.preventDefault();
  const data = {
    name:  document.getElementById('catNome').value.trim(),
    type:  document.getElementById('catTipo').value,
    icon:  document.getElementById('catIcone').value || '📦',
    color: document.getElementById('catCor').value   || '#64748b',
  };

  if (!data.name || !data.type) {
    Utils.showToast('Preencha nome e tipo da categoria.', 'error');
    return;
  }

  const btn = document.querySelector('#formCategoria button[type="submit"]');
  btn.disabled = true;
  try {
    if (editingCatId) {
      await Storage.updateCategory(editingCatId, data);
      Utils.showToast('Categoria atualizada!');
    } else {
      await Storage.addCategory(data);
      Utils.showToast('Categoria criada!');
    }
    Utils.closeModal('modalCategoria');
    await renderCategorias();
  } catch { Utils.showToast('Erro ao salvar. Verifique o servidor.', 'error'); }
  finally { btn.disabled = false; }
}

async function deleteCategoria(id) {
  try {
    const txs = await Storage.getTransactions({ category: id });
    if (txs.length > 0) {
      Utils.showToast(`Não é possível excluir: ${txs.length} movimentação(ões) usam esta categoria.`, 'error');
      return;
    }
    if (!confirm('Deseja excluir esta categoria?')) return;
    await Storage.deleteCategory(id);
    Utils.showToast('Categoria excluída.', 'info');
    await renderCategorias();
  } catch { Utils.showToast('Erro ao excluir.', 'error'); }
}

async function renderCategorias() {
  const search = document.getElementById('searchCategoria')?.value.toLowerCase() || '';
  const tipo   = document.getElementById('filterCatTipo')?.value || '';
  const grid   = document.getElementById('categoriasGrid');
  if (grid) grid.innerHTML = `<div class="empty-state">Carregando…</div>`;

  try {
    const [cats, allTxs] = await Promise.all([
      Storage.getCategories(),
      Storage.getTransactions(),
    ]);

    let filtered = cats;
    if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search));
    if (tipo)   filtered = filtered.filter(c => c.type === tipo || c.type === 'ambos');

    if (!grid) return;
    const typeLabels = { receita: 'Receita', despesa: 'Despesa', ambos: 'Ambos' };

    grid.innerHTML = filtered.length ? filtered.map(c => {
      const usageCount = allTxs.filter(t => t.category === c.id).length;
      return `<div class="cat-card" style="--cat-color:${c.color}"
                   data-id="${c.id}" data-name="${Utils.escapeHtml(c.name)}"
                   data-type="${c.type}" data-color="${c.color}" data-icon="${c.icon}">
        <div class="cat-card-header">
          <span class="cat-icon-big">${c.icon}</span>
          <div class="cat-actions">
            <button class="btn-icon btn-edit"   onclick="openCatForm('${c.id}')"   title="Editar">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteCategoria('${c.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
        <div class="cat-card-name">${Utils.escapeHtml(c.name)}</div>
        <div class="cat-card-meta">
          <span class="badge badge-type-${c.type}">${typeLabels[c.type] || c.type}</span>
          <span class="cat-usage">${usageCount} uso${usageCount !== 1 ? 's' : ''}</span>
        </div>
      </div>`;
    }).join('') : `<div class="empty-state">Nenhuma categoria encontrada.</div>`;
  } catch {
    if (grid) grid.innerHTML = `<div class="empty-state" style="color:var(--red)">⚠️ Erro ao conectar ao servidor.</div>`;
  }
}
