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
import { DEARME_BOOTSTRAP_FILES } from "../bootstrap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, "..", "..");
const SKILLS_OUT = join(PACKAGE_ROOT, "generated", "skills");
const BOOTSTRAP_OUT = join(PACKAGE_ROOT, "generated", "bootstrap");

async function main(): Promise<void> {
  await rm(SKILLS_OUT, { recursive: true, force: true });
  await rm(BOOTSTRAP_OUT, { recursive: true, force: true });
  await mkdir(SKILLS_OUT, { recursive: true });
  await mkdir(BOOTSTRAP_OUT, { recursive: true });

  const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
  for (const skill of skills) {
    const dir = join(SKILLS_OUT, skill.folder);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), skill.content, "utf8");
  }

  for (const file of DEARME_BOOTSTRAP_FILES) {
    await writeFile(join(BOOTSTRAP_OUT, file.filename), file.content, "utf8");
  }

  // eslint-disable-next-line no-console
  console.log(
    `Generated ${skills.length} skills into ${SKILLS_OUT} and ${DEARME_BOOTSTRAP_FILES.length} bootstrap files into ${BOOTSTRAP_OUT}.`,
  );
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
