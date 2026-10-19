// What to build antennas from: wire, feedline, connectors, supports. Practical amateur guidance, paraphrased.
// Verdicts are for typical home-station use; datasheets and your power level decide the details.
export const MATERIALS_META = { revision: '2026-10-19', source: 'ARRL Antenna Book (wire, transmission lines, baluns and supports) and general amateur construction practice; paraphrased. Figures that depend on the product are left to its datasheet.' }
export type Verdict = 'best' | 'good' | 'ok' | 'avoid'
export interface Choice { name: string; verdict: Verdict; note: string }
export interface Group { id: string; title: string; intro: string; choices: Choice[] }
export type MatAntenna = 'dipole' | 'inverted-v' | 'vertical' | 'loop' | 'efhw' | 'jpole'

export const GROUPS: Group[] = [
  { id: 'wire', title: 'Wire for the radiating element', intro: 'The wire carries RF current, so it must be a good conductor, strong enough not to stretch or break, and survive the weather. 14 AWG (1.6 mm) is the usual choice for HF antennas up to full legal power.', choices: [
    { name: 'Copper-clad steel (CCS), 14 AWG / 1.6 mm', verdict: 'best', note: 'Very strong and does not stretch, so the length (and resonance) stays put on long spans. RF flows in the copper skin, so losses are low at HF. Best for permanent dipoles and long runs.' },
    { name: 'Hard-drawn solid copper, 14–12 AWG', verdict: 'good', note: 'Excellent conductor and long-lived. Can slowly stretch and sag on long spans, and breaks if kinked, so avoid sharp bends.' },
    { name: 'Stranded copper, insulated (antenna wire or building wire)', verdict: 'good', note: 'Flexible and easy to handle; ideal for portable and field antennas. Soft copper stretches over time. The insulation slows the wave, so a dipole of insulated wire resonates lower: cut it a few percent shorter, then trim.' },
    { name: 'Bare stranded copper or Flex-Weave type', verdict: 'good', note: 'Strong, flexible and low loss. Keep the weave sealed from water at the ends to stop corrosion creeping in.' },
    { name: 'Speaker (zip) cable', verdict: 'ok', note: 'Fine for temporary, low-power use. Thin, weak and the conductors are close together; do not use it for permanent or high-power antennas.' },
    { name: 'Aluminium wire', verdict: 'avoid', note: 'Light but brittle, hard to solder and corrodes at connections. Not recommended for a home build.' },
    { name: 'Thin wire (thinner than about 0.5 mm)', verdict: 'avoid', note: 'Breaks, and heats at power. Use at least 1.0 mm for low-power portable work.' },
  ] },
  { id: 'feedline', title: 'Feedline (cable to the antenna)', intro: 'Every dB lost in the cable is power not radiated, and loss rises with frequency, with a thinner cable and with a mismatch. As a rule, thicker cable with a foam or air dielectric has the lowest loss. Always choose 50 Ω coax for transmitters unless you are deliberately using ladder line with a tuner.', choices: [
    { name: 'LMR-400, Belden 9913/9913F, Ecoflex-10 (low-loss 10 mm coax)', verdict: 'best', note: 'Lowest loss of the common amateur cables: best for long runs, VHF/UHF, and anywhere every dB counts. Heavier and stiffer; use the stranded-centre types where the cable flexes.' },
    { name: 'RG-213 / RG-8 (thick, solid-dielectric coax)', verdict: 'best', note: 'Roughly half the loss of RG-58, tough, cheap and widely available. A very good all-round choice for HF and 6 m up to fairly long runs; not the best at VHF/UHF over long distances.' },
    { name: 'RG-8X / mini-8 (thin foam coax)', verdict: 'good', note: 'A compromise: lighter and easier to handle than RG-213, lower loss than RG-58. Good for HF runs up to about 15–20 m.' },
    { name: 'RG-58', verdict: 'ok', note: 'Fine for short HF runs and portable use. Loss is high at VHF/UHF, so avoid it for long or high-frequency runs.' },
    { name: 'RG-174 and other very thin coax', verdict: 'ok', note: 'Only for very short (about 1–3 m) QRP or portable leads: the loss is high and it cannot take much power.' },
    { name: 'Open-wire / ladder line (300–600 Ω) with a balanced tuner', verdict: 'good', note: 'Extremely low loss even at a high SWR: the classic feed for a multi-band doublet. Keep it clear of metal and use a tuner designed for balanced output. Not suitable for most VHF/UHF work.' },
    { name: '75 Ω TV coax (RG-6, RG-59) as the main transmitting feedline', verdict: 'avoid', note: 'Does not match 50 Ω equipment. It is useful only as the quarter-wave matching section in the loop design.' },
  ] },
  { id: 'connectors', title: 'Connectors', intro: 'A badly made or wet connector wastes more power than a few metres of cable.', choices: [
    { name: 'N-type connectors', verdict: 'best', note: 'Constant impedance and well sealed: the right choice above about 150 MHz and for any outdoor joint.' },
    { name: 'PL-259 / SO-239 (“UHF” connectors)', verdict: 'good', note: 'Fine for HF and 6 m and cheap. Not constant-impedance, so avoid them at 144 MHz and above. Solder them properly and seal them.' },
    { name: 'BNC', verdict: 'good', note: 'Convenient for portable and receive-only use, and for QRP. Not for high power.' },
    { name: 'Twist-on or compression connectors with no sealing', verdict: 'avoid', note: 'Water gets in. Seal every outdoor joint (see weatherproofing below).' },
  ] },
  { id: 'chokes', title: 'Common-mode chokes and baluns', intro: 'A 1:1 current balun or choke at the feed point keeps RF off the outside of the coax. This keeps the pattern predictable and the shack quieter. It does not add gain.', choices: [
    { name: 'Choke made from coax wound on large ferrite toroids (31 or 43 mix) or stacked snap-on ferrite cores', verdict: 'best', note: 'Home-buildable and effective. Typical builds use 6–10 turns of the coax itself; the ferrite mix, size and number of turns decide the bands it works on and the power it handles. Check the core’s datasheet for your band.' },
    { name: 'Commercial 1:1 current balun', verdict: 'good', note: 'Convenient and weatherproofed. Choose one rated for your power and for the bands you use.' },
    { name: 'A few turns of coax coiled in the air', verdict: 'ok', note: 'Helps a little at the highest HF bands only. Better than nothing, but not a proper choke.' },
    { name: '4:1 or 1:1 “voltage” baluns on a coax-fed dipole', verdict: 'avoid', note: 'They force equal voltages rather than equal currents and can make common-mode current worse. Use a current choke.' },
  ] },
  { id: 'supports', title: 'Insulators, rope and supports', intro: 'The antenna should be mechanically boring: it must not move, stretch or touch metal.', choices: [
    { name: 'Polyester (Dacron) or Dyneema rope, UV-stabilised', verdict: 'best', note: 'Does not stretch, rots slowly and holds a knot. Use it for the end ropes of a dipole.' },
    { name: 'Ceramic, HDPE or UV-resistant plastic insulators', verdict: 'best', note: 'Place one at each end of every wire and at the centre. Dog-bone and egg shapes are common and cheap.' },
    { name: 'Fibreglass telescopic poles and masts', verdict: 'good', note: 'Non-conductive and light. Good for verticals, J-poles, loops and temporary dipoles.' },
    { name: 'Nylon rope', verdict: 'ok', note: 'Stretches and sags with weather, which changes the resonance. Acceptable for a temporary antenna.' },
    { name: 'Polypropylene (“builder’s”) rope', verdict: 'avoid', note: 'Breaks down quickly in sunlight.' },
    { name: 'Metal masts and wires within a metre of the antenna', verdict: 'avoid', note: 'They detune the antenna and distort its pattern. Keep metal well clear.' },
  ] },
  { id: 'weather', title: 'Weatherproofing and safety', intro: 'Water in coax and corrosion at joints are the two most common reasons an antenna that worked last year does not work now.', choices: [
    { name: 'Self-amalgamating tape plus UV-resistant tape or heat-shrink with adhesive lining', verdict: 'best', note: 'Seals connectors and joints completely. Use mastic or butyl underneath for outdoor N and PL-259 joints.' },
    { name: 'Drip loop in the coax before it enters the building', verdict: 'good', note: 'Stops water running along the cable into the shack.' },
    { name: 'Stainless-steel or plated hardware', verdict: 'good', note: 'Plain steel rusts and stains. Use anti-oxidant paste on aluminium joints.' },
    { name: 'Electrical (PVC) tape alone', verdict: 'avoid', note: 'Unravels in sunlight and heat and lets water in.' },
    { name: 'Putting the antenna where it could fall on or touch power lines', verdict: 'avoid', note: 'Keep the antenna and its supports farther from any power line than their full height, and never work on or near them. Keep the ends of high-impedance antennas out of reach of people and pets, and connect a lightning arrestor and a ground for the station.' },
  ] },
]

// What each antenna type needs, in order of importance.
export const PICKS: Record<MatAntenna, { best: string[]; extra?: string }> = {
  dipole: { best: ['Wire: 14 AWG copper-clad steel (permanent) or insulated stranded copper (portable).', 'Feedline: RG-213 or LMR-400-type coax for runs over about 20 m or on 6 m; RG-8X or RG-58 for short HF runs.', 'A 1:1 current choke at the feed point and end insulators with Dacron rope.'], extra: 'A dipole is the most forgiving antenna to build: use the best wire you can afford, keep the coax leaving at a right angle to the wire for as far as you can, and trim the lengths with an analyser.' },
  'inverted-v': { best: ['Wire as for a dipole; insulated wire is common because the legs slope near objects.', 'Feedline: RG-213 or LMR-400-type coax; the centre support (fibreglass or wooden mast) takes the weight of the coax.', 'Keep the ends well out of reach: they are the high-voltage points.'], extra: 'A fibreglass pole or a tree limb makes a good centre support. Avoid metal masts: they distort the pattern and pull the resonance down.' },
  vertical: { best: ['Radiator: aluminium tubing (telescoping sections), or a fibreglass pole carrying a wire.', 'Radials: any copper wire (14–18 AWG, insulated or bare); the more you have the better.', 'Feedline: low-loss coax with a good choke at the base. A short feed is best; a ground-mounted vertical may have a long run, so use a low-loss cable.'], extra: 'Use a non-conductive base insulator and mount the base at a safe height or enclose it, keeping radials and base out of reach. Metal-framed supports near the radiator spoil the pattern.' },
  loop: { best: ['Wire: stranded copper or CCS wire, supported on rigid spreaders (fibreglass poles, bamboo or PVC).', 'Matching: 75 Ω coax for the quarter-wave section (RG-6 or RG-11 type foam coax, velocity factor about 0.8, or RG-59 solid, about 0.66).', 'Feedline: RG-213 or LMR-400-type 50 Ω coax with a choke at the feed point.'], extra: 'A square loop in the horizontal plane is easier to hang from trees; a vertical-plane loop needs fewer supports. Use equal-length spreader arms and keep the wire taut.' },
  efhw: { best: ['Wire: thin, light wire is fine because the current at the feed end is small, but use 1.0 mm or thicker for permanent installations (insulated copper or CCS).', 'Transformer: a 49:1 or 64:1 autotransformer on a large ferrite toroid (type 43 or 52 are common) in a weatherproof plastic box, with an SO-239 or N connector.', 'Feedline: any good 50 Ω coax with a choke close to the transformer; the shack end can use thinner cable if the run is short.'], extra: 'Seal the transformer box: water in it is the commonest reason an EFHW stops working. Counterpoise wire: any insulated wire, laid out away from the radiator.' },
  jpole: { best: ['Tubing: ½-inch (15 mm) copper water pipe with elbows and a tee, brazed or soldered (a hardware-shop build).', 'Alternative: 300 Ω twin-lead or 450 Ω ladder line cut to length (a flexible roll-up J-pole), using the line’s velocity factor.', 'Feedline: a short length of low-loss coax such as LMR-400 or RG-213 with an N connector, and a choke at the feed point.'], extra: 'Mount the J-pole on a non-metal support away from other objects, with the top as high and clear as you can manage. Weatherproof the open ends and the feed point.' },
}
