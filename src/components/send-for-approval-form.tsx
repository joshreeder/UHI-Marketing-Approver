"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/form-message";
import { sendForApproval, type SendState } from "@/app/(app)/items/actions";

export function SendForApprovalForm({
  versionId,
  defaultWindow,
  pastApprovers,
}: {
  versionId: string;
  defaultWindow: number;
  pastApprovers: string[];
}) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendForApproval, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="versionId" value={versionId} />
      <div className="space-y-1.5">
        <Label htmlFor="emails">Approvers</Label>
        <Textarea id="emails" name="emails" rows={3} required placeholder="ceo@unitedheritage.com, compliance@unitedheritage.com" />
        {pastApprovers.length ? (
          <div className="flex flex-wrap gap-1">
            {pastApprovers.slice(0, 8).map((e) => (
              <button
                key={e}
                type="button"
                className="rounded-full bg-canvas px-2 py-0.5 text-xs text-slate hover:bg-navy-tint hover:text-navy-deep"
                onClick={(ev) => {
                  const ta = (ev.currentTarget.closest("form") as HTMLFormElement).elements.namedItem("emails") as HTMLTextAreaElement;
                  const cur = ta.value.trim();
                  if (cur.includes(e)) return;
                  ta.value = cur ? `${cur.replace(/[,\s]+$/, "")}, ${e}` : e;
                }}
              >
                + {e}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-slate">Separate several with commas. Each gets a personal link, no account needed.</p>
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
      <FormMessage message={state.error} />
      <FormMessage message={state.success} tone="success" />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send for approval"}
      </Button>
    </form>
  );
}
