import { describe, expect, it } from "vitest";
import { htmlToText, isCopyEmpty, textToHtml, wordCount } from "./copy";
import { diffCopy } from "./copy-diff";

describe("htmlToText", () => {
  it("round-trips the legacy paragraph format", () => {
    const html = textToHtml("Line one\nLine two\n\nSecond paragraph");
    expect(htmlToText(html)).toBe("Line one\nLine two\n\nSecond paragraph");
  });

  it("flattens headings, lists and inline marks from the editor", () => {
    const html = "<h1>Title</h1><p>Hello <strong>bold</strong> and <a href=\"https://x\">link</a>.</p><ul><li>One</li><li>Two</li></ul><p>&amp; done&nbsp;</p>";
    expect(htmlToText(html)).toBe("Title\n\nHello bold and link.\n\n• One\n• Two\n\n& done");
  });

  it("treats a lone empty paragraph as empty", () => {
    expect(isCopyEmpty("<p></p>")).toBe(true);
    expect(isCopyEmpty("<p> <br> </p>")).toBe(true);
    expect(isCopyEmpty("<p>x</p>")).toBe(false);
  });
});

describe("diffCopy", () => {
  it("reports added and removed words", () => {
    const d = diffCopy("<p>Rates go up next month.</p>", "<p>Rates go up on October 1.</p>");
    expect(d.unchanged).toBe(false);
    expect(d.addedWords).toBe(3);
    expect(d.removedWords).toBe(2);
    expect(d.parts.some((p) => p.added && p.value.includes("October"))).toBe(true);
  });

  it("is unchanged when only markup differs", () => {
    const d = diffCopy("<p>Same <b>text</b></p>", "<p>Same text</p>");
    expect(d.unchanged).toBe(true);
  });

  it("counts words", () => {
    expect(wordCount("  a b   c ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });
});
