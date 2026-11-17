# ADR-0005 — Emitir NFC-e direto na SEFAZ, começando por 1 UF
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
Foram avaliados: o Emissor Nacional NFS-e (só serviços), o Emissor Web do Sebrae (manual, sem API), emissores gratuitos de SEFAZ (inexistentes para NFC-e) e intermediários pagos (Focus NFe, Nuvem Fiscal, PlugNotas).

## Decisão
Integração própria: XML 4.00 + IBSCBS, assinatura com o A1 do lojista, SOAP com mTLS na SEFAZ/SVRS. **Uma UF piloto** em homologação primeiro.

## Consequências
Mais engenharia (assinatura, webservices, rejeições, DANFE). Custo por nota zero, e a capacidade vira diferencial ("ponte" nacional, ADR-0008). Intermediário pago fica como plano B.
