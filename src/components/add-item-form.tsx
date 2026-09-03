"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/app/(app)/projects/actions";

/** Collapsed by default: most projects are one piece. Expands to a single name field for a second piece. */
export function AddItemForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-slate underline-offset-2 hover:text-navy hover:underline">
        + Add another piece to this project (e.g. a web banner or follow-up email)
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[240px] flex-1">
        <Input name="title" placeholder="Name for the second piece, e.g. Web banner" required autoFocus />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Adding…" : "Add piece"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <FormMessage message={state.error} className="w-full" />
    </form>
  );
}
