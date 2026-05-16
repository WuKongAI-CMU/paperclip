import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DearMeReferralCodeResponse } from "@paperclipai/shared";
import {
  CheckCircle2,
  Copy,
  Gift,
  Linkedin,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { ApiError } from "../api/client";
import { dearmeApi } from "../api/dearme";
import {
  DearMeCockpitGrid,
  DearMeHero,
  DearMeMetricStrip,
  DearMePageShell,
  DearMePanel,
  DearMeWorkbenchCard,
  DearMeWorkbenchSectionHeader,
} from "../components/DearMeShell";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

const SHARE_TEXT = "I am using DearMe to keep my private brand work moving every week.";

function shareUrl(kind: "x" | "linkedin", referralUrl: string) {
  if (kind === "x") {
    const params = new URLSearchParams({ text: SHARE_TEXT, url: referralUrl });
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }
  const params = new URLSearchParams({ url: referralUrl });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function referralStatusText(
  queryError: Error | null,
  data: DearMeReferralCodeResponse | undefined,
) {
  if (queryError instanceof ApiError && queryError.status === 403) {
    return {
      title: "Referral access opens after the paid beta is active.",
      body: "Once your beta access is active, this page creates one invite link you can share with trusted founders.",
    };
  }
  if (queryError instanceof ApiError && queryError.status === 503) {
    return {
      title: "Referral setup is almost ready.",
      body: "The invite page is in place. Referral code creation opens when hosted billing is connected.",
    };
  }
  if (queryError) {
    return {
      title: "Referral code is unavailable right now.",
      body: "Refresh in a moment. Existing codes stay saved once created.",
    };
  }
  if (data?.status === "not_minted") {
    return {
      title: "Create your referral code.",
      body: "Mint a private invite link, copy it, then share it with someone who should try DearMe next.",
    };
  }
  return {
    title: "Your referral link is ready.",
    body: "Share it with a founder who wants private proof, better drafts, and a weekly brand cycle without surprise public moves.",
  };
}

export function DearMeReferral() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const companyId = selectedCompanyId ?? "";

  useEffect(() => {
    setBreadcrumbs([{ label: "DearMe" }, { label: "Refer" }]);
  }, [setBreadcrumbs]);

  const referralQuery = useQuery({
    queryKey: queryKeys.dearme.referralCode(companyId || "__none__"),
    queryFn: () => dearmeApi.getReferralCode(companyId),
    enabled: companyId.length > 0,
    retry: false,
  });

  const mintReferral = useMutation({
    mutationFn: () => dearmeApi.mintReferralCode(companyId),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.dearme.referralCode(companyId), result);
      setCopied(false);
    },
  });

  const referral = referralQuery.data;
  const referralUrl = referral?.referralUrl ?? "";
  const status = referralStatusText(referralQuery.error, referral);
  const canMint = Boolean(companyId) && referral?.status !== "ready" && !referralQuery.error;
  const canShare = referral?.status === "ready" && Boolean(referralUrl);

  const shareLinks = useMemo(() => {
    if (!referralUrl) return null;
    return {
      x: shareUrl("x", referralUrl),
      linkedin: shareUrl("linkedin", referralUrl),
    };
  }, [referralUrl]);

  async function handleCopy() {
    if (!referralUrl) return;
    await copyText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <DearMeHero
        eyebrow="Referral"
        title="Invite one more founder into a private brand cycle."
        description="Create a shareable DearMe link for trusted referrals. The code stays tied to this profile, and earned rewards appear here after the referred account pays."
        actions={
          canMint ? (
            <Button
              type="button"
              onClick={() => mintReferral.mutate()}
              disabled={mintReferral.isPending}
            >
              {mintReferral.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              Create code
            </Button>
          ) : null
        }
      />

      <DearMeMetricStrip>
        {[
          { label: "Code status", value: referral?.status === "ready" ? "Ready" : "Waiting" },
          { label: "Paid referrals", value: String(referral?.rewardCount ?? 0) },
          { label: "Reward", value: "20%" },
        ].map((metric) => (
          <DearMeWorkbenchCard
            key={metric.label}
            eyebrow={metric.label}
            title={<span className="text-2xl font-semibold">{metric.value}</span>}
          />
        ))}
      </DearMeMetricStrip>

      <DearMeCockpitGrid>
        <DearMePanel className="space-y-5">
          <DearMeWorkbenchSectionHeader
            icon={Gift}
            eyebrow="Invite link"
            title={status.title}
            description={status.body}
          />

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Referral code
            </div>
            <div className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
              <code className="min-w-0 truncate text-sm font-semibold text-foreground">
                {referral?.code ?? "Not created yet"}
              </code>
              {canShare ? (
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
            {canShare ? (
              <p className="mt-3 break-all text-xs leading-5 text-muted-foreground">{referralUrl}</p>
            ) : null}
          </div>

          {mintReferral.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Referral code creation opens once payments are connected.
            </div>
          ) : null}
        </DearMePanel>

        <DearMePanel className="space-y-4">
          <DearMeWorkbenchSectionHeader
            icon={Share2}
            eyebrow="Share"
            title="Send the link where your best referrals already are."
            description="Use the channel buttons or copy the link into a personal note."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" disabled={!canShare}>
              <a href={shareLinks?.x ?? "#"} target="_blank" rel="noreferrer" aria-disabled={!canShare}>
                <Share2 className="h-4 w-4" />
                X
              </a>
            </Button>
            <Button asChild variant="outline" disabled={!canShare}>
              <a href={shareLinks?.linkedin ?? "#"} target="_blank" rel="noreferrer" aria-disabled={!canShare}>
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </Button>
            <Button type="button" variant="outline" onClick={handleCopy} disabled={!canShare} className="sm:col-span-2">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy invite link
            </Button>
          </div>
          <DearMeWorkbenchCard
            title="What your referral sees"
            description="The link opens the DearMe beta page with your code attached. The referral is applied when your invite becomes a paid account."
          />
        </DearMePanel>
      </DearMeCockpitGrid>
    </DearMePageShell>
  );
}
