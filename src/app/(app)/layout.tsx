import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { GameProvider } from "@/components/GameProvider";
import { buildSnapshot } from "@/lib/queries";
import { currentUser } from "@/lib/session";

/**
 * The signed-in shell.
 *
 * The snapshot is fetched on the server and handed to the client provider as
 * initial state, so the first paint already has real numbers in it — there is
 * no authenticated page that flashes empty and then fills in.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/enter");

  const snapshot = await buildSnapshot(user);

  return (
    <GameProvider initialSnapshot={snapshot}>
      <AppShell>{children}</AppShell>
    </GameProvider>
  );
}
