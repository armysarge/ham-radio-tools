# Changelog

All notable changes are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (while below 1.0, a minor bump may include breaking changes to saved data formats; those are always called out).

## [0.2.0] - 2026-10-19

### Added
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
