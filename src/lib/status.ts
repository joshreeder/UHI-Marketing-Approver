import type { ProjectStatus, RoundStatus } from "@/lib/db/schema";
import { parseDateOnly } from "@/lib/format";
import { todayInTz } from "@/lib/tz";

export const MANUAL_STATUSES: ProjectStatus[] = ["done", "on_hold", "cancelled"];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  done: "Done",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

export const STATUS_PILL_CLASS: Record<ProjectStatus, string> = {
  not_started: "pill-not-started",
  in_progress: "pill-in-progress",
  in_review: "pill-in-review",
  changes_requested: "pill-changes",
  approved: "pill-approved",
  done: "pill-done",
  on_hold: "pill-on-hold",
  cancelled: "pill-cancelled",
};

export const ROUND_LABEL: Record<RoundStatus, string> = {
  pending: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  superseded: "Superseded",
};

export const ROUND_PILL_CLASS: Record<RoundStatus, string> = {
  pending: "pill-in-review",
  changes_requested: "pill-changes",
  approved: "pill-approved",
  superseded: "pill-superseded",
};

export type ItemSnapshot = {
  /** Round status of the item's newest version, or null when nothing has been sent. */
  latestRound: RoundStatus | null;
  hasVersion: boolean;
};

/**
 * Derives project status (plan §3). Manual statuses (done / on hold / cancelled) win.
 * Priority among items: changes requested > in review > in progress > approved.
 */
export function deriveProjectStatus(
  project: { status: ProjectStatus; startDate: string | Date | null },
  items: ItemSnapshot[],
  now = new Date(),
): ProjectStatus {
  if (MANUAL_STATUSES.includes(project.status)) return project.status;

  const start = parseDateOnly(project.startDate);
  const started = !start || start.getTime() <= todayInTz(undefined, now).getTime();

  if (items.length === 0 || items.every((i) => !i.hasVersion)) {
    return started ? "in_progress" : "not_started";
  }
  if (items.some((i) => i.latestRound === "changes_requested")) return "changes_requested";
  if (items.some((i) => i.latestRound === "pending")) return "in_review";
  if (items.some((i) => i.hasVersion && i.latestRound == null)) return "in_progress";
  if (items.every((i) => i.latestRound === "approved")) return "approved";
  return "in_progress";
}
