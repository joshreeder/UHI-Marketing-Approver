import { PdfViewer } from "./pdf-viewer";
import type { Version } from "@/lib/db/schema";

/** Big preview for a version: PDF via PDF.js, images natively. Served through /api/files with auth. */
export function FilePreview({ version, className }: { version: Version; className?: string }) {
  if (!version.fileUrl) {
    return (
      <div className={className}>
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line bg-white text-sm text-slate">
          No file attached to this version.
        </div>
      </div>
    );
  }
  const src = `/api/files/${version.id}`;
  if (version.mime === "application/pdf") {
    return <PdfViewer src={src} className={className} />;
  }
  if (version.mime?.startsWith("image/")) {
    return (
      <div className={className}>
        <a href={`${src}?download=1`} className="block" title="Download original">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={version.fileName ?? `Version ${version.number}`} className="mx-auto max-h-[80vh] w-auto max-w-full rounded-md bg-white shadow-sm ring-1 ring-line" />
        </a>
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm text-slate">
        <span>No inline preview for this file type.</span>
        <a href={`${src}?download=1`} className="text-navy underline">
          Download {version.fileName}
        </a>
      </div>
    </div>
  );
}
