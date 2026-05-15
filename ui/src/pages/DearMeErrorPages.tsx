type DearMeErrorPageKind = "404" | "500";

const ERROR_PAGE_COPY: Record<DearMeErrorPageKind, {
  eyebrow: string;
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}> = {
  "404": {
    eyebrow: "404",
    title: "This letter did not land.",
    body: "The page you opened is not part of your DearMe workspace. Start from the front door or return to your workroom.",
    primaryHref: "/",
    primaryLabel: "Open DearMe",
    secondaryHref: "/dearme",
    secondaryLabel: "Go to workroom",
  },
  "500": {
    eyebrow: "500",
    title: "The workroom hit a snag.",
    body: "Your notes are still yours. Refresh in a moment, or return to DearMe and continue from the latest saved step.",
    primaryHref: "/dearme",
    primaryLabel: "Return to DearMe",
    secondaryHref: "/",
    secondaryLabel: "Open front door",
  },
};

export function DearMeErrorPage({ kind }: { kind: DearMeErrorPageKind }) {
  const copy = ERROR_PAGE_COPY[kind];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {copy.eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            {copy.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={copy.primaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              {copy.primaryLabel}
            </a>
            <a
              href={copy.secondaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {copy.secondaryLabel}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
