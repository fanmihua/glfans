#!/bin/sh
set -eu

expected_lineage="/etc/letsencrypt-glfans/live/glfans.com"

if [ "${RENEWED_LINEAGE:-}" != "$expected_lineage" ]; then
  printf 'Refusing Nginx reload for unexpected certificate lineage: %s\n' "${RENEWED_LINEAGE:-unset}" >&2
  exit 1
fi

test -r "$expected_lineage/fullchain.pem"
test -r "$expected_lineage/privkey.pem"
nginx_check_output="$(/usr/sbin/nginx -t 2>&1)" || {
  printf '%s\n' "$nginx_check_output" >&2
  exit 1
}
/usr/bin/systemctl reload nginx.service
