# Contributing

Thanks for helping. Ground rules:

1. **Offline first.** No CDNs, remote fonts, telemetry, or runtime network calls. `npm run check:offline` must pass.
2. **Maths in `src/lib/`, UI in `src/tools/`.** Calculations need unit tests with reference values, invalid inputs and boundary cases.
3. **Be honest about accuracy.** Label a tool *Analytical*, *Design estimate* or *Reference*. Never present an estimate as a simulation, and never invent gain, pattern or impedance figures.
4. **Cite sources** in the tool's references panel. Don't copy text from books or GPL projects; paraphrase and cite.
5. **Dated data** (band plans, Q codes, etc.) goes in `src/data/` with jurisdiction, source and revision date.
6. **Phone-friendly.** Check 375 px wide; no horizontal scrolling, 44 px touch targets, labelled inputs.

## Workflow

```bash
npm install
npm run dev          # develop
npm test             # unit + component tests
npm run build        # type-check + build
npm run check:offline
```

Add a tool: see *Adding a tool* in the README.
