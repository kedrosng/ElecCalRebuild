// ============================================================================
// export.js — Excel (via SheetJS) + PDF (via jsPDF) export.
// Libraries are loaded lazily from CDN to keep first-load fast and keep the
// offline-cache small. If the user is offline and has never used export,
// they'll be informed and the operation will no-op.
// ============================================================================
import { cascade, sizeGenset, estimateLoading } from './formulas.js';

const CDN_XLSX  = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const CDN_JSPDF = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
const CDN_AUTOT = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';

const loaded = new Set();
function loadScript(src) {
  if (loaded.has(src)) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => { loaded.add(src); res(); };
    s.onerror = () => rej(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function ensureXLSX() { await loadScript(CDN_XLSX); }
async function ensureJSPDF() { await loadScript(CDN_JSPDF); await loadScript(CDN_AUTOT); }

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ------ Cables XLSX --------------------------------------------------------
export async function exportCablesXLSX(proj) {
  try { await ensureXLSX(); } catch (e) { return alert('Export requires internet on first use. ' + e.message); }
  const XLSX = window.XLSX;
  cascade(proj.cables);
  const header = ['#','Name','Ib (A)','Length (m)','Phase','Upstream','Size (mm²)','It (A)','Loading %','Own VD %','Total VD %','Own I²R (W)','Total I²R (W)','Notes'];
  const idToName = Object.fromEntries(proj.cables.map(c => [c.id, c.name]));
  const rows = proj.cables.map((c,i) => [
    i+1, c.name, c.current, c.length,
    c.phase === '1' ? '1P' : '3P',
    idToName[c.upstreamId] || '',
    c.size || '',
    c.It || '',
    c.loading?.toFixed?.(1) || '',
    c.ownVDpct?.toFixed?.(2) || '',
    c.totalVDpct?.toFixed?.(2) || '',
    c.ownCopperLossW?.toFixed?.(1) || '',
    c.totalCopperLossW?.toFixed?.(1) || '',
    c.notes || ''
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    [`PocketElec — Cable Sizing`],
    [`Project: ${proj.name}`, `Rev: ${proj.revision || 'A'}`, `Date: ${new Date().toLocaleDateString()}`],
    [],
    header,
    ...rows
  ]);
  ws['!cols'] = header.map((_,i) => ({ wch: i === 1 ? 22 : i === 13 ? 30 : 12 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cables');

  // Loading estimation sheet
  if (proj.loading?.items?.length) {
    const lr = estimateLoading(proj.loading.items, { overallDiversity: proj.loading.overallDiversity ?? 1 });
    const lws = XLSX.utils.aoa_to_sheet([
      ['PocketElec — Loading Estimation'],
      [`Project: ${proj.name}`, `Rev: ${proj.revision || 'A'}`, `Date: ${new Date().toLocaleDateString()}`],
      [],
      ['#','Name','Category','Area','W/m²','Qty','W/item','PF','Diversity','Connected kW','Demand kW'],
      ...proj.loading.items.map((it,i) => [
        i+1, it.name, it.category, it.area, it.wpm2, it.qty, it.watt, it.pf, it.diversity, it._connectedKW, it._demandKW
      ]),
      [],
      ['Totals'],
      ['Connected kW', lr.totalConnectedKW],
      ['Demand kW',    lr.totalDemandKW],
      ['Max Demand kVA', lr.totalKVA],
      ['Max Demand A',   lr.maxDemandA]
    ]);
    XLSX.utils.book_append_sheet(wb, lws, 'Loading');
  }

  // Genset sheet
  if (proj.genset?.loads?.length) {
    const gr = sizeGenset(proj.genset.loads, proj.genset.opts);
    const gws = XLSX.utils.aoa_to_sheet([
      ['PocketElec — Genset Sizing'],
      [`Project: ${proj.name}`, `Rev: ${proj.revision || 'A'}`, `Date: ${new Date().toLocaleDateString()}`],
      [],
      ['#','Load','kW','PF','Start Type','Step?'],
      ...proj.genset.loads.map((l,i) => [i+1, l.name, l.kW, l.pf, l.startType, l.isStep ? 'Y' : '']),
      [],
      ['Running kVA',   gr.runningKVA],
      ['Step start kVA', gr.stepStartKVA],
      ['Required kVA',  gr.requiredKVA],
      ['Suggested kVA', gr.suggestedKVA]
    ]);
    XLSX.utils.book_append_sheet(wb, gws, 'Genset');
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([buf], { type: 'application/octet-stream' }), `PocketElec_${proj.name}_Rev${proj.revision||'A'}.xlsx`);
}

// ------ Loading XLSX-only --------------------------------------------------
export async function exportLoadingXLSX(proj) { return exportCablesXLSX(proj); }

// ------ PDF ---------------------------------------------------------------
async function newPDF(proj, title) {
  await ensureJSPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold').setFontSize(14).text('PocketElec', 40, 40);
  doc.setFont('helvetica','normal').setFontSize(9).setTextColor(120)
     .text('HK Electrical Calculation Tool — EMSD CoP 2025 / BEC 2024', 40, 54);
  doc.setDrawColor(220).line(40, 60, W-40, 60);
  doc.setFontSize(11).setTextColor(40).setFont('helvetica','bold').text(title, 40, 82);
  doc.setFont('helvetica','normal').setFontSize(9).setTextColor(80).text(
    [`Project: ${proj.name}`, `Rev: ${proj.revision || 'A'}`, `Client: ${proj.client || '—'}`, `Ref: ${proj.projectRef || '—'}`, `Date: ${new Date().toLocaleDateString()}`].join('   |   '),
    40, 96
  );
  return doc;
}

export async function exportCablesPDF(proj) {
  try {
    const doc = await newPDF(proj, 'Cable Sizing Report');
    cascade(proj.cables);
    const idToName = Object.fromEntries(proj.cables.map(c => [c.id, c.name]));
    const body = proj.cables.map((c,i) => [
      i+1, c.name, c.phase==='1'?'1P':'3P',
      c.current, c.length,
      idToName[c.upstreamId] || '—',
      c.size || '—', c.It || '—',
      (c.loading||0).toFixed(0)+'%',
      (c.ownVDpct||0).toFixed(2)+'%',
      (c.totalVDpct||0).toFixed(2)+'%',
      (c.ownCopperLossW||0).toFixed(1),
      (c.totalCopperLossW||0).toFixed(1)
    ]);
    doc.autoTable({
      startY: 110,
      head: [['#','Name','Ph','Ib','L(m)','Upstream','Size','It','Load','VD','ΣVD','I²R','ΣI²R']],
      body,
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle:'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 }
    });
    doc.save(`PocketElec_${proj.name}_Cables.pdf`);
  } catch (e) { alert('PDF export failed: ' + e.message); }
}

export async function exportGensetPDF(proj) {
  try {
    const doc = await newPDF(proj, 'Genset Sizing Report');
    const r = sizeGenset(proj.genset.loads, proj.genset.opts);
    doc.autoTable({
      startY: 110,
      head: [['#','Load','kW','PF','Start','Step']],
      body: proj.genset.loads.map((l,i) => [i+1, l.name, l.kW, l.pf, l.startType, l.isStep?'✓':'']),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30,64,175], textColor: 255, fontStyle:'bold' },
      margin: { left: 40, right: 40 }
    });
    const y = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    [
      ['Running kVA',    r.runningKVA],
      ['Step-start kVA', r.stepStartKVA],
      ['Required kVA',   r.requiredKVA],
      ['Suggested kVA',  r.suggestedKVA + ' kVA']
    ].forEach(([k,v], i) => doc.text(`${k}: ${v}`, 40, y + i*14));
    doc.save(`PocketElec_${proj.name}_Genset.pdf`);
  } catch (e) { alert('PDF export failed: ' + e.message); }
}
