# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

## [0.2.0] — 2026-11-17 — Tudo em Docker

### Adicionado
- `Dockerfile` (alvos `app`, Next.js standalone, e `sefaz-mock`) e `docker-compose.yml` na raiz, que inclui as calculadoras da Receita.
- `npm run docker` / `npm run docker:parar`, com um roteiro de testes no README.
- E2E (desktop + celular) validado contra o app rodando em container.

### Corrigido
- T-19 (permissão do cache do Next no container) e T-20 (porta ocupada) documentados.

## [0.1.1] — 2026-11-17 — Validação externa e plano online

### Adicionado
- `scripts/comparar-piloto.mts`: calculadoras locais × instância oficial da Receita, com resultado idêntico. O piloto está na 1.7.0/V0073; o Simples Nacional não existe no piloto.
- `scripts/validar-homologacao.mts`: status → emissão → cancelamento numa SEFAZ real (homologação).
- Suporte à cadeia ICP-Brasil (`SEFAZ_CA_FILE`) no cliente SOAP.
- `docs/12-plano-online.md`, `infra/producao/` (Compose + Caddy com chave interna), `vercel.json`, CI e workflow de imagens multi-arch.
- Header `X-Internal-Key` (`RF_INTERNAL_KEY`) nas chamadas às calculadoras.
- `infra/certs/icp-brasil.pem`: raízes ICP-Brasil do ITI, validadas contra as homologações de SEFAZ-SP e SVRS.

### Corrigido
- T-18: o Caddyfile não bloqueava pedidos sem chave (corrigido com `route` e testado).

## [0.1.0] — 2026-11-17 — MVP local

### Adicionado
- App Next.js 16: landing, cadastro/login, onboarding, configurações (certificado A1, CSC), produtos (+CSV), PDV, vendas, notas, painel, assinatura.
- Supabase: esquema multiempresa com RLS, privilégios por coluna para segredos, auditoria; teste SQL de isolamento.
- Motor tributário dual: modo hoje (Simples Anexo I, regime normal, MEI) e modo 2033 (calculadoras oficiais da Receita), com premissas na UI.
- NFC-e: XML 4.00 + grupo IBSCBS oficial, validação no XSD oficial, XMLDSig, QR Code v2, autorização, cancelamento, inutilização, DANFE 80 mm, exportação de XMLs.
- SEFAZ simulada (`infra/sefaz-mock`) e gerador de certificado A1 de teste.
- Asaas: assinatura, webhook com token, modo simulado e script de simulação.
- Testes: Vitest (17), RLS (SQL), Playwright E2E desktop + celular. `npm run local` sobe tudo.
- ADRs 0011 (Cache Components desligado) e 0012 (segredos/XML no Postgres).

### Corrigido
- T-09 a T-15 (ver docs/09-troubleshooting.md).


### Adicionado — 2026-11-17
- Repositório inicial do NotaLeve e documentação completa (`docs/`, ADRs 0001–0010).
- Submódulos das calculadoras oficiais da Receita Federal: Regime Geral 1.6.1, Simples Nacional 0.0.6, DANFSe 1.0.0.
- `infra/receita/Dockerfile.java`, `Dockerfile.danfse` e `docker-compose.yml`: as três APIs sobem localmente (8080/8082/8081).
- Fixtures validadas: exemplo oficial do Regime Geral (vCBS 42,24; REG-011) e venda de revenda no Simples Nacional.
- Exportação do `danfse.wasm` (alvo `wasm`).

### Descobertas
- A calculadora do Simples exige `pIBSSN`/`pCBSSN` informados (lacuna L-01) e `valorImpostoSeletivo` obrigatório (VSN-003).
- NT 2026.005 rege `tpRegimeIBSCBS` (VSN-018/019).
