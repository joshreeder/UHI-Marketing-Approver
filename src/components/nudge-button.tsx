"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { nudgeApprover } from "@/app/(app)/items/actions";

export function NudgeButton({ approvalId, disabled, title }: { approvalId: string; disabled?: boolean; title?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={disabled || pending}
      title={title}
      onClick={() =>
        start(async () => {
          const r = await nudgeApprover(approvalId);
          if (r.ok) {
            toast.success(r.message ?? "Reminder sent.");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      {pending ? "Sending…" : "Nudge"}
    </Button>
  );
}
