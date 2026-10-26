# Testing the Electron app

The desktop shell uses the same Vue app as the website. It loads the standard offline build from the installed files, with no local web server. Electron includes Chromium and Node.js; users need neither Node.js nor a webview download to run the packaged app.

## Run from source

Install Node.js 22.12 or newer (Node 24 recommended), clone the repository, and run these commands from its root:

```sh
npm ci
npm run desktop
```

On first use, the Electron package may download its runtime binary. Development and packaging need internet for those downloads; the resulting installed app runs offline. Each `desktop` command builds current source before opening the window. Close it, edit source and rerun to test changes.

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

The renderer is sandboxed, uses context isolation and has no Node.js API. A narrow preload bridge exposes window controls, explicit update actions, copy-to-clipboard and file export through a native save dialog. It cannot read arbitrary files or run arbitrary commands. Only bundled app files can load through its custom protocol. HTTP requests from the renderer session are blocked. Spellchecking is disabled to prevent automatic dictionary downloads. Clicking an external reference prompts before opening the system browser. Microphone requests prompt separately.

In Settings, **Check for updates** contacts the fixed public GitHub repository from the main process. A separate **Download** action saves the matching Windows installer or Linux AppImage and verifies its size and SHA-256 against `SHA256SUMS.txt`. Windows installer launch requires a further click and confirmation; Linux reveals the AppImage for manual replacement. There are no startup checks, tokens, background downloads, npm installs or repository clones. Network failures leave the installed app usable. See [release instructions](RELEASING.md#desktop-updates).

The implementation follows [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security). Packaging uses [electron-builder](https://www.electron.build/configuration/). Vite bundles Vue and the tools; Electron packages the runtime, `dist/`, the desktop entry files and licences. Users do not run `npm install` inside a release.

Dependency audit at implementation time: npm reports eight moderate advisories through electron-builder's build-time logger (`sprintf-js` via roarr/global-agent). They are not bundled into the application. The older packager suggested by npm audit introduced higher-severity advisories, so it was not retained. Check upstream fixes before a public release; production dependencies currently audit clean.

## Verification

### Intermittent sidebar clicks

If a sidebar item stops opening, press **Ctrl+Shift+F12 before restarting** to export `ham-radio-tools-navigation.json`. Share it with the affected item, app version and the last action. If possible, compare the same tool's card on **All tools** and note whether keyboard activation still works.

The desktop renderer keeps only the last 80 navigation and sidebar/header pointer events in memory. The explicitly exported report includes tool IDs, click coordinates, route outcomes, viewport details, browser/runtime identification and visible-link hit testing. Failed routes also include an error class/category and bundled JavaScript/CSS filenames when available; raw messages, filesystem paths, URL query values, form values, callsigns and saved work are excluded. It sends nothing and resets on restart. Native Windows hit testing and a fully hung renderer can prevent events or the export shortcut reaching JavaScript, so absence of an event alone does not establish the cause.

Failed tool loads display a notice above the current page with **Try again**, **Save error report** and **Reload app** actions. The app never reloads automatically: unfinished inputs could be lost. Save work and export the report before reloading. A failed JavaScript module can remain rejected for the life of the page, so restoring its file may still require a reload.

The supplied 2026-10-26 report confirms clicks reached Inverted-V and Vertical, followed by repeated route errors while EFHW stayed open. It does not include the exceptions, so the underlying cause is still unconfirmed. When testing a development Electron shell, close it before rebuilding `dist/`: a running page holds references to hashed files from its launch build, and a rebuild can remove files for tools that have not loaded yet. Installed releases contain their own bundled files.

### Recorded checks

Record actual outcomes here after testing. A build or automated smoke check does not prove clean-machine installation, hardware microphone operation or Linux compatibility.

- Windows 10 build 19045, Node 24, Electron 44.9.1: development shell and packaged `win-unpacked` executable passed startup, calculation, map, saved-design persistence across restart, renderer isolation and blocked external-fetch checks on 2026-10-20.
- Windows development Electron 44.9.1 on 2026-10-26: paced sidebar navigation (192 transitions in a focused run), plus the extended smoke check with EFHW/favourite links and Ctrl+Shift+F12 report export passed. These use browser-generated input; native Windows mouse hit testing could not be verified because screen capture timed out. The intermittent reported failure remains unresolved. The latest changes have not been retested in a packaged installer or on Linux.
- Windows development Electron 44.9.1 on 2026-10-26: deliberately blocking Inverted-V's bundled JavaScript reproduced a failed route while retaining EFHW. The visible notice, report export with module-load category/asset name, and manual reload recovery passed after restoring access. Full suite: 297 tests; production build and Edge offline acceptance passed. This verifies recovery from an injected resource failure, not the underlying cause of the supplied report. Linux and packaged-installation checks were not repeated for this change.
- Windows x64 NSIS installer was generated as `ham-radio-tools-0.3.0-win-x64.exe`. It has not been installed on a clean machine.
- Linux packaging and runtime: configured for CI, not exercised locally.
- Expanded Windows development and packaged-executable checks on 2026-10-20 passed project file export/import, copy bridge and native clipboard round trip, PDF print-engine rendering, plus explicit update check/download and tampered-file rejection using mocked GitHub responses. The clipboard probe previously returned empty in this environment; the harness reports this limitation explicitly if it recurs. These are not hardware or real release upgrade tests.
- Clean-machine installation, offline first launch, microphone hardware and printer checks: pending. Follow [the desktop acceptance checklist](DESKTOP_ACCEPTANCE.md) and record actual OS versions and results.

### Windows development sandbox access

On some restricted Windows workspaces, the downloaded Electron folder lacks the read/execute ACL needed by Chromium's sandbox. If Electron specifically reports `install_dir_access.cc` with the `ALL APPLICATION PACKAGES` error, grant read/execute on that folder only:

```powershell
icacls "$PWD\node_modules\electron\dist" /grant '*S-1-15-2-1:(OI)(CI)(RX)'
```

Do this only for that error; keep the renderer sandbox enabled. A packaged installation may have different inherited permissions and needs its own verification.
