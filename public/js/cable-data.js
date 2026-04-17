// ============================================================================
// cable-data.js
// HK EMSD CoP 2025 (Table-based) cable reference data for PVC/XLPE copper
// conductors. Values are taken from the publicly-available EMSD CoP Appendix
// tables and BS 7671 where CoP cross-references. Every coefficient is listed
// in one place so it can be audited and, if a user wants to match a specific
// legacy spreadsheet, patched in a single file.
// ----------------------------------------------------------------------------
// Columns:
//   size  : conductor CSA in mm²
//   Iz_3p : current-carrying capacity, 3-phase, Ref. Method C (clipped direct/tray, 30°C ambient, PVC)
//   Iz_1p : current-carrying capacity, 1-phase, 2-core + earth, same method
//   mV_3p : voltage drop mV/A/m, 3-phase (resultant, including reactance)
//   mV_1p : voltage drop mV/A/m, 1-phase (resultant, including reactance)
//   R     : conductor resistance at 70 °C, Ω/km
// ============================================================================

export const CABLE_TABLE = [
  // size, Iz_3p, Iz_1p, mV_3p, mV_1p, R
  { size: 1.5,   Iz_3p: 16,   Iz_1p: 19.5, mV_3p: 25,    mV_1p: 29,    R: 14.50 },
  { size: 2.5,   Iz_3p: 22,   Iz_1p: 27,   mV_3p: 15,    mV_1p: 18,    R: 8.87  },
  { size: 4,     Iz_3p: 30,   Iz_1p: 36,   mV_3p: 9.5,   mV_1p: 11,    R: 5.52  },
  { size: 6,     Iz_3p: 38,   Iz_1p: 46,   mV_3p: 6.4,   mV_1p: 7.3,   R: 3.69  },
  { size: 10,    Iz_3p: 52,   Iz_1p: 63,   mV_3p: 3.8,   mV_1p: 4.4,   R: 2.19  },
  { size: 16,    Iz_3p: 69,   Iz_1p: 85,   mV_3p: 2.4,   mV_1p: 2.8,   R: 1.38  },
  { size: 25,    Iz_3p: 90,   Iz_1p: 112,  mV_3p: 1.50,  mV_1p: 1.75,  R: 0.870 },
  { size: 35,    Iz_3p: 111,  Iz_1p: 138,  mV_3p: 1.10,  mV_1p: 1.25,  R: 0.627 },
  { size: 50,    Iz_3p: 133,  Iz_1p: 168,  mV_3p: 0.81,  mV_1p: 0.93,  R: 0.463 },
  { size: 70,    Iz_3p: 168,  Iz_1p: 213,  mV_3p: 0.57,  mV_1p: 0.63,  R: 0.321 },
  { size: 95,    Iz_3p: 201,  Iz_1p: 258,  mV_3p: 0.42,  mV_1p: 0.46,  R: 0.232 },
  { size: 120,   Iz_3p: 232,  Iz_1p: 299,  mV_3p: 0.34,  mV_1p: 0.38,  R: 0.184 },
  { size: 150,   Iz_3p: 258,  Iz_1p: 344,  mV_3p: 0.275, mV_1p: 0.31,  R: 0.150 },
  { size: 185,   Iz_3p: 294,  Iz_1p: 392,  mV_3p: 0.225, mV_1p: 0.25,  R: 0.121 },
  { size: 240,   Iz_3p: 344,  Iz_1p: 461,  mV_3p: 0.175, mV_1p: 0.19,  R: 0.0935 },
  { size: 300,   Iz_3p: 394,  Iz_1p: 530,  mV_3p: 0.15,  mV_1p: 0.16,  R: 0.0754 },
  { size: 400,   Iz_3p: 470,  Iz_1p: 634,  mV_3p: 0.125, mV_1p: 0.135, R: 0.0606 },
  { size: 500,   Iz_3p: 543,  Iz_1p: 734,  mV_3p: 0.105, mV_1p: 0.115, R: 0.0493 },
  { size: 630,   Iz_3p: 629,  Iz_1p: 852,  mV_3p: 0.090, mV_1p: 0.098, R: 0.0401 }
];

// Nominal HK voltages.
export const V_LL = 380; // 3-phase line-to-line
export const V_LN = 220; // 1-phase

// CoP 2025 cl. 13 — maximum permissible VD for consumer installations
export const VD_LIMIT_PCT = 5.0;       // overall from origin to point of use (lighting & power)
export const VD_LIMIT_LIGHTING_PCT = 3.0; // commonly applied internal limit for lighting circuits

// Typical HK installation-method derating factor (user-tunable in UI)
export const DEFAULT_GROUPING_FACTOR = 1.0;
export const DEFAULT_AMBIENT_FACTOR  = 1.0;

// ---- Loading-estimation reference values (HK consultant practice) ---------
// BEC 2024 Appendix A — allowable lighting power density (W/m²) — indicative
export const LPD_DEFAULTS = {
  office: 8.0,
  corridor: 5.0,
  carpark: 3.0,
  retail: 11.0,
  restaurant: 10.0,
  hotel_room: 6.5,
  classroom: 8.5,
  plantroom: 4.0,
  warehouse: 5.5,
  residential: 6.0
};

// Small-power allowance (W/m²) — typical HK consultant practice
export const SPD_DEFAULTS = {
  office: 25,
  retail: 30,
  carpark: 3,
  restaurant: 40,
  hotel_room: 20,
  classroom: 25,
  residential: 30
};

// Diversity factors (HK common practice / IEE Guide)
export const DIVERSITY = {
  lighting: 0.90,
  small_power: 0.70,
  air_con: 0.85,
  lift_motor: 0.80,
  water_pump: 0.70,
  kitchen: 0.60,
  misc: 0.80
};

// Starting kVA / running kVA factor for common motor starts (rule-of-thumb)
export const MOTOR_START = {
  DOL: 6.5,        // direct-on-line
  StarDelta: 2.5,
  SoftStart: 3.0,
  VFD: 1.5
};
