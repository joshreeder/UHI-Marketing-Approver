"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/form-message";
import { ScheduleBar } from "@/components/schedule-bar";
import type { FormState } from "@/app/(app)/projects/actions";
import { toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ProjectFormValues = {
  name: string;
  description: string;
  designerId: string;
  startDate: string;
  dueDate: string;
  estHours: string;
  plannedRounds: number;
  reviewWindowDays: number;
  revisionDays: number;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: ProjectFormValues;
  designers: { id: string; label: string }[];
  mode: "create" | "edit";
  cancelHref: string;
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProjectForm({ action, initial, designers, mode, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [v, setV] = useState<ProjectFormValues>(initial);
  const set = <K extends keyof ProjectFormValues>(k: K, val: ProjectFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-medium text-ink">Details</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Project name" error={err("name")}>
              <Input name="name" value={v.name} onChange={(e) => set("name", e.target.value)} required autoFocus placeholder="Fall auto mailer" />
            </Field>
            <Field label="Description" hint="Optional">
              <Textarea name="description" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Audience, goal, anything approvers should know." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Designer">
                <select name="designerId" className={selectClass} value={v.designerId} onChange={(e) => set("designerId", e.target.value)}>
                  <option value="">Unassigned</option>
                  {designers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estimated hours" hint="Optional">
                <Input name="estHours" type="number" min={0} step={0.5} value={v.estHours} onChange={(e) => set("estHours", e.target.value)} placeholder="8" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date" error={err("startDate")}>
                <Input name="startDate" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Due date" error={err("dueDate")}>
                <Input name="dueDate" type="date" value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </Field>
            </div>
            {mode === "create" ? (
              <Field label="First item" hint="Optional. Creates the piece you will upload v1 to, e.g. “Mailer PDF”. Leave blank for a tracker-only project.">
                <Input name="firstItemTitle" placeholder="Mailer PDF" />
              </Field>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-medium text-ink">Review plan</h2>
          <p className="mt-1 text-xs text-slate">Used to build the timeline. Actual rounds overlay the plan as they happen.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Planned review rounds" error={err("plannedRounds")}>
              <Input name="plannedRounds" type="number" min={0} max={20} value={v.plannedRounds} onChange={(e) => set("plannedRounds", Number(e.target.value))} />
            </Field>
            <Field label="Review window (days)" error={err("reviewWindowDays")}>
              <Input name="reviewWindowDays" type="number" min={1} max={60} value={v.reviewWindowDays} onChange={(e) => set("reviewWindowDays", Number(e.target.value))} />
            </Field>
            <Field label="Revision time (days)" error={err("revisionDays")}>
              <Input name="revisionDays" type="number" min={0} max={60} value={v.revisionDays} onChange={(e) => set("revisionDays", Number(e.target.value))} />
            </Field>
          </div>
        </section>

        <FormMessage message={state.error} />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
          </Button>
          <Button variant="ghost" render={<Link href={cancelHref} />}>
            Cancel
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-medium text-ink">Planned schedule</h2>
          <p className="mt-1 text-xs text-slate">Design → review → revise → … → approved</p>
          <div className="mt-4">
            <ScheduleBar
              input={{
                startDate: v.startDate || null,
                dueDate: v.dueDate || null,
                plannedRounds: v.plannedRounds,
                reviewWindowDays: v.reviewWindowDays,
                revisionDays: v.revisionDays,
              }}
            />
          </div>
        </div>
      </aside>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && "text-brand-red")}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-brand-red">{error}</p> : hint ? <p className="text-xs text-slate">{hint}</p> : null}
    </div>
  );
}

export function projectToFormValues(p: {
  name: string;
  description: string | null;
  designerId: string | null;
  startDate: string | null;
  dueDate: string | null;
  estHours: number | null;
  plannedRounds: number;
  reviewWindowDays: number;
  revisionDays: number;
}): ProjectFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    designerId: p.designerId ?? "",
    startDate: toDateInput(p.startDate),
    dueDate: toDateInput(p.dueDate),
    estHours: p.estHours != null ? String(p.estHours) : "",
    plannedRounds: p.plannedRounds,
    reviewWindowDays: p.reviewWindowDays,
    revisionDays: p.revisionDays,
  };
}
