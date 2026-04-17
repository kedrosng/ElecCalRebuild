// ============================================================================
// store.js — Project & settings persistence.
// Uses localStorage (sync, simple, reliable for this data size).
// A tiny pub-sub lets modules re-render when state changes.
// ============================================================================

const K_PROJECTS   = 'pocketelec.projects.v2';
const K_CURRENT_ID = 'pocketelec.currentId.v2';
const K_SETTINGS   = 'pocketelec.settings.v2';
const K_ONBOARDED  = 'pocketelec.onboarded.v2';

export const uid = () => 'id_' + Math.random().toString(36).slice(2, 10);

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

// ---- low-level storage ----------------------------------------------------
const read  = (k, def) => {
  try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); }
  catch { return def; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ---- settings -------------------------------------------------------------
const defaultSettings = {
  theme: 'system',       // 'light' | 'dark' | 'system'
  lang:  'en',           // 'en' | 'zh-TW'
  autoSave: true,
  vdLimit: 5.0,          // overall (%)
  vdLimitLighting: 3.0
};
export function getSettings() { return { ...defaultSettings, ...read(K_SETTINGS, {}) }; }
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(K_SETTINGS, next);
  emit();
  return next;
}

// ---- onboarding flag ------------------------------------------------------
export const hasOnboarded = () => read(K_ONBOARDED, false);
export const setOnboarded = (v = true) => write(K_ONBOARDED, !!v);

// ---- projects -------------------------------------------------------------
/**
 * Project shape:
 * {
 *   id, name, createdAt, updatedAt,
 *   revision, client, projectRef,
 *   cables: [{ id, name, current, length, phase, size, upstreamId, isLighting, notes,
 *              ownVDpct, ownCopperLossW, totalVDpct, totalCopperLossW, loading, It, Vd }],
 *   genset: { loads: [...], opts: {...}, result: {...} },
 *   loading: { items: [...], overallDiversity, result: {...} }
 * }
 */
export function emptyProject(name = 'Untitled Project') {
  const now = Date.now();
  return {
    id: uid(),
    name, createdAt: now, updatedAt: now,
    revision: 'A', client: '', projectRef: '',
    cables: [],
    genset: { loads: [], opts: { pfTarget: 0.8, Xd: 0.15, dipLimit: 15, diversity: 0.9 } },
    loading: { items: [], overallDiversity: 1.0 }
  };
}

export function listProjects() {
  return read(K_PROJECTS, []).sort((a,b) => b.updatedAt - a.updatedAt);
}

export function saveProject(p) {
  const all = read(K_PROJECTS, []);
  p.updatedAt = Date.now();
  const i = all.findIndex(x => x.id === p.id);
  if (i >= 0) all[i] = p; else all.push(p);
  write(K_PROJECTS, all);
  emit();
  return p;
}

export function getProject(id) {
  return read(K_PROJECTS, []).find(p => p.id === id) || null;
}

export function deleteProject(id) {
  write(K_PROJECTS, read(K_PROJECTS, []).filter(p => p.id !== id));
  if (getCurrentId() === id) setCurrentId(null);
  emit();
}

export const getCurrentId = () => read(K_CURRENT_ID, null);
export const setCurrentId = (id) => { write(K_CURRENT_ID, id); emit(); };

export function getCurrent() {
  const id = getCurrentId();
  return id ? getProject(id) : null;
}
export function ensureCurrent() {
  let p = getCurrent();
  if (!p) {
    p = emptyProject('My Project');
    saveProject(p);
    setCurrentId(p.id);
  }
  return p;
}

// ---- convenience mutators (auto-save) -------------------------------------
export function updateCurrent(mut) {
  const p = ensureCurrent();
  mut(p);
  saveProject(p);
  return p;
}

// Export/import the full store (for backup)
export function exportAll() {
  return {
    schema: 'pocketelec.v2',
    projects: read(K_PROJECTS, []),
    settings: getSettings(),
    currentId: getCurrentId(),
    exportedAt: new Date().toISOString()
  };
}
export function importAll(data) {
  if (!data || data.schema !== 'pocketelec.v2') throw new Error('Unknown backup format');
  write(K_PROJECTS, data.projects || []);
  if (data.settings) write(K_SETTINGS, data.settings);
  if (data.currentId) write(K_CURRENT_ID, data.currentId);
  emit();
}
