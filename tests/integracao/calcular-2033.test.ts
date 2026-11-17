// Requer as calculadoras locais:  docker compose -f infra/receita/docker-compose.yml up -d
import { beforeAll, describe, expect, it } from 'vitest'
import { calcular2033 } from '@/lib/tributos/calcular-2033'
import type { ItemVenda } from '@/lib/tributos/tipos'

let online = false
beforeAll(async () => {
  try { online = (await fetch('http://localhost:8080/api/calculadora/dados-abertos/versao')).ok } catch { online = false }
})

const camiseta: ItemVenda = {
  numero: 1, descricao: 'Camiseta', ncm: '61091000', cstIbsCbs: '000', cClassTrib: '000001', unidade: 'UN',
  quantidade: 2, precoUnitario: 50, desconto: 0, total: 100,
}

describe('calcular2033 (calculadoras oficiais locais)', () => {
  it('Simples Nacional faixa 1: CBS 0,62% + IBS 1,36% + demais do DAS', async () => {
    if (!online && process.env.PULAR_RECEITA === '1') return
    expect(online, 'Calculadoras locais fora do ar (docker compose -f infra/receita/docker-compose.yml up -d)').toBe(true)
    const r = await calcular2033({ uf: 'SP', municipioIbge: 3550308, crt: 1, cAtivSN: '01', rbt12: 100_000 }, [camiseta])
    expect(r.itens[0].estado).toBe('ok')
    expect(r.totais.cbs).toBe(0.62)
    expect(r.totais.ibsUf).toBe(1.36)
    expect(r.totais.outros).toBeCloseTo(2.02, 2) // 50,5% de 4%
    expect(r.motor).toBe('receita-sn@0.0.6')
  })

  it('Regime normal: CBS 8,8% + IBS 17,7% (premissa) via Regime Geral', async () => {
    if (!online && process.env.PULAR_RECEITA === '1') return
    expect(online, 'Calculadoras locais fora do ar (docker compose -f infra/receita/docker-compose.yml up -d)').toBe(true)
    const r = await calcular2033({ uf: 'SP', municipioIbge: 3550308, crt: 3 }, [camiseta])
    expect(r.itens[0].estado).toBe('simulado')
    expect(r.totais.cbs).toBe(8.8)
    expect(r.totais.ibsUf).toBe(14.6)
    expect(r.totais.ibsMun).toBe(3.1)
    expect(r.totais.tributos).toBe(26.5)
  })

  it('cClassTrib incompatível com a NCM vira erro por item (REG-011), sem derrubar a venda', async () => {
    if (!online && process.env.PULAR_RECEITA === '1') return
    expect(online, 'Calculadoras locais fora do ar (docker compose -f infra/receita/docker-compose.yml up -d)').toBe(true)
    const ruim = { ...camiseta, numero: 2, cClassTrib: '200003', cstIbsCbs: '200' }
    const r = await calcular2033({ uf: 'SP', municipioIbge: 3550308, crt: 3 }, [camiseta, ruim])
    expect(r.itens[0].estado).toBe('simulado')
    expect(r.itens[1].estado).toBe('erro')
    expect(r.itens[1].erros?.[0].codigo).toBe('REG-011')
  })
})
