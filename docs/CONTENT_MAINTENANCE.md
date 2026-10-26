# Content maintenance calendar

Maintainer checklist for schedules and other dated radio data. Last reviewed: **2026-10-26**. These are manual development/release tasks; this file does not schedule jobs or enable background connections in the app.

Use [DATA_SOURCES.md](DATA_SOURCES.md) for provenance and known gaps, and [`scripts/pack-data/sources.json`](../scripts/pack-data/sources.json) for band-table source URLs, hashes and review intervals. A review date is a reminder, not a guarantee that data remains current until then. Review sooner when a publisher announces a change or an operator reports an error.

## When to check

| Content | Review policy | What to check |
|---|---|---|
| Broadcast frequency schedules, including BBC and user-supplied EiBi-layout files | First week of every month; before each content release; again before the publisher's seasonal expiry | Frequency, UTC time, weekday, target region, mode, effective dates and withdrawals. Use the publisher's explicit validity dates, not an assumed season. |
| Programme guides, when implemented | Before each guide publication and whenever the broadcaster revises it | Programme title, service/language, timezone, date and exceptions. A frequency table is not a programme guide. Do not infer programme names from transmission times. |
| National band tables | Run the source check monthly; conduct the full review at the intervals below and immediately on regulatory amendments | Latest regulator text, effective date, licence classes, emissions, power limits, footnotes and national exceptions. Hashes alone cannot reveal a newer document at another URL. |
| ITU allocations and call-sign series | Before a release and on new ITU publications/amendments; allocations also follow the registered interval | Edition, footnotes, national exceptions and distinction between ITU call-sign assignments and DXCC entities. |
| Satellite elements | User obtains fresh elements before an observing session; recheck after manoeuvres or unexpected pass errors | Element epoch versus prediction time, satellite identity and source. No monthly bundled TLE is maintained. Current UI warns beyond 30 days and refuses predictions beyond 60 days from epoch; these are guardrails, not accuracy guarantees. |
| Satellite operating frequencies/status, when added | Before publishing a pack and on operator announcements | Official mission/operator status, uplink/downlink, modes and Doppler conventions. Pass predictions do not establish that a transmitter is operational. |
| Propagation inputs | Review the entered value's source/date for each planning period | Monthly report uses a user-entered smoothed sunspot number. Do not substitute a daily count without explaining the difference. Model coefficients are versioned engine data, not live observations; review them when updating DVOACAP. |
| Time/frequency stations | Quarterly and before release, or on an announced service change | Official operator frequencies, schedule and service status. The built-in reference is not a live station-status feed. |
| Q codes, phonetics, CTCSS/DCS, constants and other stable references | Annually and before a release that changes the reference | Relevant standard edition, errata and device-specific limits. Do not change physical constants simply to give the dataset a newer date. |
| Offline maps and optional packs | When adopting a new dataset/pack release | Coverage, resolution, attribution, redistribution rights and storage changes. No automatic tile downloads. |

### Band-table review dates

Snapshot of the existing registry, not a second source of truth. Recalculate these dates from `retrieved + reviewEveryDays` whenever the registry changes.

| Source group | Interval | Last recorded retrieval | Next full review |
|---|---|---|---|
| South Africa and Brazil | 90 days | 2026-10-19 | 2027-01-17 |
| USA, Germany, Canada, Australia and Japan | 180 days | 2026-10-19 | 2027-04-17 |
| Simplified ITU allocation overview | 180 days | 2026-10-23 | 2027-04-21 |

## BBC source handoff

- **Inspected:** 2026-10-26, user-supplied `BBC - Global Short Wave Frequencies.html` (156,889 bytes). This is an inspection date; the browser's original download time and the BBC's publication timestamp were not established.
- **Canonical source:** [BBC Global Short Wave Frequencies](https://www.bbc.co.uk/programmes/articles/2x9tqt6mc05vB2S37j8MWMJ/global-short-wave-frequencies).
- **Published coverage:** 2026-10-25 through 2027-03-27, as stated in the saved page. Five regional tables; times labelled GMT and frequencies in kHz. No programme titles or programme guide are supplied.
- **File SHA-256:** `ee450f9a2cf70d707f6ee346434aefbd2305ed9883fb0b66798c5b7271643759` (raw bytes of this supplied file, not a live-page hash).
- **Next routine check:** first week of November 2026. **Season handoff review:** 2027-03-01, then before coverage ends on 2027-03-27. Obtain the next published schedule; do not roll these rows forward automatically or assume it starts on a particular day.
- **Conversion completed:** 21 source rows produce 30 frequency entries in `src/data/bbcSchedule.ts`, checked against the supplied HTML. Multiple frequencies are split; weekday restrictions and midnight boundaries are preserved. **639, 702 and 720 kHz** are labelled medium wave. The 17575 kHz entry is labelled DRM digital reception.
- **Parser caution:** the current generic text importer treats unsupported day strings as daily, preserving the original in a note. Convert `Monday - Friday` to `12345`, `Monday - Saturday` to `123456`, Saturday to `6`, and Sunday to `7` explicitly; never accept a fallback to daily for these source rows.
- **Distribution status:** the app bundles an independently formatted factual frequency reference from the user-supplied page. Original HTML, prose, artwork and logos are excluded; the source remains copyright BBC and no general BBC licence is claimed. Keep the browser save outside public assets and Git. Record terms before publishing separately distributed BBC content packs. Programme-guide sourcing is a separate task.
- **BBC validity enforced:** both “On the air now” and the time-filtered table suppress BBC rows before 2026-10-25 and after 2027-03-27 (inclusive UTC dates). “Everything” retains a labelled upcoming/reference or archive view. Unit/UI tests cover both boundaries and expiry while the page is open. Do not roll forward old rows when updating dates.
- **Imported-pack limitation:** the generic pack schema still has revision/age information without enforced seasonal bounds. Its warning after 45 days is not equivalent to publisher validity; extending that schema remains on the roadmap.

The “On the air now” section uses only the selected bundled/imported schedule and the device's current UTC clock, with the station/frequency filters applied. It is a schedule match, not a live availability feed. Entry weekdays denote UTC start days; after midnight, the remainder of an overnight transmission is checked against the previous weekday. Check each imported source's day convention before conversion.

## Monthly check and release checklist

1. Review this calendar during the first week of the month; next routine pass is **2026-11-01–2026-11-07**. Also review it before each release that ships changed reference data.
2. Run `npm run check:sources` deliberately while online. It checks registered regulation sources, **not** BBC, EiBi, satellite elements or all reference datasets. Read every `CHANGED`, `ERROR`, overdue notice and known-gap note. Overdue age alone currently does not fail the command. An unreachable source means unverified, not unchanged.
3. Check publisher landing pages manually for new editions. In particular, the Australian as-made PDF and Canadian mirror may remain unchanged while newer official documents exist; see [source limitations](DATA_SOURCES.md#checking-whether-a-source-has-changed).
4. Record the publisher/version, source URL, actual retrieval/review date, effective-from/to dates where supplied, licence/permission and extraction method. Preserve coverage, mode and jurisdiction limits. Distinguish a successful no-change review from a content revision; do not refresh a schedule's revision merely to suppress an age warning.
5. For changed band packs, follow the [pack update routine](DATA_SOURCES.md#updating-a-pack-the-routine): edit source rows, bump the pack revision, rebuild and test. Update reference data and its matching tests together. For schedules, verify representative rows by hand, especially weekday restrictions, 00:00 crossings, multiple frequencies and expiry boundaries.
6. Use `npm run check:sources -- --update` only after reviewing source changes. Inspect the resulting diff carefully: the current command updates retrieval dates for all entries, even entries whose fetch failed. Do not retain a refreshed date/hash that suggests an unsuccessful review was successful. Do not update baselines simply to make a check pass.
7. For changed application data/code, run `npm test`, `npm run build` and `npm run check:offline`; run the desktop check when desktop workflows are affected. Exercise imported packs with networking blocked, and confirm attribution, date/age warnings and unavailable/expired-content behaviour. List checks not actually performed.
8. Update [DATA_SOURCES.md](DATA_SOURCES.md), [CHANGELOG.md](../CHANGELOG.md), this calendar's dates and the roadmap as appropriate. Publish permitted content as a versioned local-import pack or app release, with USB transfer supported. Follow [RELEASING.md](RELEASING.md). Never silently fetch replacements at startup.

## Review log

Append an entry after each maintenance pass; keep failures and deferred items visible.

| Reviewed on | Dataset | Outcome / action | Next check |
|---|---|---|---|
| 2026-10-26 | BBC supplied HTML | Bundled 30 factual frequency records, checked against all 21 source rows, with enforced UTC season. No original source file, programme listings or standalone pack bundled. No live source check performed. | November 2026; season review 2027-03-01 |
| 2026-10-26 | Number-code reference | Reviewed ACOM February 2022 guide, pp. 9/33; added selected number meanings with informal/historical distinctions. | Annually, or when revised |
| 2026-10-26 | Registered regulation sources | Existing metadata inspected to calculate the dates above. Remote documents were not re-fetched in this pass. | First week of November 2026 |
