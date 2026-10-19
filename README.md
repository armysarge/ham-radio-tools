<p align="center">
  <img src="docs/logo.svg" alt="Ham Radio Tools" width="336"/>
</p>

<p align="center"><b>An offline-first amateur-radio workbench: RF calculators, antenna designers and grid-square tools that never need the internet.</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-Alpha-orange?style=flat-square"/>
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Works-Offline-green?style=flat-square"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
</p>

<p align="center">
  <a href="https://github.com/armysarge/ham-radio-tools"><img src="https://img.shields.io/badge/GitHub-armysarge%2Fham--radio--tools-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub repository"/></a>
  <a href="https://www.buymeacoffee.com/armysarge"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat-square&logo=buymeacoffee&logoColor=black" alt="Buy Me A Coffee"/></a>
</p>

<p align="center"><b>Live demo: <a href="https://hamradiotools.armysarge.co.za/">https://hamradiotools.armysarge.co.za/</a></b></p>

---

> ## ⚠️ Alpha Software
> Ham Radio Tools is in early development. Calculations are covered by tests and reference values, but antenna designs are **empirical design estimates, not simulations**. Always verify a finished antenna with an analyser, and use the app at your own risk.

## Screenshots

| | |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Half-wave dipole](docs/screenshots/dipole.png) |
| Dashboard with search, categories and favorites | Dipole with a live, dimensioned drawing |
| ![Grid squares and map](docs/screenshots/maidenhead.png) | ![SWR](docs/screenshots/swr.png) |
| Maidenhead grid, distance and bearing on the bundled map | SWR, return loss and mismatch loss |

## Overview

Ham Radio Tools gives beginners, experienced operators and antenna builders a quick answer first, then lets them expand the explanation to see the formula and assumptions behind it.

Key design goals:

- **Offline by design** — no CDNs, hosted APIs, telemetry, update checks or online map tiles. Everything runs on the device.
- **Honest numbers** — every tool is labelled *Analytical*, *Design estimate* or *Reference*, shows its sources, and states its limits.
- **Easy to use** — large text, big touch targets, plain labels, specific validation messages, light/dark themes, works on phones and tablets.
- **Easy to extend** — a tool is one Vue file plus one entry in a typed registry.

## Features

| Area | Feature |
|---|---|
| **RF & electronics** | Frequency ↔ wavelength with velocity factor · Ohm's law and power (any two in, rest out) · dBm / watts / dB ratios with impedance assumptions · SWR, return loss, reflection coefficient, mismatch loss · Reactance and LC resonance · Feedline electrical length · **Component codes: resistor colours both ways, capacitor and SMD codes, E-series values, series/parallel, divider, LED resistor** |
| **Antenna design** | Half-wave dipole with trim helper · End-fed half-wave (harmonic bands, counterpoise, 49:1/64:1 transformer guidance) · Inverted-V (apex angle, span, end height) · Quarter-wave vertical with elevated or ground radials · J-pole for VHF/UHF (pipe or twin-lead) · Full-wave loop (square, triangle, circle) with a 75 Ω matching section · **Yagi and quad starting designs** · **radial and site planner** · Dimensioned SVG drawings · **what to build it from** (wire, coax, connectors, chokes, supports: best/good/OK/avoid) · Save, export SVG, print |
| **Station & logging** | Feedline loss (datasheet figures, length, frequency, SWR) · link budget with path loss, noise floor, radio horizon and Fresnel clearance · L-network matching · Butterworth/Chebyshev low-pass filter designer with response curve · toroid and air-core coil turns · battery runtime and solar sizing · **logbook with duplicate warning and ADIF 3.1 export/import** |
| **Propagation & satellites** | Typical band use by time of day · single-hop MUF estimate (secant law) · sunrise, sunset, grey line and day/night terminator on the map · **satellite pass prediction from a TLE you paste in (SGP4, offline)** |
| **DIY components** | Air-core coil, toroid, foil-and-film capacitor, air-variable capacitor, dummy load (series/parallel resistor arrays) and ferrite choke from everyday items: drawing, sizing, test and safety notes |
| **Maps & grid squares** | Coordinates ↔ Maidenhead (4, 6 or 8 characters) · Cell edges vs. cell centre · Short- and long-path distance and bearing · Bundled offline world map with grid overlay, pan and zoom · Saved named locations and "my station" |
| **Projects** | Export saved designs and locations to a JSON file; import by adding or replacing; invalid entries are skipped with a reason |
| **Operating references** | Phonetic alphabet · Q codes · Abbreviations · CTCSS tones · Constants and rules of thumb · ITU Radio Regulations explained · ITU region band plans and **national band tables for the USA, Canada, Germany, Australia, South Africa, Japan and Brazil** with a "what is at this frequency?" lookup · Callsign lookup (issuing country, island/home nation, DL/ prefixes, /P /MM suffixes) |
| **CW (Morse)** | **Koch practice trainer (Farnsworth, scored)** · UTC clock, time zones, station-ID reminder and UTC countdown · Chart · text → Morse player (PARIS timing, Farnsworth, adjustable pitch) · WAV download · decoder for typed dots/dashes, tapped keying and an experimental microphone decoder |
| **QRM hunting** | Step-by-step method · source signatures (schematic sketches) · harmonic finder · DIY shielded-loop size calculator **and a full step-by-step build guide with diagram, tests and troubleshooting** |
| **Antenna mods** | A proven / situational / unproven checklist on every antenna tool, with the reasoning and no invented gain figures |
| **Broadcast schedules** | Bundled time & frequency stations · installable, dated schedule packs with staleness warnings · "on air now" at any UTC time |
| **Content packs** | Import band plans and schedules (JSON) or convert an EiBi-layout / CSV schedule text file; stored locally in IndexedDB |
| **App** | Search (`/` to focus) · Categories · Favorites · Light/dark/auto theme · Text size · **Metric/Imperial selector in the top bar (Metric by default)** · Local persistence |

## Requirements

| Requirement | Notes |
|---|---|
| Node.js 20+ | Developed on Node 24 |
| npm | Comes with Node |
| Edge or Chrome | Only for `npm run check:offline` and `npm run screenshots` |

> **Development needs the network once** (`npm install`). **Running the built app never does.**

## Quick Start

1. Clone the repository

   ```bash
   git clone https://github.com/armysarge/ham-radio-tools.git
   cd ham-radio-tools
   ```

2. Install dependencies (the only step that needs internet)

   ```bash
   npm install
   ```

3. Start the dev server and open http://localhost:5173

   ```bash
   npm run dev
   ```

4. Run the tests

   ```bash
   npm test
   ```

5. Build the offline bundle

   ```bash
   npm run build
   ```

   `dist/` is plain static files with relative paths. Browsers refuse ES modules from `file://`, so serve it from any local static server (`npx vite preview`) or, later, the desktop shell. This is a limit of web builds, not a network dependency.

6. Verify it really works offline

   ```bash
   npm run check:offline
   ```

## Offline guarantees

| | Dev-time (needs download) | Runtime (must work offline) |
|---|---|---|
| What | npm packages, Vite, TypeScript, Vitest | Everything in `dist/`: code, fonts (system stacks), icons, diagrams, basemap |
| When | Once, by a developer | Always, including on a machine that has never been online |

- No service worker, so this is **not** a PWA that depends on a prior online visit.
- A Content-Security-Policy in `index.html` restricts loads to the app's own origin.
- `npm run check:offline` scans `dist/` for external URLs, then drives the built app in a real browser with **every non-localhost request blocked and recorded**: start-up, search, calculators, dipole save, map and locator, persistence across reload, a project export → delete → re-import round trip, and a 375 px phone pass (no horizontal overflow on any page, menu drawer works).
- **Not yet done:** the separate clean-machine installation check — it needs a packaged installer, which doesn't exist yet.

**What has actually been tested:** Windows 10 (build 19045), Node 24, Microsoft Edge via Playwright (including real IndexedDB for packs), Vitest/jsdom with 213 tests. The microphone decoder is tested on synthesised audio only, never on a real microphone or radio. Linux, macOS, Firefox, Safari and real phones/tablets are **untested**. Visual review was at 375 px and 768 px, mostly in dark theme. On phones the map supports touch pan; pinch-zoom is not implemented (use +/−).

## Project files

**Settings & content → Back up or move your projects** writes `ham-radio-tools-project-YYYY-MM-DD.json` containing saved designs, saved locations and which location is your station (format `ham-radio-tools-project`, version 1). Theme, units and favorites are per-device and not included. Import previews the file first, then either **adds** items (existing ids are never overwritten; importing the same file twice changes nothing) or **replaces** everything after an explicit confirmation. Files from a newer app version, files over 5 MB, and anything not in this format are refused with a readable message.

## Content on this device

| Content | Status |
|---|---|
| App, calculators, diagrams, toroid core table, cable-loss presets | Bundled (typical catalogue figures, labelled approximate) |
| World basemap (Natural Earth 1:110m, public domain) | Bundled — country outlines only |
| ITU region band plans, CTCSS, abbreviations, constants, Q codes, callsign prefixes, time stations, antenna mods, QRM guide | Bundled — each dated in its tool |
| National band tables: United States, Canada, Germany, Australia, South Africa, Japan, Brazil | Bundled — compiled from each regulator's own text (see below) |
| Other countries, IARU/national mode sub-band plans, shortwave programme schedules | **Installable packs** — shown as *Installed* once imported |
| Regional map packs, manual library, local AI | Unavailable (planned) |

### National band tables (bundled)

| Country | Source (retrieved 2026-10-19) | Scope |
|---|---|---|
| United States | 47 CFR §§ 97.301, 97.303, 97.305, 97.313 (eCFR, amended 14 Jan 2026) | All classes, Region 2, modes per §97.305, power limits |
| South Africa | ICASA Radio Frequency Spectrum Regulations, Annexure I (copy at acts.co.za); 60 m from the 2018 National Radio Frequency Plan (via ARRL/IARU) | Class A / B, powers in dBW with watt equivalents |
| Germany | AFuV Anlage 1 (BGBl. 2024 I Nr. 175), gesetze-im-internet.de | Classes A / E / N; unofficial English paraphrase of the footnotes |
| Canada | ISED RBR-4 Issue 3 (July 2022), Schedule I | Qualifications and bandwidths; power limits in the pack notes |
| Australia | Radiocommunications (Amateur Stations) Class Licence 2023, Schedule 2 Table C | **Advanced class only**; Standard and Foundation not included |
| Japan | MIC usage chart 令和5年告示第80号 (amended Jul 2025) and licence-symbol leaflet | The chart is a picture **read by hand**; emission categories per segment; power by licence symbol in the notes |
| Brazil | Anatel Ato nº 926/2024 | Classes A/B/C, mean power, and the full sub-band mode plan (Portuguese notes) |

Not included yet: **the United Kingdom** (Ofcom's documents sit behind a bot-protection wall that this project does not bypass) and **India** (the DoT/WPC official text could not be retrieved). Both need an official PDF supplied by the maintainer; see [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md). Mode sub-bands (where CW, digital and SSB sit inside a band) are voluntary plans from national societies and the IARU, not regulator tables, and are not included.

**Every source is recorded** (official URL, version, retrieval date, licence, how it was read, known gaps and a content hash) in [scripts/pack-data/sources.json](scripts/pack-data/sources.json) and explained in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md). `npm run check:sources` re-fetches the documents (network, run by you) and tells you which have changed; `npm run build:packs` regenerates the packs.

The packs are generated by [scripts/build-packs.mjs](scripts/build-packs.mjs) from tables transcribed out of those documents, into `src/data/packs/*.json`; each pack states its source, licence, revision date and a "read first" scope note. To refresh one, follow the routine in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md). Rules change: the app shows each pack's age and links to the official source.

### Content packs and keeping data current

Data that goes out of date is **not** baked into the app. A pack is a JSON file (`format: "ham-radio-tools-pack"`) with a `kind` (`band-plan` or `broadcast-schedule`), an id, title, **source**, **licence** and a **revision date**. Import it under **Settings & content**; the app shows its age and warns when a schedule is over **45 days** old (band plans: 365 days). Nothing is fetched automatically, so "monthly updates" means: download a fresh schedule when you are online, convert/import it, and the old copy is replaced (the preview tells you if the installed one is newer). Packs live in the browser's IndexedDB, not localStorage, so large schedules fit.

Working examples of both formats are in [docs/packs](docs/packs) (clearly marked as format demos, not real data).

Band-plan pack format (`data.segments`): `{ "band": "20 m", "fromHz": 14000000, "toHz": 14070000, "use": "CW and narrow digital", "modes": "CW, RTTY", "power": "…", "status": "…", "classes": "General, Extra", "note": "…" }`, plus optional pack-level `notes`. Schedule pack format (`data.entries`): `{ "freqKhz": 5950, "startUtc": "0000", "endUtc": "0100", "days": "daily" | "135", "station": "…", "language": "…", "target": "…", "country": "…" }` (days: 1 = Monday).

## Calculation references and known limitations

| Tool | Method | Limits |
|---|---|---|
| Wavelength | λ = c·VF/f, c = 299 792 458 m/s | VF is user-supplied |
| dBm / dB | 10·log₁₀(P/1 mW); 20·log₁₀ for voltage | Voltage dB assumes equal impedances (stated in the UI) |
| SWR family | Γ-based relations; resistive load Γ = (R−Z₀)/(R+Z₀) | Lossless line; resistive loads only |
| Reactance / resonance | X_L = 2πfL, X_C = 1/(2πfC), f₀ = 1/(2π√LC) | Ideal components; no Q or bandwidth |
| Feedline length | L = (θ/360)·c·VF/f | VF presets are typical values; check the datasheet |
| Dipole | L = k·c/2f, k = 0.95 (≈ 468/f ft) | Empirical. No pattern, impedance, bandwidth, height or ground modelling |
| End-fed half-wave | Dipole-length wire (k = 0.95); harmonics n·f against HF bands; ideal-transformer Zin = Zend/ratio | Empirical. End impedance and per-band SWR are not predicted |
| J-pole | Overall 0.75·k·λ, stub 0.25·k·λ, k = 0.957 (≈ 58 in at 146 MHz in ½-inch pipe); spacing 0.025 λ and tap 0.025 λ as starting values | Empirical. Tap and spacing depend on tube size: tune with an analyser |
| Feedline loss | Matched loss scaled from one datasheet point by √f and length; mismatch added with the ARRL formula | √f law is HF/VHF; preset cable figures are approximate: use your datasheet |
| Link budget | FSPL = 20 log d + 20 log f + 32.44; noise floor −174 dBm/Hz + 10 log B + NF + SNR; horizon 3.57√(kh); Fresnel 17.32√(n d₁d₂/fD) | Free space, best case; terrain and fading are an allowance you enter |
| L-network | Q = √(Rhi/Rlo − 1), Xs = Q·Rlo, Xp = Rhi/Q | Resistive loads at one frequency; ideal parts |
| Low-pass filter | Butterworth and Chebyshev ladder prototypes, scaled to cutoff and impedance; odd orders 3–9 | Ideal lossless parts; tolerance and stray capacitance not modelled |
| Coils | N = √(L/AL); Wheeler L = d²n²/(18d + 40l) | AL is typical catalogue value (±10–25 %); Wheeler good to ~1 % for l > 0.8d |
| Battery & solar | Wh = A·h·V; panel = Wh/(sun hours × efficiency) | Planning figures; weather, ageing and temperature are not modelled |
| Yagi / quad | Rule-of-thumb proportions (reflector +5 %, director −5 %; quad 1005/1030/975 per f) | Empirical starting point: **no gain or pattern is claimed** |
| Logbook | ADIF 3.1.4 fields, ASCII only; duplicate = call + band + mode + UTC day | Stored in this browser: export regularly; no DXCC entity is written |
| Propagation | NOAA solar position (~1 min); MUF = foF2·sec θ on a spherical Earth | foF2 must be supplied; no D-layer absorption, no forecast |
| Satellite passes | SGP4 via satellite.js 6 (MIT) from a pasted TLE | Accuracy depends on the age of the element set; no Doppler; passes in progress at the end of the window are not listed |
| DIY components | C = ε₀εᵣA/d; Wheeler air coil; N = √(L/AL); resistor arrays for 50 Ω | Home-made parts vary ±20 % or more; fringing ignored; plastic-film thickness must be measured; air-gap voltage ceiling is one-fifth of dry-air breakdown |
| Components | IEC 60062 colour code, EIA capacitor and SMD/EIA-96 codes, IEC 60063 E-series, Ohm’s law | Colour codes beyond the six common temperature-coefficient colours vary by maker |
| Inverted-V | Dipole length × sloping-leg factor 0.97; span/drop by trigonometry | Empirical. Impedance guidance is qualitative |
| Vertical | k·c/4f for radiator and resonant radials, k = 0.95 (≈ 234/f ft) | Empirical. Radial counts are common guidance, not computed |
| Full-wave loop | k·c/f, k = 1.0218 (≈ 1005/f ft); 75 Ω quarter-wave match | Empirical. Feed impedance is qualitative; match is single-frequency |
| ITU band plans | Article 5 amateur allocations, simplified per region | Overview only: no sub-band (CW/phone) plans, national rules differ; always check your licence |
| Callsign lookup | ITU call sign series reduced to 1–2 character blocks; SSA–SSM/SSN–SSZ and 3DA–3DM/3DN–3DZ split by third letter | Shows who issued the call, not where the operator is; island/home-nation list is not the full DXCC list; spot-checked against the public ITU prefix table |
| CW | ITU-R M.1677 code; PARIS unit = 1200/WPM ms; Farnsworth gap = (60c − 37.2s)/(19cs) s | Decoder clusters key-down/gap lengths: tolerates ~±15 % jitter in tests; microphone decoding is experimental |
| QRM harmonics | Multiples n·f inside each band; small loop ≤ λ/10 perimeter | Harmonic lists are arithmetic only; source sketches are schematic, not recordings |
| Antenna mods | Qualitative evidence labels with reasons | No gain figures; ratings reflect handbook consensus, not simulation |
| Locator | Integer cell arithmetic; cell edge belongs to the north-east cell; lon 180 → −180; lat 90 → top row | A locator is a cell, not a point |
| Distance / bearing | Haversine, R = 6371.0088 km; forward azimuth; long path = circumference − short | Sphere: up to ~0.5% vs. the ellipsoid; true (not magnetic) bearings; undefined for coincident or antipodal points |

Band-preset buttons are convenience design frequencies, **not** a band plan; allocations differ by country. The Q-code list is a paraphrased common set, not a verbatim ITU list.

## Architecture

```
src/lib/        pure logic (rf, antenna, maidenhead, geo, units, morse, callsign, qrm, packs, project, scheduleImport, station, beams, log, trainer, timers, propagation, sat) — no Vue, fully unit-tested
src/data/       dated reference data kept apart from logic (Q codes, ITU bands, CTCSS, constants, callsign blocks, time stations, antenna mods, materials, toroid cores, QRM sources)
src/core/       registry.ts (typed tool list, categories, search) · store.ts (settings, favorites, locations, designs → localStorage) · packs.ts (content packs → IndexedDB)
src/components/ NumField (unit-aware validated input, v-model is canonical SI), ResultRow, ToolLayout, LineChart, WorldMap, LocationInput, DesignActions, ModsPanel, MaterialsPanel, PackManager, SpectrumSketch, and the SVG diagrams (BeamDiagram, RadialDiagram, SnifferLoopDiagram)
src/tools/      one .vue per tool, lazy-loaded
src/views/      dashboard, settings, saved designs
src/platform/   the only place for OS-level access (file save, clipboard)
tests/          lib maths + UI workflows
scripts/        offline acceptance check, screenshot generator
```

Canonical units are Hz, m, W, Ω and degrees; display units are a UI concern in `NumField`.

### Adding a tool

1. Put the maths in `src/lib/` with tests in `tests/`.
2. Create `src/tools/MyTool.vue`: wrap it in `<ToolLayout id="my-tool" :references="[…]">`, use `NumField` / `ResultRow`, and put the formula and assumptions in the `#explain` slot.
3. Add one entry to `tools` in `src/core/registry.ts` (id, title, category, kind, keywords, lazy import) and a `TOOL_ICON` entry (add the icon to `src/components/NavIcon.vue` if it is new). Routing, sidebar, search and favorites follow automatically.
4. Add `'tool/my-tool'` to the phone-width route list in `scripts/check-offline.mjs`. `tests/registry.test.ts` fails if a tool is missing its icon, category, route or page wiring.

## Desktop wrapper recommendation: Tauri 2

| | Tauri | Electron |
|---|---|---|
| Installer / memory | A few MB, OS webview, low RAM | ~80–150 MB, extra Chromium process |
| Offline install | Windows needs WebView2 (present on Win 10/11; offer the offline bootstrapper for old PCs); Linux needs WebKitGTK from the distro | Chromium bundled: nothing to install |
| Filesystem / serial / permissions | Explicit, allow-listed commands and scoped capabilities (fits "no unrestricted shell") | Broad Node access unless carefully sandboxed |
| Large map / manual packs | Read from the app data dir via scoped FS | Same |
| Local AI | Sidecar process (e.g. llama.cpp) started by an explicit command | Same, easier JS bindings |
| Risk | Webview differences between OSes — test each | Bigger and heavier; consistent rendering |

Recommendation: **Tauri**, because size, memory and a narrow permission model match this project and the app code stays plain web. Electron is the fallback only if WebKitGTK inconsistencies prove painful. Nothing in `src/` depends on either; native access goes through `src/platform/index.ts`.

## Roadmap

- [x] App shell, search, categories, favorites, themes, mobile layout
- [x] Frequency, Ohm's law, dB/dBm, SWR, reactance, feedline calculators
- [x] Dipole, inverted-V, vertical and loop designers
- [x] Maidenhead, distance/bearing, bundled offline map, saved locations
- [x] Offline acceptance check
- [x] Morse chart, player, WAV export and decoders
- [x] Content-pack infrastructure, ITU band plans, CTCSS, abbreviations, constants, callsign lookup
- [x] QRM hunting guide, antenna mods, broadcast schedules
- [x] Morse practice trainer (Koch method), UTC clock and timers, logbook with ADIF, station calculators, propagation basics and satellite passes
- [x] National band tables bundled for the USA, Canada, Germany, Australia, South Africa, Japan and Brazil; UK and India wait for official PDFs (see docs/DATA_SOURCES.md)
- [ ] DCS codes, DXCC-level callsign entities, CQ/ITU zones
- [x] Saved-project export/import (JSON file)
- [ ] Regional map packs (evaluate MapLibre GL + PMTiles) and pinch-zoom
- [ ] Tauri shell and clean-machine install tests on Windows and Linux
- [x] J-pole, end-fed, L-network matching, Yagi and quad starting designs (documented methods only)
- [ ] Manual library (user-imported PDFs, local search; OCR later) — no bundled radio-manual library is promised
- [ ] Optional local AI with page-level citations and no cloud fallback
- [ ] Narrow native utilities (serial discovery, checksums) via explicit commands

## Data, licenses and attribution

- **Reference project:** [it-tools](https://github.com/CorentinTh/it-tools) (GPL-3.0) was reviewed for ideas only — per-tool modules in a central registry, categories, and easy tool scaffolding. **No code or assets were copied.**
- **Icons:** the GitHub mark in the app is the Octicons “mark-github” icon (MIT, © GitHub, Inc.); the other menu icons are original line drawings.
- **Basemap:** Natural Earth 1:110m countries (public domain) via `world-atlas` 2.0.2 (ISC, © Michael Bostock), compiled into the app.
- **Runtime dependencies:** Vue, vue-router (MIT), topojson-client (ISC), satellite.js 6 (MIT, SGP4 orbit propagation). Fonts: none bundled (system stacks).
- Each tool's *Sources & references* panel names the handbooks used for the **methods**; no text was copied.

## Security & privacy notes

- Nothing leaves the device. The one exception is the **public demo build** (`npm run build:demo`), which can send anonymous page-view statistics to Google Analytics (measurement ID in `.env.demo`) **only after the visitor clicks Allow**: no call sign, designs, locations, log or search text, and no ad personalisation. The default build, the release zip and the desktop app contain no analytics code at all, and `npm run check:offline` would fail if they did. Settings, favorites, locations, saved designs and the **logbook** live in this browser's `localStorage`; clearing site data erases them. The logbook is not part of the project file: back it up with **Export ADIF**.
- **No framing.** The app refuses to be embedded in an `<iframe>` except by sites you list in `ALLOWED_FRAME_ANCESTORS` in `.env` (comma-separated origins, see `.env.example`). Headers do the real work (`vite preview` sends `Content-Security-Policy: frame-ancestors …`; the build also writes a Netlify/Cloudflare-style `_headers` file; for nginx or Apache copy the same header). A small blocking `frame-guard.js` blanks the page on hosts where you cannot set headers; it can be bypassed by a sandboxed frame or by turning off scripts, so treat it as a backstop.
- If the browser blocks storage, the app still works and says so in **Settings**.
- Antenna voltages are high at wire ends — keep them insulated and out of reach (the inverted-V tool warns about low ends).

## Releases and versions

**Demo page:** the web build is published at <https://hamradiotools.armysarge.co.za/>. It is the same app as the release zip but built with `npm run build:demo` (output in `dist-demo/`, the `ham-radio-tools-web-demo-<version>.zip` release asset), which adds the opt-in analytics banner and a Content-Security-Policy widened for Google's hosts only. Otherwise it is a static bundle (relative asset paths and hash routing, so it works from a sub-folder with no server rewrite rules). To publish a new version, unzip `ham-radio-tools-web-<version>.zip` over the site folder. The demo needs HTTPS for the microphone CW decoder; everything else runs without network access once the page has loaded.

One repository, one version (`package.json`), one GitHub release per version with several assets (web zip, later Windows and Linux installers). See [docs/RELEASING.md](docs/RELEASING.md) for the step-by-step process, how a desktop shell is added in the same repo, and how opt-in updating works without breaking the offline rules. Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Contributing

1. Fork the repository
2. Create a branch (`git checkout -b feature/my-tool`)
3. Add your tool with tests, then run `npm test` and `npm run build`
4. Commit and open a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT — see [LICENSE](LICENSE). Made by **ZS6SHZ**. 73!

## ☕ Buy me a coffee

If Ham Radio Tools saved you a trip to the shack, consider supporting its development.

<p align="center">
  <a href="https://buymeacoffee.com/armysarge"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me A Coffee"/></a>
</p>
