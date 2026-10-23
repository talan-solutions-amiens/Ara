<script setup lang="ts">
import { computed } from "vue";

import { StatisticsSerie } from "./statisticsKinds";
import StatisticsLegend from "./StatisticsLegend.vue";

/**
 * Horizontal 100% stacked bars. Hidden from assistive technologies: the
 * same data is given by the table displayed just before.
 */
const props = defineProps<{
  rows: Array<{ label: string; series: StatisticsSerie[] }>;
}>();

// Same series on every row: the legend has no values
const legendSeries = computed(() =>
  (props.rows[0]?.series ?? []).map(({ label, kind }) => ({ label, kind }))
);

function percent(serie: StatisticsSerie, series: StatisticsSerie[]) {
  const total = series.reduce((a, s) => a + s.value, 0);
  return total ? (serie.value / total) * 100 : 0;
}
</script>

<template>
  <figure class="statistics-bars fr-m-0">
    <div class="statistics-bars__grid" aria-hidden="true">
      <div v-for="row in rows" :key="row.label" class="statistics-bars__row">
        <span class="statistics-bars__label">{{ row.label }}</span>
        <span class="statistics-bars__bar">
          <span
            v-for="serie in row.series.filter((s) => s.value > 0)"
            :key="serie.kind"
            :class="`statistics-fill statistics-fill--${serie.kind}`"
            :style="{ width: `${percent(serie, row.series)}%` }"
            :title="`${serie.label} : ${Math.round(percent(serie, row.series))} %`"
          />
        </span>
      </div>
    </div>
    <figcaption class="fr-mt-2w">
      <StatisticsLegend :series="legendSeries" />
    </figcaption>
  </figure>
</template>

<style scoped>
/* One grid for all rows: the labels column fits the longest label */
.statistics-bars__grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
}

.statistics-bars__row {
  display: contents;
}

.statistics-bars figcaption :deep(.statistics-legend) {
  justify-content: center;
}

.statistics-bars__label {
  font-size: 0.875rem;
  line-height: 1.5rem;
  text-align: right;
  white-space: nowrap;
}

.statistics-bars__bar {
  display: flex;
  height: 1.5rem;
  background: var(--background-contrast-grey);
}

.statistics-bars__bar > span {
  height: 100%;
}

@media (width < 48rem) {
  .statistics-bars__grid {
    grid-template-columns: 1fr;
    row-gap: 0.25rem;
  }

  .statistics-bars__label {
    text-align: left;
    white-space: normal;
  }
}
</style>
