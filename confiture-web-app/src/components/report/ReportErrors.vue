<script setup lang="ts">
import { sum } from "lodash-es";

import { computed, nextTick, ref, useId, useTemplateRef } from "vue";
import rgaa from "../../criteres.json";
import { StaticTabLabel, TabSlug } from "../../enums";
import { useReportStore } from "../../store";
import {
  CriterionResultUserImpact,
  CriteriumResultStatus,
  ReportUserImpact
} from "../../types";
import { pluralize } from "../../utils";
import { getCriteriumKey, getReportErrors } from "./getReportErrors";
import ReportCriteria from "./ReportCriteria.vue";
import ReportErrorCriterium from "./ReportErrorCriterium.vue";

const report = useReportStore();

// Filters
const defaultUserImpactFillters = [
  CriterionResultUserImpact.MINOR,
  CriterionResultUserImpact.MAJOR,
  CriterionResultUserImpact.BLOCKING,
  null
];

const userImpactFilters = ref<Array<ReportUserImpact | null>>(
  defaultUserImpactFillters
);

const showResetFiltersButton = computed(
  () =>
    userImpactFilters.value.length === defaultUserImpactFillters.length &&
    !quickWinFilter.value &&
    criteriumFilters.value.length === 0
);

const quickWinFilter = ref(false);

const criteriumFilters = ref<string[]>([]);
const criteriumFilterId = useId();

async function resetFilters() {
  userImpactFilters.value = defaultUserImpactFillters;
  quickWinFilter.value = false;
  criteriumFilters.value = [];
  await nextTick();
  filterTitleRef.value?.focus();
}

const filterTitleRef = useTemplateRef("filterTitleRef");

const minorUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT
    )
      .flatMap(x => x.notCompliantItems)
      .filter(x => x.userImpact === CriterionResultUserImpact.MINOR)
      .length
);

const majorUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT
    )
      .flatMap(x => x.notCompliantItems)
      .filter(x => x.userImpact === CriterionResultUserImpact.MAJOR)
      .length
);

const blockingUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT
    )
      .flatMap(x => x.notCompliantItems)
      .filter(x => x.userImpact === CriterionResultUserImpact.BLOCKING)
      .length
);

const unknownUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT
    )
      .flatMap(x => x.notCompliantItems)
      .filter(x => x.userImpact === null)
      .length
);

// Criteria filter options: criteria with at least one error displayed by the
// other filters, plus the selected ones so they can always be unchecked
const criteriumFilterOptions = computed(() => {
  type CriteriumOption = { topic: number; criterium: number; count: number };
  const counts = new Map<string, CriteriumOption>();

  getReportErrors(report, quickWinFilter.value, userImpactFilters.value)
    .flatMap((page) => page.topics)
    .flatMap((topic) => topic.errors)
    .forEach((error) => {
      const key = getCriteriumKey(error);
      const option = counts.get(key) ?? {
        topic: error.topic,
        criterium: error.criterium,
        count: 0
      };
      option.count += error.notCompliantItems.length;
      counts.set(key, option);
    });

  criteriumFilters.value.forEach((key) => {
    if (!counts.has(key)) {
      const [topic, criterium] = key.split(".").map(Number);
      counts.set(key, { topic, criterium, count: 0 });
    }
  });

  return [...counts.entries()]
    .map(([key, option]) => ({
      key,
      ...option,
      title: getCriteriumTitle(option.topic, option.criterium)
    }))
    .sort((a, b) => a.topic - b.topic || a.criterium - b.criterium);
});

function getCriteriumTitle(topicNumber: number, criteriumNumber: number) {
  // FIXME: "any everywhere" : The criteria properties of each topic do not have the same signature. See: https://github.com/microsoft/TypeScript/issues/33591#issuecomment-786443978
  const title: string | undefined = (rgaa.topics as any)
    .find((t: any) => t.number === topicNumber)
    ?.criteria.find((c: any) => c.criterium.number === criteriumNumber)
    ?.criterium.title;

  // Remove Markdown links, ex: "Chaque [lien](#lien)" => "Chaque lien"
  return title?.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") ?? "";
}

// Errors

const allErrors = computed(() => {
  return getReportErrors(
    report,
    quickWinFilter.value,
    userImpactFilters.value,
    criteriumFilters.value
  );
});

const transverseErrors = computed(() => {
  return allErrors.value[0];
});

const pagesErrors = computed(() => {
  return allErrors.value.slice(1);
});

const errorsCount = computed(() => {
  return sum(
    allErrors.value
      .map((page: any) => page.topics.map((topic: any) => topic.errorsCount))
      .flat(2)
  );
});

const notCompliantItemsIndexes = computed(() => {
  return allErrors.value
    .flatMap((page: any) => page.topics
      .filter((topic: any) => topic.errorsCount > 0))
    .flatMap((topic) => topic.errors)
    .flatMap((error) => error.notCompliantItems)
    .map((notCompliantItem, index) => {
      return {
        index: index + 1,
        id: notCompliantItem.id
      };
    });
});
</script>

<template>
  <ReportCriteria
    v-if="report.data"
    :count="`${errorsCount} ${pluralize(
      'non-conformité',
      'non-conformités',
      errorsCount
    )}`"
    :pages-data="pagesErrors"
    :transverse-data="transverseErrors"
    :show-filters="true"
  >
    <template #filter>
      <div ref="filterTitleRef" tabindex="-1" class="fr-text--bold fr-text--xl fr-mb-2w filter-title">Filtres</div>
      <button
        v-if="!showResetFiltersButton"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-refresh-line fr-btn--icon-right fr-mb-3w"
        @click="resetFilters"
      >
        Réinitialiser les filtres
      </button>
      <div class="fr-form-group">
        <fieldset class="fr-fieldset">
          <legend
            id="checkboxes-hint-element-legend"
            class="fr-fieldset__legend fr-text--regular fr-text--bold"
          >
            Impact de l’erreur
          </legend>
          <div class="fr-fieldset__content">
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-blocking"
                v-model="userImpactFilters"
                :value="CriterionResultUserImpact.BLOCKING"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-blocking">
                Bloquant ({{ blockingUserImpactErrorCount }})
                <span class="fr-hint-text">Empêche l’utilisation</span>
              </label>
            </div>
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-major"
                v-model="userImpactFilters"
                :value="CriterionResultUserImpact.MAJOR"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-major">
                Majeur ({{ majorUserImpactErrorCount }})
                <span class="fr-hint-text">Complexifie l’utilisation</span>
              </label>
            </div>
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-minor"
                v-model="userImpactFilters"
                :value="CriterionResultUserImpact.MINOR"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-minor">
                Mineur ({{ minorUserImpactErrorCount }})
                <span class="fr-hint-text">Gêne l’utilisation</span>
              </label>
            </div>
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-unknown"
                v-model="userImpactFilters"
                :value="null"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-unknown">
                Impact non renseigné ({{ unknownUserImpactErrorCount }})
              </label>
            </div>
          </div>
        </fieldset>
      </div>
      <div class="fr-form-group">
        <fieldset class="fr-fieldset">
          <legend class="fr-fieldset__legend fr-text--regular fr-text--bold">
            Correction de l’erreur
          </legend>
          <div class="fr-fieldset__content">
            <div class="fr-checkbox-group">
              <input
                id="quick-win-filter"
                v-model="quickWinFilter"
                type="checkbox"
              />
              <label class="fr-label" for="quick-win-filter">
                Uniquement les erreurs faciles à corriger
              </label>
            </div>
          </div>
        </fieldset>
      </div>
      <fieldset class="fr-fieldset fr-mb-3w">
        <legend class="fr-fieldset__legend fr-text--regular fr-text--bold">
          Critères à afficher
        </legend>
        <section class="fr-accordion fr-fieldset__content">
          <div class="fr-accordion__title">
            <button
              class="fr-accordion__btn"
              aria-expanded="false"
              :aria-controls="criteriumFilterId"
            >
              Critère
              <template v-if="criteriumFilters.length">
                ({{ criteriumFilters.length }}
                {{ pluralize("sélectionné", "sélectionnés", criteriumFilters.length) }})
              </template>
            </button>
          </div>
          <div :id="criteriumFilterId" class="fr-collapse">
            <div>
              <p v-if="!criteriumFilterOptions.length" class="fr-mb-0">
                Aucun critère avec une non-conformité affichée.
              </p>
              <div
                v-for="option in criteriumFilterOptions"
                :key="option.key"
                class="fr-checkbox-group"
              >
                <input
                  :id="`criterium-filter-${option.topic}-${option.criterium}`"
                  v-model="criteriumFilters"
                  :value="option.key"
                  type="checkbox"
                />
                <label
                  class="fr-label"
                  :for="`criterium-filter-${option.topic}-${option.criterium}`"
                >
                  {{ option.key }} ({{ option.count }}
                  {{ pluralize("non-conformité", "non-conformités", option.count) }})
                  <span class="fr-hint-text">{{ option.title }}</span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </fieldset>
    </template>

    <template #transverse-data>
      <h2 class="fr-sr-only">Détails des non-conformités</h2>
      <template v-if="transverseErrors.topics.length">
        <section class="fr-mb-8w">
          <p
            :id="TabSlug.AUDIT_COMMON_ELEMENTS_SLUG"
            :class="`fr-h3 ${report.data.transverseElements.length ? 'fr-mb-1w' : 'fr-mb-4w'} page-title`"
          >
            {{ StaticTabLabel.AUDIT_COMMON_ELEMENTS_TAB_LABEL }}
          </p>
          <ul
            v-if="report.data.transverseElements.length"
            class="fr-tags-group fr-mb-4w"
          >
            <li v-for="(tag, i) in report.data.transverseElements" :key="i">
              <p class="fr-tag">{{ tag }}</p>
            </li>
          </ul>

          <div v-for="topic in transverseErrors.topics" :key="topic.topic">
            <template v-for="(error, j) in topic.errors" :key="j">
              <ReportErrorCriterium
                :error="error"
                :indexes="notCompliantItemsIndexes"
              />
            </template>
          </div>
        </section>
      </template>
    </template>

    <template #pages-data>
      <section
        v-for="(page, i) in pagesErrors"
        :key="page.id"
        :class="{ 'fr-mb-8w': i !== pagesErrors.length - 1 }"
      >
        <p :id="`page_${page.id}`" class="fr-h3 fr-mb-1w page-title">
          {{ page.name }}
        </p>
        <a
          :href="page.url"
          class="fr-link fr-mb-4w page-url"
          target="_blank"
        >
          {{ page.url }} <span class="fr-sr-only">(nouvelle fenêtre)</span>
        </a>

        <p v-if="page.topics.length === 0" class="fr-mt-4w">
          Aucune erreur d'accessibilité relevée sur cette page.
        </p>

        <div
          v-for="(topic, j) in page.topics"
          :key="topic.topic"
          :class="{ 'fr-mt-4w': j === 0 }"
        >
          <template v-for="(error, k) in topic.errors" :key="k">
            <ReportErrorCriterium
              :error="error"
              :indexes="notCompliantItemsIndexes"
            />
          </template>
        </div>
      </section>
    </template>
  </ReportCriteria>
</template>
