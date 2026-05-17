import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { capture } from "@/lib/analytics";
import {
  DearMeEvidenceGrid,
  DearMePageShell,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";

export type DearMeCheckoutReturnKind = "success" | "cancel";
type DearMeCheckoutReturnSource = "paid" | "pricing" | "landing" | "direct";

const RETURN_COPY: Record<
  DearMeCheckoutReturnKind,
  {
    eyebrow: string;
    title: string;
    body: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref: string;
    secondaryLabel: string;
  }
> = {
  success: {
    eyebrow: "Checkout complete",
    title: "Payment received. Your private cycle is being confirmed.",
    body: "DearMe is matching the receipt to your beta access. Return to the workroom to see the paid access panel and start from the latest saved step.",
    primaryHref: "/dearme?checkout_return=success#dearme-paid-beta-access",
    primaryLabel: "Check paid access",
    secondaryHref: "/dearme?checkout_return=success",
    secondaryLabel: "Return to workroom",
  },
  cancel: {
    eyebrow: "Checkout not completed",
    title: "No payment was recorded.",
    body: "You can return to the private beta close kit when you are ready, or review the plan details before trying again.",
    primaryHref: "/dearme?checkout_return=cancel#dearme-paid-beta-access",
    primaryLabel: "Return to close kit",
    secondaryHref: "/pricing",
    secondaryLabel: "Review pricing",
  },
};

function parseDearMeCheckoutReturnSource(search: string): DearMeCheckoutReturnSource {
  const source = new URLSearchParams(search).get("source");
  if (source === "paid" || source === "pricing" || source === "landing" || source === "direct") {
    return source;
  }
  return "direct";
}

function buildDearMeCheckoutReturnHref(
  status: DearMeCheckoutReturnKind,
  source: DearMeCheckoutReturnSource,
  hash?: string,
) {
  const params = new URLSearchParams({
    checkout_return: status,
    checkout_source: source,
  });
  return `/dearme?${params.toString()}${hash ?? ""}`;
}

const NEXT_STEPS: Record<
  DearMeCheckoutReturnKind,
  readonly { title: string; description: string }[]
> = {
  success: [
    {
      title: "Receipt match",
      description: "The paid access panel shows the receipt once the checkout event lands.",
    },
    {
      title: "First cycle",
      description: "Your private proof, voice, and weekly plan stay in the workroom for review.",
    },
    {
      title: "Approval-only",
      description: "Public posts, messages, spend, and deploys still wait for your explicit call.",
    },
  ],
  cancel: [
    {
      title: "Keep the preview",
      description: "Your saved proof preview and setup answers stay available in the workroom.",
    },
    {
      title: "Review the offer",
      description: "The pricing page explains the $29 beta plan and trial posture.",
    },
    {
      title: "Try again later",
      description: "Checkout can restart from the close kit when your seat is ready.",
    },
  ],
};

export function DearMeCheckoutReturn({ kind }: { kind: DearMeCheckoutReturnKind }) {
  const copy = RETURN_COPY[kind];
  const Icon = kind === "success" ? CheckCircle2 : XCircle;
  const checkoutSource = parseDearMeCheckoutReturnSource(window.location.search);
  const primaryHref = buildDearMeCheckoutReturnHref(
    kind,
    checkoutSource,
    `#dearme-paid-beta-access`,
  );
  const secondaryHref =
    kind === "success"
      ? buildDearMeCheckoutReturnHref(kind, checkoutSource)
      : copy.secondaryHref;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    capture("checkout_return_viewed", {
      status: kind,
      source: checkoutSource,
      has_session_marker: params.has("session_id"),
      has_cancel_marker: params.get("checkout") === "cancelled",
    });
  }, [checkoutSource, kind]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav
          className="flex items-center justify-between gap-3 border-b border-border pb-4"
          aria-label="DearMe checkout"
        >
          <a
            href="/landing"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80"
          >
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
            Pricing
          </a>
        </nav>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.65fr)] lg:items-center lg:py-14">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4" />
              {copy.eyebrow}
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {copy.body}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-11">
                <a href={primaryHref}>
                  {copy.primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-11">
                <a href={secondaryHref}>{copy.secondaryLabel}</a>
              </Button>
            </div>
          </div>

          <section
            aria-label="Checkout next steps"
            className="rounded-lg border border-border bg-muted/20 p-5"
          >
            <h2 className="text-xl font-semibold">What happens next</h2>
            <div className="mt-4 space-y-4">
              {NEXT_STEPS[kind].map((step) => (
                <div
                  key={step.title}
                  className="border-t border-border pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="text-sm font-medium">{step.title}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <DearMeEvidenceGrid columns="three" className="border-t border-border py-6">
          <DearMeWorkbenchCard
            title="Private by default"
            description="Drafts and proof stay inside your workroom until you approve an outside move."
          />
          <DearMeWorkbenchCard
            title="Receipt-gated"
            description="Paid access starts from a recorded receipt, not from a button click alone."
          />
          <DearMeWorkbenchCard
            title="Review first"
            description="The first paid cycle keeps the proof pack inspectable before anything leaves the room."
          />
        </DearMeEvidenceGrid>
      </DearMePageShell>
    </main>
  );
}
