import { describe, expect, it } from "vitest";
import {
  renderDearMeEmailTemplate,
  toDearMeResendEmailPayload,
  type DearMeEmailTemplateKind,
} from "./dearme-email-templates.js";

const templateKinds: DearMeEmailTemplateKind[] = [
  "welcome",
  "receipt",
  "trial_ending",
  "dunning",
  "cancellation_confirm",
];

const forbiddenCustomerCopy = [
  "Paperclip",
  "OpenClaw",
  "Symphony",
  "Bedrock",
  "dm_sk_",
  "Claude",
  "GPT",
  "Voyage",
];

describe("renderDearMeEmailTemplate", () => {
  it("renders every launch email as mobile-safe HTML plus plain text", () => {
    for (const kind of templateKinds) {
      const rendered = renderDearMeEmailTemplate(kind, {
        customerName: "Peter",
        appUrl: "https://dearme.app/dashboard",
        billingPortalUrl: "https://dearme.app/account/billing",
        supportEmail: "help@dearme.app",
        physicalAddress: "123 Market St, San Francisco, CA",
        amountPaid: "$29.00",
        paidAt: "2026-05-15T12:00:00.000Z",
        trialEndsAt: "2026-05-17T12:00:00.000Z",
        nextBillingAt: "2026-06-15T12:00:00.000Z",
      });

      expect(rendered.kind).toBe(kind);
      expect(rendered.subject).toMatch(/\S/);
      expect(rendered.previewText).toMatch(/\S/);
      expect(rendered.html).toContain("<!doctype html>");
      expect(rendered.html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
      expect(rendered.html).toContain("@media (max-width: 640px)");
      expect(rendered.html).toContain("DearMe");
      expect(rendered.html).toContain("help@dearme.app");
      expect(rendered.html).toContain("123 Market St, San Francisco, CA");
      expect(rendered.text).toContain("DearMe");
      expect(rendered.text).toContain("help@dearme.app");
      expect(rendered.text).toContain("123 Market St, San Francisco, CA");
    }
  });

  it("uses the required launch subjects", () => {
    expect(renderDearMeEmailTemplate("welcome").subject).toBe("Welcome to DearMe");
    expect(renderDearMeEmailTemplate("receipt", { planName: "DearMe Pro" }).subject).toBe("Your DearMe Pro receipt");
    expect(renderDearMeEmailTemplate("trial_ending").subject).toBe("Your DearMe trial ends soon");
    expect(renderDearMeEmailTemplate("dunning").subject).toBe("Update your DearMe billing");
    expect(renderDearMeEmailTemplate("cancellation_confirm").subject).toBe("Your DearMe cancellation is confirmed");
  });

  it("escapes dynamic content in the HTML while keeping readable text fallback", () => {
    const rendered = renderDearMeEmailTemplate("welcome", {
      customerName: "Ada <script>alert(1)</script>",
      supportEmail: "help+test@dearme.app",
      physicalAddress: "1 <Main> & 2nd",
    });

    expect(rendered.html).toContain("Hi Ada");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("1 &lt;Main&gt; &amp; 2nd");
    expect(rendered.text).toContain("Hi Ada");
    expect(rendered.text).toContain("1 <Main> & 2nd");
  });

  it("rejects unsafe CTA URLs back to DearMe defaults", () => {
    const rendered = renderDearMeEmailTemplate("dunning", {
      appUrl: "javascript:alert(1)",
      billingPortalUrl: "mailto:billing@example.com",
    });

    expect(rendered.html).not.toContain("javascript:alert");
    expect(rendered.html).not.toContain("mailto:billing@example.com");
    expect(rendered.text).toContain("Update billing: https://dearme.app/account/billing");
  });

  it("keeps customer-visible copy free of forbidden substrate language", () => {
    for (const kind of templateKinds) {
      const rendered = renderDearMeEmailTemplate(kind);
      const customerCopy = `${rendered.subject}\n${rendered.previewText}\n${rendered.html}\n${rendered.text}`;

      for (const forbidden of forbiddenCustomerCopy) {
        expect(customerCopy).not.toContain(forbidden);
      }
    }
  });
});

describe("toDearMeResendEmailPayload", () => {
  it("builds the Resend request body with HTML and text alternatives", () => {
    const rendered = renderDearMeEmailTemplate("receipt", {
      customerName: "Peter",
      amountPaid: "$29.00",
      paidAt: "2026-05-15T12:00:00.000Z",
    });

    expect(toDearMeResendEmailPayload(rendered, {
      from: "DearMe <receipts@dearme.app>",
      to: "peter@example.com",
      replyTo: "support@dearme.app",
    })).toMatchObject({
      from: "DearMe <receipts@dearme.app>",
      to: ["peter@example.com"],
      subject: "Your DearMe receipt",
      html: rendered.html,
      text: rendered.text,
      reply_to: "support@dearme.app",
    });
  });
});
