// ============================================================================
// formulas.js — Every calculation lives in this file. No business logic in UI.
// All formulas below follow EMSD CoP 2025 / BEC 2024 conventions.
// ----------------------------------------------------------------------------
// Cable voltage drop (table method, CoP App. 6):
//     Vd(V)   = mV/A/m × I × L / 1000
//     VD(%)   = Vd / Vnominal × 100
//
// Copper loss (I²R):
//     3-phase: P(W) = 3 × I² × (R[Ω/km] × L[m] / 1000)
//     1-phase: P(W) = 2 × I² × (R[Ω/km] × L[m] / 1000)   (go + return)
//
// Cable selection:
//     Design current Ib < rating-corrected It    (It = Iz × Ca × Cg × Cf)
//     Size must also satisfy VD at full load within CoP limit.
//
// Cascading totals (downstream → upstream):
//     totalCopperLoss = ownCopperLoss + Σ downstream.totalCopperLoss
//     totalVDpct      = ownVDpct      + max(downstream.totalVDpct) [worst path]
//
// Genset sizing (BS 7698 / ISO 8528):
//     Running kVA    = ΣP_kW / PF
//     Starting kVA   = Σ(kVA_motor × motor_start_factor)   (largest-step basis)
//     Voltage dip(%) ≈ Xd″ × (stepStartKVA / gensetKVA) × 100
//     Genset chosen so: running ≤ 0.8·Rated AND dip ≤ userLimit (def 15%)
// ============================================================================

import {
  CABLE_TABLE, V_LL, V_LN,
  VD_LIMIT_PCT, VD_LIMIT_LIGHTING_PCT,
  DIVERSITY, MOTOR_START
} from './cable-data.js';

// ----- basic helpers -------------------------------------------------------
export const round = (n, d = 2) =>
  Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : 0;

export const phasesMultiplier = (phase) => (phase === '1' || phase === 1 ? 2 : 3);
export const voltage = (phase) => (phase === '1' || phase === 1 ? V_LN : V_LL);
export const mvColumn = (phase) => (phase === '1' || phase === 1 ? 'mV_1p' : 'mV_3p');
export const izColumn = (phase) => (phase === '1' || phase === 1 ? 'Iz_1p' : 'Iz_3p');

// ----- rating-corrected table lookup --------------------------------------
export function findSmallestCable(I, phase, { ca = 1, cg = 1, cf = 1 } = {}) {
  const col = izColumn(phase);
  for (const row of CABLE_TABLE) {
    const It = row[col] * ca * cg * cf;
    if (It >= I) return { ...row, It: round(It, 1) };
  }
  return null;
}

export function getCableBySize(size) {
  return CABLE_TABLE.find(c => c.size === +size) || null;
}

// ----- per-cable voltage drop & copper loss -------------------------------
/**
 * @param {Object} p
 * @param {number} p.I        design current (A)
 * @param {number} p.length   run length (m)
 * @param {number} p.size     conductor CSA (mm²)
 * @param {'1'|'3'} p.phase
 */
export function cablePerRun({ I, length, size, phase }) {
  const row = getCableBySize(size);
  if (!row) return { ok: false, reason: 'Unknown cable size' };
  const mv = row[mvColumn(phase)];          // mV/A/m
  const Vd  = (mv * I * length) / 1000;     // volts
  const Vn  = voltage(phase);
  const vdPct = (Vd / Vn) * 100;
  const R_ohm = (row.R * length) / 1000;    // Ω per conductor for this run
  const copperLossW = phasesMultiplier(phase) * I * I * R_ohm;
  const It = row[izColumn(phase)];
  const loading = (I / It) * 100;
  return {
    ok: true,
    Vd: round(Vd, 3),
    vdPct: round(vdPct, 3),
    copperLossW: round(copperLossW, 2),
    It, loading: round(loading, 1), row
  };
}

/**
 * Cascade: given a flat array of loadings with .upstreamId links,
 * compute totals (own + propagated downstream).
 * @returns the same array enriched with .totalVDpct, .totalCopperLossW
 */
export function cascade(loadings) {
  // Build children map.
  const byId = new Map(loadings.map(l => [l.id, l]));
  const children = new Map();
  for (const l of loadings) {
    if (l.upstreamId && byId.has(l.upstreamId)) {
      if (!children.has(l.upstreamId)) children.set(l.upstreamId, []);
      children.get(l.upstreamId).push(l);
    }
  }
  // Compute each loading's own VD/loss first (if not already done).
  for (const l of loadings) {
    if (l.size && l.current && l.length) {
      const r = cablePerRun({ I: +l.current, length: +l.length, size: +l.size, phase: l.phase || '3' });
      l.ownVDpct       = r.ok ? r.vdPct       : 0;
      l.ownCopperLossW = r.ok ? r.copperLossW : 0;
      l.Vd             = r.ok ? r.Vd          : 0;
      l.loading        = r.ok ? r.loading     : 0;
      l.It             = r.ok ? r.It          : 0;
    } else {
      l.ownVDpct = l.ownCopperLossW = l.Vd = l.loading = l.It = 0;
    }
  }
  // Post-order traversal: totals = own + max(children.totalVDpct) / sum(children.totalCopperLossW)
  const visiting = new Set(); // cycle guard
  function computeTotals(node) {
    if (visiting.has(node.id)) return; // cycle — skip
    visiting.add(node.id);
    const kids = children.get(node.id) || [];
    let maxDown = 0, sumLoss = 0;
    for (const k of kids) {
      computeTotals(k);
      if ((k.totalVDpct || 0) > maxDown) maxDown = k.totalVDpct;
      sumLoss += (k.totalCopperLossW || 0);
    }
    node.totalVDpct       = round((node.ownVDpct || 0) + maxDown, 3);
    node.totalCopperLossW = round((node.ownCopperLossW || 0) + sumLoss, 2);
    visiting.delete(node.id);
  }
  // Find roots (no upstreamId or upstream missing)
  const roots = loadings.filter(l => !l.upstreamId || !byId.has(l.upstreamId));
  roots.forEach(computeTotals);
  // Any unreached (cyclic) node — at least assign own values.
  for (const l of loadings) {
    if (l.totalVDpct === undefined) {
      l.totalVDpct = l.ownVDpct || 0;
      l.totalCopperLossW = l.ownCopperLossW || 0;
    }
  }
  return loadings;
}

// ----- compliance check ----------------------------------------------------
export function checkVDCompliance(totalVDpct, isLighting = false) {
  const limit = isLighting ? VD_LIMIT_LIGHTING_PCT : VD_LIMIT_PCT;
  if (totalVDpct > limit) {
    return {
      status: 'fail',
      limit,
      message: `VD = ${round(totalVDpct,2)}% exceeds EMSD CoP ${limit}% limit (CoP 2025 cl. 13).`
    };
  }
  if (totalVDpct > limit * 0.9) {
    return { status: 'warn', limit, message: `VD = ${round(totalVDpct,2)}% is within 10% of the ${limit}% limit.` };
  }
  return { status: 'ok', limit, message: `VD = ${round(totalVDpct,2)}% OK (≤${limit}%).` };
}

export function checkLoading(loadingPct) {
  if (loadingPct > 100) return { status: 'fail', message: `Cable loading ${round(loadingPct,1)}% exceeds capacity.` };
  if (loadingPct > 80)  return { status: 'warn', message: `Cable loading ${round(loadingPct,1)}% > 80%. Consider uprating.` };
  return { status: 'ok', message: `Cable loading ${round(loadingPct,1)}% OK.` };
}

// ----- genset sizing -------------------------------------------------------
/**
 * @param {Array} loads  [{ name, kW, pf, startType, isStep }]
 * @param {Object} opts  { pfTarget=0.8, Xd=0.15 (sub-transient), dipLimit=15, diversity=0.9 }
 */
export function sizeGenset(loads, opts = {}) {
  const pfTarget = opts.pfTarget ?? 0.8;
  const Xd       = opts.Xd       ?? 0.15;
  const dipLimit = opts.dipLimit ?? 15;
  const diversity = opts.diversity ?? 0.9;

  // Running demand
  const totalKW  = loads.reduce((s, l) => s + (+l.kW || 0), 0) * diversity;
  const avgPF    = loads.length
    ? loads.reduce((s, l) => s + ((+l.kW || 0) * (+l.pf || 0.85)), 0) / Math.max(totalKW, 1e-6)
    : 0.85;
  const runningKVA = totalKW / Math.max(avgPF || 0.85, 0.1);

  // Largest motor-start step (sum of motors started together)
  const steps = loads
    .filter(l => l.isStep)
    .map(l => {
      const k = +l.kW || 0;
      const pf = +l.pf || 0.85;
      const startFactor = MOTOR_START[l.startType || 'DOL'] ?? 6.5;
      const kvaRun = k / pf;
      return { ...l, kvaStart: kvaRun * startFactor };
    });
  const stepStartKVA = steps.reduce((s, x) => s + x.kvaStart, 0);

  // Min rated kVA required
  const ratedForRun  = runningKVA / pfTarget;              // ≥80% load at genset PF
  const ratedForDip  = stepStartKVA / (dipLimit / 100) * Xd; // from Vdip ≈ Xd·Sstart/Sgen
  const requiredKVA  = Math.max(ratedForRun, ratedForDip);

  // Voltage dip for a given genset rating — helper for UI
  const computeDip = (genKVA) =>
    genKVA > 0 ? (Xd * stepStartKVA / genKVA) * 100 : 0;

  return {
    totalKW:      round(totalKW, 2),
    avgPF:        round(avgPF, 3),
    runningKVA:   round(runningKVA, 2),
    stepStartKVA: round(stepStartKVA, 2),
    ratedForRun:  round(ratedForRun, 2),
    ratedForDip:  round(ratedForDip, 2),
    requiredKVA:  round(requiredKVA, 2),
    suggestedKVA: nextStandardKVA(requiredKVA),
    computeDip
  };
}

// Standard genset sizes (kVA) — HK common ratings.
const STD_KVA = [25,30,40,50,60,75,100,125,150,200,250,275,313,400,500,563,625,750,910,1000,1125,1250,1500,1675,1875,2000,2250,2500];
export function nextStandardKVA(v) { return STD_KVA.find(x => x >= v) || Math.ceil(v / 100) * 100; }

// ----- loading estimation --------------------------------------------------
/**
 * @param {Array} items [{ id, category, name, area, wpm2, qty, watt, pf=0.85, diversity=auto }]
 *   Either (area × wpm2) or (qty × watt) defines the connected load.
 * @param {Object} opts { overallDiversity = 1.0 }
 */
export function estimateLoading(items, opts = {}) {
  const overall = opts.overallDiversity ?? 1.0;
  const groups = {};
  for (const it of items) {
    const cat = it.category || 'misc';
    const w = (it.area && it.wpm2) ? (+it.area * +it.wpm2) : ((+it.qty || 1) * (+it.watt || 0));
    const kW = w / 1000;
    const pf = +it.pf || 0.85;
    const d  = it.diversity != null ? +it.diversity : (DIVERSITY[cat] ?? 0.8);
    const demandKW = kW * d;
    it._connectedKW = round(kW, 3);
    it._demandKW    = round(demandKW, 3);
    it._pfUsed      = pf;
    if (!groups[cat]) groups[cat] = { connectedKW: 0, demandKW: 0, kVA: 0 };
    groups[cat].connectedKW += kW;
    groups[cat].demandKW    += demandKW;
    groups[cat].kVA         += demandKW / pf;
  }
  let totalConnectedKW = 0, totalDemandKW = 0, totalKVA = 0;
  for (const g of Object.values(groups)) {
    g.connectedKW = round(g.connectedKW, 2);
    g.demandKW    = round(g.demandKW, 2);
    g.kVA         = round(g.kVA, 2);
    totalConnectedKW += g.connectedKW;
    totalDemandKW    += g.demandKW;
    totalKVA         += g.kVA;
  }
  totalDemandKW *= overall;
  totalKVA      *= overall;
  const currentA = (totalKVA * 1000) / (Math.sqrt(3) * V_LL);
  return {
    groups,
    totalConnectedKW: round(totalConnectedKW, 2),
    totalDemandKW:    round(totalDemandKW, 2),
    totalKVA:         round(totalKVA, 2),
    maxDemandA:       round(currentA, 1)
  };
}
