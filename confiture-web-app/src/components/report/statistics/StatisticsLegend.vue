<script setup lang="ts">
import { StatisticsSerie } from "./statisticsKinds";

defineProps<{
  series: Array<Pick<StatisticsSerie, "label" | "kind"> & { value?: number }>;
}>();
</script>

<template>
  <ul class="statistics-legend">
    <li v-for="serie in series" :key="serie.kind">
      <span
        :class="`statistics-fill statistics-fill--${serie.kind}`"
        aria-hidden="true"
      />
      {{ serie.label }}<template v-if="serie.value !== undefined"> : {{ serie.value }}</template>
    </li>
  </ul>
</template>

<style>
/*
 * Colors and patterns of the statistics series, see statisticsKinds.ts.
 * Light theme: DSFR "main 525" tones (at least 3:1 against white, as required
 * for graphics) with a discreet motif. Dark theme: DSFR "flat" backgrounds.
 */
:root {
  --statistics-compliant: #27a658;
  --statistics-not-compliant: #f95c5e;
  --statistics-not-applicable: #929292;
  --statistics-not-tested: #518fff;
  --statistics-blocking: #f95c5e;
  --statistics-major: #fc5d00;
  --statistics-minor: #518fff;
  --statistics-unknown: #929292;
  --statistics-motif: rgb(255 255 255 / 45%);
}

:root[data-fr-theme="dark"] {
  --statistics-compliant: var(--background-flat-success);
  --statistics-not-compliant: var(--background-flat-error);
  --statistics-not-applicable: var(--background-flat-grey);
  --statistics-not-tested: var(--background-flat-info);
  --statistics-blocking: var(--background-flat-error);
  --statistics-major: var(--background-flat-warning);
  --statistics-minor: var(--background-flat-info);
  --statistics-unknown: var(--background-flat-grey);
  --statistics-motif: rgb(0 0 0 / 45%);
}

.statistics-fill--compliant {
  background: var(--statistics-compliant);
}

.statistics-fill--notCompliant {
  background: repeating-linear-gradient(
    45deg,
    var(--statistics-motif) 0 1.5px,
    var(--statistics-not-compliant) 1.5px 7px
  );
}

.statistics-fill--blocking {
  background: repeating-linear-gradient(45deg, var(--statistics-motif) 0 1.5px, var(--statistics-blocking) 1.5px 7px);
}

.statistics-fill--notApplicable {
  background:
    radial-gradient(var(--statistics-motif) 1.2px, transparent 1.6px) 0 0 / 6px 6px,
    var(--statistics-not-applicable);
}

.statistics-fill--minor {
  background:
    radial-gradient(var(--statistics-motif) 1.2px, transparent 1.6px) 0 0 / 6px 6px,
    var(--statistics-minor);
}

.statistics-fill--notTested {
  background:
    repeating-linear-gradient(0deg, var(--statistics-motif) 0 1px, transparent 1px 6px),
    repeating-linear-gradient(90deg, var(--statistics-motif) 0 1px, transparent 1px 6px), var(--statistics-not-tested);
}

.statistics-fill--major {
  background: repeating-linear-gradient(-45deg, var(--statistics-motif) 0 1.5px, var(--statistics-major) 1.5px 7px);
}

.statistics-fill--unknown {
  background: var(--statistics-unknown);
}
</style>

<style scoped>
.statistics-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.statistics-legend li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
}

.statistics-legend .statistics-fill {
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--border-default-grey);
}
</style>
