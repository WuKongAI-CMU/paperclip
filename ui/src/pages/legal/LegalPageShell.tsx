import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { DearMePageShell } from "@/components/DearMeShell";

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-border pb-4" aria-label="DearMe legal">
          <a href="/landing" className="text-sm font-semibold text-foreground">
            DearMe
          </a>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Legal
          </div>
        </nav>

        <article className="flex-1 py-10">
          <header className="mb-8">
            <p className="text-sm font-medium text-muted-foreground">Last updated May 15, 2026</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
          </header>
          <div className="space-y-7 text-sm leading-7 text-foreground">{children}</div>
        </article>

        <footer className="flex flex-wrap gap-4 border-t border-border py-5 text-sm text-muted-foreground">
          <a href="/legal/terms" className="hover:text-foreground">Terms</a>
          <a href="/legal/privacy" className="hover:text-foreground">Privacy</a>
          <a href="/legal/acceptable-use" className="hover:text-foreground">Acceptable Use</a>
        </footer>
      </DearMePageShell>
    </main>
  );
}

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
      <div className="mt-2 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
