import type { Metadata } from "next";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";
import { requireTeam } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { displayName } from "@/lib/format";
import { createProject } from "../actions";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const session = await requireTeam();
  const [team, settings] = await Promise.all([listTeamMembers(), getSettings()]);
  return (
    <>
      <PageHeader title="New project" description="Name it, set the dates, and pick how many review rounds you expect." />
      <ProjectForm
        mode="create"
        action={createProject}
        cancelHref="/"
        designers={team.map((u) => ({ id: u.id, label: displayName(u) }))}
        initial={{
          name: "",
          description: "",
          designerId: session.user.role === "designer" ? session.user.id : "",
          startDate: format(new Date(), "yyyy-MM-dd"),
          dueDate: "",
          estHours: "",
          plannedRounds: settings.defaults.plannedRounds,
          reviewWindowDays: settings.defaults.reviewWindowDays,
          revisionDays: settings.defaults.revisionDays,
        }}
      />
    </>
  );
}
