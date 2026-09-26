# Lead Pipeline Automation (Concept Demo)

A polished **concept demo** of an n8n-style lead pipeline for small businesses,
built to show prospective clients (agencies, home-service businesses) what
happens when website inquiries are captured, scored, and followed up
automatically.

**Important: the web app is a concept demo — the webhook, scoring, CRM, emails
and Slack alerts are all simulated in the browser. No real n8n instance, no
Supabase, no SMTP, no Slack, and no real lead data are involved.** All sample
leads are fictional and labeled as such. Nothing here claims a client, a
testimonial, or a result.

## What it demonstrates

**Public demo page (`/`)** — the visitor plays a website visitor submitting a
quote-request form (name, email, service needed, budget range, message).
One-click presets fill in a 🔥 hot, 🟡 warm, or 🔵 cold/spam example. On
submit, the pipeline animates through five stages:

1. 📝 **Web Form Capture** — form → webhook (simulated `POST /lead-intake`)
2. 🧠 **AI Lead Scoring** — transparent rule-based engine, 0–100, with every
   signal shown (budget, service, urgency keywords, timeline words, business
   email domain, spam patterns)
3. 🗄️ **CRM Entry** — lead saved to the mock CRM with score, tier and run log
4. ✉️ **Automated Follow-up** — a scheduled Day 0 / 1 / 3 sequence, tiered:
   hot leads get instant SMS+email and a call task; warm and cold get lighter
   sequences
5. ⚡ **Slack Alert** — only for hot leads (score ≥ 75); posts a mock
   `#new-leads` card so the owner can call within minutes

The result panel shows the score with its full reasoning, the follow-up
timeline, and the mock Slack alert (or explains why it was skipped).

**Admin dashboard (`/admin`)** — the business owner's view:

- Stats: total / hot / warm / cold / average score
- Filterable leads table with expandable rows (message, score reasons,
  follow-up schedule, full pipeline run log)
- “Load sample data” / “Clear demo data” buttons

Leads persist in the browser's `localStorage` (mock CRM — no backend).

## The real n8n workflow — `workflow.json`

`workflow.json` is **genuinely import-ready**: n8n → Workflows → ⋯ →
*Import from file*. It implements the same pipeline for real:

`Webhook` → `Code` (lead scoring — the same rules as `lib/scoring.ts`) →
`Supabase` (CRM insert) → `Day-0 email` → `Wait 1d` → `Day-1 email` →
`Wait 2d` → `Day-3 call task`, with a parallel `IF score ≥ 75` → `Slack alert`
branch.

Sticky notes inside the workflow explain each step and exactly what the
importer must add: Supabase project ref + key (table SQL included in the
checklist note), a Slack Incoming Webhook URL, and SMTP credentials on the two
email nodes. Regenerate it any time with:

```bash
npm run make-workflow
```

## How to run

```bash
npm install
npm run dev
```

Then open:

- Public demo → http://localhost:3000
- Admin dashboard → http://localhost:3000/admin

To verify a production build:

```bash
npm run build
```

## Tech

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Zero backend — scoring engine (`lib/scoring.ts`) and mock CRM (`lib/crm.ts`)
  are client-side; pipeline animation is a timed state machine in `app/page.tsx`

## Turning this into a real product

1. Import `workflow.json` into the client's n8n instance.
2. Fill in the three credentials from the in-workflow checklist sticky note.
3. Point the website's quote form at the webhook's Production URL with the same
   field names (`name`, `email`, `service`, `budget`, `message`).
4. Optionally swap the HTTP-based Supabase nodes for n8n's native Supabase
   node, and add a Twilio SMS node on the hot-lead branch.

## File map

| Path | What |
|---|---|
| `app/page.tsx` | Public demo: quote form + animated pipeline + result panel |
| `app/admin/page.tsx` | Admin dashboard: stats, filterable leads, run logs |
| `components/Pipeline.tsx` | Animated 5-stage pipeline visualization + run log |
| `lib/scoring.ts` | Transparent rule-based scoring engine (mirrored in n8n) |
| `lib/crm.ts` | Mock CRM: leads in localStorage + fictional sample data |
| `workflow.json` | Real, import-ready n8n workflow (generated) |
| `scripts/make-workflow.mjs` | Generator for `workflow.json` — edit here, re-run |
| `DEMO-SCRIPT.md` | 60-second walkthrough script for recording a demo video |
