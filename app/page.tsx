"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Pipeline, { StageStatus } from "../components/Pipeline";
import {
  BUDGET_LABELS,
  LeadInput,
  SERVICE_LABELS,
  followUpSchedule,
  scoreLead,
  tierBadge,
} from "../lib/scoring";
import { Lead, RunLogEntry, buildLead, logLine, saveLead } from "../lib/crm";

const EMPTY: LeadInput = {
  name: "",
  email: "",
  service: "ai-automation",
  budget: "2000-10000",
  message: "",
};

const PRESETS: { label: string; data: LeadInput }[] = [
  {
    label: "🔥 Hot lead",
    data: {
      name: "Sarah Mitchell",
      email: "sarah@mitchellroofing.com",
      service: "ai-automation",
      budget: "2000-10000",
      message:
        "We miss calls every evening and lose jobs to competitors. Need an AI system that answers and books estimates. Please call me asap — hoping to decide this week.",
    },
  },
  {
    label: "🟡 Warm lead",
    data: {
      name: "Tom Becker",
      email: "tom.becker92@gmail.com",
      service: "website",
      budget: "500-2000",
      message: "Thinking about redoing our website sometime next quarter.",
    },
  },
  {
    label: "🔵 Cold / spam",
    data: {
      name: "SEO Blast",
      email: "promo@seoblast.example",
      service: "fix",
      budget: "under-500",
      message: "We offer seo services guaranteed #1 first page of google rank #1!",
    },
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [form, setForm] = useState<LeadInput>(EMPTY);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [statuses, setStatuses] = useState<StageStatus[]>([
    "idle",
    "idle",
    "idle",
    "idle",
    "idle",
  ]);
  const [log, setLog] = useState<RunLogEntry[]>([]);
  const [result, setResult] = useState<Lead | null>(null);
  const runId = useRef(0);

  const set = (patch: Partial<LeadInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  async function runPipeline(input: LeadInput) {
    const id = ++runId.current;
    const alive = () => runId.current === id;

    setPhase("running");
    setResult(null);
    setStatuses(["idle", "idle", "idle", "idle", "idle"]);

    const entries: RunLogEntry[] = [];
    const push = (stage: string, message: string) => {
      const e = logLine(stage, message);
      entries.push(e);
      if (alive()) setLog([...entries]);
    };
    const setStage = (i: number, s: StageStatus) => {
      if (!alive()) return;
      setStatuses((prev) => {
        const n = [...prev];
        n[i] = s;
        return n;
      });
    };

    // Stage 1 — capture
    setStage(0, "running");
    push(
      "webhook",
      `POST /lead-intake — quote form submitted by “${input.name || "visitor"}”`
    );
    await sleep(950);
    if (!alive()) return;
    setStage(0, "done");
    push("webhook", "200 OK — payload validated (0.4s)");

    // Stage 2 — scoring
    setStage(1, "running");
    push("scoring", "Running transparent rule-based scoring engine…");
    await sleep(1200);
    if (!alive()) return;
    const scored = scoreLead(input);
    push(
      "scoring",
      `Score ${scored.score}/100 → ${scored.tier.toUpperCase()} (${scored.reasons.length - 1} signals evaluated)`
    );
    setStage(1, "done");

    // Stage 3 — CRM
    setStage(2, "running");
    push("crm", "Inserting lead → Supabase “leads” table…");
    await sleep(950);
    if (!alive()) return;
    const lead = buildLead(input, entries);
    saveLead(lead);
    push("crm", `Lead saved — id ${lead.id}`);
    setStage(2, "done");

    // Stage 4 — follow-ups
    setStage(3, "running");
    const sched = followUpSchedule(scored.tier);
    push(
      "follow-up",
      `Scheduling ${sched.length} automated follow-ups: ${sched
        .map((f) => `Day ${f.day} ${f.channel}`)
        .join(" · ")}`
    );
    await sleep(1100);
    if (!alive()) return;
    setStage(3, "done");

    // Stage 5 — Slack (hot only)
    if (scored.tier === "hot") {
      setStage(4, "running");
      push("slack", "Score ≥ 75 — posting to #new-leads…");
      await sleep(1000);
      if (!alive()) return;
      push("slack", "Alert delivered — owner notified in ~12 seconds");
      setStage(4, "done");
    } else {
      push(
        "slack",
        `Skipped — score ${scored.score} is below the 75 hot-lead threshold`
      );
      setStage(4, "skipped");
    }

    if (alive()) {
      setResult(lead);
      setPhase("done");
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "running") return;
    runPipeline({ ...form });
  };

  const badge = result ? tierBadge(result.tier) : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-lg">
              ⚡
            </span>
            <span className="font-semibold tracking-tight">
              Lead Pipeline <span className="text-zinc-500">Automation</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-300">
              CONCEPT DEMO — SIMULATED
            </span>
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-700 px-3.5 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Admin →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Every website lead,{" "}
          <span className="text-emerald-400">captured, scored &amp; followed up</span>{" "}
          — automatically.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
          A concept demo of an n8n-powered automation pipeline for small
          businesses. Play the website visitor: submit the quote form and watch
          the pipeline score the lead, save it to the CRM, schedule follow-ups,
          and alert the owner about hot leads.
        </p>
        <p className="mt-3 text-xs text-zinc-600">
          Nothing here is connected to real services — scoring, CRM, email and
          Slack are all simulated in your browser.
        </p>
      </section>

      {/* Demo */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sample website form</h2>
              <span className="text-[11px] uppercase tracking-widest text-zinc-600">
                “Request a quote”
              </span>
            </div>
            <p className="mb-4 text-sm text-zinc-500">
              This stands in for the contact form on a business website. In the
              real setup, n8n receives this via webhook.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set(p.data)}
                  disabled={phase === "running"}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:opacity-40"
                >
                  Fill: {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-400">
                    Name
                  </span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="Jane Cooper"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-emerald-500/60"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-400">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-emerald-500/60"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-400">
                    Service needed
                  </span>
                  <select
                    value={form.service}
                    onChange={(e) => set({ service: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                  >
                    {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-400">
                    Budget range
                  </span>
                  <select
                    value={form.budget}
                    onChange={(e) => set({ budget: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                  >
                    {Object.entries(BUDGET_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-400">
                  Message
                </span>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => set({ message: e.target.value })}
                  placeholder="Tell us what you need and when…"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-emerald-500/60"
                />
              </label>
              <button
                type="submit"
                disabled={phase === "running"}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
              >
                {phase === "running" ? "Pipeline running…" : "Submit test lead →"}
              </button>
            </form>
          </div>

          {/* Pipeline */}
          <Pipeline statuses={statuses} log={log} />
        </div>

        {/* Result */}
        {result && badge && (
          <div className="msg-in mt-6 grid gap-6 lg:grid-cols-5">
            {/* Score card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  Lead score
                </h3>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${badge.classes}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-bold tracking-tight text-emerald-300">
                  {result.score}
                </span>
                <span className="pb-2 text-zinc-500">/ 100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000"
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-300">
                {result.name} · {result.email}
              </p>
              <p className="text-xs text-zinc-500">
                {SERVICE_LABELS[result.service]} ·{" "}
                {BUDGET_LABELS[result.budget]}
              </p>
              {result.spamFlag && (
                <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  ⚠️ Flagged as possible spam — held for manual review, no
                  aggressive follow-up scheduled.
                </p>
              )}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Why this score
                </p>
                <ul className="space-y-1.5 text-xs text-zinc-400">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-400">›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Follow-ups + Slack */}
            <div className="space-y-6 lg:col-span-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  Automated follow-up timeline
                </h3>
                <div className="space-y-0">
                  {result.followUps.map((f, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-[11px] font-bold text-cyan-300">
                          D{f.day}
                        </span>
                        {i < result.followUps.length - 1 && (
                          <span className="h-8 w-px bg-zinc-800" />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-semibold text-zinc-100">
                          {f.title}{" "}
                          <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                            {f.channel}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{f.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.tier === "hot" ? (
                <div className="msg-in rounded-2xl border border-zinc-700 bg-[#1a1d21] p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                    Mock Slack alert — <span className="text-zinc-300">#new-leads</span>{" "}
                    <span className="ml-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                      SIMULATED
                    </span>
                  </p>
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-zinc-950">
                      L
                    </span>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-zinc-100">LeadBot</span>{" "}
                        <span className="rounded bg-zinc-700/60 px-1 py-0.5 text-[10px] text-zinc-300">
                          APP
                        </span>{" "}
                        <span className="text-xs text-zinc-500">just now</span>
                      </p>
                      <p className="mt-1 text-sm text-zinc-200">
                        🔥 <strong>HOT LEAD</strong> — {result.name} (
                        {result.score}/100)
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <p className="text-zinc-500">
                          Email{" "}
                          <span className="text-zinc-300">{result.email}</span>
                        </p>
                        <p className="text-zinc-500">
                          Service{" "}
                          <span className="text-zinc-300">
                            {SERVICE_LABELS[result.service]}
                          </span>
                        </p>
                        <p className="text-zinc-500">
                          Budget{" "}
                          <span className="text-zinc-300">
                            {BUDGET_LABELS[result.budget]}
                          </span>
                        </p>
                        <p className="text-zinc-500">
                          Message{" "}
                          <span className="text-zinc-300">
                            “{result.message.slice(0, 60)}
                            {result.message.length > 60 ? "…" : ""}”
                          </span>
                        </p>
                      </div>
                      <Link
                        href="/admin"
                        className="mt-3 inline-block rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                      >
                        View in CRM →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-600">
                  No Slack alert — only hot leads (score ≥ 75) notify the owner.
                  Try the “🔥 Hot lead” preset.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/80 bg-zinc-900/20">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            What the automation does
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-zinc-500">
            Five steps, running 24/7 — so no website inquiry ever sits unread in
            an inbox again.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["📝", "Capture", "Every form submission hits a webhook instantly — no more leads rotting in an unchecked inbox."],
              ["🧠", "Score", "A transparent rule-based engine scores each lead 0–100 from budget, service, urgency keywords and email domain. No black box."],
              ["🗄️", "Save", "The lead lands in the CRM (Supabase) with its score, tier and full run history."],
              ["✉️", "Follow up", "Hot leads get an instant SMS + email and a call task. Warm and cold leads get their own lighter sequences."],
              ["⚡", "Alert", "Score 75+ triggers a Slack alert so the owner can call within minutes — while the lead is still hot."],
            ].map(([icon, title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <p className="text-2xl">{icon}</p>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulated vs real */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Honest breakdown: simulated vs. real
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
            <h3 className="font-semibold text-amber-300">
              Simulated in this demo
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>• Webhook, scoring, CRM, emails, Slack — all in-browser</li>
              <li>• Leads persist only in your browser (localStorage)</li>
              <li>• No messages are actually sent anywhere</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6">
            <h3 className="font-semibold text-emerald-300">
              Real in production
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>• <span className="font-mono text-xs">workflow.json</span> imports straight into n8n</li>
              <li>• Same scoring rules run in the n8n Code node</li>
              <li>• Supabase CRM, real SMTP emails, real Slack webhook</li>
              <li>• Waits schedule Day 1 / Day 3 follow-ups for real</li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-zinc-600">
          This is a concept demo built to show what the automation looks like —
          not a client project, and no client names, testimonials or results are
          claimed anywhere.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-zinc-600 sm:flex-row">
          <p>
            Lead Pipeline Automation — concept demo. Simulated; no real services
            connected.
          </p>
          <Link href="/admin" className="hover:text-zinc-400">
            Open admin dashboard →
          </Link>
        </div>
      </footer>
    </div>
  );
}
