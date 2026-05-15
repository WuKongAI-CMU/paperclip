import { readdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];

if (!root) {
  console.error("usage: node scripts/apply-publish-config.mjs <package-or-node_modules-root>");
  process.exit(1);
}

const rootRealPath = await realpath(root);

async function* packageJsonFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const fullStat = entry.isSymbolicLink() ? await stat(fullPath).catch(() => null) : null;
    if (entry.isDirectory() || fullStat?.isDirectory()) {
      if (entry.name.startsWith(".") && entry.name !== ".pnpm") continue;
      yield* packageJsonFiles(fullPath);
      continue;
    }
    if ((entry.isFile() || fullStat?.isFile()) && entry.name === "package.json") {
      const realPackageJsonPath = await realpath(fullPath).catch(() => null);
      if (realPackageJsonPath?.startsWith(`${rootRealPath}${path.sep}`)) {
        yield fullPath;
      }
    }
  }
}

let patched = 0;
for await (const packageJsonPath of packageJsonFiles(root)) {
  const raw = await readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw);
  if (typeof pkg.name !== "string" || !pkg.name.startsWith("@paperclipai/")) {
    continue;
  }
  if (!pkg.publishConfig || typeof pkg.publishConfig !== "object") {
    continue;
  }

  const { access: _access, ...publishConfig } = pkg.publishConfig;
  const next = { ...pkg, ...publishConfig };
  const tempPath = `${packageJsonPath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`);
  await rename(tempPath, packageJsonPath);
  patched += 1;
}

console.log(`applied publishConfig to ${patched} package.json file(s) under ${root}`);
