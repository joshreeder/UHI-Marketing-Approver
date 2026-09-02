import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { addDays, differenceInHours } from "date-fns";
import { db } from "@/lib/db";
import { approvals, comments, items, projects, reviewRounds, users, versions, type Approval, type User } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { AllApprovedEmail, ApprovalRequestEmail, DecisionEmail, NewVersionEmail, ReminderEmail } from "@/lib/email/templates";
import { displayName, fmtDueLong } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { refreshProjectStatus, teamRecipientsForVersion } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const NUDGE_COOLDOWN_HOURS = 1;

export function reviewUrl(token: string): string {
  return `${env.APP_URL}/review/${encodeURIComponent(token)}`;
}

export function itemUrl(itemId: string): string {
  return `${env.APP_URL}/items/${itemId}`;
}

async function versionContext(versionId: string) {
  const [row] = await db
    .select({ version: versions, item: items, project: projects })
    .from(versions)
    .innerJoin(items, eq(items.id, versions.itemId))
    .innerJoin(projects, eq(projects.id, items.projectId))
    .where(eq(versions.id, versionId))
    .limit(1);
  if (!row) throw new Error("Version not found");
  return row;
}

/** Finds or creates approver users for a list of emails (lower-cased, de-duplicated). */
async function ensureApproverUsers(emails: string[]): Promise<User[]> {
  const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (clean.length === 0) return [];
  const existing = await db.select().from(users).where(inArray(users.email, clean));
  const known = new Set(existing.map((u) => u.email));
  const missing = clean.filter((e) => !known.has(e));
  const created = missing.length
    ? await db
        .insert(users)
        .values(missing.map((email) => ({ email, role: "approver" as const })))
        .returning()
    : [];
  return [...existing, ...created];
}

type StartRoundInput = {
  versionId: string;
  approverEmails: string[];
  reviewWindowDays: number;
  note?: string | null;
  actor: User;
  /** Internal: which email template to use. */
  template?: "request" | "new_version";
};

/**
 * Creates the review round for a version, one approval per approver (each with a fresh
 * scoped token), emails everyone, and logs activity. Returns the round id.
 */
export async function startRound(input: StartRoundInput): Promise<{ roundId: string; sent: number; failed: string[] }> {
  const { version, item, project } = await versionContext(input.versionId);
  const existing = await db.select().from(reviewRounds).where(eq(reviewRounds.versionId, version.id)).limit(1);
  if (existing[0]) throw new Error("This version was already sent for approval.");

  const approverUsers = await ensureApproverUsers(input.approverEmails);
  if (approverUsers.length === 0) throw new Error("Add at least one approver email.");

  const now = new Date();
  const dueAt = addDays(now, Math.max(1, input.reviewWindowDays));
  const [round] = await db
    .insert(reviewRounds)
    .values({ versionId: version.id, status: "pending", dueAt, sentAt: now })
    .returning();

  const tokens = new Map<string, string>();
  await db.insert(approvals).values(
    approverUsers.map((u) => {
      const token = generateToken();
      tokens.set(u.id, token);
      return { roundId: round.id, userId: u.id, tokenHash: hashToken(token), lastEmailedAt: now };
    }),
  );

  const Template = input.template === "new_version" ? NewVersionEmail : ApprovalRequestEmail;
  const failed: string[] = [];
  for (const u of approverUsers) {
    const result = await sendEmail({
      to: u.email,
      replyTo: input.actor.email,
      subject:
        input.template === "new_version"
          ? `New version ready — ${item.title} v${version.number}`
          : `${displayName(input.actor)} needs your approval on ${item.title}`,
      react: Template({
        projectName: project.name,
        itemTitle: item.title,
        versionNumber: version.number,
        requesterName: displayName(input.actor),
        dueText: fmtDueLong(dueAt),
        reviewUrl: reviewUrl(tokens.get(u.id)!),
        note: input.note ?? version.note,
      }),
    });
    if (!result.ok) {
      failed.push(u.email);
      await logActivity({ projectId: project.id, itemId: item.id, versionId: version.id, actorId: input.actor.id, type: "email_failed", meta: { target: u.email, error: result.error } });
    }
  }

  await logActivity({
    projectId: project.id,
    itemId: item.id,
    versionId: version.id,
    actorId: input.actor.id,
    type: "round_sent",
    meta: { versionNumber: version.number, count: approverUsers.length, approvers: approverUsers.map((u) => u.email) },
  });
  await refreshProjectStatus(project.id);
  return { roundId: round.id, sent: approverUsers.length - failed.length, failed };
}

/**
 * When a new version is uploaded: mark the previous version's round superseded, copy its
 * approvers to a fresh round on the new version, and email them. No-op when the previous
 * version was never sent.
 */
export async function supersedeWithNewVersion(input: { previousVersionId: string; newVersionId: string; actor: User; reviewWindowDays: number }) {
  const prev = await db.query.reviewRounds.findFirst({
    where: eq(reviewRounds.versionId, input.previousVersionId),
    with: { approvals: { with: { user: true } } },
  });
  if (!prev) return null;
  const { version, item, project } = await versionContext(input.newVersionId);

  if (prev.status !== "superseded") {
    await db.update(reviewRounds).set({ status: "superseded" }).where(eq(reviewRounds.id, prev.id));
    await logActivity({
      projectId: project.id,
      itemId: item.id,
      versionId: version.id,
      actorId: input.actor.id,
      type: "round_superseded",
      meta: { versionNumber: version.number, supersededVersionId: input.previousVersionId },
    });
  }

  return startRound({
    versionId: input.newVersionId,
    approverEmails: prev.approvals.map((a) => a.user.email),
    reviewWindowDays: input.reviewWindowDays,
    actor: input.actor,
    template: "new_version",
  });
}

/** Rotates the scoped token for an approval (used when a link expired) and returns the new raw token. */
export async function rotateApprovalToken(approvalId: string): Promise<string> {
  const token = generateToken();
  await db.update(approvals).set({ tokenHash: hashToken(token) }).where(eq(approvals.id, approvalId));
  return token;
}

/** Sends a reminder for a waiting approval. Enforces the 1/hour cooldown for every kind. */
export async function sendReminder(
  approvalId: string,
  opts: { kind: "nudge" | "halfway" | "due"; actor?: User | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await db.query.approvals.findFirst({
    where: eq(approvals.id, approvalId),
    with: { user: true, round: { with: { version: { with: { item: { with: { project: true } } } } } } },
  });
  if (!a) return { ok: false, error: "Approver not found." };
  if (a.status !== "waiting") return { ok: false, error: "This approver has already responded." };
  if (a.round.status === "superseded" || a.round.status === "approved") return { ok: false, error: "This round is closed." };
  if (a.lastEmailedAt && differenceInHours(new Date(), a.lastEmailedAt) < NUDGE_COOLDOWN_HOURS) {
    return { ok: false, error: "Already emailed within the last hour. Try again later." };
  }

  const token = await rotateApprovalToken(a.id);
  const item = a.round.version.item;
  const overdue = a.round.dueAt < new Date();
  const result = await sendEmail({
    to: a.user.email,
    replyTo: opts.actor?.email,
    subject: `${overdue ? "Overdue" : "Reminder"}: ${item.title} is waiting on your approval`,
    react: ReminderEmail({
      projectName: item.project.name,
      itemTitle: item.title,
      versionNumber: a.round.version.number,
      requesterName: opts.actor ? displayName(opts.actor) : "The marketing team",
      nudgedBy: opts.actor ? displayName(opts.actor) : null,
      dueText: fmtDueLong(a.round.dueAt),
      reviewUrl: reviewUrl(token),
      overdue,
    }),
  });
  if (!result.ok) return { ok: false, error: result.error };

  const now = new Date();
  await db
    .update(approvals)
    .set({ lastEmailedAt: now, reminderCount: a.reminderCount + 1 })
    .where(eq(approvals.id, a.id));
  await logActivity({
    projectId: item.projectId,
    itemId: item.id,
    versionId: a.round.versionId,
    actorId: opts.actor?.id ?? null,
    type: opts.kind === "nudge" ? "nudged" : "reminder_sent",
    meta: { target: a.user.email, kind: opts.kind, versionNumber: a.round.version.number },
  });
  return { ok: true };
}

/** Records an approver's decision, updates the round, and notifies the team. */
export async function recordDecision(input: {
  approvalId: string;
  decision: "approved" | "changes_requested";
  comment?: string | null;
  actor: User;
}): Promise<{ ok: true; roundStatus: string } | { ok: false; error: string }> {
  const a = await db.query.approvals.findFirst({
    where: eq(approvals.id, input.approvalId),
    with: { user: true, round: { with: { approvals: { with: { user: true } }, version: { with: { item: { with: { project: true } } } } } } },
  });
  if (!a) return { ok: false, error: "Approval not found." };
  if (a.userId !== input.actor.id) return { ok: false, error: "This approval belongs to someone else." };
  if (a.round.status === "superseded") return { ok: false, error: "A newer version replaced this one. Check your email for the new link." };
  if (input.decision === "changes_requested" && !input.comment?.trim()) {
    return { ok: false, error: "Tell the designer what needs to change." };
  }

  const now = new Date();
  const version = a.round.version;
  const item = version.item;
  const project = item.project;

  await db.update(approvals).set({ status: input.decision, decidedAt: now }).where(eq(approvals.id, a.id));
  const commentText = input.comment?.trim();
  if (commentText) {
    await db.insert(comments).values({ approvalId: a.id, versionId: version.id, authorId: input.actor.id, body: commentText });
  }

  const others = a.round.approvals.filter((x) => x.id !== a.id);
  const allApproved = input.decision === "approved" && others.every((x) => x.status === "approved");
  const anyChanges = input.decision === "changes_requested" || others.some((x) => x.status === "changes_requested");
  const roundStatus = allApproved ? "approved" : anyChanges ? "changes_requested" : "pending";
  await db
    .update(reviewRounds)
    .set({ status: roundStatus, completedAt: allApproved ? now : null })
    .where(eq(reviewRounds.id, a.round.id));

  await logActivity({
    projectId: project.id,
    itemId: item.id,
    versionId: version.id,
    actorId: input.actor.id,
    type: input.decision === "approved" ? "approver_approved" : "approver_changes_requested",
    meta: { versionNumber: version.number, comment: commentText ?? null },
  });
  if (allApproved) {
    await logActivity({ projectId: project.id, itemId: item.id, versionId: version.id, actorId: null, type: "round_approved", meta: { versionNumber: version.number } });
  } else if (input.decision === "changes_requested" && a.round.status !== "changes_requested") {
    await logActivity({ projectId: project.id, itemId: item.id, versionId: version.id, actorId: null, type: "round_changes_requested", meta: { versionNumber: version.number } });
  }

  const approvedCount = others.filter((x) => x.status === "approved").length + (input.decision === "approved" ? 1 : 0);
  const recipients = await teamRecipientsForVersion(project.id, version.uploadedBy);
  const to = recipients.map((r) => r.email).filter((e) => e !== input.actor.email);
  if (to.length) {
    await sendEmail({
      to,
      replyTo: input.actor.email,
      subject: `${displayName(a.user)} ${input.decision === "approved" ? "approved" : "requested changes on"} ${item.title} v${version.number}`,
      react: DecisionEmail({
        approverName: displayName(a.user),
        decision: input.decision,
        projectName: project.name,
        itemTitle: item.title,
        versionNumber: version.number,
        comments: commentText ? [commentText] : [],
        itemUrl: itemUrl(item.id),
        progress: `${approvedCount}/${a.round.approvals.length} approved`,
      }),
    });
    if (allApproved) {
      await sendEmail({
        to,
        subject: `Fully approved: ${item.title} v${version.number}`,
        react: AllApprovedEmail({
          projectName: project.name,
          itemTitle: item.title,
          versionNumber: version.number,
          approvers: a.round.approvals.map((x) => displayName(x.user)),
          itemUrl: itemUrl(item.id),
        }),
      });
    }
  }

  if (allApproved) {
    const settings = await getSettings();
    if (settings.autoCompleteOnApproval) {
      // Only auto-complete when every item in the project is approved.
      const { getProjectDetail } = await import("@/lib/queries");
      const detail = await getProjectDetail(project.id);
      if (detail && detail.status === "approved") {
        await db.update(projects).set({ status: "done" }).where(eq(projects.id, project.id));
        await logActivity({ projectId: project.id, actorId: null, type: "project_completed", meta: { auto: true } });
      }
    }
  }
  await refreshProjectStatus(project.id);
  return { ok: true, roundStatus };
}

export type { Approval };
export { and };
