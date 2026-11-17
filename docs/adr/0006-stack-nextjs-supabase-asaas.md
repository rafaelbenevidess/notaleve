# ADR-0006 — Stack: Next.js + Supabase + Asaas
- **Status:** aceito · **Data:** 2026-11-17

## Decisão
- **Next.js** (App Router, TypeScript): UI + rotas de API (proxy da Receita, webhook, emissão).
- **Supabase:** Auth, Postgres com RLS multiempresa, Storage privado.
- **Asaas:** assinatura recorrente (Pix/boleto/cartão), com sandbox para testes.

## Alternativas
Neon + Neon Auth; Stripe (Pix/boleto menos naturais no Brasil).

## Consequências
Desenvolvimento local com `supabase start` (Docker). Webhook do Asaas exige túnel ou simulação local.
