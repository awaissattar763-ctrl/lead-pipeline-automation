// Mock CRM — all data lives in the browser's localStorage. No backend,
// no tracking, no real customer data. "Sample Business" leads below are
// fictional and clearly labeled as sample data.

import {
  FollowUp,
  LeadInput,
  ScoreResult,
  Tier,
  followUpSchedule,
  scoreLead,
} from "./scoring";

export interface RunLogEntry {
  ts: string; // ISO timestamp
  stage: string;
  message: string;
}

export interface Lead extends LeadInput {
  id: string;
  score: number;
  tier: Tier;
  reasons: string[];
  spamFlag: boolean;
  followUps: FollowUp[];
  log: RunLogEntry[];
  createdAt: string;
}

const KEY = "lpa_leads_v1";

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

export function buildLead(input: LeadInput, log: RunLogEntry[]): Lead {
  const r: ScoreResult = scoreLead(input);
  return {
    ...input,
    id: uid(),
    score: r.score,
    tier: r.tier,
    reasons: r.reasons,
    spamFlag: r.spamFlag,
    followUps: followUpSchedule(r.tier),
    log,
    createdAt: new Date().toISOString(),
  };
}

export function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLead(lead: Lead): Lead[] {
  const leads = [lead, ...loadLeads()];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(leads));
  } catch {
    /* storage full or unavailable — demo continues in memory */
  }
  return leads;
}

export function clearLeads(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function logLine(stage: string, message: string): RunLogEntry {
  return { ts: new Date().toISOString(), stage, message };
}

// Clearly-labeled fictional sample data for the admin dashboard.
export function sampleLeads(): Lead[] {
  const now = Date.now();
  const mk = (
    input: LeadInput,
    minutesAgo: number,
    logMsgs: [string, string][]
  ): Lead => {
    const r = scoreLead(input);
    return {
      ...input,
      id: uid(),
      score: r.score,
      tier: r.tier,
      reasons: r.reasons,
      spamFlag: r.spamFlag,
      followUps: followUpSchedule(r.tier),
      log: logMsgs.map(([stage, message]) => ({
        ts: new Date(now - minutesAgo * 60000).toISOString(),
        stage,
        message,
      })),
      createdAt: new Date(now - minutesAgo * 60000).toISOString(),
    };
  };

  return [
    mk(
      {
        name: "Dana R. (sample)",
        email: "dana@riverbendplumbing.com",
        service: "ai-automation",
        budget: "2000-10000",
        message:
          "We miss a lot of calls after hours. Need something that can answer and book jobs for us. Timeline is this month, please reply asap.",
      },
      42,
      [
        ["webhook", "POST /lead-intake → 200 OK (0.4s)"],
        ["scoring", "Score 95/100 → HOT (budget +35, service +20, urgency +10, business email +10, timeline +5, base 10)"],
        ["crm", "Inserted into leads table (Supabase)"],
        ["follow-up", "Scheduled: Day 0 SMS+email, Day 1 email, Day 2 call task, Day 5 check-in"],
        ["slack", "#new-leads alert sent — owner notified in 12s"],
      ]
    ),
    mk(
      {
        name: "Marcus T. (sample)",
        email: "marcus.t88@gmail.com",
        service: "website",
        budget: "500-2000",
        message:
          "Looking to redo our company website sometime this quarter. No rush.",
      },
      180,
      [
        ["webhook", "POST /lead-intake → 200 OK (0.3s)"],
        ["scoring", "Score 45/100 → WARM (budget +20, service +15, base 10)"],
        ["crm", "Inserted into leads table (Supabase)"],
        ["follow-up", "Scheduled: Day 0 email, Day 2 follow-up, Day 5 call task"],
        ["slack", "Skipped — score below 75, no alert sent"],
      ]
    ),
    mk(
      {
        name: "SEO Pro Team (sample)",
        email: "offers@seoblast.example",
        service: "fix",
        budget: "under-500",
        message:
          "We offer seo services guaranteed #1 first page of google rank #1 cheap!!!",
      },
      300,
      [
        ["webhook", "POST /lead-intake → 200 OK (0.3s)"],
        ["scoring", "Score 0/100 → COLD — spam pattern detected (−30), flagged for review"],
        ["crm", "Inserted into leads table (Supabase) with spam flag"],
        ["follow-up", "Scheduled: Day 0 confirmation only, then nurture"],
        ["slack", "Skipped — score below 75, no alert sent"],
      ]
    ),
  ];
}
