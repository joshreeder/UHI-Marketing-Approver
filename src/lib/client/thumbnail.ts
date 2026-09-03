"use client";

import { canonicalMime } from "@/lib/mime";

const THUMB_WIDTH = 320;

/**
 * Builds a small JPEG thumbnail in the uploader's browser: first page of a PDF, or the image scaled down.
 * Returns null for formats we cannot rasterize client-side (Word, PowerPoint) or on any failure.
 */
export async function makeThumbnail(file: File): Promise<Blob | null> {
  try {
    const mime = canonicalMime(file.name, file.type);
    if (mime === "application/pdf") return await pdfThumb(file);
    if (mime.startsWith("image/")) return await imageThumb(file);
    return null;
  } catch {
    return null;
  }
}

async function pdfThumb(file: File): Promise<Blob | null> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return toJpeg(canvas);
}

async function imageThumb(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = Math.min(1, THUMB_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return toJpeg(canvas);
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
}
