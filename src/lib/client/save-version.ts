"use client";

import { upload } from "@vercel/blob/client";
import { createCopyVersion, createVersion } from "@/app/(app)/items/actions";
import { createProjectItem, ensureProjectItem } from "@/app/(app)/projects/actions";
import { canonicalMime } from "@/lib/mime";
import { makeThumbnail } from "@/lib/client/thumbnail";
import type { CommentResolution } from "@/lib/resolutions";

export const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const MAX_BYTES = 500 * 1024 * 1024;

export function validateFile(f: File): string | null {
  const mime = canonicalMime(f.name, f.type);
  if (!ACCEPT.split(",").includes(mime)) return `“${f.name}” is not a supported type. Use PDF, Word (.docx), PowerPoint (.pptx), JPG, PNG, GIF or WebP.`;
  if (f.size > MAX_BYTES) return `Files must be 500 MB or smaller.`;
  return null;
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
}

export type SaveTarget =
  | { kind: "item"; itemId: string }
  | { kind: "project"; projectId: string } // first piece, named after the project
  | { kind: "new-item"; projectId: string; title?: string }; // another piece

export type SavePayload =
  | { mode: "file"; file: File; note: string; resolutions?: CommentResolution[] }
  | { mode: "copy"; body: string; subject: string; fromName: string; note: string; resolutions?: CommentResolution[] };

export type SaveResult = { ok: true; itemId: string; versionId?: string; message?: string } | { ok: false; error: string };

/** Resolves the item (creating it when needed), uploads or saves the copy, returns where it landed. */
export async function saveVersion(target: SaveTarget, payload: SavePayload, nextNumber: number, onProgress?: (pct: number) => void): Promise<SaveResult> {
  let itemId: string;
  if (target.kind === "item") itemId = target.itemId;
  else if (target.kind === "project") {
    const r = await ensureProjectItem(target.projectId);
    if (!r.ok) return r;
    itemId = r.itemId;
  } else {
    const title = target.title ?? (payload.mode === "file" ? titleFromFileName(payload.file.name) : payload.subject.trim() || "Email copy");
    const r = await createProjectItem(target.projectId, title);
    if (!r.ok) return r;
    itemId = r.itemId;
  }

  if (payload.mode === "file") {
    const mime = canonicalMime(payload.file.name, payload.file.type);
    const blob = await upload(`items/${itemId}/v${nextNumber}/${payload.file.name}`, payload.file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ itemId }),
      contentType: mime,
      multipart: payload.file.size > 20 * 1024 * 1024,
      onUploadProgress: (p) => onProgress?.(p.percentage),
    });
    let previewUrl: string | null = null;
    const thumb = await makeThumbnail(payload.file);
    if (thumb) {
      try {
        const t = await upload(`items/${itemId}/v${nextNumber}/thumb.jpg`, thumb, { access: "private", handleUploadUrl: "/api/upload", contentType: "image/jpeg" });
        previewUrl = t.url;
      } catch {
        previewUrl = null; // thumbnails are best-effort
      }
    }
    const r = await createVersion({ itemId, note: payload.note, fileUrl: blob.url, fileName: payload.file.name, mime, size: payload.file.size, previewUrl, resolutions: payload.resolutions });
    return r.ok ? { ok: true, itemId, versionId: r.versionId, message: r.message } : r;
  }
  const r = await createCopyVersion({ itemId, note: payload.note, subject: payload.subject, fromName: payload.fromName, body: payload.body, resolutions: payload.resolutions });
  return r.ok ? { ok: true, itemId, versionId: r.versionId, message: r.message } : r;
}
