import { PdfViewer } from "./pdf-viewer";
import { CopyPreview } from "./copy-preview";
import { PinLayer, type Pin } from "./pin-layer";
import { isCopyVersion } from "@/lib/copy";
import type { Version } from "@/lib/db/schema";

/**
 * Preview with numbered comment pins. PDFs get a pin layer per page; images and copy get one layer.
 * `canPin` turns on click-to-comment (approvers on an open round).
 */
export function AnnotatedPreview({
  version,
  pins,
  canPin,
  approvalId,
  className,
}: {
  version: Version;
  pins: Pin[];
  canPin: boolean;
  approvalId?: string | null;
  className?: string;
}) {
  const layer = (pageNo: number | null) => <PinLayer pins={pins} pageNo={pageNo} canPin={canPin} versionId={version.id} approvalId={approvalId} />;

  if (isCopyVersion(version)) {
    return (
      <div className={className}>
        <div className="relative mx-auto max-w-2xl">
          <CopyPreview version={version} />
          {layer(null)}
        </div>
        {canPin ? <PinHint /> : null}
      </div>
    );
  }
  if (!version.fileUrl) {
    return (
      <div className={className}>
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line bg-white text-sm text-slate">No file attached to this version.</div>
      </div>
    );
  }
  const src = `/api/files/${version.id}`;
  if (version.mime === "application/pdf") {
    return (
      <div className={className}>
        <PdfViewer src={src} overlay={(page) => layer(page)} />
        {canPin ? <PinHint /> : null}
      </div>
    );
  }
  if (version.mime?.startsWith("image/")) {
    return (
      <div className={className}>
        <div className="relative mx-auto w-fit max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={version.fileName ?? `Version ${version.number}`} className="block max-h-[80vh] w-auto max-w-full rounded-md bg-white shadow-sm ring-1 ring-line" />
          {layer(null)}
        </div>
        {canPin ? <PinHint /> : null}
      </div>
    );
  }
  if (version.previewHtml) {
    return (
      <div className={className}>
        <div className="relative mx-auto max-w-2xl">
          <article
            className="rounded-md bg-white px-6 py-8 text-[15px] leading-7 text-ink shadow-sm ring-1 ring-line sm:px-10 sm:py-10 [&_h1]:mb-3 [&_h1]:text-2xl [&_h2]:mb-2 [&_h2]:text-xl [&_h3]:mb-2 [&_h3]:text-lg [&_li]:ml-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_p]:mb-4 [&_table]:mb-4 [&_table]:w-full [&_td]:border [&_td]:border-line [&_td]:p-1.5 [&_ul]:mb-4 [&_ul]:list-disc [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: version.previewHtml }}
          />
          {layer(null)}
        </div>
        <p className="mt-2 text-center text-xs text-slate">
          Converted from {version.fileName}. Formatting is approximate;{" "}
          <a href={`${src}?download=1`} className="text-navy underline">
            download the original
          </a>
          .
        </p>
        {canPin ? <PinHint /> : null}
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

function PinHint() {
  return <p className="mt-2 text-center text-xs text-slate">Click anywhere on the preview to pin a note to that spot.</p>;
}

/** Converts DB comments to pins (only those with a position). */
export function commentsToPins(
  comments: { id: string; body: string; x: number | null; y: number | null; pageNo: number | null; addressedInVersionId: string | null; author: { name: string | null; email: string } | null }[],
): Pin[] {
  let n = 0;
  return comments.map((c) => {
    n += 1;
    return {
      id: c.id,
      number: n,
      x: c.x ?? 0,
      y: c.y ?? 0,
      pageNo: c.pageNo,
      body: c.body,
      author: c.author ? c.author.name?.trim() || c.author.email : "Approver",
      addressed: !!c.addressedInVersionId,
      positioned: c.x != null && c.y != null,
    } as Pin & { positioned: boolean };
  }).filter((p) => (p as Pin & { positioned: boolean }).positioned);
}
