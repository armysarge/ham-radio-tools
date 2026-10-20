# Versioned GitHub releases

Web, demo, Windows and Linux stay in **one repository** and use the version in `package.json`. One tag creates one release with several downloadable assets.

## Test before tagging

```sh
npm ci
npm test
npm run build
npm run check:offline
npm run check:desktop
npm run desktop:dist
```

See [DESKTOP.md](DESKTOP.md) for launching Electron, packaging targets and clean-machine checks. `npm run desktop` opens the current build for manual testing.

## Set the version

Use `MAJOR.MINOR.PATCH`: patch for fixes, minor for new features, major for incompatible stable changes. Before 1.0, document saved-data compatibility changes in the changelog.

1. Commit your tested changes on `main`.
2. Choose a new version that has no existing tag. Add its entry to `CHANGELOG.md`, for example `## [0.3.1] - 2026-10-20`, with the changes and actual platforms tested. Commit the changelog first.
3. Run:

   ```sh
   npm version 0.3.1 -m "Release %s"
   git push origin main
   git push origin v0.3.1
   ```

`npm version` runs tests, updates `package.json` and `package-lock.json`, commits them and creates the matching tag. Replace the example version in **both commands**. For a preview release use a version such as `0.4.0-rc.1`.

If `package.json` already contains the intended version (currently 0.3.1), ensure the lockfile matches and commit it with the matching changelog, then use `git tag -a v0.3.1 -m "Release 0.3.1"`. Do not run `npm version` again if you intend to release the already-selected version: it would increment it again.

Never move a published tag. Fix a released problem with a new patch version.

If a failed workflow needs a code or workflow fix, commit it and create a new matching version/tag. **Re-run failed jobs** uses the old tag's commit and cannot pick up a fix pushed only to `main`. The failed `v0.3.0` desktop checks are addressed in `0.3.1`: the window persistence fixture now fits small screens, and Linux checks run a window manager inside Xvfb. The new CI run still needs to confirm Linux results.

## What GitHub Actions does

The tag workflow checks that the tag and package version agree, tests the app and builds:

| Asset | Intended use |
|---|---|
| `ham-radio-tools-web-<version>.zip` | Standard web build, with no analytics |
| `ham-radio-tools-web-demo-<version>.zip` | Hosted demo, with optional analytics consent |
| `ham-radio-tools-<version>-win-x64.exe` | Windows installer |
| `ham-radio-tools-<version>-linux-x64.AppImage` | Linux executable |
| `ham-radio-tools-<version>-linux-x64.deb` | Debian/Ubuntu package |
| `SHA256SUMS.txt` | SHA-256 checksums for all downloadable files |

Windows and Linux build on their own runners. After every required job succeeds, the workflow creates a **draft** release. Open GitHub → Releases, inspect the draft, download and test the installers on clean machines, then click **Publish release**. Tags containing a hyphen are marked as prereleases. No GitHub PAT is needed in the app or workflow: the workflow uses its scoped `GITHUB_TOKEN`.

If a job fails, no final draft is published. Fix the cause and use **Re-run failed jobs** when appropriate. Do not claim a platform was tested simply because its packaging job succeeded.

For a clean-machine test, transfer the installer over USB, disconnect networking, install without Node.js, and check first launch, calculator, map, save/restart, file import/export, clipboard and printing. State the OS/version and outcome in release notes.

## Deploy the demo

For [hamradiotools.armysarge.co.za](https://hamradiotools.armysarge.co.za/), use the **demo zip** or build it yourself:

```sh
npm run build:demo
```

Upload the contents of `dist-demo/` to your static web host. For a temporary preview behind your reverse proxy:

```sh
npx vite preview --mode demo --outDir dist-demo --host 0.0.0.0 --port 4173
```

Vite preview is a testing server. Serve production static files with your web host. `.env.demo` is read by the demo build; `.env.demo.local` overrides it and is ignored by git. Build-time changes require rebuilding. Analytics does not load before a visitor accepts.

## Allow specific embedding sites

By default the app refuses framing. Set comma-separated origins before building:

```dotenv
ALLOWED_FRAME_ANCESTORS=https://example.com,https://www.example.org
```

Use `.env` for all builds or `.env.demo.local` for just the demo. The build writes matching headers to `_headers` for hosts that support that format; `vite preview --mode demo` reads the demo settings itself. For nginx, configure one matching rule (merge it into an existing CSP if needed):

```nginx
# Default: block all embedding
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header X-Frame-Options DENY always;

# Alternatively, when allowing named sites, use this CSP and REMOVE X-Frame-Options DENY:
# add_header Content-Security-Policy "frame-ancestors 'self' https://example.com https://www.example.org" always;
```

The in-page guard is a fallback; response headers provide the browser-enforced protection.

## Desktop updates

Settings provides explicit **Check for updates**, **Download**, and **Open update installer** actions in Electron. Checks use GitHub's latest published stable release; drafts and prereleases are excluded. Keep the exact asset names above and include `SHA256SUMS.txt` when publishing, or the app refuses the update. Architecture must match; an x64 release does not update an ARM build. The main process permits only the fixed repository's initial asset URLs and HTTPS redirects on GitHub's download hosts.

Download size is capped at 400 MiB. Incomplete or mismatched downloads are deleted without replacing an existing local file. The file is hashed again before installer launch. SHA-256 from the same release checks integrity; it is **not signed update metadata** and does not protect against compromise of the release account. GitHub account security and Windows publisher signing remain separate responsibilities.

Windows asks for confirmation before opening the downloaded installer and closing the packaged app. Development builds can download but do not launch installers. Linux reveals the AppImage for manual replacement; users may need to allow execution in file properties. The app does not invoke a package manager, request elevation for normal use, clone the repository, run npm or embed a GitHub token. AppImage and Windows builds keep the stable profile across versions.

Before a public release, follow [DESKTOP_ACCEPTANCE.md](DESKTOP_ACCEPTANCE.md), including a real older-version-to-newer-version upgrade on a disposable machine. Automated updater tests use fixtures and never execute an installer.

## Windows signing

Current builds are unsigned. To sign, obtain a trusted code-signing certificate or supported signing service in your own publisher identity; a self-signed development certificate does not provide public trust. Keep credentials out of the repository. Once credentials are available, configure the Windows packaging job using electron-builder's supported signing environment/settings and verify the resulting executable and installer with `Get-AuthenticodeSignature` before publishing. Record publisher, timestamp and status. Signing is not marked complete until a signed artifact is verified. No certificate has been supplied or configured here.
