/**
 * Finds tracked changes and comments inside a Word (.docx) file. Pure functions over the XML
 * parts so the same code runs in the browser (before upload) and on the server (when saving).
 *
 * A .docx is a zip. The pieces we care about:
 *   word/document.xml          body text; <w:ins>/<w:del>/<w:moveFrom>/<w:moveTo> wrap tracked edits,
 *                              <w:*PrChange> records formatting changes
 *   word/comments.xml          one <w:comment> per comment
 *   word/commentsExtended.xml  <w15:commentEx w15:done="1"> marks a comment resolved (Word 2013+)
 *   word/settings.xml          <w:trackRevisions/> means Track Changes is switched on
 */

export type DocxChangeKind = "insert" | "delete" | "move" | "format";

export type DocxChange = { kind: DocxChangeKind; author: string | null; text: string };
export type DocxComment = { author: string | null; date: string | null; text: string; resolved: boolean };

export type DocxReview = {
  insertions: number;
  deletions: number;
  moves: number;
  formatting: number;
  /** All comments, including resolved ones. */
  comments: number;
  resolvedComments: number;
  trackChangesOn: boolean;
  authors: string[];
  /** First few tracked changes, for display. */
  changes: DocxChange[];
  /** First few comments, for display. */
  commentList: DocxComment[];
};

export type DocxParts = {
  documentXml: string;
  commentsXml?: string | null;
  commentsExtendedXml?: string | null;
  settingsXml?: string | null;
};

const MAX_LISTED = 40;
const SNIPPET = 160;

export function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? decodeXml(m[1]) : null;
}

/** Text of <w:t> (or <w:delText>) elements inside a fragment, with paragraph breaks as spaces. */
function innerText(fragment: string, tag: "w:t" | "w:delText" = "w:t"): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g");
  let out = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) out += decodeXml(m[1]);
  return out.replace(/\s+/g, " ").trim();
}

function snippet(s: string): string {
  return s.length > SNIPPET ? `${s.slice(0, SNIPPET - 1)}…` : s;
}

/**
 * Walks every <tag …>…</tag> or self-closing <tag …/> in the XML. Elements do not nest within
 * themselves in Word output, so the next closing tag ends the current element.
 */
function eachElement(xml: string, tag: string, fn: (openTag: string, inner: string) => void) {
  const open = new RegExp(`<${tag}(?=[\\s/>])[^>]*>`, "g");
  const close = `</${tag}>`;
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const openTag = m[0];
    if (openTag.endsWith("/>")) {
      fn(openTag, "");
      continue;
    }
    const end = xml.indexOf(close, open.lastIndex);
    if (end === -1) {
      fn(openTag, "");
      break;
    }
    fn(openTag, xml.slice(open.lastIndex, end));
    open.lastIndex = end + close.length;
  }
}

export function reviewDocxParts(parts: DocxParts): DocxReview {
  const authors = new Set<string>();
  const changes: DocxChange[] = [];
  let insertions = 0;
  let deletions = 0;
  let moves = 0;
  let formatting = 0;

  const push = (kind: DocxChangeKind, openTag: string, text: string) => {
    const author = attr(openTag, "w:author");
    if (author) authors.add(author);
    if (changes.length < MAX_LISTED) changes.push({ kind, author, text: snippet(text) });
  };

  const doc = parts.documentXml;
  eachElement(doc, "w:ins", (t, inner) => {
    // <w:ins> inside <w:rPr> marks an inserted paragraph mark; it has no text. Still a change.
    insertions++;
    push("insert", t, innerText(inner));
  });
  eachElement(doc, "w:del", (t, inner) => {
    deletions++;
    push("delete", t, innerText(inner, "w:delText"));
  });
  eachElement(doc, "w:moveFrom", (t, inner) => {
    moves++;
    push("move", t, innerText(inner, "w:delText") || innerText(inner));
  });
  eachElement(doc, "w:moveTo", (t, inner) => {
    moves++;
    push("move", t, innerText(inner));
  });
  for (const tag of ["w:rPrChange", "w:pPrChange", "w:sectPrChange", "w:tblPrChange", "w:trPrChange", "w:tcPrChange", "w:numberingChange"]) {
    eachElement(doc, tag, (t) => {
      formatting++;
      push("format", t, "");
    });
  }

  // Comments -------------------------------------------------------------
  const done = new Set<string>();
  if (parts.commentsExtendedXml) {
    eachElement(parts.commentsExtendedXml, "w15:commentEx", (t) => {
      if (attr(t, "w15:done") === "1") {
        const id = attr(t, "w15:paraId");
        if (id) done.add(id.toUpperCase());
      }
    });
  }
  const commentList: DocxComment[] = [];
  let comments = 0;
  let resolvedComments = 0;
  if (parts.commentsXml) {
    eachElement(parts.commentsXml, "w:comment", (t, inner) => {
      comments++;
      const author = attr(t, "w:author");
      if (author) authors.add(author);
      // A comment is resolved when any of its paragraphs is marked done in commentsExtended.xml.
      const paraIds = [...inner.matchAll(/w14:paraId="([^"]+)"/g)].map((m) => m[1].toUpperCase());
      const resolved = paraIds.some((id) => done.has(id));
      if (resolved) resolvedComments++;
      if (commentList.length < MAX_LISTED) commentList.push({ author, date: attr(t, "w:date"), text: snippet(innerText(inner)), resolved });
    });
  }

  const trackChangesOn = !!parts.settingsXml && /<w:trackRevisions\b/.test(parts.settingsXml);

  return { insertions, deletions, moves, formatting, comments, resolvedComments, trackChangesOn, authors: [...authors].sort(), changes, commentList };
}

/** Tracked changes plus open comments: what has to be dealt with before the file is clean. */
export function unresolvedCount(r: DocxReview | null | undefined): number {
  if (!r) return 0;
  return r.insertions + r.deletions + r.moves + r.formatting + (r.comments - r.resolvedComments);
}

export function trackedChangeCount(r: DocxReview | null | undefined): number {
  if (!r) return 0;
  return r.insertions + r.deletions + r.moves + r.formatting;
}

export function openCommentCount(r: DocxReview | null | undefined): number {
  if (!r) return 0;
  return r.comments - r.resolvedComments;
}

/** "3 tracked changes and 1 open comment" — null when the file is clean. */
export function describeDocxReview(r: DocxReview | null | undefined): string | null {
  const changes = trackedChangeCount(r);
  const open = openCommentCount(r);
  if (!changes && !open) return null;
  const parts: string[] = [];
  if (changes) parts.push(`${changes} tracked change${changes === 1 ? "" : "s"}`);
  if (open) parts.push(`${open} open comment${open === 1 ? "" : "s"}`);
  return parts.join(" and ");
}

/**
 * Reads the relevant XML parts out of a .docx (zip) using JSZip, which works in the browser and
 * on the server. Returns null when the file is not a Word document.
 */
export async function reviewDocx(data: ArrayBuffer | Uint8Array | Blob): Promise<DocxReview | null> {
  const { default: JSZip } = await import("jszip");
  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    return null;
  }
  const read = async (name: string) => {
    const f = zip.file(name);
    return f ? f.async("string") : null;
  };
  const documentXml = await read("word/document.xml");
  if (!documentXml) return null;
  const [commentsXml, commentsExtendedXml, settingsXml] = await Promise.all([read("word/comments.xml"), read("word/commentsExtended.xml"), read("word/settings.xml")]);
  return reviewDocxParts({ documentXml, commentsXml, commentsExtendedXml, settingsXml });
}
