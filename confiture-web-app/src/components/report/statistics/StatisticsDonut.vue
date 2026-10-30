<script setup lang="ts">
import { computed, useId } from "vue";

import { STATISTICS_PATTERNS, StatisticsSerie } from "./statisticsKinds";
import StatisticsLegend from "./StatisticsLegend.vue";

const props = defineProps<{
  title: string;
  series: StatisticsSerie[];
  centerLabel?: string;
}>();

const id = useId();

const total = computed(() => props.series.reduce((a, s) => a + s.value, 0));

// Circle of circumference 100: dash lengths are percentages
const arcs = computed(() => {
  let offset = 0;
  return props.series
    .filter((s) => s.value > 0)
    .map((s) => {
      const percent = (s.value / total.value) * 100;
      const arc = {
        ...s,
        dasharray: `${percent} ${100 - percent}`,
        dashoffset: 25 - offset
      };
      offset += percent;
      return arc;
    });
});

const description = computed(() =>
  props.series.map((s) => `${s.label} : ${s.value}`).join(", ")
);
</script>

<template>
  <figure class="statistics-donut fr-m-0">
    <svg
      viewBox="0 0 42 42"
      role="img"
      :aria-labelledby="`${id}-title ${id}-desc`"
    >
      <title :id="`${id}-title`">{{ title }}</title>
      <desc :id="`${id}-desc`">{{ description }}</desc>
      <defs>
        <pattern
          v-for="(pattern, kind) in STATISTICS_PATTERNS"
          :id="`${id}-${kind}`"
          :key="kind"
          patternUnits="userSpaceOnUse"
          width="1.6"
          height="1.6"
          :patternTransform="
            pattern.motif === 'stripes'
              ? 'rotate(45)'
              : pattern.motif === 'backstripes'
                ? 'rotate(-45)'
                : undefined
          "
        >
          <rect width="1.6" height="1.6" :style="{ fill: pattern.color }" />
          <rect
            v-if="pattern.motif === 'stripes' || pattern.motif === 'backstripes'"
            width="0.5"
            height="1.6"
            :style="{ fill: 'var(--statistics-motif)' }"
          />
          <circle
            v-if="pattern.motif === 'dots'"
            cx="0.8"
            cy="0.8"
            r="0.3"
            :style="{ fill: 'var(--statistics-motif)' }"
          />
          <path
            v-if="pattern.motif === 'cross'"
            d="M0 0.05H1.6M0.05 0V1.6"
            :style="{ stroke: 'var(--statistics-motif)' }"
            stroke-width="0.25"
          />
        </pattern>
      </defs>
      <circle
        cx="21"
        cy="21"
        r="15.9155"
        fill="none"
        stroke-width="7"
        :style="{ stroke: 'var(--background-contrast-grey)' }"
      />
      <circle
        v-for="arc in arcs"
        :key="arc.kind"
        cx="21"
        cy="21"
        r="15.9155"
        fill="none"
        stroke-width="7"
        :stroke="`url(#${id}-${arc.kind})`"
        :stroke-dasharray="arc.dasharray"
        :stroke-dashoffset="arc.dashoffset"
      />
      <text
        v-if="centerLabel"
        x="21"
        y="21"
        text-anchor="middle"
        dominant-baseline="central"
        class="statistics-donut__center"
      >
        {{ centerLabel }}
      </text>
    </svg>
    <figcaption>
      <StatisticsLegend :series="series" />
    </figcaption>
  </figure>
</template>

<style scoped>
.statistics-donut {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem 2rem;
}

.statistics-donut svg {
  width: 13rem;
  height: 13rem;
  flex-shrink: 0;
}

.statistics-donut__center {
  font-size: 6px;
  font-weight: 700;
  fill: var(--text-title-grey);
}
</style>
