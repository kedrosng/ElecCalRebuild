// ============================================================================
// router.js — minimal hash router.
// ============================================================================
const routes = new Map();
let notFound = null;

export function route(path, handler) { routes.set(path, handler); }
export function setNotFound(fn) { notFound = fn; }

export function currentPath() {
  const h = location.hash.replace(/^#/, '') || '/';
  return h;
}

export function navigate(path) {
  if (location.hash.replace(/^#/, '') === path) return dispatch();
  location.hash = '#' + path;
}

function parse(path) {
  const [p, q] = path.split('?');
  const params = {};
  if (q) {
    for (const pair of q.split('&')) {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { path: p, params };
}

function match(p) {
  const { path, params } = parse(p);
  // exact match first
  if (routes.has(path)) return { handler: routes.get(path), params };
  // param-style: /project/:id
  for (const [pattern, handler] of routes.entries()) {
    if (!pattern.includes(':')) continue;
    const parts = pattern.split('/');
    const have = path.split('/');
    if (parts.length !== have.length) continue;
    const local = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) local[parts[i].slice(1)] = decodeURIComponent(have[i]);
      else if (parts[i] !== have[i]) { ok = false; break; }
    }
    if (ok) return { handler, params: { ...local, ...params } };
  }
  return { handler: notFound, params };
}

export function dispatch() {
  const p = currentPath();
  const { handler, params } = match(p);
  if (handler) handler(params);
}

window.addEventListener('hashchange', dispatch);
