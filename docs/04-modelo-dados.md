# 04 – Modelo de dados (Supabase / Postgres)

> Implementado em `supabase/migrations/20261117000001_esquema_inicial.sql`; tipos gerados em `src/lib/supabase/database.types.ts` (`npm run db:tipos`). Toda tabela com `empresa_id` tem RLS. Segredos (cifrados) e XMLs ficam no Postgres ([ADR-0012](adr/0012-segredos-e-xml-no-postgres.md)).
>
> Funções: `criar_empresa()` (empresa + dono + trial, atômico), `reservar_numero_nfce()` (só servidor), `empresa_pode_operar()`, `minhas_empresas()`; trigger de número sequencial de venda por empresa; tabela `auditoria` registra todo uso do certificado.

```
auth.users ─┐
            └─< membros >── empresas ──< certificados
                               │
                               ├──< produtos
                               ├──< vendas ──< venda_itens
                               │      ├──< venda_pagamentos
                               │      ├──< calculos (modo hoje | 2033)
                               │      └──< notas ──< nota_eventos
                               └──1 assinaturas
```

## Tabelas

### empresas
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| cnpj | char(14) unique | |
| razao_social, nome_fantasia | text | |
| ie | text | inscrição estadual |
| uf | char(2) | UF piloto no MVP |
| municipio_ibge | int | código IBGE (7 dígitos) |
| crt | smallint | 1 SN, 2 SN excesso, 3 Normal, 4 MEI |
| tp_regime_ibscbs | smallint null | NT 2026.005 (1 regular, 2 "por fora", só com CRT 3) |
| c_ativ_sn | char(2) null | atividade do Simples (ex. "01") |
| rbt12 | numeric(14,2) null | receita bruta dos últimos 12 meses (alíquota efetiva SN) |
| csc_cifrado, csc_id | bytea, text | QR Code NFC-e |
| nfce_serie, nfce_proximo_numero | int | |
| ambiente | text | `homologacao` \| `producao` |
| criado_em | timestamptz | |

### membros
`user_id uuid → auth.users`, `empresa_id`, `papel` (`dono` | `vendedor`), PK composta.

### certificados
`id`, `empresa_id`, `storage_path` (pfx **cifrado**), `senha_cifrada`, `cn`, `cnpj`, `valido_ate`, `fingerprint_sha256`, `ativo`.

### produtos
`id`, `empresa_id`, `nome`, `sku`, `ean`, `ncm char(8)`, `cest`, `unidade`, `preco numeric(14,2)`, `cfop`, `csosn`, `cst_ibscbs char(3)`, `cclasstrib char(6)`, `ativo`.

### vendas / venda_itens / venda_pagamentos
- `vendas`: `id`, `empresa_id`, `numero`, `data_hora`, `vendedor_id`, `total_bruto`, `desconto`, `total`, `status` (`aberta`, `concluida`, `cancelada`).
- `venda_itens`: `venda_id`, `numero_item`, `produto_id`, snapshot de `ncm`/`cclasstrib`/`preco`, `quantidade`, `desconto`, `total`.
- `venda_pagamentos`: `venda_id`, `meio` (tPag), `valor`.

### calculos
`id`, `venda_id`, `modo` (`hoje` | `2033`), `motor` (`receita-rg@1.6.1`, `receita-sn@0.0.6`, `local-hoje@<versao>`), `request jsonb`, `response jsonb`, `total_tributos`, `carga_efetiva_pct`, `criado_em`.
Guardar request/response com a versão do motor permite **reproduzir e depurar** qualquer cálculo.

### notas / nota_eventos
- `notas`: `id`, `empresa_id`, `venda_id`, `modelo` (65), `serie`, `numero`, `chave char(44)`, `status` (`rascunho`, `enviada`, `autorizada`, `rejeitada`, `cancelada`, `inutilizada`), `c_stat`, `x_motivo`, `protocolo`, `xml_path`, `danfe_path`, `ambiente`, `emitida_em`.
- `nota_eventos`: `nota_id`, `tipo` (`autorizacao`, `cancelamento`, `inutilizacao`), `request_xml_path`, `response_xml_path`, `c_stat`, `x_motivo`, `criado_em`. Serve de trilha de auditoria e para depurar rejeições.

### assinaturas
`empresa_id`, `asaas_customer_id`, `asaas_subscription_id`, `plano`, `status` (`trial`, `ativa`, `inadimplente`, `cancelada`), `trial_ate`, `proximo_vencimento`, `atualizado_em`.

## Políticas RLS (padrão)

```sql
-- exemplo para produtos; replicar para todas as tabelas com empresa_id
create policy "membros acessam a propria empresa" on produtos
  for all using (empresa_id in (select empresa_id from membros where user_id = auth.uid()))
  with check (empresa_id in (select empresa_id from membros where user_id = auth.uid()));
```
- `certificados.senha_cifrada` e `empresas.csc_cifrado` **não** são expostos ao cliente: leitura só via `service_role` no servidor.
- Teste obrigatório: o usuário da empresa A não lê nem escreve na empresa B.
