import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STATE_ENV = "PAPERCLIP_E2E_DATABASE_STATE";
const EXPLICIT_DATABASE_ENV = "PAPERCLIP_E2E_DATABASE_URL";
const ADMIN_DATABASE_ENV = "PAPERCLIP_E2E_ADMIN_DATABASE_URL";
const DISABLE_EXTERNAL_ENV = "PAPERCLIP_E2E_DISABLE_EXTERNAL_POSTGRES";

type TeardownState = {
  adminUrl: string;
  databaseName: string;
};

export function resolveE2eDatabaseEnv(paperclipHome: string): Record<string, string> {
  const baselineEnv = {
    PAPERCLIP_DB_BACKUP_ENABLED: "false",
    PAPERCLIP_MIGRATION_AUTO_APPLY: "true",
  };
  if (isPlaywrightWorkerProcess()) {
    return baselineEnv;
  }

  const explicitDatabaseUrl = cleanEnv(process.env[EXPLICIT_DATABASE_ENV]) ?? cleanEnv(process.env.DATABASE_URL);
  if (explicitDatabaseUrl) {
    return {
      ...baselineEnv,
      DATABASE_URL: explicitDatabaseUrl,
    };
  }

  if (isTruthy(process.env[DISABLE_EXTERNAL_ENV])) {
    return baselineEnv;
  }

  const adminUrl = findReachableAdminDatabaseUrl();
  if (!adminUrl) {
    return baselineEnv;
  }

  try {
    const databaseName = createDatabaseName();
    createDatabase(adminUrl, databaseName);
    const statePath = path.join(paperclipHome, "e2e-database.json");
    const state: TeardownState = { adminUrl, databaseName };
    fs.writeFileSync(statePath, JSON.stringify(state), "utf8");
    process.env[STATE_ENV] = statePath;

    return {
      ...baselineEnv,
      DATABASE_URL: databaseUrlForName(adminUrl, databaseName),
      [STATE_ENV]: statePath,
    };
  } catch {
    return baselineEnv;
  }
}

function findReachableAdminDatabaseUrl(): string | null {
  for (const adminUrl of candidateAdminDatabaseUrls()) {
    if (canConnect(adminUrl)) return adminUrl;
  }
  return null;
}

function candidateAdminDatabaseUrls(): string[] {
  const configured = cleanEnv(process.env[ADMIN_DATABASE_ENV]);
  if (configured) return [configured];

  const currentUser = encodeURIComponent(os.userInfo().username);
  return [
    `postgresql://${currentUser}@127.0.0.1:5432/postgres`,
    "postgresql://paperclip:paperclip@127.0.0.1:54329/postgres",
  ];
}

function canConnect(adminUrl: string): boolean {
  try {
    execFileSync("psql", [adminUrl, "-v", "ON_ERROR_STOP=1", "-At", "-c", "select 1"], {
      env: process.env,
      stdio: "ignore",
      timeout: 3_000,
    });
    return true;
  } catch {
    return false;
  }
}

function createDatabase(adminUrl: string, databaseName: string) {
  execFileSync("psql", [adminUrl, "-v", "ON_ERROR_STOP=1", "-c", `CREATE DATABASE ${quoteIdentifier(databaseName)};`], {
    env: process.env,
    stdio: "ignore",
    timeout: 5_000,
  });
}

function databaseUrlForName(adminUrl: string, databaseName: string): string {
  const parsed = new URL(adminUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function createDatabaseName(): string {
  return `paperclip_e2e_${process.pid}_${Date.now()}_${randomBytes(3).toString("hex")}`;
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function cleanEnv(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function isPlaywrightWorkerProcess(): boolean {
  return process.env.TEST_WORKER_INDEX !== undefined || process.env.TEST_PARALLEL_INDEX !== undefined;
}
