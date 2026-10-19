// Build guide for a small shielded (Faraday) loop used as a directional noise-hunting antenna for an SDR or receiver.
// Practical amateur build advice, paraphrased; sizes follow the small-loop rule in src/lib/qrm.ts.
export const SNIFFER_BUILD_META = { revision: '2026-10-19', source: 'ARRL Antenna Book (small and shielded receiving loops) and general amateur RFI-hunting practice; paraphrased' }

export const SNIFFER_PARTS: { item: string; why: string }[] = [
  { item: 'About 1.1–1.3 m of flexible 50 Ω coax (RG-58 or RG-174 for a small loop)', why: 'It is both the loop and its shield. Thin, flexible coax is easy to shape. Size it from the calculator: perimeter = the loop’s circumference plus about 10 cm.' },
  { item: 'A non-metal hoop or frame (plastic hoop, PVC pipe bent to a ring, or a wooden/plastic cross)', why: 'Holds the coax in a circle. Metal frames distort the loop’s nulls.' },
  { item: 'A short plastic or wooden handle (PVC pipe, 50 cm to 1.5 m)', why: 'Lets you rotate the loop by hand and keeps you out of the field. A mast that can turn is a bonus.' },
  { item: 'A BNC or SO-239 panel connector, mounted in a small plastic box or on a plastic plate', why: 'The place where the loop’s two ends join the feed coax.' },
  { item: '1–2 m of coax to the receiver and a ferrite choke (a stack of snap-on beads or a ferrite toroid with 6–10 turns)', why: 'The choke stops the feed coax from acting as a second antenna, which would fill in the nulls.' },
  { item: 'Solder, heat-shrink tubing, self-amalgamating tape, cable ties, a multimeter', why: 'For clean joints, sealing the shield gap, and the continuity tests below.' },
]

export const SNIFFER_STEPS: { title: string; detail: string }[] = [
  { title: 'Choose the size', detail: 'Use the size calculator above. A hoop 30 cm across (about 0.95 m round) keeps the nulls sharp up to roughly 30 MHz; a 50 cm hoop (1.6 m round) is better below about 19 MHz and picks up more signal. Do not go bigger than the limit for your highest frequency.' },
  { title: 'Cut the coax and mark its middle', detail: 'Cut the coax to the loop’s circumference plus about 10 cm. Find the exact middle and mark it with tape: this point will be the top of the loop, directly opposite the feed point.' },
  { title: 'Cut the shield gap', detail: 'At the mark, carefully slit and remove a ring of outer jacket about 10 mm wide. Cut through the braid (and any foil) all the way round and lift away 5–10 mm of it, so the braid on the left of the mark is completely separate from the braid on the right. Do not nick the white insulation or the centre wire underneath. The centre conductor must stay whole.' },
  { title: 'Test the gap before going further', detail: 'With your multimeter on its lowest resistance range: the centre conductor should read close to 0 Ω from one end of the coax to the other; the braid at one end should read open (no connection) to the braid at the other end; and each end’s braid should read open to its own centre conductor. If the braid at the two ends reads as connected, a strand is bridging the gap: find and cut it.' },
  { title: 'Seal the gap', detail: 'Cover the exposed insulation with a layer of heat-shrink or self-amalgamating tape, then re-cover with tape for strength. The gap must stay open (no metal bridging it) and must stay dry.' },
  { title: 'Mount it on the frame', detail: 'Bend the coax into a circle on the hoop with the gap at the very top, and tape or tie it down every 5–10 cm. The two ends come together at the bottom, about 2 cm apart, near the connector box. Keep the circle round and the ends symmetrical.' },
  { title: 'Make the feed connections at the bottom', detail: 'Strip both ends back to the centre conductor and braid. Join the two braids together and solder them to the connector’s ground (outer) terminal. Solder the centre conductor of ONE end to the connector’s centre pin. Solder the centre conductor of the OTHER end to the ground terminal as well. The loop is then: feed centre pin, around the inside of the shield, back to ground.' },
  { title: 'Check the finished loop', detail: 'Between the connector’s centre pin and its ground you should now read a very low resistance (a fraction of an ohm to an ohm or two, the loop wire itself). Between the pin and ground the reading must not be an open circuit, and the shield must still be open across the top gap, which you proved in step 4.' },
  { title: 'Add the choke and the handle', detail: 'Wind the feed coax 6–10 turns through the ferrite (or clip on several snap-on beads) about 20–30 cm from the loop. Fasten the loop to the handle with plastic ties or nylon bolts so the loop’s plane is vertical and the coax leaves straight down.' },
  { title: 'Connect it and test on a known signal', detail: 'Power the receiver from a battery if you can, with the shortest lead you can manage. Tune to a steady signal such as a broadcast station. Rotate the loop slowly: the signal is strongest when the loop’s plane points at the station and drops sharply to a null when you turn the loop side-on. A good small loop gives a clear, narrow null.' },
  { title: 'Hunt the noise', detail: 'Tune to the noise and rotate for the null. The source lies along the line through the centre of the loop at right angles to its plane, in one of two directions (the null is symmetrical). Move several metres and repeat; where the two lines cross is the source. A near-field walk with the loop confirms it.' },
]

export const SNIFFER_TROUBLE: { problem: string; fix: string }[] = [
  { problem: 'No null, or only a shallow one', fix: 'Common-mode pickup on the feed coax is the usual cause. Add or improve the choke, shorten the coax, run the receiver and laptop from batteries, and keep your body and the cable out of the loop’s plane. Also check the loop is no bigger than the λ/10 limit for your frequency.' },
  { problem: 'Signals are very weak', fix: 'A small loop gives little signal by nature. Turn up the SDR’s gain, use a short feed line, or add a low-noise broadband preamplifier after the choke. Do not add gain before you have a null you trust.' },
  { problem: 'Nulls look different on every band', fix: 'Expected at the top of the range: nulls sharpen at low frequencies and loosen as the loop approaches a tenth of a wavelength. Use a smaller hoop for the high bands.' },
  { problem: 'The loop picks up noise from everywhere', fix: 'The shield gap is probably shorted (a strand of braid across it) or the shield has a short to the centre conductor. Repeat the continuity tests from step 4.' },
]

export const SNIFFER_VARIANTS: { name: string; body: string }[] = [
  { name: 'Quick wire loop (no shield)', body: 'A turn or two of insulated wire on a hoop connected to a BNC, with a choke on the feed. It works as a first try but also picks up local electric-field noise, so its nulls are less trustworthy than a shielded loop’s.' },
  { name: 'Ferrite-rod “sniffer”', body: 'An old AM radio’s ferrite rod directs its pickup along the rod; rotate it for a null. It only covers the AM band but is excellent for finding noise inside the house.' },
  { name: 'Small near-field probe', body: 'Make the same shielded-loop construction at 2–3 cm across on the end of a short piece of coax (or semi-rigid cable): shield gap opposite the cable, centre conductor returned to the shield at the tip. Wave it near cables and devices to see which one radiates. It is uncalibrated, so use it only to compare one spot with another.' },
  { name: 'Larger loop for low bands', body: 'Below about 5 MHz a hoop 1 m across is still a small loop. Support it on a plastic or wooden frame rather than a hoop; the same gap-and-feed construction applies.' },
]

export const SNIFFER_SAFETY = 'Never climb poles or open mains equipment while hunting. Keep every part of the loop and its handle well away from power lines. Do not hold or place the loop near a transmitting antenna: it can receive far more RF than a receiver input can take, so use an attenuator and keep the receiver’s gain low when strong signals are nearby.'
