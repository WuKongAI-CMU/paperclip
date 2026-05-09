import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printStartupBanner } from "../startup-banner.ts";

const ORIGINAL_PAPERCLIP_AGENT_JWT_SECRET = process.env.PAPERCLIP_AGENT_JWT_SECRET;
const ORIGINAL_PAPERCLIP_HOME = process.env.PAPERCLIP_HOME;
const ORIGINAL_PAPERCLIP_INSTANCE_ID = process.env.PAPERCLIP_INSTANCE_ID;

describe("printStartupBanner", () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(path.join(tmpdir(), "dearme-startup-banner-"));
    delete process.env.PAPERCLIP_AGENT_JWT_SECRET;
    process.env.PAPERCLIP_HOME = tempHome;
    process.env.PAPERCLIP_INSTANCE_ID = "startup-banner-test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempHome, { recursive: true, force: true });

    if (ORIGINAL_PAPERCLIP_AGENT_JWT_SECRET === undefined) {
      delete process.env.PAPERCLIP_AGENT_JWT_SECRET;
    } else {
      process.env.PAPERCLIP_AGENT_JWT_SECRET = ORIGINAL_PAPERCLIP_AGENT_JWT_SECRET;
    }

    if (ORIGINAL_PAPERCLIP_HOME === undefined) {
      delete process.env.PAPERCLIP_HOME;
    } else {
      process.env.PAPERCLIP_HOME = ORIGINAL_PAPERCLIP_HOME;
    }

    if (ORIGINAL_PAPERCLIP_INSTANCE_ID === undefined) {
      delete process.env.PAPERCLIP_INSTANCE_ID;
    } else {
      process.env.PAPERCLIP_INSTANCE_ID = ORIGINAL_PAPERCLIP_INSTANCE_ID;
    }
  });

  it("uses DearMe-facing startup and onboarding copy when the agent JWT is missing", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    printStartupBanner({
      bind: "loopback",
      host: "127.0.0.1",
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      authReady: true,
      requestedPort: 3100,
      listenPort: 3100,
      uiMode: "none",
      db: {
        mode: "embedded-postgres",
        dataDir: "/tmp/dearme-db",
        port: 54329,
      },
      migrationSummary: "up to date",
      heartbeatSchedulerEnabled: false,
      heartbeatSchedulerIntervalMs: 30000,
      databaseBackupEnabled: false,
      databaseBackupIntervalMinutes: 60,
      databaseBackupRetentionDays: 30,
      databaseBackupDir: "/tmp/dearme-backups",
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = String(logSpy.mock.calls[0]?.[0] ?? "");

    expect(output).toContain("DEARME");
    expect(output).toContain("missing (run the local DearMe setup command for this install: onboard)");
    expect(output).not.toContain("pnpm paperclipai");
    expect(output).not.toContain("paperclipai onboard");
  });
});
