// ============================================================================
// demos.js — one-click demo projects.
// ============================================================================
import { emptyProject, saveProject, uid } from './store.js';

export const DEMOS = [
  {
    name: 'Typical Office Floor',
    description: '1,200 m² office — lighting, power, FCU branches, 3 DBs on a main riser.',
    build: () => {
      const p = emptyProject('Typical Office Floor');
      p.client = 'Demo Client';
      p.projectRef = 'DEMO-OFF-01';
      p.revision = 'A';

      // Loading estimation
      p.loading.items = [
        { id: uid(), name: 'General lighting',  category: 'lighting',    area: 1200, wpm2: 8,  qty:'', watt:'', pf: 0.95, diversity: '' },
        { id: uid(), name: 'Small power (GPO)', category: 'small_power', area: 1200, wpm2: 25, qty:'', watt:'', pf: 0.85, diversity: '' },
        { id: uid(), name: 'FCU (AHU branch)',  category: 'air_con',     area: '',   wpm2: '', qty: 12, watt: 1200, pf: 0.85, diversity: '' },
        { id: uid(), name: 'Pantry equipment',  category: 'kitchen',     area: '',   wpm2: '', qty: 4,  watt: 2500, pf: 0.9, diversity: '' }
      ];
      p.loading.overallDiversity = 0.9;

      // Cables
      const mainId = uid(), dbLightId = uid(), dbPowerId = uid(), dbAcId = uid();
      p.cables = [
        { id: mainId,     name: 'Main riser',    current: 250, length: 60, phase:'3', size: 120, upstreamId:'',       isLighting:false, notes:'From LV switchboard' },
        { id: dbLightId,  name: 'DB-Lighting',   current: 40,  length: 45, phase:'3', size: 25,  upstreamId: mainId,   isLighting:true,  notes:'Typ. lighting DB' },
        { id: dbPowerId,  name: 'DB-Power',      current: 100, length: 40, phase:'3', size: 35,  upstreamId: mainId,   isLighting:false, notes:'GPOs + small power' },
        { id: dbAcId,     name: 'DB-FCU',        current: 80,  length: 55, phase:'3', size: 35,  upstreamId: mainId,   isLighting:false, notes:'FCU loads' },
        { id: uid(),      name: 'Lighting ckt 1',current: 20,  length: 35, phase:'1', size: 4,   upstreamId: dbLightId, isLighting:true,  notes:'Corridor' },
        { id: uid(),      name: 'GPO ckt 1',     current: 25,  length: 30, phase:'1', size: 6,   upstreamId: dbPowerId, isLighting:false, notes:'' }
      ];

      return p;
    }
  },
  {
    name: 'Residential Block',
    description: '40-unit residential block — riser + typical flat DB feeds.',
    build: () => {
      const p = emptyProject('Residential Block');
      p.client = 'Demo Client'; p.projectRef = 'DEMO-RES-01'; p.revision = 'A';

      p.loading.items = [
        { id: uid(), name: 'Flats × 40 (connected)', category: 'residential', area: 2400, wpm2: 30, qty:'', watt:'', pf: 0.9, diversity: 0.4 },
        { id: uid(), name: 'Common lighting',        category: 'lighting',    area: 600,  wpm2: 5,  qty:'', watt:'', pf: 0.95, diversity: '' },
        { id: uid(), name: 'Lift motors',            category: 'lift_motor',  area:'',    wpm2:'',  qty: 2, watt: 15000, pf: 0.85, diversity: '' },
        { id: uid(), name: 'Transfer pumps',         category: 'water_pump',  area:'',    wpm2:'',  qty: 2, watt: 7500,  pf: 0.85, diversity: '' }
      ];
      p.loading.overallDiversity = 0.85;

      const mainId = uid(), riserId = uid();
      p.cables = [
        { id: mainId,  name: 'Bulk supply', current: 400, length: 25, phase:'3', size: 240, upstreamId: '',      isLighting:false, notes:'From HV transformer LV' },
        { id: riserId, name: 'Residential riser', current: 300, length: 110, phase:'3', size: 185, upstreamId: mainId, isLighting:false, notes:'' },
        { id: uid(),  name: 'Lift panel',        current: 60,  length: 50, phase:'3', size: 16, upstreamId: mainId, isLighting:false, notes:'Lift motors' },
        { id: uid(),  name: 'Pump panel',        current: 35,  length: 40, phase:'3', size: 10, upstreamId: mainId, isLighting:false, notes:'' },
        { id: uid(),  name: 'Typical flat DB',   current: 30,  length: 20, phase:'1', size: 10, upstreamId: riserId, isLighting:false, notes:'Per-flat feed' }
      ];
      return p;
    }
  },
  {
    name: 'Genset Sizing Example',
    description: 'Essential load: 250 kW load w/ 2 × 15 kW chiller motors step-start (DOL).',
    build: () => {
      const p = emptyProject('Genset Sizing Example');
      p.client = 'Demo Client'; p.projectRef = 'DEMO-GEN-01'; p.revision = 'A';
      p.genset.opts = { pfTarget: 0.8, Xd: 0.15, dipLimit: 15, diversity: 0.9 };
      p.genset.loads = [
        { id: uid(), name: 'Essential lighting', kW: 30,  pf: 0.95, startType: 'VFD',        isStep: false },
        { id: uid(), name: 'Essential power',    kW: 80,  pf: 0.85, startType: 'VFD',        isStep: false },
        { id: uid(), name: 'AHU fan',            kW: 22,  pf: 0.85, startType: 'VFD',        isStep: false },
        { id: uid(), name: 'Chiller motor #1',   kW: 55,  pf: 0.85, startType: 'StarDelta', isStep: true  },
        { id: uid(), name: 'Chiller motor #2',   kW: 55,  pf: 0.85, startType: 'StarDelta', isStep: true  },
        { id: uid(), name: 'Fire pump',          kW: 22,  pf: 0.85, startType: 'DOL',       isStep: true  }
      ];
      return p;
    }
  }
];

export function installDemos(demo) {
  const p = demo.build();
  saveProject(p);
  return p;
}
