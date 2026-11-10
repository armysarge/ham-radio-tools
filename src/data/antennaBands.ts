// Practical construction choices, not band allocations, performance rankings or multiband guarantees.
export const ANTENNA_BANDS_REVISION = '2026-10-26'
export type AntennaBandId = 'dipole' | 'inverted-v' | 'vertical' | 'loop' | 'efhw' | 'jpole' | 'qfh' | 'moxon' | 'yagi' | 'quad'
interface BandGuide {
  choices: { bands: string; use: string }[]
  limit: string
  reference: { title: string; url: string }
}
const wireReference = { title: 'ARRL HF wire antennas', url: 'https://www.arrl.org/hf-wire' }
const vhfReference = { title: 'ARRL VHF and UHF antennas', url: 'https://www.arrl.org/vhf-and-uhf' }
const beamReference = { title: 'ARRL HF beams', url: 'https://www.arrl.org/hf-beams' }
export const MOXON_REFERENCE = { title: 'L. B. Cebik, W4RNL, Designing Moxon Rectangles by Equation and by Model', url: 'https://antenna2.github.io/cebik/content/moxon/moxgen.html' }

export const ANTENNA_BANDS: Record<AntennaBandId, BandGuide> = {
  dipole: {
    choices: [
      { bands: '40 m, 20 m and 10 m', use: 'Good starting choices for a simple HF wire antenna at home or in the field, with manageable wire lengths.' },
      { bands: '80 m, 30 m, 17 m, 15 m and 12 m', use: 'Also useful when cut for the chosen band; 80 m needs substantially more space and suitable supports.' },
    ],
    limit: 'A basic resonant dipole is normally designed for one band. Other-band matching and radiation patterns must be checked; height and orientation matter as much as the band name.',
    reference: wireReference,
  },
  'inverted-v': {
    choices: [
      { bands: '80 m, 40 m and 20 m', use: 'Practical HF choices when one high centre support is available and a straight dipole span is awkward.' },
      { bands: '30 m through 10 m', use: 'Shorter versions suit portable masts and smaller sites; use a separate design frequency for each intended band.' },
    ],
    limit: 'This is a sloping dipole, not an automatically multiband antenna. Apex height, leg clearance and ground conditions affect the result; low placement does not guarantee a particular range.',
    reference: wireReference,
  },
  vertical: {
    choices: [
      { bands: '2 m and 70 cm', use: 'Compact ground-plane builds for vertically polarised local FM and repeater operation, sized separately for the chosen band.' },
      { bands: '20 m and 10 m; 40 m with more height', use: 'Useful HF choices where an upright radiator and a suitable radial system fit the site. A 6 m version is also practical.' },
    ],
    limit: 'The simple quarter-wave radiator and radials here are for one design frequency. Lower HF bands require a much taller radiator; loading, traps and multiband matching need their own documented design.',
    reference: { title: 'ARRL HF verticals', url: 'https://www.arrl.org/hf-vertical' },
  },
  loop: {
    choices: [
      { bands: '80 m and 40 m', use: 'Established full-wave wire-loop choices when a large perimeter and enough supports are available.' },
      { bands: '20 m, 15 m and 10 m', use: 'Smaller full-wave loops need less wire and can suit more compact installations.' },
    ],
    limit: 'This tool designs a full-wave loop, not a small tuned magnetic loop. Horizontal versus vertical mounting and the feed arrangement change its useful directions; higher-band use needs matching and pattern checks.',
    reference: { title: 'ARRL HF loop antennas', url: 'https://www.arrl.org/hf-loop-antennas' },
  },
  efhw: {
    choices: [
      { bands: '40 m fundamental; often 20 m, 15 m and 10 m harmonics', use: 'A common portable multiband target with a suitable matching transformer and a wire length tuned for the installation.' },
      { bands: '80 m fundamental or a single 20 m band', use: 'An 80 m version offers a longer-wire option; a dedicated 20 m version is easier to accommodate when space is limited.' },
    ],
    limit: 'Harmonic bands are possibilities, not guaranteed low-SWR coverage. Transformer response, choking and trimming matter. 30 m, 17 m and 12 m are not automatically covered by a 40 m harmonic design.',
    reference: wireReference,
  },
  jpole: {
    choices: [
      { bands: '2 m', use: 'The usual first choice for a home-built J-pole for local FM and repeater work, with vertical polarisation.' },
      { bands: '70 cm or 6 m, as separately sized builds', use: 'A 70 cm version is compact; a 6 m version requires a much taller structure.' },
    ],
    limit: 'This calculator is a single-band J-pole. A low SWR on a harmonic does not ensure a useful pattern: use a documented dual-band design if you need both 2 m and 70 cm from one antenna.',
    reference: { title: 'ARRL VHF omnidirectional antennas', url: 'https://www.arrl.org/vhf-omnidirectional' },
  },
  qfh: {
    choices: [
      { bands: '137 MHz satellite-receive region', use: 'The documented 137.55 MHz reference build is aimed at broad skyward reception. This is a receive application outside the amateur transmit bands.' },
    ],
    limit: 'Check which satellite signals are currently active before building. Other-band QFH designs require appropriate geometry, feed phasing and measurement; proportional scaling here does not validate amateur-band transmission.',
    reference: { title: 'EDN 137 MHz receive prototype (2011)', url: 'https://www.edn.com/home-weather-satellite-receiver/' },
  },
  moxon: {
    choices: [
      { bands: '20 m, 15 m and 10 m', use: 'A compact directional wire beam for HF. Lower bands need more support and turning clearance.' },
      { bands: '6 m and 2 m', use: 'Smaller versions can use uniform-diameter rod or tubing. Measure the tip gaps carefully.' },
    ],
    limit: 'Size each build for one band. Check the match and rear rejection over the frequencies you use, since they can peak at different points.',
    reference: MOXON_REFERENCE,
  },
  yagi: {
    choices: [
      { bands: '6 m, 2 m and 70 cm', use: 'Common choices for a directional beam; VHF/UHF elements and booms are smaller than their HF equivalents.' },
      { bands: '20 m, 15 m and 10 m', use: 'Established HF beam choices when a larger boom, support and turning clearance are available.' },
    ],
    limit: 'This starting design is for one band. Choose polarisation for the activity and use a documented, optimised design for final construction, particularly at UHF; no gain or bandwidth is predicted here.',
    reference: vhfReference,
  },
  quad: {
    choices: [
      { bands: '20 m, 15 m and 10 m', use: 'Common HF quad choices for directional operation when full-wave loops and spreaders fit the site.' },
      { bands: '6 m and 2 m', use: 'Smaller purpose-built quads are also possible; the spreaders, feed arrangement and dimensions still need careful construction.' },
    ],
    limit: 'The calculator estimates a single-band array. Adding nested loops for several bands introduces coupling and matching issues; follow a documented multiband design rather than combining these estimates.',
    reference: beamReference,
  },
}
