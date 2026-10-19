import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { tools, CATEGORIES, CATEGORY_ICON, KIND_LABEL, iconFor } from '../src/core/registry'

// Guards the wiring that is easy to forget when adding a tool: icon, category, offline route, page file and layout id.
describe('registry integrity', () => {
  const nav = fs.readFileSync('src/components/NavIcon.vue', 'utf8')
  const icons = new Set([...nav.matchAll(/^\s{2}'?([A-Za-z]+)'?: \[/gm)].map((m) => m[1]))
  const offline = fs.readFileSync('scripts/check-offline.mjs', 'utf8')
  const ids = tools.map((t) => t.id)
  it('every tool is complete and wired', () => {
    const problems: string[] = []
    if (new Set(ids).size !== ids.length) problems.push('duplicate ids')
    for (const t of tools) {
      if (!icons.has(iconFor(t.id))) problems.push(`no icon for ${t.id}`)
      if (!CATEGORIES.some((c) => c.id === t.category)) problems.push(`bad category ${t.id}`)
      if (!(t.kind in KIND_LABEL)) problems.push(`bad kind ${t.id}`)
      if (!offline.includes(`'tool/${t.id}'`)) problems.push(`${t.id} is missing from the offline phone-width route list`)
      if (t.summary.length < 20 || t.keywords.length < 3) problems.push(`thin metadata ${t.id}`)
    }
    for (const c of CATEGORIES) { if (!icons.has(CATEGORY_ICON[c.id])) problems.push(`no icon for category ${c.id}`); if (!tools.some((t) => t.category === c.id)) problems.push(`empty category ${c.id}`) }
    const reg = fs.readFileSync('src/core/registry.ts', 'utf8')
    for (const f of fs.readdirSync('src/tools')) {
      if (!reg.includes(`tools/${f}`)) problems.push(`orphan page ${f}`)
      for (const m of fs.readFileSync(`src/tools/${f}`, 'utf8').matchAll(/<ToolLayout[^>]*?\sid="([^"]+)"/g)) if (!ids.includes(m[1])) problems.push(`${f} uses unknown id ${m[1]}`)
    }
    expect(problems).toEqual([])
  })
})
