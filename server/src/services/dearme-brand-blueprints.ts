import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, documents, issueDocuments, issues as issuesTable } from "@paperclipai/db";
import {
  DEARME_MEMORY_UPDATE_KINDS,
  buildDearMeBrandBlueprintExecutionPlan,
  collectDearMeBrandBlueprintWarnings,
  createDearMeBrandBlueprint,
  createDearMeFirstCyclePreview,
  dearMeBrandBlueprintApplyPayloadSchema,
  dearMeFirstCyclePreviewResponseSchema,
  dearMeFirstCyclePreviewSchema,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
  type DearMeBrandBlueprintApplyRequest,
  type DearMeBrandBlueprintPreview,
  type DearMeBrandBlueprintSeed,
  type DearMeFirstCyclePreview,
  type DearMeFirstCyclePreviewResponse,
  type DearMeMemoryUpdateKind,
  type DearMeOutputDetail,
  type DearMeOutputItem,
  type DearMeOutputKind,
} from "@paperclipai/shared";
import { approvalService } from "./approvals.js";
import { documentService } from "./documents.js";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "./dearme-brand-blueprint-apply.js";
import { dearmeOutputHandoffService } from "./dearme-output-handoff.js";
import { issueService } from "./issues.js";

export interface DearMeBrandBlueprintActor {
  actorType: "agent" | "user";
  actorId: string;
  agentId: string | null;
  runId?: string | null;
}

type FirstCycleMemorySeed = Pick<
  DearMeBrandBlueprintSeed,
  "audiences" | "constraints" | "goals" | "offers" | "proofPoints" | "voiceSamples"
>;
type DearMeOutputSourceEvidence = DearMeOutputItem["sourceEvidence"][number];
type FirstCycleProofDocument = {
  key: string;
  title: string;
  body: string;
};
type FirstCycleProofIssue = {
  originFingerprint: string;
  title: string;
  description: string;
  priority: "high" | "medium";
  documents: FirstCycleProofDocument[];
};

const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
const MEMORY_KIND_SET = new Set<string>(DEARME_MEMORY_UPDATE_KINDS);
const FIRST_CYCLE_PROOF_OUTPUT_KINDS = new Set<DearMeOutputKind>([
  "brand_os",
  "voice_profile",
  "content_drafts",
  "opportunity_drafts",
  "portfolio_update",
  "weekly_report",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyFirstCycleMemorySeed(): FirstCycleMemorySeed {
  return {
    audiences: [],
    constraints: [],
    goals: [],
    offers: [],
    proofPoints: [],
    voiceSamples: [],
  };
}

function isDearMeMemoryKind(value: unknown): value is DearMeMemoryUpdateKind {
  return typeof value === "string" && MEMORY_KIND_SET.has(value);
}

function optionalStringFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function clampText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function optionalUuid(value: string | null | undefined) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function mergeUniqueText(existing: string[], additions: string[], maxItems: number) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const value of [...existing, ...additions]) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(normalized);
    if (values.length >= maxItems) break;
  }

  return values;
}

function outputHasPreparedArtifact(output: DearMeOutputItem) {
  return output.documents.length > 0 || output.workProducts.length > 0;
}

function findPreparedOutput(outputs: DearMeOutputItem[], kind: DearMeOutputKind) {
  return outputs.find((output) => output.kind === kind && outputHasPreparedArtifact(output)) ?? null;
}

function firstDetailValue(
  output: DearMeOutputItem | null,
  kinds: DearMeOutputDetail["kind"][],
  maxLength = 260,
) {
  if (!output) return null;
  for (const kind of kinds) {
    const detail = output.details.find((candidate) => candidate.kind === kind);
    if (detail?.value) return clampText(detail.value, maxLength);
  }
  return null;
}

function firstEvidenceSummary(
  output: DearMeOutputItem | null,
  kinds: DearMeOutputSourceEvidence["kind"][],
  maxLength = 260,
) {
  if (!output) return null;
  for (const kind of kinds) {
    const evidence = output.sourceEvidence.find((candidate) => candidate.kind === kind);
    if (evidence?.summary) return clampText(evidence.summary, maxLength);
  }
  return null;
}

function joinProofParts(parts: Array<string | null>) {
  return parts.filter((part): part is string => Boolean(part && part.trim().length > 0)).join(" ");
}

function artifactLabel(values: Array<string | null>, fallback: string) {
  const labels = values.filter((value): value is string => Boolean(value));
  if (labels.length === 0) return fallback;
  return clampText(labels.join(" + "), 220);
}

function proofSourceLabel(values: Array<string | null>) {
  const labels = values.filter((value): value is string => Boolean(value));
  if (labels.length === 0) return null;
  return clampText(`Prepared from ${labels.join(" and ")}`, 240);
}

function hydrateProofSequenceFromOutputs(
  preview: DearMeFirstCyclePreviewResponse,
  outputs: DearMeOutputItem[],
) {
  const preparedOutputs = outputs.filter((output) =>
    FIRST_CYCLE_PROOF_OUTPUT_KINDS.has(output.kind) && outputHasPreparedArtifact(output)
  );
  if (preparedOutputs.length === 0) return preview;

  const [identityFallback, audienceFallback, siteFallback] = preview.proofSequence;
  if (!identityFallback || !audienceFallback || !siteFallback) return preview;

  const brandOs = findPreparedOutput(preparedOutputs, "brand_os");
  const voiceProfile = findPreparedOutput(preparedOutputs, "voice_profile");
  const contentDrafts = findPreparedOutput(preparedOutputs, "content_drafts");
  const opportunityDrafts = findPreparedOutput(preparedOutputs, "opportunity_drafts");
  const portfolioUpdate = findPreparedOutput(preparedOutputs, "portfolio_update");
  const weeklyReport = findPreparedOutput(preparedOutputs, "weekly_report");

  const positioning = firstDetailValue(brandOs, ["positioning"]) ??
    firstEvidenceSummary(brandOs, ["voice_memory"]);
  const proof = firstDetailValue(brandOs, ["proof_used"]) ??
    firstEvidenceSummary(brandOs, ["proof"]);
  const voiceGuidance = firstDetailValue(voiceProfile, ["voice_guidance"], 220) ??
    firstEvidenceSummary(voiceProfile, ["voice_memory"], 220);
  const audience = firstDetailValue(contentDrafts, ["audience"], 220) ??
    firstDetailValue(opportunityDrafts, ["target"], 220);
  const hook = firstDetailValue(contentDrafts, ["hook"], 220);
  const opportunity = firstDetailValue(opportunityDrafts, ["target", "outreach_angle"], 220);
  const outreachAngle = firstDetailValue(opportunityDrafts, ["outreach_angle"], 220);
  const proofSource = firstDetailValue(portfolioUpdate, ["proof_source"], 220) ??
    firstEvidenceSummary(portfolioUpdate, ["proof"], 220);
  const proposedCopy = firstDetailValue(portfolioUpdate, ["proposed_copy"], 260);
  const nextBet = firstDetailValue(weeklyReport, ["next_bets"], 220);
  const identitySourceLabel = proofSourceLabel([
    brandOs ? "private Brand OS work" : null,
    voiceProfile ? "voice work" : null,
  ]);
  const audienceSourceLabel = proofSourceLabel([
    contentDrafts ? "private content drafts" : null,
    opportunityDrafts ? "opportunity work" : null,
  ]);
  const siteSourceLabel = proofSourceLabel([
    portfolioUpdate ? "private site proof" : null,
    weeklyReport ? "Dear me report" : null,
  ]);

  const proofSequence: DearMeFirstCyclePreviewResponse["proofSequence"] = [
    brandOs || voiceProfile
      ? {
          ...identityFallback,
          summary: joinProofParts([
            positioning ? `Identity Researcher turned the private Brand OS into a known-for line: ${positioning}.` : null,
            voiceGuidance ? `Voice Editor attached voice guidance: ${voiceGuidance}.` : null,
            proof ? `Proof used: ${proof}.` : null,
          ]) || identityFallback.summary,
          preparedArtifact: artifactLabel([
            brandOs ? "Brand OS dossier" : null,
            voiceProfile ? "Voice profile" : null,
          ], identityFallback.preparedArtifact),
          ...(identitySourceLabel ? { sourceLabel: identitySourceLabel } : {}),
          approvalBoundary: "The dossier can keep improving privately; sensitive or public claims still wait for review.",
        }
      : identityFallback,
    contentDrafts || opportunityDrafts
      ? {
          ...audienceFallback,
          summary: joinProofParts([
            audience ? `Audience Mapper found the first lane: ${audience}.` : null,
            hook ? `Content Producer prepared a proof-backed hook: ${hook}.` : null,
            opportunity || outreachAngle
              ? `Opportunity Scout staged the first private angle: ${outreachAngle ?? opportunity}.`
              : null,
          ]) || audienceFallback.summary,
          preparedArtifact: artifactLabel([
            contentDrafts ? "Starter content drafts" : null,
            opportunityDrafts ? "Opportunity shortlist" : null,
          ], audienceFallback.preparedArtifact),
          ...(audienceSourceLabel ? { sourceLabel: audienceSourceLabel } : {}),
          approvalBoundary: "Posts and outreach stay private until the user approves publish or send.",
        }
      : audienceFallback,
    portfolioUpdate || weeklyReport
      ? {
          ...siteFallback,
          summary: joinProofParts([
            proposedCopy ? `Brand Site Builder staged private site copy: ${proposedCopy}.` : null,
            proofSource ? `It is tied to proof: ${proofSource}.` : null,
            nextBet ? `The next Dear me report keeps the bet focused: ${nextBet}.` : null,
          ]) || siteFallback.summary,
          preparedArtifact: artifactLabel([
            portfolioUpdate ? "Private site proof draft" : null,
            weeklyReport ? "Dear me report note" : null,
          ], siteFallback.preparedArtifact),
          ...(siteSourceLabel ? { sourceLabel: siteSourceLabel } : {}),
          approvalBoundary: "The public site draft remains private until one deploy decision is approved.",
        }
      : siteFallback,
  ];

  return dearMeFirstCyclePreviewResponseSchema.parse({
    ...preview,
    proofSequence,
  });
}

function firstCycleLines(lines: Array<string | null>) {
  return lines.filter((line): line is string => Boolean(line && line.trim().length > 0)).join("\n");
}

function renderFirstCycleProofIssues(preview: DearMeFirstCyclePreviewResponse): FirstCycleProofIssue[] {
  const firstPost = preview.starterPosts[0];
  const starterDrafts = preview.starterPosts
    .map((post) => `- ${post.title}: ${post.hook}`)
    .join("\n");
  const launchBoundary = preview.approvalBoundary.summary;

  return [
    {
      originFingerprint: "brand-os-review",
      title: `DearMe: First-cycle Brand OS proof for ${preview.positioning}`,
      description: "Prepared identity and voice proof for the first 5-minute private proof package.",
      priority: "high",
      documents: [
        {
          key: "brand-os",
          title: "Brand OS",
          body: firstCycleLines([
            `Positioning: ${preview.positioning}`,
            `Proof Points: ${preview.portfolioProofCard.proofSource}`,
            `Audiences: ${preview.opportunityLead.target}`,
            `Goals: ${preview.growthPlan.priorities.join("; ")}`,
            `Offers: ${preview.opportunityLead.outreachAngle}`,
            `Launch boundaries: ${launchBoundary}`,
          ]),
        },
        {
          key: "voice-profile",
          title: "Voice profile",
          body: firstCycleLines([
            `Guidance: ${preview.voiceProfile.guidance}`,
            `Status: ${preview.voiceProfile.status}`,
            `Sample count: ${preview.voiceProfile.sampleCount}`,
            `Voice Samples: ${preview.voiceProfile.draftTone.join("; ")}`,
            "Launch boundary: Use this profile before any public copy represents the user.",
          ]),
        },
        {
          key: "approval-gates",
          title: "Approval gates",
          body: firstCycleLines([
            `Launch boundaries: ${launchBoundary}`,
            `Approval boundaries: ${preview.approvalBoundary.blockedActions.join("; ")}`,
          ]),
        },
      ],
    },
    {
      originFingerprint: "operation-draft_content_batch",
      title: "DearMe Draft: First-cycle starter content",
      description: "Prepared the private starter posts for the first-cycle proof package.",
      priority: "high",
      documents: [
        {
          key: "starter-posts",
          title: "Starter posts",
          body: firstCycleLines([
            firstPost ? `Channel: ${firstPost.channel}` : null,
            `Audience: ${preview.opportunityLead.target}`,
            firstPost ? `Hook: ${firstPost.hook}` : null,
            firstPost ? `Draft body: ${firstPost.body}` : null,
            firstPost ? `Proof used: ${firstPost.proofUsed}` : null,
            `Drafts and Assets Ready for Review: ${starterDrafts}`,
            "Launch boundary: Posts stay private until the user approves publishing.",
          ]),
        },
      ],
    },
    {
      originFingerprint: "operation-draft_opportunity_list",
      title: "DearMe Draft: First-cycle opportunity",
      description: "Prepared the first private opportunity lane and outreach angle.",
      priority: "medium",
      documents: [
        {
          key: "opportunity-list",
          title: "Opportunity list",
          body: firstCycleLines([
            `Target: ${preview.opportunityLead.target}`,
            `Why relevant: ${preview.opportunityLead.whyRelevant}`,
            "Relevance score: first lane",
            `Outreach angle: ${preview.opportunityLead.outreachAngle}`,
            `Draft message: ${preview.opportunityLead.draftMessage}`,
            "Launch boundary: Outreach waits for one launch call before sending.",
          ]),
        },
      ],
    },
    {
      originFingerprint: "operation-prepare_portfolio_update",
      title: "DearMe Draft: First-cycle private site proof",
      description: "Prepared the private proof card for the first-cycle site proof.",
      priority: "medium",
      documents: [
        {
          key: "portfolio-update",
          title: "Portfolio update",
          body: firstCycleLines([
            `Page section: ${preview.portfolioProofCard.placement}`,
            `Proof source: ${preview.portfolioProofCard.proofSource}`,
            `Proposed copy: ${preview.portfolioProofCard.proposedCopy}`,
            "Deploy boundary: The public site update waits for one launch decision.",
          ]),
        },
      ],
    },
    {
      originFingerprint: "operation-schedule_weekly_report",
      title: "DearMe Draft: First-cycle Dear me report",
      description: "Prepared the first private report note so DearMe can continue after the proof package.",
      priority: "medium",
      documents: [
        {
          key: "dear-me-report",
          title: "Dear me report",
          body: firstCycleLines([
            "Completed work: Identity dossier, starter content, opportunity angle, and private site proof are ready for review.",
            `Decisions needed: ${launchBoundary}`,
            `Next bets: ${preview.growthPlan.nextActions.join("; ")}`,
            "Report reference: First 5-minute proof package",
          ]),
        },
      ],
    },
  ];
}

export function dearmeBrandBlueprintService(db: Db) {
  const approvals = approvalService(db);
  const documentsSvc = documentService(db);
  const issuesSvc = issueService(db);
  const outputHandoff = dearmeOutputHandoffService(db);

  function firstCycleMemorySeedFromDetails(details: unknown): FirstCycleMemorySeed | null {
    if (!isRecord(details) || !isDearMeMemoryKind(details.kind)) return null;

    const body = optionalStringFromRecord(details, "body");
    if (!body) return null;

    const seed = emptyFirstCycleMemorySeed();

    switch (details.kind) {
      case "voice_sample":
        seed.voiceSamples.push(clampText(body, 4_000));
        break;
      case "proof_point":
        seed.proofPoints.push(clampText(body, 1_000));
        break;
      case "goal":
        seed.goals.push(clampText(body, 240));
        break;
      case "audience":
        seed.audiences.push(clampText(body, 240));
        break;
      case "offer":
        seed.offers.push(clampText(body, 240));
        break;
      case "constraint":
        seed.constraints.push(clampText(body, 500));
        break;
      case "relationship":
        seed.constraints.push(clampText(`Relationship context: ${body}`, 500));
        break;
      case "preference":
        seed.constraints.push(clampText(`Preference: ${body}`, 500));
        break;
    }

    return seed;
  }

  async function loadFirstCycleMemorySeed(companyId: string): Promise<FirstCycleMemorySeed> {
    const rows = await db
      .select({ details: activityLog.details })
      .from(activityLog)
      .where(and(eq(activityLog.companyId, companyId), eq(activityLog.action, DEARME_MEMORY_UPDATED_ACTION)))
      .orderBy(desc(activityLog.createdAt))
      .limit(32);

    return rows.reduce<FirstCycleMemorySeed>((accumulator, row) => {
      const seed = firstCycleMemorySeedFromDetails(row.details);
      if (!seed) return accumulator;

      accumulator.audiences.push(...seed.audiences);
      accumulator.constraints.push(...seed.constraints);
      accumulator.goals.push(...seed.goals);
      accumulator.offers.push(...seed.offers);
      accumulator.proofPoints.push(...seed.proofPoints);
      accumulator.voiceSamples.push(...seed.voiceSamples);

      return accumulator;
    }, emptyFirstCycleMemorySeed());
  }

  async function enrichFirstCycleWithMemory(
    companyId: string,
    input: DearMeFirstCyclePreview,
  ): Promise<DearMeFirstCyclePreview> {
    const parsed = dearMeFirstCyclePreviewSchema.parse(input);
    const memory = await loadFirstCycleMemorySeed(companyId);

    return {
      brand: {
        ...parsed.brand,
        audiences: mergeUniqueText(parsed.brand.audiences, memory.audiences, 8),
        constraints: mergeUniqueText(parsed.brand.constraints, memory.constraints, 10),
        goals: mergeUniqueText(parsed.brand.goals, memory.goals, 8),
        offers: mergeUniqueText(parsed.brand.offers, memory.offers, 8),
        proofPoints: mergeUniqueText(parsed.brand.proofPoints, memory.proofPoints, 16),
        voiceSamples: mergeUniqueText(parsed.brand.voiceSamples, memory.voiceSamples, 8),
      },
    };
  }

  function preview(companyId: string, input: DearMeBrandBlueprintPreview) {
    const blueprint = createDearMeBrandBlueprint(input.brand);
    const summary = summarizeDearMeBrandBlueprint(blueprint);
    const executionPlan = buildDearMeBrandBlueprintExecutionPlan(blueprint);
    const warnings = collectDearMeBrandBlueprintWarnings(blueprint);
    const voiceGate = evaluateDearMeVoiceGate({
      brand: input.brand,
      artifact: {
        kind: "brand_positioning",
        channel: blueprint.brand.preferredChannels[0] ?? null,
        title: "Brand OS positioning",
        text: blueprint.brand.positioning,
        ...(blueprint.brand.proofPoints[0] ? { proofUsed: blueprint.brand.proofPoints[0] } : {}),
      },
    });

    return {
      companyId,
      status: "preview" as const,
      blueprint,
      summary,
      executionPlan,
      voiceGate,
      warnings,
    };
  }

  async function previewFirstCycle(companyId: string, input: DearMeFirstCyclePreview) {
    const enrichedInput = await enrichFirstCycleWithMemory(companyId, input);
    const previewResult = createDearMeFirstCyclePreview(companyId, enrichedInput);
    const outputs = await outputHandoff.listOutputs(companyId);
    return hydrateProofSequenceFromOutputs(previewResult, outputs.outputs);
  }

  async function findFirstCycleProofIssue(companyId: string, originFingerprint: string) {
    return db
      .select({ id: issuesTable.id })
      .from(issuesTable)
      .where(and(
        eq(issuesTable.companyId, companyId),
        eq(issuesTable.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
        eq(issuesTable.originFingerprint, originFingerprint),
        isNull(issuesTable.hiddenAt),
      ))
      .orderBy(desc(issuesTable.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async function latestIssueDocumentRevisionId(issueId: string, key: string) {
    return db
      .select({ latestRevisionId: documents.latestRevisionId })
      .from(issueDocuments)
      .innerJoin(documents, eq(issueDocuments.documentId, documents.id))
      .where(and(eq(issueDocuments.issueId, issueId), eq(issueDocuments.key, key)))
      .limit(1)
      .then((rows) => rows[0]?.latestRevisionId ?? null);
  }

  async function upsertFirstCycleProofDocument(
    issueId: string,
    document: FirstCycleProofDocument,
    actor: DearMeBrandBlueprintActor,
  ) {
    const baseRevisionId = await latestIssueDocumentRevisionId(issueId, document.key);
    await documentsSvc.upsertIssueDocument({
      issueId,
      key: document.key,
      title: document.title,
      format: "markdown",
      body: document.body,
      changeSummary: "Prepared from DearMe first-cycle start",
      createdByAgentId: actor.agentId,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
      createdByRunId: optionalUuid(actor.runId),
      ...(baseRevisionId ? { baseRevisionId } : {}),
    });
  }

  async function upsertFirstCycleProofIssue(
    companyId: string,
    proofIssue: FirstCycleProofIssue,
    actor: DearMeBrandBlueprintActor,
  ) {
    const existing = await findFirstCycleProofIssue(companyId, proofIssue.originFingerprint);
    if (!existing) {
      return issuesSvc.create(companyId, {
        title: proofIssue.title,
        description: proofIssue.description,
        status: "in_review",
        priority: proofIssue.priority,
        createdByAgentId: actor.agentId,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        originKind: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
        originId: "first-cycle-proof",
        originFingerprint: proofIssue.originFingerprint,
      });
    }

    const updated = await issuesSvc.update(existing.id, {
      title: proofIssue.title,
      description: proofIssue.description,
      status: "in_review",
      priority: proofIssue.priority,
    });
    return updated ?? existing;
  }

  async function prepareFirstCycleProofOutputs(
    companyId: string,
    input: DearMeFirstCyclePreview,
    actor: DearMeBrandBlueprintActor,
  ) {
    const initialPreview = await previewFirstCycle(companyId, input);
    const proofIssues = renderFirstCycleProofIssues(initialPreview);

    for (const proofIssue of proofIssues) {
      const issue = await upsertFirstCycleProofIssue(companyId, proofIssue, actor);

      for (const document of proofIssue.documents) {
        await upsertFirstCycleProofDocument(issue.id, document, actor);
      }
    }

    await outputHandoff.prepareCycleOutputPacket(companyId, actor);

    return previewFirstCycle(companyId, input);
  }

  async function createApplyRequest(
    companyId: string,
    input: DearMeBrandBlueprintApplyRequest,
    actor: DearMeBrandBlueprintActor,
  ) {
    const previewResult = preview(companyId, input);
    const payload = dearMeBrandBlueprintApplyPayloadSchema.parse({
      title: previewResult.summary.title,
      summary: previewResult.summary.summary,
      recommendedAction: previewResult.summary.recommendedAction,
      nextActionOnApproval: previewResult.summary.nextActionOnApproval,
      risks: [
        ...previewResult.warnings,
        ...previewResult.blueprint.gates.map((gate) => `${gate.label}: ${gate.reason}`),
      ],
      approvalNote: input.approvalNote ?? null,
      autoDraftEnabled: input.brand.autoDraftEnabled ?? true,
      brandBlueprint: previewResult.blueprint,
      executionPlan: previewResult.executionPlan,
    });

    const approval = await approvals.create(companyId, {
      type: "dearme_brand_blueprint_apply",
      requestedByAgentId: actor.agentId,
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      status: "pending",
      payload,
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    return {
      ...previewResult,
      status: "apply_request" as const,
      approval,
    };
  }

  return {
    preview,
    previewFirstCycle,
    prepareFirstCycleProofOutputs,
    createApplyRequest,
  };
}
