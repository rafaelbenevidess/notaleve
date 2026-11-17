#!/usr/bin/env bash
# Sobe todo o ambiente local do NotaLeve (docs/03-arquitetura.md).
#   bash scripts/subir-local.sh        # sobe tudo e inicia o app em modo dev
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/5 · Calculadoras da Receita (Docker)…"
docker compose -f infra/receita/docker-compose.yml up -d --build
for i in $(seq 1 90); do
  curl -sf localhost:8080/api/calculadora/dados-abertos/versao >/dev/null && curl -sf localhost:8082/api/versao >/dev/null && break
  sleep 2
done

echo "2/5 · Supabase local…"
npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,postgres-meta,supavisor >/dev/null
npx supabase migration up >/dev/null 2>&1 || true

echo "3/5 · Variáveis de ambiente…"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  sed -i.bak "s|^NOTALEVE_MASTER_KEY=$|NOTALEVE_MASTER_KEY=$(openssl rand -base64 32)|" .env.local && rm -f .env.local.bak
  echo "   .env.local criado (chave mestra gerada)."
fi

echo "4/5 · SEFAZ simulada (porta 8090)…"
if ! curl -sf localhost:8090/health >/dev/null; then
  nohup npx tsx infra/sefaz-mock/server.ts > .sefaz-mock.log 2>&1 &
  sleep 2
fi

echo "5/5 · App em http://localhost:3000"
exec npx next dev -p 3000
