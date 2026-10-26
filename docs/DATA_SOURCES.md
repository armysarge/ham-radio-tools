# Data sources and how to keep them current

For the monthly/seasonal schedule, upcoming review dates and BBC source handoff, see [Content maintenance calendar](CONTENT_MAINTENANCE.md).

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

Also dated in their own tools: ITU region allocations (Article 5, simplified), CTCSS tones, the 104-code DCS list ([Yaesu FT-3165R/FT-3165E Advance Manual](https://www.yaesu.com/Files/4CB3F875-1018-01AF-FAF21EE346767CA2/FT-3165R_E_AM_2411-A.pdf), items 30–31; code/polarity support varies by model), abbreviations, constants (CODATA 2022), ITU call-sign blocks (Appendix 42), Q codes (ITU-R M.1172), time stations. Their source and revision date are shown in each tool and in `src/data/*.ts`.

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

The simplified ITU overview is maintained separately in `src/data/reference.ts`. Its 2026-10-23 additions (2200 m, 630 m and 6 m) were checked against the international allocations/footnotes reproduced in [47 CFR 2.106](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-2/subpart-B/section-2.106), current to 2026-10-21. `scripts/pack-data/sources.json` records the official XML fingerprint as `itu-overview`. Country exceptions are summarized, not removed: Region 1 six metres uses the 50–52 MHz secondary baseline, while some national authorizations are primary or extend to 54 MHz. Region 3 has alternative allocations and sharing footnotes. National packs already contain 6 m and retain their own source/revision dates. A regional overview never grants permission to transmit.

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

- **VSWR voltage extrema** (`src/lib/rf.ts`, `src/tools/Swr.vue`): [Keysight FieldFox, About Display Formats](https://helpfiles.keysight.com/csg/FieldFoxOnlineSupplementalHelp/Concepts/About_Display_Formats.htm), “VSWR or SWR”, reviewed 2026-10-26. Reference example: 3 V maximum and 1 V minimum gives 3:1. The original SVG voltage envelope uses a uniform lossless-line model, normalised to its maximum; phase is arbitrary and the drawing does not predict peak positions on an installation. Inputs must share the same amplitude convention and operating conditions. New calculations/illustrations are original; no source artwork or documentation is bundled.

- **Number codes** (`src/data/numberCodes.ts`): [ACOM Quick Guide, first edition, revision 01, February 2022](https://www.acom-bg.com/sites/default/files/manuals/ACOM%20Quick%20Guide%20The%20most%20used%20codes%2C%20terms%2C%20and%20abbreviations%20in%20amateur%20radio%20practice%20GB%2002_2022.pdf), §3 p. 9 and §8 p. 33, reviewed 2026-10-26. Selected meanings are independently summarised; no document, table or artwork is bundled. Publisher copyright remains with ACOM. 72 is marked informal QRP usage, not a historical assignment. Historical 1/6/30 are examples reported by that guide, not a full original codebook transcription. Usage advice/examples are editorial; International Morse is generated with the existing encoder rather than historical landline encoding.

- **Coordinate and unit converters** (`src/lib/coordinates.ts`, `src/lib/conversions.ts`): factors/relationships checked against [NIST SP 811 Appendix B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8) and [NIST revised international-foot definitions](https://www.nist.gov/pml/us-surveyfoot/revised-unit-conversion-factors), reviewed 2026-10-26. The international acre is 43560 international square feet; legacy US survey-foot factors are excluded. Temperature values convert via kelvins with offsets, not as temperature intervals. Coordinate notation uses 60 arcminutes per degree and 60 arcseconds per arcminute, with the existing Maidenhead implementation; it does not transform datums or project UTM. Original code and UI, no copied source text/artwork. Mathematical tests cover reference values, invalid input, boundaries, carry/rounding, and round trips across every listed unit.
- **BBC frequency reference** (`src/data/bbcSchedule.ts`): the [official BBC World Service page](https://www.bbc.co.uk/programmes/articles/2x9tqt6mc05vB2S37j8MWMJ/global-short-wave-frequencies), supplied by the user as saved HTML and inspected/transcribed 2026-10-26. Its 21 table rows produce 30 frequency records covering **25 October 2026–27 March 2027**, inclusive UTC. Includes 14 medium-wave frequency records and one DRM entry; regions are reception targets, not inferred transmitter sites. No language, programme title or transmitter location is invented. All frequency/time/weekday combinations were checked against the supplied HTML. BBC's date window gates live and time-filtered results; out-of-season rows remain labelled references. This factual transcription excludes original HTML, prose, artwork and logos; BBC retains rights in the source material and no general BBC redistribution licence is claimed. See [maintenance/provenance notes](CONTENT_MAINTENANCE.md#bbc-source-handoff) and third-party notices. A standalone content pack and programme guide are not supplied.

- **Antenna band guidance** (`src/data/antennaBands.ts`): editorial construction/use suggestions based on ARRL's [HF wire](https://www.arrl.org/hf-wire), [HF vertical](https://www.arrl.org/hf-vertical), [HF loop](https://www.arrl.org/hf-loop-antennas), [HF beam](https://www.arrl.org/hf-beams), [VHF/UHF](https://www.arrl.org/vhf-and-uhf) and [J-pole/omnidirectional](https://www.arrl.org/vhf-omnidirectional) guides, plus the existing EDN 137.55 MHz QFH prototype. Reviewed 2026-10-26. The suggested shortlists are practical editorial choices, not source-published rankings, guaranteed multiband coverage or national allocations. Satellite availability is deliberately not bundled or asserted; the QFH example is identified as a historical receive prototype outside amateur transmit bands.
- **Wire-antenna installation heights** (`src/components/AntennaHeightGuide.vue`, `src/lib/antenna.ts`): ARRL's [Here Is a Dipole](https://www.arrl.org/files/file/Technology/tis/info/pdf/9106023.pdf) gives half a wavelength or more as a general height guideline while noting that lower installations still work; Straw and Hall's [Antenna Height and Communications Effectiveness, second edition, 1999](https://www.arrl.org/files/file/antplnr.pdf), especially its height/elevation discussion, explains the effect of height on lobes and nulls. Reviewed 2026-10-26. Values are free-space quarter/half wavelengths, with no wire shortening factor. The inverted-V apex and horizontal EFHW extensions are qualified practical references, not source-validated optima for those installations. No source artwork is copied; no site, ground-loss, gain, safety-clearance or propagation simulation is performed.
- **Toroid AL values** (`src/data/cores.ts`): typical catalogue figures for Amidon / Micrometals iron-powder (T-xx-2, -6) and ferrite (FT-xx-43, -61) cores, rounded; tolerance ±10–25 %. Not compiled from a single document: check a supplier datasheet when buying a core.
- **Baluns and RF transformers** (`src/tools/DiyMagnetic.vue`, `src/lib/magnetics.ts`): current-balun/choke distinctions reference Roy Lewallen's ARRL archive paper. The [Fair-Rite technical catalogue](https://fair-rite.com/wp-content/uploads/2023/05/Fair-Rite_Catalog_17th_Edition.pdf) supports the AL/turns model and frequency-dependent ferrite limitations; the [RSGB winding guide](https://rsgb.org/main/technical/emc/using-emc-filters-and-ferrites/) covers winding sense, stray capacitance and bend precautions. [Amphenol Procom's RG-400 specification](https://amphenolprocom.com/product/rg-400/) supplies cable construction context. Reviewed 2026-10-23. The calculator uses nominal AL only for a low-frequency inductance estimate; it does not predict broadband common-mode impedance, power, temperature, isolation or SWR. Stacked AL is approximated by adding identical cores. Transformer secondary turns round to the nearest integer and the resulting ideal impedance is shown. Material length uses the existing core-perimeter allowance, π times conductor diameter per turn, 15% slack and the entered leads. Illustrations are original SVG; no source figures are redistributed.
- **Balun templates** (`src/data/baluns.ts`): connection topologies checked against Peter Miles, VK6YSF's [coax choke](https://vk6ysf.com/balun_choke_balun_hf.htm), [1:1 paired-wire current balun](https://vk6ysf.com/balun_guanella_current_1-1.htm), [two-core 4:1 current balun](https://vk6ysf.com/balun_guanella_current_1-4.htm) and [4:1 voltage balun](https://vk6ysf.com/balun_4-1.htm), reviewed 2026-10-26. All author credits/links are retained beside the selected template. These are connection templates, not reproductions of the author's core/turns combinations or reported measurements. No power or bandwidth ratings are imported. New SVG drawings are original; no source artwork or code is reused. Each paired conductor receives its own lead/slack allowance; independent sections multiply material/core quantities and are not treated as one shared stack.
- **9:1 unun template**: Peter Miles, VK6YSF's [9:1 voltage unun](https://vk6ysf.com/unun_9-1.htm), including its wiring figure, reviewed 2026-10-26. The three equal series windings and first-winding input tap yield an ideal 3:1 voltage / 9:1 impedance ratio. The return is shared; this is not a balanced port or an RF-isolating choke. Material allowance counts three separate insulated conductors. The app does not reproduce the article's core/turns combination, reported passband, loss or power rating, and does not treat a random wire as a fixed 450 Ω resistance.
- **Cable loss presets** (`src/tools/FeedlineLoss.vue`): approximate dB per 100 ft at 100 MHz for RG-174, RG-58, RG-8X, RG-213 and LMR-400 types; users should enter their datasheet value.
- **Satellite elements** are never bundled; users paste a TLE from CelesTrak, AMSAT or Space-Track.

## Radiated power and filter additions

- **ERP/EIRP** (`src/lib/station.ts`, `src/tools/RadiatedPower.vue`): [Texas Instruments SWRA048, §1.1, May 2005](https://www.ti.com/lit/pdf/swra048), reviewed 2026-10-26. Uses engineering definitions and the nominal 2.15 dB dipole/isotropic reference conversion, not the document's dated regulatory limits. Gain must include antenna efficiency; mismatch is counted once. Results describe equivalent directional power, not total radiated energy or range.
- **High-pass transformation and LC diagrams** (`src/lib/station.ts`, `src/components/FilterCircuit.vue`): [Analog Devices, Basic Linear Design, Chapter 8](https://www.analog.com/media/en/training-seminars/design-handbooks/Basic-Linear-Design/Chapter8.pdf), §§8.5–8.6, pp. 8.55 and 8.65, reviewed 2026-10-26. Retains the existing odd-order Butterworth/Chebyshev prototypes and equal resistive terminations. Series inductors become series capacitors and shunt capacitors become shunt inductors using reciprocal prototype values. Chebyshev cutoff denotes the ripple-band edge. Values and response assume ideal components; power ratings, parasitics and measured response are not modelled.
- Equations are independently implemented and diagrams are original SVG. No source text, software or artwork is redistributed; linked documents retain their publishers' rights.

## Propagation model data (DVOACAP)

- **Engine and data:** DVOACAP by Alex Shovkoplyas VE3NEA, <https://github.com/VE3NEA/DVOACAP>, MIT licence (copyright 2025). The engine is translated to TypeScript in `src/lib/voacap/`; the monthly CCIR/URSI coefficient files (`DVoaData/Coeff01..12.dat`, `FOF2CCIR01..12.dat`, 556 608 bytes) are packed into `src/lib/voacap/coeffs.ts` by `node scripts/build-voacap-data.mjs <DVOACAP checkout>`; each month's SHA-256 prefix is recorded in the generated file's header.
- **To update:** re-run the packer on a newer DVOACAP checkout, then run `npm test`: `tests/voacap.test.ts` compares the port with DVOACAP's `SampleIO` output (kept in `tests/fixtures/dvoacap/`).
- **Not bundled:** the sunspot number. The report asks for it; it is never fetched.
