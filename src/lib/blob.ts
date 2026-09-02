import "server-only";
import { get, put } from "@vercel/blob";
import { env } from "@/lib/env";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", DOCX_MIME, PPTX_MIME] as const;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function isAllowedMime(mime: string | null | undefined): boolean {
  return !!mime && (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(mime);
}

export function blobConfigured(): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN;
}

/** Server-side upload (used by the seed script and small files). Private by default. */
export async function uploadPrivate(pathname: string, body: Blob | Buffer | ArrayBuffer, contentType: string) {
  return put(pathname, body, { access: "private", contentType, addRandomSuffix: true });
}

/** Streams a private blob. Returns null when the blob does not exist. */
export async function readPrivate(urlOrPathname: string) {
  return get(urlOrPathname, { access: "private" });
}
