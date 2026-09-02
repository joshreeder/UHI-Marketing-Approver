import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProjectForm, projectToFormValues } from "@/components/project-form";
import { requireTeam } from "@/lib/auth/session";
import { getProjectDetail, listTeamMembers } from "@/lib/queries";
import { displayName } from "@/lib/format";
import { updateProject } from "../../actions";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeam();
  const { id } = await params;
  const [detail, team] = await Promise.all([getProjectDetail(id), listTeamMembers()]);
  if (!detail) notFound();
  const action = updateProject.bind(null, id);
  return (
    <>
      <PageHeader eyebrow="Edit project" title={detail.project.name} />
      <ProjectForm
        mode="edit"
        action={action}
        cancelHref={`/projects/${id}`}
        designers={team.map((u) => ({ id: u.id, label: displayName(u) }))}
        initial={projectToFormValues(detail.project)}
      />
    </>
  );
}
