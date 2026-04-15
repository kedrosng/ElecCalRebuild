// ============================================================================
// modules/cable-sizing.js
// Main feature. Editable loading table with live upstream/downstream cascade.
// ============================================================================
import { t } from '../i18n.js';
import {
  getCurrent, updateCurrent, uid, getSettings, ensureCurrent
} from '../store.js';
import { CABLE_TABLE } from '../cable-data.js';
import {
  cascade, findSmallestCable, checkVDCompliance, checkLoading, round
} from '../formulas.js';
import { escapeHtml } from '../app.js';
import { exportCablesXLSX, exportCablesPDF } from '../export.js';

const PHASES = [
  { v: '3', label: 'phases.3' },
  { v: '1', label: 'phases.1' }
];

export function renderCable(host) {
  const proj = ensureCurrent();
  host.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <h2 class="text-xl font-semibold mr-auto">${t('cable.title')}</h2>
      <button class="btn btn-secondary" id="btn-import-loading">${t('cable.importFromLoading')}</button>
      <button class="btn btn-secondary" id="btn-xlsx">⬇ Excel</button>
      <button class="btn btn-secondary" id="btn-pdf">⬇ PDF</button>
      <button class="btn btn-primary" id="btn-add">${t('cable.addBtn')}</button>
    </div>

    <div class="card overflow-auto">
      <table class="tbl" id="cable-table">
        <thead>
          <tr>
            <th>#</th>
            <th>${t('cable.name')}</th>
            <th>${t('cable.current')}</th>
            <th>${t('cable.length')}</th>
            <th>${t('cable.phase')}</th>
            <th>${t('cable.upstream')}</th>
            <th>${t('cable.size')}</th>
            <th class="num">${t('cable.It')}</th>
            <th class="num">${t('cable.loading')}</th>
            <th class="num">${t('cable.ownVD')}</th>
            <th class="num">${t('cable.totalVD')}</th>
            <th class="num">${t('cable.copperLoss')}</th>
            <th class="num">${t('cable.totalLoss')}</th>
            <th>${t('common.notes')}</th>
            <th>${t('cable.actions')}</th>
          </tr>
        </thead>
        <tbody id="cable-body"></tbody>
      </table>
    </div>

    <div class="mt-4 grid md:grid-cols-3 gap-3" id="kpi"></div>

    <div class="mt-6 card p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">${t('cable.summary')}</h3>
      </div>
      <div id="summary" class="text-sm"></div>
    </div>
  `;

  document.getElementById('btn-add').onclick = () => addRow();
  document.getElementById('btn-import-loading').onclick = importFromLoading;
  document.getElementById('btn-xlsx').onclick = () => exportCablesXLSX(getCurrent());
  document.getElementById('btn-pdf').onclick  = () => exportCablesPDF(getCurrent());

  refresh();

  if (!proj.cables.length) {
    document.getElementById('cable-body').innerHTML = `<tr><td colspan="15" class="text-center text-slate-500 py-10">${t('cable.emptyHint')}</td></tr>`;
  }
}

function addRow(seed = {}) {
  updateCurrent(p => {
    p.cables.push({
      id: uid(),
      name: seed.name || `Loading ${p.cables.length + 1}`,
      current: seed.current ?? '',
      length: seed.length ?? '',
      phase: seed.phase || '3',
      size: seed.size ?? '',
      upstreamId: seed.upstreamId ?? '',
      isLighting: !!seed.isLighting,
      notes: seed.notes || ''
    });
  });
  refresh();
}

function removeRow(id) {
  updateCurrent(p => {
    p.cables = p.cables.filter(c => c.id !== id);
    // clean up references
    p.cables.forEach(c => { if (c.upstreamId === id) c.upstreamId = ''; });
  });
  refresh();
}

function duplicateRow(id) {
  updateCurrent(p => {
    const src = p.cables.find(c => c.id === id);
    if (!src) return;
    const copy = { ...src, id: uid(), name: src.name + ' (copy)' };
    const idx = p.cables.findIndex(c => c.id === id);
    p.cables.splice(idx + 1, 0, copy);
  });
  refresh();
}

function importFromLoading() {
  const proj = getCurrent();
  const items = proj.loading?.items || [];
  if (!items.length) {
    alert('No loading-estimation items found. Add some in the Loading Estimation module first.');
    return;
  }
  updateCurrent(p => {
    const groups = {};
    for (const it of items) {
      const cat = it.category || 'misc';
      if (!groups[cat]) groups[cat] = { connectedKW: 0, pfSum: 0 };
      const w = (it.area && it.wpm2) ? (+it.area * +it.wpm2) : ((+it.qty || 1) * (+it.watt || 0));
      groups[cat].connectedKW += w / 1000;
    }
    for (const [cat, g] of Object.entries(groups)) {
      const kW = g.connectedKW;
      const I = (kW * 1000) / (Math.sqrt(3) * 380 * 0.85); // rough Ib at PF 0.85 3-phase
      p.cables.push({
        id: uid(),
        name: `DB-${cat}`,
        current: round(I, 1),
        length: 30,
        phase: '3',
        size: '',
        upstreamId: '',
        isLighting: cat === 'lighting',
        notes: `Imported from Loading Estimation (${cat})`
      });
    }
  });
  refresh();
}

function captureFocus() {
  const el = document.activeElement;
  if (!el || !el.dataset || !el.dataset.f) return null;
  const tr = el.closest('tr[data-id]');
  return { id: tr?.dataset.id, f: el.dataset.f, start: el.selectionStart, end: el.selectionEnd };
}
function restoreFocus(snap) {
  if (!snap) return;
  const tr = document.querySelector(`tr[data-id="${snap.id}"]`);
  const el = tr?.querySelector(`[data-f="${snap.f}"]`);
  if (!el) return;
  el.focus();
  if (snap.start != null && el.setSelectionRange) {
    try { el.setSelectionRange(snap.start, snap.end); } catch {}
  }
}

function refresh() {
  const snap = captureFocus();
  const proj = getCurrent();
  // Apply calculations
  cascade(proj.cables);
  // Auto-suggest sizes where size missing
  for (const c of proj.cables) {
    if ((!c.size || c.size === '') && c.current && c.length) {
      const s = findSmallestCable(+c.current, c.phase || '3');
      if (s) c._suggested = s.size;
    }
  }
  updateCurrent(p => { p.cables = proj.cables; }); // persist calc results

  const body = document.getElementById('cable-body');
  if (!body) return;
  body.innerHTML = proj.cables.map((c, i) => rowHtml(c, i, proj.cables)).join('') ||
    `<tr><td colspan="15" class="text-center text-slate-500 py-10">${t('cable.emptyHint')}</td></tr>`;
  wireRow(body);
  renderKPIs(proj);
  renderSummary(proj);
  restoreFocus(snap);
}

function rowHtml(c, i, all) {
  const vdStatus = c.totalVDpct != null
    ? checkVDCompliance(c.totalVDpct, c.isLighting) : null;
  const loadStatus = c.loading
    ? checkLoading(c.loading) : null;

  const upstreamOptions = [
    `<option value="">${escapeHtml(t('common.none'))}</option>`,
    ...all.filter(x => x.id !== c.id)
          .map(x => `<option value="${x.id}" ${x.id===c.upstreamId?'selected':''}>${escapeHtml(x.name)}</option>`)
  ].join('');

  const sizeOptions = [
    `<option value="">${c._suggested ? 'auto (' + c._suggested + ')' : t('cable.auto')}</option>`,
    ...CABLE_TABLE.map(s => `<option value="${s.size}" ${+c.size===s.size?'selected':''}>${s.size}</option>`)
  ].join('');

  const phaseOptions = PHASES
    .map(p => `<option value="${p.v}" ${c.phase===p.v?'selected':''}>${t(p.label)}</option>`).join('');

  const vdBadge = vdStatus
    ? `<span class="badge badge-${vdStatus.status==='ok'?'ok':vdStatus.status==='warn'?'warn':'err'}" data-tip="${escapeHtml(vdStatus.message)}">${(c.totalVDpct ?? 0).toFixed(2)}%</span>`
    : '—';

  const loadBadge = loadStatus
    ? `<span class="badge badge-${loadStatus.status==='ok'?'ok':loadStatus.status==='warn'?'warn':'err'}" data-tip="${escapeHtml(loadStatus.message)}">${(c.loading ?? 0).toFixed(0)}%</span>`
    : '—';

  return `<tr data-id="${c.id}">
    <td class="text-slate-400">${i+1}</td>
    <td><input class="input" data-f="name" value="${escapeHtml(c.name)}"/></td>
    <td><input class="input num" data-f="current" type="number" step="0.1" value="${c.current}"/></td>
    <td><input class="input num" data-f="length"  type="number" step="0.1" value="${c.length}"/></td>
    <td><select class="select" data-f="phase">${phaseOptions}</select></td>
    <td><select class="select" data-f="upstreamId">${upstreamOptions}</select></td>
    <td><select class="select" data-f="size">${sizeOptions}</select></td>
    <td class="num">${c.It ? c.It.toFixed(0) : '—'}</td>
    <td class="num">${loadBadge}</td>
    <td class="num">${c.ownVDpct ? c.ownVDpct.toFixed(2)+'%' : '—'}</td>
    <td class="num">${vdBadge}</td>
    <td class="num">${c.ownCopperLossW ? c.ownCopperLossW.toFixed(1) : '—'}</td>
    <td class="num">${c.totalCopperLossW ? c.totalCopperLossW.toFixed(1) : '—'}</td>
    <td><input class="input" data-f="notes" value="${escapeHtml(c.notes||'')}" placeholder="${escapeHtml(c.isLighting?'lighting':'')}"/></td>
    <td>
      <div class="flex gap-1">
        <button class="btn btn-ghost btn-sm" data-act="dup" title="${t('common.duplicate')}">⎘</button>
        <button class="btn btn-ghost btn-sm" data-act="del" title="${t('common.delete')}">✕</button>
      </div>
    </td>
  </tr>`;
}

function wireRow(body) {
  body.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelectorAll('[data-f]').forEach(input => {
      input.addEventListener('input', () => {
        const f = input.dataset.f;
        let v = input.value;
        if (['current','length'].includes(f)) v = v === '' ? '' : +v;
        if (f === 'size') v = v === '' ? '' : +v;
        updateCurrent(p => {
          const row = p.cables.find(c => c.id === id);
          if (row) row[f] = v;
        });
        refresh();
        tr.classList.remove('pulse-row'); void tr.offsetWidth; tr.classList.add('pulse-row');
      });
    });
    tr.querySelector('[data-act="del"]').onclick = () => removeRow(id);
    tr.querySelector('[data-act="dup"]').onclick = () => duplicateRow(id);
  });
}

function renderKPIs(proj) {
  const totalLoss = proj.cables.reduce((s,c) => s + (c.ownCopperLossW||0), 0);
  const worstVD = proj.cables.reduce((m,c) => Math.max(m, c.totalVDpct||0), 0);
  const fail = proj.cables.some(c => (c.totalVDpct||0) > (c.isLighting?3:5)) ||
               proj.cables.some(c => (c.loading||0) > 100);
  const el = document.getElementById('kpi');
  const status = fail ? 'err' : worstVD > 4 ? 'warn' : 'ok';
  el.innerHTML = `
    <div class="card p-4">
      <div class="text-xs text-slate-500 uppercase tracking-wider">Total cables</div>
      <div class="text-2xl font-semibold mt-1">${proj.cables.length}</div>
    </div>
    <div class="card p-4">
      <div class="text-xs text-slate-500 uppercase tracking-wider">Worst VD path</div>
      <div class="text-2xl font-semibold mt-1">${worstVD.toFixed(2)}%</div>
      <div class="text-xs mt-1"><span class="badge badge-${status}">${status==='ok'?'Within CoP limit':status==='warn'?'Near limit':'Exceeds limit'}</span></div>
    </div>
    <div class="card p-4">
      <div class="text-xs text-slate-500 uppercase tracking-wider">Σ Copper loss (own)</div>
      <div class="text-2xl font-semibold mt-1">${totalLoss.toFixed(1)} W</div>
    </div>
  `;
}

function renderSummary(proj) {
  const host = document.getElementById('summary');
  if (!host) return;
  if (!proj.cables.length) { host.innerHTML = `<div class="text-slate-500">${t('cable.emptyHint')}</div>`; return; }
  const rows = proj.cables.map((c,i) => `
    <tr>
      <td>${i+1}</td>
      <td class="font-medium">${escapeHtml(c.name)}</td>
      <td>${c.phase==='1'?'1P':'3P'} · ${c.current||'—'}A · ${c.length||'—'}m</td>
      <td>${c.size?c.size+' mm²':'—'}</td>
      <td class="num">${(c.totalVDpct||0).toFixed(2)}%</td>
      <td class="num">${(c.totalCopperLossW||0).toFixed(1)} W</td>
    </tr>
  `).join('');
  host.innerHTML = `
    <table class="tbl">
      <thead><tr><th>#</th><th>${t('common.name')}</th><th>Spec</th><th>${t('cable.size')}</th><th class="num">Σ VD</th><th class="num">Σ I²R</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
