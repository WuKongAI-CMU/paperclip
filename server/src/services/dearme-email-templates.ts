export type DearMeEmailTemplateKind =
  | "welcome"
  | "receipt"
  | "trial_ending"
  | "dunning"
  | "cancellation_confirm";

export interface DearMeEmailTemplateInput {
  customerName?: string | null;
  appUrl?: string | null;
  billingPortalUrl?: string | null;
  supportEmail?: string | null;
  physicalAddress?: string | null;
  planName?: string | null;
  amountPaid?: string | null;
  paidAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  nextBillingAt?: Date | string | null;
}

export interface DearMeRenderedEmailTemplate {
  kind: DearMeEmailTemplateKind;
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export interface DearMeResendTemplateEnvelope {
  from: string;
  to: string | string[];
  replyTo?: string | null;
}

interface TemplateContent {
  subject: string;
  previewText: string;
  eyebrow: string;
  heading: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  ctaUrl: string;
  secondary?: string;
}

const DEFAULT_APP_URL = "https://dearme.app";
const DEFAULT_BILLING_PORTAL_URL = "https://dearme.app/account/billing";
const DEFAULT_SUPPORT_EMAIL = "support@dearme.app";
const DEFAULT_PLAN_NAME = "DearMe";

function textValue(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function safeUrl(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  try {
    const url = new URL(normalized);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return fallback;
  }
  return fallback;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function firstName(input: DearMeEmailTemplateInput) {
  const customerName = input.customerName?.trim();
  if (!customerName) return null;
  return customerName.split(/\s+/)[0] ?? null;
}

function greeting(input: DearMeEmailTemplateInput) {
  const name = firstName(input);
  return name ? `Hi ${name},` : "Hi,";
}

function templateContent(kind: DearMeEmailTemplateKind, input: DearMeEmailTemplateInput): TemplateContent {
  const appUrl = safeUrl(input.appUrl, DEFAULT_APP_URL);
  const billingPortalUrl = safeUrl(input.billingPortalUrl, DEFAULT_BILLING_PORTAL_URL);
  const planName = textValue(input.planName, DEFAULT_PLAN_NAME);
  const amountPaid = textValue(input.amountPaid, "$29.00");
  const paidAt = formatDate(input.paidAt);
  const trialEndsAt = formatDate(input.trialEndsAt);
  const nextBillingAt = formatDate(input.nextBillingAt);

  switch (kind) {
    case "welcome":
      return {
        subject: "Welcome to DearMe",
        previewText: "Your first private work loop is ready when you are.",
        eyebrow: "Day 0",
        heading: "Your private growth loop starts today",
        intro: `${greeting(input)} DearMe is ready to turn your real weekly work into sharper proof, better follow-up, and a calmer path to the next customer.`,
        bullets: [
          "Capture the work you already did this week.",
          "Review the first proof packet before anything leaves your account.",
          "Keep the loop small: one useful signal, one clear next step.",
        ],
        ctaLabel: "Open DearMe",
        ctaUrl: appUrl,
        secondary: "Nothing publishes without your approval.",
      };
    case "receipt":
      return {
        subject: `Your ${planName} receipt`,
        previewText: "Your payment was received and your account is active.",
        eyebrow: "Receipt",
        heading: "Your account is active",
        intro: `${greeting(input)} we received your ${amountPaid} payment${paidAt ? ` on ${paidAt}` : ""}. Your DearMe account stays active for the next private work cycle.`,
        bullets: [
          "Your receipt is attached to this billing record.",
          nextBillingAt ? `Your next renewal is scheduled for ${nextBillingAt}.` : "You can manage billing from your account at any time.",
          "Reply to this email if anything looks off.",
        ],
        ctaLabel: "Manage billing",
        ctaUrl: billingPortalUrl,
      };
    case "trial_ending":
      return {
        subject: "Your DearMe trial ends soon",
        previewText: "Keep your private work loop running without interruption.",
        eyebrow: "Trial",
        heading: "Your trial is almost done",
        intro: `${greeting(input)} your trial${trialEndsAt ? ` ends on ${trialEndsAt}` : " is ending soon"}. If DearMe is helping you turn weekly work into proof and follow-up, keep the loop running.`,
        bullets: [
          "Your saved voice notes and private work history remain in your account.",
          "You still approve anything before it is sent or published.",
          "You can update billing or cancel from the same place.",
        ],
        ctaLabel: "Review billing",
        ctaUrl: billingPortalUrl,
      };
    case "dunning":
      return {
        subject: "Update your DearMe billing",
        previewText: "We could not complete your latest payment.",
        eyebrow: "Billing",
        heading: "Your payment needs attention",
        intro: `${greeting(input)} we could not complete the latest payment for your DearMe account. Update billing to keep your private work loop active.`,
        bullets: [
          "Your account data is still available.",
          "We will retry the payment automatically after you update the card.",
          "If you need help, reply and we will sort it out.",
        ],
        ctaLabel: "Update billing",
        ctaUrl: billingPortalUrl,
      };
    case "cancellation_confirm":
      return {
        subject: "Your DearMe cancellation is confirmed",
        previewText: "Your plan will not renew.",
        eyebrow: "Cancellation",
        heading: "Your plan will not renew",
        intro: `${greeting(input)} your DearMe cancellation is confirmed. Your plan will not renew, and you can return when the next work loop needs support.`,
        bullets: [
          "You can keep access until the end of the current billing period.",
          "Your export and account settings remain available while access is active.",
          "Reply any time if there is something we should fix.",
        ],
        ctaLabel: "Open account",
        ctaUrl: appUrl,
      };
  }
}

function renderHtml(content: TemplateContent, input: DearMeEmailTemplateInput) {
  const supportEmail = textValue(input.supportEmail, DEFAULT_SUPPORT_EMAIL);
  const physicalAddress = input.physicalAddress?.trim();
  const footerAddress = physicalAddress ? `<br>${escapeHtml(physicalAddress)}` : "";
  const bulletItems = content.bullets
    .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
    .join("");
  const secondary = content.secondary
    ? `<p class="secondary">${escapeHtml(content.secondary)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(content.subject)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f2ec; color: #20201d; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .preheader { display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; }
    .shell { width: 100%; padding: 32px 16px; box-sizing: border-box; }
    .panel { max-width: 640px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded7ca; border-radius: 8px; overflow: hidden; }
    .content { padding: 36px 40px 32px; }
    .brand { font-size: 15px; font-weight: 700; letter-spacing: 0; color: #20201d; margin: 0 0 28px; }
    .eyebrow { color: #7d4b25; font-size: 13px; font-weight: 700; margin: 0 0 10px; }
    h1 { font-size: 28px; line-height: 1.2; margin: 0 0 18px; font-weight: 750; color: #20201d; letter-spacing: 0; }
    p { font-size: 16px; line-height: 1.6; margin: 0 0 18px; color: #37342e; }
    ul { padding: 0 0 0 22px; margin: 8px 0 26px; }
    li { font-size: 16px; line-height: 1.55; margin: 0 0 10px; color: #37342e; }
    .button { display: inline-block; background: #20201d; color: #fffdf8 !important; text-decoration: none; border-radius: 6px; padding: 13px 18px; font-size: 15px; font-weight: 700; }
    .secondary { margin-top: 22px; color: #5c574d; }
    .footer { border-top: 1px solid #e8e0d2; padding: 22px 40px 28px; font-size: 13px; line-height: 1.55; color: #6c665b; }
    .footer a { color: #20201d; }
    @media (max-width: 640px) {
      .shell { padding: 0; }
      .panel { border-left: 0; border-right: 0; border-radius: 0; }
      .content { padding: 28px 22px 26px; }
      h1 { font-size: 24px; }
      .button { display: block; text-align: center; }
      .footer { padding: 20px 22px 24px; }
    }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(content.previewText)}</div>
  <div class="shell">
    <div class="panel">
      <main class="content">
        <p class="brand">DearMe</p>
        <p class="eyebrow">${escapeHtml(content.eyebrow)}</p>
        <h1>${escapeHtml(content.heading)}</h1>
        <p>${escapeHtml(content.intro)}</p>
        <ul>${bulletItems}</ul>
        <a class="button" href="${escapeHtml(content.ctaUrl)}">${escapeHtml(content.ctaLabel)}</a>
        ${secondary}
      </main>
      <footer class="footer">
        Need help? Reply here or email <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.<br>
        DearMe${footerAddress}
      </footer>
    </div>
  </div>
</body>
</html>`;
}

function renderText(content: TemplateContent, input: DearMeEmailTemplateInput) {
  const supportEmail = textValue(input.supportEmail, DEFAULT_SUPPORT_EMAIL);
  const physicalAddress = input.physicalAddress?.trim();
  return [
    "DearMe",
    "",
    content.heading,
    "",
    content.intro,
    "",
    ...content.bullets.map((bullet) => `- ${bullet}`),
    "",
    `${content.ctaLabel}: ${content.ctaUrl}`,
    ...(content.secondary ? ["", content.secondary] : []),
    "",
    `Need help? Reply here or email ${supportEmail}.`,
    physicalAddress ? `DearMe - ${physicalAddress}` : "DearMe",
  ].join("\n");
}

export function renderDearMeEmailTemplate(
  kind: DearMeEmailTemplateKind,
  input: DearMeEmailTemplateInput = {},
): DearMeRenderedEmailTemplate {
  const content = templateContent(kind, input);
  return {
    kind,
    subject: content.subject,
    previewText: content.previewText,
    html: renderHtml(content, input),
    text: renderText(content, input),
  };
}

export function toDearMeResendEmailPayload(
  rendered: DearMeRenderedEmailTemplate,
  envelope: DearMeResendTemplateEnvelope,
) {
  const to = Array.isArray(envelope.to) ? envelope.to : [envelope.to];
  return {
    from: envelope.from,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...(envelope.replyTo ? { reply_to: envelope.replyTo } : {}),
  };
}
