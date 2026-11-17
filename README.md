# NotaLeve

**SaaS de vendas e emissão de NFC-e para o pequeno comércio, já no modelo da Reforma Tributária (CBS / IBS / IS).**

O lojista (ex.: loja de roupas) assina a plataforma, cadastra produtos, registra vendas e emite a nota fiscal.
Em cada venda, o NotaLeve mostra o imposto em **dois modos lado a lado**:

| Modo | O que é | Para que serve |
|---|---|---|
| **Hoje** | Regras vigentes na transição (ICMS/CSOSN + grupo IBS/CBS da NT 2025.002) | É o que vai na nota real |
| **Reforma completa (2033)** | Só CBS + IBS + IS, pelas regras da LC 214/2025 | Antecipar impacto em preço e margem |

Os cálculos usam as **calculadoras oficiais de código aberto da Receita Federal** ([github.com/ReceitaFederal](https://github.com/ReceitaFederal), licença MIT), executadas por nós em containers. A NFC-e é emitida **direto na SEFAZ**, com o certificado A1 do lojista, sem intermediário pago.

> **Status (2026-11-17):** fase de testes **100% local**. As APIs da Receita já sobem via Docker e foram validadas com os exemplos oficiais. O app web (Next.js + Supabase + Asaas) ainda não começou. Veja o [roadmap](docs/08-roadmap.md).

## Mapa da documentação

| Documento | Conteúdo |
|---|---|
| [01 – Visão do produto](docs/01-visao-produto.md) | Problema, público, proposta de valor, modelo comercial |
| [02 – Requisitos](docs/02-requisitos.md) | Requisitos funcionais e não funcionais numerados |
| [03 – Arquitetura](docs/03-arquitetura.md) | Componentes, fluxos, ambiente local e futuro online |
| [04 – Modelo de dados](docs/04-modelo-dados.md) | Tabelas, relacionamentos, RLS multiempresa |
| [05 – Motor tributário](docs/05-motor-tributario.md) | Cálculo dual "hoje × 2033", uso das APIs, lacunas |
| [06 – Emissão de NFC-e](docs/06-emissao-nfce.md) | Integração direta com SEFAZ, requisitos, fluxo, "ponte" nacional |
| [07 – APIs da Receita](docs/07-apis-receita.md) | Repositórios, versões, endpoints, como subir, achados |
| [08 – Roadmap](docs/08-roadmap.md) | Fases, status e critérios de pronto |
| [09 – Troubleshooting](docs/09-troubleshooting.md) | **Erros conhecidos, causas e soluções** |
| [10 – Glossário](docs/10-glossario.md) | Siglas fiscais e técnicas |
| [11 – Pendências e decisões em aberto](docs/11-pendencias.md) | O que depende de decisão ou ação externa |
| [ADRs](docs/adr/README.md) | Registro de decisões de arquitetura e produto |
| [CHANGELOG](CHANGELOG.md) | Histórico de mudanças |

## Rodar localmente (o que já existe)

Pré-requisitos: Docker com Compose v2 e Git.

```bash
git clone --recurse-submodules <url-do-repo> notaleve
```

```bash
cd notaleve && docker compose -f infra/receita/docker-compose.yml up -d --build
```

| Serviço | URL | Swagger |
|---|---|---|
| Calculadora Regime Geral (Receita) | http://localhost:8080/api | http://localhost:8080/api/swagger-ui.html |
| Calculadora Simples Nacional (Receita) | http://localhost:8082/api | http://localhost:8082/api/swagger-ui.html |
| Gerador DANFSe (Receita) | http://localhost:8081/api/danfse | http://localhost:8081/api/swagger-ui |

Teste rápido com o exemplo oficial:

```bash
curl -s -X POST localhost:8080/api/calculadora/observabilidade/regime-geral -H 'Content-Type: application/json' -d @infra/receita/fixtures/operacao-exemplo.json
```

Se o build falhar, veja [09 – Troubleshooting](docs/09-troubleshooting.md).

## Estrutura do repositório

```
notaleve/
├── README.md, CHANGELOG.md
├── docs/                      documentação (este mapa)
│   └── adr/                   decisões registradas
├── infra/receita/
│   ├── docker-compose.yml     sobe as 3 APIs da Receita
│   ├── Dockerfile.java        Regime Geral e Simples Nacional (gera o banco SQLite no build)
│   ├── Dockerfile.danfse      DANFSe (Go) + exportação do WASM
│   ├── fixtures/              requisições/respostas de referência
│   └── vendor/                submódulos git dos repos oficiais (não editar)
└── .github/ISSUE_TEMPLATE/    modelos de bug e decisão
```

## Licenças

O código do NotaLeve é proprietário (repositório privado). Os submódulos em `infra/receita/vendor/` pertencem à Receita Federal do Brasil, sob licença MIT. Eles são usados sem modificação.
