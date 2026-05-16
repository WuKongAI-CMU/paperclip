import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  activityLog,
  authUsers,
  companies,
  companyMemberships,
  documents,
  issueDocuments,
  issues,
  routineTriggers,
  routines,
} from "@paperclipai/db";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "./dearme-brand-blueprint-apply.js";
import { dearMeCustomerSafeText } from "./dearme-customer-text.js";

const DEFAULT_RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "letters@dearme.app";
const DEFAULT_FROM_NAME = "DearMe";
const DEFAULT_APP_URL = "https://dearme.app";
const DEFAULT_TIMEZONE = "UTC";
const SEND_ACTION = "dearme.weekly_letter.sent";
const WEEKLY_REPORT_FINGERPRINT = "operation-schedule_weekly_report";
const WEEKLY_REPORT_DOCUMENT_KEY = "dear-me-report";

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export interface DearMeWeeklyLetterReport {
  issueId: string;
  documentId: string;
  title: string;
  body: string;
  updatedAt: Date;
}

export interface DearMeWeeklyLetterCandidate {
  companyId: string;
  companyName: string;
  userId: string;
  recipientName: string | null;
  recipientEmail: string;
  timezone: string | null;
  report: DearMeWeeklyLetterReport | null;
}

export interface DearMeWeeklyLetterRepository {
  listCandidates(): Promise<DearMeWeeklyLetterCandidate[]>;
  hasSent(input: { companyId: string; localDate: string }): Promise<boolean>;
  markSent(input: {
    companyId: string;
    localDate: string;
    reportDocumentId: string;
    providerMessageId: string | null;
    now: Date;
  }): Promise<void>;
}

export interface DearMeWeeklyLetterEmailOptions {
  repository?: DearMeWeeklyLetterRepository;
  db?: Db;
  fetch?: FetchLike;
  resendApiKey?: string | null;
  emailsUrl?: string;
  fromEmail?: string | null;
  fromName?: string | null;
  appUrl?: string | null;
  now?: Date;
  force?: boolean;
}

export interface DearMeWeeklyLetterSendResult {
  companyId: string;
  userId: string;
  localDate: string;
  timezone: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  providerMessageId?: string | null;
}

export type DearMeWeeklyLetterEmailResult =
  | { skipped: true; reason: string }
  | {
    skipped: false;
    ok: boolean;
    checkedCandidates: number;
    dueCandidates: number;
    sent: number;
    failed: number;
    results: DearMeWeeklyLetterSendResult[];
  };

function configuredValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function resolveApiKey(options: DearMeWeeklyLetterEmailOptions) {
  return configuredValue(options.resendApiKey) ?? configuredValue(process.env.DEARME_RESEND_API_KEY);
}

function resolveFromEmail(options: DearMeWeeklyLetterEmailOptions) {
  return configuredValue(options.fromEmail) ?? configuredValue(process.env.DEARME_WEEKLY_LETTER_FROM_EMAIL) ?? DEFAULT_FROM_EMAIL;
}

function resolveFromName(options: DearMeWeeklyLetterEmailOptions) {
  return configuredValue(options.fromName) ?? configuredValue(process.env.DEARME_WEEKLY_LETTER_FROM_NAME) ?? DEFAULT_FROM_NAME;
}

function resolveAppUrl(options: DearMeWeeklyLetterEmailOptions) {
  return configuredValue(options.appUrl) ?? configuredValue(process.env.DEARME_PUBLIC_URL) ?? DEFAULT_APP_URL;
}

function resolveFetch(options: DearMeWeeklyLetterEmailOptions): FetchLike {
  return options.fetch ?? fetch;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function utcParts(now: Date) {
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getUTCDay()] ?? "Sun";
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return {
    weekday,
    hour: now.getUTCHours(),
    localDate: `${now.getUTCFullYear()}-${month}-${day}`,
    timezone: DEFAULT_TIMEZONE,
  };
}

function localParts(now: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    return {
      weekday: value("weekday"),
      hour: Number(value("hour")),
      localDate: `${value("year")}-${value("month")}-${value("day")}`,
      timezone,
    };
  } catch {
    return utcParts(now);
  }
}

function isWeeklySendWindow(now: Date, timezone: string) {
  const parts = localParts(now, timezone);
  return {
    ...parts,
    due: parts.weekday === "Sun" && parts.hour === 18,
  };
}

function reportPreview(body: string) {
  return dearMeCustomerSafeText(body, "Your weekly DearMe letter is ready.", 12_000);
}

function htmlParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function buildWeeklyLetterEmail(input: {
  candidate: DearMeWeeklyLetterCandidate;
  localDate: string;
  appUrl: string;
  fromEmail: string;
  fromName: string;
}) {
  const report = input.candidate.report;
  const body = reportPreview(report?.body ?? "");
  const firstName = input.candidate.recipientName?.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const text = [
    greeting,
    "",
    "Here is your weekly DearMe letter.",
    "",
    body,
    "",
    `Open DearMe: ${input.appUrl}`,
    "",
    "Nothing publishes, sends, deploys, or spends without your approval.",
  ].join("\n");

  return {
    from: `${input.fromName} <${input.fromEmail}>`,
    to: [input.candidate.recipientEmail],
    subject: `Your DearMe letter for ${input.localDate}`,
    text,
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your DearMe letter</title>
</head>
<body style="margin:0;padding:0;background:#f5f2ec;color:#20201d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <main style="max-width:680px;margin:0 auto;padding:32px 18px;">
    <section style="background:#fffdf8;border:1px solid #ded7ca;border-radius:8px;padding:32px;">
      <p style="font-size:15px;font-weight:700;margin:0 0 24px;">DearMe</p>
      <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">Your weekly letter</h1>
      <p>${escapeHtml(greeting)}</p>
      <p>Here is your weekly DearMe letter.</p>
      ${htmlParagraphs(body)}
      <p><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:#20201d;color:#fffdf8;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;">Open DearMe</a></p>
      <p style="color:#5c574d;">Nothing publishes, sends, deploys, or spends without your approval.</p>
    </section>
  </main>
</body>
</html>`,
  };
}

async function sendResendEmail(input: {
  fetchImpl: FetchLike;
  emailsUrl: string;
  apiKey: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}) {
  const response = await input.fetchImpl(input.emailsUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify(input.payload),
  });
  const body = asRecord(await response.json().catch(() => null));
  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      reason: stringField(body, "message") ?? response.statusText ?? "weekly_letter_send_failed",
    };
  }
  return {
    ok: true as const,
    status: response.status,
    id: stringField(body, "id"),
  };
}

export function createDbDearMeWeeklyLetterRepository(db: Db): DearMeWeeklyLetterRepository {
  async function reportRowsForCompanies(companyIds: string[]) {
    if (companyIds.length === 0) return new Map<string, DearMeWeeklyLetterReport>();
    const rows = await db
      .select({
        companyId: issues.companyId,
        issueId: issues.id,
        documentId: documents.id,
        title: documents.title,
        body: documents.latestBody,
        updatedAt: documents.updatedAt,
      })
      .from(issues)
      .innerJoin(issueDocuments, eq(issueDocuments.issueId, issues.id))
      .innerJoin(documents, eq(documents.id, issueDocuments.documentId))
      .where(and(
        inArray(issues.companyId, companyIds),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
        eq(issues.originFingerprint, WEEKLY_REPORT_FINGERPRINT),
        isNull(issues.hiddenAt),
        eq(issueDocuments.key, WEEKLY_REPORT_DOCUMENT_KEY),
      ))
      .orderBy(desc(documents.updatedAt));

    const byCompany = new Map<string, DearMeWeeklyLetterReport>();
    for (const row of rows) {
      if (byCompany.has(row.companyId)) continue;
      byCompany.set(row.companyId, {
        issueId: row.issueId,
        documentId: row.documentId,
        title: row.title ?? "Dear me report",
        body: row.body,
        updatedAt: row.updatedAt,
      });
    }
    return byCompany;
  }

  return {
    async listCandidates() {
      const members = await db
        .select({
          companyId: companies.id,
          companyName: companies.name,
          userId: authUsers.id,
          recipientName: authUsers.name,
          recipientEmail: authUsers.email,
          membershipRole: companyMemberships.membershipRole,
          membershipUpdatedAt: companyMemberships.updatedAt,
        })
        .from(companyMemberships)
        .innerJoin(companies, eq(companies.id, companyMemberships.companyId))
        .innerJoin(authUsers, eq(authUsers.id, companyMemberships.principalId))
        .where(and(
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.status, "active"),
          isNull(authUsers.deletedAt),
        ))
        .orderBy(desc(companyMemberships.updatedAt));

      const companyIds = [...new Set(members.map((member) => member.companyId))];
      if (companyIds.length === 0) return [];

      const [timezoneRows, reportByCompany] = await Promise.all([
        db
          .select({
            companyId: routineTriggers.companyId,
            timezone: routineTriggers.timezone,
          })
          .from(routineTriggers)
          .innerJoin(routines, eq(routines.id, routineTriggers.routineId))
          .where(and(
            inArray(routineTriggers.companyId, companyIds),
            eq(routineTriggers.enabled, true),
            eq(routineTriggers.kind, "schedule"),
            sql`${routineTriggers.timezone} is not null`,
            sql`lower(${routines.title}) like '%weekly%'`,
          )),
        reportRowsForCompanies(companyIds),
      ]);

      const timezoneByCompany = new Map<string, string>();
      for (const row of timezoneRows) {
        if (row.timezone && !timezoneByCompany.has(row.companyId)) {
          timezoneByCompany.set(row.companyId, row.timezone);
        }
      }

      const chosenByCompany = new Map<string, typeof members[number]>();
      for (const member of members) {
        const existing = chosenByCompany.get(member.companyId);
        if (!existing || member.membershipRole === "owner") {
          chosenByCompany.set(member.companyId, member);
        }
      }

      return [...chosenByCompany.values()].map((member) => ({
        companyId: member.companyId,
        companyName: member.companyName,
        userId: member.userId,
        recipientName: member.recipientName,
        recipientEmail: member.recipientEmail,
        timezone: timezoneByCompany.get(member.companyId) ?? DEFAULT_TIMEZONE,
        report: reportByCompany.get(member.companyId) ?? null,
      }));
    },
    async hasSent(input) {
      const entityId = `${input.companyId}:${input.localDate}`;
      const rows = await db
        .select({ id: activityLog.id })
        .from(activityLog)
        .where(and(
          eq(activityLog.companyId, input.companyId),
          eq(activityLog.action, SEND_ACTION),
          eq(activityLog.entityType, "dearme_weekly_letter"),
          eq(activityLog.entityId, entityId),
        ))
        .limit(1);
      return rows.length > 0;
    },
    async markSent(input) {
      await db.insert(activityLog).values({
        companyId: input.companyId,
        actorType: "system",
        actorId: "dearme-weekly-letter-email",
        action: SEND_ACTION,
        entityType: "dearme_weekly_letter",
        entityId: `${input.companyId}:${input.localDate}`,
        details: {
          localDate: input.localDate,
          reportDocumentId: input.reportDocumentId,
          providerMessageId: input.providerMessageId,
        },
        createdAt: input.now,
      });
    },
  };
}

export async function sendDearMeWeeklyLetterEmails(
  options: DearMeWeeklyLetterEmailOptions = {},
): Promise<DearMeWeeklyLetterEmailResult> {
  const apiKey = resolveApiKey(options);
  if (!apiKey) return { skipped: true, reason: "dearme_resend_api_key_unset" };

  const repository = options.repository ?? (options.db ? createDbDearMeWeeklyLetterRepository(options.db) : null);
  if (!repository) return { skipped: true, reason: "dearme_weekly_letter_repository_unset" };

  const now = options.now ?? new Date();
  const fetchImpl = resolveFetch(options);
  const emailsUrl = options.emailsUrl ?? DEFAULT_RESEND_EMAILS_URL;
  const fromEmail = resolveFromEmail(options);
  const fromName = resolveFromName(options);
  const appUrl = resolveAppUrl(options);
  const candidates = await repository.listCandidates();
  const results: DearMeWeeklyLetterSendResult[] = [];
  let dueCandidates = 0;

  for (const candidate of candidates) {
    const timezone = candidate.timezone?.trim() || DEFAULT_TIMEZONE;
    const window = isWeeklySendWindow(now, timezone);
    if (!options.force && !window.due) {
      results.push({
        companyId: candidate.companyId,
        userId: candidate.userId,
        localDate: window.localDate,
        timezone: window.timezone,
        status: "skipped",
        reason: "not_sunday_18_local",
      });
      continue;
    }
    dueCandidates += 1;

    if (!candidate.report) {
      results.push({
        companyId: candidate.companyId,
        userId: candidate.userId,
        localDate: window.localDate,
        timezone: window.timezone,
        status: "skipped",
        reason: "weekly_report_missing",
      });
      continue;
    }

    if (await repository.hasSent({ companyId: candidate.companyId, localDate: window.localDate })) {
      results.push({
        companyId: candidate.companyId,
        userId: candidate.userId,
        localDate: window.localDate,
        timezone: window.timezone,
        status: "skipped",
        reason: "already_sent",
      });
      continue;
    }

    const sendResult = await sendResendEmail({
      fetchImpl,
      emailsUrl,
      apiKey,
      idempotencyKey: `dearme-weekly-letter:${candidate.companyId}:${window.localDate}`,
      payload: buildWeeklyLetterEmail({
        candidate,
        localDate: window.localDate,
        appUrl,
        fromEmail,
        fromName,
      }),
    });

    if (!sendResult.ok) {
      results.push({
        companyId: candidate.companyId,
        userId: candidate.userId,
        localDate: window.localDate,
        timezone: window.timezone,
        status: "failed",
        reason: `email_send_failed:${sendResult.status}`,
      });
      continue;
    }

    await repository.markSent({
      companyId: candidate.companyId,
      localDate: window.localDate,
      reportDocumentId: candidate.report.documentId,
      providerMessageId: sendResult.id,
      now,
    });
    results.push({
      companyId: candidate.companyId,
      userId: candidate.userId,
      localDate: window.localDate,
      timezone: window.timezone,
      status: "sent",
      providerMessageId: sendResult.id,
    });
  }

  const sent = results.filter((result) => result.status === "sent").length;
  const failed = results.filter((result) => result.status === "failed").length;
  return {
    skipped: false,
    ok: failed === 0,
    checkedCandidates: candidates.length,
    dueCandidates,
    sent,
    failed,
    results,
  };
}
