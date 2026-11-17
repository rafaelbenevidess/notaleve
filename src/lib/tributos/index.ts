import 'server-only'
import { calcular2033 } from './calcular-2033'
import { calcularHoje } from './calcular-hoje'
import { ComparativoVenda, EmpresaFiscal, ItemVenda } from './tipos'

export * from './tipos'
export { calcularHoje, calcular2033 }

/** Calcula os dois modos em paralelo (RF-21/22/23). */
export async function calcularComparativo(empresa: EmpresaFiscal, itens: ItemVenda[]): Promise<ComparativoVenda> {
  const hoje = calcularHoje(empresa, itens)
  const reforma = await calcular2033(empresa, itens)
  const diferenca = Math.round((reforma.totais.tributos - hoje.totais.tributos) * 100) / 100
  const diferencaPct = Math.round((reforma.totais.cargaEfetivaPct - hoje.totais.cargaEfetivaPct) * 100) / 100
  return { hoje, reforma, diferenca, diferencaPct }
}
