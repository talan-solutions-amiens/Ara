import { sortBy } from "lodash-es";

import rgaa from "../../criteres.json";
import { CRITERIA_BY_AUDIT_TYPE } from "../../criteria";
import {
  AuditReport,
  AuditType,
  CriterionResultUserImpact,
  CriteriumResultStatus
} from "../../types";

/**
 * Statistics of the "Statistiques" report tab (ticket ARA-7).
 * Everything is computed from the report results, so a criterion without any
 * result on a page counts as "not tested" on that page.
 */

export type StatisticsCounts = Record<CriteriumResultStatus, number>;

export interface TopicStatistics {
  topic: number;
  name: string;
  total: number;
  counts: StatisticsCounts;
}

export interface PageStatistics {
  id: number;
  name: string;
  counts: StatisticsCounts;
  /** C / (C + NC) in percent, null when the page has no C nor NC criterion */
  complianceRate: number | null;
}

export interface QuickWinStatistics {
  topic: number;
  criterium: number;
  title: string;
  errorsCount: number;
  quickWinCount: number;
  pagesCount: number;
}

export interface ReportStatistics {
  global: {
    counts: StatisticsCounts;
    /** C / (C + NC) in percent, null when no criterion is C nor NC */
    complianceRate: number | null;
    topics: TopicStatistics[];
  };
  pages: {
    pages: PageStatistics[];
    average: number | null;
    max: number | null;
    min: number | null;
  };
  quickWins: QuickWinStatistics[];
  userImpacts: Record<CriterionResultUserImpact | "UNKNOWN", number>;
}

function emptyCounts(): StatisticsCounts {
  return {
    [CriteriumResultStatus.NOT_TESTED]: 0,
    [CriteriumResultStatus.COMPLIANT]: 0,
    [CriteriumResultStatus.NOT_COMPLIANT]: 0,
    [CriteriumResultStatus.NOT_APPLICABLE]: 0
  };
}

/**
 * Combine the statuses of a criterion on several pages:
 * NC if NC at least once, else NT if not evaluated at least once,
 * else C if C at least once, else NA.
 */
export function combineStatuses(
  statuses: Array<CriteriumResultStatus | undefined>
): CriteriumResultStatus {
  if (statuses.includes(CriteriumResultStatus.NOT_COMPLIANT)) {
    return CriteriumResultStatus.NOT_COMPLIANT;
  }
  if (
    statuses.some((s) => s === undefined || s === CriteriumResultStatus.NOT_TESTED)
  ) {
    return CriteriumResultStatus.NOT_TESTED;
  }
  if (statuses.includes(CriteriumResultStatus.COMPLIANT)) {
    return CriteriumResultStatus.COMPLIANT;
  }
  return CriteriumResultStatus.NOT_APPLICABLE;
}

export function getComplianceRate(counts: StatisticsCounts): number | null {
  const compliant = counts[CriteriumResultStatus.COMPLIANT];
  const notCompliant = counts[CriteriumResultStatus.NOT_COMPLIANT];
  if (compliant + notCompliant === 0) {
    return null;
  }
  return (compliant / (compliant + notCompliant)) * 100;
}

/** Plain criterion title, without the RGAA glossary Markdown links */
export function getCriteriumPlainTitle(topic: number, criterium: number) {
  // FIXME: "any everywhere" : The criteria properties of each topic do not have the same signature. See: https://github.com/microsoft/TypeScript/issues/33591#issuecomment-786443978
  const title: string | undefined = (rgaa.topics as any)
    .find((t: any) => t.number === topic)
    ?.criteria.find((c: any) => c.criterium.number === criterium)
    ?.criterium.title;

  // ex: "Chaque [lien](#lien)" => "Chaque lien"
  return title?.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") ?? "";
}

export function getReportStatistics(report: AuditReport): ReportStatistics {
  const criteria = CRITERIA_BY_AUDIT_TYPE[report.auditType as AuditType];

  // The transverse elements page always comes first (lowest order)
  const [transversePage, ...pages] = sortBy(report.context.samples, "order");
  const allPages = [transversePage, ...pages];

  const resultsByKey = new Map(
    report.results.map((r) => [`${r.pageId}_${r.topic}_${r.criterium}`, r])
  );
  const getResult = (pageId: number, topic: number, criterium: number) =>
    resultsByKey.get(`${pageId}_${topic}_${criterium}`);

  // 1. Global statistics
  const globalCounts = emptyCounts();
  const topicsMap = new Map<number, TopicStatistics>();

  criteria.forEach(({ topic, criterium }) => {
    const status = combineStatuses(
      allPages.map((p) => getResult(p.id, topic, criterium)?.status)
    );
    globalCounts[status]++;

    const topicStatistics = topicsMap.get(topic) ?? {
      topic,
      name: rgaa.topics.find((t) => t.number === topic)?.topic ?? "",
      total: 0,
      counts: emptyCounts()
    };
    topicStatistics.total++;
    topicStatistics.counts[status]++;
    topicsMap.set(topic, topicStatistics);
  });

  // 2. Statistics per page, the transverse elements being part of each page
  const pagesStatistics: PageStatistics[] = pages.map((page) => {
    const counts = emptyCounts();
    criteria.forEach(({ topic, criterium }) => {
      counts[
        combineStatuses([
          getResult(page.id, topic, criterium)?.status,
          getResult(transversePage.id, topic, criterium)?.status
        ])
      ]++;
    });
    return {
      id: page.id,
      name: page.name,
      counts,
      complianceRate: getComplianceRate(counts)
    };
  });

  const rates = pagesStatistics
    .map((p) => p.complianceRate)
    .filter((rate): rate is number => rate !== null);

  // 3. Quick wins and 4. user impacts, from the not compliant items
  const quickWinsMap = new Map<string, QuickWinStatistics>();
  const userImpacts = {
    [CriterionResultUserImpact.BLOCKING]: 0,
    [CriterionResultUserImpact.MAJOR]: 0,
    [CriterionResultUserImpact.MINOR]: 0,
    UNKNOWN: 0
  };

  report.results
    .filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT &&
        r.notCompliantItems.length > 0 &&
        allPages.some((p) => p.id === r.pageId)
    )
    .forEach((r) => {
      const key = `${r.topic}.${r.criterium}`;
      const quickWin = quickWinsMap.get(key) ?? {
        topic: r.topic,
        criterium: r.criterium,
        title: getCriteriumPlainTitle(r.topic, r.criterium),
        errorsCount: 0,
        quickWinCount: 0,
        pagesCount: 0
      };
      quickWin.errorsCount += r.notCompliantItems.length;
      quickWin.quickWinCount += r.notCompliantItems.filter(
        (i) => i.quickWin
      ).length;
      quickWin.pagesCount++;
      quickWinsMap.set(key, quickWin);

      r.notCompliantItems.forEach((i) => {
        userImpacts[i.userImpact ?? "UNKNOWN"]++;
      });
    });

  // Only easy to fix errors first, then by errors count and criterion number
  const quickWins = sortBy(
    [...quickWinsMap.values()],
    (q) => (q.quickWinCount === q.errorsCount ? 0 : 1),
    (q) => q.errorsCount,
    (q) => q.topic,
    (q) => q.criterium
  );

  return {
    global: {
      counts: globalCounts,
      complianceRate: getComplianceRate(globalCounts),
      topics: sortBy([...topicsMap.values()], "topic")
    },
    pages: {
      pages: pagesStatistics,
      average: rates.length
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : null,
      max: rates.length ? Math.max(...rates) : null,
      min: rates.length ? Math.min(...rates) : null
    },
    quickWins,
    userImpacts
  };
}
