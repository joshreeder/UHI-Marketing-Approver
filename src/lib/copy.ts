/** Helpers for "copy" versions: text that needs sign-off, stored as sanitised HTML. */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text → paragraphs. Blank lines separate paragraphs; single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/**
 * HTML → readable plain text, for word counts, diffs and search. Handles the tags the copy editor
 * produces (paragraphs, headings, lists, links, line breaks, inline formatting).
 */
export function htmlToText(html: string): string {
  let s = html.replace(/\r\n?/g, "\n").replace(/\n/g, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n• ");
  s = s.replace(/<\/(p|h[1-6]|blockquote|div|ul|ol)>/gi, "\n\n");
  s = s.replace(/<\/li>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function isCopyVersion(v: { emailHtml: string | null; fileUrl: string | null }): boolean {
  return !!v.emailHtml && !v.fileUrl;
}

/** True when the editor content has no visible text (e.g. a lone empty paragraph). */
export function isCopyEmpty(html: string): boolean {
  return htmlToText(html).length === 0;
}
