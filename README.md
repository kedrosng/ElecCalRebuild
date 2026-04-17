# PocketElec — HK Electrical Calculation Tool

PocketElec is a free, no-login, browser-based electrical calculation tool for
Hong Kong MEP / electrical consultants. It replaces error-prone Excel
spreadsheets and targets compliance with:

- **EMSD Code of Practice for the Electricity (Wiring) Regulations 2025 (CoP 2025)**
- **Building Energy Code 2024 (BEC 2024)**

> ⚠️ **Note on this rebuild.** This is a ground-up rewrite (v2.0.0) of the
> original PocketElec (v1 hosted at `app.dinhaylo.com`). The original source
> could not be accessed when this version was built. Formulas implemented here
> follow the published EMSD CoP 2025 / BEC 2024 conventions (documented inline
> in `public/js/formulas.js`). **If any coefficient needs to match legacy v1
> behaviour exactly, patch `public/js/cable-data.js` (data tables) and/or
> `public/js/formulas.js` (formulas) — they are intentionally isolated to
> make this a one-file diff.**

## Features

| Module | What it does |
|---|---|
| **Cable Sizing** | Editable loading table, auto size selection (CoP Appendix 6), live voltage-drop and copper-loss calculation, cascading totals from downstream → upstream, CoP-limit warnings. |
| **Genset Sizing** | Running-kVA + step-start kVA + voltage-dip check (`Vdip ≈ Xd″ · Sstart / Sgen`), next-standard-size suggestion. |
| **Loading Estimation** | HK-consultant-style table with area × W/m² or qty × W, per-category diversity, connected load, demand kW/kVA and max demand current. |

Shared capabilities:

- Save / load unlimited projects locally (`localStorage`)
- JSON backup & restore (Projects → Export / Import)
- Excel export (all sheets) and consultant-style PDF report (revision, client, date, project ref.)
- Bilingual EN / 繁體中文
- Dark / light / system theme
- **Works offline** (service worker) and **installable PWA**
- Natural-language quick input (“Main cable for 3×50A DBs at 80m”)
- 3 demo projects with one-click load

## Stack

Vanilla HTML / CSS / ES modules. Tailwind is loaded via Play CDN for quick
iteration and swapped for a compiled build before a real production deploy.
Excel & PDF libraries (SheetJS / jsPDF) are loaded lazily on first export to
keep initial payload tiny.

**No build step is required** — the entire app runs from the `public/`
directory as static files. This maximises portability and makes the code
trivial to audit.

## Run locally

```bash
# any static server works; included script uses npx serve
npm run dev          # http://localhost:5173
# or:
python3 -m http.server -d public 5173
```

Open the URL, let the service worker install once, then you can go offline.

## Deploy

### Vercel

```bash
npm install -g vercel
vercel --prod
```

The included `vercel.json` serves `public/` as the site root and disables
caching on `sw.js`.

### Netlify

Drag-and-drop the `public/` folder into Netlify, or:

```bash
netlify deploy --prod --dir=public
```

### Cloudflare Pages / GitHub Pages / any static host

Just point the host at `public/`.

## Project layout

```
public/
├── index.html              ← shell + templates
├── manifest.webmanifest    ← PWA metadata
├── sw.js                   ← offline service worker
├── css/styles.css
├── icons/                  ← PWA icons
└── js/
    ├── app.js              ← bootstrap, router, shell, theme
    ├── router.js
    ├── store.js            ← projects & settings (localStorage)
    ├── i18n.js             ← EN / 繁體中文
    ├── cable-data.js       ← ALL reference tables (auditable)
    ├── formulas.js         ← ALL calculations (auditable)
    ├── demos.js            ← 3 demo projects
    ├── nl.js               ← natural-language quick input
    ├── export.js           ← Excel + PDF (lazy-loaded libs)
    └── modules/
        ├── dashboard.js
        ├── cable-sizing.js
        ├── genset-sizing.js
        ├── loading-estimation.js
        ├── projects.js
        └── settings.js
```

## Formulas used

All formulas are documented inline in `public/js/formulas.js`; a summary:

### Cable voltage drop (CoP Appendix 6, table method)
```
Vd (V)  = mV/A/m × I × L / 1000
VD (%)  = Vd / V_nominal × 100        (V_nominal = 380 V 3-phase, 220 V 1-phase)
```

### Copper loss (I²R, 70 °C conductor)
```
3-phase:  P (W) = 3 × I² × (R_kmΩ × L_m / 1000)
1-phase:  P (W) = 2 × I² × (R_kmΩ × L_m / 1000)
```

### Cable selection
```
Design current Ib ≤ It = Iz × Ca × Cg × Cf
(and) VD at full load ≤ CoP limit (5 % overall, 3 % lighting)
```

### Cascading totals (downstream → upstream)
```
node.totalCopperLoss = node.ownCopperLoss + Σ children.totalCopperLoss
node.totalVDpct      = node.ownVDpct      + max(children.totalVDpct)   (worst path)
```

### Genset sizing (ISO 8528, BS 7698)
```
Running kVA    = Σ P_kW / PF
Step-start kVA = Σ (P_motor / PF_motor × start_factor)
Voltage dip %  ≈ Xd″ × (S_step_start / S_genset) × 100
Required kVA   = max(Running kVA / PF_target, Step-start kVA × Xd″ / dip_limit)
```

### Loading estimation (BEC 2024 convention)
```
Per-item connected kW = (area × W/m²)  OR  (qty × W/item)  divided by 1000
Demand kW per item    = connected kW × diversity
Total demand kW       = Σ demand kW × overall diversity
Max demand kVA        = Σ (demand kW / PF)
Max demand A (3-ph)   = kVA × 1000 / (√3 × 380)
```

## Updating reference tables

If the v1 spreadsheet uses slightly different coefficients, edit:

- **Cable ratings (Iz) and mV/A/m** → `public/js/cable-data.js` → `CABLE_TABLE`
- **CoP VD limits** → `public/js/cable-data.js` → `VD_LIMIT_PCT`, `VD_LIMIT_LIGHTING_PCT`
- **Diversity factors** → `public/js/cable-data.js` → `DIVERSITY`
- **LPD / SPD defaults** → `public/js/cable-data.js` → `LPD_DEFAULTS`, `SPD_DEFAULTS`
- **Motor start factors** → `public/js/cable-data.js` → `MOTOR_START`
- **Standard genset kVA ladder** → `public/js/formulas.js` → `STD_KVA`

## License

MIT © Dinhaylo
