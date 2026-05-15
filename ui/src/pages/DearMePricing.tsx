import { ArrowLeft, Check, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DearMeEvidenceGrid,
  DearMePageShell,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";

const PLAN_INCLUDES = [
  "Private first-cycle setup from one positioning answer",
  "Voice and memory profile before drafted work goes out",
  "Weekly proof, outreach, and decision prep while approvals stay with you",
  "Spend, send, publish, and deploy calls remain gated",
] as const;

const BETA_NOTES = [
  {
    title: "Invite-only for now",
    description: "Request access and we will confirm fit before opening the first account.",
  },
  {
    title: "Three-day trial",
    description: "Use the first cycle to inspect the private proof pack before the monthly plan begins.",
  },
  {
    title: "Self-serve later",
    description: "When the invite gate lifts, this page will open hosted checkout directly.",
  },
] as const;

export function DearMePricing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-border pb-4" aria-label="DearMe pricing">
          <a href="/landing" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <Button asChild variant="outline" size="sm">
            <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20access">
              Request access
              <Mail className="h-4 w-4" />
            </a>
          </Button>
        </nav>

        <section className="grid flex-1 gap-6 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.7fr)] lg:items-center lg:py-14">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-medium text-muted-foreground">Private beta pricing</p>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              One plan for getting your private brand cycle moving.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              DearMe is invite-only during beta so each account starts with a tight first cycle,
              clear approvals, and no surprise public moves.
            </p>
          </div>

          <section
            aria-label="DearMe beta plan"
            className="rounded-lg border border-primary/30 bg-primary/5 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Beta</h2>
                <p className="mt-1 text-sm text-muted-foreground">For one person building public proof from private work.</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold">$29</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="text-sm font-medium">Three-day free trial</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Start with the first private proof pass, then continue monthly if it is useful.
              </p>
            </div>

            <ul className="mt-5 space-y-3">
              {PLAN_INCLUDES.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-6 w-full">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20access">
                Request access
                <Mail className="h-4 w-4" />
              </a>
            </Button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Hosted payment opens after the invite gate lifts. Until then, no payment starts from this page.
            </p>
          </section>
        </section>

        <DearMeEvidenceGrid columns="three" className="border-t border-border py-6">
          {BETA_NOTES.map((note) => (
            <DearMeWorkbenchCard
              key={note.title}
              title={note.title}
              description={note.description}
            />
          ))}
        </DearMeEvidenceGrid>
      </DearMePageShell>
    </main>
  );
}
