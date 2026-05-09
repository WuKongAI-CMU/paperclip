/**
 * DEARME_ROLE_REGISTRY — single typed source of truth for the 12 DearMe roles.
 *
 * Every plugin, route, service, and ticket that asks "which roles does
 * DearMe ship, and what does each one do?" should import this registry
 * rather than restate the answer.
 *
 * Each entry pins a role to:
 *   - its production-verified system prompt (ported verbatim from research)
 *   - the state machines its plugin runtime depends on
 *   - the complexity range / default tier the AI proxy will route on
 *   - the plugin npm package that owns its runtime
 *   - the ticket that owns implementation
 *   - shipped / in-progress / planned status
 *
 * Compliance: the prompt strings come from `./prompts/`. The state-machine
 * names refer to `./state-machines/`. The proxy tool names refer to
 * `@paperclipai/dearme-ai-proxy/functions`. None of this is customer-facing
 * brand surface; runtime-port doctrine governs (see PRODUCT-ARCHITECTURE.md
 * §9.0).
 */

import {
  ADS_MANAGER_PROMPT,
  ADS_MANAGER_ROLE,
  AUDIENCE_CARE_PROMPT,
  AUDIENCE_CARE_ROLE,
  BROWSER_AGENT_PROMPT,
  BROWSER_AGENT_ROLE,
  BRAND_SITE_BUILDER_PROMPT,
  BRAND_SITE_BUILDER_ROLE,
  CHAT_PROMPT,
  CHAT_ROLE,
  CHIEF_OF_STAFF_PROMPT,
  CHIEF_OF_STAFF_ROLE,
  CONTENT_PRODUCER_PROMPT,
  CONTENT_PRODUCER_ROLE,
  DATA_ANALYST_PROMPT,
  DATA_ANALYST_ROLE,
  HEALTH_MONITOR_PROMPT,
  HEALTH_MONITOR_ROLE,
  OPPORTUNITY_HUNTER_PROMPT,
  OPPORTUNITY_HUNTER_ROLE,
  REPORTING_PROMPT,
  REPORTING_ROLE,
  RESEARCH_AGENT_PROMPT,
  RESEARCH_AGENT_ROLE,
} from "./prompts/index.js";

export type RoleStatus = "shipped" | "in-progress" | "planned";

export type RoleTier = "fast" | "balanced" | "deep";

/**
 * Display group used by the workbench UI to lay out the team. Roles in the
 * same group cluster together on the dashboard.
 */
export type RoleGroup =
  | "leadership"
  | "growth"
  | "build"
  | "ops"
  | "intelligence"
  | "interface";

export interface DearMeRoleSpec {
  /** Canonical slug used as the routing tag and plugin id suffix. */
  role: string;
  /** User-facing display name (this is product copy — translated per locale). */
  displayName: string;
  /** Production-verified system prompt (string ref to ./prompts). */
  prompt: string;
  /**
   * Char count of the source prompt at registry-load time. Computed from
   * `prompt.length` so it never drifts; surfaced as a field so tests and
   * the workbench can audit prompt size without re-measuring.
   */
  readonly promptSourceChars: number;
  /** Complexity range (1-10) the proxy will see for routine cycle work. */
  complexityRange: readonly [number, number];
  /** Default tier the proxy picks when complexity is omitted. */
  defaultTier: RoleTier;
  /** State-machine module names this role depends on. */
  stateMachines: ReadonlyArray<
    | "opportunity-state"
    | "meta-ads"
    | "budget-tier"
    | "mood-face-library"
    | "model-routing"
    | "sse-events"
  >;
  /** Reusable template module names this role uses. */
  templates: ReadonlyArray<"sora-ugc-video" | "outbound-5-touch">;
  /** Proxy tool names (subset of DEARME_TOOL_NAMES) this role calls. */
  proxyTools: ReadonlyArray<
    | "create_task"
    | "search_memory"
    | "get_company_documents"
    | "create_report"
    | "web_search"
    | "content_generate"
  >;
  /** Plugin npm package that owns this role's runtime. */
  pluginPackage: string;
  /** Ticket that owns implementation of this role's plugin runtime. */
  ticket: string;
  /** Implementation status. */
  status: RoleStatus;
  /** Display group for the workbench UI. */
  group: RoleGroup;
  /** One-sentence product surface description (PM copy). */
  description: string;
}

export const DEARME_ROLE_REGISTRY: ReadonlyArray<DearMeRoleSpec> = [
  {
    role: CHIEF_OF_STAFF_ROLE,
    displayName: "Chief of Staff",
    prompt: CHIEF_OF_STAFF_PROMPT,
    promptSourceChars: CHIEF_OF_STAFF_PROMPT.length,
    complexityRange: [4, 7],
    defaultTier: "balanced",
    stateMachines: ["mood-face-library", "model-routing", "sse-events"],
    templates: [],
    proxyTools: [
      "create_task",
      "search_memory",
      "get_company_documents",
      "create_report",
    ],
    pluginPackage: "@paperclipai/dearme-chief-of-staff",
    ticket: "DM-139",
    status: "planned",
    group: "leadership",
    description:
      "Always-on private team lead: monitors state, reviews shipped work, keeps the queue full, writes the Dear-me letter.",
  },
  {
    role: REPORTING_ROLE,
    displayName: "Reporting",
    prompt: REPORTING_PROMPT,
    promptSourceChars: REPORTING_PROMPT.length,
    complexityRange: [3, 6],
    defaultTier: "balanced",
    stateMachines: ["sse-events"],
    templates: [],
    proxyTools: ["create_report"],
    pluginPackage: "@paperclipai/dearme-reporting",
    ticket: "DM-139",
    status: "planned",
    group: "leadership",
    description:
      "Sends the Dear-me daily letter (3 ordered tools, conversational prose, under 200 words).",
  },
  {
    role: CONTENT_PRODUCER_ROLE,
    displayName: "Content Producer",
    prompt: CONTENT_PRODUCER_PROMPT,
    promptSourceChars: CONTENT_PRODUCER_PROMPT.length,
    complexityRange: [3, 6],
    defaultTier: "balanced",
    stateMachines: ["mood-face-library", "sse-events"],
    templates: [],
    proxyTools: ["search_memory", "content_generate", "get_company_documents"],
    pluginPackage: "@paperclipai/dearme-content-producer",
    ticket: "DM-140",
    status: "planned",
    group: "growth",
    description:
      "Composes voice-gated short-form content (Twitter/X 2/day, 280 char hard cap, dark-humor voice, mandatory attribution link).",
  },
  {
    role: OPPORTUNITY_HUNTER_ROLE,
    displayName: "Opportunity Hunter",
    prompt: OPPORTUNITY_HUNTER_PROMPT,
    promptSourceChars: OPPORTUNITY_HUNTER_PROMPT.length,
    complexityRange: [4, 7],
    defaultTier: "balanced",
    stateMachines: ["opportunity-state", "sse-events"],
    templates: ["outbound-5-touch"],
    proxyTools: ["search_memory", "web_search", "create_task"],
    pluginPackage: "@paperclipai/dearme-opportunity-hunter",
    ticket: "DM-141",
    status: "planned",
    group: "growth",
    description:
      "Finds podcasts, sponsorships, paid clients, retainers, partnerships; runs the 5-touch outbound and 8-state lifecycle.",
  },
  {
    role: BRAND_SITE_BUILDER_ROLE,
    displayName: "Brand Site Builder",
    prompt: BRAND_SITE_BUILDER_PROMPT,
    promptSourceChars: BRAND_SITE_BUILDER_PROMPT.length,
    complexityRange: [5, 9],
    defaultTier: "deep",
    stateMachines: ["sse-events"],
    templates: [],
    proxyTools: ["create_task", "create_report"],
    pluginPackage: "@paperclipai/dearme-brand-site-builder",
    ticket: "DM-147",
    status: "planned",
    group: "build",
    description:
      "Owns the personal site: writes code, fixes bugs, deploys. Web-only, single-Express, 512MB RAM, push-after-each-change.",
  },
  {
    role: ADS_MANAGER_ROLE,
    displayName: "Ads Manager",
    prompt: ADS_MANAGER_PROMPT,
    promptSourceChars: ADS_MANAGER_PROMPT.length,
    complexityRange: [5, 9],
    defaultTier: "deep",
    stateMachines: ["meta-ads", "budget-tier", "sse-events"],
    templates: ["sora-ugc-video"],
    proxyTools: ["create_report"],
    pluginPackage: "@paperclipai/dearme-ads-manager",
    ticket: "DM-148",
    status: "planned",
    group: "growth",
    description:
      "Runs Meta ads end-to-end: 5 tools, 7-day learning phase, 4 perf tiers, 5 error states, Sora 2 UGC creative, hard Meta-policy guardrails.",
  },
  {
    role: RESEARCH_AGENT_ROLE,
    displayName: "Research",
    prompt: RESEARCH_AGENT_PROMPT,
    promptSourceChars: RESEARCH_AGENT_PROMPT.length,
    complexityRange: [3, 7],
    defaultTier: "balanced",
    stateMachines: [],
    templates: [],
    proxyTools: ["web_search", "create_report"],
    pluginPackage: "@paperclipai/dearme-research-agent",
    ticket: "DM-138",
    status: "planned",
    group: "intelligence",
    description:
      "Web search, competitive analysis, market intel; every task ends with a saved report.",
  },
  {
    role: AUDIENCE_CARE_ROLE,
    displayName: "Audience Care",
    prompt: AUDIENCE_CARE_PROMPT,
    promptSourceChars: AUDIENCE_CARE_PROMPT.length,
    complexityRange: [3, 6],
    defaultTier: "balanced",
    stateMachines: [],
    templates: [],
    proxyTools: ["search_memory", "create_task"],
    pluginPackage: "@paperclipai/dearme-audience-care",
    ticket: "DM-149",
    status: "planned",
    group: "ops",
    description:
      "Inbound replies and support: plain-text, length-matched, escalation matrix for billing / security / angry users.",
  },
  {
    role: DATA_ANALYST_ROLE,
    displayName: "Data Analyst",
    prompt: DATA_ANALYST_PROMPT,
    promptSourceChars: DATA_ANALYST_PROMPT.length,
    complexityRange: [3, 6],
    defaultTier: "balanced",
    stateMachines: [],
    templates: [],
    proxyTools: ["create_report", "web_search"],
    pluginPackage: "@paperclipai/dearme-data-analyst",
    ticket: "DM-153",
    status: "planned",
    group: "intelligence",
    description:
      "SQL queries, metrics, BI; schema-first queries, NULL handling, correlation-vs-causation discipline.",
  },
  {
    role: HEALTH_MONITOR_ROLE,
    displayName: "Health Monitor",
    prompt: HEALTH_MONITOR_PROMPT,
    promptSourceChars: HEALTH_MONITOR_PROMPT.length,
    complexityRange: [3, 6],
    defaultTier: "balanced",
    stateMachines: ["sse-events"],
    templates: [],
    proxyTools: ["create_report", "create_task"],
    pluginPackage: "@paperclipai/dearme-health-monitor",
    ticket: "DM-150",
    status: "planned",
    group: "ops",
    description:
      "Periodic factual snapshots of business state. Reports, never recommends. Dedupes against the task backlog.",
  },
  {
    role: CHAT_ROLE,
    displayName: "Chat",
    prompt: CHAT_PROMPT,
    promptSourceChars: CHAT_PROMPT.length,
    complexityRange: [3, 7],
    defaultTier: "balanced",
    stateMachines: [],
    templates: [],
    proxyTools: [
      "create_task",
      "search_memory",
      "get_company_documents",
    ],
    pluginPackage: "@paperclipai/dearme-chat",
    ticket: "DM-138",
    status: "planned",
    group: "interface",
    description:
      "User-facing cofounder chat: pushes back on vague tasks, routes via find_best_agent, manages recurring tasks.",
  },
  {
    role: BROWSER_AGENT_ROLE,
    displayName: "Browser",
    prompt: BROWSER_AGENT_PROMPT,
    promptSourceChars: BROWSER_AGENT_PROMPT.length,
    complexityRange: [4, 7],
    defaultTier: "balanced",
    stateMachines: [],
    templates: [],
    proxyTools: ["create_report", "create_task"],
    pluginPackage: "@paperclipai/dearme-browser-agent",
    ticket: "DM-151",
    status: "planned",
    group: "build",
    description:
      "Web automation: forms, accounts, posting on Tier 2/3 community sites; respects 4-tier site policy.",
  },
];

const roleIndex = new Map<string, DearMeRoleSpec>(
  DEARME_ROLE_REGISTRY.map((spec) => [spec.role, spec]),
);

export function getRoleSpec(role: string): DearMeRoleSpec | undefined {
  return roleIndex.get(role);
}

export function getRolesByGroup(group: RoleGroup): ReadonlyArray<DearMeRoleSpec> {
  return DEARME_ROLE_REGISTRY.filter((spec) => spec.group === group);
}

export function getShippedRoles(): ReadonlyArray<DearMeRoleSpec> {
  return DEARME_ROLE_REGISTRY.filter((spec) => spec.status === "shipped");
}

/** All complexity ranges should fall inside the proxy's 1-10 contract. */
export function validateRegistry(
  registry: ReadonlyArray<DearMeRoleSpec> = DEARME_ROLE_REGISTRY,
): { ok: boolean; problems: ReadonlyArray<string> } {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const spec of registry) {
    if (seen.has(spec.role)) problems.push(`duplicate role: ${spec.role}`);
    seen.add(spec.role);
    if (
      spec.complexityRange[0] < 1 ||
      spec.complexityRange[1] > 10 ||
      spec.complexityRange[0] > spec.complexityRange[1]
    ) {
      problems.push(
        `${spec.role}: complexityRange out of bounds: ${JSON.stringify(spec.complexityRange)}`,
      );
    }
    if (!spec.pluginPackage.startsWith("@paperclipai/dearme-")) {
      problems.push(
        `${spec.role}: pluginPackage must start with @paperclipai/dearme- (got ${spec.pluginPackage})`,
      );
    }
    if (!/^DM-(?:S\d{2,}|\d{3,})$/.test(spec.ticket)) {
      problems.push(
        `${spec.role}: ticket must match DM-NNN or DM-SNN (got ${spec.ticket})`,
      );
    }
    if (spec.promptSourceChars <= 0 || spec.promptSourceChars > 100000) {
      problems.push(
        `${spec.role}: promptSourceChars out of range (got ${spec.promptSourceChars})`,
      );
    }
  }
  return { ok: problems.length === 0, problems };
}
