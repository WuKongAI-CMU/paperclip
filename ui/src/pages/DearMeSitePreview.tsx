import { useMemo } from "react";
import { Link, useParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, ShieldCheck, Sparkles } from "lucide-react";
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

function normalizePrefix(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
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

  if (loading && !activeCompany) {
    return <div className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Loading private preview...</div>;
  }

  return (
    <DearMePageShell>
      <DearMeHero
        eyebrow={
          <>
            <Sparkles className="h-4 w-4" />
            Private preview
          </>
        }
        title={handle ? `Preview for ${handle}` : "Private preview"}
        description={
          <>
            A private preview of the first-cycle site package. Nothing goes public until you
            approve the launch decision.
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
        <DearMePanel aria-label="Private preview unavailable">
          <p className="text-sm font-medium">No private preview is stored for this handle yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start or refresh the first-cycle preview in DearMe to open the latest private page.
          </p>
        </DearMePanel>
      ) : (
        <>
          <DearMePanel aria-label="Private preview page" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Handle {proofHandle}</Badge>
              <Badge variant="outline">Private preview</Badge>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Private address</p>
              <p className="mt-1 text-sm text-foreground/80">{proofRoute}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                This page stays private until a launch decision is approved.
              </p>
            </div>
          </DearMePanel>

          <DearMeWorkbenchCard
            eyebrow="First proof trail"
            title="From one sentence to private proof"
            description="The first run shows what DearMe prepared before anything is sent or published."
            badge={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 md:grid-cols-3" aria-label="Private preview proof trail">
              {preview.proofSequence.map((moment) => (
                <div key={moment.window} className="rounded-md border border-border bg-muted/20 p-3">
                  <Badge variant="outline">{moment.window}</Badge>
                  <p className="mt-3 text-sm font-medium">{moment.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{moment.summary}</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground/80">Prepared:</span>{" "}
                      {moment.preparedArtifact}
                    </p>
                    {moment.sourceLabel ? (
                      <p>
                        <span className="font-medium text-foreground/80">From:</span>{" "}
                        {moment.sourceLabel}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium text-foreground/80">Waits:</span>{" "}
                      {moment.approvalBoundary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <DearMeWorkbenchCard
            eyebrow="Keeps working"
            title={preview.continuationPlan.title}
            description={preview.continuationPlan.summary}
            badge={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next private pass</p>
              <p className="mt-1 text-sm text-foreground/80">{preview.continuationPlan.nextReview}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3" aria-label="Next private pass">
              {preview.continuationPlan.items.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground/80">Prepared:</span>{" "}
                      {item.preparedArtifact}
                    </p>
                    <p>
                      <span className="font-medium text-foreground/80">Waits:</span>{" "}
                      {item.approvalBoundary}
                    </p>
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
                  Proposed copy stays private until the launch decision is approved.
                </p>
              </div>
            </DearMeWorkbenchCard>

            <DearMeWorkbenchCard
              eyebrow="Launch boundary"
              title={preview.approvalBoundary.label}
              description={preview.approvalBoundary.summary}
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
