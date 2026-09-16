import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Codex } from "@/components/Codex";
import { loadCodexStats, loadDeeds } from "@/lib/queries";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Codex of Deeds",
  description:
    "The permanent record of every quest you have sealed, with the XP and gold each one paid.",
  robots: { index: false, follow: false },
};

export default async function CodexPage() {
  const user = await currentUser();
  if (!user) redirect("/enter");

  const [stats, { deeds, hasMore }] = await Promise.all([
    loadCodexStats(user.id),
    loadDeeds(user.id, 0),
  ]);

  return (
    <Codex stats={stats} initialDeeds={deeds} initialHasMore={hasMore} />
  );
}
