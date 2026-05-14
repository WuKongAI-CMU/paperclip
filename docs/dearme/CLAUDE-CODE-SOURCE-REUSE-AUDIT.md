# Claude Code Source Reuse Audit

Date: 2026-05-14

Source reviewed: `git@github.com:WuKongAI-CMU/claude-code-source.git`

License: Unlicense / public domain, allowing copy, modification, publication,
use, compilation, sale, and distribution without restriction.

## Product-Fit Findings

Useful concepts for DearMe:

- Tool contracts with explicit schema, permission boundary, execution path, UI
  summary, and read-only/concurrent metadata.
- Prompt/local/jsx command separation.
- Background task states that distinguish running work from explicitly
  backgrounded work.
- Directory-based skills with `SKILL.md`, frontmatter, conditional discovery,
  and duplicate filtering.
- Memory discipline: save durable user/project/reference/feedback signals, do
  not save task transcripts, path snapshots, runtime setup, git history, or
  short-lived debugging notes as durable memory.
- Coordinator prompts that make decomposition and synthesis explicit.

## Reused In DearMe

DearMe currently benefits most from the memory discipline and the tool-contract
discipline. Memory directly shapes customer-facing drafts, opportunity work,
proof cards, and reports. Tool-contract ideas map well to DearMe's autonomy
boundary: what can run privately, what can move in parallel, and what must wait
for a launch call.

Implemented adaptation:

- Added DearMe memory signal kinds for durable profile, voice, proof, audience,
  relationship, feedback, and reference signals.
- Added rejected memory source kinds for raw tool logs, file-path snapshots,
  task transcripts, runtime config, and git history.
- Added a first-cycle `memoryPlan` to the shared DearMe preview response so the
  product can show what will be remembered and what will be filtered out before
  future drafts rely on it.
- Added tests that assert the memory plan is present, uses the shared signal
  taxonomy, and stays inside the existing hidden-term guardrails.
- Added a DearMe-native autonomy contract receipt to Brand OS so paid accounts
  can see read-only research, parallel private preparation, launch-action
  boundaries, and recovery/support escalation without exposing donor terms.
- Connected the same autonomy contract to `dearme:release-gate` and
  `dearme:status` commercial readiness so future product work treats autonomy
  as verified operating proof, not just page copy.

Files changed:

- `packages/shared/src/validators/dearme.ts`
- `packages/shared/src/validators/dearme.test.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `scripts/dearme-release-gate.ts`
- `scripts/dearme-release-gate.test.ts`
- `scripts/dearme-proof.ts`
- `scripts/dearme-proof.test.ts`

## Not Reused Yet

The full terminal UI, external command layer, remote bridge, and model-provider
implementation are not a direct fit for DearMe's current first-wow and provider
proof focus. If we revisit them, they should be rewritten as DearMe-native
mechanisms with no donor branding, UI trade dress, or customer-visible donor
terminology.
