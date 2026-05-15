import { LegalPageShell, LegalSection } from "./LegalPageShell";

export function Privacy() {
  return (
    <LegalPageShell title="Privacy Policy">
      <LegalSection title="Data we collect">
        <p>
          DearMe collects information you provide, including profile details, billing details, goals, links, notes,
          writing samples, voice samples, drafts, feedback, and materials you ask us to use. We may collect channel data
          needed to operate connected workflows, such as account handles, message metadata, contact context, delivery
          status, and content you approve or provide for a channel.
        </p>
        <p>
          We also collect product usage data, device and log information, support messages, payment records, and security
          events needed to operate the service.
        </p>
      </LegalSection>

      <LegalSection title="Purpose">
        <p>
          We use data to provide DearMe, prepare and improve drafts, maintain voice and brand context, run private
          workflows, process payments, provide support, prevent abuse, secure the service, measure product performance,
          and meet legal obligations. We do not sell personal information.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          We retain account and workflow data while your account is active and as needed for the purposes above. You may
          ask us to delete eligible data. Some records may be retained for legal, tax, accounting, security,
          dispute-resolution, backup, or abuse-prevention reasons.
        </p>
      </LegalSection>

      <LegalSection title="Subprocessors">
        <p>
          DearMe uses service providers to operate the product. Current subprocessors may include Stripe for payments,
          Resend for email delivery, Voyage for embeddings, OpenAI and Anthropic through a proxy for model execution, and
          PostHog for product analytics. Providers process data only as needed to deliver their services to DearMe.
        </p>
      </LegalSection>

      <LegalSection title="DSR rights">
        <p>
          Depending on where you live, you may have rights to access, correct, delete, export, restrict, or object to
          processing of your personal information. You may also have the right to appeal a decision or lodge a complaint
          with a regulator. We will respond to verified requests as required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For privacy requests or questions, contact DearMe at{" "}
          <a className="text-foreground underline underline-offset-4" href="mailto:peter@dearme.app">
            peter@dearme.app
          </a>
          . Please include the email tied to your account so we can locate the right records.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
