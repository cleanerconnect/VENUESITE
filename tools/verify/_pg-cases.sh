# Part D-10 · les cas propres à Postgres.
#
#   bash tools/verify/_pg-cases.sh
#
# Chaque cas monte sa propre base, pour que l'échec de l'un ne teinte
# pas le suivant.
set -u
cd "$(dirname "$0")/../.."
export PATH="$PWD/node_modules/.bin:$PATH"
HOST=127.0.0.1
PORT=5433
say() { echo; echo "── $1"; }
mkdb() { psql -h $HOST -p $PORT -U postgres -d postgres -q -c "DROP DATABASE IF EXISTS $1" -c "CREATE DATABASE $1" 2>&1 | grep -v "^$" || true; }

say "1 · une base vierge est estampillée, pas migrée"
mkdb audit_a
OUT=$(DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_a" node db/migrate.mjs 2>&1)
echo "$OUT" | tail -4
echo "  ledger : $(psql -h $HOST -p $PORT -U postgres -d audit_a -tAc "SELECT string_agg(id, ',' ORDER BY id) FROM schema_migrations" 2>&1)"
echo "  colonne status présente : $(psql -h $HOST -p $PORT -U postgres -d audit_a -tAc "SELECT count(*) FROM information_schema.columns WHERE table_name='venues' AND column_name='status'")"

say "2 · 001 appliqué à la main, sans ligne dans le registre"
mkdb audit_b
DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_b" node db/migrate.mjs > /dev/null 2>&1
# Un opérateur pressé : la colonne est là, la ligne du registre n'y est pas.
psql -h $HOST -p $PORT -U postgres -d audit_b -q -c "DELETE FROM schema_migrations WHERE id LIKE '001%'" 2>&1 | head -2
OUT=$(DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_b" node db/migrate.mjs 2>&1)
echo "  sortie : $(echo "$OUT" | tail -3 | tr '\n' ' ')"
echo "  code   : $?"
echo "  ledger : $(psql -h $HOST -p $PORT -U postgres -d audit_b -tAc "SELECT string_agg(id, ',' ORDER BY id) FROM schema_migrations" 2>&1)"

say "3 · deux bootstraps en parallèle sur une base vierge"
mkdb audit_c
( DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_c" node db/bootstrap.mjs > /tmp/boot1.log 2>&1; echo "  bootstrap 1 : exit=$?" ) &
( DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_c" node db/bootstrap.mjs > /tmp/boot2.log 2>&1; echo "  bootstrap 2 : exit=$?" ) &
wait
echo "  établissements : $(psql -h $HOST -p $PORT -U postgres -d audit_c -tAc "SELECT count(*) FROM venues" 2>&1)"
echo "  réservations   : $(psql -h $HOST -p $PORT -U postgres -d audit_c -tAc "SELECT count(*) FROM reservations" 2>&1)"
echo "  1 : $(grep -viE 'experimental|trace-warnings' /tmp/boot1.log | tail -2 | tr '\n' ' ')"
echo "  2 : $(grep -viE 'experimental|trace-warnings' /tmp/boot2.log | tail -2 | tr '\n' ' ')"

say "4 · LYFE_SKIP_DB_BOOTSTRAP=1"
mkdb audit_d
OUT=$(LYFE_SKIP_DB_BOOTSTRAP=1 DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_d" node db/bootstrap.mjs 2>&1)
echo "  sortie : $(echo "$OUT" | grep -viE 'experimental|trace-warnings' | tail -2 | tr '\n' ' ')"
echo "  tables : $(psql -h $HOST -p $PORT -U postgres -d audit_d -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"

say "5 · un bootstrap sur une base qui tient déjà un établissement"
OUT=$(DATABASE_URL="postgres://postgres@$HOST:$PORT/audit_c" node db/bootstrap.mjs 2>&1)
echo "  sortie : $(echo "$OUT" | grep -viE 'experimental|trace-warnings' | tail -2 | tr '\n' ' ')"
echo "  réservations après : $(psql -h $HOST -p $PORT -U postgres -d audit_c -tAc "SELECT count(*) FROM reservations")"

say "6 · aucune DATABASE_URL"
OUT=$(env -u DATABASE_URL node db/bootstrap.mjs 2>&1)
echo "  sortie : $(echo "$OUT" | grep -viE 'experimental|trace-warnings' | tail -2 | tr '\n' ' ')"

for db in audit_a audit_b audit_c audit_d; do
  psql -h $HOST -p $PORT -U postgres -d postgres -q -c "DROP DATABASE IF EXISTS $db" > /dev/null 2>&1
done
echo
echo PG_CASES_DONE
