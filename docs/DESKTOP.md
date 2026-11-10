# Testing the Electron app

The desktop shell uses the same Vue app as the website. It loads the standard offline build from the installed files, with no local web server. Electron includes Chromium and Node.js; users need neither Node.js nor a webview download to run the packaged app.

## Run from source

Install Node.js 22.12 or newer (Node 24 recommended), clone the repository, and run these commands from its root:

```sh
npm ci
npm run desktop
```

On first use, the Electron package may download its runtime binary. Development and packaging need internet for those downloads; the resulting installed app runs offline. Each `desktop` command builds current source before opening the window. Close it, edit source and rerun to test changes.

Electron retains a snapshot of its bundled web files for each running process. Building the website while Electron is open no longer removes files that its unopened tools need. Reloading uses the same snapshot; close and relaunch Electron to use a newer build. The current snapshot holds about 2 MB of application files in memory. Optional packs and saved work are separate and are not copied into this snapshot.

For the automated smoke check:

```sh
npm run check:desktop
```

For a packaged executable, set `HRT_DESKTOP_EXEC` to its absolute path and run `node scripts/check-desktop.mjs`. The same checks run against that executable with a disposable profile.

This uses a temporary profile to test startup, a calculation, the bundled map, saved designs across an app restart, window controls, saved window bounds/maximized state, renderer isolation and a blocked external fetch. Your regular desktop data is untouched. Linux headless checks need both Xvfb and a window manager for maximize/restore/minimize. Install `xvfb`, `openbox` and `x11-utils`, then run `bash scripts/with-linux-display.sh npm run check:desktop`. The helper starts an isolated display and waits for Openbox before testing. Do not disable Electron's sandbox to work around a Linux configuration problem. These are test-machine dependencies, not bundled application dependencies.

## Build an executable or installer

```sh
npm run desktop:unpacked
npm run desktop:dist
```

The first command produces a folder under `desktop-out/`: on Windows, run `desktop-out/win-unpacked/Ham Radio Tools.exe`. It can be launched without the repository or Node.js. Keep the whole folder together, including its resources and licences.

The second command builds installers for the current OS:

| Build host | Output |
|---|---|
| Windows | `ham-radio-tools-<version>-win-x64.exe` (NSIS installer) |
| Linux | `ham-radio-tools-<version>-linux-x64.AppImage` and `.deb` |

Build Windows on Windows and Linux on Linux. The GitHub release workflow does this with separate runners. Windows may display a reputation warning for a newly published installer.

## Window controls and appearance

The desktop app uses the Ham Radio Tools icon and its own draggable title bar. Use its buttons to minimize, maximize/restore or close. Double-click the title area to maximize/restore. Normal window position, size and maximized state are saved in `window-state.json` in the profile below. A disconnected monitor or smaller screen causes the window to be brought back into the available work area. Minimized state is not restored.

Icon assets are committed for packaging. To regenerate them from `public/app-icon.svg`, run `node scripts/build-icons.mjs` on a development machine with Microsoft Edge installed; release builds do not need Edge.

## Saved work

Desktop data uses the stable origin `hrt://app` and a profile directory named `ham-radio-tools`:

- Windows: `%APPDATA%/ham-radio-tools`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/ham-radio-tools`

It is separate from data on the hosted demo. Export a project JSON and an ADIF log from the website, then import them in Electron. Keep regular exports; the profile is not a backup. Uninstall configuration preserves the profile by default.

## Security and networking

The renderer is sandboxed, uses context isolation and has no Node.js API. A narrow preload bridge exposes window controls, explicit update actions, an explicit satellite element-set download, copy-to-clipboard and file export through a native save dialog. It cannot read arbitrary files or run arbitrary commands. Only bundled app files can load through its custom protocol. HTTP requests from the renderer session are blocked. Spellchecking is disabled to prevent automatic dictionary downloads. Clicking an external reference prompts before opening the system browser. Microphone requests prompt separately.

In Settings, **Check for updates** contacts the fixed public GitHub repository from the main process. A separate **Download** action saves the matching Windows installer or Linux AppImage and verifies its size and SHA-256 against `SHA256SUMS.txt`. Windows installer launch requires a further click and confirmation; Linux reveals the AppImage for manual replacement. There are no startup checks, tokens, background downloads, npm installs or repository clones. Network failures leave the installed app usable. See [release instructions](RELEASING.md#desktop-updates).

The only other outbound request is **Update from CelesTrak** on the Satellite Pass Calculator. It runs in the main process, only when the button is pressed, for one fixed documented CelesTrak URL (the amateur-radio group in TLE format), no more than once every 2 hours, with a descriptive User-Agent. Any non-200 response stops the request and is shown to the user; redirects are not followed. Nothing is fetched at startup or in the background. The web build never makes this request; saved sets can also be filled by importing a file.

The implementation follows [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security). Packaging uses [electron-builder](https://www.electron.build/configuration/). Vite bundles Vue and the tools; Electron packages the runtime, `dist/`, the desktop entry files and licences. Users do not run `npm install` inside a release.

Dependency audit at implementation time: npm reports eight moderate advisories through electron-builder's build-time logger (`sprintf-js` via roarr/global-agent). They are not bundled into the application. The older packager suggested by npm audit introduced higher-severity advisories, so it was not retained. Check upstream fixes before a public release; production dependencies currently audit clean.

## Verification

### Tool loading after a rebuild

Temporary navigation diagnostics have been removed after identifying the bundle-replacement cause. There is no pointer/route journal, link-coverage inspection, error classifier, diagnostic export or associated keyboard shortcut.

Normal failed tool loads still display a notice with **Try again** and **Reload app** actions. The app never reloads automatically: unfinished inputs could be lost. Save work before reloading. Relaunch Electron to use a newly built bundle.

The first 2026-10-26 report showed route errors without exception details. The later report identified failed JavaScript loads for Ohm's Law, SWR, Reactance and dBm/Watts after about eight minutes. All four filenames exactly matched a temporary reconstruction of the build before the favourite-star change; the running app still referenced those files after a verification build replaced `dist/`. This development-session failure is now prevented by retaining the entire launch-time bundle before opening the window. Installed releases contain their own bundled files. Different future failures still require investigation; this does not establish that every possible navigation issue has the same cause.

### Recorded checks

Record actual outcomes here after testing. A build or automated smoke check does not prove clean-machine installation, hardware microphone operation or Linux compatibility.

- Windows 10 build 19045, Node 24, Electron 44.9.1: development shell and packaged `win-unpacked` executable passed startup, calculation, map, saved-design persistence across restart, renderer isolation and blocked external-fetch checks on 2026-10-20.
- Windows development Electron 44.9.1 on 2026-10-26: paced sidebar navigation (192 transitions in a focused run), plus the extended smoke check with EFHW/favourite links passed. These use browser-generated input; native Windows mouse hit testing could not be verified because screen capture timed out. This early check did not reproduce the later-identified bundle-replacement failure.
- Windows development Electron 44.9.1 on 2026-10-26: deliberately blocking Inverted-V's bundled JavaScript reproduced a failed route while retaining EFHW. The visible notice and manual reload recovery passed after restoring access. At that stage, the full suite had 297 tests; production build and Edge offline acceptance passed. Linux and packaged-installation checks were not repeated for this change.
- Subsequent 2026-10-26 report: four failed tool filenames matched the pre-rebuild bundle exactly. The new startup snapshot passed a Windows Electron regression that deleted the still-unopened Ohm's Law module and replaced the entry HTML in a disposable app copy; opening the tool and reloading still worked. The broader Electron smoke check and 300 unit/UI tests passed. The current fix has not been retested on Linux or in a packaged installer. Extended everyday use is still needed to check for any separate navigation issue.
- Windows x64 NSIS installer was generated as `ham-radio-tools-0.3.0-win-x64.exe`. It has not been installed on a clean machine.
- Linux packaging and runtime: configured for CI, not exercised locally.
- Expanded Windows development and packaged-executable checks on 2026-10-20 passed project file export/import, copy bridge and native clipboard round trip, PDF print-engine rendering, plus explicit update check/download and tampered-file rejection using mocked GitHub responses. The clipboard probe previously returned empty in this environment; the harness reports this limitation explicitly if it recurs. These are not hardware or real release upgrade tests.
- Clean-machine installation, offline first launch, microphone hardware and printer checks: pending. Follow [the desktop acceptance checklist](DESKTOP_ACCEPTANCE.md) and record actual OS versions and results.

The 2026-10-26 Windows development-shell check also exercised ERP/EIRP gain-reference changes and both LC filter circuit pages, including a nine-part high-pass ladder. Edge offline acceptance covered these workflows with external networking blocked and checked all routes at 375 px. Linux and clean-machine installer checks were not repeated for these additions.

### Windows development sandbox access

On some restricted Windows workspaces, the downloaded Electron folder lacks the read/execute ACL needed by Chromium's sandbox. If Electron specifically reports `install_dir_access.cc` with the `ALL APPLICATION PACKAGES` error, grant read/execute on that folder only:

```powershell
icacls "$PWD\node_modules\electron\dist" /grant '*S-1-15-2-1:(OI)(CI)(RX)'
```

Do this only for that error; keep the renderer sandbox enabled. A packaged installation may have different inherited permissions and needs its own verification.
