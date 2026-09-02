"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { approvals, comments, users } from "@/lib/db/schema";
import { canAccessItem, getSession } from "@/lib/auth/session";
import { getItemDetail } from "@/lib/queries";
import { recordDecision, reviewUrl, rotateApprovalToken } from "@/lib/rounds";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email/send";
import { ApprovalRequestEmail } from "@/lib/email/templates";
import { displayName, fmtDueLong } from "@/lib/format";

export type DecisionState = { error?: string; done?: "approved" | "changes_requested" };

const decisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["approved", "changes_requested"]),
  comment: z.string().trim().max(5000).optional().default(""),
});

export async function submitDecision(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  const session = await getSession();
  if (!session) return { error: "Your link has expired. Open the latest email to sign in again." };
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Something was missing. Try again." };
  const d = parsed.data;

  const [a] = await db.select().from(approvals).where(eq(approvals.id, d.approvalId)).limit(1);
  if (!a || a.userId !== session.user.id) return { error: "This approval is not yours." };

  const result = await recordDecision({ approvalId: a.id, decision: d.decision, comment: d.comment || null, actor: session.user });
  if (!result.ok) return { error: result.error };
  revalidatePath("/review/item/[itemId]", "page");
  return { done: d.decision };
}

const commentSchema = z.object({
  versionId: z.string().uuid(),
  approvalId: z.string().uuid().optional(),
  body: z.string().trim().min(1, "Write a comment first.").max(5000),
  pageNo: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).nullable()).optional(),
  x: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1).nullable()).optional(),
  y: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1).nullable()).optional(),
});

export type CommentState = { error?: string; ok?: boolean };

/** Extra comment after a decision (approvers can keep weighing in). */
export async function addComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const session = await getSession();
  if (!session) return { error: "Your link has expired." };
  const parsed = commentSchema.safeParse({
    versionId: formData.get("versionId"),
    approvalId: formData.get("approvalId") || undefined,
    body: formData.get("body"),
    pageNo: formData.get("pageNo"),
    x: formData.get("x"),
    y: formData.get("y"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const detail = await db.query.versions.findFirst({ where: (v, { eq: e }) => e(v.id, d.versionId), with: { item: true } });
  if (!detail || !canAccessItem(session, detail.itemId)) return { error: "Not allowed." };

  await db.insert(comments).values({
    versionId: d.versionId,
    approvalId: d.approvalId ?? null,
    authorId: session.user.id,
    body: d.body,
    pageNo: d.pageNo ?? null,
    x: d.x ?? null,
    y: d.y ?? null,
  });
  await logActivity({ projectId: detail.item.projectId, itemId: detail.itemId, versionId: d.versionId, actorId: session.user.id, type: "comment_added", meta: { versionNumber: detail.number, pinned: d.x != null } });
  revalidatePath("/review/item/[itemId]", "page");
  revalidatePath(`/items/${detail.itemId}`);
  return { ok: true };
}

export type ResendState = { error?: string; ok?: boolean };

/** "Link expired — enter your email and we'll send a fresh one." */
export async function resendApproverLink(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  const itemId = z.string().uuid().safeParse(formData.get("itemId"));
  if (!email.success) return { error: "Enter a valid email address." };
  // Always respond the same way so the form cannot be used to probe who is an approver.
  if (!itemId.success) return { ok: true };

  const detail = await getItemDetail(itemId.data);
  const round = detail?.current?.round;
  const [user] = await db.select().from(users).where(eq(users.email, email.data)).limit(1);
  const approval = round && user ? round.approvals.find((a) => a.userId === user.id) : null;
  if (!detail || !round || !approval || round.status === "superseded") return { ok: true };

  const token = await rotateApprovalToken(approval.id);
  const [uploader] = await db.select().from(users).where(eq(users.id, detail.current!.uploadedBy)).limit(1);
  await sendEmail({
    to: email.data,
    replyTo: uploader?.email,
    subject: `Your review link for ${detail.item.title}`,
    react: ApprovalRequestEmail({
      projectName: detail.project.name,
      itemTitle: detail.item.title,
      versionNumber: detail.current!.number,
      requesterName: uploader ? displayName(uploader) : "The marketing team",
      dueText: fmtDueLong(round.dueAt),
      reviewUrl: reviewUrl(token),
      note: "Here is a fresh link, as requested.",
    }),
  });
  return { ok: true };
}
