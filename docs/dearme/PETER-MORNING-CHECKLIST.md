# Peter Morning Checklist — 2026-05-16

Use: open this file, do every item top-to-bottom, then go back to bed. ~30 minutes total.

Codex is currently in a holding pattern because of these 7 unblockers. Every one of them is something only you can do.

---

## 1. Start Stripe Atlas first (it has a 1-2 day review)

- [ ] Go to https://stripe.com/atlas
- [ ] Apply for a Delaware LLC (or use existing if you have one)
- [ ] Submit bank account info
- [ ] Note the timeline — Atlas needs 1-2 days for review. **Start this first so it bakes while you do everything else.**

If you skip Atlas and use a personal Stripe, you can still collect $29 — but payouts to a personal account look sketchy at scale. Atlas is the right call.

---

## 2. DNS pointer for dearme.app (~5 min)

- [ ] Confirm `dearme.app` is registered to you (whois check or registrar dashboard)
- [ ] Make sure you can edit DNS records (Cloudflare / Namecheap / GoDaddy panel access)
- [ ] **Don't add records yet** — wait until you've picked Vercel in step 3

---

## 3. Open 8 platform accounts (~25 min total)

Order matters — Stripe Atlas is baking; do the rest now.

For each: sign up, save API key to your password manager with label `DearMe — <provider>`.

- [ ] **Vercel** — https://vercel.com (sign in with GitHub). Once logged in, you'll be able to `vercel link` the repo.
- [ ] **Neon** — https://console.neon.tech. Create project `dearme-prod`. Copy the *pooled* `postgres://` URL (NOT the direct one) for `DATABASE_URL`.
- [ ] **Voyage AI** — https://dash.voyageai.com. Create API key. Note: it starts with `pa-` (NOT `sk-`).
- [ ] **Resend** — https://resend.com. Create account. Add domain `dearme.app` (you'll get 4 DNS records to drop in your DNS panel after step 4 below).
- [ ] **Loops** — https://loops.so. Pre-register these 5 event names under "Events":
  - `dearme_signup`
  - `dearme_first_payment`
  - `dearme_renewal`
  - `dearme_cancelled`
  - `dearme_trial_ending`
- [ ] **PostHog** — https://posthog.com. Create project "DearMe Prod". Copy the `phc_*` project key — you'll use it for both `VITE_POSTHOG_KEY` and `DEARME_POSTHOG_KEY`.
- [ ] **Google Cloud Console** — https://console.cloud.google.com/apis/credentials. Create OAuth 2.0 client (web). Authorized JS origin: `https://dearme.app`. Redirect URI: `https://dearme.app/api/auth/callback/google`. Copy client ID + secret.
- [ ] **Plain** — https://plain.com. Create workspace "DearMe". API key with `customer:read,write` + `thread:read,write`. Copy the webhook signing secret.

All free tier on Day 1. Total monthly cost at 0 customers: **$0**. At 50 customers: ~$155/mo (see `PROVIDER-INTEGRATION-NOTES.md` for projection).

---

## 4. DNS records (do after Vercel + Resend signup)

In your DNS panel, add:

```
A      @          76.76.21.21              (Vercel)
CNAME  www        cname.vercel-dns.com     (Vercel)
TXT    @          <SPF record from Resend>
CNAME  resend._domainkey  <DKIM from Resend>
MX     send       feedback-smtp.<region>.amazonses.com  (Resend)
TXT    _dmarc     <DMARC from Resend>
```

Wait 5-10 min for propagation, then click "Verify" in Resend.

---

## 5. The 3 owner-approved facts (~5 min, but requires decision)

These three things cannot be done by anyone but you:

- [ ] **LinkedIn DM partner endpoint.** Pick one of: Expandi, Closely, PhantomBuster, or your own gateway. Decision: which partner. URL: `https://api.<chosen>.com/messages` (or similar).
- [ ] **LinkedIn smoke recipient URN.** Pick a real LinkedIn person you want to receive ONE test DM. Easiest: your own alt account. Format: `urn:li:person:<id>` — get from their profile via the partner's tooling.
- [ ] **iMessage smoke recipient.** A phone number or Apple ID where you want ONE test iMessage to land. Easiest: your other phone. Format: `+15551234567` or `peter@icloud.com`.

Then run, in `~/dearme`:

```bash
pnpm dearme:next-proof -- --target linkedin_dm
pnpm dearme:next-proof -- --target openclaw_messages
```

These commands prompt you for those 3 facts and write them to the ignored `.dearme-proof.env`. No public commits, no leak.

---

## 6. Add ALL env vars to Vercel (one-time)

```bash
cd ~/dearme
cp .env.production.example .env.production.local
# Open .env.production.local in your editor, paste in every API key from steps 1-5
vercel env pull .env.production.local-pulled  # confirms which vars Vercel already knows
# Add via dashboard at https://vercel.com/<your-team>/dearme/settings/environment-variables
# OR via CLI:
cat .env.production.local | grep -v "^#" | grep "=" | while IFS='=' read -r key value; do
  echo "$value" | vercel env add "$key" production
done
```

Confirm with:

```bash
pnpm dearme:prod-ready
```

Should exit 0 (no missing/malformed vars).

---

## 7. List 5 design partners

Open a notes doc and write 5 names + their LinkedIn URLs or emails. Each one should be:

- Someone you know personally (will reply to your DM)
- Has a public-facing personal brand (consultant / founder / candidate-on-market / creator)
- Will give you honest feedback ("this sucks because…") not polite feedback

Save the list. You'll use it on Day 6 with the templates in `OUTREACH-TEMPLATES.md`.

---

## 8. Forward Codex the unblock signal

After 1-7 done, post this to your Plain inbox (or wherever Codex daily-summary lands):

```
Unblocks delivered:
- DNS: configured
- Vercel: project linked, env vars set
- Neon: DATABASE_URL set in Vercel
- Stripe: Atlas applied (review in 1-2 days), test keys set, live keys when review completes
- Owner facts: captured via pnpm dearme:next-proof
- Card: ready for Day 5 dogfood
- Design partners: 5 names captured

You can now start Wave A from CODEX-COURSE-CORRECTION-2026-05-16.md.
Begin with DM-LANDING-COPY-V2.
```

That's the signal. Codex will pick up Wave A on next wake.

---

## Total time estimate

| Step | Time |
|---|---|
| Stripe Atlas application | 10 min (then waits 1-2 days) |
| DNS check + Vercel + Neon | 8 min |
| 6 other platform accounts | 18 min |
| DNS records added | 5 min |
| 3 owner facts | 5 min |
| Env vars into Vercel | 10 min |
| Design partner list | 5 min |
| Forward unblock signal | 1 min |
| **Total active time** | **~60 min** |

If you can spare 60 min before lunch tomorrow, Codex will be back on the launch path by afternoon. Stripe Atlas review is the only sequential dependency that takes calendar time — everything else parallelizes.

---

## If something is blocking you on a step

- Forgot Cloudflare/Namecheap login? Reset before doing anything else.
- Don't know your Stripe Atlas LLC name? Use your last name + "Studio" (e.g. "Yu Studio LLC") — generic enough, easy to rename later.
- Don't have a LinkedIn partner picked? Use **Expandi** as default ($99/mo, established, has a public API). You can switch later.
- Don't have a list of 5 design partners? Ship without it on Day 1 and find them in week 2 — Peter's own dogfood is enough to start.

---

## After this checklist

`PRE-LAUNCH-CHECKLIST.md` is the next checklist (60 tick-boxes). Don't open it until Codex has Vercel green + Stripe webhook returning 200.
