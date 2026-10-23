/**
 * Talan customisation (see CUSTOMISATIONS_TALAN.md).
 *
 * Jira wiki markup helpers: escaping, safe links, and conversion of Ara rich
 * text (Tiptap JSON error comments, RGAA markdown) to wiki markup.
 */

/** Escapes characters that have a meaning in Jira wiki markup. */
export function escapeWiki(value: string): string {
  return value.replace(/[{}[\]|!*_^~+\\]/g, (c) => `\\${c}`);
}

/**
 * Returns an absolute, percent-encoded URL when it is safe to link to
 * (http, https or mailto), `null` otherwise (e.g. `javascript:` links).
 * Percent-encoding also removes `|` and `]`, which would break wiki links.
 */
export function toSafeUrl(url: string, origin?: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, origin);
  } catch {
    return null;
  }

  return ["http:", "https:", "mailto:"].includes(parsed.protocol)
    ? parsed.href.replace(/[|[\]]/g, encodeURIComponent)
    : null;
}

/** RGAA markdown (glossary links, inline code) to plain text. */
export function markdownToText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/** RGAA markdown (glossary links, inline code) to Jira wiki markup. */
export function markdownToWiki(value: string): string {
  return value
    .split(/(`[^`]+`)/)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`") && part.length > 1
        ? inlineCode(part.slice(1, -1))
        : escapeWiki(part.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"))
    )
    .join("");
}

interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: TiptapNode[];
}

function parseTiptap(comment: string): TiptapNode | null {
  try {
    const doc = JSON.parse(comment);
    return doc?.type === "doc" ? doc : null;
  } catch {
    // Not JSON: legacy markdown comment
    return null;
  }
}

/** Returns the `src` of every image of an error comment. */
export function getTiptapImages(comment: string): string[] {
  const images: string[] = [];
  const visit = (node: TiptapNode) => {
    if (node.type === "image" && node.attrs?.src) {
      images.push(node.attrs.src);
    }
    node.content?.forEach(visit);
  };

  const doc = parseTiptap(comment);
  if (doc) {
    visit(doc);
  }
  return images;
}

/** Converts an error comment (Tiptap JSON or legacy markdown) to Jira wiki markup. */
export function commentToWiki(comment: string): string {
  const doc = parseTiptap(comment);
  if (!doc) {
    return escapeWiki(comment);
  }
  return blocksToWiki(doc.content ?? [], "").trim();
}

/**
 * Inline code (`{{…}}`). Falls back to escaped plain text when the code
 * contains braces, which would close the macro early.
 */
function inlineCode(code: string): string {
  return /[{}]/.test(code) ? escapeWiki(code) : `{{${code}}}`;
}

/**
 * Code block. Uses `{noformat}` when the code contains `{code`, and breaks
 * any remaining macro name so that the content cannot close the block.
 */
function codeBlock(code: string, language: string | undefined): string {
  if (!code.includes("{code")) {
    return `{code${language ? `:${language}` : ""}}\n${code}\n{code}`;
  }
  return `{noformat}\n${code.replaceAll("{noformat", "{ noformat")}\n{noformat}`;
}

function blocksToWiki(nodes: TiptapNode[], listPrefix: string): string {
  return nodes
    .map((node) => blockToWiki(node, listPrefix))
    .filter((block) => block !== "")
    .join("\n\n");
}

function blockToWiki(node: TiptapNode, listPrefix: string): string {
  const content = node.content ?? [];

  switch (node.type) {
    case "paragraph":
      return inlineToWiki(content);
    case "heading":
      return `h${Math.min(Math.max(node.attrs?.level ?? 3, 1), 6)}. ${inlineToWiki(content)}`;
    case "bulletList":
    case "orderedList":
      return listToWiki(content, listPrefix + (node.type === "bulletList" ? "*" : "#"));
    case "blockquote":
      return `{quote}\n${blocksToWiki(content, "")}\n{quote}`;
    case "codeBlock":
      return codeBlock(content.map((c) => c.text ?? "").join(""), node.attrs?.language);
    case "horizontalRule":
      return "----";
    case "image":
      return `(capture : ${escapeWiki(node.attrs?.alt || "image")})`;
    default:
      return content.length ? blocksToWiki(content, listPrefix) : inlineToWiki([node]);
  }
}

/**
 * A list item can contain several paragraphs: they are kept on the item line,
 * separated by a forced line break (`\\`), so that the list is not broken.
 * Nested lists go on their own lines with a longer prefix.
 */
function listToWiki(listItems: TiptapNode[], prefix: string): string {
  return listItems
    .map((listItem) => {
      const children = listItem.content ?? [];
      const isList = (child: TiptapNode) => child.type === "bulletList" || child.type === "orderedList";

      const text = children
        .filter((child) => !isList(child))
        .map((child) => blockToWiki(child, prefix).replaceAll("\n", " \\\\ "))
        .filter((line) => line !== "")
        .join(" \\\\ ");
      const nestedLists = children
        .filter(isList)
        .map((child) => blockToWiki(child, prefix));

      return [`${prefix} ${text}`, ...nestedLists].join("\n");
    })
    .join("\n");
}

function inlineToWiki(nodes: TiptapNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") {
        return "\n";
      }
      if (node.type === "image") {
        return `(capture : ${escapeWiki(node.attrs?.alt || "image")})`;
      }
      if (node.type !== "text" || !node.text) {
        return "";
      }

      const marks = node.marks ?? [];
      if (marks.some((m) => m.type === "code")) {
        return inlineCode(node.text);
      }

      let text = escapeWiki(node.text);
      for (const mark of marks) {
        if (mark.type === "bold") text = `*${text}*`;
        if (mark.type === "italic") text = `_${text}_`;
        if (mark.type === "strike") text = `-${text}-`;
        if (mark.type === "underline") text = `+${text}+`;
        if (mark.type === "link") {
          const href = toSafeUrl(mark.attrs?.href ?? "");
          if (href) text = `[${text}|${href}]`;
        }
      }
      return text;
    })
    .join("");
}
