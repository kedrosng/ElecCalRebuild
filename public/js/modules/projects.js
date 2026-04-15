// ============================================================================
// modules/projects.js
// ============================================================================
import { t } from '../i18n.js';
import {
  listProjects, getCurrentId, setCurrentId, saveProject, deleteProject,
  emptyProject, getProject, exportAll, importAll
} from '../store.js';
import { escapeHtml } from '../app.js';

export function renderProjects(host) {
  host.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <h2 class="text-xl font-semibold mr-auto">${t('projects.title')}</h2>
      <button class="btn btn-secondary" id="p-export">${t('projects.export')}</button>
      <button class="btn btn-secondary" id="p-import">${t('projects.import')}</button>
      <button class="btn btn-primary" id="p-new">${t('projects.new')}</button>
    </div>

    <div id="cur" class="mb-6"></div>

    <div class="card overflow-hidden">
      <table class="tbl">
        <thead>
          <tr>
            <th>${t('common.name')}</th>
            <th>${t('common.revision')}</th>
            <th>${t('common.client')}</th>
            <th>Updated</th>
            <th>#cables</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="p-body"></tbody>
      </table>
    </div>
  `;

  document.getElementById('p-new').onclick = () => {
    const p = emptyProject('New Project ' + new Date().toISOString().slice(5,10));
    saveProject(p);
    setCurrentId(p.id);
    renderProjects(host);
  };

  document.getElementById('p-export').onclick = () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `pocketelec-backup-${Date.now()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  document.getElementById('p-import').onclick = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });
    inp.onchange = async () => {
      try {
        const text = await inp.files[0].text();
        importAll(JSON.parse(text));
        renderProjects(host);
      } catch (e) { alert('Import failed: ' + e.message); }
    };
    inp.click();
  };

  const cur = getCurrentId() ? getProject(getCurrentId()) : null;
  document.getElementById('cur').innerHTML = cur ? currentCard(cur) : '';
  if (cur) wireCurrent(cur, host);

  const body = document.getElementById('p-body');
  const projects = listProjects();
  body.innerHTML = projects.length
    ? projects.map(p => row(p)).join('')
    : `<tr><td colspan="6" class="text-center text-slate-500 py-8">${t('projects.empty')}</td></tr>`;

  body.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelector('[data-act="open"]').onclick = () => { setCurrentId(id); renderProjects(host); };
    tr.querySelector('[data-act="del"]').onclick = () => {
      if (!confirm(t('projects.confirmDelete'))) return;
      deleteProject(id); renderProjects(host);
    };
  });
}

function row(p) {
  return `<tr data-id="${p.id}" class="${p.id === getCurrentId() ? 'bg-brand-50 dark:bg-brand-900/20' : ''}">
    <td class="font-medium">${escapeHtml(p.name)}</td>
    <td>${escapeHtml(p.revision || 'A')}</td>
    <td>${escapeHtml(p.client || '—')}</td>
    <td class="text-slate-500">${new Date(p.updatedAt).toLocaleString()}</td>
    <td class="num">${p.cables.length}</td>
    <td>
      <div class="flex gap-1 justify-end">
        <button class="btn btn-secondary btn-sm" data-act="open">${t('projects.open')}</button>
        <button class="btn btn-ghost btn-sm" data-act="del">✕</button>
      </div>
    </td>
  </tr>`;
}

function currentCard(p) {
  return `<div class="card p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">Current project</h3>
      <span class="text-xs text-slate-500">ID: ${p.id}</span>
    </div>
    <div class="grid md:grid-cols-4 gap-3">
      <div><label class="label">${t('common.name')}</label><input class="input" id="cur-name" value="${escapeHtml(p.name)}"/></div>
      <div><label class="label">${t('common.revision')}</label><input class="input" id="cur-rev" value="${escapeHtml(p.revision||'A')}"/></div>
      <div><label class="label">${t('common.client')}</label><input class="input" id="cur-client" value="${escapeHtml(p.client||'')}"/></div>
      <div><label class="label">${t('common.ref')}</label><input class="input" id="cur-ref" value="${escapeHtml(p.projectRef||'')}"/></div>
    </div>
  </div>`;
}

function wireCurrent(p, host) {
  const map = { 'cur-name':'name','cur-rev':'revision','cur-client':'client','cur-ref':'projectRef' };
  for (const [id, field] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('input', () => {
      const prj = getProject(p.id);
      if (!prj) return;
      prj[field] = el.value;
      saveProject(prj);
    });
  }
}
