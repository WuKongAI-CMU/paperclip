# OpenClaw Integration for Aha-Shots

> Status: implementation-updated, 2026-05-11
> Scope: P0 channel delivery (Day-1 letter + 5:00 ship outreach)
> Position: companion to `POLSIA-NAIVE-PM-ANALYSIS.md` and `POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`
> Owners: DearMe product + OpenClaw maintainer (same human)

## TL;DR

DearMe now has the approved-send spine in code: an approved next move becomes a
`launchHandoff`, `dearme-approved-launch-handoff` turns it into `CallOutboundInput`,
`dearme-outbound-tool-wrapper` runs voice gate + approval + dispatch + audit, and
`dearme-openclaw-gateway-dispatch` can hand it to OpenClaw.

OpenClaw already has 50+ channel extensions and a stable gateway protocol. DearMe
already has an `openclaw-gateway` adapter wired in via Paperclip. **No fork needed.**
We use OpenClaw as a remote runtime that DearMe calls when the user clicks Ship.

This doc is the minimum P0 wiring: keep **two OpenClaw-backed message channels
(iMessage + Telegram)** for the two highest-impact aha moments, nothing more.

## What is already true (no work needed)

- `packages/adapters/openclaw-gateway/` exists, builds, has tests.
- Adapter speaks WebSocket gateway protocol with Ed25519 device auth.
- Adapter accepts `ws://` or `wss://` URL — local OpenClaw daemon or LAN/cloud both work.
- Adapter handles session keying (`fixed | issue | run`), idempotency, structured event logs.
- DearMe `dearme-output-handoff.ts` already produces approval-gated artifacts of kind
  `content_drafts`, `brand_os_review`, etc.
- `dearme-approved-launch-handoff.ts` consumes approved `dearme_output_next_move`
  payloads and calls the shared outbound wrapper.
- `dearme-outbound-tool-wrapper.ts` owns the canonical runtime order:
  voice-gate → approval → channel resolution → dispatch → audit/SSE.
- `dearme-openclaw-gateway-dispatch.ts` builds one OpenClaw gateway dispatcher
  per outbound tool binding.
- `packages/plugins/dearme-openclaw/src/tools/types.ts` now registers
  `send_telegram_message` and `send_imessage` as voice-gated `send` tools.

## What remains (the work)

A **first-run recipient binding** layer:

```text
DearMe approved output  →  launch handoff  →  outbound wrapper  →  openclaw-gateway adapter  →  OpenClaw daemon  →  iMessage / Telegram
```

Specifically:
1. Generate `launchHandoff` payloads for Day-1 self-letter and Telegram outreach using
   `send_imessage` / `send_telegram_message`.
2. Store the user's chosen self-letter recipient and Telegram recipient alias in the
   existing onboarding/profile configuration path.
3. Standardize DearMe-hosted OpenClaw gateway config for Telegram-first beta demos.
4. Surface delivery success/failure in the existing Work Ready / Cycle view.

## Aha-shot mapping

| Polsia shot | OpenClaw role | What we ship |
|---|---|---|
| Day-1 "dear me, day 1" letter | iMessage extension | Reporting agent → approval auto-pass for "self-letter" → iMessage to user's own number |
| 5:00 "Let them ship" outreach DM | Telegram (or imessage) extension | Opportunity Scout → user clicks Ship → outreach DM to drafted target |
| Weekly growth report | iMessage extension | Reporting agent → user-facing summary |

Everything else (Identity, Voice, Audience, Brand site, Opportunity discovery)
**does not need OpenClaw**. Don't conflate.

## Architecture

### Trust + topology

- OpenClaw runs on the user's machine (`local_trusted` mode, `loopback` bind).
- DearMe server runs in our cloud OR on the user's machine (both supported by
  existing adapter URL config).
- For paid beta we recommend **DearMe cloud + user-local OpenClaw**, with the gateway
  WebSocket reaching out from DearMe to the user's OpenClaw via Tailscale or a small
  reverse-tunnel daemon. Same model Naïve uses for per-tenant VMs.
- For "5-min aha" first-run, we accept **DearMe cloud + DearMe-hosted OpenClaw**
  as fallback so the demo works without local install. Letters land via Telegram (no
  Apple ID required).

### Sequence

```text
1. DearMe agent finishes draft → writes to issueWorkProducts
2. dearme-output-handoff produces a DearMeOutputItem
3. User approves (or Day-1 self-letter auto-approves)
4. Approved launch handoff builds `CallOutboundInput`
5. `dearme-outbound-tool-wrapper` runs voice gate + approval and dispatches
6. `dearme-openclaw-gateway-dispatch` calls @paperclipai/adapter-openclaw-gateway execute() with:
     payloadTemplate: { channel: "imessage", to: "<phone>", text: "<rendered letter>" }
7. OpenClaw daemon's imessage extension delivers
8. Adapter logs event back; DearMe emits `channel_action_fired` and records audit state
```

### Database

No new P0 table is required for the current branch. `channel_connections` already
exists and now includes `telegram` / `imessage` as allowed channel ids, but the
shared outbound wrapper intentionally does **not** require OAuth rows for these
OpenClaw gateway channels until a concrete per-user credential flow ships. This
keeps the Day-1 aha path on the existing gateway config instead of adding a
parallel credential store.

## Boundaries — what we will not do

- Not fork `openclaw/openclaw` repo into DearMe.
- Not surface OpenClaw branding, channel picker complexity, or 23-channel matrix to the user.
  INTEGRATED-ARCHITECTURE.md line 503 already says provenance stays backstage.
- Not ship Slack/Discord/WhatsApp/Feishu/etc. in P0. They are available the moment we want
  them, but Polsia's lesson is "fewer surfaces, sharper aha".
- Not implement OpenClaw companion apps, Live Canvas, voice ingest in P0.
  Those are P1+ shots and live in a separate plan.
- Not require user to install anything for the first-run aha. Telegram bot mode lets us
  deliver the Day-1 letter via Telegram with zero install.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| OpenClaw maintainer (Peter) splits attention between two products | Treat OpenClaw as a stable dependency. Pin a version. Only update when DearMe needs a new channel. |
| iMessage requires macOS Messages.app permissions | Telegram-first for first-run. iMessage as upgrade path for macOS users. |
| Gateway WebSocket flaky over public internet | Use idempotency keys (already in adapter). Retry on `openclaw_gateway_wait_timeout`. |
| User confusion about "where the letter came from" | Letter footer says "Sent by DearMe via your channels". No mention of OpenClaw. |
| Scope creep (someone adds 5 more channels) | Reject any P0 PR that touches more than `imessage` and `telegram`. |

## P0 ticket plan

```text
DM-CH-01  absorbed: reuse channel_connections + plugin defaults, no new table yet
DM-CH-02  shipped: approved-next-move -> outbound wrapper -> OpenClaw gateway dispatch
DM-CH-03  shipped: approved next-move handoff consumes launchHandoff payloads
DM-CH-04  config: one onboarding/profile step asking iMessage number OR Telegram username
DM-CH-05  daemon: standardize "DearMe-hosted OpenClaw" cloud fallback for Telegram-only
DM-CH-06  observability: deliveredAt + failure log surfaced in Cycle view
DM-CH-07  ship: Day-1 self-letter auto-delivered (no approval) for new signups
DM-CH-08  ship: outreach DM via "Let them ship" button on opportunity card
```

8 tickets. Estimated 1 engineer × 5 working days for happy path.

## Acceptance for the two aha moments

**Day-1 self-letter (must hit by minute 5 of first run):**
- New user finishes onboarding.
- Within 90 seconds, their iMessage or Telegram receives a letter starting "Dear me, day 1 —".
- Letter contains: their stated goal, one observation from their dossier, one
  next-step the team will take tomorrow.
- Letter is voice-matched (uses voice profile if it exists, else neutral).

**Ship outreach DM (must work by minute 5 of first run):**
- Opportunity Scout produces at least one drafted outreach.
- User can click Ship on the card.
- A real DM is delivered to the target via Telegram/iMessage from the user's account.
- DearMe records delivery + waits for reply hooks (P1 scope).

If either of these does not land in 5 minutes during a friend test, the integration
has failed and we revisit before adding any other channel.

## What this changes about the master plan

- `POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md` already assumes Paperclip adapters are
  inherited. This doc just specifies which two channels we activate first.
- `BUILD-STATE.md` should track the channel-send spine as soon as each code slice ships.
- `INTEGRATED-ARCHITECTURE.md` does not need an update; the openclaw_gateway adapter
  is already covered.

## Open questions (decide before first live send smoke)

1. iMessage delivery to **user's own number** (self-letter) — does Apple's loop policy
   allow that? If not, fall back to Telegram for self-letter too.
2. For DearMe-cloud-hosted OpenClaw: which Telegram bot identity sends the message?
   Decision: a per-user bot is heavy; use one shared `@DearMeBot` and personalize via text.
3. What happens when the user revokes channel access? Soft-disable binding, surface in UI,
   do not retry, do not log scary errors to user.
