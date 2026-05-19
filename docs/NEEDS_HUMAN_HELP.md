# Needs Human Help

This is the single queue for human-only actions in agent-run company mode.

Agents should add an entry here only when the task cannot be safely, legally, or
practically completed without human support. Non-blocking requests should not
stop agent-owned work.

## Active Requests

### 2026-05-19 - Daily Plain summary delivery configuration

- Needs help from: Peter
- What they need to do: provide the Plain API key plus the Peter recipient
  email for the required Codex daily support-thread summary.
- Why agents cannot do it: Plain account ownership, API-key creation, and
  recipient routing are Peter-owned account configuration.
- Blocking: no for product development or private-beta operations; yes for
  delivering the required daily Plain summary automatically. Current blocker:
  `DEARME_PLAIN_API_KEY` and `DEARME_CODEX_DAILY_PLAIN_EMAIL` or
  `DEARME_PLAIN_DAILY_EMAIL`.
- Estimated human time: 5-10 minutes once the Plain workspace exists.
- Agents continue after result by: running
  `pnpm --silent dearme:daily-plain-summary -- --json` and confirming the
  low-severity Plain thread is created.
- Last verified: 2026-05-19 with
  `pnpm --silent dearme:daily-plain-summary -- --json`.

Needed values:

- `DEARME_PLAIN_API_KEY`: Plain API key for creating the daily support thread.
- `DEARME_CODEX_DAILY_PLAIN_EMAIL` or `DEARME_PLAIN_DAILY_EMAIL`: recipient
  email for Peter's daily summary thread.

Reply template for Peter:

```text
Plain daily summary API key configured:
Plain daily summary recipient email:
```

Required local check after configuration:

```bash
pnpm --silent dearme:daily-plain-summary -- --json
```

Safety notes:

- Do not paste the Plain API key into chat, docs, screenshots, or
  customer-facing copy.
- The summary is low severity and contains run-ledger status plus
  owner-blocked facts; it does not include customer data or secrets.

### 2026-05-19 - External live-proof facts

- Needs help from: Peter
- What they need to do: provide the owner-approved external proof details for
  the launch proof lanes:
  `DEARME_LINKEDIN_DM_MESSAGES_URL`,
  `DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN`, and
  `DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT`.
- Why agents cannot do it: these details require owner approval, external
  recipient choice, and account/provider access that agents must not invent or
  contact without explicit launch confirmation.
- Blocking: no for internal product work or private-beta operations; yes before
  public launch or live external receipt proof can be claimed.
- Estimated human time: 10-20 minutes once the partner endpoint and approved
  smoke recipients are known.
- Agents continue after result by: capturing the approved values, running the
  no-send provider check first, then running guarded live proof only after
  owner facts are present, the no-send check passes, and explicit live
  confirmation is set.

Needed values:

- `DEARME_LINKEDIN_DM_MESSAGES_URL`: approved professional-network partner
  messages endpoint.
- `DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN`: approved professional-network smoke
  recipient.
- `DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT`: approved iMessage/SMS smoke
  recipient.

Reply template for Peter:

```text
Professional-network partner messages endpoint:
Professional-network smoke recipient:
iMessage/SMS smoke recipient:
```

Current generated proof handoff status:

- Last verified: 2026-05-19 with
  `pnpm --silent dearme:standing-loop-audit -- --check`,
  `pnpm --silent dearme:status`, and `pnpm --silent dearme:goal-audit`.
- Regenerate this request with
  `pnpm --silent dearme:next-proof -- --target all --no-write --human-help-markdown`.
- Status: blocked. Private beta remains sellable and operable; public launch
  and live provider proof remain blocked until the three approved details above
  are provided.
- Captured details: none in the local proof setup.
- No-send check: blocked.
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
pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check
```

Guarded live proof commands after owner facts are present, the no-send check
passes, and explicit live confirmation is set:

```bash
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target linkedin_dm --live
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target shared_messages --live
```

Safety notes:

- The receipt preview checks downloaded product facts in memory and does not
  mutate local proof setup.
- `dearme:next-proof` only prepares local proof setup; it does not send,
  publish, deploy, or spend money.
- The no-send provider check must pass before guarded live proof.
- Live external proof remains a human-confirmed step because it contacts real
  recipients.

### 2026-05-19 - Self-serve checkout configuration

- Needs help from: Peter
- What they need to do: provide the real hosted payment link for the live
  $29/month DearMe offer and signed receipt/webhook configuration for DearMe
  self-serve checkout.
- Why agents cannot do it: this involves real payment-provider setup, secrets,
  $29/month pricing/account judgment, and a customer-facing checkout URL.
- Blocking: no for private-beta sales or paid-user operations; yes before
  self-serve checkout can be claimed publicly.
- Estimated human time: 10-20 minutes once the payment provider offer is ready.
- Agents continue after result by: checking payment readiness locally, keeping
  receipt-sync and provider-contract proofs green, then exposing checkout only
  when the product marks it ready.

Needed values:

- `DEARME_PAYMENT_LINK_URL`: customer-facing HTTPS hosted payment link for the
  live $29/month DearMe offer.
- `DEARME_PAYMENT_RECEIPT_SYNC_SECRET` or `STRIPE_WEBHOOK_SECRET`: receipt-sync
  or webhook signing secret, kept local/server-side.
- `DEARME_PAYMENT_PROVIDER`: optional customer-safe provider label for the
  checkout surface.

Reply template for Peter:

```text
Live $29/month payment link:
Receipt sync configured:
Provider label:
```

Current generated payment readiness:

- Last verified: 2026-05-19 with
  `pnpm --silent dearme:payment-readiness`.
- Regenerate this request with
  `pnpm --silent dearme:payment-readiness -- --human-help-markdown`.
- Status: sellable-private-beta.
- Private beta sales: ready now.
- Hosted checkout: blocked.
- Claim self-serve checkout: no.
- Blockers: `DEARME_PAYMENT_LINK_URL` is missing;
  `DEARME_PAYMENT_RECEIPT_SYNC_SECRET` or `STRIPE_WEBHOOK_SECRET` is missing
  (sensitive; value hidden).
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
- Placeholder setup values are treated as blocked configuration and are not
  printed by the readiness check.
- Manual private-beta receipt recording remains the sellable path until hosted
  checkout is fully configured.
- Checkout only appears in product surfaces when the payment link is HTTPS and
  signed receipt sync is configured.

### 2026-05-19 - Dependency review queue

- Needs help from: Peter
- What they need to do: review dependency updates that the autonomous
  dependency loop intentionally will not bump without human review.
- Why agents cannot do it: these updates can change compiler, test runner,
  bundler, or pre-1.0 behavior in ways that require product and engineering
  judgment before code changes.
- Blocking: no for private-beta sales or paid-user operations; yes before
  these dependency updates can be merged.
- Estimated human time: 10-20 minutes to decide whether to approve a
  dedicated upgrade PR for each package.
- Agents continue after result by: opening one dependency-upgrade PR per
  approved package, running the focused tests plus typecheck, and leaving
  unapproved packages untouched.

Review-required updates:

- esbuild: 0.27.3 -> 0.28.0 (minor) - 0.x minor dependency updates can be
  breaking and wait for human review.
- typescript: 5.9.3 -> 6.0.3 (major) - Major dependency updates wait for human
  review.
- vitest: 3.2.4 -> 4.1.6 (major) - Major dependency updates wait for human
  review.

Reply template for Peter:

```text
Dependency upgrades approved:
Dependency upgrades defer:
Notes:
```

Current generated dependency audit:

- Last verified: 2026-05-19 with
  `pnpm --silent dearme:dependency-loop-audit -- --check`.
- Autonomous updates: 0.
- Review-required updates: 3.
- Next action: Continue standing loop - Only review-required dependency updates
  are available; do not bump them autonomously.

Regenerate this request with:

```bash
pnpm --silent dearme:dependency-loop-audit -- --human-help-markdown
```

Required local checks before any approved dependency PR is merged:

```bash
pnpm --silent test:dearme-dependency-loop-audit
pnpm --silent dearme:dependency-loop-audit -- --check
pnpm --silent typecheck
```

Safety notes:

- Review-required dependencies are not bumped automatically.
- One approved dependency slice should be shipped per PR.
- No credentials, live network calls, sends, deploys, or spending are part of
  this request.

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
