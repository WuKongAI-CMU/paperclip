import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "dearme-db-backup.sh");

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "dearme-db-backup-test-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function writeExecutable(filePath, source) {
  await writeFile(filePath, source, { mode: 0o755 });
}

async function createStubBin(root) {
  const binDir = path.join(root, "bin");
  await mkdir(binDir, { recursive: true });

  await writeExecutable(
    path.join(binDir, "pg_dump"),
    `#!/usr/bin/env bash
set -euo pipefail
output_file=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --file=*)
      output_file="\${1#--file=}"
      ;;
    --file)
      shift
      output_file="$1"
      ;;
  esac
  shift
done
if [[ -z "$output_file" ]]; then
  echo "missing --file" >&2
  exit 64
fi
mkdir -p "$(dirname "$output_file")"
printf 'stub dump\\n' > "$output_file"
`,
  );

  await writeExecutable(
    path.join(binDir, "aws"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" > "$TEST_AWS_ARGS_FILE"
if [[ "$*" != *" s3 cp "* ]]; then
  echo "missing s3 cp" >&2
  exit 64
fi
`,
  );

  return binDir;
}

test("dearme db backup shell script parses", async () => {
  await execFileAsync("bash", ["-n", scriptPath], { cwd: repoRoot });
});

test("dearme db backup uploads a timestamped dump and removes the local copy", async () => {
  await withTempDir(async (dir) => {
    const binDir = await createStubBin(dir);
    const awsArgsFile = path.join(dir, "aws-args.txt");
    const backupDir = path.join(dir, "backups");
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
      DATABASE_URL: "postgres://user:pass@example.test:5432/dearme",
      DEARME_DB_BACKUP_BUCKET: "dearme-prod-backups",
      DEARME_DB_BACKUP_ENDPOINT_URL: "https://r2.example.test",
      DEARME_DB_BACKUP_LOCAL_DIR: backupDir,
      DEARME_DB_BACKUP_PREFIX: "/prod/postgres/",
      DEARME_DB_BACKUP_REGION: "auto",
      DEARME_DB_BACKUP_TIMESTAMP: "20260516T010203Z",
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      TEST_AWS_ARGS_FILE: awsArgsFile,
    };

    const { stderr } = await execFileAsync("bash", [scriptPath], { cwd: repoRoot, env });

    const localPath = path.join(backupDir, "dearme-postgres-20260516T010203Z.dump");
    const awsArgs = await readFile(awsArgsFile, "utf8");
    assert.equal(
      awsArgs.trim(),
      `--endpoint-url https://r2.example.test --region auto s3 cp ${localPath} s3://dearme-prod-backups/prod/postgres/dearme-postgres-20260516T010203Z.dump --only-show-errors`,
    );
    assert.match(stderr, /target=s3:\/\/dearme-prod-backups\/prod\/postgres\/dearme-postgres-20260516T010203Z\.dump/);
    assert.match(stderr, /backup uploaded; local copy removed/);
    await assert.rejects(readFile(localPath), /ENOENT/);
  });
});

test("dearme db backup keeps the local dump when requested", async () => {
  await withTempDir(async (dir) => {
    const binDir = await createStubBin(dir);
    const awsArgsFile = path.join(dir, "aws-args.txt");
    const backupDir = path.join(dir, "backups");
    const localPath = path.join(backupDir, "dearme-postgres-20260516T030405Z.dump");
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
      DATABASE_URL: "postgres://user:pass@example.test:5432/dearme",
      DEARME_DB_BACKUP_BUCKET: "dearme-prod-backups",
      DEARME_DB_BACKUP_KEEP_LOCAL: "1",
      DEARME_DB_BACKUP_LOCAL_DIR: backupDir,
      DEARME_DB_BACKUP_TIMESTAMP: "20260516T030405Z",
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      TEST_AWS_ARGS_FILE: awsArgsFile,
    };

    const { stderr } = await execFileAsync("bash", [scriptPath], { cwd: repoRoot, env });

    assert.equal(await readFile(localPath, "utf8"), "stub dump\n");
    assert.match(stderr, /target=s3:\/\/dearme-prod-backups\/dearme\/postgres\/dearme-postgres-20260516T030405Z\.dump/);
    assert.match(stderr, /backup uploaded; local copy kept/);
  });
});

test("dearme db backup fails fast when required env is missing", async () => {
  await withTempDir(async (dir) => {
    const binDir = await createStubBin(dir);
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
      DEARME_DB_BACKUP_BUCKET: "dearme-prod-backups",
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    };
    delete env.DATABASE_URL;

    await assert.rejects(
      execFileAsync("bash", [scriptPath], { cwd: repoRoot, env }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /DATABASE_URL is required/);
        assert.doesNotMatch(error.stderr, /test-secret-key/);
        return true;
      },
    );
  });
});
