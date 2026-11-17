// Montagem do XML da NFC-e (modelo 65, layout 4.00) com o grupo IBSCBS da NT 2025.002.
// Função pura: recebe tudo pronto e devolve o XML sem assinatura.
import { gerarCodigoNumerico, montarChave } from '../chave'

export const NS = 'http://www.portalfiscal.inf.br/nfe'
export const MSG_HOMOLOGACAO = 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'

export interface EmitenteNfce {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string | null
  ie: string
  uf: string
  municipioIbge: number
  municipioNome: string
  logradouro: string
  numero: string
  bairro: string
  cep: string
  crt: 1 | 2 | 3 | 4
}

export interface ItemNfce {
  numero: number
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number
  desconto: number
  csosn: string
  /** valores do "modo hoje" */
  icms: { base: number; aliquota: number; valor: number }
  pis: { aliquota: number; valor: number }
  cofins: { aliquota: number; valor: number }
  /** XML do grupo <IBSCBS> gerado pela calculadora oficial (opcional) */
  grupoIbsCbs?: string | null
  /** tributos aproximados (Lei 12.741/2012) */
  valorTributos: number
}

export interface PagamentoNfce { meio: string; valor: number }

export interface DadosNfce {
  emitente: EmitenteNfce
  ambiente: 1 | 2
  serie: number
  numero: number
  emissao: Date
  itens: ItemNfce[]
  pagamentos: PagamentoNfce[]
  /** XML do <IBSCBSTot> gerado pela calculadora oficial (opcional) */
  totalIbsCbs?: string | null
  respTec: { cnpj: string; contato: string; email: string; fone: string }
  versaoAplicativo: string
  codigoNumerico?: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const txt = (s: string, max: number) => esc(s.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, max))
const d2 = (n: number) => n.toFixed(2)
const d4 = (n: number) => n.toFixed(4)
const tag = (nome: string, valor: string | number | null | undefined) => (valor === null || valor === undefined || valor === '' ? '' : `<${nome}>${valor}</${nome}>`)

/** Data no formato AAAA-MM-DDThh:mm:ss-03:00 (horário de Brasília) */
export function dataHoraBrasilia(d: Date): string {
  const local = new Date(d.getTime() - 3 * 3600_000)
  return local.toISOString().slice(0, 19) + '-03:00'
}

export function montarXmlNfce(dados: DadosNfce): { xml: string; chave: string; idInfNFe: string } {
  const e = dados.emitente
  const tpEmis = 1
  const cNF = dados.codigoNumerico ?? gerarCodigoNumerico(dados.numero)
  const { chave, cDV } = montarChave({ uf: e.uf, emissao: dados.emissao, cnpj: e.cnpj, modelo: 65, serie: dados.serie, numero: dados.numero, tpEmis, codigoNumerico: cNF })
  const id = `NFe${chave}`
  const simples = e.crt === 1 || e.crt === 2 || e.crt === 4

  const det = dados.itens.map((i, idx) => {
    const vProd = i.quantidade * i.valorUnitario
    const xProd = dados.ambiente === 2 && idx === 0 ? MSG_HOMOLOGACAO : txt(i.descricao, 120)
    const icms = simples
      ? `<ICMS><ICMSSN102><orig>0</orig><CSOSN>${i.csosn}</CSOSN></ICMSSN102></ICMS>`
      : `<ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>${d2(i.icms.base)}</vBC><pICMS>${d4(i.icms.aliquota)}</pICMS><vICMS>${d2(i.icms.valor)}</vICMS></ICMS00></ICMS>`
    const base = vProd - i.desconto
    const pis = simples
      ? `<PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>`
      : `<PIS><PISAliq><CST>01</CST><vBC>${d2(base)}</vBC><pPIS>${d4(i.pis.aliquota)}</pPIS><vPIS>${d2(i.pis.valor)}</vPIS></PISAliq></PIS>`
    const cofins = simples
      ? `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>`
      : `<COFINS><COFINSAliq><CST>01</CST><vBC>${d2(base)}</vBC><pCOFINS>${d4(i.cofins.aliquota)}</pCOFINS><vCOFINS>${d2(i.cofins.valor)}</vCOFINS></COFINSAliq></COFINS>`
    return (
      `<det nItem="${i.numero}"><prod>` +
      tag('cProd', txt(i.codigo, 60)) + tag('cEAN', 'SEM GTIN') + tag('xProd', xProd) + tag('NCM', i.ncm) + tag('CFOP', i.cfop) +
      tag('uCom', txt(i.unidade, 6)) + tag('qCom', d4(i.quantidade)) + tag('vUnCom', i.valorUnitario.toFixed(10)) + tag('vProd', d2(vProd)) +
      tag('cEANTrib', 'SEM GTIN') + tag('uTrib', txt(i.unidade, 6)) + tag('qTrib', d4(i.quantidade)) + tag('vUnTrib', i.valorUnitario.toFixed(10)) +
      (i.desconto > 0 ? tag('vDesc', d2(i.desconto)) : '') + tag('indTot', 1) +
      `</prod><imposto>${tag('vTotTrib', d2(i.valorTributos))}${icms}${pis}${cofins}${i.grupoIbsCbs ?? ''}</imposto></det>`
    )
  }).join('')

  const soma = (f: (i: ItemNfce) => number) => dados.itens.reduce((s, i) => s + f(i), 0)
  const vProdT = soma((i) => i.quantidade * i.valorUnitario)
  const vDescT = soma((i) => i.desconto)
  const vNF = vProdT - vDescT
  const vICMS = simples ? 0 : soma((i) => i.icms.valor)
  const vBC = simples ? 0 : soma((i) => i.icms.base)
  const vPIS = simples ? 0 : soma((i) => i.pis.valor)
  const vCOFINS = simples ? 0 : soma((i) => i.cofins.valor)
  const vTotTrib = soma((i) => i.valorTributos)
  const pagoT = dados.pagamentos.reduce((s, p) => s + p.valor, 0)
  const troco = Math.max(0, Math.round((pagoT - vNF) * 100) / 100)

  const total =
    `<total><ICMSTot>${tag('vBC', d2(vBC))}${tag('vICMS', d2(vICMS))}<vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>` +
    `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>${tag('vProd', d2(vProdT))}<vFrete>0.00</vFrete><vSeg>0.00</vSeg>${tag('vDesc', d2(vDescT))}` +
    `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>${tag('vPIS', d2(vPIS))}${tag('vCOFINS', d2(vCOFINS))}<vOutro>0.00</vOutro>` +
    `${tag('vNF', d2(vNF))}${tag('vTotTrib', d2(vTotTrib))}</ICMSTot>${dados.totalIbsCbs ?? ''}</total>`

  const pag =
    '<pag>' + dados.pagamentos.map((p) => `<detPag><tPag>${p.meio}</tPag><vPag>${d2(p.valor)}</vPag></detPag>`).join('') +
    (troco > 0 ? tag('vTroco', d2(troco)) : '') + '</pag>'

  const xml =
    `<NFe xmlns="${NS}"><infNFe Id="${id}" versao="4.00">` +
    `<ide><cUF>${chave.slice(0, 2)}</cUF><cNF>${cNF}</cNF><natOp>VENDA</natOp><mod>65</mod><serie>${dados.serie}</serie><nNF>${dados.numero}</nNF>` +
    `<dhEmi>${dataHoraBrasilia(dados.emissao)}</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>${e.municipioIbge}</cMunFG><tpImp>4</tpImp>` +
    `<tpEmis>${tpEmis}</tpEmis><cDV>${cDV}</cDV><tpAmb>${dados.ambiente}</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres>` +
    `<procEmi>0</procEmi><verProc>${txt(dados.versaoAplicativo, 20)}</verProc></ide>` +
    `<emit><CNPJ>${e.cnpj}</CNPJ>${tag('xNome', txt(e.razaoSocial, 60))}${e.nomeFantasia ? tag('xFant', txt(e.nomeFantasia, 60)) : ''}` +
    `<enderEmit>${tag('xLgr', txt(e.logradouro || 'NAO INFORMADO', 60))}${tag('nro', txt(e.numero || 'S/N', 60))}${tag('xBairro', txt(e.bairro || 'NAO INFORMADO', 60))}` +
    `<cMun>${e.municipioIbge}</cMun>${tag('xMun', txt(e.municipioNome, 60))}<UF>${e.uf}</UF><CEP>${e.cep}</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit>` +
    `<IE>${e.ie.replace(/\D/g, '')}</IE><CRT>${e.crt === 4 ? 4 : e.crt}</CRT></emit>` +
    det + total + '<transp><modFrete>9</modFrete></transp>' + pag +
    `<infRespTec><CNPJ>${dados.respTec.cnpj}</CNPJ>${tag('xContato', txt(dados.respTec.contato, 60))}${tag('email', txt(dados.respTec.email, 60))}<fone>${dados.respTec.fone}</fone></infRespTec>` +
    `</infNFe></NFe>`
  return { xml, chave, idInfNFe: id }
}
