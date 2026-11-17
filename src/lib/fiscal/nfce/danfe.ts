// DANFE NFC-e em PDF (bobina 80 mm), com QR Code. Leiaute simplificado conforme o
// Manual do DANFE NFC-e: emitente, itens, totais, pagamento, tributos, consulta, chave, protocolo.
import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { MSG_HOMOLOGACAO } from './xml'

export interface DadosDanfe {
  emitente: { razaoSocial: string; cnpj: string; ie: string; endereco: string }
  itens: Array<{ codigo: string; descricao: string; quantidade: number; unidade: string; valorUnitario: number; total: number }>
  valorProdutos: number
  desconto: number
  valorTotal: number
  pagamentos: Array<{ meio: string; valor: number }>
  troco: number
  tributos: { federais: number; estaduais: number; municipais: number }
  numero: number
  serie: number
  emissao: Date
  chave: string
  protocolo: string | null
  autorizacao: Date | null
  qrCode: string
  urlConsulta: string
  ambiente: 1 | 2
  cancelada?: boolean
}

export const MEIOS_PAGAMENTO: Record<string, string> = {
  '01': 'Dinheiro', '03': 'Cartão de Crédito', '04': 'Cartão de Débito', '05': 'Crédito Loja', '10': 'Vale Alimentação',
  '11': 'Vale Refeição', '15': 'Boleto', '17': 'Pix', '99': 'Outros',
}

const LARGURA = 226.77 // 80 mm
const M = 8
const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
const fmtData = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

function quebrar(texto: string, fonte: PDFFont, tam: number, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/)) {
    const teste = atual ? `${atual} ${palavra}` : palavra
    if (fonte.widthOfTextAtSize(teste, tam) <= largura) atual = teste
    else {
      if (atual) linhas.push(atual)
      atual = palavra
      while (fonte.widthOfTextAtSize(atual, tam) > largura) {
        let i = atual.length
        while (i > 1 && fonte.widthOfTextAtSize(atual.slice(0, i), tam) > largura) i--
        linhas.push(atual.slice(0, i))
        atual = atual.slice(i)
      }
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

export async function gerarDanfeNfce(d: DadosDanfe): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`NFC-e ${d.numero} - ${d.emitente.razaoSocial}`)
  pdf.setProducer('NotaLeve')
  const f = await pdf.embedFont(StandardFonts.Helvetica)
  const fb = await pdf.embedFont(StandardFonts.HelveticaBold)
  const qrPng = await pdf.embedPng(await QRCode.toBuffer(d.qrCode, { errorCorrectionLevel: 'M', margin: 0, width: 300 }))

  // Desenho em duas passadas: mede a altura e depois desenha.
  type Op = (page: ReturnType<PDFDocument['addPage']>, y: number) => void
  const ops: Array<{ h: number; op: Op }> = []
  const util = LARGURA - 2 * M
  const linha = (texto: string, o: { tam?: number; bold?: boolean; centro?: boolean; direita?: string } = {}) => {
    const tam = o.tam ?? 7
    const fonte = o.bold ? fb : f
    const larg = o.direita ? util - fb.widthOfTextAtSize(o.direita, tam) - 4 : util
    for (const l of quebrar(texto, fonte, tam, larg)) {
      const dir = o.direita
      ops.push({ h: tam + 2.5, op: (p, y) => {
        const x = o.centro ? (LARGURA - fonte.widthOfTextAtSize(l, tam)) / 2 : M
        p.drawText(l, { x, y, size: tam, font: fonte })
        if (dir) p.drawText(dir, { x: LARGURA - M - fb.widthOfTextAtSize(dir, tam), y, size: tam, font: o.bold ? fb : f })
      } })
      o = { ...o, direita: undefined }
    }
  }
  const separador = () => ops.push({ h: 6, op: (p, y) => p.drawLine({ start: { x: M, y: y + 3 }, end: { x: LARGURA - M, y: y + 3 }, thickness: 0.4, color: rgb(0.5, 0.5, 0.5), dashArray: [2, 2] }) })
  const espaco = (h: number) => ops.push({ h, op: () => {} })

  linha(d.emitente.razaoSocial, { bold: true, centro: true, tam: 8 })
  linha(`CNPJ ${fmtCnpj(d.emitente.cnpj)}  IE ${d.emitente.ie}`, { centro: true, tam: 6.5 })
  linha(d.emitente.endereco, { centro: true, tam: 6.5 })
  separador()
  linha('Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica', { centro: true, tam: 6.5, bold: true })
  if (d.ambiente === 2) linha(MSG_HOMOLOGACAO, { centro: true, tam: 6.5, bold: true })
  if (d.cancelada) linha('*** NFC-e CANCELADA ***', { centro: true, tam: 9, bold: true })
  separador()
  linha('Código  Descrição  Qtde  UN  Vl.Unit', { tam: 6, bold: true, direita: 'Vl.Total' })
  for (const i of d.itens) {
    linha(`${i.codigo}  ${i.descricao}`, { tam: 6.5 })
    linha(`   ${i.quantidade.toLocaleString('pt-BR')} ${i.unidade} x ${brl(i.valorUnitario)}`, { tam: 6.5, direita: brl(i.total) })
  }
  separador()
  linha(`Qtde. total de itens`, { direita: String(d.itens.length) })
  linha(`Valor total R$`, { direita: brl(d.valorProdutos) })
  if (d.desconto > 0) linha(`Descontos R$`, { direita: brl(d.desconto) })
  linha(`Valor a pagar R$`, { bold: true, tam: 8, direita: brl(d.valorTotal) })
  linha('FORMA PAGAMENTO', { tam: 6, bold: true, direita: 'VALOR PAGO R$' })
  for (const p of d.pagamentos) linha(MEIOS_PAGAMENTO[p.meio] ?? p.meio, { direita: brl(p.valor) })
  if (d.troco > 0) linha('Troco R$', { direita: brl(d.troco) })
  separador()
  linha(`Tributos totais incidentes (Lei Federal 12.741/2012): Federais R$ ${brl(d.tributos.federais)} | Estaduais R$ ${brl(d.tributos.estaduais)} | Municipais R$ ${brl(d.tributos.municipais)}`, { tam: 6 })
  separador()
  linha('Consulte pela Chave de Acesso em', { centro: true, tam: 6.5, bold: true })
  linha(d.urlConsulta, { centro: true, tam: 6 })
  linha(d.chave.replace(/(\d{4})/g, '$1 ').trim(), { centro: true, tam: 6.5 })
  linha('CONSUMIDOR NÃO IDENTIFICADO', { centro: true, tam: 6.5, bold: true })
  linha(`NFC-e nº ${d.numero}  Série ${d.serie}  ${fmtData(d.emissao)}`, { centro: true, tam: 6.5, bold: true })
  if (d.protocolo && d.autorizacao) {
    linha(`Protocolo de autorização: ${d.protocolo}`, { centro: true, tam: 6.5 })
    linha(`Data de autorização: ${fmtData(d.autorizacao)}`, { centro: true, tam: 6.5 })
  }
  espaco(4)
  const qr = 110
  ops.push({ h: qr + 4, op: (p, y) => p.drawImage(qrPng, { x: (LARGURA - qr) / 2, y: y - qr + 8, width: qr, height: qr }) })
  espaco(6)
  linha('Emitido pelo NotaLeve', { centro: true, tam: 5.5 })

  const altura = ops.reduce((s, o) => s + o.h, 0) + 2 * M + 10
  const page = pdf.addPage([LARGURA, altura])
  let y = altura - M - 8
  for (const o of ops) { o.op(page, y); y -= o.h }
  return pdf.save()
}
