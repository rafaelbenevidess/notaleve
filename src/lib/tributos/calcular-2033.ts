// Modo "2033": simulação da reforma completa usando as calculadoras oficiais da Receita.
import 'server-only'
import { calcularRegimeGeral, calcularSimplesNacional, ErroItem, RespostaRegimeGeral, RespostaSimples } from '@/lib/receita/client'
import { ALIQUOTAS_2033, DATA_2033 } from './cenarios'
import { aliquotaSimples } from './simples'
import { EmpresaFiscal, ItemVenda, ResultadoCalculo, ResultadoItem, r2, somarTotais, zeroTributos } from './tipos'

const num = (v: unknown) => (v === undefined || v === null || v === '' ? 0 : Number(v))
type G = Record<string, unknown>
const g = (o: unknown, ...path: string[]): unknown => path.reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as G)[k] : undefined), o)

const mapErros = (e?: ErroItem[]) => (e ?? []).map((x) => ({ codigo: x.code, mensagem: x.detail || x.title, campo: x.pointer }))

export async function calcular2033(empresa: EmpresaFiscal, itens: ItemVenda[]): Promise<ResultadoCalculo> {
  if (empresa.crt === 4) {
    const res = itens.map<ResultadoItem>((i) => ({
      numero: i.numero, estado: 'ok', base: r2(i.total), tributos: zeroTributos(), total: 0, aliquotaEfetivaPct: 0,
      memoria: 'MEI está fora do escopo do cálculo assistido (NT 2026.005).',
    }))
    return { modo: '2033', motor: 'n/a', itens: res, totais: somarTotais(res), premissas: ['MEI: fora do escopo da calculadora oficial.'] }
  }
  const simples = empresa.crt === 1 || empresa.crt === 2
  if (simples && empresa.tpRegimeIbsCbs !== 1) return calcularSimples(empresa, itens)
  return calcularNormal(empresa, itens, simples)
}

async function calcularSimples(empresa: EmpresaFiscal, itens: ItemVenda[]): Promise<ResultadoCalculo> {
  const a = aliquotaSimples(empresa.rbt12)
  const request = {
    id: crypto.randomUUID(), versao: '1.0.0', data: DATA_2033, tpDoc: '65', CRT: String(empresa.crt),
    itens: itens.map((i) => ({
      numero: i.numero, cAtivSN: empresa.cAtivSN || '01', cClassTrib: i.cClassTrib, baseCalculo: i.total.toFixed(2),
      valorImpostoSeletivo: '0.00', pIBSSN: a.pIBSSN.toFixed(2), pCBSSN: a.pCBSSN.toFixed(2),
    })),
  }
  const { status, body } = await calcularSimplesNacional(request)
  const premissas = [
    `Simples Nacional faixa ${a.faixa}: a parcela de PIS/COFINS do DAS vira CBS (${a.pCBSSN}%) e a de ICMS vira IBS (${a.pIBSSN}%) — premissa a validar com contador.`,
    `IRPJ, CSLL e CPP continuam no DAS (${a.outrosPct.toFixed(2)}%).`,
    `Fato gerador simulado em ${DATA_2033.slice(0, 4)}.`,
  ]
  const motor = 'receita-sn@0.0.6'
  if (status !== 200 || !('objetos' in (body as object))) {
    const erros = mapErros((body as { errors?: ErroItem[] }).errors)
    const res = itens.map<ResultadoItem>((i) => ({ numero: i.numero, estado: 'erro', base: r2(i.total), tributos: zeroTributos(), total: 0, aliquotaEfetivaPct: 0, erros }))
    return { modo: '2033', motor, itens: res, totais: somarTotais(res), premissas, request, response: body }
  }
  const resp = body as RespostaSimples
  const res = itens.map<ResultadoItem>((i) => {
    const o = resp.objetos.find((x) => x.nObj === i.numero)
    const base = r2(i.total)
    if (!o || !o.tribCalc) return { numero: i.numero, estado: 'erro', base, tributos: zeroTributos(), total: 0, aliquotaEfetivaPct: 0, erros: mapErros(o?.erros) }
    const t = { ...zeroTributos(), cbs: num(o.tribCalc.vCBSSN), ibsUf: num(o.tribCalc.vIBSSN), is: num(o.tribCalc.IS?.valor), outros: r2((base * a.outrosPct) / 100) }
    const total = r2(t.cbs + t.ibsUf + t.is + t.outros)
    return {
      numero: i.numero, estado: 'ok', base, tributos: t, total, aliquotaEfetivaPct: base ? r2((total / base) * 100) : 0,
      memoria: `Calculadora oficial do Simples Nacional: CBS ${o.tribCalc.pCBSSN}% = R$ ${o.tribCalc.vCBSSN}; IBS ${o.tribCalc.pIBSSN}% = R$ ${o.tribCalc.vIBSSN}. Demais tributos do DAS: R$ ${t.outros.toFixed(2)}.`,
    }
  })
  return { modo: '2033', motor, itens: res, totais: somarTotais(res), premissas, request, response: body }
}

async function calcularNormal(empresa: EmpresaFiscal, itens: ItemVenda[], simplesRegular: boolean): Promise<ResultadoCalculo> {
  const request = {
    id: crypto.randomUUID().replace(/-/g, ''), versao: '1.0.0', dhFatoGerador: `${DATA_2033}T12:00:00-03:00`,
    municipio: empresa.municipioIbge, uf: empresa.uf,
    itens: itens.map((i) => ({
      numero: i.numero, ncm: i.ncm, cst: i.cstIbsCbs, cClassTrib: i.cClassTrib, baseCalculo: r2(i.total),
      quantidade: i.quantidade, unidade: i.unidade, aliquotasNominais: { ...ALIQUOTAS_2033 },
    })),
  }
  const { body } = await calcularRegimeGeral(request)
  const resp = body as RespostaRegimeGeral
  const outrosPct = simplesRegular ? aliquotaSimples(empresa.rbt12).outrosPct : 0
  const premissas = [
    `Alíquotas nominais estimadas para a reforma completa: CBS ${ALIQUOTAS_2033.cbs}%, IBS estadual ${ALIQUOTAS_2033.ibsEstadual}%, IBS municipal ${ALIQUOTAS_2033.ibsMunicipal}% (premissa; as alíquotas reais serão fixadas por lei).`,
    'Imposto destacado na venda — não considera créditos de compras (não cumulatividade).',
    `Fato gerador simulado em ${DATA_2033.slice(0, 4)}.`,
  ]
  const res = itens.map<ResultadoItem>((i) => {
    const o = resp?.objetos?.find((x) => x.nObj === i.numero)
    const base = r2(i.total)
    if (!o || !o.tribCalc || o.estadoItem === 'INCONSISTENCIA_ENTRADA' || o.estadoItem === 'FALHA_TECNICA') {
      return { numero: i.numero, estado: 'erro', base, tributos: zeroTributos(), total: 0, aliquotaEfetivaPct: 0, erros: mapErros(o?.erros) }
    }
    const gi = o.tribCalc.IBSCBS?.gIBSCBS
    const t = {
      ...zeroTributos(),
      cbs: num(g(gi, 'gCBS', 'vCBS')),
      ibsUf: num(g(gi, 'gIBSUF', 'vIBSUF')),
      ibsMun: num(g(gi, 'gIBSMun', 'vIBSMun')),
      is: num(g(o.tribCalc.IS, 'vIS')),
      outros: r2((base * outrosPct) / 100),
    }
    const total = r2(t.cbs + t.ibsUf + t.ibsMun + t.is + t.outros)
    const memoria = [g(gi, 'gCBS', 'memoriaCalculo'), g(gi, 'gIBSUF', 'memoriaCalculo')].filter(Boolean).join(' ')
    return {
      numero: i.numero, estado: o.estadoItem === 'CALCULADO' ? 'ok' : 'simulado', base, tributos: t, total,
      aliquotaEfetivaPct: base ? r2((total / base) * 100) : 0, memoria: memoria || undefined,
    }
  })
  return { modo: '2033', motor: 'receita-rg@1.6.1', itens: res, totais: somarTotais(res), premissas, request, response: body }
}
