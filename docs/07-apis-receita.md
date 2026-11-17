# 07 – APIs da Receita Federal

Anúncio oficial: "Receita Federal publica primeiro código-fonte aberto no GitHub e amplia transparência da Reforma Tributária" (gov.br, nov/2026). Organização: <https://github.com/ReceitaFederal>. Licença **MIT** (Copyright 2026 Receita Federal do Brasil). O código é do SERPRO (`br.gov.serpro.rtc`).

## Repositórios e versões fixadas

| Repo | Tag fixada | Commit | Stack | Porta local |
|---|---|---|---|---|
| calculadora-rtc-regime-regular | 1.6.1 | 150cccb | Java 21, Spring Boot 3.5.16, SQLite, Flyway, Springdoc | 8080 |
| calculadora-rtc-simples-nacional | 0.0.6 | c5b0f01 | Java 21, Spring Boot 3.5.16, SQLite | 8082 |
| calculadora-rtc-gerador-danfse | 1.0.0 | 8d79e6b | Go 1.27, Echo v5, folio (PDF), WASM | 8081 |

Submódulos em `infra/receita/vendor/`. **Não editar.** Para atualizar:

```bash
git -C infra/receita/vendor/calculadora-rtc-regime-regular fetch --tags && git -C infra/receita/vendor/calculadora-rtc-regime-regular checkout <nova-tag>
```

Depois: rebuild, rodar os fixtures, atualizar esta tabela e o CHANGELOG.

## Instância online oficial

`https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/calculadora/...`, referenciada em `application-offline.yml` para checagem de versão (`/dados-abertos/versao`). É um **piloto sem SLA**. Fica como opção/fallback via `RF_API_URL` e como referência para o teste de comparação. Não foi testada a partir deste ambiente porque o host está bloqueado pela rede da sessão.

## Endpoints usados pelo NotaLeve

Base Regime Geral: `http://localhost:8080/api/calculadora`

| Uso | Endpoint |
|---|---|
| Cálculo 2033 (regime normal) | `POST /observabilidade/regime-geral` |
| Descrição de erro | `GET /observabilidade/erros?codigo=REG-011` |
| UFs / municípios | `GET /dados-abertos/ufs`, `GET /dados-abertos/ufs/municipios` |
| NCM / NBS | `GET /dados-abertos/ncm?ncm=&data=`, `GET /dados-abertos/ncm/vigentes`, `GET /dados-abertos/nbs` |
| cClassTrib por NCM | `GET /dados-abertos/classificacoes-tributarias/ncm-aplicavel` |
| Detalhe cClassTrib | `GET /dados-abertos/classificacoes-tributarias/cbs-ibs/class-trib/{cClassTrib}?data=` |
| CST | `GET /dados-abertos/situacoes-tributarias/cbs-ibs` |
| Fundamentação legal | `GET /dados-abertos/fundamentacoes-legais?data=` |
| Alíquotas de referência (só 2026) | `GET /dados-abertos/aliquota-uniao`, `/aliquota-uf?codigoUf=`, `/aliquota-municipio` |
| Base de cálculo unificada | `POST /base-calculo/base-calculo-unificada` |
| XML do grupo / validação XSD | `POST /xml/generate?tipo=nfce`, `POST /xml/validate?tipo=nfce&subtipo=grupo` |
| Versão da base | `GET /dados-abertos/versao` |

Base Simples Nacional: `http://localhost:8082/api`

| Uso | Endpoint |
|---|---|
| Cálculo 2033 (optante) | `POST /calculadora/observabilidade/simples-nacional` |
| Erro | `GET /calculadora/observabilidade/simples-nacional/erros?codigo=VSN-001` |
| Atividades do SN | `GET /calculadora/simples-nacional/atividades?data=AAAA-MM-DD` (15 atividades; "01" = revenda de mercadorias, anexo I, docs 55/65) |
| Versão | `GET /versao` |

DANFSe: `POST http://localhost:8081/api/danfse` (XML da NFS-e → PDF). Versão WASM: `window.danfseWasm.gerarPdf(JSON{xml, stc, canhoto})`, exportada com `docker build --target wasm`.

## Como as imagens são construídas

- **`Dockerfile.java`:** estágio `db` roda `./mvnw flyway:migrate` com as 62 migrações de `calculadora-rtc-regime-regular/flyway/sql` e gera `calculadora-pro.db` (cerca de 5,3 MB). Os estágios `build-*` fazem `./mvnw package -DskipTests`. O runtime JRE 21 roda com o perfil `offline`, com o banco somente leitura em `/app/calculadora/db/`.
- O **Simples Nacional usa o mesmo banco** do Regime Geral: as migrações V0047, V0050 e V0051 contêm as tabelas do SN. O repo do SN não traz `flyway/` (ver [09](09-troubleshooting.md) T-06).
- **`Dockerfile.danfse`:** equivalente ao oficial, com CA opcional, runtime distroless e alvo `wasm` para exportar `danfse.wasm` + `wasm_exec.js`.
- Ambos aceitam `--secret id=ca,src=<ca.crt>` para redes com proxy TLS (opcional).

## Observações sobre os repositórios oficiais

- O `docs/exemplos.md` do repo do Simples Nacional é **cópia** do Regime Geral; os exemplos reais do SN estão em `infra/receita/fixtures/`.
- O README do SN manda copiar `flyway/` "do repositório do simples nacional", que não tem essa pasta. O correto é o do Regime Geral.
- O README do SN diz que a porta é 8080, mas a configuração usa **8082**.
- O Regime Geral exige `aliquotasNominais` a partir de 2027 e não aceita antes disso.
