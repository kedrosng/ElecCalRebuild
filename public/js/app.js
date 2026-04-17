// ============================================================================
// app.js — bootstrap, theme, shell, routing, onboarding, NL input.
// ============================================================================
import { applyI18n, t, setLang, getLang } from './i18n.js';
import {
  getSettings, setSettings, subscribe, ensureCurrent, getCurrent, setCurrentId,
  listProjects, hasOnboarded, setOnboarded, saveProject, emptyProject
} from './store.js';
import { route, dispatch, navigate, setNotFound } from './router.js';
import { renderDashboard }  from './modules/dashboard.js';
import { renderCable }      from './modules/cable-sizing.js';
import { renderGenset }     from './modules/genset-sizing.js';
import { renderLoading }    from './modules/loading-estimation.js';
import { renderProjects }   from './modules/projects.js';
import { renderSettings }   from './modules/settings.js';
import { renderChangelog }  from './modules/settings.js';
import { installDemos, DEMOS } from './demos.js';
import { parseNL, applyNLCommand } from './nl.js';

const APP_VERSION = '2.0.0';

// ----- Theme ---------------------------------------------------------------
function applyTheme() {
  const s = getSettings().theme;
  const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = s === 'dark' || (s === 'system' && sysDark);
  document.documentElement.classList.toggle('dark', dark);
  const tl = document.querySelector('.theme-label');
  if (tl) tl.textContent = dark ? '☀️' : '🌙';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ----- Shell ---------------------------------------------------------------
const app = document.getElementById('app');

const NAV = [
  { path: '/',        i18n: 'nav.dashboard', icon: dashIcon() },
  { path: '/cable',   i18n: 'nav.cable',     icon: cableIcon() },
  { path: '/genset',  i18n: 'nav.genset',    icon: gensetIcon() },
  { path: '/loading', i18n: 'nav.loading',   icon: loadIcon() },
  { path: '/projects',i18n: 'nav.projects',  icon: folderIcon() },
  { path: '/settings',i18n: 'nav.settings',  icon: gearIcon() }
];

function renderShell() {
  const tpl = document.getElementById('tpl-shell').content.cloneNode(true);
  app.innerHTML = '';
  app.appendChild(tpl);

  // Fill nav
  ['nav', 'nav-mobile'].forEach(id => {
    const host = document.getElementById(id);
    host.innerHTML = NAV.map(n => `
      <a href="#${n.path}" class="nav-item" data-path="${n.path}">
        ${n.icon}<span data-i18n="${n.i18n}">${t(n.i18n)}</span>
      </a>
    `).join('');
  });

  document.getElementById('app-version').textContent = APP_VERSION;
  document.getElementById('ver').textContent = APP_VERSION;
  document.querySelector('.lang-label').textContent = getLang() === 'en' ? 'EN' : '繁中';

  // Events
  document.getElementById('btn-theme').onclick = () => {
    const order = ['light','dark','system'];
    const cur = getSettings().theme;
    setSettings({ theme: order[(order.indexOf(cur)+1)%order.length] });
    applyTheme();
  };
  document.getElementById('btn-lang').onclick = () => {
    setLang(getLang() === 'en' ? 'zh-TW' : 'en');
    document.querySelector('.lang-label').textContent = getLang() === 'en' ? 'EN' : '繁中';
    dispatch();
  };
  document.getElementById('btn-menu').onclick = () => {
    document.getElementById('mobile-sidebar').classList.remove('hidden');
  };
  document.querySelectorAll('[data-close]').forEach(el => el.onclick = (e) => {
    if (e.target === el || e.currentTarget === el) {
      const m = document.getElementById('mobile-sidebar');
      if (m) m.classList.add('hidden');
    }
  });
  document.getElementById('btn-nl').onclick = openNL;
  document.getElementById('btn-feedback').onclick = (e) => {
    e.preventDefault();
    alert('Feedback & suggestions: please email hello@dinhaylo.com or open an issue on GitHub.');
  };

  updateHeader();
  applyI18n();
  highlightNav();
}

function highlightNav() {
  const p = location.hash.replace(/^#/, '') || '/';
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.path === p);
  });
}

function updateHeader() {
  const proj = getCurrent();
  const el = document.getElementById('current-project');
  if (!el) return;
  if (proj) {
    el.innerHTML = `<span class="opacity-60">${t('common.project')}:</span>
      <a href="#/projects" class="font-medium hover:underline">${escapeHtml(proj.name)}</a>
      <span class="opacity-60">· Rev ${escapeHtml(proj.revision||'A')}</span>`;
  } else {
    el.innerHTML = '';
  }
}

function setPageTitle(key) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = t(key);
}

// ----- Routes --------------------------------------------------------------
function makeView(renderer, titleKey) {
  return (params) => {
    const host = document.getElementById('view');
    if (!host) return;
    host.innerHTML = '';
    host.classList.add('fade-in');
    setTimeout(() => host.classList.remove('fade-in'), 250);
    renderer(host, params);
    setPageTitle(titleKey);
    highlightNav();
    updateHeader();
    applyI18n(host);
  };
}

route('/',         makeView(renderDashboard,      'nav.dashboard'));
route('/cable',    makeView(renderCable,          'nav.cable'));
route('/genset',   makeView(renderGenset,         'nav.genset'));
route('/loading',  makeView(renderLoading,        'nav.loading'));
route('/projects', makeView(renderProjects,       'nav.projects'));
route('/settings', makeView(renderSettings,       'nav.settings'));
route('/changelog',makeView(renderChangelog,      'footer.changelog'));
setNotFound(makeView(renderDashboard,             'nav.dashboard'));

// ----- Onboarding ----------------------------------------------------------
function openOnboarding() {
  const tpl = document.getElementById('tpl-onboarding').content.cloneNode(true);
  const wrap = document.createElement('div');
  wrap.appendChild(tpl);
  document.body.appendChild(wrap);

  const btnHost = wrap.querySelector('#demo-buttons');
  btnHost.innerHTML = DEMOS.map((d,i) => `
    <button data-i="${i}" class="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
      <div class="font-medium text-sm">${escapeHtml(d.name)}</div>
      <div class="text-xs text-slate-500">${escapeHtml(d.description)}</div>
    </button>`).join('');
  btnHost.querySelectorAll('button').forEach(b => b.onclick = () => {
    const d = DEMOS[+b.dataset.i];
    const p = installDemos(d);
    setCurrentId(p.id);
    if (wrap.querySelector('#dont-show-again').checked) setOnboarded();
    wrap.remove();
    navigate('/');
  });
  wrap.querySelector('#onboarding-start').onclick = () => {
    if (wrap.querySelector('#dont-show-again').checked) setOnboarded();
    const p = ensureCurrent();
    setCurrentId(p.id);
    wrap.remove();
    navigate('/');
  };
  applyI18n(wrap);
}

// ----- NL quick input ------------------------------------------------------
function openNL() {
  const tpl = document.getElementById('tpl-nl').content.cloneNode(true);
  const wrap = document.createElement('div');
  wrap.appendChild(tpl);
  document.body.appendChild(wrap);

  const input  = wrap.querySelector('#nl-input');
  const prev   = wrap.querySelector('#nl-preview');
  const apply  = wrap.querySelector('#nl-apply');

  input.focus();
  const update = () => {
    const cmd = parseNL(input.value);
    prev.textContent = cmd ? JSON.stringify(cmd, null, 0) : '(no match yet)';
    apply.disabled = !cmd;
  };
  input.addEventListener('input', update); update();

  wrap.querySelectorAll('[data-close]').forEach(el => el.onclick = () => wrap.remove());
  apply.onclick = () => {
    const cmd = parseNL(input.value);
    if (!cmd) return;
    applyNLCommand(cmd);
    wrap.remove();
    if (cmd.target) navigate(cmd.target);
    else dispatch();
  };
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') wrap.remove();
    if (e.key === 'Enter' && !apply.disabled) apply.click();
  });
  applyI18n(wrap);
}

// ----- Bootstrap -----------------------------------------------------------
function boot() {
  const firstRun = !hasOnboarded();
  // Only auto-create a default project on subsequent runs. On first run we
  // wait for the user to pick a demo or "Start Fresh" from onboarding.
  if (!firstRun) ensureCurrent();
  renderShell();
  applyTheme();
  document.documentElement.lang = getLang();
  dispatch();
  subscribe(() => { updateHeader(); applyTheme(); });

  if (firstRun) openOnboarding();

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__pwaPrompt = e; });
}

boot();

// ----- small helpers -------------------------------------------------------
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// SVG icon factory (kept inline to avoid extra HTTP)
function svg(path) {
  return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
    <path stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg>`;
}
function dashIcon()   { return svg('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'); }
function cableIcon()  { return svg('M3 12h4l2-8 4 16 2-8h6'); }
function gensetIcon() { return svg('M13 10V3L4 14h7v7l9-11h-7z'); }
function loadIcon()   { return svg('M9 19V6l12-3v13M9 19c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3zm12-3c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3z'); }
function folderIcon() { return svg('M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z'); }
function gearIcon()   { return svg('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'); }
