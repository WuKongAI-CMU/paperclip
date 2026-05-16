#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[dearme-db-backup] %s\n' "$*" >&2
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "$name is required"
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    fail "$name is required on PATH"
  fi
}

trim_slashes() {
  local value="$1"
  value="${value#/}"
  value="${value%/}"
  printf '%s' "$value"
}

require_env DATABASE_URL
require_env DEARME_DB_BACKUP_BUCKET
require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY

require_command pg_dump
require_command aws

timestamp="${DEARME_DB_BACKUP_TIMESTAMP:-$(date -u '+%Y%m%dT%H%M%SZ')}"
prefix="$(trim_slashes "${DEARME_DB_BACKUP_PREFIX:-dearme/postgres}")"
local_dir="${DEARME_DB_BACKUP_LOCAL_DIR:-${TMPDIR:-/tmp}/dearme-db-backups}"
filename="dearme-postgres-${timestamp}.dump"
local_path="${local_dir}/${filename}"

if [[ -n "$prefix" ]]; then
  remote_uri="s3://${DEARME_DB_BACKUP_BUCKET}/${prefix}/${filename}"
else
  remote_uri="s3://${DEARME_DB_BACKUP_BUCKET}/${filename}"
fi

aws_region="${DEARME_DB_BACKUP_REGION:-auto}"
endpoint_url="${DEARME_DB_BACKUP_ENDPOINT_URL:-}"
keep_local="${DEARME_DB_BACKUP_KEEP_LOCAL:-0}"
dry_run="${DEARME_DB_BACKUP_DRY_RUN:-0}"

mkdir -p "$local_dir"

log "target=${remote_uri}"
log "local=${local_path}"

if [[ "$dry_run" == "1" || "$dry_run" == "true" ]]; then
  log "dry run complete"
  exit 0
fi

pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$local_path"

aws_args=()
if [[ -n "$endpoint_url" ]]; then
  aws_args+=(--endpoint-url "$endpoint_url")
fi
aws_args+=(--region "$aws_region" s3 cp "$local_path" "$remote_uri" --only-show-errors)

aws "${aws_args[@]}"

if [[ "$keep_local" == "1" || "$keep_local" == "true" ]]; then
  log "backup uploaded; local copy kept"
else
  rm -f "$local_path"
  log "backup uploaded; local copy removed"
fi
