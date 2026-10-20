<p align="center"><img src="docs/logo.svg" alt="Ham Radio Tools" width="336" /></p>
<p align="center"><b>Your amateur-radio workbench: calculate, design, build and operate.</b></p>
<p align="center"><a href="https://hamradiotools.armysarge.co.za/">Try it in your browser</a> · <a href="https://github.com/armysarge/ham-radio-tools/releases">Downloads</a> · <a href="ROADMAP.md">Roadmap</a></p>

Ham Radio Tools is a free, open-source collection of practical tools for radio amateurs, made by **ZS6SHZ**. Get a quick answer, explore an illustrated design, or expand an explanation to understand the method.

> **Early release:** antenna designs are starting estimates. Measure and tune your finished antenna with an analyser. Check your current licence and local rules before transmitting.

## What can I do with it?

| Area | Tools |
|---|---|
| RF & electronics | Frequency and wavelength, Ohm's law, power, dB/dBm, SWR, reactance, resonance and component colour codes |
| Antenna building | Dipole, inverted-V, EFHW, vertical, J-pole, loop, Yagi and quad designs; radial planning, dimensions, materials and build guidance |
| Station planning | Feedline loss, link budgets, matching networks, filters, coils, toroids, batteries and solar |
| Maps | Offline world map, Maidenhead grids, saved locations, distance and bearing |
| Operating | Band tables, callsign lookup, Q codes, phonetics, CTCSS, clocks and timers |
| CW & logging | Morse player and trainer, experimental decoder, logbook with ADIF import/export |
| Listening & propagation | QRM hunting and a sniffer-loop build guide, broadcast schedules, grey line, MUF estimates and satellite passes from your own TLE |
| DIY components | Build coils, capacitors, dummy loads and ferrite chokes with illustrated instructions |

Search for a tool, add favourites, choose Metric or Imperial, and switch between light and dark themes. Open **Show** below a tool for its explanation and references.

## Use it on your computer

**Browser:** open the [demo](https://hamradiotools.armysarge.co.za/). The hosted site needs a connection to load. For reliable use away from the internet, use a locally installed desktop build or serve the downloaded web bundle locally.

**Windows and Linux:** Electron desktop packaging is available for testing. When desktop assets are attached to a [release](https://github.com/armysarge/ham-radio-tools/releases), Windows uses an `.exe` installer; Linux uses an `.AppImage` or `.deb`. Node.js is bundled with Electron, so users do not install it separately. See the [desktop testing guide](docs/DESKTOP.md) to run or package it from source.

The desktop and standard web builds bundle the calculators, diagrams, reference tables and basic world map. No account is needed. In Electron, use **Settings & content → Desktop updates** to check for a release and choose whether to download it. Nothing checks or downloads automatically. Windows can open the downloaded installer after confirmation; Linux shows the AppImage for manual replacement.

## Your saved work

Data stays on your device in the browser profile or the desktop app's own profile. Different browsers, site addresses and the desktop app have separate data.

- **Designs and locations:** Settings & content → **Export project file**. Import that JSON file on another device.
- **Logbook:** use **Export ADIF** regularly. The logbook is backed up separately from projects.
- Clearing browser site data removes its saved work. Keep exported copies somewhere safe.

## Band tables and content packs

Band tables for the **USA, South Africa, Canada, Germany, Australia, Japan and Brazil** are included. Their scope varies; Australia currently covers Advanced licence holders. Each table displays its source and date. UK and India are awaiting verified source documents.

To add a schedule or regional plan, import its JSON pack under **Settings & content**. That screen can also convert a supported EiBi-layout or CSV shortwave schedule. Packs can be carried on a USB drive. Schedules are dated and show a warning when old; downloads are your choice. [Data sources and pack details](docs/DATA_SOURCES.md).

## Privacy and offline use

The desktop and standard web builds have no analytics or background update checks. The hosted demo offers optional Google Analytics after you accept its consent banner; you can change that choice in Settings. Your saved projects, logbook and search text are not deliberately included in page-view events.

The CW microphone decoder processes audio locally and asks for microphone permission. It is experimental. Satellite predictions need a recent element set supplied by you.

## Screenshots

| Dashboard | Dipole designer |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Dipole designer](docs/screenshots/dipole.png) |
| Offline map and grid tools | SWR calculator |
| ![Map](docs/screenshots/maidenhead.png) | ![SWR](docs/screenshots/swr.png) |

## Development and releases

- [Run, test and build the web app](docs/DEVELOPMENT.md)
- [Test and package Electron on Windows or Linux](docs/DESKTOP.md)
- [Create versioned GitHub releases](docs/RELEASING.md)
- [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)
- [Data sources](docs/DATA_SOURCES.md) · [Third-party notices](THIRD_PARTY_NOTICES.txt)

## Support the project

Report problems or suggest tools through [GitHub Issues](https://github.com/armysarge/ham-radio-tools/issues). Include the tool name, inputs and expected result when reporting a calculation problem.

MIT licensed — see [LICENSE](LICENSE). Map data: Natural Earth, public domain. The app uses Vue, satellite.js and other credited open-source libraries. The it-tools project inspired its tool organisation; no it-tools code or assets were copied.

[Buy ZS6SHZ a coffee](https://www.buymeacoffee.com/armysarge). 73!
