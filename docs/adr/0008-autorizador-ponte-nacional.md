# ADR-0008 — Interface `Autorizador` para virar "ponte" de emissão nacional
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
O usuário quer que, no futuro, a emissão em qualquer estado seja um diferencial e até um serviço para terceiros. Não existe credenciamento de intermediário: o emitente é sempre o lojista com seu A1. Nós somos o responsável técnico.

## Decisão
Desde a fase 4, toda comunicação com a SEFAZ passa pela interface `Autorizador` (UF → URLs, versão, regras de QR Code). Adicionar uma UF = adaptador + testes de homologação + CSRT quando exigido.

## Consequências
Pequeno custo inicial de abstração. A fase 6 (todas as UFs + API pública) fica viável sem reescrever a emissão.
