// Cliente das calculadoras oficiais da Receita Federal (containers locais ou instância piloto).
import 'server-only'

const RG = () => process.env.RF_API_URL ?? 'http://localhost:8080/api'
const SN = () => process.env.RF_SN_API_URL ?? 'http://localhost:8082/api'

export class ReceitaIndisponivel extends Error {}

async function chamar<T>(url: string, init?: RequestInit & { revalidate?: number }): Promise<{ status: number; body: T; headers: Headers }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers ?? {}) },
      ...(init?.revalidate ? { next: { revalidate: init.revalidate } } : { cache: 'no-store' }),
    })
    const text = await res.text()
    let body: unknown = text
    try { body = text ? JSON.parse(text) : null } catch { /* texto puro */ }
    return { status: res.status, body: body as T, headers: res.headers }
  } catch (e) {
    throw new ReceitaIndisponivel(`Calculadora da Receita indisponível (${url.split('/api')[0]}): ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

// ---------------- cálculo
export const calcularRegimeGeral = (payload: unknown) =>
  chamar<RespostaRegimeGeral>(`${RG()}/calculadora/observabilidade/regime-geral`, { method: 'POST', body: JSON.stringify(payload) })

export const calcularSimplesNacional = (payload: unknown) =>
  chamar<RespostaSimples | ProblemaHttp>(`${SN()}/calculadora/observabilidade/simples-nacional`, { method: 'POST', body: JSON.stringify(payload) })

// ---------------- dados abertos (cache 1 dia)
const DIA = 86_400
export async function buscarNcm(ncm: string, data: string) {
  const r = await chamar<NcmInfo>(`${RG()}/calculadora/dados-abertos/ncm?ncm=${encodeURIComponent(ncm)}&data=${data}`, { revalidate: DIA })
  return r.status === 200 ? r.body : null
}

/** A NCM é compatível com a cClassTrib na data? (evita REG-011) */
export async function ncmAplicavel(ncm: string, cClassTrib: string, data: string): Promise<boolean | null> {
  const r = await chamar<{ valido: boolean }>(
    `${RG()}/calculadora/dados-abertos/classificacoes-tributarias/ncm-aplicavel?ncm=${ncm}&cClassTrib=${cClassTrib}&dataOcorrenciaFatoGerador=${data}`,
    { revalidate: DIA },
  )
  return r.status === 200 ? r.body.valido : null
}

export interface ClassTrib {
  codigo: string
  descricao: string
  descricaoTratamentoTributario: string
  percentualReducaoCbs?: number
  percentualReducaoIbsUf?: number
  percentualReducaoIbsMun?: number
  tiposDfeClassificacao?: unknown
}
/** Todas as classificações tributárias (cClassTrib) vigentes na data */
export async function listarClassTrib(data: string): Promise<ClassTrib[]> {
  const r = await chamar<ClassTrib[]>(`${RG()}/calculadora/dados-abertos/classificacoes-tributarias/cbs-ibs?data=${data}`, { revalidate: DIA })
  return r.status === 200 && Array.isArray(r.body) ? r.body : []
}

export async function detalheClassTrib(cClassTrib: string, data: string) {
  const r = await chamar<unknown>(`${RG()}/calculadora/dados-abertos/classificacoes-tributarias/cbs-ibs/class-trib/${cClassTrib}?data=${data}`, { revalidate: DIA })
  return r.status === 200 ? r.body : null
}

export async function ufs() {
  const r = await chamar<Array<{ sigla: string; nome: string; codigo: number }>>(`${RG()}/calculadora/dados-abertos/ufs`, { revalidate: DIA })
  return r.status === 200 ? r.body : []
}

export async function municipios(siglaUf: string) {
  const r = await chamar<Array<{ codigo: number; nome: string }>>(`${RG()}/calculadora/dados-abertos/ufs/municipios?siglaUf=${siglaUf}`, { revalidate: DIA })
  return r.status === 200 ? r.body : []
}

export async function versaoBase() {
  const r = await chamar<unknown>(`${RG()}/calculadora/dados-abertos/versao`, { revalidate: 3600 })
  return r.status === 200 ? r.body : null
}

// ---------------- tipos (parciais) das respostas
export interface ErroItem { code: string; title: string; detail: string; pointer?: string }
export interface ProblemaHttp { status: number; title: string; detail: string; errors?: ErroItem[] }

interface GrupoValor { [k: string]: string | GrupoValor | undefined }
export interface RespostaRegimeGeral {
  objetos: Array<{
    nObj: number
    estadoItem: string
    tribCalc?: { IBSCBS?: { CST: string; cClassTrib: string; gIBSCBS?: GrupoValor }; IS?: GrupoValor }
    erros?: ErroItem[]
  }>
  total?: unknown
}

export interface RespostaSimples {
  objetos: Array<{
    nObj: number
    estadoItem: string
    tribCalc?: { vBC: string; pIBSSN: string; vIBSSN: string; pCBSSN: string; vCBSSN: string; IS?: { valor: string }; totalItem: string }
    erros?: ErroItem[]
  }>
  total?: unknown
}

export interface NcmInfo { ncm?: string; codigo?: string; descricao?: string; [k: string]: unknown }
