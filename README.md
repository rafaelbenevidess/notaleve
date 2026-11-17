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

## Rodar localmente (tudo em Docker)

Pré-requisitos: **Docker** (com Compose v2), **Node 22+** (para a CLI do Supabase e os scripts) e **Git**. Nada aqui faz transação real: a SEFAZ é simulada (sem valor fiscal) e o Asaas roda em modo simulado (sem cobrança).

```bash
git clone --recurse-submodules https://github.com/rafaelbenevidess/notaleve.git
```

```bash
cd notaleve && npm install
```

```bash
npm run docker
```

Na primeira vez o build demora alguns minutos (compila as calculadoras Java da Receita). Depois abra http://localhost:3000.

| Container | Porta | O que é |
|---|---|---|
| `app` | 3000 | NotaLeve (Next.js) |
| `sefaz-mock` | 8090 | SEFAZ simulada: valida assinatura e chave; notas sem valor fiscal |
| `calc-regime-geral` | 8080 | Calculadora oficial da Receita (Swagger em `/api/swagger-ui.html`) |
| `calc-simples-nacional` | 8082 | Calculadora oficial do Simples Nacional |
| `danfse` | 8081 | Gerador de DANFSe da Receita |
| Supabase (CLI) | 54321/54322 | Banco e login (containers gerenciados pela CLI do Supabase) |

### Roteiro para testar as funções

1. **Criar conta** em http://localhost:3000/cadastro (qualquer e-mail; não há confirmação no local).
2. **Cadastrar a loja**: use um CNPJ válido, por exemplo `11.222.333/0001-81`, UF SP, município São Paulo, regime Simples Nacional.
3. **Certificado de teste**: gere com o CNPJ da loja e envie em *Configurações* (senha `1234`). No CSC, qualquer valor serve (ex.: ID `1`, CSC `TESTE123`).

```bash
npx tsx scripts/certificado-teste.ts 11222333000181 1234 certificado-teste.pfx
```

4. **Produtos**: cadastre, por exemplo, *Camiseta* (NCM `61091000`) e *Calça jeans* (NCM `62034200`). A tela valida NCM e cClassTrib na tabela oficial.
5. **Vender**: monte o carrinho, clique em *Ver impostos: hoje × 2033* e depois em *Finalizar e emitir NFC-e*.
6. **Nota**: na venda, baixe o DANFE (PDF) e o XML e teste o *Cancelar NFC-e*.
7. **Notas, Painel e Assinatura**: inutilização de numeração, exportação mensal dos XMLs, indicadores do mês e o pagamento simulado da assinatura.

Para simular uma **rejeição** da SEFAZ, cadastre um produto com a palavra `REJEITAR` no nome e coloque-o como **2º item** do carrinho (em homologação, a descrição do 1º item é substituída pelo texto obrigatório). O QR Code do DANFE aponta para a SEFAZ simulada.

```bash
npm run docker:parar
```

### Modo desenvolvimento (sem container do app)

`npm run local` sobe as dependências e roda o app com recarga automática (`next dev`).

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
