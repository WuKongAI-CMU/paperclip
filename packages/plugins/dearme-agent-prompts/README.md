# @paperclipai/dearme-agent-prompts

Personal-brand domain-adapted seed corpus for DearMe role plugins.

## Why this exists

DearMe role plugins (chief-of-staff, content-producer, opportunity-hunter,
brand-site-builder, ads-manager, reporting) all need:

- A starter system prompt with the role's voice, workflow, and constraints
- A typed state machine for the role's primary lifecycle entity
- One or more reusable outbound or creative templates

This package consolidates that material in one place so each role plugin
can `import { CHIEF_OF_STAFF_PROMPT, OPPORTUNITY_STATES, ... }` instead of
re-deriving it. The point is to ship faster, not to invent the wheel
inside every plugin.

## Lineage

Material here is **adapted** to the personal-brand growth-team domain
from DearMe's internal product research. It is research-derivative, not
verbatim donor material:

- Polsia and Naive product mechanics analyzed in
  `docs/dearme/POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`.
- Public Naive role/template catalog (29 employees + 45 businesses)
  enumerated in `docs/dearme/POLSIA-NAIVE-COMPARISON.md`.
- Compliance posture and scope governed by
  `docs/dearme/REBRAND-AND-PROVENANCE.md`.

The actual prompt prose, state-machine field names, template ICPs,
voice/format rules, and example copy below are written for DearMe's
personal-brand domain. Donor brand names, customer-specific examples,
and donor-product placeholders do not appear here.

## Contents

```
src/
  state-machines/
    opportunity-state.ts        // 6-state opportunity lifecycle
    meta-ads.ts                 // 5-state error machine + 4-tier perf table
    budget-tier.ts              // 3-tier daily-budget creator throttle
    mood-face-library.ts        // expr-* face slug library for mood SSE
    model-routing.ts            // complexity → model routing table
    sse-events.ts               // 7 realtime event type names + payload shapes
  prompts/
    chief-of-staff.ts           // 4-step monitor→review→queue→report loop
    content-producer.ts         // voice-gated short-form content rules
    opportunity-hunter.ts       // 4-step daily outbound workflow + leads
  templates/
    sora-ugc-video.ts           // UGC video creative prompt template
    outbound-5-touch.ts         // 5-touch outbound sequence template
```

## How role plugins should use this

```ts
import {
  CHIEF_OF_STAFF_PROMPT,
  OPPORTUNITY_STATES,
  type OpportunityState,
  MODEL_ROUTING_TABLE,
  type SseEvent,
} from "@paperclipai/dearme-agent-prompts";
```

Plugins can extend / override the seed prompt with company-specific or
user-specific context, but should not silently re-derive the rules
already captured here.
