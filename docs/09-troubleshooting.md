# 09 – Troubleshooting (erros conhecidos e soluções)

Cada problema tem um ID (`T-xx`) para ser citado em issues e commits. Ao resolver um bug novo, **adicione-o aqui** com sintoma, causa e solução.

## Infraestrutura / build

### T-01 — `failed to connect to the docker API at unix:///var/run/docker.sock`
- **Causa:** o daemon do Docker não está rodando (comum em containers/CI).
- **Solução:** iniciar o daemon. Em Linux sem systemd, rode-o em segundo plano com `nohup dockerd > dockerd.log 2>&1 &`. Com systemd:

```bash
sudo systemctl start docker
```

### T-02 — Maven: `PKIX path building failed ... unable to find valid certification path`
- **Causa:** rede com proxy que intercepta TLS. A JVM do container de build não confia na CA do proxy. Detalhe: o `keytool -importcert` importa **só o primeiro** certificado de um arquivo com vários (bundle).
- **Solução:** passar a CA como secret de build. O `Dockerfile.java` divide o bundle e importa cada certificado:

```bash
docker build --secret id=ca,src=/caminho/ca-bundle.crt -f infra/receita/Dockerfile.java --target regime-geral infra/receita
```

Se o proxy estiver em `127.0.0.1`, acrescente `--network host --build-arg HTTPS_PROXY=$HTTPS_PROXY` e `--build-arg "JAVA_TOOL_OPTIONS=-Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=<porta>"`.

### T-03 — Dockerfile oficial do DANFSe: `apk update ... exit code: 2`
- **Causa:** mesma do T-02. A imagem Alpine do estágio final não confia na CA do proxy.
- **Solução:** usar `infra/receita/Dockerfile.danfse` (equivalente, aceita `--secret id=ca`, runtime distroless sem `apk`).

### T-04 — Build do Regime Geral falhou uma vez e passou na segunda
- **Causa provável:** falha transitória de rede ao baixar dependências Maven.
- **Solução:** repetir o build. O cache `--mount=type=cache,target=/root/.m2` evita baixar tudo de novo.

### T-05 — Calculadora não inicia: banco não encontrado
- **Causa:** o perfil `offline` exige `./calculadora/db/calculadora-pro.db` (somente leitura).
- **Solução:** a imagem já gera e copia o banco para `/app/calculadora/db/`. Fora do Docker, rodar na raiz do repo oficial:

```bash
mkdir -p calculadora/db && ./mvnw flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf
```

### T-06 — Simples Nacional sem pasta `flyway/`
- **Causa:** o repo do SN não publica as migrações, e o README aponta para o próprio repo, por engano.
- **Solução:** usar o banco gerado a partir do **Regime Geral**, que contém as tabelas do SN (V0047, V0050, V0051). Já é o que o `Dockerfile.java` faz. Se `DB_DOWNLOAD_URL` estiver definida, o SN tenta baixar o banco dessa URL.

## Calculadoras: erros de negócio

| Código | Significado | Como resolver no NotaLeve |
|---|---|---|
| **REG-011** | NCM não vinculada à cClassTrib | Sugerir só cClassTrib compatíveis (`ncm-aplicavel`) |
| HTTP 422 em `/regime-geral` | Qualquer item inválido derruba a operação inteira | Usar sempre `/observabilidade/regime-geral` |
| `x-warning-dados-simulados` | Alíquotas informadas (a partir de 2027): resultado `CALCULO_SIMULADO` | Mostrar como simulação + premissas |
| **VSN-003** | `valorImpostoSeletivo` obrigatório (mesmo que 0) | Enviar `"0.00"` quando não houver IS |
| **VSN-018** | `tpRegimeIBSCBS` incompatível com o CRT (regra C21a-10 da NT 2026.005); valor 2 só com CRT 3 | Não enviar `tpRegimeIBSCBS` para CRT 1/2 |
| **VSN-019** | Optante pelo regime regular de IBS/CBS (`tpRegimeIBSCBS=1`) está fora do escopo do SN | Encaminhar para a calculadora do Regime Geral |

Descrição de qualquer código:
- Regime Geral: `GET /api/calculadora/observabilidade/erros?codigo=REG-011`
- Simples Nacional: `GET /api/calculadora/observabilidade/simples-nacional/erros?codigo=VSN-001`

## Ambiente de desenvolvimento desta sessão (cloud)
- **T-07:** hosts `*.gov.br`, `sebrae.com.br` e `google.com` bloqueados pela política de rede da sessão. É preciso liberá-los nas configurações do ambiente. Não afeta a máquina local do desenvolvedor.
- **T-08:** a sessão não consegue criar repositórios nem alterar configurações (ex.: visibilidade) no GitHub. Essas ações são feitas pelo dono da conta na interface do GitHub.

## Como reportar um bug
Abra uma issue com o modelo `.github/ISSUE_TEMPLATE/bug.md`. Para bugs de cálculo, anexe o `request`/`response` do registro em `calculos` e a versão do motor (`motor`). Para bugs de emissão, anexe `c_stat`, `x_motivo` e o XML de `nota_eventos`, **sem** dados do certificado.
