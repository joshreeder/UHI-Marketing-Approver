"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/form-message";
import { ApproverInput } from "@/components/approver-input";
import { sendForApproval, type SendState } from "@/app/(app)/items/actions";

export function SendForApprovalForm({
  versionId,
  defaultWindow,
  pastApprovers,
  markupWarning,
}: {
  versionId: string;
  defaultWindow: number;
  pastApprovers: string[];
  /** e.g. "3 tracked changes and 1 open comment" — when set, sending requires an explicit acknowledgement. */
  markupWarning?: string | null;
}) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendForApproval, {});
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = !!markupWarning && !acknowledged;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="versionId" value={versionId} />
      <div className="space-y-1.5">
        <Label>Approvers</Label>
        <ApproverInput suggestions={pastApprovers} />
        <p className="text-xs text-slate">Type or paste emails; past approvers appear as you type. Each gets a personal link, no account needed.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="reviewWindowDays">Review window</Label>
          <div className="flex items-center gap-2">
            <Input id="reviewWindowDays" name="reviewWindowDays" type="number" min={1} max={60} defaultValue={defaultWindow} className="w-20" />
            <span className="text-sm text-slate">days</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sendNote">Personal note</Label>
          <Input id="sendNote" name="note" placeholder="Optional — included in the email" />
        </div>
      </div>
      {markupWarning ? (
        <label className="flex items-start gap-2 rounded-lg bg-[var(--status-changes-bg)] px-3 py-2 text-xs text-ink">
          <input type="checkbox" name="acknowledgeMarkup" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 size-4 accent-[var(--uh-navy)]" />
          <span>
            <span className="font-medium text-[var(--status-changes)]">Send anyway.</span> This Word file still has {markupWarning}. Approvers will see the text with every change accepted and no
            comments. Better: resolve them in Word and upload the clean file first.
          </span>
        </label>
      ) : null}
      <FormMessage message={state.error} />
      <FormMessage message={state.success} tone="success" />
      <Button type="submit" disabled={pending || blocked} className="w-full">
        {pending ? "Sending…" : "Send for approval"}
      </Button>
    </form>
  );
}
