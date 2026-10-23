<script setup lang="ts">
import { computed } from "vue";

import { useReportStore } from "../../store";
import {
  AuditStatus,
  CriterionResultUserImpact,
  CriteriumResultStatus
} from "../../types";
import { getAuditStatus, pluralize } from "../../utils";
import { getReportStatistics, StatisticsCounts } from "./getReportStatistics";
import StatisticsBars from "./statistics/StatisticsBars.vue";
import StatisticsDonut from "./statistics/StatisticsDonut.vue";
import { StatisticsSerie } from "./statistics/statisticsKinds";
import StatisticsTable from "./statistics/StatisticsTable.vue";

const report = useReportStore();

const statistics = computed(() =>
  report.data ? getReportStatistics(report.data) : null
);

const auditInProgress = computed(
  () => !!report.data && getAuditStatus(report.data) === AuditStatus.IN_PROGRESS
);

const criteriaCount = computed(() =>
  Object.values(statistics.value!.global.counts).reduce((a, b) => a + b, 0)
);

// Compliance level wording of the RGAA
const complianceLevel = computed(() => {
  const rate = statistics.value!.global.complianceRate ?? 0;
  if (rate === 100) {
    return "totalement conforme";
  }
  return rate >= 50 ? "partiellement conforme" : "non conforme";
});

// Legend of the "% C" cell colors, see rateLevel()
const RATE_LEVELS = [
  { level: "low", label: "% C inférieur à 50 %" },
  { level: "medium", label: "% C de 50 % à 99 %" },
  { level: "high", label: "% C égal à 100 %" }
];

// Level of a page compliance rate, for the "% C" cell color
// Based on the displayed (rounded) rate so the color matches the figure
function rateLevel(rate: number | null) {
  if (rate === null) {
    return "none";
  }
  const rounded = Math.round(rate);
  if (rounded < 50) {
    return "low";
  }
  return rounded < 100 ? "medium" : "high";
}

function formatRate(rate: number | null) {
  return rate === null ? "N/A" : `${Math.round(rate)} %`;
}

function percentOf(count: number, total: number) {
  return total ? `${Math.round((count / total) * 100)} %` : "N/A";
}

function statusSeries(counts: StatisticsCounts): StatisticsSerie[] {
  return [
    {
      label: "Non testé",
      value: counts[CriteriumResultStatus.NOT_TESTED],
      kind: "notTested"
    },
    {
      label: "Conforme",
      value: counts[CriteriumResultStatus.COMPLIANT],
      kind: "compliant"
    },
    {
      label: "Non conforme",
      value: counts[CriteriumResultStatus.NOT_COMPLIANT],
      kind: "notCompliant"
    },
    {
      label: "Non applicable",
      value: counts[CriteriumResultStatus.NOT_APPLICABLE],
      kind: "notApplicable"
    }
  ];
}

// 1. Global
const globalSeries = computed((): StatisticsSerie[] => [
  {
    label: "Critères conformes",
    value: statistics.value!.global.counts[CriteriumResultStatus.COMPLIANT],
    kind: "compliant"
  },
  {
    label: "Critères non conformes",
    value: statistics.value!.global.counts[CriteriumResultStatus.NOT_COMPLIANT],
    kind: "notCompliant"
  }
]);

const topicsRows = computed(() =>
  statistics.value!.global.topics.map((t) => [
    `${t.topic}. ${t.name}`,
    percentOf(t.counts[CriteriumResultStatus.NOT_TESTED], t.total),
    percentOf(t.counts[CriteriumResultStatus.COMPLIANT], t.total),
    percentOf(t.counts[CriteriumResultStatus.NOT_COMPLIANT], t.total),
    percentOf(t.counts[CriteriumResultStatus.NOT_APPLICABLE], t.total)
  ])
);

const topicsBars = computed(() =>
  statistics.value!.global.topics.map((t) => ({
    label: `${t.topic}. ${t.name}`,
    series: statusSeries(t.counts)
  }))
);

// 3. Quick wins
const quickWinsRows = computed(() =>
  statistics.value!.quickWins.map((q) => [
    `${q.topic}.${q.criterium} ${q.title}`,
    `${q.errorsCount}`,
    `${q.quickWinCount}`,
    `${q.pagesCount}`
  ])
);

// 4. User impacts
const userImpactsSeries = computed((): StatisticsSerie[] => {
  const impacts = statistics.value!.userImpacts;
  return [
    {
      label: "Bloquant",
      value: impacts[CriterionResultUserImpact.BLOCKING],
      kind: "blocking" as const
    },
    {
      label: "Majeur",
      value: impacts[CriterionResultUserImpact.MAJOR],
      kind: "major" as const
    },
    {
      label: "Mineur",
      value: impacts[CriterionResultUserImpact.MINOR],
      kind: "minor" as const
    },
    { label: "Non renseigné", value: impacts.UNKNOWN, kind: "unknown" as const }
  ].filter((s) => s.kind !== "unknown" || s.value > 0);
});

const errorsCount = computed(() =>
  userImpactsSeries.value.reduce((a, s) => a + s.value, 0)
);
</script>

<template>
  <div v-if="statistics" class="report-statistics">
    <h2>Statistiques</h2>

    <div v-if="auditInProgress" class="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
      <p>Audit en cours : ces statistiques sont provisoires.</p>
    </div>

    <!-- 1. Global -->
    <section class="fr-mb-8w">
      <h3 class="fr-h4">Résultat global</h3>
      <p class="fr-text--lg">
        <template v-if="statistics.global.complianceRate !== null">
          Le site est <strong>{{ complianceLevel }}</strong>. Le niveau global
          de conformité du site relevé est de
          <strong>{{ formatRate(statistics.global.complianceRate) }}</strong>
          de conformité sur l’ensemble des pages auditées.
        </template>
        <template v-else>
          Aucun critère n’est encore conforme ou non conforme : le niveau de
          conformité ne peut pas être calculé.
        </template>
      </p>

      <div class="statistics-global">
        <div>
          <p class="fr-text--bold fr-mb-2w">Conformité au RGAA 4</p>
          <StatisticsDonut
            title="Conformité au RGAA 4"
            :series="globalSeries"
            :center-label="formatRate(statistics.global.complianceRate)"
          />
        </div>
        <div class="statistics-note">
          <p class="fr-text--bold">Note sur le calcul de conformité :</p>
          <p>
            La conformité globale est calculée de la manière suivante :
            <strong>C / (C + NC)</strong>
          </p>
          <p>
            <em>« C » est le nombre de critères conformes.</em><br />
            <em>« NC » le nombre de critères non conformes.</em>
          </p>
          <p>Pour chacun des {{ criteriaCount }} critères on vérifie :</p>
          <ul>
            <li>
              s’il est <strong>non conforme sur au moins une page</strong>
              alors il est considéré non conforme pour le résultat global du
              site ;
            </li>
            <li>
              sinon, si <strong>au moins une page n’est pas évaluée</strong>,
              il est considéré comme non testé ;
            </li>
            <li>
              sinon, s’il est
              <strong>au moins une fois conforme et jamais non conforme</strong>
              alors il est considéré comme conforme pour le résultat global du
              site.
            </li>
          </ul>
          <p class="fr-mb-0">
            Les critères non applicables sur l’ensemble du site sont ignorés
            dans le calcul de conformité global du site.
          </p>
        </div>
      </div>

      <h4 class="fr-h6 fr-mt-6w">Résultats par thématique</h4>
      <StatisticsTable
        caption="Résultats par thématique"
        :headers="[
          'Thématique',
          '% non testé',
          '% conforme',
          '% non conforme',
          '% non applicable'
        ]"
        :header-colors="['none', 'info', 'success', 'error', 'grey']"
        :cell-colors="[undefined, 'info', 'success', 'error', 'grey']"
        :rows="topicsRows"
      />
      <div class="fr-mt-4w">
        <StatisticsBars :rows="topicsBars" />
      </div>
    </section>

    <!-- 2. Pages -->
    <section class="fr-mb-8w">
      <h3 class="fr-h4">Statistiques par page</h3>
      <p class="statistics-rule">
        Pour chaque page, les éléments transverses sont pris en compte : un
        critère est non conforme s’il l’est sur la page ou sur les éléments
        transverses, sinon non testé si l’un des deux n’est pas évalué, sinon
        conforme s’il l’est sur l’un des deux, sinon non applicable.
        % C = C / (C + NC).
      </p>

      <div class="fr-table fr-table--no-caption fr-m-0 statistics-pages">
        <div class="fr-table__wrapper">
          <div class="fr-table__container">
            <div class="fr-table__content">
              <table class="fr-cell--multiline">
                <caption>Statistiques par page</caption>
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col" class="statistics-pages__nt">
                      <abbr title="Non testé">NT</abbr>
                    </th>
                    <th scope="col" class="statistics-pages__c">
                      <abbr title="Conforme">C</abbr>
                    </th>
                    <th scope="col" class="statistics-pages__nc">
                      <abbr title="Non conforme">NC</abbr>
                    </th>
                    <th scope="col" class="statistics-pages__na">
                      <abbr title="Non applicable">NA</abbr>
                    </th>
                    <th scope="col">% C</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="page in statistics.pages.pages" :key="page.id">
                    <td>{{ page.name }}</td>
                    <td class="statistics-pages__nt">
                      {{ page.counts[CriteriumResultStatus.NOT_TESTED] }}
                    </td>
                    <td class="statistics-pages__c">
                      {{ page.counts[CriteriumResultStatus.COMPLIANT] }}
                    </td>
                    <td class="statistics-pages__nc">
                      {{ page.counts[CriteriumResultStatus.NOT_COMPLIANT] }}
                    </td>
                    <td class="statistics-pages__na">
                      {{ page.counts[CriteriumResultStatus.NOT_APPLICABLE] }}
                    </td>
                    <td
                      :class="`statistics-pages__rate statistics-pages__rate--${rateLevel(page.complianceRate)}`"
                    >
                      {{ formatRate(page.complianceRate) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ul class="statistics-rate-legend fr-mt-2w">
        <li v-for="level in RATE_LEVELS" :key="level.level">
          <span
            :class="`statistics-rate-legend__swatch statistics-pages__rate--${level.level}`"
            aria-hidden="true"
          />
          {{ level.label }}
        </li>
      </ul>

      <ul class="statistics-key-figures fr-mt-4w">
        <li>
          <span class="statistics-key-figures__value">
            {{ formatRate(statistics.pages.min) }}
          </span>
          Conformité min
        </li>
        <li>
          <span class="statistics-key-figures__value">
            {{ formatRate(statistics.pages.average) }}
          </span>
          Conformité moyenne
        </li>
        <li>
          <span class="statistics-key-figures__value">
            {{ formatRate(statistics.pages.max) }}
          </span>
          Conformité max
        </li>
      </ul>
    </section>

    <!-- 3. Quick wins -->
    <section class="fr-mb-8w">
      <h3 class="fr-h4">Quick wins</h3>
      <p class="statistics-rule">
        Critères avec au moins une erreur. D’abord ceux dont toutes les erreurs
        sont faciles à corriger, puis les autres, par nombre d’erreurs
        croissant.
      </p>

      <template v-if="quickWinsRows.length">
        <StatisticsTable
          caption="Quick wins"
          :headers="[
            'Critère',
            'Nb erreurs',
            'Nb facile à corriger',
            'Nb pages impactées'
          ]"
          :rows="quickWinsRows"
        />
        <p class="fr-mt-2w">
          Remarque : L’ordre proposé reste à challenger vis-à-vis de la
          complexité des erreurs identifiées.
        </p>
      </template>
      <p v-else>Aucune erreur relevée.</p>
    </section>

    <!-- 4. User impacts -->
    <section>
      <h3 class="fr-h4">Impacts sur l’usager</h3>
      <p class="statistics-rule">
        Répartition des {{ errorsCount }}
        {{ pluralize("erreur", "erreurs", errorsCount) }} selon le champ
        « Impact sur l’usager ».
      </p>

      <StatisticsDonut
        v-if="errorsCount"
        title="Impacts sur l’usager des erreurs"
        :series="userImpactsSeries"
      />
      <p v-else>Aucune erreur relevée.</p>
    </section>
  </div>
</template>

<style scoped>
.statistics-global {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.statistics-note {
  padding: 1.5rem;
  background: var(--background-alt-grey);
}

.statistics-pages .statistics-pages__c {
  color: var(--text-default-success);
}

.statistics-pages .statistics-pages__nc {
  color: var(--text-default-error);
}

.statistics-pages .statistics-pages__nt {
  color: var(--text-default-info);
}

.statistics-pages .statistics-pages__na {
  color: var(--text-mention-grey);
}

.statistics-pages th.statistics-pages__c,
.statistics-pages th.statistics-pages__nc,
.statistics-pages th.statistics-pages__nt,
.statistics-pages th.statistics-pages__na {
  color: var(--text-inverted-grey);
}

.statistics-pages th.statistics-pages__c {
  background-color: var(--background-flat-success);
}

.statistics-pages th.statistics-pages__nc {
  background-color: var(--background-flat-error);
}

.statistics-pages th.statistics-pages__nt {
  background-color: var(--background-flat-info);
}

.statistics-pages th.statistics-pages__na {
  background-color: var(--background-flat-grey);
}

.statistics-pages abbr {
  text-decoration: none;
}

/* Compliance rate levels, DSFR background/text pairs readable in both themes */
.statistics-pages__rate {
  font-weight: 700;
}

.statistics-rate-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.statistics-rate-legend li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
}

.statistics-rate-legend__swatch {
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--border-default-grey);
}

.fr-table td.statistics-pages__rate--low,
.statistics-rate-legend__swatch.statistics-pages__rate--low {
  background-color: var(--background-contrast-error);
}

.fr-table td.statistics-pages__rate--medium,
.statistics-rate-legend__swatch.statistics-pages__rate--medium {
  background-color: var(--background-contrast-yellow-tournesol);
}

.fr-table td.statistics-pages__rate--high,
.statistics-rate-legend__swatch.statistics-pages__rate--high {
  /* Same green as the "Critères conformes" card of the results tab */
  color: var(--text-default-success);
  background-color: var(--background-contrast-green-emeraude);
}

@media (width < 62rem) {
  .statistics-global {
    grid-template-columns: 1fr;
  }
}

.statistics-rule {
  color: var(--text-mention-grey);
}

.statistics-key-figures {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.statistics-key-figures li {
  display: flex;
  flex-direction: column;
  min-width: 10rem;
  padding: 1rem 1.5rem;
  border: 1px solid var(--border-default-grey);
}

.statistics-key-figures__value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-title-blue-france);
}
</style>
