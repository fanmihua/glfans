#!/usr/bin/env bash
set -euo pipefail

umask 077

database="glfans"
defaults_file="/etc/glfans/mysql-backup.cnf"
backup_dir="/var/backups/glfans-mysql"
retention_days="${GLFANS_BACKUP_RETENTION_DAYS:-14}"
lock_file="/run/lock/glfans-mysql-backup.lock"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Refusing backup: run this script as root.\n' >&2
  exit 1
fi

if [[ "$defaults_file" != /* || ! -f "$defaults_file" || -L "$defaults_file" ]]; then
  printf 'Refusing backup: defaults-extra-file must be an existing regular absolute path.\n' >&2
  exit 1
fi

defaults_owner="$(/usr/bin/stat -c '%u' "$defaults_file")"
defaults_mode="$(/usr/bin/stat -c '%a' "$defaults_file")"
if [[ "$defaults_owner" != "0" || ! "$defaults_mode" =~ ^[046][0]0$ ]]; then
  printf 'Refusing backup: %s must be root-owned and inaccessible to group/other.\n' "$defaults_file" >&2
  exit 1
fi

if [[ -L "$backup_dir" ]]; then
  printf 'Refusing backup: fixed backup directory must not be a symbolic link.\n' >&2
  exit 1
fi

if [[ ! "$retention_days" =~ ^[1-9][0-9]*$ ]]; then
  printf 'Refusing backup: GLFANS_BACKUP_RETENTION_DAYS must be a positive integer.\n' >&2
  exit 1
fi

/usr/bin/install -d -o root -g root -m 0700 "$backup_dir"

exec 9>"$lock_file"
if ! /usr/bin/flock -n 9; then
  printf 'Another glfans MySQL backup is already running.\n' >&2
  exit 1
fi

timestamp="$(/usr/bin/date -u +%Y%m%dT%H%M%SZ)"
final_file="$backup_dir/glfans-$timestamp.sql.gz"
temporary_file="$(/usr/bin/mktemp "$backup_dir/.glfans-$timestamp.sql.gz.XXXXXX")"

cleanup() {
  if [[ -f "$temporary_file" ]]; then
    /usr/bin/unlink "$temporary_file"
  fi
}
trap cleanup EXIT

/usr/bin/mysqldump \
  "--defaults-extra-file=$defaults_file" \
  --single-transaction \
  --quick \
  --skip-lock-tables \
  --no-tablespaces \
  --set-gtid-purged=OFF \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "$database" |
  /usr/bin/gzip -9 >"$temporary_file"

/usr/bin/test -s "$temporary_file"
/usr/bin/gzip -t "$temporary_file"
/usr/bin/mv "$temporary_file" "$final_file"
trap - EXIT

(
  cd "$backup_dir"
  /usr/bin/sha256sum "$(/usr/bin/basename "$final_file")" >"$(/usr/bin/basename "$final_file").sha256"
)

/usr/bin/find "$backup_dir" -maxdepth 1 -type f \
  \( -name 'glfans-*.sql.gz' -o -name 'glfans-*.sql.gz.sha256' \) \
  -mtime "+$retention_days" -delete

printf 'Created glfans MySQL backup: %s\n' "$final_file"
