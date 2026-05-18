import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { capture } from "@/lib/analytics";
import {
  DearMeEvidenceGrid,
  DearMePageShell,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";

const ABOUT_PRINCIPLES = [
  {
    title: "Dogfood first",
    description: "Peter is using DearMe as customer zero before asking other solo operators to trust it.",
  },
  {
    title: "Proof over noise",
    description: "The product is tuned around receipts, useful writing, and opportunity signals instead of volume.",
  },
  {
    title: "Owner keeps the call",
    description: "Public claims, sends, spending, and launches stay gated until the person behind the work decides.",
  },
] as const;

const NOT_FOR = [
  "bulk outreach",
  "hands-off posting",
  "invented authority",
  "people who do not want to review public claims",
] as const;

export function DearMeAbout() {
  function handleInviteRequest() {
    capture("static_invite_requested", {
      page: "about",
      source: "nav",
      plan: "beta_29",
    });
  }

  function handlePricingClick() {
    capture("static_pricing_clicked", {
      page: "about",
      source: "nav",
      plan: "beta_29",
    });
  }

  function handleProofClick() {
    capture("static_proof_clicked", {
      page: "about",
      source: "nav",
      plan: "beta_29",
    });
  }

  function handleFeedClick() {
    capture("static_feed_clicked", {
      page: "about",
      source: "nav",
      plan: "beta_29",
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 border-b border-border pb-4" aria-label="DearMe about">
          <a href="/landing" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <a
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={handlePricingClick}
            >
              Pricing
            </a>
            <a href="/proof" className="text-sm text-muted-foreground hover:text-foreground" onClick={handleProofClick}>Proof</a>
            <a href="/feed" className="text-sm text-muted-foreground hover:text-foreground" onClick={handleFeedClick}>Feed</a>
            <a href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <Button asChild variant="outline" size="sm">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite" onClick={handleInviteRequest}>
                Request invite
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>

        <article className="flex-1 py-10">
          <header className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground">Founder story</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              DearMe started as Peter&apos;s answer to a founder problem he could not outsource.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              Useful work was happening, but the public proof, writing cadence, and opportunity follow-up kept lagging
              behind the actual work. DearMe exists to close that gap without turning the owner into a media team.
            </p>
          </header>

          <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-5 text-base leading-8 text-muted-foreground">
              <p>
                Peter is using DearMe as customer zero to build the public record around his own work before asking
                design partners to trust it. The product has to turn scattered context into proof, clear writing, and
                useful opportunity leads for him first.
              </p>
              <p>
                That is why the beta is intentionally narrow: one person, one positioning answer, one private cycle, and
                a review step before anything leaves the room. DearMe should feel like a calm operator who keeps the
                receipts organized and brings the next decision back to the person with their name on the work.
              </p>
              <p>
                It is not for teams that want volume, fake certainty, or a fully automatic public presence. It is for
                solo operators who are already doing meaningful work and need that work to become legible, timely, and
                useful without losing final judgment.
              </p>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {NOT_FOR.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-foreground" />
                    <span>Not for {item}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="border-l border-border pl-5 text-sm leading-6 text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4" />
                Beta posture
              </div>
              <p className="mt-3">
                DearMe is $29/month in beta with a three-day free trial. During invite-only mode, access starts by email
                so each account can begin with the right context and expectations.
              </p>
            </aside>
          </section>
        </article>

        <DearMeEvidenceGrid columns="three" className="border-t border-border py-6">
          {ABOUT_PRINCIPLES.map((principle) => (
            <DearMeWorkbenchCard
              key={principle.title}
              title={principle.title}
              description={principle.description}
            />
          ))}
        </DearMeEvidenceGrid>
      </DearMePageShell>
    </main>
  );
}
