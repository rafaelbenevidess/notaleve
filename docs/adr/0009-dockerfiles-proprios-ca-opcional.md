# ADR-0009 — Dockerfiles próprios com CA opcional
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
Os repos Java não têm Dockerfile. O Dockerfile do DANFSe usa `apk`, que falha atrás de proxy TLS (T-03).

## Decisão
`infra/receita/Dockerfile.java` (multi-stage: banco Flyway → jars → JRE) e `Dockerfile.danfse` (equivalente ao oficial, distroless, alvo `wasm`). Ambos aceitam `--secret id=ca` opcional; sem o secret o comportamento é padrão.

## Consequências
Builds reprodutíveis em qualquer rede. Precisamos acompanhar mudanças de build nos repos oficiais.
