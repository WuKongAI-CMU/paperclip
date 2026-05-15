# Littlebird Competitor Audit

Date: 2026-05-14
Owner: PM+architect thread
Status: **read-only competitor analysis** — no code absorption.

## Why this doc exists

The 2026-05-14 product directive lists seven sources to integrate into
DearMe: **polsia, naive, clawdbob, openclaw, claude-code-source, lindy,
littlebird**.

Littlebird is the one source where direct code absorption is **not
available**. This doc records the read-only competitor read DearMe already
incorporates, so the directive's seventh slot is accounted for.

## What littlebird is

- Junior-teammate desktop AI (Mac/Windows native shell).
- Pricing: Plus ~$17–20/mo, Pro ~$100–200/mo.
- Closed-source. No public source code repo. Distribution is the signed
  desktop binary + a marketing site.
- Cross-references:
  [`reference-competitor-littlebird`](../../) in Peter's auto-memory
  (2026-04-23) and reference-competitor entries for
  `lindy.ai`, `genclaw`, `genspark`, `b.ai`, `myclaw.ai`, `qclaw`,
  `prime-intellect`.

## Why we don't absorb code

1. **No source.** The product ships as a notarized binary; reversing the
   bundle is hostile and brittle.
2. **License risk.** Even reverse-engineering UI behavior beyond what a user
   would observe by using the product crosses into derivative-work territory
   on closed software.
3. **Substrate divergence.** Littlebird is native-desktop (Tauri/Electron);
   DearMe's customer surface is web-first (React + Vite). Lifted UI patterns
   would have to be re-platformed anyway.

## What we already absorb (observed behavior, original implementation)

These are patterns DearMe re-implements based on what a user can see when
operating Littlebird — they are not "littlebird code." They appear in
DearMe's existing surfaces.

| Littlebird pattern (observed) | DearMe implementation | Where |
|---|---|---|
| Always-on "junior" persona that names itself and holds tone | DearMe Chief of Staff role + SOUL.md persona | `dearme-agent-prompts` registry + `dearme-openclaw/src/bootstrap.ts` |
| One-screen team roster with current state per role | Team Work Stream + Decisions Needed | `ui/src/pages/DearMeOnboarding.tsx`, `server/src/services/dearme-workbench.ts` |
| Lightweight approval cards instead of dialog gates | DearMe ActionCard primitive | `ui/src/components/dearme/DearMeActionCard.tsx` |
| Premium tier shows live agent reasoning trail; basic tier hides it | `feedbackTrace.receipts` review-memory surface (DM-183AR) | `server/src/services/dearme-workbench.ts` |
| Per-channel voice scoring before publish | Voice Gate (`/v1/voice/score`) | `server/src/services/dearme-voice-gate.ts` |

These choices align with the Lindy/Polsia integration patterns DearMe
already adopted. Littlebird does not displace them; it confirms that
solo-operator desktop AI products converge on the same surface grammar.

## Where Littlebird differs from DearMe (deliberate non-absorption)

| Littlebird | DearMe |
|---|---|
| Native-desktop binary, per-OS installer | Web-first + OpenClaw plugin |
| Single conversation surface ("chat with junior") | Team Work Stream + Work Ready + Decisions Needed + Voice & Memory + Brand OS + Content Pipeline + Opportunities + Portfolio + Weekly Report |
| Generalist solo-operator assistant | Personal-brand growth team specifically |
| Pricing tiers gate model quality + memory depth | Pricing tiers gate channel volume + ad spend |
| No public live-feed (private always) | Private default + optional redacted public proof page |

## Conclusion

Littlebird's contribution to the directive is **read-only competitor
calibration**: it validates the team-of-roles + voice-gate + ActionCard
surface choices DearMe already absorbs from Polsia and Lindy. There is no
Littlebird code in DearMe and there should not be — the source is not
accessible, the substrate is different, and the product surfaces DearMe
already implement cover the same ground.

If Littlebird later open-sources a SDK or publishes a desktop integration
contract, revisit this verdict.
