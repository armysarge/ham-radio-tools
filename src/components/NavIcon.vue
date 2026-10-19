<script setup lang="ts">
// Small original line icons (24×24, drawn for this app), inlined so nothing is fetched at runtime.
defineProps<{ name: string }>()
const ICONS: Record<string, string[]> = {
  home: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  star: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'],
  saved: ['M6 3h12v18l-6-4-6 4z'],
  settings: ['M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z', 'M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9L7 7 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1'],
  rf: ['M13 2L5 14h6l-1 8 8-12h-6z'],
  antenna: ['M12 21V8', 'M8 21h8', 'M12 8L7 3', 'M12 8l5-5', 'M5 11a9 9 0 000 0'],
  map: ['M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z', 'M9 4v14', 'M15 6v14'],
  ops: ['M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3z', 'M8 8h6', 'M8 12h6'],
  wave: ['M2 12c1.5-6 3.5-6 5 0s3.5 6 5 0 3.5-6 5 0 2.5 4 3 3'],
  chip: ['M7 7h10v10H7z', 'M10 3v4', 'M14 3v4', 'M10 17v4', 'M14 17v4', 'M3 10h4', 'M3 14h4', 'M17 10h4', 'M17 14h4'],
  resistor: ['M2 12h4l2-5 3 10 3-10 3 10 2-5h3'],
  bars: ['M5 20v-8', 'M10 20V6', 'M15 20v-10', 'M20 20V4'],
  swr: ['M3 20V4', 'M3 20h18', 'M5 6c4 10 8 12 14 12'],
  coil: ['M2 15h3c0-7 4-7 4 0', 'M9 15c0-7 4-7 4 0', 'M13 15c0-7 4-7 4 0', 'M17 15h5'],
  coax: ['M12 4a8 8 0 100 16 8 8 0 000-16z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  dipole: ['M2 9h8', 'M14 9h8', 'M10 7h4v4h-4z', 'M12 11v9'],
  endfed: ['M7 12h15', 'M2 8h5v8H2z'],
  invertedv: ['M3 15L12 5l9 10', 'M12 5v16'],
  jpole: ['M7 3v15a4 4 0 004 4h2a4 4 0 004-4', 'M17 3v10', 'M11 18v-4'],
  vertical: ['M12 3v14', 'M5 21l7-4 7 4'],
  loop: ['M5 5h14v14H5z', 'M12 19v3'],
  globe: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
  search: ['M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13z', 'M15.5 15.5L21 21'],
  broadcast: ['M12 12h.01', 'M8.5 8.5a5 5 0 000 7', 'M15.5 8.5a5 5 0 010 7', 'M5.5 5.5a9 9 0 000 13', 'M18.5 5.5a9 9 0 010 13'],
  scale: ['M12 3v18', 'M7 21h10', 'M5 7h14', 'M5 7l-3 7a3 3 0 006 0z', 'M19 7l-3 7a3 3 0 006 0z'],
  plan: ['M3 6h12', 'M3 12h18', 'M9 18h12'],
  pulse: ['M2 12h3l2-6 3 12 3-12 2 6h7'],
  list: ['M4 6h16', 'M4 12h10', 'M4 18h14'],
  pi: ['M5 6h14', 'M9 6v13', 'M15 6v10c0 2 1 3 3 3'],
  morse: ['M4 12h.01', 'M8 12h6', 'M18 12h.01'],
  badge: ['M4 5h16v14H4z', 'M8 10a2 2 0 104 0 2 2 0 10-4 0', 'M7 17c.5-2 4.5-2 5 0', 'M15 10h3', 'M15 14h3'],
  q: ['M12 4a7 7 0 100 14 7 7 0 000-14z', 'M14 16l5 5'],
  station: ['M3 8h18v10H3z', 'M7 12h4', 'M15 12h2', 'M6 5l2 3', 'M18 5l-2 3'],
  sun: ['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M5 5l2 2', 'M17 17l2 2', 'M5 19l2-2', 'M17 7l2-2'],
  cable: ['M2 8h6c4 0 4 8 8 8h6', 'M2 12h4', 'M18 8h4'],
  link: ['M4 18l5-6 4 3 7-9', 'M4 21h16'],
  match: ['M2 12h5', 'M7 12a3 3 0 016 0', 'M13 12v5', 'M10 17h6', 'M13 12h9'],
  filter: ['M3 6h8c4 0 4 12 10 12', 'M3 20h18'],
  toroid: ['M12 5c4 0 8 3 8 7s-4 7-8 7-8-3-8-7 4-7 8-7z', 'M12 9c2 0 3 1.5 3 3s-1 3-3 3-3-1.500-3-3 1-3 3-3z'],
  battery: ['M3 7h15v10H3z', 'M18 10h3v4h-3z', 'M8 10l-1 4h3l-1 3'],
  yagi: ['M3 12h18', 'M6 6v12', 'M11 8v8', 'M15 9v6', 'M19 10v4'],
  book: ['M5 3h13v18H5z', 'M5 3v18', 'M9 8h6', 'M9 12h6'],
  clock: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M12 7v5l3 2'],
  letterA: ['M5 20L12 4l7 16', 'M8 14h8'],
}
</script>

<template>
  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="d in ICONS[name] ?? ICONS.wave" :key="d" :d="d" />
  </svg>
</template>
