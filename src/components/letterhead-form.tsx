"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/form-message";
import { removeLetterhead, saveLetterhead } from "@/app/(app)/settings/actions";
import type { Letterhead } from "@/lib/settings";
import { fmtBytes, fmtDate } from "@/lib/format";
import { canonicalMime } from "@/lib/mime";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX = 20 * 1024 * 1024;

/** Owner setting: the Word letterhead that copy versions are exported onto. */
export function LetterheadForm({ letterhead }: { letterhead: Letterhead | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | null | undefined) {
    setError(null);
    if (!file) return;
    if (canonicalMime(file.name, file.type) !== DOCX) return setError("The letterhead must be a Word file (.docx).");
    if (file.size > MAX) return setError(`Keep the letterhead under 20 MB (this one is ${fmtBytes(file.size)}).`);
    setBusy(true);
    try {
      const blob = await upload(`templates/letterhead/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ kind: "letterhead" }),
        contentType: DOCX,
      });
      const r = await saveLetterhead({ url: blob.url, fileName: file.name, size: file.size });
      if (!r.ok) throw new Error(r.error);
      toast.success("Letterhead saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const r = await removeLetterhead();
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Letterhead removed. Word downloads are plain documents now.");
    router.refresh();
  }

  return (
    <div className="space-y-3 text-sm">
      {letterhead ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-canvas px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-ink">{letterhead.fileName}</div>
            <div className="text-xs text-slate">
              {fmtBytes(letterhead.size)} · uploaded {fmtDate(letterhead.uploadedAt)}
            </div>
          </div>
          <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : "Upload letterhead (.docx)"}
        </Button>
      )}
      <input ref={inputRef} type="file" accept={DOCX} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <FormMessage message={error} />
      <p className="text-xs text-slate">
        Any Word document works: its header, footer, page setup and styles are kept and the body is replaced with the copy. Put <code>{"{{body}}"}</code> on
        its own line to place the copy between other content (a date line, a signature block). <code>{"{{date}}"}</code>, <code>{"{{title}}"}</code>,{" "}
        <code>{"{{subject}}"}</code> and <code>{"{{version}}"}</code> are filled in anywhere they appear, including headers and footers.
      </p>
    </div>
  );
}
