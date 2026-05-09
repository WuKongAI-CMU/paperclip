/**
 * Shared lineage / provenance constants for DearMe role prompts.
 *
 * Every file in this directory ports a research-captured DearMe internal
 * production prompt verbatim with mechanical brand substitutions only:
 *
 *   `Polsia`        → `DearMe`     (display brand)
 *   `polsia`        → `dearme`     (lowercase identifiers / namespaces)
 *   `polsia.com`    → `dearme.app`
 *   `polsia.app`    → `dearme.app`
 *
 * Voice rules, format rules, state machines, tool sequences, rate limits,
 * thresholds, and exact numeric constants are preserved as-is. The
 * production-verified behavior depends on them.
 *
 * These prompts are server-side runtime artifacts the user never sees.
 * `REBRAND-AND-PROVENANCE.md` rules govern customer-facing UI and do not
 * apply to internal runtime prompts.
 *
 * Source archive: `/Users/peter/dearme-archive/prompts/dearme-reference/`
 * (mirrored under DearMe naming).
 */

export const PROMPT_PORT_DATE = "2026-05-09";
export const PROMPT_LINEAGE_TAG = "dearme-runtime-port-v1";
