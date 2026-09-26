// Generates workflow.json — a real, import-ready n8n workflow implementing
// the same lead pipeline as the web demo:
//   Webhook → Code (lead scoring, same rules as lib/scoring.ts)
//           → Supabase (CRM insert) → Day-0 email → Wait 1d → Day-1 email
//           → Wait 2d → Day-3 call task
//           └→ IF hot (score ≥ 75) → Slack alert
//
// Placeholders the importer must fill are marked YOUR-... and explained in
// the sticky notes inside the workflow itself.
// Run: npm run make-workflow
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = () => randomUUID();

// ---------------------------------------------------------------------------
// Scoring logic — MUST stay in sync with lib/scoring.ts in the web demo.
// ---------------------------------------------------------------------------
const SCORE_JS = `// Lead scoring — transparent rule-based engine.
// Same rules as the web demo (lib/scoring.ts). Edit both together.
const lead = items[0].json;

let score = 10; // every genuine inquiry starts at 10
const reasons = [];

// 1) Budget
const budgetPoints = { 'under-500': 5, '500-2000': 20, '2000-10000': 35, '10000-plus': 45 };
const b = budgetPoints[lead.budget] || 0;
score += b;
reasons.push('Budget ' + (lead.budget || 'not given') + ': +' + b);

// 2) Service type
const servicePoints = { 'ai-automation': 20, 'website': 15, 'booking-system': 15, 'crm': 12, 'fix': 8 };
const s = servicePoints[lead.service] || 0;
score += s;
reasons.push('Service "' + (lead.service || 'not given') + '": +' + s);

// 3) Message keywords
const msg = String(lead.message || '').toLowerCase();
const hasAny = (words) => words.some((w) => msg.includes(w));

if (hasAny(['asap', 'urgent', 'immediately', 'this week', 'right away', 'as soon as possible'])) {
  score += 10;
  reasons.push('Urgency keywords detected: +10');
}
if (hasAny(['timeline', 'deadline', 'launch', 'go live'])) {
  score += 5;
  reasons.push('Timeline mentioned: +5');
}

// 4) Business email domain (not a free provider)
const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com'];
const domain = String(lead.email || '').split('@')[1] || '';
if (domain && !freeDomains.includes(domain.toLowerCase())) {
  score += 10;
  reasons.push('Business email domain (' + domain + '): +10');
}

// 5) Spam patterns
let spamFlag = false;
if (hasAny(['seo services', 'crypto', 'guaranteed #1', 'first page of google', 'rank #1'])) {
  score -= 30;
  spamFlag = true;
  reasons.push('Spam pattern detected: -30');
}

score = Math.max(0, Math.min(100, score));
const tier = score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold';
reasons.push('Total clamped to 0-100 -> ' + score + '/100 (' + tier.toUpperCase() + ')');

return [{
  json: {
    name: lead.name || '',
    email: lead.email || '',
    service: lead.service || '',
    budget: lead.budget || '',
    message: lead.message || '',
    score: score,
    tier: tier,
    reasons: reasons,
    spamFlag: spamFlag,
    receivedAt: new Date().toISOString()
  }
}];`;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------
const N = (name, type, typeVersion, position, parameters, extra = {}) => ({
  parameters,
  id: id(),
  name,
  type,
  typeVersion,
  position,
  ...extra,
});

const sticky = (name, position, content, width = 300, height = 220, color = 4) =>
  N(name, "n8n-nodes-base.stickyNote", 1, position, {
    content,
    height,
    width,
    color,
  });

const nodes = [
  sticky(
    "SETUP CHECKLIST",
    [40, 120],
    `## ⚙️ Setup checklist — do this after import\n\n` +
      `**1. Supabase** — create the tables, then replace \`YOUR-PROJECT-REF\` and \`YOUR_SUPABASE_KEY\` in the two Supabase nodes:\n` +
      `\`\`\`sql\ncreate table leads (\n  id bigint generated always as identity primary key,\n  name text, email text, service text, budget text,\n  message text, score int, tier text,\n  reasons jsonb, spam_flag boolean default false,\n  received_at timestamptz default now()\n);\ncreate table call_tasks (\n  id bigint generated always as identity primary key,\n  lead_email text, lead_name text, score int,\n  due_day int default 3, status text default 'open',\n  created_at timestamptz default now()\n);\n\`\`\`\n` +
      `Use the **service_role** key if RLS blocks inserts, or add an open insert policy.\n\n` +
      `**2. Slack** — in Slack: Apps → Incoming Webhooks → add to #new-leads → paste the URL into the Slack node (replaces \`hooks.slack.com/services/YOUR/WEBHOOK/PATH\`).\n\n` +
      `**3. SMTP** — open the two email nodes and attach your SMTP credential (Gmail App Password, Postmark, etc.). Also set \`hello@YOUR-DOMAIN.com\` as the sender.\n\n` +
      `**4.** Activate the workflow, then point the website form at the **Production URL** shown on the Webhook node.\n\n` +
      `**5.** Test with: \`curl -X POST <webhook-url> -H 'Content-Type: application/json' -d '{"name":"Test","email":"test@company.com","service":"website","budget":"500-2000","message":"Need a new site asap"}'\``,
    560,
    640,
    5
  ),

  sticky(
    "Note: Webhook",
    [180, 800],
    `## 1 — Webhook trigger\n\nReceives the website form POST. n8n gives you a Test URL and a Production URL — use the Production URL in the form's \`action\` (or your fetch call) once the workflow is Active.`,
    300,
    200
  ),
  N(
    "Lead Intake Webhook",
    "n8n-nodes-base.webhook",
    2,
    [240, 1020],
    {
      httpMethod: "POST",
      path: "lead-intake",
      responseMode: "onReceived",
      options: {},
    },
    { webhookId: id() }
  ),

  sticky(
    "Note: Scoring",
    [460, 800],
    `## 2 — Lead scoring (Code)\n\nTransparent rule-based engine, 0–100:\n\n- Budget: under $500 → +5 · $500–2k → +20 · $2–10k → +35 · $10k+ → +45\n- Service: AI automation +20 · website/booking +15 · CRM +12 · fix +8\n- Urgency keywords (asap/urgent/this week) → +10\n- Timeline words (deadline/launch) → +5\n- Business email domain → +10\n- Spam patterns (SEO/crypto/rank guarantees) → −30 + flag\n\nTier: ≥75 HOT · 45–74 WARM · <45 COLD.\n\nEdit the rules here AND in the web demo's \`lib/scoring.ts\` together.`,
    300,
    320
  ),
  N("Score Lead", "n8n-nodes-base.code", 2, [520, 1020], {
    mode: "runOnceForAllItems",
    jsCode: SCORE_JS,
  }),

  sticky(
    "Note: Supabase",
    [740, 800],
    `## 3 — CRM insert (Supabase)\n\nSaves the scored lead via the Supabase REST API. Replace:\n\n- \`YOUR-PROJECT-REF\` → your project ref\n- \`YOUR_SUPABASE_KEY\` → anon key (or service_role if RLS blocks)\n\nPrefer the native Supabase node? Swap this HTTP node for it — same fields.`,
    300,
    240
  ),
  N(
    "Supabase — Insert Lead",
    "n8n-nodes-base.httpRequest",
    4.2,
    [800, 1020],
    {
      method: "POST",
      url: "https://YOUR-PROJECT-REF.supabase.co/rest/v1/leads",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "apikey", value: "YOUR_SUPABASE_KEY" },
          { name: "Authorization", value: "Bearer YOUR_SUPABASE_KEY" },
          { name: "Content-Type", value: "application/json" },
          { name: "Prefer", value: "return=representation" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        "={{ JSON.stringify({ name: $json.name, email: $json.email, service: $json.service, budget: $json.budget, message: $json.message, score: $json.score, tier: $json.tier, reasons: $json.reasons, spam_flag: $json.spamFlag, received_at: $json.receivedAt }) }}",
      options: {},
    }
  ),

  sticky(
    "Note: Day 0 email",
    [1020, 800],
    `## 4 — Day 0: instant confirmation\n\nSent within a minute of the form submit. Attach your SMTP credential to this node and set the sender address. Keep it short and human.`,
    300,
    200
  ),
  N(
    "Day 0 — Confirmation Email",
    "n8n-nodes-base.emailSend",
    2.1,
    [1080, 1020],
    {
      fromEmail: "hello@YOUR-DOMAIN.com",
      toEmail: "={{ $json.email }}",
      subject: "=Thanks {{ $json.name }} — we received your request",
      emailType: "text",
      message:
        "=Hi {{ $json.name }},\n\nThanks for reaching out about {{ $json.service }} — we got your request and will reply within one business day.\n\nIf it's urgent, just reply to this email.\n\n— The team",
      options: {},
    }
  ),

  sticky(
    "Note: Wait 1 day",
    [1300, 800],
    `## 5 — Wait 1 day\n\nPauses the execution, then continues with the Day-1 follow-up. Waits survive n8n restarts.`,
    300,
    160
  ),
  N("Wait 1 Day", "n8n-nodes-base.wait", 1.1, [1360, 1020], {
    resume: "afterTimeInterval",
    amount: 1,
    unit: "days",
  }),

  sticky(
    "Note: Day 1 email",
    [1580, 800],
    `## 6 — Day 1: follow-up email\n\nSecond touch. Personalize per tier with an IF on \`$json.tier\` if you want hot leads to get a different message (or an SMS via Twilio).`,
    300,
    200
  ),
  N(
    "Day 1 — Follow-up Email",
    "n8n-nodes-base.emailSend",
    2.1,
    [1640, 1020],
    {
      fromEmail: "hello@YOUR-DOMAIN.com",
      toEmail: "={{ $json.email }}",
      subject: "=Quick follow-up on your {{ $json.service }} request",
      emailType: "text",
      message:
        "=Hi {{ $json.name }},\n\nJust checking in on your {{ $json.service }} request from yesterday — happy to answer any questions or jump on a quick call.\n\nWhat would be a good time?\n\n— The team",
      options: {},
    }
  ),

  sticky(
    "Note: Wait 2 days",
    [1860, 800],
    `## 7 — Wait 2 more days\n\nThen creates the Day-3 call task. Total cadence: Day 0 → Day 1 → Day 3.`,
    300,
    160
  ),
  N("Wait 2 Days", "n8n-nodes-base.wait", 1.1, [1920, 1020], {
    resume: "afterTimeInterval",
    amount: 2,
    unit: "days",
  }),

  sticky(
    "Note: Call task",
    [2140, 800],
    `## 8 — Day 3: call task\n\nDrops an open call task into Supabase so the owner sees “call this lead” in their CRM/tasks view instead of relying on memory.`,
    300,
    200
  ),
  N(
    "Day 3 — Call Task",
    "n8n-nodes-base.httpRequest",
    4.2,
    [2200, 1020],
    {
      method: "POST",
      url: "https://YOUR-PROJECT-REF.supabase.co/rest/v1/call_tasks",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "apikey", value: "YOUR_SUPABASE_KEY" },
          { name: "Authorization", value: "Bearer YOUR_SUPABASE_KEY" },
          { name: "Content-Type", value: "application/json" },
          { name: "Prefer", value: "return=representation" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        '={{ JSON.stringify({ lead_email: $json.email, lead_name: $json.name, score: $json.score, due_day: 3, status: "open" }) }}',
      options: {},
    }
  ),

  sticky(
    "Note: Hot-lead branch",
    [460, 1180],
    `## 9 — Hot-lead branch\n\nRuns in parallel off the scoring node: if \`score ≥ 75\`, the owner gets a Slack alert within seconds. The main chain (CRM → emails) continues regardless — the IF's empty branch simply ends.`,
    300,
    220
  ),
  N(
    "Is Hot Lead?",
    "n8n-nodes-base.if",
    2.2,
    [520, 1420],
    {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "loose",
          version: 2,
        },
        conditions: [
          {
            id: id(),
            leftValue: "={{ $json.score }}",
            rightValue: 75,
            operator: { type: "number", operation: "largerEqual" },
          },
        ],
        combinator: "and",
      },
      looseTypeValidation: true,
      options: {},
    }
  ),

  sticky(
    "Note: Slack",
    [740, 1180],
    `## 10 — Slack alert (hot leads only)\n\nPosts to #new-leads via an Incoming Webhook — no OAuth needed. Create it in Slack (Apps → Incoming Webhooks) and paste the URL below, replacing the placeholder.`,
    300,
    220
  ),
  N(
    "Slack — Hot Lead Alert",
    "n8n-nodes-base.httpRequest",
    4.2,
    [800, 1420],
    {
      method: "POST",
      url: "https://hooks.slack.com/services/YOUR/WEBHOOK/PATH",
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        "={{ JSON.stringify({ text: ':fire: HOT LEAD — ' + $json.name + ' (' + $json.score + '/100)\\n' + $json.email + ' · ' + $json.service + ' · budget ' + $json.budget + '\\n\"' + String($json.message).slice(0, 200) + '\"' }) }}",
      options: {},
    }
  ),
];

const conn = (node, type = "main", index = 0) => ({ node, type, index });

const connections = {
  "Lead Intake Webhook": { main: [[conn("Score Lead")]] },
  "Score Lead": {
    main: [[conn("Supabase — Insert Lead"), conn("Is Hot Lead?")]],
  },
  "Supabase — Insert Lead": { main: [[conn("Day 0 — Confirmation Email")]] },
  "Day 0 — Confirmation Email": { main: [[conn("Wait 1 Day")]] },
  "Wait 1 Day": { main: [[conn("Day 1 — Follow-up Email")]] },
  "Day 1 — Follow-up Email": { main: [[conn("Wait 2 Days")]] },
  "Wait 2 Days": { main: [[conn("Day 3 — Call Task")]] },
  "Is Hot Lead?": { main: [[conn("Slack — Hot Lead Alert")]] },
};

const workflow = {
  name: "Lead Intake → Score → CRM → Follow-ups (concept demo)",
  nodes,
  pinData: {},
  connections,
  active: false,
  settings: { executionOrder: "v1" },
  tags: [],
};

const out = join(ROOT, "workflow.json");
writeFileSync(out, JSON.stringify(workflow, null, 2) + "\n");
console.log("Wrote", out, `(${nodes.length} nodes)`);
