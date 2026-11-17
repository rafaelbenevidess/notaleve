// Fase 0B — valida a emissão de NFC-e na HOMOLOGAÇÃO REAL de uma SEFAZ (sem valor fiscal).
// Faz: status do serviço → emite NFC-e de R$ 1,00 → cancela. Nada é gravado no banco.
//
//   SEFAZ_CA_FILE=icp-brasil.pem npx tsx scripts/validar-homologacao.mts \
//     --pfx certificado.pfx --senha 1234 --uf SP --ie 111222333444 --csc-id 1 --csc SEU-CSC \
//     [--serie 900] [--numero 1] [--municipio 3550308] [--sem-cancelar]
//
// Requisitos: certificado A1 ICP-Brasil do CNPJ, IE habilitada para NFC-e e CSC de HOMOLOGAÇÃO,
// rede liberada para os hosts de homologação da UF e SEFAZ_CA_FILE com a cadeia ICP-Brasil.
// Use uma série exclusiva (ex.: 900) para não conflitar com a numeração do app.
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { lerPfx, validarCertificado } from '../src/lib/fiscal/certificado'
import { assinarXml } from '../src/lib/fiscal/assinatura'
import { CODIGO_UF } from '../src/lib/fiscal/chave'
import { xmlCancelamento } from '../src/lib/fiscal/eventos'
import { prepararNfce } from '../src/lib/fiscal/nfce/preparar'
import { autorizar, enviarEvento, statusServico } from '../src/lib/fiscal/sefaz'
import { AUTORIZADORES } from '../src/lib/fiscal/webservices'

const falhar = (e: unknown) => { console.error(`\n✖ ${(e as Error)?.message ?? e}`); process.exit(1) }
process.on('uncaughtException', falhar)
process.on('unhandledRejection', falhar)

const { values: a } = parseArgs({
  options: {
    pfx: { type: 'string' }, senha: { type: 'string' }, uf: { type: 'string', default: 'SP' }, ie: { type: 'string' },
    'csc-id': { type: 'string' }, csc: { type: 'string' }, serie: { type: 'string', default: '900' }, numero: { type: 'string', default: '1' },
    municipio: { type: 'string', default: '3550308' }, 'sem-cancelar': { type: 'boolean', default: false },
  },
})
const faltando = ['pfx', 'senha', 'ie', 'csc-id', 'csc'].filter((k) => !a[k as keyof typeof a])
if (faltando.length) { console.error(`Faltam argumentos: ${faltando.map((f) => `--${f}`).join(' ')}`); process.exit(2) }
if (!process.env.SEFAZ_CA_FILE) console.warn('Aviso: SEFAZ_CA_FILE não definido — a conexão TLS com a SEFAZ deve falhar (cadeia ICP-Brasil). Ver T-16.')

const uf = a.uf!.toUpperCase()
const aut = AUTORIZADORES.find((x) => x.ufs.includes(uf))
if (!aut) { console.error(`UF ${uf} sem autorizador cadastrado em src/lib/fiscal/webservices.ts`); process.exit(2) }
const urls = aut.homologacao

const cert = lerPfx(readFileSync(a.pfx!), a.senha!)
if (!cert.cnpj) { console.error('Não encontrei o CNPJ no certificado.'); process.exit(2) }
const problemas = validarCertificado(cert, cert.cnpj)
if (problemas.length) { console.error(problemas.join(' ')); process.exit(2) }
console.log(`Certificado: ${cert.cn} (válido até ${cert.validoAte.toLocaleDateString('pt-BR')})`)
console.log(`Autorizador: ${aut.nome} — homologação`)

const passo = (t: string) => console.log(`\n▶ ${t}`)
passo('Status do serviço')
const st = await statusServico(urls.statusServico, CODIGO_UF[uf], 2, cert)
console.log(`  cStat ${st.cStat} — ${st.xMotivo}`)
if (st.cStat !== '107') process.exit(1)

passo('Emissão de NFC-e de teste (R$ 1,00)')
const p = prepararNfce({
  emitente: { cnpj: cert.cnpj, razaoSocial: cert.cn.split(':')[0], ie: a.ie!, uf, municipioIbge: Number(a.municipio), municipioNome: 'TESTE',
    logradouro: 'RUA TESTE', numero: '1', bairro: 'CENTRO', cep: '01001000', crt: 1 },
  ambiente: 2, serie: Number(a.serie), numero: Number(a.numero), emissao: new Date(),
  itens: [{ numero: 1, codigo: 'TESTE', descricao: 'ITEM DE TESTE', ncm: '61091000', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 1, desconto: 0,
    csosn: '102', icms: { base: 0, aliquota: 0, valor: 0 }, pis: { aliquota: 0, valor: 0 }, cofins: { aliquota: 0, valor: 0 }, valorTributos: 0.04 }],
  pagamentos: [{ meio: '17', valor: 1 }],
  respTec: { cnpj: process.env.RESP_TEC_CNPJ ?? cert.cnpj, contato: 'NotaLeve', email: process.env.RESP_TEC_EMAIL ?? 'contato@notaleve.local', fone: process.env.RESP_TEC_FONE ?? '11999999999' },
  versaoAplicativo: 'NotaLeve 0.1.0',
}, cert, { id: a['csc-id']!, codigo: a.csc! }, urls)
console.log(`  chave ${p.chave}`)
const r = await autorizar(urls.autorizacao, String(Date.now()).slice(-15), p.xmlAssinado, cert)
console.log(`  cStat ${r.cStat} — ${r.xMotivo}${r.protocolo ? ` (protocolo ${r.protocolo})` : ''}`)
if (r.cStat !== '100') { console.log('\nResposta completa:\n' + r.respostaXml); process.exit(1) }
console.log(`  QR Code: ${p.qrCode}`)

if (!a['sem-cancelar']) {
  passo('Cancelamento')
  const c = xmlCancelamento({ chave: p.chave, cnpj: cert.cnpj, ambiente: 2, protocolo: r.protocolo!, justificativa: 'Teste de homologacao do NotaLeve' })
  const ev = await enviarEvento(urls.evento, String(Date.now()).slice(-15), assinarXml(c.xml, cert, 'infEvento', 'evento'), cert)
  console.log(`  cStat ${ev.cStat} — ${ev.xMotivo}`)
  if (ev.cStat !== '135') process.exit(1)
}
console.log('\n✅ Homologação validada. Atualize "conferido: true" em src/lib/fiscal/webservices.ts para esta UF.')
