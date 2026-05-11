import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeHostProviderAudit,
  inspectDearMeHostProviderAudit,
  parseDearMeHostProviderAuditArgs,
  type DearMeHostProviderCommandResult,
  type DearMeHostProviderProbe,
} from "./dearme-host-provider-audit.ts";

function fakeProbe(options: {
  commands?: readonly string[];
  results?: Record<string, DearMeHostProviderCommandResult>;
}): DearMeHostProviderProbe {
  const commands = new Set(options.commands ?? []);
  return {
    async commandExists(command: string) {
      return commands.has(command);
    },
    async run(command: string, args: readonly string[]) {
      const key = `${command} ${args.join(" ")}`;
      return options.results?.[key] ?? {
        exitCode: 1,
        stdout: "",
        stderr: "",
      };
    },
  };
}

test("host provider audit reports installed but unauthenticated CLIs without secrets", async () => {
  const audit = await inspectDearMeHostProviderAudit({}, fakeProbe({
    commands: ["vercel", "netlify"],
    results: {
      "vercel whoami": {
        exitCode: 1,
        stdout: "",
        stderr: "No existing credentials found. Please run vercel login.",
      },
      "netlify status": {
        exitCode: 0,
        stdout: "Not logged in. Please run netlify login.",
        stderr: "",
      },
    },
  }));
  const formatted = formatDearMeHostProviderAudit(audit).join("\n");

  assert.equal(audit.ready, false);
  assert.deepEqual(audit.missingCapabilities, [
    "host_provider_token_or_login",
    "public_https_dearme_host",
  ]);
  assert.match(formatted, /Vercel CLI is installed but not authenticated/);
  assert.match(formatted, /Netlify CLI is installed but not authenticated/);
  assert.doesNotMatch(formatted, /No existing credentials/);
  assert.doesNotMatch(formatted, /actual-secret-value/i);
});

test("host provider audit accepts a configured public HTTPS host without forcing a provider login", async () => {
  const audit = await inspectDearMeHostProviderAudit({
    DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
    DEARME_DEPLOY_SITE_BASE_URL: "https://dearme.example.test",
    DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: "dist/dearme-private-proof/peter-studio/index.html",
  }, fakeProbe({}));

  assert.equal(audit.ready, true);
  assert.deepEqual(audit.missingCapabilities, []);
  assert.equal(
    audit.providers.find((provider) => provider.key === "configured_public_host")?.ready,
    true,
  );
});

test("host provider audit accepts provider token env as authorization evidence", async () => {
  const audit = await inspectDearMeHostProviderAudit({
    VERCEL_TOKEN: "present-but-never-printed",
  }, fakeProbe({ commands: ["vercel"] }));
  const formatted = formatDearMeHostProviderAudit(audit).join("\n");

  assert.equal(audit.ready, true);
  assert.equal(
    audit.providers.find((provider) => provider.key === "vercel")?.ready,
    true,
  );
  assert.doesNotMatch(formatted, /present-but-never-printed/);
});

test("host provider audit parses check, json, and env files", () => {
  assert.deepEqual(parseDearMeHostProviderAuditArgs([
    "--check",
    "--json",
    "--env-file",
    ".one.env",
    "--env-file=.two.env",
  ]), {
    help: false,
    json: true,
    check: true,
    envFiles: [".one.env", ".two.env"],
  });
  assert.throws(
    () => parseDearMeHostProviderAuditArgs(["--env-file"]),
    /--env-file requires a value/,
  );
  assert.throws(
    () => parseDearMeHostProviderAuditArgs(["--lane", "provider"]),
    /unknown argument/,
  );
});
