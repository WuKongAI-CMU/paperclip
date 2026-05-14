import { useMemo } from "react";
import {
  DEARME_OWNER_PROOF_FACT_SPECS,
  type DearMeFirstCyclePreviewResponse,
} from "@paperclipai/shared";
import { Link, useParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  FileText,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import {
  DearMeChecklist,
  DearMeHero,
  DearMePageShell,
  DearMePanel,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";
import {
  readDearMeFirstCyclePreview,
} from "../lib/dearme-site-preview";

type StarterPost = DearMeFirstCyclePreviewResponse["starterPosts"][number];
type OpportunityLead = DearMeFirstCyclePreviewResponse["opportunityShortlist"][number];
type ProofSequenceItem = DearMeFirstCyclePreviewResponse["proofSequence"][number];
type LiveWorkTrailItem = DearMeFirstCyclePreviewResponse["liveWorkTrail"][number];
type CycleReportItem = DearMeFirstCyclePreviewResponse["cycleReport"]["items"][number];
type ValueReportItem = DearMeFirstCyclePreviewResponse["valueReport"]["items"][number];
type OpportunityRoiItem = DearMeFirstCyclePreviewResponse["opportunityRoiReport"]["items"][number];
type ContinuationPlanItem = DearMeFirstCyclePreviewResponse["continuationPlan"]["items"][number];
type OwnerProofFact = (typeof DEARME_OWNER_PROOF_FACT_SPECS)[number];

const LIVE_WORK_STATUS_LABELS: Record<DearMeFirstCyclePreviewResponse["liveWorkTrail"][number]["status"], string> = {
  ready: "Ready",
  working: "Working",
  your_call: "Your call",
};

const CYCLE_REPORT_STATUS_LABELS: Record<DearMeFirstCyclePreviewResponse["cycleReport"]["items"][number]["status"], string> = {
  moved: "Moved",
  ready: "Ready",
  blocked: "Boundary",
  next: "Next",
};

const CHANNEL_LABELS: Record<StarterPost["channel"], string> = {
  linkedin: "LinkedIn",
  x: "X",
  newsletter: "Newsletter",
  blog: "Blog",
  portfolio: "Portfolio",
  email: "Email",
  community: "Community",
  website: "Website",
};

const CONTACT_STATUS_LABELS: Record<OpportunityLead["contactEvidence"]["status"], string> = {
  verified: "Contact verified",
  pending: "Contact pending",
  unavailable: "No direct contact yet",
};

const OPPORTUNITY_ROI_PRIORITY_LABELS: Record<OpportunityRoiItem["priority"], string> = {
  launch_first: "Launch-call candidate",
  verify_contact: "Verify contact",
  warm_intro: "Warm intro path",
};

const OWNER_PROOF_FACT_COPY: Record<OwnerProofFact["provideAs"], {
  label: string;
  summary: string;
  ownerPrompt: string;
  boundary: string;
}> = {
  DEARME_LINKEDIN_DM_MESSAGES_URL: {
    label: "Professional-network delivery route",
    summary: "The route for the first live professional-network receipt.",
    ownerPrompt: "Paste the delivery-route link for the first receipt check.",
    boundary: "DearMe checks this in no-send mode before any live receipt moves.",
  },
  DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: {
    label: "Approved professional-network recipient",
    summary: "One real recipient selected for the first receipt check.",
    ownerPrompt: "Choose one real professional-network recipient for the proof pass.",
    boundary: "Only this selected recipient is used for the first guarded receipt.",
  },
  DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: {
    label: "Approved phone-message proof recipient",
    summary: "One real recipient selected for the shared phone-message proof.",
    ownerPrompt: "Choose one phone-message recipient for the shared proof pass.",
    boundary: "The receipt stays behind the final launch call after the no-send check.",
  },
};

function normalizePrefix(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function contactEvidenceLine(lead: OpportunityLead): string {
  return [
    lead.contactEvidence.contactEmail,
    lead.contactEvidence.contactHandle,
    lead.contactEvidence.contactUrl,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0)).join(" · ") ||
    "No direct contact record yet";
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function proofStepTitle(moment: ProofSequenceItem): string {
  if (moment.title === "Private site proof") return "Proof page";
  return moment.title;
}

function displayArtifact(value: string): string {
  return value
    .replace("Private proof page move", "Proof page move")
    .replace("Updated private proof card", "Updated proof card");
}

function sourceLabel(value: string): string {
  return value.replace("private profile work", "profile work");
}

function proofLaunchLine(moment: ProofSequenceItem): string {
  if (moment.title === "Identity dossier") {
    return "Sensitive or public claims stay behind the launch call while research and drafts keep moving.";
  }
  if (moment.title === "Audience map") {
    return "Outreach stays staged until you choose the send path.";
  }
  return "Public page changes stay behind one launch decision.";
}

function liveWorkReceipt(item: LiveWorkTrailItem): string {
  if (item.id === "launch-call-ready") {
    return "Public posts, outreach, page changes, and spend are ready for one launch decision.";
  }
  if (item.id === "identity-dossier-ready") {
    return item.receipt.replace("ready for review", "ready for the proof page");
  }
  return item.receipt;
}

function cycleReportLabel(item: CycleReportItem): string {
  if (item.id === "prepared-but-blocked") return "Prepared behind the launch call";
  return item.label;
}

function cycleReportSummary(
  item: CycleReportItem,
  preview: DearMeFirstCyclePreviewResponse,
): string {
  if (item.id === "ready-for-launch-call") {
    return `${preview.starterPosts.length} drafts, ${preview.opportunityShortlist.length} opportunity leads, and one proof card are ready for the launch call.`;
  }
  if (item.id === "prepared-but-blocked") {
    return "Public posts, outreach, page changes, and spend stay behind one launch decision while the team keeps preparing.";
  }
  return item.summary;
}

function cycleReportNextCall(item: CycleReportItem): string | null {
  if (item.id === "ready-for-launch-call") {
    return "Launch, revise, or redirect from one place.";
  }
  if (item.id === "prepared-but-blocked") {
    return "Keep the team preparing; choose the public move when ready.";
  }
  return item.nextCall ?? null;
}

function cycleReportSource(item: CycleReportItem): string {
  if (item.source === "Private proof pack") return "Proof pack";
  if (item.source === "Next private pass") return "Next work lined up";
  return item.source;
}

function valueReportText(text: string): string {
  return text
    .replace(/\bprivate proof page\b/gi, "proof page")
    .replace(/\bprivate route\b/gi, "proof route")
    .replace(/\bprivate pass\b/gi, "proof pass")
    .replace(/\bheld back\b/gi, "kept behind the launch call")
    .replace(/\bapproval boundaries\b/gi, "launch boundaries")
    .replace(/\bqueued\b/gi, "lined up");
}

function valueReportSummary(item: ValueReportItem): string {
  return valueReportText(item.summary);
}

function valueReportMetric(item: ValueReportItem): string {
  return valueReportText(item.metric);
}

function opportunityRoiPriority(item: OpportunityRoiItem): string {
  return OPPORTUNITY_ROI_PRIORITY_LABELS[item.priority];
}

function continuationLaunchLine(item: ContinuationPlanItem): string {
  if (item.id === "sharpen-next-draft") {
    return "Posting stays behind the launch call while the draft keeps improving.";
  }
  if (item.id === "refresh-opportunity-lead") {
    return "Sending stays behind the launch call while the outreach angle keeps improving.";
  }
  return "Public page changes stay behind the launch call while the proof card keeps improving.";
}

function starterPostBody(body: string): string {
  return body
    .replace(
      /Before this goes public, I would anchor the claim in ([^.]+) and keep the wording specific enough to review\./,
      "Before this goes public, I would anchor the claim in $1 and keep the wording specific.",
    )
    .replace(
      "This should stay private until the proof and public claim are approved.",
      "This is staged for the launch call after the proof and public claim are clear.",
    )
    .replace(
      "This should stay staged until the proof and public claim are ready for launch.",
      "This is staged for the launch call after the proof and public claim are clear.",
    )
    .replace(
      "I would keep this as a private opening until the outreach or publish path is approved.",
      "I would stage this as the opening for the outreach or publish path.",
    )
    .replace(
      "I would keep this staged until the outreach or publish path is chosen.",
      "I would stage this as the opening for the outreach or publish path.",
    )
    .replace(
      "This stays private until the lesson, proof, and claim are approved.",
      "This is staged for the launch call once the lesson, proof, and claim are clear.",
    )
    .replace(
      "This stays staged until the lesson, proof, and claim are ready.",
      "This is staged for the launch call once the lesson, proof, and claim are clear.",
    )
    .replace(
      "Keep this as a private draft until the publish path is approved.",
      "Keep this as a launch-ready draft for the publish path.",
    )
    .replace(
      "Keep this as a staged draft until the publish path is chosen.",
      "Keep this as a launch-ready draft for the publish path.",
    );
}

export function DearMeSitePreview() {
  const { companyPrefix, handle } = useParams<{ companyPrefix?: string; handle?: string }>();
  const { companies, selectedCompany, loading } = useCompany();

  const activePrefix = normalizePrefix(companyPrefix ?? selectedCompany?.issuePrefix ?? null);
  const activeCompany = useMemo(() => {
    if (selectedCompany && normalizePrefix(selectedCompany.issuePrefix) === activePrefix) {
      return selectedCompany;
    }
    if (!activePrefix) return selectedCompany ?? null;
    return companies.find((company) => normalizePrefix(company.issuePrefix) === activePrefix) ?? null;
  }, [activePrefix, companies, selectedCompany]);

  const preview =
    activeCompany?.id && handle
      ? readDearMeFirstCyclePreview(activeCompany.id, handle)
      : null;

  const proofRoute = preview?.sitePreview.route ?? (handle ? `dearme.app/${handle}` : "dearme.app/<handle>");
  const proofHandle = preview?.sitePreview.handle ?? handle ?? "<handle>";
  const proofLoop = preview
    ? [
        {
          icon: Sparkles,
          label: "Proof ready",
          title: displayArtifact(preview.proofSequence[2]?.preparedArtifact ?? "Proof page move"),
          detail: "The current proof pack is ready to use; DearMe keeps public moves behind the launch call.",
        },
        {
          icon: RefreshCw,
          label: "Next work",
          title: "Next work lined up",
          detail: `${preview.continuationPlan.items.length} improvements are already lined up for the next cycle.`,
        },
        {
          icon: ShieldCheck,
          label: "Launch call",
          title: preview.approvalBoundary.label,
          detail: "Public posts, outreach, page changes, and spend stay behind one final launch call.",
        },
      ]
    : [];
  const firstOpportunity = preview?.opportunityShortlist[0];
  const ahaBridge = preview
    ? [
        {
          label: "You answered",
          title: preview.positioning,
          detail: preview.prompt,
        },
        {
          label: "Proof page built",
          title: proofRoute,
          detail: "The proof page is already built; you choose when it leaves DearMe.",
        },
        {
          label: "Next work lined up",
          title: `${preview.starterPosts.length} drafts and ${preview.opportunityShortlist.length} leads`,
          detail: firstOpportunity ? `First lead: ${firstOpportunity.target}` : "The first opportunity lane is ready.",
        },
        {
          label: "Launch-ready",
          title: preview.approvalBoundary.label,
          detail: "Public moves stay behind your final launch call.",
        },
      ]
    : [];
  const privateBetaSalesReceipt = preview
    ? [
        {
          label: "Sellable package",
          title: `First proof page, ${preview.starterPosts.length} drafts, ${preview.opportunityShortlist.length} leads`,
          detail: "A manual paid beta account can start from this package without waiting for broad launch.",
        },
        {
          label: "Aha moment",
          title: "Value is visible in the first session",
          detail: "The proof page, draft packet, opportunity list, and next-cycle plan are already assembled.",
        },
        {
          label: "Operating promise",
          title: "Keeps preparing after the first pass",
          detail: "DearMe keeps improving content, opportunities, proof, reports, and Voice & Memory between launch calls.",
        },
        {
          label: "Public scale boundary",
          title: `${DEARME_OWNER_PROOF_FACT_SPECS.length} live receipt details left`,
          detail: "Broad launch waits for the selected delivery details and one guarded live receipt.",
        },
      ]
    : [];
  const paidBetaWelcomePlan = preview
    ? [
        {
          label: "First 5 minutes",
          title: "Proof is visible immediately",
          detail:
            "Start from one sentence; DearMe prepares a proof pack, Voice & Memory, and launch boundary.",
        },
        {
          label: "First week",
          title: "Useful work keeps arriving",
          detail: "Content, opportunities, portfolio proof, reports, and review calls stay visible.",
        },
        {
          label: "Support follow-up",
          title: "Empty weeks get recovered",
          detail: "Stuck paths get make-good support or clearer direction before the next check-in.",
        },
        {
          label: "Launch boundary",
          title: "Public moves stay deliberate",
          detail: "Public posts, outreach, page changes, and spend wait for the launch call.",
        },
      ]
    : [];

  if (loading && !activeCompany) {
    return <div className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Loading proof page...</div>;
  }

  return (
    <DearMePageShell>
      <DearMeHero
        eyebrow={
          <>
            <Sparkles className="h-4 w-4" />
            Launch-ready proof
          </>
        }
        title={handle ? `Proof page for ${handle}` : "Launch-ready proof page"}
        description={
          <>
            The first-cycle site package is built. DearMe keeps the next work in motion, and
            you choose the launch call.
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/dearme">
              <ArrowLeft className="h-4 w-4" />
              Back to DearMe
            </Link>
          </Button>
        }
      />

      {!preview ? (
        <DearMePanel aria-label="Proof page unavailable">
          <p className="text-sm font-medium">No proof page is stored for this handle yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start or refresh the first-cycle proof in DearMe to open the latest page.
          </p>
        </DearMePanel>
      ) : (
        <>
          <DearMePanel aria-label="Proof page summary" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Handle {proofHandle}</Badge>
              <Badge variant="outline">Proof page ready</Badge>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proof address</p>
              <p className="mt-1 text-sm text-foreground/80">{proofRoute}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Internal until your launch call.
              </p>
            </div>
          </DearMePanel>

          <DearMeWorkbenchCard
            eyebrow="Review handoff"
            title="Take this proof back to Work Ready"
            description="Use this page to inspect the first proof, then return to DearMe to review the packet, make the launch call, or let the next private pass keep moving."
            badge={<FileText className="h-4 w-4 text-muted-foreground" />}
          >
            <div
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
              aria-label="Proof page review handoff"
            >
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium">Next customer action</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the proof pack in Work Ready first. Decisions holds only the public post,
                  outreach, page-change, or spend call.
                </p>
              </div>
              <Button asChild>
                <Link to="/dearme?view=brand-os#dearme-work-ready">
                  <FileText className="h-4 w-4" />
                  Review Work Ready
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dearme?view=decisions#dearme-decisions-needed">
                  <ShieldCheck className="h-4 w-4" />
                  Open Decisions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Aha bridge"
            title="Your one sentence became a proof page and live next work"
            description="DearMe turns the starting answer into a proof page, draft packet, opportunity list, and launch boundary; the next work is already lined up."
            badge={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-4" aria-label="Proof page aha bridge">
              {ahaBridge.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Sellable beta"
            title="This proof page is enough to sell a private beta account"
            description="DearMe can sell and operate a manual paid beta now: first proof, launch-ready work, recovery, and reporting are visible before broad launch."
            badge={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-4" aria-label="Private beta sales receipt">
              {privateBetaSalesReceipt.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            <div
              className="mt-3 rounded-md border border-border bg-background/80 p-3"
              aria-label="Paid beta first week promise"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">First paid week promise</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The buyer sees what happens now, what keeps moving this week, and where the public-launch
                    decision lives.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit">
                  Customer-safe
                </Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {paidBetaWelcomePlan.map((item) => (
                  <div key={item.label} className="rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Private beta start handoff"
            >
              <div>
                <p className="text-sm font-medium">Ready to start a paid account</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Record paid access in DearMe, then start the first brand cycle. This page does not send,
                  publish, or spend.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/dearme?view=brand-os#dearme-paid-beta-access">
                  <CreditCard className="h-4 w-4" />
                  Open paid beta access
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Autonomous proof loop"
            title="Proof ready, next work lined up, launch call preserved"
            description="The page shows what is ready now, what DearMe is preparing next, and the one launch call for public moves."
            badge={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-3" aria-label="Autonomous proof loop">
              {proofLoop.map((item) => {
                const LoopIcon = item.icon;

                return (
                  <div key={item.label} className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <LoopIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {item.label}
                    </div>
                    <p className="mt-3 text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Launch proof"
            title="Proof page is built. Three receipts make launch real."
            description="Use the proof page now. Broad launch only needs the live-route details and your final launch call."
            badge={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-3" aria-label="Launch receipt proof needs">
              {DEARME_OWNER_PROOF_FACT_SPECS.map((fact) => (
                <div key={fact.provideAs} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium">{OWNER_PROOF_FACT_COPY[fact.provideAs].label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {OWNER_PROOF_FACT_COPY[fact.provideAs].summary}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {OWNER_PROOF_FACT_COPY[fact.provideAs].ownerPrompt}
                  </p>
                  <p className="mt-2 text-xs font-medium text-foreground/80">
                    {OWNER_PROOF_FACT_COPY[fact.provideAs].boundary}
                  </p>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="First proof trail"
            title="From one sentence to proof-ready page"
            description="The first run shows what DearMe prepared and what is already staged for launch."
            badge={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-3" aria-label="Proof-ready trail">
              {preview.proofSequence.map((moment) => (
                <div key={moment.window} className="rounded-md border border-border bg-muted/20 p-3">
                  <Badge variant="outline">{moment.window}</Badge>
                  <p className="mt-3 text-sm font-medium">{proofStepTitle(moment)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{moment.summary}</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground/80">Prepared:</span>{" "}
                      {displayArtifact(moment.preparedArtifact)}
                    </p>
                    {moment.sourceLabel ? (
                      <p>
                        <span className="font-medium text-foreground/80">From:</span>{" "}
                        {sourceLabel(moment.sourceLabel)}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium text-foreground/80">Launch call:</span>{" "}
                      {proofLaunchLine(moment)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Live work receipts"
            title="Who worked and what is ready"
            description="The proof page carries the first-run role trail so progress is visible without sending, publishing, or deploying."
            badge={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 lg:grid-cols-5" aria-label="Proof page live work receipts">
              {preview.liveWorkTrail.map((item) => (
                <div key={item.id} className="flex min-h-44 flex-col rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.window}</Badge>
                    <Badge variant={item.status === "your_call" ? "secondary" : "default"}>
                      {LIVE_WORK_STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium">{item.action}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{roleLabel(item.ownerRole)}</p>
                  <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{liveWorkReceipt(item)}</p>
                  <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">{displayArtifact(item.artifact)}</p>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Cycle report"
            title={preview.cycleReport.title}
            description={preview.cycleReport.summary}
            badge={<FileText className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Proof page cycle report">
              {preview.cycleReport.items.map((item) => (
                <div key={item.id} className="flex min-h-44 flex-col rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.status === "blocked" ? "secondary" : "outline"}>
                      {CYCLE_REPORT_STATUS_LABELS[item.status]}
                    </Badge>
                    <Badge variant="outline">{roleLabel(item.ownerRole)}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium">{cycleReportLabel(item)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{cycleReportSummary(item, preview)}</p>
                  {cycleReportNextCall(item) ? (
                    <p className="mt-3 text-xs text-muted-foreground">{cycleReportNextCall(item)}</p>
                  ) : null}
                  <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">{cycleReportSource(item)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{preview.cycleReport.closingLine}</p>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Value report"
            title={valueReportText(preview.valueReport.title)}
            description={valueReportText(preview.valueReport.summary)}
            badge={<Gauge className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Measured window</p>
              <p className="mt-1 text-sm text-foreground/80">{valueReportText(preview.valueReport.period)}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Proof page value report">
              {preview.valueReport.items.map((item) => (
                <div key={item.id} className="flex min-h-44 flex-col rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.count} {item.unit}</Badge>
                    <Badge variant="outline">{roleLabel(item.ownerRole)}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium">{valueReportText(item.label)}</p>
                  <p className="mt-1 text-xs font-medium text-foreground/80">{valueReportMetric(item)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{valueReportSummary(item)}</p>
                  <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">{valueReportText(item.source)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{valueReportText(preview.valueReport.closingLine)}</p>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Keeps working"
            title={preview.continuationPlan.title}
            description="After the first proof pack, DearMe keeps the weekly cycle alive: sharpen one draft, refresh one opportunity, and improve the proof page before the next pass."
            badge={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next work lined up</p>
              <p className="mt-1 text-sm text-foreground/80">Next proof cycle</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3" aria-label="Next work lined up">
              {preview.continuationPlan.items.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground/80">Prepared:</span>{" "}
                      {displayArtifact(item.preparedArtifact)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground/80">Launch call:</span>{" "}
                      {continuationLaunchLine(item)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Prepared drafts"
            title="Starter posts are ready for the launch call"
            description="DearMe turns the first sentence into proof-backed drafts while publishing stays behind your call."
            badge={<FileText className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 lg:grid-cols-3" aria-label="Prepared starter drafts">
              {preview.starterPosts.map((post) => (
                <div key={post.id} className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{CHANNEL_LABELS[post.channel]}</Badge>
                    <Badge variant="secondary">Draft</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium">{post.title}</p>
                  <p className="mt-2 text-sm text-foreground/80">{post.hook}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{starterPostBody(post.body)}</p>
                  <div className="mt-3 rounded-md border border-border bg-background/60 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Source proof
                    </p>
                    <p className="mt-1 text-sm text-foreground/80">{post.proofUsed}</p>
                  </div>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Opportunity ROI"
            title={preview.opportunityRoiReport.title}
            description={preview.opportunityRoiReport.summary}
            badge={<Gauge className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="Opportunity ROI report">
              {preview.opportunityRoiReport.items.map((item) => (
                <div key={item.id} className="flex min-h-56 flex-col rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.score}/100</Badge>
                    <Badge variant="outline">{opportunityRoiPriority(item)}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium">{item.leadTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.target}</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground/80">Return:</span> {item.expectedReturn}</p>
                    <p><span className="font-medium text-foreground/80">Effort:</span> {item.effort}</p>
                    <p><span className="font-medium text-foreground/80">Confidence:</span> {item.confidence}</p>
                    <p><span className="font-medium text-foreground/80">Next:</span> {item.nextAction}</p>
                  </div>
                  <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">{item.source}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{preview.opportunityRoiReport.closingLine}</p>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Opportunity shortlist"
            title="Five launch leads are prepared"
            description="DearMe researches fit, contact evidence, and first-message angles before any outreach is sent."
            badge={<Users className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-4 md:grid-cols-2" aria-label="Opportunity shortlist">
              {preview.opportunityShortlist.map((lead, index) => (
                <div key={`${lead.title}-${lead.target}`} className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Lead {index + 1}
                      </p>
                      <p className="mt-1 text-sm font-medium">{lead.title}</p>
                      <p className="text-xs text-muted-foreground">{lead.target}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="secondary">{lead.relevanceScore}/10</Badge>
                      <Badge
                        variant={lead.contactEvidence.status === "verified" ? "default" : "outline"}
                        className="h-auto"
                      >
                        {CONTACT_STATUS_LABELS[lead.contactEvidence.status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Contact evidence
                      </p>
                      <p className="mt-1 text-foreground/80">{contactEvidenceLine(lead)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Source signal
                      </p>
                      <p className="mt-1 text-foreground/80">{lead.contactEvidence.sourceSignal}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Why this target
                      </p>
                      <p className="mt-1 text-foreground/80">{lead.whyRelevant}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        First message angle
                      </p>
                      <p className="mt-1 text-foreground/80">{lead.outreachAngle}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Draft message
                      </p>
                      <p className="mt-1 text-foreground/80">{lead.draftMessage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <DearMeWorkbenchCard
              eyebrow="Portfolio proof card"
              title={preview.portfolioProofCard.placement}
              description={preview.portfolioProofCard.proposedCopy}
              badge={<FileText className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="h-auto max-w-full justify-start whitespace-normal text-left leading-snug"
                >
                  Source proof: {preview.portfolioProofCard.proofSource}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Proposed copy is staged until you choose to launch.
                </p>
              </div>
            </DearMeWorkbenchCard>

            <DearMeWorkbenchCard
              eyebrow="Launch boundary"
              title={preview.approvalBoundary.label}
              description="The team keeps preparing automatically; only public posting, outreach, page changes, and spend need your launch call."
              badge={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
            >
              <DearMeChecklist
                className="sm:grid-cols-2"
                icon={ShieldCheck}
                items={preview.approvalBoundary.blockedActions}
                itemClassName="bg-background/60"
                aria-label="Launch boundary actions"
              />
            </DearMeWorkbenchCard>
          </div>
        </>
      )}
    </DearMePageShell>
  );
}
