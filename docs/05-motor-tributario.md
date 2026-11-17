# 05 – Motor tributário (dual "hoje × 2033")

## Objetivo

Para cada venda, produzir dois cálculos independentes:

| | Modo **hoje** | Modo **2033** |
|---|---|---|
| Finalidade | Valores que vão na NFC-e real | Simulação da reforma completa |
| Fonte das regras | Implementação local versionada (NT 2025.002, NT 2026.005, legislação de ICMS da UF) | Calculadoras oficiais da Receita (containers próprios) |
| Tributos | ICMS/CSOSN (pelo regime) + grupo IBS/CBS do ano corrente | CBS + IBS (UF e município) + IS |
| Rótulo na UI | "Na nota" | "Simulação – reforma completa" |

## Modo 2033: qual calculadora usar

| Situação da empresa | Endpoint | Observação |
|---|---|---|
| Regime normal (CRT 3) | `POST /api/calculadora/observabilidade/regime-geral` (porta 8080) | A partir de 2027 `aliquotasNominais` é **obrigatório** e o resultado vem como `CALCULO_SIMULADO`, com o header `x-warning-dados-simulados` |
| Simples Nacional (CRT 1/2) | `POST /api/calculadora/observabilidade/simples-nacional` (porta 8082) | Exige `pIBSSN`/`pCBSSN` (ver lacuna L-01) |
| Simples com opção pelo regime regular de IBS/CBS (`tpRegimeIBSCBS=1`) | Regime Geral | O endpoint do SN devolve **VSN-019** |
| MEI (CRT 4) | Fora do escopo do cálculo assistido (NT 2026.005) | Tratar à parte |

Sempre usar os endpoints de **observabilidade**: eles devolvem erro por item (`estadoItem`) sem derrubar a venda inteira. Estados possíveis: `CALCULADO`, `CALCULO_SIMULADO`, `INCONSISTENCIA_ENTRADA`, `NAO_IMPLEMENTADO`, `FALHA_TECNICA`.

## Exemplos validados localmente (2026-11-17)

**Regime Geral:** `infra/receita/fixtures/operacao-exemplo.json` → `resposta-exemplo.json`. O resultado bate com `docs/exemplos.md` do repo oficial:
- item 3 (serviço de educação, redução de 60%): vCBS **42,24**;
- totais: vCBS **56,76**, vIBS **0,64**, vIS **15,00**;
- item 4: **REG-011** (NCM não vinculada à cClassTrib).

**Simples Nacional:** `fixtures/simples-exemplo.json`. Venda de R$ 199,90, atividade 01 (revenda), NFC-e (tpDoc 65), CRT 1, pIBSSN 1,00% e pCBSSN 2,00% (valores **fictícios** para teste):
- resultado: vIBSSN **2,00**, vCBSSN **4,00**, total **6,00**;
- campos obrigatórios descobertos no teste: `valorImpostoSeletivo` (mesmo zero), `CRT`, `tpDoc`, `data`; `tpRegimeIBSCBS` só com CRT 3.

## Lacunas conhecidas

| ID | Lacuna | Impacto | Proposta |
|---|---|---|---|
| L-01 | A calculadora do SN **não calcula** a alíquota efetiva (`pIBSSN`, `pCBSSN`). Ela precisa ser informada | Sem isso não há cálculo 2033 para optantes do Simples | Implementar `lib/tributos/simples-aliquota.ts`: RBT12 → faixa do anexo (I para comércio) → alíquota efetiva → partilha IBS/CBS conforme LC 214/2025. Validar com um contador |
| L-02 | A partir de 2027 o Regime Geral exige `aliquotasNominais`, e as alíquotas de referência só existem para 2026 | Para "2033" é preciso escolher as alíquotas | Tabela de cenários configurável (ex.: alíquota de referência estimada CBS + IBS). Mostrar a premissa na UI |
| L-03 | As regras "hoje" do Simples na NFC-e dependem da NT 2026.005 (e futuras) | O modo hoje pode mudar | Motor versionado por vigência (`regras/AAAA-MM/…`), com testes por versão |
| L-04 | O modo 2033 ignora efeitos de crédito (não cumulatividade) na cadeia | O comparativo é do imposto destacado na venda, não do custo líquido | Deixar explícito na UI. Estudar módulo de crédito na fase 5+ |
| L-05 | MEI fora do escopo da calculadora do SN | | Mensagem explicativa; avaliar regra própria |

## Implementação

| Arquivo | Papel |
|---|---|
| `src/lib/tributos/simples.ts` | Anexo I: faixa, alíquota efetiva, partilha; premissa PIS+COFINS → CBS e ICMS → IBS (L-01) |
| `src/lib/tributos/cenarios.ts` | Premissas versionadas: alíquotas 2033 (CBS 8,8%, IBS UF 14,6%, IBS Mun 3,1%), ICMS interno por UF, PIS/COFINS cumulativo, teste 2026 |
| `src/lib/tributos/calcular-hoje.ts` | Modo hoje (função pura) |
| `src/lib/tributos/calcular-2033.ts` | Modo 2033 via calculadoras oficiais |
| `src/lib/fiscal/nfce/ibscbs.ts` | Grupo `<IBSCBS>` da nota gerado pela própria Receita (`/regime-geral` + `/xml/generate`) |

## Contrato interno

```ts
type ResultadoCalculo = {
  modo: 'hoje' | '2033'
  motor: string                 // ex. 'receita-sn@0.0.6'
  itens: Array<{
    numero: number
    estado: 'ok' | 'simulado' | 'erro'
    tributos: { cbs: number; ibsUf: number; ibsMun: number; is: number; icms?: number }
    aliquotaEfetiva: number
    memoria?: string
    erros?: Array<{ codigo: string; mensagem: string; campo?: string }>
  }>
  totais: { tributos: number; cargaEfetivaPct: number }
  premissas: string[]           // ex. 'alíquotas nominais estimadas para 2033'
}
```
Request e response brutos são gravados em `calculos` para reprodução de bugs.
