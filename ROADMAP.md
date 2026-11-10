# Ham Radio Tools roadmap

Working features and future plans are tracked separately. A packaged build alone does not count as clean-machine verification.

Status reviewed **2026-10-26**. Recent additions passed the production build, automated unit/UI checks, Edge offline acceptance and Windows development Electron smoke checks. Linux and clean-machine installer validation remain separate outstanding tasks.

## Available

- [x] Integrated all-service allocations in Band Plans: searchable lookup, chart and list, service/range filters, ITU 2024 Regions 1/2/3 and Canadian national 2026 data; labelled regional context alongside other national amateur tables.

- [x] Startup splash with named loading stages, accessible progress, light/dark appearance and slow/failed-start recovery for web and Electron. Desktop retains a fast splash for 700 ms from first native window display; web hands off immediately. No preloading of every tool.
- [x] Animated desktop update progress with actual percentages, checksum-verification status, reduced-motion support and progress retained while navigating between tools.

- [x] Search, categories, favourites, themes, measurement units and responsive layouts.
- [x] RF/electronics calculators and component codes.
- [x] Illustrated antenna estimates, materials and band guidance, HF wire installation-height references, Yagi/quad starting designs, radial planning and a sourced QFH receive-design estimator.
- [x] Offline map, Maidenhead, bearings and saved station locations.
- [x] Station calculators, battery/solar planning and DIY components.
- [x] Dedicated Morse & CW category with the sender, decoder and chart, plus a guided trainer starting with E and T. Includes missed-character review, daily and speed challenges, on-air word practice, XP, streaks and badges saved on the device.
- [x] Clocks, timers and ADIF logbook.
- [x] Propagation basics, satellite passes from imported elements and a band-by-hour propagation report (DVOACAP engine, offline).
- [x] National band tables, reference tools, QRM guide and dated content packs.
- [x] “On the air now” schedule section with live UTC matching, grouped station frequencies, filtering, stale-data notices and overnight weekday handling. Combines all bundled schedules and installed broadcast packs, independently of the detailed-table dropdown; no live reception/status service.
- [x] Searchable DCS code reference with octal and polarity guidance.
- [x] Project import/export and a repeatable web offline acceptance check.
- [x] Coordinate conversion: decimal degrees, degrees/decimal minutes, DMS, locator centres, offline map and saved locations. Notation only; no datum or UTM conversion.
- [x] Unit conversion: length, area, frequency, time, power, voltage, current, resistance, capacitance, inductance, energy and temperature.
- [x] Cubical quad starting designs: existing 2–5 element square-loop beam tool, now named Cubical Quad Beam for discovery. Empirical dimensions, not a validated antenna simulation.
- [x] Rotatable 3D cubical quad construction view with azimuth/elevation controls, spreaders, boom and a driven-loop feed gap; original SVG with relative geometry from the design dimensions.
- [x] ERP and EIRP calculations with dBi/dBd references, feed-system loss and a power calculation chain.
- [x] Low-pass and high-pass LC filter designers with pi/T connection diagrams, part values, Butterworth/Chebyshev responses and ideal attenuation curves.
- [x] Number Codes & 92 Code: searchable 73/88/QRP 72, usage examples, International Morse and selected historical 1/6/30 meanings. A curated guide, not a complete historical codebook.
- [x] SWR/VSWR page: voltage maxima/minima input, validated extrema, ideal matched/total-reflection cases and an interactive normalised standing-wave envelope.
- [x] Voltage Divider tool with a live labelled circuit, engineering-notation inputs, output voltage/current, ratio and equivalent source resistance. Shared with the calculator in Component Codes; searchable and independently favouritable.
- [x] Readable equations across tool explanation panels, with labelled symbols and units, consistent mathematical notation and wrapping on narrow screens.
- [x] Phonetic Alphabet pronunciation guide for all letters and digits, with syllable stress and alternate pronunciations for Charlie and Uniform.
- [x] Standalone Doppler Shift calculator for one-way frequency offset and received frequency from user-entered line-of-sight speed and direction.
- [x] Moxon Rectangle starting designs from Cebik’s equations, with A–E dimensions, cut lengths, a plan view and build guidance.
- [x] AWG Wire Gauge tool: gauge, diameter and area conversion (0000–40 AWG), copper DC resistance and mass with temperature, voltage drop and power loss on a run, thinnest gauge for an allowed drop, skin depth and an AWG chart. Solid bare copper only; no ampacity ratings.
- [x] Complex Impedance (Series & Parallel): up to five resistors, inductors, capacitors or R + jX impedances at one frequency, with a live circuit diagram, rectangular and polar impedance, admittance, equivalent series circuit with Q, and SWR/return loss against a real reference impedance. Ideal parts at a single frequency; no parasitics, loss models or transmission lines.
- [x] Satellite Doppler tracking: user-entered downlink and optional uplink frequencies give the Doppler-corrected receive and transmit frequencies, range rate, elevation and azimuth along any predicted pass (10/30/60 s steps). The calculation uses first-order shift from the predicted range rate and keeps TLE age visible.
- [x] Bundled SatNOGS DB frequency presets for 11 satellites (CC BY-SA 4.0), with snapshot age and a stale-data warning. Operator activity sources open on request: AMSAT recent reports, ARISS station status for ISS and the JARL FO-29 activation schedule. Activity remains unknown within the offline app.
- [x] Saved satellite element-set library: save pasted TLEs, import multi-satellite files, per-set age, newest epoch kept, stored on the device for offline use. The desktop app has an explicit, rate-limited **Update from CelesTrak** button; the web build uses file import only. Not part of project export, since element sets go stale within days.
- [x] Info (ⓘ) button on every tool page with a plain-language “What is this?” explanation.
- [x] Maintainer content-update calendar with monthly schedule checks, seasonal handoffs, source review dates and a review log; see [CONTENT_MAINTENANCE.md](docs/CONTENT_MAINTENANCE.md).

## BBC frequency reference delivered; programme guide pending

- [x] Inspect the supplied BBC frequency-page snapshot and record its provenance, checksum, conversion cautions and validity window: **2026-10-25–2027-03-27**.
- [x] Bundle a factual BBC frequency reference with 30 entries from the 21 supplied rows, including weekday restrictions, midnight boundaries, DRM and 639/702/720 kHz medium-wave entries; original HTML/artwork are excluded.
- [x] Enforce BBC's inclusive UTC season for live/time-filtered matches, with upcoming/expired notices and a labelled reference view outside the season.
- [x] Imported broadcast schedule packs can include an inclusive UTC validity window. Upcoming and expired schedules are excluded from live and time-filtered matches and remain available under Everything. The 45-day age warning still applies independently.
- [ ] Establish terms for separately distributed BBC content packs; no general BBC redistribution licence is claimed.
- [ ] Obtain a separate dated, maintainable programme-listing source and confirm its redistribution terms. The supplied frequency page has no programme titles.

Follow the [maintenance notes](docs/CONTENT_MAINTENANCE.md#bbc-source-handoff). The frequency reference is bundled in the app; a standalone BBC pack and programme guide remain pending.

## Completed milestone: desktop delivery

The desktop wrapper is **Electron**, following the request to test Electron. It shares this repository, app version and Vue interface with the web build.

- [x] Electron shell using bundled files, a sandboxed renderer and a stable local origin/profile.
- [x] Commands for launching, automated smoke checks, unpacked builds and installers.
- [x] Windows NSIS and Linux AppImage/deb packaging configuration and release jobs.
- [x] Packaged-executable CI checks, native export/import and clipboard checks, plus a documented clean-machine acceptance checklist.
- [x] Application icon, custom title bar and persistent window position, size and maximized state.
- [x] Explicit GitHub release check and verified download controls; confirmed Windows installer launch and manual Linux AppImage replacement. No background checks.

### Remaining desktop validation

- [ ] Test installers on clean Windows and Linux machines with networking disabled, without Node.js installed.
- [ ] Verify microphone, file import/export, printing and clipboard on each supported OS.
- [ ] Exercise **Update from CelesTrak** against the live service from an installed Windows and Linux build. The fetch logic is covered by unit tests with a mocked response only.
- [ ] Offer the one-click element update in the web build if CelesTrak's CORS headers allow it and the content-security policy can be widened for that one host.
- [ ] Complete a real published-release upgrade test on clean Windows and Linux machines; automated update transport is mocked.

## Planned: reference and mapping improvements

- [ ] Additional national all-service datasets and fuller footnote handling, with official source verification, dated updates and redistribution review. Regional frameworks remain clearly distinguished from national rules.

- [ ] Licensed and maintained DXCC entities, CQ zones and ITU zones.
- [ ] Verified UK and India tables; broader licence-class coverage where currently limited.
- [ ] Regional offline map packs and pinch zoom.

## Responsiveness follow-up

- [x] Add a browser stress check for repeated category toggles, navigation, search, theme and units controls, including after opening the propagation report.
- [x] Exercise repeated EFHW sidebar navigation in Electron.
- [x] Identify the later report's missing JavaScript files as an older build removed by rebuilding `dist/` while Electron was running. Retain the launch-time bundle and add a regression that removes an unopened tool file and replaces the entry page in an isolated app copy.
- [x] Remove temporary navigation click/route diagnostics, report export and the diagnostic shortcut. Retain the normal visible error/reload fallback.
- [ ] Confirm the fix during extended everyday use; investigate any reports showing a different cause.

## Later

- [ ] Local manual library: import user-owned PDFs, bookmarks and text search; OCR later.
- [ ] Optional local AI with page citations, hardware guidance and no cloud fallback.
- [ ] Native utilities through narrow platform APIs: checksums, serial discovery and diagnostics.
- [ ] Further antenna methods and model-file export, separately labelled from simulation results.
- [ ] Further improvements and refinements based on user feedback and real-world usage scenarios.

See [CHANGELOG.md](CHANGELOG.md) for changes and [desktop verification notes](docs/DESKTOP.md#verification) for the platforms actually exercised.
