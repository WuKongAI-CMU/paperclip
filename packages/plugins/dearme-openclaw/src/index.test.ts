import { describe, expect, it } from "vitest";

import { DEARME_ROLE_REGISTRY } from "@paperclipai/dearme-agent-prompts";

import {
  DEARME_BOOTSTRAP_FILES,
  DEARME_OUTBOUND_TOOLS,
  DEARME_OUTBOUND_TOOL_BINDINGS,
  generateAllSkills,
  generateSkillForRole,
  getBootstrapFile,
} from "./index.js";

describe("dearme-openclaw skill generation", () => {
  it("emits exactly one skill per registry entry", () => {
    const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
    expect(skills.length).toBe(DEARME_ROLE_REGISTRY.length);
    expect(skills.length).toBe(12);
  });

  it("each skill folder is dearme-<role> and unique", () => {
    const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
    const folders = skills.map((s) => s.folder);
    expect(new Set(folders).size).toBe(folders.length);
    for (const skill of skills) {
      expect(skill.folder).toMatch(/^dearme-[a-z0-9-]+$/);
    }
  });

  it("each SKILL.md has YAML frontmatter with required keys", () => {
    const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
    for (const skill of skills) {
      expect(skill.content.startsWith("---\n")).toBe(true);
      expect(skill.content).toContain(`name: ${skill.folder}`);
      expect(skill.content).toContain('description: "');
      expect(skill.content).toContain("openclaw:");
      expect(skill.content).toContain('plugin: "dearme"');
      expect(skill.content).toContain('emoji: "');
      expect(skill.content).toContain("complexityRange:");
      expect(skill.content).toContain("defaultTier:");
    }
  });

  it("each SKILL.md embeds the verbatim system prompt from the registry", () => {
    for (const spec of DEARME_ROLE_REGISTRY) {
      const skill = generateSkillForRole(spec);
      expect(skill.content).toContain(spec.prompt);
    }
  });

  it("each SKILL.md surfaces routing, tier, state machines, and proxy tools", () => {
    const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
    for (const skill of skills) {
      expect(skill.content).toContain("## Routing");
      expect(skill.content).toContain("## Tier");
      expect(skill.content).toContain("## State machines");
      expect(skill.content).toContain("## Proxy tools");
      expect(skill.content).toContain("## System prompt");
      expect(skill.content).toContain("## Source of truth");
    }
  });

  it("chief-of-staff routing hint is the catch-all default", () => {
    const chief = DEARME_ROLE_REGISTRY.find((r) => r.role === "chief-of-staff");
    expect(chief).toBeDefined();
    const skill = generateSkillForRole(chief!);
    expect(skill.content).toMatch(/Default landing for ambiguous user requests/);
  });

  it("ads-manager defaults off in the routing hint", () => {
    const ads = DEARME_ROLE_REGISTRY.find((r) => r.role === "ads-manager");
    expect(ads).toBeDefined();
    const skill = generateSkillForRole(ads!);
    expect(skill.content).toMatch(/explicitly mentions ads/);
    expect(skill.content).toMatch(/Default off/);
  });

  it("never paraphrases prompts (must include verbatim production strings)", () => {
    const cof = DEARME_ROLE_REGISTRY.find((r) => r.role === "chief-of-staff")!;
    const cofSkill = generateSkillForRole(cof);
    expect(cofSkill.content).toContain("WORKFLOW (Complete in Order)");
    expect(cofSkill.content).toContain("Under 200 words total");

    const cp = DEARME_ROLE_REGISTRY.find((r) => r.role === "content-producer")!;
    const cpSkill = generateSkillForRole(cp);
    expect(cpSkill.content).toContain("Rate limit:** 2/day");
    expect(cpSkill.content).toContain("280");

    const oh = DEARME_ROLE_REGISTRY.find((r) => r.role === "opportunity-hunter")!;
    const ohSkill = generateSkillForRole(oh);
    expect(ohSkill.content).toContain("verify with Hunter.io");
  });
});

describe("dearme-openclaw bootstrap files", () => {
  it("ships AGENTS.md / SOUL.md / IDENTITY.md / USER.md", () => {
    expect(DEARME_BOOTSTRAP_FILES.map((f) => f.filename)).toEqual([
      "AGENTS.md",
      "SOUL.md",
      "IDENTITY.md",
      "USER.md",
    ]);
  });

  it("AGENTS.md anchors the 4 doctrines we don't relitigate", () => {
    const agents = getBootstrapFile("AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toMatch(/Chief of Staff is in charge/);
    expect(agents!.content).toMatch(/Voice gate is mandatory/);
    expect(agents!.content).toMatch(/Approval gates are exactly four/);
    expect(agents!.content).toMatch(/Concern budget is small/);
    expect(agents!.content).toMatch(/Cycle engine runs every 6 hours/);
  });

  it("SOUL.md never lets the team go sycophantic or AI-disclaimy", () => {
    const soul = getBootstrapFile("SOUL.md");
    expect(soul).toBeDefined();
    expect(soul!.content).toMatch(/Never sycophantic/);
    expect(soul!.content).toMatch(/Never "as an AI."/);
  });

  it("USER.md is a stub that forces onboarding", () => {
    const user = getBootstrapFile("USER.md");
    expect(user).toBeDefined();
    expect(user!.content).toMatch(/walk the user through the\s*DearMe onboarding ritual/);
  });
});

describe("dearme-openclaw outbound tool contract", () => {
  it("registers exactly the 5 outbound tools the manifest declares", () => {
    expect(DEARME_OUTBOUND_TOOLS).toEqual([
      "post_x",
      "send_linkedin_dm",
      "send_email",
      "deploy_site",
      "create_meta_campaign",
    ]);
  });

  it("each tool binds to (gate, channel, voiceGateRequired)", () => {
    for (const tool of DEARME_OUTBOUND_TOOLS) {
      const binding = DEARME_OUTBOUND_TOOL_BINDINGS[tool];
      expect(binding.gate).toBeDefined();
      expect(binding.channel).toBeDefined();
      expect(typeof binding.voiceGateRequired).toBe("boolean");
    }
  });

  it("publish/send tools require voice gate; deploy/spend tools don't", () => {
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.post_x.voiceGateRequired).toBe(true);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_linkedin_dm.voiceGateRequired).toBe(true);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_email.voiceGateRequired).toBe(true);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.deploy_site.voiceGateRequired).toBe(false);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.create_meta_campaign.voiceGateRequired).toBe(false);
  });

  it("each tool's gate matches its semantic intent", () => {
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.post_x.gate).toBe("publish");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_linkedin_dm.gate).toBe("send");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_email.gate).toBe("send");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.deploy_site.gate).toBe("deploy");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.create_meta_campaign.gate).toBe("spend");
  });
});
