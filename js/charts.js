// ============================================================
// CHARTS.JS — Gráficos com Canvas API puro
// ============================================================

const Charts = {
  // ─── Bar Chart ───────────────────────────────────────────
  drawBar(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 20, bottom: 50, left: 60 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const allVals = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allVals, 1);
    const barGroups = labels.length;
    const barsPerGroup = datasets.length;
    const groupW = cw / barGroups;
    const barW = Math.min((groupW / barsPerGroup) * 0.75, 40);
    const gap = (groupW - barW * barsPerGroup) / 2;

    // Grid lines
    const steps = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= steps; i++) {
      const y = pad.top + ch - (i / steps) * ch;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Utils.formatCurrency((i / steps) * maxVal).replace('R$\u00a0', 'R$ '), pad.left - 8, y + 4);
    }

    // Bars
    datasets.forEach((ds, di) => {
      ds.data.forEach((val, gi) => {
        const x = pad.left + gi * groupW + gap + di * barW;
        const barH = (val / maxVal) * ch;
        const y = pad.top + ch - barH;

        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, ds.color + 'ff');
        grad.addColorStop(1, ds.color + '66');
        ctx.fillStyle = grad;

        const r = Math.min(4, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      });
    });

    // X labels
    labels.forEach((label, gi) => {
      const x = pad.left + gi * groupW + groupW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, H - pad.bottom + 18);
    });

    // Legend
    if (options.legend !== false) {
      let lx = pad.left;
      datasets.forEach(ds => {
        ctx.fillStyle = ds.color;
        ctx.fillRect(lx, H - 14, 12, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px DM Sans, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ds.label, lx + 16, H - 4);
        lx += ctx.measureText(ds.label).width + 36;
      });
    }
  },

  // ─── Donut Chart ─────────────────────────────────────────
  drawDonut(canvasId, segments, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (!segments.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados', W / 2, H / 2);
      return;
    }

    const total = segments.reduce((s, seg) => s + seg.value, 0);
    const cx = W / 2, cy = H / 2 - 10;
    const radius = Math.min(cx, cy) * 0.72;
    const hole = radius * 0.58;
    let angle = -Math.PI / 2;

    segments.forEach(seg => {
      const slice = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      angle += slice;
    });

    // Hole
    ctx.beginPath();
    ctx.arc(cx, cy, hole, 0, Math.PI * 2);
    ctx.fillStyle = options.bgColor || '#0f172a';
    ctx.fill();

    // Center text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold 16px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(options.centerLabel || `${segments.length}`, cx, cy + 6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px DM Sans, sans-serif';
    ctx.fillText(options.centerSub || 'categorias', cx, cy + 22);

    // Legend
    const legendY = cy + radius + 18;
    const colW = W / Math.min(segments.length, 3);
    segments.slice(0, 6).forEach((seg, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const lx = col * colW + 10;
      const ly = legendY + row * 20;
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.arc(lx + 5, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '10px DM Sans, sans-serif';
      ctx.textAlign = 'left';
      const pct = ((seg.value / total) * 100).toFixed(1);
      ctx.fillText(`${Utils.truncate(seg.label, 10)} ${pct}%`, lx + 14, ly + 4);
    });
  },

  // ─── Line Chart ──────────────────────────────────────────
  drawLine(canvasId, labels, datasets) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 20, bottom: 50, left: 60 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    ctx.clearRect(0, 0, W, H);

    const allVals = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allVals, 1);
    const steps = 5;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= steps; i++) {
      const y = pad.top + ch - (i / steps) * ch;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Utils.formatCurrency((i / steps) * maxVal).replace('R$\u00a0', ''), pad.left - 8, y + 4);
    }

    datasets.forEach(ds => {
      const points = ds.data.map((val, i) => ({
        x: pad.left + (i / (labels.length - 1 || 1)) * cw,
        y: pad.top + ch - (val / maxVal) * ch,
      }));

      // Area fill
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
      grad.addColorStop(0, ds.color + '33');
      grad.addColorStop(1, ds.color + '00');
      ctx.beginPath();
      ctx.moveTo(points[0].x, pad.top + ch);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, pad.top + ch);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Dots
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    labels.forEach((label, i) => {
      const x = pad.left + (i / (labels.length - 1 || 1)) * cw;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, H - pad.bottom + 18);
    });

    // Legend
    let lx = pad.left;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(lx, H - 14, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, lx + 16, H - 4);
      lx += ctx.measureText(ds.label).width + 36;
    });
  },

  // ─── KPI Gauge ───────────────────────────────────────────
  drawGauge(canvasId, value, max, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H * 0.6;
    const r = Math.min(cx, cy) * 0.85;
    const startA = Math.PI, endA = 2 * Math.PI;
    const pct = Math.min(value / (max || 1), 1);

    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, startA + pct * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold 18px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${(pct * 100).toFixed(0)}%`, cx, cy + 8);
  },
};
