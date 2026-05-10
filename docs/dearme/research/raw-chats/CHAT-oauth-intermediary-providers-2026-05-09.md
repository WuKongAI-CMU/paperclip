# CHAT: OAuth verified-intermediary providers (社交/邮箱/日历)

> Source: ChatGPT Pro / GPT-5 / Deep Research
> 我问的是: 调研有没有第三方"verified intermediary"能让 DearMe 不用自己拿 LinkedIn MDP / Gmail CASA / X dev app, 直接通过它们替用户发 X/LinkedIn/Meta/Email/Calendar
> 我想得到的结论: 用谁 / 多少钱 / 多大风险 / 能不能完全跳过自己申请 verification / 用户的账号所有权
> 跑了 3 次 (variance check): 同一 prompt 跑 3 次, 哪些结论 3 次都一致 = 信号强, 只出现 1 次 = 可能幻觉
> Decision input for: DM-172 (post_x), DM-173 (X OAuth), DM-174 (send_email), DM-176 (linkedin_dm), 以及"DearMe 是否自己做 verified app"的架构决策

---

## Run 1

Executive conclusion

As of May 10, 2026, the market has only a few credible "verified intermediary" options for DearMe's social layer. Ayrshare is the cleanest fit I found for "end user OAuths to their app; DearMe calls a REST API; posts go to the user's own social accounts." Its Business plan explicitly supports multiple user profiles, user-side OAuth linking, social posting across LinkedIn/X/Meta/TikTok/YouTube, comments/messaging, and Facebook post boosting; pricing is also transparent enough to model.  ￼

LinkedIn remains the bottleneck. Programmatic member-profile posting requires LinkedIn's w_member_social permission; LinkedIn says most API permissions/programs require explicit approval, and the public Marketing Partner directory confirms partners such as Buffer, Hootsuite, Sprout, and Sprinklr, but it does not expose exact scopes such as w_member_social per vendor.  ￼

For Gmail/Calendar, there is a real verified-intermediary route: Nylas Shared GCP App says it uses a Nylas-owned Google Cloud project that has already passed CASA, letting developers reach production with Google without doing their own Google verification/security assessment. Cronofy is also credible for calendar-only access and says you do not need to set up provider credentials/security reviews.  ￼

For cold outbound, do not treat Gmail avoidance as "use SendGrid and send as user@gmail.com." That is not a real path. Google has been tightening non-OAuth Gmail access; Workspace docs say less-secure password access is gone, OAuth is required for apps, and app passwords are only a limited device/app workaround in 2FA scenarios.  ￼

Risk scale below: 1 = low operating risk, 5 = high risk / likely to break / ToS-sensitive.

⸻

A. Posting-as-a-service providers

Ranked table

Rank  Provider  Coverage actually useful to DearMe  Auth / approval reality  Pricing for ~100 users, 2 posts/day, ~3 platforms  Time-to-launch  Risk  Verdict
1  Ayrshare  X, LinkedIn, Facebook, Instagram, TikTok, YouTube, Threads, Google Business, Reddit, Pinterest, Bluesky; also social comments/messaging and Facebook post boosting.  ￼  End user links accounts through Ayrshare's OAuth social-linking page; DearMe gets a profile key and calls Ayrshare API. Ayrshare says users authenticate on official platform login pages and you do not ask for their credentials.  ￼  ~$1,228/mo for 100 Ayrshare profiles: Business $599 includes 30 profiles, +70 × $8.99. Add +$300/mo Max Pack and +$100/mo Facebook boost if needed: roughly $1.2k–$1.6k/mo.  ￼  This week, after POC  2.5  Primary social API for first 100 users. Main diligence gap: I did not find Ayrshare in the public LinkedIn Marketing Partner directory, so require proof of LinkedIn member-profile posting scope and live test posts.  ￼
2  Publer API  Facebook, Instagram, X, LinkedIn, Pinterest, YouTube, TikTok, Google Business Profile, WordPress, Telegram, Mastodon, Threads, Bluesky. Supports text/images/videos/links/polls/carousels/PDF and analytics.  ￼  API is available to Business/Enterprise customers. User accounts appear to be managed through Publer workspaces/accounts, then DearMe schedules/publishes through API.  ￼  API requires Business/Enterprise. Business starts at $10/mo for 1 social account plus $7 per extra social account, so 300 social accounts ≈ $2,103/mo before team/member costs.  ￼  Days to 1–2 weeks  3  Fallback social API. More expensive than Ayrshare at DearMe's shape, but documented and broad. Need confirm white-label/end-user OAuth terms.
3  Upload-Post  TikTok, Instagram, YouTube, Facebook, LinkedIn, Threads, X; emphasizes short-form/video posting, scheduling, analytics, white-label.  ￼  Claims official APIs/OAuth/no workarounds and verified app status for TikTok/Instagram/Facebook; I did not see the same level of proof for LinkedIn/X in the parsed page.  ￼  Business $350/mo includes 225 profiles; extra profiles $1/mo. If "profile" means one connected social account, 300 profiles ≈ $425/mo. Assumption needs contract confirmation.  ￼  This week to 2 weeks  3.5  Video/social fallback. Attractive pricing; verify LinkedIn/X mechanics and whether a "profile" is per social account or per user bundle.
4  Zernio / Late.so / getlate.dev  Claims X, Instagram, TikTok, WhatsApp, LinkedIn, Facebook, YouTube, Threads, Reddit, Pinterest, Bluesky, Telegram, Snapchat, Google Business, Discord, plus ads APIs.  ￼  Claims OAuth connection, no developer apps needed, and official platform APIs. Page shows partner badges, but I did not find Zernio in the public LinkedIn Marketing Partner directory.  ￼  Pricing says first 2 accounts free, 3–10 at $6/account, 11–100 at $3/account, 101–2,000 at $1/account, with X API costs separate. For 300 connected accounts: about $518/mo + X pass-through.  ￼  This week, but only after deep POC  4  Experimental fallback. Promising, but partner-status claims need independent verification.
5  Outstand  X, LinkedIn, Instagram, TikTok, Facebook, Threads, Bluesky, YouTube, Pinterest, Google Business; posts, scheduling, media, analytics, comments.  ￼  Says "BYO app credentials, or use ours," which makes it ambiguous: not always pure verified-intermediary. Docs expose auth URL, social accounts, posts, comments, media, replies.  ￼  Homepage says $5/mo includes 1,000 posts, then $0.01/post. If each platform fanout counts as a post, 100 users × 2/day × 3 platforms ≈ 18k posts/mo → ~$175/mo. Docs also mention $0.50/account + $0.01/post, which conflicts.  ￼  This week after pricing clarification  4  Cheap experimental fallback. Too much ambiguity around pricing and app ownership to make primary.
6  Postiz Enterprise  White-label/multi-tenant social scheduler/API for Facebook, Instagram, Twitter/X, LinkedIn, TikTok; claims "skip app approvals" by using Postiz apps.  ￼  Enterprise page says it supports SaaS embedding, OAuth, headless API, and white-label. But it also says "We are not accepting new applications at the moment."  ￼  Enterprise Starter $200/mo for 200 channels; Growth $400/mo for 500 channels, unlimited posts/users/API calls.  ￼  Not available now  3.5  Monitor / waitlist. Architecture fits, availability does not. Self-hosted Postiz may still require your own platform apps.
7  Buffer API  Buffer supports LinkedIn/X/Meta/etc. Buffer is listed as a LinkedIn Marketing Partner.  ￼  API is beta. Buffer says the old API stopped accepting new apps, the new API is in beta, and public API use is currently centered on post creation/ideas through a Buffer account/API key.  ￼  Not modeled cleanly for 100 DearMe users because this is not clearly a resale/embedded multi-tenant API.  1–4 weeks, depending beta access  3  Fallback/manual bridge, not primary. Strong platform legitimacy; weak embedded-product fit.
8  Sprout Social API  X, LinkedIn Pages and Personal, Instagram, Facebook, Threads, YouTube, TikTok, Pinterest, Google Business; strong enterprise publishing/engagement.  ￼  Official LinkedIn Marketing Partner. API access is for Advanced Plan customers and must be provisioned. Publishing API currently supports creating/managing draft publishing posts, not a clean "DearMe silently posts everything" flow.  ￼  Enterprise/Advanced pricing; not publicly modelable.  4+ weeks  3.5 for DearMe, lower for enterprise SMM  Avoid as first-100 primary. Good vendor, wrong product shape.
9  Hootsuite API  Broad social coverage; Hootsuite is listed as a LinkedIn Marketing Partner.  ￼  Hootsuite API terms are restrictive: license is limited/revocable, no sublicensing/redistribution, and Hootsuite may suspend access if a third-party service requires it.  ￼  Enterprise/custom for serious API use.  4+ weeks  4 for embedding  Avoid for embedded DearMe. Fine as a dashboard; terms are not friendly to resale/white-label API embedding.
10  Sprinklr API  Enterprise-grade publishing, engagement, analytics across 30+ channels; official LinkedIn partner.  ￼  LinkedIn publishing support exists inside Sprinklr, including LinkedIn profiles/pages with media, scheduling, targeting, and first comment.  ￼  Custom enterprise pricing; likely not compatible with a low-cost consumer product.  4–8+ weeks  3.5 for DearMe, lower for enterprise  Enterprise fallback only. Too heavy for first 100 users.
—  Loomly / MeetEdgar  Creator/social scheduling UIs. Loomly and MeetEdgar support social scheduling, but I did not find evidence of a public embedded REST posting API suitable for DearMe.  ￼  End-user dashboard products, not verified-intermediary APIs.  Not applicable  Not applicable  4  Avoid as infrastructure.
—  Phyllo  Primarily creator/social data and identity APIs. I did not find enough current public proof that Phyllo is a broad write/posting intermediary for DearMe's required use case.  Uncertain  Uncertain  Sales-cycle  4  Do not rely on it until sales confirms exact write scopes.

Section A details that matter

User authorization. The cleanest pattern is Ayrshare's "profile" model: DearMe creates a user profile, sends the user through a branded OAuth linking page, and then uses a profile key in API calls. Ayrshare states the user signs into the official platform login page, not by handing DearMe credentials.  ￼

LinkedIn official status. I found official LinkedIn directory listings for Buffer, Hootsuite, Sprout Social, Sprinklr, SocialPilot, and others. I did not find Ayrshare or Zernio in the parsed official LinkedIn Marketing Partner directory results. Directory membership is not the same thing as exposing an embeddable API to DearMe, and lack of directory listing does not prove a vendor lacks LinkedIn access; it means you need proof during procurement.  ￼

Media, video, threads, DMs/replies. Ayrshare, Publer, Zernio, Upload-Post, and Outstand all advertise media/video support. Ayrshare explicitly advertises messaging/comments and Facebook post boosting; Publer documents media assets and many post types; Outstand documents comments/replies/media endpoints. Treat X threads, LinkedIn comments/reactions, and DMs as POC items because support varies by platform and scope.  ￼

Account ownership. With OAuth to the user's own platform accounts, the user keeps the underlying account and audience. For LinkedIn specifically, LinkedIn's User Agreement says the personal account belongs to the member. If DearMe leaves Ayrshare, the user's followers stay with the user; DearMe simply loses posting access until the user reconnects through another path.  ￼

Unknowns I would not hand-wave. I did not get reliable 12-month status-page incident histories for the smaller social API providers. I found vendor uptime claims, but not enough independent outage history to state "no major outages." Make 12-month incident export, app-suspension history, and platform partner letters part of vendor diligence.

⸻

B. Cold outbound email infrastructure

B1. Transactional email providers for user-owned domains

This path avoids Gmail CASA by not using Gmail. The user configures a domain or subdomain with SPF/DKIM/DMARC, DearMe sends through an ESP, and replies go to the user via Reply-To or inbound routing.

Rank  Provider  Fit for 1:1 cold outreach  Domain-auth UX  Reply handling  Pricing for 100 users × 30/day ≈ 90k/mo  Warmup  Risk  Verdict
1  Mailgun  Strong API/deliverability tooling; better than pure newsletter tools for programmatic send.  SPF/DKIM/DMARC/BIMI support; many domains on Scale.  Inbound routing/webhooks; suppressions and complaints.  Foundation $35/50k + overage or Scale $90/100k. For 90k, roughly $87–$90/mo.  ￼  Dedicated IP warm-up available on Scale; inbox placement/reputation monitoring via Optimize.  ￼  2.5  Best ESP-style option if DearMe manages deliverability carefully.
2  Mailtrap  Good developer UX and generous domain/user caps on Business.  Business plan supports many domains; setup/deliverability help available.  ￼  API/SMTP; inbound/support details depend plan.  Basic has $30/100k; Business $85/100k with more users/domains/logs.  ￼  No automatic cold warmup clearly verified.  2.5  Good for first 100 if you want easy onboarding and many domains.
3  Resend  Excellent developer UX; not purpose-built for cold outreach.  Pro has 10 domains; Scale has 1,000 domains.  ￼  Sending and receiving included; use Reply-To to user inbox or inbound webhooks.  Scale $90/mo includes 100k emails and 1,000 domains; Pro $20 includes 50k plus $0.90/1k. 90k is roughly $56–$90/mo depending plan/domain needs.  ￼  No automatic warmup verified.  3  Best DX, but cold outreach deliverability needs extra process.
4  Amazon SES  Cheapest raw send; highest operational burden.  DNS/domain verification is technical; not ideal for non-technical users without DearMe-managed DNS wizard.  Inbound receiving and events available; suppression handling exists.  $0.10 per 1,000 outbound emails, so 90k/mo ≈ $9/mo before add-ons.  ￼  No built-in cold warmup.  3.5  Use only if DearMe is ready to own deliverability ops.
5  Postmark  Excellent transactional reputation; less appropriate for cold prospecting.  Good transactional setup; DMARC monitoring add-on.  ￼  Strong inbound webhook story.  ￼  Pricing page was not fully parseable for exact 90k math in this pass; verify checkout.  No cold warmup verified.  3  Use for product/transactional mail, not cold outreach.
6  SendGrid  Scalable but mixed cold-outreach reputation; deliverability depends heavily on setup.  Mature domain auth/subusers.  Events, bounces, suppressions.  Pricing page is volume/plan based; exact 90k number needs direct checkout confirmation.  ￼  Dedicated IPs/optimization on higher tiers; no automatic cold warmup verified.  3.5  Viable, but I would not make it the first cold-outreach default.
7  Brevo  More marketing/email-suite oriented; usable API/SMTP.  REST API, SMTP relay, webhooks, SDKs.  ￼  Inbound parsing appears in feature comparison.  ￼  Public page exposes free 300/day and paid tiers, but exact 90k price needs checkout.  ￼  No automatic cold warmup verified.  3.5  Fallback.
8  Customer.io  Great lifecycle/transactional messaging; not a cold-outreach platform.  Strong platform, but contacts/profiles drive pricing.  Good webhooks/journeys.  Essentials $100/mo includes 5k profiles and 1M emails.  ￼  No cold warmup.  3.5  Use for DearMe lifecycle mail, not user cold outreach.
9  Loops  Product/lifecycle email, not cold outreach.  Contact-based SaaS flow.  Transactional sending included.  Pricing is by subscribed contacts; 5k–10k contacts is $99/mo, higher contact counts rise quickly.  ￼  No cold warmup.  3.5  Not a fit for 1:1 cold outreach.

Can DearMe send from gmail.com through these ESPs?

Practically, no. You cannot authenticate DKIM/SPF for gmail.com because Google owns the domain. You can set a Reply-To of user@gmail.com, but sending as user@gmail.com through Mailgun/SES/Resend will fail authentication alignment and is likely to land poorly or be rejected. To truly send from Gmail, you need Gmail's SMTP/API/OAuth path or a supported Gmail/Workspace account connection; Google's docs say OAuth is required for apps, while app passwords are limited and tied to 2FA/device-style access.  ￼

Reply handling pattern I would use

For custom-domain cold outreach:

From: user@userdomain.com
Reply-To: user@userdomain.com or user@gmail.com
Return-Path/Bounce: bounces.userdomain.com controlled by DearMe/ESP
Optional archive/BCC or inbound webhook for DearMe conversation state.

That lets the recipient reply into the user's inbox, while DearMe still gets bounce/suppression telemetry.

⸻

B2. Cold-outreach platforms with warmup/deliverability

Rank  Platform  API-driven?  Gmail / mailbox connection  Warmup / deliverability  AI-generated outbound policy  Risk  Verdict
1  Smartlead  Yes. REST API covers campaigns, leads, email accounts, analytics, webhooks, rotation, warmup, unified inbox.  ￼  Docs show Gmail connection via app password after enabling 2FA.  ￼  Built-in warmup, rotation, unified inbox.  ￼  I found AI/personalization support but no specific public ban on AI-generated outbound in this pass.  3  Best cold platform candidate if DearMe wants deliverability + API quickly.
2  Instantly  API exists, but plan/limits need confirmation.  Supports Google Workspace OAuth, personal Gmail app password, and IMAP/SMTP; IMAP is required for replies/warmup.  ￼  Warmup/reply handling via connected mailbox.  No specific public AI ban found in this pass.  3  Strong fallback/primary. Be careful relying on app passwords as a universal CASA workaround.
3  lemlist / lemwarm  Yes. API keys can add leads, trigger campaigns, sync data.  ￼  Gmail/Outlook/IMAP/SMTP style mailbox connection.  lemwarm bundle; docs discuss 3–5 week warmup and deliverability.  ￼  AI outreach features exist; no specific ban found.  3  Good sales-platform fallback.
4  Reply.io  Yes. Reply exposes an Email Sending API and API docs.  ￼  Mailbox connection details require plan/vendor confirmation.  Sales-engagement deliverability features; warmup details not deeply verified here.  No specific public AI ban found.  3.5  Useful if the API product fits your workflow.
5  Mailshake  Yes. API keys, JSON endpoints, subscription-based quotas.  ￼  Mailbox integration product.  Warmup feature automates sends/replies/mark-not-spam using Mailshake-owned real addresses.  ￼  No specific public AI ban found.  3.5  Adequate fallback.
6  Apollo  Strong prospecting/sequences product; API campaign-driving was not fully verified in this pass.  Mailbox/sequence product.  Apollo documents warmup using third-party providers/private networks.  ￼  AI features exist; policy not verified.  3.5  Better as data/prospecting than core send infra unless API confirms campaign control.
7  Woodpecker  API not sufficiently verified here.  Mailbox-based.  Warmup slots/add-ons exist in public docs/search results.  ￼  Not verified.  3.5  Needs API diligence.
8  HeyReach  Primarily LinkedIn outreach automation, not email infra.  Not the relevant Gmail-send replacement.  LinkedIn account warmup/limits.  ￼  Not verified.  5 for LinkedIn core  Avoid as DearMe core LinkedIn infra.

⸻

C. LinkedIn-specific: ways around MDP

C1. What is officially required?

LinkedIn's Posts API docs say w_member_social allows creating posts, comments, and likes on behalf of an authenticated member; w_organization_social is for organizations/pages. LinkedIn's access docs also state that most permissions require explicit approval.  ￼

So the real question is not "does the vendor claim LinkedIn?" It is:

1. Can they post to a member profile, not just a company page?
2. Is it via LinkedIn's official API and w_member_social?
3. Does their contract allow DearMe to embed/resell that capability to DearMe users?

C2. Ranked LinkedIn options

Rank  Option  What it really is  Time-to-launch  Risk  Verdict
1  Ayrshare, after POC  Likely best practical bridge for member-profile posting through a third-party social API. Not found in public LinkedIn partner directory, so require proof.  ￼  This week  2.5–3.5  Use as first-100 bridge only after live LinkedIn profile test.
2  Native LinkedIn MDP application  Strategic official path. Slow/rejection-prone, but removes intermediary risk. LinkedIn docs confirm approval requirements.  ￼  4–12+ weeks  2 long-term / 5 schedule risk  Apply in parallel immediately.
3  Buffer / Hootsuite / Sprout / Sprinklr  Official LinkedIn partner ecosystem. Public directory confirms partner status for these vendors, but their APIs are beta, enterprise, draft-only, or contract-restricted.  ￼  2–8+ weeks  3–4 for DearMe  Not ideal primary infrastructure.
4  Manual LinkedIn share URL/plugin  User-facing share dialog/button, not silent API posting. LinkedIn's share plugin lets users craft shares; programmatic posting requires OAuth/API.  ￼  Immediate  1 compliance / 4 UX  Fallback for high-value posts. User must confirm/click.
5  Taplio / Hypefury / AuthoredUp  Creator tools/UI/Chrome-extension workflows. Hypefury schedules/cross-posts to LinkedIn; AuthoredUp uses a Chrome extension and explicitly says it is not affiliated/authorized/endorsed by LinkedIn.  ￼  Not infrastructure  3–4  Do not use as DearMe backend.
6  Unipile  Not official LinkedIn API access. Unipile says it is an independent intermediary, not LinkedIn-affiliated, and its own docs say LinkedIn/WhatsApp/Instagram operate through reverse engineering.  ￼  This week  5  Avoid for production LinkedIn core unless you knowingly accept ToS/session risk.
7  Phantombuster / Linked Helper / Dux-Soup / Closely / Expandi / HeyReach  Browser/session/cloud automation. Vendors themselves discuss proxies, limits, warmup, delays, human-like timing, and avoiding restrictions.  ￼  This week  5  Avoid for DearMe's core product.

C3. How the named LinkedIn tools likely post

Tool  Assessment
Buffer  Official LinkedIn Marketing Partner; uses platform APIs for its product. Its developer API is beta and not clearly built for embedded resale.  ￼
Hootsuite  Official LinkedIn Marketing Partner; likely official APIs. But API terms are restrictive for sublicensing/redistribution.  ￼
Sprout Social  Official LinkedIn Marketing Partner; supports LinkedIn Personal and Pages in publishing API docs, but API currently creates draft publishing posts.  ￼
Sprinklr  Official LinkedIn partner; enterprise official workflow, including LinkedIn profile/page publishing inside Sprinklr.  ￼
Hypefury  End-user creator scheduling/cross-posting product; no public embedded API proof found.  ￼
Taplio  LinkedIn creator product; no public embedded API proof found. Chrome extension appears to power enhanced features.  ￼
AuthoredUp  LinkedIn writing/analytics tool with Chrome extension; explicitly says it is not affiliated/authorized/endorsed by LinkedIn. API appears oriented toward data/integrations, not confirmed autonomous posting.  ￼

C4. LinkedIn share URL fallback UX

The share URL/plugin is a user-confirmed share flow, not a server-side posting API. It can streamline opening a LinkedIn share composer for a URL, but the user still confirms the share. LinkedIn's own docs separate the Share Plugin from API-based shares that require OAuth and w_member_social.  ￼

For DearMe, this is useful as:

* "Approve and share on LinkedIn" button.
* Fallback when API posting fails.
* Safer UX for high-stakes posts.

It is not useful for fully autonomous LinkedIn posting.

C5. Browser automation enforcement risk

LinkedIn explicitly prohibits bots, browser plugins/extensions, scraping, and unauthorized automated methods to create, comment, like, share, re-share posts, send messages, drive engagement, or access LinkedIn services. LinkedIn says users risk account restriction/shutdown and that such tools may become non-operational without notice.  ￼

That makes Phantombuster, Linked Helper, Dux-Soup, Closely, Expandi, HeyReach, and similar tools high-risk for DearMe. The exact 2026 enforcement rate is not publicly quantified, but the policy risk is explicit.

⸻

D. Polsia competitive recon

I found public commentary and Polsia pages, but not enough to prove their exact integration architecture.

Question  Evidence found  Confidence
Is Polsia using its own Twitter/X dev app, pooled accounts, or posting-as-a-service?  A public LinkedIn post by Andreas Klinger says Polsia "tweeted" before the landing page was done and set up ads/email/Stripe/etc., but it does not identify the Twitter/X mechanism.  ￼  Unknown
Did Polsia get LinkedIn MDP?  I did not find Polsia in the official LinkedIn Marketing Partner directory during this pass. That is not proof they lack MDP, but I found no public proof they have it.  ￼  Likely no public evidence; actual status unknown
How are they handling Gmail CASA?  Public commentary says Polsia wanted to send cold outreach using the Gmail account the user had logged in with; a Polsia privacy snippet mentions OAuth tokens/service credentials being encrypted. I could not determine whether they use Gmail OAuth/CASA, Nylas-like shared app, SMTP, SendGrid/Postmark/SES, or a mixed model.  ￼  Unknown
Any ToS violations or bans publicly reported?  I found public spam/abuse criticism, including a post titled "Polsia's AI-Powered Cold Email Problem." Ben Broca's post says they limited outreach to 2 emails per company/day and 500 max outreach/day across the platform after issues. I did not find a formal public platform ban.  ￼  Criticism found; formal bans not found

Polsia appears to be operating in a much more aggressive "autonomous company factory" mode than DearMe should for a user-owned personal brand product. The public evidence is enough to flag reputational and outbound-abuse risk, but not enough to conclude their exact vendor stack.

⸻

E. AI agent toolkit / agent platform services

These generally do not solve platform approval. They solve agent orchestration, tool calling, auth brokering, or workflow execution.

Provider  Does it post to X/LinkedIn from end-user accounts?  Are they the verified social app?  Pricing  Risk  Verdict
Composio  It provides tools/integrations and delegated auth for agents across many apps. It is not proven to be a verified social-posting intermediary for LinkedIn/X.  ￼  Usually no; treat as auth/tool middleware unless a specific connector proves otherwise.  Pricing commonly connection/usage-based; verify plan.  3  Use for agent tools, not to avoid MDP/CASA.
Toolhouse  Agent deployment/MCP/tool platform; can connect tools, but I found no proof it holds official LinkedIn/X posting apps.  ￼  No proof.  Free/paid tiers; exact production pricing needs vendor page confirmation.  3.5  Not a posting intermediary.
Arcade  Tool registry/tool-calling platform for agents. No proof of official social posting intermediary status.  ￼  No proof.  Early/vendor-specific.  3.5  Not a substitute for platform approvals.
Pica / One  Managed auth/actions across many apps; useful integration middleware. No proof it solves LinkedIn/X official write approvals.  ￼  No proof for DearMe's hard social channels.  Usage-based/free-start claims; enterprise custom.  ￼  3  Useful middleware, not primary social layer.
Latitude  Observability/evals/monitoring for AI agents, not a social posting provider.  ￼  No.  Usage-based / trial.  2  Use for monitoring, not integrations.
Trigger.dev  Workflow/orchestration platform for long-running AI jobs, queues, retries, scheduled tasks, browser automation.  ￼  No.  Free, Hobby $10, Pro $50, Enterprise custom; run/compute pricing applies.  ￼  2 for orchestration; 5 if used for LinkedIn browser automation  Good job runner, not approval workaround.

⸻

F. Risk table for posting-as-a-service candidates

Provider  Suspension blast radius  Funding / durability signal  Pricing predictability  White-label / sublicense compatibility  Risk  Mitigation
Ayrshare  If Ayrshare's platform app/access is suspended, DearMe social posting through Ayrshare goes dark. User accounts/followers remain user-owned.  Mature, transparent docs/pricing; business-user model documented.  Predictable per-profile pricing; enterprise custom at scale.  ￼  Business plan explicitly supports user profiles and posting on behalf of users.  ￼  2.5  Build provider abstraction; apply native APIs in parallel; keep share-URL LinkedIn fallback.
Publer  Same intermediary-app risk.  Established social scheduler; API publicly documented.  Business per-social-account pricing is predictable but expensive at 3 accounts/user.  ￼  API only Business/Enterprise; embedded resale terms need contract.  3  Use as fallback, not sole dependency.
Upload-Post  Same; smaller vendor risk.  Public product/pricing/status page, but less independent evidence.  Attractive, but "profile" semantics need confirmation.  ￼  White-label advertised.  3.5  Use for video/social fallback after POC.
Zernio / Late  Same; plus uncertainty around claimed official partner badges.  Rebrand/newer API; claims broad support.  Very cheap per-account pricing; X pass-through.  ￼  Developer/API orientation suggests embeddable, but contract needed.  4  Require proof of platform apps, app IDs, LinkedIn scopes, and customer references.
Outstand  Same; plus "use ours or BYO" ambiguity.  Cheap/high-volume claims, but pricing/docs conflict.  ￼  Unclear because docs and homepage conflict.  Claims white-label/BYO.  4  Treat as experimental only.
Postiz Enterprise  Same.  Open-source/community growth; but enterprise page says no new applications.  ￼  Predictable if accepted.  Strong conceptual fit.  3.5  Monitor; do not depend on near-term availability.
Buffer  Low platform legitimacy risk; API product risk.  Strong established vendor; official LinkedIn partner.  ￼  Normal SaaS pricing, API beta uncertainty.  Not clearly resale/embedded.  3  Use only as manual/beta fallback.
Hootsuite  Low platform legitimacy risk; high embedding/legal risk.  Established enterprise vendor.  Enterprise/custom; API terms permit changes/suspension.  ￼  Terms restrict sublicensing/redistribution.  4 for DearMe  Avoid as embedded layer.
Sprout / Sprinklr  Low platform legitimacy risk; high cost/workflow mismatch.  Established enterprise vendors.  Custom/enterprise.  Needs enterprise contract; Sprout API draft-only limitation matters.  ￼  3.5  Enterprise fallback only.
Unipile / browser automation vendors  User account restrictions possible; tool can become non-operational without notice under LinkedIn policy.  ￼  Varies.  Often predictable subscription pricing.  Technically embeddable, but ToS-sensitive.  5  Avoid for DearMe core.

⸻

What I'd do if I were building DearMe

First 100 paying users

Function  Recommended provider stack  Why
Social posting: X, LinkedIn, Meta, IG, TikTok, YouTube  Ayrshare primary, with Upload-Post or Publer as secondary fallback.  Ayrshare is the best match to the "their OAuth app + our REST API + user-owned accounts" requirement, with transparent per-profile pricing and broad channel support.  ￼
LinkedIn  Ayrshare only after live w_member_social profile-posting POC; otherwise manual LinkedIn share URL fallback. Apply to LinkedIn MDP in parallel.  LinkedIn is the strategic bottleneck; browser automation is too risky. LinkedIn explicitly prohibits unauthorized automation.  ￼
Cold email  For custom domains: Mailgun Scale or Mailtrap Business. For mailbox-based cold campaigns: Smartlead or Instantly as a controlled campaign layer.  ESP route avoids Gmail CASA but requires user domain auth. Cold platforms add warmup/reply handling but have mailbox-connection fragility.  ￼
Gmail send / Gmail calendar when truly needed  Nylas Shared GCP App for Gmail/Calendar; Cronofy for calendar-only.  Nylas says its shared Google app has passed CASA; Cronofy says no provider credentials/security reviews are needed for calendar access.  ￼
Calendar booking  Cronofy if calendar-only; Nylas if you also want mailbox sync.  Cronofy Emerging includes 1,000 synced accounts and 99.99% guarantee.  ￼
Payments  Stripe Connect native.  Stripe Connect is designed for platforms to let connected accounts accept payments; requests are made on behalf of connected accounts.  ￼
Workflow execution  Trigger.dev or your own queue/worker system.  Good for retries, schedules, long-running jobs; not an OAuth/app-approval workaround.  ￼

Scaling past 1,000 paying users

At 1,000+ users, intermediaries become strategic single points of failure. Keep them, but stop treating them as your moat.

Apply for native access in parallel:

1. LinkedIn MDP / w_member_social — highest strategic priority.
2. X API — useful to remove per-vendor dependency and support threads/engagement cleanly.
3. Meta App Review + Business Verification — especially if ads are core, because Ayrshare's Facebook boost is not a full ads platform replacement.
4. Google OAuth verification / CASA, unless Nylas remains acceptable long-term.
5. YouTube Data API / TikTok Content Posting API — for native video publishing.
6. Stripe Connect — use native from day one.

Use an internal abstraction like:

DearMe Intent → Policy/Approval Layer → Channel Adapter → Provider Router → Native/Vendor API

That lets you route LinkedIn through Ayrshare, X through native, Meta through native or Ayrshare, and email through ESP/Smartlead without rewriting the agent layer.

Ballpark monthly infra cost

Excludes LLM calls, Sora/video generation, storage, human review, and support.

Scale  Social posting  Email  Calendar  Payments  Approx total
100 users  Ayrshare ~$1.2k–$1.6k/mo depending add-ons.  ￼  Raw ESP ~$90/mo for Mailgun/Mailtrap/Resend-class 100k volume; SES raw would be ~$9 but with more ops burden.  ￼  Cronofy Emerging $819/mo if using Cronofy.  ￼  Stripe fees, not fixed infra.  ~$2.5k–$4k/mo
1,000 users  Ayrshare public math ≈ $3.9k/mo before add-ons/custom discounts.  900k emails/mo: hundreds to low thousands/mo, depending ESP/deliverability tooling.  Cronofy Emerging still covers 1,000 synced accounts at $819/mo.  Transaction fees.  ~$7k–$15k/mo
10,000 users  Ayrshare public math ≈ $26k/mo, but enterprise pricing may be lower per profile.  ￼  9M emails/mo: raw SES ≈ $900/mo, but real deliverability/support/ESP enterprise costs can be many thousands.  Cronofy Growth plus overage ≈ $3.8k+/mo by public included-account math.  ￼  Transaction fees.  ~$50k–$100k/mo if still vendor-led

Final operating recommendation

For DearMe's first 100 users, I would launch with:

Ayrshare + Mailgun/Mailtrap + Smartlead/Instantly where needed + Cronofy/Nylas + Stripe Connect + Trigger.dev/own workers.

I would not put LinkedIn browser automation, cookie-based LinkedIn sessions, Phantombuster-style workflows, or Unipile-style reverse-engineered LinkedIn access into the core product. Those may work tactically, but they are exactly the kind of dependency that can create user account restrictions and a production outage you cannot control.

---

## Run 2

Below is the best read I can give as of May 9–10, 2026. I'm using Risk 1–5 where 1 = low platform/commercial risk and 5 = high risk. I'm also using "Meets A?" narrowly: the provider is the effective verified/intermediary app, the user authorizes to them, and DearMe calls their API without DearMe needing the native platform approval.

Executive takeaways

The market does not have one clean, low-risk intermediary that solves X, LinkedIn, Meta, Gmail, Calendar, Stripe, TikTok, and YouTube for a consumer AI "personal brand team."

The strongest near-term architecture is:

Need  Best near-term path  Why
LinkedIn/Meta/IG/TikTok/YouTube posting  Ayrshare primary, plus Buffer/Hootsuite/Sprout/Sprinklr fallback or enterprise path  Ayrshare is the most mature API-first intermediary; official LinkedIn partners exist, but they are mostly dashboard/enterprise platforms, not simple embedded REST APIs.
X/Twitter  Apply for X native API in parallel  Ayrshare now requires your own X developer credentials for X operations starting March 31, 2026, so it no longer cleanly solves X-as-intermediary.
Cold email  Smartlead or Instantly for cold outbound, plus Resend/Mailtrap/Mailgun for product/transactional email  ESPs are not cold-outreach deliverability platforms; cold sequencers handle warmup, rotation, replies, and per-mailbox throttling.
Gmail @gmail.com sending  Do not route through ESPs  Sending as gmail.com via an ESP is not viable; Google explicitly requires authentication/alignment and warns against impersonating Gmail From domains.
Google Calendar  Use Cal.com/Calendly-style scheduling or apply for Google verification  True "create event on user calendar" still runs into Google OAuth scope review/CASA-like review depending scopes.
Stripe  Use Stripe Connect directly  Stripe already has the right model: user-owned connected accounts with platform access.
LinkedIn automation/browser tools  Avoid as core  LinkedIn explicitly prohibits third-party automation/scraping/browser extensions that automate activity; Unipile and PhantomBuster-style tools are not the same risk category as approved API partners.

⸻

A. Posting-as-a-service providers

Ranked table

Rank  Provider  Coverage that matters  Meets A?  User authorization  Official platform approval found?  Est. cost for 100 users × 2 posts/day × 3 platforms  Time-to-launch  Risk  Verdict
1  Ayrshare  LinkedIn, Facebook, Instagram, TikTok, YouTube, Threads, Reddit, Pinterest, etc.; X now BYO credentials  Mostly yes, except X  User connects each social account through Ayrshare's OAuth/linking page  I did not find Ayrshare in LinkedIn's official Marketing Partner directory; platform support is documented by Ayrshare  ~$1,058–$1,228/mo for 100 user profiles on Business, before extras  This week  3/5  Primary MVP social API, but not for X after the 2026 X credential change
2  Post for Me  LinkedIn, X, Facebook, Instagram, TikTok, YouTube, Threads, BlueSky, Pinterest  Claims yes  Quickstart uses Post for Me developer credentials; White Label uses yours  No official LinkedIn partner listing found  Public plan is $10/mo for 1,000 successful posts; 18k posts likely custom, roughly $180+/mo if linear, but must confirm  This week after approval/contract  4/5  Experimental fallback; very close to required architecture, but require proof of scopes/approval/liability
3  PostPeer  LinkedIn posting API plus X/Instagram/Facebook/TikTok/YouTube/Threads/BlueSky  Claims yes  User connects through PostPeer OAuth flow; no DearMe LinkedIn app required  No official LinkedIn partner listing found  Non-X 18k credits ≈ $120/mo on Pro; X can become much more expensive because X posts consume extra credits  This week  4.5/5  Cheap fallback candidate, not primary until official-status and compliance diligence pass
4  Buffer  LinkedIn profiles/Pages, X, Facebook, Instagram, TikTok, YouTube, Mastodon, BlueSky, Threads  Not clearly as embedded API  User connects accounts to Buffer  Yes: official LinkedIn partner listing found  Pricing depends channels/plan; API is not clearly public/white-label enough for DearMe  1–4 weeks if negotiated; dashboard fallback immediate  2/5 platform, 4/5 embedding  Official LinkedIn fallback, especially for manual/dashboard continuity
5  Hootsuite  LinkedIn, Meta, X, YouTube, TikTok, etc.  Enterprise/gated, not simple API-first A  User/org connects accounts to Hootsuite  Yes: official LinkedIn partner listing found  Enterprise/custom; likely far above API-first tools  2–8 weeks  2/5 platform, 4/5 commercial  Enterprise fallback/SLA option, not lean MVP
6  Sprout Social  LinkedIn, Meta, X, TikTok, YouTube, etc.  Enterprise/gated  User/org connects accounts to Sprout  Yes: official LinkedIn partner listing found  Enterprise/custom  2–8 weeks  2/5 platform, 4/5 commercial  Enterprise fallback, not first 100 users
7  Sprinklr  Broad enterprise social + ads + governance  Enterprise/gated  User/org connects accounts to Sprinklr  Yes: official LinkedIn partner listing found  Enterprise/custom; likely high  4–12 weeks  1.5/5 platform, 4.5/5 cost  Large-scale enterprise option, not consumer MVP
8  Postiz Enterprise / Direct OAuth  Facebook, Instagram, X, LinkedIn, TikTok, etc.  Could meet A, but currently unavailable  Either users connect Postiz account to DearMe, or Enterprise uses Postiz apps/headless API  No official LinkedIn partner listing found  Enterprise Growth would be $400/mo for 500 channels, enough for 300 channels; but docs say not accepting new applications  Not available now  3.5/5  Watchlist, not usable until applications reopen
9  Zernio / Late.so  Instagram, TikTok, LinkedIn, YouTube, X, Facebook, Pinterest, Reddit, Threads, BlueSky  Uncertain  Connected social accounts; exact OAuth-app ownership needs verification  No official LinkedIn listing found  Pricing is per connected social account: rough ~$500–$900/mo for 300 socials depending interpretation  This week if approved  4/5  Diligence candidate, but do not assume verified intermediary status
10  Upload-Post  Video/social API for TikTok, Instagram, YouTube, LinkedIn, Threads, X, Facebook  Uncertain  Connect accounts to Upload-Post/dashboard/API  No official LinkedIn listing found  Pricing not fully verified from fetched docs  This week  4/5  Video-posting fallback, especially TikTok/YouTube; not primary LinkedIn
11  Publer API  Social scheduling/publishing/analytics  Uncertain  Likely Publer account/channel connection  No official LinkedIn listing found  Pricing not fully verified from fetched docs  This week to 2 weeks  3.5/5  Dashboard/API fallback, not confirmed as embedded intermediary
12  Typefully API  X, LinkedIn, Threads, BlueSky, Mastodon  No for DearMe at scale  API key from user's Typefully account  Not official LinkedIn listing in my search  Team/personal workflow pricing; not built for large public embedded apps  This week for internal use  4/5  Avoid as embedded provider; useful only for personal/internal automations
13  Outstand  X, LinkedIn, Instagram, plus other networks  No  OAuth with credentials you provide  N/A  $0.01/post claims, but DearMe still needs native apps  This week after native credentials  5/5 for your goal  Avoid for verification avoidance; useful only after DearMe has native apps
14  Phyllo  Creator data APIs; publish APIs have existed/been marketed  Uncertain / not enough proof  Creator consents to Phyllo  Not verified for LinkedIn write in my search  Custom/gated  Sales cycle  4/5  Do not rely on it for LinkedIn posting without written scope proof

Notes on the strongest A candidates

Ayrshare is the most credible API-first social intermediary for DearMe's first 100 users. Its docs describe one "profile" per platform user, with one connection per supported social network, and support for LinkedIn, Facebook, Instagram, TikTok, X, YouTube, Threads, Pinterest, Reddit, and more. Its Business pricing is $599/mo for the first 30 profiles monthly, plus $8.99/profile for profiles 31–100, which makes 100 users about $1,228.30/mo monthly or about $1,058.30/mo annual. Ayrshare documents posting, scheduling, media, comments, ads, webhooks, and messaging support across supported platforms.  ￼

The major Ayrshare caveat is X/Twitter. Ayrshare says that starting March 31, 2026, all X/Twitter operations require the customer's own OAuth 1.0a credentials; without BYO X credentials, X calls are rejected. That means Ayrshare is no longer a clean "they hold the verified app" solution for X.  ￼

Post for Me is one of the closest fits to your requested architecture. Its docs explicitly distinguish Quickstart, where it uses Post for Me developer credentials so users see "Post for Me" in OAuth, from White Label, where you bring your own credentials and need platform approval. It claims all plans include nine platforms, unlimited social accounts, API keys, media, webhooks, analytics, Quickstart, and White Label options. The public plan is only $10/mo for 1,000 successful posts, so your 18k monthly platform-posts likely require custom terms despite the attractive nominal pricing.  ￼

PostPeer also claims the exact missing LinkedIn primitive: user connects through PostPeer OAuth, no DearMe LinkedIn developer app is needed, and DearMe can post to personal profiles and company pages via API. Its credit model is very cheap for non-X posts, but X costs can explode because most platforms are one credit, while X posts cost five credits without a URL and 50 credits with a URL. I did not find official LinkedIn Marketing Partner proof for PostPeer, so I would not make it the only LinkedIn path.  ￼

Postiz is promising but blocked. Its Enterprise docs say it can use Postiz apps, skip app approvals, run multi-tenant, and support white-label/headless API for Facebook, Instagram, Twitter/X, LinkedIn, TikTok, and others. But the same Enterprise page says it is not accepting new applications at the moment. Public Postiz plans are more dashboard-like; the Direct OAuth flow lets a user connect their Postiz account to your app, but that is different from DearMe being a hidden embedded channel provider.  ￼

Outstand is not in category A for your purpose. It is a useful connector once DearMe has native platform credentials, but its docs are explicit: you bring your own OAuth credentials from the social networks and need approved apps/scopes.  ￼

⸻

B. Cold outbound email infrastructure

B1. Transactional/email API providers

For cold outreach, these providers are not equivalent to Gmail OAuth. They are best when the user controls a custom domain or subdomain and authenticates DNS. Google's current sender guidelines require SPF or DKIM for all senders, SPF+DKIM+DMARC for bulk senders, low spam rates, and alignment between the From domain and SPF/DKIM; Google also explicitly says not to impersonate Gmail From headers.  ￼

Rank  Provider  Best use  Deliverability for 1:1 cold outreach  Per-user domain UX  Replies to user inbox?  Est. cost for 90k emails/mo  Warmup  Risk  Verdict
1  Mailgun  User-domain API sending at scale  Good infra, but not cold-specific  Strong API/DNS/webhooks; supports many domains  Yes via Reply-To, inbound routes/webhooks, or forwarding you build  ~$90/mo Scale 100k emails, 1,000 domains, dedicated IP at 100k+  Dedicated IP warmup on Scale/Optimize features  2.5–3/5  Best ESP-style choice if you build deliverability controls
2  Mailtrap  Developer-friendly sending + domain onboarding  Good infra, not cold-specific  Strong; Business supports 3,000 domains  Yes via Reply-To/inbound handling you build  ~$85/mo Business 100k, 3,000 domains, dedicated IP  Auto warmup listed  2.5/5  Strong MVP ESP alternative
3  Resend  Product/transactional email; user-domain sends  Good for app/email API; not cold-specialized  Very good developer UX; Scale supports 1,000 domains  Reply-To works; inbound emails/webhooks supported  $90/mo Scale for 100k included; optional dedicated IP $30/mo  Dedicated IP is warmed/monitored; no cold warmup network  3/5  Great product email, cautious for cold
4  Amazon SES  Lowest-cost scale once you own deliverability  Excellent raw infra, high ops burden  Poorer nontechnical UX; production/sandbox/deliverability work  Yes, but you build routing/inbound  ~$9/mo for 90k outbound, before extras  No turnkey cold warmup  3/5  Best at 1k–10k users with deliverability team
5  SendGrid  General API email; broad ecosystem  Good but mixed shared-pool reputation; cold risk  Good domain auth/subuser support  Yes via Reply-To/inbound parse  $34.95/mo Essentials 100k or $89.95/mo Pro 100k  Automated dedicated IP warmup on higher tiers  3.5/5  Acceptable, but I would not use it as cold primary
6  Postmark  Transactional email with strong reputation  Poor fit for cold; permission-based posture  Good  Yes; inbound webhook parser  ~$114/mo Platform for 90k  No cold warmup  4/5 for cold, 1.5/5 transactional  Use for transactional only
7  Brevo  Marketing/lifecycle + transactional  Not ideal for personalized cold API  Moderate  Yes with Reply-To/inbound patterns  Exact 100k transactional price not fully verified; dedicated IP add-on exists  Not cold warmup  3.5/5  Not my cold-outbound pick
8  Loops  SaaS lifecycle messaging  Not built for arbitrary user cold outreach  Simple for one product domain, not 100 user domains  Product-centric replies  Contact-based; 50k–100k contacts shown at $399/mo  No cold warmup  3/5  Use for DearMe lifecycle, not user cold outreach
9  Customer.io  Lifecycle messaging/customer journeys  Not a cold outbound infra product  Good for product-owned domains  Product-centric replies  Essentials starts $100/mo with 1M emails included  No cold warmup  3/5  Good for DearMe lifecycle, not user-owned cold

Mailgun's current pricing shows Foundation at $35/mo for 50k emails and Scale at $90/mo for 100k emails, with API/SMTP, webhooks, inbound routing, suppression, SPF/DKIM/DMARC/BIMI, and automated dedicated IP warmup features on higher tiers.  ￼

Mailtrap's pricing shows Basic 100k at $30/mo but only five domains, while Business 100k is $85/mo with 3,000 domains, dedicated IP, auto warmup, SPF/DKIM/DMARC, throttling, and suppressions. That domain count makes it more plausible for 100 user-owned domains.  ￼

Resend's Scale plan includes 100k emails and 1,000 domains at $90/mo, with DKIM/SPF/DMARC, inbound emails, webhooks, suppression management, REST API, SMTP relay, and SDKs. Dedicated IPs are available on Scale for $30/mo and are described as warmed and monitored.  ￼

Postmark is excellent for transactional mail, but its terms are hostile to unsolicited/cold patterns. Its acceptable-use language includes cancellation thresholds around 0.1% spam complaints and 10% bounces, and it prohibits spam/duplicative/unsolicited messages and purchased/rented lists.  ￼

Can you send from user@gmail.com through Resend/Mailgun/Postmark/etc.?

Practically: no. You can set Reply-To: user@gmail.com, but sending mail with a From: user@gmail.com through an ESP is not a durable path because the Gmail domain is not yours to authenticate and align. Google's sender guidelines require authentication and alignment, and Google specifically warns against impersonating Gmail From headers.  ￼

For actual Gmail mailbox sending, the paths are Gmail API/OAuth, Google SMTP with credentials/app password where allowed, or a cold email platform that connects to the user's mailbox. Google app passwords still exist, but Google says they are not recommended, require two-step verification, and may be unavailable for some accounts or organizations. Google's SMTP relay/auth docs also show app-password-based SMTP sending limits.  ￼

B2. Cold outreach platforms

Rank  Provider  API-driveable?  Gmail/user mailbox connection  Warmup/reputation  Est. cost for 90k emails/mo  AI outbound posture  Risk  Verdict
1  Smartlead  Yes; API docs cover campaigns, leads, rotation, webhooks  OAuth recommended; SMTP/IMAP and app-specific password supported  Yes; multi-account rotation, warmup, unified inbox  $94/mo Pro includes 90k sends, before mailbox/domain costs  Built for cold outreach; ensure user approval/rate limits  2.5/5  Primary cold-outbound engine for MVP
2  Instantly  Yes; API + webhooks  Gmail/Workspace or SMTP/IMAP  Unlimited account warmup; private server/IP features on higher plan  $97/mo Hypergrowth for 100k emails, before mailbox/domain costs  Built for cold outreach; verify embedding terms  2.5/5  Primary alternative to Smartlead
3  Woodpecker  API/webhooks add-on available  Google, Microsoft, SMTP; app password paths documented  Warmup slots; Mailivery/Warmy integrations  Dynamic; API add-on $20/mo plus prospects/mailboxes  Built for cold sales; more UI/agency oriented  2.5–3/5  Good backup, especially agency-style workflows
4  Reply.io  API and embedded email-account use cases documented  Connect user email accounts  Sequencing/deliverability features  Pricing needs current sales-page verification  Has AI SDR features  3/5  Good candidate, but pricing/contract diligence needed
5  Mailshake  Some API/automation; less API-first than Smartlead/Instantly  Email accounts per plan; agency custom  Warmup included after Warm Up Your Email acquisition  $49/user/mo Email Outreach; agency custom for many accounts  Built for outreach  3/5  Fallback; probably not embedded primary
6  Lemlist  Yes, API exists  Gmail/Outlook/IMAP/SMTP; replies land in inbox  Deliverability hub/warmup booster  Per-user pricing makes 100 users expensive: roughly $6.3k+/mo annual if one seat/user  AI personalization included  3.5/5  Use only if customer already wants Lemlist
7  Apollo  Has APIs, but standard terms restrict external/resale use  Apollo-managed sequencing/mailboxes  Email warmup introduced in 2025  Plan-dependent; external product needs custom agreement  AI sales/outbound product  4/5 for DearMe embedding  Avoid unless custom platform agreement
8  HeyReach  API/webhooks advertised  LinkedIn-first; integrates with Smartlead/Instantly  LinkedIn sender rotation/safety limits  Agency $799/mo up to 50 LinkedIn accounts; Unlimited $1,999/mo  LinkedIn automation product  4/5  Avoid as core; high LinkedIn ToS risk

Smartlead is the cleanest cold-outbound API candidate. Its API docs describe campaign automation, lead management, multi-account rotation, warmup, unified inbox, analytics, and webhooks. Its Pro plan is $94/mo and includes 30k active leads and 90k monthly email credits; Unlimited Smart is $174/mo with 150k sends. Smartlead's mailbox docs also show OAuth as recommended and SMTP/IMAP with app-specific passwords as a supported path.  ￼

Instantly is the closest substitute. Its Hypergrowth plan is $97/mo with 100k monthly emails, unlimited email accounts, unlimited warmup, and 25k uploaded contacts. Instantly's API examples include sender accounts, Gmail/Workspace or SMTP/IMAP, campaign/lead APIs, and webhooks for replies, bounces, unsubscribes, meetings, and campaign events.  ￼

⸻

C. LinkedIn-specific: ways around MDP

C1. Officially approved LinkedIn partner path

I found these providers in LinkedIn's official Marketing Partner directory:

Provider  Official LinkedIn partner listing?  What listing supports  DearMe relevance
Buffer  Yes  Publishing, stats, Page Management, self-service subscription/free trial  Best official low-friction fallback
Hootsuite  Yes  Scheduling/publishing, follower engagement, company page DMs, analytics, API docs link  Strong enterprise fallback
Sprout Social  Yes  Publishing, response management, analytics, Smart Inbox, workflows  Enterprise/social-team fallback
Sprinklr  Yes  Organic/paid social management, bulk campaign management, governance  Large enterprise path
Oktopost  Yes  B2B social engagement, Page Management, managed/self-service  B2B-focused fallback

LinkedIn's own product catalog distinguishes consumer "Share on LinkedIn" from marketing/community-management APIs, and LinkedIn's Posts API docs show write support for posts and media, but also note that some APIs are private or available only to qualified developers.  ￼

Buffer's LinkedIn scheduling guidance also says LinkedIn Marketing Partners can help schedule personal profile and company posts, and names Buffer, Hootsuite, Sprout Social, and Sprinklr as scheduling options.  ￼

C2. Tools like Buffer, Hootsuite, Taplio, AuthoredUp, Hypefury

Tool  Likely posting mechanism  Evidence level  DearMe verdict
Buffer  Official LinkedIn partner/API  High  Use as official fallback
Hootsuite  Official LinkedIn partner/API  High  Enterprise fallback
Sprout Social  Official LinkedIn partner/API  High  Enterprise fallback
Sprinklr  Official LinkedIn partner/API  High  Enterprise fallback
Taplio  Claims LinkedIn scheduling/automation; official partner proof not found in my search  Medium/uncertain  Do not assume MDP path
AuthoredUp  Appears more browser/editor-extension-like; official partner proof not found  Medium/uncertain  Avoid as API dependency
Hypefury  Social scheduler; official LinkedIn partner proof not found  Medium/uncertain  Treat as dashboard fallback only after diligence

The key distinction is not "does it post to LinkedIn?" but whether LinkedIn lists it as an official partner and whether it offers an embedded/white-label API contract DearMe can use.

C3. LinkedIn share-URL fallback

The URL:

https://www.linkedin.com/sharing/share-offsite/?url=...

is a composer/deep-link fallback, not server-side posting. The actual UX is: LinkedIn opens a share composer, the user confirms the audience/text, and the user clicks Post. LinkedIn Help's own "share articles or links" instructions require the user to start a post, paste or confirm the content, choose visibility, and click Post.  ￼

So the share URL can support a "one-click review" workflow, but it cannot silently publish scheduled posts on behalf of the user.

C4. Browser automation / scraping / session-cookie tools

LinkedIn's rules are direct: members are not allowed to use third-party software, browser extensions, bots, or automation that scrapes, modifies LinkedIn's appearance, or automates activity; LinkedIn says restricted accounts should disable such software. LinkedIn's prohibited-software page also says such tools can risk restriction, shutdown, or becoming non-operational as LinkedIn improves defenses.  ￼

Tool/category  Honest assessment  Risk
PhantomBuster  Public docs describe using browser/session state and LinkedIn session cookies/magic links to perform actions as the user. This is classic gray-area automation.  5/5
Linked Helper  Widely marketed as LinkedIn automation. I did not find official LinkedIn partner proof. Treat as browser/desktop automation risk.  4.5/5
Dux-Soup  LinkedIn automation category; no official LinkedIn partner proof found in my search.  4.5/5
Expandi  Public product docs describe automated LinkedIn campaign actions, conditions, Smart Inbox, InMail/email follow-up, and campaign flows.  4/5
Closely  LinkedIn sales automation category; no official partner proof found.  4/5
HeyReach  Explicitly manages LinkedIn senders, limits, rotation, API/webhooks, and agency automation. Useful, but not an official LinkedIn API path.  4/5

PhantomBuster's own docs describe LinkedIn session handling, browser extension/session detection, li_at cookie use, and actions performed "as if manual." That is materially different from OAuth with LinkedIn-approved APIs.  ￼

C5. Unipile

Unipile is not the clean MDP workaround it may appear to be. Its pricing page supports LinkedIn, WhatsApp, Instagram, Telegram, Gmail, Outlook, IMAP, and calendars, and prices by linked identity/account. But the crucial disclosure is that Email/Calendar use official APIs, while LinkedIn, WhatsApp, and Instagram operate through reverse engineering. Unipile's legal page also says it is not affiliated with, endorsed by, or sponsored by LinkedIn.  ￼

Provider  Claim  Reality for DearMe  Verdict
Unipile  Unified API with LinkedIn support  LinkedIn path is explicitly not official; reverse-engineered  Avoid as primary LinkedIn posting path

⸻

D. Polsia competitive recon

I could not prove Polsia's channel stack from public sources. The safest conclusion is: Polsia appears to run AI-driven marketing/cold outreach/social workflows, but I found no public proof that it has LinkedIn MDP, Gmail CASA, or a posting-as-a-service intermediary contract.

Question  Finding  Confidence
Is Polsia using its own Twitter dev app, pool accounts, or posting-as-a-service?  Unclear. Public materials show marketing/social/cold outreach features, but not the posting infrastructure.  Low
Did Polsia get LinkedIn MDP?  I did not find Polsia in LinkedIn partner-directory searches or public proof of MDP. That is not definitive.  Medium-low
How is Polsia handling Gmail/CASA?  Unclear. Public snippets say Polsia may send emails on behalf of users and Product Hunt material references provisioned email addresses/APIs, but not Gmail OAuth versus ESP/mailbox provisioning.  Low
Any ToS violations or bans reported?  I found no public platform-ban report. I did find public spam/deliverability concerns and a third-party security/privacy allegation.  Medium

Public Product Hunt material describes Polsia as "AI that runs your company while you sleep," including planning, coding, marketing, operations, inbox/VC workflows, and claims of hundreds of companies/ARR. Product Hunt comments also mention cold outreach tasks, a $49/mo model, web server/database/email/API provisioning, and that users own/export data.  ￼

A public LinkedIn post by Polsia's founder described Polsia as a "spam machine" problem at scale and announced limits such as two outreach emails per company per day and 500 maximum outreach emails per day across the platform. That is useful competitive evidence, but it does not prove the underlying email provider or Gmail/CASA status.  ￼

A third-party SiteBloom post alleged that Polsia exposed live user chats and sensitive operational data. I would treat that as a public allegation requiring independent verification, not as proven fact.  ￼

⸻

E. AI agent toolkit / "agent platform" services

These tools are useful for agent orchestration and OAuth management, but most do not solve the hard platform-approval problem. They are closer to Nango/Composio/Pica-style managed auth/tooling than to "Ayrshare for posting."

Provider  Do they post from end-user Twitter/LinkedIn?  Are they the verified platform app?  Pricing  Risk  Verdict
Composio  Provides tools/OAuth across many apps; exact write scopes vary by integration  Generally middleware/managed OAuth, not a magic MDP/CASA bypass  Free 20k calls; $29/mo 200k calls; $229/mo 2M calls  3/5  Useful agent-tool layer, not channel-compliance solution
Arcade  Auth/runtime for user-specific actions; examples include Gmail and references to Twitter/LinkedIn authentication  Auth/tool runtime; does not remove need for platform permissions  Pricing not fully verified from fetched docs  3/5  Useful for permissioned agent actions, not an A provider
Pica / One  Integrations to 200+ tools; AuthKit for user connections  Managed auth/integration layer, not verified social posting intermediary  Free; Starter $29; Pro $199; Enterprise custom  3/5  Good integration fabric, not LinkedIn MDP workaround
Toolhouse  AI worker/tool platform  No proof it solves Twitter/LinkedIn posting approvals  Pricing not fully verified  3.5/5  Not relevant as channel infrastructure
Latitude  Agent observability/evals/traces  No  Pricing not relevant here  2/5  Useful for agent QA/monitoring only
Trigger.dev  Workflow/orchestration, schedules, retries, background jobs  No  Free/Hobby $10; Pro $50 plus compute/run pricing  2/5  Excellent orchestration layer after channels are solved

⸻

F. Risk table for posting-as-a-service candidates

Provider  Suspension blast radius  Funding / durability signal  Pricing predictability  White-label / sublicense compatibility  Risk  Mitigation
Ayrshare  If Ayrshare's app/API access is suspended on a network, all DearMe users on that network may go dark. Mitigate with Buffer/native fallback.  Mature docs, status page, broad platform coverage, clear Business/Enterprise model.  ￼  Clear profile-tier pricing; not cheapest but predictable.  ￼  Business model is explicitly SaaS/product multi-user.  ￼  2.5
Buffer  LinkedIn/X posting less likely to be summarily shut down because official posture is strong, but API beta/product dependency remains.  Established brand; official LinkedIn partner.  ￼  Per-channel ladder predictable; old API closed, new API beta creates roadmap risk.  ￼  Need explicit API/embedded terms.  2.5–3
Zernio/Late  High if their platform credentials/scopes are the shared core.  Active 2026 docs/SDK/pricing; claims 2M+ posts and 99.7%+ uptime.  ￼  Very cheap per-account tiers; X pass-through adds variability.  Need written rights for embedded user-facing product.  4
PostPeer/PostForMe/bundle.social/Outstand  High until proven otherwise.  Real products, but public proof of official LinkedIn status is thin.  ￼  Low headline prices; X economics/overages/custom terms can change materially.  Must confirm whether you can sublicense to DearMe users.  4–4.5
Postiz  Moderate if using hosted Postiz; self-host pushes platform-app burden back to you.  Strong OSS/product momentum; new Direct Integration announced in 2026.  ￼  Plans clear; enterprise/white-label availability unclear.  ￼  Hosted OAuth may fit, self-host does not solve verification.  3.5–4
Hootsuite/Sprout/Sprinklr  Lower platform-suspension risk, higher commercial/product-fit risk.  Established official partners.  ￼  Enterprise pricing can be opaque and contract-heavy.  Often not designed for invisible embedding.  3
Unipile/browser automation tools  Very high; LinkedIn enforcement can restrict users or make tools nonoperational.  ￼  Real companies/tools, but gray-area mechanism.  Often predictable SaaS pricing, unpredictable enforcement cost.  Legal/TOS risk likely incompatible with a mainstream consumer promise.  5

⸻

What I'd do if I were building DearMe

First 100 paying users

Social posting

Use Ayrshare as the primary social posting layer for LinkedIn, Facebook, Instagram, TikTok, YouTube, and Threads. Use its user-profile model so each DearMe user connects their own social accounts and keeps account ownership. Posts go to the user's own handle/profile/page, so followers remain with the user if they leave; DearMe or Ayrshare losing access only stops future publishing.  ￼

Do not rely on Ayrshare for X. Apply for X API access immediately and budget for X as a native integration, because Ayrshare now requires customer-owned X OAuth credentials.  ￼

Put Post for Me and PostPeer behind a diligence gate and feature flag. Before production use, require written answers on: official partner status, exact OAuth app owner, LinkedIn scopes, app-suspension blast radius, rate limits, indemnity, white-label/subprocessor terms, and platform-ban incident history. Their public docs match your architecture, but lack the official-partner proof I would want for a user-owned LinkedIn product.  ￼

Keep Buffer as the first official LinkedIn fallback. It is listed in LinkedIn's partner directory and supports LinkedIn profile/Page scheduling. It is not the clean embedded API you want, but it is credible continuity if the API-first provider fails.  ￼

Avoid Unipile, PhantomBuster, Linked Helper, Dux-Soup, Expandi, HeyReach as core infrastructure for user-owned LinkedIn accounts. They may work operationally, but they put the user's professional identity at risk under LinkedIn's automation rules.  ￼

Cold email

Use Smartlead or Instantly as the cold-outbound engine. Both are built around mailbox connection, warmup, sender rotation, replies, bounces, and API/webhook automation. Start with low per-user volume, for example 5–15/day/user, then graduate only when bounce/complaint/reply metrics are healthy.  ￼

Use Resend, Mailtrap, or Mailgun for DearMe's own transactional email and possibly carefully controlled user-domain sends. Do not use them as the main cold-outreach sequencer unless DearMe builds suppression, warmup, throttling, mailbox reputation, and bounce governance itself.  ￼

Do not promise "send from your Gmail through our email API." Instead, offer:

1. Connect your mailbox through Smartlead/Instantly.
2. Use a custom outbound domain/subdomain with DNS authentication.
3. Set replies to land in the user's inbox through Reply-To, forwarding, or sequencer inbox sync.

Calendar

For the MVP, use a scheduling layer or confirmation workflow rather than direct silent Google Calendar writes. For direct calendar-event creation, apply for Google OAuth verification in parallel and minimize scopes. Google's current scope docs still classify many Calendar/Gmail scopes as sensitive or restricted, and restricted scopes can trigger verification/security review.  ￼

Stripe

Use Stripe Connect directly. Stripe's Standard connected account model is already designed for a user-owned Stripe account relationship, with the connected account able to access Stripe Dashboard and process charges. OAuth is not the recommended new-platform path; Stripe recommends Connect Onboarding for Standard accounts.  ￼

Scaling past 1,000 users

Apply for native platform access from day one, even if intermediaries get the MVP live:

Native API/application  Why apply in parallel
LinkedIn Marketing Developer Platform / Community Management  Strategic bottleneck; intermediaries are a single point of failure.
Meta App Review + Business Verification  Ads, Pages, Instagram publishing, comments, and webhooks matter at scale.
X API  Intermediary coverage is already breaking into BYO credentials.
Google OAuth verification/CASA path  Calendar/Gmail direct functionality becomes strategically important.
TikTok Content Posting API  Needed for durable video workflows.
YouTube Data API  Needed for video posting, metadata, and analytics.
Stripe Connect  Use natively from the beginning.

At 1,000+ users, split the stack:

Channel  1,000-user architecture
LinkedIn  Keep Ayrshare/official partner fallback, but pursue native MDP or enterprise contract with official partner.
X  Native DearMe X app/API.
Meta/IG  Move toward native Meta app after verification; keep Ayrshare fallback.
TikTok/YouTube  Native or Ayrshare depending volume and video needs.
Email  Keep Smartlead/Instantly for cold, but build internal deliverability controls; use SES/Mailgun/Mailtrap/Resend for transactional/user-domain infrastructure.
Calendar  Native Google/Microsoft calendar or scheduling partner.
Stripe  Native Stripe Connect.

Ballpark infra cost

These are channel-infrastructure estimates only. They exclude LLM inference, Sora/video generation, ad spend, data enrichment, proxies, human review, and support.

Scale  Social posting  Cold/email infra  Total channel infra estimate  Notes
100 users  ~$1.2k–$2.5k/mo  ~$600–$1.3k/mo  ~$2k–$4k/mo  Ayrshare Business plus X native/API; Smartlead/Instantly plus mailboxes/domains; Resend/Mailtrap/Mailgun for product email.
1,000 users  ~$5k–$15k+/mo  ~$6k–$15k+/mo  ~$12k–$35k+/mo  Ayrshare becomes custom above published 500-profile math; mailbox costs dominate cold email.
10,000 users  ~$25k–$80k+/mo  ~$50k–$120k+/mo  ~$75k–$200k+/mo  Native APIs and internal deliverability become mandatory; 9M cold emails/mo is a major compliance/reputation problem.

The first 100-user stack I would ship is:

Function  Provider
Social posting primary  Ayrshare
LinkedIn official fallback  Buffer, with Hootsuite/Sprout/Sprinklr evaluated for enterprise continuity
Experimental social API fallback  Post for Me or PostPeer, only after diligence
X  DearMe native X API
Cold outbound  Smartlead primary, Instantly backup
Product/transactional email  Resend or Mailtrap; Mailgun if you want more mature email infra knobs
Calendar MVP  Scheduling-link/confirmation workflow; native Google verification in parallel
Payments  Stripe Connect Standard/Express
Workflow orchestration  Trigger.dev or equivalent job system
Agent auth/tool layer  Composio/Pica/Arcade only where they simplify integrations, not as compliance bypasses

The main product decision is whether DearMe is willing to accept intermediary platform risk for speed. For the first 100 users, that trade is rational. Past 1,000 users, LinkedIn, X, Meta, Google, and Stripe should be treated as native strategic integrations, with intermediaries retained only as fallback and load-shedding paths.

---

## Run 3

Executive read

The cleanest answer is not "use OAuth middleware." OAuth middleware does not remove platform verification risk. The viable architecture for DearMe is:

1. Social posting: use a true posting intermediary for the first 100 users, with Ayrshare as the most credible "developer API + user-owned social accounts" option I found. Keep Buffer / Hootsuite / Sprout / Sprinklr in the category of "official LinkedIn-capable platforms," but they are mostly workflow products or enterprise APIs, not ideal invisible infrastructure.
2. LinkedIn: there is no low-risk magic bypass. Publicly verifiable official LinkedIn partner coverage exists for Buffer, Hootsuite, Sprout, Sprinklr. I did not find public LinkedIn Marketing Partner listings for Ayrshare, Zernio/Late, Postiz, PostPeer, PostForMe, Socialync, Taplio, Hypefury, Typefully, or Unipile. LinkedIn's own docs require the Share product and w_member_social for member-profile posting, and LinkedIn explicitly prohibits bots, browser extensions, scraping, and automated posting/liking/commenting outside approved APIs.  ￼
3. Email: do not try to send "from user@gmail.com" through SendGrid/Resend/Mailgun/etc. Use user-owned domains with SPF/DKIM/DMARC and Reply-To routing, or use cold-outbound platforms like Smartlead or Instantly where the user connects real mailboxes. Google has tightened Workspace basic-auth access, and Gmail sender rules require authentication/alignment that normal ESPs cannot provide for gmail.com From addresses.  ￼
4. Stripe: use Stripe Connect directly. This is already the verified intermediary model.
5. Calendar: use Nylas or Cal.com Platform to launch quickly, but still apply for Google OAuth/CASA in parallel if calendar becomes core.
6. Risk: every intermediary is a strategic single point of failure. You should build DearMe behind an internal "channel adapter" abstraction so you can swap Ayrshare ↔ Buffer ↔ native APIs ↔ share-URL/manual fallbacks without rewriting agents.

Risk score below: 1 = low, 5 = high.

⸻

A. Posting-as-a-service: ranked provider table

Assumption for cost: 100 users × 2 posts/day × 30 days = 6,000 posts/month/platform. Across 3 social platforms, that is 18,000 posts/month. Where pricing is by connected channel, I assume 100 users × 3 channels = 300 channels. Where pricing is by user/profile, I assume 100 active end-user profiles.

Rank  Provider  Coverage that actually matters  End-user authorization  Official platform evidence  Approx. 100-user cost  Time-to-launch  Risk  Verdict
1  Ayrshare  Strongest fit for DearMe: unified API for X, LinkedIn, Instagram, Facebook, TikTok, YouTube, Threads, Reddit, Pinterest, Google Business, etc. Also supports comments, DMs for some networks, analytics, and Facebook ads/boosting.  ￼  End user connects accounts through Ayrshare Social Connect / JWT flow; your app stores Ayrshare profileKey per user.  ￼  Ayrshare says it uses official APIs/partnerships, but I did not find it in LinkedIn's public Marketing Partner directory.  Business: $599/mo for first 30 profiles + 70 × $8.99 ≈ $1,228/mo. Add Max Pack $300/mo if needed; FB boosted posts add-on $100/mo.  ￼  This week  2.5  Primary social API for first 100, with LinkedIn-specific risk disclosure. Best product fit.
2  Buffer API / Buffer partner route  X, LinkedIn profile/page, Facebook, Instagram, TikTok, YouTube, Threads, Pinterest, Bluesky, Mastodon, Google Business.  ￼  User connects channels to Buffer; API is currently beta/new API roadmap. Existing old API is not accepting new developer applications.  ￼  Verified LinkedIn Marketing Partner; Buffer says LinkedIn posting through Buffer uses APIs and does not violate LinkedIn Terms.  ￼  Per-channel pricing. 300 channels: Essentials roughly $445/mo, Team roughly $755/mo, using public tier ladder.  ￼  1–4 weeks, depending API beta access  2.5–3  LinkedIn fallback / strategic partner target. Better official posture than most, weaker embedded-API maturity.
3  Zernio / Late.so  Claims one API for 15 platforms including Instagram, TikTok, YouTube, LinkedIn, X, Facebook, Threads, Bluesky, Reddit, Snapchat, Telegram, WhatsApp, Google Business; Python SDK has OAuth/connect, inbox, ads, engagement endpoints.  ￼  Zernio says developers do not need to create platform apps; it handles developer apps, approvals, and quota limits.  ￼  I did not verify LinkedIn official partner listing.  Pricing is per connected account: first two free, then $6/account for 1–10, $3 for 11–100, $1 for 101–2000; X costs are pass-through. 300 channels ≈ $518/mo + X pass-through, assuming cumulative tiering.  ￼  This week  4  Promising secondary API, but do not make it your only LinkedIn path without contractual proof of platform status/scopes.
4  PostPeer  Unified posting API for X, Instagram, YouTube/Shorts, Facebook, TikTok, Threads, Pinterest, LinkedIn, Bluesky.  ￼  Claims it handles OAuth, token refresh, and platform approvals.  ￼  I did not verify official LinkedIn partner listing.  Credits model. Pro $120/mo annual gives 20,000 credits; most posts are 1 credit, but X text is 5 credits and X posts with URLs are 50 credits. DearMe with X can blow past Pro quickly.  ￼  This week  4  Fallback / experiment. Attractive price, but X-credit economics and official-status uncertainty are major issues.
5  PostForMe  API supports TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, YouTube.  ￼  Pricing page says both "bring your own social developer credentials" and "use our social media developer credentials." That is relevant but requires contract confirmation.  ￼  I did not verify official LinkedIn partner listing.  Listed plan includes 1,000 successful posts/mo; public overage is not cleanly self-serve. Naive extrapolation: ~$180/mo for 18k posts, but likely custom.  ￼  This week  4  Cheap fallback candidate, not enough public proof for primary.
6  Postiz Cloud / Direct Postiz Integration  X, LinkedIn, Instagram, TikTok, YouTube, Threads, Reddit, Facebook, Pinterest.  ￼  New Direct Postiz Integration lets apps act on behalf of Postiz users through OAuth. Self-hosted mode requires your own platform apps.  ￼  Hosted Postiz says it uses official, platform-approved OAuth and does not scrape/automate, but I did not verify LinkedIn partner listing.  ￼  Enterprise Growth is listed at $400/mo for 500 channels, but page also indicates some enterprise/white-label availability uncertainty. API rate limit is 30 requests/hour unless batching.  ￼  1–2 weeks  3.5–4  Good open-source/agent ecosystem candidate, but hosted API limits and enterprise availability need diligence.
7  Hootsuite  Official workflow product for scheduling, publishing, engagement, DMs, analytics, ads/boosting across LinkedIn and other networks.  ￼  User connects accounts inside Hootsuite; API access is enterprise/partner-style, not obviously embedded SaaS infrastructure.  Verified LinkedIn Marketing Partner and X Official Partner.  ￼  Public pricing is partially obscured/custom for scale. Likely enterprise, not <$1k/mo.  2–8 weeks  3  Enterprise fallback, not first-choice invisible API.
8  Sprout Social  Strong official LinkedIn product; API has publishing endpoints, but current docs say create-publishing-post creates a Draft status post, not full autonomous publish.  ￼  User/org connects through Sprout; API token created in Sprout.  ￼  Verified LinkedIn Marketing Partner.  ￼  Advanced plan $399/seat/mo; API on Advanced. Scale cost depends seat model and connected profiles.  ￼  2–6 weeks  3.5  Useful for governed publishing workflows, weak fit for agentic headless posting.
9  Sprinklr  Enterprise publishing, engagement, ads, governance across many channels; LinkedIn Page/Advertising integrations.  ￼  Enterprise implementation.  Verified LinkedIn partner and X Official Partner.  ￼  Public pricing not posted; third-party 2026 estimates place enterprise contracts around tens of thousands/year plus implementation. Treat as $50k+/yr.  ￼  4–12 weeks  3  Too heavy for first 100, plausible enterprise/resilience path later.
10  Phyllo Publish API  Good creator-account infrastructure; Publish API publicly announced for TikTok first, with Instagram/YouTube discussed as future/soon. Its coverage page lists LinkedIn as Identity/Engagement, not Publish.  ￼  Creator connects account through Phyllo; app uses PUBLISH.CONTENT where supported.  ￼  Phyllo references platform partnerships/app approvals generally, but not a DearMe LinkedIn-posting solution.  ￼  Custom quote.  2–6 weeks  3.5  Use for creator data / TikTok-style publishing, not core LinkedIn/X posting.
11  bundle.social  Unified social API across Facebook, Instagram, X, TikTok, LinkedIn, YouTube, Threads, Bluesky, Reddit, etc.  ￼  Public docs emphasize connecting accounts/API; I did not verify "they hold all verified apps."  No verified LinkedIn listing found.  18k posts/mo requires Business 100k-post plan: $400/mo.  ￼  This week  4  Backup experiment, not primary until platform-approval posture is proven.
12  Outstand  $0.01/post API for X, LinkedIn, Instagram and others.  ￼  Includes BYO credentials language, so it is not clearly a pure intermediary.  ￼  No verified LinkedIn listing found.  18k posts ≈ $175/mo after included 1k posts.  This week  4.5  Avoid as primary until auth model is clarified.
13  Socialync / Blotato / Upload-Post  Real 2025–2026 social API/MCP-style products claiming multi-platform posting. Socialync claims official APIs and LinkedIn Marketing API use; Blotato offers API+MCP; Upload-Post advertises whitelabel API.  ￼  Mostly user connects accounts through their dashboards/API.  I did not verify official LinkedIn partner listings.  Socialync: $40/profile/mo ⇒ ~$4,000/mo for 100 users. Blotato: 300 accounts likely custom/agency. Upload-Post unclear.  This week to 4 weeks  4–4.5  Evaluate only as tertiary redundancy.
14  Loomly / Publer / MeetEdgar  Useful social schedulers; MeetEdgar publicly supports many networks including LinkedIn, X, Instagram, TikTok, YouTube, etc.  ￼  End-user/dashboard-first.  No public embedded API evidence found in this pass.  SaaS seat/account pricing, not suitable for DearMe backend without private API.  N/A  4  Avoid for infrastructure unless private partner API is offered.

A. Important channel-specific notes

Media support: Ayrshare supports media, LinkedIn documents, and broad network posting; its LinkedIn docs include document constraints for PDF/PPT/DOC-style posts.  ￼ Buffer supports images, videos, first comments, LinkedIn documents/PDFs, and scheduling limits; it notes a LinkedIn daily posting limit of 50 posts per 24 hours.  ￼

DMs/replies: Ayrshare explicitly exposes comments/DMs for selected networks and messaging support for Instagram, Facebook, and X.  ￼ Hootsuite and Sprout are stronger for inbox/engagement workflows, but less clean as embedded invisible APIs.  ￼

Status/SLA: Ayrshare has a public status page showing current operational status and network-level historical uptime; its incident history includes a March 2026 Meta/Instagram publishing incident related to Meta token behavior.  ￼ Most newer API vendors either do not expose enough status history publicly or require customer reference checks.

User ownership: for the OAuth-style providers above, the user's social account remains the user's account. If DearMe or the intermediary is disconnected, the user keeps their handle/followers/content history. What you lose is posting access. Ayrshare's multi-user docs also describe deleting a user profile from Ayrshare when a user leaves.  ￼

⸻

B. Cold outbound email infrastructure

B1. Transactional/custom-domain email providers

For DearMe, this route means: each user uses a custom domain or subdomain, configures SPF/DKIM/DMARC, and DearMe sends through an ESP. This can avoid Gmail CASA, but it does not preserve true Gmail identity for user@gmail.com.

Rank  Provider  Fit for 1:1 cold outreach  Domain-auth UX  Reply handling  Cost for 90k emails/mo  Warmup  Risk  Verdict
1  Mailgun  Best fit among classic ESPs for multi-tenant sending because it has mature domain/auth, inbound, suppression, reputation, dedicated IP, and warm-up features.  ￼  Good for developers; nontechnical users still need DNS guidance.  Inbound routes/webhooks; Reply-To can point to user inbox.  Scale 100k/mo: $90/mo.  ￼  Dedicated IP warm-up features exist, but not "cold outreach magic."  2.5  Primary custom-domain ESP if you want control.
2  Resend  Excellent developer UX; good for productized transactional-style sending, less proven as cold-outreach infra.  ￼  Strong domain UX; Scale includes 1,000 custom domains, SPF/DKIM/DMARC, suppression, webhooks.  ￼  Inbound supported; Reply-To can route to user.  Scale 100k/mo: $90/mo, plus optional dedicated IP $30/mo for qualifying Scale usage.  ￼  Resend says it warms/monitors/autoscales dedicated IP for qualifying customers.  ￼  2.5–3  Best developer UX, good for first 100 custom-domain senders.
3  Mailtrap  Strong developer/test-to-send platform; has SPF/DKIM/DMARC validation, webhooks, dedicated IPs, auto IP warm-up.  ￼  Good technical UX; still DNS-heavy for consumers.  Webhooks and SMTP/API logs.  ￼  Basic 100k/mo: $30/mo.  ￼  Auto IP warm-up mentioned.  ￼  3  Low-cost backup ESP.
4  Amazon SES  Cheapest and scalable, but worst consumer UX. You will build all onboarding, reputation monitoring, suppression, tenant isolation, and support.  DNS-heavy; developer-grade.  Inbound receiving exists; Reply-To can route to user; custom MAIL FROM supports alignment.  ￼  90k outbound ≈ $9/mo base, before VDM, tenants, dedicated IP, or support add-ons.  ￼  Managed dedicated IP is available but not cold-outreach-specific.  3.5  Use later for cost control, not first 100 unless you have deliverability ops.
5  Postmark  Excellent deliverability for transactional mail, but it strongly separates transactional vs broadcast use cases; cold outreach is not its natural fit.  ￼  Very good.  Inbound, bounces, spam complaints, tracking.  Need plan at 90k; dedicated IP starts only at 300k/mo.  ￼  No cold warmup emphasis.  3  Avoid for cold outbound, use for true transactional product mail.
6  SendGrid  Mature but reputation varies by shared-IP pool and customer segment; okay for transactional/marketing if carefully managed.  Good but enterprise-feeling.  Inbound Parse + webhooks.  Pro starts at $89.95/mo; exact 90k tier depends current volume selection.  ￼  Dedicated IPs on Pro/Premier.  3  Acceptable, not best for 1:1 cold.
7  Brevo  Broad marketing/transactional platform, REST APIs, SMTP, webhooks.  ￼  User-friendly for marketers.  Transactional webhooks.  Pay-as-you-go / plan-dependent.  Not a cold warmup platform.  3.5  Fine for marketing/transactional, not preferred for cold.
8  Customer.io  Powerful messaging platform; transactional plans are built around product-triggered mail, not user-by-user cold outreach.  ￼  Strong for SaaS teams, not end-user DNS onboarding.  Webhooks, transactional API, custom SMTP.  Essentials $100/mo includes 1M emails and 5k profiles.  ￼  No cold warmup.  3.5  Use for DearMe lifecycle messaging, not user cold outreach.
9  Loops  Great product/lifecycle email for startups; not a cold-outreach infra layer.  ￼  Good product UX.  Limited relative to cold infra.  5–10k contacts $99/mo; transactional included.  ￼  No.  3.5  Use for your app's own emails, not DearMe user outreach.

Can you send from user@gmail.com through Resend/Postmark/SendGrid/Mailgun?

Practically: no, not in a legitimate aligned way. Gmail sender rules care about SPF/DKIM/DMARC authentication and alignment; an ESP cannot DKIM-sign as gmail.com for your user. Google has also moved Workspace access away from basic username/password and toward OAuth; app-password paths are limited, revocable, and unavailable in several account configurations.  ￼

The workable options are:

* User-owned custom domain: name@userdomain.com, ESP handles sending, Reply-To points to user inbox.
* Connected real mailbox via cold-outbound platform: Smartlead/Instantly/Lemlist/etc. send through the user's mailbox infrastructure.
* Native Gmail API/SMTP OAuth: requires Google verification/CASA once you exceed limited testing.

B2. Cold-outbound platforms with API/warmup

Rank  Provider  API-driven?  Mailbox connection  Warmup/deliverability  Cost fit for 100 users / 90k emails/mo  AI outbound policy evidence  Risk  Verdict
1  Instantly  Yes; API v2 has accounts, campaigns, emails, webhooks, scopes.  ￼  Users can connect sending accounts; public pricing emphasizes unlimited email accounts.  ￼  Unlimited warmup on paid plans; high-volume plans available.  ￼  Hypergrowth $97/mo includes 100k emails, enough for 90k/mo.  ￼  I did not find a crisp public AI-generated-outbound policy in this pass.  3  Best low-cost cold stack for first 100, but monitor compliance/reputation closely.
2  Smartlead  Yes; public pages mention full API/webhooks on higher plans.  ￼  Unlimited mailboxes/warmups language; built for multi-mailbox sending.  ￼  Strong warmup/reputation focus, mailbox rotation, dynamic ESP matching.  ￼  Pro $174/mo for SmartDelivery; exact cold-email sending plan may differ by bundle.  ￼  I did not find a clear public AI-outbound policy.  3  Best deliverability-oriented option, especially if API/white-label terms are acceptable.
3  Reply.io  Yes; Reply API is explicitly positioned for adding email sequences to your own product, with users connecting personal/business accounts.  ￼  User connects mailbox.  Warmup and multichannel sales engagement features.  Public plans: Email Volume $59/user/mo; Multichannel $99/user/mo. For 100 users this is $5.9k–$9.9k/mo before custom embedded pricing.  ￼  Not verified in this pass.  3  Great embedded API concept, expensive at 100 users unless partner pricing.
4  Lemlist  Yes; API docs cover campaigns, leads, mailboxes, MCP/API routes.  ￼  Gmail/LinkedIn-style sales workflow; per-user seats and senders.  Deliverability hub and warmup booster.  ￼  Email Pro annual ≈ $63/user/mo; 100 users ≈ $6.3k/mo plus sender add-ons.  ￼  Not verified in this pass.  3.5  Strong sales tool, poor infra economics.
5  Mailshake  API status not fully verified in this pass; product supports outreach, warmup, rotation, unified inbox.  ￼  Sender accounts by plan.  Unlimited warmup/verification on paid plans.  Email Outreach annual $45/user/mo; 100 users ≈ $4.5k/mo.  ￼  Not verified.  3.5  Good sales UI, not first-choice backend.
6  Woodpecker  API/webhooks/MCP listed as paid add-on.  ￼  Google/Microsoft mailboxes and warmup add-ons.  Deliverability features and OAuth2/Google compliance claims.  ￼  Pricing depends base plan + $20 API + $5/warmup/mailbox + mailbox costs.  Not verified.  3.5  Niche fallback.
7  Apollo  Has public/advanced API, but it is primarily prospecting/sales engagement, not invisible infrastructure.  ￼  User-side sales workflows.  Varies by plan.  Not cleanly priced for embedded DearMe use.  Not verified.  4  Use for data/prospecting only if compliant; not core sending.
8  HeyReach  API/webhooks advertised; focused on LinkedIn outbound and multichannel integration with Instantly/Smartlead.  ￼  Connects/rotates LinkedIn sender accounts.  ￼  LinkedIn-focused, not email-deliverability-first.  Starts around $79/mo, scales by sender selector.  ￼  Not verified.  5 for LinkedIn automation  Avoid for core LinkedIn automation; consider only with explicit user consent and risk disclosure.

⸻

C. LinkedIn-specific: is there any way around MDP?

C1. Officially approved LinkedIn paths I could verify

LinkedIn's official Share docs require OAuth, the Share product, and w_member_social for posting to member profiles; the API creates UGC posts through LinkedIn endpoints.  ￼ LinkedIn's product catalog describes Marketing Tools → Share as "post content to a member profile."  ￼

The public LinkedIn Marketing Partner directory exists and is the official place to verify partners.  ￼ In this pass, I verified public LinkedIn partner pages for:

Provider  Verified official LinkedIn partner?  What that means for DearMe
Buffer  Yes  Best fit among official-looking lower-market tools. But API is beta/new and not a mature white-label infra product yet.  ￼
Hootsuite  Yes  Strong official publishing/engagement/DM/analytics path, but enterprise/workflow product.  ￼
Sprout Social  Yes  Official LinkedIn coverage, but current API publishing endpoint creates drafts.  ￼
Sprinklr  Yes  Enterprise-grade; likely too heavy early.  ￼

I did not find public LinkedIn Marketing Partner listings for Ayrshare, Zernio/Late, Postiz, PostPeer, PostForMe, Socialync, Typefully, Hypefury, Taplio, AuthoredUp, or Unipile. That is not proof they lack permissions, but it means you should require written proof of scopes, partner status, and sublicensing rights before relying on them for LinkedIn.

C2. How tools like Buffer, Hootsuite, Sprout, Taplio, Hypefury, AuthoredUp probably post

Tool  Likely mechanism  Evidence / caution
Buffer  Official LinkedIn API  Buffer says LinkedIn connections use APIs and do not violate LinkedIn Terms; supports profiles/pages, not groups.  ￼
Hootsuite  Official LinkedIn partner/API  Official LinkedIn partner page describes publishing, engagement, DMs, analytics, and promoted posts.  ￼
Sprout Social  Official LinkedIn partner/API  Official partner page; API currently draft-oriented for publishing.  ￼
Sprinklr  Official LinkedIn partner/API  Official LinkedIn partner result covers Page and Advertising integrations/governance.  ￼
Typefully  Likely API for supported LinkedIn operations, but I did not verify partner listing  Typefully supports LinkedIn cross-posting/standalone posting; docs note LinkedIn API limits around personal mentions.  ￼
Hypefury  Claims LinkedIn scheduling/cross-posting  Hypefury supports LinkedIn post scheduling and cross-posting threads, but I did not verify LinkedIn partner listing.  ￼
Taplio  LinkedIn-specific SaaS workflow  Taplio is a LinkedIn AI/scheduling/analytics tool; I did not verify public partner listing.  ￼
AuthoredUp  Browser-extension/product analytics style; not official LinkedIn  Its API docs explicitly say it is not affiliated, authorized, endorsed, or officially connected with LinkedIn.  ￼

C3. Share-URL fallback

The fallback URL pattern:

https://www.linkedin.com/sharing/share-offsite/?url=...

is not autonomous posting. It opens LinkedIn's share UX so the user can craft/confirm the share. LinkedIn's Share Plugin docs describe this as a quick way to add LinkedIn sharing to a site, while true automated posting requires the authenticated Share API path described above.  ￼

Practical DearMe UX:

1. DearMe drafts the LinkedIn post.
2. User clicks "Share to LinkedIn."
3. LinkedIn opens a composer.
4. User edits/confirms/clicks Post.

That is safe as a fallback, but it breaks the promise of autonomous posting.

C4. Phantombuster / Linked Helper / Dux-Soup / Closely / Expandi / HeyReach

These are best treated as browser/session automation, not official LinkedIn posting infrastructure. LinkedIn's own policy is explicit: it disallows third-party crawlers, bots, browser extensions, plugins, and software that scrape, modify, or automate activity including sending messages, creating comments, liking, sharing, or resharing; accounts can be restricted or shut down.  ￼

Public evidence is consistent with automation:

* PhantomBuster publishes guidance about pacing, randomized delays, and caps for LinkedIn automation, and separately acknowledges LinkedIn's restrictions on automated access/data collection.  ￼
* Dux-Soup describes itself as LinkedIn lead-generation automation and a Chrome Web Store workflow.  ￼
* Expandi describes itself as a LinkedIn automation tool for automated sequences, connection requests, InMails, and follow-ups.  ￼
* HeyReach centers on connecting and rotating LinkedIn sender accounts.  ￼

For DearMe, I would classify these as risk score 5 for core posting/outreach. They may work tactically, but they are not the foundation for a consumer product that promises safe account ownership.

C5. Unipile

Unipile is real and useful, but its LinkedIn positioning is not the same as "official MDP bypass."

Unipile's pricing FAQ says it supports WhatsApp, LinkedIn, Instagram, Telegram, Gmail/Outlook/IMAP, and Google/Outlook Calendar; it also says official APIs are used for email/calendar and Telegram, while LinkedIn/WhatsApp/Instagram are handled through reverse engineering.  ￼ Its LinkedIn docs describe authenticated-user session access, username/password or cookie/hosted auth paths, and explicitly state Unipile is not a LinkedIn partner/reseller/auth proxy.  ￼

Verdict: powerful but gray-area for LinkedIn. Use only for low-volume, user-consented internal workflows where account-restriction risk is acceptable. Do not make it DearMe's primary LinkedIn posting path.

⸻

D. Polsia competitive recon

Public evidence is thin. I would not draw hard conclusions about their exact infra.

Question  Finding  Confidence
Are they using their own Twitter dev app, pool accounts, or posting-as-a-service?  Uncertain. Public podcast/summary material says Polsia uses AI agents across engineering, marketing, cold outreach, advertising, social media, email, and support, and manages more than 1,100 businesses, but I did not find a public technical disclosure of X/Twitter posting infrastructure.  ￼  Low
Did Polsia get LinkedIn MDP?  No public proof found. I did not find Polsia in the public LinkedIn Marketing Partner directory during this pass. The absence of a listing is not definitive because private/product-specific approvals may not be obvious publicly.  ￼  Low–medium
How are they handling Gmail/CASA?  Uncertain. Public evidence indicates Polsia uses cold outreach/email agents, but I did not find whether they use Gmail OAuth, ESPs, generated domains/mailboxes, or a pooled sending model.  ￼  Low
Any ToS violations or bans publicly reported?  I did not find a public platform-ban report in this pass. I did find a critical third-party SiteBloom report alleging privacy/security exposure in a public dashboard/stream, including emails/messages/ad data, but that is a third-party critique rather than a platform enforcement action.  ￼  Medium for "no ban found"; low for infra details

My read: Polsia's visible product motion looks closer to a pooled/managed SaaS factory than DearMe's "user-owned account" architecture. Do not copy that blindly. DearMe's premise depends on the user keeping their handle, inbox, calendar, Stripe, and social graph.

⸻

E. AI agent toolkit / "agent platform" services

These tools are useful, but most are not verified social-posting intermediaries.

Provider  Can it post to Twitter/LinkedIn from end-user accounts?  Are they the verified app, or do you need yours?  Pricing  Risk  Verdict
Composio  It can connect agents to many tools; managed apps exist for building/iteration.  Composio docs recommend using your own OAuth app in production when users see consent, branding, scopes, and rate limits. So it does not eliminate platform verification for production.  ￼  Search result shows Free, $29/mo, $229/mo, enterprise tiers.  ￼  3.5  Good agent/OAuth middleware; not a DearMe social-posting bypass.
Arcade  Yes for X; docs show X toolkit actions for posting/replying/deleting/searching.  ￼ LinkedIn docs show posting through LinkedIn UGC API with w_member_social.  ￼  For LinkedIn production, docs say you most likely use your own LinkedIn app credentials and add Share on LinkedIn.  ￼  Growth pricing appears usage-based from $25/mo in public search results.  ￼  3.5  Good agent auth/action runtime; not a LinkedIn MDP workaround.
Pica / One  Integration runtime for AI agents; supports connections and API calls.  ￼  Public pricing/docs do not prove they are the verified LinkedIn/X posting app for your users.  Starter $29/mo, Pro $199/mo, Enterprise custom.  ￼  4  Evaluate for workflow plumbing, not platform verification relief.
Toolhouse  Agent backend / MCP / tool execution platform.  ￼  No evidence it solves verified social posting as intermediary.  Not verified in this pass.  4  Not a posting provider.
Latitude  AI agent observability/evals/monitoring.  ￼  Not relevant to social posting verification.  Not central.  2 for observability, N/A for posting  Use for evals if desired, not channels.
Trigger.dev  Workflow/orchestration for long-running jobs; you can call any API.  ￼  You still need the channel API/provider.  Free, Hobby $10, Pro $50.  ￼  2  Excellent job runner; not a connector.

⸻

F. Risks by posting-as-a-service candidate

| Provider | Suspension blast radius | Company/product health signal | Pricing predictability | White-label/sub-license concern | Risk score |
|—|—|—|—|—:|
| Ayrshare | If Ayrshare's app/API access is suspended on a network, all DearMe users on that network may go dark. Mitigate with Buffer/native fallback. | Mature docs, status page, broad platform coverage, clear Business/Enterprise model.  ￼ | Clear profile-tier pricing; not cheapest but predictable.  ￼ | Business model is explicitly SaaS/product multi-user.  ￼ | 2.5 |
| Buffer | LinkedIn/X posting less likely to be summarily shut down because official posture is strong, but API beta/product dependency remains. | Established brand; official LinkedIn partner.  ￼ | Per-channel ladder predictable; old API closed, new API beta creates roadmap risk.  ￼ | Need explicit API/embedded terms. | 2.5–3 |
| Zernio/Late | High if their platform credentials/scopes are the shared core. | Active 2026 docs/SDK/pricing; claims 2M+ posts and 99.7%+ uptime.  ￼ | Very cheap per-account tiers; X pass-through adds variability. | Need written rights for embedded user-facing product. | 4 |
| PostPeer/PostForMe/bundle.social/Outstand | High until proven otherwise. | Real products, but public proof of official LinkedIn status is thin.  ￼ | Low headline prices; X economics/overages/custom terms can change materially. | Must confirm whether you can sublicense to DearMe users. | 4–4.5 |
| Postiz | Moderate if using hosted Postiz; self-host pushes platform-app burden back to you. | Strong OSS/product momentum; new Direct Integration announced in 2026.  ￼ | Plans clear; enterprise/white-label availability unclear.  ￼ | Hosted OAuth may fit, self-host does not solve verification. | 3.5–4 |
| Hootsuite/Sprout/Sprinklr | Lower platform-suspension risk, higher commercial/product-fit risk. | Established official partners.  ￼ | Enterprise pricing can be opaque and contract-heavy. | Often not designed for invisible embedding. | 3 |
| Unipile/browser automation tools | Very high; LinkedIn enforcement can restrict users or make tools nonoperational.  ￼ | Real companies/tools, but gray-area mechanism. | Often predictable SaaS pricing, unpredictable enforcement cost. | Legal/TOS risk likely incompatible with a mainstream consumer promise. | 5 |

⸻

What I'd do if I were building DearMe

First 100 paying users

Social posting stack

* Primary: Ayrshare for X, LinkedIn, Instagram, Facebook, TikTok/YouTube where supported. It is the best match for "DearMe calls an API; user connects their own accounts; provider handles platform app complexity."  ￼
* LinkedIn fallback: Buffer, but only if API beta/partner access supports your exact embedded flow. Buffer's official LinkedIn posture is meaningfully stronger than the newer API startups.  ￼
* Manual fallback: LinkedIn share URL for posts that fail or users who do not want to grant posting access. Treat it as "confirm-to-post," not automation.  ￼
* Do not use as core: Unipile / Phantombuster / Dux-Soup / Linked Helper / Expandi-style browser automation for LinkedIn posting or outbound. It is too directly in the blast radius of LinkedIn's prohibited-software policy.  ￼

Email stack

* For users with custom domains: Resend or Mailgun. Resend has the best developer UX; Mailgun has the more classic deliverability/tenant-infra posture.  ￼
* For "I want cold outreach working now": Instantly or Smartlead. They solve mailbox rotation/warmup better than transactional ESPs.  ￼
* Do not promise sending from user@gmail.com unless you go through Google OAuth/Gmail API or a user-connected mailbox platform. ESPs cannot legitimately send aligned Gmail-domain mail for end users.  ￼

Calendar

* Nylas Calendar API for initial calendar booking. Calendar-only pricing for 100 connected accounts is roughly $152.50/mo under public pricing.  ￼
* Consider Cal.com Platform if you want scheduling UX plus platform APIs, but self-hosting still requires Google credentials for Google Calendar integrations.  ￼

Payments

* Stripe Connect Standard or Express. Stripe already gives the right ownership model: user has their connected Stripe account, Stripe handles onboarding/identity, and DearMe can take application fees where appropriate.  ￼

Scaling past 1,000 paying users

At 1,000 users, do not rely on one social intermediary. Build:

1. Channel adapter layer: publishPost(channel, user, payload) abstracts Ayrshare, Buffer, native API, and manual fallback.
2. Dual social providers: Ayrshare primary, Buffer or another verified partner for LinkedIn fallback.
3. Native API applications in parallel:
    * LinkedIn Share / MDP for w_member_social
    * X API
    * Meta Graph / Marketing API
    * Google OAuth verification/CASA for Gmail + Calendar
    * TikTok Content Posting API
    * YouTube Data API
4. Email split:
    * Custom-domain transactional/outreach via Mailgun/Resend/SES.
    * Higher-risk cold sequences via Smartlead/Instantly until you build mailbox/reputation operations.
5. Deliverability operations:
    * Per-user sending limits.
    * Domain age checks.
    * DKIM/SPF/DMARC validation.
    * Bounce/suppression centralization.
    * Complaint-rate kill switches.
    * Content-risk scoring before send.

Native APIs to apply for in parallel

API  Why still apply
LinkedIn Share / Marketing Developer Platform  This is the bottleneck. Intermediaries are useful, but LinkedIn posting is too strategic to outsource forever.
X API  X costs/rate rules change; having your own path gives you resilience.
Meta Graph + Marketing API  Needed for FB/IG posting and ads; Ayrshare can help early, but ad workflows eventually need direct control.
Google OAuth / CASA  Gmail + Calendar are core identity/workflow surfaces. Avoid CASA early with custom domains, but apply once PMF is real.
TikTok Content Posting API  Needed for direct video publishing at scale.
YouTube Data API  Needed for durable video upload/management.
Stripe Connect  Use natively from day one. No reason to outsource this.

Ballpark monthly infra cost

Excludes LLM inference, Sora/video generation, ad spend, human review, mailboxes, domains, and support.

Scale  Social posting  Email/outbound  Calendar  Payments  Rough monthly infra
100 users  Ayrshare ≈ $1,228/mo; add $300 Max Pack if needed.  ￼  Instantly ≈ $97/mo or Smartlead ≈ $174/mo; Resend/Mailgun custom-domain ESP ≈ $90/mo for 100k emails.  ￼  Nylas Calendar ≈ $152.50/mo.  ￼  Stripe Connect processing/application economics, not fixed infra.  ￼  ~$1.5k–$2.5k/mo
1,000 users  Ayrshare list math ≈ $3.9k/mo before enterprise discount.  Cold platform or ESP likely $600–$2k+/mo, depending mailbox/domain strategy.  Nylas list ≈ $1.5k/mo before volume discount.  Usage-based.  ~$6k–$12k/mo
10,000 users  Ayrshare list math ≈ $26k/mo before enterprise negotiation.  9M emails/mo: SES cheap base, but real ops/reputation/tools likely several thousand/mo+.  Nylas list ≈ $15k/mo before volume discount.  Usage-based.  ~$35k–$80k/mo

Final recommended stack

For a serious DearMe MVP:

Function  First 100 users  1,000+ users
Social posting  Ayrshare primary; Buffer LinkedIn fallback; manual LinkedIn share fallback  Ayrshare + Buffer/enterprise partner + native APIs
LinkedIn  Ayrshare only with explicit user consent and failure fallback; no browser automation  Native LinkedIn application in progress; official partner fallback
Cold email  Instantly or Smartlead for mailbox-based outreach; Resend/Mailgun for custom-domain sending  Hybrid: Smartlead/Instantly for cold workflows, SES/Mailgun/Resend for owned-domain infra
Calendar  Nylas Calendar or Cal.com Platform  Native Google/Microsoft calendar where possible; Nylas as fallback
Payments  Stripe Connect Standard/Express  Stripe Connect direct
Agent tooling  Trigger.dev for jobs; optionally Arcade/Composio for non-core tools  Same, but social/email channels should remain behind your own adapter layer

The highest-risk mistake would be building DearMe around gray-area LinkedIn browser automation. The second-highest-risk mistake would be assuming that "supports LinkedIn" means "officially approved to post to user profiles at scale." For the first 100 users, use Ayrshare to move fast, but start LinkedIn, Google, Meta, X, TikTok, and YouTube native approval tracks immediately so DearMe is not permanently dependent on a single intermediary.
