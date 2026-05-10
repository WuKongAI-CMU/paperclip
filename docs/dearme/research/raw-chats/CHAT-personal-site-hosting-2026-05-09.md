# CHAT: 个人网站 hosting / multi-tenant renderer / 自定义域名 UX

> Source: ChatGPT Pro / GPT-5 / Deep Research
> 我问的是: DearMe 的个人网站层怎么搭 — 每用户独立部署 vs 多租户 renderer / 自定义域名 UX (peterc.com) 怎么做 / Vercel vs Cloudflare vs Fly / 怎么做信号变化后 <30s 更新
> 我想得到的结论: 1/100/10K/100K 用户阶段的栈选择 / 成本曲线 / 复制谁的 UX (Cal/Dub/Bento/Read.cv) / OSS 模板 / hero 图怎么生成
> 跑了 3 次 (variance check)
> Decision input for: DM-177 (deploy_site outbound tool 实现), DM-147/148 (Brand Site Builder runtime + 首用户首页 live), 以及 dearme.app/[handle] 的早期架构决策

---

## Run 1

Recommendation

For DearMe, do not deploy one site per user and do not rebuild on every signal. Build one multi-tenant renderer that serves dearme.app/[handle] and custom-domain hosts from the same deployment. Store each user's generated site state in a database/object store, update that state from webhooks, and invalidate or bypass cache for the changed tenant.

Phase  Stack  Why this is the right move
Day 1: 1-user MVP  Next.js App Router + Vercel + Postgres/Supabase/Neon + one dynamic route  Fastest path to dearme.app/peter, dynamic OG images, GitHub OAuth/webhooks, and clean personal-site templates. Use dynamic rendering or low TTL for "What I'm working on," not per-user deploys. Vercel's Platforms Starter Kit already models the multi-tenant/custom-domain pattern with Next.js, Domains API, ISR/revalidation, Blob, and dynamic OG.  ￼
Week 4: 100 paid beta  Same: Next.js + Vercel, but with a real job pipeline and cache tags  Keep one deployment. Add a site_state snapshot per user, GitHub/YouTube/social ingestion jobs, and per-site cache invalidation. Vercel Pro is operationally simple, has a $20/mo plan plus usage, includes 10M Edge Requests and 1TB Fast Data Transfer before overages, and supports platform-style multi-tenant projects.  ￼
Q2: 10K users + custom domains  Two viable paths: stay on Vercel if domains are paid/minority; move renderer/domains to Cloudflare Workers + Cloudflare for SaaS if domains are core/high-volume  Vercel is easier and has project-domain APIs plus high soft domain limits; Cloudflare gives lower request/bandwidth economics but custom hostnames become a line item and the domain workflow is more involved. Cloudflare Workers Paid starts at $5/mo with 10M requests included and $0.30/M after, while Cloudflare for SaaS includes 100 hostnames and charges $0.10/additional custom hostname on self-serve plans.  ￼

The architecture should be: signup → enrich signals → generate profile JSON/blocks → publish state → render route/host → refresh sections from state. "Build at signup" is fine as a content-generation job; "deploy at signup" is the wrong abstraction.

⸻

Core architecture for DearMe

DearMe's product requirement is not "static sites." It is static-feeling pages with mutable tenant data. Treat each user's page as a rendered view over a canonical site_state document:

site
  id, handle, owner_id, status, created_at
source_account
  site_id, provider, handle, oauth_token_ref, visibility
signal_artifact
  site_id, provider, external_id, url, title, body, published_at, raw_json, confidence
content_block
  site_id, type, title, body_json, source_artifact_ids, user_locked, updated_at
domain_mapping
  host, site_id, provider, status, verification_records, ssl_status

The publishing flow should be:

GitHub/YouTube/RSS/social webhook or poll
→ queue job
→ fetch artifact
→ classify/dedupe/rank
→ regenerate only affected blocks
→ write site_state
→ invalidate cache tag or serve dynamic volatile section
→ user-visible update

For the <30s visible update requirement, the volatile modules should not wait for full-page static regeneration. Next.js supports on-demand cache invalidation via revalidateTag, updateTag, and revalidatePath, but ISR regeneration is request-triggered and can serve stale content while refreshing; for strict freshness, render the volatile "Now" and "What I'm working on" sections dynamically or fetch fresh state with a short cache policy.  ￼

Do not use Cloudflare KV as the source of truth for <30s freshness. KV is excellent as a global read cache, but Cloudflare documents KV as eventually consistent, with writes sometimes taking up to 60 seconds or more to appear in other global locations; use D1, Durable Objects, Postgres, Redis, or another stronger source for the canonical current state.  ￼

⸻

Stack options

Option  Fit for DearMe  Update path under 30s  Custom domains  Cost shape  Verdict
Next.js + Vercel  Best initial fit. Strong App Router ecosystem, @vercel/og, platform starter, easy host-based routing.  Webhook writes DB → revalidate tag/path or dynamic section. Avoid depending on ISR alone for "live" modules.  Vercel supports adding domains to projects, apex A records, subdomain CNAMEs, automatic SSL after verification, and API-driven domain management.  ￼  Pro is $20/mo plus usage; includes 10M Edge Requests and 1TB Fast Data Transfer before overage, then Edge Requests start at $2/M and transfer at $0.15/GB.  ￼  Use Day 1 and Week 4. Also viable at 10K if custom domains are paid/minority.
Astro + Cloudflare Pages/Workers  Great for content-heavy personal sites. Astro is excellent for static/mostly-static pages.  Use Workers + DB/object storage for dynamic sections. Avoid rebuild-per-signal.  At SaaS scale, use Cloudflare for SaaS custom hostnames, not normal one-off Pages custom domains.  Workers Paid is cheap on requests and has no additional bandwidth charges in the Workers pricing page; custom hostnames cost after the included 100.  ￼  Strong Q2 alternative, especially if you move to Cloudflare for domains.
Remix + Fly.io  Good dynamic-app architecture, but less ideal for a personal-site SaaS that wants turnkey CDN/domain automation.  Dynamic server app can update immediately from DB.  Fly supports custom domains and Let's Encrypt certs, but you manage more DNS/cert detail yourself; CNAME is good for subdomains, A/AAAA for apex, TXT/ACME records for verification.  ￼  Shared CPU machines start around a few dollars/mo per machine; a 1GB shared-cpu-1x machine is listed at $5.92/mo in the Fly docs.  ￼  Not my pick unless you specifically want server/runtime control.
SvelteKit + Vercel  Viable, clean, fast. Less DearMe-specific ecosystem than Next.js.  Vercel's SvelteKit adapter supports ISR and on-demand revalidation via a bypass token.  ￼  Same Vercel domain substrate.  Same Vercel cost model.  Good, but not better than Next for this product.
Pure static + Cloudflare Workers + KV  Tempting but dangerous if "live in <30s" is hard.  KV consistency can miss the SLA. Use Worker + D1/Durable Object/R2 instead.  Cloudflare for SaaS is excellent at scale; Worker can be fallback origin for all custom hostnames via wildcard route.  ￼  Very cheap request/bandwidth profile; hostname charges can dominate if every user adds a domain.  Use Workers, but not KV-only.
Hybrid: build at signup, deploy subdomain, push updates via webhook  Good as a mental model for initial content generation; bad as an infra model.  Per-signal deploys are too slow, noisy, and costly.  Domain attachment becomes per-deployment/project complexity.  Build minutes/production deploy credits become a hidden tax.  Avoid per-user/per-signal deploys.

Astro on Cloudflare deserves one caution: Cloudflare Pages docs still describe Astro SSR on Pages, while Astro's own Cloudflare adapter docs note that Pages support was removed in the Astro 6/v13 adapter path and that on-demand rendered routes deploy to Cloudflare's runtime/Workers. For a new 2026 build, I would target Cloudflare Workers, not Pages, for any dynamic Astro renderer.  ￼

⸻

Cost profile from 1,000 to 100,000 sites

The key cost metric is not "sites." It is:

requests + bandwidth + function/CPU time + image/LLM generation + custom hostnames + build minutes

With one multi-tenant app, 1,000 idle personal sites cost almost nothing beyond the base app/database. Costs rise when pages get traffic, users upload media, you generate images, or users attach domains.

Provider  What matters for DearMe
Vercel  Strong simplest path. Pro is $20/mo with included usage; pricing page lists 10M Edge Requests/mo and 1TB Fast Data Transfer/mo on Pro, then $2/M Edge Requests and $0.15/GB transfer. ISR reads/writes, function CPU, Edge Config reads, and build minutes are separate usage categories, so avoid reading Edge Config on every page and avoid per-signal deployments.  ￼
Cloudflare Workers  Best request/bandwidth economics. Paid Workers is $5/mo minimum, includes 10M requests/month, then $0.30/M requests; the Workers pricing page states no additional charges for data transfer/bandwidth. KV is cheap for reads/writes but not strong enough as the freshness source.  ￼
Cloudflare for SaaS  Custom domains are the cost lever. Self-serve Free/Pro/Business include 100 custom hostnames, list a 50,000 hostname maximum, and charge $0.10/additional custom hostname; Enterprise can go beyond 50K with custom pricing.  ￼
Netlify  Good for normal sites, weaker for DearMe's multi-tenant custom-domain shape. Netlify Pro is $20/mo with 3,000 credits, production deploys cost 15 credits, bandwidth is 20 credits/GB, web requests are 2 credits/10K, and docs recommend no more than 50 domain aliases per site.  ￼
Fly.io  Good dynamic app hosting, but you own more ops. Fly prices machines by CPU/RAM preset plus RAM; custom domains require adding certs/domains and showing DNS records.  ￼

A practical traffic example: 10K sites × 100 pageviews/month = 1M pageviews/month. On Vercel, request volume is comfortably inside Pro's included Edge Requests, but transfer can matter if every pageview ships a large hero image. On Cloudflare Workers, requests are still inside the paid plan's included 10M, and bandwidth is less of a pricing concern, but 10K custom domains would be roughly 9,900 billable additional hostnames after the included 100 on self-serve Cloudflare for SaaS.  ￼

⸻

Custom domain UX: the part to get right

Your flow should look like this:

1. User enters peterc.com or www.peterc.com
2. DearMe normalizes apex vs subdomain
3. DearMe calls provider domain/custom-hostname API
4. DearMe stores pending domain_mapping
5. UI shows exact DNS record(s)
6. Background job polls provider + DNS
7. When DNS + ownership + SSL are active, mark domain live
8. Host router maps Host header → site_id

Vercel-style flow

For Vercel, the user-facing instruction is usually:

Domain type  DNS instruction
Apex, peterc.com  Add A record to Vercel's apex IP, documented as 76.76.21.21 in Vercel's custom domain setup docs.
Subdomain, www.peterc.com  Add CNAME to the Vercel-provided target. Vercel docs show CNAME targets such as cname.vercel-dns-0.com or a unique vercel-dns hostname depending on the setup.
Conflict / already used on Vercel  Show the TXT verification record, often _vercel, and retry verification.

Vercel's docs show domain inspection, DNS records, verification, and automatic SSL issuance after DNS verification; Vercel also exposes REST APIs for managing domains/projects programmatically.  ￼

Cal.com's custom-domain docs are basically the productized version of this flow: the org admin enters a domain, Cal registers it with Vercel, stores it as pending, provides DNS records, verifies ownership/DNS, and then serves booking pages once verified. Cal's docs explicitly say custom-domain provisioning uses the Vercel Domains API.  ￼

Dub's custom-domain UX is also worth copying: it distinguishes apex A record vs subdomain CNAME, shows DNS records after the user adds a domain, supports custom domains even on free tiers with limits, and handles Vercel conflict TXT verification.  ￼

Cloudflare for SaaS flow

For Cloudflare, the pattern is:

DearMe zone = dearme.app
SaaS target = e.g. custom.dearme.app
Customer hostname = peterc.com or www.peterc.com
Fallback origin = Worker/app

Cloudflare for SaaS custom hostnames require adding the customer hostname, choosing validation/TLS settings, retrieving ownership/cert validation details, and waiting until hostname status, SSL status, and DNS all become active. Normal CNAME setup is straightforward for subdomains; apex domains require either an apex-friendly DNS provider, Apex Proxying, or a product decision to recommend www.  ￼

For DearMe's UX, default to recommending www.peterc.com first because CNAME setup is easier and safer. Offer peterc.com as an "advanced/apex" option. Detect and explain CAA issues, proxied Cloudflare records, duplicate-domain ownership conflicts, and "this domain already points to another active website."

⸻

Product/design references to imitate legally

Clone component patterns, not branding, copy, visual identity, CSS, icons, or assets. The DearMe product should feel like Bento's visual density + Read.cv's professional credibility + About.me's contact ritual + Cal.com's booking conversion + Dub's domain/analytics polish.

Product  Component structure to imitate  Stack signal  Auto-from-signals feel  Custom domain UX  Conversion ritual
Bento / bento.me  Mobile-first bento grid: hero card, link cards, media embeds, social cards, project cards. Great reference for a dense personal homepage.  Public product was sunset after Linktree acquisition; active OSS clones exist.  Mostly user-edited blocks, not real work-signal automation.  Third-party Bento docs indicated no custom-domain support and bento.me/username pages; this is a weakness DearMe can beat.  ￼  Click outbound links; weak native conversion. DearMe should add "Book / Email / Subscribe" as first-class CTAs.
Read.cv  CV-as-site: profile, work history, posts, projects, social proof. Excellent reference for professional credibility.  Acquired by Perplexity and shut down/exported in 2025, so use as design archaeology rather than active competitor.  ￼  User-maintained professional graph; some network/profile data, not commit-level automation.  .cv domain migration/export became part of shutdown story; not a live SaaS reference now.  Visitor reads credibility → follows/contact. DearMe should add explicit booking/email capture.
Linktree  Simple vertical link stack, social icons, QR, contact/forms, monetization modules.  Proprietary; public page parsing did not expose enough to rely on stack inference.  User-edited links; Linktree markets social-management and AI-caption features, but it is not a live work-signal site.  ￼  Official help historically said users could not replace linktr.ee/username with a custom domain.  ￼  Link click, shop, book, collect contact. Good conversion basics, visually underpowered.
About.me  Hero identity page, bio, image/gallery/video, "Spotlight" CTA, now AI Twin chat/lead capture.  Proprietary.  AI Twin trained to answer in the user's tone; closer to DearMe's "bio in voice" than Linktree.  ￼  Pro plan includes custom domain; older docs show mapping an owned domain via an A record.  ￼  Visitor asks AI Twin, books, or becomes a lead. Strong reference for "contact ritual."
Dapper.me / Mile.so  Not worth prioritizing.  Dapper.me appears parked/for sale; mile.so failed to resolve during research.  ￼  Not a reliable active reference.  Not a reliable active reference.  Ignore except as name/category context.
Webstudio  Visual page builder, component-level control, custom design system.  Open-source builder; GitHub describes it as an open-source visual development platform/Webflow alternative, with recent releases.  ￼  User-edited design, not auto-signal driven.  Depends on hosting setup.  Useful if DearMe later adds a visual editor; not needed for MVP.
Cal.com personal/booking pages  Availability-first CTA, event types, embeds, clean booking funnel.  Open-source scheduling products around Next.js/Tailwind/Prisma patterns; Cal custom-domain docs use Vercel.  ￼  Calendar/availability are live signals; profile content mostly configured.  Copy Cal's "enter domain → show DNS → verify → status" flow.  Visitor picks meeting length/time. DearMe should make this the primary CTA for professionals.
Dub.co  Domain management, branded links, analytics, social card previews, clean settings UX.  Dub's repo is open-source/open-core and built on Next.js, TypeScript, Tailwind, Prisma, Upstash, Tinybird, PlanetScale, NextAuth, Stripe, Resend, and Vercel.  ￼  Auto analytics/events, not personal content generation.  Very strong custom-domain UX; apex vs subdomain instructions and TXT conflict handling.  ￼  Link click → analytics → conversion optimization. DearMe should copy its domain and analytics polish.

DearMe's default template should have these sections, in this order:

1. Hero: name, handle, avatar, one-sentence generated bio, primary CTA
2. Now: 3–5 fresh bullets generated from current signals
3. Working on: projects/repos/posts grouped into themes
4. Featured work: case-study cards
5. Talks / podcasts / videos: cards with venue/date/media
6. Writing / posts: recent posts, optionally summarized
7. Social proof: logos, stars, testimonials, notable links
8. Contact: book, email, newsletter, socials

The most important UX decision: every auto-generated block needs a visible provenance model: "from GitHub," "from YouTube," "from your blog," "edited by you," or "AI draft." That prevents the product from feeling like a hallucinated vanity page.

⸻

AI-generated content strategy

For the bio in the user's voice, do not fine-tune initially. Build a small "voice card" per user from 5–15 writing samples: tweets/posts, README text, blog intros, podcast transcripts, or user-provided examples. Prompt with few-shot examples, factual source notes, and explicit constraints: "do not invent employer/title/talks," "write in first person," "80–120 words," "one confident sentence for hero." OpenAI and Anthropic both document few-shot examples as a core way to steer style and behavior.  ￼

For GitHub-derived work, use GitHub webhooks for push events and REST APIs for backfill. GitHub's push webhook includes commit data and before/after SHAs, while the commits REST API can fetch commit details; DearMe should summarize public commits/PRs into human-readable themes rather than showing raw commit messages.  ￼

For talks, podcasts, and videos, use deterministic extraction first and LLM summarization second. YouTube search.list can discover videos but costs 100 quota units per call, while videos.list costs 1 unit and can fetch details for known video IDs; so use channel uploads, URLs, and known IDs when possible, then enrich with title, published date, thumbnail, transcript/description, and confidence score.  ￼

For case studies, require user approval or at least user-locking. Let the AI draft a case study from a repo, launch post, README, or portfolio URL, but the user should approve claims, metrics, client names, and screenshots. This is where AI can easily overstate impact.

⸻

Image generation and OG images in 2026

For OG images, use deterministic generation first: React/Satori/@vercel/og, a profile photo, name, tagline, current focus, and brand gradient. It is faster, cheaper, consistent, and avoids AI artifacts. Magic Portfolio also uses automatic Open Graph/X image generation with next/og, which is the right pattern to copy.  ￼

For hero illustrations, the 2026 recommendation is:

Need  Best choice
Clean default hero/OG variants  OpenAI gpt-image-2. OpenAI's image docs call gpt-image-2 the latest GPT Image model, and the prompting guide recommends it as the default for new builds, with gpt-image-1-mini for cost/throughput. Some org verification is required for GPT Image models.  ￼
Vector-ish brand graphics, icons, crisp design assets  Recraft, because it explicitly focuses on editable vector graphics, design-ready typography, mockups, vectorization, and brand-oriented assets.  ￼
Editing an existing avatar/reference image while preserving identity/style  FLUX Kontext, because Black Forest Labs positions Kontext around contextual understanding, character consistency, typography manipulation, and iterative editing.  ￼
Text-heavy posters/badges  Ideogram, because Ideogram 3.0 emphasizes legible text, prompt alignment, photorealism, and style control.  ￼

Do not build new DearMe hero-image infrastructure around Sora. As of OpenAI's docs/help, Sora web/app was discontinued in April 2026 and the Sora 2 API is deprecated with shutdown scheduled for September 24, 2026.  ￼

A good product default is: no AI hero at signup. Launch with avatar + gradient + deterministic OG. Offer "Generate a hero image" later as a paid/approval-gated enhancement.

⸻

Open-source kits to crib from

Ranked by a blend of stars + recency + relevance. Some high-star repos are not ideal architecture references, but they are useful for components and content structure.

Rank  Repo  Why it matters for DearMe
1  timlrx/tailwind-nextjs-starter-blog — 10.5k stars  Best Next.js/Tailwind/MDX blog starter to crib for writing, SEO, RSS, tags, and content rendering. MIT licensed.  ￼
2  saadpasta/developerFolio — 6.5k stars  Very popular developer portfolio template, but GitHub topic page notes it is not actively maintained. Use for section ideas, not architecture.  ￼
3  soumyajit4419/Portfolio — 6.3k stars, updated Oct 2025  Strong reference for a self-coded personal portfolio layout.  ￼
4  RyanFitzgerald/devportfolio — 4.9k stars, updated Apr 2026  Astro + Tailwind minimalist portfolio; good for a clean static personal template.  ￼
5  ashutosh1919/masterPortfolio — 4.2k stars, updated Jan 2026  Complete customizable software developer portfolio; useful for breadth of sections.  ￼
6  rammcodes/Dopefolio — 3.7k stars, updated Oct 2024  Classic developer portfolio layout; useful for case-study/project-card patterns.  ￼
7  said7388/developer-portfolio — 2.4k stars, updated Apr 2026  Next.js + Tailwind developer portfolio; closer to DearMe's stack than older React-only templates.  ￼
8  arifszn/gitprofile — 2.2k stars, updated Feb 2026  Highly relevant because it creates a dynamic portfolio from a GitHub username. DearMe should study its GitHub-derived profile model.  ￼
9  migueravila/Bento — 2.2k stars  Great bento/startpage layout reference with bento/list/button modes; GPL-3.0 means be careful about reuse in proprietary code.  ￼
10  manuelernestog/astrofy — 1.4k stars  Astro/Tailwind/DaisyUI personal portfolio with Blog, CV, Project Section, Store, and RSS Feed.  ￼

Also worth inspecting: once-ui-system/magic-portfolio for polished Next.js portfolio structure and automatic OG images, but note its non-commercial license terms; ibelick/nim for a modern Next.js 15/React 19/Tailwind v4 personal template; OpenBento and astro-bento-portfolio for bento-grid UX.  ￼

⸻

Build plan

Day 1 MVP

Ship:

Next.js App Router on Vercel
/[handle] route
/site/[handle]/opengraph-image route
Postgres/Supabase/Neon tables
GitHub OAuth or manual GitHub username
Manual YouTube/social links
One template: hero, now, working-on, talks, work, contact

Use dynamic rendering for the "Now" and "What I'm working on" sections. Generate the first profile within 3–5 minutes by running an enrichment job after signup, but serve the page immediately with "drafting profile…" placeholders if the job is still running.

Week 4 beta

Add:

GitHub App + webhooks
YouTube/RSS/backlink enrichment jobs
source_artifact provenance table
user approval / hide / pin controls
per-section cache tags
domain_mapping table
Vercel Domains API integration
Cal.com/booking link integration
basic analytics per site

At this stage, the stack should still be Vercel. The product risk is content quality and trust, not infra cost.

Q2 / 10K users

Make the infrastructure decision based on custom-domain adoption:

Condition  Decision
Most users stay on dearme.app/handle; custom domains are paid/pro and under a few thousand  Stay on Vercel. You get simpler domain APIs, automatic SSL, strong Next.js integration, and enough domain headroom.
Custom domains become core to every paid account, and you expect tens of thousands of hostnames  Move custom-domain serving to Cloudflare Workers + Cloudflare for SaaS, or at least put Cloudflare in front of the renderer.
You want full infra control and can accept more ops  Remix/Fly or custom Workers stack, but this is not the fastest path.

The durable product architecture is the same either way: one renderer, host-based tenant lookup, source-of-truth state, job-driven enrichment, and section-level refresh.

---

## Run 2

As of May 10, 2026 ET, my recommendation is: do not build DearMe as 1,000–100,000 separately deployed static sites. Build it as one multi-tenant renderer with 100,000 tenant records, many hostnames, and aggressively invalidated edge caches.

The core product trick is that "site went live" should mean: initial profile JSON exists, the route resolves, and the renderer can serve it. It should not mean a framework build or deployment happened.

Ranked recommendation

Stage  Stack I'd choose  Why
Day 1: MVP for you  Next.js App Router + Vercel + one tenant route  Fastest to ship. Use dearme.app/[handle]; generate an initial profile JSON; render from DB/cache. Vercel's multi-tenant docs and Platforms Starter Kit are already aimed at one codebase serving custom domains/subdomains.  ￼
Week 4: 100 paid beta  Same Next/Vercel app, but with queue + DB + Redis + revalidation/warm path  Still simplest. Do not introduce per-site deployments. Add GitHub/post/talk ingestion jobs, per-tenant content versions, cache tags/paths, and a domain verification table.
Q2: 10K users + custom domains  Public site renderer on Cloudflare Workers + KV/Durable Objects/R2 + Cloudflare for SaaS; keep Next/Vercel for dashboard/admin if useful  Best economics and custom-domain model. Cloudflare Workers Paid starts at $5/month with included requests and no egress/bandwidth charge; Cloudflare for SaaS is built for vanity customer domains and exposes custom-hostname APIs.  ￼

The architecture I would actually build:

Signal sources
  GitHub / YouTube / RSS / posts / manual edits / calendar / booking links
        ↓
Ingestion jobs + evidence extraction
        ↓
Profile evidence DB + tenant content JSON
        ↓
AI writer/classifier pipeline
        ↓
Published tenant version: profile_v123
        ↓
Edge renderer:
  dearme.app/peter
  peter.dearme.app
  peterc.com
        ↓
Cache purge or versioned cache key

Every signal change should update a tenant content version and make the changed page visible in <30s through cache invalidation + a warm request, not a deploy.

⸻

1. Stack options for static-with-realtime personal sites

1. Next.js + Vercel

Best for: Day 1 and first 100 users.

Vercel is the best MVP path because it has first-class Next.js support, a documented multi-tenant/platform pattern, a Domains API, wildcard domain support, and ISR/on-demand revalidation tooling. Vercel's Platforms Starter Kit is explicitly built around custom subdomains per tenant and Redis-backed tenant data.  ￼

The main caveat: ISR is not automatically real-time. Next.js App Router revalidatePath invalidates cache entries, but regeneration happens on the next request; Pages Router res.revalidate() can eagerly revalidate a page. For DearMe's <30s requirement, use explicit invalidation plus a post-update warm GET, or serve critical sections dynamically from cache/DB.  ￼

How I'd use it:

/app/[handle]/page.tsx
/app/now/[handle]/page.tsx
/app/api/signals/github/route.ts
/app/api/revalidate/route.ts
/app/api/domains/route.ts

Do not create a Vercel project per user. Use one Vercel project. Map domains/subdomains to tenants.

Cost profile: Vercel Pro starts at $20/month, with credit/usage-based billing beyond included plan resources. It is fine for MVP/beta, but at 10K–100K high-traffic sites the uncertainty is bandwidth, function/edge usage, image optimization, and domain-management overhead.  ￼

Verdict: Ship with it. Do not necessarily stay on it for the public renderer at 10K custom-domain users.

⸻

2. Astro + Cloudflare Pages / Workers

Best for: Beautiful personal-site templates, low-JS pages, Cloudflare-native public renderer.

Astro is strong for personal sites because most DearMe pages are content-first and can ship near-zero client JavaScript. Astro also supports dynamic "server islands," letting you keep most of the page static while rendering dynamic/personalized sections on demand. Astro's current Cloudflare guidance is increasingly Workers-oriented: the Astro Cloudflare adapter documentation says the adapter no longer supports deployment to Cloudflare Pages and recommends Cloudflare Workers for best compatibility.  ￼

Important distinction:

Option  Fit for DearMe
Astro + Cloudflare Pages static builds  Good for individual static sites, bad if every signal change triggers builds.
Astro + Cloudflare Workers rendering tenant JSON  Strong Q2 candidate.
Astro templates compiled into a Worker renderer  Excellent: low JS, good design system, fast edge rendering.

Cloudflare Pages has generous static hosting, but Pages build limits and custom-domain-per-project limits make "one build per user update" the wrong mental model. Pages Free includes 500 builds/month and 100 custom domains/project; Pro includes 5,000 builds/month and 250 custom domains/project; Business includes 20,000 builds/month and 500 custom domains/project.  ￼

Verdict: Use Astro's component philosophy/templates, but for DearMe scale run the public site as a Cloudflare Worker, not as 10K–100K Pages deployments.

⸻

3. Remix + Fly.io

Best for: A conventional SSR app with full server control.

Remix on Fly can work, but it is not the obvious fit for static-ish personal sites with high custom-domain volume. Fly is excellent for running app servers and Machines, but DearMe's public pages mostly need edge HTML rendering, host-to-tenant lookup, and cheap static delivery. Fly's custom certificate flow uses Let's Encrypt and Fly Certificates APIs, and Let's Encrypt rate limits become an operational consideration at large custom-domain counts.  ￼

Verdict: Viable, but I would not choose it unless you specifically want server ownership, colocated background workers, or non-edge app behavior.

⸻

4. SvelteKit + Vercel

Best for: Lightweight app if your team strongly prefers Svelte.

SvelteKit on Vercel supports ISR, including on-demand revalidation through a bypass token flow, but the multi-tenant/domain ecosystem is less battle-tested than Next.js + Vercel's platform tooling. Vercel's SvelteKit docs also note ISR is appropriate where every visitor sees the same generated content, which is true for public DearMe pages.  ￼

Verdict: Good technically, but not worth choosing over Next.js unless Svelte is your team's default.

⸻

5. Pure static + Cloudflare Workers + KV

Best for: The eventual cheapest/highest-control renderer.

This is probably the best Q2 public-page engine if you are comfortable owning more code. Store each user's published content as JSON in KV/R2/DB, render HTML at the edge, cache by tenant/version, and invalidate on signal updates. Cloudflare Workers Paid includes Workers, Pages Functions, KV, Hyperdrive, and Durable Objects under a $5/month minimum plan; KV paid pricing is usage-based, with storage, read, write, delete, and list pricing.  ￼

Verdict: Best long-term economics. Slightly more engineering than Next/Vercel.

⸻

6. Hybrid: build at signup, deploy to subdomain, update via webhook

Best for: Marketing narrative, not actual scale.

This sounds appealing because users understand "your site was built," but for DearMe it should be a logical build, not a deployment. At signup, generate:

{
  "handle": "peter",
  "bio": "...",
  "sections": ["hero", "working_on", "talks", "case_studies", "now", "contact"],
  "publishedVersion": 1
}

Then the renderer serves that version instantly. Webhooks update the JSON and invalidate/warm the page.

Verdict: Use this product language; avoid real per-site deploys.

⸻

2. Cost and update profile at 1K–100K sites

Assume 10K users, 1,000 pageviews/user/month, and 10M monthly pageviews. The important cost is not "per site"; it is requests, bandwidth, function CPU, image/OG generation, and custom domains.

Provider/model  Per-site cost shape  <30s update fit  Custom-domain fit  Recommendation
Next.js + Vercel  Low fixed start, usage grows with bandwidth/functions/image optimization  Good with on-demand revalidation + warm requests  Strong Domains API and platform pattern  Best MVP/beta
Cloudflare Workers + KV/DO  Very low renderer cost; Workers Paid starts at $5/month with included requests and no bandwidth/egress charge  Excellent: write content version, purge/version cache  Excellent with Cloudflare for SaaS  Best 10K+ public renderer
Cloudflare Pages static builds  Cheap static hosting, but build/domain caps matter  Poor if every signal causes a build  Project custom-domain caps unless using SaaS/custom-hostname model  Use for demos, not core platform
Netlify  Free/paid credit model; Pro starts at $20/month; good static hosting  OK for builds/functions, but not ideal for high-volume tenant domains  Domain aliases exist, but platform-style custom-domain scale is less compelling  Not my DearMe pick
Fly.io  Usage-based Machines, storage, egress  Good SSR, but more ops  Certificates work, but domain/cert ops are not as SaaS-native  Only if you want server control

Cloudflare for SaaS pricing is especially relevant: Cloudflare's plan table says the first 100 custom hostnames are free, then additional custom hostnames are $0.10/month each. If 10K users all bring custom domains, that line item alone is roughly 9,900 × $0.10 = $990/month; if only 20% of 10K users bring domains, it is roughly 1,900 × $0.10 = $190/month.  ￼

Netlify remains a good static hosting/productivity option—its pricing page lists Free, Personal, and Pro tiers, and its docs support multiple domains/domain aliases and external DNS records—but I would not make it the platform backbone for 10K custom-domain personal sites.  ￼

⸻

3. Custom domain UX: where most products fail

The UX you want

For peterc.com, the user should see this flow:

1. Type peterc.com
2. DearMe checks if the domain is already attached
3. DearMe creates a provider-side domain/custom-hostname record
4. DearMe shows exact DNS instructions
5. User adds records at registrar/DNS host
6. DearMe auto-polls DNS/provider status
7. DearMe verifies ownership + SSL readiness
8. DearMe marks Active and redirects old handle if desired

Show states clearly:

Pending DNS
DNS found, ownership TXT missing
Ownership verified, SSL pending
Active
Conflict: domain already attached elsewhere

Vercel model

Vercel supports adding domains to projects through its REST API and has docs for adding/configuring custom domains, checking DNS records, configuring DNS, verifying DNS, and verifying SSL. For a Vercel-based MVP, this is the fastest path to custom domains.  ￼

For DearMe, use Vercel for:

dearme.app/[handle]
*.dearme.app
custom domains during beta

But keep a future migration path to Cloudflare for SaaS if custom domains become core.

Cloudflare for SaaS model

Cloudflare for SaaS is the clean long-term fit: it lets a SaaS provider add customer-owned vanity domains as custom hostnames under the provider's zone, route them to a fallback origin, and manage custom hostnames through API calls.  ￼

For DearMe Q2, the domain flow should look like:

User enters peterc.com
→ create custom hostname in Cloudflare for SaaS
→ show CNAME/TXT/apex instructions
→ poll hostname status
→ SSL active
→ host header maps peterc.com → tenant peter

Cal.com benchmark

Cal.com's documented custom-domain implementation is instructive because it uses Vercel's domain API: register the domain with Vercel, store a pending DNS record, provide DNS records, and verify ownership/DNS. Cal.com itself is also open-source and built around Next.js, TypeScript, PostgreSQL, Prisma, and tRPC.  ￼

Dub benchmark

Dub has one of the better domain UXs to copy: workspace-level domain management, "add domain," DNS record instructions, pending/verified states, and custom domains as part of the core branded-links product. Dub is also a useful scale reference: Vercel has cited Dub as a multi-tenant SaaS with thousands of active domains, and Dub's own stack/job materials point to Next.js, TypeScript, Tailwind, Prisma/MySQL, Redis, QStash/Kafka, and ClickHouse.  ￼

⸻

4. Products/templates to imitate legally

Do not clone visual assets, logos, copy, or exact trade dress. Clone interaction patterns, information architecture, and component grammar.

Product  What to imitate  Stack signal  Auto-from-signals feel  Custom domain UX  Conversion ritual
Bento / bento.me  Mosaic card grid; mixed cards for videos, podcasts, newsletters, photos, products, streams, calendar  Current page is a sunset page; not a reliable stack reference  Mostly curated/integrated content cards, not deeply autonomous  Public evidence suggests Bento did not natively support custom domains; third-party workarounds used Cloudflare Workers  Visitor scans visual cards → clicks content/contact
Read.cv  CV-as-site: profile, work, education, projects, posts, public professional graph  Product was acquired by Perplexity and wound down in 2025  User-edited profile with structured professional objects  No longer a stable product reference  Visitor reads professional narrative → follows/contact
Hello.cv  AI resume/profile builder, .cv identity, clean themes  Current product page positions it as AI profile/resume builder  AI agents/profile content, job/resume workflows  Gives users a personalized .cv domain, not necessarily arbitrary custom domains  Visitor sees profile/CV → career/contact action
Linktree  Mobile-first vertical link list, embeds, commerce/subscribe modules  Public stack not important  User-curated links/embeds, light automation  Treat as weak custom-domain reference  Visitor taps one primary link, subscribe/shop/book
About.me  Full-page hero, short bio, one spotlight CTA, booking/contact  Public stack not important  Mostly user-edited; newer AI Virtual Twin/booking positioning  Pro supports connecting/mapping a custom domain  Visitor → spotlight button / schedule / email capture
Webstudio  Visual builder/admin UX, data bindings, dynamic routing, Cloudflare-backed publishing  Open-source Webflow alternative; Cloudflare-backed; GitHub repo shows TypeScript/Cloudflare/Remix/Webflow topics  External data/API integration, not personal-signal automation  Manual CNAME/TXT-style domain setup  Visitor experience depends on built site
Cal.com personal page  Booking page cards, event types, duration/location, focused CTA  Open-source Next.js app  Calendar/event availability is live data  Docs show Vercel Domains API for custom domains  Visitor → pick event type → book
Dub.co  Domain settings UX, pending/verified DNS, analytics mindset  Next/TypeScript/Tailwind/Prisma/Redis-style stack signal  Link analytics/update state, not personal bio automation  Excellent benchmark for add-domain/DNS UX  Visitor → branded link/action; admin sees attribution
Dapper.me  Do not rely on it  Public page appeared parked/for-sale in my check  N/A  N/A  N/A
Mile.so  Insufficient reliable public evidence from this pass  Not enough evidence  N/A  N/A  N/A

Bento's own current page says Bento is sunsetting and describes the old promise as "all your links content on one beautiful page," with videos, podcasts, newsletters, photos, paid products, streams, and calendar integrations. That component grammar is still highly relevant.  ￼

Read.cv is useful as an archetype, but it is not a current product to depend on: Perplexity acquired it, and Read.cv wound down in 2025.  ￼

About.me is a useful low-complexity model because it combines a free personal page, contact/booking, email signature, and Pro custom-domain support.  ￼

Webstudio is worth studying for builder UX and Cloudflare-backed publishing: its product page emphasizes external content/API integrations, dynamic routing, data bindings, one-click publishing, and Cloudflare-backed hosting.  ￼

⸻

5. DearMe component structure

Use three template families, not one.

Template A: "Founder / builder"

Hero
  Headshot / generated visual
  Name, handle, one-line positioning
  Bio in user's voice
  Primary CTA: book / email / subscribe
Working on
  Current project cards from GitHub/posts
  Recent shipped item
  "Last active" freshness signal
Featured work
  2–4 case studies
  Problem → work → result → links
Writing / posts
  Recent posts with source badges
Talks / podcasts
  YouTube/conference/podcast cards
Now
  This month's focus
  Active repo/post/project
  Upcoming talk or launch
Contact
  Booking link
  Email
  Socials

Template B: "Developer portfolio"

Hero
GitHub-derived open-source/projects section
Now / active repos
Case studies
Writing
Talks
Resume/CV
Contact

Template C: "Creator / expert"

Hero
Featured content cards
Newsletter/subscriber CTA
Talks/podcasts
Products/courses/resources
Now
Contact/booking

The key is that every section needs a source confidence state:

Auto-published
Auto-drafted, needs review
User-edited and locked
Hidden because confidence is low

⸻

6. AI-generated site content

Bio in the user's voice

Best pipeline:

1. Collect voice examples:
   posts, READMEs, tweets/bluesky, essays, talks, GitHub profile, old bio
2. Extract facts separately from style:
   facts = what can be claimed
   voice = how the person sounds
3. Generate a "voice card":
   sentence length, tone, favorite verbs, first/third person,
   jargon level, humor level, things to avoid
4. Generate 3 bios:
   concise, professional, casual
5. Bind every factual claim to evidence:
   no "speaker," "founder," "expert," "maintainer" unless evidence supports it
6. Let user edit:
   save edits as preferred voice examples

Prompt shape:

You are writing a first-person bio for {name}.
Use only facts in <facts>.
Match the style in <voice_examples>.
Do not invent employers, talks, awards, funding, titles, or metrics.
Return:
- short_bio: 280 chars
- hero_bio: 80-120 words
- meta_description: 150 chars
- claims_used: [{claim, evidence_id}]
- uncertain_claims: []

Anthropic's prompting guidance emphasizes clear instructions, examples, and structured prompts; Claude Opus/Sonnet-class models are strong for long-context voice analysis, while cheaper models can classify and extract at scale.  ￼

Extract talks, podcasts, and posts

Use an evidence-first extractor:

{
  "type": "talk",
  "title": "Building AI agents that actually ship",
  "source": "youtube",
  "url": "...",
  "date": "2025-11-02",
  "thumbnail": "...",
  "confidence": 0.91,
  "evidence": "YouTube channel match + speaker name + title"
}

Rules:

High confidence:
  same name + owned channel/profile + matching bio/link
Medium confidence:
  name match + topic match + external conference page
Low confidence:
  name match only

Only high-confidence talks should auto-publish. Medium-confidence items should appear in a review queue.

"What I'm working on"

For GitHub, don't show raw commits. Summarize by project and direction:

Bad:
  "Committed fix.ts, index.ts, README.md"
Good:
  "Recently working on DearMe's custom-domain verification flow and profile generator."

Use commit messages, PR titles, repo README, changed paths, and release notes. Exclude private-sensitive signals unless the user explicitly connects private repos and opts in.

"Now" page

The "Now" page should be an auto-updated monthly snapshot:

Currently focused on:
  - Project inferred from most active repo/post cluster
  - One recent shipped thing
  - One upcoming talk/post/launch if known
  - Availability/contact preference

Use careful language:

"Lately I seem to be working on…"

until the user confirms and locks a phrasing.

⸻

7. Image generation and OG images in 2026

Hero images

For DearMe, I would not put AI hero-image generation on the critical signup path. Generate a deterministic, clean hero/OG immediately, then optionally upgrade with an AI illustration.

Recommended stack:

Use case  Best choice
Clean web hero illustrations, vector-ish brand assets  Recraft API
Text-heavy social cards, posters, logo-like graphics  Ideogram
General image generation/editing in product  OpenAI GPT Image 2
Video/animated hero  Avoid for MVP

Recraft is especially relevant because its API and product materials emphasize production-ready images, vectors, style control, brand workflows, SVG/vector generation, and background/image utilities.  ￼

Ideogram is a good option where legible text and logo/poster-style composition matter. Its materials emphasize text rendering, logos/posters, style control, and production-ready output.  ￼

OpenAI's current image API docs identify GPT Image models, including gpt-image-2, with production-oriented image generation/editing, long prompts, and configurable background behavior.  ￼

Do not build DearMe around Sora for 2026 web hero generation. OpenAI's Sora web/app has been discontinued, and Sora API deprecation/shutdown dates are documented.  ￼

OG image generation

Use deterministic OG first:

/og/[handle]?v=123

Render:

headshot or generated avatar
name
one-line bio
current project badge
DearMe watermark

Implementation choices:

Vercel MVP:
  @vercel/og / Satori route
Cloudflare Q2:
  Worker-compatible Satori/React-to-SVG or pre-rendered SVG/PNG in R2
Storage:
  R2/S3 object per tenant version

Cache-bust with ogVersion, not random query strings.

⸻

8. Open-source kits to crib from

Sorted by a mix of public star signal and recency/activity. Stars move daily, so treat these as directional.

Rank  Repo  Why it matters for DearMe
1  cobiwave/simplefolio  Very popular minimal developer portfolio; clean hero/about/projects/contact structure; strong one-page reference. Public metrics sources show very high star/fork counts and GitHub topic pages show 2026 activity.  ￼
2  academicpages/academicpages.github.io  Best reference for talks/publications/portfolio/CV sections; not modern visually, but structurally excellent for academics/experts.  ￼
3  saadpasta/developerFolio  Covers almost every DearMe section: summary, skills, education, work, OSS projects, big projects, achievements, blogs, talks, podcast, contact, and GitHub profile. Not actively maintained, but structurally useful.  ￼
4  RyanFitzgerald/devportfolio  Modern Astro + Tailwind portfolio with Hero/About/Projects/Experience/Education components and simple config. Good Q2 template reference.  ￼
5  ashutosh1919/masterPortfolio  Complete software developer portfolio with summary/about, skills, GitHub-connected OSS projects, experience, certifications, blogs, education, and contact.  ￼
6  rammcodes/Dopefolio  Multi-page, fast, SEO-oriented portfolio with project/case-study emphasis; good for case-study cards.  ￼
7  arifszn/gitprofile  Most relevant to "auto from signals": dynamic portfolio generated from a GitHub username, with GitHub avatar/bio/projects and repo sorting.  ￼
8  tbakerx/react-resume-template  Resume/CV-focused Next.js + TypeScript + Tailwind template; useful for structured professional pages.  ￼
9  chetanverma16/react-portfolio-template  Next.js + Tailwind portfolio with sections for work, services, about, contact, and markdown blog.  ￼
10  manuelernestog/astrofy  Astro + Tailwind + DaisyUI personal portfolio with blog, CV, project section, store, RSS, cards, sidebar, and timeline components.  ￼

Two honorable mentions:

varadbhogayata/varadbhogayata.github.io
  Simple static HTML/CSS developer portfolio, easy to adapt.
Dorota1997/react-frontend-dev-portfolio
  React frontend portfolio with timeline/slider-oriented UI patterns, but less recent.

⸻

9. The product I would ship this week

Day 1 MVP

Use:

Next.js App Router
Vercel
Postgres or Supabase
Redis/Upstash optional
GitHub OAuth
One route: /[handle]
One template
Manual contact fields
No custom domains yet

Build:

1. Sign in with GitHub
2. Pick handle
3. Pull:
   - GitHub profile
   - pinned/popular repos
   - recent public commits/PRs
   - README summaries
4. Ask user for:
   - email
   - booking link
   - 3 writing samples or links
5. Generate:
   - hero bio
   - working-on section
   - project cards
   - contact block
6. Publish:
   dearme.app/peter

Use ISR/dynamic rendering pragmatically:

MVP:
  render dynamically with short cache
  or static-ish with revalidatePath + warm request
Do not:
  deploy a new project
  create a new repo
  run a full site build per update

Week 4 beta

Add:

Queues:
  signal ingestion
  AI extraction
  profile regeneration
  screenshot/OG generation
Data:
  tenants
  sources
  signals
  evidence
  generated_sections
  published_versions
  domains
Admin UX:
  accept/reject generated claims
  lock bio
  hide section
  edit contact
  regenerate with tone slider

Start custom domains on Vercel only if you need them for beta.

Q2 scale

Move public rendering to:

Cloudflare Workers
Cloudflare KV or Durable Objects for tenant cache
R2 for generated images/assets
Cloudflare for SaaS for custom domains
Neon/Supabase/Postgres as source of truth

Keep:

Next.js dashboard/admin
Vercel deployment for app UI
Cloudflare public renderer for DearMe sites

That split gives you the best of both:

Vercel:
  dashboard, onboarding, AI review UI, internal tools
Cloudflare:
  public personal sites, custom domains, cheap global rendering

⸻

Final call

Ship the MVP on Next.js + Vercel. It is the fastest way to get dearme.app/peter live this week.

Do not build per-user deployments. Build one multi-tenant renderer.

For 10K users with custom domains, move the public site layer to Cloudflare Workers + Cloudflare for SaaS. That is the stack most aligned with DearMe's actual constraints: cheap edge rendering, fast cache invalidation, lots of hostnames, and no build-per-signal bottleneck.

---

## Run 3

Executive recommendation

Do not build or deploy one static site per user. Build one multi-tenant DearMe renderer that serves dearme.app/<handle>, dearme.app/@<handle>, and later peterc.com from the same codebase. A signup should create tenant data, generated copy, section JSON, and OG assets; it should not create a new deployment. That is the only approach that plausibly supports 1,000–100,000 sites with <30s signal updates.

My ranked call:

Stage  Recommendation  Why
Day 1: 1 user / MVP this week  Next.js App Router + Vercel + Vercel Platforms Starter Kit  Fastest path to dearme.app/peter, dynamic routing, ISR/on-demand revalidation, built-in Vercel domain primitives, lots of examples. Vercel explicitly frames its platform model as one codebase/deployment serving many tenant domains/subdomains with automatic SSL and domain APIs.  ￼
Week 4: 100 paid beta  Stay on Next.js + Vercel Pro; add queues, DB, revalidation tags, domain API, and source-confidence workflows  You need product velocity more than infrastructure optimization. Vercel's ISR can update cached pages without full redeploys, and Vercel says cache purges propagate globally very quickly; use revalidateTag/revalidatePath plus a synthetic warm request for the "visible in <30s" requirement.  ￼
Q2: 10K users + serious custom domains  Hybrid: Next.js/Vercel for app/admin/generation; Cloudflare Workers + Cloudflare for SaaS for the public renderer if cost/domain scale becomes material  Cloudflare's custom-hostname model is very strong for SaaS domains, and Workers pricing is attractive at scale. But do not use KV alone as the source of truth for <30s global updates because KV is eventually consistent and may show old values for up to 60s or more in some locations.  ￼

The core product architecture should be:

signal webhooks → queue → enrichment/extraction → tenant content graph → renderer cache invalidation → synthetic warm request → site live

Not:

signal webhooks → rebuild whole static site → deploy

That second model will fail on latency, cost, and operational load.

⸻

The architecture DearMe should actually ship

Tenant model

Use one canonical tenant record:

Tenant {
  id
  handle               // "peter"
  primaryPath          // "/peter"
  primaryDomain        // null or "peterc.com"
  domains[]            // status: pending_dns | verified | active | error
  profileFacts         // normalized user facts
  voiceProfile         // tone/style profile, not factual source
  sections             // hero, working_on, talks, case_studies, now, contact
  signalSources        // GitHub, YouTube, RSS, LinkedIn/manual, etc.
  contentVersion       // monotonically increasing
  lastPublishedAt
}

Then the public page is just:

GET dearme.app/peter
GET dearme.app/peter/now
GET peterc.com
GET peterc.com/now

All resolve to the same tenant and versioned content graph.

Rendering model

For Day 1 and Week 4, I would use:

* Next.js App Router
* app/[handle]/page.tsx
* app/[handle]/now/page.tsx
* app/api/revalidate/route.ts
* generateMetadata() for SEO
* dynamic OG images via ImageResponse or a pre-generated asset
* DB: Neon, Supabase, PlanetScale, or Turso
* cache: Vercel Data Cache / ISR + optional Upstash Redis
* jobs: Inngest, Trigger.dev, QStash, or a simple Vercel cron + queue at first

Use ISR for public pages, not per-user deployments. Vercel's ISR stores generated responses in CDN/durable cache and lets you update pages without a full redeploy. Vercel also documents on-demand revalidation and globally consistent purging behavior, which is exactly the shape DearMe needs for "update visible in <30s."  ￼

Important nuance: Next.js route-handler revalidation marks paths for regeneration on the next visit, so for strict "visible in <30s," DearMe should call revalidation and then immediately request the relevant public URLs to warm them.  ￼

⸻

Stack comparison for 1,000–100,000 personal sites

1. Next.js + Vercel

Best use case: DearMe MVP through paid beta; possibly all the way to 10K+ if Vercel economics work.

Model: One multi-tenant app. Use path routing for dearme.app/peter; use host routing for peterc.com.

Update latency: Strong. Use revalidateTag, revalidatePath, or Vercel cache purge. Vercel says ISR cache purges are globally consistent and update across regions quickly; Next's docs distinguish path revalidation from tag revalidation, so tag content by tenant and section: tenant:peter, tenant:peter:now, tenant:peter:talks.  ￼

Deploy-time behavior: Signal changes should not deploy. They should update the DB/content graph and revalidate cached routes. Full deploys only happen when DearMe code changes.

Custom domains: Very good. Vercel for Platforms is explicitly built for multi-tenant apps with custom subdomains, custom domains, automatic SSL, routing middleware, and domain APIs/SDKs.  ￼

Cost shape: Vercel Pro is currently listed at $20/month with usage-based resources beyond included credits. Vercel bills resources such as function duration, data transfer, image optimization, ISR reads/writes, observability, blob, and other usage dimensions.  ￼

Risk: At 10K–100K tenants, cost depends heavily on pageviews, image optimization, ISR reads/writes, and custom-domain support terms. You need usage simulation before committing to 100K on Vercel.

Verdict: Best Day 1 and Week 4 choice.

⸻

2. Astro + Cloudflare Pages / Workers

Best use case: Very fast content sites, low-cost scale, Cloudflare-native custom domains.

Model options:

* Astro static export on Cloudflare Pages.
* Astro SSR/edge via Cloudflare adapter.
* Cloudflare Worker as DearMe's public multi-tenant renderer.

Update latency:
Astro + Pages builds are not the right primitive for every GitHub commit or post. Cloudflare Pages Free/Pro/Business plans list finite monthly build counts and concurrent build limits, while static asset requests are generous. Pages can be excellent for code deploys, not for per-signal publishing.  ￼

For <30s updates, use Workers and data-driven rendering, not Pages rebuilds.

Custom domains: Cloudflare for SaaS is strong. The provider sets up a fallback origin/CNAME target, creates custom hostnames through the API, and waits until both hostname status and SSL status are active.  ￼

Cost shape: Workers Standard is listed with a low monthly minimum, included requests/CPU, and no bandwidth/egress charge; static asset requests are free/unlimited. Cloudflare for SaaS includes 100 custom hostnames, allows up to 50,000 hostnames on non-Enterprise plans, and charges for additional hostnames.  ￼

Critical caveat: Do not use Workers KV as the only source of truth for strict <30s updates. Cloudflare documents KV as eventually consistent; updates are usually immediate in the same location but may take up to 60 seconds or more elsewhere.  ￼

Better Cloudflare data model: Use D1, Durable Objects, R2, or a centralized DB/API as source of truth; use KV only for non-critical cached snapshots.

Verdict: Excellent Q2 public-renderer candidate.

⸻

3. Remix + Fly.io

Best use case: Maximum server control, long-running processes, traditional SSR, custom background behavior.

Model: One Remix app on Fly Machines; route by path and host. Use your own cache, DB, and certificate/domain logic.

Update latency: Good if you render dynamically or manage cache invalidation yourself. But you will be doing more infrastructure work than with Vercel or Cloudflare.

Custom domains: Fly supports custom certificates, DNS instructions, apex/subdomain handling, and ACME/TXT flows.  ￼

Cost shape: Fly pricing is VM/resource-based. For example, shared CPU machines are listed with monthly prices by memory size, plus outbound bandwidth charges by region.  ￼

Risk: Custom-domain automation, edge caching, global latency, and multi-tenant SSL are more manual.

Verdict: Good engineering platform, but not the fastest DearMe path.

⸻

4. SvelteKit + Vercel

Best use case: Similar to Next/Vercel if you strongly prefer Svelte.

Model: One SvelteKit app on Vercel with ISR.

Update latency: Vercel supports SvelteKit ISR with expiration and bypass-token revalidation. Vercel's SvelteKit docs describe ISR as creating/updating content without redeploying, caching pages, and using Vercel's CDN.  ￼

Custom domains: Same Vercel platform/domain primitives as Next.

Risk: Less DearMe-relevant ecosystem surface than Next: fewer multi-tenant SaaS starter kits, fewer examples around ImageResponse, OG generation, and Vercel Platforms. Also, SvelteKit-on-Vercel has had caching/security gotchas; recent cache-deception issues were fixed, but it reinforces that public caching rules need care.  ￼

Verdict: Technically viable, but I would not choose it unless your team is already Svelte-heavy.

⸻

5. Pure static + Cloudflare Workers + KV

Best use case: Extremely low-cost public pages where eventual consistency is acceptable.

Model: Precompute site.json per tenant, store it, and have a Worker render HTML or serve static shells.

Update latency: Potentially excellent if you avoid KV consistency traps. Poor if you depend on KV global propagation alone. Cloudflare's own KV docs describe eventual consistency and stale reads under cache TTL.  ￼

Cost shape: Very attractive. Workers pricing includes high request volume for low cost, and static asset requests are free/unlimited.  ￼

Custom domains: Excellent with Cloudflare for SaaS.

Risk: You will build more framework/platform machinery yourself: routing, metadata, image generation, previews, editor, auth, source ingestion, content versioning, cache purge.

Verdict: Great Q2 optimization, not Day 1.

⸻

6. Hybrid: build at signup, deploy to subdomain, push updates via webhook

Best use case: Almost none for DearMe if "every signal visible in <30s" is real.

The right hybrid is:

build content at signup
not a deployment
store versioned tenant state
render through one app
invalidate/warm cache on signal updates

The wrong hybrid is:

create one deployment per user
redeploy on each commit/post/talk update

Cloudflare Pages, Netlify, and similar build products are optimized for code/site deploys, not thousands of per-user content deploys per day. Cloudflare Pages has explicit build quotas and per-project custom-domain limits; Netlify's current pricing uses credits where production deploys consume credits.  ￼

⸻

Per-site cost profile: practical reading

For 1,000 users, the cheapest scalable model is not "cost per static site." It is:

platform base cost
+ pageview/request cost
+ image/OG generation cost
+ AI generation cost
+ custom-domain hostname cost
+ database/storage/queue cost

Vercel

Vercel Pro is listed at $20/month and then usage-based resources. ISR has durable-cache read/write units; Vercel notes no fixed ISR storage limit, but durable reads/writes are billable.  ￼

For DearMe, Vercel cost risk is not "100,000 tenants." It is:

* traffic per tenant,
* ISR read/write volume,
* image optimization,
* function duration,
* observability/logging,
* AI/OG asset generation,
* custom-domain support tier.

Cloudflare

Cloudflare Workers Standard pricing is attractive for a high-read public renderer. Cloudflare also says static asset requests are free/unlimited, and its paid Workers plan includes a large request allocation.  ￼

Cloudflare for SaaS currently shows:

* 100 custom hostnames included,
* up to 50,000 hostnames on Free/Pro/Business,
* additional hostname pricing,
* Enterprise/custom terms beyond that.  ￼

Rule-of-thumb custom-domain math from the public hostname pricing:

Custom domains  Approximate Cloudflare for SaaS hostname charge
100  included
1,000  about 900 paid hostnames
10,000  about 9,900 paid hostnames
100,000  requires Enterprise/custom path because non-Enterprise max is 50,000

Netlify

Netlify can work for a normal personal-site SaaS, but I would not use production deploys as DearMe's update primitive. Netlify's current credit model lists production deploys, compute, bandwidth, and web requests as credit meters; Pro includes a fixed credit pool and extra credits are sold separately.  ￼

If every signal update became a production deploy, the economics get ugly quickly.

Fly.io

Fly is predictable if you think in VMs and bandwidth. But you are operating more of the multi-tenant layer yourself: caching, certs, DNS verification UX, and global latency. Fly documents custom cert/domain support, but it is not as turnkey as Vercel Platforms or Cloudflare for SaaS.  ￼

⸻

Custom domain UX: the part to obsess over

Your ideal UX:

1. User types peterc.com
2. DearMe detects apex vs subdomain
3. DearMe creates domain record with provider
4. DearMe shows exact DNS rows
5. DearMe verifies DNS automatically
6. DearMe waits for SSL active
7. DearMe flips status to live
8. DearMe emails user: peterc.com is live

Vercel-style flow

Vercel custom-domain setup supports apex and subdomain records, verification, and automatic status updates. Its docs describe TXT verification when a domain is owned elsewhere, A records for apex domains, CNAME for subdomains, and status updates once configured and verified.  ￼

For DearMe on Vercel:

POST /api/domains
  input: peterc.com
  action:
    - call Vercel Domains API / SDK
    - store status: pending_dns
    - return required DNS records

Then poll:

GET /api/domains/peterc.com/status
  - configured?
  - verified?
  - SSL ready?
  - assigned tenant?

Vercel's Platforms Starter Kit already contains multi-tenant routing, custom subdomains, tenant content, and Redis-backed examples; it is the obvious starting point.  ￼

Cloudflare for SaaS flow

Cloudflare's flow is:

1. DearMe creates fallback origin / CNAME target
2. DearMe creates Custom Hostname through Cloudflare API
3. User points CNAME to DearMe's target
4. Cloudflare validates hostname and certificate
5. DearMe checks hostname active + SSL active

Cloudflare's docs describe creating a custom hostname and checking that both hostname status and SSL status are active before considering it live.  ￼

For lower-downtime onboarding, Cloudflare supports TXT pre-validation and HTTP validation patterns. TXT validation lets the customer prove ownership before switching traffic; HTTP validation can happen after pointing the domain, but may involve a short downtime window.  ￼

Important apex-domain caveat: Cloudflare notes that apex proxying/BYOIP is an Enterprise add-on for cases where a customer's DNS provider cannot CNAME the apex.  ￼

Cal.com-style flow

Cal.com's own custom-domain docs are a very relevant pattern. Their flow is:

user enters domain
Cal registers it with Vercel
Cal stores pending status
Cal shows DNS records
Cal verifies ownership
booking pages become available at the custom domain

Cal's docs explicitly state that domain provisioning uses Vercel's domain API and that the user is shown A/CNAME instructions depending on apex vs subdomain.  ￼

Dub.co-style flow

Dub is a strong model for simple custom-domain onboarding. Dub's docs show:

* add domain from the workspace,
* receive required DNS record,
* apex uses an A record,
* subdomain uses a CNAME,
* plan limits determine number of custom domains.  ￼

Dub is also relevant because it is open source, built on Next.js/Vercel, and Vercel says Dub had thousands of active custom domains on its platform.  ￼

DearMe domain UX recommendations

Implement these details early:

1. Prefer www.peterc.com first, then offer apex redirect. Apex domains are where DNS providers differ most.
2. Show DNS rows as copyable table data, not prose.
3. Detect common mistakes automatically: wrong CNAME target, stale A record, multiple conflicting A records, CAA blocking issuance, Cloudflare proxy mode, missing TXT verification.
4. Separate "DNS detected" from "SSL active." A domain is not live until cert status is active.
5. Offer automatic DNS setup later. Webstudio uses Entri for automatic DNS configuration, which is a good reference pattern.  ￼
6. Never make the user guess whether to use A or CNAME. Ask "root domain or subdomain?" and generate exact instructions.
7. Keep the DearMe path live forever. Even after peterc.com is active, dearme.app/peter should remain the canonical fallback.

⸻

Template and product references to imitate legally

Use the patterns, not the protected expression. Do not copy exact visual trade dress, icons, copy, brand marks, or proprietary code.

Bento / bento.me

Status: Bento was acquired by Linktree and later shut down; external coverage says Bento pages stopped operating in February 2026.  ￼

Component structure to imitate:

* hero card,
* variable-size grid cards,
* image/link/video/social blocks,
* playful bento layout,
* compact "everything about me" page,
* strong visual hierarchy without a full website feeling.

What made it work: Bento felt like a personal dashboard rather than a link list. Its card layout let visual people show personality quickly.

Auto-from-signals: Mostly manual. Bento was not a deep "signals" product.

Custom domain UX: Weak. External guides and reviews noted lack of native custom-domain support.  ￼

DearMe takeaway: Clone the bento card grammar, not the product. DearMe's differentiator should be that cards are auto-populated from GitHub, posts, videos, talks, and work signals.

⸻

Read.cv

Status: Read.cv was acquired by Perplexity and wound down, with user export available until May 2025.  ￼

Component structure to imitate:

* editorial profile,
* resume/CV timeline,
* projects,
* writing/posts,
* social proof,
* team/company affiliations,
* quiet typography,
* lots of whitespace.

Stack signals: A Vercel customer story says Read.cv used Next.js, Vercel Edge Functions, wildcard domains, automatic SSL, and a multi-tenant domain model.  ￼

Auto-from-signals: Read.cv was more profile/CV-driven than signal-driven. Its key idea was "profile becomes website," not "work graph becomes website."

Custom domain UX: Strong reference. Read.cv considered per-domain deploys unsustainable and moved toward Vercel's wildcard/custom-domain platform model.  ￼

DearMe takeaway: Clone the CV-as-personal-site structure and the quiet editorial style. Add DearMe's auto-updating "Now" and "Working on" sections.

⸻

Linktree

Component structure:

* avatar/name/bio,
* vertical link stack,
* monetization links,
* social icons,
* analytics,
* commerce/subscribe/click CTAs.

Linktree says it has 70M+ users, emphasizes link-in-bio setup, analytics, monetization, and recommends a small number of links for conversion.  ￼

Stack signals: Not relevant as a stack reference.

Auto-from-signals: Mostly user-edited and integration-assisted, not a true work-signal site.

Custom domain UX: Weak for DearMe's goals. Linktree's help page says custom domains are not currently supported as a replacement for the linktr.ee URL.  ￼

Conversion ritual: Visitor chooses one link, buys, follows, subscribes, or clicks a booking/contact destination.

DearMe takeaway: Linktree is the floor. DearMe should beat it by making "what I'm doing now" and "why you should contact me" obvious.

⸻

About.me

Component structure:

* one-page personal profile,
* hero identity,
* lead capture,
* appointment scheduling,
* AI "Twin" chat/persona.

About.me now heavily emphasizes an "AI Twin" that speaks in the user's tone, answers visitors, and captures leads.  ￼

Auto-from-signals: AI persona/lead handling, not necessarily GitHub/post/talk ingestion.

Custom domain UX: About.me Pro includes connecting/mapping a custom domain.  ￼

Conversion ritual: Visitor chats, leaves a lead, or books.

DearMe takeaway: Strong reference for "the site talks like me." DearMe should combine that with verifiable work signals.

⸻

Cal.com personal/booking pages

Component structure:

* profile header,
* event-type cards,
* scheduling flow,
* calendar availability,
* confirmation.

Cal.com positions itself as scheduling software for individuals, businesses, and platforms.  ￼

Stack/custom domains: Cal's custom-domain flow uses Vercel's domain API and shows DNS instructions to the user.  ￼

Conversion ritual: Visitor books a meeting. Very high-intent, low ambiguity.

DearMe takeaway: The DearMe contact block should feel like a Cal page embedded into a personal site: "book me," "email me," "subscribe," or "follow my work."

⸻

Dub.co

Component structure:

* link/domain management,
* custom domains,
* analytics,
* conversion tracking,
* attribution.

Dub is open source and describes itself as a link attribution platform for short links, conversion tracking, and affiliate programs.  ￼

Stack signals: Vercel's Dub story says Dub uses Next.js, Vercel Preview Deployments, Domains, and Web Analytics, with thousands of active domains.  ￼

Auto-from-signals: Not a personal-site signal product; more analytics/links.

Custom domain UX: Excellent reference. Dub shows exact DNS records for apex/subdomain and has clear custom-domain limits by plan.  ￼

Conversion ritual: Visitor clicks tracked links; owner measures conversion.

DearMe takeaway: Use Dub's domain and analytics UX as the model for DearMe's custom-domain and CTA analytics layer.

⸻

Webstudio

Component structure:

* visual website builder,
* sections/components,
* asset optimization,
* Cloudflare deployment,
* custom-domain publishing.

Webstudio describes itself as an open-source website builder and says Cloud projects deploy to Cloudflare Workers.  ￼

Custom domain UX: Webstudio's docs show CNAME/TXT records, Entri-based automatic DNS configuration, verification, and publishing.  ￼

Auto-from-signals: Not the core product.

Conversion ritual: Publish a polished site.

DearMe takeaway: Use Webstudio as a reference for domain onboarding and publish-state UX, not as the model for DearMe's automation.

⸻

Dapper.me and Mile.so

I would not rely on these as core 2026 references. In this check, dapper.me resolved to a domain-for-sale page, and mile.so was not reliably reachable.  ￼

⸻

The DearMe component structure I would build

1. Hero

Purpose: "Who is this person, in their voice, and why should I care?"

Components:

* name,
* handle,
* headshot/avatar,
* one-sentence identity,
* 80–140 word voice bio,
* primary CTA,
* secondary CTA,
* social proof chips,
* "last updated" marker.

Example structure:

Peter C.
Builds developer tools and writes about applied AI.
I'm currently working on DearMe, a personal site that keeps itself updated from the work you're already doing. I like products that feel obvious in hindsight: fast setup, quiet automation, and fewer blank text boxes.
[Book time] [Email] [Follow work]

2. "What I'm working on"

Purpose: convert raw work signals into 2–4 high-confidence current projects.

Card fields:

* project name,
* one-line human summary,
* evidence: commits, PRs, releases, posts,
* last signal date,
* role,
* public links,
* confidence score,
* "why this matters" line.

Do not show raw commit spam. Summarize.

3. Talks / podcasts / appearances

Card fields:

* title,
* venue/channel,
* date,
* video/audio embed,
* transcript summary,
* topics,
* "best quote" or key idea,
* source confidence.

Auto-discovery should be conservative. Talks are reputation-sensitive; false positives are bad.

4. Case studies / portfolio

Case study shape:

Problem
Role
What I built
Constraints
Impact
Artifacts
Links

This section should be mostly user-approved. AI can draft; the user should confirm.

5. Now page

The "Now" page should not be a blog. It should be a living digest.

Sections:

* currently building,
* recently shipped,
* currently writing/thinking about,
* active repos/projects,
* recent public appearances,
* availability/contact note.

Use a rolling 14–30 day window. Add "generated from public signals + user edits."

6. Contact

The contact area should have one dominant action:

* book,
* email,
* subscribe,
* hire,
* collaborate.

Do not give visitors seven equal choices. Linktree recommends limiting the number of links for conversion; DearMe should go further and generate the best CTA hierarchy per user.  ￼

⸻

AI-generated site content

Bio in the user's voice

The safest high-quality approach is two-pass generation:

Pass 1: extract facts

Create structured facts from sources:

{
  "current_role": "...",
  "projects": [],
  "topics": [],
  "public_links": [],
  "talks": [],
  "claims": [
    {
      "text": "Built X",
      "source_url": "...",
      "confidence": 0.87
    }
  ]
}

Pass 2: extract voice

Use writing samples, not facts:

* tweets/posts,
* blog intros,
* README prose,
* talk transcripts,
* About page,
* emails only if the user explicitly provides them.

Create:

{
  "sentence_length": "short/medium",
  "tone": ["direct", "wry", "technical"],
  "preferred_phrases": [],
  "avoid": ["hype", "third-person bio"],
  "person": "first-person",
  "energy": "calm"
}

Pass 3: generate the bio

Prompt rule:

Write in the user's voice.
Use only the provided facts.
Do not invent employers, titles, achievements, metrics, awards, or claims.
Prefer concrete work over adjectives.
Return 3 versions:
- concise
- warmer
- more professional

DearMe should store source-linked claims separately from style. The voice model should never be allowed to invent facts.

Extracting talks, podcasts, and posts

Use a source-confidence pipeline:

YouTube search / channel match
conference websites
podcast RSS
personal site RSS
GitHub profile links
LinkedIn/manual input
user-confirmed imports

Each candidate appearance should have:

{
  "type": "talk | podcast | interview | panel | post",
  "title": "",
  "source": "",
  "url": "",
  "date": "",
  "matched_name": "",
  "matched_handle": "",
  "confidence": 0.0,
  "needs_user_confirmation": true
}

Publish automatically only above a high confidence threshold. Everything else goes into "Suggested appearances."

GitHub and work-signal summarization

A good "working on" section is not a list of commits. Use signals like:

* repo activity,
* PR titles,
* release notes,
* issue labels,
* commit clusters,
* README changes,
* stars/watchers only as weak signals,
* blog posts mentioning the repo,
* package releases.

Summarize into human work themes:

"Improving onboarding"
"Shipping custom domain support"
"Refactoring billing"
"Writing about AI agents"

Not:

"fix: auth"
"update package-lock"
"wip"

Hero and OG image generation

For DearMe, I would separate site visuals from OG images.

Hero visuals

Use AI images sparingly. Personal-brand sites age better when the hero uses:

* headshot,
* clean typography,
* subtle generated illustration,
* project screenshots,
* bento cards.

For clean web hero illustrations in 2026, I would rank:

1. Recraft for vector-like brand illustrations, icons, and consistent design systems. Recraft's API supports raster/vector generation, editing, background removal, inpainting/outpainting, batch jobs, and production-oriented image/vector workflows.  ￼
2. Ideogram when the image needs legible text or typographic poster-like output. Ideogram 3.0 is positioned around photorealism, legible text, and precise style control.  ￼
3. FLUX.2 for high-quality photorealistic or reference-driven imagery, especially if you want open-weight/self-hosting options. Black Forest Labs describes FLUX.2 Max as top-tier quality and FLUX.2 Klein as sub-second generation/editing for production visuals.  ￼
4. OpenAI GPT Image models for integrated prompt-following/editing workflows. OpenAI's Image API supports generation and editing with GPT Image models, including current GPT Image model variants and output controls.  ￼

I would not use Sora for static hero art. Current OpenAI docs describe Sora as a video/audio API, and the Sora 2 API docs also note deprecation/shutdown timing for that API path.  ￼

OG images

Do not call an image model every time a site updates. Generate OG images deterministically.

Best approach:

React/Satori/ImageResponse template
+ user name
+ one-line identity
+ current project chip
+ headshot or generated abstract background
+ DearMe brand mark

Generate:

* default OG,
* "Now" OG,
* project/case-study OG,
* talk OG.

Regenerate only when the relevant section changes.

⸻

Open-source kits to crib from

Ranked by DearMe usefulness, not just stars.

Rank  Repo / kit  Why it matters for DearMe  Notes
1  Vercel Platforms Starter Kit  Best substrate for multi-tenant routing, subdomains, tenant pages, Redis, and custom-domain patterns.  Next.js 15, React 19, Upstash Redis, Tailwind, shadcn/ui.  ￼
2  AstroPaper  Strong personal blog/static-site template with SEO, RSS, dynamic OG, accessibility, and Cloudflare Pages support.  GitHub result showed ~4.6K stars and a Jan 2026 release.  ￼
3  RyanFitzgerald/devportfolio  Minimal developer portfolio reference.  GitHub topic result showed ~4.9K stars and April 2026 activity.  ￼
4  Astrofy  Very close to DearMe's section model: portfolio, blog, CV, projects, RSS.  MIT, Astro + Tailwind.  ￼
5  Tailwind Next.js Starter Blog  Best Next/MDX writing base; useful for posts, SEO, RSS, and content architecture.  Public template widely referenced; use as a writing/MDX pattern, not the whole product.  ￼
6  leerob/site or leerob/next-mdx-blog  Polished Next.js personal-site/blog reference with MDX, Tailwind, analytics, and optional database-backed view counts.  Good reference for modern developer personal site polish.  ￼
7  developerFolio / masterPortfolio  Established developer portfolio patterns: skills, projects, education, contact, GitHub/social links.  Useful as legacy/reference component inventory.  ￼
8  mldangelo/personal-site  Next.js + React + TypeScript + Tailwind personal-site template.  Good starter for simple personal-site structure.  ￼
9  Sanity template-nextjs-personal-website  Useful if DearMe wants a user-editable CMS layer and visual editing.  Next.js + Sanity, real-time collaboration/visual editing.  ￼
10  chronark.com  Minimal developer site with Next.js, Tailwind, Upstash, Contentlayer, Vercel.  GitHub result showed MIT license and ~810 stars.  ￼

Also look at Tailwind Spotlight as a design reference, but it is a commercial Tailwind Plus template, not OSS. Use it only according to its license.  ￼

⸻

Concrete Day 1 implementation

Ship this in the MVP:

/dearme.app/peter
/dearme.app/peter/now
/api/revalidate
/api/github/webhook
/api/og/[handle]

Day 1 stack

* Next.js App Router
* Vercel
* Vercel Platforms Starter Kit
* Postgres or Supabase for tenant/content state
* Upstash Redis optional
* GitHub OAuth or manual GitHub handle input
* Cal.com link or email field
* one generated bio
* one "working on" section
* one manual case-study field
* no custom domains yet, but design the domain table now

Day 1 product behavior

Signup flow:

1. User enters handle, name, GitHub, site/blog, YouTube, booking link, email.
2. DearMe imports obvious public signals.
3. DearMe generates:
   - hero bio
   - current projects
   - Now page
   - OG image
4. User reviews one draft screen.
5. DearMe publishes dearme.app/peter.

Do not make the user configure DNS in the first week unless you need it for your own dogfood.

⸻

Week 4 implementation for 100 paid beta users

Add:

* GitHub App installation,
* YouTube/channel import,
* RSS/blog import,
* manual source approval,
* signal confidence scores,
* revalidation tags per tenant,
* custom-domain onboarding via Vercel API,
* "Suggested updates" inbox,
* analytics for page views and CTA clicks,
* a real editor for bio/case studies/contact.

Week 4 caching strategy

Use tags:

tenant:peter
tenant:peter:hero
tenant:peter:now
tenant:peter:working_on
tenant:peter:talks
tenant:peter:case_studies

On event:

1. Update source graph.
2. Recompute affected section.
3. Increment contentVersion.
4. Call revalidateTag("tenant:peter:now").
5. Call revalidateTag("tenant:peter").
6. GET /peter and /peter/now to warm.
7. Mark published.

This keeps updates visible fast without a deploy.

⸻

Q2 implementation for 10K users with custom domains

At 10K users, decide based on actual numbers:

Stay on Vercel if:

* traffic is moderate,
* most users do not use custom domains,
* Vercel usage costs are acceptable,
* you want one simple platform,
* product iteration still matters more than infra control.

Move public rendering to Cloudflare if:

* custom domains are core,
* traffic is high but pages are simple,
* Vercel usage becomes unpredictable,
* you want Cloudflare for SaaS hostname economics/control,
* you can invest in a dedicated edge-rendering layer.

A good Q2 hybrid:

Admin app: Next.js on Vercel
AI/content jobs: server workers / queues
Public renderer: Cloudflare Worker
Source of truth: Postgres/D1/Durable Objects
Assets: R2
Custom domains: Cloudflare for SaaS
Cache: Worker Cache API + versioned content

Avoid KV-only for fresh content. KV is fine for cached snapshots, but strict <30s global freshness needs a stronger consistency strategy.  ￼

⸻

Final ranked recommendation

1. Ship now: Next.js + Vercel

Use this unless there is a hard constraint you did not mention.

Why: It matches every immediate need: multi-tenant routing, ISR, revalidation, OG images, custom domains, and known SaaS examples. Vercel's platform docs and starter kit are directly aligned with DearMe's shape.  ￼

2. Design for Cloudflare migration from day one

Do not entangle DearMe's content model with Next internals.

Keep this boundary:

content graph in DB
renderer consumes JSON/content API
cache invalidation is adapter-specific
domains table is provider-agnostic

That lets you move public pages to Cloudflare Workers later.

3. Avoid per-user static deployments

This is the main architectural trap. It will feel elegant for one user and break as soon as you have frequent signals, custom domains, and hundreds of people.

4. Copy these product patterns

* Bento's card grid.
* Read.cv's editorial CV structure.
* Cal.com's booking conversion.
* Dub's custom-domain clarity.
* About.me's AI-persona lead capture.
* Webstudio's domain publishing UX.

5. Make the differentiator "verified auto-updating"

The winning DearMe promise is not "AI made me a website." It is:

"This site stays current from the work I'm already doing, and every claim has a source."

That is much more defensible than another link-in-bio or AI portfolio generator.
