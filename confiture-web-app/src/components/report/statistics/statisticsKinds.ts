/**
 * Series displayed in the statistics charts. Each kind has a color AND a
 * pattern, so the information is not given by the color alone.
 */
export type StatisticsKind =
  | "compliant"
  | "notCompliant"
  | "notApplicable"
  | "notTested"
  | "blocking"
  | "major"
  | "minor"
  | "unknown";

export interface StatisticsSerie {
  label: string;
  value: number;
  kind: StatisticsKind;
}

/**
 * SVG patterns, mirrored by the `.statistics-fill--*` CSS classes. Colors are
 * CSS variables defined in StatisticsLegend.vue, per theme.
 */
export const STATISTICS_PATTERNS: Record<
  StatisticsKind,
  { color: string; motif: "solid" | "stripes" | "backstripes" | "dots" | "cross" }
> = {
  compliant: { color: "var(--statistics-compliant)", motif: "solid" },
  notCompliant: { color: "var(--statistics-not-compliant)", motif: "stripes" },
  notApplicable: { color: "var(--statistics-not-applicable)", motif: "dots" },
  notTested: { color: "var(--statistics-not-tested)", motif: "cross" },
  blocking: { color: "var(--statistics-blocking)", motif: "stripes" },
  major: { color: "var(--statistics-major)", motif: "backstripes" },
  minor: { color: "var(--statistics-minor)", motif: "dots" },
  unknown: { color: "var(--statistics-unknown)", motif: "solid" }
};
