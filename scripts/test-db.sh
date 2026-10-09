#!/usr/bin/env bash
# Sobe um PostgreSQL temporário, aplica o shim do Supabase + migrações
# e executa os testes de banco (RLS, pedidos, status, assinaturas).
#
# Requisitos: binários do PostgreSQL (initdb, pg_ctl) no PATH ou em
# /usr/lib/postgresql/<versão>/bin. Não precisa de credenciais.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PG_BIN:$PATH"
PORT="${PG_TEST_PORT:-54329}"
DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pratuca-pg-XXXXXX")"
SOCKET_DIR="$DATA_DIR/socket"
mkdir -p "$SOCKET_DIR"

RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # o PostgreSQL não roda como root
  id -u postgres >/dev/null 2>&1 || useradd -r -M postgres
  chown -R postgres "$DATA_DIR"
  RUN_AS=(su postgres -s /bin/bash -c)
fi

run() {
  if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi
}

cleanup() {
  run "$PG_BIN/pg_ctl -D '$DATA_DIR/data' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

run "$PG_BIN/initdb -D '$DATA_DIR/data' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8" >/dev/null
run "$PG_BIN/pg_ctl -D '$DATA_DIR/data' -o '-p $PORT -k $SOCKET_DIR -c listen_addresses=' -l '$DATA_DIR/pg.log' -w start" >/dev/null

PSQL=(psql -v ON_ERROR_STOP=1 -q -h "$SOCKET_DIR" -p "$PORT" -U postgres)
"${PSQL[@]}" -d postgres -c "create database pratuca_test" >/dev/null
"${PSQL[@]}" -d pratuca_test -f "$ROOT/supabase/tests/sql/supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ aplicando $(basename "$f")"
  "${PSQL[@]}" -d pratuca_test -f "$f" >/dev/null
done

export TEST_DATABASE_URL="postgresql://postgres@localhost/pratuca_test?host=$SOCKET_DIR&port=$PORT"
cd "$ROOT"
npx vitest run --project db "$@"
