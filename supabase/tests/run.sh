#!/usr/bin/env bash
# Geçici bir Postgres kurup migration'ı ve RLS testlerini çalıştırır.
# Gereken: PostgreSQL sunucu ikilileri (Debian/Ubuntu: apt install postgresql).
# Docker veya Supabase CLI gerekmez. Postgres root olarak çalışmadığı için "postgres" kullanıcısı gerekir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
TMP="$(mktemp -d)"
PORT="${PGPORT:-54329}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then RUN_AS=(su postgres -c); fi

cleanup() {
  run "$PGBIN/pg_ctl -D $TMP/data stop -m immediate >/dev/null 2>&1 || true"
  rm -rf "$TMP"
}
run() { if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$1"; else bash -c "$1"; fi; }
trap cleanup EXIT

chmod 755 "$TMP"
[ "$(id -u)" = "0" ] && chown postgres "$TMP"
run "$PGBIN/initdb -D $TMP/data -A trust >/dev/null"
run "$PGBIN/pg_ctl -D $TMP/data -o '-p $PORT -k $TMP' -l $TMP/log -w start >/dev/null"
run "$PGBIN/createdb -h $TMP -p $PORT sira_test"
cd "$ROOT"
run "cd $ROOT && $PGBIN/psql -h $TMP -p $PORT -d sira_test -q -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql"
