# Changelog

All notable changes are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (while below 1.0, a minor bump may include breaking changes to saved data formats; those are always called out).

## [0.3.0] - 2026-10-20

### Added
- Desktop application/installer icons, custom draggable title bar and window controls; saved position, size and maximized state with off-screen recovery.
- Electron desktop shell, local-only protocol, stable saved-data profile, explicit external-link and microphone prompts, desktop smoke test and Windows/Linux packaging configuration.
- Version-tag release workflow builds web/demo zips and Windows/Linux installers, collects checksums and creates a draft release for review.

### Changed
- Desktop content scrolling starts below the application header, keeping both the header and title bar fixed; first-launch centering is checked by the native smoke test.
- README rewritten for users. Developer details moved to docs/DEVELOPMENT.md; desktop testing and release instructions have dedicated guides.
- Roadmap moved to ROADMAP.md with desktop verification, signing and opt-in updating tracked separately.
- Third-party licence notices included in packages.

## [0.2.0] - 2026-10-19

### Added
- DIY Components page: air-core coil, toroid, foil-and-film capacitor, air-variable capacitor, dummy load and ferrite choke, each with a drawing, sizes, test steps and safety notes.
- Search and social metadata: description, Open Graph and Twitter cards with a generated preview image, canonical link, JSON-LD (WebSite, WebApplication, SoftwareSourceCode), robots.txt and sitemap; per-tool title and description at run time.
- Anti-framing: `frame-ancestors` headers (preview server and `_headers` file) plus an in-page guard; allowed embedding sites are set in `ALLOWED_FRAME_ANCESTORS` in `.env`.
- Expandable sections now look expandable (chevron, Show/Hide) and the interface has reduced-motion-safe animations.
- Opt-in Google Analytics for the public demo build only (`npm run build:demo`): consent banner and Settings switch, page paths only, no ad personalisation; absent from the default build, release zip and desktop app.
- Station tools: feedline loss, link budget and path loss (with radio horizon and Fresnel clearance), L-network matching, low-pass filter designer, coils and toroids, battery and solar planner.
- Yagi and quad starting designs and a radial and site planner.
- Logbook with duplicate warning and ADIF 3.1 export / import; UTC clock with time zones, station-ID reminder and UTC countdown; Koch Morse practice trainer.
- Propagation basics (band use by time of day, MUF estimate, sunrise / sunset / grey line map) and a satellite pass calculator from a pasted TLE (new runtime dependency: satellite.js 6, MIT, bundled).
- Categories “Station & Logging” and “Propagation & Satellites”.
- Components page: resistor colour codes (3–6 bands, both directions), capacitor and SMD / EIA-96 codes, E6–E96 preferred values, series/parallel, voltage divider, LED resistor.
- J-pole antenna design tool; the vertical tool is now titled “Vertical Antenna (Quarter-wave Ground Plane)” and its drawing shows radiator, radials, base insulator, coax and choke.
- “What to build it from” guidance (wire, coax, connectors, chokes, supports, weatherproofing) on every antenna tool.
- Step-by-step build guide, diagram, test and troubleshooting for the DIY shielded sniffer loop.
- National band tables for the USA, Canada, Germany, Australia (Advanced class), South Africa, Japan and Brazil, bundled with source, licence and revision date.
- Source registry (`scripts/pack-data/sources.json`), `npm run check:sources` drift check and `docs/DATA_SOURCES.md`.
- GitHub link with icon in the top bar, sidebar and Settings > About.
- ITU Radio Regulations explainer.
- End-fed half-wave (EFHW) antenna tool.
- Menu icons, themed scrollbars, 1 px smaller base text.
- Metric / Imperial selector in the top bar (Metric by default); distances, lengths and unit defaults follow it.
- CW tool: Morse chart, text-to-Morse player with PARIS and Farnsworth timing, WAV download, typed and tapped decoders, experimental microphone decoder.
- Callsign lookup (ITU series, island / home-nation entities, operating prefixes, /P /M /MM /AM suffixes).
- QRM hunting guide: method, source signatures, harmonic finder, DIY shielded-loop size calculator.
- Antenna mods panel (proven / situational / unproven) on the dipole, inverted-V, vertical and loop tools.
- Broadcast schedules tool with bundled time-signal stations and installable, dated schedule packs; converter for EiBi-layout and CSV schedule files.
- Content packs (band plans, broadcast schedules) stored in IndexedDB, with provenance validation and staleness warnings.
- ITU region band plans with a "what is at this frequency?" lookup; CTCSS tones; abbreviations; constants and rules of thumb.
- Saved-project export / import (JSON) for designs and locations.
- Inverted-V, quarter-wave vertical and full-wave loop antenna tools.
- App version shown in Settings, optional "your callsign" setting, About section.

### Fixed
- Logbook: FT4 and PSK31 are exported as ADIF submodes (MFSK/FT4, PSK/BPSK31), as ADIF 3.1.4 has no such top-level modes; submodes such as USB no longer replace the mode on import.
- Toroid table: FT50-61 AL corrected to 68 nH/turn².
- Satellite passes: element sets more than 60 days from the start time are refused rather than extrapolated; the demo set opens at its own epoch.
- Logo cropped to its content; phone screenshots removed from the README.
- Basemap polygons that cross the antimeridian (Russia, Fiji) no longer streak across the map.
- Content packs could not be stored from a reactive object (IndexedDB clone error).
- Phone layout: top bar, drawer navigation, wide tables and grid items no longer cause horizontal scrolling.

## [0.1.0] - 2026-10-19

### Added
- Application shell with search, categories, favorites and light/dark themes.
- Frequency/wavelength, Ohm's law, dBm/watts, SWR, reactance/resonance and feedline-length calculators.
- Half-wave dipole designer with trim helper, SVG export and printing.
- Maidenhead locators, distance and bearing on a bundled offline world map; saved locations.
- Offline acceptance check (all external requests blocked).

[0.2.0]: https://github.com/armysarge/ham-radio-tools/releases/tag/v0.2.0
[0.1.0]: https://github.com/armysarge/ham-radio-tools/releases/tag/v0.1.0
