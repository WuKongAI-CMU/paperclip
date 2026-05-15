import { describe, expect, it, vi, beforeEach } from "vitest";

const mockTransport = vi.hoisted(() => vi.fn(() => ({ write: vi.fn() })));
const mockPino = vi.hoisted(() => {
  const fn = vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(),
  }));
  (fn as any).transport = mockTransport;
  return fn;
});
const mockPinoHttp = vi.hoisted(() => vi.fn(() => vi.fn()));

// Mock fs so the module-level mkdirSync call is a no-op in tests.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, mkdirSync: vi.fn() };
});

vi.mock("pino", () => ({
  default: mockPino,
}));
vi.mock("pino-http", () => ({
  pinoHttp: mockPinoHttp,
}));
vi.mock("../config-file.js", () => ({
  readConfigFile: vi.fn(() => null),
}));
vi.mock("../home-paths.js", () => ({
  resolveHomeAwarePath: vi.fn((p: string) => p),
  resolveDefaultLogsDir: vi.fn(() => "/tmp/paperclip-test-logs"),
}));

describe("structured logger", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses JSON pino/file transports for stdout and server.log", async () => {
    await import("../middleware/logger.js");

    expect(mockPino).toHaveBeenCalledOnce();
    const pinoOptions = mockPino.mock.calls[0][0] as {
      redact: { paths: string[]; censor: string };
    };
    expect(pinoOptions.redact.paths).toEqual(
      expect.arrayContaining(["req.headers.authorization", "headers.cookie"]),
    );
    expect(pinoOptions.redact.censor).toBe("***REDACTED***");

    expect(mockTransport).toHaveBeenCalledOnce();
    const { targets } = mockTransport.mock.calls[0][0] as {
      targets: Array<{ target: string; options: Record<string, unknown> }>;
    };
    expect(targets).toHaveLength(2);
    for (const target of targets) {
      expect(target.target).toBe("pino/file");
      expect(target.target).not.toBe("pino-pretty");
    }
    expect(targets[0]?.options.destination).toBe(1);
    expect(targets[1]?.options.destination).toBe("/tmp/paperclip-test-logs/server.log");
  });

  it("redacts secret tokens, passwords, authorization, and email addresses in log payloads", async () => {
    const { LOG_REDACTION_TOKEN, redactLogValue } = await import("../middleware/logger.js");

    const redacted = redactLogValue({
      authorization: "Bearer dm_sk_live_value",
      nested: {
        password: "correct horse battery staple",
        message: "email jane@example.com key re_123456789 token sk_live_abc whsec_def phc_ghi",
      },
    });

    expect(redacted).toEqual({
      authorization: LOG_REDACTION_TOKEN,
      nested: {
        password: LOG_REDACTION_TOKEN,
        message: `email ${LOG_REDACTION_TOKEN} key ${LOG_REDACTION_TOKEN} token ${LOG_REDACTION_TOKEN} ${LOG_REDACTION_TOKEN} ${LOG_REDACTION_TOKEN}`,
      },
    });
  });

  it("adds a requestId to HTTP log props and honors incoming x-request-id", async () => {
    await import("../middleware/logger.js");

    expect(mockPinoHttp).toHaveBeenCalledOnce();
    const opts = mockPinoHttp.mock.calls[0][0] as {
      genReqId(req: { headers: Record<string, unknown> }): string;
      customProps(req: { id: string }, res: { statusCode: number }): Record<string, unknown>;
    };
    const requestId = opts.genReqId({ headers: { "x-request-id": "req-test-123" } });

    expect(requestId).toBe("req-test-123");
    expect(opts.customProps({ id: requestId }, { statusCode: 200 })).toEqual({ requestId });
  });
});
