"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { comments, items, versions } from "@/lib/db/schema";
import { requireTeam } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { isAllowedMime, MAX_UPLOAD_BYTES } from "@/lib/blob";
import { refreshProjectStatus } from "@/lib/queries";
import { sendReminder, startRound, supersedeWithNewVersion } from "@/lib/rounds";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function loadItem(itemId: string) {
  const [row] = await db.query.items.findMany({ where: eq(items.id, itemId), with: { project: true }, limit: 1 });
  if (!row) throw new Error("Item not found");
  return row;
}

const versionSchema = z.object({
  itemId: z.string().uuid(),
  note: z.string().trim().max(2000).optional().default(""),
  fileUrl: z.string().url(),
  fileName: z.string().min(1).max(300),
  mime: z.string().min(1),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
});

/** Called by the upload dialog after the browser has put the file in Blob storage. */
export async function createVersion(input: z.input<typeof versionSchema>): Promise<ActionResult & { versionId?: string }> {
  const session = await requireTeam();
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Upload details were incomplete. Try again." };
  const d = parsed.data;
  if (!isAllowedMime(d.mime)) return { ok: false, error: "Only PDF, JPG, PNG, GIF and WebP files are supported." };

  const item = await loadItem(d.itemId);
  const [prev] = await db.select().from(versions).where(eq(versions.itemId, item.id)).orderBy(desc(versions.number)).limit(1);
  const number = (prev?.number ?? 0) + 1;

  const [version] = await db
    .insert(versions)
    .values({
      itemId: item.id,
      number,
      note: d.note || null,
      uploadedBy: session.user.id,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      mime: d.mime,
      size: d.size,
    })
    .returning();
  await logActivity({
    projectId: item.projectId,
    itemId: item.id,
    versionId: version.id,
    actorId: session.user.id,
    type: "version_uploaded",
    meta: { versionNumber: number, note: d.note || null, fileName: d.fileName },
  });

  let message = `v${number} uploaded.`;
  if (prev) {
    const result = await supersedeWithNewVersion({
      previousVersionId: prev.id,
      newVersionId: version.id,
      actor: session.user,
      reviewWindowDays: item.reviewWindowDays ?? item.project.reviewWindowDays,
    });
    if (result) message = `v${number} uploaded and sent to ${result.sent} approver${result.sent === 1 ? "" : "s"}.`;
  }
  await refreshProjectStatus(item.projectId);
  revalidatePath(`/items/${item.id}`);
  revalidatePath(`/projects/${item.projectId}`);
  revalidatePath("/");
  return { ok: true, message, versionId: version.id };
}

const sendSchema = z.object({
  versionId: z.string().uuid(),
  emails: z.string().trim().min(1, "Add at least one approver email."),
  reviewWindowDays: z.preprocess((v) => Number(v), z.number().int().min(1).max(60)),
  note: z.string().trim().max(2000).optional().default(""),
});

export type SendState = { error?: string; success?: string };

export async function sendForApproval(_prev: SendState, formData: FormData): Promise<SendState> {
  const session = await requireTeam();
  const parsed = sendSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const emails = d.emails
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const bad = emails.filter((e) => !z.string().email().safeParse(e).success);
  if (bad.length) return { error: `Not a valid email: ${bad.join(", ")}` };

  const [version] = await db.select().from(versions).where(eq(versions.id, d.versionId)).limit(1);
  if (!version) return { error: "Version not found." };
  const item = await loadItem(version.itemId);

  try {
    const result = await startRound({ versionId: version.id, approverEmails: emails, reviewWindowDays: d.reviewWindowDays, note: d.note || null, actor: session.user });
    if (item.reviewWindowDays !== d.reviewWindowDays) {
      await db.update(items).set({ reviewWindowDays: d.reviewWindowDays }).where(eq(items.id, item.id));
    }
    revalidatePath(`/items/${item.id}`);
    revalidatePath(`/projects/${item.projectId}`);
    revalidatePath("/");
    const failed = result.failed.length ? ` Email failed for ${result.failed.join(", ")}.` : "";
    return { success: `Sent to ${result.sent} approver${result.sent === 1 ? "" : "s"}.${failed}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not send." };
  }
}

export async function nudgeApprover(approvalId: string): Promise<ActionResult> {
  const session = await requireTeam();
  const result = await sendReminder(approvalId, { kind: "nudge", actor: session.user });
  if (!result.ok) return result;
  revalidatePath("/items/[id]", "page");
  return { ok: true, message: "Reminder sent." };
}

export async function markCommentAddressed(commentId: string, addressedInVersionId: string | null): Promise<ActionResult> {
  const session = await requireTeam();
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!c) return { ok: false, error: "Comment not found." };
  await db.update(comments).set({ addressedInVersionId }).where(and(eq(comments.id, commentId)));
  const [v] = await db.select().from(versions).where(eq(versions.id, c.versionId)).limit(1);
  if (v) {
    const item = await loadItem(v.itemId);
    if (addressedInVersionId) {
      await logActivity({ projectId: item.projectId, itemId: item.id, versionId: addressedInVersionId, actorId: session.user.id, type: "comment_addressed", meta: { commentId } });
    }
    revalidatePath(`/items/${item.id}`);
  }
  return { ok: true };
}
