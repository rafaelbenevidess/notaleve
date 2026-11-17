// Comunicação SOAP 1.2 com a SEFAZ (mTLS com o certificado A1 do emitente).
import https from 'node:https'
import http from 'node:http'
import type { CertificadoA1 } from './certificado'
import { NS } from './nfce/xml'

const WSDL = 'http://www.portalfiscal.inf.br/nfe/wsdl'

function envelope(servico: string, corpo: string) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    `<soap12:Body><nfeDadosMsg xmlns="${WSDL}/${servico}">${corpo}</nfeDadosMsg></soap12:Body></soap12:Envelope>`
  )
}

export async function postSoap(url: string, servico: string, corpo: string, cert: CertificadoA1 | null, timeoutMs = 30_000): Promise<string> {
  const body = envelope(servico, corpo)
  const u = new URL(url)
  const isHttps = u.protocol === 'https:'
  const opts: https.RequestOptions = {
    method: 'POST',
    hostname: u.hostname,
    port: u.port || (isHttps ? 443 : 80),
    path: u.pathname + u.search,
    headers: { 'Content-Type': `application/soap+xml; charset=utf-8; action="${WSDL}/${servico}/nfeAutorizacaoLote"`, 'Content-Length': Buffer.byteLength(body) },
    timeout: timeoutMs,
    ...(isHttps && cert ? { key: cert.chavePrivadaPem, cert: cert.certificadoPem } : {}),
  }
  return new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request(opts, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8')
        if ((res.statusCode ?? 500) >= 500 && !txt.includes('cStat')) reject(new Error(`SEFAZ respondeu HTTP ${res.statusCode}`))
        else resolve(txt)
      })
    })
    req.on('timeout', () => req.destroy(new Error('Tempo esgotado ao falar com a SEFAZ')))
    req.on('error', (e) => reject(new Error(`Falha de comunicação com a SEFAZ: ${e.message}`)))
    req.end(body)
  })
}

// --------------------------------------------------------------- parsing
// Leitura por nome local (ignora prefixo/namespace): trechos extraídos perdem o xmlns herdado.
function primeiro(xml: string, local: string, dentroDe?: string): string | null {
  const escopo = dentroDe ? trecho(xml, dentroDe) ?? '' : xml
  const m = escopo.match(new RegExp(`<(?:\\w+:)?${local}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${local}>`))
  return m ? m[1] : null
}
function trecho(xml: string, local: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${local}[\\s>][\\s\\S]*?</(?:\\w+:)?${local}>`))
  return m ? m[0] : null
}

export interface RetornoAutorizacao {
  cStatLote: string | null
  cStat: string | null
  xMotivo: string | null
  protocolo: string | null
  protNFe: string | null
  respostaXml: string
}

export async function autorizar(url: string, idLote: string, nfeAssinada: string, cert: CertificadoA1 | null): Promise<RetornoAutorizacao> {
  const enviNFe = `<enviNFe xmlns="${NS}" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${nfeAssinada.replace(/^<\?xml[^>]*>/, '')}</enviNFe>`
  const resp = await postSoap(url, 'NFeAutorizacao4', enviNFe, cert)
  const protNFe = trecho(resp, 'protNFe')
  return {
    cStatLote: primeiro(resp, 'cStat', 'retEnviNFe'),
    cStat: protNFe ? primeiro(protNFe, 'cStat') : primeiro(resp, 'cStat'),
    xMotivo: protNFe ? primeiro(protNFe, 'xMotivo') : primeiro(resp, 'xMotivo'),
    protocolo: protNFe ? primeiro(protNFe, 'nProt') : null,
    protNFe,
    respostaXml: resp,
  }
}

export function montarNfeProc(nfeAssinada: string, protNFe: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="${NS}" versao="4.00">${nfeAssinada.replace(/^<\?xml[^>]*>/, '')}${protNFe.replace(/ xmlns="[^"]*"/, '')}</nfeProc>`
}

export interface RetornoEvento { cStat: string | null; xMotivo: string | null; protocolo: string | null; respostaXml: string }

export async function enviarEvento(url: string, idLote: string, eventoAssinado: string, cert: CertificadoA1 | null): Promise<RetornoEvento> {
  const env = `<envEvento xmlns="${NS}" versao="1.00"><idLote>${idLote}</idLote>${eventoAssinado.replace(/^<\?xml[^>]*>/, '')}</envEvento>`
  const resp = await postSoap(url, 'NFeRecepcaoEvento4', env, cert)
  const ret = trecho(resp, 'retEvento') ?? resp
  return { cStat: primeiro(ret, 'cStat'), xMotivo: primeiro(ret, 'xMotivo'), protocolo: primeiro(ret, 'nProt'), respostaXml: resp }
}

export async function inutilizar(url: string, inutAssinado: string, cert: CertificadoA1 | null): Promise<RetornoEvento> {
  const resp = await postSoap(url, 'NFeInutilizacao4', inutAssinado.replace(/^<\?xml[^>]*>/, ''), cert)
  return { cStat: primeiro(resp, 'cStat'), xMotivo: primeiro(resp, 'xMotivo'), protocolo: primeiro(resp, 'nProt'), respostaXml: resp }
}

export async function statusServico(url: string, cUF: string, ambiente: 1 | 2, cert: CertificadoA1 | null) {
  const corpo = `<consStatServ xmlns="${NS}" versao="4.00"><tpAmb>${ambiente}</tpAmb><cUF>${cUF}</cUF><xServ>STATUS</xServ></consStatServ>`
  const resp = await postSoap(url, 'NFeStatusServico4', corpo, cert, 10_000)
  return { cStat: primeiro(resp, 'cStat'), xMotivo: primeiro(resp, 'xMotivo') }
}
