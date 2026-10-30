<script setup lang="ts">
/**
 * Header colors use the DSFR "flat" backgrounds with the inverted text color,
 * a pair designed to stay readable in light and dark themes.
 */
export type StatisticsHeaderColor =
  | "blue"
  | "info"
  | "success"
  | "error"
  | "grey";

defineProps<{
  caption: string;
  headers: string[];
  rows: string[][];
  headerColors?: Array<StatisticsHeaderColor | undefined>;
  /** Text color of the cells of each column, same tones as the headers */
  cellColors?: Array<StatisticsHeaderColor | undefined>;
}>();
</script>

<template>
  <div class="fr-table fr-table--no-caption fr-m-0">
    <div class="fr-table__wrapper">
      <div class="fr-table__container">
        <div class="fr-table__content">
          <table class="fr-cell--multiline">
            <caption>{{ caption }}</caption>
            <thead>
              <tr>
                <th
                  v-for="(header, i) in headers"
                  :key="header"
                  scope="col"
                  :class="
                    headerColors?.[i] && `statistics-th statistics-th--${headerColors[i]}`
                  "
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in rows" :key="i">
                <td
                  v-for="(cell, j) in row"
                  :key="j"
                  :class="cellColors?.[j] && `statistics-td--${cellColors[j]}`"
                >
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fr-table th.statistics-th {
  color: var(--text-inverted-grey);
}

.fr-table th.statistics-th--blue {
  background-color: var(--background-flat-blue-france);
}

.fr-table th.statistics-th--info {
  background-color: var(--background-flat-info);
}

.fr-table th.statistics-th--success {
  background-color: var(--background-flat-success);
}

.fr-table th.statistics-th--error {
  background-color: var(--background-flat-error);
}

.fr-table th.statistics-th--grey {
  background-color: var(--background-flat-grey);
}

.fr-table td.statistics-td--info {
  color: var(--text-default-info);
}

.fr-table td.statistics-td--success {
  color: var(--text-default-success);
}

.fr-table td.statistics-td--error {
  color: var(--text-default-error);
}

.fr-table td.statistics-td--grey {
  color: var(--text-mention-grey);
}
</style>
