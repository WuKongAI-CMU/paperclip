import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Clock3, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

import { dearmeApi, type DearMePublicFeedItem } from "@/api/dearme";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import {
  DearMeEvidenceGrid,
  DearMeFocusSurface,
  DearMePageShell,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";

const PUBLIC_FEED_LIMIT = 12;

const KIND_LABELS: Record<DearMePublicFeedItem["kind"], string> = {
  published_post: "Published post",
  deployed_site: "Proof page",
  proof_card: "Proof card",
};

const PROOF_POINTS = [
  {
    title: "Opt-in only",
    description: "Only approved public outcomes can appear here. Private work stays private.",
  },
  {
    title: "Founder dogfood",
    description: "Peter's own DearMe cycle is the first source of public proof.",
  },
  {
    title: "Receipts over claims",
    description: "Each item links to a visible output instead of asking visitors to trust a promise.",
  },
] as const;

function formatFeedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function FeedSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-label="Loading proof feed">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          data-testid="dearme-proof-skeleton"
          className="h-36 rounded-md border border-border bg-muted/30"
        />
      ))}
    </div>
  );
}

function FeedItemCard({ item }: { item: DearMePublicFeedItem }) {
  return (
    <article className="flex min-h-44 flex-col justify-between rounded-md border border-border p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <span>{KIND_LABELS[item.kind]}</span>
          <span aria-hidden="true">/</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {formatFeedDate(item.publishedAt)}
          </span>
        </div>
        <p className="mt-3 text-base leading-7 text-foreground">{item.summary}</p>
      </div>
      <a
        href={item.linkUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
      >
        View proof
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </article>
  );
}

export function DearMeProof() {
  const feedQuery = useQuery({
    queryKey: queryKeys.dearme.publicFeed(PUBLIC_FEED_LIMIT),
    queryFn: () => dearmeApi.getPublicFeed(PUBLIC_FEED_LIMIT),
    staleTime: 60_000,
  });
  const items = feedQuery.data?.items ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 border-b border-border pb-4" aria-label="DearMe proof">
          <a href="/landing" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <a href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</a>
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite">
                Request invite
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(24rem,1.08fr)] lg:items-start lg:py-14">
          <div className="space-y-7">
            <header className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Public proof feed
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
                DearMe is using DearMe in public.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                This feed shows approved public outcomes from the founder's own private brand cycle.
                The private work stays private; only opted-in receipts appear here.
              </p>
            </header>

            <DearMeFocusSurface aria-label="Proof feed privacy posture" tone="empty">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                <p className="text-sm leading-6 text-muted-foreground">
                  DearMe prepares work privately first. Publish, send, deploy, and spend still require approval before
                  any public receipt can be recorded.
                </p>
              </div>
            </DearMeFocusSurface>

            <DearMeEvidenceGrid columns="three">
              {PROOF_POINTS.map((point) => (
                <DearMeWorkbenchCard
                  key={point.title}
                  title={point.title}
                  description={point.description}
                />
              ))}
            </DearMeEvidenceGrid>
          </div>

          <section aria-label="Recent DearMe proof" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Recent proof</h2>
                <p className="mt-1 text-sm text-muted-foreground">Approved public receipts from the live dogfood loop.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => void feedQuery.refetch()}
              >
                Refresh
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {feedQuery.isLoading ? <FeedSkeleton /> : null}

            {feedQuery.isError ? (
              <DearMeFocusSurface tone="empty" aria-label="Proof feed unavailable">
                <h3 className="text-base font-semibold">Proof feed is unavailable.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The public page is still live, but the latest receipts could not load.
                </p>
              </DearMeFocusSurface>
            ) : null}

            {!feedQuery.isLoading && !feedQuery.isError && items.length === 0 ? (
              <DearMeFocusSurface tone="empty" aria-label="No public proof yet">
                <h3 className="text-base font-semibold">No public proof is published yet.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Peter can opt in from his DearMe account after the first approved public outcome is ready.
                </p>
              </DearMeFocusSurface>
            ) : null}

            {items.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2" aria-live="polite">
                {items.map((item) => (
                  <FeedItemCard key={item.id} item={item} />
                ))}
              </div>
            ) : null}
          </section>
        </section>
      </DearMePageShell>
    </main>
  );
}
