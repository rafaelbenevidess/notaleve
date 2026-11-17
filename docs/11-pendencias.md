# 11 – Pendências e decisões em aberto

| ID | Pendência | Responsável | Bloqueia |
|---|---|---|---|
| P-01 | ~~Criar repositório `notaleve` no GitHub~~ ✅ criado (público por decisão do dono, 2026-11-17) | Dono da conta | — |
| P-02 | Liberar rede: `piloto-cbs.tributos.gov.br`, `www.nfe.fazenda.gov.br`, homologação da UF piloto (e `sebrae.com.br` se houver nova pesquisa) | Dono da conta | Fase 0B, 4 |
| P-03 | Escolher a **UF piloto** | Produto | Fase 4 |
| P-04 | Certificado A1 de teste + CSC de homologação de um CNPJ real | Produto | Fase 4 |
| P-05 | CNPJ da empresa operadora do NotaLeve (infRespTec, Asaas) | Jurídico | Fase 4, cobrança real |
| P-06 | Termos de uso, política de privacidade (LGPD), contrato de guarda de certificado | Jurídico | Lançamento |
| P-07 | Validar com contador a regra de alíquota efetiva do Simples + partilha IBS/CBS (lacuna L-01) | Produto + contador | Fase 3 |
| P-08 | Definir premissas de alíquotas para o cenário 2033 (lacuna L-02) | Produto | Fase 3 |
| P-09 | Preço final do plano (proposta R$ 49–79/mês) | Comercial | Lançamento |
| P-10 | Verificar marca "NotaLeve" (INPI) e domínio | Comercial | Lançamento |
| P-11 | ~~Biblioteca de NF-e vs. módulo próprio~~ ✅ módulo próprio (`src/lib/fiscal`, com xml-crypto + node-forge), validado no XSD oficial | Técnico | — |
| P-12 | Plano "online" (Vercel + Oracle SP + Supabase gerenciado) | Técnico | Produção |
| P-13 | Revisão jurídica do rascunho de termos/privacidade em `/termos` | Jurídico | Lançamento |
| P-14 | Conta Asaas (sandbox → produção), `ASAAS_API_KEY` e token do webhook | Comercial | Cobrança real |
