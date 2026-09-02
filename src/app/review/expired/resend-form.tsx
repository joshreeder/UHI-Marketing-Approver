"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/form-message";
import { resendApproverLink, type ResendState } from "../actions";

export function ResendLinkForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState<ResendState, FormData>(resendApproverLink, {});
  if (state.ok) {
    return <FormMessage tone="success" message="If you are an approver on this piece, a fresh link is on its way." />;
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Your email</Label>
        <Input id="email" name="email" type="email" required autoFocus />
      </div>
      <FormMessage message={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send me a fresh link"}
      </Button>
    </form>
  );
}
