// ============================================================================
// modules/dashboard.js
// ============================================================================
import { t } from '../i18n.js';
import { getCurrent, listProjects, emptyProject, saveProject, setCurrentId } from '../store.js';
import { escapeHtml } from '../app.js';

export function renderDashboard(host) {
  const p = getCurrent();
  const projects = listProjects();
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  host.innerHTML = `
    <div class="mb-6">
      <div class="text-sm text-slate-500">${greet}.</div>
      <h2 class="text-2xl md:text-3xl font-semibold mt-1">${t('dash.welcome')}</h2>
      ${p ? `<div class="mt-2 text-sm text-slate-600 dark:text-slate-400">${t('dash.continue')} <span class="font-medium">${escapeHtml(p.name)}</span>.</div>` : ''}
    </div>

    <div class="grid md:grid-cols-3 gap-4 mb-8">
      ${card('/cable',   'dash.cards.cable',   'dash.cards.cableDesc',   '🔌')}
      ${card('/genset',  'dash.cards.genset',  'dash.cards.gensetDesc',  '⚡')}
      ${card('/loading', 'dash.cards.loading', 'dash.cards.loadingDesc', '📊')}
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold">${t('dash.quickstart')}</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-primary" id="dash-new">${t('dash.newProject')}</button>
          <a class="btn btn-secondary" href="#/projects">${t('dash.openProject')}</a>
        </div>
      </div>
      <div class="card p-4">
        <h3 class="font-semibold mb-3">Recent projects</h3>
        ${projects.slice(0,5).map(pr => `
          <a href="#/projects" class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 -mx-2 rounded">
            <span class="text-sm font-medium">${escapeHtml(pr.name)}</span>
            <span class="text-xs text-slate-500">${new Date(pr.updatedAt).toLocaleDateString()}</span>
          </a>`).join('') || `<div class="text-sm text-slate-500">No projects yet.</div>`}
      </div>
    </div>
  `;

  document.getElementById('dash-new').onclick = () => {
    const np = emptyProject('New Project');
    saveProject(np);
    setCurrentId(np.id);
    location.hash = '#/cable';
  };
}

function card(path, titleKey, descKey, emoji) {
  return `<a href="#${path}" class="card p-5 hover:shadow-md transition-shadow">
    <div class="text-3xl mb-2">${emoji}</div>
    <div class="font-semibold text-lg">${t(titleKey)}</div>
    <div class="text-sm text-slate-500 dark:text-slate-400 mt-1">${t(descKey)}</div>
  </a>`;
}
