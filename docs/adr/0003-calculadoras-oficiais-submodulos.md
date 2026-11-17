# ADR-0003 — Usar as calculadoras oficiais sem modificação (submódulos git)
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
A Receita publicou o motor de cálculo (MIT). Reimplementar em TypeScript (cerca de 480 classes Java, fórmulas JEXL no banco) seria caro e arriscado.

## Decisão
Consumir as APIs oficiais como estão, com os repos como **submódulos** fixados por tag em `infra/receita/vendor/`. Customizações só fora deles (Dockerfiles, compose).

## Consequências
- Atualizar = trocar a tag + rodar fixtures.
- A dependência de JVM exige hospedar containers Java, que a Vercel não executa.
- Lacunas do motor (ex.: alíquota efetiva do SN) são tratadas no NotaLeve.
