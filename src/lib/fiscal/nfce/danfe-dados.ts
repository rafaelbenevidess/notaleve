// Monta os dados do DANFE a partir do que está gravado (nota + venda + empresa).
import 'server-only'
import type { ResultadoCalculo } from '@/lib/tributos/tipos'
import type { DadosDanfe } from './danfe'

type Sb = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function dadosDanfe(sb: Sb, notaId: string): Promise<{ dados: DadosDanfe; xml: string; numero: number } | null> {
  const { data: n } = await sb.from('notas').select('*').eq('id', notaId).maybeSingle()
  if (!n) return null
  const [{ data: e }, { data: v }, { data: itens }, { data: pags }, { data: calc }] = await Promise.all([
    sb.from('empresas').select('razao_social, cnpj, ie, logradouro, numero, bairro, municipio_nome, uf').eq('id', n.empresa_id).single(),
    sb.from('vendas').select('total_bruto, desconto, total').eq('id', n.venda_id).single(),
    sb.from('venda_itens').select('*').eq('venda_id', n.venda_id).order('numero_item'),
    sb.from('venda_pagamentos').select('meio, valor').eq('venda_id', n.venda_id),
    sb.from('calculos').select('resultado').eq('venda_id', n.venda_id).eq('modo', 'hoje').maybeSingle(),
  ])
  const t = (calc?.resultado as ResultadoCalculo | undefined)?.totais
  const pago = (pags ?? []).reduce((s: number, p: { valor: number }) => s + Number(p.valor), 0)
  const protDh = (n.xml as string).match(/<dhRecbto>([^<]+)<\/dhRecbto>/)?.[1]
  const dados: DadosDanfe = {
    emitente: { razaoSocial: e.razao_social, cnpj: e.cnpj, ie: e.ie, endereco: `${e.logradouro}, ${e.numero} - ${e.bairro} - ${e.municipio_nome}/${e.uf}` },
    itens: (itens ?? []).map((i: Record<string, string>) => ({ codigo: String(i.numero_item), descricao: i.descricao, quantidade: Number(i.quantidade), unidade: i.unidade, valorUnitario: Number(i.preco_unitario), total: Number(i.total) })),
    valorProdutos: Number(v.total_bruto), desconto: Number(v.desconto), valorTotal: Number(v.total),
    pagamentos: (pags ?? []).map((p: { meio: string; valor: number }) => ({ meio: p.meio, valor: Number(p.valor) })),
    troco: Math.max(0, Math.round((pago - Number(v.total)) * 100) / 100),
    tributos: { federais: (t?.pisCofins ?? 0) + (t?.outros ?? 0), estaduais: t?.icms ?? 0, municipais: 0 },
    numero: n.numero, serie: n.serie, emissao: new Date(n.emitida_em), chave: n.chave, protocolo: n.protocolo,
    autorizacao: protDh ? new Date(protDh) : null, qrCode: n.qr_code_url, urlConsulta: (n.xml as string).match(/<urlChave>([^<]+)<\/urlChave>/)?.[1] ?? '',
    ambiente: n.ambiente === 'producao' ? 1 : 2, cancelada: n.status === 'cancelada',
  }
  return { dados, xml: n.xml, numero: n.numero }
}
