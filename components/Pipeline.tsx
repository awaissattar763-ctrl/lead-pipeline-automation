"use client";

import type { RunLogEntry } from "../lib/crm";

export type StageStatus = "idle" | "running" | "done" | "skipped";

export interface StageDef {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

export const STAGES: StageDef[] = [
  {
    key: "webhook",
    title: "Web Form Capture",
    subtitle: "Website form → webhook → n8n",
    icon: "📝",
  },
  {
    key: "scoring",
    title: "AI Lead Scoring",
    subtitle: "Rule-based engine scores 0–100",
    icon: "🧠",
  },
  {
    key: "crm",
    title: "CRM Entry",
    subtitle: "Lead saved to Supabase",
    icon: "🗄️",
  },
  {
    key: "follow-up",
    title: "Automated Follow-up",
    subtitle: "Day 0 / 1 / 3 sequence scheduled",
    icon: "✉️",
  },
  {
    key: "slack",
    title: "Slack Alert",
    subtitle: "Hot leads (≥75) ping the owner",
    icon: "⚡",
  },
];

function statusRing(status: StageStatus): string {
  switch (status) {
    case "running":
      return "border-cyan-400/60 bg-cyan-400/10";
    case "done":
      return "border-emerald-400/50 bg-emerald-400/10";
    case "skipped":
      return "border-zinc-700 bg-zinc-900/60 opacity-60";
    default:
      return "border-zinc-800 bg-zinc-900/40 opacity-50";
  }
}

export default function Pipeline({
  statuses,
  log,
}: {
  statuses: StageStatus[];
  log: RunLogEntry[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Live pipeline
        </h3>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
          SIMULATED
        </span>
      </div>

      <div className="space-y-2.5">
        {STAGES.map((s, i) => {
          const st = statuses[i] ?? "idle";
          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300 ${statusRing(
                st
              )}`}
            >
              <span className="text-xl">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-100">{s.title}</p>
                  {st === "running" && (
                    <span className="flex gap-1">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-zinc-500">{s.subtitle}</p>
              </div>
              <span className="text-xs font-medium text-zinc-400">
                {st === "done" && <span className="text-emerald-300">✓ done</span>}
                {st === "running" && <span className="text-cyan-300">running…</span>}
                {st === "skipped" && <span className="text-zinc-500">skipped</span>}
                {st === "idle" && <span className="text-zinc-600">waiting</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/60 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Run log
        </p>
        <div className="log-scroll max-h-44 space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed">
          {log.length === 0 && (
            <p className="text-zinc-600">
              …waiting for a test lead. Submit the form to run the pipeline.
            </p>
          )}
          {log.map((e, i) => (
            <p key={i} className="msg-in text-zinc-400">
              <span className="text-cyan-400">
                [{new Date(e.ts).toLocaleTimeString()}]
              </span>{" "}
              <span className="text-zinc-500">{e.stage} ›</span> {e.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
