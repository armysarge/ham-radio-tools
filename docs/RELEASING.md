# Releasing Ham Radio Tools

## Short answers

| Question | Answer |
|---|---|
| One repo or several? | **One repo.** Web, Windows and Linux builds share the same source and the same version number, so keep them together. Create separate repos only if different people own them, they need different licences, or they release on unrelated schedules. |
| One release or several? | **One GitHub release per version** (tag `v0.3.0`) with several **assets**: the web zip, the Windows installer, the Linux AppImage and `.deb`, and a checksum file. Not three separate releases. |
| Where does the version live? | In `package.json` only. The app shows it (Settings → About), the web zip and installers are named from it, and the git tag must match it (the release workflow refuses a mismatch). |
| Does the Electron app need `node_modules` inside it? | **No.** Vite compiles the whole interface (Vue, the router, the map data) into `dist/`. Electron needs only `dist/`, its small main-process script and any *runtime* packages that script itself imports (for example `electron-updater`). `electron-builder` leaves `devDependencies` out automatically. Keep Vue and friends out of the desktop package's `dependencies` so they are not shipped twice. |
| How does the desktop app update "from the repo"? | Not from the git repo: an installed app has no git and no sources. It reads the **GitHub Releases** of this repo (`electron-updater` looks for the `latest.yml` file attached to the newest release), downloads the new installer asset, and installs it. |
| Doesn't updating break "offline, no background network"? | Only if it runs by itself. Make it **opt-in**: no check at start-up, no timer; a **“Check for updates”** button in Settings that does one request when pressed, shows the version found, and downloads only after a second click. Set `autoUpdater.autoDownload = false` and `autoUpdater.autoInstallOnAppQuit = false`. |

## Versioning

[Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **PATCH** (0.2.1): bug fixes, data corrections, no new features.
- **MINOR** (0.3.0): new tools or features. Before 1.0 a minor may also change a saved-data format; the CHANGELOG must say so, and imports must keep reading older project files (the project file has its own `version` field).
- **MAJOR** (1.0.0): when the saved-data formats and tool set are considered stable.
- Pre-releases: `v0.3.0-rc.1`, `v0.3.0-alpha.2`. The workflow marks any tag containing `-` as a GitHub *pre-release*.

**Content packs are versioned separately** by their own `revision` date. A new band plan or schedule does not need a new app release; publish the pack file as its own asset or in a `packs/` folder and users import it.

## Cutting a release (web)

One-time setup:

```bash
git remote add origin https://github.com/armysarge/ham-radio-tools.git
git push -u origin main
```

Enable **GitHub Actions** for the repository. The workflows declare their own permissions; no secrets are needed because they use the built-in `GITHUB_TOKEN`.

Each release:

1. Make sure `main` is green (CI workflow) and the working tree is clean.
2. Edit `CHANGELOG.md`: add `## [0.3.0] - YYYY-MM-DD` with the changes, and the link reference at the bottom. The release notes are cut from this section, and the workflow fails if it is missing.
3. Bump, commit and tag in one step (this also runs the tests first, via the `preversion` script):

   ```bash
   npm version minor -m "Release %s"     # or: patch | major | 0.3.0-rc.1
   ```

4. Push the commit and the tag:

   ```bash
   git push origin main --follow-tags
   ```

5. The **Release** workflow runs: checks that the tag equals `package.json`, type-checks, runs the tests, builds, runs the offline acceptance check, zips `dist/` as `ham-radio-tools-web-0.3.0.zip` and the analytics-enabled demo build as `ham-radio-tools-web-demo-0.3.0.zip` (upload that one to the demo site), writes `SHA256SUMS.txt` and creates the GitHub release with notes from the changelog.
6. Open the release page and confirm the assets. Download the zip on a clean machine, unzip it, serve it with any static server and click through a few tools with the network off.

Fixing a bad release: do not move a published tag. Fix forward with the next patch version. If a release must be withdrawn, mark it as a pre-release or delete the release on GitHub and say why in the changelog.

> The two workflows in `.github/workflows` were written but have **not been run** yet (they need the repository on GitHub). Expect to fix small things on the first run, and try it first with a throw-away tag such as `v0.2.0-rc.1`.

## Demo page

The web build is served as a demo at **https://hamradiotools.armysarge.co.za/**. After each release, download `ham-radio-tools-web-<version>.zip` and extract its contents into the site folder on the web host (replace the old files, including the `assets/` folder, so no stale hashed files are served). The build uses relative paths (`base: './'`) and hash routing, so no rewrite rules or special configuration are needed. Serve it over HTTPS if you want the microphone feature to work. The demo makes no requests to any other host.

## Adding the Windows and Linux apps (same repo)

Suggested layout:

```
ham-radio-tools/
├─ src/ …                 the web app (Vite) – unchanged
├─ desktop/
│  ├─ package.json        tiny: name, version, main, "dependencies": { "electron-updater": … }
│  ├─ main.cjs            creates the window, loads ../dist/index.html, exposes the update check
│  └─ preload.cjs         a narrow, explicit API (contextBridge) – nothing else is exposed
├─ electron-builder.yml   targets, file list, publish settings
└─ package.json           version lives here; electron + electron-builder are devDependencies
```

Packaging notes:

- **Files shipped:** `dist/**`, `desktop/**` and the production dependencies of `desktop/package.json`. Nothing else (no `src`, no tests, no `node_modules` of the web app).
- **Targets:** Windows `nsis` installer (supports auto-update); Linux `AppImage` (supports auto-update) and `deb` (does *not* auto-update; users reinstall). Portable Windows zip is optional.
- **Publish:** `publish: { provider: github, owner: armysarge, repo: ham-radio-tools }`. Build with `--publish never` in CI and let the release workflow attach the files, including `latest.yml` (Windows) and `latest-linux.yml`, which the updater reads.
- **Size:** expect roughly 80–120 MB per installer because Electron bundles Chromium. No WebView2 or system webview is required, which suits offline installation.
- **Signing:** unsigned Windows installers trigger SmartScreen warnings. A code-signing certificate fixes that; budget for it or tell users what to expect. Linux needs no signing.
- **Security:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, a strict Content-Security-Policy (already in `index.html`), no remote content, and a preload that exposes only specific functions (check for updates, save/open a file, list serial ports later). No `shell.openExternal` of arbitrary URLs.
- **Private repositories** cannot serve updates anonymously, and a token must never be embedded in the app. Keep the repository (or at least the releases) public if you want in-app updating.

Tauri note: the earlier recommendation in the README still stands (far smaller installers, narrow permissions, but needs WebView2 on Windows and WebKitGTK on Linux). If you choose Tauri instead, the repo layout, version rule and release assets are the same; the updater uses a signed `latest.json` and its own key pair instead of `latest.yml`.

## Release checklist

- [ ] CI green on `main`
- [ ] `CHANGELOG.md` entry written, link reference added
- [ ] `npm version …` run (tests passed)
- [ ] `git push origin main --follow-tags`
- [ ] Workflow green; release page lists the zip and `SHA256SUMS.txt`
- [ ] Smoke test on a clean machine with the network disabled
- [ ] Platforms tested are stated honestly in the release notes

## Embedding (iframes)

By default the built app refuses to be framed. To let specific sites embed it, put their origins in `.env` before building: `ALLOWED_FRAME_ANCESTORS=https://example.com,https://www.example.org`. Then make your web server send the matching header (the build writes the exact lines to `dist/_headers`):

```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://example.com" always;   # with an allow-list
add_header Content-Security-Policy "frame-ancestors 'none'" always;                      # default
add_header X-Frame-Options DENY always;                                                   # default only
```

`vite preview` sends these headers itself. `frame-guard.js` is a second layer that blanks the page when it is framed by an unlisted site.
