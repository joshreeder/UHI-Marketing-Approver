"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Token input for approver emails with suggestions from past approvers.
 * Submits as a hidden `emails` field (comma separated) so server actions stay simple.
 */
export function ApproverInput({ name = "emails", suggestions, autoFocus }: { name?: string; suggestions: string[]; autoFocus?: boolean }) {
  const [chips, setChips] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions.filter((s) => !chips.includes(s) && (q ? s.includes(q) : true)).slice(0, 6);
  }, [text, chips, suggestions]);

  function add(raw: string) {
    const parts = raw
      .split(/[\s,;]+/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (!parts.length) return;
    setChips((c) => [...c, ...parts.filter((p) => !c.includes(p))]);
    setText("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (text.trim()) {
        e.preventDefault();
        add(matches.length && !EMAIL.test(text.trim()) ? matches[0] : text);
      }
    } else if (e.key === "Backspace" && !text && chips.length) {
      setChips((c) => c.slice(0, -1));
    }
  }

  const invalid = chips.filter((c) => !EMAIL.test(c));

  return (
    <div className="relative">
      <input type="hidden" name={name} value={chips.join(", ")} />
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 text-sm",
          focused && "border-ring ring-3 ring-ring/50",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((c) => (
          <span key={c} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", EMAIL.test(c) ? "bg-navy-tint text-navy-deep" : "bg-brand-red-tint text-brand-red")}>
            {c}
            <button type="button" aria-label={`Remove ${c}`} className="opacity-60 hover:opacity-100" onClick={() => setChips((x) => x.filter((y) => y !== c))}>
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (text.trim() && EMAIL.test(text.trim())) add(text);
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[\s,;]/.test(t)) {
              e.preventDefault();
              add(t);
            }
          }}
          placeholder={chips.length ? "" : "Type an email and press Enter"}
          className="min-w-[160px] flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-ink"
          autoComplete="off"
        />
      </div>
      {focused && matches.length ? (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
          {matches.map((m) => (
            <li key={m}>
              <button type="button" className="w-full px-3 py-1.5 text-left text-ink hover:bg-canvas" onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)}>
                {m}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {invalid.length ? <p className="mt-1 text-xs text-brand-red">Not a valid email: {invalid.join(", ")}</p> : null}
    </div>
  );
}
