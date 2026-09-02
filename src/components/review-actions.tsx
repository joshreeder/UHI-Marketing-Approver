"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/form-message";
import { submitDecision, type DecisionState } from "@/app/review/actions";

/** Sticky bottom action bar for approvers: Approve (green) / Request changes (outline → comment box). */
export function ReviewActions({ approvalId, versionNumber }: { approvalId: string; versionNumber: number }) {
  const [mode, setMode] = useState<"idle" | "changes">("idle");
  const [state, action, pending] = useActionState<DecisionState, FormData>(submitDecision, {});
  const router = useRouter();

  if (state.done) {
    router.refresh();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 shadow-[0_-8px_24px_-12px_rgba(31,41,51,0.25)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <form action={action} className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        <input type="hidden" name="approvalId" value={approvalId} />
        {mode === "changes" ? (
          <div className="mb-3 space-y-2">
            <label htmlFor="comment" className="text-sm font-medium text-ink">
              What needs to change on v{versionNumber}?
            </label>
            <Textarea id="comment" name="comment" rows={3} required autoFocus placeholder="Page 2: the phone number is out of date. Headline should say 'Fall' not 'Autumn'." className="text-base" />
          </div>
        ) : null}
        <FormMessage message={state.error} className="mb-2" />
        <div className="flex items-center gap-2">
          {mode === "idle" ? (
            <>
              <Button
                type="submit"
                name="decision"
                value="approved"
                disabled={pending}
                className="h-11 flex-1 bg-[var(--status-approved)] text-base text-white hover:bg-[var(--status-approved)]/90"
              >
                {pending ? "Saving…" : "Approve"}
              </Button>
              <Button type="button" variant="outline" className="h-11 flex-1 text-base" onClick={() => setMode("changes")} disabled={pending}>
                Request changes
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setMode("idle")} disabled={pending}>
                Back
              </Button>
              <Button
                type="submit"
                name="decision"
                value="changes_requested"
                disabled={pending}
                className="h-11 flex-1 bg-[var(--status-changes)] text-base text-white hover:bg-[var(--status-changes)]/90"
              >
                {pending ? "Sending…" : "Send change request"}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
