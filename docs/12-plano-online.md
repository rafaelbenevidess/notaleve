# 12 – Plano para colocar o NotaLeve online

> Documento previsto no plano aprovado ("tudo local primeiro, online depois", ADR-0007). Os arquivos de infraestrutura citados já estão no repositório e foram testados localmente.

## 1. Topologia

```
Lojista ──HTTPS──> Vercel (Next.js, região gru1 / São Paulo)
                     ├── Supabase gerenciado (Auth + Postgres + RLS) — região São Paulo (sa-east-1)
                     ├── Asaas (produção) ──webhook──> /api/webhooks/asaas
                     ├── SEFAZ da UF (mTLS com o A1 do lojista + cadeia ICP-Brasil)
                     └──HTTPS + X-Internal-Key──> VM Oracle Cloud Always Free (São Paulo, ARM)
                                                    Caddy (Let's Encrypt, bloqueio por chave)
                                                    ├── /rg → Calculadora Regime Geral (Receita)
                                                    └── /sn → Calculadora Simples Nacional (Receita)
```

| Peça | Onde | Por quê |
|---|---|---|
| App | Vercel, região `gru1` (`vercel.json`) | Deploy por git, funções Node com mTLS, IP no Brasil |
| Banco/Auth | Supabase gerenciado, São Paulo | Mesmo código e migrações do ambiente local |
| Calculadoras | VM Oracle Always Free (ARM, até 4 vCPU/24 GB) | JVM não roda na Vercel; o Simples Nacional **não existe** na instância piloto da Receita (verificado: 404) |
| Cobrança | Asaas produção | Pix/boleto/cartão |
| Imagens | GHCR (`.github/workflows/imagens.yml`) | amd64 + arm64, sem compilar na VM |

A instância piloto da Receita (`piloto-cbs`) fica como **fallback só para o Regime Geral**: `RF_API_URL=https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api`.

## 2. Custos (referência — confirmar nas páginas oficiais)

| Serviço | Plano | Observação |
|---|---|---|
| Vercel | **Pro** | O plano Hobby é para uso não comercial; um SaaS pago exige Pro |
| Supabase | Free para piloto → Pro em produção | O plano Free pausa projetos inativos e tem limites de backup |
| Oracle Cloud | Always Free | Sujeito à disponibilidade de capacidade ARM na região |
| Asaas | Sem mensalidade | Tarifa por cobrança recebida |
| Domínio | anual | Registro .com.br |
| Certificado A1 | anual, **por lojista** (do próprio lojista) | O NotaLeve não compra certificado para o cliente |

## 3. Passo a passo

### 3.1 Calculadoras na VM Oracle
1. Criar a VM Ampere A1 (Ubuntu) na região São Paulo; liberar portas 80 e 443 na *security list*.
2. Instalar Docker e Docker Compose.
3. Rodar o workflow **Imagens das calculadoras** no GitHub (aba Actions → *Run workflow*) e tornar os pacotes do GHCR públicos, ou fazer `docker login ghcr.io` na VM.
4. Apontar o DNS: registro A `calc.<dominio>` → IP da VM.
5. Na VM:

```bash
git clone https://github.com/rafaelbenevidess/notaleve.git && cd notaleve/infra/producao
```

```bash
cp .env.exemplo .env
```

Edite `.env` (domínio e `RF_INTERNAL_KEY`, gerada com `openssl rand -hex 32`) e suba:

```bash
docker compose up -d
```

6. Conferir: `https://calc.<dominio>/saude` → 200; sem o header `X-Internal-Key` → 403.

### 3.2 Supabase
1. Criar o projeto (região São Paulo) e anotar URL, anon key e service role key.
2. Aplicar as migrações a partir do repositório:

```bash
npx supabase link --project-ref <ref>
```

```bash
npx supabase db push
```

3. Rodar `supabase/tests/rls_isolamento.sql` no banco remoto (é transacional e faz rollback).
4. Em *Auth → URL Configuration*: `site_url` = domínio do app. Ativar a confirmação de e-mail e configurar um SMTP próprio.

### 3.3 Vercel
1. Importar o repositório (framework Next.js). `vercel.json` fixa a região `gru1`.
2. Variáveis de ambiente (Production):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | do projeto Supabase (secreta) |
| `RF_API_URL` | `https://calc.<dominio>/rg` |
| `RF_SN_API_URL` | `https://calc.<dominio>/sn` |
| `RF_INTERNAL_KEY` | mesma da VM |
| `NOTALEVE_MASTER_KEY` | **nova**, `openssl rand -base64 32`, guardada também num cofre (sem ela os certificados ficam ilegíveis) |
| `SEFAZ_MODO` | `real` |
| `SEFAZ_CA_FILE` | caminho do PEM ICP-Brasil versionado em `infra/certs/` (ver T-16) |
| `RESP_TEC_*` | CNPJ e contato da empresa operadora (infRespTec) |
| `ASAAS_API_URL` | `https://api.asaas.com/v3` |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | do painel Asaas |
| `APP_URL` | domínio do app |

### 3.4 Asaas
1. Conta de produção no CNPJ da operadora.
2. Webhook: URL `https://<app>/api/webhooks/asaas`; token = `ASAAS_WEBHOOK_TOKEN`; eventos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`.
3. Testar primeiro no **sandbox** (`https://api-sandbox.asaas.com/v3`) com as mesmas variáveis.

### 3.5 SEFAZ (por UF)
1. A cadeia ICP-Brasil já está em `infra/certs/icp-brasil.pem` (raízes v5/v10/v11/v12 do ITI, validadas contra SP e SVRS). Ao atualizá-la, confira as impressões digitais em `infra/certs/README.md`.
2. Conferir as URLs em `src/lib/fiscal/webservices.ts` contra a relação do Portal Nacional da NF-e.
3. Com o A1 e o CSC de **homologação** de um CNPJ real:

```bash
SEFAZ_CA_FILE=infra/certs/icp-brasil.pem npx tsx scripts/validar-homologacao.mts --pfx certificado.pfx --senha SENHA --uf SP --ie IE --csc-id 1 --csc CSC
```

4. Com sucesso, marcar `conferido: true` e cadastrar as URLs de produção (`producao`).
5. As empresas começam em `ambiente = 'homologacao'`. A virada para produção é por empresa, depois da primeira emissão de teste bem-sucedida dela.

## 4. Checklist de go-live

- [ ] `npm run test:tudo` verde no commit a publicar; CI verde
- [ ] VM: `/saude` 200, 403 sem chave, versão das calculadoras conferida (`scripts/comparar-piloto.mts`)
- [ ] Supabase: migrações aplicadas, teste RLS ok, backups ativos
- [ ] Vercel: variáveis conferidas; `NOTALEVE_MASTER_KEY` guardada em cofre
- [ ] Asaas sandbox → produção; webhook testado (pagamento, atraso, cancelamento)
- [ ] Homologação SEFAZ validada na UF piloto (P-04)
- [ ] Termos/LGPD revisados (P-06/P-13); CNPJ operador no infRespTec (P-05)
- [ ] Monitoramento: alertas de erro da Vercel, uptime de `/saude` e do app

## 5. Operação

- **Atualizar as calculadoras:** atualizar a tag do submódulo → workflow de imagens → na VM, `TAG=<nova> docker compose up -d`. Rodar `scripts/comparar-piloto.mts`; a instância piloto já está na 1.7.0 (V0073), à frente do código público 1.6.1 (V0059).
- **Rotacionar `RF_INTERNAL_KEY`:** alterar na VM e na Vercel ao mesmo tempo.
- **Rotacionar `NOTALEVE_MASTER_KEY`:** exige script de recifragem (pendência P-15).
- **Backup:** Supabase (diário) + exportação mensal dos XMLs pelos lojistas. A guarda dos XMLs por 5 anos é obrigação do emitente; o NotaLeve mantém cópia.
- **Rollback:** Vercel (promover o deploy anterior); VM (voltar a `TAG` anterior); banco (migrações só aditivas).
