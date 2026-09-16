import { ImageResponse } from "next/og";

export const alt =
  "AetherQuest — keep your days like a grimoire. A dark-fantasy life RPG.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Rendered once at build time into a static PNG for link previews. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#ece1cb",
          fontFamily: "serif",
          background:
            "radial-gradient(900px 600px at 18% 0%, rgba(201,162,39,0.22), transparent 62%), linear-gradient(180deg, #14100c 0%, #050403 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1px solid rgba(201,162,39,0.35)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 12,
            textTransform: "uppercase",
          }}
        >
          <span>Aether</span>
          <span style={{ color: "#c9a227" }}>quest</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, lineHeight: 1.02, letterSpacing: -1 }}>
            Keep your days
          </div>
          <div style={{ display: "flex", fontSize: 92, lineHeight: 1.02 }}>
            <span>like a&nbsp;</span>
            <span style={{ color: "#eccb69" }}>grimoire.</span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              color: "#bfb29a",
              maxWidth: 900,
            }}
          >
            Habits become quests. Deeds pay XP and gold. Five attributes rise,
            and the streak keeps the flame lit.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          {[
            ["Might", "#ca604c"],
            ["Intellect", "#7189cc"],
            ["Discipline", "#c9a227"],
            ["Vitality", "#85a055"],
            ["Spirit", "#a86fa0"],
          ].map(([name, color]) => (
            <div
              key={name}
              style={{
                display: "flex",
                padding: "10px 20px",
                fontSize: 20,
                letterSpacing: 4,
                textTransform: "uppercase",
                color,
                border: `1px solid ${color}`,
                borderRadius: 4,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
