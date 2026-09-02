import "server-only";
import mammoth from "mammoth";
import { readPrivate } from "@/lib/blob";

/**
 * Word → HTML preview via mammoth (no external service). Formatting is approximate; the original
 * stays downloadable. Returns null when conversion fails so the upload still succeeds.
 */
export async function docxToPreviewHtml(fileUrl: string): Promise<string | null> {
  try {
    const blob = await readPrivate(fileUrl);
    if (!blob) return null;
    const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer }, { convertImage: mammoth.images.imgElement(async (img) => ({ src: `data:${img.contentType};base64,${(await img.read("base64")) as string}` })) });
    // Defensive: mammoth output is plain structural HTML, but strip anything script-like anyway.
    const html = result.value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
    return html.trim() || null;
  } catch (e) {
    console.error("[docx] conversion failed", e);
    return null;
  }
}
