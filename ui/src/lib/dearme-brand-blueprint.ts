import type { DearMeBrandBlueprintApplyRequest, DearMeBrandBlueprintSeed } from "@paperclipai/shared";

export type DearMeBrandChannel = DearMeBrandBlueprintSeed["preferredChannels"][number];
export type DearMeBrandCadence = DearMeBrandBlueprintSeed["cadence"];

export interface DearMeBrandBlueprintFormState {
  displayName: string;
  positioning: string;
  goals: string;
  audiences: string;
  proofPoints: string;
  offers: string;
  voiceSamples: string;
  constraints: string;
  preferredChannels: DearMeBrandChannel[];
  cadence: DearMeBrandCadence;
  budgetMonthlyDollars: string;
  autoDraftEnabled: boolean;
  approvalNote: string;
}

export const DEFAULT_DEARME_BRAND_BLUEPRINT_FORM: DearMeBrandBlueprintFormState = {
  displayName: "",
  positioning: "",
  goals: "Build a clear public point of view\nTurn proof of work into consistent content",
  audiences: "Potential customers\nCollaborators and supporters",
  proofPoints: "",
  offers: "",
  voiceSamples: "",
  constraints: "Ask before publishing, sending, spending, deploying, or using sensitive material",
  preferredChannels: ["linkedin", "newsletter", "portfolio"],
  cadence: "weekly",
  budgetMonthlyDollars: "250",
  autoDraftEnabled: true,
  approvalNote: "",
};

export function splitBrandBlueprintLines(value: string) {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const key = line.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function dollarsToMonthlyCents(value: string) {
  const normalized = Number(value.trim());
  if (!Number.isFinite(normalized) || normalized < 0) return 0;
  return Math.min(Math.round(normalized * 100), 500_000);
}

export function buildDearMeBrandBlueprintSeed(
  form: DearMeBrandBlueprintFormState,
  fallbackDisplayName?: string | null,
): DearMeBrandBlueprintSeed {
  return {
    displayName: optionalText(form.displayName) ?? optionalText(fallbackDisplayName),
    positioning: optionalText(form.positioning),
    goals: splitBrandBlueprintLines(form.goals),
    audiences: splitBrandBlueprintLines(form.audiences),
    proofPoints: splitBrandBlueprintLines(form.proofPoints),
    offers: splitBrandBlueprintLines(form.offers),
    voiceSamples: splitBrandBlueprintLines(form.voiceSamples),
    preferredChannels: form.preferredChannels,
    constraints: splitBrandBlueprintLines(form.constraints),
    cadence: form.cadence,
    budgetMonthlyCents: dollarsToMonthlyCents(form.budgetMonthlyDollars),
    autoDraftEnabled: form.autoDraftEnabled,
  };
}

export function buildDearMeBrandBlueprintApplyRequest(
  form: DearMeBrandBlueprintFormState,
  fallbackDisplayName?: string | null,
): DearMeBrandBlueprintApplyRequest {
  return {
    brand: buildDearMeBrandBlueprintSeed(form, fallbackDisplayName),
    approvalNote: optionalText(form.approvalNote) ?? null,
  };
}

export function createDearMeBrandBlueprintSignature(
  form: DearMeBrandBlueprintFormState,
  fallbackDisplayName?: string | null,
) {
  return JSON.stringify(buildDearMeBrandBlueprintApplyRequest(form, fallbackDisplayName));
}
