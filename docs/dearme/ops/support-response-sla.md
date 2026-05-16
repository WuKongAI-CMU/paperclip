# DearMe Support Response SLA

Run `pnpm dearme:support-response-sla` from cron every hour.

Required environment:

- `DEARME_PLAIN_API_KEY`
- `DEARME_LOOPS_API_KEY`
- `DEARME_SUPPORT_SLA_ALERT_EMAIL`

Behavior:

- Reads the latest open Plain support threads.
- Flags any thread with customer activity older than 24 hours and no newer support response.
- Sends one Loops event, `dearme_support_overdue`, per run when at least one thread is overdue.
- Sends thread IDs and counts only; customer emails and message bodies are not included in the event payload or CLI output.

If Plain is not configured, the command exits successfully with a skipped result so preview and local environments do not make live network calls.
