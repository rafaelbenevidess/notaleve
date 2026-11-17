-- NotaLeve — esquema inicial (ver docs/04-modelo-dados.md)
-- Multiempresa com RLS: todo dado de negócio pertence a uma empresa e só é
-- visível para membros dessa empresa. Segredos (pfx, senha, CSC) nunca são
-- legíveis pelo cliente: só pelo servidor com service_role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- empresas
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  cnpj char(14) not null unique check (cnpj ~ '^[0-9]{14}$'),
  razao_social text not null,
  nome_fantasia text,
  ie text not null,
  uf char(2) not null,
  municipio_ibge int not null,
  municipio_nome text not null,
  logradouro text not null default '',
  numero text not null default 'S/N',
  bairro text not null default '',
  cep char(8) not null default '00000000',
  crt smallint not null check (crt in (1, 2, 3, 4)),
  tp_regime_ibscbs smallint check (tp_regime_ibscbs in (1, 2)),
  c_ativ_sn char(2),
  rbt12 numeric(14, 2),
  csc_cifrado text,               -- AES-256-GCM (base64); nunca exposto ao cliente
  csc_id text,
  nfce_serie int not null default 1,
  nfce_proximo_numero int not null default 1,
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- membros
create table public.membros (
  user_id uuid not null references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'vendedor')),
  criado_em timestamptz not null default now(),
  primary key (user_id, empresa_id)
);
create index on public.membros (empresa_id);

-- Empresas do usuário logado (security definer evita recursão de RLS em membros)
create or replace function public.minhas_empresas()
returns setof uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.membros where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------- certificados
create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  pfx_cifrado text not null,      -- AES-256-GCM (base64)
  senha_cifrada text not null,    -- AES-256-GCM (base64)
  cn text not null,
  cnpj char(14),
  valido_de timestamptz not null,
  valido_ate timestamptz not null,
  fingerprint_sha256 text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index on public.certificados (empresa_id) where ativo;

-- ---------------------------------------------------------------- produtos
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  sku text,
  ean text,
  ncm char(8) not null check (ncm ~ '^[0-9]{8}$'),
  cest text,
  unidade text not null default 'UN',
  preco numeric(14, 2) not null check (preco >= 0),
  cfop char(4) not null default '5102',
  csosn char(3) not null default '102',
  cst_ibscbs char(3) not null default '000',
  cclasstrib char(6) not null default '000001',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (empresa_id, sku)
);
create index on public.produtos (empresa_id, nome);

-- ---------------------------------------------------------------- vendas
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  numero int not null,
  data_hora timestamptz not null default now(),
  vendedor_id uuid references auth.users (id),
  total_bruto numeric(14, 2) not null default 0,
  desconto numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  status text not null default 'concluida' check (status in ('aberta', 'concluida', 'cancelada')),
  criado_em timestamptz not null default now(),
  unique (empresa_id, numero)
);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  numero_item int not null,
  produto_id uuid references public.produtos (id),
  descricao text not null,
  ncm char(8) not null,
  cfop char(4) not null,
  csosn char(3) not null,
  cst_ibscbs char(3) not null,
  cclasstrib char(6) not null,
  unidade text not null,
  quantidade numeric(14, 4) not null check (quantidade > 0),
  preco_unitario numeric(14, 2) not null,
  desconto numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  unique (venda_id, numero_item)
);

create table public.venda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  meio char(2) not null,          -- tPag NFC-e: 01 dinheiro, 03 crédito, 04 débito, 17 Pix
  valor numeric(14, 2) not null check (valor > 0)
);

-- ---------------------------------------------------------------- calculos
create table public.calculos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  modo text not null check (modo in ('hoje', '2033')),
  motor text not null,
  request jsonb,
  response jsonb,
  resultado jsonb not null,
  total_tributos numeric(14, 2) not null,
  carga_efetiva_pct numeric(7, 4) not null,
  criado_em timestamptz not null default now()
);
create index on public.calculos (venda_id);

-- ---------------------------------------------------------------- notas
create table public.notas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  venda_id uuid not null references public.vendas (id),
  modelo smallint not null default 65,
  serie int not null,
  numero int not null,
  chave char(44) not null unique,
  status text not null check (status in ('enviada', 'autorizada', 'rejeitada', 'cancelada')),
  ambiente text not null,
  c_stat text,
  x_motivo text,
  protocolo text,
  xml text,                       -- nfeProc autorizado (ou XML enviado, se rejeitado)
  qr_code_url text,
  emitida_em timestamptz not null default now(),
  unique (empresa_id, modelo, serie, numero)
);
create index on public.notas (empresa_id, emitida_em desc);

create table public.nota_eventos (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid references public.notas (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo text not null check (tipo in ('autorizacao', 'cancelamento', 'inutilizacao')),
  request_xml text,
  response_xml text,
  c_stat text,
  x_motivo text,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- assinaturas
create table public.assinaturas (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  asaas_customer_id text,
  asaas_subscription_id text,
  plano text not null default 'loja',
  valor numeric(10, 2) not null default 59.90,
  status text not null default 'trial' check (status in ('trial', 'ativa', 'inadimplente', 'cancelada')),
  trial_ate timestamptz not null default now() + interval '14 days',
  proximo_vencimento date,
  atualizado_em timestamptz not null default now()
);
create unique index on public.assinaturas (asaas_subscription_id) where asaas_subscription_id is not null;

-- ---------------------------------------------------------------- auditoria
create table public.auditoria (
  id bigint generated always as identity primary key,
  empresa_id uuid references public.empresas (id) on delete cascade,
  user_id uuid,
  acao text not null,             -- ex. 'certificado.uso', 'certificado.upload'
  detalhe jsonb,
  criado_em timestamptz not null default now()
);

-- ================================================================ RLS
alter table public.empresas enable row level security;
alter table public.membros enable row level security;
alter table public.certificados enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.venda_pagamentos enable row level security;
alter table public.calculos enable row level security;
alter table public.notas enable row level security;
alter table public.nota_eventos enable row level security;
alter table public.assinaturas enable row level security;
alter table public.auditoria enable row level security;

create policy membros_select on public.membros for select using (user_id = auth.uid());

create policy empresas_select on public.empresas for select using (id in (select public.minhas_empresas()));
create policy empresas_update on public.empresas for update
  using (id in (select empresa_id from public.membros where user_id = auth.uid() and papel = 'dono'))
  with check (id in (select empresa_id from public.membros where user_id = auth.uid() and papel = 'dono'));

-- Tabelas de negócio: acesso total para membros da empresa
do $$
declare t text;
begin
  foreach t in array array['produtos', 'vendas', 'venda_itens', 'venda_pagamentos', 'calculos'] loop
    execute format(
      'create policy %1$s_membros on public.%1$s for all
         using (empresa_id in (select public.minhas_empresas()))
         with check (empresa_id in (select public.minhas_empresas()))', t);
  end loop;
end $$;

-- Somente leitura para o cliente; escrita só pelo servidor (service_role)
create policy notas_select on public.notas for select using (empresa_id in (select public.minhas_empresas()));
create policy nota_eventos_select on public.nota_eventos for select using (empresa_id in (select public.minhas_empresas()));
create policy assinaturas_select on public.assinaturas for select using (empresa_id in (select public.minhas_empresas()));
create policy certificados_select on public.certificados for select using (empresa_id in (select public.minhas_empresas()));
-- auditoria: sem policy para o cliente (só service_role)

-- Segredos: privilégios por coluna (o cliente não lê pfx/senha/CSC nem com RLS)
revoke select on public.certificados from anon, authenticated;
grant select (id, empresa_id, cn, cnpj, valido_de, valido_ate, fingerprint_sha256, ativo, criado_em)
  on public.certificados to authenticated;
revoke insert, update, delete on public.certificados from anon, authenticated;

revoke select, update on public.empresas from anon, authenticated;
grant select (id, cnpj, razao_social, nome_fantasia, ie, uf, municipio_ibge, municipio_nome, logradouro, numero,
  bairro, cep, crt, tp_regime_ibscbs, c_ativ_sn, rbt12, csc_id, nfce_serie, nfce_proximo_numero, ambiente, criado_em)
  on public.empresas to authenticated;
grant update (razao_social, nome_fantasia, ie, logradouro, numero, bairro, cep, crt, tp_regime_ibscbs,
  c_ativ_sn, rbt12, nfce_serie) on public.empresas to authenticated;
revoke insert, delete on public.empresas from anon, authenticated;

revoke insert, update, delete on public.notas, public.nota_eventos, public.assinaturas from anon, authenticated;

-- ================================================================ funções
-- Cria empresa + vínculo de dono + assinatura em trial, atomicamente.
create or replace function public.criar_empresa(
  p_cnpj text, p_razao_social text, p_nome_fantasia text, p_ie text, p_uf text,
  p_municipio_ibge int, p_municipio_nome text, p_logradouro text, p_numero text, p_bairro text, p_cep text,
  p_crt smallint, p_c_ativ_sn text, p_rbt12 numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  insert into empresas (cnpj, razao_social, nome_fantasia, ie, uf, municipio_ibge, municipio_nome,
                        logradouro, numero, bairro, cep, crt, c_ativ_sn, rbt12)
  values (p_cnpj, p_razao_social, nullif(p_nome_fantasia, ''), p_ie, upper(p_uf), p_municipio_ibge, p_municipio_nome,
          coalesce(p_logradouro, ''), coalesce(nullif(p_numero, ''), 'S/N'), coalesce(p_bairro, ''),
          coalesce(nullif(p_cep, ''), '00000000'), p_crt, nullif(p_c_ativ_sn, ''), p_rbt12)
  returning id into v_id;
  insert into membros (user_id, empresa_id, papel) values (auth.uid(), v_id, 'dono');
  insert into assinaturas (empresa_id) values (v_id);
  return v_id;
end $$;
revoke execute on function public.criar_empresa from public, anon;
grant execute on function public.criar_empresa to authenticated;

-- Número sequencial da venda por empresa
create or replace function public.definir_numero_venda() returns trigger language plpgsql as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtext(new.empresa_id::text));
    select coalesce(max(numero), 0) + 1 into new.numero from public.vendas where empresa_id = new.empresa_id;
  end if;
  return new;
end $$;
alter table public.vendas alter column numero drop not null;
create trigger vendas_numero before insert on public.vendas for each row execute function public.definir_numero_venda();

-- Reserva atômica do próximo número de NFC-e (chamada pelo servidor)
create or replace function public.reservar_numero_nfce(p_empresa uuid)
returns table (serie int, numero int) language plpgsql security definer set search_path = public as $$
begin
  return query
    update empresas e set nfce_proximo_numero = e.nfce_proximo_numero + 1
    where e.id = p_empresa
    returning e.nfce_serie, e.nfce_proximo_numero - 1;
end $$;
revoke execute on function public.reservar_numero_nfce from public, anon, authenticated;
grant execute on function public.reservar_numero_nfce to service_role;

-- Assinatura permite operar? (trial vigente ou ativa)
create or replace function public.empresa_pode_operar(p_empresa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assinaturas a
    where a.empresa_id = p_empresa
      and (a.status = 'ativa' or (a.status = 'trial' and a.trial_ate > now()))
  )
$$;
