"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/app/review/actions";
import { cn } from "@/lib/utils";

export type Pin = { id: string; number: number; x: number; y: number; pageNo: number | null; body: string; author: string; addressed: boolean };

/**
 * Absolutely-positioned layer over a preview page. Shows numbered pins for existing comments and,
 * when `canPin`, lets the viewer click anywhere to drop a new pinned comment.
 */
export function PinLayer({
  pins,
  pageNo,
  canPin,
  versionId,
  approvalId,
}: {
  pins: Pin[];
  pageNo: number | null;
  canPin: boolean;
  versionId: string;
  approvalId?: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [openPin, setOpenPin] = useState<string | null>(null);

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canPin) return;
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDraft({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    setBody("");
    setOpenPin(null);
  }

  async function save() {
    if (!draft || !body.trim()) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("versionId", versionId);
    if (approvalId) fd.set("approvalId", approvalId);
    fd.set("body", body);
    fd.set("x", String(draft.x));
    fd.set("y", String(draft.y));
    if (pageNo != null) fd.set("pageNo", String(pageNo));
    const r = await addComment({}, fd);
    setBusy(false);
    if (r.error) return toast.error(r.error);
    toast.success("Note pinned.");
    setDraft(null);
    setBody("");
    router.refresh();
  }

  const pageInsPins = pins.filter((p) => (p.pageNo ?? null) === pageNo);

  return (
    <div
      className={cn("absolute inset-0", canPin && "cursor-crosshair")}
      onClick={onClick}
      title={canPin ? "Click to pin a note here" : undefined}
    >
      {pageInsPins.map((p) => (
        <div key={p.id} data-pin className="absolute" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenPin(openPin === p.id ? null : p.id);
              setDraft(null);
            }}
            className={cn(
              "-ml-3 -mt-3 flex size-6 items-center justify-center rounded-full text-[11px] font-medium text-white shadow ring-2 ring-white",
              p.addressed ? "bg-[var(--status-approved)]" : "bg-[var(--status-changes)]",
            )}
            aria-label={`Comment ${p.number}`}
          >
            {p.number}
          </button>
          {openPin === p.id ? (
            <div className="absolute left-4 top-2 z-10 w-64 rounded-lg border border-line bg-white p-3 text-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs text-slate">
                {p.author}
                {p.addressed ? <span className="ml-2 text-[var(--status-approved)]">Addressed</span> : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-ink">{p.body}</p>
            </div>
          ) : null}
        </div>
      ))}

      {draft ? (
        <div data-pin className="absolute z-10" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} onClick={(e) => e.stopPropagation()}>
          <span className="-ml-3 -mt-3 flex size-6 items-center justify-center rounded-full bg-navy text-[11px] font-medium text-white shadow ring-2 ring-white">
            +
          </span>
          <div className="absolute left-4 top-2 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} autoFocus placeholder="What should change here?" className="text-sm" />
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={busy || !body.trim()}>
                {busy ? "Saving…" : "Pin note"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
