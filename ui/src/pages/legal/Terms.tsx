import { LegalPageShell, LegalSection } from "./LegalPageShell";

export function Terms() {
  return (
    <LegalPageShell title="Terms of Service">
      <LegalSection title="Service">
        <p>
          DearMe provides a private AI growth team that helps individuals shape a public professional presence, prepare
          proof, draft outreach, organize opportunities, and decide what to launch. The service may produce drafts,
          reports, plans, recommendations, and launch-ready packets. You remain responsible for deciding what to publish,
          send, buy, sell, promise, or rely on.
        </p>
      </LegalSection>

      <LegalSection title="Account">
        <p>
          You must provide accurate account and billing information, keep credentials secure, and use DearMe only for
          lawful professional purposes. You are responsible for activity under your account and for the materials,
          contacts, prompts, samples, and instructions you provide.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable Use">
        <p>
          One-to-one outreach must be opt-in, warm, or otherwise reasonably relationship-based. You may not use DearMe
          for spam, deceptive lead generation, harassment, impersonation, scraping at scale, illegal offers, or activity
          that violates platform rules. LinkedIn and similar channels must be used in ways that comply with their terms,
          rate limits, account rules, and messaging expectations.
        </p>
        <p>
          DearMe may suspend, limit, or terminate access when we believe use creates legal, platform, deliverability,
          security, or reputation risk.
        </p>
      </LegalSection>

      <LegalSection title="Payment">
        <p>
          Paid plans, private beta fees, renewals, and usage-based charges are presented before purchase. Unless stated
          otherwise at checkout, fees are non-refundable except where required by law. You authorize us and our payment
          provider to charge the payment method you provide.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using DearMe at any time. We may suspend or end access for nonpayment, misuse, security risk, or
          breach of these terms. After termination, we may retain limited records as needed for legal, tax, security,
          dispute, and abuse-prevention purposes.
        </p>
      </LegalSection>

      <LegalSection title="Liability cap">
        <p>
          DearMe is provided as-is and as-available. To the maximum extent allowed by law, DearMe is not liable for
          indirect, incidental, special, consequential, punitive, lost-profit, lost-revenue, lost-data, platform-account,
          deliverability, or business-opportunity damages. Our total liability for all claims is capped at the amount you
          paid DearMe in the three months before the event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection title="Disputes">
        <p>
          Before filing a claim, each side will try to resolve the dispute informally by written notice. Any unresolved
          dispute will be handled by binding individual arbitration, except either side may seek small-claims relief or
          urgent injunctive relief where allowed. Class actions and representative proceedings are waived to the fullest
          extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="Updates">
        <p>
          We may update these terms as the service changes. Material updates will be posted with a new effective date.
          Continued use after an update means you accept the revised terms.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
