"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/app/(app)/projects/actions";

export function AddItemForm({ action, defaultWindow }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; defaultWindow: number }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <Input name="title" placeholder="Item title, e.g. Mailer PDF or Announcement email" required />
      </div>
      <div className="w-36">
        <Input name="reviewWindowDays" type="number" min={1} max={60} placeholder={`${defaultWindow}d review`} title="Review window in days (optional)" />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Adding…" : "Add item"}
      </Button>
      <FormMessage message={state.error} className="w-full" />
    </form>
  );
}
