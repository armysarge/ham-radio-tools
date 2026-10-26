# Ham Radio Tools roadmap

Working features and future plans are tracked separately. A packaged build alone does not count as clean-machine verification.

## Available

- [x] Search, categories, favourites, themes, measurement units and responsive layouts.
- [x] RF/electronics calculators and component codes.
- [x] Illustrated antenna estimates, materials and band guidance, HF wire installation-height references, Yagi/quad starting designs, radial planning and a sourced QFH receive-design estimator.
- [x] Offline map, Maidenhead, bearings and saved station locations.
- [x] Station calculators, battery/solar planning and DIY components.
- [x] Morse tools and Koch trainer, clocks/timers and ADIF logbook.
- [x] Propagation basics, satellite passes from imported elements and a band-by-hour propagation report (DVOACAP engine, offline).
- [x] National band tables, reference tools, QRM guide and dated content packs.
- [x] Searchable DCS code reference with octal and polarity guidance.
- [x] Project import/export and a repeatable web offline acceptance check.
- [ ] Coordinate conversion and calculator.
- [ ] Unit conversion and calculator.
- [ ] Qubical quad antenna design tool
- [ ] ERP and EIRP calculations.
- [ ] Low pass filter and High pass filter calculators with diagrams.
- [ ] 92 codes like 73 (goodbye), etc
- [ ] SWR page addition for VSWR calculations.
- [ ] Voltage Divider calculator.
- [ ] How its calucalted section to show a proper mathematics illustration of any formulas.
- [ ] Improve phonetic alphabet page with pronunciation guidance.
- [ ] Doppler shift calculator.
- [ ] Moxon antenna design tool.
- [ ] AWG wire gauge calculator & conversion tool.
- [ ] Serial Impedance & Parallel Impedance calculators with illustrated diagrams.

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
- [ ] Complete a real published-release upgrade test on clean Windows and Linux machines; automated update transport is mocked.

## Current milestone: reference and mapping improvements

- [ ] Licensed and maintained DXCC entities, CQ zones and ITU zones.
- [ ] Verified UK and India tables; broader licence-class coverage where currently limited.
- [ ] Regional offline map packs and pinch zoom.

## Responsiveness follow-up

- [x] Add a browser stress check for repeated category toggles, navigation, search, theme and units controls, including after opening the propagation report. It passes in Edge on Windows, but has not reproduced the reported hang; root cause remains unknown.
- [x] Exercise repeated EFHW sidebar navigation in Electron and add a memory-only, bounded local navigation report, exported explicitly with Ctrl+Shift+F12. Check click delivery, route outcomes and visible link coverage without recording saved work or input values.
- [x] Inspect a real-world report: Inverted-V and Vertical clicks reached the app but repeatedly failed during routing while EFHW remained open. Add visible failure/recovery controls and retain safe error classes and bundled asset names in reports.
- [ ] Identify and resolve the exception behind the original route failures; the supplied report predates exception details and does not establish their underlying cause.

## Later

- [ ] Local manual library: import user-owned PDFs, bookmarks and text search; OCR later.
- [ ] Optional local AI with page citations, hardware guidance and no cloud fallback.
- [ ] Native utilities through narrow platform APIs: checksums, serial discovery and diagnostics.
- [ ] Further antenna methods and model-file export, separately labelled from simulation results.
- [ ] Further improvements and refinements based on user feedback and real-world usage scenarios.

See [CHANGELOG.md](CHANGELOG.md) for changes and [desktop verification notes](docs/DESKTOP.md#verification) for the platforms actually exercised.
