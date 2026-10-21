# Desktop release acceptance

Run this on a fresh Windows or Linux VM or physical machine. A development profile, CI runner, or successful installer build is not a clean-machine test. Keep the old installer and exported data until the replacement is verified.

## Prepare without changing the test machine

1. Build the release on the corresponding OS or download its GitHub release assets. Include the installer, `SHA256SUMS.txt`, and a sample project JSON/content pack on USB.
2. Verify the installer SHA-256 against the release manifest on the transfer machine. This checks file integrity, not publisher identity. Record whether the installer is signed.
3. Create a fresh VM snapshot or use a machine that has never run Ham Radio Tools. Do not install Node.js or development dependencies there.
4. Disconnect the VM network adapter or physical connection **before installation**. Keep it disconnected through first launch and restart. Do not merely put the browser into offline mode.

## Offline checklist

| Check | Expected result |
|---|---|
| Installation | Windows per-user installer runs without administrator access; Linux AppImage runs as a normal user. Record distro/runtime prerequisites. Never use `--no-sandbox`. |
| First launch | Starts centered, with icon, header and window controls; no prior online visit or dictionary download needed. |
| Calculators | 14.2 MHz gives approximately 21.11 m; 100 W gives 50 dBm; SWR 2 gives approximately 9.542 dB return loss. |
| Map | Bundled world land and Maidenhead grid render; station locator converts without tiles from the web. |
| Persistence | Save a dipole and named location, choose units/theme, resize/move, close and reopen. Data, window bounds and preferences remain. |
| Export/import | Export project JSON, delete a test design, re-import and verify its parameters. Import a sample content pack from USB. |
| Clipboard | Copy a result and paste into a separate text editor. Verify its value and units. |
| Printing | Print a dipole to the OS PDF printer, inspect the diagram and labels. Repeat with a physical printer if available. |
| Microphone | Deny access first, then allow it in the CW listener. Confirm real audio input works and stopping releases the device. Test with an actual microphone. |
| Display | Light/dark themes, keyboard navigation, narrow window, maximize/restore, disconnected monitor recovery, scrollbars below the header. |
| Offline update check | Explicit check fails with an understandable error; other tools still work. Merely opening Settings makes no update request. |
| Removal/upgrade | Export data first. Verify upgrading preserves the stable profile; uninstall preserves it by default. |

On Windows, verify installer and app operation with a standard account. On Linux, record whether FUSE/AppImage support is already present. If a distro needs an additional package, record that prerequisite and provide it offline or test the `.deb`; do not claim universal offline installation.

## Explicit online update check

Reconnect only after offline checks. Publish a test stable release with the exact platform/architecture installer name and `SHA256SUMS.txt` produced by the workflow. Use a disposable machine with an older app version.

1. Open Settings: no check occurs. Click **Check for updates**; confirm version, filename and size.
2. Click **Download**; choose a local file. Confirm SHA-256 verification completes. A canceled file chooser must leave the app unchanged.
3. Navigate to a calculator and return: the download remains available.
4. Windows: click **Open update installer**, cancel the confirmation once, then accept it. Verify the installer starts and the app closes. Complete installation and check saved data.
5. Linux: **Show downloaded AppImage** reveals the file. Allow execution in file properties, close the old app, run the new one and verify the stable profile. There is no automatic package-manager or AppImage replacement.
6. Test unavailable release, disconnected network and checksum failure with test fixtures. Never execute a tampered file. Tests use mocked installers and do not prove a real upgrade.

## Record the result

`npm run report:desktop` (after `npm run desktop:dist`) writes `desktop-out/acceptance-<version>-<os>.md` with the installer's SHA-256, size, signature status and build-machine details already filled in, and every manual row set to **not tested**. Copy it to the test machine's notes and complete the rest by hand.

Copy this table into the release notes or a dated report. Use **pass**, **fail**, **not tested**, or **not applicable**, with evidence. Never convert an untested row to a pass because the app compiled.

| Field | Result |
|---|---|
| App version / installer SHA-256 | |
| OS edition, version, architecture, VM/hardware | |
| No Node.js installed; fresh profile; network disconnected before install | |
| Offline install / first launch / restart | |
| Calculators / map / persistence / window restoration | |
| Project and pack import/export | |
| Clipboard paste into another application | |
| Microphone hardware / permissions | |
| PDF and physical printing | |
| Real release check / download / installer / preserved data | |
| Signature status / Linux prerequisites | |
| Tester, date, failures and reproduction steps | |

## Automated checks and their limits

`npm run check:desktop` uses a disposable profile to check offline tools, project exports/imports, PDF print-engine rendering, the copy bridge, window behavior and mocked update transport/tampered-file rejection. It probes the native clipboard separately and reports an unavailable OS round trip explicitly. Set `HRT_REQUIRE_CLIPBOARD=1` to make an unavailable native clipboard fail the check. For example in PowerShell: `$env:HRT_REQUIRE_CLIPBOARD='1'; npm run check:desktop`.

The release workflow checks both development and packaged executables on Windows/Linux runners. These runners have Node.js and network access; they do not certify clean-machine installation, hardware, publisher signing or an end-to-end real release upgrade.
