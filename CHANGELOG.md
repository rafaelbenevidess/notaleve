# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado — 2026-11-17
- Repositório inicial do NotaLeve e documentação completa (`docs/`, ADRs 0001–0010).
- Submódulos das calculadoras oficiais da Receita Federal: Regime Geral 1.6.1, Simples Nacional 0.0.6, DANFSe 1.0.0.
- `infra/receita/Dockerfile.java`, `Dockerfile.danfse` e `docker-compose.yml`: as três APIs sobem localmente (8080/8082/8081).
- Fixtures validadas: exemplo oficial do Regime Geral (vCBS 42,24; REG-011) e venda de revenda no Simples Nacional.
- Exportação do `danfse.wasm` (alvo `wasm`).

### Descobertas
- A calculadora do Simples exige `pIBSSN`/`pCBSSN` informados (lacuna L-01) e `valorImpostoSeletivo` obrigatório (VSN-003).
- NT 2026.005 rege `tpRegimeIBSCBS` (VSN-018/019).
