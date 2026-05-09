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
memory, routine, and spend truth.

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
