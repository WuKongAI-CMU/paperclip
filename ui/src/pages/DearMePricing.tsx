import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capture } from "@/lib/analytics";
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

const PRICING_FAQS = [
  {
    question: "What happens during the three-day trial?",
    answer: "You get the first private proof pass, voice profile, opportunity shape, and launch call preview before monthly billing starts.",
  },
  {
    question: "Do public posts or messages go out automatically?",
    answer: "No. Publish, send, deploy, and spend decisions stay approval-only, so every public move waits for your explicit call.",
  },
  {
    question: "Can I see the product before joining?",
    answer: "Yes. The first-cycle preview shows the proof pack, weekly letter shape, opportunity card, and private-site pass before you request access.",
  },
  {
    question: "Why is the beta invite-only?",
    answer: "The first accounts need close setup so the voice and proof loop are useful before self-serve checkout opens.",
  },
  {
    question: "Can I cancel before paying?",
    answer: "Yes. The trial is meant to make the value inspectable first, and any paid continuation is shown before purchase.",
  },
] as const;

const WAITLIST_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRICING_TRIAL_HREF = "/dearme?signup_source=pricing";
type PricingTrialStartSource = "hero" | "plan" | "waitlist_success";

export function DearMePricing() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "submitting" | "joined">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!WAITLIST_EMAIL_PATTERN.test(trimmedEmail)) {
      capture("pricing_waitlist_blocked", {
        source: "pricing",
        plan: "beta_29",
        reason: "invalid_email",
      });
      setError("Enter a work email to join the private beta waitlist.");
      setWaitlistStatus("idle");
      return;
    }

    setWaitlistStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/dearme/pricing-waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          plan: "beta_29",
        }),
      });

      if (!response.ok) {
        throw new Error("pricing_waitlist_request_failed");
      }

      capture("pricing_waitlist_joined", {
        source: "pricing",
        plan: "beta_29",
      });
      setEmail(trimmedEmail);
      setWaitlistStatus("joined");
    } catch {
      capture("pricing_waitlist_failed", {
        source: "pricing",
        plan: "beta_29",
        reason: "request_failed",
      });
      setWaitlistStatus("idle");
      setError("We could not save that. Email peter@dearme.app and we will add you manually.");
    }
  }

  function handleTrialStart(source: PricingTrialStartSource) {
    capture("pricing_trial_started", {
      source,
      plan: "beta_29",
    });
  }

  function handleAccessRequest() {
    capture("pricing_access_requested", {
      source: "pricing_nav",
      plan: "beta_29",
    });
  }

  function handleProductPreviewClick() {
    capture("pricing_product_preview_clicked", {
      source: "hero",
      plan: "beta_29",
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 border-b border-border pb-4" aria-label="DearMe pricing">
          <a href="/landing" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <a href="/proof" className="text-sm text-muted-foreground hover:text-foreground">Proof</a>
            <Button asChild variant="outline" size="sm">
              <a
                href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20access"
                onClick={handleAccessRequest}
              >
                Request access
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>

        <section className="grid flex-1 gap-6 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.7fr)] lg:items-center lg:py-14">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-medium text-muted-foreground">Private beta pricing</p>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              Try the private growth cycle before the $29 plan begins.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              DearMe is invite-only during beta so the first proof pass, voice profile, and launch
              decisions are clear before a paid month starts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-11">
                <a href={PRICING_TRIAL_HREF} onClick={() => handleTrialStart("hero")}>
                  Start the 3-day trial
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-11">
                <a href="/landing" onClick={handleProductPreviewClick}>
                  See the product first
                </a>
              </Button>
            </div>
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
              <a href={PRICING_TRIAL_HREF} onClick={() => handleTrialStart("plan")}>
                Start the 3-day trial
                <ArrowRight className="h-4 w-4" />
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

        <section className="grid gap-6 border-t border-border py-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(22rem,0.55fr)]">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Invite waitlist</p>
            <h2 className="text-2xl font-semibold tracking-normal">Get the checkout link when your beta seat is ready.</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Join with your work email. We will use it only for beta access and the $29/month plan handoff.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleWaitlistSubmit}>
            <label htmlFor="dearme-pricing-email" className="text-sm font-medium">
              Work email
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="dearme-pricing-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setWaitlistStatus("idle");
                  if (error) setError(null);
                }}
                placeholder="you@company.com"
                aria-invalid={error ? "true" : undefined}
                aria-describedby={
                  error
                    ? "dearme-pricing-email-error"
                    : waitlistStatus === "joined"
                      ? "dearme-pricing-email-success"
                      : undefined
                }
                className="min-h-11 bg-background"
              />
              <Button type="submit" className="min-h-11 shrink-0" disabled={waitlistStatus === "submitting"}>
                {waitlistStatus === "submitting" ? "Joining..." : "Join waitlist"}
                <Mail className="h-4 w-4" />
              </Button>
            </div>
            {error ? (
              <p id="dearme-pricing-email-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {waitlistStatus === "joined" ? (
              <div id="dearme-pricing-email-success" className="space-y-3 text-sm text-muted-foreground" role="status">
                <p>You are on the beta waitlist. You can start the trial preview now while your seat is reviewed.</p>
                <Button asChild variant="outline" className="min-h-11">
                  <a href={PRICING_TRIAL_HREF} onClick={() => handleTrialStart("waitlist_success")}>
                    Start trial preview
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : null}
          </form>
        </section>

        <section className="border-t border-border py-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">Pricing FAQ</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">The common questions before paying.</h2>
          </div>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {PRICING_FAQS.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="cursor-pointer list-none text-base font-semibold">
                  <span className="inline-flex w-full items-center justify-between gap-4">
                    {item.question}
                    <span className="text-muted-foreground group-open:hidden">+</span>
                    <span className="hidden text-muted-foreground group-open:inline">-</span>
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </DearMePageShell>
    </main>
  );
}
