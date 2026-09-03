import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, versions } from "@/lib/db/schema";
import { canAccessItem, getSession } from "@/lib/auth/session";
import { readPrivate } from "@/lib/blob";
import { isCopyVersion } from "@/lib/copy";
import { buildCopyDocx, docxFileName } from "@/lib/docx-export";
import { getSettings } from "@/lib/settings";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/**
 * Downloads a copy version as a Word document. Uses the letterhead from Settings unless
 * `?letterhead=0`. Team sessions may export any version; approver sessions only their item's.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401 });

  const [v] = await db.select().from(versions).where(eq(versions.id, versionId)).limit(1);
  if (!v || !isCopyVersion(v)) return new NextResponse("Not found", { status: 404 });
  if (!canAccessItem(session, v.itemId)) return new NextResponse("Forbidden", { status: 403 });
  const [item] = await db.select().from(items).where(eq(items.id, v.itemId)).limit(1);
  if (!item) return new NextResponse("Not found", { status: 404 });

  const wantLetterhead = req.nextUrl.searchParams.get("letterhead") !== "0";
  let template: Buffer | null = null;
  let usedLetterhead = false;
  if (wantLetterhead) {
    const settings = await getSettings();
    if (settings.letterhead) {
      try {
        const blob = await readPrivate(settings.letterhead.url);
        if (blob) {
          template = Buffer.from(await new Response(blob.stream).arrayBuffer());
          usedLetterhead = true;
        }
      } catch (e) {
        console.error("[export] letterhead unavailable, exporting plain", e);
      }
    }
  }

  let file: Buffer;
  try {
    file = await buildCopyDocx({ html: v.emailHtml ?? "", title: item.title, subject: v.emailSubject, versionNumber: v.number, template });
  } catch (e) {
    if (!template) throw e;
    console.error("[export] letterhead failed, exporting plain", e);
    file = await buildCopyDocx({ html: v.emailHtml ?? "", title: item.title, subject: v.emailSubject, versionNumber: v.number });
    usedLetterhead = false;
  }

  if (session.isTeam) {
    await logActivity({ projectId: item.projectId, itemId: item.id, versionId: v.id, actorId: session.user.id, type: "docx_exported", meta: { versionNumber: v.number, letterhead: usedLetterhead } });
  }

  const filename = docxFileName(item.title, v.number).replace(/["\r\n]/g, "");
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
