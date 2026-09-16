import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AetherQuest",
    short_name: "AetherQuest",
    description:
      "A dark-fantasy life RPG: turn habits into quests, earn XP and gold, and level five attributes.",
    start_url: "/sanctum",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0807",
    theme_color: "#0a0807",
    categories: ["productivity", "lifestyle", "games"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
