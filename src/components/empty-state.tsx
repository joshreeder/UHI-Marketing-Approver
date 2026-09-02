import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
