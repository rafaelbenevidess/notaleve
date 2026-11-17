// QR Code da NFC-e — versão 2, emissão online.
// p = chave|2|tpAmb|cIdToken|hash ; hash = SHA1(chave|2|tpAmb|cIdToken + CSC) em hexadecimal maiúsculo.
import { createHash } from 'node:crypto'

export function urlQrCodeNfce(params: { urlBase: string; chave: string; ambiente: 1 | 2; cscId: string; csc: string }): string {
  const idToken = String(Number(params.cscId)) // sem zeros à esquerda
  const corpo = `${params.chave}|2|${params.ambiente}|${idToken}`
  const hash = createHash('sha1').update(corpo + params.csc).digest('hex').toUpperCase()
  const sep = params.urlBase.includes('?') ? '&' : '?'
  return `${params.urlBase}${sep}p=${corpo}|${hash}`
}

export function infNFeSupl(qrCode: string, urlChave: string): string {
  return `<infNFeSupl><qrCode><![CDATA[${qrCode}]]></qrCode><urlChave>${urlChave}</urlChave></infNFeSupl>`
}
