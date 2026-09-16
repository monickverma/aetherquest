import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Vault } from "@/components/Vault";
import { loadVault } from "@/lib/queries";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "The Vault",
  description:
    "Spend the gold your deeds have earned on sigils, titles and relics.",
  robots: { index: false, follow: false },
};

export default async function VaultPage() {
  const user = await currentUser();
  if (!user) redirect("/enter");

  return <Vault initialVault={await loadVault(user)} />;
}
