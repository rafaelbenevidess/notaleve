# 08 – Roadmap

Legenda: ✅ concluído · 🔄 em andamento · ⏳ pendente · ⛔ bloqueado por ação externa (ver [11 – Pendências](11-pendencias.md))

## Fase 0A — APIs da Receita rodando local ✅
- ✅ Submódulos dos 3 repos oficiais fixados por tag
- ✅ `Dockerfile.java`, `Dockerfile.danfse` (+ WASM) e `docker-compose.yml`
- ✅ Exemplos oficiais reproduzidos (Regime Geral e Simples Nacional)
- ⏳ PDF de DANFSe de teste (não há XML de NFS-e de amostra; NFS-e está fora do MVP)
- ✅ Comparação local × instância piloto: valores idênticos; piloto na 1.7.0/V0073; Simples Nacional ausente no piloto

## Fase 0B — Validação externa 🔄
- ✅ Rede liberada (ambiente "notaleve"): piloto da Receita, Portal NF-e, homologação SP/SVRS
- ✅ Cadeia TLS das SEFAZ diagnosticada (ICP-Brasil, T-16) e suportada (`SEFAZ_CA_FILE`)
- ✅ `scripts/validar-homologacao.mts`: status → emissão → cancelamento numa SEFAZ real, em um comando
- ⛔ Executar a homologação: **falta certificado A1** de um CNPJ real (P-04) e a cadeia ICP-Brasil (P-16)

## Fase 1 — Base do SaaS ✅
- ✅ Next.js 16 + TypeScript + Tailwind 4
- ✅ Supabase local, migração com RLS e privilégios por coluna; teste de isolamento (`npm run test:rls`)
- ✅ Cadastro/login, onboarding (UF/município oficiais, regime, atividade SN, RBT12)
- ✅ Certificado A1 (validação de senha, CNPJ, validade) e CSC cifrados
- ✅ Asaas: trial de 14 dias, assinatura, webhook com token, simulador local, bloqueio por inadimplência

## Fase 2 — Catálogo ✅
- ✅ Produtos com NCM e cClassTrib validados nas tabelas oficiais (REG-011 evitado na origem)
- ✅ Importação CSV com validação linha a linha

## Fase 3 — Venda + cálculo dual ✅
- ✅ PDV responsivo (busca, carrinho, Pix/cartão/dinheiro com troco)
- ✅ `calcularHoje` (Simples Anexo I / regime normal / MEI) e `calcular2033` (calculadoras oficiais)
- ✅ Alíquota efetiva do Simples (L-01) e cenário de alíquotas 2033 (L-02), com premissas exibidas na UI
- ✅ Card comparativo com memória de cálculo; request/response gravados para depuração

## Fase 4 — NFC-e ✅ (SEFAZ simulada) · ⛔ (homologação real)
- ✅ XML 4.00 + grupo IBSCBS gerado pela calculadora oficial; validado no XSD oficial da Receita
- ✅ Assinatura XMLDSig, chave de acesso, QR Code v2, interface `Autorizador` por UF
- ✅ Autorização, cancelamento (24 h), inutilização, status do serviço
- ✅ DANFE NFC-e 80 mm em PDF; download do XML
- ✅ SEFAZ simulada (`infra/sefaz-mock`) que valida assinatura, chave, duplicidade e homologação
- ⛔ Emissão na homologação real da UF piloto (P-02/P-03/P-04)
- ⏳ Contingência offline (tpEmis 9) — fase 6

## Fase 5 — Painel e contador ✅
- ✅ Faturamento, NFC-e, tributos do mês nos dois modos, mais vendidos
- ✅ Exportação mensal (zip com XMLs + resumo.csv)

## Qualidade ✅
- ✅ 17 testes unitários/integração (Vitest), teste SQL de RLS, E2E Playwright (desktop + celular)
- ✅ `tsc`, `eslint` e `next build` sem erros

## Plano online ✅ (documento) · ⏳ (execução)
- ✅ [12-plano-online.md](12-plano-online.md): topologia, custos, passo a passo, checklist de go-live, operação
- ✅ `infra/producao/` (Compose + Caddy com chave interna, testado), `vercel.json` (gru1), CI e workflow de imagens multi-arch
- ⏳ Executar: contas Vercel Pro, Supabase, Oracle, Asaas, domínio

## Fase 6 — Ponte nacional + API pública ⏳
- Autorizadores de todas as UFs/SVRS/SVAN, contingência, monitor SEFAZ, monitor de novas NTs, API para terceiros

## Fora do MVP
NF-e 55, NFS-e (API Nacional + DANFSe WASM), estoque avançado, maquininha, app offline, múltiplos usuários por loja (o papel "vendedor" já existe no banco, sem tela de convite).
