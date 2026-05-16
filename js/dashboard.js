// ============================================================
// DASHBOARD.JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  await renderDashboard();
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('mainContent')?.classList.toggle('expanded');
  });
});

async function renderDashboard() {
  setLoadingState(true);
  try {
    const [txs, cats] = await Promise.all([
      Storage.getTransactions(),
      Storage.getCategories(),
    ]);

    const totalReceitas = Utils.sumByType(txs, 'receita');
    const totalDespesas = Utils.sumByType(txs, 'despesa');
    const saldo = totalReceitas - totalDespesas;

    // KPI Cards
    setEl('kpiSaldo', Utils.formatCurrency(saldo), saldo >= 0 ? 'positive' : 'negative');
    setEl('kpiReceitas', Utils.formatCurrency(totalReceitas));
    setEl('kpiDespesas', Utils.formatCurrency(totalDespesas));
    setEl('kpiTransacoes', txs.length + ' mov.');

    // Saúde financeira
    const healthPct = totalReceitas > 0 ? (saldo / totalReceitas) * 100 : 0;
    const healthEl = document.getElementById('healthScore');
    if (healthEl) {
      healthEl.textContent = `${Math.max(0, healthPct).toFixed(0)}%`;
      healthEl.className = healthPct >= 40 ? 'health-good' : healthPct >= 10 ? 'health-ok' : 'health-bad';
    }

    // Últimas movimentações
    const tbody = document.getElementById('lastTransactions');
    if (tbody) {
      const last = txs.slice(0, 8);
      tbody.innerHTML = last.length ? last.map(t => {
        const cat = cats.find(c => c.id === t.category);
        return `<tr>
          <td><span class="cat-dot" style="background:${cat?.color||'#64748b'}"></span>${Utils.escapeHtml(t.description)}</td>
          <td><span class="badge-cat">${cat?.icon||''} ${cat?.name||'—'}</span></td>
          <td><span class="amount ${t.type==='receita'?'text-success':'text-danger'}">${t.type==='receita'?'+':'-'}${Utils.formatCurrency(t.value)}</span></td>
          <td>${Utils.formatDate(t.date)}</td>
          <td><span class="badge ${Utils.statusClass(t.status)}">${Utils.statusLabel(t.status)}</span></td>
        </tr>`;
      }).join('') : `<tr><td colspan="5" class="empty-row">Nenhuma movimentação registrada.</td></tr>`;
    }

    renderDashboardCharts(txs, cats);
  } catch (err) {
    showServerError();
    console.error(err);
  } finally {
    setLoadingState(false);
  }
}

function renderDashboardCharts(txs, cats) {
  const monthly = Utils.groupByMonth(txs);
  const last6 = monthly.slice(-6);
  Charts.drawBar('chartMonthly',
    last6.map(m => Utils.monthLabel(...m.month.split('-'))),
    [
      { label: 'Receitas', color: '#10b981', data: last6.map(m => m.receita) },
      { label: 'Despesas', color: '#f43f5e', data: last6.map(m => m.despesa) },
    ]
  );

  const despesas = txs.filter(t => t.type === 'despesa');
  const byCat = Utils.groupByCategory(despesas, cats).slice(0, 7);
  Charts.drawDonut('chartCategories',
    byCat.map(c => ({ label: c.name, value: c.total, color: c.color })),
    { centerLabel: Utils.formatCurrency(byCat.reduce((s,c)=>s+c.total,0)).replace('R$\u00a0','R$'), centerSub: 'em despesas' }
  );

  const totalReceitas = Utils.sumByType(txs, 'receita');
  const totalDespesas = Utils.sumByType(txs, 'despesa');
  const healthPct = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
  Charts.drawGauge('chartGauge', Math.max(0, healthPct), 100,
    healthPct >= 40 ? '#10d98b' : healthPct >= 10 ? '#f59e0b' : '#f43f5e');
}

function setEl(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (cls) el.className = (el.className || '') + ' ' + cls;
}

function setLoadingState(on) {
  document.querySelectorAll('.kpi-value').forEach(el => {
    if (on) el.dataset.orig = el.textContent, el.textContent = '…';
  });
}

function showServerError() {
  const tbody = document.getElementById('lastTransactions');
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="empty-row" style="color:var(--red)">
    ⚠️ Não foi possível conectar ao json-server. Rode: <code>npx json-server --watch db.json --port 3001</code>
  </td></tr>`;
  ['kpiSaldo','kpiReceitas','kpiDespesas','kpiTransacoes'].forEach(id => setEl(id, '—'));
}
