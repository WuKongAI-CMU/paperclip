#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const FORBIDDEN_PACKAGE = ["@aws-sdk/client", "bedrock"].join("-");
const PACKAGE_MANIFEST = "package.json";
const SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const forbiddenPackagePattern = escapeRegExp(FORBIDDEN_PACKAGE);
const FORBIDDEN_IMPORT_PATTERN = new RegExp(
  [
    String.raw`(?:import|export)\s+(?:type\s+)?[\s\S]{0,240}?\s+from\s*["']${forbiddenPackagePattern}["']`,
    String.raw`import\s*\(\s*["']${forbiddenPackagePattern}["']\s*\)`,
    String.raw`require\s*\(\s*["']${forbiddenPackagePattern}["']\s*\)`,
  ].join("|"),
  "m",
);

export function listBedrockGuardViolations(files) {
  const violations = [];

  for (const file of files) {
    if (file.path.endsWith(PACKAGE_MANIFEST) && file.contents.includes(FORBIDDEN_PACKAGE)) {
      violations.push({
        file: file.path,
        reason: `${FORBIDDEN_PACKAGE} is not allowed in package manifests`,
      });
      continue;
    }

    if (SOURCE_FILE_PATTERN.test(file.path) && FORBIDDEN_IMPORT_PATTERN.test(file.contents)) {
      violations.push({
        file: file.path,
        reason: `${FORBIDDEN_PACKAGE} imports are not allowed`,
      });
    }
  }

  return violations;
}

function trackedFiles(repoRoot) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output.split("\0").filter(Boolean);
}

function main() {
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const files = trackedFiles(repoRoot).flatMap((path) => {
    const absolutePath = `${repoRoot}/${path}`;
    if (!statSync(absolutePath).isFile()) return [];
    return [{
      path,
      contents: readFileSync(absolutePath, "utf8"),
    }];
  });
  const violations = listBedrockGuardViolations(files);

  if (violations.length > 0) {
    console.error("DearMe Bedrock SDK guard failed:");
    for (const violation of violations) {
      console.error(`  ${violation.file}: ${violation.reason}`);
    }
    process.exit(1);
  }

  console.log("DearMe Bedrock SDK guard passed.");
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  main();
}
