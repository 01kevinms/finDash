// ============================================================
// RELATORIOS.JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  initRelatorios();
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('mainContent')?.classList.toggle('expanded');
  });
});

function initRelatorios() {
  const now = new Date();
  const { start, end } = Utils.getMonthRange(now.getFullYear(), now.getMonth() + 1);
  const s = document.getElementById('relStart');
  const e = document.getElementById('relEnd');
  if (s) s.value = start;
  if (e) e.value = end;

  renderRelatorios();
  document.getElementById('btnGerarRelatorio')?.addEventListener('click', renderRelatorios);
  document.getElementById('btnExportar')?.addEventListener('click', exportarCSV);

  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setPeriod(btn.dataset.period);
      renderRelatorios();
    });
  });
}

function setPeriod(p) {
  const now = new Date();
  let start, end;
  if (p === 'mes') {
    ({ start, end } = Utils.getMonthRange(now.getFullYear(), now.getMonth() + 1));
  } else if (p === 'tri') {
    const m = now.getMonth() + 1;
    const startMonth = Math.max(m - 2, 1);
    start = `${now.getFullYear()}-${String(startMonth).padStart(2,'0')}-01`;
    end   = new Date(now.getFullYear(), m, 0).toISOString().split('T')[0];
  } else if (p === 'ano') {
    start = `${now.getFullYear()}-01-01`;
    end   = `${now.getFullYear()}-12-31`;
  } else {
    start = ''; end = '';
  }
  const sEl = document.getElementById('relStart');
  const eEl = document.getElementById('relEnd');
  if (sEl) sEl.value = start;
  if (eEl) eEl.value = end;
}

async function renderRelatorios() {
  const start = document.getElementById('relStart')?.value || '';
  const end   = document.getElementById('relEnd')?.value   || '';

  // Mostrar estado de carregamento
  ['relSaldo','relReceitas','relDespesas','relTxCount','relSavingsRate']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '…'; });

  try {
    const [allTxs, cats] = await Promise.all([
      Storage.getTransactions({ dateStart: start, dateEnd: end }),
      Storage.getCategories(),
    ]);

    const receitas = allTxs.filter(t => t.type === 'receita');
    const despesas = allTxs.filter(t => t.type === 'despesa');
    const totalR   = Utils.sumByType(allTxs, 'receita');
    const totalD   = Utils.sumByType(allTxs, 'despesa');
    const saldo    = totalR - totalD;
    const savings  = totalR > 0 ? ((saldo / totalR) * 100) : 0;

    // KPIs
    const relSaldo = document.getElementById('relSaldo');
    if (relSaldo) {
      relSaldo.textContent = Utils.formatCurrency(saldo);
      relSaldo.className = 'rel-kpi-value ' + (saldo >= 0 ? 'text-success' : 'text-danger');
    }
    document.getElementById('relReceitas').textContent    = Utils.formatCurrency(totalR);
    document.getElementById('relDespesas').textContent    = Utils.formatCurrency(totalD);
    document.getElementById('relTxCount').textContent     = allTxs.length;
    document.getElementById('relSavingsRate').textContent = `${Math.max(0, savings).toFixed(1)}%`;

    // Gráfico linha mensal
    const monthly = Utils.groupByMonth(allTxs);
    Charts.drawLine('chartRelLine',
      monthly.map(m => Utils.monthLabel(...m.month.split('-'))),
      [
        { label: 'Receitas', color: '#10b981', data: monthly.map(m => m.receita) },
        { label: 'Despesas', color: '#f43f5e', data: monthly.map(m => m.despesa) },
      ]
    );

    // Gráfico barras — despesas por categoria
    const byCatD = Utils.groupByCategory(despesas, cats).slice(0, 8);
    Charts.drawBar('chartRelBar',
      byCatD.map(c => Utils.truncate(c.name, 8)),
      [{ label: 'Despesas', color: '#f43f5e', data: byCatD.map(c => c.total) }],
      { legend: false }
    );

    // Donut — receitas por categoria
    const byCatR = Utils.groupByCategory(receitas, cats).slice(0, 7);
    Charts.drawDonut('chartRelDonut',
      byCatR.map(c => ({ label: c.name, value: c.total, color: c.color })),
      { centerLabel: Utils.formatCurrency(totalR).replace('R$\u00a0','R$'), centerSub: 'total receitas' }
    );

    // Gauge
    Charts.drawGauge('chartGauge', Math.max(0, savings), 100,
      savings >= 30 ? '#10b981' : savings >= 10 ? '#f59e0b' : '#f43f5e');

    // Tabelas
    renderMonthTable(allTxs);
    renderCatTable(byCatD, totalD);
  } catch (err) {
    console.error(err);
    ['relSaldo','relReceitas','relDespesas','relTxCount','relSavingsRate']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  }
}

function renderMonthTable(txs) {
  const monthly = Utils.groupByMonth(txs);
  const tbody = document.getElementById('tabelaMensal');
  if (!tbody) return;
  tbody.innerHTML = monthly.length ? [...monthly].reverse().map(m => {
    const saldo = m.receita - m.despesa;
    const [y, mo] = m.month.split('-');
    return `<tr>
      <td>${Utils.monthLabel(y, mo)}</td>
      <td class="text-success">${Utils.formatCurrency(m.receita)}</td>
      <td class="text-danger">${Utils.formatCurrency(m.despesa)}</td>
      <td class="${saldo >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(saldo)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4" class="empty-row">Sem dados no período.</td></tr>`;
}

function renderCatTable(byCat, total) {
  const tbody = document.getElementById('tabelaCategorias');
  if (!tbody) return;
  tbody.innerHTML = byCat.length ? byCat.map(c => {
    const pct = total > 0 ? ((c.total / total) * 100).toFixed(1) : '0.0';
    return `<tr>
      <td><span class="cat-dot" style="background:${c.color}"></span>${c.icon} ${Utils.escapeHtml(c.name)}</td>
      <td class="text-danger">${Utils.formatCurrency(c.total)}</td>
      <td>${pct}%</td>
      <td>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%;background:${c.color}"></div>
        </div>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="4" class="empty-row">Sem despesas no período.</td></tr>`;
}

async function exportarCSV() {
  const start = document.getElementById('relStart')?.value || '';
  const end   = document.getElementById('relEnd')?.value   || '';

  try {
    const [txs, cats] = await Promise.all([
      Storage.getTransactions({ dateStart: start, dateEnd: end }),
      Storage.getCategories(),
    ]);

    const header = ['ID','Descrição','Valor','Tipo','Categoria','Data','Status'];
    const rows = txs.map(t => {
      const cat = cats.find(c => c.id === t.category);
      return [t.id, `"${t.description}"`, t.value, t.type, cat?.name || '—', t.date, t.status];
    });

    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.showToast('CSV exportado com sucesso!');
  } catch { Utils.showToast('Erro ao exportar CSV.', 'error'); }
}
