import { checkDearMeSupportResponseSla } from "../server/src/services/dearme-support-sla.ts";

export interface DearMeSupportSlaCliResult {
  exitCode: number;
  output: Record<string, unknown>;
}

function isMainModule() {
  return import.meta.url === `file://${process.argv[1]}`;
}

export async function runDearMeSupportSlaCli(): Promise<DearMeSupportSlaCliResult> {
  const result = await checkDearMeSupportResponseSla();
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
      checkedThreads: result.checkedThreads,
      overdueThreadCount: result.overdueThreads.length,
      overdueThreadIds: result.overdueThreads.map((thread) => thread.id),
      event: result.event,
    },
  };
}

if (isMainModule()) {
  runDearMeSupportSlaCli()
    .then((result) => {
      console.log(JSON.stringify(result.output, null, 2));
      process.exitCode = result.exitCode;
    })
    .catch((error: unknown) => {
      console.error(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "support_sla_failed",
      }, null, 2));
      process.exitCode = 1;
    });
}
