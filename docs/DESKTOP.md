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

This uses a temporary profile to test startup, a calculation, the bundled map, saved designs across an app restart, window controls, saved window bounds/maximized state, renderer isolation and a blocked external fetch. Your regular desktop data is untouched. Linux graphical tests need a display, for example `xvfb-run -a npm run check:desktop` in CI. Do not disable Electron's sandbox to work around a Linux configuration problem.

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

Build Windows on Windows and Linux on Linux. The GitHub release workflow does this with separate runners. Default configuration is unsigned: Windows may display a reputation warning. Do not describe unsigned builds as signed or verified by Microsoft.

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

Record actual outcomes here after testing. A build or automated smoke check does not prove clean-machine installation, hardware microphone operation or Linux compatibility.

- Windows 10 build 19045, Node 24, Electron 44.9.1: development shell and packaged `win-unpacked` executable passed startup, calculation, map, saved-design persistence across restart, renderer isolation and blocked external-fetch checks on 2026-10-20.
- Windows x64 NSIS installer was generated as `ham-radio-tools-0.3.0-win-x64.exe`. It has not been installed on a clean machine and is unsigned.
- Linux packaging and runtime: configured for CI, not exercised locally.
- Expanded Windows development and packaged-executable checks on 2026-10-20 passed project file export/import, copy bridge and native clipboard round trip, PDF print-engine rendering, plus explicit update check/download and tampered-file rejection using mocked GitHub responses. The clipboard probe previously returned empty in this environment; the harness reports this limitation explicitly if it recurs. These are not hardware or real release upgrade tests.
- Clean-machine installation, offline first launch, microphone hardware and printer checks: pending. Follow [the desktop acceptance checklist](DESKTOP_ACCEPTANCE.md) and record actual OS versions and results.

### Windows development sandbox access

On some restricted Windows workspaces, the downloaded Electron folder lacks the read/execute ACL needed by Chromium's sandbox. If Electron specifically reports `install_dir_access.cc` with the `ALL APPLICATION PACKAGES` error, grant read/execute on that folder only:

```powershell
icacls "$PWD\node_modules\electron\dist" /grant '*S-1-15-2-1:(OI)(CI)(RX)'
```

Do this only for that error; keep the renderer sandbox enabled. A packaged installation may have different inherited permissions and needs its own verification.
