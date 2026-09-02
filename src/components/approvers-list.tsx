import { differenceInHours } from "date-fns";
import { ApprovalPill } from "@/components/status-pill";
import { NudgeButton } from "@/components/nudge-button";
import { displayName, fmtDateTime, fmtRelative, initials } from "@/lib/format";
import type { RoundDetail } from "@/lib/queries";
import { NUDGE_COOLDOWN_HOURS } from "@/lib/rounds-constants";

export function ApproversList({ round, canNudge, highlightUserId }: { round: RoundDetail; canNudge: boolean; highlightUserId?: string | null }) {
  const closed = round.status === "superseded" || round.status === "approved";
  return (
    <ul className="space-y-0">
      {round.approvals.map((a) => {
        const cooling = a.lastEmailedAt ? differenceInHours(new Date(), a.lastEmailedAt) < NUDGE_COOLDOWN_HOURS : false;
        const me = highlightUserId === a.userId;
        return (
          <li key={a.id} className="hairline-b border-line flex items-center gap-3 py-2.5 last:border-b-0">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-tint text-xs font-medium text-navy-deep">
              {initials(displayName(a.user))}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-ink">
                {displayName(a.user)}
                {me ? <span className="ml-1 text-xs text-slate">(you)</span> : null}
              </div>
              <div className="truncate text-xs text-slate">
                {a.status === "waiting"
                  ? a.reminderCount > 0
                    ? `Nudged ${a.reminderCount}× · last ${fmtRelative(a.lastEmailedAt)}`
                    : `Sent ${fmtRelative(a.lastEmailedAt ?? round.sentAt)}`
                  : `${a.status === "approved" ? "Approved" : "Requested changes"} ${fmtDateTime(a.decidedAt)}`}
              </div>
            </div>
            <ApprovalPill status={a.status} />
            {canNudge && a.status === "waiting" && !closed ? (
              <NudgeButton approvalId={a.id} disabled={cooling} title={cooling ? "Emailed within the last hour" : "Send a reminder now"} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
