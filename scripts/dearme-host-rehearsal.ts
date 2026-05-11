import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  exportDearMePrivateSitePreview,
  runDearMeAhaProof,
} from "./dearme-aha-proof.ts";
import {
  runDearMeProviderSmoke,
  type DearMeProviderSmokeResult,
} from "./dearme-provider-smoke.ts";

type Env = Record<string, string | undefined>;

export interface DearMeHostRehearsalArgs {
  help: boolean;
  json: boolean;
  skipExport: boolean;
  exportSiteDir: string;
  host: string;
  port: number;
}

export interface DearMeStaticHost {
  rootDir: string;
  baseUrl: string;
  port: number;
  server: Server;
  close(): Promise<void>;
}

export interface DearMeHostRehearsalOptions {
  exportSiteDir?: string;
  host?: string;
  port?: number;
  skipExport?: boolean;
  env?: Env;
  now?: () => Date;
}

export interface DearMeHostRehearsalReport {
  exportSiteDir: string;
  baseUrl: string;
  handle: string;
  htmlPath: string;
  hostSmokePath: string;
  results: DearMeProviderSmokeResult[];
}

const DEFAULT_EXPORT_SITE_DIR = "dist/dearme-private-proof";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_HANDLE = "peter-studio";

function parsePort(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error(`invalid port: ${value}`);
  }
  return parsed;
}

export function parseDearMeHostRehearsalArgs(argv: readonly string[]): DearMeHostRehearsalArgs {
  const args: DearMeHostRehearsalArgs = {
    help: false,
    json: false,
    skipExport: false,
    exportSiteDir: DEFAULT_EXPORT_SITE_DIR,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
  };

  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--skip-export" || arg === "--no-export") {
      args.skipExport = true;
    } else if (arg === "--export-site") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--export-site requires a directory");
      args.exportSiteDir = next;
      index += 1;
    } else if (arg.startsWith("--export-site=")) {
      const value = arg.slice("--export-site=".length);
      if (!value) throw new Error("--export-site requires a directory");
      args.exportSiteDir = value;
    } else if (arg === "--host") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--host requires a value");
      args.host = next;
      index += 1;
    } else if (arg.startsWith("--host=")) {
      const value = arg.slice("--host=".length);
      if (!value) throw new Error("--host requires a value");
      args.host = value;
    } else if (arg === "--port") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--port requires a value");
      args.port = parsePort(next);
      index += 1;
    } else if (arg.startsWith("--port=")) {
      args.port = parsePort(arg.slice("--port=".length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function contentType(filePath: string) {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function requestPathToFile(rootDir: string, requestUrl: string | undefined) {
  let pathname: string;
  try {
    pathname = new URL(requestUrl ?? "/", "http://dearme.local").pathname;
  } catch {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;

  const relativePath = decoded.replace(/^\/+/, "") || "index.html";
  const filePath = resolve(rootDir, relativePath);
  const fromRoot = relative(rootDir, filePath);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) return null;
  return filePath;
}

async function handleStaticRequest(
  rootDir: string,
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end();
    return;
  }

  const filePath = requestPathToFile(rootDir, request.url);
  if (!filePath) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("not found");
      return;
    }

    response.writeHead(200, {
      "content-length": String(fileStat.size),
      "content-type": contentType(filePath),
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath)
      .on("error", () => response.destroy())
      .pipe(response);
  } catch (error) {
    const code = error && typeof error === "object"
      ? (error as { code?: unknown }).code
      : null;
    response.writeHead(code === "ENOENT" ? 404 : 500);
    response.end(code === "ENOENT" ? "not found" : "server error");
  }
}

function hostForUrl(host: string) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function listen(server: Server, host: string, port: number) {
  return new Promise<number>((resolveListen, rejectListen) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      rejectListen(error);
    };
    const onListening = () => {
      server.off("error", onError);
      const address = server.address();
      resolveListen(typeof address === "object" && address ? address.port : port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function isAddressInUse(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "EADDRINUSE");
}

async function closeServer(server: Server) {
  if (!server.listening) return;
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}

export async function startDearMeStaticHost(options: {
  rootDir: string;
  host?: string;
  port?: number;
}): Promise<DearMeStaticHost> {
  const rootDir = resolve(options.rootDir);
  const host = options.host ?? DEFAULT_HOST;
  const preferredPort = options.port ?? DEFAULT_PORT;

  let server = createServer((request, response) => {
    void handleStaticRequest(rootDir, request, response);
  });
  let port: number;
  try {
    port = await listen(server, host, preferredPort);
  } catch (error) {
    if (preferredPort === 0 || !isAddressInUse(error)) {
      throw error;
    }
    server = createServer((request, response) => {
      void handleStaticRequest(rootDir, request, response);
    });
    port = await listen(server, host, 0);
  }

  return {
    rootDir,
    baseUrl: `http://${hostForUrl(host)}:${port}`,
    port,
    server,
    close: () => closeServer(server),
  };
}

export async function runDearMeHostRehearsal(
  options: DearMeHostRehearsalOptions = {},
): Promise<DearMeHostRehearsalReport> {
  const exportSiteDir = options.exportSiteDir ?? DEFAULT_EXPORT_SITE_DIR;
  const exportResult = options.skipExport
    ? null
    : await exportDearMePrivateSitePreview(runDearMeAhaProof().preview, exportSiteDir);
  const handle = exportResult?.handle ?? DEFAULT_HANDLE;
  const htmlPath = exportResult?.htmlPath ?? join(exportSiteDir, handle, "index.html");
  const hostSmokePath = exportResult?.hostSmokePath ?? join(exportSiteDir, handle, "host-smoke.json");
  const staticHost = await startDearMeStaticHost({
    rootDir: exportSiteDir,
    host: options.host ?? DEFAULT_HOST,
    port: options.port ?? DEFAULT_PORT,
  });

  try {
    const env = {
      ...process.env,
      ...options.env,
      DEARME_DEPLOY_SITE_BASE_URL: staticHost.baseUrl,
      DEARME_DEPLOY_SITE_SMOKE_HANDLE: handle,
      DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: htmlPath,
      DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF: hostSmokePath,
    };
    const results = await runDearMeProviderSmoke({
      target: "deploy_site_host_rehearsal",
      env,
      now: options.now,
    });
    return {
      exportSiteDir,
      baseUrl: staticHost.baseUrl,
      handle,
      htmlPath,
      hostSmokePath,
      results,
    };
  } finally {
    await staticHost.close();
  }
}

export function formatDearMeHostRehearsalReport(report: DearMeHostRehearsalReport) {
  const delivered = report.results.every((result) => result.status === "delivered");
  const lines = [
    "DearMe host rehearsal",
    `Status: ${delivered ? "ready" : "blocked"}`,
    `Export: ${report.exportSiteDir}`,
    `Loopback host: ${report.baseUrl}`,
    `Artifact: ${report.htmlPath}`,
    `Host smoke: ${report.hostSmokePath}`,
    "",
    "Results:",
  ];

  for (const result of report.results) {
    if (result.status === "delivered") {
      lines.push(
        `- ${result.target}: delivered ${result.externalUrl ?? ""} status=${result.hostStatus ?? "n/a"}`,
      );
    } else if (result.status === "blocked") {
      lines.push(`- ${result.target}: blocked ${result.reason}: ${result.missing.join(", ")}`);
    } else {
      lines.push(`- ${result.target}: errored ${result.reason}`);
    }
  }
  return lines;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:host-rehearsal -- [--json] [--export-site <dir>] [--skip-export] [--host 127.0.0.1] [--port 8787]

Exports the private first-wow site packet, serves it on a loopback static host,
then runs the opt-in deploy_site_host_rehearsal provider smoke against the real
local HTTP response. This is local host integrity proof only; production phone
proof still requires public HTTPS through deploy_site_production.`);
}

async function main() {
  try {
    const parsed = parseDearMeHostRehearsalArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const report = await runDearMeHostRehearsal({
      exportSiteDir: parsed.exportSiteDir,
      host: parsed.host,
      port: parsed.port,
      skipExport: parsed.skipExport,
    });

    if (parsed.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      for (const line of formatDearMeHostRehearsalReport(report)) {
        console.log(line);
      }
    }

    if (!report.results.every((result) => result.status === "delivered")) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entrypoint) {
  void main();
}
