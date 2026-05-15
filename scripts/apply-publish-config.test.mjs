import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = new URL("./apply-publish-config.mjs", import.meta.url).pathname;

test("applies publishConfig exports through scoped package symlinks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "publish-config-"));
  const storePackage = path.join(root, ".pnpm", "pkg", "node_modules", "@paperclipai", "shared");
  const scopedRoot = path.join(root, "node_modules", "@paperclipai");
  const linkedPackage = path.join(scopedRoot, "shared");

  await mkdir(storePackage, { recursive: true });
  await mkdir(scopedRoot, { recursive: true });
  await writeFile(
    path.join(storePackage, "package.json"),
    JSON.stringify(
      {
        name: "@paperclipai/shared",
        type: "module",
        exports: { ".": "./src/index.ts" },
        publishConfig: {
          exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
          main: "./dist/index.js",
          types: "./dist/index.d.ts",
        },
      },
      null,
      2,
    ),
  );
  await symlink(storePackage, linkedPackage);

  await execFileAsync(process.execPath, [scriptPath, root]);

  const patched = JSON.parse(await readFile(path.join(storePackage, "package.json"), "utf8"));
  assert.deepEqual(patched.exports, {
    ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
  });
  assert.equal(patched.main, "./dist/index.js");
  assert.equal(patched.types, "./dist/index.d.ts");
});
