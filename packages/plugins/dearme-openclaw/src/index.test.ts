import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEARME_ROLE_REGISTRY } from "@paperclipai/dearme-agent-prompts";

import {
  DEARME_BOOTSTRAP_FILES,
  DEARME_EMPLOYEE_HANDOFF_PRIMITIVES,
  DEARME_OUTBOUND_TOOLS,
  DEARME_OUTBOUND_TOOL_BINDINGS,
  dearMeEmployeeHandoffPrimitiveForTool,
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
      expect(skill.content).toContain("dearme:");
      expect(skill.content).toContain('plugin: "dearme"');
      expect(skill.content).toContain('emoji: "');
      expect(skill.content).toContain("complexityBand:");
      expect(skill.content).toContain("executionTier:");
    }
  });

  it("each SKILL.md embeds the verbatim system prompt from the registry", () => {
    for (const spec of DEARME_ROLE_REGISTRY) {
      const skill = generateSkillForRole(spec);
      expect(skill.content).toContain(spec.prompt);
    }
  });

  it("each SKILL.md surfaces routing, execution, operating rails, and private capabilities", () => {
    const skills = generateAllSkills(DEARME_ROLE_REGISTRY);
    for (const skill of skills) {
      expect(skill.content).toContain("## Routing");
      expect(skill.content).toContain("## Execution");
      expect(skill.content).toContain("## Operating rails");
      expect(skill.content).toContain("## Private capabilities");
      expect(skill.content).toContain("## System prompt");
      expect(skill.content).toContain("## Maintenance");
    }
  });

  it("generated skill wrapper copy stays DearMe-facing", () => {
    const roles = ["opportunity-hunter", "browser-agent"] as const;
    for (const role of roles) {
      const spec = DEARME_ROLE_REGISTRY.find((entry) => entry.role === role)!;
      const skill = generateSkillForRole(spec);
      expect(skill.content).not.toMatch(
        /openclaw:|OpenClaw interface|runtime-port|@paperclipai|proxy tools|Default model tier|Plugin package|Registry entry/i,
      );
      expect(skill.content).toContain("Full role instructions");
      expect(skill.content).toContain("Private capabilities");
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
    expect(cpSkill.content).toContain("private brand");
    expect(cpSkill.content).toContain("Voice Gate score");
    expect(cpSkill.content).toContain("Do not publish, send, schedule");
    expect(cpSkill.content).toContain("If the packet is not saved by a tool call");
    expect(cpSkill.content).not.toContain("Rate limit:** 2/day");
    expect(cpSkill.content).not.toContain("Char limit:** 280");

    const oh = DEARME_ROLE_REGISTRY.find((r) => r.role === "opportunity-hunter")!;
    const ohSkill = generateSkillForRole(oh);
    expect(ohSkill.content).toContain("draft only until the user approves the send");
    expect(ohSkill.content).toContain("5 touches max");
    expect(ohSkill.content).not.toMatch(/Hunter\.io|get_leads|add_lead|contacted → responded → meeting/i);
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

  it("bootstrap prompt copy stays on customer-safe DearMe rails", () => {
    const combined = DEARME_BOOTSTRAP_FILES.map((file) => file.content).join("\n");
    expect(combined).not.toMatch(/\bX\b|Twitter|280-char|Naive\/Paperclip|OpenClaw|adapters|provider/i);
    expect(combined).toContain("channel-specific publishing limits");
    expect(combined).toContain("connected public channels");
    expect(combined).toContain("public post or note");
  });
});

describe("dearme-openclaw customer-facing manifest copy", () => {
  it("keeps the install surface team-oriented and backstage-only", () => {
    const manifestJson = readFileSync(new URL("../openclaw.plugin.json", import.meta.url), "utf8");
    const manifest = JSON.parse(manifestJson) as {
      uiHints?: Record<string, { label?: string; help?: string }>;
    };
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const uiCopy = Object.values(manifest.uiHints ?? {})
      .flatMap((hint) => [hint.label, hint.help])
      .filter(Boolean)
      .join("\n");

    expect(manifest.uiHints?.apiKey?.label).toBe("DearMe team access");
    expect(manifest.uiHints?.apiKey?.help).toContain("Provisioned during onboarding");
    expect(uiCopy).not.toMatch(/API key|dm_sk_|credential|OpenClaw|proxy|runtime|provider|model/i);
    expect(manifestJson).not.toMatch(/dm_sk_/i);
    expect(readme).toContain("private team access");
    expect(readme).toContain("One dispatch path");
    expect(readme).not.toMatch(/does not implement outbound tools yet|Those land per ticket/i);
    expect(readme).not.toMatch(/dm_sk_\\\*|API key|backstage credential/i);
  });
});

describe("dearme-openclaw outbound tool contract", () => {
  it("registers the outbound tools the manifest declares", () => {
    expect(DEARME_OUTBOUND_TOOLS).toEqual([
      "post_x",
      "send_linkedin_dm",
      "send_telegram_message",
      "send_imessage",
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
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_telegram_message.voiceGateRequired).toBe(true);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_imessage.voiceGateRequired).toBe(true);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_email.voiceGateRequired).toBe(true);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.deploy_site.voiceGateRequired).toBe(false);
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.create_meta_campaign.voiceGateRequired).toBe(false);
  });

  it("each tool's gate matches its semantic intent", () => {
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.post_x.gate).toBe("publish");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_linkedin_dm.gate).toBe("send");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_telegram_message.gate).toBe("send");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_imessage.gate).toBe("send");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.send_email.gate).toBe("send");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.deploy_site.gate).toBe("deploy");
    expect(DEARME_OUTBOUND_TOOL_BINDINGS.create_meta_campaign.gate).toBe("spend");
  });

  it("projects every outbound tool into one DearMe employee handoff primitive", () => {
    expect(DEARME_EMPLOYEE_HANDOFF_PRIMITIVES.map((primitive) => primitive.toolName)).toEqual(
      DEARME_OUTBOUND_TOOLS,
    );

    for (const primitive of DEARME_EMPLOYEE_HANDOFF_PRIMITIVES) {
      const binding = DEARME_OUTBOUND_TOOL_BINDINGS[primitive.toolName];
      expect(primitive.gate).toBe(binding.gate);
      expect(primitive.channel).toBe(binding.channel);
      expect(primitive.voiceGateRequired).toBe(binding.voiceGateRequired);
      expect(primitive.actionLabel).not.toMatch(/openclaw|paperclip|provider|runtime|tool|adapter/i);
      expect(primitive.employeeLabel).not.toMatch(/openclaw|paperclip|provider|runtime|tool|adapter/i);
      expect(primitive.externalActionStatusLabel).toBe("External action not run");
    }
  });

  it("rejects unknown tools at the employee handoff primitive boundary", () => {
    expect(dearMeEmployeeHandoffPrimitiveForTool("post_x")?.id).toBe("publish_social_post");
    expect(dearMeEmployeeHandoffPrimitiveForTool("unknown_tool")).toBeNull();
    expect(dearMeEmployeeHandoffPrimitiveForTool(null)).toBeNull();
  });
});
