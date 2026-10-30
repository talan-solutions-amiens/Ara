import { groupBy, mapValues, sortBy } from "lodash-es";

import rgaa from "../../criteres.json";
import { ReportStoreState } from "../../store";
import {
  AuditReport,
  CriteriumResultStatus,
  ReportCriteriumResult,
  ReportUserImpact
} from "../../types";

export type ReportError = {
  id: number;
  name?: string;
  order: number;
  url: string;
  topics: {
    topic: number;
    name?: string;
    errors: ReportCriteriumResult[];
  }[];
};

/** Criterium key used by the criteria filter, ex: "6.1" */
export function getCriteriumKey(result: { topic: number; criterium: number }) {
  return `${result.topic}.${result.criterium}`;
}

export function getReportErrors(
  report: ReportStoreState,
  quickWinFilter: boolean,
  userImpactFilters: Array<ReportUserImpact | null>,
  // Empty means no criteria filter
  criteriumFilters: string[] = [],
  hideDuplicatesFilter = false
): ReportError[] {
  const resultsGroupedByPage = {
    // include pages with no errors
    ...report.data?.context.samples.reduce<Record<string, []>>((acc, val) => {
      acc[val.id] = [];
      return acc;
    }, {}),

    ...groupBy(
      report.data?.results
        .filter((r) => {
          return r.status === CriteriumResultStatus.NOT_COMPLIANT;
        })
        .filter((r) => {
          return (
            criteriumFilters.length === 0 ||
            criteriumFilters.includes(getCriteriumKey(r))
          );
        })
        .map((r) => ({
          ...r,
          notCompliantItems: r.notCompliantItems
            .filter(
              (item) => (!item.userImpact && userImpactFilters.includes(null)) ||
              (item.userImpact && userImpactFilters.includes(item.userImpact))
            ).filter((r) => {
              return quickWinFilter ? r.quickWin : r;
            }).filter((r) => !hideDuplicatesFilter || !r.potentialDuplicate)

        }))
        .filter((r) => r.notCompliantItems.length > 0),
      "pageId"
    )
  } as Record<number, AuditReport["results"]>;

  return sortBy(
    Object.entries(resultsGroupedByPage).map(([pageId, results]) => {
      return {
        id: Number(pageId),
        order: getPage(report, pageId).order,
        name: getPage(report, pageId).name,
        url: getPage(report, pageId).url,
        topics: sortBy(
          Object.values(
            mapValues(groupBy(results, "topic"), (results, topicNumber) => {
              return {
                topic: Number(topicNumber),
                name: getTopicName(Number(topicNumber)),
                errors: sortBy(results, "criterium"),
                errorsCount: results.flatMap(x => x.notCompliantItems).length
              };
            })
          ),
          "topic"
        )
      };
    }),
    (el) => el.order
  );
}

function getPage(report: ReportStoreState, pageId: number | string) {
  return report.data!.context.samples.find((p) => p.id === Number(pageId))!;
}

function getTopicName(topicNumber: number) {
  return rgaa.topics.find((t) => t.number === topicNumber)?.topic;
}
