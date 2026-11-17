// Fluxo fiscal ponta a ponta sem banco: monta, assina, valida no XSD oficial da Receita
// e autoriza/cancela/inutiliza na SEFAZ simulada.
// Requer: calculadoras locais (8080) e `npm run sefaz:mock` (8090).
import { beforeAll, describe, expect, it } from 'vitest'
import { gerarPfxTeste } from '../../scripts/certificado-teste'
import { lerPfx, validarCertificado } from '@/lib/fiscal/certificado'
import { assinarXml, verificarAssinatura } from '@/lib/fiscal/assinatura'
import { validarChave } from '@/lib/fiscal/chave'
import { prepararNfce } from '@/lib/fiscal/nfce/preparar'
import { DadosNfce } from '@/lib/fiscal/nfce/xml'
import { autorizar, enviarEvento, inutilizar, montarNfeProc, statusServico } from '@/lib/fiscal/sefaz'
import { xmlCancelamento, xmlInutilizacao } from '@/lib/fiscal/eventos'
import { urlsMock } from '@/lib/fiscal/webservices'
import { gerarGruposIbsCbs } from '@/lib/fiscal/nfce/ibscbs'

const CNPJ = '11222333000181'
const cert = lerPfx(gerarPfxTeste(CNPJ, 'senha-teste'), 'senha-teste')
const urls = urlsMock('http://localhost:8090')
const BASE = (Date.now() % 900_000) * 10 // numeração única por execução (o mock guarda estado)

let mockOnline = false
beforeAll(async () => {
  try { mockOnline = (await fetch('http://localhost:8090/health')).ok } catch { mockOnline = false }
  expect(mockOnline, 'SEFAZ simulada fora do ar (npm run sefaz:mock)').toBe(true)
})

function dados(crt: 1 | 3, numero: number, extra?: Partial<DadosNfce>): DadosNfce {
  return {
    emitente: { cnpj: CNPJ, razaoSocial: 'LOJA EXEMPLO LTDA', nomeFantasia: 'Loja Exemplo', ie: '111222333444', uf: 'SP', municipioIbge: 3550308,
      municipioNome: 'São Paulo', logradouro: 'Rua das Flores', numero: '100', bairro: 'Centro', cep: '01001000', crt },
    ambiente: 2, serie: 1, numero, emissao: new Date(),
    itens: [{ numero: 1, codigo: 'CAM-01', descricao: 'Camiseta algodão', ncm: '61091000', cfop: '5102', unidade: 'UN', quantidade: 2,
      valorUnitario: 50, desconto: 0, csosn: '102', icms: { base: 100, aliquota: crt === 3 ? 18 : 0, valor: crt === 3 ? 18 : 0 },
      pis: { aliquota: 0.65, valor: 0.65 }, cofins: { aliquota: 3, valor: 3 }, valorTributos: 4 }],
    pagamentos: [{ meio: '17', valor: 100 }],
    respTec: { cnpj: '00000000000191', contato: 'NotaLeve', email: 'contato@notaleve.local', fone: '11999999999' },
    versaoAplicativo: 'NotaLeve 0.1.0',
    ...extra,
  }
}

async function validarXsdReceita(xml: string) {
  const r = await fetch('http://localhost:8080/api/calculadora/xml/validate?tipo=nfce&subtipo=nota', {
    method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: xml,
  })
  return { status: r.status, corpo: await r.text() }
}

describe('certificado A1', () => {
  it('lê pfx, extrai CNPJ do CN ICP-Brasil e valida contra a empresa', () => {
    expect(cert.cnpj).toBe(CNPJ)
    expect(validarCertificado(cert, CNPJ)).toEqual([])
    expect(validarCertificado(cert, '99999999000199')[0]).toMatch(/diferente/)
  })
  it('senha errada gera mensagem amigável', () => {
    expect(() => lerPfx(gerarPfxTeste(CNPJ, 'a'), 'b')).toThrow(/senha incorreta/)
  })
})

describe('NFC-e', () => {
  it('Simples Nacional: monta, assina, passa no XSD oficial e é autorizada (cStat 100)', async () => {
    const p = prepararNfce(dados(1, BASE + 1), cert, { id: '000001', codigo: 'CSC-TESTE-123' }, urls)
    expect(validarChave(p.chave)).toBe(true)
    expect(verificarAssinatura(p.xmlAssinado)).toBe(true)
    expect(p.qrCode).toMatch(/\?p=\d{44}\|2\|2\|1\|[0-9A-F]{40}$/)

    const xsd = await validarXsdReceita(p.xmlAssinado)
    expect(xsd.status, xsd.corpo).toBe(200)

    const r = await autorizar(urls.autorizacao, '1', p.xmlAssinado, cert)
    expect(r.cStat).toBe('100')
    expect(r.protocolo).toMatch(/^\d{15}$/)
    const proc = montarNfeProc(p.xmlAssinado, r.protNFe!)
    expect(proc).toContain('<nfeProc')
    expect(proc).toContain(`<chNFe>${p.chave}</chNFe>`)

    // reenvio da mesma chave → duplicidade
    const dup = await autorizar(urls.autorizacao, '2', p.xmlAssinado, cert)
    expect(dup.cStat).toBe('204')

    // cancelamento
    const c = xmlCancelamento({ chave: p.chave, cnpj: CNPJ, ambiente: 2, protocolo: r.protocolo!, justificativa: 'Cliente desistiu da compra no caixa' })
    const ev = await enviarEvento(urls.evento, '3', assinarXml(c.xml, cert, 'infEvento', 'evento'), cert)
    expect(ev.cStat).toBe('135')
  })

  it('Regime normal: grupo IBSCBS oficial (CBS 0,9% / IBS 0,1%) embutido, XSD ok, autorizada', async () => {
    const d = dados(3, BASE + 4)
    const g = await gerarGruposIbsCbs({ uf: 'SP', municipioIbge: 3550308, emissao: d.emissao,
      itens: [{ numero: 1, ncm: '61091000', cst: '000', cClassTrib: '000001', base: 100, quantidade: 2, unidade: 'UN' }] })
    d.itens[0].grupoIbsCbs = g.porItem.get(1)
    d.totalIbsCbs = g.total
    const p = prepararNfce(d, cert, { id: '1', codigo: 'CSC' }, urls)
    expect(p.xmlAssinado).toContain('<pCBS>0.90</pCBS><vCBS>0.90</vCBS>')
    expect(p.xmlAssinado).toContain('<IBSCBSTot>')
    const xsd = await validarXsdReceita(p.xmlAssinado)
    expect(xsd.status, xsd.corpo).toBe(200)
    expect((await autorizar(urls.autorizacao, '6', p.xmlAssinado, cert)).cStat).toBe('100')
  })

  it('XML adulterado após assinar é rejeitado (297)', async () => {
    const p = prepararNfce(dados(1, BASE + 2), cert, { id: '1', codigo: 'X' }, urls)
    const r = await autorizar(urls.autorizacao, '4', p.xmlAssinado.replace('<vNF>100.00</vNF>', '<vNF>1.00</vNF>'), cert)
    expect(r.cStat).toBe('297')
  })

  it('rejeição de negócio é devolvida com motivo (778 simulado)', async () => {
    const d = dados(1, BASE + 3)
    d.itens.push({ ...d.itens[0], numero: 2, descricao: 'Item REJEITAR teste' })
    d.pagamentos[0].valor = 200
    const r = await autorizar(urls.autorizacao, '5', prepararNfce(d, cert, { id: '1', codigo: 'X' }, urls).xmlAssinado, cert)
    expect(r.cStat).toBe('778')
    expect(r.xMotivo).toMatch(/Rejeição/)
  })

  it('inutilização de numeração (102) e status do serviço (107)', async () => {
    const i = xmlInutilizacao({ uf: 'SP', cnpj: CNPJ, ambiente: 2, ano: 2026, serie: 1, numeroInicial: 200, numeroFinal: 205, justificativa: 'Falha de sistema pulou a numeração' })
    const r = await inutilizar(urls.inutilizacao, assinarXml(i.xml, cert, 'infInut', 'inutNFe'), cert)
    expect(r.cStat).toBe('102')
    expect((await statusServico(urls.statusServico, '35', 2, cert)).cStat).toBe('107')
  })
})
