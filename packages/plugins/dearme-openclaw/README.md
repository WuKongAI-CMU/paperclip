# `@paperclipai/dearme-openclaw`

The backstage OpenClaw plugin projection for DearMe.

## What this package is

DearMe runs on [OpenClaw](https://github.com/openclaw/openclaw) — a local-first, single-user agent runtime that already ships 24+ messaging channels, voice wake, sandboxed sessions, cron, and a skills system.

This package is **not the product**. It is a **mechanical projection** of the runtime source of truth (`DEARME_ROLE_REGISTRY` in `@paperclipai/dearme-agent-prompts`) into the artifact OpenClaw can load: 12 SKILL.md files, 4 bootstrap files, one `openclaw.plugin.json` manifest, and the outbound tool contract consumed by the cloud dispatch path.

```
                                   src/skill-generator.ts (pure)
DEARME_ROLE_REGISTRY  ───────────────────────────▶  generated/skills/dearme-<role>/SKILL.md × 12
                                   src/bootstrap.ts
                            ─────────────────────▶  generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md
```

## What this package is NOT

- It does **not** define prompts. They live in `@paperclipai/dearme-agent-prompts`.
- It does **not** send to external channels by itself. The five outbound tool bindings (`post_x`, `send_linkedin_dm`, `send_email`, `deploy_site`, `create_meta_campaign`) define the plugin/cloud wire contract; the live dispatchers live in `server/`.
- It does **not** implement DearMe cloud endpoints (voice score, opportunities, site host, provider dispatch). That's `server/`.

## Layout

```
dearme-openclaw/
├── openclaw.plugin.json           plugin manifest (id, configSchema, ui hints)
├── src/
│   ├── index.ts                   re-exports
│   ├── skill-generator.ts         registry → SKILL.md (pure, tested)
│   ├── bootstrap.ts               AGENTS/SOUL/IDENTITY/USER (pure, tested)
│   ├── cli/generate-skills.ts     `pnpm generate-skills`
│   └── index.test.ts              contract tests
└── generated/
    ├── skills/dearme-<role>/SKILL.md  × 12   ← committed; what OpenClaw loads
    └── bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md
```

`generated/` is committed on purpose: a registry edit shows up as a reviewable diff in PRs, and OpenClaw can load this package straight from disk without a build step.

## Workflow

After editing `DEARME_ROLE_REGISTRY` in `@paperclipai/dearme-agent-prompts`:

```bash
pnpm --filter @paperclipai/dearme-openclaw run generate-skills
pnpm --filter @paperclipai/dearme-openclaw test
git diff packages/plugins/dearme-openclaw/generated/
```

If the diff is unexpected, the registry was edited; review carefully.

## Architecture

- Full contract: [`docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md`](../../../docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md).
- Layer ownership: [`docs/dearme/PRODUCT-ARCHITECTURE.md`](../../../docs/dearme/PRODUCT-ARCHITECTURE.md) §9.5.
- North star: [`docs/dearme/INDEX.md`](../../../docs/dearme/INDEX.md).

## Doctrine

This package follows the runtime-port doctrine (`PRODUCT-ARCHITECTURE.md` §9.0):

1. **Verbatim prompts.** The generator embeds `spec.prompt` as a string copy. No paraphrase.
2. **Registry is law.** The generator iterates the registry; it never invents a role or skill.
3. **Original UI elsewhere.** The OpenClaw plugin shape (manifest, skill folder, bootstrap files) is the runtime-mechanism layer. Customer-facing surface (workbench, brand site) is built original elsewhere and is not affected by this package.
4. **Useful first.** No consent screens, no throat-clearing. Onboarding provisions private team access and the user's handle, and the team is on.
5. **One dispatch path.** Do not create a second plugin-side sender. Outbound work flows through the shared cloud wrapper: voice gate, approval, channel credential, dispatch, audit, receipt.
