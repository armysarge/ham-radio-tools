// Reference data, kept apart from logic. Source basis: ITU-R Recommendation M.1172 (Q code and abbreviations),
// plus common amateur usage as listed in the ARRL Operating Manual. Wording is paraphrased.
export interface QCode { code: string; asks: string; says: string }
export const Q_CODES_REVISION = 'Common amateur set, paraphrased (not a verbatim ITU list; no formal revision checked)'
export const Q_CODES: QCode[] = [
  { code: 'QRG', asks: 'Will you tell me my exact frequency?', says: 'Your exact frequency is …' },
  { code: 'QRH', asks: 'Does my frequency vary?', says: 'Your frequency varies.' },
  { code: 'QRI', asks: 'How is the tone of my transmission?', says: 'The tone of your transmission is …' },
  { code: 'QRK', asks: 'What is the readability of my signals?', says: 'The readability of your signals is …' },
  { code: 'QRL', asks: 'Is the frequency in use?', says: 'The frequency is in use. (Also: “I am busy”.)' },
  { code: 'QRM', asks: 'Are you troubled by interference from other stations?', says: 'I am troubled by man-made interference.' },
  { code: 'QRN', asks: 'Are you troubled by static?', says: 'I am troubled by static (natural noise).' },
  { code: 'QRO', asks: 'Shall I increase power?', says: 'Increase power. (Also: high power.)' },
  { code: 'QRP', asks: 'Shall I decrease power?', says: 'Decrease power. (Also: low power, 5 W or less.)' },
  { code: 'QRQ', asks: 'Shall I send faster?', says: 'Send faster.' },
  { code: 'QRS', asks: 'Shall I send more slowly?', says: 'Send more slowly.' },
  { code: 'QRT', asks: 'Shall I stop sending?', says: 'I am stopping transmission / closing down.' },
  { code: 'QRU', asks: 'Have you anything for me?', says: 'I have nothing for you.' },
  { code: 'QRV', asks: 'Are you ready?', says: 'I am ready.' },
  { code: 'QRX', asks: 'When will you call me again?', says: 'Stand by; I will call you again at …' },
  { code: 'QRZ', asks: 'Who is calling me?', says: 'You are being called by …' },
  { code: 'QSB', asks: 'Are my signals fading?', says: 'Your signals are fading.' },
  { code: 'QSK', asks: 'Can you hear me between your signals (full break-in)?', says: 'I can hear you between my signals.' },
  { code: 'QSL', asks: 'Can you acknowledge receipt?', says: 'I acknowledge receipt. (Also: confirm by card/log.)' },
  { code: 'QSO', asks: 'Can you communicate with … directly?', says: 'A contact / conversation between stations.' },
  { code: 'QSY', asks: 'Shall I change to another frequency?', says: 'Change to another frequency.' },
  { code: 'QTH', asks: 'What is your location?', says: 'My location is …' },
  { code: 'QTR', asks: 'What is the correct time?', says: 'The correct time is …' },
]
