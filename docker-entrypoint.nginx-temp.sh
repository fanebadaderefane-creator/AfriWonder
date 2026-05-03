#!/bin/sh
# Render / Cron : filesystem parfois non-root ; pid + client_temp doivent être sous /tmp accessibles.
set -e
mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp
chmod -R 0777 /tmp/nginx 2>/dev/null || true
