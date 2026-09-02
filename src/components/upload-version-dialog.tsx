"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/form-message";
import { createVersion } from "@/app/(app)/items/actions";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/gif,image/webp";
const MAX = 50 * 1024 * 1024;

export function UploadVersionDialog({
  itemId,
  nextNumber,
  willResend,
  trigger,
}: {
  itemId: string;
  nextNumber: number;
  /** True when the previous version has a round: uploading re-sends to its approvers. */
  willResend: boolean;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null | undefined) {
    setError(null);
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return setError("Only PDF, JPG, PNG, GIF and WebP files are supported.");
    if (f.size > MAX) return setError("Files must be 50 MB or smaller.");
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a file first.");
    setError(null);
    try {
      setBusy("uploading");
      const blob = await upload(`items/${itemId}/v${nextNumber}/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ itemId }),
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      setBusy("saving");
      const result = await createVersion({ itemId, note, fileUrl: blob.url, fileName: file.name, mime: file.type, size: file.size });
      if (!result.ok) throw new Error(result.error);
      toast.success(result.message ?? "Uploaded.");
      setOpen(false);
      setFile(null);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy("idle");
      setProgress(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>Upload {nextNumber === 1 ? "v1" : `v${nextNumber}`}</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Upload version {nextNumber}</DialogTitle>
            <DialogDescription>
              {willResend
                ? "This supersedes the current review round. Approvers from the last round will be emailed the new version."
                : "PDF or image, up to 50 MB. You can send it for approval after uploading."}
            </DialogDescription>
          </DialogHeader>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm transition-colors",
              dragging ? "border-navy bg-navy-tint" : "border-line bg-canvas hover:border-navy/50",
            )}
          >
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            {file ? (
              <>
                <span className="font-medium text-ink">{file.name}</span>
                <span className="text-xs text-slate">
                  {fmtBytes(file.size)} · {file.type.replace("application/", "").replace("image/", "").toUpperCase()}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-ink">Drop a file here or click to choose</span>
                <span className="text-xs text-slate">PDF, JPG, PNG, GIF, WebP</span>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Version note</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={nextNumber === 1 ? "First draft" : "Fixed logo size, updated dates"} />
          </div>

          {busy === "uploading" ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-navy transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <FormMessage message={error} />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy !== "idle"}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy !== "idle" || !file}>
              {busy === "uploading" ? `Uploading ${progress}%` : busy === "saving" ? "Saving…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
