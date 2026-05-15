/**
 * DearMe lockdown layer — public barrel.
 *
 * See `docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md` (dm-cb-01) for absorption
 * provenance and doctrine. The lockdown layer is what keeps DearMe's
 * AI proxy and voice gate in the loop when the OpenClaw plugin runs on
 * the user's device.
 */

export {
  DEARME_DENY_BASH_PATTERNS,
  DEARME_LOCKDOWN_VERSION,
  settingsForDearMeUser,
  settingsToJSON,
  type DearMeLockdownInput,
  type DearMeSettingsFile,
} from "./settings-template.js";

export {
  DEARME_LOCKDOWN_MOAT_CLAUSE,
  skillForDearMeUser,
} from "./skill-template.js";

export {
  verifyDearMeWorkspace,
  type VerifyDearMeWorkspaceInput,
  type VerifyDearMeWorkspaceResult,
} from "./verify.js";

export {
  writeDearMeLockdown,
  type WriteDearMeLockdownInput,
  type WriteDearMeLockdownResult,
} from "./write.js";
