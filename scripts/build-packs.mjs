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

// ================= Japan: MIC 令和5年総務省告示第80号 usage chart (last amended 令和7年7月17日告示第259号) + licence-symbol power leaflet =================
{
  const NARROW = 'Narrow-band, all emission types', ALLE = 'All emission types', WIDE = 'Wide-band telegraphy, telephony and image', CW = 'CW (Morse) only'
  // [from, to, unit, use, note]  — read from the MIC chart; boundaries as printed on it
  const rows = [
    [135.7, 137.8, 'kHz', NARROW, 'Chart bracket: occupied bandwidth 500 Hz or less.'], [472, 479, 'kHz', NARROW, 'Chart bracket: occupied bandwidth 500 Hz or less.'],
    [1800, 1830, 'kHz', CW], [1830, 1875, 'kHz', NARROW, 'Occupied bandwidth 3 kHz or less (A3E 6 kHz or less).'], [1907.5, 1912.5, 'kHz', NARROW, 'Chart bracket: occupied bandwidth 500 Hz or less.'],
    [3500, 3530, 'kHz', CW], [3530, 3580, 'kHz', NARROW], [3599, 3612, 'kHz', NARROW], [3662, 3687, 'kHz', NARROW],
    [3702, 3716, 'kHz', NARROW], [3745, 3770, 'kHz', NARROW], [3791, 3805, 'kHz', NARROW],
    [7000, 7030, 'kHz', CW], [7030, 7200, 'kHz', NARROW],
    [10100, 10120, 'kHz', CW], [10120, 10150, 'kHz', NARROW, 'Occupied bandwidth 2 kHz or less.'],
    [14000, 14070, 'kHz', CW], [14070, 14350, 'kHz', NARROW, 'Beacon (marker) signal 14,100 kHz.'],
    [18068, 18080, 'kHz', CW], [18080, 18168, 'kHz', NARROW, 'Beacon (marker) signal 18,110 kHz.'],
    [21000, 21070, 'kHz', CW], [21070, 21450, 'kHz', NARROW, 'Beacon (marker) signal 21,150 kHz.'],
    [24890, 24900, 'kHz', CW], [24900, 24990, 'kHz', NARROW, 'Beacon (marker) signal 24,930 kHz.'],
    [28.0, 28.07, 'MHz', CW], [28.07, 29.0, 'MHz', NARROW, 'Beacon (marker) signal 28.2 MHz.'], [29.0, 29.3, 'MHz', ALLE], [29.3, 29.51, 'MHz', 'Satellite'],
    [29.51, 29.59, 'MHz', 'Repeaters (all emission types)'], [29.59, 29.61, 'MHz', ALLE], [29.61, 29.7, 'MHz', 'Repeaters (all emission types)'],
    [50.0, 50.07, 'MHz', NARROW, 'Occupied bandwidth 2 kHz or less; beacon 50.01 MHz; the chart also marks moon-bounce (EME) use at the bottom of the band.'], [50.07, 51.0, 'MHz', NARROW],
    [51.0, 54.0, 'MHz', ALLE, 'Calling frequency 51.0 MHz.'],
    [144.0, 144.02, 'MHz', 'Moon-bounce (EME)'], [144.02, 144.5, 'MHz', NARROW, 'The chart marks EME use at the bottom, up to about 144.2 MHz.'],
    [144.5, 144.6, 'MHz', ALLE + ' (VoIP also)'], [144.6, 144.7, 'MHz', ALLE], [144.7, 145.65, 'MHz', WIDE, 'Calling frequency 145.0 MHz.'],
    [145.65, 145.8, 'MHz', ALLE + ' (VoIP also)'], [145.8, 146.0, 'MHz', 'Satellite'],
    [430.0, 430.1, 'MHz', CW], [430.1, 430.7, 'MHz', NARROW], [430.7, 431.4, 'MHz', ALLE + ' (VoIP 430.7–431.0)'], [431.4, 431.9, 'MHz', WIDE],
    [431.9, 432.1, 'MHz', 'Moon-bounce (EME)'], [432.1, 434.0, 'MHz', WIDE, 'Calling frequency 433.0 MHz.'], [434.0, 435.0, 'MHz', 'Repeaters'], [435.0, 438.0, 'MHz', 'Satellite'],
    [438.0, 439.0, 'MHz', ALLE + ' (VoIP also)'], [439.0, 440.0, 'MHz', 'Repeaters'],
    [1260, 1270, 'MHz', 'Satellite'], [1270, 1273, 'MHz', 'Repeaters'], [1273, 1290, 'MHz', ALLE], [1290, 1293, 'MHz', 'Repeaters'], [1293, 1295.8, 'MHz', ALLE, 'Calling frequency 1295.0 MHz.'],
    [1295.8, 1296.2, 'MHz', 'Moon-bounce (EME)'], [1296.2, 1299, 'MHz', ALLE], [1299, 1300, 'MHz', 'Repeaters'],
    [2400, 2405, 'MHz', 'Satellite and moon-bounce (EME)'], [2405, 2407, 'MHz', 'Repeaters'], [2407, 2424, 'MHz', ALLE], [2424, 2424.5, 'MHz', 'Moon-bounce (EME)'], [2424.5, 2425, 'MHz', ALLE],
    [2425, 2427, 'MHz', 'Repeaters', 'Calling frequency 2427.0 MHz (just above).'], [2427, 2450, 'MHz', ALLE],
    [5650, 5670, 'MHz', 'Satellite (repeaters also)'], [5670, 5830, 'MHz', ALLE, 'Repeaters at 5670–5690, 5725–5730, 5765–5770 and 5810–5830 MHz; moon-bounce (EME) at 5760–5762 MHz; calling frequency 5760.0 MHz.'], [5830, 5850, 'MHz', 'Satellite (repeaters also)'],
    [10000, 10250, 'MHz', ALLE, 'Repeaters at 10.0–10.025, 10.15–10.18 and 10.245–10.25 GHz; calling frequency 10.24 GHz.'], [10450, 10500, 'MHz', ALLE + ', satellite and moon-bounce (EME)'],
  ]
  const segments = rows.map(([f, t, unit, use, note]) => { const c = hz[unit], from = c(f), to = c(t); return seg(bandOf(from, to), from, to, use, { note }) })
  write('jp-mic-notification-80', {
    title: 'Japan — MIC usage chart (告示第80号)', jurisdiction: 'Japan',
    source: 'Ministry of Internal Affairs and Communications (総務省), “アマチュア業務に使用する電波の型式及び周波数の使用区別” (令和5年総務省告示第80号), usage chart, last amended 令和7年7月17日総務省告示第259号; power from the MIC leaflet “周波数等の一括表示記号” (June 2023)',
    sourceUrl: 'https://www.soumu.go.jp/main_content/001040318.pdf', license: 'Japanese government publication (MIC terms of use)',
    notes: 'ITU Region 3. The chart shows which kinds of emission are allowed in each part of each band; it is a picture, so every boundary here was read from it by hand and must be checked against the original. Where the chart overlays a use on another (repeaters, VoIP, moon-bounce) the overlay is described in the note. Bands above 10.5 GHz (24, 47, 77, 135 and 249 GHz) are not on this chart and are not listed; the licence leaflet shows power limits for them. Maximum antenna power depends on the licence symbol (first to fourth class operator, F = fixed / M = mobile): 1.9–28 MHz — 1st class 1 kW (F) / 50 W (M), 2nd class 200 W / 50 W, 3rd class 50 W, 4th class 10 W; 50 MHz — 500 W, 200 W, 50 W, 20 W; 144 and 430 MHz — 50 W (1st to 3rd class), 20 W (4th class); 1200 MHz — 10 W (F) / 1 W (M); 2.4–10.5 GHz — 2 W; 47 GHz and up — 0.2 W (249 GHz: 0.1 W). 3rd and 4th class operators may not use the 10 MHz or 14 MHz bands, and 4th class may not use 18 MHz; 135 kHz and 472 kHz are limited to 200 W (2nd class and above, F). Terrestrial use above these limits needs the exact symbol on your licence. Revision of this pack: the chart as amended 17 July 2025; an earlier MIC notification (令和5年告示第80号 of March 2023) is superseded by it.',
    data: { segments },
  })
}

// ================= Brazil: Anatel Ato nº 926/2024, Requisitos Técnicos e Operacionais do Serviço de Radioamador =================
{
  const sub = JSON.parse(readFileSync(new URL('./pack-data/br-ato926-subbands.json', import.meta.url), 'utf8'))
  const ALLC = 'A, B, C'
  // Table I — which COER classes may operate where (frequencies in kHz / MHz / GHz as published)
  const K = (a, b, who) => [hz.kHz(a), hz.kHz(b), who], M = (a, b, who) => [hz.MHz(a), hz.MHz(b), who], G = (a, b, who) => [hz.GHz(a), hz.GHz(b), who]
  const access = [
    K(135.7, 137.8, ALLC), K(472, 479, ALLC), K(1800, 1850, ALLC), K(1850, 2000, 'A'), K(3500, 3800, ALLC), K(3800, 4000, 'A'), K(5351.5, 5366.5, 'A'),
    K(7000, 7047, ALLC), K(7047, 7300, 'A, B'), K(10100, 10150, 'A'), K(14000, 14350, 'A'), K(18068, 18168, 'A'), K(21000, 21150, ALLC), K(21150, 21300, 'A, B'), K(21300, 21450, 'A'),
    K(24890, 24990, ALLC), M(28, 29.7, ALLC), M(50, 54, ALLC), M(144, 148, ALLC), M(220, 225, ALLC), M(430, 440, ALLC), M(902, 907.5, ALLC), M(915, 928, ALLC), M(1240, 1300, ALLC),
    M(2300, 2450, ALLC), M(3300, 3500, ALLC), M(5650, 5925, ALLC), G(10, 10.5, ALLC), G(24, 24.25, ALLC), G(47, 47.2, ALLC), G(76, 81.5, ALLC), G(122.25, 123, ALLC), G(134, 141, ALLC), G(241, 250, ALLC),
  ]
  const MODES = [['cw', 'CW'], ['ssb', 'SSB'], ['am', 'AM'], ['fm', 'FM'], ['dv', 'digital voice'], ['dig', 'digital modes'], ['other', 'other modes (Morse AM/FM, image, experimental)']]
  const special = (f, t) => { const mid = (f + t) / 2; if (mid >= hz.kHz(135.7) && mid <= hz.kHz(137.8)) return '1 W EIRP'; if (mid >= hz.kHz(472) && mid <= hz.kHz(479)) return '5 W EIRP'; if (mid >= hz.kHz(5351.5) && mid <= hz.kHz(5366.5)) return '25 W EIRP' }
  const rowsOut = []
  const manual = { title: 'Faixa dos 2.200 metros', unit: 'kHz', rows: [{ from: 135.7, to: 137.8, cw: true, dig: true, app: 'ACDS allowed if it causes no interference to point-to-point and DX traffic (Note 1)' }] }
  // The published text repeats Table XX (13 cm) with one difference (2304.1–2304.3 MHz: CW+digital vs CW+SSB+digital); the first copy is used and the pack notes say so.
  const seen = new Set()
  const tables = [manual, ...sub.filter((t) => t.rows.length && !seen.has(t.title) && seen.add(t.title))]
  for (const tb of tables) {
    const c = hz[tb.unit]
    for (const r of tb.rows) {
      const from = c(r.from), to = c(r.to)
      const cuts = new Set([from, to])
      for (const [a, b] of access) { if (a > from && a < to) cuts.add(a); if (b > from && b < to) cuts.add(b) }
      const pts = [...cuts].sort((x, y) => x - y)
      const modes = MODES.filter(([k]) => r[k]).map(([, label]) => label)
      const parts = []
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], hit = access.find(([x, y]) => a >= x && b <= y)
        if (!hit) continue
        const last = parts[parts.length - 1]
        if (last && last.to === a && last.who === hit[2]) last.to = b; else parts.push({ from: a, to: b, who: hit[2] })
      }
      for (const p of parts) {
        const note = [r.app && r.app !== 'x' ? r.app : '', (r.app || '').match(/Nota (\d+)/) ? tb.notes?.[(r.app.match(/Nota (\d+)/) || [])[1]] : ''].filter(Boolean).join(' — ')
        rowsOut.push(seg(bandOf(p.from, p.to), p.from, p.to, modes.length ? modes.join(', ') : 'Guard band / reserved', { classes: 'Classes ' + p.who, note, power: special(p.from, p.to) }))
      }
    }
  }
  const segments = rowsOut.sort((x, y) => x.fromHz - y.fromHz)
  write('br-anatel-ato-926', {
    title: 'Brazil — Anatel Ato 926/2024', jurisdiction: 'Brazil',
    source: 'Anatel Ato nº 926, de 1 de fevereiro de 2024 — Requisitos Técnicos e Operacionais para uso de radiofrequências associadas ao Serviço de Radioamador (Tabela I classes; Tabelas II–XXIX sub-band plan; item 5 power), as published on informacoes.anatel.gov.br',
    sourceUrl: 'https://informacoes.anatel.gov.br/legislacao/atos-de-requisitos-tecnicos-de-gestao-do-espectro/2024/1919-ato-926', license: 'Brazilian federal regulation (public)',
    notes: 'ITU Region 2. COER classes A, B and C. Mean transmitter output power: Class A 1,500 W, Class B 1,000 W, Class C 100 W (item 5.2); lower limits apply on 135.7–137.8 kHz (1 W EIRP), 472–479 kHz (5 W EIRP), 5351.5–5366.5 kHz (25 W EIRP) and for terrestrial links at 2.3–2.45 GHz, 3.4–3.5 GHz and 47–47.2 GHz (100 W EIRP). Each row lists the emission modes the Ato permits in that sub-band (CW, SSB, AM, FM, digital voice, digital modes, other) with its application note (DX, ACDS, beacons, repeaters, satellites, EME, “exclusive” uses). Anatel states the site text does not replace the Diário Oficial publication. Anatel’s June 2026 guide still names Ato 926/2024 as the technical reference; a newer Ato 3448/2026 consolidates the operational rules and exam procedures, so check Anatel for later changes. Repeater channelisation (item 9) and internet voice gateway channels (item 10) are not reproduced. Notes are in Anatel’s original Portuguese. The published text contains the 13 cm table (Tabela XX) twice with one difference — 2304.1–2304.3 MHz is CW and digital in one copy and CW, SSB and digital in the other; the first copy is shown here.',
    data: { segments },
  })
}
