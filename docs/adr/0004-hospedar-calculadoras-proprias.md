# ADR-0004 — Hospedar as calculadoras nós mesmos (instância piloto como opção)
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
A primeira decisão foi usar a instância online da Receita (`piloto-cbs.tributos.gov.br`). Depois o usuário observou que os repos são APIs sem hospedagem garantida: o "piloto" não tem SLA e não pôde ser testado deste ambiente.

## Decisão
Rodar as três APIs em containers próprios (local agora, servidor próprio depois). A instância piloto **é mantida** como opção configurável (`RF_API_URL`) e como referência para o teste de comparação.

## Consequências
Precisamos manter imagens e infraestrutura. Em troca, ganhamos controle de disponibilidade e versão.
