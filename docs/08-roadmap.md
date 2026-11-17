# 08 – Roadmap

Legenda: ✅ concluído · 🔄 em andamento · ⏳ pendente · ⛔ bloqueado (ver [11 – Pendências](11-pendencias.md))

## Fase 0A — APIs da Receita rodando local ✅
- ✅ Submódulos dos 3 repos oficiais fixados por tag
- ✅ `Dockerfile.java` (gera banco SQLite + jars) e `Dockerfile.danfse` (+ WASM)
- ✅ `docker-compose.yml` com os 3 serviços (8080/8082/8081)
- ✅ Exemplo oficial do Regime Geral reproduzido (vCBS 42,24 / REG-011)
- ✅ Exemplo do Simples Nacional (revenda, NFC-e) calculado
- ⏳ Gerar um PDF de DANFSe com XML de exemplo (não há XML de amostra no repo)
- ⏳ Teste de comparação local × instância online (⛔ host bloqueado)

**Pronto quando:** `docker compose up` em máquina limpa sobe os 3 serviços e os fixtures passam.

## Fase 0B — Validação externa ⛔
- ⛔ Liberar rede: `piloto-cbs.tributos.gov.br`, `www.nfe.fazenda.gov.br`, homologação da UF piloto
- ⛔ Escolher UF piloto
- ⛔ Certificado A1 de teste + CSC de homologação
- ⏳ Baixar NT 2025.002 / NT 2026.005 vigentes, schemas e tabela de webservices

## Fase 1 — Base do SaaS ⏳
- Next.js + TS + Tailwind + shadcn/ui
- `supabase start` + migrações + RLS + teste de isolamento
- Login/cadastro, onboarding (empresa, certificado, CSC, RBT12)
- Asaas sandbox: trial, assinatura, webhook, bloqueio por inadimplência

## Fase 2 — Catálogo ⏳
- Produtos com busca de NCM, sugestão de cClassTrib e importação CSV

## Fase 3 — Venda + cálculo dual ⏳
- PDV, `calcularHoje` e `calcular2033`, card comparativo
- `simples-aliquota.ts` (lacuna L-01), cenários de alíquota 2033 (L-02)

## Fase 4 — NFC-e na UF piloto (homologação) ⏳
- `sefaz-mock`, montagem do XML + XSD, assinatura, `Autorizador` da UF, DANFE 80 mm/A4, cancelamento e inutilização
- ADR sobre a biblioteca de NF-e

## Fase 5 — Painel e contador ⏳
- Indicadores do mês nos dois modos, exportação de XMLs (zip)

## Plano online (documento separado, após validar o MVP local) ⏳
- Vercel (gru1) + Oracle Cloud Always Free SP (calculadoras) + Supabase gerenciado

## Fase 6 — Ponte nacional + API pública ⏳
- Autorizadores de todas as UFs/SVRS/SVAN, contingência, monitor SEFAZ, API para terceiros

## Fora do MVP
NF-e 55, NFS-e (API Nacional + DANFSe WASM), estoque avançado, maquininha, app offline.
