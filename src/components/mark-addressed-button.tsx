"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markCommentAddressed } from "@/app/(app)/items/actions";

export function MarkAddressedButton({ commentId, addressedInVersionId, addressed }: { commentId: string; addressedInVersionId: string; addressed: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-slate underline-offset-2 hover:text-navy hover:underline disabled:opacity-50"
      onClick={() =>
        start(async () => {
          const r = await markCommentAddressed(commentId, addressed ? null : addressedInVersionId);
          if (!r.ok) toast.error(r.error);
          router.refresh();
        })
      }
    >
      {addressed ? "Addressed · undo" : "Mark addressed"}
    </button>
  );
}
