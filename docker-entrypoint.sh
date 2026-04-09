#!/bin/sh
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.json"

# Runtime API URL (priority API_URL, fallback VITE_API_URL for compatibility).
RAW_API_URL="${API_URL:-${VITE_API_URL:-}}"

if [ -n "${RAW_API_URL}" ]; then
  # Ensure the frontend receives a .../api URL.
  NORMALIZED_API_URL="$(printf '%s' "${RAW_API_URL}" | sed -E 's#/api/?$##')/api"
else
  # Empty string keeps frontend fallback behavior (/api same-origin).
  NORMALIZED_API_URL=""
fi

cat > "${CONFIG_PATH}" <<EOF
{
  "apiBaseUrl": "${NORMALIZED_API_URL}"
}
EOF
