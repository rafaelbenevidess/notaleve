import 'server-only'
import { calcular2033 } from './calcular-2033'
import { calcularHoje } from './calcular-hoje'
import { EmpresaFiscal, ItemVenda, ResultadoCalculo } from './tipos'

export * from './tipos'
export { calcularHoje, calcular2033 }

export interface ComparativoVenda {
  hoje: ResultadoCalculo
  reforma: ResultadoCalculo
  diferenca: number
  diferencaPct: number
}

/** Calcula os dois modos em paralelo (RF-21/22/23). */
export async function calcularComparativo(empresa: EmpresaFiscal, itens: ItemVenda[]): Promise<ComparativoVenda> {
  const hoje = calcularHoje(empresa, itens)
  const reforma = await calcular2033(empresa, itens)
  const diferenca = Math.round((reforma.totais.tributos - hoje.totais.tributos) * 100) / 100
  const diferencaPct = Math.round((reforma.totais.cargaEfetivaPct - hoje.totais.cargaEfetivaPct) * 100) / 100
  return { hoje, reforma, diferenca, diferencaPct }
}
