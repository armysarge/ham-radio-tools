export type BalunTemplateId = 'coax-1-1' | 'wire-1-1' | 'guanella-4-1' | 'ruthroff-4-1' | 'ruthroff-9-1'
export interface BalunTemplate {
  id: BalunTemplateId
  title: string
  ratio: 1 | 4 | 9
  sections: 1 | 2
  conductor: 'coax' | 'pair' | 'trifilar'
  type: 'current' | 'voltage'
  summary: string
  build: string[]
  terminals: [string, string][]
  limit: string
  source: { title: string; url: string }
}

export const BALUN_TEMPLATES: BalunTemplate[] = [
  {
    id: 'coax-1-1', title: '1:1 coax current choke', ratio: 1, sections: 1, conductor: 'coax', type: 'current',
    summary: 'A 1:1 common-mode choke uses continuous coax to suppress current on the outside of the shield. It does not transform impedance.',
    build: ['Pass the whole coax through the core opening for every turn. Keep the jacket, braid and dielectric intact throughout the winding.', 'Separate the cable ends, respect the specified bend radius and add strain relief. Strip only at the connector or antenna terminals.'],
    terminals: [['Radio centre → antenna terminal 1', 'Continuous centre conductor'], ['Radio shield → antenna terminal 2', 'Continuous shield; no gap, tap or core connection']],
    limit: 'The choking action depends on the exact cable, core and winding layout. A continuity check does not establish RF suppression.',
    source: { title: 'Peter Miles, VK6YSF — HF coax choking balun', url: 'https://vk6ysf.com/balun_choke_balun_hf.htm' },
  },
  {
    id: 'wire-1-1', title: '1:1 paired-wire current', ratio: 1, sections: 1, conductor: 'pair', type: 'current',
    summary: 'Two insulated conductors travel together through one choke section. Each conductor has the same number of turns.',
    build: ['Mark both ends of each wire before winding the pair together in the same direction. Every paired pass through the hole is one turn per conductor.', 'Keep the two wires closely coupled and use a documented spacing/insulation system for the required transmission-line impedance.'],
    terminals: [['Input hot A1 → output A2', 'First continuous conductor'], ['Input return B1 → output B2', 'Second continuous conductor; no cross-connection']],
    limit: 'Current balancing requires sufficient common-mode impedance. The source article uses an L15 core; this calculator does not reproduce its measured performance.',
    source: { title: 'Peter Miles, VK6YSF — 1:1 Guanella current balun', url: 'https://vk6ysf.com/balun_guanella_current_1-1.htm' },
  },
  {
    id: 'guanella-4-1', title: '4:1 Guanella current', ratio: 4, sections: 2, conductor: 'pair', type: 'current',
    summary: 'Two independent core sections use equal turns. The transmission lines connect in parallel at the input and in series at the balanced output.',
    build: ['Wind two identical paired-wire sections on separate cores or separate core stacks. Do not substitute one shared core for these two independent sections.', 'Mark the first section A/B at the input and C/D at the output; mark the second E/F and G/H. Keep the listed conductor identity and winding sense.'],
    terminals: [['Input hot', 'A + E'], ['Input return / coax shield', 'B + F'], ['Floating series junction', 'D + G; no separate ground connection'], ['Balanced antenna terminals', 'C and H']],
    limit: 'The 4:1 ratio comes from parallel/series connections, not unequal winding turns. Line impedance and common-mode performance still need verification.',
    source: { title: 'Peter Miles, VK6YSF — two-core 1:4 Guanella current balun', url: 'https://vk6ysf.com/balun_guanella_current_1-4.htm' },
  },
  {
    id: 'ruthroff-4-1', title: '4:1 Ruthroff voltage', ratio: 4, sections: 1, conductor: 'pair', type: 'voltage',
    summary: 'Two equal windings on one core are series-connected at their midpoint. Twice the input voltage appears across the balanced output in the ideal model.',
    build: ['Wind two insulated conductors together in the same sense. Mark corresponding starts A1 and B1, and finishes A2 and B2 before making connections.', 'Join A2 to B1 and connect that midpoint to the input return. A1 is both input hot and one output terminal; B2 is the other output terminal.'],
    terminals: [['Input hot and output terminal 1', 'A1'], ['Input return / coax shield', 'A2 + B1'], ['Output terminal 2', 'B2']],
    limit: 'This voltage balun does not force equal antenna currents with an unbalanced load. It is not an isolated transformer or a 4:1 current balun.',
    source: { title: 'Peter Miles, VK6YSF — 4:1 Ruthroff voltage balun', url: 'https://vk6ysf.com/balun_4-1.htm' },
  },
  {
    id: 'ruthroff-9-1', title: '9:1 voltage unun', ratio: 9, sections: 1, conductor: 'trifilar', type: 'voltage',
    summary: 'A trifilar autotransformer is unbalanced on both sides. Three equal series windings give an ideal 3:1 voltage ratio and 9:1 impedance ratio.',
    build: ['Mark starts A1, B1 and C1 and finishes A2, B2 and C2. Wind all three insulated wires together in the same sense, with equal turns.', 'Connect A2 + B1 to the radio hot terminal. Join B2 + C1 internally. The antenna wire connects to C2; A1 is the shared input return and antenna counterpoise/return.'],
    terminals: [['Input shield and counterpoise / return', 'A1'], ['Input hot / first series tap', 'A2 + B1'], ['Internal second series junction', 'B2 + C1'], ['Antenna wire / high-impedance hot terminal', 'C2']],
    limit: 'A 50-to-450 Ω example does not predict a random wire\'s complex impedance. A tuner is often needed. Provide a defined return path and check common-mode current; this unun does not replace a 1:1 choke or a 49:1 EFHW transformer.',
    source: { title: 'Peter Miles, VK6YSF — 9:1 voltage unun', url: 'https://vk6ysf.com/unun_9-1.htm' },
  },
]

export const BALUN_TEMPLATE_REVISION = '2026-10-26'
