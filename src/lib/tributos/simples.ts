// Simples Nacional — Anexo I (comércio) da LC 123/2006.
// Lacuna L-01: a calculadora oficial do SN exige pIBSSN/pCBSSN informados; aqui
// derivamos a alíquota efetiva e a partilha. PREMISSA A VALIDAR COM CONTADOR (P-07).

import { r2 } from './tipos'

interface Faixa {
  ate: number
  aliquota: number // %
  deducao: number // R$
  // partilha % do DAS por tributo
  partilha: { irpj: number; csll: number; cofins: number; pis: number; cpp: number; icms: number }
}

export const ANEXO_I: Faixa[] = [
  { ate: 180_000, aliquota: 4.0, deducao: 0, partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0 } },
  { ate: 360_000, aliquota: 7.3, deducao: 5_940, partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0 } },
  { ate: 720_000, aliquota: 9.5, deducao: 13_860, partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 } },
  { ate: 1_800_000, aliquota: 10.7, deducao: 22_500, partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 } },
  { ate: 3_600_000, aliquota: 14.3, deducao: 87_300, partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 } },
  { ate: 4_800_000, aliquota: 19.0, deducao: 378_000, partilha: { irpj: 13.5, csll: 10.0, cofins: 28.27, pis: 6.13, cpp: 42.1, icms: 0 } },
]

export interface AliquotaSimples {
  faixa: number
  efetivaPct: number
  /** % sobre a receita, por tributo */
  icmsPct: number
  pisCofinsPct: number
  outrosPct: number
  /** premissa 2033: PIS+COFINS → CBS; ICMS → IBS */
  pCBSSN: number
  pIBSSN: number
}

export function aliquotaSimples(rbt12: number | null | undefined): AliquotaSimples {
  // Empresa nova/sem informação: usa 1ª faixa (alíquota nominal)
  const receita = rbt12 && rbt12 > 0 ? rbt12 : 0
  const idx = receita === 0 ? 0 : ANEXO_I.findIndex((f) => receita <= f.ate)
  if (idx === -1) throw new Error('RBT12 acima do limite do Simples Nacional (R$ 4,8 milhões)')
  const f = ANEXO_I[idx]
  const efetiva = receita === 0 ? f.aliquota : ((receita * f.aliquota) / 100 - f.deducao) / receita * 100
  const p = f.partilha
  const parte = (pct: number) => (efetiva * pct) / 100
  return {
    faixa: idx + 1,
    efetivaPct: round4(efetiva),
    icmsPct: round4(parte(p.icms)),
    pisCofinsPct: round4(parte(p.pis + p.cofins)),
    outrosPct: round4(parte(p.irpj + p.csll + p.cpp)),
    pCBSSN: r2(parte(p.pis + p.cofins)),
    pIBSSN: r2(parte(p.icms)),
  }
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000
