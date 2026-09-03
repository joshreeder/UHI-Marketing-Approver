"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VersionForm, type Mode } from "@/components/version-form";

export function UploadVersionDialog({
  itemId,
  nextNumber,
  willResend,
  defaultMode = "file",
  initialCopy,
  trigger,
}: {
  itemId: string;
  nextNumber: number;
  willResend: boolean;
  defaultMode?: Mode;
  initialCopy?: { subject: string; fromName: string; body: string };
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>New version (v{nextNumber})</Button>} />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Version {nextNumber}</DialogTitle>
          <DialogDescription>Upload the revised file or paste the revised copy. Add a note so approvers know what changed.</DialogDescription>
        </DialogHeader>
        <VersionForm
          target={{ kind: "item", itemId }}
          nextNumber={nextNumber}
          willResend={willResend}
          defaultMode={defaultMode}
          initialCopy={initialCopy}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
