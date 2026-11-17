// SEFAZ simulada para desenvolvimento local (docs/06-emissao-nfce.md).
// Mesmo contrato SOAP 1.2 dos webservices 4.00. Valida assinatura e chave de verdade;
// mantém estado em memória. NÃO tem valor fiscal.
//   npm run sefaz:mock      (porta 8090, ou SEFAZ_MOCK_PORT)
//
// Gatilhos de teste: descrição de item contendo "REJEITAR" → cStat 778 (simulação de rejeição).
import http from 'node:http'
import { createHash } from 'node:crypto'
import { verificarAssinatura } from '../../src/lib/fiscal/assinatura'
import { validarChave } from '../../src/lib/fiscal/chave'

const NS = 'http://www.portalfiscal.inf.br/nfe'
const porta = Number(process.env.SEFAZ_MOCK_PORT ?? 8090)
const autorizadas = new Map<string, { nProt: string; numero: string; serie: string; cnpj: string; cancelada: boolean }>()
let seqProt = 135_260_000_000_000

const tag = (xml: string, nome: string) => xml.match(new RegExp(`<${nome}>([^<]*)</${nome}>`))?.[1] ?? null
const agora = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 19) + '-03:00'
const soap = (servico: string, corpo: string) =>
  `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>` +
  `<nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${servico}">${corpo}</nfeResultMsg></soap:Body></soap:Envelope>`

function autorizacao(body: string): string {
  const nfe = body.match(/<NFe[\s\S]*<\/NFe>/)?.[0]
  if (!nfe) return retLote('225', 'Rejeição: Falha no Schema XML do lote de NFe')
  const chave = nfe.match(/Id="NFe(\d{44})"/)?.[1] ?? ''
  const tpAmb = tag(nfe, 'tpAmb') ?? '2'
  const prot = (cStat: string, xMotivo: string, nProt?: string) =>
    `<protNFe versao="4.00"><infProt><tpAmb>${tpAmb}</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic><chNFe>${chave}</chNFe>` +
    `<dhRecbto>${agora()}</dhRecbto>${nProt ? `<nProt>${nProt}</nProt>` : ''}` +
    `<digVal>${tag(nfe, 'DigestValue') ?? ''}</digVal><cStat>${cStat}</cStat><xMotivo>${xMotivo}</xMotivo></infProt></protNFe>`
  const lote = (protNFe: string) =>
    `<retEnviNFe xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb}</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic><cStat>104</cStat>` +
    `<xMotivo>Lote processado</xMotivo><cUF>${chave.slice(0, 2)}</cUF><dhRecbto>${agora()}</dhRecbto>${protNFe}</retEnviNFe>`

  if (!validarChave(chave)) return lote(prot('236', 'Rejeição: Chave de Acesso com dígito verificador inválido'))
  if (!verificarAssinatura(nfe)) return lote(prot('297', 'Rejeição: Assinatura difere do calculado'))
  if (tpAmb === '2' && !nfe.includes('NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'))
    return lote(prot('373', 'Rejeição: Descrição do primeiro item diferente de NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'))
  if (/REJEITAR/i.test(nfe)) return lote(prot('778', 'Rejeição: Informado NCM inexistente [simulação]'))
  const numero = tag(nfe, 'nNF')!, serie = tag(nfe, 'serie')!, cnpj = tag(nfe, 'CNPJ')!
  for (const [k, v] of autorizadas)
    if (k !== chave && v.cnpj === cnpj && v.serie === serie && v.numero === numero) return lote(prot('539', 'Rejeição: Duplicidade de NF-e com diferença na Chave de Acesso'))
  const ja = autorizadas.get(chave)
  if (ja) return lote(prot('204', `Rejeição: Duplicidade de NF-e [nProt:${ja.nProt}]`))
  const nProt = String(++seqProt)
  autorizadas.set(chave, { nProt, numero, serie, cnpj, cancelada: false })
  return lote(prot('100', 'Autorizado o uso da NF-e', nProt))
}

function retLote(cStat: string, xMotivo: string) {
  return `<retEnviNFe xmlns="${NS}" versao="4.00"><tpAmb>2</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic><cStat>${cStat}</cStat><xMotivo>${xMotivo}</xMotivo></retEnviNFe>`
}

function evento(body: string): string {
  const ev = body.match(/<evento[\s\S]*<\/evento>/)?.[0] ?? ''
  const chave = tag(ev, 'chNFe') ?? ''
  const ret = (cStat: string, xMotivo: string, nProt?: string) =>
    `<retEnvEvento xmlns="${NS}" versao="1.00"><idLote>${tag(body, 'idLote')}</idLote><tpAmb>2</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic><cOrgao>${chave.slice(0, 2)}</cOrgao>` +
    `<cStat>128</cStat><xMotivo>Lote de Evento Processado</xMotivo><retEvento versao="1.00"><infEvento><tpAmb>2</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic>` +
    `<cOrgao>${chave.slice(0, 2)}</cOrgao><cStat>${cStat}</cStat><xMotivo>${xMotivo}</xMotivo><chNFe>${chave}</chNFe><tpEvento>110111</tpEvento>` +
    `<nSeqEvento>1</nSeqEvento><dhRegEvento>${agora()}</dhRegEvento>${nProt ? `<nProt>${nProt}</nProt>` : ''}</infEvento></retEvento></retEnvEvento>`
  if (!verificarAssinatura(ev)) return ret('297', 'Rejeição: Assinatura difere do calculado')
  const nota = autorizadas.get(chave)
  if (!nota) return ret('217', 'Rejeição: NF-e não consta na base de dados da SEFAZ')
  if (nota.cancelada) return ret('573', 'Rejeição: Duplicidade de Evento')
  if (tag(ev, 'nProt') !== nota.nProt) return ret('222', 'Rejeição: Protocolo de Autorização de Uso difere do cadastrado')
  nota.cancelada = true
  return ret('135', 'Evento registrado e vinculado a NF-e', String(++seqProt))
}

function inutilizacao(body: string): string {
  const inut = body.match(/<inutNFe[\s\S]*<\/inutNFe>/)?.[0] ?? ''
  const ok = verificarAssinatura(inut)
  const id = inut.match(/Id="(ID\d+)"/)?.[1] ?? ''
  return (
    `<retInutNFe xmlns="${NS}" versao="4.00"><infInut Id="${id}"><tpAmb>2</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic>` +
    (ok ? `<cStat>102</cStat><xMotivo>Inutilização de número homologado</xMotivo>` : `<cStat>297</cStat><xMotivo>Rejeição: Assinatura difere do calculado</xMotivo>`) +
    `<cUF>${tag(inut, 'cUF')}</cUF><ano>${tag(inut, 'ano')}</ano><CNPJ>${tag(inut, 'CNPJ')}</CNPJ><mod>65</mod><serie>${tag(inut, 'serie')}</serie>` +
    `<nNFIni>${tag(inut, 'nNFIni')}</nNFIni><nNFFin>${tag(inut, 'nNFFin')}</nNFFin><dhRecbto>${agora()}</dhRecbto>` +
    (ok ? `<nProt>${++seqProt}</nProt>` : '') + `</infInut></retInutNFe>`
  )
}

const status = () =>
  `<retConsStatServ xmlns="${NS}" versao="4.00"><tpAmb>2</tpAmb><verAplic>SEFAZ-MOCK-1.0</verAplic><cStat>107</cStat><xMotivo>Serviço em Operação</xMotivo><dhRecbto>${agora()}</dhRecbto><tMed>1</tMed></retConsStatServ>`

const rotas: Record<string, (b: string) => string> = {
  '/ws/NFeAutorizacao4': autorizacao,
  '/ws/NFeRecepcaoEvento4': evento,
  '/ws/NFeInutilizacao4': inutilizacao,
  '/ws/NFeStatusServico4': status,
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    if (req.method === 'GET' && (url.pathname === '/qrcode' || url.pathname === '/consulta')) {
      const chave = (url.searchParams.get('p') ?? '').split('|')[0]
      const n = autorizadas.get(chave)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<h1>SEFAZ simulada</h1><p>Chave ${chave}: ${n ? (n.cancelada ? 'CANCELADA' : `AUTORIZADA (protocolo ${n.nProt})`) : 'não encontrada'}</p>`)
      return
    }
    if (req.method === 'GET' && url.pathname === '/health') { res.end('ok'); return }
    const h = rotas[url.pathname]
    if (req.method !== 'POST' || !h) { res.writeHead(404).end(); return }
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const servico = url.pathname.split('/').pop()!
      const resp = soap(servico, h(body))
      const tag = createHash('sha1').update(body).digest('hex').slice(0, 8)
      console.log(`[sefaz-mock] ${servico} ${tag} → ${resp.match(/<cStat>(\d+)<\/cStat>(?![\s\S]*<cStat>)/)?.[1] ?? '?'}`)
      res.writeHead(200, { 'Content-Type': 'application/soap+xml; charset=utf-8' })
      res.end(resp)
    })
  })
  .listen(porta, () => console.log(`[sefaz-mock] ouvindo em http://localhost:${porta}`))
