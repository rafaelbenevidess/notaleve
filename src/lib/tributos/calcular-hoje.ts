// Modo "hoje": tributos que vão (ou estão embutidos) na nota vigente.
// Função pura (sem IO) — versionada por REGRAS_HOJE.versao (RNF-06).
import { icmsInterno, REGRAS_HOJE } from './cenarios'
import { aliquotaSimples } from './simples'
import { EmpresaFiscal, ItemVenda, ResultadoCalculo, ResultadoItem, r2, somarTotais, zeroTributos } from './tipos'

export function calcularHoje(empresa: EmpresaFiscal, itens: ItemVenda[]): ResultadoCalculo {
  const motor = `local-hoje@${REGRAS_HOJE.versao}`
  if (empresa.crt === 4) {
    const res = itens.map<ResultadoItem>((i) => ({
      numero: i.numero, estado: 'ok', base: r2(i.total), tributos: zeroTributos(), total: 0, aliquotaEfetivaPct: 0,
      memoria: 'MEI: tributos recolhidos em valor fixo mensal (DAS-MEI), sem incidência por venda.',
    }))
    return { modo: 'hoje', motor, itens: res, totais: somarTotais(res), premissas: ['MEI recolhe valor fixo mensal; não há tributo por venda.'] }
  }

  if (empresa.crt === 1 || empresa.crt === 2) {
    const a = aliquotaSimples(empresa.rbt12)
    const res = itens.map<ResultadoItem>((i) => {
      const base = r2(i.total)
      const t = { ...zeroTributos(), icms: r2((base * a.icmsPct) / 100), pisCofins: r2((base * a.pisCofinsPct) / 100), outros: r2((base * a.outrosPct) / 100) }
      const total = r2(t.icms + t.pisCofins + t.outros)
      return {
        numero: i.numero, estado: 'ok', base, tributos: t, total, aliquotaEfetivaPct: base ? r2((total / base) * 100) : 0,
        memoria: `Simples Nacional, Anexo I, faixa ${a.faixa}: alíquota efetiva ${a.efetivaPct.toFixed(2)}% (DAS), da qual ICMS ${a.icmsPct.toFixed(2)}% e PIS/COFINS ${a.pisCofinsPct.toFixed(2)}%. Na NFC-e: CSOSN 102, sem destaque de ICMS.`,
      }
    })
    return {
      modo: 'hoje', motor, itens: res, totais: somarTotais(res),
      premissas: [
        `RBT12 informado: ${empresa.rbt12 ? `R$ ${empresa.rbt12.toLocaleString('pt-BR')}` : 'não informado (usada a 1ª faixa)'}.`,
        'Valor estimado do DAS proporcional à venda (Anexo I da LC 123/2006).',
      ],
    }
  }

  // Regime normal (CRT 3)
  const pIcms = icmsInterno(empresa.uf)
  const t26 = REGRAS_HOJE.teste2026
  const res = itens.map<ResultadoItem>((i) => {
    const base = r2(i.total)
    const t = {
      ...zeroTributos(),
      icms: r2((base * pIcms) / 100),
      pisCofins: r2((base * REGRAS_HOJE.pisCofinsNormal) / 100),
      cbs: r2((base * t26.cbs) / 100),
      ibsUf: r2((base * t26.ibsUf) / 100),
      ibsMun: r2((base * t26.ibsMun) / 100),
    }
    const total = r2(t.icms + t.pisCofins) // CBS/IBS de teste são compensáveis em 2026
    return {
      numero: i.numero, estado: 'ok', base, tributos: t, total, aliquotaEfetivaPct: base ? r2((total / base) * 100) : 0,
      memoria: `ICMS ${pIcms}% (alíquota interna ${empresa.uf}) + PIS/COFINS ${REGRAS_HOJE.pisCofinsNormal}% (cumulativo). Destaque de teste 2026: CBS ${t26.cbs}% e IBS ${t26.ibsUf}% (compensáveis, não somados).`,
    }
  })
  return {
    modo: 'hoje', motor, itens: res, totais: somarTotais(res),
    premissas: [
      `ICMS pela alíquota interna padrão de ${empresa.uf} (${pIcms}%); produtos com ST, redução ou alíquota diferenciada não estão modelados.`,
      'PIS/COFINS no regime cumulativo (lucro presumido).',
      'CBS 0,9% e IBS 0,1% de 2026 são destacados na nota, mas compensáveis — não somam ao custo.',
    ],
  }
}
