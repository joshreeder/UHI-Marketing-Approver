import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { versions } from "@/lib/db/schema";
import { canAccessItem, getSession } from "@/lib/auth/session";
import { readPrivate } from "@/lib/blob";

/**
 * Streams a version's file from private Blob storage. Team sessions may read any file;
 * approver sessions only files on the item their link was for.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401 });

  const [v] = await db.select().from(versions).where(eq(versions.id, versionId)).limit(1);
  if (!v || !v.fileUrl) return new NextResponse("Not found", { status: 404 });
  if (!canAccessItem(session, v.itemId)) return new NextResponse("Forbidden", { status: 403 });

  const blob = await readPrivate(v.fileUrl);
  if (!blob) return new NextResponse("File missing", { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const filename = (v.fileName ?? `version-${v.number}`).replace(/["\r\n]/g, "");
  const headers = new Headers();
  headers.set("Content-Type", v.mime ?? blob.headers.get("content-type") ?? "application/octet-stream");
  headers.set("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${filename}"`);
  headers.set("Cache-Control", "private, max-age=300");
  const len = blob.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new NextResponse(blob.stream, { headers });
}
