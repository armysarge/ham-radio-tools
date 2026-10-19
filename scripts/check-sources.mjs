// Source drift check for the bundled band-plan packs. Needs the network and is run by a person, never by the app.
//   npm run check:sources            compare live documents with the recorded hashes (exit 1 on any change or error)
//   npm run check:sources -- --update   record new hashes/date after you reviewed the change and rebuilt the packs
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('./pack-data/sources.json', import.meta.url)
const data = JSON.parse(readFileSync(file, 'utf8'))
const update = process.argv.includes('--update')
const today = new Date().toISOString().slice(0, 10)

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
let ecfrDate = null
const resolve = async (url) => {
  if (url.includes('{ecfrDate}')) {
    ecfrDate ??= (await (await fetch('https://www.ecfr.gov/api/versioner/v1/titles.json')).json()).titles.find((t) => t.number === 47).latest_issue_date
    url = url.replace('{ecfrDate}', ecfrDate)
  }
  return url.replace('{today}', today)
}
async function fingerprint(c) {
  const res = await fetch(await resolve(c.url), { headers: { 'user-agent': 'Mozilla/5.0 (ham-radio-tools source check)' }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (c.kind === 'bytes') return createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex')
  let text = strip(await res.text())
  for (const re of c.strip ?? []) text = text.replace(new RegExp(re, 'g'), '')
  return createHash('sha256').update(text.replace(/\s+/g, ' ')).digest('hex')
}

let bad = 0
for (const s of data.sources) {
  const age = Math.floor((Date.now() - Date.parse(s.retrieved)) / 86400000)
  const due = age > s.reviewEveryDays ? `  ** review overdue: retrieved ${age} days ago (every ${s.reviewEveryDays}) **` : ''
  console.log(`\n${s.pack} — ${s.document}\n  version: ${s.version}${due}`)
  for (const c of s.check) {
    c.sha256 ??= null
    try {
      const h = await fingerprint(c)
      const status = c.sha256 === null ? 'NEW (no baseline)' : h === c.sha256 ? 'unchanged' : 'CHANGED'
      console.log(`  ${status.padEnd(18)} ${await resolve(c.url)}`)
      if (status === 'CHANGED') bad++
      if (update) c.sha256 = h
      else if (c.sha256 === null) bad++
    } catch (e) { bad++; console.log(`  ERROR              ${c.url}  (${e.message})`) }
  }
  if (update) s.retrieved = today
  if (s.gaps) console.log(`  known gaps: ${s.gaps}`)
}
if (update) { writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); console.log('\nsources.json updated. Rebuild packs (node scripts/build-packs.mjs), run npm test, and update the README table.') }
else if (bad) { console.log(`\n${bad} source(s) changed or unreadable. Read the new text, edit scripts/build-packs.mjs, bump REVISION, rebuild, test, then run with --update.`); process.exitCode = 1 }
else console.log('\nAll recorded sources unchanged.')
console.log('\nNot included (no official copy obtained):')
for (const n of data.notIncluded) console.log(`  ${n.jurisdiction}: ${n.reason} Needs: ${n.needs}`)
console.log('\nAlso check, by hand: amendments that these fingerprints cannot see (see each source\'s "gaps").')
