import { execFileSync } from "node:child_process";
import fs from "node:fs";

const STATE_ENV = "PAPERCLIP_E2E_DATABASE_STATE";

type TeardownState = {
  adminUrl: string;
  databaseName: string;
};

export default async function globalTeardown() {
  const statePath = process.env[STATE_ENV];
  if (!statePath || !fs.existsSync(statePath)) {
    return;
  }

  const state = readState(statePath);
  if (!state) {
    return;
  }

  try {
    execFileSync("psql", [
      state.adminUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${quoteLiteral(state.databaseName)} AND pid <> pg_backend_pid();`,
    ], {
      env: process.env,
      stdio: "ignore",
      timeout: 10_000,
    });
    execFileSync("psql", [
      state.adminUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `DROP DATABASE IF EXISTS ${quoteIdentifier(state.databaseName)};`,
    ], {
      env: process.env,
      stdio: "ignore",
      timeout: 10_000,
    });
  } finally {
    fs.rmSync(statePath, { force: true });
  }
}

function readState(statePath: string): TeardownState | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8")) as TeardownState;
    if (!isSafeDatabaseName(parsed.databaseName) || typeof parsed.adminUrl !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function quoteIdentifier(value: string): string {
  if (!isSafeDatabaseName(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function isSafeDatabaseName(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value);
}
