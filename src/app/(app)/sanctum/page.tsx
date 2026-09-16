import type { Metadata } from "next";

import { CharacterSheet } from "@/components/CharacterSheet";
import { QuestLog } from "@/components/QuestLog";

export const metadata: Metadata = {
  title: "Sanctum",
  description:
    "Your character sheet and today's quest log — seal a deed to earn XP, gold and a longer streak.",
  robots: { index: false, follow: false },
};

export default function SanctumPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_23rem]">
      {/* The log leads on every screen; the sheet follows it on mobile and
          sits alongside, sticky, from `lg` up. */}
      <div className="order-2 lg:order-1">
        <QuestLog />
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-22">
        <CharacterSheet />
      </div>
    </div>
  );
}
