import "server-only";
import mammoth from "mammoth";
import { readPrivate } from "@/lib/blob";
import { reviewDocx, type DocxReview } from "@/lib/docx-review";

async function readBuffer(fileUrl: string): Promise<Buffer | null> {
  const blob = await readPrivate(fileUrl);
  if (!blob) return null;
  return Buffer.from(await new Response(blob.stream).arrayBuffer());
}

/**
 * Word → HTML preview via mammoth (no external service). Formatting is approximate; the original
 * stays downloadable. Returns null when conversion fails so the upload still succeeds.
 *
 * mammoth renders the document as if every tracked change were accepted and drops comments, so
 * the preview never shows markup; `inspectDocx` records what the file actually contains.
 */
export async function docxToPreviewHtml(fileUrl: string): Promise<string | null> {
  try {
    const buffer = await readBuffer(fileUrl);
    if (!buffer) return null;
    return docxBufferToPreviewHtml(buffer);
  } catch (e) {
    console.error("[docx] conversion failed", e);
    return null;
  }
}

export async function docxBufferToPreviewHtml(buffer: Buffer): Promise<string | null> {
  const result = await mammoth.convertToHtml({ buffer }, { convertImage: mammoth.images.imgElement(async (img) => ({ src: `data:${img.contentType};base64,${(await img.read("base64")) as string}` })) });
  // Defensive: mammoth output is plain structural HTML, but strip anything script-like anyway.
  const html = result.value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
  return html.trim() || null;
}

/** Preview HTML and tracked-change summary for an uploaded Word file, reading the blob once. */
export async function processDocxUpload(fileUrl: string): Promise<{ previewHtml: string | null; docxReview: DocxReview | null }> {
  try {
    const buffer = await readBuffer(fileUrl);
    if (!buffer) return { previewHtml: null, docxReview: null };
    const [previewHtml, docxReview] = await Promise.all([
      docxBufferToPreviewHtml(buffer).catch((e) => {
        console.error("[docx] conversion failed", e);
        return null;
      }),
      reviewDocx(buffer).catch((e) => {
        console.error("[docx] inspection failed", e);
        return null;
      }),
    ]);
    return { previewHtml, docxReview };
  } catch (e) {
    console.error("[docx] processing failed", e);
    return { previewHtml: null, docxReview: null };
  }
}
