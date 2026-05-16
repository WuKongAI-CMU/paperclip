import { createDb } from "../packages/db/src/index.js";
import { sendDearMeWeeklyLetterEmails } from "../server/src/services/dearme-weekly-letter-email.ts";

export interface DearMeWeeklyLetterCliResult {
  exitCode: number;
  output: Record<string, unknown>;
}

function isMainModule() {
  return import.meta.url === `file://${process.argv[1]}`;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

export async function runDearMeWeeklyLetterEmailCli(): Promise<DearMeWeeklyLetterCliResult> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return {
      exitCode: 0,
      output: {
        ok: true,
        skipped: true,
        reason: "database_url_unset",
      },
    };
  }

  const db = createDb(databaseUrl);
  const result = await sendDearMeWeeklyLetterEmails({
    db,
    force: hasFlag("--force"),
  });

  if (result.skipped) {
    return {
      exitCode: 0,
      output: {
        ok: true,
        skipped: true,
        reason: result.reason,
      },
    };
  }

  return {
    exitCode: result.ok ? 0 : 1,
    output: {
      ok: result.ok,
      checkedCandidates: result.checkedCandidates,
      dueCandidates: result.dueCandidates,
      sent: result.sent,
      failed: result.failed,
      results: result.results.map((sendResult) => ({
        companyId: sendResult.companyId,
        userId: sendResult.userId,
        localDate: sendResult.localDate,
        timezone: sendResult.timezone,
        status: sendResult.status,
        reason: sendResult.reason,
      })),
    },
  };
}

if (isMainModule()) {
  runDearMeWeeklyLetterEmailCli()
    .then((result) => {
      console.log(JSON.stringify(result.output, null, 2));
      process.exitCode = result.exitCode;
    })
    .catch((error: unknown) => {
      console.error(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "weekly_letter_email_failed",
      }, null, 2));
      process.exitCode = 1;
    });
}
