// ============================================================================
// i18n.js — English / Traditional Chinese.
// Keys are hierarchical; .t('foo.bar') or .t('foo.bar', { n: 3 }).
// ============================================================================
import { getSettings, setSettings, subscribe } from './store.js';

const STRINGS = {
  en: {
    app: { version: 'Version' },
    nav: {
      dashboard: 'Dashboard',
      cable: 'Cable Sizing',
      genset: 'Genset Sizing',
      loading: 'Loading Estimation',
      projects: 'My Projects',
      settings: 'Settings'
    },
    common: {
      add: 'Add', remove: 'Remove', delete: 'Delete', save: 'Save', cancel: 'Cancel',
      apply: 'Apply', close: 'Close', name: 'Name', notes: 'Notes', edit: 'Edit',
      duplicate: 'Duplicate', export: 'Export', import: 'Import', print: 'Print',
      none: '— None —', yes: 'Yes', no: 'No', new: 'New', back: 'Back',
      project: 'Project', revision: 'Revision', client: 'Client', ref: 'Project Ref.',
      total: 'Total', summary: 'Summary', warning: 'Warning', ok: 'OK', fail: 'Fail'
    },
    footer: { changelog: 'Changelog', feedback: 'Send Feedback', madeby: 'Made with ♥ by Dinhaylo' },
    onboarding: {
      title: 'Welcome to PocketElec',
      subtitle: 'Free electrical calculation tool for HK consultants',
      f1: 'Cable sizing with auto upstream/downstream totals',
      f2: 'Genset sizing with voltage-dip check',
      f3: 'Loading estimation (HK consultant format)',
      f4: 'EMSD CoP 2025 & BEC 2024 compliant',
      f5: 'Works offline · Installable · Bilingual',
      demos: 'Start with a demo project:',
      dont: "Don't show this again",
      start: 'Start Fresh'
    },
    nl: { quick: 'Quick Input', title: 'Natural Language Input',
          hint: 'Examples: "Main cable for 3x50A DBs at 80m, 5% VD" · "Genset for 200kW office, 0.85pf"' },
    dash: {
      welcome: 'Welcome back', quickstart: 'Quick start', continue: 'Continue working on',
      newProject: 'New Project', openProject: 'Open Project',
      cards: { cable: 'Cable Sizing', cableDesc: 'Size mains & sub-mains with CoP 2025 voltage-drop check.',
               genset: 'Genset Sizing', gensetDesc: 'Rating + voltage-dip check for step motor loads.',
               loading: 'Loading Estimation', loadingDesc: 'Connected load & max demand (BEC 2024).' }
    },
    cable: {
      title: 'Cable Sizing',
      addBtn: '+ Add Loading',
      importFromLoading: 'Import from Loading Estimation',
      name: 'Loading name', current: 'Ib (A)', length: 'Length (m)',
      phase: 'Phase', size: 'Size (mm²)', upstream: 'Upstream of', lighting: 'Lighting?',
      ownVD: 'Own VD%', totalVD: 'Total VD%', copperLoss: 'I²R (W)',
      totalLoss: 'Total I²R (W)', loading: 'Loading %', It: 'It (A)',
      suggest: 'Suggest size', auto: 'Auto', actions: 'Actions',
      summary: 'Cable Summary', emptyHint: 'No loadings yet. Click "Add Loading" to begin.',
      warnVD: 'Voltage drop exceeds limit'
    },
    genset: {
      title: 'Genset Sizing',
      addLoad: '+ Add Load',
      loadName: 'Load', kW: 'kW', pf: 'PF', startType: 'Start Type',
      isStep: 'In step?', runningKVA: 'Running kVA', avgPF: 'Average PF',
      stepStart: 'Step-start kVA', required: 'Required kVA',
      suggested: 'Suggested Standard', dipLimit: 'Voltage-dip limit (%)',
      Xd: 'Sub-transient Xd″', pfTarget: 'Genset rated PF',
      diversity: 'Overall diversity', emptyHint: 'Add connected loads to compute genset rating.'
    },
    loading: {
      title: 'Loading Estimation', addItem: '+ Add Item',
      category: 'Category', area: 'Area (m²)', wpm2: 'W/m²',
      qty: 'Qty', watt: 'W/item', pf: 'PF', diversity: 'Diversity',
      connected: 'Connected kW', demand: 'Demand kW', pfCol: 'PF',
      totals: 'Totals', overall: 'Overall diversity',
      maxDemandKVA: 'Max Demand (kVA)', maxDemandA: 'Max Demand (A)'
    },
    projects: {
      title: 'My Projects', new: '+ New Project', open: 'Open', export: 'Export JSON',
      import: 'Import JSON', delete: 'Delete', empty: 'No saved projects yet.',
      confirmDelete: 'Delete this project? This cannot be undone.'
    },
    settings: {
      title: 'Settings',
      theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeSystem: 'System',
      lang: 'Language', vdLimit: 'VD limit — overall (%)',
      vdLimitLight: 'VD limit — lighting (%)',
      autoSave: 'Auto-save changes', about: 'About'
    },
    phases: { '1': 'Single-phase', '3': 'Three-phase' }
  },
  'zh-TW': {
    app: { version: '版本' },
    nav: { dashboard: '概覽', cable: '電纜設計', genset: '發電機選型', loading: '負載估算', projects: '我的項目', settings: '設定' },
    common: {
      add: '加入', remove: '移除', delete: '刪除', save: '儲存', cancel: '取消',
      apply: '套用', close: '關閉', name: '名稱', notes: '備註', edit: '編輯',
      duplicate: '複製', export: '匯出', import: '匯入', print: '列印',
      none: '— 無 —', yes: '是', no: '否', new: '新增', back: '返回',
      project: '項目', revision: '修訂版', client: '客戶', ref: '項目編號',
      total: '合計', summary: '摘要', warning: '警告', ok: '通過', fail: '不通過'
    },
    footer: { changelog: '更新紀錄', feedback: '意見反饋', madeby: 'Dinhaylo 用 ♥ 製作' },
    onboarding: {
      title: '歡迎使用 PocketElec',
      subtitle: '專為香港顧問設計的免費電氣計算工具',
      f1: '電纜設計（自動上游/下游匯總）',
      f2: '發電機選型（含電壓跌落檢查）',
      f3: '負載估算（香港顧問慣用格式）',
      f4: '符合 EMSD CoP 2025 及 BEC 2024',
      f5: '離線使用 · 可安裝 · 雙語介面',
      demos: '從示例項目開始：',
      dont: '不再顯示',
      start: '從空白開始'
    },
    nl: { quick: '智能輸入', title: '自然語言輸入', hint: '例如：「80m 主纜供 3x50A DB，5% VD」·「200kW 辦公室，PF 0.85」' },
    dash: {
      welcome: '歡迎回來', quickstart: '快速開始', continue: '繼續',
      newProject: '新項目', openProject: '開啟項目',
      cards: { cable: '電纜設計', cableDesc: '依 CoP 2025 計算主/支線電纜及電壓降檢查。',
               genset: '發電機選型', gensetDesc: '含電壓跌落檢查的容量計算。',
               loading: '負載估算', loadingDesc: '依 BEC 2024 計算連接負載與最大需求。' }
    },
    cable: {
      title: '電纜設計', addBtn: '+ 加入負載', importFromLoading: '從負載估算匯入',
      name: '負載名稱', current: 'Ib (A)', length: '長度 (m)',
      phase: '相數', size: '截面 (mm²)', upstream: '上游電纜', lighting: '照明？',
      ownVD: '本段 VD%', totalVD: '累計 VD%', copperLoss: 'I²R (W)',
      totalLoss: '累計 I²R (W)', loading: '負荷率 %', It: 'It (A)',
      suggest: '建議尺寸', auto: '自動', actions: '操作',
      summary: '電纜匯總表', emptyHint: '尚未有負載。按「加入負載」開始。',
      warnVD: '電壓降超出上限'
    },
    genset: {
      title: '發電機選型', addLoad: '+ 加入負載',
      loadName: '負載', kW: 'kW', pf: 'PF', startType: '啟動方式',
      isStep: '計入步階？', runningKVA: '運行 kVA', avgPF: '平均 PF',
      stepStart: '步階啟動 kVA', required: '所需 kVA',
      suggested: '建議標準值', dipLimit: '電壓跌落限值 (%)',
      Xd: '次暫態電抗 Xd″', pfTarget: '發電機額定 PF',
      diversity: '整體利用率', emptyHint: '加入連接負載以計算容量。'
    },
    loading: {
      title: '負載估算', addItem: '+ 加入項目',
      category: '類別', area: '面積 (m²)', wpm2: 'W/m²',
      qty: '數量', watt: 'W/單位', pf: 'PF', diversity: '利用率',
      connected: '連接 kW', demand: '需求 kW', pfCol: 'PF',
      totals: '合計', overall: '整體利用率',
      maxDemandKVA: '最大需求 (kVA)', maxDemandA: '最大需求 (A)'
    },
    projects: {
      title: '我的項目', new: '+ 新項目', open: '開啟', export: '匯出 JSON',
      import: '匯入 JSON', delete: '刪除', empty: '尚無已儲存項目。',
      confirmDelete: '刪除此項目？此動作無法復原。'
    },
    settings: {
      title: '設定',
      theme: '主題', themeLight: '淺色', themeDark: '深色', themeSystem: '跟隨系統',
      lang: '語言', vdLimit: 'VD 上限 — 總體 (%)',
      vdLimitLight: 'VD 上限 — 照明 (%)',
      autoSave: '自動儲存', about: '關於'
    },
    phases: { '1': '單相', '3': '三相' }
  }
};

function deepGet(obj, path) {
  return path.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : undefined), obj);
}

let currentLang = getSettings().lang || 'en';
subscribe(() => { currentLang = getSettings().lang || 'en'; });

export function setLang(l) {
  if (!STRINGS[l]) return;
  setSettings({ lang: l });
  currentLang = l;
  document.documentElement.lang = l;
  applyI18n(document);
}

export function t(key, params = {}) {
  const s = deepGet(STRINGS[currentLang], key)
         ?? deepGet(STRINGS.en, key) ?? key;
  return typeof s === 'string'
    ? s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
    : s;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (typeof val === 'string') el.textContent = val;
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
}

export const getLang = () => currentLang;
