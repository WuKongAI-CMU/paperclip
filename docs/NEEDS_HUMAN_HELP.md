# Needs Human Help

This is the single queue for human-only actions in agent-run company mode.

Agents should add an entry here only when the task cannot be safely, legally, or
practically completed without human support. Non-blocking requests should not
stop agent-owned work.

## Active Requests

### 2026-05-14 - External live-proof recipients

- Needs help from: Peter
- What they need to do: provide the approved professional-network delivery
  route, the first professional-network smoke recipient, and the phone-message
  smoke recipient for guarded live proof.
- Why agents cannot do it: these choices authorize real external delivery
  targets and channel details.
- Blocking: no for internal product work or private-beta operations; yes before
  public launch or live external receipt proof can be claimed.
- Estimated human time: 5-10 minutes once the desired test recipients are known.
- Agents continue after result by: capturing the approved values, running the
  no-send provider check first, then running guarded live proof only after
  explicit live confirmation.

Needed values:

- `DEARME_LINKEDIN_DM_MESSAGES_URL`: approved LinkedIn partner messages endpoint.
- `DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN`: approved LinkedIn smoke recipient.
- `DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT`: approved iMessage/SMS smoke
  recipient.

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
