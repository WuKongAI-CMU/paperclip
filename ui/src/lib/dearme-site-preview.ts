import {
  createDearMeFirstCyclePreview,
  dearMeFirstCyclePreviewResponseSchema,
  type DearMeFirstCyclePreviewResponse,
} from "@paperclipai/shared";

const DEARME_SITE_PREVIEW_STORAGE_PREFIX = "dearme:first-cycle-preview";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function buildDearMeSitePreviewPath(handle: string): string {
  return `/dearme/site-preview/${encodeURIComponent(handle)}`;
}

export function buildDearMeSitePreviewStorageKey(companyId: string, handle: string): string {
  return `${DEARME_SITE_PREVIEW_STORAGE_PREFIX}:${companyId}:${handle}`;
}

export function withDearMeFirstCycleValueReport(
  preview: DearMeFirstCyclePreviewResponse,
): DearMeFirstCyclePreviewResponse {
  const runtimePreview = preview as DearMeFirstCyclePreviewResponse & {
    valueReport?: DearMeFirstCyclePreviewResponse["valueReport"];
    opportunityRoiReport?: DearMeFirstCyclePreviewResponse["opportunityRoiReport"];
  };
  if (runtimePreview.valueReport && runtimePreview.opportunityRoiReport) return preview;

  const draftCount = preview.starterPosts.length;
  const leadCount = preview.opportunityShortlist.length;
  const protectedActionCount = 4;
  const fallback = createDearMeFirstCyclePreview(preview.companyId, {
    handle: preview.sitePreview.handle,
    brand: {
      displayName: preview.sitePreview.handle,
      positioning: preview.positioning,
      goals: [preview.positioning],
      audiences: [preview.opportunityShortlist[0]?.target ?? "the right audience"],
      proofPoints: [preview.portfolioProofCard.proofSource],
      offers: ["a useful next conversation"],
      voiceSamples: [],
      preferredChannels: ["linkedin", "portfolio"],
      constraints: ["Ask before public launch"],
      cadence: preview.continuationPlan.cadence,
      budgetMonthlyCents: 0,
      autoDraftEnabled: true,
    },
  });

  return {
    ...preview,
    valueReport: runtimePreview.valueReport ?? {
        title: "First value report",
        summary:
          "In the first proof pass, DearMe turned the positioning into reviewable assets, opportunity coverage, a proof page move, and protected launch decisions.",
        period: "First five minutes",
        items: [
          {
            id: "reviewable-assets-prepared",
            label: "Reviewable assets prepared",
            ownerRole: "growth_analyst",
            metric: `${draftCount} drafts + 1 proof card`,
            count: draftCount + 1,
            unit: "reviewable assets",
            summary: `${draftCount} drafts and one proof card are ready to review without publishing.`,
            source: "Proof pack",
          },
          {
            id: "opportunity-coverage-staged",
            label: "Opportunity coverage staged",
            ownerRole: "opportunity_scout",
            metric: `${leadCount} leads`,
            count: leadCount,
            unit: "qualified leads",
            summary: `${leadCount} opportunity leads are staged with relevance, angle, draft message, and contact evidence status.`,
            source: "Opportunity shortlist",
          },
          {
            id: "proof-loop-opened",
            label: "Proof loop opened",
            ownerRole: "portfolio_builder",
            metric: "1 proof route + 3 next-pass improvements",
            count: 4,
            unit: "proof moves",
            summary: `${preview.sitePreview.route} is ready privately, with three improvements lined up for the next pass.`,
            source: "Proof page",
          },
          {
            id: "launch-risk-held",
            label: "Launch risk kept behind the launch call",
            ownerRole: "chief_of_staff",
            metric: `${protectedActionCount} launch boundaries`,
            count: protectedActionCount,
            unit: "protected actions",
            summary: "Posting, sending, page changes, and spend stay behind one launch call while work continues.",
            source: "Launch boundary",
          },
        ],
        closingLine: "Use this report to decide whether to launch, revise, or let DearMe keep preparing.",
      },
    opportunityRoiReport: runtimePreview.opportunityRoiReport ?? fallback.opportunityRoiReport,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayOrFallback<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? value as T[] : fallback;
}

export function withDearMeFirstCycleRuntimeDefaults(
  preview: DearMeFirstCyclePreviewResponse,
): DearMeFirstCyclePreviewResponse {
  const runtimePreview = preview as DearMeFirstCyclePreviewResponse & Record<string, unknown>;
  const sitePreview: Record<string, unknown> = isRecord(runtimePreview.sitePreview) ? runtimePreview.sitePreview : {};
  const portfolioProofCard: Record<string, unknown> = isRecord(runtimePreview.portfolioProofCard)
    ? runtimePreview.portfolioProofCard
    : {};
  const starterPosts = Array.isArray(runtimePreview.starterPosts) ? runtimePreview.starterPosts : [];
  const opportunityShortlist = Array.isArray(runtimePreview.opportunityShortlist)
    ? runtimePreview.opportunityShortlist
    : [];
  const fallback = createDearMeFirstCyclePreview(
    typeof runtimePreview.companyId === "string" && runtimePreview.companyId ? runtimePreview.companyId : "dearme-company",
    {
      handle: typeof sitePreview.handle === "string" ? sitePreview.handle : undefined,
      brand: {
        displayName:
          typeof sitePreview.handle === "string" && sitePreview.handle
            ? sitePreview.handle
            : "DearMe member",
        positioning:
          typeof runtimePreview.positioning === "string" && runtimePreview.positioning
            ? runtimePreview.positioning
            : "Turning hard-earned work into clear public proof",
        goals: [
          typeof runtimePreview.positioning === "string" && runtimePreview.positioning
            ? runtimePreview.positioning
            : "Build a trusted personal brand",
        ],
        audiences: [
          typeof opportunityShortlist[0]?.target === "string" && opportunityShortlist[0].target
            ? opportunityShortlist[0].target
            : "the right audience",
        ],
        proofPoints: [
          typeof portfolioProofCard.proofSource === "string" && portfolioProofCard.proofSource
            ? portfolioProofCard.proofSource
            : typeof starterPosts[0]?.proofUsed === "string" && starterPosts[0].proofUsed
              ? starterPosts[0].proofUsed
              : "current proof",
        ],
        offers: ["a useful next conversation"],
        voiceSamples: [],
        preferredChannels: ["linkedin", "portfolio"],
        constraints: ["Ask before public launch"],
        cadence: "weekly",
        budgetMonthlyCents: 0,
        autoDraftEnabled: true,
      },
    },
  );

  const mergedPreview = {
    ...fallback,
    ...runtimePreview,
    voiceProfile: {
      ...fallback.voiceProfile,
      ...(isRecord(runtimePreview.voiceProfile) ? runtimePreview.voiceProfile : {}),
    },
    starterPosts: arrayOrFallback(runtimePreview.starterPosts, fallback.starterPosts),
    proofSequence: arrayOrFallback(runtimePreview.proofSequence, fallback.proofSequence),
    liveWorkTrail: arrayOrFallback(runtimePreview.liveWorkTrail, fallback.liveWorkTrail),
    cycleReport: {
      ...fallback.cycleReport,
      ...(isRecord(runtimePreview.cycleReport) ? runtimePreview.cycleReport : {}),
    },
    opportunityRoiReport: {
      ...fallback.opportunityRoiReport,
      ...(isRecord(runtimePreview.opportunityRoiReport) ? runtimePreview.opportunityRoiReport : {}),
    },
    opportunityLead:
      isRecord(runtimePreview.opportunityLead)
        ? {
            ...fallback.opportunityLead,
            ...runtimePreview.opportunityLead,
          }
        : fallback.opportunityLead,
    opportunityShortlist: arrayOrFallback(runtimePreview.opportunityShortlist, fallback.opportunityShortlist),
    portfolioProofCard: {
      ...fallback.portfolioProofCard,
      ...(isRecord(runtimePreview.portfolioProofCard) ? runtimePreview.portfolioProofCard : {}),
    },
    sitePreview: {
      ...fallback.sitePreview,
      ...(isRecord(runtimePreview.sitePreview) ? runtimePreview.sitePreview : {}),
    },
    growthPlan: {
      ...fallback.growthPlan,
      ...(isRecord(runtimePreview.growthPlan) ? runtimePreview.growthPlan : {}),
    },
    autonomyPlan: {
      ...fallback.autonomyPlan,
      ...(isRecord(runtimePreview.autonomyPlan) ? runtimePreview.autonomyPlan : {}),
    },
    continuationPlan: {
      ...fallback.continuationPlan,
      ...(isRecord(runtimePreview.continuationPlan) ? runtimePreview.continuationPlan : {}),
    },
    memoryPlan: {
      ...fallback.memoryPlan,
      ...(isRecord(runtimePreview.memoryPlan) ? runtimePreview.memoryPlan : {}),
    },
    voiceGate: {
      ...fallback.voiceGate,
      ...(isRecord(runtimePreview.voiceGate) ? runtimePreview.voiceGate : {}),
    },
    approvalBoundary: {
      ...fallback.approvalBoundary,
      ...(isRecord(runtimePreview.approvalBoundary) ? runtimePreview.approvalBoundary : {}),
    },
    warnings: Array.isArray(runtimePreview.warnings) ? runtimePreview.warnings : fallback.warnings,
  } as DearMeFirstCyclePreviewResponse;

  return withDearMeFirstCycleValueReport(mergedPreview);
}

export function writeDearMeFirstCyclePreview(preview: DearMeFirstCyclePreviewResponse): void {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      buildDearMeSitePreviewStorageKey(preview.companyId, preview.sitePreview.handle),
      JSON.stringify(withDearMeFirstCycleRuntimeDefaults(preview)),
    );
  } catch {
    // Ignore storage failures; the preview page still renders when data is available in-memory.
  }
}

export function readDearMeFirstCyclePreview(
  companyId: string,
  handle: string,
): DearMeFirstCyclePreviewResponse | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(buildDearMeSitePreviewStorageKey(companyId, handle));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const result = dearMeFirstCyclePreviewResponseSchema.safeParse(parsed);
    if (result.success) return withDearMeFirstCycleRuntimeDefaults(result.data);

    const normalizedResult = dearMeFirstCyclePreviewResponseSchema.safeParse(
      withDearMeFirstCycleRuntimeDefaults(parsed as DearMeFirstCyclePreviewResponse),
    );
    return normalizedResult.success ? normalizedResult.data : null;
  } catch {
    return null;
  }
}
