import { requireTeam } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { getSettings } from "@/lib/settings";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTeam();
  await getSettings(); // sets the company time zone for everything rendered below
  return <AppShell session={session}>{children}</AppShell>;
}
