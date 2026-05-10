/**
 * Skill generator — converts each entry in DEARME_ROLE_REGISTRY into
 * an AgentSkills.io-compatible SKILL.md file that OpenClaw can load.
 *
 * Why a generator (and not 12 hand-edited SKILL.md files):
 *   The registry is the SSOT (PRODUCT-ARCHITECTURE.md §9.4). Hand-edited
 *   SKILL.md would drift the moment a prompt, tier, or private capability changes.
 *   The generator keeps the wire surface deterministic: change the registry,
 *   regenerate, ship.
 *
 * What is preserved from the DearMe role registry:
 *   - the full system prompt for the role (used as the SKILL.md body intro)
 *   - operating rails, private capability labels, complexity range
 *
 * What the generator adds on top (skill routing metadata, not product copy):
 *   - YAML frontmatter (`name`, `description`, `metadata.dearme.{...}`)
 *   - Slash-command hint (`/dearme:<role>`)
 *   - Routing hints (which inbound messages should land on this role)
 *   - Maintenance notes for generated-file hygiene
 */

import type {
  DearMeRoleSpec,
  RoleGroup,
  RoleTier,
} from "@paperclipai/dearme-agent-prompts";

export interface SkillFile {
  /** Folder name under `generated/skills/` (becomes the skill id). */
  folder: string;
  /** Full SKILL.md content with YAML frontmatter + body. */
  content: string;
}

const ROLE_EMOJI: Record<string, string> = {
  "chief-of-staff": "🎩",
  reporting: "📧",
  "content-producer": "✍️",
  "opportunity-hunter": "🎯",
  "brand-site-builder": "🏗️",
  "ads-manager": "📺",
  "research-agent": "🔍",
  "audience-care": "💬",
  "data-analyst": "📊",
  "health-monitor": "❤️",
  chat: "💭",
  "browser-agent": "🧭",
};

const TIER_LABEL: Record<RoleTier, string> = {
  fast: "fast execution",
  balanced: "balanced execution",
  deep: "deep execution",
};

const GROUP_LABEL: Record<RoleGroup, string> = {
  leadership: "Leadership",
  growth: "Growth",
  build: "Build",
  ops: "Ops",
  intelligence: "Intelligence",
  interface: "Interface",
};

const PRIVATE_CAPABILITY_LABEL: Record<DearMeRoleSpec["proxyTools"][number], string> = {
  create_task: "Create private team tasks",
  search_memory: "Search approved memory",
  get_company_documents: "Read approved documents",
  create_report: "Save private reports",
  web_search: "Research public sources",
  content_generate: "Prepare private draft content",
};

const OPERATING_RAIL_LABEL: Record<DearMeRoleSpec["stateMachines"][number], string> = {
  "opportunity-state": "Opportunity lifecycle",
  "meta-ads": "Paid promotion approvals",
  "budget-tier": "Budget boundary",
  "mood-face-library": "Team status cues",
  "model-routing": "Execution effort routing",
  "sse-events": "Live work updates",
  "work-loop": "Team work loop",
  "approval-gates": "Launch approval gates",
};

/**
 * Build the YAML frontmatter for a skill. Kept compact — the body of
 * the skill is the verbatim system prompt; frontmatter is just routing.
 */
function frontmatterFor(spec: DearMeRoleSpec): string {
  const emoji = ROLE_EMOJI[spec.role] ?? "🦞";
  const summary = spec.description.replace(/\s+/g, " ").trim();
  const lines = [
    "---",
    `name: dearme-${spec.role}`,
    `description: ${JSON.stringify(summary)}`,
    `metadata:`,
    `  dearme:`,
    `    emoji: "${emoji}"`,
    `    group: "${spec.group}"`,
    `    plugin: "dearme"`,
    `    role: "${spec.role}"`,
    `    displayName: ${JSON.stringify(spec.displayName)}`,
    `    ticket: "${spec.ticket}"`,
    `    status: "${spec.status}"`,
    `    capabilities: ${JSON.stringify(spec.proxyTools.map((tool) => PRIVATE_CAPABILITY_LABEL[tool]))}`,
    `    operatingRails: ${JSON.stringify(spec.stateMachines.map((rail) => OPERATING_RAIL_LABEL[rail]))}`,
    `    templates: ${JSON.stringify([...spec.templates])}`,
    `    complexityBand: [${spec.complexityRange[0]}, ${spec.complexityRange[1]}]`,
    `    executionTier: "${spec.defaultTier}"`,
    "---",
  ];
  return lines.join("\n");
}

function routingHintFor(spec: DearMeRoleSpec): string {
  // Each role gets a one-line hint about when OpenClaw's multi-agent router
  // should send a user message to this role. Hand-tuned per role group; this
  // is the only product-PM judgment in the generator (everything else is
  // mechanical).
  switch (spec.role) {
    case "chief-of-staff":
      return "Default landing for ambiguous user requests, daily check-ins, status questions, and any ask that isn't obviously another role.";
    case "reporting":
      return "Triggered by cron (daily morning) and by Chief of Staff when a Dear-me letter is requested. Not user-invoked directly.";
    case "content-producer":
      return "Triggered when the user asks to draft / post / schedule / repurpose any social or newsletter content.";
    case "opportunity-hunter":
      return "Triggered when the user asks about clients, jobs, podcasts, sponsorships, partnerships, leads, or outreach.";
    case "brand-site-builder":
      return "Triggered when the user asks to update their personal site (bio, projects, talks, contact, /now).";
    case "ads-manager":
      return "Triggered only when the user explicitly mentions ads, paid promotion, or budget. Default off.";
    case "research-agent":
      return "Triggered when the user asks to look something up, compare options, or produce a report.";
    case "audience-care":
      return "Triggered for inbound replies (email, DM) and follower/customer-style questions.";
    case "data-analyst":
      return "Triggered when the user asks for metrics, numbers, attribution, or 'what's working'.";
    case "health-monitor":
      return "Triggered by cron (every 6 hours) for state snapshots. Not user-invoked.";
    case "chat":
      return "Default conversational shell for DearMe team messages. Routes to specialists behind the scenes.";
    case "browser-agent":
      return "Triggered when the user asks to fill a form, post on a non-API site, sign up somewhere, or scrape something.";
    default:
      return "Routed by Chief of Staff after intent classification.";
  }
}

function bodyFor(spec: DearMeRoleSpec): string {
  const operatingRailsList =
    spec.stateMachines.length > 0
      ? spec.stateMachines.map((sm) => `- ${OPERATING_RAIL_LABEL[sm]}`).join("\n")
      : "_None — this role is stateless._";
  const templatesList =
    spec.templates.length > 0
      ? spec.templates.map((t) => `- \`${t}\``).join("\n")
      : "_None._";
  const capabilityList =
    spec.proxyTools.length > 0
      ? spec.proxyTools.map((t) => `- ${PRIVATE_CAPABILITY_LABEL[t]}`).join("\n")
      : "_None — chat-only._";
  return [
    `# ${ROLE_EMOJI[spec.role] ?? "🦞"} ${spec.displayName} — ${GROUP_LABEL[spec.group]}`,
    "",
    `> ${spec.description}`,
    "",
    "## Routing",
    "",
    routingHintFor(spec),
    "",
    "## Execution",
    "",
    `Default execution tier: **${TIER_LABEL[spec.defaultTier]}**. Complexity band \`${spec.complexityRange[0]}-${spec.complexityRange[1]}\` (1-10).`,
    "",
    "## Operating rails",
    "",
    operatingRailsList,
    "",
    "## Templates",
    "",
    templatesList,
    "",
    "## Private capabilities",
    "",
    capabilityList,
    "",
    "## System prompt",
    "",
    "_Full role instructions. Follow them exactly, and keep private machinery out of customer-facing replies._",
    "",
    "<details>",
    "<summary>Click to expand the role instructions.</summary>",
    "",
    "```",
    spec.prompt,
    "```",
    "",
    "</details>",
    "",
    "## Maintenance",
    "",
    `Owner ticket: \`${spec.ticket}\` (status: \`${spec.status}\`).`,
    "",
    "_Generated from the DearMe role registry. Do not edit by hand; update the registry or prompt source, then regenerate skills._",
    "",
  ].join("\n");
}

/**
 * Generate a single SKILL.md for a registry entry. Pure function (no I/O)
 * so tests can verify content shape without writing files.
 */
export function generateSkillForRole(spec: DearMeRoleSpec): SkillFile {
  return {
    folder: `dearme-${spec.role}`,
    content: `${frontmatterFor(spec)}\n\n${bodyFor(spec)}`,
  };
}

/**
 * Generate all 12 skills from a registry. Pure function.
 */
export function generateAllSkills(
  registry: ReadonlyArray<DearMeRoleSpec>,
): ReadonlyArray<SkillFile> {
  return registry.map(generateSkillForRole);
}
