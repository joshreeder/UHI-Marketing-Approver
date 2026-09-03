import "server-only";
import JSZip from "jszip";
import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";

/**
 * Builds a Word (.docx) file from a copy version's HTML.
 *
 * With a letterhead template: the template zip is opened, its headers, footers, styles and page
 * setup are kept, and the body is replaced by the copy (or inserted where a `{{body}}` paragraph
 * sits). `{{title}}`, `{{subject}}`, `{{date}}` and `{{version}}` are replaced anywhere in the
 * document, headers and footers.
 *
 * Without a template: a minimal, clean document (Calibri 11, Letter size, 1" margins).
 *
 * Lists are written as indented paragraphs with a literal bullet or number so no numbering
 * definitions have to be merged into the template. Hyperlinks become real Word hyperlinks.
 */

export type DocxExportInput = {
  html: string;
  title: string;
  subject?: string | null;
  versionNumber: number;
  date?: Date;
  /** A .docx letterhead/template. When omitted a plain document is produced. */
  template?: Buffer | Uint8Array | ArrayBuffer | null;
};

type Run = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; href?: string; br?: boolean };
type BlockStyle = "Normal" | "Heading1" | "Heading2" | "Heading3" | "Quote";
type Block = { style: BlockStyle; runs: Run[]; list?: { kind: "bullet" | "number"; index: number; level: number } };

// HTML → blocks ------------------------------------------------------------

type Fmt = { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; href?: string };

export function htmlToBlocks(html: string): Block[] {
  const dom = parseDocument(html, { decodeEntities: true });
  const blocks: Block[] = [];
  let current: Block | null = null;

  const open = (style: BlockStyle, list?: Block["list"]) => {
    current = { style, runs: [], list };
    blocks.push(current);
  };
  const close = () => {
    current = null;
  };
  const ensure = () => {
    if (!current) open("Normal");
    return current!;
  };
  const text = (t: string, fmt: Fmt) => {
    if (!t) return;
    const b = ensure();
    b.runs.push({ text: t, ...fmt });
  };

  const walk = (nodes: ChildNode[], fmt: Fmt, ctx: { list?: { kind: "bullet" | "number"; level: number; index: number }; quote?: boolean }) => {
    for (const node of nodes) {
      if (node.type === "text") {
        text(node.data.replace(/\s+/g, " "), fmt);
        continue;
      }
      if (node.type !== "tag") continue;
      const el = node as Element;
      const name = el.name.toLowerCase();
      switch (name) {
        case "p":
        case "div":
          close();
          open(ctx.quote ? "Quote" : "Normal", ctx.list ? { ...ctx.list } : undefined);
          walk(el.children, fmt, { ...ctx, list: undefined });
          close();
          break;
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6": {
          close();
          const level = Math.min(3, Number(name[1]));
          open(`Heading${level}` as BlockStyle);
          walk(el.children, fmt, { ...ctx, list: undefined });
          close();
          break;
        }
        case "blockquote":
          close();
          walk(el.children, fmt, { ...ctx, quote: true });
          close();
          break;
        case "ul":
        case "ol": {
          close();
          const kind = name === "ol" ? "number" : "bullet";
          const start = Number(el.attribs?.start ?? "1") || 1;
          let index = start;
          for (const li of el.children) {
            if (li.type !== "tag" || (li as Element).name.toLowerCase() !== "li") continue;
            const level = (ctx.list?.level ?? -1) + 1;
            open(ctx.quote ? "Quote" : "Normal", { kind, index, level });
            // Direct inline content of the <li> forms the item; nested lists follow as their own blocks.
            walk((li as Element).children, fmt, { ...ctx, list: { kind, level, index } });
            close();
            index++;
          }
          close();
          break;
        }
        case "li":
          // Stray <li> outside a list: treat as a paragraph.
          close();
          open("Normal");
          walk(el.children, fmt, { ...ctx, list: undefined });
          close();
          break;
        case "br":
          ensure().runs.push({ text: "", br: true });
          break;
        case "strong":
        case "b":
          walk(el.children, { ...fmt, bold: true }, ctx);
          break;
        case "em":
        case "i":
          walk(el.children, { ...fmt, italic: true }, ctx);
          break;
        case "u":
          walk(el.children, { ...fmt, underline: true }, ctx);
          break;
        case "s":
        case "strike":
        case "del":
          walk(el.children, { ...fmt, strike: true }, ctx);
          break;
        case "a": {
          const href = el.attribs?.href;
          walk(el.children, href && /^(https?:|mailto:|tel:)/i.test(href) ? { ...fmt, href } : fmt, ctx);
          break;
        }
        case "script":
        case "style":
          break;
        default:
          walk(el.children, fmt, ctx);
      }
    }
  };
  walk(dom.children, {}, {});

  // Trim whitespace at block edges and drop blocks with nothing in them.
  return blocks
    .map((b) => {
      const runs = b.runs.filter((r) => r.br || r.text.length);
      if (runs.length && !runs[0].br) runs[0] = { ...runs[0], text: runs[0].text.replace(/^\s+/, "") };
      const last = runs.length - 1;
      if (runs.length && !runs[last].br) runs[last] = { ...runs[last], text: runs[last].text.replace(/\s+$/, "") };
      return { ...b, runs: runs.filter((r) => r.br || r.text.length) };
    })
    .filter((b) => b.runs.some((r) => r.br || r.text.trim().length));
}

// Blocks → WordprocessingML -------------------------------------------------

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type StyleMap = Record<BlockStyle, string | null>;

const HYPERLINK_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";

type RunExtra = { bold?: boolean; italic?: boolean; size?: number };

function runXml(r: Run, links: Map<string, string>, extra: RunExtra = {}): string {
  if (r.br) return "<w:r><w:br/></w:r>";
  const props: string[] = [];
  if (r.bold || extra.bold) props.push("<w:b/><w:bCs/>");
  if (r.italic || extra.italic) props.push("<w:i/><w:iCs/>");
  if (r.strike) props.push("<w:strike/>");
  if (r.underline || r.href) props.push('<w:u w:val="single"/>');
  if (r.href) props.push('<w:color w:val="0563C1"/>');
  if (extra.size) props.push(`<w:sz w:val="${extra.size}"/><w:szCs w:val="${extra.size}"/>`);
  const rPr = props.length ? `<w:rPr>${props.join("")}</w:rPr>` : "";
  const run = `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(r.text)}</w:t></w:r>`;
  if (!r.href) return run;
  let id = links.get(r.href);
  if (!id) {
    id = `rIdAH${links.size + 1}`;
    links.set(r.href, id);
  }
  return `<w:hyperlink r:id="${id}">${run}</w:hyperlink>`;
}

/** Direct formatting used when the template has no style for a block type. */
const FALLBACK: Record<BlockStyle, RunExtra> = {
  Normal: {},
  Heading1: { bold: true, size: 32 },
  Heading2: { bold: true, size: 28 },
  Heading3: { bold: true, size: 24 },
  Quote: { italic: true },
};

function paragraphXml(b: Block, styles: StyleMap, links: Map<string, string>): string {
  const pPr: string[] = [];
  const styleId = styles[b.style];
  if (styleId && b.style !== "Normal") pPr.push(`<w:pStyle w:val="${xmlEscape(styleId)}"/>`);
  const extra = styleId ? {} : FALLBACK[b.style];
  if (!styleId && b.style === "Quote") pPr.push('<w:ind w:left="720" w:right="720"/>');

  let markerRun = "";
  if (b.list) {
    const left = 720 * (b.list.level + 1);
    pPr.push(`<w:tabs><w:tab w:val="left" w:pos="${left}"/></w:tabs>`);
    pPr.push(`<w:ind w:left="${left}" w:hanging="360"/>`);
    const marker = b.list.kind === "number" ? `${b.list.index}.` : "•";
    markerRun = `<w:r><w:t xml:space="preserve">${xmlEscape(marker)}</w:t></w:r><w:r><w:tab/></w:r>`;
  }
  const runs = b.runs.map((r) => runXml(r, links, extra)).join("");
  return `<w:p>${pPr.length ? `<w:pPr>${pPr.join("")}</w:pPr>` : ""}${markerRun}${runs}</w:p>`;
}

/** Resolves style ids in a styles.xml by their standard English names, e.g. "heading 1" → "Heading1". */
export function resolveStyles(stylesXml: string | null): StyleMap {
  const find = (id: string, name: string): string | null => {
    if (!stylesXml) return null;
    if (new RegExp(`w:styleId="${id}"`).test(stylesXml)) return id;
    const m = stylesXml.match(new RegExp(`<w:style\\b[^>]*w:styleId="([^"]+)"[^>]*>\\s*<w:name w:val="${name}"`, "i"));
    return m ? m[1] : null;
  };
  return {
    Normal: find("Normal", "Normal"),
    Heading1: find("Heading1", "heading 1"),
    Heading2: find("Heading2", "heading 2"),
    Heading3: find("Heading3", "heading 3"),
    Quote: find("Quote", "Quote"),
  };
}

// Template plumbing ---------------------------------------------------------

const DEFAULT_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="40"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720" w:right="720"/></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>
</w:styles>`;

const DEFAULT_DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;

const DEFAULT_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const DEFAULT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DEFAULT_DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const NO_FOLDERS = { createFolders: false } as const;

function newDefaultZip(): JSZip {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", DEFAULT_CONTENT_TYPES, NO_FOLDERS);
  zip.file("_rels/.rels", DEFAULT_RELS, NO_FOLDERS);
  zip.file("word/document.xml", DEFAULT_DOCUMENT, NO_FOLDERS);
  zip.file("word/styles.xml", DEFAULT_STYLES, NO_FOLDERS);
  zip.file("word/_rels/document.xml.rels", DEFAULT_DOC_RELS, NO_FOLDERS);
  return zip;
}

/** Plain text of a <w:p> fragment: concatenated <w:t> contents. */
function paragraphText(p: string): string {
  return [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
}

/** Replaces `{{key}}` tokens that sit inside a single <w:t> element. */
function replaceTokens(xml: string, tokens: Record<string, string>): string {
  return xml.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (whole, attrs: string | undefined, inner: string) => {
    if (!inner.includes("{{")) return whole;
    const replaced = inner.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key: string) => (key in tokens ? xmlEscape(tokens[key]) : m));
    return `<w:t${attrs ?? ""}>${replaced}</w:t>`;
  });
}

/**
 * Inserts body paragraphs into document.xml. If a paragraph reads exactly `{{body}}` it is replaced
 * in place; otherwise all existing body content (except the section properties) is replaced.
 */
export function injectBody(documentXml: string, bodyXml: string): string {
  const bodyStart = documentXml.indexOf("<w:body>");
  const bodyEnd = documentXml.lastIndexOf("</w:body>");
  if (bodyStart === -1 || bodyEnd === -1) throw new Error("Template has no document body.");
  const inner = documentXml.slice(bodyStart + "<w:body>".length, bodyEnd);

  // Look for a {{body}} paragraph.
  const re = /<w:p(?=[\s>])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const end = inner.indexOf("</w:p>", m.index);
    if (end === -1) break;
    const p = inner.slice(m.index, end + "</w:p>".length);
    if (/^\s*\{\{\s*body\s*\}\}\s*$/.test(paragraphText(p))) {
      const next = inner.slice(0, m.index) + bodyXml + inner.slice(end + "</w:p>".length);
      return documentXml.slice(0, bodyStart + "<w:body>".length) + next + documentXml.slice(bodyEnd);
    }
    re.lastIndex = end;
  }

  // No placeholder: keep only the trailing <w:sectPr>.
  const sectIdx = inner.lastIndexOf("<w:sectPr");
  const sectPr = sectIdx === -1 ? "" : inner.slice(sectIdx);
  return documentXml.slice(0, bodyStart + "<w:body>".length) + bodyXml + sectPr + documentXml.slice(bodyEnd);
}

function addHyperlinkRels(relsXml: string, links: Map<string, string>): string {
  if (!links.size) return relsXml;
  const rels = [...links].map(([href, id]) => `<Relationship Id="${id}" Type="${HYPERLINK_REL}" Target="${xmlEscape(href)}" TargetMode="External"/>`).join("");
  return relsXml.replace(/<\/Relationships>\s*$/, `${rels}</Relationships>`);
}

function fmtLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function buildCopyDocx(input: DocxExportInput): Promise<Buffer> {
  const zip = input.template ? await JSZip.loadAsync(input.template) : newDefaultZip();
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("The letterhead is not a valid Word (.docx) file.");
  const stylesXml = (await zip.file("word/styles.xml")?.async("string")) ?? null;
  const styles = resolveStyles(stylesXml);

  const blocks = htmlToBlocks(input.html);
  const links = new Map<string, string>();
  const subject = input.subject?.trim() ?? "";
  const body: string[] = [];
  if (subject) body.push(paragraphXml({ style: "Normal", runs: [{ text: subject, bold: true }] }, styles, links));
  for (const b of blocks) body.push(paragraphXml(b, styles, links));
  if (!body.length) body.push("<w:p/>");

  const tokens: Record<string, string> = {
    title: input.title,
    subject,
    date: fmtLongDate(input.date ?? new Date()),
    version: `v${input.versionNumber}`,
  };

  let doc = injectBody(documentXml, body.join(""));
  doc = replaceTokens(doc, tokens);
  // Make sure the relationships namespace exists for hyperlinks.
  if (links.size && !/xmlns:r=/.test(doc.slice(0, 2000))) {
    doc = doc.replace(/<w:document\b/, '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"');
  }
  zip.file("word/document.xml", doc, NO_FOLDERS);

  for (const name of Object.keys(zip.files)) {
    if (/^word\/(header|footer)\d*\.xml$/.test(name)) {
      const xml = await zip.file(name)!.async("string");
      zip.file(name, replaceTokens(xml, tokens), NO_FOLDERS);
    }
  }

  const relsPath = "word/_rels/document.xml.rels";
  const rels = (await zip.file(relsPath)?.async("string")) ?? DEFAULT_DOC_RELS;
  zip.file(relsPath, addHyperlinkRels(rels, links), NO_FOLDERS);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

/** Safe download name: "Board letter v3.docx". */
export function docxFileName(title: string, versionNumber: number): string {
  const base = title.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "copy";
  return `${base} v${versionNumber}.docx`;
}
