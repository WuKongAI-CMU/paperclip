# Polsia vs Naive Comparison

> Decision use: choose what DearMe should reuse, adapt, or reject from the two
> strongest donor systems without turning DearMe into a clone or an agent admin
> console.

## Bottom Line

Polsia and Naive solve different layers of the same problem.

Polsia is the better model for the **customer-visible product rhythm**: fast
onboarding, visible team momentum, cycle selection, live progress, reports, and
the feeling that work started immediately.

Naive/Paperclip is the better model for the **backstage control plane**:
tenancy, agents, issues, approvals, routines, heartbeats, cost tracking,
execution workspaces, templates, and provisioning.

DearMe should combine them this way:

```
DearMe customer shell
  = Polsia-style visible growth choreography
  + DearMe Brand OS, voice, opportunity, portfolio, and report semantics
  over Naive/Paperclip-style typed work, approval, and execution substrate
```

The user should see a personal brand growth team. The machinery should stay
below the product surface.

## Fresh Read - 2026-05-09

Evidence refreshed from:

- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/08-POLSIA-WEAKNESSES.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/polsia-internal-docs/CYCLE_ENGINE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/polsia-internal-docs/AGENT_PROMPTS.md`
- `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`
- `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`
- `/Users/peter/naive-research-2026-05-05/FINAL-FINDINGS.md`
- `/Users/peter/naive-research-2026-05-05/NAIVE-CATALOG-SUMMARY.md`
- `/Users/peter/naive-research-2026-05-05/naive-default-agent-prompts/ceo/AGENTS.md`

Verdict:

- If the question is product demo, first-wow, retention ritual, or customer
  trust, Polsia is the stronger reference.
- If the question is execution truth, issue ownership, approvals, cost, worker
  isolation, or durable scheduling, Naive/Paperclip is the stronger reference.
- DearMe should not choose one donor wholesale. Polsia should shape what the
  customer experiences; Naive/Paperclip should shape how work is represented
  and executed behind the scenes.

## Comparison Matrix

| Dimension | Polsia | Naive / Paperclip | DearMe Decision |
|---|---|---|---|
| Core promise | AI runs a company while the founder watches progress | Turn-key agent company/control plane | Personal brand growth team prepares content, opportunities, portfolio updates, and reports |
| Best reusable layer | Product choreography and visible autonomy | Runtime/control-plane substrate | Use Polsia above the fold; use Naive/Paperclip below the fold |
| Onboarding lesson | One input, immediate dashboard, work starts now, visible stream | Brand context becomes a CEO plan and agent/team setup | Keep onboarding short; emit typed `brand_blueprint`, team, first cycle, and reviewable work |
| Team model | Founder-facing CEO/agents that look busy and report progress | CEO hires/manages workers over issues, heartbeats, and apps | Show a small DearMe team, but route through typed issues, approvals, and cycles |
| Work unit | Tasks, reports, cycles, company documents | Issues, projects, routines, approvals, apps, heartbeat runs | Growth work item with content, opportunity, portfolio, report, and decision views |
| Live progress | SSE thinking/logs, dashboard mood, task/report events | Paperclip activity, issue state, heartbeat/run records | Customer-safe work stream and action graph, not raw runtime events |
| Approval posture | Product has strong automation but social/channel risk needs tightening | Approvals are a first-class governance primitive | Public/send/deploy/spend/sensitive actions remain approval-gated |
| Generated assets | Company app, landing page, market report, company docs | Apps and generated workspaces/provisioning | Portfolio, media kit, lead magnet, proof card, and private drafts only when useful |
| Biggest risk if copied directly | Shared social identity, MCP sprawl, company-factory framing, reputation risk | Exposing agent console complexity, template marketplace, raw setup/runtime language | Translate both into DearMe semantics; never expose donor naming as product copy |

## What To Copy

### From Polsia

- The feeling of immediate work after onboarding.
- Chief-of-Staff style entry point instead of an admin console.
- Growth-cycle ritual: plan, work, review, report, learn.
- Visible team status and live progress.
- Daily or weekly reporting as a retention loop.
- The public proof idea, adapted as private or redacted proof until the customer
  approves wording.

### From Naive / Paperclip

- Company/workspace tenancy as the backing primitive.
- Agents and reporting lines as the internal team structure.
- Issues as atomic work items.
- Routines, wakeups, and heartbeat runs as the execution loop.
- Approvals as consequence gates.
- Activity logs, cost events, budgets, and execution workspaces.
- Template/catalog structure for internal DearMe role cards and first-cycle
  work, without exposing a generic marketplace in P0.
- The declarative setup pattern, renamed and typed as `brand_blueprint`.

## What To Adapt

| Source pattern | Adapt into DearMe |
|---|---|
| Polsia company cycle | Personal-brand growth cycle |
| Polsia CEO/chat | Chief of Staff brief surface |
| Polsia Twitter/cold-outreach/site agents | Content Producer, Opportunity Scout, Portfolio Builder |
| Polsia dashboard mood/progress | Team work stream, growth map, status cards, weekly letter |
| Naive `setup_payload` | Versioned `brand_blueprint` with audit trail |
| Naive employee templates | Internal DearMe role-card templates |
| Naive apps/provisioning | Portfolio, media kit, lead magnet, or customer-owned asset provisioning |
| Paperclip approvals | DearMe Work Ready and batch decisions |

## What To Reject For Now

- Polsia's broad MCP sprawl as a P0 requirement.
- Polsia's company-factory framing for a product that is about one person's
  reputation and opportunities.
- Shared platform-owned social identity.
- Direct public posting, sending, spending, or deploying from a cycle control.
- Naive's generic agent marketplace as a customer-facing surface.
- Raw setup payloads, hidden HTML-comment setup contracts, adapter names,
  provider names, OpenClaw, Paperclip, or issue queue language in paid-beta UI.
- Per-tenant VM provisioning as a DearMe prerequisite before the product loop is
  proven.

## Current Product Implication

DM-105 exposes **cycle controls**, not runtime controls. DM-119 extends the
same donor split into the weekly Dear me report: Polsia supplies the visible
review rhythm, while Naive/Paperclip supplies the underlying work, approval,
memory, routine, and spend truth. DM-132 applies the same rule to mobile
navigation: the phone shows Home, Decisions, Work Ready, Voice, and More, not a
generic workspace control surface.

The safe product slice is:

- A user can choose the next private growth loop.
- The Chief of Staff receives a typed brief through the existing DearMe message
  route.
- The team prepares private reviewable work.
- The weekly report now summarizes what changed, what needs the user's call,
  what the team learned, and what the next cycle should push.
- Existing Work Ready and batch decision gates still own approval.
- Any future pause/resume surface must be introduced as a real typed lifecycle
  contract before it can look like a hard runtime control.

This deliberately reuses Polsia's visible control rhythm while keeping
Naive/Paperclip's work and approval machinery backstage.

## Near-Term Product Tickets

1. **DM-133 Mobile Action Detail And Decision Drawer Polish**
   - Make the mobile review/decision detail states production-ready now that
     the DearMe mobile nav is product-owned.
2. **Brand Team Run Ledger**
   - Turn Polsia's live work stream into a DearMe-safe record of what the team
     tried, prepared, learned, and now needs from the user.
3. **Personal Brand Role Pack**
   - Convert Naive employee templates and Polsia agent prompts into a small
     DearMe role set: Chief of Staff, Brand Strategist, Voice Editor, Content
     Producer, Opportunity Scout, Portfolio Builder, and Growth Analyst.
4. **Credit And Budget Customer Surface**
   - Expose Naive/Paperclip cost and budget truth as customer-friendly credits,
     not token/accounting internals.
5. **Seven-Day Wow Loop**
   - Adapt Polsia's short-pressure activation loop into a seven-day DearMe
     sequence that produces reviewable content, opportunity briefs, voice
     learning, and a weekly letter.

## Decision Rules For Future Slices

1. If the question is "How should the user feel work is happening?", start from
   Polsia.
2. If the question is "How should work be represented, assigned, executed,
   reviewed, or paid for?", start from Naive/Paperclip.
3. If the question touches voice, reputation, public claims, content, outreach,
   portfolio, or personal-brand strategy, DearMe owns the semantics.
4. If a donor term would confuse or expose machinery to a paid-beta user, rename
   it before it reaches the customer shell.
5. If a feature bypasses review gates for anything external, reject it until the
   approval model explicitly supports that action.
