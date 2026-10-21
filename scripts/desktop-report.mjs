// Writes a pre-filled copy of the clean-machine acceptance table (docs/DESKTOP_ACCEPTANCE.md) for the installer in desktop-out/.
// It records only facts it can read (version, file hash, size, signature, host OS); every manual check stays "not tested".
// Usage: node scripts/desktop-report.mjs [installer path]
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const dir = fileURLToPath(new URL('../desktop-out/', import.meta.url))
const given = process.argv[2]
const found = given ?? (await readdir(dir).catch(() => [])).filter((f) => /\.(exe|AppImage|deb)$/.test(f) && f.includes(pkg.version)).map((f) => path.join(dir, f))[0]
if (!found) { console.error('No installer for version ' + pkg.version + ' in desktop-out/. Run npm run desktop:dist first, or pass a path.'); process.exit(1) }

const bytes = await readFile(found)
const sha = createHash('sha256').update(bytes).digest('hex')
let signature = 'not checked on this OS'
if (process.platform === 'win32') {
  try { signature = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-AuthenticodeSignature -LiteralPath '${found.replace(/'/g, "''")}').Status`], { encoding: 'utf8' }).trim() }
  catch { signature = 'could not be read' }
  if (signature === 'NotSigned') signature = 'NOT SIGNED (Windows will show an unknown-publisher warning)'
}
const row = (a, b) => `| ${a} | ${b} |`
const today = new Date().toISOString().slice(0, 10)
const md = `# Desktop acceptance report: Ham Radio Tools ${pkg.version}

Prepared ${today} on the build machine. Rows marked "not tested" must be filled in by a person on the clean test machine; see docs/DESKTOP_ACCEPTANCE.md.

| Field | Result |
|---|---|
${row('App version / installer SHA-256', `${pkg.version} / \`${sha}\` (${path.basename(found)}, ${(bytes.length / 1048576).toFixed(1)} MB)`)}
${row('Signature status', signature)}
${row('Build machine (not the test machine)', `${os.type()} ${os.release()} ${os.arch()}, Node ${process.version}`)}
${row('Test machine: OS edition, version, architecture, VM or hardware', 'not tested')}
${row('No Node.js installed; fresh profile; network disconnected before install', 'not tested')}
${row('Offline install / first launch / restart', 'not tested')}
${row('Calculators / map / persistence / window restoration', 'not tested (npm run check:desktop passes on the build machine only)')}
${row('Project and pack import/export', 'not tested')}
${row('Clipboard paste into another application', 'not tested')}
${row('Microphone hardware / permissions', 'not tested')}
${row('PDF and physical printing', 'not tested')}
${row('Real release check / download / installer / preserved data', 'not tested')}
${row('Linux prerequisites (FUSE, libraries)', 'not tested')}
${row('Tester, date, failures and reproduction steps', '')}
`
const out = path.join(dir, `acceptance-${pkg.version}-${process.platform}.md`)
await writeFile(out, md)
console.log('Wrote ' + out)
