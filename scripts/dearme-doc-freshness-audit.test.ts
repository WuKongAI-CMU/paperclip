import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeDocFreshnessAudit,
  latestIndexTrackedLedgerEntry,
  parseDearMeDocFreshnessAuditArgs,
  parseDearMeLedgerEntries,
  parseIndexShippedDate,
  summarizeDearMeDocFreshnessAudit,
} from "./dearme-doc-freshness-audit.ts";

const LEDGER_FIXTURE = `2026-05-17 23:32  DM-STATIC-PROOF-CLICK-ANALYTICS  36ae0751  PR #163  Wave C  Static proof links now record safe events.
2026-05-18 14:12  DM-TSX-PATCH-BUMP-2  6ddf6b62  PR #164  Standing  Root tsx dev dependency bumped.
2026-05-18 14:32  DM-DOC-FRESHNESS-TSX-PATCH-2  b6b3a9bc  PR #165  Standing  INDEX shipped list now records the tsx patch bump.
`;

test("parses ledger entries and targets the latest non-doc-freshness slice", () => {
  const entries = parseDearMeLedgerEntries(LEDGER_FIXTURE);
  const latest = latestIndexTrackedLedgerEntry(entries);

  assert.equal(entries.length, 3);
  assert.equal(latest?.id, "DM-TSX-PATCH-BUMP-2");
  assert.equal(latest?.pr, "PR #164");
});

test("parses the INDEX shipped date", () => {
  assert.equal(parseIndexShippedDate("### Shipped (as of 2026-05-18)\n"), "2026-05-18");
  assert.equal(parseIndexShippedDate("### Other section\n"), undefined);
});

test("passes when INDEX records the latest tracked ledger slice", () => {
  const audit = summarizeDearMeDocFreshnessAudit(
    parseDearMeLedgerEntries(LEDGER_FIXTURE),
    `### Shipped (as of 2026-05-18)
- **DM-TSX-PATCH-BUMP-2** - root tsx now resolves to 4.22.2.
`,
  );

  assert.equal(audit.complete, true);
  assert.equal(audit.indexEntryPresent, true);
  assert.equal(audit.nextAction.label, "Continue standing loop");
  assert.match(formatDearMeDocFreshnessAudit(audit).join("\n"), /doc freshness audit: clear/);
});

test("fails when INDEX is missing the latest tracked ledger slice", () => {
  const audit = summarizeDearMeDocFreshnessAudit(
    parseDearMeLedgerEntries(LEDGER_FIXTURE),
    `### Shipped (as of 2026-05-18)
- **DM-STATIC-PROOF-CLICK-ANALYTICS** - older slice.
`,
  );

  assert.equal(audit.complete, false);
  assert.equal(audit.indexEntryPresent, false);
  assert.match(audit.nextAction.reason, /DM-TSX-PATCH-BUMP-2/);
});

test("fails when the shipped date lags the latest tracked ledger slice", () => {
  const audit = summarizeDearMeDocFreshnessAudit(
    parseDearMeLedgerEntries(LEDGER_FIXTURE),
    `### Shipped (as of 2026-05-17)
- **DM-TSX-PATCH-BUMP-2** - root tsx now resolves to 4.22.2.
`,
  );

  assert.equal(audit.complete, false);
  assert.equal(audit.indexEntryPresent, true);
});

test("parses command arguments", () => {
  assert.deepEqual(
    parseDearMeDocFreshnessAuditArgs([
      "--check",
      "--json",
      "--ledger",
      "ledger.md",
      "--index",
      "index.md",
    ]),
    {
      help: false,
      json: true,
      check: true,
      ledgerPath: "ledger.md",
      indexPath: "index.md",
    },
  );
});
