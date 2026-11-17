# ADR-0001 — SaaS por assinatura focado no pequeno comércio
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
A ideia inicial era uma página pública para usar as calculadoras da Receita. O usuário redirecionou para um produto comercial: o lojista (ex.: loja de roupas) compra acesso, registra vendas e o sistema calcula os tributos e emite a nota.

## Decisão
SaaS multiempresa com login e assinatura. O MVP atende o **comércio de mercadorias** (NFC-e mod. 65), principalmente optantes do Simples Nacional.

## Alternativas
- Página pública gratuita de cálculo: descartada como produto principal (sem receita).
- Começar por serviços (NFS-e, padrão nacional único, mais simples): o usuário preferiu comércio.

## Consequências
Exige emissão de NFC-e estadual (mais complexa que NFS-e), guarda de certificado, cobrança e isolamento multiempresa.
