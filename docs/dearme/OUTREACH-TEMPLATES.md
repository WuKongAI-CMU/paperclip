# DearMe First-Customer Outreach Templates

Date: 2026-05-15
Audience: Peter (sender) or the engineer's autopilot

These are starting points. Personalize before sending. Send 1:1, never blast.

---

## Template 1 — Personal LinkedIn DM to known contact

Subject: (DM — no subject line on LinkedIn)

> Hey [name],
>
> I've been building something for the last few months and you're one of the first people I'd want to use it. It's called DearMe — basically a small AI growth team that runs my personal brand stuff (content, outreach, a portfolio page) while I'm away, and writes me a private "dear me" letter every day with what happened.
>
> I'm running a private beta at $29/mo with five seats. The first three days are free; you can cancel anytime. The thing I actually want from you isn't the money, it's whether the voice it learns sounds like *you* after a week, and whether it makes you feel like you have an extra person on your team.
>
> If you're up for it, the link is https://dearme.app — would mean a lot. Happy to walk you through it on a call.

---

## Template 2 — Email to a personal contact

Subject: Want to try the thing I've been building?

> Hi [name],
>
> Quick one. I've spent the last few months building a tool I wanted for myself — a small AI growth team that runs the visible part of one person's personal brand without them. Content goes out, outreach happens, a portfolio page stays current, and every day there's a short "Dear me" letter that says what happened and what's next. I don't have to be online for any of it.
>
> It's called DearMe. I'm taking it into private beta now — $29/month, 3-day free trial, and I'm hand-picking the first handful of users. You're on that list because [why — they have a public brand surface / they're solo / you trust their feedback].
>
> Two asks:
> 1. Sign up at https://dearme.app — takes about 5 minutes to see whether it sounds like you yet.
> 2. Tell me what's broken. Honestly. I'd rather hear "this isn't there yet" from you than from a stranger.
>
> Want me to walk you through it on a 15-min call? I've got slots [day] and [day].
>
> Peter

---

## Template 3 — Twitter/X post (warm, not announcement)

> Quietly launching the thing I've been building. DearMe — a small AI growth team for one person. Runs your content, outreach, and a live portfolio page in your voice while you're away. Writes you a "dear me" letter every day with what happened.
>
> Private beta, $29/mo, three-day free trial. First five seats are picked, not sold:
>
> https://dearme.app

(Keep it under 280. The link expansion handles the OG card.)

---

## Template 4 — Reply to an existing convo (warm, lowest friction)

When someone already knows you're building "something AI":

> Hey — that thing I mentioned is live now. It's at https://dearme.app. Three-day free trial, $29 after that. Wanted you to be one of the first in if you want to give it a shot.

---

## Template 5 — Cold outreach to a fit ICP (later, NOT day 6)

Don't send these until 5+ warm customers are happy. Cold outreach pre-product-market-fit is wasted.

When you do (consultant / coach / indie-founder / candidate-on-market):

> Subject: A small AI growth team for the visible part of your brand
>
> Hi [name],
>
> [Specific compliment about their work — what they post, what they're known for, their last shipped thing.]
>
> I'm reaching out because I've built a tool for solo operators with a public brand surface. It's a small AI team that runs your content, outreach to people who could become clients / collaborators, and a live `dearme.app/[handle]` portfolio page — in your voice, with approval gates only for publish / send / deploy / spend.
>
> I'm not asking you to sign up cold. I'm asking if you'd be open to a 15-min call. If it sounds useful after that, the beta is $29/mo and your first three days are on me.
>
> Peter (DearMe · https://dearme.app)
>
> P.S. Two examples of what it's done for me in the last week: [proof URL] and [proof URL]. (Dogfood matters.)

---

## What NOT to send

- ❌ Mass DM blasts on LinkedIn — gets your account banned (DM-LINKEDIN-WARMUP code enforces a cap but social ban is the real risk)
- ❌ Cold email to scraped lists — CAN-SPAM + reputation hit + low conversion
- ❌ Twitter "🚀 introducing" announcements — the "small + warm" tone beats the "launch" tone for $29/mo SaaS at <100 customers
- ❌ Discord/Slack server spam — community moderators ban product pitches
- ❌ Any outreach BEFORE Peter has paid $29 himself — you can't sell what you haven't bought

---

## After the first 5 customers respond

For each one, capture:
1. Did they sign up? (PostHog will tell you)
2. Did they pay? (Stripe Dashboard)
3. What did their voice profile look like after one cycle? (`dearme_voice_profiles` table)
4. What was their first published output? (`Work Ready` → approved → published)
5. What broke? (Plain inbox, support thread)

Send each one a personal thank-you within 24h of signup. Doesn't have to be long.

> Hey [name] — saw you signed up. Thank you. Genuinely. If anything is confusing or feels off, just hit reply to this email — it goes straight to me.
>
> Peter
