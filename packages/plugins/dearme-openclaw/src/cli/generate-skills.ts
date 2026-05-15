/**
 * CLI: regenerate the OpenClaw SKILL.md files from DEARME_ROLE_REGISTRY.
 *
 *   pnpm --filter @paperclipai/dearme-openclaw run generate-skills
 *
 * Output: ../../generated/skills/dearme-<role>/SKILL.md (12 folders).
 *
 * Run this whenever the registry changes. The generated tree is what
 * the OpenClaw plugin manifest's `skills` field points at.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEARME_ROLE_REGISTRY } from "@paperclipai/dearme-agent-prompts";

import { generateAllSkills } from "../skill-generator.js";
import { generateLockdownBundle } from "../skill-generator-lockdown.js";
import { DEARME_BOOTSTRAP_FILES } from "../bootstrap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, "..", "..");
const SKILLS_OUT = join(PACKAGE_ROOT, "generated", "skills");
const BOOTSTRAP_OUT = join(PACKAGE_ROOT, "generated", "bootstrap");
const LOCKDOWN_OUT = join(PACKAGE_ROOT, "generated", "lockdown");

interface CliOptions {
  userHandle: string;
  dearMeProxyUrl: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    userHandle: "anonymous",
    dearMeProxyUrl: "https://api.dearme.app",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--user-handle") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--user-handle requires a value");
      }
      options.userHandle = value;
      i += 1;
    } else if (arg?.startsWith("--user-handle=")) {
      options.userHandle = arg.slice("--user-handle=".length);
    } else if (arg === "--proxy-url") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--proxy-url requires a value");
      }
      options.dearMeProxyUrl = value;
      i += 1;
    } else if (arg?.startsWith("--proxy-url=")) {
      options.dearMeProxyUrl = arg.slice("--proxy-url=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  await rm(SKILLS_OUT, { recursive: true, force: true });
  await rm(BOOTSTRAP_OUT, { recursive: true, force: true });
  await rm(LOCKDOWN_OUT, { recursive: true, force: true });
  await mkdir(SKILLS_OUT, { recursive: true });
  await mkdir(BOOTSTRAP_OUT, { recursive: true });
  await mkdir(LOCKDOWN_OUT, { recursive: true });

  const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
  for (const skill of skills) {
    const dir = join(SKILLS_OUT, skill.folder);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), skill.content, "utf8");
  }

  for (const file of DEARME_BOOTSTRAP_FILES) {
    await writeFile(join(BOOTSTRAP_OUT, file.filename), file.content, "utf8");
  }

  const lockdown = generateLockdownBundle(options);
  for (const file of lockdown.files) {
    const outPath = join(LOCKDOWN_OUT, file.relativePath);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, file.content, "utf8");
  }

  // eslint-disable-next-line no-console
  console.log(
    `Generated ${skills.length} skills into ${SKILLS_OUT}, ${DEARME_BOOTSTRAP_FILES.length} bootstrap files into ${BOOTSTRAP_OUT}, and ${lockdown.files.length} lockdown files into ${LOCKDOWN_OUT}.`,
  );
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
