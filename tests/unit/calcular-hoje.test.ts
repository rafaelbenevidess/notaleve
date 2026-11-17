import { describe, expect, it } from 'vitest'
import { calcularHoje } from '@/lib/tributos/calcular-hoje'
import type { ItemVenda } from '@/lib/tributos/tipos'

const item = (numero: number, total: number): ItemVenda => ({
  numero, descricao: 'Camiseta', ncm: '61091000', cstIbsCbs: '000', cClassTrib: '000001', unidade: 'UN',
  quantidade: 1, precoUnitario: total, desconto: 0, total,
})

describe('calcularHoje', () => {
  it('Simples faixa 1: 4% sobre a venda, decomposto em ICMS/PIS-COFINS/outros', () => {
    const r = calcularHoje({ uf: 'SP', municipioIbge: 3550308, crt: 1, rbt12: 100_000 }, [item(1, 100), item(2, 50)])
    expect(r.totais.tributos).toBe(6)
    expect(r.totais.cargaEfetivaPct).toBe(4)
    expect(r.totais.icms).toBeCloseTo(2.04, 2)
    expect(r.itens[0].memoria).toMatch(/CSOSN 102/)
  })

  it('Regime normal SP: ICMS 18% + PIS/COFINS 3,65%; CBS/IBS de teste não somam', () => {
    const r = calcularHoje({ uf: 'SP', municipioIbge: 3550308, crt: 3 }, [item(1, 200)])
    expect(r.totais.icms).toBe(36)
    expect(r.totais.pisCofins).toBe(7.3)
    expect(r.totais.cbs).toBe(1.8)
    expect(r.totais.tributos).toBe(43.3)
  })

  it('MEI: sem tributo por venda', () => {
    const r = calcularHoje({ uf: 'SP', municipioIbge: 3550308, crt: 4 }, [item(1, 100)])
    expect(r.totais.tributos).toBe(0)
  })
})
