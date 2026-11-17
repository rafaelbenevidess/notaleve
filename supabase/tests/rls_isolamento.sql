-- Teste de isolamento multiempresa (RNF-01).
-- Rodar:  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolamento.sql
-- Tudo roda numa transação revertida no final.
begin;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.local', 'authenticated', 'authenticated');

create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;

-- Usuário A cria a empresa A e um produto
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
insert into ids values ('A', public.criar_empresa('11111111000111','Loja A','','111','SP',3550308,'São Paulo','','','','',1::smallint,'01',100000));
insert into produtos (empresa_id, nome, ncm, preco) select id, 'Camiseta A', '61091000', 50 from ids where nome = 'A';

-- Usuário B cria a empresa B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into ids values ('B', public.criar_empresa('22222222000122','Loja B','','222','SP',3550308,'São Paulo','','','','',1::smallint,'01',100000));

do $$
declare n int; ok boolean;
begin
  -- B não vê empresa nem produtos de A
  select count(*) into n from empresas; if n <> 1 then raise exception 'FALHA: B vê % empresas', n; end if;
  select count(*) into n from produtos; if n <> 0 then raise exception 'FALHA: B vê produtos de A'; end if;

  -- B não consegue inserir produto na empresa de A
  begin
    insert into produtos (empresa_id, nome, ncm, preco) select id, 'Invasor', '61091000', 1 from ids where nome = 'A';
    raise exception 'FALHA: B inseriu produto em A';
  exception when insufficient_privilege or check_violation then null;
    when others then
      if sqlerrm like 'FALHA%' then raise; end if;
      if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- B não consegue ler segredos (privilégio por coluna)
  begin
    perform csc_cifrado from empresas;
    raise exception 'FALHA: B leu csc_cifrado';
  exception when insufficient_privilege then null;
  end;
  begin
    perform pfx_cifrado from certificados;
    raise exception 'FALHA: B leu pfx_cifrado';
  exception when insufficient_privilege then null;
  end;

  -- B não consegue mudar a própria assinatura para 'ativa'
  begin
    update assinaturas set status = 'ativa';
    raise exception 'FALHA: cliente alterou assinatura';
  exception when insufficient_privilege then null;
  end;

  -- B não consegue reservar número de NFC-e diretamente
  begin
    perform public.reservar_numero_nfce((select id from ids where nome = 'B'));
    raise exception 'FALHA: cliente reservou número';
  exception when insufficient_privilege then null;
  end;

  select public.empresa_pode_operar((select id from ids where nome = 'B')) into ok;
  if not ok then raise exception 'FALHA: trial recém-criado deveria permitir operar'; end if;

  raise notice 'OK: isolamento multiempresa e proteção de segredos verificados';
end $$;

rollback;
