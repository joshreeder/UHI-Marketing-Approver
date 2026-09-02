"use client";

import { useEffect, useRef, useState } from "react";

type Props = { src: string; className?: string };

/** Renders every page of a PDF to canvases sized to the container width. */
export function PdfViewer({ src, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
        if (cancelled) return;
        setPages(doc.numPages);
        const width = container.clientWidth || 800;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "block rounded-md bg-white shadow-sm ring-1 ring-line";
          canvas.setAttribute("aria-label", `Page ${n} of ${doc.numPages}`);
          const wrapper = document.createElement("div");
          wrapper.className = "relative";
          wrapper.appendChild(canvas);
          const label = document.createElement("div");
          label.className = "pointer-events-none absolute bottom-2 right-2 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] text-white";
          label.textContent = `${n} / ${doc.numPages}`;
          wrapper.appendChild(label);
          container.appendChild(wrapper);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
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
      {pages == null && !error ? <p className="py-6 text-center text-sm text-slate">Loading preview…</p> : null}
      <div ref={containerRef} className="space-y-3" />
    </div>
  );
}
