<script setup lang="ts">
import ToolLayout from '../components/ToolLayout.vue'
import VoltageDividerCalculator from '../components/VoltageDividerCalculator.vue'
</script>
<template>
  <ToolLayout id="voltage-divider" :references="['Analog Devices, engineering glossary, “Voltage Divider”: two-resistor divider and output-loading limitations (reviewed 2026-10-26).', 'Ohm’s law and Thévenin equivalent resistance for an ideal voltage source.']">
    <div class="card"><VoltageDividerCalculator class="standalone-divider" /></div>
    <template #explain>
      <div class="formula">
        <math display="block">
          <mi>I</mi><mo>=</mo>
          <mfrac><msub><mi>V</mi><mi>in</mi></msub><mrow><msub><mi>R</mi><mn>1</mn></msub><mo>+</mo><msub><mi>R</mi><mn>2</mn></msub></mrow></mfrac>
        </math>
        <math display="block">
          <msub><mi>V</mi><mi>out</mi></msub><mo>=</mo><mi>I</mi><msub><mi>R</mi><mn>2</mn></msub>
        </math>
        <math display="block">
          <msub><mi>R</mi><mi>th</mi></msub><mo>=</mo>
          <mfrac><mrow><msub><mi>R</mi><mn>1</mn></msub><msub><mi>R</mi><mn>2</mn></msub></mrow><mrow><msub><mi>R</mi><mn>1</mn></msub><mo>+</mo><msub><mi>R</mi><mn>2</mn></msub></mrow></mfrac>
        </math>
      </div>
      <p>R<sub>1</sub> connects the input voltage V<sub>in</sub> to the output junction. R<sub>2</sub> connects the junction to ground. Both carry current I when the output is unloaded. V<sub>out</sub> is the voltage across R<sub>2</sub>.</p>
      <p>R<sub>th</sub> is the output source resistance with the ideal input voltage source shorted to ground. A connected load forms another divider with R<sub>th</sub> and reduces the output voltage.</p>
      <p>Equal nonzero resistors halve the input voltage. A zero-ohm R<sub>1</sub> puts the output at the input voltage. A zero-ohm R<sub>2</sub> puts the output at ground. Both resistors at zero would short the ideal source and are rejected. Wire and source resistance, tolerances, temperature and dissipation require separate consideration.</p>
    </template>
  </ToolLayout>
</template>
