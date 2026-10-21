import { upperFirst } from "lodash-es";
import rgaa from "../../criteres.json";
import { CRITERIA_BY_AUDIT_TYPE } from "../../criteria";
import {
  Audit,
  AuditPage,
  AuditType,
  CriteriumResult,
  CriteriumResultStatus,
  CriterionResultUserImpact,
  NotCompliantItem
} from "../../types";
import { formatUserImpact, getCriteriaCount, getUploadUrl, slugify } from "../../utils";
import {
  commentToWiki,
  escapeWiki,
  getTiptapImages,
  markdownToText,
  toSafeUrl
} from "./jira-wiki";

/**
 * Talan customisation (see CUSTOMISATIONS_TALAN.md).
 *
 * Export of the audit errors as a CSV file importable in Jira Cloud
 * (Jira settings > System > External System Import > CSV).
 *
 * One ticket per error (`NotCompliantItem`), plus one ticket per not compliant
 * criterion without any error, so that nothing is lost.
 */

type ResultsData = Record<number, Record<number, Record<number, CriteriumResult>>>;

interface ErrorToExport {
  page: AuditPage;
  result: CriteriumResult;
  item: NotCompliantItem | null;
}

/** Values shared by the CSV columns and the description, computed once. */
interface JiraTicket {
  summary: string;
  criticality: string;
  description: string;
  environment: string;
  labels: string[];
  /** Absolute image URLs: Jira downloads them during the import. */
  attachments: string[];
  pageName: string;
  pageUrl: string;
  criterion: string;
  criterionTitle: string;
  topic: string;
  wcag: string;
  userImpact: string;
  quickWin: string;
  audit: string;
  auditor: string;
  reportUrl: string;
}

type CsvColumn = [header: string, value: (ticket: JiraTicket) => string];

const ISSUE_TYPE = "Bug";

const SUMMARY_MAX_LENGTH = 255;

/**
 * Values of the Jira "Criticité" field (the Jira priority, renamed).
 * An error without user impact gets an empty value: Jira applies its default.
 */
const JIRA_CRITICALITY: Record<CriterionResultUserImpact, string> = {
  [CriterionResultUserImpact.BLOCKING]: "Bloquante",
  [CriterionResultUserImpact.MAJOR]: "Majeure",
  [CriterionResultUserImpact.MINOR]: "Mineure"
};

const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  [AuditType.FAST]: "audit rapide",
  [AuditType.COMPLEMENTARY]: "audit complémentaire",
  [AuditType.FULL]: "audit complet"
};

/** Returns the number of tickets that would be exported. */
export function getJiraTicketsCount(audit: Audit, results: ResultsData | null): number {
  return getErrorsToExport(audit, results).length;
}

/** Generates the CSV and triggers its download in the browser. */
export function downloadJiraCsv(audit: Audit, results: ResultsData | null) {
  const origin = window.location.origin;
  const tickets = getErrorsToExport(audit, results).map((error) => getTicket(audit, error, origin));

  const url = URL.createObjectURL(new Blob([generateCsv(tickets)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tickets-jira-${slugify(audit.procedureName)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lists the errors to export, in audit order (pages, then criteria). */
function getErrorsToExport(audit: Audit, results: ResultsData | null): ErrorToExport[] {
  if (!results) {
    return [];
  }

  const pages = [audit.transverseElementsPage, ...audit.pages];

  return pages.flatMap((page) =>
    CRITERIA_BY_AUDIT_TYPE[audit.auditType].flatMap(({ topic, criterium }): ErrorToExport[] => {
      const result = results[page.id]?.[topic]?.[criterium];

      if (result?.status !== CriteriumResultStatus.NOT_COMPLIANT) {
        return [];
      }

      return result.notCompliantItems.length
        ? result.notCompliantItems.map((item) => ({ page, result, item }))
        : [{ page, result, item: null }];
    })
  );
}

/**
 * Builds the CSV file content: UTF-8 with BOM (so that Excel does not display
 * garbled accents), comma separated, all values quoted.
 *
 * Each column is declared once, with its header and its value, so that
 * headers and values cannot get out of sync.
 */
function generateCsv(tickets: JiraTicket[]): string {
  const labelColumnsCount = Math.max(1, ...tickets.map((t) => t.labels.length));
  const attachmentColumnsCount = Math.max(0, ...tickets.map((t) => t.attachments.length));

  const columns: CsvColumn[] = [
    ["Summary", (t) => t.summary],
    ["Issue Type", () => ISSUE_TYPE],
    ["Criticité", (t) => t.criticality],
    ["Description", (t) => t.description],
    ["Environment", (t) => t.environment],
    ...Array.from({ length: labelColumnsCount }, (_, i): CsvColumn => ["Labels", (t) => t.labels[i] ?? ""]),
    ...Array.from({ length: attachmentColumnsCount }, (_, i): CsvColumn => ["Attachment", (t) => t.attachments[i] ?? ""]),
    ["Page", (t) => t.pageName],
    ["URL de la page", (t) => t.pageUrl],
    ["Critère RGAA", (t) => t.criterion],
    ["Intitulé du critère", (t) => t.criterionTitle],
    ["Thématique", (t) => t.topic],
    ["Critères WCAG", (t) => t.wcag],
    ["Impact usager", (t) => t.userImpact],
    ["Facile à corriger", (t) => t.quickWin],
    ["Audit", (t) => t.audit],
    ["Lien rapport Ara", (t) => t.reportUrl]
  ];

  const lines = [
    columns.map(([header]) => header),
    ...tickets.map((ticket) => columns.map(([, value]) => value(ticket)))
  ];

  return "\uFEFF" + lines.map((cells) => cells.map(toCsvCell).join(",")).join("\r\n");
}

/**
 * Quotes a CSV value. Values starting with a formula character are prefixed
 * with `'` so that spreadsheet software does not execute them
 * (CSV injection, see OWASP).
 */
function toCsvCell(value: string): string {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll("\"", "\"\"")}"`;
}

function getTicket(audit: Audit, { page, result, item }: ErrorToExport, origin: string): JiraTicket {
  const topic = rgaa.topics.find((t) => t.number === result.topic)!;
  const criterium = topic.criteria.find((c) => c.criterium.number === result.criterium)!.criterium;

  const isTransverse = page.id === audit.transverseElementsPage.id;
  const criterion = `${result.topic}.${result.criterium}`;
  const criterionTitle = markdownToText(criterium.title);
  const pageName = isTransverse ? "Éléments transverses" : page.name;
  const userImpact = item?.userImpact ? upperFirst(formatUserImpact(item.userImpact)) : "";
  const title = item?.title?.trim() || criterionTitle;

  const attachments = [
    ...(item?.comment ? getTiptapImages(item.comment) : []),
    ...(item ? [] : result.exampleImages.map((i) => getUploadUrl(i.key)))
  ]
    .map((src) => toSafeUrl(src, origin))
    .filter((src): src is string => !!src && /^https?:/.test(src));

  const ticket: Omit<JiraTicket, "description"> = {
    summary: truncate(`[RGAA ${criterion}] ${title} (${pageName})`, SUMMARY_MAX_LENGTH),
    criticality: item?.userImpact ? JIRA_CRITICALITY[item.userImpact] : "",
    environment: audit.environments
      .map((e) => [e.platform, e.operatingSystem, e.assistiveTechnology, e.browser].filter(Boolean).join(" · "))
      .join("\n"),
    labels: [
      "RGAA",
      `RGAA-${criterion}`,
      `RGAA-thematique-${result.topic}`,
      item?.quickWin ? "facile-a-corriger" : null,
      isTransverse ? "element-transverse" : null
    ].filter((label): label is string => !!label),
    attachments,
    pageName,
    pageUrl: isTransverse ? "" : page.url,
    criterion,
    criterionTitle,
    topic: `${topic.number}. ${topic.topic}`,
    wcag: (criterium.references.find((r) => "wcag" in r)?.wcag ?? []).join(", "),
    userImpact,
    quickWin: item?.quickWin ? "Oui" : "Non",
    audit: `${audit.procedureName} (${AUDIT_TYPE_LABEL[audit.auditType]}, ${getCriteriaCount(audit.auditType)} critères)`,
    auditor: audit.auditorName ?? "",
    reportUrl: `${origin}/rapport/${audit.consultUniqueId}/`
  };

  return { ...ticket, description: getDescription(ticket, item) };
}

/** Ticket description, in Jira wiki markup. */
function getDescription(
  ticket: Omit<JiraTicket, "description">,
  item: NotCompliantItem | null
): string {
  const contextRows: [string, string][] = [
    ["Page", escapeWiki(ticket.pageName)],
    ["URL", ticket.pageUrl && (toSafeUrl(ticket.pageUrl) ?? escapeWiki(ticket.pageUrl))],
    ["Critère RGAA", escapeWiki(`${ticket.criterion} : ${ticket.criterionTitle}`)],
    ["Thématique", escapeWiki(ticket.topic)],
    ["WCAG", escapeWiki(ticket.wcag)],
    ["Impact usager", ticket.userImpact || "Non renseigné"],
    ["Facile à corriger", ticket.quickWin],
    ["Audit", escapeWiki(ticket.audit)],
    ["Auditeur", escapeWiki(ticket.auditor)],
    ["Rapport Ara", ticket.reportUrl]
  ];

  return [
    "h3. Contexte",
    ...contextRows.filter(([, value]) => value).map(([label, value]) => `||${label}|${value}|`),
    "",
    "h3. Anomalie",
    item?.comment ? commentToWiki(item.comment) : "Aucune description saisie dans Ara.",
    ...(ticket.attachments.length ? ["", "h3. Captures", ...ticket.attachments.map((src) => `* [${src}]`)] : [])
  ].join("\n");
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength - 1) + "…" : value;
}
