import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readFileSync as _ } from "node:fs"; // silence unused-import variant
import {
  DEARME_MCP_CATALOG,
  DEARME_RUNTIME_DENY_BASH_PATTERNS,
  RUNTIME_FILES_TOOL_DESCRIPTORS,
  VOICE_TOOL_DESCRIPTORS,
  WEB_SEARCH_TOOL_DESCRIPTORS,
  catalogEntryByKey,
  createRuntimeFilesServer,
  createVoiceServer,
  createWebSearchServer,
  findBashDenyMatch,
  mcpAllowPatterns,
} from "./index.js";
import { __testDispatch } from "./runtime-files/server.js";
import { __testHelpers } from "./voice/server.js";
import { __testHelpers as webSearchTestHelpers } from "./web-search/server.js";
import { DEARME_DENY_BASH_PATTERNS } from "../../dearme-openclaw/src/lockdown/settings-template.js";

// silence un-used util import for the linter
void _;

describe("DearMe MCP catalog", () => {
  it("exposes the P0 voice + runtime-files servers", () => {
    expect(catalogEntryByKey("dearme_voice")?.priority).toBe("P0");
    expect(catalogEntryByKey("dearme_runtime_files")?.priority).toBe("P0");
  });

  it("catalog keys are unique", () => {
    const keys = DEARME_MCP_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("mcpAllowPatterns produces a `mcp__<key>__*` pattern per entry", () => {
    const patterns = mcpAllowPatterns();
    expect(patterns.length).toBe(DEARME_MCP_CATALOG.length);
    expect(patterns).toContain("mcp__dearme_voice__*");
    expect(patterns).toContain("mcp__dearme_runtime_files__*");
  });
});

describe("DearMe runtime-files deny patterns", () => {
  it("mirrors the openclaw lockdown deny list (same patterns, both lists)", () => {
    const a = new Set(DEARME_RUNTIME_DENY_BASH_PATTERNS);
    const b = new Set(DEARME_DENY_BASH_PATTERNS);
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("denies direct LLM provider HTTP calls", () => {
    expect(findBashDenyMatch("curl -X POST https://api.openai.com/v1/...")).toBeTruthy();
    expect(findBashDenyMatch("curl https://api.anthropic.com/v1/messages")).toBeTruthy();
    expect(
      findBashDenyMatch(
        "curl https://bedrock-runtime.us-east-1.amazonaws.com/model/invoke",
      ),
    ).toBeTruthy();
    expect(
      findBashDenyMatch(
        "wget https://bedrock-runtime.eu-west-1.amazonaws.com/foo",
      ),
    ).toBeTruthy();
  });

  it("denies destructive shell + publish operations", () => {
    expect(findBashDenyMatch("rm -rf /")).toBeTruthy();
    expect(findBashDenyMatch("sudo apt install foo")).toBeTruthy();
    expect(findBashDenyMatch("git push origin main")).toBeTruthy();
    expect(findBashDenyMatch("npm publish --access public")).toBeTruthy();
  });

  it("allows benign reads + safe network", () => {
    expect(findBashDenyMatch("ls -la")).toBeNull();
    expect(findBashDenyMatch("pnpm install")).toBeNull();
    expect(findBashDenyMatch("curl https://api.dearme.app/v1/voice/score")).toBeNull();
  });
});

describe("DearMe runtime-files MCP — tool dispatch (safe-mode)", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "dearme-mcp-rt-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("Read returns numbered lines for an absolute path", async () => {
    const filePath = join(workspace, "x.txt");
    writeFileSync(filePath, "alpha\nbeta\ngamma\n");
    const result = await __testDispatch("Read", { file_path: filePath });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("|alpha");
    expect(result.content[0].text).toContain("|beta");
  });

  it("Read refuses a relative path", async () => {
    const result = await __testDispatch("Read", { file_path: "relative.txt" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("must be absolute");
  });

  it("Write + Edit round-trip works", async () => {
    const filePath = join(workspace, "y.txt");
    const w = await __testDispatch("Write", {
      file_path: filePath,
      content: "hello world",
    });
    expect(w.isError).toBeUndefined();
    expect(readFileSync(filePath, "utf8")).toBe("hello world");

    const e = await __testDispatch("Edit", {
      file_path: filePath,
      old_string: "world",
      new_string: "DearMe",
    });
    expect(e.isError).toBeUndefined();
    expect(readFileSync(filePath, "utf8")).toBe("hello DearMe");
  });

  it("Edit fails when old_string is missing", async () => {
    const filePath = join(workspace, "z.txt");
    writeFileSync(filePath, "abc");
    const r = await __testDispatch("Edit", {
      file_path: filePath,
      old_string: "not-there",
      new_string: "x",
    });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("not found");
  });

  it("Bash refuses a denied command", async () => {
    const result = await __testDispatch("Bash", {
      command: "curl https://api.openai.com/v1/chat/completions",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("DearMe lockdown deny pattern");
  });

  it("Bash runs a benign command", async () => {
    const result = await __testDispatch("Bash", {
      command: "echo dearme-mcp-test",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("dearme-mcp-test");
  });

  it("TodoWrite stores then merges todos", async () => {
    const r1 = await __testDispatch("TodoWrite", {
      todos: [{ id: "a", content: "first", status: "pending" }],
    });
    expect(r1.isError).toBeUndefined();
    const r2 = await __testDispatch("TodoWrite", {
      merge: true,
      todos: [{ id: "a", status: "completed", content: "first" }],
    });
    const parsed = JSON.parse(r2.content[0].text);
    expect(parsed.count).toBe(1);
    expect(parsed.todos[0].status).toBe("completed");
  });
});

describe("DearMe runtime-files MCP — server factory", () => {
  it("createRuntimeFilesServer returns a Server-like object", () => {
    const server = createRuntimeFilesServer();
    expect(server).toBeDefined();
    expect(typeof (server as { setRequestHandler: unknown }).setRequestHandler).toBe(
      "function",
    );
  });

  it("descriptors include all 8 lifted tool names", () => {
    const names = RUNTIME_FILES_TOOL_DESCRIPTORS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Bash",
        "Read",
        "Edit",
        "Write",
        "Glob",
        "Grep",
        "TodoWrite",
        "NotebookEdit",
      ]),
    );
  });
});

describe("DearMe voice MCP", () => {
  it("descriptors expose voice.score and voice.profile.get", () => {
    const names = VOICE_TOOL_DESCRIPTORS.map((t) => t.name);
    expect(names).toEqual(["voice.score", "voice.profile.get"]);
  });

  it("voice.score fails closed when no API key is configured", async () => {
    const config = __testHelpers.resolveConfig({
      apiKey: "",
      proxyUrl: "https://api.dearme.app",
      userHandle: "peter-studio",
      fetchImpl: async () => new Response("{}"),
    });
    const result = await __testHelpers.dispatchVoiceScore({ draft: "hello" }, config);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not configured");
  });

  it("voice.score sends to /v1/voice/score with bearer auth", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url: String(url), init: init ?? {} };
      return new Response(
        JSON.stringify({ score: 94, status: "accept", reasons: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const config = __testHelpers.resolveConfig({
      apiKey: "dm_sk_test",
      proxyUrl: "https://api.dearme.app",
      userHandle: "peter-studio",
      fetchImpl: fakeFetch,
    });
    const result = await __testHelpers.dispatchVoiceScore(
      { draft: "Shipping DearMe today.", channel: "x_post" },
      config,
    );
    expect(result.isError).toBeUndefined();
    expect(captured?.url).toBe("https://api.dearme.app/v1/voice/score");
    expect(
      (captured!.init.headers as Record<string, string>).authorization,
    ).toBe("Bearer dm_sk_test");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.score).toBe(94);
  });

  it("createVoiceServer returns a Server-like object", () => {
    const server = createVoiceServer({ apiKey: "dm_sk_test" });
    expect(typeof (server as { setRequestHandler: unknown }).setRequestHandler).toBe(
      "function",
    );
  });
});

describe("DearMe web-search MCP", () => {
  it("descriptors expose web_search and web_fetch", () => {
    const names = WEB_SEARCH_TOOL_DESCRIPTORS.map((t) => t.name);
    expect(names).toEqual(["web_search", "web_fetch"]);
  });

  it("web_search fails closed when no API key is configured", async () => {
    const config = webSearchTestHelpers.resolveConfig({
      apiKey: "",
      proxyUrl: "https://api.dearme.app",
      fetchImpl: async () => new Response("{}"),
    });
    const result = await webSearchTestHelpers.dispatchWebSearch(
      { query: "DearMe research" },
      config,
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not configured");
  });

  it("web_search sends to /v1/research/search with bearer auth", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url: String(url), init: init ?? {} };
      return new Response(
        JSON.stringify({ results: [{ title: "DearMe", url: "https://example.com" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const config = webSearchTestHelpers.resolveConfig({
      apiKey: "dm_sk_test",
      proxyUrl: "https://api.dearme.app",
      fetchImpl: fakeFetch,
    });
    const result = await webSearchTestHelpers.dispatchWebSearch(
      {
        query: "DearMe personal brand team",
        depth: "standard",
        limit: 3,
        includeDomains: ["example.com"],
        excludeDomains: ["spam.example"],
        recencyDays: 14,
      },
      config,
    );
    expect(result.isError).toBeUndefined();
    expect(captured?.url).toBe("https://api.dearme.app/v1/research/search");
    expect(
      (captured!.init.headers as Record<string, string>).authorization,
    ).toBe("Bearer dm_sk_test");
    expect(
      (captured!.init.headers as Record<string, string>)["content-type"],
    ).toBe("application/json");
    expect(JSON.parse(String(captured!.init.body))).toEqual({
      query: "DearMe personal brand team",
      depth: "standard",
      limit: 3,
      includeDomains: ["example.com"],
      excludeDomains: ["spam.example"],
      recencyDays: 14,
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.results[0].title).toBe("DearMe");
  });

  it("web_fetch sends to /v1/research/fetch with bearer auth", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url: String(url), init: init ?? {} };
      return new Response(
        JSON.stringify({ url: "https://example.com/post", text: "Fetched page" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const config = webSearchTestHelpers.resolveConfig({
      apiKey: "dm_sk_test",
      proxyUrl: "https://api.dearme.app",
      fetchImpl: fakeFetch,
    });
    const result = await webSearchTestHelpers.dispatchWebFetch(
      {
        url: "https://example.com/post",
        prompt: "Extract the launch proof.",
      },
      config,
    );
    expect(result.isError).toBeUndefined();
    expect(captured?.url).toBe("https://api.dearme.app/v1/research/fetch");
    expect(
      (captured!.init.headers as Record<string, string>).authorization,
    ).toBe("Bearer dm_sk_test");
    expect(JSON.parse(String(captured!.init.body))).toEqual({
      url: "https://example.com/post",
      prompt: "Extract the launch proof.",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.text).toBe("Fetched page");
  });

  it("createWebSearchServer returns a Server-like object", () => {
    const server = createWebSearchServer({ apiKey: "dm_sk_test" });
    expect(typeof (server as { setRequestHandler: unknown }).setRequestHandler).toBe(
      "function",
    );
  });
});
