import { diffWordsWithSpace } from "diff";
import { htmlToText, wordCount } from "@/lib/copy";

export type DiffPart = { value: string; added?: boolean; removed?: boolean };

export type CopyDiff = {
  parts: DiffPart[];
  addedWords: number;
  removedWords: number;
  /** True when the two texts are identical. */
  unchanged: boolean;
};

/** Word-level diff between two copy versions' HTML, computed on their plain text. */
export function diffCopy(previousHtml: string, nextHtml: string): CopyDiff {
  const a = htmlToText(previousHtml);
  const b = htmlToText(nextHtml);
  const raw = diffWordsWithSpace(a, b);
  const parts: DiffPart[] = raw.map((p) => ({ value: p.value, added: p.added || undefined, removed: p.removed || undefined }));
  let addedWords = 0;
  let removedWords = 0;
  for (const p of parts) {
    if (p.added) addedWords += wordCount(p.value);
    else if (p.removed) removedWords += wordCount(p.value);
  }
  return { parts, addedWords, removedWords, unchanged: addedWords === 0 && removedWords === 0 && a === b };
}
