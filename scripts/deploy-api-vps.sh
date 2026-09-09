#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:-.}"
while [[ "$source_dir" != "/" && "$source_dir" == */ ]]; do
  source_dir="${source_dir%/}"
done
app_root="/opt/glfans-api"
service_user="glfans"
service_group="glfans"
service_name="glfans-api.service"
release_id="${GLFANS_RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
health_url="http://127.0.0.1:3100/api/health"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Refusing deployment: run this script as root.\n' >&2
  exit 1
fi

for required_file in package.json package-lock.json server/index.js; do
  if [[ ! -f "$source_dir/$required_file" ]]; then
    printf 'Refusing deployment: %s/%s does not exist.\n' "$source_dir" "$required_file" >&2
    exit 1
  fi
done

for required_dir in server scripts db; do
  if [[ ! -d "$source_dir/$required_dir" ]]; then
    printf 'Refusing deployment: %s/%s does not exist.\n' "$source_dir" "$required_dir" >&2
    exit 1
  fi
done

sensitive_source_found=false
while IFS= read -r -d '' candidate; do
  candidate_name="${candidate##*/}"
  case "$candidate_name" in
    .env.example|*.env.example|*.example.env|community-import.example.json)
      continue
      ;;
    .env|.env.*|*.env|*.env.*|*export*.json|*snapshot*.json|*credentials*.json|*service-account*.json|*.pem|*.key|*.p12|*.pfx|*.jks|id_rsa|id_rsa.*|id_ed25519|id_ed25519.*)
      printf 'Refusing deployment: sensitive source file detected: %s\n' "$candidate" >&2
      sensitive_source_found=true
      ;;
  esac
done < <(
  /usr/bin/find "$source_dir" \
    \( -path "$source_dir/.git" -o -path "$source_dir/node_modules" -o -path "$source_dir/dist" \) -prune \
    -o -type f -print0
)

if [[ "$sensitive_source_found" == "true" ]]; then
  exit 1
fi

if [[ ! "$release_id" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf 'Refusing deployment: unsafe release id.\n' >&2
  exit 1
fi

if ! /usr/bin/id "$service_user" >/dev/null 2>&1; then
  printf 'Refusing deployment: service user %s does not exist.\n' "$service_user" >&2
  exit 1
fi

if ! /usr/bin/getent group "$service_group" >/dev/null 2>&1; then
  printf 'Refusing deployment: service group %s does not exist.\n' "$service_group" >&2
  exit 1
fi

releases_dir="$app_root/releases"
release_dir="$releases_dir/$release_id"
next_link="$app_root/.current-$release_id"
current_link="$app_root/current"
npm_cache="/var/cache/glfans-npm"

if [[ -e "$release_dir" || -L "$release_dir" ]]; then
  printf 'Refusing deployment: release already exists: %s\n' "$release_dir" >&2
  exit 1
fi

if [[ -e "$current_link" && ! -L "$current_link" ]]; then
  printf 'Refusing deployment: %s exists but is not a symbolic link.\n' "$current_link" >&2
  exit 1
fi

/usr/bin/install -d -o root -g "$service_group" -m 0750 "$app_root" "$releases_dir"
/usr/bin/install -d -o "$service_user" -g "$service_group" -m 0750 "$release_dir" "$npm_cache"

cleanup_unactivated_release() {
  if [[ -L "$next_link" ]]; then
    /usr/bin/unlink "$next_link"
  fi
  if [[ -d "$release_dir" ]]; then
    /usr/bin/find "$release_dir" -depth -delete
  fi
}
trap cleanup_unactivated_release EXIT

for directory in server server/tests scripts scripts/lib db db/migrations db/seeds; do
  /usr/bin/install -d -o "$service_user" -g "$service_group" -m 0750 "$release_dir/$directory"
done

production_files=(
  package.json
  package-lock.json
  server/README.md
  server/app.js
  server/config.js
  server/errors.js
  server/index.js
  server/mysql-store.js
  server/security.js
  server/validation.js
  scripts/create-glfans-admin.mjs
  scripts/import-glfans-community.mjs
  scripts/lib/glfans-db.mjs
  scripts/migrate-glfans-db.mjs
  scripts/seed-glfans-db.mjs
  db/community-import.example.json
)

for relative_file in "${production_files[@]}"; do
  if [[ ! -f "$source_dir/$relative_file" || -L "$source_dir/$relative_file" ]]; then
    printf 'Refusing deployment: whitelisted production file is missing or is a symlink: %s\n' "$relative_file" >&2
    exit 1
  fi
  /usr/bin/install -o "$service_user" -g "$service_group" -m 0640 \
    "$source_dir/$relative_file" "$release_dir/$relative_file"
done

copy_pattern_files() {
  local source_subdir="$1"
  local pattern="$2"
  local filename_regex="$3"
  local matched=false
  local source_file
  local filename

  while IFS= read -r -d '' source_file; do
    filename="${source_file##*/}"
    # Finder/Archive Utility can materialize AppleDouble metadata beside the
    # real file. It is never executable application code or SQL.
    if [[ "$filename" == ._* ]]; then
      continue
    fi
    if [[ ! "$filename" =~ $filename_regex ]]; then
      continue
    fi
    /usr/bin/install -o "$service_user" -g "$service_group" -m 0640 \
      "$source_file" "$release_dir/$source_subdir/$filename"
    matched=true
  done < <(/usr/bin/find "$source_dir/$source_subdir" -maxdepth 1 -type f -name "$pattern" -print0)

  if [[ "$matched" != "true" ]]; then
    printf 'Refusing deployment: whitelist matched no files in %s (%s).\n' "$source_subdir" "$pattern" >&2
    exit 1
  fi
}

copy_pattern_files server/tests '*.test.mjs' '^[A-Za-z0-9][A-Za-z0-9._-]*\.test\.mjs$'
copy_pattern_files db/migrations '*.sql' '^[0-9][A-Za-z0-9._-]*\.sql$'
copy_pattern_files db/seeds '*.sql' '^[0-9][A-Za-z0-9._-]*\.sql$'

(
  cd "$release_dir"
  /usr/sbin/runuser -u "$service_user" -- \
    /usr/bin/env npm_config_cache="$npm_cache" NODE_ENV=production \
    /usr/bin/npm ci --omit=dev --ignore-scripts --no-audit --no-fund
  /usr/sbin/runuser -u "$service_user" -- \
    /usr/bin/env NODE_ENV=test /usr/bin/node --test server/tests/*.test.mjs
)

/usr/bin/chown -R "root:$service_group" "$release_dir"
/usr/bin/find "$release_dir" -type d -exec /usr/bin/chmod 0750 {} +
/usr/bin/find "$release_dir" -type f -exec /usr/bin/chmod 0640 {} +

previous_target=""
if [[ -L "$current_link" ]]; then
  previous_target="$(/usr/bin/readlink "$current_link")"
fi

/usr/bin/ln -s "$release_dir" "$next_link"
/usr/bin/node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$next_link" "$current_link"
trap - EXIT

rollback() {
  printf 'Health check failed; rolling back glfans API.\n' >&2
  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    rollback_link="$app_root/.rollback-$release_id"
    /usr/bin/ln -s "$previous_target" "$rollback_link"
    /usr/bin/node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$rollback_link" "$current_link"
    /usr/bin/systemctl restart "$service_name"
    printf 'Restored previous API release: %s\n' "$previous_target" >&2
  else
    /usr/bin/systemctl stop "$service_name" || true
    if [[ -L "$current_link" ]] && [[ "$(/usr/bin/readlink "$current_link")" == "$release_dir" ]]; then
      /usr/bin/unlink "$current_link"
    fi
    printf 'No previous API release existed; the failed service was stopped.\n' >&2
  fi
}

if ! /usr/bin/systemctl restart "$service_name"; then
  rollback
  exit 1
fi

healthy=false
for _attempt in {1..20}; do
  if /usr/bin/curl --fail --silent --show-error --max-time 2 "$health_url" >/dev/null; then
    healthy=true
    break
  fi
  /usr/bin/sleep 0.5
done

if [[ "$healthy" != "true" ]]; then
  rollback
  exit 1
fi

printf 'Activated glfans API release: %s\n' "$release_dir"
printf 'Current API root: %s -> %s\n' "$current_link" "$(/usr/bin/readlink "$current_link")"
printf 'Health check passed: %s\n' "$health_url"
