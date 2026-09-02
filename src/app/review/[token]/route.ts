import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { activity } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getApprovalByTokenHash } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { env } from "@/lib/env";
import { APPROVER_LINK_DAYS } from "@/lib/rounds-constants";

/**
 * Approver entry point from emails. Validates the scoped token, signs the approver in
 * with a session limited to this item, logs the view, and lands on the review page.
 * Reusable until the round is superseded or 30 days after it was sent.
 */
const SCANNER_UA = /safelinks|microsoft office|outlook|proofpoint|mimecast|barracuda|symantec|urldefense|headlesschrome|bot|crawler|spider|preview|slackbot|facebookexternalhit|twitterbot|linkedinbot/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ua = req.headers.get("user-agent") ?? "";
  const looksLikeScanner = !ua || SCANNER_UA.test(ua);
  const a = await getApprovalByTokenHash(hashToken(token));
  if (!a) return NextResponse.redirect(`${env.APP_URL}/review/expired`);

  const item = a.round.version.item;
  const expired = a.round.status === "superseded" || addDays(a.round.sentAt, APPROVER_LINK_DAYS) < new Date();
  if (expired) return NextResponse.redirect(`${env.APP_URL}/review/expired?item=${item.id}`);

  // Link scanners and preview bots: send them to the page without creating a session or logging a view.
  if (looksLikeScanner) return NextResponse.redirect(`${env.APP_URL}/review/item/${item.id}`);

  const { token: sessionToken, expiresAt } = await createSession(a.userId, item.id);

  // Log a view at most once per hour per approver per version to keep the audit log readable.
  const recent = await db
    .select({ id: activity.id })
    .from(activity)
    .where(
      and(
        eq(activity.actorId, a.userId),
        eq(activity.versionId, a.round.versionId),
        eq(activity.type, "approver_viewed"),
        gt(activity.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    )
    .orderBy(desc(activity.createdAt))
    .limit(1);
  if (recent.length === 0) {
    await logActivity({
      projectId: item.projectId,
      itemId: item.id,
      versionId: a.round.versionId,
      actorId: a.userId,
      type: "approver_viewed",
      meta: { versionNumber: a.round.version.number },
    });
  }

  const res = NextResponse.redirect(`${env.APP_URL}/review/item/${item.id}`);
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(expiresAt));
  return res;
}
