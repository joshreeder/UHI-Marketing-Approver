import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { approvals, reviewRounds } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendReminder } from "@/lib/rounds";
import { getSettings } from "@/lib/settings";
import { isReminderHour, REMINDER_HOUR_LOCAL, getTimeZone } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminders. vercel.json fires this at 14:00 and 15:00 UTC (the two possible UTC hours for
 * 8 AM Mountain across daylight saving); only the run that lands on 8 AM in the company zone does
 * anything, so reminders go out at a fixed local time year-round. Pass ?force=1 to run regardless.
 * Each waiting approver gets at most one email at the halfway point of the review window and one
 * on/after the due date; sendReminder() also enforces the 1-hour cooldown shared with Nudge.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const settings = await getSettings();
  const now = new Date();
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!force && !isReminderHour(now)) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Not ${REMINDER_HOUR_LOCAL}:00 in ${getTimeZone()}`, at: now.toISOString() });
  }

  const rows = await db
    .select({ approval: approvals, round: reviewRounds })
    .from(approvals)
    .innerJoin(reviewRounds, eq(reviewRounds.id, approvals.roundId))
    .where(and(eq(approvals.status, "waiting"), inArray(reviewRounds.status, ["pending", "changes_requested"])));

  let halfway = 0;
  let due = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { approval, round } of rows) {
    const sent = round.sentAt.getTime();
    const dueAt = round.dueAt.getTime();
    const halfwayAt = sent + (dueAt - sent) / 2;
    const last = approval.lastEmailedAt?.getTime() ?? sent;

    let kind: "halfway" | "due" | null = null;
    if (settings.reminders.dueDateEnabled && now.getTime() >= dueAt && last < dueAt) kind = "due";
    else if (settings.reminders.halfwayEnabled && now.getTime() >= halfwayAt && now.getTime() < dueAt && last < halfwayAt) kind = "halfway";

    if (!kind) {
      skipped++;
      continue;
    }
    const r = await sendReminder(approval.id, { kind });
    if (r.ok) {
      if (kind === "due") due++;
      else halfway++;
    } else {
      errors.push(`${approval.id}: ${r.error}`);
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, halfway, due, skipped, errors, at: now.toISOString() });
}
