import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  classifyWorktree,
  collectSymphonyHandoffs,
  collectWorktreeStatus,
  deriveWorktreeTicket,
  enrichWorktreeRecord,
  filterSymphonyHandoffs,
  filterWorktreeRecords,
  formatSymphonyHandoffSummaryLine,
  listSymphonyWorkspacePaths,
  loadReviewedAbsorptions,
  markReviewedAbsorption,
  parseArgs,
  parseWorktrees,
  summarizeSymphonyHandoffs,
  summarize,
} from "./dearme-worktree-status.mjs";

function git(repo, args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function commit(repo, message) {
  git(repo, [
    "-c",
    "user.name=DearMe Test",
    "-c",
    "user.email=dearme-test@example.com",
    "commit",
    "-m",
    message,
  ]);
}

test("parseWorktrees reads porcelain worktree records", () => {
  assert.deepEqual(
    parseWorktrees(`worktree /Users/peter/dearme
HEAD 568bc8a2fba5e15e8efa55c6959abe8620f28958
branch refs/heads/codex/dearme-dm-136-sample-demo-proof

worktree /private/tmp/dearme-stale
HEAD 0000000000000000000000000000000000000000
prunable gitdir file points to non-existent location

worktree /private/tmp/dearme-detached
HEAD 1111111111111111111111111111111111111111
detached
`),
    [
      {
        path: "/Users/peter/dearme",
        head: "568bc8a2fba5e15e8efa55c6959abe8620f28958",
        branch: "codex/dearme-dm-136-sample-demo-proof",
      },
      {
        path: "/private/tmp/dearme-stale",
        head: "0000000000000000000000000000000000000000",
        prunable: "gitdir file points to non-existent location",
      },
      {
        path: "/private/tmp/dearme-detached",
        head: "1111111111111111111111111111111111111111",
        detached: true,
      },
    ],
  );
});

test("enrichWorktreeRecord adds ticket, purpose, and coordinator action", () => {
  assert.deepEqual(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-086-integrate",
      branch: "codex/dearme-dm-086-integrated",
      head: "abc",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    }),
    {
      path: "/private/tmp/dearme-dm-086-integrate",
      branch: "codex/dearme-dm-086-integrated",
      head: "abc",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
      ticket: "DM-086",
      purpose: "integration",
      nextAction: "historical integration branch; compare before replay, do not merge blindly",
    },
  );

  assert.equal(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-138-first-run-proof",
      branch: "codex/dearme-dm-138-first-run-proof",
      head: "def",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    }).nextAction,
    "candidate worker result; inspect diff and replay only still-valuable product slices",
  );

  assert.equal(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-101-cycle-guardrail-enforcement",
      branch: "codex/dearme-dm-101-cycle-guardrail-enforcement",
      head: "abc",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
      headSubject: "Reuse paid-beta guardrails before DearMe regeneration cycles",
      headSubjectInCurrent: true,
    }).nextAction,
    "tip subject already exists in current head; inspect residual diff before replay or close",
  );

  assert.equal(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-087-work-event-contract",
      branch: "codex/dearme-dm-087-work-event-contract",
      head: "fed",
      status: "patch_equivalent",
      dirtyFiles: 0,
      prunable: false,
    }).nextAction,
    "patch-equivalent to current head; close only after owner confirmation",
  );

  assert.equal(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-symphony-workspaces/DEA-7/repo",
      branch: "verify-dea-7-current",
      head: "bcd",
      status: "in_current",
      dirtyFiles: 0,
      prunable: false,
    }).nextAction,
    "absorbed Symphony lane; keep as audit trail or close after owner confirmation",
  );

  const reviewed = enrichWorktreeRecord(
    {
      path: "/private/tmp/dearme-dm-099-operating-loop",
      branch: "codex/dearme-dm-099-operating-loop",
      head: "505849149368f7c0d7f397ffe9b5323a8bc9bfee",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    },
    [
      {
        ticket: "DM-099",
        branch: "codex/dearme-dm-099-operating-loop",
        head: "505849149368f7c0d7f397ffe9b5323a8bc9bfee",
        reviewedAt: "2026-05-10",
        reason: "current onboarding already carries this loop",
      },
    ],
  );

  assert.equal(reviewed.status, "reviewed_absorbed");
  assert.equal(reviewed.reviewedAbsorption.ticket, "DM-099");
  assert.equal(
    reviewed.nextAction,
    "reviewed as already absorbed in current head; close only after owner confirmation, do not replay",
  );
});

test("filters support status, ticket, dirty-only, and limits", () => {
  const records = [
    enrichWorktreeRecord({
      path: "/Users/peter/dearme",
      branch: "codex/dearme-dm-136-sample-demo-proof",
      head: "1",
      status: "current",
      dirtyFiles: 12,
      prunable: false,
    }),
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-138-first-run-proof",
      branch: "codex/dearme-dm-138-first-run-proof",
      head: "2",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    }),
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-087-work-event-contract",
      branch: "codex/dearme-dm-087-work-event-contract",
      head: "4",
      status: "patch_equivalent",
      dirtyFiles: 0,
      prunable: false,
    }),
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-138-replay",
      branch: "codex/dearme-dm-138-replay",
      head: "3",
      status: "not_in_current",
      dirtyFiles: 1,
      prunable: false,
    }),
  ];

  const options = parseArgs([
    "--not-in-current",
    "--ticket=DM-138",
    "--dirty-only",
    "--limit=1",
  ]);

  assert.deepEqual(
    filterWorktreeRecords(records, options),
    [records[3]],
  );
});

test("parseArgs tolerates the pnpm argument separator", () => {
  const options = parseArgs(["--", "--not-in-current", "--ticket", "dm138", "--limit", "2"]);

  assert.equal(options.statuses.has("not_in_current"), true);
  assert.equal(options.tickets.has("DM-138"), true);
  assert.equal(options.limit, 2);

  const patchEquivalentOptions = parseArgs(["--status=patch-equivalent"]);
  assert.equal(patchEquivalentOptions.statuses.has("patch_equivalent"), true);

  const reviewedAbsorbedOptions = parseArgs(["--status=reviewed-absorbed"]);
  assert.equal(reviewedAbsorbedOptions.statuses.has("reviewed_absorbed"), true);

  const rootEqualsOptions = parseArgs(["--symphony-root=/tmp/dearme-symphony-equals"]);
  assert.equal(rootEqualsOptions.symphonyRoot, "/tmp/dearme-symphony-equals");

  const handoffOptions = parseArgs([
    "--handoffs",
    "--handoff-root",
    "/tmp/dearme-handoffs",
  ]);
  assert.equal(handoffOptions.includeHandoffs, true);
  assert.equal(handoffOptions.summaryOnly, true);
  assert.equal(handoffOptions.handoffRoot, "/tmp/dearme-handoffs");

  const handoffAliasOptions = parseArgs(["--handoffs"]);
  assert.equal(handoffAliasOptions.includeHandoffs, true);
  assert.equal(handoffAliasOptions.summaryOnly, true);

  const handoffEqualsOptions = parseArgs(["--handoff-root=/tmp/dearme-handoffs-equals"]);
  assert.equal(handoffEqualsOptions.handoffRoot, "/tmp/dearme-handoffs-equals");

  const summaryJsonOptions = parseArgs(["--summary-json", "--handoffs"]);
  assert.equal(summaryJsonOptions.summaryJson, true);
  assert.equal(summaryJsonOptions.summaryOnly, true);
  assert.equal(summaryJsonOptions.includeHandoffs, true);
});

test("parseArgs supports DEA tickets and Symphony workspace options", () => {
  const options = parseArgs([
    "--ticket",
    "DEA-7",
    "--no-symphony",
    "--symphony-root",
    "/tmp/dearme-symphony-test",
  ]);

  assert.equal(options.tickets.has("DEA-7"), true);
  assert.equal(options.includeSymphony, false);
  assert.equal(options.symphonyRoot, "/tmp/dearme-symphony-test");

  assert.throws(
    () => parseArgs(["--symphony-root"]),
    /--symphony-root requires a value/,
  );
});

test("summarize keeps legacy counts and adds purpose/ticket buckets", () => {
  const records = [
    enrichWorktreeRecord({
      path: "/Users/peter/dearme",
      branch: "codex/dearme-dm-136-sample-demo-proof",
      head: "1",
      status: "current",
      dirtyFiles: 2,
      prunable: false,
    }),
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-086-integrate",
      branch: "codex/dearme-dm-086-integrated",
      head: "2",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
      headSubjectInCurrent: true,
    }),
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-dm-087-work-event-contract",
      branch: "codex/dearme-dm-087-work-event-contract",
      head: "3",
      status: "patch_equivalent",
      dirtyFiles: 0,
      prunable: false,
    }),
    enrichWorktreeRecord(
      {
        path: "/private/tmp/dearme-dm-099-operating-loop",
        branch: "codex/dearme-dm-099-operating-loop",
        head: "5",
        status: "not_in_current",
        dirtyFiles: 0,
        prunable: false,
      },
      [
        {
          ticket: "DM-099",
          branch: "codex/dearme-dm-099-operating-loop",
          head: "5",
        },
      ],
    ),
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-symphony-workspaces/DEA-7-publish-qbFNq4/repo",
      branch: "verify-dea-7-current",
      head: "4",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    }),
  ];

  assert.deepEqual(summarize(records), {
    total: 5,
    dirty: 1,
    current: 1,
    not_in_current: 2,
    patch_equivalent: 1,
    reviewed_absorbed: 1,
    subject_matched: 1,
    byPurpose: {
      current: 1,
      integration: 1,
      symphony: 1,
      worker: 2,
    },
    byTicket: {
      "DM-136": 1,
      "DM-086": 1,
      "DM-087": 1,
      "DM-099": 1,
      "DEA-7": 1,
    },
  });
});

test("markReviewedAbsorption only matches exact reviewed branch heads", () => {
  const reviewLedger = [
    {
      ticket: "DM-100",
      branch: "codex/dearme-dm-100-cycle-guardrails",
      head: "efafc054653b4519430cab3ff82e77c64e76738d",
      reason: "guardrail already absorbed",
    },
  ];

  const reviewed = markReviewedAbsorption(
    {
      path: "/private/tmp/dearme-dm-100-cycle-guardrails",
      branch: "codex/dearme-dm-100-cycle-guardrails",
      head: "efafc054653b4519430cab3ff82e77c64e76738d",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    },
    reviewLedger,
  );

  assert.equal(reviewed.status, "reviewed_absorbed");
  assert.equal(reviewed.reviewedAbsorption.reason, "guardrail already absorbed");

  const advancedBranch = markReviewedAbsorption(
    {
      path: "/private/tmp/dearme-dm-100-cycle-guardrails",
      branch: "codex/dearme-dm-100-cycle-guardrails",
      head: "ffffffffffffffffffffffffffffffffffffffff",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    },
    reviewLedger,
  );

  assert.equal(advancedBranch.status, "not_in_current");
});

test("loadReviewedAbsorptions reads the repo absorption ledger", () => {
  const repo = mkdtempSync(join(tmpdir(), "dearme-reviewed-absorptions-"));
  const ledgerDir = join(repo, "docs", "dearme");
  const ledgerPath = join(ledgerDir, "WORKTREE-ABSORPTION-LEDGER.json");
  const absorption = {
    ticket: "DM-096",
    branch: "codex/dearme-dm-096-focused-decision-banner-actions",
    head: "e61752b8e6fee7f8c3a92051c2e76ecf9a7cb044",
    reason: "focused decision banner already absorbed",
  };

  try {
    mkdirSync(ledgerDir, { recursive: true });
    writeFileSync(ledgerPath, JSON.stringify({ reviewedAbsorptions: [absorption] }));

    assert.deepEqual(loadReviewedAbsorptions(repo), [absorption]);

    writeFileSync(ledgerPath, JSON.stringify([absorption]));
    assert.deepEqual(loadReviewedAbsorptions(repo), [absorption]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("enrichWorktreeRecord classifies DEA and Symphony paths as active lanes", () => {
  const record = enrichWorktreeRecord({
    path: "/private/tmp/dearme-symphony-workspaces/DEA-7/repo",
    branch: "main",
    head: "abc",
    status: "not_in_current",
    dirtyFiles: 0,
    prunable: false,
  });

  assert.equal(record.ticket, "DEA-7");
  assert.equal(record.purpose, "symphony");
  assert.equal(
    record.nextAction,
    "active Symphony lane; compare against current head and replay only issue-scoped slices",
  );

  assert.equal(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-symphony-workspaces/DEA-7/repo",
      branch: "verify-dea-7-current",
      head: "def",
      status: "in_current",
      dirtyFiles: 0,
      prunable: false,
    }).nextAction,
    "absorbed Symphony lane; keep as audit trail or close after owner confirmation",
  );

  assert.equal(
    enrichWorktreeRecord({
      path: "/private/tmp/dearme-symphony-workspaces/DEA-37",
      branch: "codex/dearme-dm-136-sample-demo-proof",
      head: "ghi",
      status: "not_in_current",
      dirtyFiles: 0,
      prunable: false,
    }).ticket,
    "DEA-37",
  );
});

test("collectWorktreeStatus includes real Symphony workspace repos by default", () => {
  const repo = mkdtempSync(join(tmpdir(), "dearme-worktree-status-root-"));
  const symphonyRoot = mkdtempSync(join(tmpdir(), "dearme-symphony-root-"));
  const directSymphonyRepo = join(symphonyRoot, "DEA-8");
  const symphonyRepo = join(symphonyRoot, "DEA-7", "repo");

  try {
    git(repo, ["init", "--initial-branch=main"]);
    writeFileSync(join(repo, "brand.md"), "base\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "base");

    mkdirSync(join(symphonyRoot, "DEA-7"));
    git(symphonyRoot, ["clone", repo, symphonyRepo]);
    writeFileSync(join(symphonyRepo, "brand.md"), "base\nsymphony lane\n");
    git(symphonyRepo, ["add", "brand.md"]);
    commit(symphonyRepo, "symphony lane");

    git(symphonyRoot, ["clone", repo, directSymphonyRepo]);
    writeFileSync(join(directSymphonyRepo, "brand.md"), "base\ndirect symphony lane\n");
    git(directSymphonyRepo, ["add", "brand.md"]);
    commit(directSymphonyRepo, "direct symphony lane");

    assert.deepEqual(listSymphonyWorkspacePaths(symphonyRoot), [
      symphonyRepo,
      directSymphonyRepo,
    ].sort());

    const records = collectWorktreeStatus({
      cwd: repo,
      skipDirty: true,
      symphonyRoot,
    });
    const symphonyRecord = records.find((record) => record.path === symphonyRepo);
    const directSymphonyRecord = records.find((record) => record.path === directSymphonyRepo);

    assert.equal(symphonyRecord?.source, "symphony");
    assert.equal(symphonyRecord?.ticket, "DEA-7");
    assert.equal(symphonyRecord?.purpose, "symphony");
    assert.equal(symphonyRecord?.status, "not_in_current");
    assert.equal(symphonyRecord?.dirtyFiles, null);
    assert.equal(directSymphonyRecord?.source, "symphony");
    assert.equal(directSymphonyRecord?.ticket, "DEA-8");
    assert.equal(directSymphonyRecord?.purpose, "symphony");
    assert.equal(directSymphonyRecord?.status, "not_in_current");
    assert.equal(directSymphonyRecord?.dirtyFiles, null);

    assert.equal(
      collectWorktreeStatus({
        cwd: repo,
        skipDirty: true,
        includeSymphony: false,
        symphonyRoot,
      }).some((record) => record.path === symphonyRepo),
      false,
    );
    assert.equal(
      collectWorktreeStatus({
        cwd: repo,
        skipDirty: true,
        includeSymphony: false,
        symphonyRoot,
      }).some((record) => record.path === directSymphonyRepo),
      false,
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(symphonyRoot, { recursive: true, force: true });
  }
});

test("collectSymphonyHandoffs summarizes latest handoff by issue", () => {
  const handoffRoot = mkdtempSync(join(tmpdir(), "dearme-symphony-handoffs-"));
  const olderPath = join(handoffRoot, "DEA-60-old.json");
  const newerPath = join(handoffRoot, "DEA-60-new.json");
  const otherPath = join(handoffRoot, "DEA-61-new.json");
  const malformedPath = join(handoffRoot, "DEA-60-writing.json");

  try {
    writeFileSync(olderPath, JSON.stringify({
      mode: "dirty_patch_handoff",
      issue: "DEA-60",
      head: "1111111111111111111111111111111111111111",
      changedFiles: [],
      patchPath: "/tmp/DEA-60-dirty.patch",
    }));
    writeFileSync(newerPath, JSON.stringify({
      mode: "committed_patch",
      issue: "DEA-60",
      baseHead: "0000000000000000000000000000000000000000",
      head: "2222222222222222222222222222222222222222",
      commits: ["22222222 wire proof"],
      changedFiles: ["scripts/dearme-provider-smoke.ts"],
      patchPath: "/tmp/DEA-60.patch",
      bundlePath: "/tmp/DEA-60.bundle",
    }));
    writeFileSync(otherPath, JSON.stringify({
      mode: "dirty_patch_handoff",
      issue: "DEA-61",
      head: "3333333333333333333333333333333333333333",
      status: [
        "M scripts/dearme-provider-smoke.test.ts",
        " M scripts/dearme-provider-smoke.ts",
        "?? docs/dearme/live-smoke-notes.md",
      ],
      patchPath: "/tmp/DEA-61.patch",
    }));
    writeFileSync(malformedPath, "{\"mode\":", "utf8");

    const older = new Date("2026-05-11T01:00:00.000Z");
    const newer = new Date("2026-05-11T02:00:00.000Z");
    const other = new Date("2026-05-11T03:00:00.000Z");
    const malformed = new Date("2026-05-11T04:00:00.000Z");
    utimesSync(olderPath, older, older);
    utimesSync(newerPath, newer, newer);
    utimesSync(otherPath, other, other);
    utimesSync(malformedPath, malformed, malformed);

    const handoffs = collectSymphonyHandoffs({ handoffRoot });
    assert.equal(handoffs[0].issue, "DEA-60");
    assert.equal(handoffs[0].mode, "unreadable_summary");
    assert.match(handoffs[0].readError, /Unexpected end of JSON input|Unexpected token/);
    assert.equal(handoffs[1].issue, "DEA-61");
    assert.equal(handoffs[2].head, "2222222222222222222222222222222222222222");

    const summary = summarizeSymphonyHandoffs(handoffs);
    assert.equal(summary.total, 4);
    assert.equal(summary.byMode.committed_patch, 1);
    assert.equal(summary.byMode.dirty_patch_handoff, 2);
    assert.equal(summary.byMode.unreadable_summary, 1);
    assert.equal(summary.latestByMode.committed_patch, 1);
    assert.equal(summary.latestByMode.dirty_patch_handoff, 1);
    assert.equal(summary.historicalByMode.dirty_patch_handoff, 1);
    assert.equal(summary.historicalByMode.committed_patch ?? 0, 0);
    assert.equal(summary.historicalByMode.unreadable_summary ?? 0, 0);
    assert.equal(summary.latestByIssue["DEA-60"].mode, "committed_patch");
    assert.deepEqual(summary.latestByIssue["DEA-61"].changedFiles, [
      "scripts/dearme-provider-smoke.test.ts",
      "scripts/dearme-provider-smoke.ts",
      "docs/dearme/live-smoke-notes.md",
    ]);
    assert.equal(
      formatSymphonyHandoffSummaryLine("DEA-61", summary.latestByIssue["DEA-61"]),
      [
        "- DEA-61: dirty_patch_handoff",
        "head=333333333333",
        "files=3 changes=scripts/dearme-provider-smoke.test.ts,scripts/dearme-provider-smoke.ts,docs/dearme/live-smoke-notes.md",
        "updated=2026-05-11T03:00:00.000Z",
        "patch=/tmp/DEA-61.patch",
      ].join(" "),
    );
    assert.deepEqual(summary.latestByIssue["DEA-60"].changedFiles, [
      "scripts/dearme-provider-smoke.ts",
    ]);

    assert.deepEqual(
      filterSymphonyHandoffs(handoffs, { tickets: new Set(["DEA-60"]) }).map((handoff) =>
        handoff.issue
      ),
      ["DEA-60", "DEA-60", "DEA-60"],
    );
  } finally {
    rmSync(handoffRoot, { recursive: true, force: true });
  }
});

test("classifyWorktree marks cherry-pick-equivalent branches as patch_equivalent", () => {
  const repo = mkdtempSync(join(tmpdir(), "dearme-worktree-status-"));

  try {
    git(repo, ["init", "--initial-branch=main"]);
    writeFileSync(join(repo, "brand.md"), "base\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "base");

    git(repo, ["checkout", "-b", "worker"]);
    writeFileSync(join(repo, "brand.md"), "base\nvoice gate\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "worker slice");
    const workerHead = git(repo, ["rev-parse", "HEAD"]);

    git(repo, ["checkout", "main"]);
    writeFileSync(join(repo, "brand.md"), "base\nvoice gate\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "coordinator equivalent slice");
    const currentHead = git(repo, ["rev-parse", "HEAD"]);

    assert.equal(
      classifyWorktree({ head: workerHead }, currentHead, repo),
      "patch_equivalent",
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("collectWorktreeStatus flags stale branches whose tip subject already landed", () => {
  const repo = mkdtempSync(join(tmpdir(), "dearme-worktree-status-"));
  const workerPath = mkdtempSync(join(tmpdir(), "dearme-worktree-status-worker-"));

  try {
    git(repo, ["init", "--initial-branch=main"]);
    writeFileSync(join(repo, "brand.md"), "base\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "base");

    git(repo, ["checkout", "-b", "worker"]);
    writeFileSync(join(repo, "brand.md"), "base\nworker variant\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "reuse guardrail slice");

    git(repo, ["checkout", "main"]);
    writeFileSync(join(repo, "brand.md"), "base\ncoordinator variant\n");
    git(repo, ["add", "brand.md"]);
    commit(repo, "reuse guardrail slice");

    rmSync(workerPath, { recursive: true, force: true });
    git(repo, ["worktree", "add", workerPath, "worker"]);

    const workerRecord = collectWorktreeStatus({
      cwd: repo,
      skipDirty: true,
      includeSymphony: false,
    }).find((record) => record.branch === "worker");

    assert.equal(workerRecord?.status, "not_in_current");
    assert.equal(workerRecord?.headSubject, "reuse guardrail slice");
    assert.equal(workerRecord?.headSubjectInCurrent, true);
    assert.equal(
      workerRecord?.nextAction,
      "tip subject already exists in current head; inspect residual diff before replay or close",
    );
  } finally {
    rmSync(workerPath, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test("deriveWorktreeTicket handles compact and dashed ticket names", () => {
  assert.equal(
    deriveWorktreeTicket({
      branch: "codex/dearme-baseline-dm101-integration",
      path: "/private/tmp/dearme-baseline-dm101-integration",
    }),
    "DM-101",
  );
  assert.equal(
    deriveWorktreeTicket({
      branch: "codex/dearme-dm-005a-proof",
      path: "/private/tmp/dearme-dm-005a-proof",
    }),
    "DM-005A",
  );
  assert.equal(
    deriveWorktreeTicket({
      branch: "verify-dea-7-current",
      path: "/private/tmp/dearme-symphony-workspaces/DEA-7-publish-qbFNq4/repo",
    }),
    "DEA-7",
  );
});
