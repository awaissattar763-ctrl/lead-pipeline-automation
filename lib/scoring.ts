// Transparent, rule-based lead scoring engine.
// NOTE: the n8n workflow (workflow.json → "Score Lead" Code node) implements
// these exact same rules in JavaScript. Keep both in sync if you change them.

export type Tier = "hot" | "warm" | "cold";

export interface LeadInput {
  name: string;
  email: string;
  service: string; // service key, e.g. "ai-automation"
  budget: string; // budget key, e.g. "2000-10000"
  message: string;
}

export interface ScoreResult {
  score: number; // 0–100
  tier: Tier;
  reasons: string[]; // human-readable explanation of the score
  spamFlag: boolean;
}

export interface FollowUp {
  day: number;
  channel: string;
  title: string;
  detail: string;
}

export const SERVICE_LABELS: Record<string, string> = {
  "ai-automation": "AI chatbot / automation",
  website: "New website",
  "booking-system": "Online booking system",
  crm: "CRM setup",
  fix: "Fix / small change",
};

export const BUDGET_LABELS: Record<string, string> = {
  "under-500": "Under $500",
  "500-2000": "$500 – $2,000",
  "2000-10000": "$2,000 – $10,000",
  "10000-plus": "$10,000+",
};

const BUDGET_POINTS: Record<string, number> = {
  "under-500": 5,
  "500-2000": 20,
  "2000-10000": 35,
  "10000-plus": 45,
};

const SERVICE_POINTS: Record<string, number> = {
  "ai-automation": 20,
  website: 15,
  "booking-system": 15,
  crm: 12,
  fix: 8,
};

const URGENCY_WORDS = [
  "asap",
  "urgent",
  "immediately",
  "this week",
  "right away",
  "as soon as possible",
];
const TIMELINE_WORDS = ["timeline", "deadline", "launch", "go live", "go-live"];
const SPAM_WORDS = [
  "seo services",
  "crypto",
  "guaranteed #1",
  "first page of google",
  "rank #1",
];
const FREE_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "protonmail.com",
];

function hasAny(haystack: string, words: string[]): boolean {
  return words.some((w) => haystack.includes(w));
}

export function scoreLead(input: LeadInput): ScoreResult {
  let score = 10; // every genuine inquiry starts at 10
  const reasons: string[] = [];
  let spamFlag = false;

  const b = BUDGET_POINTS[input.budget] ?? 0;
  score += b;
  reasons.push(
    `Budget ${BUDGET_LABELS[input.budget] ?? "not given"}: +${b} pts`
  );

  const s = SERVICE_POINTS[input.service] ?? 0;
  score += s;
  reasons.push(
    `Service “${SERVICE_LABELS[input.service] ?? "not given"}”: +${s} pts`
  );

  const msg = (input.message || "").toLowerCase();

  if (hasAny(msg, URGENCY_WORDS)) {
    score += 10;
    reasons.push("Urgency keywords detected (asap / urgent / this week): +10 pts");
  }
  if (hasAny(msg, TIMELINE_WORDS)) {
    score += 5;
    reasons.push("Timeline mentioned (deadline / launch): +5 pts");
  }

  const domain = (input.email.split("@")[1] || "").toLowerCase();
  if (domain && !FREE_DOMAINS.includes(domain)) {
    score += 10;
    reasons.push(`Business email domain (${domain}): +10 pts`);
  }

  if (hasAny(msg, SPAM_WORDS)) {
    score -= 30;
    spamFlag = true;
    reasons.push("Spam pattern detected (SEO/crypto/rank guarantee): −30 pts");
  }

  score = Math.max(0, Math.min(100, score));
  const tier: Tier = score >= 75 ? "hot" : score >= 45 ? "warm" : "cold";
  reasons.push(`Total clamped to 0–100 → ${score}/100 (${tier.toUpperCase()})`);

  return { score, tier, reasons, spamFlag };
}

export function followUpSchedule(tier: Tier): FollowUp[] {
  if (tier === "hot") {
    return [
      {
        day: 0,
        channel: "SMS + Email",
        title: "Instant response",
        detail:
          "Auto-SMS + email within 60 seconds: “Thanks {name}, we got your request — expect a call today.”",
      },
      {
        day: 1,
        channel: "Email",
        title: "Personal check-in",
        detail: "Owner sends a personal follow-up email referencing the request.",
      },
      {
        day: 2,
        channel: "Call task",
        title: "Phone call",
        detail: "CRM creates a call task for the owner — hot leads get called, not just emailed.",
      },
      {
        day: 5,
        channel: "Email",
        title: "Last check-in",
        detail: "“Still interested? Happy to answer questions.” then the lead goes to nurture.",
      },
    ];
  }
  if (tier === "warm") {
    return [
      {
        day: 0,
        channel: "Email",
        title: "Instant confirmation",
        detail: "Auto-email: “Thanks {name}, we’ll reply within one business day.”",
      },
      {
        day: 2,
        channel: "Email",
        title: "Follow-up + social proof",
        detail: "Second touch with a relevant example of similar work.",
      },
      {
        day: 5,
        channel: "Call task",
        title: "Phone call",
        detail: "CRM creates a call task if there’s been no reply.",
      },
    ];
  }
  return [
    {
      day: 0,
      channel: "Email",
      title: "Instant confirmation",
      detail: "Auto-email: “Thanks {name}, we’ll be in touch.”",
    },
    {
      day: 7,
      channel: "Email",
      title: "Nurture",
      detail: "One polite nurture email a week later, then the lead rests.",
    },
  ];
}

export function tierBadge(tier: Tier): { label: string; classes: string } {
  if (tier === "hot")
    return {
      label: "🔥 HOT",
      classes: "bg-red-500/15 text-red-300 border-red-500/40",
    };
  if (tier === "warm")
    return {
      label: "🟡 WARM",
      classes: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    };
  return {
    label: "🔵 COLD",
    classes: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  };
}
