# Ham Radio Tools roadmap

Working features and future plans are tracked separately. A packaged build alone does not count as clean-machine verification.

## Available

- [x] Search, categories, favourites, themes, measurement units and responsive layouts.
- [x] RF/electronics calculators and component codes.
- [x] Illustrated antenna estimates, materials guidance, Yagi/quad starting designs and radial planning.
- [x] Offline map, Maidenhead, bearings and saved station locations.
- [x] Station calculators, battery/solar planning and DIY components.
- [x] Morse tools and Koch trainer, clocks/timers and ADIF logbook.
- [x] Propagation basics and satellite passes from imported elements.
- [x] National band tables, reference tools, QRM guide and dated content packs.
- [x] Project import/export and a repeatable web offline acceptance check.

## Current milestone: desktop delivery

The desktop wrapper is **Electron**, following the request to test Electron. It shares this repository, app version and Vue interface with the web build.

- [x] Electron shell using bundled files, a sandboxed renderer and a stable local origin/profile.
- [x] Commands for launching, automated smoke checks, unpacked builds and installers.
- [x] Windows NSIS and Linux AppImage/deb packaging configuration and release jobs.
- [x] Packaged-executable CI checks, native export/import and clipboard checks, plus a documented clean-machine acceptance checklist.
- [ ] Test installers on clean Windows and Linux machines with networking disabled, without Node.js installed.
- [ ] Verify microphone, file import/export, printing and clipboard on each supported OS.
- [x] Application icon, custom title bar and persistent window position, size and maximized state.
- [ ] Windows code signing.
- [x] Explicit GitHub release check and verified download controls; confirmed Windows installer launch and manual Linux AppImage replacement. No background checks.
- [ ] Complete a real published-release upgrade test on clean Windows and Linux machines; automated update transport is mocked.

## Reference and mapping improvements

- [ ] DCS code reference.
- [ ] Licensed and maintained DXCC entities, CQ zones and ITU zones.
- [ ] Verified UK and India tables; broader licence-class coverage where currently limited.
- [ ] Regional offline map packs and pinch zoom.

## Later

- [ ] Local manual library: import user-owned PDFs, bookmarks and text search; OCR later.
- [ ] Optional local AI with page citations, hardware guidance and no cloud fallback.
- [ ] Native utilities through narrow platform APIs: checksums, serial discovery and diagnostics.
- [ ] Further antenna methods and model-file export, separately labelled from simulation results.

See [CHANGELOG.md](CHANGELOG.md) for changes and [desktop verification notes](docs/DESKTOP.md#verification) for the platforms actually exercised.
