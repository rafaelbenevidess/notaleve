# 01 – Visão do produto

## Contexto

A Reforma Tributária do Consumo (EC 132/2023, **LC 214/2025**) substitui PIS, COFINS, IPI, ICMS e ISS por:
- **CBS** (Contribuição sobre Bens e Serviços, federal);
- **IBS** (Imposto sobre Bens e Serviços, estadual e municipal);
- **IS** (Imposto Seletivo, sobre produtos prejudiciais à saúde ou ao meio ambiente).

A transição vai de **2026** (fase de teste, com CBS 0,9% e IBS 0,1% destacados) até **2033**, quando o modelo antigo deixa de existir.

Em nov/2026 a Receita Federal publicou seus primeiros códigos abertos no GitHub: as calculadoras oficiais da CBS/IBS/IS (Regime Geral e Simples Nacional) e o gerador do DANFSe. Ver [07 – APIs da Receita](07-apis-receita.md).

## Problema

O pequeno lojista:
1. não sabe quanto vai pagar com a reforma nem como isso afeta preço e margem;
2. precisa emitir NFC-e com campos novos (grupo IBS/CBS) que muitos sistemas baratos ainda tratam mal;
3. paga mensalidades de ERP/PDV mais custo por nota em emissores intermediários.

## Proposta de valor

> "Registre a venda, emita a nota e veja hoje quanto essa venda pagaria quando a reforma estiver completa."

- **Cálculo oficial:** usa o mesmo motor que a Receita publicou, não uma reinterpretação.
- **Dual "hoje × 2033"** em cada venda, produto e mês.
- **Emissão de NFC-e própria**, direto na SEFAZ, sem custo por nota.
- **Simples:** interface guiada em português, pensada para lojista e contador.

## Público-alvo

| Segmento | Prioridade | Observação |
|---|---|---|
| Pequeno varejo de mercadorias (roupas, calçados, acessórios, presentes) | **MVP** | Majoritariamente Simples Nacional (CRT 1), venda ao consumidor (NFC-e mod. 65) |
| Contadores que atendem esses lojistas | MVP (usuário secundário) | Exportação de XMLs e relatórios |
| Comércio com venda a CNPJ (NF-e mod. 55) | Fase futura | |
| Prestadores de serviço (NFS-e) | Fase futura | Reaproveita o gerador DANFSe da Receita |
| Outros softwares (ERPs, e-commerce) via API | Fase 6 | Vender a "ponte" de emissão + motor tributário |

## Modelo comercial (proposta inicial, a validar)

- SaaS por assinatura, **plano único por loja**, com trial de 14 dias.
- Faixa estimada de **R$ 49–79/mês** com notas ilimitadas. O custo marginal por nota é quase zero porque não há intermediário.
- Cobrança via **Asaas** (Pix, boleto, cartão), com bloqueio automático por inadimplência.
- Concorrentes de referência: Bling, Tiny, MarketUP, Nex, PDVs de maquininha. O diferencial é o comparativo da reforma, o motor oficial e o custo por nota zero.
- **Segunda receita (fase 6):** API de emissão + cálculo para outros softwares, cobrada por nota.

## O que o NotaLeve NÃO é (por enquanto)

- Não é ERP completo (sem financeiro, compras ou estoque avançado no MVP).
- Não é escritório contábil: não apura nem transmite DAS, EFD etc.
- O modo 2033 é **simulação**, informada como tal na interface.

## Nome

**NotaLeve** = nota fiscal + leveza. Nome provisório escolhido em 2026-11-17 (ver [ADR-0010](adr/0010-nome-notaleve.md)). Antes do lançamento é preciso verificar marca no INPI e disponibilidade de domínio.
