import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

test("DearMe docker compose renders the local prod simulation stack", () => {
  const rendered = execFileSync("docker", ["compose", "-f", "docker-compose.yml", "config"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  for (const service of ["dearme-postgres", "dearme-migrate", "dearme-server", "dearme-caddy"]) {
    assert.match(rendered, new RegExp(`^  ${service}:`, "m"));
  }

  assert.match(rendered, /image: postgres:16-alpine/);
  assert.match(rendered, /condition: service_completed_successfully/);
  assert.match(rendered, /condition: service_healthy/);
  assert.match(rendered, /DATABASE_URL: postgres:\/\/dearme:dearme@dearme-postgres:5432\/dearme/);
  assert.match(rendered, /PAPERCLIP_PUBLIC_URL: https:\/\/dearme\.local/);
  assert.match(rendered, /source: dearme-postgres-data/);
});

test("DearMe Caddyfile serves dearme.local over an internal certificate", () => {
  const caddyfile = readFileSync(new URL("../docker/dearme/Caddyfile", import.meta.url), "utf8");

  assert.match(caddyfile, /^dearme\.local \{/m);
  assert.match(caddyfile, /\btls internal\b/);
  assert.match(caddyfile, /\breverse_proxy dearme-server:3000\b/);
});
