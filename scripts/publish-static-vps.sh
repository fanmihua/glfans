#!/usr/bin/env bash
set -euo pipefail

# 在本地运行；只上传与服务器当前版本不同的文件。首次发布自动全量。
source_dir="${1:-dist/client}"
remote="${GLFANS_SSH_TARGET:-root@43.143.216.146}"
site_root="${GLFANS_SITE_ROOT:-/var/www/glfans}"
release_id="${GLFANS_RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
filing_mode="${GLFANS_FILING_MODE:-0}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ -f "$source_dir/index.html" && -d "$source_dir/assets" ]] || { printf 'Build dist/client first.\n' >&2; exit 1; }
[[ "$remote" =~ ^[A-Za-z0-9][A-Za-z0-9@._-]*$ ]] || { printf 'Unsafe SSH target.\n' >&2; exit 1; }
[[ "$site_root" =~ ^/[A-Za-z0-9_/-]+$ && "$site_root" != / && "$site_root" != */ ]] || { printf 'Unsafe site root.\n' >&2; exit 1; }
[[ "$release_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { printf 'Unsafe release ID.\n' >&2; exit 1; }
[[ "$filing_mode" == 0 || "$filing_mode" == 1 ]] || { printf 'GLFANS_FILING_MODE must be 0 or 1.\n' >&2; exit 1; }
ssh_options=(-o BatchMode=yes -o ConnectTimeout=15)
stage="$(ssh "${ssh_options[@]}" "$remote" "mkdir -p '$site_root' && mktemp -d '$site_root/.upload-XXXXXXXX'")"
[[ "$stage" == "$site_root"/.upload-* && "${stage##*/}" =~ ^\.upload-[A-Za-z0-9]+$ ]] || { printf 'Unexpected staging path.\n' >&2; exit 1; }
cleanup() {
  # 仅删除本次 mktemp 返回并已校验的独立暂存目录。
  ssh "${ssh_options[@]}" "$remote" "find '$stage' -depth -delete" || true
}
trap cleanup EXIT
link_option=""
if ssh "${ssh_options[@]}" "$remote" "test -f '$site_root/current/index.html'"; then
  link_option="--link-dest=$site_root/current"
fi
# 校验内容而不依赖构建时间；绝不使用 --inplace 或对 shared 执行 --delete。
rsync -rc --stats --exclude='._*' --exclude='.DS_Store' --exclude='.glfans-asset-*' \
  -e 'ssh -o BatchMode=yes -o ConnectTimeout=15' ${link_option:+"$link_option"} \
  "$source_dir/" "$remote:$stage/client/"
scp "${ssh_options[@]}" "$script_dir/deploy-static-vps.sh" "$remote:$stage/deploy-static-vps.sh"
ssh "${ssh_options[@]}" "$remote" "GLFANS_SITE_ROOT='$site_root' GLFANS_RELEASE_ID='$release_id' GLFANS_FILING_MODE='$filing_mode' bash '$stage/deploy-static-vps.sh' '$stage/client'"
