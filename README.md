# NotaLeve

**SaaS de vendas e emissão de NFC-e para o pequeno comércio, já no modelo da Reforma Tributária (CBS / IBS / IS).**

O lojista (ex.: loja de roupas) assina a plataforma, cadastra produtos, registra vendas e emite a nota fiscal.
Em cada venda, o NotaLeve mostra o imposto em **dois modos lado a lado**:

| Modo | O que é | Para que serve |
|---|---|---|
| **Hoje** | Regras vigentes na transição (Simples Nacional/DAS ou ICMS + PIS/COFINS, com o grupo IBS/CBS da NT 2025.002) | É o que vai na nota real |
| **Reforma completa (2033)** | Só CBS + IBS + IS, calculados pelas calculadoras oficiais da Receita | Antecipar o impacto em preço e margem |

Os cálculos usam as **calculadoras oficiais de código aberto da Receita Federal** ([github.com/ReceitaFederal](https://github.com/ReceitaFederal), licença MIT), executadas por nós em containers. A NFC-e é emitida **direto na SEFAZ**, com o certificado A1 do lojista, sem intermediário pago.

> **Status (2026-11-17): MVP completo rodando 100% local.** Jornada inteira testada de ponta a ponta (cadastro → loja → certificado → produtos → venda com comparativo → NFC-e autorizada → DANFE → cancelamento → assinatura), no desktop e no celular. A emissão real em homologação de uma SEFAZ depende de certificado A1 + CSC de um CNPJ real (ver [pendências](docs/11-pendencias.md)) e já está a um comando de distância (`scripts/validar-homologacao.mts`); localmente usamos uma SEFAZ simulada que valida assinatura e chave de verdade. As calculadoras locais foram comparadas com a instância oficial da Receita: valores idênticos.

## O que o MVP faz

- **Conta e assinatura:** cadastro/login (Supabase Auth), teste grátis de 14 dias, cobrança mensal via Asaas (modo simulado sem chave de API), bloqueio por inadimplência.
- **Loja:** onboarding com UF/município da tabela oficial; regime (Simples, normal, MEI); certificado A1 e CSC guardados cifrados (AES-256-GCM).
- **Produtos:** NCM e cClassTrib validados nas tabelas oficiais da Receita (evita a rejeição REG-011); importação por CSV.
- **PDV:** carrinho no celular, Pix/cartão/dinheiro com troco, comparativo "hoje × 2033" antes de finalizar.
- **NFC-e:** XML 4.00 com o grupo IBSCBS **gerado pela calculadora oficial**, validado no **XSD oficial**, assinado (XMLDSig), QR Code v2, autorização, cancelamento, inutilização e DANFE 80 mm em PDF.
- **Painel e contador:** faturamento, tributos do mês nos dois modos, mais vendidos, exportação mensal dos XMLs (zip).

## Rodar localmente

Pré-requisitos: Node 22+, Docker com Compose v2 e Git.

```bash
git clone --recurse-submodules https://github.com/rafaelbenevidess/notaleve.git
```

```bash
cd notaleve && npm install
```

```bash
npm run local
```

O `npm run local` sobe as calculadoras da Receita, o Supabase local, a SEFAZ simulada e o app em http://localhost:3000. Para testar a emissão, gere um certificado A1 de teste com o CNPJ da sua loja de teste e envie em **Configurações** (a senha é o 2º argumento; qualquer CSC serve na SEFAZ simulada):

```bash
npm run cert:teste -- 11222333000181 1234 certificado-teste.pfx
```

| Serviço | URL |
|---|---|
| App NotaLeve | http://localhost:3000 |
| Calculadora Regime Geral (Receita) | http://localhost:8080/api/swagger-ui.html |
| Calculadora Simples Nacional (Receita) | http://localhost:8082/api/swagger-ui.html |
| Gerador DANFSe (Receita) | http://localhost:8081/api/swagger-ui |
| Supabase (API) | http://127.0.0.1:54321 |
| SEFAZ simulada | http://localhost:8090 |

## Testes

```bash
npm run test:tudo
```

| Suíte | Comando | O que cobre |
|---|---|---|
| Unitários + integração | `npm test` | Simples Anexo I, modo hoje, modo 2033 contra as calculadoras locais, certificado, chave, XML no XSD oficial, autorização/cancelamento/inutilização na SEFAZ simulada |
| Isolamento multiempresa | `npm run test:rls` | Uma loja não lê nem altera dados de outra; segredos ilegíveis pelo cliente |
| E2E (Playwright) | `npm run test:e2e` | Jornada completa no desktop e no celular |

Se algo falhar, veja [09 – Troubleshooting](docs/09-troubleshooting.md).

## Mapa da documentação

| Documento | Conteúdo |
|---|---|
| [01 – Visão do produto](docs/01-visao-produto.md) | Problema, público, proposta de valor, modelo comercial |
| [02 – Requisitos](docs/02-requisitos.md) | Requisitos funcionais e não funcionais numerados |
| [03 – Arquitetura](docs/03-arquitetura.md) | Componentes, fluxos, ambiente local e futuro online |
| [04 – Modelo de dados](docs/04-modelo-dados.md) | Tabelas, relacionamentos, RLS multiempresa |
| [05 – Motor tributário](docs/05-motor-tributario.md) | Cálculo dual "hoje × 2033", uso das APIs, lacunas |
| [06 – Emissão de NFC-e](docs/06-emissao-nfce.md) | Integração direta com SEFAZ, fluxo, "ponte" nacional |
| [07 – APIs da Receita](docs/07-apis-receita.md) | Repositórios, versões, endpoints, achados |
| [08 – Roadmap](docs/08-roadmap.md) | Fases, status e critérios de pronto |
| [09 – Troubleshooting](docs/09-troubleshooting.md) | **Erros conhecidos, causas e soluções** |
| [10 – Glossário](docs/10-glossario.md) | Siglas fiscais e técnicas |
| [11 – Pendências](docs/11-pendencias.md) | O que depende de decisão ou ação externa |
| [12 – Plano online](docs/12-plano-online.md) | Como colocar em produção (Vercel + Supabase + VM Oracle + Asaas + SEFAZ) |
| [ADRs](docs/adr/README.md) | Registro de decisões |
| [CHANGELOG](CHANGELOG.md) | Histórico de mudanças |

## Estrutura do repositório

```
notaleve/
├── src/
│   ├── app/                 páginas (Next.js 16), Server Actions (acoes/) e rotas de API (api/)
│   ├── components/          UI: PDV, comparativo, formulários
│   └── lib/
│       ├── tributos/        motor dual (hoje × 2033) e Simples Anexo I
│       ├── fiscal/          certificado, chave, XML NFC-e, assinatura, QR Code, SEFAZ, DANFE
│       ├── receita/         cliente das calculadoras oficiais
│       ├── asaas/           assinatura e webhook
│       ├── cripto/          cifra de segredos (AES-256-GCM)
│       └── supabase/        clientes e tipos do banco
├── supabase/migrations/     esquema + RLS;  supabase/tests/ teste de isolamento
├── infra/receita/           Docker das calculadoras da Receita (submódulos em vendor/)
├── infra/sefaz-mock/        SEFAZ simulada
├── scripts/                 subir ambiente, certificado de teste, simular webhook
├── tests/                   unit/, integracao/, e2e/
└── docs/                    documentação e ADRs
```

## Licenças

O código do NotaLeve é proprietário. O repositório é público para consulta, mas, sem arquivo de licença, todos os direitos ficam reservados ao autor. Os submódulos em `infra/receita/vendor/` pertencem à Receita Federal do Brasil, sob licença MIT, e são usados sem modificação.
