# Needs Human Help

This is the single queue for human-only actions in agent-run company mode.

Agents should add an entry here only when the task cannot be safely, legally, or
practically completed without human support. Non-blocking requests should not
stop agent-owned work.

## Active Requests

### 2026-05-14 - External live-proof recipients (updated under P0 scope-cut)

- Needs help from: Peter
- What they need to do: provide the production Resend API key plus verified
  sender domain so the `send_email` live smoke can run, and confirm X OAuth
  client credentials for the single-channel `post_x` live smoke.
- Why agents cannot do it: these are provider credentials and sender-domain
  authorizations that must originate from the owner.
- Blocking: no for internal product work or private-beta operations; yes before
  public launch or live external receipt proof can be claimed.
- Estimated human time: 10-20 minutes once the Resend project + verified domain
  + X developer app are ready.
- Agents continue after result by: capturing the approved values, running the
  no-send provider check first, then running guarded live proof only after
  explicit live confirmation.

P0 scope-cut note (2026-05-14): per
[`dearme/P0-SCOPE-CUT-2026-05-13.md`](dearme/P0-SCOPE-CUT-2026-05-13.md), the
prior iMessage and LinkedIn partner-API asks below are **deferred to P1**.
LinkedIn outbound becomes copy-to-clipboard for P0; iMessage / Telegram /
WhatsApp / Signal / SMS / Voice all defer to OpenClaw runtime revival.

P0 needed values:

- `DEARME_RESEND_API_KEY`: production Resend API key for `send_email` dispatch.
- `DEARME_RESEND_FROM_EMAIL`: verified sender on a domain you control.
- `DEARME_RESEND_SMOKE_RECIPIENT`: smoke recipient inbox (your own is fine).
- `DEARME_X_OAUTH_CLIENT_ID` / `DEARME_X_OAUTH_CLIENT_SECRET`: X developer app
  credentials so the existing PKCE callback can complete the `post_x` smoke.

Deferred to P1 (no longer P0-blocking):

- `DEARME_LINKEDIN_DM_MESSAGES_URL`: LinkedIn partner messages endpoint.
- `DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN`: LinkedIn smoke recipient.
- `DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT`: iMessage/SMS smoke recipient.

Reply template for Peter:

```text
Delivery route:
Professional-network recipient:
Phone-message recipient:
```

Current generated proof handoff status:

- Last verified: 2026-05-14 with
  `pnpm --silent dearme:next-proof -- --target all --no-write --json`.
- Regenerate this request with
  `pnpm --silent dearme:next-proof -- --target all --no-write --human-help-markdown`.
- Status: blocked until the three approved details above are provided.
- Captured details: none in the local proof setup.
- No-send guarantee: this handoff only prepares local proof setup; it does not
  send, publish, deploy, or spend.

Capture command after Peter provides approved values:

```bash
pnpm --silent dearme:next-proof -- --target all --linkedin-messages-url <partner-messages-url> --linkedin-recipient-urn <approved-linkedin-recipient-urn> --imessage-recipient <approved-phone-or-imessage>
```

Optional handoff receipt commands:

```bash
pnpm --silent dearme:next-proof -- --target all --no-write --handoff-receipt-file <launch-proof-handoff-receipt.txt>
pnpm --silent dearme:next-proof -- --target all --handoff-receipt-file <launch-proof-handoff-receipt.txt>
```

Required no-send check before any live delivery:

```bash
pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check --target all
```

Guarded live proof command only after explicit live confirmation:

```bash
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target all --live
```

Safety notes:

- The receipt preview checks downloaded product facts in memory and does not
  mutate local proof setup.
- `dearme:next-proof` only prepares local proof setup; it does not send,
  publish, deploy, or spend money.
- The no-send provider check must pass before guarded live proof.
- Live external proof remains a human-confirmed step because it contacts real
  recipients.

### 2026-05-14 - Self-serve checkout configuration

- Needs help from: Peter
- What they need to do: provide the real hosted payment link and signed
  receipt/webhook configuration for DearMe self-serve checkout.
- Why agents cannot do it: this involves real payment-provider setup, secrets,
  pricing/account judgment, and a customer-facing checkout URL.
- Blocking: no for private-beta sales or paid-user operations; yes before
  self-serve checkout can be claimed publicly.
- Estimated human time: 10-20 minutes once the payment provider offer is ready.
- Agents continue after result by: checking payment readiness locally, keeping
  receipt-sync and provider-contract proofs green, then exposing checkout only
  when the product marks it ready.

Needed values:

- `DEARME_PAYMENT_LINK_URL`: customer-facing HTTPS hosted payment link for the
  DearMe offer.
- `DEARME_PAYMENT_RECEIPT_SYNC_SECRET` or `STRIPE_WEBHOOK_SECRET`: receipt-sync
  or webhook signing secret, kept local/server-side.
- `DEARME_PAYMENT_PROVIDER`: optional customer-safe provider label for the
  checkout surface.

Reply template for Peter:

```text
Payment link:
Receipt sync configured:
Provider label:
```

Current generated payment readiness:

- Last verified: 2026-05-14 with
  `pnpm --silent dearme:payment-readiness`.
- Regenerate this request with
  `pnpm --silent dearme:payment-readiness -- --human-help-markdown`.
- Status: sellable-private-beta.
- Private beta sales: ready now.
- Hosted checkout: blocked.
- Claim self-serve checkout: no.
- Blockers: `DEARME_PAYMENT_LINK_URL` is missing;
  `DEARME_PAYMENT_RECEIPT_SYNC_SECRET` or `STRIPE_WEBHOOK_SECRET` is missing.
- No-spend guarantee: this handoff does not create checkout sessions, charge
  cards, call payment APIs, publish, deploy, or spend.

Local setup template:

```bash
pnpm --silent dearme:payment-readiness -- --print-env-template > .dearme-payment.env
```

Required local checks before claiming checkout:

```bash
pnpm --silent dearme:payment-readiness -- --env-file .dearme-payment.env --check-hosted
pnpm --silent dearme:payment-receipt-sync-proof -- --check
pnpm --silent dearme:payment-provider-contract-proof -- --check
```

Safety notes:

- Payment secrets must stay in local/server environment configuration, not in
  chat, docs, screenshots, or customer-facing copy.
- Manual private-beta receipt recording remains the sellable path until hosted
  checkout is fully configured.
- Checkout only appears in product surfaces when the payment link is HTTPS and
  signed receipt sync is configured.

## Request Template

```md
### YYYY-MM-DD - Short request title

- Needs help from:
- What they need to do:
- Why agents cannot do it:
- Blocking: yes/no
- Estimated human time:
- Agents continue after result by:
```
