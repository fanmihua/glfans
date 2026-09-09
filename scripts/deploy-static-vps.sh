#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:-dist/client}"
site_root="${GLFANS_SITE_ROOT:-/var/www/glfans}"
release_id="${GLFANS_RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"

if [[ ! -f "$source_dir/index.html" ]]; then
  printf 'Refusing deployment: %s/index.html does not exist.\n' "$source_dir" >&2
  exit 1
fi

if [[ "$site_root" != /* || "$site_root" == "/" ]]; then
  printf 'Refusing deployment: GLFANS_SITE_ROOT must be a specific absolute path.\n' >&2
  exit 1
fi

if [[ ! "$release_id" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf 'Refusing deployment: GLFANS_RELEASE_ID contains unsafe characters.\n' >&2
  exit 1
fi

releases_dir="$site_root/releases"
release_dir="$releases_dir/$release_id"
next_link="$site_root/.current-$release_id"
current_link="$site_root/current"

if [[ -e "$release_dir" || -L "$release_dir" ]]; then
  printf 'Refusing deployment: release already exists: %s\n' "$release_dir" >&2
  exit 1
fi

umask 022
mkdir -p "$releases_dir"
mkdir "$release_dir"
cp -a "$source_dir"/. "$release_dir"/

if [[ ! -f "$release_dir/index.html" ]]; then
  printf 'Refusing activation: copied release has no index.html.\n' >&2
  exit 1
fi

find "$release_dir" -type d -exec chmod 0755 {} +
find "$release_dir" -type f -exec chmod 0644 {} +

ln -s "$release_dir" "$next_link"
node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$next_link" "$current_link"

printf 'Activated glfans release: %s\n' "$release_dir"
printf 'Current document root: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
