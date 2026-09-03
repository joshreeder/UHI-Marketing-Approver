import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { describeDocxReview, reviewDocx, reviewDocxParts, unresolvedCount } from "./docx-review";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"';

const docWithMarkup = `<?xml version="1.0"?><w:document ${W}><w:body>
<w:p><w:r><w:t>Dear agents,</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Rates go up </w:t></w:r>
  <w:ins w:id="1" w:author="Pat Lee" w:date="2026-09-01T10:00:00Z"><w:r><w:t>on October 1</w:t></w:r></w:ins>
  <w:del w:id="2" w:author="Pat Lee" w:date="2026-09-01T10:00:00Z"><w:r><w:delText>next month</w:delText></w:r></w:del>
  <w:r><w:t>.</w:t></w:r></w:p>
<w:p><w:pPr><w:rPr><w:ins w:id="3" w:author="Sam" w:date="2026-09-01T10:00:00Z"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:rPrChange w:id="4" w:author="Sam" w:date="2026-09-01T10:00:00Z"><w:rPr/></w:rPrChange></w:rPr><w:t>Thanks &amp; regards</w:t></w:r></w:p>
</w:body></w:document>`;

const comments = `<?xml version="1.0"?><w:comments ${W}>
<w:comment w:id="0" w:author="Compliance" w:date="2026-09-01T11:00:00Z" w:initials="C"><w:p w14:paraId="1A2B3C4D"><w:r><w:t>Needs the disclosure line.</w:t></w:r></w:p></w:comment>
<w:comment w:id="1" w:author="Pat Lee" w:date="2026-09-01T11:30:00Z"><w:p w14:paraId="AAAAAAAA"><w:r><w:t>Fixed the date.</w:t></w:r></w:p></w:comment>
</w:comments>`;

const commentsExtended = `<?xml version="1.0"?><w15:commentsEx xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
<w15:commentEx w15:paraId="AAAAAAAA" w15:done="1"/>
</w15:commentsEx>`;

describe("reviewDocxParts", () => {
  it("counts insertions, deletions, formatting changes and comments", () => {
    const r = reviewDocxParts({ documentXml: docWithMarkup, commentsXml: comments, commentsExtendedXml: commentsExtended, settingsXml: `<w:settings ${W}><w:trackRevisions/></w:settings>` });
    expect(r.insertions).toBe(2); // one text insertion + one inserted paragraph mark
    expect(r.deletions).toBe(1);
    expect(r.formatting).toBe(1);
    expect(r.comments).toBe(2);
    expect(r.resolvedComments).toBe(1);
    expect(r.trackChangesOn).toBe(true);
    expect(r.authors).toEqual(["Compliance", "Pat Lee", "Sam"]);
    expect(r.changes.find((c) => c.kind === "insert")?.text).toBe("on October 1");
    expect(r.changes.find((c) => c.kind === "delete")?.text).toBe("next month");
    expect(r.commentList[0]).toMatchObject({ author: "Compliance", text: "Needs the disclosure line.", resolved: false });
    expect(r.commentList[1].resolved).toBe(true);
    expect(unresolvedCount(r)).toBe(5);
    expect(describeDocxReview(r)).toBe("4 tracked changes and 1 open comment");
  });

  it("reports a clean file as clean", () => {
    const r = reviewDocxParts({ documentXml: `<w:document ${W}><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>` });
    expect(unresolvedCount(r)).toBe(0);
    expect(describeDocxReview(r)).toBeNull();
    expect(r.trackChangesOn).toBe(false);
  });

  it("does not mistake w:pPr or w:instrText for tracked changes", () => {
    const xml = `<w:document ${W}><w:body><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:instrText>PAGE</w:instrText><w:t>x</w:t></w:r></w:p></w:body></w:document>`;
    const r = reviewDocxParts({ documentXml: xml });
    expect(r.insertions).toBe(0);
  });
});

describe("reviewDocx (zip)", () => {
  it("reads the parts out of a .docx", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", docWithMarkup);
    zip.file("word/comments.xml", comments);
    const buf = await zip.generateAsync({ type: "uint8array" });
    const r = await reviewDocx(buf);
    expect(r?.deletions).toBe(1);
    expect(r?.comments).toBe(2);
    expect(r?.resolvedComments).toBe(0);
  });

  it("returns null for something that is not a Word file", async () => {
    expect(await reviewDocx(new Uint8Array([1, 2, 3]))).toBeNull();
    const zip = new JSZip();
    zip.file("hello.txt", "hi");
    expect(await reviewDocx(await zip.generateAsync({ type: "uint8array" }))).toBeNull();
  });
});
