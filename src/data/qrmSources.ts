// Common sources of man-made noise (QRM) with the signature each leaves on an SDR or receiver.
// Descriptions are qualitative; the sketches are schematic illustrations, not recordings.
export type Shape = 'comb' | 'broadband' | 'blocks' | 'ticks' | 'carrier'
export interface QrmSource { id: string; name: string; shape: Shape; sounds: string; looks: string; where: string; clues: string; fix: string }
export const QRM_META = { revision: '2026-10-19', source: 'ARRL RFI Book and general amateur RFI practice; sketches are schematic' }

export const QRM_SOURCES: QrmSource[] = [
  { id: 'smps', name: 'Switch-mode power supplies, chargers, LED drivers', shape: 'comb',
    sounds: 'Buzzing or whistling birdies that drift in pitch as you tune across them; sometimes steady.',
    looks: 'A comb of evenly spaced spikes, spacing equal to the supply’s switching frequency (often tens of kHz), fading as frequency rises. The spacing may wander with load.',
    where: 'Anywhere in the house, including cheap USB chargers, LED bulbs, laptop bricks, dimmers, solar-panel optimisers.',
    clues: 'Changes when the load changes (brightness, charging state). Measure the spacing between spikes: it is the switching frequency (use the Harmonic finder tab).',
    fix: 'Unplug suspects one by one. Replace with a better-filtered unit; add a ferrite choke on the lead; keep the supply and its wiring away from the antenna.' },
  { id: 'inverter', name: 'Solar inverters and battery chargers', shape: 'comb',
    sounds: 'Raspy hash that appears at sunrise and stops at dusk (solar) or during charging.',
    looks: 'Strong comb of spikes with a wide skirt around each, across many bands; often strongest at lower HF.',
    where: 'Roof or garage inverter, its DC and AC cabling (these act as antennas).',
    clues: 'Follows the sun or the charger. Turning the AC isolator off should make it vanish.',
    fix: 'Ask the installer for filtering, ferrites on DC and AC cables, and shorter cable runs; check for a compliant (CE/FCC) unit. Document with recordings before and after.' },
  { id: 'plc', name: 'Powerline internet adapters (PLT/PLC)', shape: 'blocks',
    sounds: 'Steady “rushing” hash over wide chunks of spectrum.',
    looks: 'Wide blocks, several MHz across, with deliberate notches in places; present around the clock while the adapters are plugged in.',
    where: 'The adapter and every mains wire it uses, including the neighbours’ on the same phase.',
    clues: 'Disappears when the adapters are unplugged; the blocks look the same day and night.',
    fix: 'Unplug and use Wi-Fi or Ethernet, or switch to a model with amateur-band notches that really works. Persistent cases go to your regulator.' },
  { id: 'dsl', name: 'VDSL / ADSL telephone-line broadband', shape: 'blocks',
    sounds: 'Smooth hiss, often stronger when the house is quiet.',
    looks: 'Broad plateaus of noise with sharp edges at fixed frequencies; the same shape from the same exchange.',
    where: 'Telephone lines and modems on a street; neighbours’ lines as well as your own.',
    clues: 'Stable shape that does not change with your own switching. May get worse on rainy days.',
    fix: 'Check your own modem and wiring first; otherwise report to the telephone company or regulator with screenshots and dates.' },
  { id: 'arc', name: 'Powerline arcing and failing insulators', shape: 'broadband',
    sounds: 'Crackling, frying or buzzing at twice the mains frequency; worse in humid weather or wind.',
    looks: 'Broadband noise that rises toward lower frequencies and can reach VHF; time-domain view shows bursts locked to the mains cycle.',
    where: 'A pole, transformer, or old pin insulator several hundred metres away; directional.',
    clues: 'Loudest near the pole; changes with weather; an AM radio held near the line crackles.',
    fix: 'Do not touch anything. Record where it is loudest and report the pole number to the electricity utility, which is usually obliged to fix it.' },
  { id: 'fence', name: 'Electric fences and fence energisers', shape: 'ticks',
    sounds: 'Sharp tick roughly once per second.',
    looks: 'Vertical lines on the waterfall at regular intervals, spread over a wide band.',
    where: 'Farmland, neighbours’ gardens, animal enclosures; the fence wire is the antenna.',
    clues: 'Regular timing, often about one per second.',
    fix: 'Politely ask the owner to check the energiser, earth and insulators; poor insulation is the usual culprit.' },
  { id: 'motor', name: 'Brush motors, thermostats, doorbells, aquarium and heating controls', shape: 'broadband',
    sounds: 'Crackles or rasping that starts and stops with the appliance.',
    looks: 'Broadband bursts, strongest at lower frequencies.',
    where: 'Anything with sparking contacts or a switching thermostat.',
    clues: 'Strongly correlated with when the device runs.',
    fix: 'Fit a suitable mains filter or ferrite, replace worn brushes, or the appliance.' },
  { id: 'digital', name: 'Ethernet/LAN switches, cameras, set-top boxes, PCs', shape: 'carrier',
    sounds: 'Steady tones or a fixed “carrier” that stays on all the time.',
    looks: 'Narrow spikes at multiples of a clock frequency, steady in amplitude; often more at VHF.',
    where: 'Home network gear; long cables carry the noise into the antenna.',
    clues: 'Persists with the antenna disconnected (it is also picked up by the radio’s own leads). Check with the antenna off, then on a battery.',
    fix: 'Ferrites on cables, shielded cable, keep equipment away from the radio and antenna, power one device off at a time.' },
]

export interface Step { title: string; detail: string }
export const QRM_STEPS: Step[] = [
  { title: 'Make sure the noise is yours to solve', detail: 'Is it the receiver? Disconnect the antenna and fit a dummy load or terminated input: if the noise stays, it is inside the shack (computer, supply, radio leads). If it vanishes, it is arriving via the antenna.' },
  { title: 'Is it your house? Cut the power', detail: 'Run the radio from a battery and turn the mains off at the main breaker (warn the household, save work first). If the noise disappears, it is inside your home: switch circuits back on one at a time. If it stays, it is outside.' },
  { title: 'Write down the pattern', detail: 'Which bands? When does it start and stop (sunrise, evening, when the neighbour is home)? Is it steady, ticking, or buzzing? Record a short waterfall each time; dated evidence is what a regulator or utility will ask for.' },
  { title: 'Measure the spacing', detail: 'Evenly spaced spikes (a “comb”) mean a switching supply or clock. The spacing between them is the fundamental frequency. Use the Harmonic finder to see which bands it hits and where it falls near your listening frequency.' },
  { title: 'Go and find it with a portable receiver', detail: 'Take a battery portable radio (AM broadcast band, or an SDR with a small loop) and walk. The noise gets louder as you approach. Inside the house, an AM radio on a quiet frequency is a surprisingly good “sniffer”.' },
  { title: 'Use direction', detail: 'A small loop (see the DIY tab) has a deep null perpendicular to its plane: rotate it for the quietest point; the source lies along the loop axis in one of two directions. Take bearings from two places and cross them.' },
  { title: 'Confirm, then fix or report', detail: 'Switch the suspected device off and see the noise drop. If it is yours, filter or replace it. If it belongs to a neighbour, be friendly and bring a recording. If it is a utility fault or a certified product that fails the limits, report it to the utility or your national regulator.' },
]

export interface Tip { title: string; body: string }
export const SNIFFER_TIPS: Tip[] = [
  { title: 'Shielded (Faraday) loop for HF', body: 'Make a single turn of coax, about 30–50 cm across, with a small gap cut in the shield at the top (keep the centre conductor joined across it and insulated). Feed it from the bottom with a short coax lead. Used as a directional receiving antenna it is far less sensitive to local electric noise than a wire, and it has deep nulls broadside. Keep the loop within the λ/10 size limit shown in the calculator.' },
  { title: 'Near-field probe', body: 'A tiny loop (2–4 cm) at the end of a coax, or a few turns around a ferrite rod, pointed at cables and devices, tells you which one is radiating. It is uncalibrated, so use it only to compare one spot with another.' },
  { title: 'SDR settings that help', body: 'Use a wide span with a waterfall, switch on max-hold or averaging to reveal intermittent noise, and keep gain low enough that the strongest signals don’t overload the front end. Many low-cost SDRs need an upconverter or a direct-sampling mode to receive HF; check your model. Run the SDR and laptop from battery and keep their leads short, since they can create noise themselves.' },
  { title: 'AM radio and ferrite-rod “sniffer”', body: 'An old portable AM radio tuned to a quiet frequency buzzes loudly near a noise source. Its ferrite-rod antenna is directional, which makes it a cheap, effective finder inside the house.' },
  { title: 'Antenna as a diagnostic', body: 'Compare noise on two different antennas (for example a loop against your wire antenna). Noise that is far stronger on the wire is coming through its electric-field pickup, and noise that is the same on both is more likely to be far away or in the receiver.' },
  { title: 'Safety', body: 'Never open mains equipment or climb poles. Switching circuits off at the breaker is safe for diagnosis; touching pole-top equipment or damaged lines is not. Leave anything on the supply side of your meter to the utility.' },
]
