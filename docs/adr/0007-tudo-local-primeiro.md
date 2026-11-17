# ADR-0007 — Tudo local primeiro; plano online depois
- **Status:** aceito · **Data:** 2026-11-17

## Decisão
O MVP é desenvolvido e validado 100% local (`docker compose` + `supabase start` + `npm run dev`, Asaas sandbox, SEFAZ mock/homologação). A estratégia de produção vira um documento próprio após a validação.

## Referência futura (não decidida)
Vercel (gru1) para o app; Oracle Cloud Always Free (São Paulo) para as calculadoras, com Docker Compose + Caddy; Supabase gerenciado.
