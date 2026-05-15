import { LegalPageShell, LegalSection } from "./LegalPageShell";

export function AcceptableUse() {
  return (
    <LegalPageShell title="Acceptable Use Policy">
      <LegalSection title="No spam or deceptive outreach">
        <p>
          Do not use DearMe to send unsolicited bulk messages, purchased-list campaigns, misleading commercial email,
          deceptive follow-ups, or outreach that lacks opt-in, warm context, or a reasonable professional relationship.
          Every message must be truthful, targeted, and compliant with applicable email, advertising, and platform rules.
        </p>
      </LegalSection>

      <LegalSection title="No impersonation">
        <p>
          Do not pretend to be another person, misrepresent your affiliation, hide material commercial intent, forge
          headers or identities, or create content designed to confuse recipients about who is speaking.
        </p>
      </LegalSection>

      <LegalSection title="No scraping at scale">
        <p>
          Do not use DearMe to scrape, enrich, harvest, or compile profiles, emails, or social graphs at scale, or to
          bypass robots, rate limits, paywalls, authentication, or other technical restrictions.
        </p>
      </LegalSection>

      <LegalSection title="No LinkedIn account stuffing">
        <p>
          Do not use DearMe to stuff accounts, rotate identities, evade LinkedIn limits, automate prohibited actions, send
          connection spam, or otherwise place accounts, recipients, or the service at platform risk.
        </p>
      </LegalSection>

      <LegalSection title="No illegal content">
        <p>
          Do not use DearMe for illegal goods or services, fraud, phishing, malware, credential theft, regulated offers
          without required authorization, unlawful discrimination, intellectual-property infringement, or instructions
          that facilitate wrongdoing.
        </p>
      </LegalSection>

      <LegalSection title="No abuse">
        <p>
          Do not use DearMe for harassment, threats, doxxing, sexual exploitation, hateful conduct, self-harm
          encouragement, evasion of enforcement, security attacks, or attempts to disrupt DearMe or third-party systems.
        </p>
      </LegalSection>

      <LegalSection title="DearMe enforcement">
        <p>
          DearMe may block actions, refuse dispatch, remove content, suppress recipients, limit accounts, suspend access,
          terminate service, or preserve and disclose records when needed to protect users, recipients, platforms,
          infrastructure, legal compliance, or service integrity.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
