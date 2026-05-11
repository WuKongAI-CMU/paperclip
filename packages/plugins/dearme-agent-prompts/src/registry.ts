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
 *   - shipped / preview / planned status
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

export type RoleStatus = "shipped" | "preview" | "planned";

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
    | "work-loop"
    | "approval-gates"
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
  /**
   * Tri-substrate binding (TRI-SUBSTRATE-ARCHITECTURE.md).
   *
   * Documents which OpenClaw mechanism, which Naive table-of-record, and
   * which Polsia choreography step this role plugs into. This is read by
   * route authors to know which integration glue to write.
   */
  substrate: {
    /**
     * OpenClaw mechanism that hosts this role at the edge:
     *   - "session-shell"    role IS the conversational front-of-house
     *   - "skill-call"       routed to via find_best_agent inside a session
     *   - "cron-driven"      fires from OpenClaw Gateway cron, not user-facing
     *   - "sandbox-non-main" runs in a sandboxed non-main session (Docker)
     */
    openclaw:
      | "session-shell"
      | "skill-call"
      | "cron-driven"
      | "sandbox-non-main";
    /**
     * Naive table this role's record-of-truth lives on:
     *   - "issues"          one issue per work item (most roles)
     *   - "heartbeat_runs"  durable execution row (specialists)
     *   - "routines"        recurring schedule (chief-of-staff, health-monitor, reporting)
     *   - "documents"       knowledge artifacts (research-agent)
     */
    naive: "issues" | "heartbeat_runs" | "routines" | "documents";
    /**
     * Polsia choreography step this role corresponds to (from the
     * captured 5-stage cycle: plan → work → review → learn → report).
     */
    polsia: "plan" | "work" | "review" | "learn" | "report";
  };
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
    status: "preview",
    group: "leadership",
    description:
      "Always-on private team lead: monitors state, reviews shipped work, keeps the queue full, writes the Dear-me letter.",
    substrate: { openclaw: "session-shell", naive: "routines", polsia: "plan" },
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
    substrate: { openclaw: "cron-driven", naive: "routines", polsia: "report" },
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
    status: "preview",
    group: "growth",
    description:
      "Prepares voice-gated private content drafts for review and holds every public move behind approval.",
    substrate: { openclaw: "skill-call", naive: "heartbeat_runs", polsia: "work" },
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
    status: "preview",
    group: "growth",
    description:
      "Finds podcasts, sponsorships, paid clients, retainers, partnerships; runs the 5-touch outbound and 8-state lifecycle.",
    substrate: { openclaw: "skill-call", naive: "heartbeat_runs", polsia: "work" },
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
    status: "preview",
    group: "build",
    description:
      "Owns the personal site: writes code, fixes bugs, deploys. Web-only, single-Express, 512MB RAM, push-after-each-change.",
    substrate: { openclaw: "skill-call", naive: "heartbeat_runs", polsia: "work" },
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
    substrate: { openclaw: "skill-call", naive: "heartbeat_runs", polsia: "work" },
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
    substrate: { openclaw: "skill-call", naive: "documents", polsia: "learn" },
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
    substrate: { openclaw: "skill-call", naive: "issues", polsia: "work" },
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
    substrate: { openclaw: "skill-call", naive: "documents", polsia: "learn" },
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
    substrate: { openclaw: "cron-driven", naive: "routines", polsia: "review" },
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
    substrate: { openclaw: "session-shell", naive: "issues", polsia: "plan" },
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
    substrate: { openclaw: "sandbox-non-main", naive: "heartbeat_runs", polsia: "work" },
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

export function getPreviewRoles(): ReadonlyArray<DearMeRoleSpec> {
  return DEARME_ROLE_REGISTRY.filter((spec) => spec.status === "preview");
}

/** All complexity ranges should fall inside the proxy's 1-10 contract. */
export function validateRegistry(
  registry: ReadonlyArray<DearMeRoleSpec> = DEARME_ROLE_REGISTRY,
): { ok: boolean; problems: ReadonlyArray<string> } {
  const problems: string[] = [];
  const seen = new Set<string>();
  const validOpenclaw = new Set([
    "session-shell",
    "skill-call",
    "cron-driven",
    "sandbox-non-main",
  ]);
  const validNaive = new Set([
    "issues",
    "heartbeat_runs",
    "routines",
    "documents",
  ]);
  const validPolsia = new Set(["plan", "work", "review", "learn", "report"]);
  const validStatus = new Set<RoleStatus>(["shipped", "preview", "planned"]);
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
    if (!validStatus.has(spec.status)) {
      problems.push(
        `${spec.role}: status invalid (got ${spec.status})`,
      );
    }
    if (!validOpenclaw.has(spec.substrate.openclaw)) {
      problems.push(
        `${spec.role}: substrate.openclaw invalid (got ${spec.substrate.openclaw})`,
      );
    }
    if (!validNaive.has(spec.substrate.naive)) {
      problems.push(
        `${spec.role}: substrate.naive invalid (got ${spec.substrate.naive})`,
      );
    }
    if (!validPolsia.has(spec.substrate.polsia)) {
      problems.push(
        `${spec.role}: substrate.polsia invalid (got ${spec.substrate.polsia})`,
      );
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Distribution helper for the workbench / docs: how many roles are in each
 * substrate-binding bucket. Useful for auditing the team's center of mass.
 */
export function getSubstrateDistribution(
  registry: ReadonlyArray<DearMeRoleSpec> = DEARME_ROLE_REGISTRY,
): {
  openclaw: Record<DearMeRoleSpec["substrate"]["openclaw"], number>;
  naive: Record<DearMeRoleSpec["substrate"]["naive"], number>;
  polsia: Record<DearMeRoleSpec["substrate"]["polsia"], number>;
} {
  const distribution = {
    openclaw: {
      "session-shell": 0,
      "skill-call": 0,
      "cron-driven": 0,
      "sandbox-non-main": 0,
    } as Record<DearMeRoleSpec["substrate"]["openclaw"], number>,
    naive: {
      issues: 0,
      heartbeat_runs: 0,
      routines: 0,
      documents: 0,
    } as Record<DearMeRoleSpec["substrate"]["naive"], number>,
    polsia: {
      plan: 0,
      work: 0,
      review: 0,
      learn: 0,
      report: 0,
    } as Record<DearMeRoleSpec["substrate"]["polsia"], number>,
  };
  for (const spec of registry) {
    distribution.openclaw[spec.substrate.openclaw]++;
    distribution.naive[spec.substrate.naive]++;
    distribution.polsia[spec.substrate.polsia]++;
  }
  return distribution;
}
