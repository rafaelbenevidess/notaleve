// Preparo da NFC-e: monta XML → insere infNFeSupl (QR Code) → assina.
import { assinarXml } from '../assinatura'
import type { CertificadoA1 } from '../certificado'
import { infNFeSupl, urlQrCodeNfce } from '../qrcode'
import type { UrlsAutorizador } from '../webservices'
import { DadosNfce, montarXmlNfce } from './xml'

export interface NfcePreparada {
  chave: string
  xmlAssinado: string
  qrCode: string
  urlConsulta: string
}

export function prepararNfce(dados: DadosNfce, cert: CertificadoA1, csc: { id: string; codigo: string }, urls: UrlsAutorizador): NfcePreparada {
  const { xml, chave } = montarXmlNfce(dados)
  const qrCode = urlQrCodeNfce({ urlBase: urls.qrCode, chave, ambiente: dados.ambiente, cscId: csc.id, csc: csc.codigo })
  const comSupl = xml.replace('</infNFe>', `</infNFe>${infNFeSupl(qrCode, urls.consultaChave)}`)
  const xmlAssinado = assinarXml(comSupl, cert, 'infNFe', 'NFe')
  return { chave, xmlAssinado, qrCode, urlConsulta: urls.consultaChave }
}
