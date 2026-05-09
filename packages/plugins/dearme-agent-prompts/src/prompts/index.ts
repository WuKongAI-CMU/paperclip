export * from "./_lineage.js";
export * from "./chief-of-staff.js";
export * from "./content-producer.js";
export * from "./opportunity-hunter.js";
export * from "./brand-site-builder.js";
export * from "./reporting.js";
export * from "./research-agent.js";
export * from "./audience-care.js";
export * from "./data-analyst.js";
export * from "./health-monitor.js";
export * from "./chat.js";
export * from "./browser-agent.js";
export * from "./ads-manager.js";

import { CHIEF_OF_STAFF_PROMPT, CHIEF_OF_STAFF_ROLE } from "./chief-of-staff.js";
import { CONTENT_PRODUCER_PROMPT, CONTENT_PRODUCER_ROLE } from "./content-producer.js";
import {
  OPPORTUNITY_HUNTER_PROMPT,
  OPPORTUNITY_HUNTER_ROLE,
} from "./opportunity-hunter.js";
import {
  BRAND_SITE_BUILDER_PROMPT,
  BRAND_SITE_BUILDER_ROLE,
} from "./brand-site-builder.js";
import { REPORTING_PROMPT, REPORTING_ROLE } from "./reporting.js";
import { RESEARCH_AGENT_PROMPT, RESEARCH_AGENT_ROLE } from "./research-agent.js";
import { AUDIENCE_CARE_PROMPT, AUDIENCE_CARE_ROLE } from "./audience-care.js";
import { DATA_ANALYST_PROMPT, DATA_ANALYST_ROLE } from "./data-analyst.js";
import { HEALTH_MONITOR_PROMPT, HEALTH_MONITOR_ROLE } from "./health-monitor.js";
import { CHAT_PROMPT, CHAT_ROLE } from "./chat.js";
import { BROWSER_AGENT_PROMPT, BROWSER_AGENT_ROLE } from "./browser-agent.js";
import { ADS_MANAGER_PROMPT, ADS_MANAGER_ROLE } from "./ads-manager.js";

export interface DearMeRoleSeed {
  role: string;
  prompt: string;
}

/**
 * Full registry of role-prompt seeds. Plugins import the seed they need
 * and may extend it with company-, voice-, or task-specific context.
 */
export const DEARME_ROLE_SEEDS: ReadonlyArray<DearMeRoleSeed> = [
  { role: CHIEF_OF_STAFF_ROLE, prompt: CHIEF_OF_STAFF_PROMPT },
  { role: REPORTING_ROLE, prompt: REPORTING_PROMPT },
  { role: CONTENT_PRODUCER_ROLE, prompt: CONTENT_PRODUCER_PROMPT },
  { role: OPPORTUNITY_HUNTER_ROLE, prompt: OPPORTUNITY_HUNTER_PROMPT },
  { role: BRAND_SITE_BUILDER_ROLE, prompt: BRAND_SITE_BUILDER_PROMPT },
  { role: RESEARCH_AGENT_ROLE, prompt: RESEARCH_AGENT_PROMPT },
  { role: AUDIENCE_CARE_ROLE, prompt: AUDIENCE_CARE_PROMPT },
  { role: DATA_ANALYST_ROLE, prompt: DATA_ANALYST_PROMPT },
  { role: HEALTH_MONITOR_ROLE, prompt: HEALTH_MONITOR_PROMPT },
  { role: CHAT_ROLE, prompt: CHAT_PROMPT },
  { role: BROWSER_AGENT_ROLE, prompt: BROWSER_AGENT_PROMPT },
  { role: ADS_MANAGER_ROLE, prompt: ADS_MANAGER_PROMPT },
];

export function getRoleSeed(role: string): DearMeRoleSeed | undefined {
  return DEARME_ROLE_SEEDS.find((seed) => seed.role === role);
}
