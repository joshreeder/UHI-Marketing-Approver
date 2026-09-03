"use client";

import { useRouter } from "next/navigation";
import { VersionForm } from "@/components/version-form";

/** The "get started" panel on a project page: drop the artwork or paste the copy; the piece is created automatically. */
export function ProjectIntake({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-medium text-ink">Add the piece to review</h2>
      <p className="mb-4 mt-1 text-sm text-slate">
        Drop in the artwork, PDF or Word document for <span className="font-medium text-ink">{projectName}</span>, or write the email copy. You will preview it next and then send it to approvers.
      </p>
      <VersionForm target={{ kind: "project", projectId }} nextNumber={1} inline onSaved={({ itemId }) => router.push(`/items/${itemId}`)} />
    </section>
  );
}
