// Plain-language primer on the ITU Radio Regulations. Paraphrased; the official text is the authority.
export const ITU_INFO_META = { revision: '2026-10-19', source: 'ITU Radio Regulations and ITU public information; IARU commentary on Article 25. Paraphrased, not quoted.' }

export interface Block { heading: string; body: string[]; list?: string[] }
export const ITU_SECTIONS: Block[] = [
  { heading: 'What it is',
    body: [
      'The Radio Regulations (RR) are the international treaty that sets the rules for using the radio-frequency spectrum and satellite orbits. They are published by the International Telecommunication Union (ITU), the United Nations agency for information and communication technologies, based in Geneva. The ITU has existed since 1865 and has had international radio rules since the early 1900s.',
      'Nearly every country is a member and is bound by the Regulations. Because radio waves cross borders, the treaty exists so that a broadcaster, an aircraft, a ship, a satellite and an amateur station in different countries can share spectrum without wrecking each other’s service.',
    ] },
  { heading: 'Who writes and changes them',
    body: [
      'The Regulations are revised at a World Radiocommunication Conference (WRC), normally held every three to four years. Delegations from member states negotiate changes, and the decisions are collected into a new edition. Recent conferences were WRC-12, WRC-15, WRC-19 and WRC-23; the next is WRC-27.',
      'Amateur radio is represented at the ITU by national societies and by the International Amateur Radio Union (IARU), which sends delegations and argues for amateur spectrum before and during each conference. New amateur allocations, such as the 472–479 kHz band (WRC-12) and the narrow 5 MHz band (WRC-15), come out of that process.',
    ] },
  { heading: 'How it is organised',
    body: ['The Regulations are published in four volumes and amateurs mostly deal with a handful of parts:'],
    list: [
      'Articles (Volume 1): the main rules. Article 1 gives definitions, Article 5 holds the Table of Frequency Allocations and the footnotes, Article 15 covers interference, Article 19 covers identification of stations, and Article 25 is the one specifically about amateur services.',
      'Appendices (Volume 2): technical and procedural detail, for example Appendix 42 (the international series of call signs, which allocates call-sign blocks to countries) and Appendix 14 (the phonetic alphabet and figure code).',
      'Resolutions and Recommendations (Volume 3): decisions of past conferences that set conditions for particular bands or topics.',
      'ITU-R Recommendations incorporated by reference (Volume 4): technical standards, such as M.1172 for radio-telegraph abbreviations and Q signals.',
    ] },
  { heading: 'The three Regions',
    body: [
      'For allocations the world is divided into three ITU Regions. Region 1 is Europe, Africa, the Middle East and northern Asia including Russia; Region 2 is the Americas (including Greenland); Region 3 is the rest of Asia and Oceania. The exact boundaries are defined in Article 5.',
      'The same band can have different allocations in different Regions. That is why the ITU band plan tool in this app shows one set of limits per Region: for example the 40 m band is 7.0–7.2 MHz in Regions 1 and 3 but 7.0–7.3 MHz in Region 2. The IARU has matching regional organisations (Regions 1, 2 and 3) that publish voluntary band plans inside the allocations.',
    ] },
  { heading: 'How to read an allocation',
    body: [
      'Article 5 lists each frequency range with the services allowed in each Region. A service written in capital letters has a primary allocation; a service in normal type is secondary. Some bands list several primary services (co-primary) that share on equal terms.',
      'Primary and secondary matter when two services want the same frequency. A secondary service, such as amateur on 30 m or 60 m, must not cause harmful interference to primary users and cannot claim protection from them. A primary service is protected from secondary users, but not from other primary users that were assigned earlier.',
      'Numbers like 5.133B are footnotes that add conditions to a band, such as power limits, which countries are affected, or when the allocation takes effect. The band-plan tool shows only the main amateur rows; the footnotes are why national rules often differ in detail.',
    ] },
  { heading: 'The amateur service in the Regulations',
    body: [
      'The Regulations define the amateur service as a service for self-training, intercommunication and technical investigation by duly authorised people interested in radio technique purely for personal reasons and without a financial interest (Article 1). The amateur-satellite service is the same activity using space stations.',
      'Article 25 is the short article that applies directly to amateurs. In summary:',
    ],
    list: [
      'Amateur stations in different countries may communicate unless one of those countries has told the ITU that it objects (No. 25.1).',
      'International amateur traffic should be limited to matters about the amateur service and remarks of a personal character (25.2); messages are not to be encoded to hide their meaning, except control signals sent to amateur satellites (25.2A).',
      'Third-party traffic across borders is for emergencies and disaster relief, and each country decides whether its own amateurs may do it (25.3).',
      'Countries decide how to verify an operator’s qualifications and set the maximum power. The old international Morse-code requirement was removed by WRC-03, so whether Morse is tested is now each country’s decision.',
      'Countries are encouraged to let amateurs prepare for and support disaster-relief communication (25.9A), and each country decides whether visiting licensed amateurs may operate while there.',
    ] },
  { heading: 'ITU rules versus your licence',
    body: [
      'The ITU does not license people. Each country’s regulator turns the Regulations into national law and issues licences, and it may be stricter than the ITU (a narrower band, lower power, fewer modes) but not more permissive in a way that breaks the treaty or interferes with other countries. If the two disagree, your national licence conditions are what you must follow.',
      'Band plans below the allocation level — which part of 20 m is for CW, digital or phone — are voluntary plans from the IARU and national societies, or sometimes national rules. The ITU Regulations do not say where the SSB segment begins.',
    ] },
  { heading: 'Where to read the real text',
    body: [
      'The ITU publishes the Radio Regulations free of charge on its website (search for “Radio Regulations” on itu.int and choose the latest edition, which includes the decisions of the most recent WRC). Article 25 and the Table of Frequency Allocations are short enough to read in an evening. The IARU also publishes plain-language summaries of what each conference changed for amateurs.',
      'This app is offline-first: it never fetches the Regulations. The bundled band plan is a simplified extract and is dated; always check the current edition for anything that matters, such as a licence application or an experiment near a band edge.',
    ] },
]

export const ITU_GLOSSARY: [string, string][] = [
  ['ITU', 'International Telecommunication Union, the UN agency that maintains the Radio Regulations.'],
  ['ITU-R', 'The ITU’s radiocommunication sector: study groups, recommendations and the conferences.'],
  ['WRC', 'World Radiocommunication Conference. Revises the Regulations every three to four years.'],
  ['RR', 'Radio Regulations — the international treaty text.'],
  ['Administration', 'ITU term for a country’s government body responsible for radio (the national regulator).'],
  ['Allocation', 'Entry in the Table of Frequency Allocations that gives a band to a radio service.'],
  ['Assignment / licence', 'A national authorisation for a specific station to use a frequency. The ITU does not do this for individuals.'],
  ['Primary / secondary', 'Priority categories for services sharing a band. Secondary services must not interfere with, or claim protection from, primary ones.'],
  ['Region 1 / 2 / 3', 'The three ITU geographic regions used in the allocation table.'],
  ['IARU', 'International Amateur Radio Union; represents amateur radio at the ITU and publishes voluntary band plans.'],
  ['Harmful interference', 'Interference that endangers a safety service or seriously degrades, obstructs or repeatedly interrupts a radio service.'],
  ['Footnote (5.xxx)', 'A numbered condition attached to a band in Article 5; often a country list, power limit or start date.'],
]
