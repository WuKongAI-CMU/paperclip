import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DearMeEvidenceGrid,
  DearMePageShell,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";

const ABOUT_PRINCIPLES = [
  {
    title: "Private before public",
    description: "DearMe prepares proof, drafts, and opportunities where you can inspect them first.",
  },
  {
    title: "Approvals stay human",
    description: "Public moves, sends, spending, and launches stay gated until you decide.",
  },
  {
    title: "Built for one person",
    description: "The product is tuned for founders, builders, and operators who need consistency without a staff.",
  },
] as const;

export function DearMeAbout() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 border-b border-border pb-4" aria-label="DearMe about">
          <a href="/landing" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <Button asChild variant="outline" size="sm">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite">
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
              DearMe exists because personal brand work should not require a personal media team.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              Peter started DearMe for the people who are already doing useful work, but keep losing the thread when
              that work needs to become proof, outreach, a launch, or a clean public record.
            </p>
          </header>

          <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-5 text-base leading-8 text-muted-foreground">
              <p>
                The first version is intentionally narrow: one person, one clear positioning answer, one private cycle
                that turns scattered context into work you can review. DearMe should feel like a calm operator who keeps
                your receipts organized, drafts in your voice, and brings decisions back to you before anything leaves
                the room.
              </p>
              <p>
                That is why the beta is invite-only. The product needs to learn from real professional workflows without
                turning trust into a growth hack. It should make your work easier to see, not pressure you into noisy
                posting or cold outreach.
              </p>
              <p>
                The promise is simple: help good work become legible, useful, and timely while the owner keeps final
                judgment. DearMe handles preparation. You decide what is true, useful, and ready.
              </p>
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
