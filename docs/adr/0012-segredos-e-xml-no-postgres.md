# ADR-0012 — Certificado, CSC e XMLs no Postgres (não no Storage) no MVP
- **Status:** aceito · **Data:** 2026-11-17

## Contexto
O plano previa guardar o .pfx e os XMLs no Supabase Storage. No MVP local, isso exigiria subir o serviço de Storage e políticas próprias de bucket.

## Decisão
- `certificados.pfx_cifrado`, `certificados.senha_cifrada` e `empresas.csc_cifrado` ficam como texto base64 cifrado com AES-256-GCM. A chave mestra está só em `NOTALEVE_MASTER_KEY`.
- Os privilégios por coluna impedem o cliente de ler essas colunas mesmo com RLS; só o servidor (`service_role`) as lê.
- O XML autorizado (`nfeProc`) fica em `notas.xml`; os XMLs de requisição e resposta ficam em `nota_eventos`.
- Todo uso do certificado gera um registro em `auditoria`.

## Consequências
Simples e transacional. Com volume alto, mover os XMLs para o Storage, guardando só o caminho, para conter o tamanho do banco.
