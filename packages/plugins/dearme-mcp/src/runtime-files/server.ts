/**
 * DearMe runtime-files MCP server.
 *
 * Provenance: ported from `clawdbob/src/mcp/runtime-files/server.ts`. The
 * tool descriptors mirror the canonical Anthropic Claude Code surface
 * (Bash/Read/Edit/Write/Glob/Grep/TodoWrite/NotebookEdit). Implementation
 * stays in safe-mode: each tool has a small inline dispatcher that mirrors
 * the upstream surface closely enough to be useful while remaining
 * self-contained. Full upstream tool bodies are not re-vendored.
 *
 * Why DearMe needs this: when DearMe runs on the user's device through
 * OpenClaw, roles like Brand Site Builder must touch local files. Without a
 * runtime-files MCP server, the role can only call HTTPS dispatchers. With
 * this server, the role can edit local site source, run dev/build, and
 * inspect output through the MCP allow-list (`mcp__dearme_runtime_files__*`).
 *
 * The Bash dispatcher refuses any command matching
 * `DEARME_RUNTIME_DENY_BASH_PATTERNS` (see `denyPatterns.ts`), which
 * mirrors the dearme-openclaw lockdown layer. This keeps the AI-proxy moat
 * intact even when an agent uses the MCP tool surface directly.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { findBashDenyMatch } from "./denyPatterns.js";

interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const RUNTIME_FILES_TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "Bash",
    description:
      "Run a shell command in a persistent shell session. Supports timeout, run_in_background, and a short description for UI display.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The bash command to run." },
        description: { type: "string", description: "5-10 word description." },
        timeout: { type: "number", description: "Timeout in ms (<=600000)." },
        run_in_background: { type: "boolean" },
      },
      required: ["command"],
    },
  },
  {
    name: "Read",
    description:
      "Read a file from the local filesystem with optional line offset/limit.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute file path." },
        offset: { type: "number", description: "1-based start line." },
        limit: { type: "number", description: "Max lines to read." },
      },
      required: ["file_path"],
    },
  },
  {
    name: "Edit",
    description:
      "Perform an exact string replacement in a file. Supports replace_all.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        old_string: { type: "string" },
        new_string: { type: "string" },
        replace_all: { type: "boolean" },
      },
      required: ["file_path", "old_string", "new_string"],
    },
  },
  {
    name: "Write",
    description:
      "Write a file to the local filesystem (creates or overwrites).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        content: { type: "string" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "Glob",
    description: "Fast file pattern matching, sorted by mtime.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string" },
        path: { type: "string", description: "Optional search root." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "Grep",
    description:
      "Regex search built on ripgrep. Supports glob/type filters, multiline, context lines.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string" },
        path: { type: "string" },
        glob: { type: "string" },
        type: { type: "string" },
        output_mode: {
          type: "string",
          enum: ["content", "files_with_matches", "count"],
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "TodoWrite",
    description:
      "Create / update the structured todo list for the current session.",
    inputSchema: {
      type: "object",
      properties: {
        todos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              content: { type: "string" },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
              },
            },
            required: ["id", "content", "status"],
          },
        },
        merge: { type: "boolean" },
      },
      required: ["todos"],
    },
  },
  {
    name: "NotebookEdit",
    description: "Edit a Jupyter notebook cell (replace/insert/delete).",
    inputSchema: {
      type: "object",
      properties: {
        target_notebook: { type: "string" },
        cell_idx: { type: "number" },
        is_new_cell: { type: "boolean" },
        cell_language: { type: "string" },
        old_string: { type: "string" },
        new_string: { type: "string" },
      },
      required: [
        "target_notebook",
        "cell_idx",
        "is_new_cell",
        "cell_language",
        "new_string",
      ],
    },
  },
];

type CallResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(text: string): CallResult {
  return { content: [{ type: "text", text }] };
}

function fail(text: string): CallResult {
  return { content: [{ type: "text", text }], isError: true };
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

async function dispatchBash(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const command = asString(args.command);
  if (!command) return fail("Bash: `command` is required.");
  const denied = findBashDenyMatch(command);
  if (denied) {
    return fail(
      `Bash refused: command matched DearMe lockdown deny pattern ${denied}. ` +
        "See packages/plugins/dearme-openclaw/src/lockdown/settings-template.ts DEARME_DENY_BASH_PATTERNS.",
    );
  }
  const timeout = asNumber(args.timeout) ?? 120_000;
  return await new Promise<CallResult>((resolve) => {
    const child = spawn("bash", ["-c", command], {
      env: process.env,
      cwd: process.cwd(),
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeout);
    child.stdout.on("data", (b: Buffer) => {
      stdout += b.toString("utf8");
    });
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString("utf8");
    });
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      const text = `exit=${code ?? "null"}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;
      resolve(code === 0 ? ok(text) : fail(text));
    });
    child.on("error", (e: Error) => {
      clearTimeout(timer);
      resolve(fail(`Bash spawn error: ${e.message}`));
    });
  });
}

async function dispatchRead(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const filePath = asString(args.file_path);
  if (!filePath) return fail("Read: `file_path` is required.");
  if (!path.isAbsolute(filePath))
    return fail("Read: `file_path` must be absolute.");
  const offset = asNumber(args.offset);
  const limit = asNumber(args.limit);
  try {
    const buf = await fs.readFile(filePath, "utf8");
    const lines = buf.split("\n");
    const start = offset && offset > 0 ? offset - 1 : 0;
    const end = limit ? Math.min(lines.length, start + limit) : lines.length;
    const slice = lines.slice(start, end);
    const numbered = slice
      .map((l, i) => `${(start + i + 1).toString().padStart(6)}|${l}`)
      .join("\n");
    return ok(numbered);
  } catch (e) {
    return fail(`Read error: ${(e as Error).message}`);
  }
}

async function dispatchEdit(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const filePath = asString(args.file_path);
  const oldString = asString(args.old_string);
  const newString = asString(args.new_string);
  if (!filePath || oldString === undefined || newString === undefined)
    return fail("Edit: file_path / old_string / new_string are required.");
  const replaceAll = asBool(args.replace_all) ?? false;
  try {
    const buf = await fs.readFile(filePath, "utf8");
    let next: string;
    if (replaceAll) {
      next = buf.split(oldString).join(newString);
    } else {
      const idx = buf.indexOf(oldString);
      if (idx === -1) return fail(`Edit: old_string not found in ${filePath}`);
      const idx2 = buf.indexOf(oldString, idx + oldString.length);
      if (idx2 !== -1)
        return fail(
          `Edit: old_string is not unique in ${filePath} — pass replace_all=true or include more context.`,
        );
      next = buf.slice(0, idx) + newString + buf.slice(idx + oldString.length);
    }
    await fs.writeFile(filePath, next, "utf8");
    return ok(`Edited ${filePath}`);
  } catch (e) {
    return fail(`Edit error: ${(e as Error).message}`);
  }
}

async function dispatchWrite(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const filePath = asString(args.file_path);
  const content = asString(args.content);
  if (!filePath || content === undefined)
    return fail("Write: file_path and content are required.");
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
    return ok(`Wrote ${filePath} (${content.length} bytes)`);
  } catch (e) {
    return fail(`Write error: ${(e as Error).message}`);
  }
}

async function dispatchGlob(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const pattern = asString(args.pattern);
  if (!pattern) return fail("Glob: `pattern` is required.");
  const root = asString(args.path) ?? process.cwd();
  return await new Promise<CallResult>((resolve) => {
    const child = spawn(
      "rg",
      ["--files", "--glob", pattern, "--sortr", "modified"],
      {
        cwd: root,
        env: process.env,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => {
      stdout += b.toString("utf8");
    });
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString("utf8");
    });
    child.on("close", (code: number | null) => {
      if (code === 0 || code === 1)
        resolve(ok(stdout.trim() || "(no matches)"));
      else resolve(fail(`Glob error (rg exit=${code}): ${stderr}`));
    });
    child.on("error", (e: Error) =>
      resolve(fail(`Glob spawn error: ${e.message}`)),
    );
  });
}

async function dispatchGrep(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const pattern = asString(args.pattern);
  if (!pattern) return fail("Grep: `pattern` is required.");
  const argv: string[] = [];
  const outputMode = asString(args.output_mode) ?? "files_with_matches";
  if (outputMode === "files_with_matches") argv.push("--files-with-matches");
  else if (outputMode === "count") argv.push("--count");
  const glob = asString(args.glob);
  if (glob) argv.push("--glob", glob);
  const type = asString(args.type);
  if (type) argv.push("--type", type);
  argv.push("-e", pattern);
  const where = asString(args.path) ?? process.cwd();
  argv.push("--", where);
  return await new Promise<CallResult>((resolve) => {
    const child = spawn("rg", argv, { env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => {
      stdout += b.toString("utf8");
    });
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString("utf8");
    });
    child.on("close", (code: number | null) => {
      if (code === 0 || code === 1)
        resolve(ok(stdout.trim() || "(no matches)"));
      else resolve(fail(`Grep error (rg exit=${code}): ${stderr}`));
    });
    child.on("error", (e: Error) =>
      resolve(fail(`Grep spawn error: ${e.message}`)),
    );
  });
}

let TODO_LIST: Array<Record<string, unknown>> = [];

async function dispatchTodoWrite(
  args: Record<string, unknown>,
): Promise<CallResult> {
  const todos = args.todos;
  if (!Array.isArray(todos)) return fail("TodoWrite: `todos` array required.");
  const merge = asBool(args.merge) ?? false;
  if (merge) {
    const byId = new Map<string, Record<string, unknown>>();
    for (const t of TODO_LIST) byId.set(String(t.id), t);
    for (const t of todos as Array<Record<string, unknown>>)
      byId.set(String(t.id), { ...byId.get(String(t.id)), ...t });
    TODO_LIST = Array.from(byId.values());
  } else {
    TODO_LIST = todos as Array<Record<string, unknown>>;
  }
  return ok(
    JSON.stringify({ count: TODO_LIST.length, todos: TODO_LIST }, null, 2),
  );
}

async function dispatch(
  name: string,
  args: Record<string, unknown>,
): Promise<CallResult> {
  switch (name) {
    case "Bash":
      return dispatchBash(args);
    case "Read":
      return dispatchRead(args);
    case "Edit":
      return dispatchEdit(args);
    case "Write":
      return dispatchWrite(args);
    case "Glob":
      return dispatchGlob(args);
    case "Grep":
      return dispatchGrep(args);
    case "TodoWrite":
      return dispatchTodoWrite(args);
    default:
      return fail(`Unknown tool: ${name}`);
  }
}

export function createRuntimeFilesServer(): Server {
  const server = new Server(
    { name: "dearme-runtime-files", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: RUNTIME_FILES_TOOL_DESCRIPTORS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return dispatch(name, args ?? {});
  });

  return server;
}

export const RUNTIME_FILES_TOOLS = RUNTIME_FILES_TOOL_DESCRIPTORS.map(
  (t) => t.name,
);

export { dispatch as __testDispatch };
