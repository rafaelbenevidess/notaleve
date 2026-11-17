# ADR-0002 — Cálculo dual "hoje × reforma completa (2033)"
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
O usuário quer o sistema "como se a reforma completa já estivesse em vigor", para se antecipar. Mas a nota real ainda precisa seguir as regras da transição (ICMS etc.) até 2033; uma nota só com regras de 2033 seria rejeitada.

## Decisão
Cada venda tem **dois cálculos lado a lado**: o modo *hoje* (vai na nota) e o modo *2033* (simulação com as calculadoras oficiais). O motor já nasce no modelo da reforma.

## Alternativas
- Só 2033 (simulador, sem nota real): descartada porque perderia a emissão.
- Só hoje: sem diferencial.

## Consequências
Duas trilhas de regras. O modo hoje precisa ser versionado por NT (RNF-06). A UI deve deixar explícito que 2033 é simulação.
