import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitiser for copy submitted from the rich text editor. Anything outside this list
 * (scripts, styles, images, tables, event handlers) is dropped. Approvers and emails render the
 * result, so it has to be safe to inject.
 */
export function sanitizeCopyHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "a", "blockquote"],
    allowedAttributes: { a: ["href", "rel", "target"], ol: ["start"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      b: "strong",
      i: "em",
      strike: "s",
    },
  });
  // Collapse runs of empty paragraphs the editor leaves at the end.
  return clean.replace(/(<p>\s*<\/p>\s*)+$/g, "").trim();
}
