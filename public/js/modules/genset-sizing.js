// ============================================================================
// modules/genset-sizing.js
// ============================================================================
import { t } from '../i18n.js';
import { getCurrent, updateCurrent, uid, ensureCurrent } from '../store.js';
import { sizeGenset } from '../formulas.js';
import { MOTOR_START } from '../cable-data.js';
import { escapeHtml } from '../app.js';
import { exportGensetPDF } from '../export.js';

export function renderGenset(host) {
  host.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <h2 class="text-xl font-semibold mr-auto">${t('genset.title')}</h2>
      <button class="btn btn-secondary" id="gen-pdf">⬇ PDF</button>
      <button class="btn btn-primary" id="gen-add">${t('genset.addLoad')}</button>
    </div>

    <div class="grid lg:grid-cols-3 gap-4">
      <div class="card p-4 lg:col-span-2 overflow-auto">
        <table class="tbl" id="gen-table">
          <thead>
            <tr>
              <th>#</th><th>${t('genset.loadName')}</th><th class="num">${t('genset.kW')}</th>
              <th class="num">${t('genset.pf')}</th><th>${t('genset.startType')}</th>
              <th>${t('genset.isStep')}</th><th></th>
            </tr>
          </thead>
          <tbody id="gen-body"></tbody>
        </table>
      </div>
      <div class="card p-4 space-y-3">
        <h3 class="font-semibold">Parameters</h3>
        <div>
          <label class="label">${t('genset.pfTarget')}</label>
          <input class="input" id="opt-pf" type="number" step="0.01" min="0.5" max="1"/>
        </div>
        <div>
          <label class="label">${t('genset.Xd')} (sub-transient)</label>
          <input class="input" id="opt-xd" type="number" step="0.01" min="0.08" max="0.3"/>
        </div>
        <div>
          <label class="label">${t('genset.dipLimit')}</label>
          <input class="input" id="opt-dip" type="number" step="0.5" min="5" max="30"/>
        </div>
        <div>
          <label class="label">${t('genset.diversity')}</label>
          <input class="input" id="opt-div" type="number" step="0.05" min="0.3" max="1.2"/>
        </div>
      </div>
    </div>

    <div id="gen-results" class="mt-4"></div>
  `;

  const proj = ensureCurrent();
  const opts = proj.genset.opts || {};
  document.getElementById('opt-pf').value  = opts.pfTarget ?? 0.8;
  document.getElementById('opt-xd').value  = opts.Xd ?? 0.15;
  document.getElementById('opt-dip').value = opts.dipLimit ?? 15;
  document.getElementById('opt-div').value = opts.diversity ?? 0.9;
  ['opt-pf','opt-xd','opt-dip','opt-div'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      updateCurrent(p => {
        p.genset.opts = {
          pfTarget:  +document.getElementById('opt-pf').value,
          Xd:        +document.getElementById('opt-xd').value,
          dipLimit:  +document.getElementById('opt-dip').value,
          diversity: +document.getElementById('opt-div').value
        };
      });
      refresh();
    });
  });

  document.getElementById('gen-add').onclick = () => {
    updateCurrent(p => {
      p.genset.loads.push({
        id: uid(), name: `Load ${p.genset.loads.length + 1}`,
        kW: 0, pf: 0.85, startType: 'DOL', isStep: false
      });
    });
    refresh();
  };
  document.getElementById('gen-pdf').onclick = () => exportGensetPDF(getCurrent());

  refresh();
}

function captureFocus() {
  const el = document.activeElement;
  if (!el?.dataset?.f) return null;
  const tr = el.closest('tr[data-id]');
  return { id: tr?.dataset.id, f: el.dataset.f, start: el.selectionStart, end: el.selectionEnd };
}
function restoreFocus(s) {
  if (!s) return;
  const tr = document.querySelector(`tr[data-id="${s.id}"]`);
  const el = tr?.querySelector(`[data-f="${s.f}"]`);
  if (!el) return;
  el.focus();
  if (s.start != null && el.setSelectionRange) { try { el.setSelectionRange(s.start, s.end); } catch {} }
}

function refresh() {
  const snap = captureFocus();
  const proj = getCurrent();
  const body = document.getElementById('gen-body');
  if (!body) return;
  body.innerHTML = proj.genset.loads.length
    ? proj.genset.loads.map((l,i) => row(l,i)).join('')
    : `<tr><td colspan="7" class="text-center text-slate-500 py-8">${t('genset.emptyHint')}</td></tr>`;

  body.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelectorAll('[data-f]').forEach(el => {
      el.addEventListener('input', () => {
        const f = el.dataset.f;
        let v = el.type === 'checkbox' ? el.checked
              : (['kW','pf'].includes(f) ? +el.value : el.value);
        updateCurrent(p => {
          const r = p.genset.loads.find(x => x.id === id);
          if (r) r[f] = v;
        });
        refresh();
      });
    });
    tr.querySelector('[data-act="del"]').onclick = () => {
      updateCurrent(p => { p.genset.loads = p.genset.loads.filter(x => x.id !== id); });
      refresh();
    };
  });

  const res = sizeGenset(proj.genset.loads, proj.genset.opts);
  updateCurrent(p => { p.genset.result = res; });
  renderResults(res, proj);
  restoreFocus(snap);
}

function row(l, i) {
  const startOpts = Object.keys(MOTOR_START).map(k =>
    `<option value="${k}" ${l.startType===k?'selected':''}>${k}</option>`).join('');
  return `<tr data-id="${l.id}">
    <td class="text-slate-400">${i+1}</td>
    <td><input class="input" data-f="name" value="${escapeHtml(l.name)}"/></td>
    <td><input class="input num" data-f="kW" type="number" step="0.1" value="${l.kW}"/></td>
    <td><input class="input num" data-f="pf" type="number" step="0.01" min="0.3" max="1" value="${l.pf}"/></td>
    <td><select class="select" data-f="startType">${startOpts}</select></td>
    <td class="text-center"><input type="checkbox" data-f="isStep" ${l.isStep?'checked':''} class="rounded"/></td>
    <td><button class="btn btn-ghost btn-sm" data-act="del">✕</button></td>
  </tr>`;
}

function renderResults(r, proj) {
  const host = document.getElementById('gen-results');
  if (!host) return;
  if (!proj.genset.loads.length) { host.innerHTML = ''; return; }

  const suggestedDip = r.computeDip(r.suggestedKVA);
  const dipOK = suggestedDip <= (proj.genset.opts.dipLimit ?? 15);
  host.innerHTML = `
    <div class="grid md:grid-cols-4 gap-3 mt-2">
      <div class="card p-4"><div class="text-xs text-slate-500 uppercase">${t('genset.runningKVA')}</div><div class="text-2xl font-semibold">${r.runningKVA}</div><div class="text-xs text-slate-500 mt-1">Total kW: ${r.totalKW} · PF ${r.avgPF}</div></div>
      <div class="card p-4"><div class="text-xs text-slate-500 uppercase">${t('genset.stepStart')}</div><div class="text-2xl font-semibold">${r.stepStartKVA}</div></div>
      <div class="card p-4"><div class="text-xs text-slate-500 uppercase">${t('genset.required')}</div><div class="text-2xl font-semibold">${r.requiredKVA}</div><div class="text-xs text-slate-500 mt-1">run≥${r.ratedForRun} · dip≥${r.ratedForDip}</div></div>
      <div class="card p-4"><div class="text-xs text-slate-500 uppercase">${t('genset.suggested')}</div><div class="text-2xl font-semibold">${r.suggestedKVA} kVA</div>
        <div class="text-xs mt-1"><span class="badge badge-${dipOK?'ok':'warn'}">dip ≈ ${suggestedDip.toFixed(1)}%</span></div>
      </div>
    </div>
  `;
}
