#!/usr/bin/env bash
# Sobe o NotaLeve inteiro em Docker para testes locais (sem transações reais).
#   bash scripts/docker.sh          sobe tudo
#   bash scripts/docker.sh parar    derruba tudo
set -euo pipefail
cd "$(dirname "$0")/.."
SB="npx -y supabase@3.2.0"
if [ "${1:-}" = "parar" ]; then
  docker compose down
  $SB stop
  exit 0
fi
echo "1/3 · Supabase local (containers)…"
$SB start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,postgres-meta,supavisor
echo "2/3 · App + SEFAZ simulada + calculadoras da Receita…"
docker compose up -d --build
echo "3/3 · Aguardando o app…"
for i in $(seq 1 120); do curl -sf -o /dev/null http://localhost:3000 && break; sleep 2; done
cat <<MSG

NotaLeve no ar:  http://localhost:3000
  · Calculadoras da Receita: http://localhost:8080/api/swagger-ui.html  ·  http://localhost:8082/api/swagger-ui.html
  · SEFAZ simulada: http://localhost:8090  (sem valor fiscal)
  · Assinatura Asaas: modo simulado (sem cobrança)
Certificado A1 de TESTE para a sua loja de teste (troque pelo CNPJ que cadastrar):
  npx tsx scripts/certificado-teste.ts 11222333000181 1234 certificado-teste.pfx
Parar tudo:  npm run docker:parar
MSG
