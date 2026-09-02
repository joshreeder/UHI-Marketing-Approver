"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTestEmail } from "@/app/(app)/items/actions";

export function SendTestButton({ versionId }: { versionId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await sendTestEmail(versionId);
          if (r.ok) toast.success(r.message ?? "Test sent.");
          else toast.error(r.error);
        })
      }
    >
      {pending ? "Sending…" : "Send me a test"}
    </Button>
  );
}
