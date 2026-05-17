import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { capture, resolveFeatureFlagValue } from "@/lib/analytics";
import { useNavigate } from "react-router-dom";
import {
  DearMeEvidenceGrid,
  DearMeFocusSurface,
  DearMePageShell,
  DearMeWorkbenchCard,
} from "../components/DearMeShell";

const AHA_SEQUENCE = [
  {
    window: "0-30s",
    title: "Identity dossier appears",
    summary: "Your public work, voice, proof, and relationships become the first private brief.",
  },
  {
    window: "60-120s",
    title: "Audience map appears",
    summary: "DearMe prepares the first audience shape and a small outbound shortlist for review.",
  },
  {
    window: "3-5min",
    title: "Private proof page appears",
    summary: "A private dearme.app proof page is ready to inspect from your phone.",
  },
] as const;

const PROOF_ARTIFACTS = [
  {
    icon: MessageSquareText,
    title: "Weekly letter excerpt",
    body: "You shipped the positioning page, but the strongest proof was the customer quote you almost left buried in notes. Next week: turn that quote into the opening post.",
  },
  {
    icon: UserRoundCheck,
    title: "Voice profile excerpt",
    body: "Direct, specific, lightly dry. Short sentences land best. Avoid hype unless the proof is already in the sentence.",
  },
  {
    icon: Target,
    title: "Opportunity card",
    body: "Reply to the operator who asked for onboarding examples. Send the proof page first, then offer a 15-minute teardown.",
  },
] as const;

const LANDING_COPY_FEATURE_FLAG = "dearme_landing_copy";

const LANDING_COPY_VARIANTS = [
  {
    key: "control",
    theme: "private_growth_team",
    headline: "DearMe is a private AI growth team for one person.",
    body: "Give it the work you want to be known for. It turns your proof, voice, and relationships into a private weekly operating system: letters, drafts, opportunities, and the next launch decision.",
    question: "What do you want to be known for?",
    placeholder: "Helping B2B teams turn messy customer research into calm product decisions",
    submitLabel: "Start my first cycle",
    previewSummary: "The first minutes show what DearMe would prepare privately before anything is sent or published.",
  },
  {
    key: "proof-first",
    theme: "before_after",
    headline: "Before: scattered proof. After: one private growth cycle ready to review.",
    body: "DearMe turns the proof you already have into a cleaner before-and-after: a private proof page, a weekly letter draft, and the next outreach move, all held for your approval.",
    question: "What proof should DearMe organize into a before-and-after?",
    placeholder: "Before: research lived across call notes. After: our customers make weekly product calls from one clear brief.",
    submitLabel: "Show my before and after",
    previewSummary: "The first pass shows what changes when scattered proof becomes one reviewable cycle.",
  },
  {
    key: "opportunity-first",
    theme: "weekly_letter_samples",
    headline: "Start with your weekly letter samples, then decide what should ship.",
    body: "Paste what you have been meaning to say. DearMe shapes it into sample weekly letters, proof notes, and one opportunity card so you can see the work before you request a beta invite.",
    question: "What should this week's DearMe letter be about?",
    placeholder: "A short note on the customer proof we found this week, the draft worth finishing, and who I should follow up with next.",
    submitLabel: "Preview my weekly letter",
    previewSummary: "The first cycle makes the weekly letter tangible before asking you to trust the system.",
  },
] as const;

type LandingCopyVariant = (typeof LANDING_COPY_VARIANTS)[number];

const DEFAULT_LANDING_COPY_VARIANT = LANDING_COPY_VARIANTS[0];
const LANDING_ANSWER_STORAGE_KEY = "dearme:landing-known-for";
const LANDING_EXIT_DISMISSED_STORAGE_KEY = "dearme:landing-exit-waitlist-dismissed";
const WAITLIST_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function resolveLandingCopyVariant(value: string | boolean): LandingCopyVariant {
  if (typeof value !== "string") return DEFAULT_LANDING_COPY_VARIANT;
  return LANDING_COPY_VARIANTS.find((variant) => variant.key === value) ?? DEFAULT_LANDING_COPY_VARIANT;
}

export function DearMeLanding() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<LandingCopyVariant>(DEFAULT_LANDING_COPY_VARIANT);
  const [knownFor, setKnownFor] = useState(() => window.sessionStorage.getItem(LANDING_ANSWER_STORAGE_KEY) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitEmail, setExitEmail] = useState("");
  const [exitStatus, setExitStatus] = useState<"idle" | "submitting" | "joined">("idle");
  const [exitError, setExitError] = useState<string | null>(null);
  const knownForInputRef = useRef<HTMLTextAreaElement>(null);
  const exitModalShownRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    void resolveFeatureFlagValue(LANDING_COPY_FEATURE_FLAG, DEFAULT_LANDING_COPY_VARIANT.key).then((value) => {
      if (!mounted) return;
      const selectedVariant = resolveLandingCopyVariant(value);
      setVariant(selectedVariant);
      capture("landing_viewed", {
        landing_copy_variant: selectedVariant.key,
        landing_hero_theme: selectedVariant.theme,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleMouseLeave(event: MouseEvent) {
      if (event.clientY > 0) return;
      if (exitModalShownRef.current) return;
      if (window.sessionStorage.getItem(LANDING_EXIT_DISMISSED_STORAGE_KEY) === "1") return;
      exitModalShownRef.current = true;
      setExitModalOpen(true);
      capture("landing_exit_intent_seen", {
        landing_copy_variant: variant.key,
        landing_hero_theme: variant.theme,
      });
    }

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [variant]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = knownFor.trim();
    if (!answer) {
      setError("Answer the question to start your first cycle.");
      knownForInputRef.current?.focus();
      return;
    }

    capture("landing_cta_submitted", {
      landing_copy_variant: variant.key,
      landing_hero_theme: variant.theme,
      positioning_length: answer.length,
    });
    window.sessionStorage.setItem(LANDING_ANSWER_STORAGE_KEY, answer);
    const search = new URLSearchParams({ knownFor: answer });
    navigate(`/dearme?${search.toString()}`);
  }

  function dismissExitModal() {
    window.sessionStorage.setItem(LANDING_EXIT_DISMISSED_STORAGE_KEY, "1");
    setExitModalOpen(false);
  }

  async function handleExitWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = exitEmail.trim();

    if (!WAITLIST_EMAIL_PATTERN.test(trimmedEmail)) {
      setExitError("Enter a work email for the preview.");
      setExitStatus("idle");
      return;
    }

    setExitStatus("submitting");
    setExitError(null);

    try {
      const response = await fetch("/api/dearme/landing-exit-waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          landingCopyVariant: variant.key,
          landingHeroTheme: variant.theme,
        }),
      });

      if (!response.ok) {
        throw new Error("waitlist_request_failed");
      }

      capture("landing_exit_waitlist_submitted", {
        landing_copy_variant: variant.key,
        landing_hero_theme: variant.theme,
        source: "exit_intent",
      });
      window.sessionStorage.setItem(LANDING_EXIT_DISMISSED_STORAGE_KEY, "1");
      setExitEmail(trimmedEmail);
      setExitStatus("joined");
    } catch {
      setExitStatus("idle");
      setExitError("We could not save that. Email peter@dearme.app and we will send it manually.");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-border pb-4" aria-label="DearMe">
          <div className="text-sm font-semibold">DearMe</div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <a href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</a>
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/proof" className="text-sm text-muted-foreground hover:text-foreground">Proof</a>
            <a href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite">
                Request invite
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-center lg:py-14">
          <div className="space-y-7">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                {variant.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {variant.body}
              </p>
            </div>

            <form className="max-w-2xl space-y-3" onSubmit={handleSubmit}>
              <label htmlFor="dearme-known-for" className="block text-lg font-medium">
                {variant.question}
              </label>
              <Textarea
                id="dearme-known-for"
                ref={knownForInputRef}
                name="knownFor"
                value={knownFor}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setKnownFor(nextValue);
                  window.sessionStorage.setItem(LANDING_ANSWER_STORAGE_KEY, nextValue);
                  if (error) setError(null);
                }}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "dearme-known-for-error" : undefined}
                placeholder={variant.placeholder}
                className="min-h-32 resize-y bg-background text-base leading-7 shadow-none md:text-base"
              />
              {error ? (
                <p id="dearme-known-for-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="min-h-11 w-full sm:w-auto">
                {variant.submitLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <DearMeEvidenceGrid columns="three" className="max-w-3xl">
              {PROOF_ARTIFACTS.map((artifact) => {
                const Icon = artifact.icon;

                return (
                  <article
                    key={artifact.title}
                    className="rounded-lg border border-border bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className="h-4 w-4" />
                      {artifact.title}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{artifact.body}</p>
                  </article>
                );
              })}
            </DearMeEvidenceGrid>
          </div>

          <DearMeFocusSurface aria-label="DearMe first-cycle preview" className="self-stretch">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  First-cycle preview
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {variant.previewSummary}
                </p>
              </div>

              <DearMeEvidenceGrid columns="three" className="lg:grid-cols-1">
                {AHA_SEQUENCE.map((item) => (
                  <DearMeWorkbenchCard
                    key={item.window}
                    title={item.title}
                    description={item.summary}
                    eyebrow={item.window}
                  />
                ))}
              </DearMeEvidenceGrid>
            </div>
          </DearMeFocusSurface>
        </section>

        <footer className="grid gap-4 border-t border-border py-5 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
            <span>Publish, send, deploy, spend are always approved by you.</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span>$29/month beta — invite request only.</span>
            <a href="/about" className="hover:text-foreground">About</a>
            <a href="/pricing" className="hover:text-foreground">Pricing</a>
            <a href="/proof" className="hover:text-foreground">Proof</a>
            <a href="/faq" className="hover:text-foreground">FAQ</a>
            <a href="/legal/terms" className="hover:text-foreground">Terms</a><a href="/legal/privacy" className="hover:text-foreground">Privacy</a><a href="/legal/acceptable-use" className="hover:text-foreground">Acceptable Use</a>
            <Button asChild variant="secondary" size="sm" className="min-h-11">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite">
                Request invite
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </footer>
      </DearMePageShell>
      {exitModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm"
          role="presentation"
        >
          <section
            aria-labelledby="dearme-exit-waitlist-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg"
            role="dialog"
          >
            {exitStatus === "joined" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Check className="h-5 w-5" />
                  Preview requested
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  We will send the five-minute DearMe preview when your private beta seat is ready.
                </p>
                <Button type="button" className="min-h-11 w-full" onClick={dismissExitModal}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Before you go</p>
                  <h2 id="dearme-exit-waitlist-title" className="text-xl font-semibold">
                    Want a 5-minute preview emailed to you?
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Get the sample weekly letter, voice profile, and opportunity card without starting a cycle today.
                  </p>
                </div>
                <form className="mt-5 space-y-3" onSubmit={handleExitWaitlistSubmit}>
                  <label htmlFor="dearme-exit-email" className="text-sm font-medium">
                    Work email
                  </label>
                  <input
                    id="dearme-exit-email"
                    name="email"
                    type="email"
                    value={exitEmail}
                    onChange={(event) => {
                      setExitEmail(event.target.value);
                      if (exitError) setExitError(null);
                    }}
                    aria-invalid={exitError ? "true" : undefined}
                    aria-describedby={exitError ? "dearme-exit-email-error" : undefined}
                    className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="you@example.com"
                  />
                  {exitError ? (
                    <p id="dearme-exit-email-error" className="text-sm text-destructive" role="alert">
                      {exitError}
                    </p>
                  ) : null}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" className="min-h-11" onClick={dismissExitModal}>
                      Not now
                    </Button>
                    <Button type="submit" className="min-h-11" disabled={exitStatus === "submitting"}>
                      {exitStatus === "submitting" ? "Saving..." : "Email me the preview"}
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
