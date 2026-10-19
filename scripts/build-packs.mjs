// Builds the bundled national band-plan packs in src/data/packs/*.json.
// Each table below was transcribed from the official text named in its `source` (retrieved 2026-10-19) and is
// reproduced as facts (frequency limits, powers); descriptive text is paraphrased. Run: node scripts/build-packs.mjs
// To refresh a country: re-read the source, edit its table here, bump REVISION, run the script, run the tests.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const REVISION = '2026-10-19'
const OUT = new URL('../src/data/packs/', import.meta.url)
mkdirSync(OUT, { recursive: true })
const hz = { kHz: (v) => Math.round(v * 1e3), MHz: (v) => Math.round(v * 1e6), GHz: (v) => Math.round(v * 1e9) }

const BAND_NAMES = [
  ['2200 m', 135.7e3, 137.8e3], ['630 m', 472e3, 479e3], ['160 m', 1.8e6, 2.0e6], ['80 m', 3.5e6, 3.8e6], ['75 m', 3.8e6, 4.0e6], ['60 m', 5.3e6, 5.5e6], ['40 m', 7.0e6, 7.3e6],
  ['30 m', 10.1e6, 10.15e6], ['20 m', 14e6, 14.35e6], ['17 m', 18.068e6, 18.168e6], ['15 m', 21e6, 21.45e6], ['12 m', 24.89e6, 24.99e6], ['10 m', 28e6, 29.7e6], ['10 m (above)', 29.7e6, 30e6],
  ['8 m', 40.675e6, 40.685e6], ['6 m', 50e6, 54e6], ['4 m', 70e6, 70.5e6], ['2 m', 144e6, 148e6], ['1.25 m', 219e6, 225e6], ['70 cm', 420e6, 450e6], ['33 cm', 902e6, 928e6], ['23 cm', 1240e6, 1300e6],
  ['13 cm', 2300e6, 2450e6], ['9 cm', 3300e6, 3600e6], ['5 cm', 5650e6, 5925e6], ['3 cm', 10e9, 10.5e9], ['1.2 cm', 24e9, 24.25e9], ['6 mm', 47e9, 47.2e9], ['4 mm', 75.5e9, 81.5e9],
  ['2.5 mm', 122.25e9, 123e9], ['2 mm', 134e9, 141e9], ['1 mm', 241e9, 250e9],
]
const bandOf = (fromHz, toHz) => { const mid = (fromHz + toHz) / 2; const b = BAND_NAMES.find(([, lo, hi]) => mid >= lo && mid <= hi); return b ? b[0] : `${(fromHz / 1e6).toFixed(3)} MHz` }

const write = (id, pack) => { writeFileSync(new URL(`${id}.json`, OUT), JSON.stringify({ format: 'ham-radio-tools-pack', version: 1, kind: 'band-plan', id, revision: REVISION, ...pack }, null, 1) + '\n'); console.log(id, pack.data.segments.length, 'segments') }
const seg = (band, fromHz, toHz, use, extra = {}) => ({ band, fromHz, toHz, use, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined && v !== '')) })

// ================= United States: 47 CFR 97.301 (bands per class, ITU Region 2), 97.305 (emissions), 97.313 (power) =================
{
  const E = 'Extra', A = 'Advanced', G = 'General', T = 'Technician'
  const vhf = [[50, 54], [144, 148], [219, 220], [222, 225], [420, 450], [902, 928], [1240, 1300], [2300, 2310], [2390, 2450], [5650, 5925], [10000, 10500], [24000, 24250], [47000, 47200], [76000, 81000], [122250, 123000], [134000, 141000], [241000, 250000]]
  const access = {
    [E]: [[0.1357, 0.1378], [0.472, 0.479], [1.8, 2.0], [3.5, 4.0], [5.3515, 5.3665], [7.0, 7.3], [10.1, 10.15], [14.0, 14.35], [18.068, 18.168], [21.0, 21.45], [24.89, 24.99], [28.0, 29.7], ...vhf],
    [A]: [[0.1357, 0.1378], [0.472, 0.479], [1.8, 2.0], [3.525, 3.6], [3.7, 4.0], [5.3515, 5.3665], [7.025, 7.3], [10.1, 10.15], [14.025, 14.15], [14.175, 14.35], [18.068, 18.168], [21.025, 21.2], [21.225, 21.45], [24.89, 24.99], [28.0, 29.7], ...vhf],
    [G]: [[0.1357, 0.1378], [0.472, 0.479], [1.8, 2.0], [3.525, 3.6], [3.8, 4.0], [5.3515, 5.3665], [7.025, 7.125], [7.175, 7.3], [10.1, 10.15], [14.025, 14.15], [14.225, 14.35], [18.068, 18.168], [21.025, 21.2], [21.275, 21.45], [24.89, 24.99], [28.0, 29.7], ...vhf],
    [T]: [[3.525, 3.6], [7.025, 7.125], [21.025, 21.2], [28.0, 28.5], ...vhf],
  }
  const DATA = 'CW, RTTY, data', PHONE = 'CW, phone, image', ALL = 'CW, phone, image, RTTY, data'
  const UHF = 'MCW, phone, image, RTTY, data, SS, test', PULSE = UHF + ', pulse'
  const rows = [ // [from MHz, to MHz, emissions, note, power]
    [0.1357, 0.1378, ALL, 'Fixed locations only. Notify the Utilities Telecom Council before operating; keep 1 km from power-line-carrier lines (§97.303(g)).', '1.5 kW PEP, 1 W EIRP'],
    [0.472, 0.479, ALL, 'Fixed locations only; same utility notification as 2200 m (§97.303(g)).', '500 W PEP, 5 W EIRP'],
    [1.8, 2.0, ALL], [3.5, 3.6, DATA], [3.6, 4.0, PHONE],
    [5.3515, 5.3665, 'CW, phone, RTTY, data', 'Also the channels 5.332, 5.348, 5.373 and 5.405 MHz (§97.305), at up to 100 W ERP (§97.313(i)).', '9.15 W ERP'],
    [7.0, 7.1, DATA, 'In ITU Regions 1 and 3 only, 7.075–7.100 MHz also allows phone (§97.305(c)(3)(v)) and 7.050–7.075 MHz is limited to 200 W PEP.'], [7.1, 7.125, DATA], [7.125, 7.3, PHONE],
    [10.1, 10.15, DATA, undefined, '200 W PEP (§97.313(c)(1))'], [14.0, 14.15, DATA], [14.15, 14.35, PHONE], [18.068, 18.11, DATA], [18.11, 18.168, PHONE],
    [21.0, 21.2, DATA], [21.2, 21.45, PHONE], [24.89, 24.93, DATA], [24.93, 24.99, PHONE],
    [28.0, 28.3, DATA], [28.3, 28.5, PHONE, 'Technician HF operation is limited to 200 W PEP on 28.0–28.5 MHz (§97.313(c)(2)).'], [28.5, 29.0, PHONE], [29.0, 29.7, PHONE],
    [50.0, 50.1, 'CW only'], [50.1, 51.0, 'MCW, phone, image, RTTY, data'], [51.0, 54.0, 'MCW, phone, image, RTTY, data, test'],
    [144.0, 144.1, 'CW only'], [144.1, 148.0, 'MCW, phone, image, RTTY, data, test'],
    [219, 220, 'Data', 'Data emissions only (§97.305).', '50 W PEP (§97.313(h))'], [222, 225, 'RTTY, data, test, MCW, phone, SS, image'],
    [420, 450, UHF, 'Radiolocation has priority; power limits near some military sites (§97.313(f)).'], [902, 928, PULSE, '50 W PEP limit near White Sands Missile Range (§97.313(g)).'], [1240, 1300, UHF],
    [2300, 2310, PULSE], [2390, 2450, PULSE], [5650, 5925, PULSE], [10000, 10500, UHF], [24000, 24250, PULSE], [47000, 47200, PULSE], [76000, 81000, PULSE], [122250, 123000, PULSE], [134000, 141000, PULSE], [241000, 250000, PULSE],
  ]
  const covers = (list, a, b) => list.some(([x, y]) => a >= x - 1e-9 && b <= y + 1e-9)
  const segments = []
  for (const [from, to, modes, note, power] of rows) {
    const cuts = new Set([from, to])
    for (const list of Object.values(access)) for (const [x, y] of list) { if (x > from && x < to) cuts.add(x); if (y > from && y < to) cuts.add(y) }
    const pts = [...cuts].sort((p, q) => p - q), parts = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], who = Object.keys(access).filter((c) => covers(access[c], a, b))
      if (!who.length) continue
      const last = parts[parts.length - 1]
      if (last && last.to === a && last.who.join() === who.join()) last.to = b; else parts.push({ from: a, to: b, who })
    }
    for (const p of parts) {
      const f = hz.MHz(p.from), t = hz.MHz(p.to)
      segments.push(seg(bandOf(f, t), f, t, modes, { classes: p.who.join(', '), note, power }))
    }
  }
  for (const s of segments) if (s.fromHz >= 3.5e6 && s.toHz <= 4.0e6) s.band = '80 m'
  write('us-fcc-part97', {
    title: 'United States — FCC Part 97', jurisdiction: 'United States',
    source: 'US Code of Federal Regulations, Title 47, §§ 97.301, 97.303, 97.305, 97.313 (eCFR, current to 2026-10-01; last amended 91 FR 1430–1431, 14 Jan 2026)',
    sourceUrl: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-97', license: 'US federal regulation (public domain)',
    notes: 'Frequencies shown are for stations in ITU Region 2 (the continental US). “Classes” lists which operator classes may use each segment: Extra, Advanced (no longer issued but still valid), General and Technician (Novice lapsed). The general power limit is 1.5 kW PEP (§97.313(b)); lower limits are shown where they apply. CW may be used anywhere a licence allows (§97.305(a)); modes listed are those §97.305 authorises. Further limits (bandwidth, symbol rate, sharing duties) are in Part 97, which prevails over this summary.',
    data: { segments },
  })
}

// ================= South Africa: ICASA Radio Frequency Spectrum Regulations, Annexure I (amateur bands) =================
{
  const P = (a, b) => `Class A ${a} · Class B ${b}`
  const dBW = { 30: '30 dBW (1 kW PEP)', 26: '26 dBW (≈400 W PEP)', 20: '20 dBW (100 W PEP)' }
  const ALLX = 'All emissions except pulse and fast-scan TV'
  const rows = [ // [from, to, unit, status, power, classes, use, note]
    [135.7, 137.8, 'kHz', 'secondary', '1 W EIRP (Class A)', 'Class A', ALLX],
    [472, 479, 'kHz', 'secondary', '5 W EIRP', undefined, ALLX, 'Per WRC-12; Government Gazette 354 of 2013'],
    [1.81, 2.0, 'MHz', 'primary', dBW[30], 'Class A', ALLX, 'No Class B operation'],
    [3.5, 3.8, 'MHz', 'co-primary', P(dBW[30], dBW[20]), 'Class A, Class B', ALLX, 'Music transmission permitted'],
    [7.0, 7.2, 'MHz', 'primary', P(dBW[30], dBW[20]), 'Class A, Class B', ALLX, 'Also allocated to amateur satellites'],
    [10.1, 10.15, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', ALLX, 'No Class B operation'],
    [14.0, 14.35, 'MHz', 'primary', dBW[30] + ' (Class A)', 'Class A', ALLX, 'No Class B operation; also allocated to amateur satellites'],
    [18.068, 18.168, 'MHz', 'primary', dBW[30] + ' (Class A)', 'Class A', ALLX, 'No Class B operation'],
    [21.0, 21.45, 'MHz', 'primary', dBW[30] + ' (Class A)', 'Class A', ALLX, 'No Class B operation; also allocated to amateur satellites'],
    [24.89, 24.99, 'MHz', 'primary', dBW[30] + ' (Class A)', 'Class A', ALLX, 'No Class B operation'],
    [28.0, 29.7, 'MHz', 'primary', dBW[30] + ' (Class A)', 'Class A', ALLX, 'Class B: 28.050–28.150 and 28.300–28.500 MHz only, at 20 dBW (100 W PEP); also allocated to amateur satellites'],
    [29.7, 30.0, 'MHz', 'secondary', dBW[26], undefined, 'All emissions', 'Secondary basis during disaster exercises and emergencies'],
    [40.675, 40.685, 'MHz', 'primary', dBW[26], undefined, ALLX, 'Propagation studies only'],
    [50.0, 54.0, 'MHz', 'co-primary', '50–52 MHz: 30 dBW (1 kW PEP); 53–54 MHz: 26 dBW (≈400 W PEP); the source gives no figure for 52–53 MHz', undefined, ALLX, 'Music transmission permitted'],
    [70.0, 70.3, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions except pulse and fast-scan TV'],
    [144, 146, 'MHz', 'primary', P(dBW[30], dBW[20]), 'Class A, Class B', ALLX, 'Also allocated to amateur satellites'],
    [430, 440, 'MHz', 'co-primary', P(dBW[30], dBW[20]), 'Class A, Class B', ALLX, 'Music transmission permitted; 435–438 MHz also for amateur satellites'],
    [1240, 1300, 'MHz', 'secondary', dBW[30] + ' (Class A)', 'Class A', 'All emissions except pulse', 'Music transmission permitted; also allocated to amateur satellites'],
    [2300, 2450, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions except pulse', 'Must accept interference from ISM users'],
    [5650, 5850, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions except pulse', 'Must accept interference from ISM users; also allocated to amateur satellites'],
    [10000, 10450, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'], [10450, 10500, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'],
    [24000, 24050, 'MHz', 'primary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'], [24050, 24250, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse', 'Must accept interference from ISM users'],
    [47000, 47200, 'MHz', 'primary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'], [75500, 76000, 'MHz', 'primary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'],
    [76000, 81000, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse', 'Must accept interference from ISM users'], [122250, 123000, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse', 'Must accept interference from ISM users'],
    [134000, 136000, 'MHz', 'primary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'], [136000, 141000, 'MHz', 'secondary', dBW[26] + ' (Class A)', 'Class A', 'All emissions including pulse'],
  ]
  const segments = rows.map(([f, t, unit, status, power, classes, use, note]) => {
    const conv = unit === 'kHz' ? hz.kHz : hz.MHz
    return seg(bandOf(conv(f), conv(t)), conv(f), conv(t), use, { status, power, classes, note })
  })
  segments.push(seg('60 m', hz.kHz(5350), hz.kHz(5450), 'Amateur service (shared)', { status: 'secondary', power: '15 W EIRP in 5351.5–5366.5 kHz', note: 'From ICASA’s National Radio Frequency Plan 2018 as reported by the ARRL and IARU Region 1; it is not in the Annexure I table used for the other rows. Check the current plan.' }))
  write('za-icasa-annexure-i', {
    title: 'South Africa — ICASA Annexure I', jurisdiction: 'South Africa',
    source: 'ICASA Radio Frequency Spectrum Regulations, Annexure I “Amateur radio frequency bands” (as amended 2021, reproduced at acts.co.za); 60 m from the ICASA National Radio Frequency Plan 2018 via ARRL/IARU news',
    sourceUrl: 'https://api.acts.co.za/electronic-communications-act-2005/n279_annexure_i.php', license: 'South African government regulation',
    notes: 'ITU Region 1. Class A and Class B are the two ICASA amateur licence classes; a segment’s “classes” shows who may use it. Powers are quoted in dBW relative to 1 W PEP with watt equivalents added. A 2025 draft National Radio Frequency Plan and SARL submissions propose changes that may not yet be in force, so check ICASA and the SARL for the current position. This is the allocation table only: mode sub-bands inside it are voluntary SARL band-plan matters and are not included.',
    data: { segments },
  })
}

// ================= Germany: Amateurfunkverordnung (AFuV) Anlage 1, BGBl. 2024 I Nr. 175 =================
{
  const rows = JSON.parse(readFileSync(new URL('./pack-data/de-afuv-anlage1.json', import.meta.url), 'utf8'))
  const NOTES = {
    1: 'Max occupied bandwidth 800 Hz.', 2: 'Operating locations must be notified to the BNetzA; decouple the antenna from other installations; stop if primary services are disturbed.',
    3: 'Max occupied bandwidth 2.7 kHz.', 4: 'Max occupied bandwidth 7 kHz below 29 MHz, 40 kHz above.',
    5: 'No harmful interference to broadcast reception; 50–52 MHz: protect wind-profiler radars, horizontal polarisation only, fixed stations only.', 6: 'Max occupied bandwidth 40 kHz.',
    7: 'Max occupied bandwidth 2 MHz (7 MHz for AM television).', 8: 'Max occupied bandwidth 2 MHz (7 MHz AM/digital TV, 18 MHz FM TV).', 9: 'Max occupied bandwidth 10 MHz (20 MHz for television).',
    10: 'No remote-controlled stations (remote operation excepted) and no contests.', 11: '1247–1263 MHz: max 3.05 W ERP; no remote-controlled or automatic stations there.', 12: 'Automatic stations: max 50 W ERP.',
    13: 'Parts of this range may also be used by the amateur-satellite service.', 14: 'Terahertz ranges may be used without interference protection; BNetzA publishes the conditions.',
    15: 'Weekends: up to 750 W PEP (Class A) or 100 W PEP (Class E) on 1850–2000 kHz, and contests are allowed.', 16: 'Max occupied bandwidth 12 kHz.', 17: 'Links of remote/automatic stations may use up to 1000 W ERP in justified cases.',
  }
  const segments = []
  for (const r of rows) {
    if (r.open || r.to == null) continue // “> 275 GHz” row: conditions published by the regulator
    const conv = hz[r.unit], f = conv(r.from), t = conv(r.to)
    const fix = (s) => s.replace(',', '.')
    const classes = [r.A && 'Class A', r.E && 'Class E', r.N && 'Class N'].filter(Boolean).join(', ')
    const power = [r.A && `A: ${fix(r.A)}`, r.E && `E: ${fix(r.E)}`, r.N && `N: ${fix(r.N)}`].filter(Boolean).join(' · ')
    segments.push(seg(bandOf(f, t), f, t, 'Amateur service', { status: r.status === 'P' ? 'primary' : 'secondary', classes, power, note: r.notes.map((n) => NOTES[n]).filter(Boolean).join(' ') }))
  }
  write('de-bnetza-afuv', {
    title: 'Germany — AFuV Anlage 1', jurisdiction: 'Germany',
    source: 'Amateurfunkverordnung (AFuV), Anlage 1 “Nutzungsbedingungen für die im Frequenzplan für den Amateurfunkdienst ausgewiesenen Frequenzbereiche” (BGBl. 2024 I Nr. 175, S. 1–4), gesetze-im-internet.de',
    sourceUrl: 'https://www.gesetze-im-internet.de/afuv_2005/anlage_1.html', license: 'German federal law (official work, no copyright)',
    notes: 'ITU Region 1. Classes A, E and N are the German amateur licence classes (N = entry class). Powers are as stated in the table (PEP or ERP). The extra conditions are an unofficial English paraphrase of the German footnotes (Teil B); the German text is authoritative. The row for frequencies above 275 GHz and the terahertz ranges (footnote 14) are not listed.',
    data: { segments },
  })
}

// ================= Canada: ISED RBR-4 Issue 3 (July 2022), Schedule I =================
{
  const HF = 'Basic + Morse 5 wpm, or Basic with Honours, or Basic + Advanced', V = 'Basic (any certificate)'
  const rows = [ // [from, to, unit, bw, provision, hf?]
    [135.7, 137.8, 'kHz', '100 Hz', '5.67A'], [472, 479, 'kHz', '1 kHz', '5.80A'], [1.8, 2.0, 'MHz', '6 kHz', ''], [3.5, 4.0, 'MHz', '6 kHz', ''],
    [5.3515, 5.3665, 'MHz', '2.8 kHz', 'C21'], [7.0, 7.3, 'MHz', '6 kHz', '5.142'], [10.1, 10.15, 'MHz', '1 kHz', 'C6'], [14.0, 14.35, 'MHz', '6 kHz', ''], [18.068, 18.168, 'MHz', '6 kHz', ''],
    [21.0, 21.45, 'MHz', '6 kHz', ''], [24.89, 24.99, 'MHz', '6 kHz', ''], [28.0, 29.7, 'MHz', '20 kHz', ''],
    [50, 54, 'MHz', '30 kHz', ''], [144, 148, 'MHz', '30 kHz', ''], [219, 220, 'MHz', '100 kHz', 'C11'], [222, 225, 'MHz', '100 kHz', ''],
    [430, 450, 'MHz', '12 MHz', '*'], [902, 928, 'MHz', '12 MHz', '*'], [1.24, 1.3, 'GHz', '', '*'], [2.3, 2.45, 'GHz', '', '*'], [3.3, 3.5, 'GHz', '', '*'], [5.65, 5.925, 'GHz', '', '*'],
    [10, 10.5, 'GHz', '', '*'], [24, 24.05, 'GHz', '', ''], [24.05, 24.25, 'GHz', '', '*'], [47, 47.2, 'GHz', '', ''], [76, 77.5, 'GHz', '', '*'], [77.5, 78, 'GHz', '', ''], [78, 81, 'GHz', '', '*'],
    [81, 81.5, 'GHz', '', '5.561A'], [122.25, 123, 'GHz', '', '*'], [134, 136, 'GHz', '', ''], [136, 141, 'GHz', '', '*'], [241, 248, 'GHz', '', '*'], [248, 250, 'GHz', '', ''],
  ]
  const segments = rows.map(([f, t, unit, bw, prov]) => {
    const conv = hz[unit], from = conv(f), to = conv(t)
    const lowBand = to <= 30e6
    return seg(bandOf(from, to), from, to, 'Amateur service', {
      classes: lowBand ? HF : V,
      status: prov === '*' ? 'no interference to, and no protection from, other services' : undefined,
      note: [bw && `Max bandwidth ${bw}.`, prov && prov !== '*' && `Operating provision ${prov} (Canadian/ITU footnote in RBR-4).`].filter(Boolean).join(' '),
    })
  })
  write('ca-ised-rbr4', {
    title: 'Canada — ISED RBR-4 Schedule I', jurisdiction: 'Canada',
    source: 'Innovation, Science and Economic Development Canada, RBR-4 “Standards for the Operation of Radio Stations in the Amateur Radio Service”, Issue 3, July 2022, Schedule I (stations operating in Canada)',
    sourceUrl: 'https://publications.gc.ca/site/eng/440360/publication.html', license: 'Government of Canada publication (reproduced for non-commercial reference)',
    notes: 'Below 30 MHz a Basic certificate alone is not enough: it needs Morse 5 wpm, Basic with Honours (80%+), or Advanced qualification; above 30 MHz Basic is enough. Power limits (RBR-4 section 10): Basic — 250 W DC input, or 560 W PEP (SSB) / 190 W carrier (other); Advanced — 1000 W DC input, or 2250 W PEP (SSB) / 750 W carrier (other). Also available on the 60 m channels 5.332, 5.348, 5.373 and 5.405 MHz (2.8 kHz). 220–222 MHz appears in the source for exceptional circumstances only and is omitted here. Mode sub-bands are the voluntary RAC band plan and are not included. Revision of this pack: compiled from the July 2022 issue; check ISED for a newer one.',
    data: { segments },
  })
}

// ================= Australia: Radiocommunications (Amateur Stations) Class Licence 2023, Schedule 2 Table C (Advanced) =================
{
  const PWR = '400 W pX (PEP) for C3F, J3E or R3E emissions; otherwise 120 W pY (mean power)'
  const A = 'Advanced'
  const ex = { classes: A }
  const segments = [
    seg('2200 m', hz.kHz(135.7), hz.kHz(137.8), 'Amateur service', { ...ex, power: '1 W pX EIRP', note: 'Necessary bandwidth must not exceed 2.1 kHz.' }),
    seg('630 m', hz.kHz(472), hz.kHz(479), 'Amateur service', { ...ex, power: '5 W pX EIRP', note: 'Necessary bandwidth must not exceed 2.1 kHz.' }),
    ...[[1.8, 1.875], [3.5, 3.7], [7.0, 7.1], [14.0, 14.35], [18.068, 18.168], [21.0, 21.45], [24.89, 24.99], [3.776, 3.8], [7.1, 7.3], [10.1, 10.15], [28.0, 29.7], [50, 52]].map(([a, b]) => seg(bandOf(hz.MHz(a), hz.MHz(b)), hz.MHz(a), hz.MHz(b), 'Amateur service', { ...ex, power: PWR, note: 'Bandwidth and power-spectral-density limitations apply; see Schedule 2 Table C.' })),
    ...[[52, 54], [144, 148], [430, 450], [1240, 1300], [2300, 2302], [2400, 2450], [3300, 3400], [3400, 3600], [5650, 5850], [10000, 10500], [24000, 24250], [47000, 47200], [76000, 81000], [122250, 123000], [134000, 141000], [241000, 250000]].map(([a, b]) => seg(bandOf(hz.MHz(a), hz.MHz(b)), hz.MHz(a), hz.MHz(b), 'Amateur service', { ...ex, power: PWR })),
  ]
  write('au-acma-class-licence', {
    title: 'Australia — ACMA Amateur Class Licence (Advanced)', jurisdiction: 'Australia',
    source: 'Radiocommunications (Amateur Stations) Class Licence 2023 [F2023L01648], Schedule 2 Table C (Advanced), as made 7 December 2023, commencing 19 February 2024',
    sourceUrl: 'https://legislation.gov.au/F2023L01648/asmade/2023-12-12/text/original/pdf', license: 'Commonwealth of Australia legislation (CC BY 4.0)',
    notes: 'ITU Region 3. This pack covers the Advanced class only: Standard and Foundation licences have narrower bands and lower powers (Tables A and B in the Schedule) and are not listed here. pX = peak envelope power, pY = mean power (Radio Regulations definitions). Bandwidth and spectral-density limitations vary by band in the source and are not reproduced, so read Table C before relying on this. The instrument may have been amended since it was made; check the Federal Register of Legislation. WIA voluntary band plans (modes within these bands) are not included.',
    data: { segments },
  })
}
