import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveWorktreeTicket,
  enrichWorktreeRecord,
  filterWorktreeRecords,
  parseArgs,
  parseWorktrees,
  summarize,
} from "./dearme-worktree-status.mjs";

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
    [records[2]],
  );
});

test("parseArgs tolerates the pnpm argument separator", () => {
  const options = parseArgs(["--", "--not-in-current", "--ticket", "dm138", "--limit", "2"]);

  assert.equal(options.statuses.has("not_in_current"), true);
  assert.equal(options.tickets.has("DM-138"), true);
  assert.equal(options.limit, 2);
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
    }),
  ];

  assert.deepEqual(summarize(records), {
    total: 2,
    dirty: 1,
    current: 1,
    not_in_current: 1,
    byPurpose: {
      current: 1,
      integration: 1,
    },
    byTicket: {
      "DM-136": 1,
      "DM-086": 1,
    },
  });
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
});
