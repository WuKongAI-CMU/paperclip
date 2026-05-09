export * from "./chief-of-staff.js";
export * from "./content-producer.js";
export * from "./opportunity-hunter.js";

import { CHIEF_OF_STAFF_PROMPT, CHIEF_OF_STAFF_ROLE } from "./chief-of-staff.js";
import { CONTENT_PRODUCER_PROMPT, CONTENT_PRODUCER_ROLE } from "./content-producer.js";
import {
  OPPORTUNITY_HUNTER_PROMPT,
  OPPORTUNITY_HUNTER_ROLE,
} from "./opportunity-hunter.js";

export interface DearMeRoleSeed {
  role: string;
  prompt: string;
}

export const DEARME_ROLE_SEEDS: ReadonlyArray<DearMeRoleSeed> = [
  { role: CHIEF_OF_STAFF_ROLE, prompt: CHIEF_OF_STAFF_PROMPT },
  { role: CONTENT_PRODUCER_ROLE, prompt: CONTENT_PRODUCER_PROMPT },
  { role: OPPORTUNITY_HUNTER_ROLE, prompt: OPPORTUNITY_HUNTER_PROMPT },
];

export function getRoleSeed(role: string): DearMeRoleSeed | undefined {
  return DEARME_ROLE_SEEDS.find((seed) => seed.role === role);
}
