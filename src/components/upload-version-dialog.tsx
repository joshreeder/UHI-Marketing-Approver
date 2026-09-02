"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/form-message";
import { createCopyVersion, createVersion } from "@/app/(app)/items/actions";
import { fmtBytes } from "@/lib/format";
import { wordCount } from "@/lib/copy";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MAX = 50 * 1024 * 1024;

type Mode = "file" | "copy";

function fileKind(f: File): string {
  if (f.type.includes("wordprocessingml")) return "Word";
  if (f.type.includes("presentationml")) return "PowerPoint";
  return f.type.replace("application/", "").replace("image/", "").toUpperCase();
}

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
  /** True when the previous version has a round: uploading re-sends to its approvers. */
  willResend: boolean;
  defaultMode?: Mode;
  /** Pre-fills the copy tab (e.g. with the previous version's text so the designer edits, not retypes). */
  initialCopy?: { subject: string; fromName: string; body: string };
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState(initialCopy?.subject ?? "");
  const [fromName, setFromName] = useState(initialCopy?.fromName ?? "");
  const [body, setBody] = useState(initialCopy?.body ?? "");
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null | undefined) {
    setError(null);
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return setError("Only PDF, Word (.docx), PowerPoint (.pptx), JPG, PNG, GIF and WebP files are supported.");
    if (f.size > MAX) return setError("Files must be 50 MB or smaller.");
    setFile(f);
  }

  function reset() {
    setFile(null);
    setNote("");
    setError(null);
    setProgress(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let result: Awaited<ReturnType<typeof createVersion>>;
      if (mode === "file") {
        if (!file) return setError("Choose a file first.");
        setBusy("uploading");
        const blob = await upload(`items/${itemId}/v${nextNumber}/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ itemId }),
          onUploadProgress: (p) => setProgress(p.percentage),
        });
        setBusy("saving");
        result = await createVersion({ itemId, note, fileUrl: blob.url, fileName: file.name, mime: file.type, size: file.size });
      } else {
        if (!body.trim()) return setError("Paste the copy first.");
        setBusy("saving");
        result = await createCopyVersion({ itemId, note, subject, fromName, body });
      }
      if (!result.ok) throw new Error(result.error);
      toast.success(result.message ?? "Saved.");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy("idle");
      setProgress(0);
    }
  }

  const label = nextNumber === 1 ? "Add v1" : `New version (v${nextNumber})`;
  const canSubmit = mode === "file" ? !!file : body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>{label}</Button>} />
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Version {nextNumber}</DialogTitle>
            <DialogDescription>
              {willResend
                ? "This supersedes the current review round. Approvers from the last round will be emailed the new version."
                : "Upload a proof or paste copy for approval. You send it to approvers after saving."}
            </DialogDescription>
          </DialogHeader>

          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1 text-sm">
            {(["file", "copy"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  mode === m ? "bg-white font-medium text-ink shadow-sm ring-1 ring-line" : "text-slate hover:text-ink",
                )}
              >
                {m === "file" ? "Upload a file" : "Paste copy"}
              </button>
            ))}
          </div>

          {mode === "file" ? (
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
                    {fmtBytes(file.size)} · {fileKind(file)}
                  </span>
                  <span className="mt-1 text-xs text-slate">Drop another file to replace it</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-ink">Drop a file here or click to choose</span>
                  <span className="text-xs text-slate">PDF, Word, PowerPoint, JPG, PNG, GIF, WebP · up to 50 MB</span>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject line</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optional — for emails" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fromName">From name</Label>
                  <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="body">Copy</Label>
                  <span className="text-xs text-slate">{wordCount(body)} words</span>
                </div>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="font-mono text-[13px] leading-relaxed"
                  placeholder={"Paste the email or copy here.\n\nBlank lines start a new paragraph. Approvers see it formatted, and can comment on it just like a file."}
                />
              </div>
            </div>
          )}

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
            <Button type="submit" disabled={busy !== "idle" || !canSubmit}>
              {busy === "uploading" ? `Uploading ${progress}%` : busy === "saving" ? "Saving…" : mode === "file" ? "Upload" : "Save copy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
