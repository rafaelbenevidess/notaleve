# 02 – Requisitos

Convenção: `RF-xx` funcional, `RNF-xx` não funcional. Prioridade: **M** (MVP), **F** (futuro).
O status fica no [roadmap](08-roadmap.md).

## Requisitos funcionais

### Conta, empresa e assinatura
| ID | Requisito | Prio |
|---|---|---|
| RF-01 | Cadastro e login por e-mail/senha e link mágico (Supabase Auth) | M |
| RF-02 | Um usuário pode pertencer a uma ou mais empresas, com papel **dono** ou **vendedor** | M |
| RF-03 | Onboarding da empresa: CNPJ, razão social, IE, UF, município (código IBGE), regime (CRT 1/2/3/4) e atividade do Simples (`cAtivSN`, ex. "01 – Revenda de mercadorias") | M |
| RF-04 | Upload do **certificado A1** (.pfx + senha), com validação de senha, CNPJ e validade, e alerta 30 dias antes do vencimento | M |
| RF-05 | Cadastro do **CSC + ID do token** da SEFAZ (QR Code da NFC-e), série e próximo número | M |
| RF-06 | Assinatura com trial de 14 dias via Asaas, com status atualizado por webhook | M |
| RF-07 | Bloqueio do app (somente leitura) quando a assinatura estiver inadimplente ou cancelada | M |
| RF-08 | Informar o faturamento (RBT12) para cálculo da alíquota efetiva do Simples | M |

### Catálogo
| ID | Requisito | Prio |
|---|---|---|
| RF-10 | CRUD de produtos: nome, SKU/EAN, NCM, CEST, unidade, preço, CFOP/CSOSN padrão | M |
| RF-11 | Busca de NCM por código ou descrição (API Receita `dados-abertos/ncm`) | M |
| RF-12 | Sugestão de CST/cClassTrib compatíveis com a NCM (`classificacoes-tributarias/ncm-aplicavel`), com explicação em português da redução e da fundamentação legal | M |
| RF-13 | Importação de produtos por CSV | M |

### Vendas e cálculo
| ID | Requisito | Prio |
|---|---|---|
| RF-20 | PDV: busca de produto, carrinho, quantidade, desconto e forma de pagamento | M |
| RF-21 | Cálculo **modo hoje**: tributos que vão na nota vigente (CSOSN/ICMS + grupo IBS/CBS da NT 2025.002 / NT 2026.005) | M |
| RF-22 | Cálculo **modo 2033**: CBS/IBS/IS pela calculadora oficial (Regime Geral, ou Simples Nacional se a empresa for optante) | M |
| RF-23 | Card comparativo por venda: total de tributos, carga efetiva %, diferença em R$, memória de cálculo | M |
| RF-24 | Erros de cálculo por item com mensagem amigável (códigos `REG-xxx` / `VSN-xxx`), sem impedir os demais itens | M |
| RF-25 | Salvar venda sem nota, ou seguir para a emissão | M |

### Emissão
| ID | Requisito | Prio |
|---|---|---|
| RF-30 | Emitir NFC-e mod. 65 (layout 4.00 + grupo IBSCBS) na SEFAZ da UF piloto, direto e sem intermediário | M |
| RF-31 | DANFE NFC-e em PDF (bobina 80 mm e A4) com QR Code; download e link para o cliente | M |
| RF-32 | Cancelamento (evento 110111) dentro do prazo da UF | M |
| RF-33 | Inutilização de numeração | M |
| RF-34 | Armazenar XML autorizado (+ protocolo) por, no mínimo, 5 anos | M |
| RF-35 | Contingência offline (tpEmis 9) e reenvio | F |
| RF-36 | NF-e mod. 55, NFS-e (API Nacional) e outras UFs | F |

### Painel e contador
| ID | Requisito | Prio |
|---|---|---|
| RF-40 | Painel: vendas, notas, tributos do mês nos modos hoje e 2033, top produtos | M |
| RF-41 | Exportação mensal dos XMLs (zip) e relatório para o contador | M |

## Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Multiempresa** com isolamento por RLS no Postgres: nenhuma consulta vê dados de outra empresa |
| RNF-02 | Certificado A1 e CSC **cifrados** (AES-256-GCM). A chave mestra fica só em variável de ambiente, nunca no banco nem no repo |
| RNF-03 | O certificado é decifrado apenas em memória, no momento da assinatura. Não é logado nem enviado ao navegador |
| RNF-04 | LGPD: termos de uso, política de privacidade, exclusão de conta, logs sem dados fiscais sensíveis |
| RNF-05 | Emissão de NFC-e em até 5 s no p95 (excluindo indisponibilidade da SEFAZ) |
| RNF-06 | Motor "hoje" **versionável** por vigência e NT, porque as regras mudam por nota técnica |
| RNF-07 | Calculadoras da Receita usadas **sem modificação** (submódulos fixados por tag) |
| RNF-08 | Emissão desenhada para N estados por meio da interface `Autorizador` (ver [06](06-emissao-nfce.md)) |
| RNF-09 | Interface responsiva (celular no balcão), em português do Brasil, acessível (WCAG AA) |
| RNF-10 | Ambiente 100% local reprodutível (`docker compose` + `supabase start` + `npm run dev`) |
| RNF-11 | Observabilidade: logs estruturados, `request_id`, erros de SEFAZ guardados com código e motivo |
| RNF-12 | Testes: unitários (motor, XML), integração (calculadoras locais, SEFAZ mock/homologação), E2E (Playwright) |
