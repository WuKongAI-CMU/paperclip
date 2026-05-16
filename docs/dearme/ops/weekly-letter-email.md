# DearMe Weekly Letter Email

Run this cron hourly:

```bash
pnpm dearme:weekly-letter-email
```

The command checks each active DearMe account against its saved weekly routine timezone. When that local time is Sunday 18:00, it sends the latest `dear-me-report` document from the existing weekly report lane.

Required production env:

- `DATABASE_URL`
- `DEARME_RESEND_API_KEY`
- `DEARME_WEEKLY_LETTER_FROM_EMAIL` (defaults to `letters@dearme.app`)
- `DEARME_WEEKLY_LETTER_FROM_NAME` (defaults to `DearMe`)
- `DEARME_PUBLIC_URL` (defaults to `https://dearme.app`)

Safety behavior:

- If `DATABASE_URL` or `DEARME_RESEND_API_KEY` is missing, the command exits successfully as skipped and does not make a network call.
- Each company/local-date pair is recorded in `activity_log`, so reruns do not send the same weekly letter twice.
- The CLI output includes company IDs and user IDs only; it does not print recipient emails or letter bodies.
- Use `--force` only for a controlled manual resend test; normal cron should not set it.
