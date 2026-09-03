import "server-only";
import { db } from "@/lib/db";
import { activity } from "@/lib/db/schema";

export type ActivityType =
  | "project_created"
  | "project_updated"
  | "project_status_changed"
  | "project_completed"
  | "project_archived"
  | "item_created"
  | "version_uploaded"
  | "round_sent"
  | "round_superseded"
  | "round_approved"
  | "round_changes_requested"
  | "approver_added"
  | "approver_viewed"
  | "approver_approved"
  | "approver_changes_requested"
  | "comment_added"
  | "comment_addressed"
  | "nudged"
  | "reminder_sent"
  | "email_failed"
  | "test_email_sent"
  | "email_opened"
  | "docx_exported"
  | "docx_markup_sent_anyway";

export async function logActivity(input: {
  projectId: string;
  itemId?: string | null;
  versionId?: string | null;
  actorId?: string | null;
  type: ActivityType;
  meta?: Record<string, unknown>;
}) {
  await db.insert(activity).values({
    projectId: input.projectId,
    itemId: input.itemId ?? null,
    versionId: input.versionId ?? null,
    actorId: input.actorId ?? null,
    type: input.type,
    meta: input.meta ?? {},
  });
}

/** Sentence-case description of an activity row for feeds. */
export function describeActivity(a: {
  type: string;
  meta: Record<string, unknown> | null;
  actor?: { name: string | null; email: string } | null;
}): string {
  const who = a.actor ? a.actor.name?.trim() || a.actor.email : "Someone";
  const m = a.meta ?? {};
  const v = m.versionNumber != null ? `v${m.versionNumber}` : "a version";
  const target = typeof m.target === "string" ? m.target : "an approver";
  switch (a.type) {
    case "project_created":
      return `${who} created the project`;
    case "project_updated":
      return `${who} updated project details`;
    case "project_status_changed":
      return `${who} set status to ${String(m.status ?? "").replace(/_/g, " ")}`;
    case "project_completed":
      return `${who} marked the project complete`;
    case "project_archived":
      return `${who} archived the project`;
    case "item_created":
      return `${who} added ${typeof m.title === "string" ? `“${m.title}”` : "an item"}`;
    case "version_uploaded":
      return `${who} uploaded ${v}${typeof m.note === "string" && m.note ? ` — ${m.note}` : ""}`;
    case "round_sent":
      return `${who} sent ${v} to ${m.count ?? ""} approver${m.count === 1 ? "" : "s"}`;
    case "round_superseded":
      return `${v} superseded the previous round`;
    case "round_approved":
      return `${v} approved by everyone`;
    case "round_changes_requested":
      return `Changes requested on ${v}`;
    case "approver_added":
      return `${who} added ${target} as an approver`;
    case "approver_viewed":
      return `${who} viewed ${v}`;
    case "approver_approved":
      return `${who} approved ${v}`;
    case "approver_changes_requested":
      return `${who} requested changes on ${v}`;
    case "comment_added":
      return `${who} commented`;
    case "comment_addressed":
      return `${who} marked a comment addressed`;
    case "nudged":
      return `${who} nudged ${target}`;
    case "reminder_sent":
      return `Reminder sent to ${target}`;
    case "email_failed":
      return `Email to ${target} failed`;
    case "test_email_sent":
      return `${who} sent a test email of ${v} to ${typeof m.to === "string" ? m.to : "themselves"}`;
    case "email_opened":
      return `${who} opened the email for ${v}`;
    case "docx_exported":
      return `${who} downloaded ${v} as a Word document${m.letterhead ? " on letterhead" : ""}`;
    case "docx_markup_sent_anyway":
      return `${who} sent ${v} for approval with ${typeof m.summary === "string" ? m.summary : "unresolved tracked changes"} still in the file`;
    default:
      return a.type.replace(/_/g, " ");
  }
}
