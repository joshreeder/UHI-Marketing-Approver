"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VersionForm } from "@/components/version-form";
import { ACCEPT, saveVersion, validateFile, type SaveTarget } from "@/lib/client/save-version";
import { cn } from "@/lib/utils";
import type { OpenComment } from "@/lib/resolutions";

/**
 * Compact hotspot: drop or pick a file and it uploads immediately (no dialog); a small link opens the
 * paste-copy form instead. Used beside each piece (next version) and at the bottom of a project (new piece).
 */
export function QuickDrop({
  target,
  nextNumber,
  willResend = false,
  label,
  hint,
  copyLabel = "or write copy",
  size = "compact",
  goToItem = false,
  openComments = [],
}: {
  target: SaveTarget;
  nextNumber: number;
  willResend?: boolean;
  label: string;
  hint?: string;
  copyLabel?: string;
  size?: "compact" | "large";
  /** Navigate to the piece after saving (for new pieces); otherwise refresh in place. */
  goToItem?: boolean;
  /** When approvers left comments, a dropped file opens the form so they can be ticked off instead of uploading blind. */
  openComments?: OpenComment[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handle(f: File | null | undefined) {
    if (!f) return;
    const problem = validateFile(f);
    if (problem) return toast.error(problem);
    if (openComments.length > 0) {
      setPendingFile(f);
      setCopyOpen(true);
      return;
    }
    setBusy("Uploading…");
    const r = await saveVersion(target, { mode: "file", file: f, note: "" }, nextNumber, (pct) => setBusy(pct < 100 ? `Uploading ${pct}%` : "Saving…"));
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.success(r.message ?? "Uploaded.");
    if (goToItem) router.push(`/items/${r.itemId}`);
    else router.refresh();
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors",
          size === "large" ? "px-4 py-8" : "px-3 py-3",
          dragging ? "border-navy bg-navy-tint" : "border-line bg-canvas/60 hover:border-navy/50 hover:bg-canvas",
          busy && "opacity-70",
        )}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
        <span className={cn("font-medium text-ink", size === "large" ? "text-sm" : "text-xs")}>{busy ?? label}</span>
        {!busy ? (
          <span className="mt-0.5 text-[11px] text-slate">
            {hint ?? "Drop a PDF, image or Word file, or click to choose"}
            {" · "}
            <button
              type="button"
              className="text-navy underline-offset-2 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setCopyOpen(true);
              }}
            >
              {copyLabel}
            </button>
          </span>
        ) : null}
      </div>

      <Dialog
        open={copyOpen}
        onOpenChange={(o) => {
          setCopyOpen(o);
          if (!o) setPendingFile(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{target.kind === "new-item" ? "New piece from copy" : pendingFile ? `Version ${nextNumber}` : `Version ${nextNumber} — copy`}</DialogTitle>
            <DialogDescription>
              {pendingFile
                ? "Tick off what this version changed, add a note for anything else, then upload."
                : "Write or paste the email or text. Approvers see it formatted and can pin comments on it."}
            </DialogDescription>
          </DialogHeader>
          <VersionForm
            key={pendingFile ? pendingFile.name : "copy"}
            target={target}
            nextNumber={nextNumber}
            willResend={willResend}
            defaultMode={pendingFile ? "file" : "copy"}
            initialFile={pendingFile}
            openComments={openComments}
            onCancel={() => {
              setCopyOpen(false);
              setPendingFile(null);
            }}
            onSaved={({ itemId }) => {
              setCopyOpen(false);
              setPendingFile(null);
              if (goToItem) router.push(`/items/${itemId}`);
              else router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
