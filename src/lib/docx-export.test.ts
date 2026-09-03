import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildCopyDocx, docxFileName, htmlToBlocks, injectBody, resolveStyles } from "./docx-export";

const html = `<h1>Rate update</h1><p>Dear <strong>agents</strong>,</p><p>Rates change on <a href="https://example.com/rates">October 1</a>.<br>Second line.</p><ul><li>First point</li><li>Second point<ul><li>Nested</li></ul></li></ul><ol start="3"><li>Three</li></ol><blockquote><p>Quoted words</p></blockquote>`;

async function readDoc(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  return {
    zip,
    doc: await zip.file("word/document.xml")!.async("string"),
    rels: await zip.file("word/_rels/document.xml.rels")!.async("string"),
  };
}

describe("htmlToBlocks", () => {
  it("turns editor HTML into styled blocks with list markers", () => {
    const blocks = htmlToBlocks(html);
    expect(blocks.map((b) => b.style)).toEqual(["Heading1", "Normal", "Normal", "Normal", "Normal", "Normal", "Normal", "Quote"]);
    expect(blocks[1].runs).toEqual([{ text: "Dear " }, { text: "agents", bold: true }, { text: "," }]);
    expect(blocks[2].runs.some((r) => r.href === "https://example.com/rates")).toBe(true);
    expect(blocks[2].runs.some((r) => r.br)).toBe(true);
    expect(blocks[3].list).toEqual({ kind: "bullet", index: 1, level: 0 });
    expect(blocks[5].list).toEqual({ kind: "bullet", index: 1, level: 1 });
    expect(blocks[6].list).toEqual({ kind: "number", index: 3, level: 0 });
  });

  it("drops empty paragraphs", () => {
    expect(htmlToBlocks("<p></p><p>  </p><p>Hi</p>")).toHaveLength(1);
  });
});

describe("buildCopyDocx without a template", () => {
  it("produces a valid package with the text, a hyperlink relationship and heading styles", async () => {
    const buf = await buildCopyDocx({ html, title: "Agent letter", subject: "Rates", versionNumber: 2 });
    const { zip, doc, rels } = await readDoc(buf);
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("word/styles.xml")).toBeTruthy();
    expect(doc).toContain('<w:pStyle w:val="Heading1"/>');
    expect(doc).toContain("Dear ");
    expect(doc).toContain("<w:b/>");
    expect(doc).toContain('<w:hyperlink r:id="rIdAH1">');
    expect(doc).toContain("•");
    expect(doc).toContain(">3.<");
    expect(doc).toMatch(/<w:t xml:space="preserve">Rates<\/w:t>/); // subject line
    expect(rels).toContain('Target="https://example.com/rates" TargetMode="External"');
    expect(doc.indexOf("<w:sectPr")).toBeGreaterThan(doc.indexOf("Quoted words"));
  });

  it("escapes XML special characters", async () => {
    const buf = await buildCopyDocx({ html: "<p>Fish &amp; Chips &lt;3</p>", title: "t", versionNumber: 1 });
    const { doc } = await readDoc(buf);
    expect(doc).toContain("Fish &amp; Chips &lt;3");
  });
});

describe("buildCopyDocx with a letterhead template", () => {
  async function template(bodyInner: string, styles?: string) {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file(
      "word/document.xml",
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${bodyInner}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`,
    );
    zip.file("word/header1.xml", `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>United Heritage · {{date}}</w:t></w:r></w:p></w:hdr>`);
    zip.file("word/_rels/document.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`);
    if (styles) zip.file("word/styles.xml", styles);
    return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
  }

  it("replaces the {{body}} paragraph and keeps everything around it", async () => {
    const tpl = await template(`<w:p><w:r><w:t>{{date}}</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>{{body}}</w:t></w:r></w:p><w:p><w:r><w:t>Sincerely, {{title}}</w:t></w:r></w:p>`);
    const buf = await buildCopyDocx({ html: "<p>Hello there</p>", title: "Board letter", versionNumber: 3, template: tpl, date: new Date(2026, 8, 2) });
    const { zip, doc } = await readDoc(buf);
    expect(doc).not.toContain("{{body}}");
    expect(doc).toContain("Hello there");
    expect(doc).toContain("September 2, 2026");
    expect(doc).toContain("Sincerely, Board letter");
    expect(doc.indexOf("September 2, 2026")).toBeLessThan(doc.indexOf("Hello there"));
    expect(doc.indexOf("Hello there")).toBeLessThan(doc.indexOf("Sincerely"));
    expect(doc).toContain('<w:headerReference w:type="default" r:id="rId2"/>');
    const header = await zip.file("word/header1.xml")!.async("string");
    expect(header).toContain("United Heritage · September 2, 2026");
  });

  it("replaces the whole body when there is no placeholder, keeping the section properties", async () => {
    const tpl = await template(`<w:p><w:r><w:t>Old template text</w:t></w:r></w:p>`);
    const buf = await buildCopyDocx({ html: "<p>New copy</p>", title: "t", versionNumber: 1, template: tpl });
    const { doc } = await readDoc(buf);
    expect(doc).not.toContain("Old template text");
    expect(doc).toContain("New copy");
    expect(doc).toContain("<w:sectPr>");
  });

  it("falls back to direct formatting when the template lacks heading styles", async () => {
    const tpl = await template(`<w:p><w:r><w:t>{{body}}</w:t></w:r></w:p>`, `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
    const buf = await buildCopyDocx({ html: "<h1>Title</h1><p>Body</p>", title: "t", versionNumber: 1, template: tpl });
    const { doc } = await readDoc(buf);
    expect(doc).not.toContain("Heading1");
    expect(doc).toContain('<w:sz w:val="32"/>');
  });

  it("resolves localised style ids by name", () => {
    const styles = `<w:styles xmlns:w="x"><w:style w:type="paragraph" w:styleId="berschrift1"><w:name w:val="heading 1"/></w:style></w:styles>`;
    expect(resolveStyles(styles).Heading1).toBe("berschrift1");
    expect(resolveStyles(styles).Heading2).toBeNull();
  });

  it("injectBody rejects a document without a body", () => {
    expect(() => injectBody("<w:document/>", "<w:p/>")).toThrow();
  });
});

describe("docxFileName", () => {
  it("strips characters Windows rejects", () => {
    expect(docxFileName('Q3: "Agent" letter / draft?', 4)).toBe("Q3 Agent letter draft v4.docx");
  });
});
