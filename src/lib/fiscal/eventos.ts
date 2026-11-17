// XMLs de evento de cancelamento (110111) e de inutilização de numeração.
import { CODIGO_UF } from './chave'
import { dataHoraBrasilia, NS } from './nfce/xml'

export function xmlCancelamento(p: { chave: string; cnpj: string; ambiente: 1 | 2; protocolo: string; justificativa: string; quando?: Date }) {
  const just = p.justificativa.trim()
  if (just.length < 15) throw new Error('A justificativa do cancelamento precisa ter ao menos 15 caracteres.')
  const id = `ID110111${p.chave}01`
  const xml =
    `<evento xmlns="${NS}" versao="1.00"><infEvento Id="${id}"><cOrgao>${p.chave.slice(0, 2)}</cOrgao><tpAmb>${p.ambiente}</tpAmb>` +
    `<CNPJ>${p.cnpj}</CNPJ><chNFe>${p.chave}</chNFe><dhEvento>${dataHoraBrasilia(p.quando ?? new Date())}</dhEvento>` +
    `<tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${p.protocolo}</nProt><xJust>${escapar(just.slice(0, 255))}</xJust></detEvento>` +
    `</infEvento></evento>`
  return { xml, id }
}

export function xmlInutilizacao(p: { uf: string; cnpj: string; ambiente: 1 | 2; ano: number; serie: number; numeroInicial: number; numeroFinal: number; justificativa: string }) {
  const just = p.justificativa.trim()
  if (just.length < 15) throw new Error('A justificativa da inutilização precisa ter ao menos 15 caracteres.')
  const cUF = CODIGO_UF[p.uf]
  const aa = String(p.ano).slice(2)
  const id = `ID${cUF}${aa}${p.cnpj}65${String(p.serie).padStart(3, '0')}${String(p.numeroInicial).padStart(9, '0')}${String(p.numeroFinal).padStart(9, '0')}`
  const xml =
    `<inutNFe xmlns="${NS}" versao="4.00"><infInut Id="${id}"><tpAmb>${p.ambiente}</tpAmb><xServ>INUTILIZAR</xServ><cUF>${cUF}</cUF><ano>${aa}</ano>` +
    `<CNPJ>${p.cnpj}</CNPJ><mod>65</mod><serie>${p.serie}</serie><nNFIni>${p.numeroInicial}</nNFIni><nNFFin>${p.numeroFinal}</nNFFin>` +
    `<xJust>${escapar(just.slice(0, 255))}</xJust></infInut></inutNFe>`
  return { xml, id }
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
