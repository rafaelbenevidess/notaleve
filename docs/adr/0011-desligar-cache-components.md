# ADR-0011 — Desligar Cache Components do Next.js 16
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
O scaffold do Next 16 vem com `cacheComponents: true` e `partialPrefetching: true`, que tentam pré-renderizar um "shell" estático de cada rota. Toda a área logada do NotaLeve lê a sessão (cookies) e o relógio (dias de teste, validade do certificado). Com a opção ligada, o modo dev acusava erros de pré-renderização em todas as páginas (T-11).

## Decisão
`cacheComponents: false` em `next.config.ts`. Todas as rotas logadas são renderizadas por requisição, como no modelo clássico do App Router. A sessão é verificada em `src/lib/sessao.ts` (`contexto()`).

## Alternativas
- `export const instant = false` por layout/página, seguindo o guia de migração. Ainda sobravam avisos por página.
- Envolver cada leitura de sessão em `<Suspense>`. Dá mais desempenho, mas custa refatorar todas as telas.

## Consequências
Sem cache de componentes por enquanto. A doc do Next indica que o recurso será padrão na próxima versão major, então revisitar no upgrade (adotar `<Suspense>` na leitura da sessão).
