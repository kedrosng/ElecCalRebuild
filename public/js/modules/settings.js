// ============================================================================
// modules/settings.js — settings + changelog
// ============================================================================
import { t, setLang, getLang } from '../i18n.js';
import { getSettings, setSettings } from '../store.js';

export function renderSettings(host) {
  const s = getSettings();
  host.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">${t('settings.title')}</h2>
    <div class="grid md:grid-cols-2 gap-4 max-w-3xl">
      <div class="card p-4 space-y-3">
        <div>
          <label class="label">${t('settings.theme')}</label>
          <select id="s-theme" class="select">
            <option value="light">${t('settings.themeLight')}</option>
            <option value="dark">${t('settings.themeDark')}</option>
            <option value="system">${t('settings.themeSystem')}</option>
          </select>
        </div>
        <div>
          <label class="label">${t('settings.lang')}</label>
          <select id="s-lang" class="select">
            <option value="en">English</option>
            <option value="zh-TW">繁體中文</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" id="s-auto" class="rounded"/>
          <span>${t('settings.autoSave')}</span>
        </label>
      </div>
      <div class="card p-4 space-y-3">
        <div>
          <label class="label">${t('settings.vdLimit')}</label>
          <input id="s-vd" class="input num" type="number" step="0.1" min="1" max="10"/>
        </div>
        <div>
          <label class="label">${t('settings.vdLimitLight')}</label>
          <input id="s-vdl" class="input num" type="number" step="0.1" min="1" max="10"/>
        </div>
      </div>
      <div class="card p-4 md:col-span-2 text-sm text-slate-600 dark:text-slate-400">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100 mb-2">${t('settings.about')}</h3>
        <p>PocketElec is a free, offline-capable electrical calculation tool for
        HK MEP / electrical consultants. It follows EMSD Code of Practice 2025
        and BEC 2024. Your data is stored locally in your browser — nothing is
        uploaded.</p>
        <p class="mt-2">All formulas live in <code>js/formulas.js</code> and
        every coefficient (cable tables, diversity factors) in
        <code>js/cable-data.js</code> — fully auditable.</p>
      </div>
    </div>
  `;

  const $ = (id) => document.getElementById(id);
  $('s-theme').value = s.theme;
  $('s-lang').value  = s.lang;
  $('s-auto').checked = !!s.autoSave;
  $('s-vd').value   = s.vdLimit;
  $('s-vdl').value  = s.vdLimitLighting;

  $('s-theme').onchange = () => { setSettings({ theme: $('s-theme').value }); };
  $('s-lang').onchange  = () => { setLang($('s-lang').value); renderSettings(host); };
  $('s-auto').onchange  = () => { setSettings({ autoSave: $('s-auto').checked }); };
  $('s-vd').oninput    = () => { setSettings({ vdLimit: +$('s-vd').value }); };
  $('s-vdl').oninput   = () => { setSettings({ vdLimitLighting: +$('s-vdl').value }); };
}

export function renderChangelog(host) {
  host.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Changelog</h2>
    <div class="card p-4 max-w-3xl prose prose-sm dark:prose-invert">
      <h3>v2.0.0 — Complete rewrite</h3>
      <ul>
        <li>Rewritten as a modern PWA with offline support</li>
        <li>Cable sizing module with live upstream/downstream cascading totals</li>
        <li>Dark mode + bilingual EN/繁體中文</li>
        <li>Natural-language quick input</li>
        <li>Demo projects + onboarding flow</li>
        <li>Professional Excel/PDF export</li>
      </ul>
      <p><em>All formulas are listed in <code>js/formulas.js</code> and all
      reference tables in <code>js/cable-data.js</code> for full transparency
      and auditability.</em></p>
    </div>
  `;
}
