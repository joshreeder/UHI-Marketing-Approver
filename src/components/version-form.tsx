"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/form-message";
import { CopyEditor } from "@/components/copy-editor";
import { describeDocxReview, reviewDocx, unresolvedCount, type DocxReview } from "@/lib/docx-review";
import { fmtBytes } from "@/lib/format";
import { wordCount } from "@/lib/copy";
import { canonicalMime } from "@/lib/mime";
import { cn } from "@/lib/utils";
import { ACCEPT, saveVersion, validateFile, type SaveTarget } from "@/lib/client/save-version";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type Mode = "file" | "copy";

export function fileKind(f: File): string {
  const t = canonicalMime(f.name, f.type);
  if (t.includes("wordprocessingml")) return "Word";
  if (t.includes("presentationml")) return "PowerPoint";
  return t.replace("application/", "").replace("image/", "").toUpperCase();
}

export type VersionFormProps = {
  /** Where the version goes: an existing piece, the project's first piece, or a brand-new piece. */
  target: SaveTarget;
  nextNumber: number;
  /** True when the previous version has a round: saving re-sends to its approvers. */
  willResend?: boolean;
  defaultMode?: Mode;
  initialCopy?: { subject: string; fromName: string; body: string };
  /** Bigger drop zone and copy box for the inline "get started" panel. */
  inline?: boolean;
  onCancel?: () => void;
  onSaved?: (result: { itemId: string; versionId?: string }) => void;
};

/** Shared file / paste-copy form used inline on project and item pages and inside the "New version" dialog. */
export function VersionForm({ target, nextNumber, willResend = false, defaultMode = "file", initialCopy, inline = false, onCancel, onSaved }: VersionFormProps) {
  const router = useRouter();
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
    const problem = validateFile(f);
    if (problem) return setError(problem);
    setFile(f);
    setMode("file");
    setDocxReview(null);
    setMarkupAcknowledged(false);
    if (canonicalMime(f.name, f.type) === DOCX) {
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "file" && !file) return setError("Choose a file first.");
    if (mode === "copy" && !bodyText.trim()) return setError("Write or paste the copy first.");
    try {
      setBusy(mode === "file" ? "uploading" : "saving");
      const result = await saveVersion(
        target,
        mode === "file" ? { mode: "file", file: file!, note } : { mode: "copy", body, subject, fromName, note },
        nextNumber,
        (pct) => {
          setProgress(pct);
          if (pct >= 100) setBusy("saving");
        },
      );
      if (!result.ok) throw new Error(result.error);
      toast.success(result.message ?? "Saved.");
      setFile(null);
      setNote("");
      if (onSaved) onSaved({ itemId: result.itemId, versionId: result.versionId });
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy("idle");
      setProgress(0);
    }
  }

  const markup = describeDocxReview(docxReview);
  const markupBlocks = unresolvedCount(docxReview) > 0 && !markupAcknowledged;
  const canSubmit = mode === "file" ? !!file && !docxChecking && !markupBlocks : bodyText.trim().length > 0;

  return (
    <form
      onSubmit={submit}
      className="space-y-4"
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
    >
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
            className={cn("rounded-md px-3 py-1.5 transition-colors", mode === m ? "bg-white font-medium text-ink shadow-sm ring-1 ring-line" : "text-slate hover:text-ink")}
          >
            {m === "file" ? "Drop in artwork or a document" : "Write copy"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm transition-colors",
            inline ? "py-14" : "py-8",
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
              <span className={cn("font-medium text-ink", inline && "text-base")}>Drag the file here, or click to choose</span>
              <span className="mt-1 text-xs text-slate">PDF, Word, PowerPoint, JPG, PNG, GIF, WebP · up to 500 MB</span>
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
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
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
              Write here or paste from Word, an email or a web page; headings, bold, lists and links come along. Approvers see it formatted like a page, can pin comments on it,
              and it can be downloaded as a Word document at any time.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="note">Note for approvers</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={nextNumber === 1 ? "Optional — e.g. First draft, headline still TBD" : "What changed — e.g. Fixed logo size, updated dates"} />
      </div>

      {busy === "uploading" ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-navy transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {willResend ? <p className="text-xs text-slate">This supersedes the current review round. Approvers from the last round will be emailed the new version.</p> : null}
      <FormMessage message={error} />

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy !== "idle"}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy !== "idle" || !canSubmit} className={cn(inline && "min-w-40")}>
          {busy === "uploading" ? `Uploading ${progress}%` : busy === "saving" ? "Saving…" : mode === "file" ? (nextNumber === 1 ? "Upload and preview" : `Upload v${nextNumber}`) : nextNumber === 1 ? "Save and preview" : `Save v${nextNumber}`}
        </Button>
      </div>
    </form>
  );
}
