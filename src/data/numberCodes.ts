// Editorial summaries; no source tables or artwork reproduced. See docs/DATA_SOURCES.md.
export const NUMBER_CODES_REVIEWED = '2026-10-26'
export interface NumberCode {
  code: string
  meaning: string
  group: 'on-air' | 'historical'
  note: string
  example?: string
}
export const NUMBER_CODES: NumberCode[] = [
  { code: '73', meaning: 'Best regards', group: 'on-air',
    note: 'A friendly closing, often used when saying goodbye after a contact. The meaning is already plural; use 73 rather than 73s.', example: 'TNX QSO 73' },
  { code: '88', meaning: 'Love and kisses', group: 'on-air',
    note: 'An affectionate closing for someone you know well, rather than a general greeting to every station.', example: '88' },
  { code: '72', meaning: 'Best regards · QRP variant', group: 'on-air',
    note: 'An informal low-power operating greeting, not a universal standard or a historical 92 Code assignment.', example: '72 DE YOURCALL' },
  { code: '1', meaning: 'Wait a minute', group: 'historical',
    note: 'A telegraph-era pause request, reported in ACOM’s historical overview. Use plain language with a modern radio operator.' },
  { code: '6', meaning: 'Are you ready?', group: 'historical',
    note: 'A telegraph-era readiness enquiry in the same overview; not a modern radio procedure signal.' },
  { code: '30', meaning: 'The end', group: 'historical',
    note: 'An ending marker, also seen as −30− in press copy. Do not confuse it with an amateur CW prosign.' },
]
