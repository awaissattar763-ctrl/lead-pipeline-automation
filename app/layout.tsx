import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Pipeline Automation — Concept Demo",
  description:
    "Concept demo: an n8n-style automation pipeline that captures website leads, scores them, saves them to a CRM, schedules follow-ups, and alerts on hot leads. Simulated.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
