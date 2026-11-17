// Contratos do motor tributário dual (ver docs/05-motor-tributario.md)

export type Crt = 1 | 2 | 3 | 4

export interface EmpresaFiscal {
  uf: string
  municipioIbge: number
  crt: Crt
  tpRegimeIbsCbs?: 1 | 2 | null
  cAtivSN?: string | null
  rbt12?: number | null
}

export interface ItemVenda {
  numero: number
  descricao: string
  ncm: string
  cstIbsCbs: string
  cClassTrib: string
  unidade: string
  quantidade: number
  precoUnitario: number
  desconto: number
  /** total líquido do item = quantidade * preço - desconto */
  total: number
}

export type EstadoItem = 'ok' | 'simulado' | 'erro'

export interface TributosItem {
  cbs: number
  ibsUf: number
  ibsMun: number
  is: number
  icms: number
  pisCofins: number
  /** demais tributos embutidos no DAS (IRPJ, CSLL, CPP) — só no Simples */
  outros: number
}

export interface ResultadoItem {
  numero: number
  estado: EstadoItem
  base: number
  tributos: TributosItem
  total: number
  aliquotaEfetivaPct: number
  memoria?: string
  erros?: Array<{ codigo: string; mensagem: string; campo?: string }>
}

export interface ResultadoCalculo {
  modo: 'hoje' | '2033'
  motor: string
  itens: ResultadoItem[]
  totais: { base: number; tributos: number; cargaEfetivaPct: number } & TributosItem
  premissas: string[]
  request?: unknown
  response?: unknown
}

export const zeroTributos = (): TributosItem => ({ cbs: 0, ibsUf: 0, ibsMun: 0, is: 0, icms: 0, pisCofins: 0, outros: 0 })

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function somarTotais(itens: ResultadoItem[]): ResultadoCalculo['totais'] {
  const t = zeroTributos()
  let base = 0
  let tributos = 0
  for (const i of itens) {
    if (i.estado === 'erro') continue
    base += i.base
    tributos += i.total
    for (const k of Object.keys(t) as (keyof TributosItem)[]) t[k] += i.tributos[k]
  }
  for (const k of Object.keys(t) as (keyof TributosItem)[]) t[k] = r2(t[k])
  return { ...t, base: r2(base), tributos: r2(tributos), cargaEfetivaPct: base > 0 ? r2((tributos / base) * 100) : 0 }
}
