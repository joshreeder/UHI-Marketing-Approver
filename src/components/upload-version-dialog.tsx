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
import { CopyEditor } from "@/components/copy-editor";
import { createCopyVersion, createVersion } from "@/app/(app)/items/actions";
import { fmtBytes } from "@/lib/format";
import { wordCount } from "@/lib/copy";
import { describeDocxReview, reviewDocx, unresolvedCount, type DocxReview } from "@/lib/docx-review";
import { canonicalMime } from "@/lib/mime";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MAX = 500 * 1024 * 1024;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Mode = "file" | "copy";

function fileKind(f: File): string {
  const t = canonicalMime(f.name, f.type);
  if (t.includes("wordprocessingml")) return "Word";
  if (t.includes("presentationml")) return "PowerPoint";
  return t.replace("application/", "").replace("image/", "").toUpperCase();
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
  /** Pre-fills the copy tab with the previous version (HTML body) so the designer edits, not retypes. */
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
  const [bodyText, setBodyText] = useState("");
  const [docxReview, setDocxReview] = useState<DocxReview | null>(null);
  const [docxChecking, setDocxChecking] = useState(false);
  const [markupAcknowledged, setMarkupAcknowledged] = useState(false);
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(f: File | null | undefined) {
    setError(null);
    if (!f) return;
    const mime = canonicalMime(f.name, f.type);
    if (!ACCEPT.split(",").includes(mime)) {
      return setError(`“${f.name}” is not a supported type. Use PDF, Word (.docx), PowerPoint (.pptx), JPG, PNG, GIF or WebP.`);
    }
    if (f.size > MAX) return setError(`Files must be 500 MB or smaller (this one is ${fmtBytes(f.size)}).`);
    setFile(f);
    setDocxReview(null);
    setMarkupAcknowledged(false);
    if (mime === DOCX) {
      // Look inside the Word file before it is uploaded so tracked changes are caught early.
      setDocxChecking(true);
      try {
        setDocxReview(await reviewDocx(await f.arrayBuffer()));
      } catch {
        setDocxReview(null);
      } finally {
        setDocxChecking(false);
      }
    }
  }

  function reset() {
    setFile(null);
    setNote("");
    setError(null);
    setProgress(0);
    setDocxReview(null);
    setMarkupAcknowledged(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let result: Awaited<ReturnType<typeof createVersion>>;
      if (mode === "file") {
        if (!file) return setError("Choose a file first.");
        setBusy("uploading");
        const mime = canonicalMime(file.name, file.type);
        const blob = await upload(`items/${itemId}/v${nextNumber}/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ itemId }),
          contentType: mime,
          multipart: file.size > 20 * 1024 * 1024,
          onUploadProgress: (p) => setProgress(p.percentage),
        });
        setBusy("saving");
        result = await createVersion({ itemId, note, fileUrl: blob.url, fileName: file.name, mime, size: file.size });
      } else {
        if (!bodyText.trim()) return setError("Write or paste the copy first.");
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
  const markup = describeDocxReview(docxReview);
  const markupBlocks = unresolvedCount(docxReview) > 0 && !markupAcknowledged;
  const canSubmit = mode === "file" ? !!file && !docxChecking && !markupBlocks : bodyText.trim().length > 0;

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
                {m === "file" ? "Upload a file" : "Write copy"}
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
                  <span className="text-xs text-slate">PDF, Word, PowerPoint, JPG, PNG, GIF, WebP · up to 500 MB</span>
                </>
              )}
            </div>
          ) : null}

          {mode === "file" && file && canonicalMime(file.name, file.type) === DOCX ? (
            docxChecking ? (
              <p className="text-xs text-slate">Checking the Word file for tracked changes and comments…</p>
            ) : markup ? (
              <div className="space-y-2 rounded-xl border border-[var(--status-changes)]/30 bg-[var(--status-changes-bg)] p-3 text-xs">
                <p className="text-sm font-medium text-[var(--status-changes)]">This Word file still has {markup}.</p>
                <p className="text-ink/80">
                  Approvers see the preview with every change accepted and no comments, so they would be signing off on text nobody has settled on. Best: accept or reject the changes and
                  resolve the comments in Word, save, and upload that file instead.
                  {docxReview?.authors.length ? ` Edits by ${docxReview.authors.join(", ")}.` : ""}
                </p>
                <label className="flex items-start gap-2 text-ink">
                  <input type="checkbox" checked={markupAcknowledged} onChange={(e) => setMarkupAcknowledged(e.target.checked)} className="mt-0.5 size-4 accent-[var(--uh-navy)]" />
                  <span>
                    {willResend
                      ? "Upload anyway and send it to the previous approvers now. The markup stays flagged on the item page."
                      : "Upload anyway. The markup will be flagged on the item page and again before sending for approval."}
                  </span>
                </label>
              </div>
            ) : docxReview ? (
              <p className="text-xs text-[var(--status-approved)]">Clean Word file: no tracked changes or open comments.</p>
            ) : null
          ) : null}

          {mode === "copy" ? (
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
                  <Label>Copy</Label>
                  <span className="text-xs text-slate">{wordCount(bodyText)} words</span>
                </div>
                <CopyEditor
                  initialHtml={initialCopy?.body ?? ""}
                  onChange={(html, text) => {
                    setBody(html);
                    setBodyText(text);
                  }}
                />
                <p className="text-xs text-slate">
                  Write here or paste from Word, an email or a web page; headings, bold, lists and links come along. Approvers see it formatted like a page, can comment on it,
                  and it can be downloaded as a Word document at any time.
                </p>
              </div>
            </div>
          ) : null}

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
