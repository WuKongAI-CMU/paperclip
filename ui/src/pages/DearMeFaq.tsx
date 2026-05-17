import { ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DearMePageShell } from "../components/DearMeShell";

const FAQ_ITEMS = [
  {
    question: "What does DearMe actually do for me?",
    answer:
      "DearMe turns your existing work, proof, voice, and relationships into a private weekly growth cycle: proof pages, letters, draft posts, outreach prep, and the next launch decision. It prepares the work privately before anything public happens.",
  },
  {
    question: "Who is the $29 beta for?",
    answer:
      "It is for solo operators, consultants, founders, candidates, creators with an offer, and agency-of-one builders who already have useful work but do not have a growth team. If you need a polished public proof loop more than another writing tool, you are the target user.",
  },
  {
    question: "What happens in the first three days?",
    answer:
      "You answer one positioning question, then inspect the first private proof pass, voice profile, opportunity shape, and launch call preview. The trial is meant to make the value visible before the $29/month plan begins.",
  },
  {
    question: "Will it post or message from my account automatically?",
    answer:
      "No. Public posts, direct messages, deploys, and paid spend require your explicit approval. DearMe can prepare the words and proof, but you decide what leaves the private workspace.",
  },
  {
    question: "Is this safe to use with LinkedIn?",
    answer:
      "DearMe is designed around targeted, truthful, review-first outreach, not bulk automation. During beta, any LinkedIn-style outreach should stay low-volume, relationship-based, and approved by you before it is sent.",
  },
  {
    question: "How do you keep it from sounding unlike me?",
    answer:
      "The first cycle builds from your samples and feedback, then treats voice as a review gate before drafted work is ready. If a draft drifts, it should come back for another pass instead of being treated as finished.",
  },
  {
    question: "What if my work is messy or unfinished?",
    answer:
      "That is normal. DearMe is most useful when proof is scattered across calls, notes, drafts, customer quotes, and half-finished ideas because the first job is to package what is already true.",
  },
  {
    question: "What do I need to share?",
    answer:
      "Start with your goal, public profile links, writing samples, proof, offers, audience notes, or customer context you want used. You should not paste secrets, private customer data, or anything you would not want used to prepare your growth work.",
  },
  {
    question: "Can I take my work with me?",
    answer:
      "Yes. The useful outputs should be inspectable and portable: proof pages, drafts, weekly letters, opportunity notes, and review decisions. If you leave, you should not lose the work DearMe prepared for you.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes. The beta is monthly after the trial, and cancellation support is available by email while access remains invite-only. Any paid continuation is shown before purchase.",
  },
  {
    question: "What makes this different from a blank chat box?",
    answer:
      "DearMe is built around a recurring private work cycle, approvals, memory, voice review, proof packaging, and opportunity prep. The point is not one clever answer; it is a weekly system that keeps turning your real work into useful public and commercial moves.",
  },
  {
    question: "When should I not use DearMe?",
    answer:
      "Do not use it for spam, deception, scraped lists, harassment, or claims you cannot back up. DearMe works best when the growth motion is honest, specific, and tied to proof you would stand behind.",
  },
] as const;

export function DearMeFaq() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 border-b border-border pb-4" aria-label="DearMe FAQ">
          <a href="/landing" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            DearMe
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <a href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</a>
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
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
            <p className="text-sm font-medium text-muted-foreground">FAQ</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              The questions worth asking before you trust DearMe with your growth.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              The beta is intentionally small: one person, one private proof loop, one $29/month plan after the
              three-day trial, and no public action without your approval.
            </p>
          </header>

          <div className="mt-10 divide-y divide-border border-y border-border">
            {FAQ_ITEMS.map((item) => (
              <section key={item.question} className="grid gap-3 py-5 md:grid-cols-[16rem_1fr]">
                <h2 className="text-base font-semibold tracking-normal">{item.question}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="min-h-11">
              <a href="/pricing">See beta pricing</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <a href="mailto:peter@dearme.app?subject=DearMe%20private%20beta%20question">
                Ask a beta question
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </article>
      </DearMePageShell>
    </main>
  );
}
