import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond, IM_Fell_English } from "next/font/google";

import { siteUrl } from "@/lib/env";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

const fell = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-fell",
  display: "swap",
});

const DESCRIPTION =
  "AetherQuest turns the things you already meant to do into a character worth levelling. Track habits as quests, earn XP and gold, build a streak, and watch five attributes rise — with every number kept honest on the server.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "AetherQuest — Turn your life into a grimoire",
    template: "%s · AetherQuest",
  },
  description: DESCRIPTION,
  applicationName: "AetherQuest",
  keywords: [
    "habit tracker",
    "life RPG",
    "gamified productivity",
    "quest log",
    "streak tracker",
    "XP levelling",
    "self improvement",
  ],
  authors: [{ name: "AetherQuest" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "AetherQuest",
    title: "AetherQuest — Turn your life into a grimoire",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AetherQuest — Turn your life into a grimoire",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: "#0a0807",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${garamond.variable} ${fell.variable}`}
    >
      <body className="antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        {/* Atmosphere, drawn above the page and inert to the pointer. */}
        <div className="vignette" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
