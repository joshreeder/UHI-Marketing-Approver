import { cn } from "@/lib/utils";
import type { ApprovalStatus, ProjectStatus, RoundStatus } from "@/lib/db/schema";
import { ROUND_LABEL, ROUND_PILL_CLASS, STATUS_LABEL, STATUS_PILL_CLASS } from "@/lib/status";

export function StatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span className={cn("pill", STATUS_PILL_CLASS[status], className)}>
      <span className="pill-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RoundPill({ status, className }: { status: RoundStatus; className?: string }) {
  return (
    <span className={cn("pill", ROUND_PILL_CLASS[status], className)}>
      <span className="pill-dot" />
      {ROUND_LABEL[status]}
    </span>
  );
}

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  waiting: "Waiting",
  approved: "Approved",
  changes_requested: "Changes requested",
};
const APPROVAL_CLASS: Record<ApprovalStatus, string> = {
  waiting: "pill-waiting",
  approved: "pill-approved",
  changes_requested: "pill-changes",
};

export function ApprovalPill({ status, className }: { status: ApprovalStatus; className?: string }) {
  return (
    <span className={cn("pill", APPROVAL_CLASS[status], className)}>
      <span className="pill-dot" />
      {APPROVAL_LABEL[status]}
    </span>
  );
}

export function OverduePill({ days, className }: { days: number; className?: string }) {
  if (days <= 0) return null;
  return (
    <span className={cn("pill pill-overdue", className)}>
      Overdue by {days} day{days === 1 ? "" : "s"}
    </span>
  );
}
