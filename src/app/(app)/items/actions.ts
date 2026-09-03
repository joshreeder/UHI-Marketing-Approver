"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { comments, items, versions } from "@/lib/db/schema";
import { requireTeam } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { DOCX_MIME, isAllowedMime, MAX_UPLOAD_BYTES } from "@/lib/blob";
import { processDocxUpload } from "@/lib/docx";
import { isCopyEmpty, textToHtml } from "@/lib/copy";
import { sanitizeCopyHtml } from "@/lib/copy-server";
import { describeDocxReview, unresolvedCount, type DocxReview } from "@/lib/docx-review";
import { refreshProjectStatus } from "@/lib/queries";
import { sendReminder, startRound, supersedeWithNewVersion } from "@/lib/rounds";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function loadItem(itemId: string) {
  const [row] = await db.query.items.findMany({ where: eq(items.id, itemId), with: { project: true }, limit: 1 });
  if (!row) throw new Error("Item not found");
  return row;
}

type VersionValues = {
  note: string;
  previewHtml?: string | null;
  docxReview?: DocxReview | null;
  previewUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mime?: string | null;
  size?: number | null;
  emailSubject?: string | null;
  emailFromName?: string | null;
  emailHtml?: string | null;
};

/**
 * Inserts the next version for an item, logs it, and — when the previous version had a review
 * round — supersedes that round and re-emails its approvers. Shared by file and copy uploads.
 */
async function insertVersion(session: Awaited<ReturnType<typeof requireTeam>>, itemId: string, values: VersionValues) {
  const item = await loadItem(itemId);
  const [prev] = await db.select().from(versions).where(eq(versions.itemId, item.id)).orderBy(desc(versions.number)).limit(1);
  const number = (prev?.number ?? 0) + 1;

  const [version] = await db
    .insert(versions)
    .values({
      itemId: item.id,
      number,
      note: values.note || null,
      uploadedBy: session.user.id,
      fileUrl: values.fileUrl ?? null,
      fileName: values.fileName ?? null,
      mime: values.mime ?? null,
      size: values.size ?? null,
      previewHtml: values.previewHtml ?? null,
      docxReview: values.docxReview ?? null,
      previewUrl: values.previewUrl ?? null,
      emailSubject: values.emailSubject ?? null,
      emailFromName: values.emailFromName ?? null,
      emailHtml: values.emailHtml ?? null,
    })
    .returning();
  await logActivity({
    projectId: item.projectId,
    itemId: item.id,
    versionId: version.id,
    actorId: session.user.id,
    type: "version_uploaded",
    meta: {
      versionNumber: number,
      note: values.note || null,
      fileName: values.fileName ?? null,
      kind: values.emailHtml ? "copy" : "file",
      ...(values.docxReview ? { docxMarkup: describeDocxReview(values.docxReview) } : {}),
    },
  });

  let message = `v${number} ${values.emailHtml ? "saved" : "uploaded"}.`;
  if (prev) {
    const result = await supersedeWithNewVersion({
      previousVersionId: prev.id,
      newVersionId: version.id,
      actor: session.user,
      reviewWindowDays: item.reviewWindowDays ?? item.project.reviewWindowDays,
    });
    if (result) message = `v${number} ${values.emailHtml ? "saved" : "uploaded"} and sent to ${result.sent} approver${result.sent === 1 ? "" : "s"}.`;
  }
  await refreshProjectStatus(item.projectId);
  revalidatePath(`/items/${item.id}`);
  revalidatePath(`/projects/${item.projectId}`);
  revalidatePath("/");
  return { ok: true as const, message, versionId: version.id };
}

const versionSchema = z.object({
  itemId: z.string().uuid(),
  note: z.string().trim().max(2000).optional().default(""),
  fileUrl: z.string().url(),
  fileName: z.string().min(1).max(300),
  mime: z.string().min(1),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  previewUrl: z.string().url().nullable().optional(),
});

/** Called by the upload dialog after the browser has put the file in Blob storage. */
export async function createVersion(input: z.input<typeof versionSchema>): Promise<ActionResult & { versionId?: string }> {
  const session = await requireTeam();
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Upload details were incomplete. Try again." };
  const d = parsed.data;
  if (!isAllowedMime(d.mime)) return { ok: false, error: "Only PDF, Word, PowerPoint, JPG, PNG, GIF and WebP files are supported." };
  const docx = d.mime === DOCX_MIME ? await processDocxUpload(d.fileUrl) : null;
  const result = await insertVersion(session, d.itemId, { ...d, previewHtml: docx?.previewHtml ?? null, docxReview: docx?.docxReview ?? null });
  const markup = describeDocxReview(docx?.docxReview);
  if (markup && result.ok) return { ...result, message: `${result.message} Heads up: the file still has ${markup}.` };
  return result;
}

const copySchema = z.object({
  itemId: z.string().uuid(),
  note: z.string().trim().max(2000).optional().default(""),
  subject: z.string().trim().max(300).optional().default(""),
  fromName: z.string().trim().max(120).optional().default(""),
  /** HTML from the copy editor (plain text is accepted too and turned into paragraphs). */
  body: z.string().trim().min(1, "Write or paste the copy first.").max(400_000),
});

/** "Write copy" mode: letters, emails or any text that needs sign-off. Stored as sanitised HTML. */
export async function createCopyVersion(input: z.input<typeof copySchema>): Promise<ActionResult & { versionId?: string }> {
  const session = await requireTeam();
  const parsed = copySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the copy and try again." };
  const d = parsed.data;
  const html = sanitizeCopyHtml(/<[a-z][\s\S]*>/i.test(d.body) ? d.body : textToHtml(d.body));
  if (isCopyEmpty(html)) return { ok: false, error: "Write or paste the copy first." };
  return insertVersion(session, d.itemId, {
    note: d.note,
    emailSubject: d.subject || null,
    emailFromName: d.fromName || null,
    emailHtml: html,
  });
}

const sendSchema = z.object({
  versionId: z.string().uuid(),
  emails: z.string().trim().min(1, "Add at least one approver email."),
  reviewWindowDays: z.preprocess((v) => Number(v), z.number().int().min(1).max(60)),
  note: z.string().trim().max(2000).optional().default(""),
  /** Required when the version is a Word file with unresolved tracked changes or comments. */
  acknowledgeMarkup: z.enum(["on"]).optional(),
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

  const markup = describeDocxReview(version.docxReview);
  if (unresolvedCount(version.docxReview) > 0 && d.acknowledgeMarkup !== "on") {
    return { error: `This Word file still has ${markup}. Resolve them in Word and upload the clean file, or tick “Send anyway”.` };
  }

  try {
    const result = await startRound({ versionId: version.id, approverEmails: emails, reviewWindowDays: d.reviewWindowDays, note: d.note || null, actor: session.user });
    if (markup) {
      await logActivity({ projectId: item.projectId, itemId: item.id, versionId: version.id, actorId: session.user.id, type: "docx_markup_sent_anyway", meta: { versionNumber: version.number, summary: markup } });
    }
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

/** Emails the current user a copy version exactly as approvers see it, so email copy can be checked in a real inbox. */
export async function sendTestEmail(versionId: string): Promise<ActionResult> {
  const session = await requireTeam();
  const [v] = await db.select().from(versions).where(eq(versions.id, versionId)).limit(1);
  if (!v || !v.emailHtml) return { ok: false, error: "Only copy versions can be sent as a test." };
  const item = await loadItem(v.itemId);
  const { sendCopyTest } = await import("@/lib/email/send");
  const r = await sendCopyTest({
    to: session.user.email,
    subject: v.emailSubject || `${item.title} (v${v.number}) — test`,
    fromName: v.emailFromName,
    html: v.emailHtml,
  });
  if (!r.ok) return { ok: false, error: r.error };
  await logActivity({ projectId: item.projectId, itemId: item.id, versionId: v.id, actorId: session.user.id, type: "test_email_sent", meta: { to: session.user.email, versionNumber: v.number } });
  return { ok: true, message: r.skipped ? "No email provider configured; the test was written to the server log." : `Test sent to ${session.user.email}.` };
}
