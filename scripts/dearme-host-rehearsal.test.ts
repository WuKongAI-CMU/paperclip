import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  parseDearMeHostRehearsalArgs,
  runDearMeHostRehearsal,
  startDearMeStaticHost,
} from "./dearme-host-rehearsal.ts";

test("host rehearsal args default to exporting the private packet on loopback", () => {
  const args = parseDearMeHostRehearsalArgs([]);

  assert.equal(args.exportSiteDir, "dist/dearme-private-proof");
  assert.equal(args.host, "127.0.0.1");
  assert.equal(args.port, 8787);
  assert.equal(args.skipExport, false);
  assert.equal(args.json, false);

  const explicit = parseDearMeHostRehearsalArgs([
    "--",
    "--json",
    "--skip-export",
    "--export-site",
    "dist/custom",
    "--host=localhost",
    "--port",
    "0",
  ]);
  assert.equal(explicit.json, true);
  assert.equal(explicit.skipExport, true);
  assert.equal(explicit.exportSiteDir, "dist/custom");
  assert.equal(explicit.host, "localhost");
  assert.equal(explicit.port, 0);
});

test("static host serves only files under the exported packet root", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-host-rehearsal-static-"));
  const handleDir = join(dir, "peter-studio");
  await mkdir(handleDir, { recursive: true });
  await writeFile(
    join(handleDir, "index.html"),
    "<html><body>Peter Studio has a private growth team already working</body></html>",
    "utf8",
  );
  const staticHost = await startDearMeStaticHost({ rootDir: dir, port: 0 });

  try {
    const ok = await fetch(`${staticHost.baseUrl}/peter-studio/index.html`);
    assert.equal(ok.status, 200);
    assert.match(await ok.text(), /private growth team/);

    const blocked = await fetch(`${staticHost.baseUrl}/%2e%2e%2fpackage.json`);
    assert.equal(blocked.status, 403);
  } finally {
    await staticHost.close();
    await rm(dir, { force: true, recursive: true });
  }
});

test("host rehearsal exports the first-wow site and verifies it through real loopback fetch", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-host-rehearsal-"));
  try {
    const report = await runDearMeHostRehearsal({
      exportSiteDir: dir,
      port: 0,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
    });
    const [result] = report.results;

    assert.equal(report.handle, "peter-studio");
    assert.equal(report.htmlPath, join(dir, "peter-studio", "index.html"));
    assert.equal(report.hostSmokePath, join(dir, "peter-studio", "host-smoke.json"));
    assert.equal(result?.status, "delivered");
    if (result?.status === "delivered") {
      assert.equal(result.hostStatus, 200);
      assert.equal(result.externalUrl, `${report.baseUrl}/peter-studio/index.html`);
      assert.match(result.externalId, /^dearme_host_rehearsal_/);
    }
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});
