# 03 – Arquitetura

## Visão geral

```
Lojista (navegador / PWA no celular)
        │
        ▼
Next.js (App Router, TypeScript)  ─────────────── Supabase
 ├─ UI: onboarding, produtos, PDV, notas, painel     ├─ Auth (usuários)
 ├─ /api/rf/*        consultas às tabelas oficiais   ├─ Postgres + RLS (multiempresa)
 ├─ /api/webhooks/asaas  → status da assinatura      └─ segredos cifrados + XMLs (ADR-0012)
 ├─ lib/tributos     motor dual (hoje × 2033)
 ├─ lib/fiscal/nfce  XML → assinatura A1 → SOAP mTLS → SEFAZ
 └─ lib/cripto       cifra/decifra certificado e CSC
        │                         │                          │
        ▼                         ▼                          ▼
 Calculadoras Receita        SEFAZ da UF (ou SVRS)       Asaas (cobrança)
 (containers próprios)       autorização NFC-e
  • Regime Geral :8080
  • Simples Nacional :8082
  • DANFSe :8081 (+ WASM)
```

## Componentes

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| App web | Next.js 16 + TypeScript + Tailwind 4 (componentes próprios em `src/components/ui.tsx`; Cache Components desligado — ADR-0011) | Telas, Server Actions, rotas de API, orquestração |
| Banco/Auth | Supabase (Postgres, RLS) | Dados multiempresa, usuários, segredos cifrados e XMLs |
| Calculadora Regime Geral | Java 21 / Spring Boot (código oficial da Receita, v1.6.1) | CBS/IBS/IS, dados abertos, base de cálculo, XML do grupo |
| Calculadora Simples Nacional | Java 21 / Spring Boot (oficial, v0.0.6) | CBS/IBS do optante, atividades do SN |
| Gerador DANFSe | Go (oficial, v1.0.0), HTTP e WASM | PDF de NFS-e (uso futuro) |
| Emissão NFC-e | Módulo próprio TS (`lib/fiscal`) | XML 4.00 + IBSCBS, assinatura, SOAP, QR Code, DANFE |
| Cobrança | Asaas (sandbox no local) | Assinatura recorrente, webhook |

## Fluxo de uma venda

1. O vendedor monta o carrinho no PDV.
2. `lib/tributos` chama **em paralelo**:
   - `calcularHoje(venda)`: regras locais versionadas (CSOSN/ICMS + IBS/CBS de teste);
   - `calcular2033(venda)`: proxy `/api/rf` → Regime Geral (`observabilidade/regime-geral`) ou Simples Nacional (`observabilidade/simples-nacional`).
3. A tela mostra o card "Hoje × 2033" e a venda é gravada (`vendas`, `venda_itens`, `calculos`).
4. Se o vendedor pedir a nota: `lib/fiscal/nfce` monta o XML com os valores do **modo hoje**, assina com o A1 da empresa, envia ao `Autorizador` da UF, recebe o protocolo, gera o DANFE e grava em `notas` + Storage.

## Ambiente local (fase atual)

| Serviço | Como sobe | Porta |
|---|---|---|
| Calculadora Regime Geral | `docker compose -f infra/receita/docker-compose.yml up -d` | 8080 |
| Calculadora Simples Nacional | idem | 8082 |
| DANFSe | idem | 8081 |
| Supabase | `supabase start` (CLI, usa Docker) | 54321 (API) / 54322 (DB) |
| App | `npm run dev` | 3000 |
| Asaas | sandbox (externo) ou `scripts/simular-webhook-asaas.mts` | — |
| SEFAZ | `npm run sefaz:mock` (`infra/sefaz-mock`, `SEFAZ_MODO=mock`); homologação real com `SEFAZ_MODO=real` | 8090 |

Tudo de uma vez: `npm run local` (`scripts/subir-local.sh`).

Variável `RF_API_URL`: aponta para `http://localhost:8080/api` (padrão) **ou** para a instância online oficial `https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api`. Um teste de comparação roda o mesmo exemplo nas duas para validar o container (ver [ADR-0004](adr/0004-hospedar-calculadoras-proprias.md)).

## Futuro online (não iniciado; terá plano próprio)

Ideia registrada, a detalhar:
- **App:** Vercel, região `gru1`.
- **Calculadoras:** VM **Oracle Cloud Always Free (São Paulo)** com o mesmo `docker compose` + Caddy (HTTPS), fechadas por header secreto `X-Internal-Key`. Alternativas: Google Cloud Run (cold start de JVM de 10–20 s) ou Render (512 MB, insuficiente).
- **Supabase:** projeto gerenciado.
- **Imagens:** multi-arch (amd64/arm64) publicadas no GHCR via GitHub Actions.

## Segurança

- RLS em todas as tabelas com `empresa_id`.
- `service_role` usado só no servidor (rotas de emissão e webhook).
- Certificado e CSC cifrados (AES-256-GCM, chave `NOTALEVE_MASTER_KEY`); auditoria de cada uso do certificado.
- Webhook do Asaas validado pelo token de acesso configurado no painel do Asaas.
- Proxy `/api/rf` com allowlist de rotas, limite de corpo de 500 KB e timeout de 15 s.
