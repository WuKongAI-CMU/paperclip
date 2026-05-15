import { ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DearMePageShell } from "../components/DearMeShell";

const FAQ_ITEMS = [
  {
    question: "What is DearMe?",
    answer:
      "DearMe is a private growth team for one person. It helps prepare proof, drafts, outreach, opportunities, and launch decisions from the professional context you choose to share.",
  },
  {
    question: "Who is it for?",
    answer:
      "DearMe is for founders, builders, operators, consultants, and independent experts who want their work to become easier to understand, reuse, and share without hiring a public-facing team.",
  },
  {
    question: "What happens during the private beta?",
    answer:
      "The beta is invite-only. You request access, we confirm fit, and the first cycle starts with the positioning answer and source material needed to prepare a private proof pack.",
  },
  {
    question: "How much does it cost?",
    answer:
      "The beta plan is $29 per month after a three-day free trial. Any paid plan or renewal is shown before purchase.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes. You can stop using DearMe at any time, and cancellation support is available by email while the beta remains invite-only.",
  },
  {
    question: "What is the voice gate?",
    answer:
      "The voice gate is the review point before drafted work is treated as ready. DearMe uses your samples and feedback to keep drafts closer to how you actually write and speak.",
  },
  {
    question: "Do I approve public actions?",
    answer:
      "Yes. Publishing, sending, spending, deploying, and other public moves require your explicit approval. DearMe prepares the work; you decide what leaves the private workspace.",
  },
  {
    question: "What data do I provide?",
    answer:
      "You may provide profile details, goals, links, notes, writing samples, drafts, feedback, and materials you want DearMe to use. The product also keeps account, usage, support, payment, and security records needed to operate the service.",
  },
  {
    question: "Do you sell personal information?",
    answer:
      "No. DearMe does not sell personal information. Data is used to run the product, prepare and improve work, provide support, process payments, prevent abuse, secure the service, and meet legal obligations.",
  },
  {
    question: "How long is data retained?",
    answer:
      "Account and workflow data is retained while your account is active and as needed for product, legal, tax, accounting, security, dispute, backup, and abuse-prevention reasons.",
  },
  {
    question: "What outreach is allowed?",
    answer:
      "Outreach must be truthful, targeted, and based on opt-in, warm context, or a reasonable professional relationship. Bulk spam, deceptive lead generation, harassment, and platform-risky behavior are not allowed.",
  },
  {
    question: "Are there cost caps?",
    answer:
      "The beta starts with one $29/month plan. DearMe will not start paid usage from the public pricing page while invite-only mode is active, and any future paid change is shown before purchase.",
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
              Practical answers before you request beta access.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              These answers summarize the product posture, legal terms, privacy policy, acceptable use rules, voice
              review, cost cap, and cancellation path for the beta.
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
        </article>
      </DearMePageShell>
    </main>
  );
}
