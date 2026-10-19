// Renders public/og-image.png (the link-preview card, 1200×630) from the app's own colours and logo mark. Run: node scripts/make-og.mjs
import { chromium } from 'playwright-core'
const html = `<html><body style="margin:0;width:1200px;height:630px;background:linear-gradient(135deg,#11161b 0%,#1a2129 60%,#232c36 100%);font-family:system-ui,'Segoe UI',Roboto,Arial,sans-serif;color:#e8e6df;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;position:relative;overflow:hidden">
<svg style="position:absolute;right:-40px;top:70px;opacity:.16" width="620" height="420" viewBox="0 0 620 420"><path d="M0 210h120l45-140 75 280 60-140h60l40-80 55 160 40-80h125" fill="none" stroke="#f2b84b" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/></svg>
<div style="display:flex;align-items:center;gap:36px"><svg width="150" height="150" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#f2b84b"/><path d="M4 16h5l3-9 5 18 3-9h8" fill="none" stroke="#11161b" stroke-width="2.5"/></svg>
<div><div style="font-size:92px;font-weight:800;letter-spacing:-1px;line-height:1">Ham Radio Tools</div><div style="font-size:36px;color:#f2b84b;margin-top:14px;font-weight:600">ZS6SHZ · open source · MIT</div></div></div>
<div style="font-size:40px;line-height:1.35;margin-top:54px;max-width:960px;color:#cfd3d6">Offline-first calculators, antenna designs, station tools and operating references for amateur radio.</div>
<div style="display:flex;gap:18px;margin-top:44px;font-size:28px;font-weight:600">${['Works offline', 'Antenna designs', 'Band plans', 'Logbook · ADIF', 'Satellite passes'].map((t) => `<span style="border:2px solid #3a4652;border-radius:999px;padding:8px 24px;background:#1a2129">${t}</span>`).join('')}</div>
</body></html>`
const b = await chromium.launch({ channel: 'msedge' }), p = await b.newPage({ viewport: { width: 1200, height: 630 } })
await p.setContent(html); await p.screenshot({ path: 'public/og-image.png' }); await b.close()
