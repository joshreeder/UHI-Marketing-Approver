"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/form-message";
import { addComment, type CommentState } from "@/app/review/actions";

export function AddCommentForm({ versionId, approvalId }: { versionId: string; approvalId?: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addComment, {});
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="versionId" value={versionId} />
      {approvalId ? <input type="hidden" name="approvalId" value={approvalId} /> : null}
      <Textarea name="body" rows={2} placeholder="Add another comment for the designer" required />
      <FormMessage message={state.error} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Posting…" : "Post comment"}
      </Button>
    </form>
  );
}
