# Data sources and how to keep them current

Every piece of regulated reference data in this app comes from a named official document. This page is the human-readable index. The machine-readable record is [`scripts/pack-data/sources.json`](../scripts/pack-data/sources.json), which stores for each source the official URL, the version, the retrieval date, the licence, how it was read, known gaps, and a **content hash** of the document as retrieved.

## Bundled national band tables

| Pack | Official document | Version read | Retrieved | Review every |
|---|---|---|---|---|
| `us-fcc-part97` | 47 CFR §§ 97.301, 97.303, 97.305, 97.313 (eCFR) | current to 2026-10-01 (amended 14 Jan 2026) | 2026-10-19 | 180 days |
| `za-icasa-annexure-i` | ICASA Radio Frequency Spectrum Regulations, Annexure I (copy at acts.co.za) + 60 m from the 2018 National Radio Frequency Plan | 2021 amendment | 2026-10-19 | 90 days |
| `de-bnetza-afuv` | AFuV Anlage 1, BGBl. 2024 I Nr. 175 | 2024 | 2026-10-19 | 180 days |
| `ca-ised-rbr4` | ISED RBR-4, Schedule I (read from a University of New Brunswick copy) | Issue 3, July 2022 | 2026-10-19 | 180 days |
| `au-acma-class-licence` | Radiocommunications (Amateur Stations) Class Licence 2023, Schedule 2 Table C (Advanced only) | as made, commenced 19 Feb 2024 | 2026-10-19 | 180 days |
| `jp-mic-notification-80` | MIC 令和5年告示第80号 usage chart + licence-symbol leaflet | amended 17 Jul 2025 (告示第259号) | 2026-10-19 | 180 days |
| `br-anatel-ato-926` | Anatel Ato nº 926/2024 (Tabela I, Tabelas II–XXIX, item 5) | 2024 | 2026-10-19 | 90 days |

Also dated in their own tools: ITU region allocations (Article 5, simplified), CTCSS tones, abbreviations, constants (CODATA 2022), ITU call-sign blocks (Appendix 42), Q codes (ITU-R M.1172), time stations. Their source and revision date are shown in each tool and in `src/data/*.ts`.

### Not included yet

| Country | Why | What is needed |
|---|---|---|
| United Kingdom | Ofcom's documents are behind a bot-protection challenge this project does not bypass | The current Amateur Radio Licence schedule or Interface Requirement IR 2028 as a PDF from the maintainer |
| India | DoT/WPC documents returned 404/403 or only scanned pages; the one consolidated copy found omits Annexure V | A PDF of the current Annexure V (or the NFAP-2022 amateur rows) from DoT/WPC |

## Checking whether a source has changed

```bash
npm run check:sources            # needs the network; compares live documents with the recorded hashes
```

For each source it prints `unchanged`, `CHANGED` or `ERROR`, plus any review that is overdue and the source's known gaps. It exits with an error code when something changed, so it suits a monthly reminder. It is **never run by the app** and is not part of the tests or CI because it needs the network and documents change on their own schedule.

Limits to be aware of (also listed per source in `sources.json`):

- The Australian as-made PDF never changes, so amendments are invisible to the hash: check the Federal Register of Legislation compilations by hand.
- The Canadian check reads a mirror, not the ISED file: a newer ISED issue is invisible.
- The South African and Brazilian pages are text extracted from web pages; a `CHANGED` result can be cosmetic. Diff before rebuilding.
- The Japanese chart is a picture; a changed hash means the picture changed, and the new boundaries must be read again by eye.

## Updating a pack (the routine)

1. `npm run check:sources` and read the report. Open the official document for anything `CHANGED`, or when its review date has passed.
2. Edit that country's table in [`scripts/build-packs.mjs`](../scripts/build-packs.mjs). The Germany and Brazil tables are parsed into `scripts/pack-data/*.json` first; the other countries' rows are in the script.
3. Bump `REVISION` in the script, then `npm run build:packs` (rewrites `src/data/packs/*.json`).
4. `npm test` — the national-pack tests pin class boundaries and gaps, so an intentional rule change means updating the matching test expectation too.
5. `npm run check:sources -- --update` to record the new hashes and retrieval date; update the table above and the README, add a line to [CHANGELOG.md](../CHANGELOG.md), and release (see [RELEASING.md](RELEASING.md)).

## Adding a country

1. Find the regulator's **own** text (law, notification or licence conditions). Avoid forum posts, club summaries and wikis; where only a third-party copy exists, say so in `gaps`.
2. Add its entry to `sources.json` (leave `sha256` out), add a block to `build-packs.mjs`, add tests with a few boundary frequencies you checked by hand, run `npm run check:sources -- --update`, and add a row to the tables here and in the README.
3. Say what the table does **not** cover (licence classes, bandwidth limits, sub-band modes) in the pack's `notes`.

## Other bundled reference data

- **Toroid AL values** (`src/data/cores.ts`): typical catalogue figures for Amidon / Micrometals iron-powder (T-xx-2, -6) and ferrite (FT-xx-43, -61) cores, rounded; tolerance ±10–25 %. Not compiled from a single document: check a supplier datasheet when buying a core.
- **Cable loss presets** (`src/tools/FeedlineLoss.vue`): approximate dB per 100 ft at 100 MHz for RG-174, RG-58, RG-8X, RG-213 and LMR-400 types; users should enter their datasheet value.
- **Satellite elements** are never bundled; users paste a TLE from CelesTrak, AMSAT or Space-Track.
