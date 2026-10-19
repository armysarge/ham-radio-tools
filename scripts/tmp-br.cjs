const fs = require('fs')
const SPA = process.argv[2]
const t = fs.readFileSync(SPA + '/br_ato926.txt', 'utf8')
const start = t.indexOf('7. PLANO DE FAIXAS')
const end = t.indexOf('Tabela XXX - Modo Teste')
const body = t.slice(start, end)
const parts = body.split(/(?=Tabela [IVXL]+ - Faixa)/).filter((p) => p.startsWith('Tabela'))
const num = (s) => { const v = parseFloat(s.trim().replace(/\./g, '').replace(',', '.')); return Number.isNaN(v) ? null : v }
const tables = []
for (const p of parts) {
  const title = p.split('\n')[0].replace(/^Tabela [IVXL]+ - /, '').trim()
  const unit = (/Frequ[êe]ncias? \((kHz|MHz|GHz)\)/.exec(p) || [])[1]
  // each ' | ' line closes one cell; consecutive markers are empty cells
  const cells = []
  { let cur = ''; for (const raw of p.split('\n')) { const line = raw.replace(/\r/g, '').trim(); if (line === '|') { cells.push(cur); cur = '' } else cur += (cur && line ? ' ' : '') + line } cells.push(cur) }
  // header ends at the 'DV' cell
  let i = cells.findIndex((c) => c === 'DV') + 1
  const rows = []
  while (i + 9 < cells.length + 1) {
    const a = num(cells[i] ?? ''), b = num(cells[i + 1] ?? '')
    if (a == null || b == null || /[A-Za-z]/.test(cells[i]) || /[A-Za-z]/.test(cells[i + 1])) break
    const m = cells.slice(i + 2, i + 9).map((c) => c.toLowerCase() === 'x')
    rows.push({ from: a, to: b, cw: m[0], ssb: m[1], am: m[2], fm: m[3], dv: m[4], dig: m[5], other: m[6], app: (cells[i + 9] ?? '').replace(/\s+/g, ' ') })
    i += 10
  }
  const notes = {}
  for (const n of p.matchAll(/Nota (\d+):\s*([^\n]+)/g)) notes[n[1]] = n[2].trim()
  tables.push({ title, unit, rows, notes })
}
console.log(tables.length, 'tables')
for (const tb of tables) console.log(tb.title, tb.unit, tb.rows.length, 'rows', Object.keys(tb.notes).length, 'notes')
fs.writeFileSync('scripts/pack-data/br-ato926-subbands.json', JSON.stringify(tables))
const x = tables.find((q) => q.title.includes('40 metros'))
console.log(JSON.stringify(x.rows.slice(0, 4)), JSON.stringify(x.notes))
