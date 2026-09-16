import type { Metadata } from "next";

import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";

export const metadata: Metadata = {
  title: "Create your character",
  description:
    "Start a free AetherQuest character. Turn your habits into quests, earn XP and gold, and level five attributes.",
  alternates: { canonical: "/enlist" },
};

export default function EnlistPage() {
  return (
    <AuthFrame
      eyebrow="A new chronicle"
      title="Write your name in the book"
      lede="Level one. No gold, no titles, no streak. Everyone starts on this exact page."
    >
      <AuthForm mode="enlist" next="/sanctum" />
    </AuthFrame>
  );
}
