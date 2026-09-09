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
shared_assets_dir="$site_root/shared/assets"

if [[ -e "$release_dir" || -L "$release_dir" ]]; then
  printf 'Refusing deployment: release already exists: %s\n' "$release_dir" >&2
  exit 1
fi

umask 022
mkdir -p "$releases_dir"
mkdir "$release_dir"
COPYFILE_DISABLE=1 cp -a "$source_dir"/. "$release_dir"/

clean_macos_metadata() {
  local target_dir="$1"
  find "$target_dir" \
    \( -name '._*' -o -name '.DS_Store' -o -name '.glfans-asset-*' \) \
    \( -type f -o -type l \) -delete
}

clean_macos_metadata "$release_dir"

if [[ ! -f "$release_dir/index.html" ]]; then
  printf 'Refusing activation: copied release has no index.html.\n' >&2
  exit 1
fi

if [[ ! -d "$release_dir/assets" ]]; then
  printf 'Refusing activation: copied release has no assets directory.\n' >&2
  exit 1
fi

if [[ -L "$shared_assets_dir" ]]; then
  printf 'Refusing activation: shared assets path must not be a symbolic link.\n' >&2
  exit 1
fi

mkdir -p "$shared_assets_dir"
clean_macos_metadata "$shared_assets_dir"

merge_asset_tree() {
  local asset_source="$1"
  local source_path
  local relative_path
  local target_path
  local target_dir
  local temporary_path

  if [[ ! -d "$asset_source" ]]; then
    return 0
  fi

  while IFS= read -r -d '' source_path; do
    relative_path="${source_path#"$asset_source"/}"
    if [[ "$relative_path" == "$source_path" ]]; then
      continue
    fi
    mkdir -p "$shared_assets_dir/$relative_path"
  done < <(find "$asset_source" -mindepth 1 -type d -print0)

  while IFS= read -r -d '' source_path; do
    relative_path="${source_path#"$asset_source"/}"
    case "${relative_path##*/}" in
      ._*|.DS_Store)
        continue
        ;;
    esac
    target_path="$shared_assets_dir/$relative_path"
    target_dir="${target_path%/*}"
    mkdir -p "$target_dir"
    temporary_path="$(mktemp "$target_dir/.glfans-asset-$release_id.XXXXXX")"
    if ! install -m 0644 "$source_path" "$temporary_path"; then
      unlink "$temporary_path"
      return 1
    fi
    if ! mv -f "$temporary_path" "$target_path"; then
      unlink "$temporary_path"
      return 1
    fi
  done < <(find "$asset_source" -type f -print0)
}

# Bootstrap shared assets from releases created before this mechanism existed,
# then let the active release and the new release win for stable filenames.
for existing_release in "$releases_dir"/*; do
  if [[ -d "$existing_release/assets" && "$existing_release" != "$release_dir" ]]; then
    merge_asset_tree "$existing_release/assets"
  fi
done
if [[ -L "$current_link" && -d "$current_link/assets" ]]; then
  merge_asset_tree "$current_link/assets"
fi
merge_asset_tree "$release_dir/assets"
clean_macos_metadata "$shared_assets_dir"

find "$release_dir" -type d -exec chmod 0755 {} +
find "$release_dir" -type f -exec chmod 0644 {} +
find "$shared_assets_dir" -type d -exec chmod 0755 {} +
find "$shared_assets_dir" -type f -exec chmod 0644 {} +

ln -s "$release_dir" "$next_link"
node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$next_link" "$current_link"

printf 'Activated glfans release: %s\n' "$release_dir"
printf 'Current document root: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
printf 'Shared assets root: %s\n' "$shared_assets_dir"
