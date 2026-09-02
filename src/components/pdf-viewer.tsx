"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Props = {
  src: string;
  className?: string;
  /** Optional overlay rendered on top of each page (pins, click targets). Receives 1-based page number. */
  overlay?: (page: number) => React.ReactNode;
};

/** Renders every page of a PDF to canvases sized to the container width, one React node per page so overlays can be attached. */
export function PdfViewer({ src, className, overlay }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loaded = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
        if (!cancelled) setDoc(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not render this PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={className}>
      {error ? (
        <div className="rounded-md bg-brand-red-tint px-3 py-2 text-sm text-brand-red">
          {error}{" "}
          <a href={src} className="underline" target="_blank" rel="noreferrer">
            Open the PDF directly
          </a>
        </div>
      ) : null}
      {!doc && !error ? <p className="py-6 text-center text-sm text-slate">Loading preview…</p> : null}
      {doc ? (
        <div className="space-y-3">
          {Array.from({ length: doc.numPages }, (_, i) => (
            <PdfPage key={i + 1} doc={doc} page={i + 1} total={doc.numPages} overlay={overlay?.(i + 1)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PdfPage({ doc, page, total, overlay }: { doc: PDFDocumentProxy; page: number; total: number; overlay?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const p = await doc.getPage(page);
      if (cancelled) return;
      const width = wrap.clientWidth || 800;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const base = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({ scale: (width / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await p.render({ canvasContext: ctx, viewport, canvas }).promise;
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc, page]);

  return (
    <div ref={wrapRef} className="relative" data-page={page}>
      <canvas ref={canvasRef} className="block h-auto w-full rounded-md bg-white shadow-sm ring-1 ring-line" aria-label={`Page ${page} of ${total}`} />
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] text-white">
        {page} / {total}
      </div>
      {overlay}
    </div>
  );
}
