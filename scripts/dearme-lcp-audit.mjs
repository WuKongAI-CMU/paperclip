#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const DEFAULT_URL = "http://127.0.0.1:4173/landing";
const DEFAULT_OUTPUT = "dearme-lcp-audit.json";
const DEFAULT_THRESHOLDS = {
  largestContentfulPaintMs: 2500,
  cumulativeLayoutShift: 0.1,
  interactionToNextPaintMs: 200,
};

const METRIC_AUDITS = {
  largestContentfulPaintMs: "largest-contentful-paint",
  cumulativeLayoutShift: "cumulative-layout-shift",
  interactionToNextPaintMs: "interaction-to-next-paint",
};

function parsePositiveNumber(value, fallback, label) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return parsed;
}

export function parseDearMeLcpAuditArgs(argv, env = process.env) {
  const config = {
    url: env.DEARME_LCP_AUDIT_URL ?? DEFAULT_URL,
    outputPath: env.DEARME_LCP_AUDIT_OUTPUT ?? DEFAULT_OUTPUT,
    startPreview: (env.DEARME_LCP_AUDIT_START_PREVIEW ?? "true") !== "false",
    thresholds: {
      largestContentfulPaintMs: parsePositiveNumber(
        env.DEARME_LCP_AUDIT_LCP_MS,
        DEFAULT_THRESHOLDS.largestContentfulPaintMs,
        "DEARME_LCP_AUDIT_LCP_MS",
      ),
      cumulativeLayoutShift: parsePositiveNumber(
        env.DEARME_LCP_AUDIT_CLS,
        DEFAULT_THRESHOLDS.cumulativeLayoutShift,
        "DEARME_LCP_AUDIT_CLS",
      ),
      interactionToNextPaintMs: parsePositiveNumber(
        env.DEARME_LCP_AUDIT_INP_MS,
        DEFAULT_THRESHOLDS.interactionToNextPaintMs,
        "DEARME_LCP_AUDIT_INP_MS",
      ),
    },
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value.`);
      }
      index += 1;
      return value;
    };

    if (arg === "--url") {
      config.url = nextValue();
      config.startPreview = false;
    } else if (arg === "--output") {
      config.outputPath = nextValue();
    } else if (arg === "--no-preview") {
      config.startPreview = false;
    } else if (arg === "--lcp-ms") {
      config.thresholds.largestContentfulPaintMs = parsePositiveNumber(nextValue(), 0, "--lcp-ms");
    } else if (arg === "--cls") {
      config.thresholds.cumulativeLayoutShift = parsePositiveNumber(nextValue(), 0, "--cls");
    } else if (arg === "--inp-ms") {
      config.thresholds.interactionToNextPaintMs = parsePositiveNumber(nextValue(), 0, "--inp-ms");
    } else if (arg === "--help" || arg === "-h") {
      config.help = true;
    } else if (arg === "--") {
      continue;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return config;
}

function readAuditMetric(lhr, auditId) {
  const audit = lhr?.audits?.[auditId];
  if (!audit || audit.notApplicable) return null;
  const value = audit.numericValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function evaluateDearMeLcpAudit(lhr, thresholds = DEFAULT_THRESHOLDS, measuredInteractionToNextPaintMs = null) {
  const metrics = {
    largestContentfulPaintMs: readAuditMetric(lhr, METRIC_AUDITS.largestContentfulPaintMs),
    cumulativeLayoutShift: readAuditMetric(lhr, METRIC_AUDITS.cumulativeLayoutShift),
    interactionToNextPaintMs: measuredInteractionToNextPaintMs ?? readAuditMetric(lhr, METRIC_AUDITS.interactionToNextPaintMs),
  };

  const checks = [
    {
      id: "largest-contentful-paint",
      label: "LCP",
      value: metrics.largestContentfulPaintMs,
      threshold: thresholds.largestContentfulPaintMs,
      unit: "ms",
    },
    {
      id: "cumulative-layout-shift",
      label: "CLS",
      value: metrics.cumulativeLayoutShift,
      threshold: thresholds.cumulativeLayoutShift,
      unit: "",
    },
    {
      id: "interaction-to-next-paint",
      label: "INP",
      value: metrics.interactionToNextPaintMs,
      threshold: thresholds.interactionToNextPaintMs,
      unit: "ms",
    },
  ].map((check) => ({
    ...check,
    passed: check.value !== null && check.value <= check.threshold,
  }));

  return {
    url: lhr?.finalDisplayedUrl ?? lhr?.finalUrl ?? null,
    fetchedAt: new Date().toISOString(),
    metrics,
    thresholds,
    checks,
    passed: checks.every((check) => check.passed),
  };
}

function formatValue(check) {
  if (check.value === null) return "missing";
  const rounded = check.unit === "ms" ? Math.round(check.value) : Number(check.value.toFixed(4));
  return `${rounded}${check.unit}`;
}

export function formatDearMeLcpAuditSummary(report) {
  const status = report.passed ? "PASS" : "FAIL";
  const checks = report.checks
    .map((check) => `${check.label} ${formatValue(check)} <= ${check.threshold}${check.unit}`)
    .join("; ");
  return `${status} DearMe landing performance: ${checks}`;
}

async function waitForUrl(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
}

function ensureUiDistExists() {
  const indexPath = resolve("ui/dist/index.html");
  if (!existsSync(indexPath)) {
    throw new Error("ui/dist is missing. Run `pnpm --filter @paperclipai/ui build` before the LCP audit.");
  }
}

function startVitePreview() {
  ensureUiDistExists();
  const child = spawn("pnpm", ["--dir", "ui", "exec", "vite", "preview", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function runLighthouse(url) {
  const chrome = await launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      onlyCategories: ["performance"],
      formFactor: "desktop",
      screenEmulation: { disabled: true },
      throttlingMethod: "devtools",
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
        cpuSlowdownMultiplier: 1,
      },
      logLevel: "error",
    });
    return result.lhr;
  } finally {
    await chrome.kill();
  }
}

async function launchPlaywrightChromium() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function measureInteractionToNextPaint(url) {
  const browser = await launchPlaywrightChromium();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__dearmeEventDurations = [];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__dearmeEventDurations.push(entry.duration);
          }
        });
        observer.observe({ type: "event", buffered: true, durationThreshold: 0 });
      } catch {
        window.__dearmeEventDurations = null;
      }
    });

    await page.goto(url, { waitUntil: "networkidle" });
    const input = page.getByLabel("What do you want to be known for?");
    const clickStart = Date.now();
    await input.click();
    await input.fill("Building calm product systems");
    await page.waitForTimeout(250);
    const elapsedMs = Date.now() - clickStart;

    const eventDurations = await page.evaluate(() => window.__dearmeEventDurations);
    const measuredDurations = Array.isArray(eventDurations)
      ? eventDurations.filter((value) => typeof value === "number" && Number.isFinite(value))
      : [];
    return measuredDurations.length > 0 ? Math.max(...measuredDurations) : elapsedMs;
  } finally {
    await browser.close();
  }
}

async function main() {
  const config = parseDearMeLcpAuditArgs(process.argv.slice(2));
  if (config.help) {
    console.log("Usage: pnpm dearme:lcp-audit [--url http://127.0.0.1:4173/] [--output dearme-lcp-audit.json] [--no-preview]");
    return;
  }

  let preview;
  try {
    if (config.startPreview) {
      preview = startVitePreview();
      await waitForUrl(config.url);
    }

    const lhr = await runLighthouse(config.url);
    const interactionToNextPaintMs = await measureInteractionToNextPaint(config.url);
    const report = evaluateDearMeLcpAudit(lhr, config.thresholds, interactionToNextPaintMs);
    const outputPath = resolve(config.outputPath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify({ report, lighthouse: lhr }, null, 2)}\n`);

    console.log(formatDearMeLcpAuditSummary(report));
    console.log(`Wrote ${config.outputPath}`);

    if (!report.passed) {
      process.exitCode = 1;
    }
  } finally {
    if (preview && !preview.killed) {
      preview.kill("SIGTERM");
    }
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
