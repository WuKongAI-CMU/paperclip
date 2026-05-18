import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeBacklogAudit,
  parseDearMeBacklogAuditArgs,
  parseDearMeBacklogItems,
  parseDearMeLedgerIds,
  summarizeDearMeBacklogAudit,
} from "./dearme-backlog-audit.ts";

const HANDOFF_FIXTURE = `# DearMe handoff

## 2. Earlier section

## 3. Autonomous backlog

### P0 - must ship before any human customer signs up

- [ ] **DM-DOCKERFILE-SERVER** - Build the server image.
- [x] **DM-RATE-LIMIT** - Protect public endpoints.

### P1 - pre-50-paying-customer hardening

- [ ] **DM-PROD-SMOKE** - Check production readiness.

### P2 - first-50-to-500 customers

- [ ] **DM-REFERRAL-UI** - Add the referral page.

### Standing infinite work (do whenever idle)

- [ ] **autonomous-fix-loop:** run the status check weekly.
- [ ] **dependency-bump-loop:** bump safe dependency updates.

---

## 4. RESERVED - Peter handles these (DO NOT touch)
`;

test("parses handoff backlog items by priority", () => {
  const items = parseDearMeBacklogItems(HANDOFF_FIXTURE);

  assert.deepEqual(items.map((item) => [item.priority, item.id, item.checked, item.requiredForNamedBacklog]), [
    ["P0", "DM-DOCKERFILE-SERVER", false, true],
    ["P0", "DM-RATE-LIMIT", true, true],
    ["P1", "DM-PROD-SMOKE", false, true],
    ["P2", "DM-REFERRAL-UI", false, true],
    ["Standing", "autonomous-fix-loop", false, false],
    ["Standing", "dependency-bump-loop", false, false],
  ]);
});

test("summarizes required ledger coverage without requiring standing loops", () => {
  const items = parseDearMeBacklogItems(HANDOFF_FIXTURE);
  const ledgerIds = parseDearMeLedgerIds(`2026-05-15 03:05  DM-DOCKERFILE-SERVER  fb9dff96  PR #1  P0
2026-05-15 04:48  DM-RATE-LIMIT  d1ba6e72  PR #5  P0
2026-05-15 09:40  DM-PROD-SMOKE  173b54c0  PR #20  P1
2026-05-16 02:53  DM-REFERRAL-UI  972db8bc  PR #30  P2
`);
  const audit = summarizeDearMeBacklogAudit(items, ledgerIds);
  const formatted = formatDearMeBacklogAudit(audit).join("\n");

  assert.equal(audit.complete, true);
  assert.equal(audit.required.total, 4);
  assert.equal(audit.required.shipped, 4);
  assert.deepEqual(audit.required.missing, []);
  assert.deepEqual(audit.required.shippedUnchecked.map((item) => item.id), [
    "DM-DOCKERFILE-SERVER",
    "DM-PROD-SMOKE",
    "DM-REFERRAL-UI",
  ]);
  assert.deepEqual(audit.standingOpen.map((item) => item.id), [
    "autonomous-fix-loop",
    "dependency-bump-loop",
  ]);
  assert.equal(audit.nextAction.label, "Continue standing loop");
  assert.match(formatted, /Required P0\/P1\/P2 shipped: 4\/4/);
  assert.match(formatted, /Shipped items still unchecked in handoff: 3/);
  assert.match(formatted, /Standing loop items open: 2/);
});

test("reports the first required backlog item missing from the ledger", () => {
  const audit = summarizeDearMeBacklogAudit(
    parseDearMeBacklogItems(HANDOFF_FIXTURE),
    ["DM-DOCKERFILE-SERVER"],
  );

  assert.equal(audit.complete, false);
  assert.deepEqual(audit.required.missing.map((item) => item.id), [
    "DM-RATE-LIMIT",
    "DM-PROD-SMOKE",
    "DM-REFERRAL-UI",
  ]);
  assert.equal(audit.nextAction.label, "DM-RATE-LIMIT");
});

test("parses command arguments", () => {
  assert.deepEqual(
    parseDearMeBacklogAuditArgs([
      "--check",
      "--json",
      "--handoff",
      "handoff.md",
      "--ledger",
      "ledger.md",
    ]),
    {
      help: false,
      json: true,
      check: true,
      handoffPath: "handoff.md",
      ledgerPath: "ledger.md",
    },
  );
});
