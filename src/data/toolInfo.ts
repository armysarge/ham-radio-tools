// Plain-language "What is this?" text for every tool page, shown from the info button beside the favourite star.
// Write for someone who has never used the tool: no unexplained jargon, what it does and when you would reach for it.
export interface ToolInfo { what: string; when: string }

export const TOOL_INFO: Record<string, ToolInfo> = {
  'coordinate-converter': {
    what: 'Places on Earth can be written down in several ways: decimal numbers, degrees with minutes, or degrees with minutes and seconds. This page turns one style into the others and shows the place on an offline map.',
    when: 'Use it when a map app, a GPS and a radio program each want your position in a different format.',
  },
  'unit-converter': {
    what: 'A general-purpose converter for the things that come up in radio and electronics: lengths, areas, frequencies, times, small electrical values, energy and temperature, in metric and imperial units.',
    when: 'Use it when a cable length is in feet but the antenna plan is in metres, or a part value is in nanofarads and you need picofarads.',
  },
  'awg-wire': {
    what: 'Wire is sold by a gauge number (AWG): the bigger the number, the thinner the wire. This page turns that number into the wire’s thickness, how much it resists electric current, and how much voltage is lost along a run of it.',
    when: 'Use it to pick wire for a power lead or antenna: for example, whether a 3 m lead will drop too much voltage to run your radio.',
  },
  'complex-impedance': {
    what: 'Impedance is how much a circuit resists a radio signal; coils and capacitors add a “twist” as well as plain resistance. This page adds up several parts, wired one after another (series) or side by side (parallel), and draws the circuit.',
    when: 'Use it to find what a small matching circuit looks like to a transmitter, including how good the match is (SWR).',
  },
  'frequency-wavelength': {
    what: 'A radio signal’s frequency (how fast it wiggles) and its wavelength (how long one wiggle is) are two sides of the same thing. Give one and this page gives the other.',
    when: 'Use it to answer “how long is a 20 m signal?” or to work out antenna sizes, since antennas are built in fractions of a wavelength.',
  },
  'doppler-shift': {
    what: 'When something sending a signal moves towards you, the frequency you hear goes up a little; moving away, it goes down. This is the same effect as a passing siren. The page works out the size of that change.',
    when: 'Use it to see how far a satellite signal drifts while it flies past, so you know how much to retune.',
  },
  'ohms-law': {
    what: 'Voltage, current, resistance and power are linked by simple rules (Ohm’s law). Enter any two and the page fills in the other two.',
    when: 'Use it for quick checks: how much current a lamp draws, what resistor you need, or how many watts a part will have to handle.',
  },
  'voltage-divider': {
    what: 'Two resistors in a row split a voltage into a smaller one. The page draws the circuit and shows the smaller voltage that comes out of the middle.',
    when: 'Use it to scale a voltage down, for example to feed a meter or a microcontroller from a higher supply.',
  },
  'dbm-watts': {
    what: 'Radio people measure signal strength in decibels (dB), a scale where every 3 dB is double the power. This page converts between watts, dBm (decibels compared with one milliwatt) and plain gain or loss figures.',
    when: 'Use it when a spec sheet quotes dBm or dB and you want to know what that means in watts, or how much a loss halves your power.',
  },
  'swr': {
    what: 'SWR tells you how well an antenna is matched to its radio. 1:1 is perfect; a high number means some of your power is bouncing back instead of going out. The page also shows the matching return loss and reflection figures.',
    when: 'Use it to understand a reading from an SWR meter, or to see how much power a given SWR reflects.',
  },
  'reactance-resonance': {
    what: 'Coils and capacitors push back against a radio signal in different ways, and at one particular frequency the two cancel out. That is the resonant frequency, which is how tuned circuits pick one station out of many.',
    when: 'Use it to find the frequency a coil and capacitor tune to, or the part values you need to tune to a chosen frequency.',
  },
  'feedline-length': {
    what: 'A radio signal travels slower inside a cable than in air, so the cable’s electrical length is different from its physical length. The page gives the real length of cable that matches a quarter, half or chosen fraction of a wavelength.',
    when: 'Use it when you need to cut a cable to a particular electrical length, such as for a matching section or a phasing line.',
  },
  'components': {
    what: 'A reference for reading and choosing small electronic parts: the coloured bands on resistors, the numbers printed on capacitors and tiny surface-mount parts, and the standard value sizes manufacturers use.',
    when: 'Use it to read an unmarked part, find a standard value close to the one you calculated, or size the resistor for an LED.',
  },
  'dipole': {
    what: 'A dipole is the simplest antenna: a wire cut in half with the radio connected in the middle. The page works out how long to cut each side for your frequency and how to trim it afterwards.',
    when: 'Use it before building a basic wire antenna for a band.',
  },
  'efhw': {
    what: 'An end-fed half-wave is a long wire fed at one end, which makes it easy to hang from a single tree or pole. It needs a small transformer at the feed point, and the page gives the wire length, the bands it will work on and advice on the transformer.',
    when: 'Use it for a portable or easy-to-put-up antenna that covers several bands.',
  },
  'inverted-v': {
    what: 'An inverted-V is a dipole hung from one high point in the middle with its two ends sloping down. It needs only one tall support. The page gives the wire length, end height and how wide the antenna will be.',
    when: 'Use it when you only have one mast or tree and want a simple wire antenna.',
  },
  'vertical': {
    what: 'A vertical antenna stands upright like a pole, with wires (radials) spread out at its base to act as the other half. The page works out the length of the pole and the radials for your band.',
    when: 'Use it for a compact antenna that sends signals in all directions around you, or for low-angle long-distance contacts.',
  },
  'jpole': {
    what: 'A J-pole is an upright antenna shaped like the letter J, usually made from copper pipe or ladder-style cable. It is popular on VHF and UHF bands. The page gives the sizes and the spot where the radio connects.',
    when: 'Use it to build an inexpensive, good-performing antenna for local FM and repeater contacts.',
  },
  'loop': {
    what: 'A loop antenna is a closed wire shape, such as a square, triangle or circle, about one wavelength around. The page gives the total wire length and each side, plus a matching piece of cable.',
    when: 'Use it to build a quiet-sounding antenna that also gives a little extra signal in one direction.',
  },
  'qfh': {
    what: 'A quadrifilar helix is a twisted-wire antenna that hears weather satellites well from nearly any direction in the sky. The page gives starting sizes for the 137 MHz band with a labelled drawing.',
    when: 'Use it to build an antenna for receiving weather-satellite pictures.',
  },
  'moxon': {
    what: 'A Moxon rectangle is a small, two-element antenna folded into a rectangle. It focuses your signal in one direction while being smaller than most beam antennas. The page gives the sizes and wire cut lengths.',
    when: 'Use it to build a compact directional antenna when you do not have room for a full-size beam.',
  },
  'feedline-loss': {
    what: 'Every cable wastes some of your signal as heat, and more so at higher frequencies and with a poor antenna match. The page shows how much power is lost and how much reaches the antenna.',
    when: 'Use it to compare cables or to see whether a long run is costing you too much signal.',
  },
  'link-budget': {
    what: 'A link budget adds up everything that helps or hurts a radio signal on its way from one station to another: transmit power, antennas, distance and noise. The page tells you whether the signal will arrive strongly enough.',
    when: 'Use it to check whether a radio link of a given distance is likely to work before you try it.',
  },
  'radiated-power': {
    what: 'The power your antenna actually sends out differs from what the transmitter makes, because the cable wastes some and the antenna can focus the rest. ERP and EIRP are two standard ways of stating the real strength.',
    when: 'Use it to work out your effective output, for example to compare setups or to check against a power limit.',
  },
  'l-network': {
    what: 'An L-network is a tiny circuit of one coil and one capacitor that makes two different impedances look the same to the radio, so that power flows properly between them. The page gives the part values.',
    when: 'Use it to design a simple antenna tuner or match one part of a circuit to another at a single frequency.',
  },
  'low-pass-filter': {
    what: 'A low-pass filter lets low frequencies through and blocks higher ones. In a transmitter it stops unwanted higher-frequency signals (harmonics) from going out of your antenna. The page gives the coil and capacitor values and a diagram.',
    when: 'Use it when you want to build a harmonic filter for a transmitter.',
  },
  'high-pass-filter': {
    what: 'A high-pass filter does the reverse of a low-pass one: it lets high frequencies through and blocks lower ones. The page gives the part values and a wiring diagram.',
    when: 'Use it to keep strong low-frequency signals, such as broadcast stations, out of a receiver.',
  },
  'coils': {
    what: 'Radio coils are made by winding wire, either around a ring-shaped ferrite core (a toroid) or in air. The page tells you how many turns to wind to reach the inductance you want.',
    when: 'Use it before winding a coil for a filter, tuner or matching circuit.',
  },
  'power-planner': {
    what: 'Out in the field your radio runs from a battery. The page adds up how much energy you use in a day and tells you how big a battery, and how much solar panel, you will need to keep going.',
    when: 'Use it to plan a portable operation, a camping trip or an emergency power setup.',
  },
  'yagi': {
    what: 'A Yagi is the classic rooftop television-style antenna: a row of metal rods that focuses signals in one direction. The page gives the length and spacing of each rod for your frequency.',
    when: 'Use it to design a directional antenna that makes distant stations louder.',
  },
  'quad': {
    what: 'A cubical quad is a directional antenna made from square wire loops spaced along a boom. It is known for strong signals for its size. The page gives the size of every loop.',
    when: 'Use it to plan a directional antenna that can be built from wire and bamboo or fibreglass.',
  },
  'radial-planner': {
    what: 'A vertical antenna needs wires laid out on or above the ground beneath it. The page tells you how long they should be, how many to use, and which bands will fit in your garden.',
    when: 'Use it to plan where to run the wires before you put up a vertical antenna.',
  },
  'diy-components': {
    what: 'Step-by-step guidance for making your own radio parts at home: coils, transformers, capacitors, dummy loads and chokes, with sizes, drawings, tests and safety notes.',
    when: 'Use it when you cannot buy a part, want to learn by building, or need something to test with.',
  },
  'diy-baluns': {
    what: 'A balun or unun is a small transformer that connects two kinds of antenna or cable that would not otherwise work well together, and helps keep stray signal off your cable. The page helps you choose one and shows how to wind and connect it.',
    when: 'Use it before building a balun for a dipole, a wire antenna or a coax cable.',
  },
  'maidenhead': {
    what: 'Maidenhead grid squares are short codes, such as KG33, that name a patch of the Earth. Radio operators swap them to say roughly where they are. The page converts between a grid square and ordinary coordinates, and shows distance and compass direction to another place.',
    when: 'Use it to find your grid square, work out how far away a station is, or which way to point a directional antenna.',
  },
  'propagation-report': {
    what: 'Radio signals bounce off the upper atmosphere, and how well they do so changes by hour and by band. This report estimates, for each hour, which bands are likely to work between two places.',
    when: 'Use it to pick a good time and band for a long-distance contact.',
  },
  'propagation': {
    what: 'A simple guide to how the time of day and the sun affect which bands carry your signal far. It also shows where on Earth it is currently day or night, including the twilight line where long-distance contact is often best.',
    when: 'Use it to decide which band to try now and to learn how signals travel.',
  },
  'satellite-passes': {
    what: 'Satellites circle the Earth and are only above your horizon for a few minutes at a time. Give the satellite’s orbit data and your location and this page lists when it will pass over you, and how to retune your radio as it moves.',
    when: 'Use it to plan when to listen for or talk through an amateur radio satellite, including the International Space Station.',
  },
  'qrm-hunting': {
    what: 'QRM means man-made radio interference: the buzzing and hissing from things like chargers, LED lights and solar equipment. This page is a step-by-step guide to tracking down where it comes from.',
    when: 'Use it when your radio has a noisy background and you want to find and fix the source.',
  },
  'broadcast-schedules': {
    what: 'International stations broadcast on shortwave radio at set times and frequencies. This page shows which of those, and which time-signal stations, are on the air right now.',
    when: 'Use it to find something to listen to, or to test that your receiver is working.',
  },
  'itu-regulations': {
    what: 'The ITU is the United Nations agency that sets the world rules for who may use which radio frequencies. This page explains in plain terms how those rules are organised, and what they say about amateur radio.',
    when: 'Use it to understand why the bands are laid out the way they are and what the terms primary and secondary mean.',
  },
  'band-plans': {
    what: 'A band plan lists which parts of the radio spectrum are set aside for which uses, and what amateurs may do in each part. You can look up a frequency and see what it is allocated to in your region and country.',
    when: 'Use it to check what you are allowed to use on a frequency before you transmit, and what else shares it.',
  },
  'ctcss': {
    what: 'Repeater stations often listen only for transmissions that include a very low hum, a tone people cannot hear. CTCSS is the standard list of those tones. The page lists them all.',
    when: 'Use it to set the right tone in your radio so that a repeater will respond to you.',
  },
  'dcs': {
    what: 'DCS is a digital version of the tone systems used by repeaters: a short code sent along with your voice so that only radios set to the same code will open up. The page lets you look up the codes and explains the difference between normal and inverted ones.',
    when: 'Use it when a repeater or radio group asks you to set a DCS code.',
  },
  'abbreviations': {
    what: 'Radio operators use many short forms, especially in Morse code and on the air. This page lists the common ones with their meanings and lets you search them.',
    when: 'Use it when you hear or read a short code you do not understand.',
  },
  'constants': {
    what: 'A quick reference of the fixed numbers that radio maths keeps relying on, such as the speed of light, along with unit conversions and handy antenna rules of thumb.',
    when: 'Use it when you need an exact value in a hurry, or a quick rule for estimating a length.',
  },
  'logbook': {
    what: 'A logbook is a record of the contacts you have made. This one stores them on your own device, warns you when you log the same station twice, and can export or import a standard file format (ADIF) that other logging programs understand.',
    when: 'Use it to keep a record of your contacts, or to move your log to or from another program.',
  },
  'clock': {
    what: 'Radio schedules are given in UTC, a world time that does not change with seasons or time zones. This page shows UTC beside your local time, with extra time zones, a station-ID reminder and a countdown timer.',
    when: 'Use it to keep track of schedules, nets and contests wherever you are.',
  },
  'morse-trainer': {
    what: 'Learn the sounds of E and T first, then add one character at a time. Copy short rounds, practise the characters you missed, and earn badges through lessons and challenges.',
    when: 'Use it for a first Morse lesson, a daily review, or to build speed and copy common on-air words.',
  },
  'cw': {
    what: 'CW is another name for Morse code. This page shows the Morse alphabet, plays any text you type as Morse (with a sound file you can save), and helps you decode Morse that you tap in, type in or play to the microphone.',
    when: 'Use it to practise Morse, make practice audio, or work out what a Morse signal says.',
  },
  'callsign': {
    what: 'Every radio station has a call sign, and its first letters show which country issued it. Paste one in and this page tells you the country, and what the extra bits like /P (portable) or /MM (at sea) mean.',
    when: 'Use it when you hear a call sign and want to know where the station is from.',
  },
  'number-codes': {
    what: 'Radio operators use number shorthand: 73 means “best wishes”, 88 means “love and kisses” and 72 is a friendly sign-off for low-power stations. This page explains these and a few older codes with examples.',
    when: 'Use it to understand what the numbers at the end of a message mean, or to learn the polite way to end a contact.',
  },
  'q-codes': {
    what: 'Q codes are three-letter shorthand starting with Q, such as QTH (“my location is…”), which were invented for Morse and are still used on voice. The page lists the common ones as questions and answers.',
    when: 'Use it when you hear one on the air and want to know what it means.',
  },
  'phonetic': {
    what: 'The phonetic alphabet gives each letter a clear word (Alpha, Bravo, Charlie…) so that letters are not mistaken over a noisy radio link. The page shows all of them with how to pronounce each one.',
    when: 'Use it to spell out your call sign or any other name so that it is understood the first time.',
  },
}
