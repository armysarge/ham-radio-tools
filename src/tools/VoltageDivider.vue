<script setup lang="ts">
import ToolLayout from '../components/ToolLayout.vue'
import VoltageDividerCalculator from '../components/VoltageDividerCalculator.vue'
</script>
<template>
  <ToolLayout id="voltage-divider" :references="['Analog Devices, engineering glossary, “Voltage Divider”: two-resistor divider and output-loading limitations (reviewed 2026-10-26).', 'Ohm’s law and Thévenin equivalent resistance for an ideal voltage source.']">
    <div class="card"><VoltageDividerCalculator class="standalone-divider" /></div>
    <template #explain>
      <p>R1 connects Vin to the output junction. R2 connects that junction to ground. Both carry the same current when the output is unloaded: I = Vin / (R1 + R2). The voltage across R2 is Vout = I × R2.</p>
      <p>The output source resistance is Rth = R1 × R2 / (R1 + R2), found by replacing the ideal input voltage source with a short to ground. A connected load forms another divider with Rth and reduces the output voltage.</p>
      <p>Equal nonzero resistors halve the input voltage. A zero-ohm R1 gives Vout = Vin; a zero-ohm R2 gives Vout = 0. Both resistors at zero would short the ideal source and are rejected. Wire and source resistance, tolerances, temperature and dissipation require separate consideration.</p>
    </template>
  </ToolLayout>
</template>
