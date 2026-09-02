/** Maps a file to a canonical MIME type, trusting the extension when the browser's type is missing or vendor-specific. */
const BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALIASES: Record<string, string> = {
  "application/x-pdf": "application/pdf",
  "application/acrobat": "application/pdf",
  "applications/vnd.pdf": "application/pdf",
  "text/pdf": "application/pdf",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
};

export function canonicalMime(fileName: string, reportedType: string | null | undefined): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const byExt = BY_EXT[ext];
  const reported = (reportedType ?? "").toLowerCase();
  if (byExt) return byExt; // the extension is the more reliable signal for these formats
  if (ALIASES[reported]) return ALIASES[reported];
  return reported;
}
