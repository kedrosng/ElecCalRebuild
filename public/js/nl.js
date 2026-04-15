// ============================================================================
// nl.js — Minimal pattern-based natural-language parser.
// Recognised shapes (all case-insensitive):
//   "cable for 100A, 80m, 3p"            → add cable
//   "main cable for 3x50A DBs at 80m"    → add main + 3 downstream
//   "genset for 200kW office, 0.85pf"    → add genset load
//   "office 1200m2"                      → add office loading
// ============================================================================
import { updateCurrent, uid } from './store.js';

export function parseNL(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return null;

  // Genset
  let m = s.match(/genset.*?(\d+(?:\.\d+)?)\s*kw(?:.*?(\d+(?:\.\d+)?)\s*pf)?/);
  if (m) {
    return { kind: 'genset.addLoad', kW: +m[1], pf: +(m[2] || 0.85), target: '/genset' };
  }

  // Main cable for N x XxA DBs at Ym
  m = s.match(/(?:main\s+)?cable.*?(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*a\s+(?:dbs?)?.*?(\d+(?:\.\d+)?)\s*m/);
  if (m) {
    const n = +m[1], I = +m[2], L = +m[3];
    return { kind: 'cable.addMainPlusDownstream', n, I, L, target: '/cable' };
  }

  // Simple cable
  m = s.match(/cable.*?(\d+(?:\.\d+)?)\s*a.*?(\d+(?:\.\d+)?)\s*m(?:.*?([13])\s*p)?/);
  if (m) {
    return { kind: 'cable.addOne', I: +m[1], L: +m[2], phase: m[3] || '3', target: '/cable' };
  }

  // Loading: "office 1200m2"
  m = s.match(/(office|retail|residential|hotel_room|classroom|warehouse|carpark|restaurant)\s+(\d+(?:\.\d+)?)\s*m2/);
  if (m) {
    return { kind: 'loading.addArea', category: m[1], area: +m[2], target: '/loading' };
  }

  return null;
}

export function applyNLCommand(cmd) {
  if (!cmd) return;
  updateCurrent(p => {
    switch (cmd.kind) {
      case 'cable.addOne': {
        p.cables.push({
          id: uid(), name: `Cable ${p.cables.length+1}`,
          current: cmd.I, length: cmd.L, phase: cmd.phase, size: '', upstreamId: '', isLighting: false, notes: 'Added via NL'
        });
        break;
      }
      case 'cable.addMainPlusDownstream': {
        const mainI = cmd.n * cmd.I;
        const mainId = uid();
        p.cables.push({ id: mainId, name: 'Main cable', current: mainI, length: cmd.L, phase: '3', size: '', upstreamId: '', isLighting: false, notes: 'NL: main' });
        for (let i = 1; i <= cmd.n; i++) {
          p.cables.push({ id: uid(), name: `DB-${i}`, current: cmd.I, length: 30, phase: '3', size: '', upstreamId: mainId, isLighting: false, notes: 'NL: DB' });
        }
        break;
      }
      case 'genset.addLoad': {
        p.genset.loads.push({ id: uid(), name: 'NL load', kW: cmd.kW, pf: cmd.pf, startType: 'VFD', isStep: false });
        break;
      }
      case 'loading.addArea': {
        p.loading.items.push({ id: uid(), name: cmd.category, category: cmd.category, area: cmd.area, wpm2: '', qty:'', watt:'', pf: 0.85, diversity: '' });
        break;
      }
    }
  });
}
