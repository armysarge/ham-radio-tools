// Build guides for parts made from everyday materials. Plain, cautious guidance: every one ends with “measure it”.
export type DiyId = 'coil' | 'toroid' | 'foilcap' | 'aircap' | 'dummy' | 'choke'
export interface DiyProject {
  id: DiyId; title: string; blurb: string
  items: string[] // what to gather
  steps: string[]
  check: string[] // how to test it
  cautions: string[]
  honest: string // what this will and will not do
}
export const DIY_REVISION = '2026-10-19'
export const DIY: DiyProject[] = [
  { id: 'coil', title: 'Air-core coil', blurb: 'The simplest inductor: wire wound on a plastic tube.',
    items: ['Enamelled (magnet) wire or solid insulated hook-up wire, 0.5–1.5 mm', 'A former that is not metal and not wet: PVC or ABS pipe, a pen barrel, a pill bottle, a cardboard tube (seal it with glue or varnish)', 'Tape or a drop of hot glue / super glue', 'Fine sandpaper or a craft knife to bare the ends of enamelled wire'],
    steps: ['Pick the former and wire in the calculator. The turns, the winding length and the wire to cut come out.', 'Poke two small holes at the start, thread the wire through and leave 5–8 cm for a lead.', 'Wind the turns side by side (or with the spacing you chose), pulling snug. Count as you go.', 'Pass the end through two holes at the finish, secure, and leave a lead. Glue or varnish the winding so it cannot shift.', 'Sand the enamel off the last 1 cm of each lead until the copper shows.'],
    check: ['Measure with an LC meter or an antenna analyser with an inductance function. Stretch or squeeze the winding to trim: closer turns raise it.', 'No meter? Resonate it with a known capacitor and read the frequency (the Reactance & Resonance tool gives L from f and C).'],
    cautions: ['Enamel dust and burnt-enamel fumes are unpleasant: sand outdoors or ventilated.', 'Keep it away from metal; a metal tin or screw nearby lowers the inductance and the Q.'],
    honest: 'Wheeler’s formula is good to about 1 % for a coil longer than 0.8 × its diameter. Your result depends on neat winding and on stray capacitance, so expect a few percent out.' },
  { id: 'toroid', title: 'Toroid inductor or transformer', blurb: 'Wire on a ring-shaped core: compact, and the field stays inside.',
    items: ['A toroid core from a hobby supplier (the table gives the turns for each size)', 'Enamelled wire; check the wire fits through the hole the required number of times', 'Fine sandpaper, tape, a ruler'],
    steps: ['Choose the core and wire in the calculator. The turns and the wire length come out.', 'Cut the wire to length plus 10 cm for leads.', 'Pass the wire through the hole: each trip through the centre is one turn (do not count the outside).', 'Space the turns evenly around the ring, and keep the two ends apart; for an inductor, that spacing lets you trim by spreading or squeezing the turns.', 'Strip the enamel from both ends, and tin them.'],
    check: ['Measure with an LC meter or an analyser. If it reads too high, remove a turn; too low, add one.', 'Iron-powder cores (T- numbers) stay stable; ferrite cores (FT- numbers) have much higher AL and are for chokes and broadband transformers, not tuned circuits.'],
    cautions: ['The coating on small cores chips easily; sharp wire ends can cut it.', 'Don’t run a core near its power limit: it heats, and iron powder can drift permanently in value.'],
    honest: 'AL varies ±10–25 % between parts, so the turns are a start. Two or three trial windings are normal.' },
  { id: 'foilcap', title: 'Foil-and-film capacitor', blurb: 'Two sheets of kitchen foil with plastic between them.',
    items: ['Aluminium kitchen foil', 'Thin plastic: a freezer bag, polyethylene cling film, or a PET laminating pouch', 'Scissors, a ruler, a micrometer or a caliper', 'Flat card or a book, clips, and two bare wire leads', 'Your capacitance meter, if you have one'],
    steps: ['Measure the film thickness with a micrometer (fold ten layers and divide) and enter it.', 'Cut the foil to the calculated square. Leave a narrow tab on each sheet for a lead.', 'Lay one foil sheet down with its tab to the left, cover it with film that extends past the edges all round, then the second foil sheet with its tab to the right.', 'Press flat under card and a book. Wrinkles and air pockets reduce the capacitance.', 'To use it, press a lead against each tab and clip the whole thing so it cannot move.'],
    check: ['Measure with a capacitance meter: expect a value near the calculation, typically within 20 %, and drifting as the film is pressed.', 'Roll it up with the leads outward for a compact part, but then the value changes: measure again.'],
    cautions: ['Thin plastic punctures: do not use this on a transmitter output or a power supply.', 'It is suitable for low-power receive circuits, test jigs and learning only. Use a mica or ceramic capacitor for anything that matters.', 'Foil edges are sharp.'],
    honest: 'The value follows the film thickness, which stretches and squashes, so this is rarely better than ±20 %. An air capacitor is more repeatable.' },
  { id: 'aircap', title: 'Air-variable capacitor', blurb: 'Interleaved metal plates that you turn: a tuning capacitor.',
    items: ['Aluminium or brass sheet (flashing, a baking tray, an old tin lid): thin and flat', 'A long bolt (the shaft), nuts and washers (the spacers)', 'Tin snips and a file, a drill, a compass for marking circles', 'An insulating base: plastic or wood', 'A knob (a bottle cap with a screw)'],
    steps: ['Choose the maximum capacitance, the plate radii and the gap. The calculator gives the number of plates.', 'Mark and cut semicircular plates with a smaller semicircle cut out at the centre; file every edge smooth and burr-free.', 'Stack the stator plates (fixed) with washers of the gap thickness between them, joined by a bolt along the back edge.', 'Mount the rotor plates the same way on the shaft, so they slide between the stator plates without touching.', 'Mount the shaft in two bearings (holes in plastic) with the knob at one end, and add wiper wire for the rotor connection.', 'Turn: capacitance is largest with the plates fully meshed.'],
    check: ['Measure maximum and minimum with a meter. The minimum is set mainly by stray capacitance and is several picofarads at least.', 'Check by eye that no plates touch at any angle; even one contact makes a short.'],
    cautions: ['Keep the gap as wide as is practical: small gaps arc at transmit voltages.', 'File every plate edge round and smooth; points arc first.', 'Rated voltage in the calculator is conservative for clean smooth plates in dry air.'],
    honest: 'The calculation ignores fringing, which makes the real value a little higher, and plate flatness changes it. The result is a trimmable tuning part.' },
  { id: 'dummy', title: 'Dummy load (resistor array)', blurb: 'A non-radiating 50 Ω load for testing a transmitter without an antenna.',
    items: ['Non-inductive resistors: carbon film or carbon composition, 1–2 W; never wirewound', 'A metal box or a can, with a coax connector (SO-239 or BNC) in the lid', 'Thick wire for the short leads, and a bolt or standoff to join the ground', 'Solder and a soldering iron'],
    steps: ['Enter the resistors you have. The tool lists series/parallel arrangements close to 50 Ω.', 'Mount the connector in the box. Solder the resistors in the arrangement chosen, keeping every lead as short as possible.', 'Join one end of the array to the connector centre pin and the other end to the box ground, by the shortest path.', 'Close the box so it works as a shield.'],
    check: ['With an ohmmeter: it should read very near 50 Ω.', 'With an antenna analyser: SWR should be below 1.3 on the HF bands you will use it on. It rises with frequency as the leads add inductance.'],
    cautions: ['It gets hot: use short key-downs, and never exceed the sustained power shown. Test at low power first.', 'Keep it clear of anything that can melt. Carbon resistors can fail open: re-test regularly.', 'Never use a dummy load that reads very different from 50 Ω on the test you intended; let the transmitter see a proper load.'],
    honest: 'This is for HF checks and keyed tune-up at modest power. Heat gets worse with continuous carrier: oil-filled cans and purpose-made loads are for high power.' },
  { id: 'choke', title: 'Common-mode choke (coax on a ferrite core)', blurb: 'Stops RF from riding on the outside of the coax.',
    items: ['A ferrite toroid, mix 43 for most HF, large enough for your coax (FT240-43 suits RG-58 and RG-8X)', 'Your coax, with its connectors already fitted', 'Tape or cable ties'],
    steps: ['Choose the core and enter the coax diameter. The most turns that fit in one layer come out.', 'Wind the coax through the core: each time through the centre is one turn; 7–10 turns is a common HF choice.', 'Keep the turns evenly spread and the ends apart.', 'Tape the winding down.', 'Put it close to the antenna feed point for an antenna choke, or at the radio for noise on the shack side.'],
    check: ['Compare the SWR and the noise level before and after.', 'Check temperature after a minute of transmitting: it should be cool.'],
    cautions: ['A core that runs hot is saturating or is too small for the power: use a larger core or more turns.', 'Do not cut the coax: the shield stays whole.'],
    honest: 'A choke’s blocking impedance changes a lot with frequency and mix: the reactance shown is an upper bound from the core’s AL, and lossy ferrite behaves mostly resistively at HF.' },
]
