# Rebrand and provenance guidelines

Date: 2026-05-07
Scope: DearMe (`/Users/peter/dearme`), local product research archives, and the
local assistant baseline archive (`/Users/peter/lindy-extraction`).

简体中文摘要：**`/Users/peter/lindy-extraction` 是内部助手代码基线，可直接复用；不要说「竞品提取」「抓取」。对外产品与文档一律经过改名；禁止复用第三方 logo / 字标 / 带识别度的图片（归档内模板素材仅供离线参考）。DearMe 仓库内落地代码仍须独立撰写并遵守许可证与 PR 说明。**

---

## Purpose

Keep DearMe honest, defensible, and easy to audit. The tree at `/Users/peter/lindy-extraction` is the **internal assistant baseline**: **directly reusable code and patterns** for engineering (see its `README.md`). Do **not** describe it as third‑party “extraction,” “scraping,” or recon output in docs, commits, or agent-facing copy — that narrative is **out of policy**. **Shipped** code inside `dearme` stays independently authored with correct licensing and PR-level lineage where non-obvious.

This file also governs Polsia/Naive/Paperclip/OK Partner-informed DearMe work.
Those inputs are allowed as private product, architecture, and implementation
references, but they do not authorize verbatim proprietary copying, public clone
narratives, or shipping third-party branding/assets.

## Canonical precedence

When DearMe docs conflict, use this order:

1. `REBRAND-AND-PROVENANCE.md`
2. `CODE-PROVENANCE-FACT-CHECK.md` (engineering-evidence addendum to this file)
3. `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`
4. `POLSIA-NAIVE-PM-ANALYSIS.md` (PM / product-architect view of donors)
5. `POLSIA-NAIVE-COMPARISON.md` (architecture-layer comparison of donors)
6. `POLSIA-NAIVE-REUSE-PLAN.md` (implementation-layer reuse plan)
7. `POLSIA-MARKETING-PACKAGING-GUIDE.md`
8. Historical comparison, V3/V4 architecture, and backlog docs

Any older statement that says to copy proprietary prompts/files verbatim, ignore
IP cleanliness, or describe DearMe as a Polsia clone is superseded. The current
posture is: **adapt choreography and reuse permitted/kernel primitives; ship
DearMe-original product code, names, assets, and customer-facing language.**

---

## What the local baseline archive is (and is not)

| Correct framing | Incorrect framing |
|-----------------|---------------------|
| **Internal baseline code** we reuse and rebrand | “We extracted / scraped / reverse‑engineered competitor source into this folder” |
| **Internal reuse library** for patterns, schemas, and architecture reference | Implying DearMe **owns** third-party proprietary bundles outright |
| Source for **ports rewritten** into DearMe modules with rebranding | Shipping competitor logos, wordmarks, or distinctive imagery |

---

## Implementation rules for DearMe

1. **Shipped code paths** inside `dearme` (this repo) must be **written or substantially rewritten here**, with DearMe naming, DearMe APIs, and DearMe assets.
2. **Porting**: If logic is ported from a third-party file, treat it like any other derivation: refactor into DearMe modules, adapt types and boundaries, add tests, and **document the lineage in PR description or code comments where non-obvious** (not necessarily public-facing docs).
3. **Explicit OSS only where license allows**: Components that are genuinely MIT/BSD/APSL and **copied with LICENSE preserved** follow normal open-source hygiene. Example called out elsewhere: omni-dash–style tooling when taken from repos that declare MIT. Do **not** extend that carve-out to Lindy's proprietary web bundle wholesale.

---

## Branding and visual assets — hard stops

Do **not** ship in DearMe UI, emails, exports, or marketing:

- Competitor **logos**, **wordmarks**, or **trade-dress-parity** screenshots as product chrome.
- Files under paths such as
  `/Users/peter/lindy-extraction/11_public_templates/lindy-docs-mdx-source/lindy-brand-assets/`
  `/Users/peter/lindy-extraction/11_public_templates/lindy-docs-mdx-source/images/`
  (use only as **offline visual reference**, not as bundled assets).

**Allowed:** screenshots you take yourself of DearMe beta, DearMe originals, royalty-free imagery, commissioned design.

---

## Naming and hygiene checklist (before merging UI or shared libs)

Use ripgrep (or Cursor search) for obvious donor tokens:

- `lindy`, `Lindy`, `lindy.ai`, `@lindyai`, `chat.lindy.ai`
- Paths or comments that say **"lifted verbatim"** from competitor repos without refactoring

Requirements:

- Packages, routes, CSS variables, and feature flags use **DearMe / Paperclip** naming.
- Analytics and error messages must not expose competitor internals or scraped credentials.

---

## Relationship to donor plans

Architecture donor documents (e.g. `LINDY-ASSISTANT-REUSE-PLAN.md`) describe **patterns and priorities**. This file is the **governance layer**: how we talk about lineage, what we ship, and what stays out of the binary.

When the two conflict on **ownership or branding**, **this document wins**.

---

## Review cadence

- Any PR that introduces agent/workflow/transcript metaphors overlapping Lindy docs should explicitly state **DearMe-original authorship** or **permitted OSS source**.
- Periodic spot-check: random sample of `ui/` files for stray competitor imports/strings.
