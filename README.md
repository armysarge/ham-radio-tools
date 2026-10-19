# Ham Radio Tools

An offline-first amateur-radio workbench: RF calculators, a dipole designer, and Maidenhead/distance/bearing tools on a bundled world map. Vue 3 + TypeScript + Vite. MIT licensed.

## Status (milestone 1)

| Done | Not yet |
|---|---|
| App shell, sidebar, search (`/` key), categories, favorites, light/dark/auto theme, text-size setting | Q codes, Morse, time/timers, band-plan packs |
| Tools: frequency↔wavelength, Ohm's law, dBm/watts/dB, SWR/return loss, half-wave dipole, Maidenhead + distance/bearing + map, phonetic alphabet | Reactance/resonance, feedline electrical length (maths exists in `src/lib/rf.ts`, **no UI yet**), inverted-V, vertical, loop |
| Local settings, saved locations (+ "my station"), saved dipole designs, SVG export, print | Regional map packs, manual library, local AI, native utilities, desktop wrapper |

## Setup

Requires Node 20+ (developed on Node 24). **Development needs the network once** (`npm install`); **running the built app never does.**

```bash
npm install        # dev-time download of build tools
npm run dev        # http://localhost:5173
npm test           # unit + component tests (23)
npm run build      # type-check + production build into dist/
npm run check:offline   # offline acceptance check (needs Microsoft Edge or Chrome installed)
```

`dist/` is plain static files with relative paths. Browsers refuse ES modules from `file://`, so serve it from any local static server (`npx vite preview`) or, later, the desktop shell. Double-clicking `index.html` will not work; this is a limitation of web builds, not a network dependency.

### Dev-time vs runtime

| Dev-time (needs download) | Runtime (must work offline) |
|---|---|
| npm packages, Vite, TypeScript, Vitest | Everything in `dist/`: code, fonts (system stacks), icons, diagrams, basemap (~100 KB JSON compiled into the map chunk) |
| Optional future content-pack downloads (explicit user action) | Calculations, persistence (`localStorage`), maps, search |

## Offline guarantees and how they are checked

- No CDN, hosted API, telemetry, update check or online tile requests. A Content-Security-Policy in `index.html` restricts loads to the app's own origin.
- Not a PWA: there is no service worker, so nothing relies on a prior online visit.
- `npm run check:offline` scans `dist/` for external URLs, then drives the built app in a real browser with **every non-localhost request blocked and recorded**: start-up, search, four calculators, dipole save, map + locator, favorites/saved-design persistence across reload.
- **Not yet done:** the separate clean-machine installation check (needs a packaged installer, which doesn't exist yet).

**What has actually been run:** Windows 10 (build 19045), Node 24, Microsoft Edge via Playwright, Vitest/jsdom. Linux, macOS, Firefox, Safari, tablets: **untested**. Layouts are responsive CSS but were only eyeballed at 768 px and a narrow desktop pane, dark theme mostly; light theme and phone width were not reviewed.

## Desktop wrapper recommendation: Tauri 2 (when you get there)

| | Tauri | Electron |
|---|---|---|
| Installer / memory | A few MB, uses OS webview, low RAM | ~80–150 MB bundle, extra Chromium process |
| Offline install | Windows needs WebView2 (present on Win 10/11; offer the offline bootstrapper for old PCs); Linux needs WebKitGTK from the distro | Chromium bundled: nothing to install |
| Filesystem / serial / permissions | Explicit, allow-listed Rust commands and scoped capabilities (fits "no unrestricted shell") | Broad Node access unless carefully sandboxed |
| Large map/manual packs | Read from app data dir via scoped FS | Same |
| Local AI | Sidecar process (e.g. llama.cpp) started by explicit command | Same, easier JS bindings |
| Risk | Webview differences between OSes (test on each) | Bigger and heavier; consistent rendering |

Recommendation: **Tauri**, because size, memory and a narrow permission model match this project, and the app code stays plain web. Electron is the fallback only if WebKitGTK inconsistencies on Linux prove painful. Nothing in `src/` depends on either; native access goes through `src/platform/index.ts`.

## Architecture

```
src/lib/        pure calculation code (rf, antenna, maidenhead, geo, units) — no Vue, fully unit-tested
src/core/       registry.ts (typed tool list, categories, search) · store.ts (settings, favorites, locations, designs → localStorage)
src/components/ NumField (unit-aware validated input; v-model is canonical SI), ResultRow, ToolLayout, LineChart, WorldMap, LocationInput
src/tools/      one .vue per tool, lazy-loaded
src/views/      dashboard, settings, saved designs
src/platform/   the only place for OS-level access (file save, clipboard)
tests/          lib maths + UI workflows
scripts/        offline acceptance check
```

Canonical units are Hz, m, W, Ω, degrees; display units are a UI concern in `NumField`.

### Adding a tool

1. Put calculations in `src/lib/` with tests in `tests/`.
2. Create `src/tools/MyTool.vue`: wrap content in `<ToolLayout id="my-tool" :references="[…]">`, use `NumField`/`ResultRow`, put the formula and assumptions in the `#explain` slot.
3. Add one entry to `tools` in `src/core/registry.ts` (id, title, category, `kind`: analytical / empirical / reference, keywords, lazy import). Routing, sidebar, search and favorites follow automatically.

## Calculation references and known limitations

| Tool | Method | Limits |
|---|---|---|
| Wavelength | λ = c·VF/f, c = 299 792 458 m/s | VF is user-supplied |
| dBm / dB | 10·log₁₀(P/1 mW); 20·log₁₀ for voltage | Voltage dB assumes equal impedances (stated in UI) |
| SWR family | Γ-based relations; resistive load: Γ = (R−Z₀)/(R+Z₀) | Lossless line; resistive loads only (no complex impedance yet) |
| Dipole | L = k·c/2f, default k = 0.95 (≈ 468/f ft). *Empirical design estimate* | No pattern, impedance, bandwidth or height/ground modelling; trim helper is a small-change linear estimate |
| Locator | Integer cell arithmetic; cell edges belong to the north-east cell; lon 180 → −180; lat 90 → top row | Locator = cell, not point |
| Distance/bearing | Haversine, R = 6371.0088 km; forward azimuth; long path = circumference − short | Sphere: up to ~0.5% distance error vs ellipsoid; true (not magnetic) bearings; undefined for coincident/antipodal points |

Band-preset buttons in the dipole tool are convenience design frequencies, **not** a band plan; allocations differ by country.

## Data, licenses, attribution

- **Reference project**: [it-tools](https://github.com/CorentinTh/it-tools) (GPL-3.0) was reviewed for ideas only (per-tool modules registered in a central list, categories, scaffolding for new tools). **No code or assets were copied**; this project's identity and code are original, MIT licensed.
- **Basemap**: Natural Earth 1:110m countries (public domain), packaged by `world-atlas` 2.0.2 (ISC, © Michael Bostock). Shipped as a compiled-in JSON.
- Runtime dependencies: Vue, vue-router (MIT), topojson-client (ISC). Fonts: none bundled (system font stacks).
- The reference lists in each tool name textbooks/handbooks as sources for the *methods*; no text was copied.

## Optional content (planned)

Future map/manual/band-plan packs will be separate folders imported from a file or USB stick, shown in **Settings & content** as *Bundled*, *Installed* or *Unavailable*. The page already shows that table; no import mechanism exists yet. Storage needs will be listed per pack.

## Roadmap

1. Remaining catalog A–D items; inverted-V, vertical, loop; saved-project export/import (JSON file).
2. Regional map packs (vector tiles in a single-file archive read locally; evaluate MapLibre GL + PMTiles) and band-plan packs with jurisdiction, source and revision date.
3. Tauri shell + clean-machine install tests on Windows and Linux.
4. Manual library (user-imported PDFs, local search; OCR later). No bundled radio-manual library is promised.
5. Optional local AI (retrieval over installed manuals, page-level citations, no cloud fallback; model size and licence disclosed per model).
6. Narrow native utilities (serial discovery, checksums) via explicit Tauri commands.
