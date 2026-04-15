// ============================================================================
// modules/loading-estimation.js
// ============================================================================
import { t } from '../i18n.js';
import { getCurrent, updateCurrent, uid, ensureCurrent } from '../store.js';
import { estimateLoading, round } from '../formulas.js';
import { DIVERSITY, LPD_DEFAULTS, SPD_DEFAULTS } from '../cable-data.js';
import { escapeHtml } from '../app.js';
import { exportLoadingXLSX } from '../export.js';

const CATS = ['lighting','small_power','air_con','lift_motor','water_pump','kitchen','misc'];

export function renderLoading(host) {
  host.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <h2 class="text-xl font-semibold mr-auto">${t('loading.title')}</h2>
      <button class="btn btn-secondary" id="ld-xlsx">⬇ Excel</button>
      <button class="btn btn-primary" id="ld-add">${t('loading.addItem')}</button>
    </div>

    <div class="card overflow-auto">
      <table class="tbl" id="ld-table">
        <thead>
          <tr>
            <th>#</th><th>${t('common.name')}</th><th>${t('loading.category')}</th>
            <th class="num">${t('loading.area')}</th><th class="num">${t('loading.wpm2')}</th>
            <th class="num">${t('loading.qty')}</th><th class="num">${t('loading.watt')}</th>
            <th class="num">${t('loading.pf')}</th><th class="num">${t('loading.diversity')}</th>
            <th class="num">${t('loading.connected')}</th>
            <th class="num">${t('loading.demand')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="ld-body"></tbody>
      </table>
    </div>

    <div class="mt-4 grid md:grid-cols-2 gap-4">
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <label class="label mb-0">${t('loading.overall')}</label>
          <input id="ld-div" class="input num max-w-[120px]" type="number" step="0.05" min="0.3" max="1.2"/>
        </div>
        <div id="ld-groups" class="mt-3 text-sm"></div>
      </div>
      <div class="card p-4">
        <h3 class="font-semibold mb-2">${t('loading.totals')}</h3>
        <div id="ld-totals" class="text-sm space-y-1"></div>
      </div>
    </div>
  `;

  const proj = ensureCurrent();
  document.getElementById('ld-div').value = proj.loading.overallDiversity ?? 1.0;
  document.getElementById('ld-div').addEventListener('input', (e) => {
    updateCurrent(p => { p.loading.overallDiversity = +e.target.value; });
    refresh();
  });
  document.getElementById('ld-add').onclick = () => {
    updateCurrent(p => {
      p.loading.items.push({
        id: uid(), name: `Item ${p.loading.items.length + 1}`,
        category: 'small_power', area: '', wpm2: '',
        qty: '', watt: '', pf: 0.85, diversity: ''
      });
    });
    refresh();
  };
  document.getElementById('ld-xlsx').onclick = () => exportLoadingXLSX(getCurrent());

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
  const body = document.getElementById('ld-body');
  if (!body) return;
  body.innerHTML = proj.loading.items.length
    ? proj.loading.items.map((it,i) => row(it,i)).join('')
    : `<tr><td colspan="12" class="text-center text-slate-500 py-8">No items yet.</td></tr>`;

  body.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelectorAll('[data-f]').forEach(el => {
      el.addEventListener('input', () => {
        const f = el.dataset.f;
        let v = el.value;
        if (['area','wpm2','qty','watt','pf','diversity'].includes(f)) v = v === '' ? '' : +v;
        updateCurrent(p => {
          const r = p.loading.items.find(x => x.id === id);
          if (r) {
            r[f] = v;
            // auto-fill default wpm2 when category changes
            if (f === 'category') {
              if (LPD_DEFAULTS[v] && r.wpm2 === '') r.wpm2 = v === 'lighting' ? LPD_DEFAULTS[v] : SPD_DEFAULTS[v] ?? r.wpm2;
            }
          }
        });
        refresh();
      });
    });
    tr.querySelector('[data-act="del"]').onclick = () => {
      updateCurrent(p => { p.loading.items = p.loading.items.filter(x => x.id !== id); });
      refresh();
    };
  });

  const res = estimateLoading(proj.loading.items, { overallDiversity: proj.loading.overallDiversity ?? 1 });
  updateCurrent(p => { p.loading.result = { ...res, groups: res.groups }; });

  renderTotals(res);
  renderGroups(res);
  restoreFocus(snap);
}

function row(it, i) {
  const catOpts = CATS.map(c =>
    `<option value="${c}" ${it.category===c?'selected':''}>${c.replace('_',' ')}</option>`).join('');
  return `<tr data-id="${it.id}">
    <td class="text-slate-400">${i+1}</td>
    <td><input class="input" data-f="name" value="${escapeHtml(it.name)}"/></td>
    <td><select class="select" data-f="category">${catOpts}</select></td>
    <td><input class="input num" data-f="area" type="number" step="0.1" value="${it.area}"/></td>
    <td><input class="input num" data-f="wpm2" type="number" step="0.1" value="${it.wpm2}"/></td>
    <td><input class="input num" data-f="qty" type="number" step="1" value="${it.qty}"/></td>
    <td><input class="input num" data-f="watt" type="number" step="1" value="${it.watt}"/></td>
    <td><input class="input num" data-f="pf" type="number" step="0.01" min="0.3" max="1" value="${it.pf}"/></td>
    <td><input class="input num" data-f="diversity" type="number" step="0.05" min="0.1" max="1.2" value="${it.diversity}" placeholder="${DIVERSITY[it.category]||''}"/></td>
    <td class="num">${it._connectedKW?.toFixed?.(2) ?? ''}</td>
    <td class="num">${it._demandKW?.toFixed?.(2) ?? ''}</td>
    <td><button class="btn btn-ghost btn-sm" data-act="del">✕</button></td>
  </tr>`;
}

function renderTotals(res) {
  const h = document.getElementById('ld-totals');
  h.innerHTML = `
    <div class="flex justify-between"><span>${t('loading.connected')}</span><span class="font-mono">${res.totalConnectedKW} kW</span></div>
    <div class="flex justify-between"><span>${t('loading.demand')}</span><span class="font-mono">${res.totalDemandKW} kW</span></div>
    <div class="flex justify-between font-semibold"><span>${t('loading.maxDemandKVA')}</span><span class="font-mono">${res.totalKVA}</span></div>
    <div class="flex justify-between"><span>${t('loading.maxDemandA')}</span><span class="font-mono">${res.maxDemandA} A</span></div>
  `;
}

function renderGroups(res) {
  const h = document.getElementById('ld-groups');
  const rows = Object.entries(res.groups).map(([k,v]) =>
    `<tr><td>${k.replace('_',' ')}</td><td class="num">${v.connectedKW}</td><td class="num">${v.demandKW}</td><td class="num">${v.kVA}</td></tr>`).join('');
  h.innerHTML = rows
    ? `<table class="tbl"><thead><tr><th>${t('loading.category')}</th><th class="num">Conn. kW</th><th class="num">Dem. kW</th><th class="num">kVA</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="text-slate-500">Add items to see group totals.</div>`;
}
