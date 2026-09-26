"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  BUDGET_LABELS,
  SERVICE_LABELS,
  Tier,
  tierBadge,
} from "../../lib/scoring";
import {
  Lead,
  clearLeads,
  loadLeads,
  sampleLeads,
} from "../../lib/crm";

type Filter = "all" | Tier;

export default function Admin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setLeads(loadLeads());
  }, []);

  const filtered =
    filter === "all" ? leads : leads.filter((l) => l.tier === filter);

  const counts = {
    all: leads.length,
    hot: leads.filter((l) => l.tier === "hot").length,
    warm: leads.filter((l) => l.tier === "warm").length,
    cold: leads.filter((l) => l.tier === "cold").length,
  };
  const avg =
    leads.length > 0
      ? Math.round(leads.reduce((a, l) => a + l.score, 0) / leads.length)
      : 0;

  const loadSample = () => {
    const s = sampleLeads();
    try {
      window.localStorage.setItem("lpa_leads_v1", JSON.stringify(s));
    } catch {
      /* noop */
    }
    setLeads(s);
  };

  const clear = () => {
    clearLeads();
    setLeads([]);
    setOpen(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-zinc-500 hover:text-zinc-300">
              ← Demo
            </Link>
            <span className="font-semibold tracking-tight">
              Admin <span className="text-zinc-500">dashboard</span>
            </span>
          </div>
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-300">
            MOCK CRM — BROWSER ONLY
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Leads inbox</h1>
          <div className="flex gap-2">
            <button
              onClick={loadSample}
              className="rounded-lg border border-zinc-700 px-3.5 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
            >
              Load sample data
            </button>
            <button
              onClick={clear}
              className="rounded-lg border border-red-500/40 px-3.5 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Clear demo data
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ["Total leads", String(counts.all), "text-zinc-100"],
            ["🔥 Hot", String(counts.hot), "text-red-300"],
            ["🟡 Warm", String(counts.warm), "text-amber-300"],
            ["🔵 Cold", String(counts.cold), "text-sky-300"],
            ["Avg score", `${avg}/100`, "text-emerald-300"],
          ].map(([label, value, cls]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-8 flex gap-2">
          {(["all", "hot", "warm", "cold"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
                filter === f
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
          {filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-zinc-500">
              No leads yet.{" "}
              <Link href="/" className="text-emerald-300 hover:underline">
                Submit a test lead →
              </Link>{" "}
              or load sample data.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const b = tierBadge(l.tier);
                  const isOpen = open === l.id;
                  return (
                    <Fragment key={l.id}>
                      <tr
                        key={l.id}
                        className="border-b border-zinc-800/60 hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-100">
                            {l.name}
                            {l.spamFlag && (
                              <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">
                                SPAM?
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">{l.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400">
                          {SERVICE_LABELS[l.service] ?? l.service}
                          <br />
                          <span className="text-zinc-600">
                            {BUDGET_LABELS[l.budget] ?? l.budget}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-lg font-bold text-emerald-300">
                            {l.score}
                          </span>
                          <span className="text-xs text-zinc-600">/100</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${b.classes}`}
                          >
                            {b.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {new Date(l.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setOpen(isOpen ? null : l.id)}
                            className="text-xs text-cyan-300 hover:underline"
                          >
                            {isOpen ? "Hide ▲" : "Details ▼"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${l.id}-detail`} className="bg-black/40">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-5 md:grid-cols-3">
                              <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  Message
                                </p>
                                <p className="text-xs leading-relaxed text-zinc-400">
                                  “{l.message}”
                                </p>
                                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  Why this score
                                </p>
                                <ul className="space-y-1 text-xs text-zinc-400">
                                  {l.reasons.map((r, i) => (
                                    <li key={i}>› {r}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  Follow-up schedule
                                </p>
                                <ul className="space-y-2">
                                  {l.followUps.map((f, i) => (
                                    <li key={i} className="text-xs">
                                      <span className="font-semibold text-cyan-300">
                                        Day {f.day}
                                      </span>{" "}
                                      <span className="text-zinc-500">
                                        {f.channel}
                                      </span>
                                      <p className="text-zinc-400">{f.title}</p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  Pipeline run log
                                </p>
                                <div className="log-scroll max-h-48 space-y-1 overflow-y-auto font-mono text-[11px] text-zinc-500">
                                  {l.log.map((e, i) => (
                                    <p key={i}>
                                      <span className="text-cyan-400">
                                        [{new Date(e.ts).toLocaleTimeString()}]
                                      </span>{" "}
                                      {e.stage} › {e.message}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          Mock CRM: leads live only in this browser’s localStorage. In
          production this table is Supabase, fed by the n8n workflow in{" "}
          <span className="font-mono">workflow.json</span>.
        </p>
      </main>
    </div>
  );
}
