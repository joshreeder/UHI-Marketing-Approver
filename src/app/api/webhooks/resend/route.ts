import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { approvals, reviewRounds, versions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/**
 * Resend → us. Records the first open / click per approval so the item page can show
 * "Opened email Tue 2:14 pm". Signatures use the Svix scheme: HMAC-SHA256 over
 * `${id}.${timestamp}.${body}` with the base64 secret after "whsec_".
 */
function verify(req: NextRequest, body: string): boolean {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigs = req.headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return sigs.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

type Tags = Record<string, string> | { name: string; value: string }[];
type ResendEvent = {
  type: string;
  created_at?: string;
  data?: { email_id?: string; tags?: Tags };
};

function tagValue(tags: Tags | undefined, name: string): string | undefined {
  if (!tags) return undefined;
  if (Array.isArray(tags)) return tags.find((t) => t.name === name)?.value;
  return tags[name];
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verify(req, body)) return new NextResponse("Invalid signature", { status: 401 });

  let event: ResendEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const approvalId = tagValue(event.data?.tags, "approval_id");
  const when = event.created_at ? new Date(event.created_at) : new Date();
  if (!approvalId || !/^[0-9a-f-]{36}$/.test(approvalId)) return NextResponse.json({ ignored: true });

  if (event.type === "email.opened") {
    const [row] = await db
      .update(approvals)
      .set({ emailOpenedAt: when })
      .where(and(eq(approvals.id, approvalId), isNull(approvals.emailOpenedAt)))
      .returning();
    if (row) {
      const ctx = await db
        .select({ itemId: versions.itemId, versionId: versions.id, number: versions.number })
        .from(reviewRounds)
        .innerJoin(versions, eq(versions.id, reviewRounds.versionId))
        .where(eq(reviewRounds.id, row.roundId))
        .limit(1);
      const c = ctx[0];
      if (c) {
        const item = await db.query.items.findFirst({ where: (t, { eq: e }) => e(t.id, c.itemId), columns: { projectId: true } });
        if (item) await logActivity({ projectId: item.projectId, itemId: c.itemId, versionId: c.versionId, actorId: row.userId, type: "email_opened", meta: { versionNumber: c.number } });
      }
    }
  } else if (event.type === "email.clicked") {
    await db.update(approvals).set({ emailClickedAt: when }).where(and(eq(approvals.id, approvalId), isNull(approvals.emailClickedAt)));
  }
  return NextResponse.json({ ok: true });
}
