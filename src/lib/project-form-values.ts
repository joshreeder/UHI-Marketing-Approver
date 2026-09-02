import { toDateInput } from "@/lib/format";

/** Shape of the project form state. Shared by the client form and the server pages that seed it. */
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
