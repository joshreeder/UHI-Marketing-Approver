import { requireTeam } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTeam();
  return <AppShell session={session}>{children}</AppShell>;
}
