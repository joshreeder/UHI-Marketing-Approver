import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-xs text-slate">{eyebrow}</div> : null}
        <h1 className="text-xl text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
