import { describe, expect, it } from 'vitest'
import { aliquotaSimples } from '@/lib/tributos/simples'

describe('aliquotaSimples (Anexo I)', () => {
  it('1ª faixa sem RBT12 usa a alíquota nominal de 4%', () => {
    const a = aliquotaSimples(null)
    expect(a.faixa).toBe(1)
    expect(a.efetivaPct).toBe(4)
    expect(a.icmsPct).toBeCloseTo(1.36, 4) // 34% de 4%
    expect(a.pisCofinsPct).toBeCloseTo(0.62, 4) // (12,74+2,76)% de 4%
    expect(a.pIBSSN).toBe(1.36)
    expect(a.pCBSSN).toBe(0.62)
  })

  it('3ª faixa aplica a dedução: RBT12 500 mil → (500000*9,5% - 13860)/500000 = 6,728%', () => {
    const a = aliquotaSimples(500_000)
    expect(a.faixa).toBe(3)
    expect(a.efetivaPct).toBeCloseTo(6.728, 3)
  })

  it('6ª faixa não tem ICMS no DAS', () => {
    const a = aliquotaSimples(4_000_000)
    expect(a.faixa).toBe(6)
    expect(a.icmsPct).toBe(0)
  })

  it('acima de 4,8 milhões lança erro', () => {
    expect(() => aliquotaSimples(5_000_000)).toThrow(/limite/)
  })
})
