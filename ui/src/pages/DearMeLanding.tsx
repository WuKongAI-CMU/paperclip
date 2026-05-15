import { useState, type FormEvent } from "react";
import { ArrowRight, Mail, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@/lib/router";
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

export function DearMeLanding() {
  const navigate = useNavigate();
  const [knownFor, setKnownFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = knownFor.trim();
    if (!answer) {
      setError("Answer the question to start your first cycle.");
      return;
    }

    const search = new URLSearchParams({ knownFor: answer });
    navigate(`/dearme?${search.toString()}`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-border pb-4" aria-label="DearMe">
          <div className="text-sm font-semibold">DearMe</div>
          <Button asChild variant="outline" size="sm">
            <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite">
              Request invite
              <Mail className="h-4 w-4" />
            </a>
          </Button>
        </nav>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-center lg:py-14">
          <div className="space-y-7">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                DearMe is a private AI growth team for one person.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Start with the one thing you want people to remember. DearMe turns it into private proof,
                first drafts, opportunities, and a launch call.
              </p>
            </div>

            <form className="max-w-2xl space-y-3" onSubmit={handleSubmit}>
              <label htmlFor="dearme-known-for" className="block text-lg font-medium">
                What do you want to be known for?
              </label>
              <Textarea
                id="dearme-known-for"
                name="knownFor"
                value={knownFor}
                onChange={(event) => {
                  setKnownFor(event.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "dearme-known-for-error" : undefined}
                placeholder="Turning messy customer research into calm product decisions"
                className="min-h-32 resize-y bg-background text-base leading-7 shadow-none md:text-base"
              />
              {error ? (
                <p id="dearme-known-for-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Start my first cycle
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <DearMeFocusSurface aria-label="DearMe first-cycle preview" className="self-stretch">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  First-cycle preview
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  The first minutes show useful private work before any public action.
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
            <span>$X/month private beta — invite request only.</span>
            <a href="/legal/terms" className="hover:text-foreground">Terms</a><a href="/legal/privacy" className="hover:text-foreground">Privacy</a><a href="/legal/acceptable-use" className="hover:text-foreground">Acceptable Use</a>
            <Button asChild variant="secondary" size="sm">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20invite">
                Request invite
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </footer>
      </DearMePageShell>
    </main>
  );
}
