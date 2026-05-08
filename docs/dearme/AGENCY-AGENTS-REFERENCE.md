# Agency Agents Reference

Date: 2026-05-07

Source: `https://github.com/msitarzewski/agency-agents.git`

Reviewed snapshot: `783f6a72bfd7f3135700ac273c619d92821b419a`

License observed in source: MIT License, Copyright 2025 AgentLand Contributors

Status: external OSS reference only. This is not a DearMe runtime dependency.

## Verdict

`agency-agents` is useful for DearMe as a role taxonomy, role-card writing
reference, and packaging example. It is not a control plane, customer workbench,
memory system, approval system, or product architecture.

Its strongest idea is similar to the Polsia packaging lesson: do not sell a
single AI function, sell the feeling of a useful team already at work. The repo
does this with a broad public catalog of specialists. DearMe should do the
opposite at the product surface: keep a small fixed personal-brand team visible,
hide the machinery, and put finished work plus approval decisions in front of
the user.

The practical rule:

> Use `agency-agents` to sharpen DearMe's team member definitions and
> deliverable standards. Do not turn DearMe into an agent catalog or agent
> installer.

## What It Contains

The reviewed snapshot contains 226 markdown files. The top-level distribution
is mostly a prompt library:

| Directory | Markdown files | Relevance to DearMe |
|---|---:|---|
| `specialized/` | 41 | Chief of Staff, orchestrator, trust, workflow roles |
| `marketing/` | 30 | content, LinkedIn, Twitter, SEO, podcast, growth roles |
| `engineering/` | 29 | low direct relevance for DearMe's customer surface |
| `testing/` | 8 | evidence and reality-check role patterns |
| `sales/` | 8 | outbound, proposals, discovery, account strategy |
| `design/` | 8 | brand guardian and design system role patterns |
| `product/` | 5 | product manager, trend researcher, feedback synthesis |

The repo also includes:

- `scripts/convert.sh` for generating tool-specific agent formats.
- `scripts/install.sh` for copying generated agents into tools such as Claude
  Code, Copilot, Antigravity, Gemini CLI, OpenCode, Cursor, Aider, Windsurf,
  Qwen, Kimi, and OpenClaw.
- `integrations/openclaw/README.md`, where each agent becomes an OpenClaw
  workspace with `SOUL.md`, `AGENTS.md`, and `IDENTITY.md`.
- `examples/`, which demonstrate multi-agent research and delivery narratives.

The local lint script is useful as a quality signal but the snapshot is uneven:
`bash scripts/lint-agents.sh` reported 16 errors and 81 warnings. The errors are
mostly strategy markdown files included in the scan without agent frontmatter;
many warnings are missing recommended role sections. Treat the repo as a
source of patterns, not a ready-to-ship prompt corpus.

## What It Is Not

`agency-agents` does not provide the DearMe product primitives:

- no customer onboarding flow
- no Brand OS or voice profile model
- no persistent memory read model
- no approval-gated publishing or outreach
- no Work Ready / Decisions Needed surface
- no weekly Dear me report loop
- no scheduler that proves background work actually happened
- no private reputation safety model

The `Agents Orchestrator` file is a role prompt with workflow phases and QA
rules. It is not an executable scheduler, queue, live feed, or orchestration
engine.

## DearMe Mapping

DearMe should keep the small team it already chose, but enrich each role with
clearer mission, work process, output format, and success metric language.

| Agency source | DearMe role | Use |
|---|---|---|
| `specialized/specialized-chief-of-staff.md` | Chief of Staff | Coordination, decision routing, context handoff, weekly closeout format |
| `marketing/marketing-linkedin-content-creator.md` | Content Producer and Voice Editor | Hook variants, content pillars, profile optimization, voice examples |
| `marketing/marketing-content-creator.md` | Content Producer | Multi-format content strategy and repurposing vocabulary |
| `marketing/marketing-social-media-strategist.md` | Content Producer and Growth Analyst | Cross-platform campaign and performance framing |
| `marketing/marketing-growth-hacker.md` | Growth Analyst | Experiment cadence, funnel language, growth metrics |
| `sales/sales-outbound-strategist.md` | Opportunity Scout | Signal-based lead discovery, outreach readiness, reply-quality metrics |
| `sales/sales-proposal-strategist.md` | Opportunity Scout and Portfolio Builder | Win themes, proof-backed narratives, proposal-ready positioning |
| `marketing/marketing-podcast-strategist.md` | Opportunity Scout | Podcast guesting, show positioning, distribution opportunities |
| `design/design-brand-guardian.md` | Brand Strategist | Brand consistency, messaging architecture, brand guardrails |
| `product/product-trend-researcher.md` | Opportunity Scout and Growth Analyst | Market signals, competitive intelligence, weekly opportunity briefings |
| `marketing/marketing-ai-citation-strategist.md` | Growth Analyst | AI visibility, answer-engine optimization, citation-rate scorecards |
| `testing/testing-evidence-collector.md` | Internal proof gate | Evidence-first review before claims become public |
| `testing/testing-reality-checker.md` | Internal quality gate | Stop fantasy readiness claims; require screenshots, proof, and realistic status |

## Role Shape To Adopt

Each DearMe team member should eventually have a compact internal role card:

```markdown
# [Role]

## Customer-visible promise
[One sentence the user can understand.]

## Internal mission
[What this role owns in the private work loop.]

## Inputs
[Brand OS fields, voice samples, proof, channels, memory, approvals.]

## Outputs
[Work Ready cards, decision batches, weekly report sections.]

## Rules
[Approval, voice, proof, privacy, and channel-specific constraints.]

## Success signals
[Outcome and quality metrics this role watches.]
```

This shape borrows the useful part of `agency-agents`: role identity plus
deliverable discipline. It intentionally omits public persona theatrics,
tool-install language, and broad catalog browsing.

## Product Decisions

1. Keep the customer-facing roster small.
   DearMe should show six to eight stable roles, not a marketplace of 200+
   specialists. A large roster pushes the product back into agent dashboard
   territory.

2. Keep specialists visible but not configurable.
   The user can see "Voice Editor checked this" or "Opportunity Scout found
   this lead." The user should not manage prompt files, colors, tools, model
   routing, OpenClaw workspaces, or raw agent IDs.

3. Use the role library as private behavior source.
   DearMe can have hidden subskills inspired by LinkedIn, podcast, outbound,
   proposal, SEO, and evidence-review roles, but the product surface should
   collapse them into the user's personal brand growth team.

4. Prefer prepared moves over process theater.
   A role's value is a draft post, outreach angle, proof card, profile update,
   opportunity lead, or weekly report section. Logs and orchestration artifacts
   are only useful when they help the user approve or reject a move.

5. Keep approval as the reputation boundary.
   The agency framing only works for DearMe if the system is explicit that the
   team prepares moves privately and the user approves anything that represents
   them publicly.

## Provenance And Reuse Rules

The repo is MIT licensed, but DearMe should still prefer rewritten,
product-specific prompts and copy:

- If a source file is copied rather than rewritten, preserve the MIT license
  notice and document lineage in the PR.
- Do not copy broad role prose directly into user-facing DearMe UI.
- Do not run `scripts/install.sh` as part of DearMe development; it writes to
  local tool configuration and is not needed for product integration.
- Do not expose `agency-agents`, OpenClaw workspace structure, `SOUL.md`,
  `IDENTITY.md`, or installer language to paid-beta users.
- Use the repo as an internal source for role coverage and deliverable
  standards, not as public provenance or brand language.

## Implementation Implications

The next DearMe product docs or code slices should treat this as supporting
input for:

- internal role cards for Chief of Staff, Brand Strategist, Voice Editor,
  Content Producer, Opportunity Scout, Portfolio Builder, and Growth Analyst
- Voice Gate and Proof Gate language for private review
- opportunity-lead fields such as signal, timing, buyer/person context,
  outreach angle, and approval gate
- content-draft fields such as hook options, audience, pillar, proof used,
  channel constraints, voice notes, and decision needed
- weekly Dear me report sections for shipped work, changed assumptions, open
  decisions, next bet, and quality/proof risks

It should not change the core DearMe architecture decision: DearMe remains a
personal brand growth team over the Paperclip operator kernel, with the team
visible and the machinery hidden.
