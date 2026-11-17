# 11 – Pendências e decisões em aberto

| ID | Pendência | Responsável | Bloqueia |
|---|---|---|---|
| P-01 | ~~Criar repositório `notaleve` no GitHub~~ ✅ criado (público por decisão do dono, 2026-11-17) | Dono da conta | — |
| P-02 | ~~Liberar rede na sessão~~ ✅ ambiente "notaleve" criado com piloto-cbs, Portal NF-e e homologação SP/SVRS (2026-11-17). Pendente só o repositório do ITI (cadeia ICP-Brasil, T-16) — Liberar rede: `piloto-cbs.tributos.gov.br`, `www.nfe.fazenda.gov.br`, homologação da UF piloto (e `sebrae.com.br` se houver nova pesquisa) | Dono da conta | Fase 0B, 4 |
| P-03 | Escolher a **UF piloto** | Produto | Fase 4 |
| P-04 | **Certificado A1 (e-CNPJ) de um CNPJ real** + IE habilitada para NFC-e + CSC de homologação. O dono **ainda não tem A1** (2026-11-17). Não existe ambiente de testes das SEFAZ sem certificado: até a homologação exige mTLS com A1 ICP-Brasil. Caminho: comprar um e-CNPJ A1 numa autoridade certificadora (validade de 1 ano) para o CNPJ da operadora ou de um lojista parceiro, e rodar `scripts/validar-homologacao.mts`. Até lá, tudo funciona com a SEFAZ simulada | Produto | Homologação real |
| P-05 | CNPJ da empresa operadora do NotaLeve (infRespTec, Asaas) | Jurídico | Fase 4, cobrança real |
| P-06 | Termos de uso, política de privacidade (LGPD), contrato de guarda de certificado | Jurídico | Lançamento |
| P-07 | Validar com contador a regra de alíquota efetiva do Simples + partilha IBS/CBS (lacuna L-01) | Produto + contador | Fase 3 |
| P-08 | Definir premissas de alíquotas para o cenário 2033 (lacuna L-02) | Produto | Fase 3 |
| P-09 | Preço final do plano (proposta R$ 49–79/mês) | Comercial | Lançamento |
| P-10 | Verificar marca "NotaLeve" (INPI) e domínio | Comercial | Lançamento |
| P-11 | ~~Biblioteca de NF-e vs. módulo próprio~~ ✅ módulo próprio (`src/lib/fiscal`, com xml-crypto + node-forge), validado no XSD oficial | Técnico | — |
| P-12 | ~~Plano online~~ ✅ [12-plano-online.md](12-plano-online.md) + `infra/producao/` + workflows | Técnico | — |
| P-13 | Revisão jurídica do rascunho de termos/privacidade em `/termos` | Jurídico | Lançamento |
| P-14 | Conta Asaas (sandbox → produção), `ASAAS_API_KEY` e token do webhook | Comercial | Cobrança real |
| P-15 | Script de rotação da `NOTALEVE_MASTER_KEY` (recifrar certificados e CSC) | Técnico | Antes de produção |
| P-16 | Baixar a cadeia ICP-Brasil (ITI) para `infra/certs/icp-brasil.pem` | Técnico | Homologação real |
