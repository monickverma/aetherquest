import type { Metadata } from "next";

import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Return to your AetherQuest character — your quests, streak and gold are waiting where you left them.",
  alternates: { canonical: "/enter" },
};

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Open the book"
      lede="Your character is exactly where you left it. So is your streak — for now."
    >
      <AuthForm mode="enter" next={safeNext(next)} />
    </AuthFrame>
  );
}
